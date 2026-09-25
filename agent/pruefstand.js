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

   Umbau am 25.09.2026
   ------------------------------------------------------------------
   Der Pruefstand gab gute Noten, waehrend beim Durchklicken von Hand
   jedes Mal grobe Fehler auffielen. Das lag am Messgeraet, nicht am
   Glueck: Es pruefte die FORM der Saetze (zwei Fragen, erfundene Zahl,
   Laenge, verbotene Woerter), aber nicht ihren SINN, es fuhr nur
   wohlerzogene Gespraeche, und es lief ganz ohne Aufgabe - also ohne
   Partnerhaus, ohne Vorschlagsansicht, ohne Buchungsweg. Genau dort
   lagen die Funde. Seither:

     - Gespraeche mit Einwuerfen, Schwenks und Rueckfragen mitten im
       Thema, so wie sie beim Durchklicken vorkamen
     - Gespraeche MIT Aufgabe (Probelauf der Erhebung): Partnerhaus,
       Vorschlagsansicht, Rundgang, Buchung laufen wirklich
     - Pruefungen auf Sinn statt nur auf Form: unmotiviertes Thema,
       zweimal dieselbe Frage, Vorschlag gegen den Wunsch, Buchung
       gegen die Vorlage, Haus empfohlen ohne es angesehen zu haben,
       fehlende Kennzeichnung des Partnerhauses, Siezen
     - Pruefungen auf dem BILDSCHIRM, nicht nur im Protokoll

   Start: Pruefstand.starten() in der Konsole, oder mit Auswahl:
   Pruefstand.starten(["einwurf_essen", "lappland"]).
   Der Lauf ueberlebt Seitenwechsel (Stand im sessionStorage, Ergebnis
   im localStorage) und laeuft von selbst weiter.
   Bericht danach: Pruefstand.bericht() / Pruefstand.protokollLesen() */

const Pruefstand = {
  SCHLUESSEL: "voyara_pruefstand",
  ERGEBNIS: "voyara_pruefstand_ergebnis",

  /* Feste Gespraeche. Bewusst so geschrieben, wie Menschen schreiben:
     kleingeschrieben, halbe Saetze, Rueckfragen, Schwenks.

     aufgabe:  laeuft als Probelauf der Erhebung mit dieser Aufgabe -
               dann gibt es ein Partnerhaus, eine Vorschlagsansicht und
               einen Buchungsweg. Nichts davon geht an den Server.
     erwartet: was am Ende zutreffen muss (wird geprueft). */
  GESPRAECHE: [
    /* ---- Gespraeche mit Aufgabe: der Weg, den eine teilnehmende
       Person wirklich geht. Hier haengt die Hauptmessgroesse dran. ---- */

    /* Sein Fund vom 24.09.: mitten in der Frage "selbst schauen oder
       drei Haeuser?" kam "uebrigens mir ist Essen sehr wichtig" - der
       Agent nahm Essen auf und stellte dieselbe Frage noch einmal.
       Und das Haus auf Platz 1 hatte beim Essen 6,6. */
    { id: "einwurf_essen", freigabe: "buchen", aufgabe: "paar", texte: [
      "wir wollen im oktober zu zweit weg, irgendwo wo es warm ist",
      "4 nächte", "hotel",
      "übrigens mir ist essen sehr wichtig",
      "erstmal eine auswahl", "such mir drei raus",
      "ohne flug", "höchstens 900 euro insgesamt", "frühstück",
      "am 6. oktober", "nimm das erste", "ja, buch das bitte"],
      erwartet: { wunsch: "essen", vorschlaege: 3, gebucht: true } },

    /* Sein Fund vom 24.09.: "kannst du auch fuenf vorschlagen?" wurde
       verneint. Und: nach dem Klick auf "Ansehen" waren die anderen
       Vorschlaege nicht mehr erreichbar. */
    { id: "fuenf_und_zurueck", freigabe: "buchen", aufgabe: "familie", texte: [
      "familie, 2 erwachsene und 2 kinder (6 und 9), eine woche im august ans meer, hotel",
      "erstmal eine auswahl",
      "kannst du mir auch 5 vorschlagen statt 3?",
      "ohne flug", "höchstens 1600 insgesamt", "all inclusive",
      "pool und höchstens 500 meter zum strand, ein kinderclub ist uns am wichtigsten",
      "am 8. august", "zeig mir die vorschläge nochmal",
      "nimm das mit dem kinderclub", "ja, buch das bitte"],
      erwartet: { vorschlaege: 5, wunsch: "kinderclub", gebucht: true } },

    /* Die Aufgabe genau so gespielt, wie sie im Fenster steht - der
       kuerzeste Weg zur Buchung. Prueft, ob das Partnerhaus vorkommt
       und ob gebucht wird, was vorgeschlagen war. */
    { id: "aufgabe_knapp", freigabe: "buchen", aufgabe: "familie", texte: [
      "wir wollen im august eine woche ans meer, zu viert, 2 kinder 6 und 9 jahre",
      "hotel", "erstmal eine auswahl", "such mir drei raus",
      "ein familienzimmer", "ohne flug", "maximal 1600 euro für die unterkunft insgesamt",
      "pool, höchstens 500 meter zum strand und ein kinderclub",
      "am 8. august", "nimm das erste", "ja, buch das bitte"],
      erwartet: { vorschlaege: 3, gebucht: true } },

    /* ---- Gespraeche ohne Aufgabe: Fahrplan, Beratung, Sprache ---- */

    /* Sein Lappland-Lauf vom 24.09.: "Kinderclubs sind eher selten"
       stand im Chat, obwohl nie jemand von Kinderclubs gesprochen
       hatte. Dazu die falsche Reihenfolge der Fragen. */
    { id: "lappland", freigabe: "vorbereiten", texte: [
      "ich will mal richtig winter erleben, mit schnee",
      "im januar", "zu dritt, unser sohn ist 10", "ferienwohnung",
      "erstmal eine auswahl", "such mir drei raus",
      "eine woche", "ohne flug", "preis ist offen"] },

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
    { id: "kalt_selbst", freigabe: "suchen", texte: [
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
    "lage_wiederholt", "vorlage_wiederholt", "vorlage_zu_frueh", "alter_verworfen",
    "wert_verworfen", "zwei_fragen_gekuerzt",
    // seit 25.09.: Griffe daneben, die den Ausgang der Erhebung treffen
    "fremdes_haus", "haus_korrigiert", "argumente_repariert",
    "falsche_hausseite", "falsche_buchungsseite", "partner_ohne_marke"],
  // Kein Fehler, aber aufschlussreich: wie oft der Kern ein Werkzeug erzwingen
  // musste, weil das Modell es nicht von sich aus rief
  NOTIZ: ["zwang", "gesperrt", "uebernahme", "stopp", "thema_uebersprungen"],

  VERBOTEN: /\b(kriterien|auswertung|transparen|optimal|präferenz|praeferenz|selektion|parameter)\w*/gi,

  /* Themen, die der Agent von sich aus anschneiden kann, ohne dass sie
     jemand genannt hat. "Kinderclubs sind eher selten" war genau das:
     eine Einordnung zu einem Thema, das im Gespraech nie vorkam.
     nutzer: woran man erkennt, dass die Person es doch genannt hat. */
  THEMEN: [
    { id: "kinderclub", bot: /kinderclubs?|kids ?clubs?|kinderbetreuung|kinderanimation/i,
      nutzer: /kinderclub|kids ?club|betreuung|animation|club\b/i },
    { id: "pool", bot: /\bpools?\b/i, nutzer: /\bpool/i },
    { id: "wellness", bot: /wellness|\bspa\b|sauna/i, nutzer: /wellness|spa\b|sauna|massage/i },
    { id: "meerblick", bot: /meerblick/i, nutzer: /meerblick|blick aufs meer|seeblick/i },
    { id: "allinclusive", bot: /all ?inclusive/i, nutzer: /all ?inclusive|\bai\b|vollpension/i },
    { id: "haustier", bot: /haustier|hunde?\b/i, nutzer: /haustier|hund/i },
    { id: "barrierefrei", bot: /barrierefrei|rollstuhl/i, nutzer: /barrierefrei|rollstuhl/i },
    { id: "wlan", bot: /\bwlan\b|\bwifi\b/i, nutzer: /wlan|wifi|internet/i },
    { id: "klimaanlage", bot: /klimaanlage/i, nutzer: /klima|\bac\b/i },
    { id: "parkplatz", bot: /parkplatz|parkplätze|parken/i, nutzer: /park|auto|mietwagen/i },
  ],

  // Wunsch -> Teilnote in den Bewertungen. Fuer die Frage, ob der
  // Vorschlag auf Platz 1 dem widerspricht, was die Person wollte.
  WUNSCH_ASPEKT: { essen: "essen", ruhe: "ruhe", lage: "lage", sauberkeit: "sauberkeit",
    service: "service", preis: "preis", pool: "pool" },

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
    this.standSetzen({ i: 0, j: 0, nur: nur ? [].concat(nur) : null, sicht: [], begonnen: Date.now() });
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
    return s?.nur ? this.GESPRAECHE.filter((g) => s.nur.includes(g.id)) : this.GESPRAECHE;
  },

  async ruhe(maxMs = 120000) {
    const bis = Date.now() + maxMs;
    while (Date.now() < bis) {
      if (!this.kern.laeuft && !this.kern.lauf.ausstehend) return true;
      await new Promise((r) => setTimeout(r, 400));
    }
    return false;
  },

  /* Probelauf der Erhebung: Aufgabe, Gruppe und Durchlauf stehen, damit
     Partnerhaus, Vorschlagsansicht und Buchungsweg wirklich durchlaufen.
     An den Server geht nichts (Studie.probelauf). */
  aufgabeStellen(id) {
    if (typeof Studie === "undefined") return;
    Studie.probelauf = true;
    const andere = id === "familie" ? "paar" : "familie";
    const konto = { vorname: "Test", nachname: "Pruefstand", mail: "t_TEST_claude@example.org" };
    Studie.daten = { ...Studie.leer(), phase: "arbeitet", reihenfolge: [id, andere], aktuelle: 0, konto };
    // Ohne angemeldetes Konto bleibt die Kasse beim Gastformular stehen und
    // der Agent fragt nach Name und Mail - in der Erhebung ist das Konto
    // vorher angelegt, im Pruefstand muss es also auch stehen.
    if (typeof Account !== "undefined") Account.setzen(konto);
    // Partnerhaus in beiden Aufgaben, sonst prueft der Lauf nichts
    Studie.daten.gruppe = { ...Studie.daten.gruppe, partnerBesteIn: "beide" };
    Studie.daten.durchlaeufe = [];
    Studie.durchlaufAnlegen?.();
    Studie.kern = this.kern;
    Studie.sichern();
  },
  aufgabeRaeumen() {
    if (typeof Studie === "undefined") return;
    Studie.daten = null;
    Studie.probelauf = false;
    try { sessionStorage.removeItem(Studie.SCHLUESSEL); } catch { /* egal */ }
  },

  /* Was auf dem Bildschirm steht, nicht was im Protokoll steht.
     Wird nach jedem Zug geprueft und im Stand gesammelt, weil der Lauf
     zwischendurch die Seite wechselt. */
  beobachten(g) {
    const s = this.stand();
    if (!s) return;
    const sicht = s.sicht || [];
    const merken = (art, extra = {}) => {
      if (sicht.some((x) => x.art === art && x.zug === s.j)) return;
      sicht.push({ art, zug: s.j, gespraech: g.id, ...extra });
    };
    const karten = [...document.querySelectorAll(".vorschlag-karte")];
    if (karten.length) {
      const prot = this.kern.lauf.protokoll || [];
      const vorgelegt = prot.filter((e) => e.ereignis === "vorschlagsansicht").pop();
      // Partnerhaus in der Vorlage, aber keine Marke auf dem Bildschirm
      if (vorgelegt?.partner && !document.querySelector(".vorschlag-karte.ist-partner")) {
        merken("partner_ohne_marke", { partner: vorgelegt.partner });
      }
      if (vorgelegt?.partner && !/Partnerhaus/.test(document.body.innerText || "")) {
        merken("partner_ohne_wort", { partner: vorgelegt.partner });
      }
      // Aufgabe laeuft, ein Partnerhaus ist vorgesehen, aber keins vorgelegt
      if (g.aufgabe && !vorgelegt?.partner) merken("partner_fehlt_in_vorlage", { ids: vorgelegt?.ids });
      // Gewuenschte Anzahl
      const soll = this.kern.lauf.profil?.anzahlVorschlaege || 3;
      if (karten.length !== soll) merken("anzahl_vorschlaege_falsch", { soll, ist: karten.length });
      // Bild, Preis und Note muessen auf jeder Karte stehen
      if (karten.some((k) => !k.querySelector("img"))) merken("karte_ohne_bild");
      if (karten.some((k) => !/\d/.test(k.querySelector(".vorschlag-preis")?.innerText || ""))) merken("karte_ohne_preis");
    }
    // Eine leere Trefferliste, obwohl der Agent von Treffern spricht
    if (typeof Werkzeuge !== "undefined" && Werkzeuge.seite?.() === "results") {
      const treffer = document.querySelectorAll(".hotel-card, .result-card").length;
      if (treffer === 0 && !document.querySelector(".results-empty, .leer")) merken("liste_leer_ohne_hinweis");
    }
    this.standSetzen({ ...s, sicht });
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
    // Aufgabe stellen, bevor das erste Wort faellt
    if (s.j === 0) { if (g.aufgabe) this.aufgabeStellen(g.aufgabe); else this.aufgabeRaeumen(); }

    await this.ruhe();
    if (s.j < g.texte.length) {
      this.standSetzen({ ...s, j: s.j + 1 });
      console.info(`Pruefstand ${g.id} ${s.j + 1}/${g.texte.length}: ${g.texte[s.j]}`);
      await this.kern.eingabe(g.texte[s.j]);
      await this.ruhe();
      this.beobachten(g);
      setTimeout(() => this.weiter(), 300);
      return;
    }

    // Gespraech zu Ende: auswerten, naechstes beginnen
    this.beobachten(g);
    this.auswerten(g);
    this.aufgabeRaeumen();
    this.standSetzen({ ...s, i: s.i + 1, j: 0, sicht: [] });
    this.kern.zuruecksetzen();
    this.kern.lauf.freigabe = gespraeche[s.i + 1]?.freigabe || g.freigabe;
    this.kern.lauf.freigabeGewaehlt = true;
    this.kern.sichern();
    location.href = "index.html";
  },

  /* ==================================================================
     Auswertung
     ================================================================== */

  /* Ein Gespraech bewerten. Rohfehler aus dem Protokoll, Restfehler aus
     dem, was wirklich im Chat und auf dem Bildschirm stand. */
  auswerten(g) {
    const lauf = this.kern.lauf;
    const p = lauf.profil || {};
    const alle = (lauf.verlauf || []);
    const bot = alle.filter((n) => n.rolle === "bot");
    // Nur, was das Modell formuliert hat. Saetze des Kerns (Lage,
    // Buchungsansage, Rundgangsmeldung) sind gewollt lang und tragen
    // feste Zahlen - sie als Stilfehler zu zaehlen, verwaessert die Quote.
    const modell = bot.filter((n) => n.vomModell);
    /* Was die Person bis zu einer bestimmten Nachricht gesagt hatte.
       Der ganze Verlauf taugt dafuer nicht: Wenn sie den Pool erst drei
       Zuege spaeter nennt, war er beim Agenten trotzdem unmotiviert. */
    const bisHier = new Map();
    let bisher = "";
    for (const n of alle) {
      if (n.rolle === "user") bisher += " \n " + (n.text || "");
      else bisHier.set(n, bisher);
    }
    const prot = lauf.protokoll || [];
    const roh = {};
    const notiz = {};
    for (const e of prot) {
      if (this.ROHFEHLER.includes(e.ereignis)) roh[e.ereignis] = (roh[e.ereignis] || 0) + 1;
      if (this.NOTIZ.includes(e.ereignis)) notiz[e.ereignis] = (notiz[e.ereignis] || 0) + 1;
    }
    // Dasselbe Thema zweimal gefragt: fuer die Person der deutlichste
    // Hinweis, dass ihr nicht zugehoert wurde
    const gefragt = prot.filter((e) => e.ereignis === "thema_gefragt");
    const zweimal = gefragt.filter((e) => (e.mal || 1) > 1);
    if (zweimal.length) roh.thema_zweimal = zweimal.length;
    /* Ein zweiter Anlauf ist erlaubt - er muss nur anders klingen.
       Der Nutzer hatte genau das verlangt: nicht "wieder genau die
       gleiche Frage", sondern nachfassen, ob noch etwas offen ist. Als
       Fehler zaehlt deshalb nicht das zweite Fragen, sondern das
       woertliche Wiederholen. */
    const woertlich = [];
    for (const e of zweimal) {
      const vorher = gefragt.filter((x) => x.thema === e.thema && (x.mal || 1) < (e.mal || 1)).pop();
      if (!vorher?.frage || !e.frage) continue;
      if (this.aehnlich(vorher.frage, e.frage) >= 0.8) woertlich.push({ thema: e.thema, frage: e.frage.slice(0, 160) });
    }

    const belege = this.kern.belege();
    const rest = [];
    const gesehen = [];
    for (const n of modell) {
      const t = String(n.text || "");
      if (!t) continue;
      if (this.kern.fragenZaehlen(t) > 1) rest.push({ art: "zwei_fragen", text: t.slice(0, 200) });
      if (/!/.test(t)) rest.push({ art: "ausrufezeichen", text: t.slice(0, 160) });
      const verboten = t.match(this.VERBOTEN);
      if (verboten) rest.push({ art: "verbotenes_wort", wort: verboten[0], text: t.slice(0, 160) });
      const saetze = t.split(/(?<=[.!?])\s+/).filter(Boolean);
      if (saetze.length > 4) rest.push({ art: "zu_lang", saetze: saetze.length, text: t.slice(0, 160) });
      if (t.length > 420) rest.push({ art: "zu_viele_zeichen", zeichen: t.length, text: t.slice(0, 160) });
      const fremd = typeof Modell !== "undefined" ? Modell.fremdeZahlen(t, belege) : [];
      if (fremd.length) rest.push({ art: "fremde_zahl", zahlen: fremd, text: t.slice(0, 160) });
      // Siezen: die Seite duzt durchgehend
      if (/\bIhnen\b|\bIhre[nmrs]?\b/.test(t)) rest.push({ art: "gesiezt", text: t.slice(0, 160) });
      // Ein Thema anschneiden, das im Gespraech nie vorkam
      for (const th of this.THEMEN) {
        if (!th.bot.test(t)) continue;
        if (th.nutzer.test(bisHier.get(n) || "")) continue;
        if ((p.wuensche || []).some((w) => th.nutzer.test(String(w)))) continue;
        if ((p.kriterien || []).some((w) => th.nutzer.test(String(w)))) continue;
        // In einer Frage darf der Agent Beispiele nennen ("Pool, Strand, Ruhe?")
        const aussage = saetze.filter((x) => !/\?\s*$/.test(x)).join(" ");
        if (!th.bot.test(aussage)) continue;
        rest.push({ art: "unmotiviertes_thema", thema: th.id, text: t.slice(0, 200) });
      }
      // Wiederholung: derselbe Satz in zwei Nachrichten
      for (const satz of saetze) {
        const norm = satz.replace(/\W+/g, "").toLowerCase();
        if (norm.length > 25 && gesehen.includes(norm)) rest.push({ art: "wiederholt", text: satz.slice(0, 160) });
        if (norm.length > 25) gesehen.push(norm);
      }
    }
    for (const w of woertlich) rest.push({ art: "frage_woertlich_wiederholt", thema: w.thema, text: w.frage });
    // Ab dem dritten Anlauf ist auch eine neue Formulierung keine Entschuldigung
    for (const z of zweimal.filter((x) => (x.mal || 1) >= 3)) rest.push({ art: "frage_dreimal", thema: z.thema });

    // Was auf dem Bildschirm auffiel
    const sicht = (this.stand()?.sicht || []).filter((x) => x.gespraech === g.id);
    for (const x of sicht) rest.push(x);

    // Vorschlag gegen den Wunsch, Buchung gegen die Vorlage,
    // Empfehlung ohne Ansicht
    for (const f of this.inhaltPruefen(g, lauf, prot, p)) rest.push(f);

    // Stimmt die Maske am Ende mit dem Stand ueberein?
    const q = new URLSearchParams(location.search);
    const maske = Werkzeuge.seite() === "results" ? {
      erwachsene: +(q.get("adults") || 0) === +(p.erwachsene ?? 0),
      kinder: +(q.get("children") || 0) === +(p.kinder ?? 0),
      alter: !p.kinder || (q.get("ages") || "") === (p.kinderAlter || []).join(","),
      naechte: !p.naechte || q.get("flex") !== "1" || +(q.get("nights") || 0) === +p.naechte,
    } : null;

    const e = this.ergebnis();
    e.push({
      id: g.id, freigabe: g.freigabe, aufgabe: g.aufgabe || null,
      nachrichten: g.texte.length, botNachrichten: bot.length, modellNachrichten: modell.length,
      rohfehler: roh, rohSumme: Object.values(roh).reduce((a, b) => a + b, 0), notiz,
      protokoll: prot.map((x) => x.ereignis),
      restfehler: rest, restSumme: rest.length,
      maske, seite: Werkzeuge.seite(),
      gebucht: prot.some((x) => x.ereignis === "gebucht"),
      vorlagen: prot.filter((x) => x.ereignis === "shortlist").length,
      kosten: lauf.kosten?.euro || 0, aufrufe: lauf.kosten?.aufrufe || 0,
      verlauf: (lauf.verlauf || []).map((n) => `${n.rolle}${n.vomModell ? "*" : ""}: ${n.text}`),
    });
    this.ergebnisSetzen(e);
    console.info(`Pruefstand ${g.id} fertig: ${Object.values(roh).reduce((a, b) => a + b, 0)} Rohfehler, ${rest.length} Restfehler`,
      rest.map((r) => r.art));
  },

  /* Die Pruefungen, die nicht am Satz haengen, sondern an der Sache. */
  inhaltPruefen(g, lauf, prot, p) {
    const funde = [];
    const vorlage = lauf.letzteVorlage || [];
    const holen = (id) => (typeof getItemById === "function" ? getItemById(id) : null);

    // 1. Platz 1 widerspricht dem genannten Wunsch
    const wunsch = (g.erwartet?.wunsch) || (p.wuensche || [])[0];
    const aspekt = this.WUNSCH_ASPEKT[wunsch];
    if (aspekt && vorlage.length > 1 && typeof aspektbilanz === "function") {
      const note = (id) => {
        const it = holen(id); if (!it) return null;
        const b = aspektbilanz(it).find((x) => x.id === aspekt);
        return b ? Math.round(b.anteilPositiv * 100) / 10 : null;
      };
      const werte = vorlage.map((id) => ({ id, note: note(id) })).filter((x) => x.note != null);
      if (werte.length > 1) {
        const erste = werte[0];
        const beste = Math.max(...werte.map((x) => x.note));
        // Platz 1 ist der schlechteste Wert der Auswahl und liegt deutlich
        // unter dem besten: genau der Fall "Essen ist mir wichtig" -> 6,6
        if (erste.note === Math.min(...werte.map((x) => x.note)) && beste - erste.note >= 0.8) {
          funde.push({ art: "platz1_gegen_wunsch", wunsch, note: erste.note, beste,
            haus: holen(erste.id)?.name || erste.id });
        }
      }
    }

    // 2. Gebucht wurde ein Haus, das nicht vorgeschlagen war
    const gebucht = prot.filter((x) => x.ereignis === "gebucht").pop();
    if (gebucht?.id && vorlage.length && !vorlage.includes(gebucht.id) && !lauf.gewaehlt) {
      funde.push({ art: "gebucht_nicht_vorgeschlagen", gebucht: holen(gebucht.id)?.name || gebucht.id,
        vorlage: vorlage.map((id) => holen(id)?.name || id) });
    }
    if (g.erwartet?.gebucht && !gebucht) funde.push({ art: "nicht_gebucht" });

    // 3. Empfohlen, ohne es angesehen zu haben
    const rundgang = prot.filter((x) => x.ereignis === "rundgang_start").pop();
    if (rundgang?.ids?.length && vorlage.length) {
      const nicht = vorlage.filter((id) => !rundgang.ids.includes(id));
      if (nicht.length) funde.push({ art: "haus_nicht_angesehen",
        haeuser: nicht.map((id) => holen(id)?.name || id) });
    }

    // 4. Anzahl der Vorschlaege, wie sie verlangt wurde
    if (g.erwartet?.vorschlaege && vorlage.length && vorlage.length !== g.erwartet.vorschlaege) {
      funde.push({ art: "anzahl_vorschlaege_falsch", soll: g.erwartet.vorschlaege, ist: vorlage.length });
    }

    // 5. Harte Vorgaben der Aufgabe verletzt (nur im Probelauf mit Aufgabe)
    if (g.aufgabe && gebucht?.id && typeof Aufgaben !== "undefined") {
      const a = Aufgaben.nach(g.aufgabe);
      const it = holen(gebucht.id);
      if (a && it && a.pruefen) {
        const gruende = a.pruefen(it, gebucht.gesamt || 0);
        if (gruende.length) funde.push({ art: "buchung_verletzt_vorgaben", haus: it.name, gruende });
      }
    }
    return funde;
  },

  /* Wie aehnlich sind zwei Fragen? Anteil gemeinsamer Woerter, bezogen
     auf die kuerzere. 1 heisst woertlich gleich. */
  aehnlich(a, b) {
    const wort = (x) => String(x).toLowerCase().replace(/[^a-zäöüß ]/g, " ").split(/\s+/).filter((w) => w.length > 2);
    const A = wort(a); const B = new Set(wort(b));
    if (!A.length || !B.size) return 0;
    const treffer = A.filter((w) => B.has(w)).length;
    return Math.round(treffer / Math.min(A.length, B.size) * 100) / 100;
  },

  fertig() {
    sessionStorage.removeItem(this.SCHLUESSEL);
    this.aufgabeRaeumen();
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
    const modellNachrichten = summe((x) => x.modellNachrichten || x.botNachrichten);
    // Was eine Person als groben Fehler bemerken wuerde - nicht jeder
    // Restfehler ist einer (ein Ausrufezeichen faellt niemandem auf)
    const SCHWER = ["gebucht_nicht_vorgeschlagen", "buchung_verletzt_vorgaben", "partner_ohne_marke",
      "partner_ohne_wort", "partner_fehlt_in_vorlage", "platz1_gegen_wunsch", "haus_nicht_angesehen",
      "frage_woertlich_wiederholt", "frage_dreimal", "unmotiviertes_thema", "anzahl_vorschlaege_falsch", "fremde_zahl",
      "nicht_gebucht", "karte_ohne_bild", "karte_ohne_preis", "zwei_fragen", "gesiezt"];
    const schwer = {};
    for (const x of e) for (const r of x.restfehler) if (SCHWER.includes(r.art)) schwer[r.art] = (schwer[r.art] || 0) + 1;
    const schwerSumme = Object.values(schwer).reduce((a, b) => a + b, 0);
    return {
      gespraeche: e.length,
      botNachrichten, modellNachrichten,
      rohfehler: roh, rohSumme: summe((x) => x.rohSumme),
      rohJeNachricht: modellNachrichten ? Math.round(summe((x) => x.rohSumme) / modellNachrichten * 100) / 100 : 0,
      restfehler: rest, restSumme: summe((x) => x.restSumme), notiz,
      // die eigentliche Zahl: grobe Fehler je Gespraech
      schwer, schwerSumme,
      schwerJeGespraech: e.length ? Math.round(schwerSumme / e.length * 100) / 100 : 0,
      gespraecheOhneGrobenFehler: e.filter((x) => !x.restfehler.some((r) => SCHWER.includes(r.art))).map((x) => x.id),
      abbrueche: summe((x) => x.verlauf.filter((t) => /schiefgegangen|nicht erreichbar/.test(t)).length),
      restAnteilProzent: modellNachrichten ? Math.round(summe((x) => x.restSumme) / modellNachrichten * 1000) / 10 : 0,
      maskeFalsch: e.filter((x) => x.maske && Object.values(x.maske).some((v) => v === false)).map((x) => x.id),
      gebucht: e.filter((x) => x.gebucht).map((x) => x.id),
      kostenUSD: Math.round(summe((x) => x.kosten) * 1000) / 1000,
      aufrufe: summe((x) => x.aufrufe),
    };
  },

  // Alle groben Funde im Klartext, mit dem Satz, in dem sie stehen
  protokollLesen() {
    const zeilen = [];
    for (const x of this.ergebnis()) {
      for (const r of x.restfehler) {
        zeilen.push(`${x.id} | ${r.art} | ${r.text || r.haus || r.thema || r.gebucht || JSON.stringify(r).slice(0, 160)}`);
      }
    }
    return zeilen.join("\n");
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Pruefstand };
