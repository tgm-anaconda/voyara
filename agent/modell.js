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

  MAX_FEHLER: 3,
  MAX_AUFRUFE: 400,         // je Sitzung; ein Zug braucht oft zwei, drei Aufrufe
  fehler: 0,
  aufrufe: 0,
  aus: false,

  // Preise gpt-4.1-mini (USD je Million Tokens) - nur fuer die Anzeige
  // der Kosten in der Konsole und im Protokoll
  PREIS: { eingabe: 0.40, zwischengespeichert: 0.10, ausgabe: 1.60 },

  verfuegbar() {
    return !this.aus && this.fehler < this.MAX_FEHLER && this.aufrufe < this.MAX_AUFRUFE;
  },

  merkeFehler(grund) {
    this.fehler += 1;
    if (this.fehler >= this.MAX_FEHLER) {
      console.info(`Modellanbindung abgeschaltet (${grund}).`);
    }
  },

  async ruf(koerper) {
    if (!this.verfuegbar()) return null;
    this.aufrufe += 1;
    try {
      const antwort = await fetch(this.PFAD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(koerper),
      });
      if (!antwort.ok) {
        // 404/405/501: an dieser Adresse gibt es keine Function (lokaler
        // Dateiserver). 503: Function da, aber kein Schluessel.
        if ([404, 405, 501, 503].includes(antwort.status)) { this.aus = true; }
        this.merkeFehler(`HTTP ${antwort.status}`);
        return null;
      }
      const daten = await antwort.json();
      if (!daten.ok) { this.merkeFehler(daten.fehler || "Fehler"); return null; }
      this.fehler = 0;
      return daten;
    } catch (e) {
      this.merkeFehler(e.message);
      return null;
    }
  },

  /* Ein Zug des Agenten.
     ------------------------------------------------------------------
     nachrichten  das Gespraech im Format der Schnittstelle
     werkzeuge    die Werkzeugbeschreibungen (JSON-Schema)
     stand        zweite Systemnachricht: Freigabe, Seite, was feststeht
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
