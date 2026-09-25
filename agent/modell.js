// Anbindung an das Sprachmodell ueber den eigenen Endpunkt (api/agent.js).
//
// Seit dem Werkzeug-Agenten (19.09.2026) gibt es nur noch einen Aufruf:
// das Gespraech samt Werkzeugbeschreibungen hin, Text oder Werkzeugaufrufe
// zurueck. Die Werkzeuge fuehrt der Browser aus (werkzeugkasten.js), das
// Modell entscheidet, wann es sie ruft.
//
// Faellt der Endpunkt aus (kein Schluessel, lokaler Dateiserver, Netz),
// schaltet die Anbindung ab und der Kern zeigt einen festen Hinweis - ein
// Werkzeug-Agent ohne Modell kann kein Gespraech fuehren.

const Modell = {
  PFAD: "/api/agent",

  /* Wann der Agent als nicht erreichbar gilt.
     ------------------------------------------------------------------
     Bis zum 25.09.2026 stand hier: drei Fehlschlaege hintereinander, und
     der Agent war fuer den Rest der Sitzung tot - `fehler` wurde nie
     wieder kleiner. Im Pruefstand hiess das: ein Gespraech mit vier
     erfolgreichen Aufrufen und danach elfmal "Da ist gerade etwas
     schiefgegangen". Fuer die Erhebung waere das der Totalverlust einer
     Person, ohne dass es jemandem auffaellt.

     Jetzt gibt es zwei Arten von Fehlern. Dauerhafte (keine Function an
     der Adresse, kein Schluessel hinterlegt) schalten ab - da hilft kein
     Warten. Voruebergehende (Zeitgrenze, Ueberlastung, 429) zaehlen mit,
     aber die Zaehlung verfaellt nach ERHOLUNG_MS, und vorher wird im
     Browser noch einmal versucht. */
  MAX_FEHLER: 3,
  MAX_AUFRUFE: 400,         // je Sitzung; ein Zug braucht oft zwei, drei Aufrufe
  ERHOLUNG_MS: 25000,       // so lange gilt eine Fehlerserie, dann wieder frei
  WIEDERHOLUNGEN: 2,        // Versuche je Aufruf, bevor ein Fehler gezaehlt wird
  DAUERHAFT: [404, 405, 501, 503],
  fehler: 0,
  letzterFehler: 0,
  aufrufe: 0,
  aus: false,
  letzterStatus: null,

  // Preise gpt-4.1-mini (USD je Million Tokens) - nur fuer die Anzeige
  // der Kosten in der Konsole und im Protokoll
  PREIS: { eingabe: 0.40, zwischengespeichert: 0.10, ausgabe: 1.60 },

  verfuegbar() {
    if (this.aus || this.aufrufe >= this.MAX_AUFRUFE) return false;
    // Eine alte Fehlerserie zaehlt nicht mehr
    if (this.fehler >= this.MAX_FEHLER && Date.now() - this.letzterFehler > this.ERHOLUNG_MS) this.fehler = 0;
    return this.fehler < this.MAX_FEHLER;
  },

  // Wie lange es noch dauert, bis es wieder geht (Sekunden) - damit der
  // Kern etwas Konkretes sagen kann statt "irgendwann".
  erholungSekunden() {
    return Math.max(1, Math.ceil((this.ERHOLUNG_MS - (Date.now() - this.letzterFehler)) / 1000));
  },

  merkeFehler(grund) {
    this.fehler += 1;
    this.letzterFehler = Date.now();
    if (this.fehler >= this.MAX_FEHLER) {
      console.info(`Modellanbindung pausiert (${grund}), erneut in ${Math.round(this.ERHOLUNG_MS / 1000)} s.`);
    }
  },

  async ruf(koerper) {
    if (!this.verfuegbar()) return null;
    for (let versuch = 0; versuch <= this.WIEDERHOLUNGEN; versuch++) {
      this.aufrufe += 1;
      let status = null;
      try {
        const antwort = await fetch(this.PFAD, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(koerper),
        });
        status = antwort.status;
        if (antwort.ok) {
          const daten = await antwort.json();
          if (daten.ok) { this.fehler = 0; this.letzterStatus = 200; return daten; }
          this.letzterStatus = "antwort_nicht_ok";
          this.merkeFehler(daten.fehler || "Fehler");
          return null;
        }
        // 404/405/501: an dieser Adresse gibt es keine Function (lokaler
        // Dateiserver). 503: Function da, aber kein Schluessel. Warten
        // hilft da nicht.
        if (this.DAUERHAFT.includes(status)) {
          this.aus = true; this.letzterStatus = status;
          this.merkeFehler(`HTTP ${status}`);
          return null;
        }
      } catch (e) {
        status = e.message;
      }
      this.letzterStatus = status;
      // Voruebergehend: kurz warten und noch einmal, bevor ein Fehler
      // gezaehlt wird. 0,6 s, dann 1,8 s.
      if (versuch < this.WIEDERHOLUNGEN) {
        await new Promise((r) => setTimeout(r, 600 * Math.pow(3, versuch)));
        continue;
      }
      this.merkeFehler(`HTTP ${status}`);
      return null;
    }
    return null;
  },

  /* Ein Zug des Agenten.
     ------------------------------------------------------------------
     nachrichten    das Gespraech im Format der Schnittstelle
     werkzeuge      die Werkzeugbeschreibungen (JSON-Schema)
     stand          zweite Systemnachricht: Freigabe, Seite, Fahrplan
     werkzeugPflicht  true = irgendein Werkzeug ist Pflicht (stand_merken
                    nach jeder Nachricht); ein Name = genau dieses
                    Werkzeug (der Fahrplan erzwingt Ueberblick und Suche)
     Liefert { text, chips, tool_calls, verbrauch } oder null. */
  async agent(nachrichten, werkzeuge, stand, werkzeugPflicht = false) {
    const d = await this.ruf({ aufgabe: "agent", nachrichten, werkzeuge, stand, werkzeugPflicht });
    if (!d) return null;
    return { text: d.text || "", chips: d.chips || [], tool_calls: d.tool_calls || [], verbrauch: d.verbrauch || null };
  },

  // Nur Text, ohne Werkzeuge - fuer "Warum dieses Haus?" und aehnliche
  // Einzelantworten, die keine Seitenbedienung brauchen.
  async text(nachrichten, stand) {
    const d = await this.ruf({ aufgabe: "text", nachrichten, stand });
    if (!d) return null;
    return { text: d.text || "", chips: d.chips || [], verbrauch: d.verbrauch || null };
  },

  kosten(verbrauch) {
    if (!verbrauch) return 0;
    const frisch = Math.max(0, (verbrauch.eingabe || 0) - (verbrauch.zwischengespeichert || 0));
    return (frisch * this.PREIS.eingabe + (verbrauch.zwischengespeichert || 0) * this.PREIS.zwischengespeichert
      + (verbrauch.ausgabe || 0) * this.PREIS.ausgabe) / 1e6;
  },

  /* Zahlen im Text, die nirgends im Gespraech belegt sind.
     ------------------------------------------------------------------
     Belegt ist, was in Werkzeugergebnissen, Nachrichten der Person oder
     dem Stand steht. Kleine Zahlen (bis 31: Tage, Naechte, Personen)
     und Jahreszahlen zaehlen nicht. Tausenderpunkte werden entfernt,
     "1.519" ist eine Zahl. */
  fremdeZahlen(text, belege) {
    const zahlenIn = (s) => (String(s).match(/\d{1,3}(?:\.\d{3})+(?!\d)|\d+/g) || []).map((z) => z.replace(/\./g, ""));
    const belegt = new Set();
    const sammle = (wert) => {
      if (typeof wert === "number") belegt.add(String(Math.round(wert)));
      else if (typeof wert === "string") for (const z of zahlenIn(wert)) belegt.add(z);
      else if (Array.isArray(wert)) wert.forEach(sammle);
      else if (wert && typeof wert === "object") Object.values(wert).forEach(sammle);
    };
    sammle(belege);
    const fremd = [];
    for (const z of zahlenIn(text)) {
      if (+z <= 31) continue;
      if (+z >= 2024 && +z <= 2030) continue;
      if (!belegt.has(z) && !fremd.includes(z)) fremd.push(z);
    }
    return fremd;
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Modell };
