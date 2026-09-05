// Anbindung an das Sprachmodell - die Browserseite von api/agent.js.
//
// Zwei Aufgaben, beide eng gefuehrt:
//
//   verstehen()    Freier Text -> strukturierte Absicht.
//   formulieren()  Unsere Fakten -> deutsche Saetze.
//
// Wichtiger als beides ist, was hier NICHT passiert: Das Modell entscheidet
// nichts. Welche Unterkunft vorgeschlagen wird, welche Filter gesetzt werden,
// wann gebucht wird - das steht in agent/politik.js und ist bei jeder
// teilnehmenden Person gleich.
//
// Und: Jeder Aufruf hat einen Rueckfall. Faellt die Schnittstelle mitten in
// einer Sitzung aus, arbeitet der Agent schlechter weiter statt gar nicht.
// Eine abgebrochene Sitzung ist ein verlorener Datenpunkt.

const Modell = {
  PFAD: "/api/agent",

  // Kostenbremse und Ausfallschutz in einem: Nach mehreren Fehlversuchen
  // hintereinander wird nicht weiter angeklopft, sondern nur noch die
  // Schluesselwort-Logik benutzt. Sonst laeuft bei einer Stoerung jede
  // Eingabe in denselben Zeitablauf.
  MAX_FEHLER: 3,
  MAX_AUFRUFE: 60,          // pro Sitzung, grosszuegig ueber dem Bedarf
  fehler: 0,
  aufrufe: 0,
  aus: false,

  verfuegbar() {
    return !this.aus && this.fehler < this.MAX_FEHLER && this.aufrufe < this.MAX_AUFRUFE;
  },

  merkeFehler(grund) {
    this.fehler += 1;
    if (this.fehler >= this.MAX_FEHLER) {
      console.info(`Modellanbindung abgeschaltet (${grund}) - der Agent arbeitet mit der hinterlegten Logik weiter.`);
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
        // 404/405/501 heisst: an dieser Adresse gibt es keine Function -
        // etwa auf dem lokalen Dateiserver. Dann gar nicht weiter anklopfen.
        // 503 heisst: Function da, aber kein Schluessel hinterlegt.
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

  /* ==================================================================
     Verstehen
     ------------------------------------------------------------------
     Das Modell liefert lose Angaben. Uebernommen wird nur, was hier
     gegen den Katalog geprueft werden kann - ein erfundenes Reiseziel
     oder ein unbekanntes Kriterium faellt weg. Das Modell darf
     vorschlagen, nicht bestimmen.
     ================================================================== */

  async verstehen(text) {
    const daten = await this.ruf({ aufgabe: "verstehen", text });
    if (!daten?.absicht) return null;
    const a = daten.absicht;

    const geprueft = {
      typ: a.typ === "apartment" ? "apartment" : "hotel",
      zielId: null,
      monat: Number.isInteger(a.monat) && a.monat >= 1 && a.monat <= 12 ? a.monat : null,
      erwachsene: Number.isInteger(a.erwachsene) ? Math.min(6, Math.max(1, a.erwachsene)) : null,
      kinder: Number.isInteger(a.kinder) ? Math.min(4, Math.max(0, a.kinder)) : null,
      maxPreis: Number.isFinite(a.maxPreis) && a.maxPreis > 10 && a.maxPreis < 2000 ? Math.round(a.maxPreis) : undefined,
      budget: ["niedrig", "hoch"].includes(a.budget) ? a.budget : null,
      kriterien: [],
    };

    // Reiseziel gegen den Katalog pruefen, laengster Name zuerst - sonst
    // schluckt "Tirol" das "Suedtirol".
    if (typeof a.ziel === "string" && a.ziel.trim() && typeof ZIELE !== "undefined") {
      const gesucht = a.ziel.toLowerCase();
      const nachLaenge = [...ZIELE].sort((x, y) => y.name.length - x.name.length);
      const treffer = nachLaenge.find((z) => gesucht.includes(z.name.toLowerCase()) || z.name.toLowerCase().includes(gesucht))
        || nachLaenge.find((z) => gesucht.includes(z.land.toLowerCase()));
      if (treffer) geprueft.zielId = treffer.id;
      // Kein Treffer: Der genannte Ort bleibt trotzdem erhalten. Der
      // Agent soll sagen koennen "Madrid habe ich nicht", statt so zu
      // tun, als haette er die Frage nicht verstanden.
      else geprueft.zielRoh = a.ziel.trim();
    }

    // Kriterien nur, wenn Politik sie kennt
    const erlaubt = typeof Politik !== "undefined" ? new Set(Politik.KRITERIEN.map((k) => k.id)) : new Set();
    const gewicht = a.betont === true ? 2 : 1;
    for (const id of Array.isArray(a.kriterien) ? a.kriterien : []) {
      if (erlaubt.has(id) && !geprueft.kriterien.some((k) => k.id === id)) {
        geprueft.kriterien.push({ id, gewicht });
      }
    }

    return geprueft;
  },

  /* ==================================================================
     Formulieren
     ------------------------------------------------------------------
     Das Modell bekommt die Zahlen vorgelegt und soll sie in Saetze
     bringen. Danach wird geprueft, ob es sich daran gehalten hat:
     Steht in der Antwort eine Zahl, die in den Fakten nicht vorkommt,
     wird der eigene Satz genommen. Eine erfundene Prozentangabe in
     einer Studie waere nicht zu reparieren.
     ================================================================== */

  async formulieren(fakten, ersatz) {
    const daten = await this.ruf({ aufgabe: "formulieren", fakten });
    const text = daten?.text?.trim();
    if (!text) return ersatz;
    if (!this.zahlenGedeckt(text, fakten)) {
      console.info("Modellantwort enthielt ungedeckte Zahlen - eigener Text verwendet.");
      return ersatz;
    }
    return text;
  },

  // Jede Zahl im Text muss in den Fakten vorkommen. Kleine Zahlen bis zehn
  // sind ausgenommen: "drei Häuser", "zwei Nächte" - die stehen fuer
  // Aufzaehlungen und nicht fuer Messwerte.
  zahlenGedeckt(text, fakten) {
    const belegt = new Set();
    const sammle = (wert) => {
      if (typeof wert === "number") belegt.add(String(Math.round(wert)));
      else if (typeof wert === "string") for (const z of wert.match(/\d+/g) || []) belegt.add(z);
      else if (Array.isArray(wert)) wert.forEach(sammle);
      else if (wert && typeof wert === "object") Object.values(wert).forEach(sammle);
    };
    sammle(fakten);

    for (const z of text.match(/\d+/g) || []) {
      if (+z <= 10) continue;
      if (!belegt.has(z)) return false;
    }
    return true;
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Modell };
