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
    /* Eine runde Angabe schliesst ein Datum nicht aus (Nutzer, 02.10.2026).
       Die Ausnahme von gestern ist wieder weg: Wer "in zwei Monaten" sagt,
       kann trotzdem einen Tag im Kopf haben. */
    { name: "Monat aus relativer Angabe", p: { monat: 12, vonPerson: { monat: true } }, lauf: { monatRelativ: true }, letzte: "in zwei monaten", stufe: 1 },
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

  /* Der mittlere Fall: unsicher statt unverstanden.
     ------------------------------------------------------------------
     Die interessanten Zeilen sind die, in denen die Nachfrage NICHT
     kommen darf: wenn die Person ueber die Zeit gar nichts gesagt hat
     (dann waere die Vermutung die des Agenten), bei jedem anderen Thema
     (dort sind die Aufnahmeregeln bereits so breit wie ihr Thema), und
     beim zweiten Mal. */
  UNSICHER_FAELLE: [
    { name: "Ende des Jahres, Monat verworfen", thema: "zeit",
      lauf: { verworfenImZug: { ereignis: "monat_verworfen", monat: 12 } },
      letzte: "so gegen Ende des Jahres", modell: "", label: "Dezember" },
    { name: "Modell sagt den Monat nur", thema: "zeit", lauf: {},
      letzte: "in den Herbstferien", modell: "Oktober passt dafuer gut.", label: "Oktober" },
    // Die Person hat ueber die Zeit nichts gesagt: dann waere es ein Vorschlag des Agenten
    { name: "kein Zeitbezug im Satz", thema: "zeit",
      lauf: { verworfenImZug: { ereignis: "monat_verworfen", monat: 10 } },
      letzte: "hauptsache warm", modell: "Oktober waere warm genug.", label: null },
    // Andere Themen: ihre Aufnahmeregeln fragen schon breit genug
    { name: "Ziel wird nie vorgeschlagen", thema: "ziel",
      lauf: { verworfenImZug: { ereignis: "ziel_verworfen", ziel: "tirol" } },
      letzte: "irgendwas im Winter", modell: "Tirol waere passend.", label: null },
    { name: "Dauer wird nicht geraten", thema: "dauer",
      lauf: { verworfenImZug: { ereignis: "naechte_verworfen", naechte: 7 } },
      letzte: "nicht zu lang", modell: "Sieben Naechte sind ueblich.", label: null },
    // Einmal fragen reicht
    { name: "schon gefragt", thema: "zeit",
      lauf: { verworfenImZug: { ereignis: "monat_verworfen", monat: 12 }, unsicherGefragt: { zeit: "Dezember" } },
      letzte: "so gegen Ende des Jahres", modell: "", label: null },
    // Ohne Wert gibt es nichts zu fragen
    { name: "nichts verworfen, nichts gesagt", thema: "zeit", lauf: {},
      letzte: "irgendwann im naechsten Jahr", modell: "Alles klar.", label: null },
  ],

  unsicher() {
    const fehler = [];
    const melde = (art, text, thema) => fehler.push({ art, text, thema, satz: "" });
    for (const f of this.UNSICHER_FAELLE) {
      let raus = null;
      try { raus = Werkzeugkasten.unsicherRueckfrage(f.thema, f.lauf, f.letzte, f.modell); }
      catch (e) { melde("unsicher_absturz", `${f.name}: ${e && e.message}`, f.thema); continue; }
      const label = raus ? raus.label : null;
      if (label !== (f.label || null)) {
        melde("unsicher_falsch", `${f.name}: ${label || "keine Nachfrage"}, erwartet ${f.label || "keine"}`, f.thema);
        continue;
      }
      if (!raus) continue;
      if ((raus.satz.match(/\?/g) || []).length !== 1) melde("unsicher_zwei_fragen", `${f.name}: "${raus.satz}"`, f.thema);
      if (!raus.satz.includes(label)) melde("unsicher_ohne_wort", `${f.name}: der Wert steht nicht im Satz`, f.thema);
      if ((raus.chips || []).length !== 2) melde("unsicher_ohne_chips", `${f.name}: beide Antworten muessen zur Wahl stehen`, f.thema);
    }
    return fehler;
  },

  /* Keine stille Aenderung des Standes.
     ------------------------------------------------------------------
     Der Fahrplan ist nicht nur eine Auskunft, er traegt auch ein: Kam auf
     ein Thema zweimal keine Antwort, nimmt er das Naheliegende an und
     schreibt es in den Stand. Das ist gewollt, aber nur zusammen mit dem
     Satz, der es ausspricht ("ich rechne mit einer Woche").

     Am 01.10.2026 ist genau diese Kopplung einmal gerissen: Ein zweiter,
     nur fuer die Auswahlkarten gedachter Aufruf schrieb sieben Naechte in
     den Stand, und weil von seinem Ergebnis nur die Chips benutzt wurden,
     fiel der Satz unter den Tisch. In der Uebersicht stand danach eine
     Dauer, die niemand genannt hatte, und die Frage kam nie wieder.

     Gehalten wird die Kopplung an der Marke, die der Fahrplan selbst
     setzt: `lauf.uebersprungen[thema]`. Steht sie, muss er auch etwas zu
     sagen haben. Nicht am Vergleich der Felder - der Fahrplan zieht
     nebenbei auch Widersprueche glatt (Erwachsene aus Gesamtzahl und
     Kindern, kein Flug zur Ferienwohnung), und das ist eine Ableitung aus
     dem, was die Person gesagt hat, keine Annahme darueber hinaus. */
  STILL_ERLAUBT: {
    weiter: "nur der innere Ablauf (schauen oder klaeren), nie eine Angabe der Person",
    beratung: "dito - die Frage wird seit dem 27.09.2026 gar nicht mehr gestellt",
    vorgehen: "wird an anderer Stelle gefragt und dort auch gesagt",
    ziel: "setzt nur zielOffen, also ausdruecklich KEINE Festlegung",
  },

  annahmen() {
    const fehler = [];
    const themen = ["zeit", "weiter", "beratung", "vorgehen", "ziel", "art", "dauer",
      "flug", "flugAb", "flugKlasse", "preis", "verpflegung", "wuensche", "anreise"];
    for (const p of this.staende().slice(0, 300)) {
      for (const t of themen) {
        const probe = JSON.parse(JSON.stringify(p));
        const lauf = { gespraech: [], gefragtWie: { [t]: 2 } };
        let fp = null;
        try { fp = Werkzeugkasten.fahrplan(probe, lauf); }
        catch (e) { fehler.push({ art: "annahme_absturz", thema: t, text: String(e && e.message), satz: "" }); continue; }
        if (!lauf.uebersprungen?.[t]) continue;
        if (this.STILL_ERLAUBT[t]) continue;
        if (!(fp.angenommen || []).length) {
          fehler.push({ art: "annahme_still", thema: t, satz: "",
            text: "Das Thema wird uebergangen und etwas angenommen, ohne dass der Agent etwas dazu sagt" });
          continue;
        }
        /* Und der Satz, den der Kern selbst sagt. Der Auftrag an das
           Modell reicht nicht: Im Testlauf am 01.10.2026 hat es ihn
           ignoriert, und die angenommene Dauer stand unkommentiert in der
           Uebersicht. */
        const eigen = (lauf.annahmeOffen || []).map((e) => (typeof e === "string" ? e : e.text)).join(" ");
        if (!eigen) {
          fehler.push({ art: "annahme_ohne_eigenen_satz", thema: t, satz: "",
            text: "Es gibt nur den Auftrag an das Modell, keinen Satz, den der Kern selbst sagen kann" });
          continue;
        }
        if (!/^[A-ZÄÖÜ]/.test(eigen) || !/[.!?]$/.test(eigen.trim())) {
          fehler.push({ art: "annahme_satzbau", thema: t, satz: eigen.slice(0, 120),
            text: "Der Satz des Kerns ist kein ganzer Satz" });
        }
        // "du" darf nicht den Agenten meinen - der Satz steht in der Ich-Form
        if (!/\bich\b/i.test(eigen)) {
          fehler.push({ art: "annahme_person", thema: t, satz: eigen.slice(0, 120),
            text: "Der Satz des Kerns spricht nicht in der Ich-Form" });
        }
        if (/undefined|null|NaN/.test(eigen)) {
          fehler.push({ art: "annahme_luecke", thema: t, satz: eigen.slice(0, 120),
            text: "Im Satz des Kerns steht ein unausgefuellter Platzhalter" });
        }
      }
    }
    return fehler;
  },

  /* Die Rueckfrage zur Art: Flug, Verpflegung, Sterne.
     ------------------------------------------------------------------
     Der Flug ist seit dem 01.10.2026 dabei und der dringendste Fall: Die
     Seite zeigt den Flugblock nur auf dem Hotelreiter, also darf der
     Agent nicht "mit Flug" merken und weiter unter Ferienwohnungen
     suchen. Die Zeilen mit `label: null` sind die, in denen die Frage
     NICHT kommen darf. */
  ART_FAELLE: [
    { name: "beides offen, Flug gewuenscht", p: { artEgal: true, flug: true }, lauf: {}, grund: "flug" },
    { name: "Ferienwohnung gewaehlt, Flug gewuenscht", p: { typ: "apartment", artGenannt: true, flug: true }, lauf: {}, grund: "flug" },
    { name: "Hotel gewaehlt, Flug gewuenscht", p: { typ: "hotel", artGenannt: true, flug: true }, lauf: {}, grund: null },
    /* Der Stand aus dem Testlauf: artEgal UND typ hotel zugleich. Die
       Liste steht dann auf dem gemeinsamen Reiter, also muss gefragt
       werden - frueher sah die Pruefung nur auf `typ` und schwieg. */
    { name: "artEgal, aber typ noch hotel", p: { artEgal: true, typ: "hotel", flug: true }, lauf: {}, grund: "flug" },
    { name: "beides offen, ohne Flug", p: { artEgal: true, flug: false }, lauf: {}, grund: null },
    { name: "beides offen, Halbpension", p: { artEgal: true, verpflegung: "halb" }, lauf: {}, grund: "verpflegung" },
    { name: "beides offen, vier Sterne", p: { artEgal: true, mindestSterne: 4 }, lauf: {}, grund: "sterne" },
    // Ohne Verpflegung zaehlt nicht: wer selbst kocht, meint eher die Wohnung
    { name: "beides offen, ohne Verpflegung", p: { artEgal: true, verpflegung: "ohne" }, lauf: {}, grund: null },
    // Einmal je Grund, aber der Flug kommt auch nach der Verpflegungsfrage noch
    { name: "Verpflegung schon gefragt", p: { artEgal: true, verpflegung: "halb" }, lauf: { artGefragt: { verpflegung: true } }, grund: null },
    { name: "Verpflegung gefragt, jetzt der Flug", p: { artEgal: true, verpflegung: "halb", flug: true }, lauf: { artGefragt: { verpflegung: true } }, grund: "flug" },
    { name: "Flug schon gefragt", p: { artEgal: true, flug: true }, lauf: { artGefragt: { flug: true } }, grund: null },
    // Alte Laeufe hatten nur den Schalter true - der darf nicht alles sperren
    { name: "alter Schalter, jetzt der Flug", p: { artEgal: true, flug: true }, lauf: { artGefragt: true }, grund: "flug" },
  ],

  art() {
    const fehler = [];
    const melde = (art, text) => fehler.push({ art, text, thema: "art", satz: "" });
    for (const f of this.ART_FAELLE) {
      let raus = null;
      try { raus = Werkzeugkasten.artRueckfrage(JSON.parse(JSON.stringify(f.p)), f.lauf); }
      catch (e) { melde("art_absturz", `${f.name}: ${e && e.message}`); continue; }
      const grund = raus ? raus.grund : null;
      if (grund !== (f.grund || null)) {
        melde("art_falsch", `${f.name}: ${grund || "keine Rueckfrage"}, erwartet ${f.grund || "keine"}`);
        continue;
      }
      if (!raus) continue;
      if ((raus.satz.match(/\?/g) || []).length !== 1) melde("art_zwei_fragen", `${f.name}: "${raus.satz}"`);
      if ((raus.chips || []).length !== 2) melde("art_chips", `${f.name}: beide Wege muessen zur Wahl stehen`);
    }
    return fehler;
  },

  /* Mehrzahl, wo es nur einen gibt.
     ------------------------------------------------------------------
     Zwei Befunde vom 01.10.2026 aus demselben Testlauf: "3 Erwachsene
     und 1 Kind, das merke ich. Wie alt sind die Kinder?" und, nach drei
     genannten Flughaefen, "Soll ich nur von dort suchen, oder beide
     offen lassen?" Beides faellt sofort auf und laesst den Agenten
     wirken, als lese dort niemand mit. Beide Saetze haengen jetzt an
     einer Zahl, die der Kern ohnehin kennt - und diese Pruefung haelt
     das fest. */
  wortwahl() {
    const fehler = [];
    const melde = (art, thema, text, satz = "") => fehler.push({ art, thema, text, satz });
    // Das Alter der Kinder
    for (const n of [1, 2, 3, 4]) {
      const p = { erwachsene: 2, kinder: n, kinderAlter: [] };
      const erste = Werkzeugkasten.themenSatz("kinderAlter", p, { gefragtWie: {} }) || "";
      const zweite = Werkzeugkasten.themenSatz("kinderAlter", p, { gefragtWie: { kinderAlter: 1 } }) || "";
      for (const [wie, satz] of [["erste", erste], ["zweite", zweite]]) {
        if (!satz) { melde("kind_ohne_satz", "kinderAlter", `${n} Kind(er), ${wie} Fassung: kein Satz`); continue; }
        if (!/\?/.test(satz)) melde("kind_ohne_fragezeichen", "kinderAlter", `${n} Kind(er), ${wie} Fassung ohne Fragezeichen`, satz);
        if (n === 1 && /\bKinder\b/.test(satz)) melde("kind_mehrzahl", "kinderAlter", "Ein Kind, aber im Plural gefragt", satz);
        if (n > 1 && /\bdas Kind\b/.test(satz)) melde("kind_einzahl", "kinderAlter", `${n} Kinder, aber in der Einzahl gefragt`, satz);
      }
      if (erste && erste === zweite) melde("kind_gleicher_wortlaut", "kinderAlter", `${n} Kind(er): zweite Fassung woertlich gleich`, erste);
    }
    // Mehrere genannte Flughaefen
    const basis = { erwachsene: 2, kinder: 0, monat: 7, typ: "hotel", artGenannt: true, zielOffen: true,
      zieleErlaubt: ["mallorca", "kreta"], naechte: 7, flug: true, vorgehen: "top3" };
    for (const codes of [["HAJ", "HAM"], ["HAJ", "HAM", "CGN"]]) {
      for (const egal of [false, true]) {
        const p = { ...basis, flugAbAuswahl: codes.slice(), flugAbEgal: egal };
        const lauf = { gespraech: [], gefragtWie: {}, gesuchtMit: Werkzeugkasten.eckdatenSchluessel(p) };
        const fp = Werkzeugkasten.fahrplan(p, lauf);
        if (fp.naechstes !== "flugAb" || !fp.satz) { melde("flughafen_nicht_gefragt", "flugAb", `${codes.length} Flughaefen: der Fahrplan fragt nicht danach`); continue; }
        const chips = (fp.chips || "").split("|").map((x) => x.trim()).filter(Boolean);
        if (codes.length > 2 && /\bbeide\b/i.test(`${fp.satz} ${fp.chips}`)) {
          melde("flughafen_beide", "flugAb", `${codes.length} Flughaefen, aber von "beide" die Rede`, fp.satz);
        }
        if (codes.length > 2 && /günstigere\b/.test(fp.satz)) {
          melde("flughafen_vergleich", "flugAb", "Bei mehr als zweien heisst es \"der guenstigste\"", fp.satz);
        }
        const soll = egal ? 2 : codes.length + 1;
        if (chips.length !== soll) melde("flughafen_chips", "flugAb", `${codes.length} Flughaefen${egal ? ", Wahl abgegeben" : ""}: ${chips.length} Karten, erwartet ${soll}`, fp.chips || "");
        if (/ und .* und /.test(fp.satz)) melde("flughafen_aufzaehlung", "flugAb", "Aufzaehlung mit zweimal \"und\"", fp.satz);
      }
    }
    return fehler;
  },

  /* Die Bitte, die Filter neu zu setzen.
     ------------------------------------------------------------------
     Gemeldet am 01.10.2026: Die Person war auf den Hotelreiter gewechselt
     und bat danach, die Filter wieder zu setzen - der Agent antwortete,
     sie staenden schon. Das Muster muss die Bitte treffen und darf eine
     neue Vorgabe ("setz mir einen Filter fuer Pool") nicht mitnehmen:
     Das waere kein Neuaufbau, sondern eine Ergaenzung. */
  FILTER_FAELLE: [
    { text: "setz bitte nochmal die filter", soll: true },
    { text: "kannst du die Filter nochmal setzen?", soll: true },
    { text: "stell die Filter bitte wieder her", soll: true },
    { text: "die Filter sind weg, bitte neu", soll: true },
    { text: "mach die Suche nochmal", soll: true },
    { text: "setz die filter neu", soll: true },
    // Keine Bitte um einen Neuaufbau
    { text: "kannst du einen Filter für Pool setzen?", soll: false },
    { text: "ich hätte gerne nur Häuser mit Pool", soll: false },
    { text: "zeig mir nochmal die Auswahl", soll: false },
    { text: "was kostet das nochmal?", soll: false },
    { text: "", soll: false },
  ],

  filterbitte() {
    const fehler = [];
    for (const f of this.FILTER_FAELLE) {
      const ist = Werkzeugkasten.FILTER_NEU.test(f.text);
      if (ist !== f.soll) {
        fehler.push({ art: ist ? "filterbitte_zu_weit" : "filterbitte_nicht_erkannt", thema: "suche", satz: f.text,
          text: `"${f.text}" ${ist ? "gilt als Bitte um neue Filter, sollte es aber nicht" : "wird nicht als Bitte um neue Filter gelesen"}` });
      }
    }
    return fehler;
  },

  /* Kein Vorschlag ueber dem Budget.
     ------------------------------------------------------------------
     Gemeldet am 02.10.2026: "5.000 Euro insgesamt" genannt, kein
     einziger Vorschlag darunter. Die Pruefung gegen das Budget rechnete
     nur die Unterkunft; der Flug kam obendrauf und zaehlte nicht mit.
     Auf der Karte stand dagegen die ganze Summe.

     Diese Pruefung nimmt die Zahl, die die Person sieht - Unterkunft
     plus Flug - und haelt sie gegen das Budget. Sie laeuft ueber mehrere
     Monate, Gruppen und Budgets, mit und ohne Flug. */
  BUDGET_FAELLE: [
    { monat: 11, naechte: 9, erwachsene: 2, kinder: 1, budget: 5000, flug: true },
    { monat: 11, naechte: 9, erwachsene: 2, kinder: 1, budget: 5000, flug: false },
    { monat: 1, naechte: 7, erwachsene: 2, kinder: 0, budget: 2000, flug: true },
    { monat: 7, naechte: 14, erwachsene: 4, kinder: 0, budget: 8000, flug: true },
    { monat: 7, naechte: 5, erwachsene: 1, kinder: 0, budget: 900, flug: true },
    { monat: 3, naechte: 7, erwachsene: 2, kinder: 2, budget: 3000, flug: false },
  ],

  budget() {
    const fehler = [];
    for (const f of this.BUDGET_FAELLE) {
      const p = { monat: f.monat, naechte: f.naechte, erwachsene: f.erwachsene, kinder: f.kinder,
        kinderAlter: Array.from({ length: f.kinder }, () => 8), zimmer: 1, typ: "hotel", artGenannt: true,
        budgetGesamt: f.budget, flug: f.flug, flugAb: "München", flugKlasse: "economy", flexibel: true, zielOffen: true };
      let treffer = [];
      try { treffer = Werkzeugkasten.katalogTreffer(p, Werkzeugkasten.filterAusStand(p)); }
      catch (e) { fehler.push({ art: "budget_absturz", thema: "preis", satz: "", text: String(e && e.message) }); continue; }
      for (const h of treffer) {
        const r = Werkzeugkasten.reisepreis(h, p);
        if (!r) { fehler.push({ art: "budget_ohne_preis", thema: "preis", satz: h.name, text: `${h.name}: kein Reisepreis berechenbar` }); continue; }
        if (r.gesamt > f.budget) {
          fehler.push({ art: "budget_ueberschritten", thema: "preis", satz: h.name,
            text: `${h.name} kostet ${Math.round(r.gesamt)} € bei einem Budget von ${f.budget} € (Unterkunft ${Math.round(r.unterkunft)} + Flug ${Math.round(r.flug)})` });
        }
      }
      // Und der Mindestpreis muss zu demselben Massstab passen
      const m = Werkzeugkasten.mindestpreis(p);
      if (m && treffer.length && m.betrag > f.budget) {
        fehler.push({ art: "budget_mindestpreis", thema: "preis", satz: "",
          text: `Es gibt ${treffer.length} Treffer, aber der Mindestpreis liegt mit ${m.betrag} € ueber dem Budget` });
      }
    }
    return fehler;
  },

  /* Das Vergleichsset.
     ------------------------------------------------------------------
     Die Vorlage ist der Reiz der Erhebung, nicht ein Suchergebnis. Am
     02.10.2026 standen dort ein Haus fuer 14.603 Euro und fuenf fuer
     rund 6.000 - das gekennzeichnete war offensichtlich die schlechteste
     Wahl, und damit gab es nichts mehr zu messen.

     Diese Pruefung laeuft ueber Monate, Gruppen, Budgets und
     Reisearten und haelt fuer jedes erzeugte Set drei Dinge fest:
     Preisspanne hoechstens 10 Prozent, Notenspanne hoechstens 0,4, und
     mindestens drei Haeuser, solange der Katalog so viele hergibt. */
  SET_FAELLE: [
    { monat: 11, naechte: 9, erwachsene: 2, kinder: 1, budget: 5000, flug: true, wieViele: 6 },
    { monat: 1, naechte: 7, erwachsene: 2, kinder: 0, budget: 4000, flug: true, wieViele: 3 },
    { monat: 7, naechte: 7, erwachsene: 2, kinder: 2, budget: 3500, flug: false, wieViele: 6 },
    { monat: 5, naechte: 5, erwachsene: 1, kinder: 0, budget: null, flug: false, wieViele: 6 },
    { monat: 3, naechte: 10, erwachsene: 3, kinder: 0, budget: 6000, flug: true, wieViele: 4 },
    { monat: 9, naechte: 7, erwachsene: 2, kinder: 1, budget: 2500, flug: false, wieViele: 6 },
    { monat: 12, naechte: 4, erwachsene: 2, kinder: 0, budget: 1500, flug: false, wieViele: 3 },
  ],

  vorschlagsset() {
    const fehler = [];
    const melde = (art, text, satz = "") => fehler.push({ art, thema: "vorschlaege", text, satz });
    for (const f of this.SET_FAELLE) {
      const p = { monat: f.monat, naechte: f.naechte, erwachsene: f.erwachsene, kinder: f.kinder,
        kinderAlter: Array.from({ length: f.kinder }, () => 8), zimmer: 1, typ: "hotel", artGenannt: true,
        zielOffen: true, flug: f.flug, flugAb: "München", flugKlasse: "economy", flexibel: true,
        ...(f.budget ? { budgetGesamt: f.budget } : {}) };
      let liste = [];
      try {
        liste = Werkzeugkasten.katalogTreffer(p, Werkzeugkasten.filterAusStand(p))
          .sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } catch (e) { melde("set_absturz", String(e && e.message)); continue; }
      if (liste.length < 3) continue;
      let set = null;
      try { set = Werkzeugkasten.vergleichsSet(liste, p, f.wieViele); }
      catch (e) { melde("set_absturz", String(e && e.message)); continue; }
      const name = `${f.monat}/${f.naechte} Naechte/${f.erwachsene}+${f.kinder}${f.flug ? "/Flug" : ""}`;
      if (!set.haeuser.length) { melde("set_leer", `${name}: kein Set, obwohl ${liste.length} Haeuser passen`); continue; }
      if (set.haeuser.length < Math.min(3, f.wieViele)) {
        melde("set_zu_klein", `${name}: nur ${set.haeuser.length} Haeuser aus ${liste.length} passenden`);
      }
      if (set.spanne > 0.10 + 1e-9) {
        melde("set_preisspanne", `${name}: Preisspanne ${(set.spanne * 100).toFixed(1)} % (hoechstens 10)`);
      }
      if ((set.notenSpanne ?? 0) > 0.4 + 1e-9) {
        melde("set_notenspanne", `${name}: Notenspanne ${(set.notenSpanne).toFixed(1)} (hoechstens 0,4)`);
      }
      // Jedes Haus im Set muss das Budget halten - sonst war die Auswahl umsonst
      if (f.budget) {
        for (const h of set.haeuser) {
          const r = Werkzeugkasten.reisepreis(h, p);
          if (r && r.gesamt > f.budget) melde("set_ueber_budget", `${name}: ${h.name} kostet ${Math.round(r.gesamt)} € bei ${f.budget} €`, h.name);
        }
      }
      // Und ein schon festgelegtes Partnerhaus muss im Set bleiben
      const pflicht = set.haeuser[Math.floor(set.haeuser.length / 2)]?.id;
      if (pflicht) {
        const zweites = Werkzeugkasten.vergleichsSet(liste, p, f.wieViele, pflicht);
        if (!zweites.haeuser.some((h) => h.id === pflicht)) {
          melde("set_ohne_partner", `${name}: ein festgelegtes Partnerhaus faellt beim zweiten Zusammenstellen heraus`);
        }
      }
    }
    return fehler;
  },

  /* "Beide offen lassen" darf nicht zu einem Flughafen werden.
     ------------------------------------------------------------------
     Gemeldet am 02.10.2026, und es war ein Folgefehler der Flughafenregel
     vom 30.09.: Das Thema galt als offen, solange zwei Flughaefen zur
     Wahl standen - auch nachdem die Person "beide" gesagt hatte. Nach
     zwei Anlaeufen griff dann die Annahme und nahm den guenstigsten.

     Geprueft wird beides: dass das Muster die Antwort trifft, und dass
     das Thema danach wirklich abgeschlossen ist. */
  MEHRERE_FAELLE: [
    { text: "Beide offen lassen", soll: true },
    { text: "beide", soll: true },
    { text: "Alle drei offen lassen", soll: true },
    { text: "lass beide offen", soll: true },
    { text: "such in beiden", soll: true },
    { text: "Nur München", soll: false },
    { text: "Hannover bitte", soll: false },
    { text: "ist mir egal", soll: false },
  ],

  /* Schreibt der Agent in die Maske, was er danach erwartet?
     ------------------------------------------------------------------
     Gefunden am 02.10.2026 durch den Bericht des Nutzers: "Er setzt oben
     die Zeit, die Personen und die Naechte, drueckt auf Suchen - und
     anstatt dann die Hotels anzusehen, setzt er nochmal die Filter. Er
     geht wieder ins Dropdown Oktober, wieder ins Dropdown Naechte,
     wieder ins Dropdown Person und drueckt nochmal auf Suchen."

     Die Ursache war eine Zeile: Geschrieben wurde `abListe(...).join(",")`
     - "HAMBURG,MUENCHEN" -, verglichen wurde mit `Flug.code(...)` -
     "HAM". Der Vergleich konnte nie aufgehen, also galt die Maske in
     jedem Zug als falsch und wurde neu ausgefuellt.

     Diese Pruefung haelt beides zusammen: Was in die Adresse geschrieben
     wird, muss dasselbe sein, womit nachher verglichen wird - sonst
     laeuft der Agent im Kreis. Sie greift auch, wenn jemand spaeter eine
     dritte Schreibweise einfuehrt.

     Warum das zaehlt, hat der Nutzer selbst gesagt: "Wenn der Bot bei
     manchen Leuten kaputt wirkt, dann verliert man Glaubwuerdigkeit und
     wuerde dann eher das Partnerhaus nicht waehlen." Ein Stoerfaktor,
     der zufaellig auftritt, verschiebt genau die Groesse, die gemessen
     wird. */
  KENNUNG_FAELLE: [
    { text: "München", soll: "MUC" },
    { text: "Hamburg, München", soll: "HAM,MUC" },
    { text: "Hamburg oder München", soll: "HAM,MUC" },
    { text: "Hamburg und München", soll: "HAM,MUC" },
    { text: "Berlin/Frankfurt", soll: "BER,FRA" },
    { text: "HAM,MUC", soll: "HAM,MUC" },
    { text: "MUC", soll: "MUC" },
    { text: "Köln", soll: "CGN" },
    { text: "München, München", soll: "MUC" },
    { text: "", soll: "" },
  ],

  kennungen() {
    const fehler = [];
    if (typeof Flug === "undefined" || !Flug.codeText) return fehler;
    for (const f of this.KENNUNG_FAELLE) {
      const ist = Flug.codeText(f.text);
      if (ist !== f.soll) {
        fehler.push({ art: "kennung_falsch", thema: "flugAb", satz: f.text,
          text: `"${f.text}" wird zu "${ist}", erwartet "${f.soll}"` });
      }
      /* Zweimal uebersetzen muss dasselbe ergeben. Sonst schreibt der
         Agent einmal so und vergleicht beim naechsten Mal anders. */
      if (Flug.codeText(ist) !== ist) {
        fehler.push({ art: "kennung_nicht_stabil", thema: "flugAb", satz: f.text,
          text: `"${ist}" wird beim zweiten Durchgang zu "${Flug.codeText(ist)}"` });
      }
      // Und jede Kennung muss es wirklich geben
      for (const c of Flug.codeListe(f.text)) {
        if (!Flug.flughaefen().some((h) => h.code === c)) {
          fehler.push({ art: "kennung_unbekannt", thema: "flugAb", satz: f.text,
            text: `"${c}" ist kein Flughafen aus der Liste` });
        }
      }
    }
    return fehler;
  },

  flughaefen() {
    const fehler = [];
    for (const f of this.MEHRERE_FAELLE) {
      const ist = Werkzeugkasten.MEHRERE_FLUGHAEFEN.test(f.text);
      if (ist !== f.soll) {
        fehler.push({ art: ist ? "mehrere_zu_weit" : "mehrere_nicht_erkannt", thema: "flugAb", satz: f.text,
          text: `"${f.text}" ${ist ? "gilt als 'beide', sollte es aber nicht" : "wird nicht als 'beide' gelesen"}` });
      }
    }
    // Und das Thema muss danach abgeschlossen sein
    const basis = { erwachsene: 2, kinder: 0, monat: 7, typ: "hotel", artGenannt: true, zielOffen: true,
      naechte: 7, flug: true, vorgehen: "top3", flugKlasse: "economy" };
    const offen = { ...basis, flugAbEgal: true, flugAbAuswahl: ["MUC", "CGN"] };
    const lauf = { gespraech: [], gefragtWie: {}, gesuchtMit: Werkzeugkasten.eckdatenSchluessel(offen) };
    if (Werkzeugkasten.fahrplan(JSON.parse(JSON.stringify(offen)), lauf).fertig.flugAb) {
      fehler.push({ art: "flughafen_zu_frueh_fertig", thema: "flugAb", satz: "",
        text: "Zwei genannte Flughaefen ohne Entscheidung gelten schon als erledigt" });
    }
    const beide = { ...offen, flugAb: "MUC,CGN", flugAbEgal: false };
    const lauf2 = { gespraech: [], gefragtWie: {}, gesuchtMit: Werkzeugkasten.eckdatenSchluessel(beide) };
    const fp2 = Werkzeugkasten.fahrplan(JSON.parse(JSON.stringify(beide)), lauf2);
    if (!fp2.fertig.flugAb) {
      fehler.push({ art: "flughafen_bleibt_offen", thema: "flugAb", satz: "",
        text: "Nach 'beide offen lassen' gilt das Thema immer noch als offen - die Annahme wuerde einen einzelnen Flughafen setzen" });
    }
    // Und die Annahme darf dann gar nicht mehr greifen
    const lauf3 = { gespraech: [], gefragtWie: { flugAb: 2 } };
    const probe = JSON.parse(JSON.stringify(beide));
    Werkzeugkasten.fahrplan(probe, lauf3);
    if (probe.flugAb !== "MUC,CGN") {
      fehler.push({ art: "flughafen_ueberschrieben", thema: "flugAb", satz: probe.flugAb || "",
        text: `Nach zwei Anlaeufen steht ${probe.flugAb} im Stand statt beider Flughaefen` });
    }
    return fehler;
  },

  /* Die Namen muessen aufgehen, bevor etwas eingetragen wird.
     ------------------------------------------------------------------
     Gemeldet am 02.10.2026: drei Reisende, zwei Namen - der Agent trug
     ein und fragte danach nach "der dritten Person, also von dir",
     obwohl die Person im ersten Feld stand. */
  NAMEN_FAELLE: [
    { genannt: ["Liana Mielicki", "Paul Behrendt"], noetig: 3, frage: true },
    { genannt: ["Anna"], noetig: 4, frage: true },
    { genannt: ["A", "B", "C"], noetig: 2, frage: true },
    { genannt: ["A", "B", "C"], noetig: 3, frage: false },
    { genannt: [], noetig: 3, frage: false },
  ],

  namen() {
    const fehler = [];
    for (const f of this.NAMEN_FAELLE) {
      const lauf = f.genannt.length && f.genannt.length !== f.noetig
        ? { namenUnklar: { genannt: f.genannt, noetig: f.noetig } } : {};
      const r = Werkzeugkasten.namenRueckfrage({}, lauf);
      if (!!r !== f.frage) {
        fehler.push({ art: r ? "namen_zu_oft" : "namen_nicht_gefragt", thema: "reisende", satz: "",
          text: `${f.genannt.length} Namen bei ${f.noetig} Reisenden: ${r ? "fragt" : "fragt nicht"}, erwartet ${f.frage ? "fragen" : "nicht fragen"}` });
        continue;
      }
      if (!r) continue;
      if ((r.satz.match(/\?/g) || []).length !== 1) {
        fehler.push({ art: "namen_zwei_fragen", thema: "reisende", satz: r.satz, text: "nicht genau ein Fragezeichen" });
      }
      // Die Rechnung muss im Satz stehen, sonst weiss die Person nicht, woran es haengt
      if (!r.satz.includes(String(f.genannt.length)) && !/einen Namen/.test(r.satz)) {
        fehler.push({ art: "namen_ohne_rechnung", thema: "reisende", satz: r.satz, text: "die Zahl der genannten Namen fehlt" });
      }
      // Einmal fragen reicht
      if (Werkzeugkasten.namenRueckfrage({}, { ...lauf, namenGefragt: true })) {
        fehler.push({ art: "namen_wiederholt", thema: "reisende", satz: "", text: "die Frage kaeme ein zweites Mal" });
      }
    }
    return fehler;
  },

  /* Eine Korrektur wird als Korrektur gesagt.
     ------------------------------------------------------------------
     Gemeldet am 02.10.2026: Nach der Korrektur der Temperaturgrenze kam
     derselbe Satz noch einmal von vorn, als waere nie etwas anderes
     dagewesen. Beim zweiten Mal muss der Unterschied dastehen - was
     dazukommt, was wegfaellt, wie viele es jetzt sind. */
  korrektur() {
    const fehler = [];
    const melde = (art, text, satz = "") => fehler.push({ art, thema: "ziel", text, satz });
    const faelle = [
      { name: "kalt, Grenze hoch", richtung: "kalt", monat: 1, grad: 15, aendert: true },
      { name: "kalt, Grenze runter", richtung: "kalt", monat: 1, grad: 4, aendert: true },
      { name: "warm, Grenze hoch", richtung: "warm", monat: 10, grad: 28, aendert: true },
      { name: "warm, keine Aenderung", richtung: "warm", monat: 10, grad: 20, aendert: false },
    ];
    for (const f of faelle) {
      const th = (typeof Politik !== "undefined" ? Politik.THEMEN || [] : []).find((t) => t.id === f.richtung);
      if (!th) continue;
      const p = { monat: f.monat, richtung: f.richtung, erwachsene: 2, kinder: 0, typ: "hotel" };
      p.zieleErlaubt = Werkzeugkasten.regionenFuerRichtung(th, p);
      const vorher = (p.zieleErlaubt || []).slice();
      p.mindestGrad = f.grad;
      p.zieleErlaubt = Werkzeugkasten.regionenFuerRichtung(th, p);
      const k = Werkzeugkasten.richtungKorrektur(p, vorher);
      const aendert = JSON.stringify(vorher) !== JSON.stringify(p.zieleErlaubt);
      if (aendert !== f.aendert) continue;   // Katalog hat sich geaendert, kein Befund
      if (aendert && !k) { melde("korrektur_fehlt", `${f.name}: die Auswahl aendert sich, aber es wird nichts dazu gesagt`); continue; }
      if (!aendert && k) { melde("korrektur_ohne_grund", `${f.name}: nichts aendert sich, trotzdem ein Korrektursatz`, k); continue; }
      if (!k) continue;
      // Die neue Zahl und die alte muessen im Satz stehen - sonst ist es keine Korrektur
      if (!k.includes(String(p.zieleErlaubt.length)) || !k.includes(String(vorher.length))) {
        melde("korrektur_ohne_zahlen", `${f.name}: alte oder neue Zahl fehlt`, k);
      }
      if (/\d+ weitere weg|\d+ weitere dazu/.test(k) && !/und \d+ weitere|und eine weitere/.test(k)) {
        melde("korrektur_satzbau", `${f.name}: Aufzaehlung ohne "und"`, k);
      }
      if (!/^Alles klar/.test(k)) melde("korrektur_ohne_quittung", `${f.name}: der Satz nimmt die Korrektur nicht auf`, k);
    }
    return fehler;
  },

  /* Der Riegel vor der Vorlage.
     ------------------------------------------------------------------
     Gemeldet am 02.10.2026: "Es wurden keine Fragen zur Halbpension oder
     zum All-Inclusive gefragt, was halt auch verpflichtend ist. Ich
     verstehe nicht, warum das nicht angewendet werden kann, dass es
     einfach Pflichtfragen gibt, die immer gefragt werden muessen, bis
     ueberhaupt diese finale Suche passiert."

     Den Riegel gab es - er ging nur auf, weil ein Thema schon dann als
     erledigt galt, wenn die Person darauf irgendetwas geantwortet hatte
     (`besprochen`), nicht erst, wenn ein Wert im Stand stand. Diese
     Pruefung haelt fest, dass "besprochen" allein nicht reicht. */
  riegel() {
    const fehler = [];
    const basis = { erwachsene: 2, kinder: 0, monat: 7, typ: "hotel", artGenannt: true, zielOffen: true,
      naechte: 7, flug: false, vorgehen: "top3", anzahlVorschlaege: 3, preisEgal: true };
    const faelle = [
      { name: "Verpflegung nur besprochen", p: { ...basis, ausstattungEgal: true }, lauf: { besprochen: { verpflegung: true } }, erwartet: "Verpflegung" },
      { name: "Wuensche nur besprochen", p: { ...basis, verpflegungEgal: true }, lauf: { besprochen: { wuensche: true } }, erwartet: "Wuensche" },
      { name: "Preis nur besprochen", p: { ...basis, verpflegungEgal: true, ausstattungEgal: true, preisEgal: false }, lauf: { besprochen: { preis: true } }, erwartet: "Preis" },
      { name: "alles beantwortet", p: { ...basis, verpflegungEgal: true, ausstattungEgal: true }, lauf: {}, erwartet: null },
    ];
    for (const f of faelle) {
      const probe = JSON.parse(JSON.stringify(f.p));
      const offen = Werkzeugkasten.nochOffen(probe, { gespraech: [], gefragtWie: {}, ...f.lauf });
      const liste = offen.pflicht.join(", ");
      if (f.erwartet && !liste.includes(f.erwartet)) {
        fehler.push({ art: "riegel_offen", thema: "vorschlaege", satz: liste,
          text: `${f.name}: "${f.erwartet}" fehlt in der Pflichtliste, die Vorlage waere erlaubt` });
      }
      if (!f.erwartet && offen.pflicht.length) {
        fehler.push({ art: "riegel_zu", thema: "vorschlaege", satz: liste,
          text: `${f.name}: die Vorlage wird blockiert, obwohl alles beantwortet ist` });
      }
    }
    return fehler;
  },

  /* Das Zimmer waehlt die Person.
     ------------------------------------------------------------------
     Gemeldet am 02.10.2026: Der Agent nahm immer das erste passende -
     also das guenstigste - und fragte nie. Geprueft wird, dass die Frage
     kommt, wenn es etwas zu waehlen gibt, dass sie nur einmal kommt, und
     dass der Preis der Wahl auch wirklich folgt. */
  zimmer() {
    const fehler = [];
    const melde = (art, text, satz = "") => fehler.push({ art, thema: "zimmer", text, satz });
    const hotels = (typeof HOTELS !== "undefined" ? HOTELS : []).slice(0, 25);
    const p = { erwachsene: 2, kinder: 0, zimmer: 1, naechte: 7, monat: 7 };
    let gefragt = 0;
    for (const h of hotels) {
      const liste = Werkzeugkasten.zimmerAuswahl(h, p);
      const r = Werkzeugkasten.zimmerRueckfrage(h, p, {});
      if (liste.length >= 2 && !r) { melde("zimmer_nicht_gefragt", `${h.name}: ${liste.length} Zimmer passen, es wird nicht gefragt`); continue; }
      if (liste.length < 2 && r) { melde("zimmer_unnoetig", `${h.name}: nur ein passendes Zimmer, trotzdem eine Frage`); continue; }
      if (!r) continue;
      gefragt++;
      if ((r.satz.match(/\?/g) || []).length !== 1) melde("zimmer_zwei_fragen", `${h.name}: nicht genau ein Fragezeichen`, r.satz);
      if (!(r.chips || []).length) melde("zimmer_ohne_chips", `${h.name}: keine Auswahl`, r.satz);
      // Schon gewaehlt oder schon gefragt: keine zweite Frage
      if (Werkzeugkasten.zimmerRueckfrage(h, { ...p, zimmerTyp: liste[0].name }, {})) {
        melde("zimmer_trotz_wahl", `${h.name}: fragt, obwohl ein Zimmer gewaehlt ist`);
      }
      if (Werkzeugkasten.zimmerRueckfrage(h, p, { zimmerGefragt: true })) {
        melde("zimmer_wiederholt", `${h.name}: fragt ein zweites Mal`);
      }
      // Und der Preis muss der Wahl folgen
      if (typeof Politik !== "undefined" && liste.length >= 2) {
        const guenstig = Politik.aufenthaltspreis(h, p, 200).gesamt;
        const teuer = Politik.aufenthaltspreis(h, { ...p, zimmerTyp: liste[liste.length - 1].name }, 200).gesamt;
        if (liste[liste.length - 1].aufpreis > 0 && !(teuer > guenstig)) {
          melde("zimmer_ohne_preiswirkung", `${h.name}: das teurere Zimmer kostet nicht mehr`);
        }
      }
    }
    if (hotels.length && !gefragt) melde("zimmer_nie_gefragt", "In keinem der geprueften Hotels kam die Zimmerfrage");
    return fehler;
  },

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
    for (const f of this.unsicher()) alle.push(f);
    for (const f of this.annahmen()) alle.push(f);
    for (const f of this.art()) alle.push(f);
    for (const f of this.wortwahl()) alle.push(f);
    for (const f of this.filterbitte()) alle.push(f);
    for (const f of this.budget()) alle.push(f);
    for (const f of this.vorschlagsset()) alle.push(f);
    for (const f of this.flughaefen()) alle.push(f);
    for (const f of this.kennungen()) alle.push(f);
    for (const f of this.namen()) alle.push(f);
    for (const f of this.korrektur()) alle.push(f);
    for (const f of this.riegel()) alle.push(f);
    for (const f of this.zimmer()) alle.push(f);
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
