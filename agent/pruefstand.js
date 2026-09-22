/* Pruefstand: misst, wie oft der Agent daneben greift.
   ------------------------------------------------------------------
   Bis zum 22.09.2026 war die Fehlerquote eine Schaetzung aus ein paar
   Durchlaeufen von Hand. Das reicht nicht, um zu beurteilen, ob eine
   Aenderung (weniger Regeln je Nachricht, niedrigere Temperatur) etwas
   bringt. Der Pruefstand spielt feste Gespraeche gegen den echten
   Agenten - echte Werkzeuge, echte Seite - und zaehlt zwei Dinge:

   ROHFEHLER   Wie oft musste eine Leitplanke im Kern eingreifen?
               (zwei Fragen, Thema verfehlt, erfundene Zahl, erfundenes
               Datum, Maske falsch, Lage doppelt ...) Das ist das Mass
               fuer das Modell selbst.
   RESTFEHLER  Was davon steht trotzdem noch im Chat? Das ist das Mass
               fuer die Person, die davorsitzt.

   Start: sessionStorage voyara_pruefstand setzen und index.html laden.
   Der Lauf ueberlebt Seitenwechsel (Stand im sessionStorage, Ergebnis
   im localStorage) und laeuft von selbst weiter. */

const Pruefstand = {
  SCHLUESSEL: "voyara_pruefstand",
  ERGEBNIS: "voyara_pruefstand_ergebnis",

  // Feste Gespraeche. Bewusst so geschrieben, wie Menschen schreiben:
  // kleingeschrieben, halbe Saetze, Rueckfragen, Schwenks.
  GESPRAECHE: [
    { id: "familie_flex", freigabe: "vorbereiten", texte: [
      "hi", "ich würde gerne im oktober verreisen", "wir sind zu viert",
      "2 kinder beide 5", "eher warm", "weiß ich noch nicht", "erst mal schauen",
      "Such mir drei raus", "10 Tage", "nur die Unterkunft", "erst mal schauen",
      "Halbpension", "Strand und Kinderclub"] },
    { id: "paar_fest_flug", freigabe: "buchen", texte: [
      "Meine Frau und ich wollen vom 13. bis 20. Oktober nach Kreta, Hotel, mit Flug ab Hamburg",
      "erst mal schauen", "Such mir drei raus", "maximal 2000 Euro insgesamt",
      "All Inclusive", "gutes Essen und Ruhe", "was kostet das zweite insgesamt?",
      "buch das zweite", "am 14. Oktober"] },
    { id: "frage_zuerst", freigabe: "suchen", texte: [
      "Habt ihr überhaupt was auf Kreta?", "im November, wir sind zu zweit",
      "Ist es da im November überhaupt noch warm genug zum Baden?", "Hotel",
      "erst mal schauen", "ich schaue selbst", "welches von denen hat das beste Essen?"] },
    { id: "jahreszeit", freigabe: "suchen", texte: [
      "Wir wollen im Sommer mit den Kindern ans Meer", "5 Personen, 3 Kinder: 4, 7 und 12",
      "Juli", "Hotel", "erst mal schauen", "Such mir drei raus", "eine Woche",
      "ohne Flug", "bis 1800 insgesamt", "All Inclusive", "Pool und Kinderclub"] },
    { id: "fewo_schwenk", freigabe: "vorbereiten", texte: [
      "Wir sind zu dritt, mein Sohn ist 8, wollen im August eine Woche nach Mallorca, nur Unterkunft",
      "Hotel", "erst mal schauen", "hm, doch lieber eine Ferienwohnung",
      "Such mir drei raus", "Preis ist offen", "ein Pool wäre toll"] },
    { id: "kalt_selbst", freigabe: "vorschlagen", texte: [
      "Ich will mal richtig Winter erleben, mit Schnee", "im Januar", "mit meiner Freundin",
      "keine Kinder", "Ferienwohnung", "erst mal schauen", "ich schaue selbst",
      "was kostet die günstigste in Lappland?"] },
    { id: "budget_eng", freigabe: "vorbereiten", texte: [
      "zwei Erwachsene, im September zwei Wochen nach Sardinien, Hotel, kein Flug",
      "noch ein paar Eckdaten", "zwei Wochen", "ohne Flug", "Such mir drei raus",
      "höchstens 900 Euro insgesamt", "Halbpension", "direkt am Strand und Note mindestens 4,5"] },
    { id: "zwischendurch", freigabe: "buchen", texte: [
      "ich brauche was für ein langes Wochenende im Mai", "zu zweit", "eher warm",
      "Hotel", "erst mal schauen", "wie viele Hotels habt ihr denn insgesamt?",
      "Such mir drei raus", "4 Nächte", "ohne Flug", "Preis egal", "Frühstück",
      "Ruhe und gute Bewertungen"] },
    { id: "knapp", freigabe: "suchen", texte: [
      "mallorca", "august", "2", "keine kinder", "hotel", "erst mal schauen",
      "such mir drei raus", "7", "ohne flug", "egal", "halbpension", "egal"] },
    { id: "umentschieden", freigabe: "vorbereiten", texte: [
      "Familie, 2 Erwachsene 2 Kinder (6 und 9), im August eine Woche nach Mallorca, Hotel, ohne Flug",
      "erst mal schauen", "Such mir drei raus", "bis 1800 insgesamt", "All Inclusive",
      "Pool und Kinderclub", "hm, ich glaube wir wollen doch lieber nach Teneriffa",
      "ok, dann muss es nicht direkt am Strand sein"] },
  ],

  // Leitplanken des Kerns: jedes Ereignis heisst "das Modell lag daneben"
  ROHFEHLER: ["zwei_fragen", "thema_verfehlt", "zahl_ungedeckt", "datum_verworfen",
    "monat_verworfen", "naechte_verworfen", "anreise_verworfen", "reisende_verworfen",
    "egal_verworfen", "richtung_verworfen", "maske_korrigiert", "maske_abweichung",
    "lage_wiederholt", "vorlage_wiederholt", "vorlage_zu_frueh"],
  // Kein Fehler, aber aufschlussreich: wie oft der Kern ein Werkzeug erzwingen
  // musste, weil das Modell es nicht von sich aus rief
  NOTIZ: ["zwang", "gesperrt", "uebernahme", "stopp"],

  VERBOTEN: /\b(kriterien|auswertung|transparen|optimal|präferenz|praeferenz|selektion|parameter)\w*/gi,

  stand() {
    try { return JSON.parse(sessionStorage.getItem(this.SCHLUESSEL) || "null"); } catch { return null; }
  },
  standSetzen(s) {
    try { sessionStorage.setItem(this.SCHLUESSEL, JSON.stringify(s)); } catch { /* egal */ }
  },
  ergebnis() {
    try { return JSON.parse(localStorage.getItem(this.ERGEBNIS) || "[]"); } catch { return []; }
  },
  ergebnisSetzen(e) {
    try { localStorage.setItem(this.ERGEBNIS, JSON.stringify(e)); } catch { /* egal */ }
  },

  starten(nur = null) {
    localStorage.removeItem(this.ERGEBNIS);
    this.standSetzen({ i: 0, j: 0, nur, begonnen: Date.now() });
    location.href = "index.html";
  },

  // Nach jedem Laden: weitermachen, wo der Lauf stand
  anbinden(kern) {
    const s = this.stand();
    if (!s) return;
    this.kern = kern;
    setTimeout(() => this.weiter(), 1200);
  },

  liste() {
    const s = this.stand();
    return s?.nur ? this.GESPRAECHE.filter((g) => g.id === s.nur) : this.GESPRAECHE;
  },

  async ruhe(maxMs = 90000) {
    const bis = Date.now() + maxMs;
    while (Date.now() < bis) {
      if (!this.kern.laeuft && !this.kern.lauf.ausstehend) return true;
      await new Promise((r) => setTimeout(r, 400));
    }
    return false;
  },

  async weiter() {
    const s = this.stand();
    if (!s) return;
    const gespraeche = this.liste();
    const g = gespraeche[s.i];
    if (!g) { this.fertig(); return; }

    // Freigabe setzen, ohne die Karte zu zeigen
    if (s.j === 0 && this.kern.lauf.freigabe !== g.freigabe) {
      this.kern.lauf.freigabe = g.freigabe;
      this.kern.lauf.freigabeGewaehlt = true;
      this.kern.sichern();
      AgentPanel.freigabeZeigen?.(g.freigabe);
    }

    await this.ruhe();
    if (s.j < g.texte.length) {
      this.standSetzen({ ...s, j: s.j + 1 });
      console.info(`Pruefstand ${g.id} ${s.j + 1}/${g.texte.length}: ${g.texte[s.j]}`);
      await this.kern.eingabe(g.texte[s.j]);
      await this.ruhe();
      setTimeout(() => this.weiter(), 300);
      return;
    }

    // Gespraech zu Ende: auswerten, naechstes beginnen
    this.auswerten(g);
    this.standSetzen({ ...s, i: s.i + 1, j: 0 });
    this.kern.zuruecksetzen();
    this.kern.lauf.freigabe = gespraeche[s.i + 1]?.freigabe || g.freigabe;
    this.kern.lauf.freigabeGewaehlt = true;
    this.kern.sichern();
    location.href = "index.html";
  },

  /* Ein Gespraech bewerten. Rohfehler aus dem Protokoll, Restfehler aus
     dem, was wirklich im Chat steht. */
  auswerten(g) {
    const lauf = this.kern.lauf;
    const bot = (lauf.verlauf || []).filter((n) => n.rolle === "bot");
    const prot = lauf.protokoll || [];
    const roh = {};
    const notiz = {};
    for (const e of prot) {
      if (this.ROHFEHLER.includes(e.ereignis)) roh[e.ereignis] = (roh[e.ereignis] || 0) + 1;
      if (this.NOTIZ.includes(e.ereignis)) notiz[e.ereignis] = (notiz[e.ereignis] || 0) + 1;
    }

    const belege = this.kern.belege();
    const rest = [];
    const gesehen = [];
    for (const n of bot) {
      const t = String(n.text || "");
      if (!t) continue;
      // Saetze, die der Kern selbst schreibt (Vorlage, Lage, Buchungsansage),
      // sind gewollt laenger und wiederholen sich der Form nach - sie zaehlen
      // nicht als Stilfehler des Modells
      if (n.links || n.aktionen || /^(Im |Aktuell |Auf |Ich buche jetzt)/.test(t) && /\d/.test(t) && !/\?/.test(t)) continue;
      const echteFragen = t.split(/(?<=[.!?])\s+/)
        .filter((x) => /\?\s*$/.test(x))
        .filter((x) => !/^(oder|bzw|beziehungsweise|also|und wenn|zum beispiel|etwa|z\. ?b)/i.test(x.trim()))
        .filter((x) => x.trim().split(/\s+/).length > 4);
      if (echteFragen.length > 1) rest.push({ art: "zwei_fragen", fragen: echteFragen, text: t.slice(0, 160) });
      if (/!/.test(t)) rest.push({ art: "ausrufezeichen", text: t.slice(0, 160) });
      const verboten = t.match(this.VERBOTEN);
      if (verboten) rest.push({ art: "verbotenes_wort", wort: verboten[0], text: t.slice(0, 160) });
      const saetze = t.split(/(?<=[.!?])\s+/).filter(Boolean);
      if (saetze.length > 4) rest.push({ art: "zu_lang", saetze: saetze.length, text: t.slice(0, 160) });
      if (t.length > 420) rest.push({ art: "zu_viele_zeichen", zeichen: t.length, text: t.slice(0, 160) });
      const fremd = typeof Modell !== "undefined" ? Modell.fremdeZahlen(t, belege) : [];
      if (fremd.length) rest.push({ art: "fremde_zahl", zahlen: fremd, text: t.slice(0, 160) });
      // Wiederholung: derselbe Satz in zwei Nachrichten
      for (const satz of saetze) {
        const norm = satz.replace(/\W+/g, "").toLowerCase();
        if (norm.length > 25 && gesehen.includes(norm)) rest.push({ art: "wiederholt", text: satz.slice(0, 160) });
        if (norm.length > 25) gesehen.push(norm);
      }
    }

    // Stimmt die Maske am Ende mit dem Stand ueberein?
    const q = new URLSearchParams(location.search);
    const p = lauf.profil || {};
    const maske = Werkzeuge.seite() === "results" ? {
      erwachsene: +(q.get("adults") || 0) === +(p.erwachsene ?? 0),
      kinder: +(q.get("children") || 0) === +(p.kinder ?? 0),
      alter: !p.kinder || (q.get("ages") || "") === (p.kinderAlter || []).join(","),
      naechte: !p.naechte || q.get("flex") !== "1" || +(q.get("nights") || 0) === +p.naechte,
    } : null;

    const e = this.ergebnis();
    e.push({
      id: g.id, freigabe: g.freigabe,
      nachrichten: g.texte.length, botNachrichten: bot.length,
      rohfehler: roh, rohSumme: Object.values(roh).reduce((a, b) => a + b, 0), notiz,
      protokoll: prot.map((x) => x.ereignis),
      restfehler: rest, restSumme: rest.length,
      maske, seite: Werkzeuge.seite(),
      gebucht: prot.some((x) => x.ereignis === "gebucht"),
      vorlagen: prot.filter((x) => x.ereignis === "shortlist").length,
      kosten: lauf.kosten?.euro || 0, aufrufe: lauf.kosten?.aufrufe || 0,
      verlauf: (lauf.verlauf || []).map((n) => `${n.rolle}: ${n.text}`),
    });
    this.ergebnisSetzen(e);
    console.info(`Pruefstand ${g.id} fertig: ${Object.values(roh).reduce((a, b) => a + b, 0)} Rohfehler, ${rest.length} Restfehler`);
  },

  fertig() {
    sessionStorage.removeItem(this.SCHLUESSEL);
    console.info("Pruefstand fertig.", this.bericht());
  },

  // Zusammenfassung ueber alle Gespraeche
  bericht() {
    const e = this.ergebnis();
    const summe = (f) => e.reduce((a, x) => a + f(x), 0);
    const roh = {};
    for (const x of e) for (const [k, v] of Object.entries(x.rohfehler)) roh[k] = (roh[k] || 0) + v;
    const rest = {};
    for (const x of e) for (const r of x.restfehler) rest[r.art] = (rest[r.art] || 0) + 1;
    const notiz = {};
    for (const x of e) for (const [k, v] of Object.entries(x.notiz || {})) notiz[k] = (notiz[k] || 0) + v;
    const botNachrichten = summe((x) => x.botNachrichten);
    return {
      gespraeche: e.length,
      botNachrichten,
      rohfehler: roh, rohSumme: summe((x) => x.rohSumme),
      rohJeNachricht: botNachrichten ? Math.round(summe((x) => x.rohSumme) / botNachrichten * 100) / 100 : 0,
      restfehler: rest, restSumme: summe((x) => x.restSumme), notiz,
      abbrueche: summe((x) => x.verlauf.filter((t) => /schiefgegangen|nicht erreichbar/.test(t)).length),
      restAnteilProzent: botNachrichten ? Math.round(summe((x) => x.restSumme) / botNachrichten * 1000) / 10 : 0,
      maskeFalsch: e.filter((x) => x.maske && Object.values(x.maske).some((v) => v === false)).map((x) => x.id),
      gebucht: e.filter((x) => x.gebucht).map((x) => x.id),
      kostenUSD: Math.round(summe((x) => x.kosten) * 1000) / 1000,
      aufrufe: summe((x) => x.aufrufe),
    };
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Pruefstand };
