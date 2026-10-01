/* Die Pruefung des Kerns - ohne Modell.
   ==================================================================
   Am 28.09.2026 schrieb der Agent "Du reist also allein. Sind von den 1
   Kinder dabei?" und bot "Zwei Kinder" als Antwort an. Der Satz kam
   nicht vom Modell, sondern aus dem Kern: Seit dem Umbau formuliert er
   die Fragen selbst, damit sie zwischen Teilnehmenden gleich lauten und
   sich auswerten lassen. Der Preis dafuer ist, dass er Saetze bauen
   kann, die kein Mensch schreiben wuerde - und bis hierher pruefte das
   niemand.

   Der Pruefstand daneben spielt ganze Gespraeche gegen das Modell. Das
   kostet Geld, dauert Minuten und trifft genau die Raender nicht: eine
   Person, sechs Personen, Kinder ohne Erwachsene, halb ausgefuellte
   Staende. Diese Pruefung geht den umgekehrten Weg. Sie ruft nur den
   Fahrplan, mit tausenden erfundenen Staenden, und haelt jeden Satz und
   jeden Vorschlag gegen feste Regeln:

     - keine Zahl im Satz, die dem Stand widerspricht
     - kein Vorschlag, der groesser ist als die Reisegruppe
     - keine Frage nach etwas, das schon feststeht
     - genau eine Frage je Satz
     - beim zweiten Anlauf ein anderer Wortlaut
     - kein Stand, den es nicht geben kann

   Kostet nichts, laeuft in Sekunden, und laesst sich nach jeder
   Aenderung wiederholen. Aufruf in der Konsole: Kernpruefung.lauf().
   ================================================================== */
const Kernpruefung = {
  /* Die Staende, die durchgespielt werden.
     ------------------------------------------------------------------
     Absichtlich auch unfertige und widerspruechliche: Genau dort
     entstehen die Saetze, die niemand vorgesehen hat. Was der Kern aus
     einem unmoeglichen Stand macht, ist Teil der Pruefung - er soll ihn
     entweder glattziehen oder wenigstens nichts Unsinniges daraus
     ableiten. */
  staende() {
    const raus = [];
    const gruppen = [
      { personen: 1 }, { personen: 2 }, { personen: 3 }, { personen: 5 },
      { erwachsene: 1, kinder: 0 }, { erwachsene: 2, kinder: 0 },
      { erwachsene: 2, kinder: 1, kinderAlter: [6] },
      { erwachsene: 2, kinder: 3, kinderAlter: [4, 7, 12] },
      { erwachsene: 1 }, { kinder: 2 }, { personen: 4, kinder: 2 },
      { personen: 1, erwachsene: 1, kinder: 0 },
      {},
    ];
    const zeiten = [{}, { monat: 1 }, { monat: 5 }, { monat: 8 }, { monat: 12 },
      { monat: 7, naechte: 7 }, { von: "2027-07-12", bis: "2027-07-19", naechte: 7, monat: 7 }];
    const arten = [{}, { typ: "hotel", artGenannt: true }, { typ: "apartment", artGenannt: true }, { artEgal: true }];
    const ziele = [{}, { zielId: "kreta" }, { richtung: "warm", zieleErlaubt: ["mallorca", "kreta"], zielOffen: true },
      { richtung: "kalt", zieleErlaubt: ["tirol", "island"], zielOffen: true }];
    const fluege = [{}, { flug: false }, { flug: true }, { flug: true, flugAb: "Köln" },
      { flug: true, flugAb: "Köln", flugKlasse: "economy" }];
    const rest = [{}, { vorgehen: "top3", beratung: "klaeren" }, { vorgehen: "selbst" },
      { preisEgal: true, verpflegungEgal: true, ausstattungEgal: true }];

    for (const g of gruppen) for (const z of zeiten) for (const a of arten) {
      for (const zi of ziele) for (const f of fluege) for (const r of rest) {
        raus.push({ ...g, ...z, ...a, ...zi, ...f, ...r, flexibel: !z.von });
      }
    }
    return raus;
  },

  // Gespraechsverlaeufe, die den Fahrplan in seine Sonderfaelle treiben
  LAEUFE: [
    { name: "leer", gespraech: [] },
    { name: "sommer", gespraech: [{ role: "user", content: "wir wollen im sommer weg" }] },
    { name: "winter", gespraech: [{ role: "user", content: "ich will mal richtig winter erleben" }] },
    { name: "wochenende", gespraech: [{ role: "user", content: "was fuer ein langes wochenende" }] },
    { name: "gesucht", gespraech: [{ role: "user", content: "hallo" }], gesuchtMit: "x" },
  ],

  ZAHLWORT: { ein: 1, eine: 1, zwei: 2, drei: 3, vier: 4, "fünf": 5, fuenf: 5, sechs: 6 },

  pruefe(p, lauf, fp) {
    const fehler = [];
    const satz = fp.satz || "";
    const chips = (fp.chips || "").split("|").map((x) => x.trim()).filter(Boolean);
    const melde = (art, text) => fehler.push({ art, text, thema: fp.naechstes, satz: satz.slice(0, 120) });

    if (fp.naechstes) {
      if (!satz) melde("kein_satz", `Thema ${fp.naechstes} ohne Fragesatz`);
      if (fp.fertig?.[fp.naechstes]) melde("schon_fertig", `Fragt ${fp.naechstes}, obwohl es feststeht`);
      const fragen = (satz.match(/\?/g) || []).length;
      if (satz && fragen === 0) melde("keine_frage", "Fragesatz ohne Fragezeichen");
      if (fragen > 1) melde("zwei_fragen", `${fragen} Fragezeichen in einem Satz`);
    }

    /* "Sind von den 1 Kinder dabei?"
       ------------------------------------------------------------------
       Die Zahl im Satz muss zur Gruppe passen, und sie muss eine Frage
       zulassen. Bei einer Person ist nichts mehr aufzuteilen. */
    const vonDen = satz.match(/von den (\d+)/i);
    if (vonDen) {
      const n = +vonDen[1];
      if (n !== p.personen) melde("zahl_falsch", `"von den ${n}", im Stand stehen ${p.personen}`);
      if (n < 2) melde("zahl_sinnlos", `"von den ${n}" - bei ${n} Person gibt es nichts aufzuteilen`);
    }
    if (/\b1 Personen\b/.test(satz) || /\b1 Naechte\b/.test(satz) || /\b1 Nächte\b/.test(satz)) {
      melde("plural", "Einzahl mit Pluralwort");
    }

    // Vorschlaege duerfen die Gruppe nicht sprengen
    /* Die Gruppe zaehlt nur, wenn sie feststeht.
       ------------------------------------------------------------------
       Erster Entwurf rechnete bei {erwachsene:1, kinder:unbekannt} eine
       Gruppe von eins aus und meldete "Ein Kind" als zu grossen
       Vorschlag - dabei waeren es dann zwei Reisende. Eine Pruefung, die
       falschen Alarm schlaegt, ist schlimmer als keine: Man gewoehnt
       sich an die Meldungen und uebersieht die echten. */
    const gruppe = p.personen != null ? p.personen
      : (p.erwachsene != null && p.kinder != null ? p.erwachsene + p.kinder : null);
    for (const c of chips) {
      if (!c || c.length > 40) melde("chip_laenge", `Vorschlag "${c}"`);
      const m = c.match(/^(\d+|ein|eine|zwei|drei|vier|fünf|fuenf|sechs)\s*(kind|kinder)?/i);
      if (m && /kind/i.test(c) && gruppe) {
        const n = this.ZAHLWORT[m[1].toLowerCase()] ?? +m[1];
        if (Number.isFinite(n) && n > Math.max(0, gruppe - 1)) {
          melde("chip_zu_gross", `"${c}" bei ${gruppe} Reisenden`);
        }
      }
    }

    // Unmoegliche Staende, auf die der Kern trotzdem aufbaut
    if (p.erwachsene != null && p.kinder != null && p.personen != null
      && p.personen !== p.erwachsene + p.kinder) {
      melde("stand_widerspruch", `personen ${p.personen} != ${p.erwachsene}+${p.kinder}`);
    }
    if (p.kinder > 0 && (p.kinderAlter || []).length && p.kinderAlter.length > p.kinder) {
      melde("stand_widerspruch", `${p.kinderAlter.length} Alter fuer ${p.kinder} Kinder`);
    }
    // Ein unmoeglicher Stand zaehlt erst, wenn der Kern darauf aufbaut.
    // Die Staende hier sind erfunden, auch die, die es nie geben kann -
    // entscheidend ist, was der Fahrplan daraus macht.
    if (p.typ === "apartment" && ["flug", "flugAb", "flugKlasse"].includes(fp.naechstes)) {
      melde("frage_unmoeglich", "Fragt nach dem Flug bei einer Ferienwohnung");
    }

    /* Reste aus der Vorlage.
       ------------------------------------------------------------------
       "undefined", "null", "NaN" oder "[object Object]" in einem Satz
       heisst, dass ein Wert gefehlt hat und trotzdem eingesetzt wurde.
       Im Chat sieht das aus wie ein Absturz und ist einer. */
    if (/\b(undefined|null|NaN)\b|\[object/.test(satz)) melde("platzhalter", "Rest einer Vorlage im Satz");
    if (satz.length > 260) melde("zu_lang", `${satz.length} Zeichen`);
    if (/\s{2,}/.test(satz) || /\s[,.]/.test(satz)) melde("satzbau", "Doppelte Leerzeichen oder Leerzeichen vor Satzzeichen");
    if (new Set(chips.map((c) => c.toLowerCase())).size !== chips.length) melde("chip_doppelt", "Derselbe Vorschlag zweimal");

    /* Ein Monatsname im Satz muss der gemerkte sein.
       ------------------------------------------------------------------
       Der Fall vom 27.09.2026 ("Aktuell gibt es..." statt "Im Mai") war
       die harmlose Seite davon; die gefaehrliche waere ein anderer Monat
       als der, mit dem gerechnet wird. */
    if (p.monat && typeof MONATSNAMEN !== "undefined") {
      const andere = MONATSNAMEN.filter((m, i) => i + 1 !== p.monat && new RegExp(`\\b${m}\\b`).test(satz));
      // Bei der Monatsfrage stehen bewusst mehrere zur Wahl
      if (andere.length && fp.naechstes !== "zeit" && andere.length < 3) {
        melde("monat_falsch", `Satz nennt ${andere.join(", ")}, gemerkt ist ${MONATSNAMEN[p.monat - 1]}`);
      }
    }
    if (p.naechte) {
      const n = satz.match(/(\d+)\s*N(ä|ae)chte/i);
      if (n && +n[1] !== p.naechte) melde("dauer_falsch", `Satz nennt ${n[1]} Naechte, gemerkt sind ${p.naechte}`);
    }
    // Was als offen gemeldet wird, darf nicht feststehen
    for (const t of fp.fehlt || []) {
      if (fp.fertig?.[t]) melde("fehlt_widerspruch", `${t} steht in fehlt, ist aber fertig`);
    }
    if (!["eckdaten", "suche", "beratung", "vorschlaege", "selbst"].includes(fp.phase)) {
      melde("phase_unbekannt", `Phase "${fp.phase}"`);
    }

    return fehler;
  },

  /* Jeder Satz jedes Themas, nicht nur der gerade faellige.
     ------------------------------------------------------------------
     Der Fahrplan zeigt je Stand genau eine Frage. Themen, die weit
     hinten liegen (Anreise, Verpflegung, Wuensche), werden so kaum
     erreicht - und genau dort stehen die Saetze, die seit Wochen
     niemand gelesen hat. Hier bekommt jedes Thema jeden Stand. */
  alleThemen() {
    const fehler = [];
    const themen = Object.keys(Werkzeugkasten.THEMEN || {});
    for (const p of this.staende()) {
      for (const t of themen) {
        for (const wie of [0, 1]) {
          let satz = null;
          try {
            satz = Werkzeugkasten.themenSatz(t, p, { gespraech: [], gefragtWie: { [t]: wie }, verpflegungsLage: null });
          } catch (e) {
            fehler.push({ art: "absturz_thema", thema: t, satz: "", text: String(e && e.message) });
            continue;
          }
          if (!satz) { fehler.push({ art: "kein_satz_thema", thema: t, satz: "", text: `${t} liefert keinen Satz` }); continue; }
          if (/\b(undefined|null|NaN)\b|\[object/.test(satz)) {
            fehler.push({ art: "platzhalter", thema: t, satz: satz.slice(0, 120), text: "Rest einer Vorlage im Satz" });
          }
          const fragen = (satz.match(/\?/g) || []).length;
          if (fragen !== 1) fehler.push({ art: fragen ? "zwei_fragen" : "keine_frage", thema: t, satz: satz.slice(0, 120), text: `${fragen} Fragezeichen` });
          if (/\s{2,}/.test(satz)) fehler.push({ art: "satzbau", thema: t, satz: satz.slice(0, 120), text: "Doppelte Leerzeichen" });
        }
      }
    }
    return fehler;
  },

  /* Zweiter Anlauf, anderer Wortlaut.
     ------------------------------------------------------------------
     Eine woertlich wiederholte Frage wirkt, als haette der Agent nicht
     zugehoert - der haeufigste Vorwurf in den Testlaeufen. Geprueft wird
     jedes Thema einzeln, weil die zweite Fassung je Thema anders
     entsteht (feste Liste, Funktion oder Sonderfall). */
  wortlaut() {
    const fehler = [];
    for (const p of this.staende().slice(0, 400)) {
      for (const l of this.LAEUFE) {
        const a = Werkzeugkasten.fahrplan(p, { ...l, gefragtWie: {} });
        if (!a.naechstes || !a.satz) continue;
        const b = Werkzeugkasten.fahrplan(p, { ...l, gefragtWie: { [a.naechstes]: 1 } });
        if (b.naechstes === a.naechstes && b.satz && b.satz === a.satz) {
          fehler.push({ art: "gleicher_wortlaut", thema: a.naechstes, satz: a.satz.slice(0, 120),
            text: `Zweiter Anlauf bei ${a.naechstes} woertlich gleich` });
        }
      }
    }
    return fehler;
  },

  /* Der Ablauf, von vorn bis zur Vorlage.
     ------------------------------------------------------------------
     Die Pruefungen darueber sehen sich einzelne Staende an. Diese hier
     spielt ganze Gespraeche durch - aber ohne Modell: Eine erfundene
     Person beantwortet immer genau das, was der Fahrplan gerade fragt,
     und die Suche wird simuliert. Danach steht die Reihenfolge der
     Schritte da, und die laesst sich pruefen.

     Genau das hat mir bei den letzten beiden Fehlern gefehlt. Beide
     lagen nicht in einem Satz, sondern in der Reihenfolge: eine Frage
     vor der Suche, die sie voraussetzt. Ein einzelner Stand zeigt so
     etwas nie. */
  ANTWORTEN: {
    zeit: (p) => { p.monat = 7; },
    reisende: (p) => { p.erwachsene = 2; p.kinder = 0; },
    kinderAlter: (p) => { p.kinderAlter = (p.kinderAlter || []).concat(Array.from({ length: (p.kinder || 0) - (p.kinderAlter || []).length }, () => 8)); },
    ziel: (p) => { p.richtung = "warm"; p.zieleErlaubt = ["mallorca", "kreta"]; p.zielOffen = true; },
    art: (p, wahl) => { if (wahl === "apartment") { p.typ = "apartment"; p.artGenannt = true; } else if (wahl === "beides") { p.artEgal = true; } else { p.typ = "hotel"; p.artGenannt = true; } },
    vorgehen: (p, wahl) => { p.vorgehen = wahl === "selbst" ? "selbst" : "top3"; },
    dauer: (p) => { p.naechte = 7; },
    flug: (p, wahl) => { p.flug = wahl === "mitFlug"; },
    flugAb: (p) => { p.flugAb = "Köln"; },
    flugKlasse: (p) => { p.flugKlasse = "economy"; },
    preis: (p) => { p.preisEgal = true; },
    verpflegung: (p) => { p.verpflegungEgal = true; },
    wuensche: (p) => { p.kriterien = [{ id: "ruhe", gewicht: 1 }]; },
    anreise: (p) => { const f = Werkzeugkasten.flexWahl(p); p.anreise = f ? `${f.monat}-12` : "2027-07-12"; },
    anzahl: (p) => { p.anzahlVorschlaege = 3; },
  },

  ablauf({ art = "hotel", vorgehen = "top3", flug = "mitFlug", start = {} } = {}) {
    const p = { flexibel: true, ...start };
    const lauf = { gespraech: [], gefragtWie: {}, gesuchtMit: null, gefiltertMit: null };
    const schritte = [];
    const wahl = { art, vorgehen, flug };
    for (let i = 0; i < 30; i++) {
      const fp = Werkzeugkasten.fahrplan(p, lauf);
      /* Auch der Zwang gehoert zum Ablauf.
         ----------------------------------------------------------------
         Die erste Suche kommt nicht aus der Phase des Fahrplans, sondern
         aus `zwang` - sobald Zeit, Reisende und Art stehen, noch bevor
         das Ziel geklaert ist. Wer das hier weglaesst, simuliert einen
         anderen Ablauf als den, der wirklich laeuft. Gefunden, weil die
         Reihenfolge in der Simulation nicht zu der im Chat passte. */
      const erzwungen = Werkzeugkasten.zwang(p, lauf);
      if (erzwungen === "suchen") {
        schritte.push("suche");
        // Dasselbe, was das Suchwerkzeug hinterlaesst - ohne das verlangt
        // der Zwang die Suche endlos noch einmal
        lauf.gesuchtMit = fp.schluessel;
        lauf.gefiltertMit = Werkzeugkasten.filterSchluessel(p);
        if (p.vorgehen) lauf.vorgehenFuer = fp.schluessel + p.vorgehen;
        continue;
      }
      if (fp.phase === "vorschlaege" || fp.phase === "selbst") { schritte.push(fp.phase); return { schritte, p, fertig: true }; }
      if (fp.phase === "suche") {
        schritte.push("suche");
        lauf.gesuchtMit = fp.schluessel;
        lauf.gefiltertMit = Werkzeugkasten.filterSchluessel(p);
        if (p.vorgehen) lauf.vorgehenFuer = fp.schluessel + p.vorgehen;
        continue;
      }
      if (!fp.naechstes) { schritte.push(`SACKGASSE(${fp.phase})`); return { schritte, p, fertig: false }; }
      schritte.push(fp.naechstes);
      lauf.gefragtWie[fp.naechstes] = (lauf.gefragtWie[fp.naechstes] || 0) + 1;
      const antwort = this.ANTWORTEN[fp.naechstes];
      if (!antwort) { schritte.push(`KEINE_ANTWORT(${fp.naechstes})`); return { schritte, p, fertig: false }; }
      antwort(p, wahl[fp.naechstes] || wahl.art);
    }
    schritte.push("ABBRUCH_NACH_30");
    return { schritte, p, fertig: false };
  },

  ablaeufe() {
    const fehler = [];
    const faelle = [];
    for (const art of ["hotel", "apartment", "beides"]) {
      for (const vorgehen of ["top3", "selbst"]) {
        for (const flug of ["mitFlug", "ohneFlug"]) {
          faelle.push({ art, vorgehen, flug });
        }
      }
    }
    const berichte = [];
    for (const f of faelle) {
      const { schritte, fertig } = this.ablauf(f);
      const name = `${f.art}/${f.vorgehen}/${f.flug}`;
      berichte.push({ name, schritte: schritte.join(" → ") });
      const melde = (art, text) => fehler.push({ art, thema: name, satz: schritte.join(" → "), text });

      if (!fertig) melde("kein_ende", "Der Ablauf kommt nicht zur Vorlage");
      // Kein Thema zweimal - die erfundene Person antwortet ja immer
      const themen = schritte.filter((x) => !["suche", "vorschlaege", "selbst"].includes(x));
      const doppelt = themen.filter((t, i) => themen.indexOf(t) !== i);
      if (doppelt.length) melde("thema_doppelt", `${[...new Set(doppelt)].join(", ")} wird zweimal gefragt`);
      // Die Vorgehensfrage setzt eine Suche voraus
      const iV = schritte.indexOf("vorgehen");
      const iS = schritte.indexOf("suche");
      if (iV >= 0 && (iS < 0 || iS > iV)) melde("reihenfolge", "Vorgehensfrage vor der ersten Suche");
      /* Die Vollstaendigkeitsprobe: welche Themen MUESSEN vorkommen.
         ----------------------------------------------------------------
         Der Nutzer am 28.09.2026: "Wird am Ende einmal geprueft, ob alle
         Aspekte gefragt wurden? Ich hatte das Gefuehl, dass manchmal der
         Flugtag gar nicht abgefragt wurde."

         Er hatte recht, und es war Absicht - aber genau deshalb gehoert
         es aufgeschrieben. Hier steht jetzt je Variante, welche Themen
         kommen muessen und welche bewusst fehlen duerfen. Faellt eines
         kuenftig heraus, ohne dass jemand es hier eintraegt, meldet sich
         die Pruefung. Das ist der Unterschied zwischen "fehlt" und "ist
         mit Grund weggelassen". */
      if (f.vorgehen === "top3" && schritte.includes("vorschlaege")) {
        const mussKommen = ["zeit", "reisende", "art", "ziel", "vorgehen", "dauer", "preis", "wuensche", "anzahl"];
        // Verpflegung nur, wo es sie gibt - eine Ferienwohnung hat keine
        if (f.art !== "apartment") mussKommen.push("verpflegung", "flug");
        // Der Flughafen nur mit Flug, und Fluege gibt es nicht zur Wohnung
        if (f.flug === "mitFlug" && f.art !== "apartment") mussKommen.push("flugAb", "flugKlasse");
        /* Der Anreisetag: ohne Flug hier, mit Flug erst in der
           Buchungsstrecke - dort haengt er an den Flugtagen der
           Verbindung, und die stehen erst mit dem Haus fest. Der Agent
           sagt das beim Vorlegen dazu. */
        if (f.flug !== "mitFlug" || f.art === "apartment") mussKommen.push("anreise");

        for (const t of mussKommen) {
          if (!schritte.includes(t)) melde("thema_fehlt", `${t} wurde nie gefragt`);
        }
        // Und nichts, was hier nicht vorgesehen ist
        for (const t of themen) {
          if (!mussKommen.includes(t) && t !== "kinderAlter") melde("thema_unerwartet", `${t} wurde gefragt, steht aber nicht in der Sollliste`);
        }
      }

      // Eine Ferienwohnung hat keine Verpflegung und keinen Flug
      if (f.art === "apartment") {
        for (const t of ["verpflegung", "flug", "flugAb", "flugKlasse"]) {
          if (schritte.includes(t)) melde("thema_unpassend", `${t} bei einer Ferienwohnung gefragt`);
        }
      }
    }
    return { fehler, berichte };
  },

  /* Die Tippfehler-Rueckfrage, Fall fuer Fall.
     ------------------------------------------------------------------
     Die Pruefungen darueber spielen Staende durch; diese hier ist eine
     Tabelle. Sie muss es sein: Die Vermutung entsteht aus einem Text,
     nicht aus einem Stand, und der einzige Weg, sie festzunageln, sind
     Beispiele mit ihrem erwarteten Ergebnis - richtig geschrieben,
     verschrieben, mehrdeutig, gar nicht gemeint.

     Wer den Wortschatz oder die Abstandsregel anfasst, sieht hier
     sofort, was das kostet. */
  TIPPFEHLER_FAELLE: [
    { thema: "zeit", text: "Gerne im Augus", erwartet: "August" },
    { thema: "zeit", text: "am besten Septmber", erwartet: "September" },
    { thema: "zeit", text: "Dezmber waere schoen", erwartet: "Dezember" },
    // Richtig geschrieben: dann liegt das Problem nicht an der Schreibweise
    { thema: "zeit", text: "gerne im August", erwartet: null },
    // Keine Vorlage fuer eine Vermutung
    { thema: "zeit", text: "ich weiss nicht so genau", erwartet: null },
    { thema: "zeit", text: "keine Ahnung, sag du was", erwartet: null },
    // Zwei verschiedene Vermutungen in einem Satz: lieber keine
    { thema: "zeit", text: "Augus oder Septmber", erwartet: null },
    // Bestaetigt die Person, steht das Wort richtig da: keine neue Vermutung
    { thema: "zeit", text: "Ja, August", erwartet: null },
    // Ein Zeichen neben einer Region des Katalogs
    { thema: "ziel", text: "nach Krati", erwartet: "Krabi" },
    /* Zwei Zeichen in einem kurzen Wort: keine Vermutung. "Lisabo" waere
       wohl Lissabon, aber bei sechs Buchstaben und zwei Fehlern faengt
       das Raten an - dann lieber die normale Rueckfrage. */
    { thema: "ziel", text: "nach Lisabo", erwartet: null },
    { thema: "ziel", text: "wir wollen nach Kretta", erwartet: "Kreta" },
    { thema: "ziel", text: "am liebsten Mallorka", erwartet: "Mallorca" },
    { thema: "ziel", text: "eher was warmes", erwartet: null },
    { thema: "flugAb", text: "ab Hamburgg", erwartet: "Hamburg" },
    { thema: "flugAb", text: "von Duesseldorff", erwartet: "Düsseldorf" },
    // Hamburg und Hannover liegen nah beieinander und werden nicht verwechselt
    { thema: "flugAb", text: "ab Hanburg", erwartet: "Hamburg" },
    { thema: "flugAb", text: "ab Hannoverr", erwartet: "Hannover" },
    { thema: "flugAb", text: "ab Muenchen", erwartet: null },
    { thema: "flugKlasse", text: "Busines bitte", erwartet: "Business" },
    { thema: "art", text: "eine Ferienwonung", erwartet: "eine Ferienwohnung" },
    { thema: "verpflegung", text: "Halbpansion", erwartet: "Halbpension" },
    // Themen ohne Wortschatz raten nicht
    { thema: "dauer", text: "eine Woche", erwartet: null },
    { thema: "preis", text: "hundertfuffzig", erwartet: null },
  ],

  tippfehler() {
    const fehler = [];
    const melde = (art, text, thema) => fehler.push({ art, text, thema, satz: "" });
    for (const f of this.TIPPFEHLER_FAELLE) {
      let raus = null;
      try { raus = Werkzeugkasten.tippfehlerVermutung(f.thema, f.text) || null; }
      catch (e) { melde("tippfehler_absturz", `"${f.text}": ${e && e.message}`, f.thema); continue; }
      if (raus !== (f.erwartet || null)) {
        melde("tippfehler_falsch", `"${f.text}" ergab ${raus ? `"${raus}"` : "keine Vermutung"}, `
          + `erwartet ${f.erwartet ? `"${f.erwartet}"` : "keine"}`, f.thema);
        continue;
      }
      if (!raus) continue;
      const rf = Werkzeugkasten.tippfehlerRueckfrage(f.thema, f.text, {});
      if (!rf) { melde("tippfehler_ohne_satz", `"${f.text}" hat eine Vermutung, aber keine Rueckfrage`, f.thema); continue; }
      // Dieselbe Regel wie fuer jede andere Frage des Kerns: genau eine
      if ((rf.satz.match(/\?/g) || []).length !== 1) {
        melde("tippfehler_zwei_fragen", `nicht genau ein Fragezeichen: "${rf.satz}"`, f.thema);
      }
      if (!rf.satz.includes(raus)) melde("tippfehler_ohne_wort", `Rueckfrage nennt die Vermutung nicht: "${rf.satz}"`, f.thema);
      if (!(rf.chips || []).length) melde("tippfehler_ohne_chips", `Rueckfrage ohne Auswahl: "${rf.satz}"`, f.thema);
      // Wer "Nein" geklickt hat, darf denselben Vorschlag nicht wieder bekommen
      if (Werkzeugkasten.tippfehlerRueckfrage(f.thema, f.text, { tippfehlerGefragt: { [f.thema]: raus } })) {
        melde("tippfehler_wiederholt", `"${raus}" kaeme ein zweites Mal`, f.thema);
      }
    }
    return fehler;
  },
  /* Die Frage nach dem genauen Anreisetag.
     ------------------------------------------------------------------
     Auch das eine Tabelle, aus demselben Grund wie oben: Die Frage
     haengt an einem Stand UND an der letzten Nachricht, und die
     interessanten Faelle sind die, in denen sie NICHT kommen darf -
     wenn der Kern den Monat selbst gewaehlt hat, wenn ein Datum schon
     dasteht, wenn die Person abgewunken hat. */
  DATUM_FAELLE: [
    { name: "nach genanntem Monat", p: { monat: 8, vonPerson: { monat: true } }, lauf: {}, letzte: "im August", stufe: 1 },
    { name: "Chip: Ich habe ein Datum", p: { monat: 8, vonPerson: { monat: true } }, lauf: { datumFrage: 1 }, letzte: "Ich habe ein Datum", stufe: 2 },
    { name: "Chip: Ich bin flexibel", p: { monat: 8, vonPerson: { monat: true } }, lauf: { datumFrage: 1 }, letzte: "Ich bin flexibel", stufe: null },
    { name: "abgewunken mit egal", p: { monat: 8, vonPerson: { monat: true } }, lauf: { datumFrage: 1 }, letzte: "ist mir egal", stufe: null },
    { name: "abgewunken mit weiss nicht", p: { monat: 8, vonPerson: { monat: true } }, lauf: { datumFrage: 1 }, letzte: "weiss nicht", stufe: null },
    // Der Monat kam vom Kern, nicht von der Person: dann gibt es auch keinen Tag
    { name: "Monat vom Kern gewaehlt", p: { monat: 8 }, lauf: {}, letzte: "such du aus", stufe: null },
    { name: "Monat angenommen", p: { monat: 8, vonPerson: { monat: true } }, lauf: { uebersprungen: { zeit: true } }, letzte: "", stufe: null },
    // Ueber Termine ist schon gesprochen worden
    { name: "fester Zeitraum steht", p: { monat: 8, vonPerson: { monat: true }, von: "2027-08-10", bis: "2027-08-17" }, lauf: {}, letzte: "", stufe: null },
    { name: "Anreisetag steht", p: { monat: 8, vonPerson: { monat: true }, anreise: "2027-08-10" }, lauf: {}, letzte: "", stufe: null },
    { name: "Frist genannt", p: { monat: 8, vonPerson: { monat: true }, anreiseBis: "2027-08-20" }, lauf: {}, letzte: "", stufe: null },
    { name: "kein Monat", p: { vonPerson: {} }, lauf: {}, letzte: "", stufe: null },
    // Zweimal gefragt ist genug
    { name: "zweite Stufe war schon", p: { monat: 8, vonPerson: { monat: true } }, lauf: { datumFrage: 2 }, letzte: "hm", stufe: null },
    { name: "erledigt", p: { monat: 8, vonPerson: { monat: true } }, lauf: { datumFrage: 9 }, letzte: "hm", stufe: null },
  ],

  datum() {
    const fehler = [];
    const melde = (art, text) => fehler.push({ art, text, thema: "anreise", satz: "" });
    for (const f of this.DATUM_FAELLE) {
      let raus = null;
      try { raus = Werkzeugkasten.datumRueckfrage(JSON.parse(JSON.stringify(f.p)), f.lauf, f.letzte); }
      catch (e) { melde("datum_absturz", `${f.name}: ${e && e.message}`); continue; }
      const stufe = raus ? raus.stufe : null;
      if (stufe !== f.stufe) {
        melde("datum_falsch", `${f.name}: Stufe ${stufe === null ? "keine" : stufe}, erwartet ${f.stufe === null ? "keine" : f.stufe}`);
        continue;
      }
      if (!raus) continue;
      if ((raus.satz.match(/\?/g) || []).length !== 1) melde("datum_zwei_fragen", `${f.name}: nicht genau ein Fragezeichen: "${raus.satz}"`);
      const monat = typeof MONATSNAMEN !== "undefined" ? MONATSNAMEN[f.p.monat - 1] : null;
      if (monat && !raus.satz.includes(monat)) melde("datum_ohne_monat", `${f.name}: der Monat steht nicht im Satz: "${raus.satz}"`);
      if (raus.stufe === 1 && (raus.chips || []).length !== 2) melde("datum_ohne_chips", `${f.name}: die erste Stufe braucht beide Antworten zur Wahl`);
      // Die Chips der ersten Stufe muessen auch als Antwort taugen: das
      // Abwinken muss erkannt werden, die Zusage nicht
      if (raus.stufe === 1) {
        const [ab, zu] = raus.chips;
        if (!Werkzeugkasten.DATUM_ABWINKEN.test(ab)) melde("datum_chip_unlesbar", `"${ab}" wird nicht als Abwinken gelesen - die Frage kaeme ein zweites Mal`);
        if (Werkzeugkasten.DATUM_ABWINKEN.test(zu)) melde("datum_chip_verwechselt", `"${zu}" wird als Abwinken gelesen - die Nachfrage nach dem Tag bliebe aus`);
      }
    }
    return fehler;
  },
  /* Relative Zeitangaben und die Gegenprobe zur Entschuldigung.
     ------------------------------------------------------------------
     Beides haengt an Text, nicht an einem Stand, also wieder Tabellen.
     Der heutige Tag steht fest eingetragen, sonst waere die Pruefung im
     Dezember eine andere als im Juni. */
  HEUTE_PROBE: new Date(2026, 9, 1),   // 1. Oktober 2026

  RELATIV_FAELLE: [
    { text: "in 2 monaten", monat: 12 },
    { text: "in zwei monaten", monat: 12 },
    { text: "in einem monat", monat: 11 },
    { text: "nächsten monat", monat: 11 },
    { text: "übernächsten monat", monat: 12 },
    { text: "in etwa 3 Monaten", monat: 1 },
    { text: "in 6 wochen", monat: 11 },
    { text: "in einem halben jahr", monat: 4 },
    // Keine relative Angabe: dafuer gibt es den normalen Weg
    { text: "im august", monat: null },
    { text: "wir sind zu zweit", monat: null },
    { text: "", monat: null },
    // Ausserhalb des Rahmens
    { text: "in 30 monaten", monat: null },
    { text: "in 3 jahren", monat: null },
  ],

  VERSTAENDNIS_FAELLE: [
    { thema: "zeit", text: "Dezember ist eine gute Zeit für viele Reiseziele.", wert: "Dezember" },
    { thema: "zeit", text: "Wann soll es denn ungefähr losgehen?", wert: null },
    { thema: "ziel", text: "Kreta wäre dafür gut geeignet.", wert: "Kreta" },
    { thema: "flugAb", text: "Ab Hannover wird es günstiger.", wert: "Hannover" },
    { thema: "art", text: "Eine Ferienwohnung hätte eine Küche.", wert: "eine Ferienwohnung" },
    // Thema ohne Wortschatz: hier traegt das andere Zeichen (verworfen im Zug)
    { thema: "dauer", text: "Sieben Nächte sind üblich.", wert: null },
    { thema: "preis", text: "Ab 69 Euro geht es los.", wert: null },
  ],

  relativ() {
    const fehler = [];
    const melde = (art, text) => fehler.push({ art, text, thema: "zeit", satz: "" });
    for (const f of this.RELATIV_FAELLE) {
      let raus = null;
      try { raus = Werkzeugkasten.relativerMonat(f.text, this.HEUTE_PROBE); }
      catch (e) { melde("relativ_absturz", `"${f.text}": ${e && e.message}`); continue; }
      if ((raus || null) !== (f.monat || null)) {
        melde("relativ_falsch", `"${f.text}" ergab ${raus === null ? "nichts" : raus}, erwartet ${f.monat === null ? "nichts" : f.monat}`);
      }
    }
    // Der Jahreswechsel: zwei Monate nach Dezember ist Februar
    const ueberJahr = Werkzeugkasten.relativerMonat("in 2 monaten", new Date(2026, 11, 15));
    if (ueberJahr !== 2) melde("relativ_jahreswechsel", `Dezember plus zwei Monate ergab ${ueberJahr}, erwartet 2`);
    // Der 31.: ein Monat spaeter darf nicht ueberlaufen
    const ueberlauf = Werkzeugkasten.relativerMonat("nächsten monat", new Date(2026, 9, 31));
    if (ueberlauf !== 11) melde("relativ_monatsende", `31. Oktober plus ein Monat ergab ${ueberlauf}, erwartet 11`);
    for (const f of this.VERSTAENDNIS_FAELLE) {
      let raus = null;
      try { raus = Werkzeugkasten.themaWortImText(f.thema, f.text) || null; }
      catch (e) { melde("verstaendnis_absturz", `"${f.text}": ${e && e.message}`); continue; }
      if (raus !== (f.wert || null)) {
        melde("verstaendnis_falsch", `${f.thema}: "${f.text}" ergab ${raus || "nichts"}, erwartet ${f.wert || "nichts"}`);
      }
    }
    return fehler;
  },
  lauf({ still = false } = {}) {
    const alle = [];
    const staende = this.staende();
    for (const p of staende) {
      for (const l of this.LAEUFE) {
        for (const wie of [{}, { [l.name]: 1 }]) {
          let fp = null;
          const probe = JSON.parse(JSON.stringify(p));
          try {
            fp = Werkzeugkasten.fahrplan(probe, { gespraech: l.gespraech, gesuchtMit: l.gesuchtMit || null, gefragtWie: wie });
          } catch (e) {
            alle.push({ art: "absturz", text: String(e && e.message), thema: null, satz: "", stand: probe });
            continue;
          }
          for (const f of this.pruefe(probe, l, fp)) alle.push({ ...f, stand: probe });
        }
      }
    }
    for (const f of this.wortlaut()) alle.push(f);
    for (const f of this.tippfehler()) alle.push(f);
    for (const f of this.datum()) alle.push(f);
    for (const f of this.relativ()) alle.push(f);
    for (const f of this.alleThemen()) alle.push(f);
    const ab = this.ablaeufe();
    for (const f of ab.fehler) alle.push(f);
    this.letzteAblaeufe = ab.berichte;

    // Zusammenfassen: dieselbe Art mit demselben Satz ist ein Befund
    const gruppen = new Map();
    for (const f of alle) {
      const schluessel = `${f.art}|${f.thema}|${f.text}`;
      if (!gruppen.has(schluessel)) gruppen.set(schluessel, { ...f, mal: 0 });
      gruppen.get(schluessel).mal += 1;
    }
    const befunde = [...gruppen.values()].sort((a, b) => b.mal - a.mal);
    if (!still) {
      console.info(`Kernpruefung: ${staende.length} Staende × ${this.LAEUFE.length} Laeufe, ${befunde.length} Befunde`);
      for (const b of befunde) console.warn(`${b.mal}× [${b.art}] ${b.thema || "-"}: ${b.text}\n   "${b.satz}"`);
    }
    return { staende: staende.length, befunde };
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Kernpruefung };
