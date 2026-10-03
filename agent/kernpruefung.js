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
    /* Nach der zweiten Stufe noch ein Anlauf, der sagt, woran es lag -
       seit dem Befund vom 02.10.2026 ("01.11" fiel ins Nichts). Danach
       ist Schluss: zwei Anlaeufe sind Nachfragen, fuenf ein Verhoer. */
    { name: "dritter Anlauf nach unlesbarer Antwort", p: { monat: 8, vonPerson: { monat: true } }, lauf: { datumFrage: 2 }, letzte: "hm", stufe: 3 },
    { name: "abgewunken nach dem zweiten Anlauf", p: { monat: 8, vonPerson: { monat: true } }, lauf: { datumFrage: 2 }, letzte: "ist mir egal", stufe: null },
    { name: "dritter Anlauf war schon", p: { monat: 8, vonPerson: { monat: true } }, lauf: { datumFrage: 3 }, letzte: "hm", stufe: null },
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
    // Eine Jahreszeit: alle ihre Monate zur Wahl, kein geratener (03.10.2026)
    { name: "im Sommer", thema: "zeit", lauf: {}, letzte: "im Sommer", modell: "Juni ist schoen.", label: "Sommer" },
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
      // Ja/Nein hat zwei Antworten; eine Jahreszeit ihre drei Monate und "Egal"
      const jahreszeit = typeof Werkzeugkasten !== "undefined" && Werkzeugkasten.JAHRESZEITEN[String(label).toLowerCase()];
      const sollChips = jahreszeit ? jahreszeit.length + 1 : 2;
      if ((raus.chips || []).length !== sollChips) melde("unsicher_ohne_chips", `${f.name}: alle Antworten muessen zur Wahl stehen`, f.thema);
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

  /* Angehalten - und die Antwort darauf.
     ------------------------------------------------------------------
     Gemeldet am 03.10.2026: Agent waehrend der Suche angehalten, danach
     kein Wort, und "mach weiter" ergab "Da ist gerade etwas
     schiefgegangen". Geprueft wird dreierlei: Jede Karte unter der
     Meldung fuehrt in den Zweig, den sie verspricht; freie Antworten
     werden richtig gelesen; und ein Verlauf mit fehlendem oder
     dazwischengeratenem Werkzeugergebnis geht geflickt raus. */
  ANHALT_FAELLE: [
    { text: "Weitermachen", soll: "weiter" },
    { text: "mach weiter", soll: "weiter" },
    { text: "Mach bitte weiter!", soll: "weiter" },
    { text: "ja, weiter", soll: "weiter" },
    { text: "Suche fortsetzen", soll: "weiter" },
    { text: "such weiter", soll: "weiter" },
    { text: "Doch buchen", soll: "weiter" },
    { text: "Ich suche selbst weiter", soll: "selbst" },
    { text: "ich mach das lieber selber", soll: "selbst" },
    { text: "ich schau allein", soll: "selbst" },
    { text: "Ich möchte etwas ändern", soll: "aendern" },
    { text: "Nicht buchen", soll: "aendern" },
    { text: "nimm lieber Kreta", soll: "neu" },
    { text: "warum hast du Mallorca genommen?", soll: "neu" },
    { text: "das Budget ist doch 3000 Euro", soll: "neu" },
  ],

  anhalt() {
    const fehler = [];
    const melde = (art, text, satz = "") => fehler.push({ art, text, thema: "anhalt", satz });
    if (typeof Kern === "undefined" || !Kern.anhaltAntwort) { melde("anhalt_fehlt", "Kern.anhaltAntwort fehlt"); return fehler; }
    const attrappe = () => {
      const k = Object.create(Kern);
      k.lauf = { gespraech: [], anhalt: null, profil: {} };
      k.laeuft = false;
      k.gesagt = [];
      k.sagen = (t, r = "bot") => { if (r === "bot") k.gesagt.push(t); };
      k.notieren = () => {};
      k.sichern = () => {};
      k.gespraechPush = (n) => k.lauf.gespraech.push(n);
      return k;
    };
    const lies = (text, werkzeug = "suchen") => {
      const k = attrappe();
      k.lauf.anhalt = { werkzeug, gesagt: true };
      const erledigt = k.anhaltAntwort(text);
      if (k.lauf.fortsetzenMit) return "weiter";
      if (!erledigt) return "neu";
      return /stattdessen|anders machen/.test(k.gesagt.join(" ")) ? "aendern" : "selbst";
    };
    for (const f of this.ANHALT_FAELLE) {
      const ist = lies(f.text, f.text === "Doch buchen" ? "buchung_abschliessen" : "suchen");
      if (ist !== f.soll) melde("anhalt_falsch_gelesen", `"${f.text}" wird als ${ist} gelesen, gemeint ist ${f.soll}`, f.text);
    }
    // Die Meldung selbst: genau eine Frage, und jede Karte haelt, was sie sagt
    for (const werkzeug of ["suchen", "haeuser_ansehen", "buchung_abschliessen", null]) {
      const k = attrappe();
      k.lauf.anhalt = { werkzeug, gesagt: false, untaetig: werkzeug === null };
      k.anhaltMelden();
      const satz = k.gesagt.join(" ");
      if ((satz.match(/\?/g) || []).length !== 1) melde("anhalt_fragen", `Meldung bei ${werkzeug} hat nicht genau ein Fragezeichen`, satz);
      if (!(k.lauf.chips || []).length) melde("anhalt_ohne_karten", `Meldung bei ${werkzeug} ohne Karten`, satz);
      if (k.lauf.gespraech.at(-1)?.role !== "assistant") melde("anhalt_nicht_im_verlauf", "Die Meldung steht nicht im Verlauf - das Modell wuesste nichts davon", satz);
      const erwartet = { "Weitermachen": "weiter", "Doch buchen": "weiter", "Ich suche selbst weiter": "selbst",
        "Ich möchte etwas ändern": "aendern", "Nicht buchen": "aendern" };
      for (const chip of k.lauf.chips || []) {
        const ist = lies(chip, werkzeug || "suchen");
        if (erwartet[chip] && ist !== erwartet[chip]) melde("anhalt_karte_falsch", `Karte "${chip}" fuehrt zu ${ist} statt ${erwartet[chip]}`, chip);
      }
      // Zweites Melden darf nichts sagen
      const vorher = k.gesagt.length;
      k.anhaltMelden();
      if (k.gesagt.length !== vorher) melde("anhalt_doppelt", "Das Anhalten wurde zweimal gemeldet", satz);
    }
    // Der Verlauf: was die Schnittstelle annimmt
    const k = attrappe();
    const gueltig = (liste) => {
      for (let i = 0; i < liste.length; i++) {
        const n = liste[i];
        if (n.role === "tool" && !(liste[i - 1]?.role === "tool" || liste[i - 1]?.tool_calls)) return `verwaistes Ergebnis an Stelle ${i}`;
        if (n.tool_calls?.length) {
          const ids = n.tool_calls.map((c) => c.id);
          const folgend = liste.slice(i + 1, i + 1 + ids.length);
          if (folgend.length !== ids.length || folgend.some((m) => m.role !== "tool" || !ids.includes(m.tool_call_id))) return `Aufruf an Stelle ${i} ohne vollstaendige Ergebnisse direkt danach`;
        }
      }
      return null;
    };
    const ruf = (id, name = "suchen") => ({ id, type: "function", function: { name, arguments: "{}" } });
    const VERLAEUFE = [
      { name: "fehlendes Ergebnis", liste: [{ role: "user", content: "a" }, { role: "assistant", content: null, tool_calls: [ruf("x1"), ruf("x2")] }, { role: "tool", tool_call_id: "x1", content: "{}" }] },
      { name: "Stopp dazwischen", liste: [{ role: "user", content: "a" }, { role: "assistant", content: null, tool_calls: [ruf("y1")] }, { role: "user", content: "stopp" }, { role: "tool", tool_call_id: "y1", content: "{}" }] },
      { name: "verwaistes Ergebnis", liste: [{ role: "user", content: "a" }, { role: "tool", tool_call_id: "z9", content: "{}" }, { role: "assistant", content: "ok" }] },
      { name: "zwei Ketten, die erste offen", liste: [{ role: "assistant", content: null, tool_calls: [ruf("a1")] }, { role: "assistant", content: null, tool_calls: [ruf("b1")] }, { role: "tool", tool_call_id: "b1", content: "{}" }] },
    ];
    for (const v of VERLAEUFE) {
      const raus = k.verlaufReparieren(v.liste);
      const f = gueltig(raus);
      if (f) melde("verlauf_ungueltig", `${v.name}: ${f}`);
      const nutzer = (l) => l.filter((n) => n.role === "user").map((n) => n.content).join("|");
      if (nutzer(raus) !== nutzer(v.liste)) melde("verlauf_nachricht_verloren", `${v.name}: eine Nachricht der Person ging verloren`);
    }
    // Ein heiler Verlauf bleibt, wie er ist
    const heil = [{ role: "user", content: "a" }, { role: "assistant", content: null, tool_calls: [ruf("h1")] }, { role: "tool", tool_call_id: "h1", content: "{}" }, { role: "assistant", content: "fertig" }];
    if (JSON.stringify(k.verlaufReparieren(heil)) !== JSON.stringify(heil)) melde("verlauf_veraendert", "Ein gueltiger Verlauf wurde veraendert");
    return fehler;
  },

  /* Die Vorbelegung der Suchmaske ist keine Angabe der Person.
     ------------------------------------------------------------------
     Gemeldet am 03.10.2026: Chat "12. August, 9 Naechte", Leiste
     "02.11. bis 09.11., 7 Naechte" - die Vorbelegung (in 30 Tagen, eine
     Woche) wurde beim Oeffnen der Hausseite als Wahl uebernommen. */
  seitenstand() {
    const fehler = [];
    const melde = (art, text) => fehler.push({ art, text, thema: "zeit", satz: "" });
    if (typeof Kern === "undefined" || typeof Reisedaten === "undefined" || typeof Werkzeuge === "undefined") return fehler;
    const alt = { seite: Werkzeuge.seite, roh: Reisedaten.roh, flex: Reisedaten.flex };
    const lauf = (adresse) => {
      const k = Object.create(Kern);
      k.lauf = { profil: { monat: 8, anreise: "2027-08-12", naechte: 9, vonPerson: { naechte: true, anreise: true } }, protokoll: [] };
      k.sichern = () => {}; k.standAnzeigen = () => {};
      Werkzeuge.seite = () => "stay";
      Reisedaten.roh = () => adresse;
      Reisedaten.flex = () => null;
      try { k.seitenstandUebernehmen(); } finally { Object.assign(Werkzeuge, { seite: alt.seite }); Object.assign(Reisedaten, { roh: alt.roh, flex: alt.flex }); }
      return k.lauf.profil;
    };
    // Nichts gesetzt: Die Vorbelegung darf nichts aendern
    const p1 = lauf({ von: "", bis: "" });
    if (p1.anreise !== "2027-08-12" || p1.naechte !== 9 || p1.von) {
      melde("vorbelegung_uebernommen", `Ohne gesetzte Daten wurde der Stand geaendert: Anreise ${p1.anreise}, ${p1.naechte} Naechte, von ${p1.von || "-"}`);
    }
    // Wirklich gesetzt, anderer Monat: uebernommen, und der Monat zieht mit
    const p2 = lauf({ von: "2027-11-02", bis: "2027-11-09" });
    if (p2.von !== "2027-11-02") melde("zeitraum_nicht_uebernommen", "Ein gesetzter Zeitraum wurde nicht uebernommen");
    const rest = Werkzeugkasten.zeitWidersprueche(JSON.parse(JSON.stringify(p2)), false);
    if (rest.length) melde("zeitraum_widerspricht_monat", `Nach der Uebernahme widerspricht sich der Stand: ${rest.map((x) => x.art).join(", ")}`);
    return fehler;
  },

  /* Ueber dem Budget wird nichts still vorgelegt (03.10.2026). */
  budgetVorlage() {
    const fehler = [];
    const melde = (art, text) => fehler.push({ art, text, thema: "preis", satz: "" });
    if (typeof Kern === "undefined" || !Kern.budgetVorVorlage) return fehler;
    const ids = (typeof HOTELS !== "undefined" ? HOTELS : []).slice(0, 3).map((h) => h.id);
    const p0 = { monat: 8, naechte: 9, erwachsene: 2, kinder: 1, flug: false };
    const k = Object.create(Kern);
    k.lauf = { protokoll: [], gespraech: [] }; k.gesagt = [];
    k.sagen = (t) => k.gesagt.push(t); k.sichern = () => {}; k.gespraechPush = (n) => k.lauf.gespraech.push(n);
    const kand = ids.map((id) => ({ id, item: getItemById(id) }));
    const preise = kand.map((x) => k.kartenGesamt(x.item, p0));
    if (preise.some((x) => !Number.isFinite(x))) { melde("budget_preis_fehlt", "Kartenpreis nicht berechenbar"); return fehler; }
    const lauf = (budget) => { k.lauf = { protokoll: [], gespraech: [] }; k.gesagt = []; return k.budgetVorVorlage(kand, { ...p0, budgetGesamt: budget }); };
    // Alle darueber: fragen, nicht vorlegen
    let r = lauf(Math.min(...preise) - 1);
    if (!r?.ergebnis?.nichtVorgelegt || !k.lauf.kernWartet || (k.gesagt.join(" ").match(/\?/g) || []).length !== 1) melde("budget_still_vorgelegt", "Alle ueber dem Budget, aber keine Frage vor der Vorlage");
    // Alle darunter: nichts sagen
    r = lauf(Math.max(...preise) + 1);
    if (r || k.gesagt.length) melde("budget_unnoetig", "Alle im Budget, trotzdem ein Satz oder Halt");
    // Einige darueber: sagen, aber vorlegen
    const mitte = [...preise].sort((a, b) => a - b)[1];
    if (Math.min(...preise) < mitte) {
      r = lauf(mitte - 1);
      if (r || !/über deinem Budget/.test(k.gesagt.join(" "))) melde("budget_teilweise_still", "Einzelne ueber dem Budget, aber nicht genannt");
    }
    // Bestaetigt: kein zweites Mal fragen
    k.lauf = { protokoll: [], gespraech: [], budgetBestaetigt: Math.min(...preise) - 1 }; k.gesagt = [];
    if (k.budgetVorVorlage(kand, { ...p0, budgetGesamt: Math.min(...preise) - 1 })) melde("budget_doppelt_gefragt", "Nach 'Trotzdem zeigen' wurde noch einmal gefragt");
    return fehler;
  },

  /* Ankunftszeit: nur was die Person sagt, auf die Auswahl gerundet. */
  ANKUNFT_FAELLE: [
    { text: "so gegen 15 Uhr", soll: "15:00" }, { text: "15:30", soll: "16:00" },
    { text: "wir sind nach 22 Uhr da", soll: "nach 22:00" }, { text: "um 9 uhr morgens", soll: "12:00" },
    { text: "keine Ahnung", soll: null }, { text: "wir sind 3 Personen", soll: null },
    { text: "das Zimmer für 120 Euro", soll: null },
  ],
  ankunft() {
    const fehler = [];
    if (typeof Kern === "undefined" || !Kern.ankunftLesen || typeof Werkzeuge === "undefined") return fehler;
    const alt = Werkzeuge.seite;
    try {
      Werkzeuge.seite = () => "checkout";
      for (const f of this.ANKUNFT_FAELLE) {
        const k = Object.create(Kern); k.lauf = { profil: {}, protokoll: [] };
        k.ankunftLesen(f.text);
        const ist = k.lauf.profil.ankunft || null;
        if (ist !== f.soll) fehler.push({ art: "ankunft_falsch", thema: "kasse", satz: f.text, text: `"${f.text}" ergibt ${ist}, erwartet ${f.soll}` });
      }
      Werkzeuge.seite = () => "results";
      const k = Object.create(Kern); k.lauf = { profil: {}, protokoll: [] };
      k.ankunftLesen("15 Uhr");
      if (k.lauf.profil.ankunft) fehler.push({ art: "ankunft_ausserhalb_kasse", thema: "kasse", satz: "15 Uhr", text: "Ausserhalb der Kasse wurde eine Ankunftszeit gelesen" });
    } finally { Werkzeuge.seite = alt; }
    return fehler;
  },

  /* Antworten auf Fragen des Kerns: Zimmer, Abschluss, Flug (03.10.2026).
     Nach der Antwort muss der naechste Zug genau das wartende Werkzeug
     rufen - vorher ging es nach der Flugwahl nicht weiter, und vom
     Zimmersatz kam nur "Welches soll es sein?" an. */
  kernAntworten() {
    const fehler = [];
    const melde = (art, text, satz = "") => fehler.push({ art, text, thema: "buchung", satz });
    if (typeof Kern === "undefined" || !Kern.zimmerAntwort) return fehler;
    const neu = (lauf) => { const k = Object.create(Kern); k.lauf = { profil: {}, protokoll: [], ...lauf }; return k; };
    const namen = ["Doppelzimmer Meerblick", "Familienzimmer", "Juniorsuite"];
    for (const [text, soll] of [["Familienzimmer", "Familienzimmer"], ["das familienzimmer bitte", "Familienzimmer"],
      ["Juniorsuite", "Juniorsuite"], ["nimm das mit meerblick", "Doppelzimmer Meerblick"], ["keine Ahnung", null]]) {
      const k = neu({ zimmerFrage: { id: "h1", namen } });
      k.zimmerAntwort(text);
      const ist = k.lauf.profil.zimmerTyp || null;
      if (ist !== soll) melde("zimmer_antwort", `"${text}" ergibt ${ist}, erwartet ${soll}`, text);
      if (soll && k.lauf.fortsetzenMit !== "buchung_vorbereiten") melde("zimmer_ohne_fortsetzen", `Nach "${text}" geht die Buchung nicht weiter`, text);
    }
    for (const [text, soll] of [["Ja, abschließen", true], ["ja", true], ["ok mach", true], ["Noch nicht", false], ["nein", false], ["ja, aber nicht jetzt", false]]) {
      const k = neu({ abschlussFrage: "h1" });
      k.abschlussAntwort(text);
      if ((k.lauf.fortsetzenMit === "buchung_abschliessen") !== soll) melde("abschluss_antwort", `"${text}" ${soll ? "schliesst nicht ab" : "schliesst ab"}`, text);
    }
    const k = neu({ flugWartet: "h1", profil: { flugId: "f1" } });
    k.flugAntwort("fahre fort");
    if (k.lauf.fortsetzenMit !== "buchung_vorbereiten") melde("flug_ohne_fortsetzen", "Nach gewaehltem Flug geht die Buchung nicht weiter");
    const k2 = neu({ flugWartet: "h1", profil: {} });
    k2.flugAntwort("fahre fort");
    if (k2.lauf.fortsetzenMit) melde("flug_ohne_wahl_weiter", "Ohne gewaehlten Flug wurde die Buchung fortgesetzt");
    if (typeof Kern.nachricht !== "function") melde("nachricht_fehlt", "Kern.nachricht fehlt - die Flugwahl kaeme nie im Gespraech an");
    return fehler;
  },

  /* "Beides" heisst beides, auch mit altem typ im Stand (03.10.2026:
     Zaehler 148, gesagt 88 - die 88 waren nur die Hotels). */
  katalogArt() {
    const fehler = [];
    const basis = { monat: 8, naechte: 9, erwachsene: 2, kinder: 1, kinderAlter: [9], zimmer: 1 };
    const n = (p) => Werkzeugkasten.katalogTreffer(p, Werkzeugkasten.filterAusStand(p)).length;
    const beides = n({ ...basis, artEgal: true });
    const mitAltemTyp = n({ ...basis, artEgal: true, typ: "hotel" });
    if (beides !== mitAltemTyp) {
      fehler.push({ art: "art_alter_typ", thema: "art", satz: "",
        text: `"Beides" mit altem typ hotel zaehlt ${mitAltemTyp} statt ${beides} - Agent und Seite fragen verschieden` });
    }
    return fehler;
  },

  /* Kasse: was die Person will (03.10.2026). */
  KASSE_FAELLE: [
    { text: "ich möchte bitte keine reiserücktritt versicherung und kann man auch anders als mit kreditkarte zahlen?", versicherung: false, zahlFrage: true },
    { text: "Bitte ohne Versicherung", versicherung: false },
    { text: "Versicherung bitte abwählen", versicherung: false },
    { text: "Die Versicherung will ich nicht haben", versicherung: false },
    { text: "Nimm die Versicherung doch mit dazu", versicherung: true },
    { text: "Ist die Versicherung schon drin?", versFrage: true },
    { text: "Ist die Versicherung nicht schon gebucht?", versFrage: true },
    { text: "Welche Zahlungsarten gibt es?", zahlFrage: true },
    { text: "Kann man auch per Lastschrift zahlen?", zahlFrage: true },
    { text: "Lastschrift", zahlung: "lastschrift", nachFrage: true },
    { text: "Kreditkarte", zahlung: "karte", nachFrage: true },
    { text: "dann bitte per Lastschrift", zahlung: "lastschrift" },
    { text: "Ich hätte doch gerne ein anderes Zimmer", zimmer: true },
    { text: "Kann ich einen anderen Flug nehmen?", flug: true },
    { text: "Ja, abschließen" },
    { text: "Wie viele Nächte sind es nochmal?" },
  ],
  kasse() {
    const fehler = [];
    if (typeof Kern === "undefined" || !Kern.kasseAbsicht) return fehler;
    for (const f of this.KASSE_FAELLE) {
      const ist = Kern.kasseAbsicht(f.text, !!f.nachFrage);
      const soll = { versicherung: f.versicherung ?? null, zahlung: f.zahlung ?? null, zahlFrage: !!f.zahlFrage,
        versFrage: !!f.versFrage, zimmer: !!f.zimmer, flug: !!f.flug };
      for (const k of Object.keys(soll)) {
        if (ist[k] !== soll[k]) fehler.push({ art: "kasse_falsch_gelesen", thema: "kasse", satz: f.text,
          text: `"${f.text}": ${k} ist ${ist[k]}, erwartet ${soll[k]}` });
      }
    }
    return fehler;
  },

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
      if (set.haeuser.length < 2) {
        melde("set_zu_klein", `${name}: nur ${set.haeuser.length} Haeuser aus ${liste.length} passenden`);
      }
      /* Die Spanne gilt, wenn eine Grenze getragen hat. Traegt keine
         (`grenze === null`), ist das der dokumentierte Rueckfall - dann
         steht die gemessene Spanne als `set_unvergleichbar` in den Daten,
         und der Fall ist in der Auswertung erkennbar. Ein stillschweigend
         zu weites Set waere der Fehler, nicht ein gemeldeter. */
      if (set.grenze != null && set.spanne > set.grenze + 1e-9) {
        melde("set_preisspanne", `${name}: Preisspanne ${(set.spanne * 100).toFixed(1)} % bei Grenze ${(set.grenze * 100).toFixed(0)} %`);
      }

      /* Mit Partnerhaus - genau der Fall, der am 02.10.2026 schiefging.
         --------------------------------------------------------------
         Die Pruefung rief `vergleichsSet` bisher ohne Pflichthaus auf und
         konnte deshalb nicht sehen, was im Testlauf passierte: Platz eins
         trug das Etikett und kostete 4.389 Euro, die beiden anderen 2.267
         und 2.407. Das Partnerhaus kam von aussen dazu.

         Jetzt wird jedes der beiden ersten Haeuser einmal als Pflicht
         gesetzt - bestes und zweitbestes, genau die beiden, die die
         Erhebung kennzeichnet - und das Set muss es enthalten. */
      for (const rang of [0, 1]) {
        const pflicht = liste[rang]?.id;
        if (!pflicht) continue;
        let mitP = null;
        try { mitP = Werkzeugkasten.vergleichsSet(liste, p, f.wieViele, pflicht); }
        catch (e) { melde("set_absturz", `${name} mit Pflichthaus: ${e && e.message}`); continue; }
        if (!mitP.haeuser.length) { melde("set_leer", `${name}: kein Set mit Pflichthaus ${pflicht}`); continue; }
        if (!mitP.haeuser.some((h) => h.id === pflicht)) {
          melde("partner_nicht_im_set", `${name}: Pflichthaus ${pflicht} fehlt im Set`);
        }
        if (mitP.grenze != null && mitP.spanne > mitP.grenze + 1e-9) {
          melde("set_preisspanne", `${name} mit ${pflicht}: Preisspanne ${(mitP.spanne * 100).toFixed(1)} % bei Grenze ${(mitP.grenze * 100).toFixed(0)} %`);
        }
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

  /* Liest der Kern die Antwort auf seine eigene Frage?
     ------------------------------------------------------------------
     Der Befund vom 02.10.2026: Auf "Wie lange soll die Reise werden?"
     kam "9", dann "9 Nächte", und der Agent fragte beide Male noch
     einmal. Dass es daran lag, dass das Modell kein Werkzeug rief, ist
     kein Trost - die Person sieht nur, dass ihre Antwort nicht ankommt.

     Geprüft wird deshalb beides: dass der Kern den Wert aus dem Satz
     holt, und dass das Thema danach abgehakt ist. Der zweite Teil ist
     der wichtigere - er ist genau das, was im Test schiefging. */
  SELBST_FAELLE: [
    { thema: "dauer", text: "9", feld: "naechte", wert: 9 },
    { thema: "dauer", text: "9 Nächte", feld: "naechte", wert: 9 },
    { thema: "dauer", text: "neun nächte", feld: "naechte", wert: 9 },
    { thema: "dauer", text: "neun", feld: "naechte", wert: 9 },
    { thema: "dauer", text: "eine Woche", feld: "naechte", wert: 7 },
    { thema: "dauer", text: "zwei Wochen", feld: "naechte", wert: 14 },
    { thema: "dauer", text: "10 Tage", feld: "naechte", wert: 10 },
    { thema: "dauer", text: "12 Übernachtungen", feld: "naechte", wert: 12 },
    { thema: "dauer", text: "gerne 12 naechte", feld: "naechte", wert: 12 },
    // Keine Dauer: daraus darf nichts werden
    { thema: "dauer", text: "ich bin flexibel", feld: "naechte", wert: null },
    { thema: "dauer", text: "weiß ich noch nicht", feld: "naechte", wert: null },
    { thema: "dauer", text: "egal", feld: "naechte", wert: null },
    { thema: "dauer", text: "99", feld: "naechte", wert: null },
    // Was die Person selbst gesagt hat, wird nicht ueberschrieben
    { thema: "dauer", text: "9 Nächte", stand: { naechte: 7, vonPerson: { naechte: true } }, feld: "naechte", wert: 7 },
    // Eine Annahme des Kerns schon
    { thema: "dauer", text: "9 Nächte", stand: { naechte: 7 }, angenommen: true, feld: "naechte", wert: 9 },
    { thema: "reisende", text: "4", feld: "personen", wert: 4 },
    { thema: "reisende", text: "wir sind 3 Personen", feld: "personen", wert: 3 },
    { thema: "reisende", text: "zwei Erwachsene", feld: "erwachsene", wert: 2 },
    { thema: "reisende", text: "keine Ahnung", feld: "personen", wert: null },
    { thema: "kinderAlter", text: "6 und 9", stand: { kinder: 2 }, feld: "kinderAlter", wert: [6, 9] },
    { thema: "kinderAlter", text: "sechs", stand: { kinder: 1 }, feld: "kinderAlter", wert: [6] },
    // Zahlen, die kein Alter sein koennen: dann lieber nichts
    { thema: "kinderAlter", text: "geboren 2019", stand: { kinder: 1 }, feld: "kinderAlter", wert: null },
    { thema: "flugKlasse", text: "Premium Economy", stand: { flug: true }, feld: "flugKlasse", wert: "premium" },
    { thema: "flugKlasse", text: "Business bitte", stand: { flug: true }, feld: "flugKlasse", wert: "business" },
    { thema: "flugKlasse", text: "Economy", stand: { flug: true }, feld: "flugKlasse", wert: "economy" },
    { thema: "flug", text: "nur die Unterkunft", feld: "flug", wert: false },
    { thema: "flug", text: "mit Flug", feld: "flug", wert: true },
    /* "Ja" bleibt liegen, und das ist Absicht: Die zweite Fassung der
       Frage lautet "Bucht ihr den Flug selbst, oder soll ich ihn
       mitsuchen?" - dort heisst ja das Gegenteil. Lieber noch einmal
       fragen als die Reise falsch bauen. */
    { thema: "flug", text: "ja", feld: "flug", wert: null },
  ],

  QUITTUNG_FAELLE: [
    { text: "Ich merke mir 9 Nächte.", quittung: true },
    { text: "9 Nächte merke ich mir.", quittung: true },
    { text: "Das notiere ich.", quittung: true },
    { text: "Ich notiere Juni.", quittung: true },
    { text: "Juni ist notiert.", quittung: true },
    { text: "Das habe ich mir gemerkt.", quittung: true },
    { text: "Ich halte zwei Zimmer fest.", quittung: true },
    { text: "Ich speichere das so.", quittung: true },
    { text: "Ich trage Business ein.", quittung: true },
    { text: "Das nehme ich so auf.", quittung: true },
    // Kein Quittieren - diese Saetze darf der Kern nicht wegstreichen
    { text: "Juni ist eine gute Zeit für Kreta.", quittung: false },
    { text: "Ich suche dir drei Häuser heraus.", quittung: false },
    { text: "Alles klar.", quittung: false },
    { text: "Die Filter sind gesetzt.", quittung: false },
  ],

  selbstgelesen() {
    const fehler = [];
    const melde = (art, text, thema) => fehler.push({ art, text, thema: thema || null, satz: "" });
    const kernFuer = (p, angenommen, thema) => ({
      lauf: { profil: p, gespraech: [], uebersprungen: angenommen ? { [thema]: true } : {},
        nichtVerstanden: {}, selbstGelesen: [], zuletztGemerkt: [] },
      notieren() {}, standAnzeigen() {}, sichern() {},
    });
    for (const f of this.SELBST_FAELLE) {
      const p = JSON.parse(JSON.stringify(f.stand || {}));
      const kern = kernFuer(p, f.angenommen, f.thema);
      try { Werkzeugkasten.antwortSelbstLesen(kern, f.thema, f.text); }
      catch (e) { melde("selbst_absturz", `"${f.text}": ${e && e.message}`, f.thema); continue; }
      const ist = p[f.feld] === undefined ? null : p[f.feld];
      if (JSON.stringify(ist) !== JSON.stringify(f.wert === undefined ? null : f.wert)) {
        melde("selbst_falsch", `${f.thema}: "${f.text}" ergab ${f.feld}=${JSON.stringify(ist)}, erwartet ${JSON.stringify(f.wert)}`, f.thema);
      }
      /* Was der Kern aufnimmt, muss er auch quittieren koennen - und nur
         das. Bleibt der Stand wie er war (weil die Person den Wert selbst
         genannt hat), gibt es nichts zu quittieren. */
      const vorWert = (f.stand || {})[f.feld] === undefined ? null : (f.stand || {})[f.feld];
      const veraendert = JSON.stringify(ist) !== JSON.stringify(vorWert);
      if (veraendert && !(kern.lauf.zuletztGemerkt || []).includes(f.feld)) {
        melde("selbst_ohne_quittung", `${f.thema}: "${f.text}" wurde gesetzt, steht aber nicht in zuletztGemerkt`, f.thema);
      }
    }
    /* Der eigentliche Befund: Nach einer klaren Antwort darf dieselbe
       Frage nicht wieder kommen. Geprueft am vollen Fahrplan, einmal mit
       jedem Zaehlerstand - beim zweiten Anlauf war der Wortlaut im Test
       Wort fuer Wort derselbe. */
    const GRUND = { monat: 6, zielOffen: true, artEgal: true, flug: false, vorgehen: "selbst",
      erwachsene: 2, kinder: 0, naechte: 7 };
    const WIEDER = [
      { thema: "dauer", text: "9 Nächte", offen: { naechte: null }, feld: "naechte" },
      { thema: "dauer", text: "9", offen: { naechte: null }, feld: "naechte" },
      { thema: "flug", text: "nur die Unterkunft", offen: { flug: null }, feld: "flug" },
      { thema: "flugKlasse", text: "Business", offen: { flug: true, flugAb: "Köln", flugKlasse: null }, feld: "flugKlasse" },
      { thema: "kinderAlter", text: "6 und 9", offen: { kinder: 2, kinderAlter: null }, feld: "kinderAlter" },
    ];
    for (const w of WIEDER) {
      for (const mal of [0, 1, 2]) {
        const p = { ...GRUND, ...w.offen };
        for (const k of Object.keys(w.offen)) if (w.offen[k] === null) delete p[k];
        const lauf = { gespraech: [{ role: "user", content: w.text }], gefragtWie: { [w.thema]: mal },
          besprochen: {}, uebersprungen: {}, nichtVerstanden: {}, profil: p,
          selbstGelesen: [], zuletztGemerkt: [] };
        const kern = { lauf, notieren() {}, standAnzeigen() {}, sichern() {} };
        let vorher = null;
        try { vorher = Werkzeugkasten.fahrplan(JSON.parse(JSON.stringify(p)), { ...lauf, profil: undefined }); } catch { vorher = null; }
        try { Werkzeugkasten.antwortSelbstLesen(kern, w.thema, w.text); }
        catch (e) { melde("selbst_absturz", `${w.thema}: ${e && e.message}`, w.thema); continue; }
        if (p[w.feld] === undefined || p[w.feld] === null) {
          melde("antwort_nicht_gelesen", `${w.thema}: "${w.text}" kam nicht im Stand an (Zähler ${mal})`, w.thema);
          continue;
        }
        let fp = null;
        try { fp = Werkzeugkasten.fahrplan(p, lauf); }
        catch (e) { melde("selbst_absturz", `${w.thema} Fahrplan: ${e && e.message}`, w.thema); continue; }
        if (fp.naechstes === w.thema) {
          melde("frage_nach_antwort", `${w.thema}: "${w.text}" beantwortet, der Fahrplan fragt es trotzdem wieder (Zähler ${mal})`, w.thema);
        }
        if (vorher && vorher.satz && fp.satz && vorher.satz === fp.satz) {
          melde("frage_wortgleich", `${w.thema}: derselbe Satz vor und nach der Antwort (Zähler ${mal})`, w.thema);
        }
      }
    }
    /* Irgendwer muss es quittieren.
       ----------------------------------------------------------------
       Der Kern laesst in seinem Satz weg, was im Vorspann des Modells
       schon steht - und das Modell sagt "Ich merke mir 9 Naechte.",
       was gleich danach weggestrichen wird. Laeuft das in der falschen
       Reihenfolge, verdraengt ein Satz, den niemand liest, den Satz,
       der die Aufnahme bestaetigt: Die Zahl steht dann im Stand, und
       gesagt hat es keiner. */
    {
      const p = {};
      const lauf = { profil: p, gespraech: [], uebersprungen: {}, nichtVerstanden: {},
        selbstGelesen: [], zuletztGemerkt: [], gefragt: null };
      const kern = { lauf, notieren() {}, standAnzeigen() {}, sichern() {} };
      Werkzeugkasten.antwortSelbstLesen(kern, "dauer", "9 Nächte");
      const modell = "Ich merke mir 9 Nächte.";
      const uebrig = modell.split(/(?<=[.!?])\s+/).filter((x) => !Werkzeugkasten.QUITTUNG.test(x)).join(" ").trim();
      const satz = Werkzeugkasten.aufnahmeSatz(kern, uebrig);
      if (!satz || !/9/.test(satz)) {
        melde("aufnahme_ohne_satz", `Nach "9 Nächte" quittiert niemand: Kern sagt ${satz ? `"${satz}"` : "nichts"}`, "dauer");
      }
    }
    for (const f of this.QUITTUNG_FAELLE) {
      const ist = Werkzeugkasten.QUITTUNG.test(f.text);
      if (ist !== f.quittung) {
        melde(f.quittung ? "quittung_nicht_erkannt" : "quittung_falsch_erkannt",
          `"${f.text}" ${ist ? "gilt" : "gilt nicht"} als Quittung, erwartet ${f.quittung ? "ja" : "nein"}`);
      }
    }
    return fehler;
  },

  /* Datum und Preis: zwei Angaben, die der Agent falsch gelesen hat.
     ------------------------------------------------------------------
     Beide gemeldet am 02.10.2026. Auf "An welchem Tag im Oktober?" kam
     "01.11" und verschwand; auf "Hast du eine feste Grenze fuer die
     ganze Reise?" kam "5000 Euro" und wurde zu 5.000 Euro pro Nacht. */
  TAG_FAELLE: [
    { text: "01.11", tag: 1, monat: 11 },
    { text: "1.11.", tag: 1, monat: 11 },
    { text: "3.12.2027", tag: 3, monat: 12 },
    { text: "2027-10-09", tag: 9, monat: 10 },
    { text: "15. Oktober", tag: 15, monat: 10 },
    { text: "15. Okt", tag: 15, monat: 10 },
    { text: "14", tag: 14, monat: null },
    { text: "14.", tag: 14, monat: null },
    { text: "am 14.", tag: 14, monat: null },
    { text: "den 9.", tag: 9, monat: null },
    // Kein Tag: daraus darf nichts werden
    { text: "ich bin flexibel", tag: null },
    { text: "9 nächte", tag: null },
    { text: "zwischen dem 10. und 20.", tag: null },
    { text: "egal", tag: null },
    { text: "40", tag: null },
  ],

  PREIS_FAELLE: [
    { betrag: 5000, text: "5000 Euro", feld: "budgetGesamt" },
    { betrag: 5000, text: "5000", feld: "budgetGesamt" },
    { betrag: 3000, text: "3000 für die ganze Reise", feld: "budgetGesamt" },
    { betrag: 2000, text: "insgesamt 2000", feld: "budgetGesamt" },
    { betrag: 150, text: "150 pro Nacht", feld: "maxPreis" },
    { betrag: 150, text: "150", feld: "maxPreis" },
    { betrag: 120, text: "höchstens 120 € die Nacht", feld: "maxPreis" },
    // Was die Person sagt, schlaegt die Hoehe
    { betrag: 900, text: "900 pro Nacht", feld: "maxPreis" },
  ],

  datumUndPreis() {
    const fehler = [];
    const melde = (art, text, thema) => fehler.push({ art, text, thema: thema || null, satz: "" });
    for (const f of this.TAG_FAELLE) {
      let d = null;
      try { d = Werkzeugkasten.tagAusText(f.text); }
      catch (e) { melde("tag_absturz", `"${f.text}": ${e && e.message}`, "anreise"); continue; }
      const ist = d ? { tag: d.tag, monat: d.monat == null ? null : d.monat } : null;
      const soll = f.tag == null ? null : { tag: f.tag, monat: f.monat == null ? null : f.monat };
      if (JSON.stringify(ist) !== JSON.stringify(soll)) {
        melde("tag_falsch", `"${f.text}" ergab ${JSON.stringify(ist)}, erwartet ${JSON.stringify(soll)}`, "anreise");
      }
    }
    /* Der Widerspruch, und dass er nur dort entsteht, wo er hingehoert. */
    const wid = (stand, text) => { try { return Werkzeugkasten.datumWiderspruch(stand, text); } catch { return undefined; } };
    const w1 = wid({ monat: 10 }, "01.11");
    if (!w1 || w1.tag !== 1 || w1.genannt !== 11 || w1.gesucht !== 10) {
      melde("widerspruch_fehlt", `"01.11" im Oktober ergab keinen Widerspruch (${JSON.stringify(w1)})`, "anreise");
    } else if (!/November/.test(w1.satz) || !/Oktober/.test(w1.satz)) {
      melde("widerspruch_ohne_lesarten", `Der Satz nennt nicht beide Monate: "${w1.satz}"`, "anreise");
    } else if ((w1.satz.match(/\?/g) || []).length !== 1) {
      melde("widerspruch_zwei_fragen", `Nicht genau ein Fragezeichen: "${w1.satz}"`, "anreise");
    }
    for (const f of [{ stand: { monat: 10 }, text: "14" }, { stand: { monat: 10 }, text: "14.10" },
      { stand: { monat: 10 }, text: "ich bin flexibel" },
      { stand: { monat: 10, anreise: "2027-10-05" }, text: "01.11" }]) {
      const w = wid(f.stand, f.text);
      if (w) melde("widerspruch_zu_viel", `"${f.text}" ergab einen Widerspruch, obwohl keiner vorliegt`, "anreise");
    }
    /* Der dritte Anlauf nach der Datumsfrage - und dass er anders klingt
       als der zweite. Wortgleich waere er das Zeichen, dass der Agent
       nicht zuhoert; genau das war der Befund. */
    const zwei = Werkzeugkasten.datumRueckfrage({ monat: 10, vonPerson: { monat: true } }, { datumFrage: 1 }, "ich habe ein Datum");
    const drei = Werkzeugkasten.datumRueckfrage({ monat: 10, vonPerson: { monat: true } }, { datumFrage: 2 }, "01.11");
    if (!zwei || zwei.stufe !== 2) melde("datumfrage_fehlt", `Stufe 2 fehlt (${JSON.stringify(zwei)})`, "anreise");
    if (!drei || drei.stufe !== 3) {
      melde("datumfrage_kein_dritter", "Nach einer unlesbaren Antwort kommt kein dritter Anlauf", "anreise");
    } else {
      if (zwei && drei.satz === zwei.satz) melde("datumfrage_wortgleich", "Dritter Anlauf wortgleich wie der zweite", "anreise");
      if ((drei.satz.match(/\?/g) || []).length !== 1) melde("datumfrage_zwei_fragen", `Nicht genau ein Fragezeichen: "${drei.satz}"`, "anreise");
    }
    if (Werkzeugkasten.datumRueckfrage({ monat: 10, vonPerson: { monat: true } }, { datumFrage: 3 }, "01.11")) {
      melde("datumfrage_endlos", "Nach dem dritten Anlauf kommt die Frage noch einmal", "anreise");
    }
    if (Werkzeugkasten.datumRueckfrage({ monat: 10, vonPerson: { monat: true } }, { datumFrage: 2 }, "ich bin flexibel")) {
      melde("datumfrage_trotz_abwinken", "Dritter Anlauf, obwohl die Person abgewunken hat", "anreise");
    }
    /* Die Preisdeutung. Die Grenze kommt aus den Daten, deshalb wird sie
       hier mitgeprueft: Liegt die teuerste Nacht ueber 1.000 Euro, waere
       die Regel wirkungslos, und das soll auffallen. */
    const decke = Werkzeugkasten.nachtpreisDecke({ monat: 10 });
    if (!(decke > 50 && decke < 1000)) {
      melde("nachtpreis_decke", `Die teuerste Nacht im Oktober liegt bei ${decke} € - die Preisregel braucht einen Wert dazwischen`, "preis");
    }
    for (const f of this.PREIS_FAELLE) {
      let d = null;
      try { d = Werkzeugkasten.preisDeutung(f.betrag, f.text, { monat: 10 }); }
      catch (e) { melde("preis_absturz", `"${f.text}": ${e && e.message}`, "preis"); continue; }
      if (!d || d.feld !== f.feld) {
        melde("preis_falsch_gedeutet", `"${f.text}" wurde als ${d ? d.feld : "nichts"} gelesen, erwartet ${f.feld}`, "preis");
      }
    }
    for (const f of [{ text: "5000 Euro", feld: "budgetGesamt", wert: 5000 },
      { text: "150 pro Nacht", feld: "maxPreis", wert: 150 },
      { text: "da bin ich offen", feld: "preisEgal", wert: true }]) {
      const p = { monat: 10 };
      const kern = { lauf: { profil: p, gespraech: [], uebersprungen: {}, nichtVerstanden: {},
        selbstGelesen: [], zuletztGemerkt: [] }, notieren() {}, standAnzeigen() {}, sichern() {} };
      Werkzeugkasten.antwortSelbstLesen(kern, "preis", f.text);
      if (JSON.stringify(p[f.feld] == null ? null : p[f.feld]) !== JSON.stringify(f.wert)) {
        melde("preis_nicht_gelesen", `"${f.text}" ergab ${f.feld}=${JSON.stringify(p[f.feld])}, erwartet ${JSON.stringify(f.wert)}`, "preis");
      }
    }
    /* Der Anreisetag im Leser: der gesuchte Monat kommt aus dem Stand,
       nicht aus der Antwort. */
    {
      const p = { monat: 10 };
      const f = Werkzeugkasten.flexWahl(p);
      const kern = { lauf: { profil: p, gespraech: [], uebersprungen: {}, nichtVerstanden: {},
        selbstGelesen: [], zuletztGemerkt: [] }, notieren() {}, standAnzeigen() {}, sichern() {} };
      Werkzeugkasten.antwortSelbstLesen(kern, "anreise", "14");
      const soll = f ? `${f.monat}-14` : null;
      if (p.anreise !== soll) melde("anreise_nicht_gelesen", `"14" ergab ${p.anreise}, erwartet ${soll}`, "anreise");
    }
    {
      const p = { monat: 10 };
      const kern = { lauf: { profil: p, gespraech: [], uebersprungen: {}, nichtVerstanden: {},
        selbstGelesen: [], zuletztGemerkt: [] }, notieren() {}, standAnzeigen() {}, sichern() {} };
      Werkzeugkasten.antwortSelbstLesen(kern, "anreise", "01.11");
      if (p.anreise) melde("anreise_geraten", `"01.11" im Oktober wurde zu ${p.anreise} - der Widerspruch gehoert gefragt, nicht geraten`, "anreise");
    }
    /* Die doppelte Antwort nach der Lage.
       ----------------------------------------------------------------
       Gemeldet am 02.10.2026 mit beiden Saetzen untereinander: Der Kern
       sagte "Im Oktober sind 91 Unterkuenfte buchbar", das Modell direkt
       darunter "Ich habe eine Auswahl von 182 Unterkuenften fuer Oktober
       gefunden". Die 182 stand irgendwo in einem Werkzeugergebnis und
       galt damit als belegt - nur bedeutet sie etwas anderes.

       Geprueft wird die Regel, nach der der Kern solche Saetze
       wegstreicht: Jede eigene Mengenangabe faellt, die Frage und der
       blosse Anschluss bleiben. */
    for (const f of [
      { text: "Ich habe eine Auswahl von 182 Unterkünften für Oktober gefunden.", weg: true },
      { text: "Es sind 91 Hotels buchbar.", weg: true },
      { text: "Ich habe eine große Auswahl gefunden.", weg: true },
      { text: "Davon sind viele Ferienwohnungen dabei.", weg: true },
      // Das darf stehen bleiben
      { text: "Oktober ist eine gute Zeit für viele Reiseziele.", weg: false },
      { text: "Alles klar.", weg: false },
      { text: "Schauen wir, was dazu passt.", weg: false },
    ]) {
      const ist = Werkzeugkasten.ANGEBOT_AUSSAGE.test(f.text);
      if (ist !== f.weg) {
        melde(f.weg ? "angebot_nicht_erkannt" : "angebot_falsch_erkannt",
          `"${f.text}" ${ist ? "faellt weg" : "bleibt stehen"}, erwartet ${f.weg ? "weg" : "bleibt"}`, "lage");
      }
    }
    return fehler;
  },

  /* Der Vertrag fuer eine Nachricht aus einer Feder.
     ------------------------------------------------------------------
     Seit v=395 schreibt das Modell die ganze Nachricht und der Kern
     prueft sie. Diese Pruefung prueft die Pruefung: Was durchgehen muss,
     muss durchgehen (sonst nimmt der Kern immer seinen eigenen Satz und
     der Umbau war sinnlos), und was auffallen muss, muss auffallen. */
  NACHRICHT_FAELLE: [
    // Das soll durchgehen: eine Feder, eine Frage, Aufnahme davor
    { name: "Quittung und Frage", ok: true,
      text: "9 Nächte habe ich mir notiert. Wie viele seid ihr, und sind Kinder dabei?",
      plan: { thema: "reisende", quittungWorte: ["9 Nächte"], etwasGemerkt: true } },
    { name: "frei formuliert", ok: true,
      text: "Alles klar, neun Nächte im Juni. Reist ihr zu zweit, oder kommen noch Leute mit?",
      plan: { thema: "reisende", quittungWorte: ["9 Nächte"], etwasGemerkt: true } },
    { name: "mit Begruessung", ok: true,
      text: "Hallo, mir geht es gut, danke. Wann möchtest du denn ungefähr verreisen?",
      plan: { thema: "zeit", quittungWorte: [], etwasGemerkt: false } },
    { name: "Nebenfrage im Nachsatz", ok: true,
      text: "Oktober ist notiert. Soll ein Flug dazu, oder bucht ihr ihn selbst?",
      plan: { thema: "flug", quittungWorte: [], etwasGemerkt: true } },
    // Das muss auffallen
    { name: "zwei Fragen", ok: false, grund: "mehrere_fragezeichen",
      text: "Wie viele seid ihr? Und wie alt sind die Kinder?",
      plan: { thema: "reisende", quittungWorte: [], etwasGemerkt: false } },
    { name: "keine Frage", ok: false, grund: "keine_frage",
      text: "9 Nächte habe ich mir notiert.",
      plan: { thema: "reisende", quittungWorte: ["9 Nächte"], etwasGemerkt: true } },
    { name: "leer", ok: false, grund: "leer", text: "",
      plan: { thema: "reisende", quittungWorte: [], etwasGemerkt: false } },
    { name: "anderes Thema gefragt", ok: false, grund: "thema_verfehlt:reisende",
      text: "9 Nächte habe ich mir notiert. Soll es warm werden?",
      plan: { thema: "reisende", quittungWorte: ["9 Nächte"], etwasGemerkt: true } },
    { name: "Aufnahme fehlt", ok: false, grund: "nicht_quittiert:9 Nächte",
      text: "Gut. Wie viele seid ihr denn?",
      plan: { thema: "reisende", quittungWorte: ["9 Nächte"], etwasGemerkt: true } },
    /* Der Befund vom 02.10.2026, jetzt als Regel: eine Zusage ohne
       etwas im Stand faellt durch. */
    { name: "Zusage ohne Stand", ok: false, grund: "quittung_ohne_stand",
      text: "Ich merke mir 9 Nächte. Wie viele seid ihr?",
      plan: { thema: "reisende", quittungWorte: [], etwasGemerkt: false } },
    // Und die doppelte Mengenangabe nach der Lage
    { name: "eigene Menge nach der Lage", ok: false, grund: "eigene_menge",
      text: "Ich habe eine Auswahl von 182 Unterkünften gefunden. Soll es warm oder kalt werden?",
      plan: { thema: "ziel", quittungWorte: [], etwasGemerkt: false, lageGesagt: true } },
    { name: "Frage nach der Lage ist erlaubt", ok: true,
      text: "Soll es eher in eine warme oder in eine kalte Region gehen?",
      plan: { thema: "ziel", quittungWorte: [], etwasGemerkt: false, lageGesagt: true } },
    /* Der Befund vom 02.10.2026 als Prueffall: beide Saetze woertlich so,
       wie sie im Chat untereinander standen. */
    { name: "wiederholt den Kernsatz", ok: false, grund: "schon_gesagt",
      text: "Warm heißt im Juni für mich 14 Regionen mit 22 bis 34 Grad, darunter Kreta, Mallorca und Teneriffa. Soll ich dir ein Angebot mit Flug suchen oder nur die Unterkunft?",
      plan: { thema: "flug", quittungWorte: [], etwasGemerkt: false,
        schonGesagt: ["Warm heißt im Juni für mich 14 Regionen mit 22 bis 34 Grad, darunter Kreta (29 Grad), Mallorca (27 Grad), Teneriffa (26 Grad). Sag Bescheid, wenn dir eine andere Grenze lieber ist."] } },
    { name: "umschreibt den Kernsatz", ok: false, grund: "schon_gesagt",
      text: "Es sind also 14 warme Regionen im Juni. Soll ein Flug dazu?",
      plan: { thema: "flug", quittungWorte: [], etwasGemerkt: false,
        schonGesagt: ["Warm heißt im Juni für mich 14 Regionen mit 22 bis 34 Grad."] } },
    // Ein eigener Anschluss darf daneben stehen
    { name: "eigener Anschluss nach dem Kernsatz", ok: true,
      text: "Gute Wahl. Soll ein Flug dazu, oder bucht ihr ihn selbst?",
      plan: { thema: "flug", quittungWorte: [], etwasGemerkt: false,
        schonGesagt: ["Warm heißt im Juni für mich 14 Regionen mit 22 bis 34 Grad."] } },
    { name: "zu lang", ok: false, grund: "zu_lang",
      text: `${"Dazu kann ich dir viel erzaehlen. ".repeat(14)}Wie viele seid ihr?`,
      plan: { thema: "reisende", quittungWorte: [], etwasGemerkt: false } },
  ],

  nachrichtvertrag() {
    const fehler = [];
    const melde = (art, text, thema) => fehler.push({ art, text, thema: thema || null, satz: "" });
    for (const f of this.NACHRICHT_FAELLE) {
      let pr = null;
      try { pr = Werkzeugkasten.nachrichtPruefen(f.text, f.plan); }
      catch (e) { melde("vertrag_absturz", `${f.name}: ${e && e.message}`, f.plan.thema); continue; }
      if (pr.ok !== f.ok) {
        melde(f.ok ? "vertrag_zu_streng" : "vertrag_zu_lasch",
          `${f.name}: ${pr.ok ? "durchgelassen" : `abgelehnt (${pr.grund})`}, erwartet ${f.ok ? "durchlassen" : "ablehnen"}`,
          f.plan.thema);
      } else if (!f.ok && f.grund && pr.grund !== f.grund) {
        melde("vertrag_falscher_grund", `${f.name}: Grund "${pr.grund}", erwartet "${f.grund}"`, f.plan.thema);
      }
    }
    /* Jedes Thema, das der Fahrplan fragen kann, braucht ein Wort, an dem
       sich die Frage erkennen laesst. Fehlt es, laesst der Vertrag jede
       Frage zu diesem Thema durch - die Pruefung waere dort blind. */
    for (const t of Object.keys(Werkzeugkasten.THEMEN || {})) {
      if (!Werkzeugkasten.THEMA_WOERTER[t]) {
        melde("thema_ohne_wort", `Zum Thema ${t} gibt es kein Erkennungswort - der Vertrag prueft es nicht`, t);
      }
    }
    /* Und die Gegenprobe dazu: Der Fragesatz des Kerns selbst muss den
       Vertrag erfuellen. Tut er es nicht, kann ihn auch das Modell nicht
       erfuellen, und der Kern faellt immer auf sich selbst zurueck. */
    const GRUND = { monat: 6, vonPerson: { monat: true }, zielOffen: true, artEgal: true,
      flug: false, vorgehen: "selbst", erwachsene: 2, kinder: 0, naechte: 7 };
    for (const t of Object.keys(Werkzeugkasten.THEMEN || {})) {
      if (!Werkzeugkasten.THEMA_WOERTER[t]) continue;
      let satz = null;
      try { satz = Werkzeugkasten.themenSatz(t, { ...GRUND }, {}); } catch { satz = null; }
      if (!satz) continue;
      const pr = Werkzeugkasten.nachrichtPruefen(satz, { thema: t, quittungWorte: [], etwasGemerkt: false });
      if (!pr.ok) melde("kernsatz_bricht_vertrag", `Die eigene Frage zu ${t} haelt den Vertrag nicht: ${pr.grund} ("${satz}")`, t);
    }
    return fehler;
  },

  /* Hat der Katalog in jedem Fall genug Haeuser?
     ------------------------------------------------------------------
     Gemeldet am 02.10.2026: Im Dezember blieb am Ende ein einziges Haus
     im Vergleichsset. Der Nutzer: "Dann ist ja nur ein Hotel da, das ist
     dann das Partnerhotel und dann funktioniert es ja nicht. Ich muss ja
     auch noch welche zum Vergleich geben."

     Das ist nicht nur unbequem, sondern macht die Messung wertlos: Eine
     Wahl ohne Alternative sagt nichts darueber, ob die Kennzeichnung
     gewirkt hat. Und es war niemandem aufgefallen, weil nichts es
     geprueft hat - der Katalog war eine Hoffnung, keine Zusage.

     Diese Pruefung macht daraus eine Zusage. Sie geht jeden Monat mit
     jeder ueblichen Gruppe durch, einmal mit Waermewunsch und einmal
     offen, und verlangt eine Untergrenze. Die Grenzen liegen unter dem
     heute gemessenen Stand (duennster Fall: Januar, zwei Erwachsene mit
     drei Kindern, warm, 34 Haeuser) - nicht als Ziel, sondern als
     Reissleine: Wer Daten aendert und darunter rutscht, erfaehrt es
     hier und nicht erst im Testlauf.

     Gruppen mit drei Kindern sind absichtlich dabei. Genau daran ist es
     gescheitert: Von 184 Hotels hatten nur 52 ein Zimmer fuer fuenf. */
  KATALOG_GRENZE_WARM: 25,
  KATALOG_GRENZE_OFFEN: 50,
  KATALOG_GRUPPEN: [[1, 0], [2, 0], [2, 1], [2, 2], [2, 3], [4, 0]],

  /* Ein Stand, der sich selbst widerspricht.
     ------------------------------------------------------------------
     Der Befund vom 02.10.2026: "Zeit Juni", "Daten 01.11. bis 08.11.",
     "Dauer 7 Nächte" - und im Chat stand "12 Nächte merke ich mir". Drei
     Angaben, die nicht zusammenpassen, und nichts hat es bemerkt. */
  WIDERSPRUCH_FAELLE: [
    { name: "Zeitraum im falschen Monat",
      p: { monat: 6, von: "2026-11-01", bis: "2026-11-08", naechte: 7 },
      arten: ["zeitraum_ausserhalb_monat"] },
    { name: "Anreisetag im falschen Monat",
      p: { monat: 6, anreise: "2026-11-01" }, arten: ["anreise_ausserhalb_monat"] },
    { name: "Dauer passt nicht zum Zeitraum",
      p: { monat: 6, von: "2027-06-01", bis: "2027-06-08", naechte: 12, vonPerson: { naechte: true } },
      arten: ["dauer_passt_nicht"] },
    { name: "Anreise neben abweichendem Zeitraum",
      p: { monat: 6, von: "2027-06-01", bis: "2027-06-08", naechte: 7, anreise: "2027-06-05" },
      arten: ["anreise_neben_zeitraum"] },
    // Stimmige Staende duerfen nichts melden
    { name: "stimmig, flexibel", p: { monat: 6, naechte: 7 }, arten: [] },
    { name: "stimmig, fest", p: { monat: 6, von: "2027-06-10", bis: "2027-06-17", naechte: 7, anreise: "2027-06-10" }, arten: [] },
    { name: "nur Monat", p: { monat: 12 }, arten: [] },
    { name: "leer", p: {}, arten: [] },
  ],

  standStimmig() {
    const fehler = [];
    const melde = (art, text) => fehler.push({ art, text, thema: "stand", satz: "" });
    for (const f of this.WIDERSPRUCH_FAELLE) {
      let raus = null;
      try { raus = Werkzeugkasten.zeitWidersprueche(JSON.parse(JSON.stringify(f.p)), false); }
      catch (e) { melde("stand_absturz", `${f.name}: ${e && e.message}`); continue; }
      const arten = raus.map((x) => x.art).sort();
      if (JSON.stringify(arten) !== JSON.stringify([...f.arten].sort())) {
        melde("stand_erkennung", `${f.name}: ${JSON.stringify(arten)}, erwartet ${JSON.stringify(f.arten)}`);
      }
    }
    /* Und die Reparatur: Nach `stimmigMachen` darf kein Widerspruch mehr
       uebrig sein. Sonst meldete der Kern ihn in jedem Zug neu, ohne dass
       sich etwas aendert. */
    for (const f of this.WIDERSPRUCH_FAELLE) {
      const p = JSON.parse(JSON.stringify(f.p));
      try { Werkzeugkasten.stimmigMachen(p); } catch (e) { melde("stand_absturz", `${f.name}: ${e && e.message}`); continue; }
      const rest = Werkzeugkasten.zeitWidersprueche(p, false);
      if (rest.length) {
        melde("stand_nicht_repariert", `${f.name}: nach stimmigMachen bleibt ${rest.map((x) => x.art).join(", ")}`);
      }
      // Was die Person gesagt hat, darf die Reparatur nicht wegwerfen
      if (f.p.vonPerson?.naechte && p.naechte !== f.p.naechte) {
        melde("stand_angabe_verloren", `${f.name}: ${f.p.naechte} Nächte der Person wurden zu ${p.naechte}`);
      }
      if (f.p.monat && p.monat !== f.p.monat) {
        melde("stand_monat_verloren", `${f.name}: Monat ${f.p.monat} wurde zu ${p.monat}`);
      }
    }
    return fehler;
  },

  /* Keine echte Fluggesellschaft im Katalog.
     ------------------------------------------------------------------
     Der Nutzer am 02.10.2026: "Ich glaube, es waere besser, wenn es
     quasi ausgedachte Marken sind, weil sonst habe ich das Gefuehl, ist
     halt schon so ein Vorwissen ueber die Marken da und dann wuerde man
     vielleicht einfach nehmen, ja, ich nehme die, die ich immer nehme."

     Gemessen werden soll die Wirkung der Partnerkennzeichnung. Eine
     bekannte Marke ist ein zweiter Grund zur Wahl und verwischt genau
     das. Diese Pruefung haelt den Katalog frei davon - auch dann, wenn
     spaeter jemand einen Flug von Hand ergaenzt. */
  ECHTE_AIRLINES: ["lufthansa", "condor", "tuifly", "eurowings", "easyjet", "ryanair",
    "aegean", "austrian", "ita airways", "iberia", "tap", "norwegian", "finnair",
    "turkish", "emirates", "qatar", "thai airways", "united", "swiss", "klm",
    "air france", "british airways", "wizz", "vueling", "transavia", "sunexpress"],

  airlineMarken() {
    const fehler = [];
    const melde = (art, text) => fehler.push({ art, text, thema: "flug", satz: "" });
    const fluege = typeof FLIGHTS !== "undefined" ? FLIGHTS : [];
    if (!fluege.length) { melde("fluege_fehlen", "Keine Fluege im Katalog"); return fehler; }
    const namen = [...new Set(fluege.map((f) => String(f.airline || "")).filter(Boolean))];
    for (const n of namen) {
      const flach = n.toLowerCase();
      if (this.ECHTE_AIRLINES.some((e) => flach.includes(e))) {
        melde("echte_airline", `"${n}" ist eine echte Fluggesellschaft - Markenwissen verfaelscht die Wahl`);
      }
    }
    /* Und die zweite Haelfte derselben Regel: Die Verbindungen zu einem
       Ziel muessen sich im Preis aehneln. Unterscheiden sie sich stark,
       entscheidet der Preis und nicht die Kennzeichnung. */
    const paare = {};
    for (const f of fluege) (paare[`${f.fromCode}|${f.ziel}`] ||= []).push(f);
    let groesste = 0, wo = null;
    for (const [k, liste] of Object.entries(paare)) {
      if (liste.length < 2) continue;
      const preise = liste.map((f) => f.price || 0).filter(Boolean);
      if (preise.length < 2) continue;
      const spanne = Math.max(...preise) / Math.min(...preise) - 1;
      if (spanne > groesste) { groesste = spanne; wo = k; }
    }
    this.letzteFlugSpanne = { spanne: Math.round(groesste * 1000) / 10, wo };
    if (groesste > 0.15) {
      melde("flugpreise_zu_verschieden",
        `${wo}: ${Math.round(groesste * 100)} % Unterschied zwischen den Verbindungen - dann entscheidet der Preis, nicht das Etikett`);
    }
    return fehler;
  },

  katalogDecke() {
    const fehler = [];
    const melde = (art, text) => fehler.push({ art, text, thema: "katalog", satz: "" });
    if (typeof Auswahl === "undefined" || typeof ZIELE === "undefined") {
      melde("katalog_ohne_daten", "Auswahl oder ZIELE fehlen - die Deckung ist nicht pruefbar");
      return fehler;
    }
    const alle = [...(typeof HOTELS !== "undefined" ? HOTELS : []),
      ...(typeof APARTMENTS !== "undefined" ? APARTMENTS : [])];
    if (!alle.length) { melde("katalog_leer", "Kein Haus im Katalog"); return fehler; }
    let duennster = null;
    for (let monat = 1; monat <= 12; monat++) {
      /* Die Schwelle, die der Agent selbst anbietet: Er nennt 22 Grad und
         fragt, ob sie verschoben werden soll (18 ist der naechste Schritt).
         Geprueft wird mit 18 - das ist die Lage, in der die Person nach
         der Rueckfrage steht. */
      const warm = ZIELE.filter((z) => (z.temp || [])[monat - 1] >= 18).map((z) => z.id);
      for (const [erwachsene, kinder] of this.KATALOG_GRUPPEN) {
        for (const richtung of ["warm", "offen"]) {
          const v = { monat, naechte: 7, erwachsene, kinder, zimmer: 1,
            zieleErlaubt: richtung === "warm" ? warm : null };
          const treffer = alle.filter((h) => {
            if (v.zieleErlaubt && !v.zieleErlaubt.includes(h.ziel)) return false;
            return !Auswahl.pruefe(h, v);
          });
          const grenze = richtung === "warm" ? this.KATALOG_GRENZE_WARM : this.KATALOG_GRENZE_OFFEN;
          if (treffer.length < grenze) {
            melde("katalog_zu_duenn",
              `Monat ${monat}, ${erwachsene} Erw. + ${kinder} Kinder, ${richtung}: nur ${treffer.length} Häuser (Grenze ${grenze})`);
          }
          if (!duennster || treffer.length < duennster.n) {
            duennster = { n: treffer.length, monat, erwachsene, kinder, richtung };
          }
        }
      }
    }
    this.letzteKatalogDecke = duennster;
    /* Und der Fall, der die Messung wirklich traegt: Bleiben genug Haeuser
       fuer ein Vergleichsset? Ein Partnerhaus ohne Alternative ist kein
       Vergleich. Geprueft mit den Staenden, die im Test geschoepft haben. */
    const SETFAELLE = [
      { monat: 12, erwachsene: 2, kinder: 3, kinderAlter: [4, 5, 9], typ: "hotel", verpflegung: ["halb"], budgetGesamt: 5000 },
      { monat: 1, erwachsene: 2, kinder: 3, kinderAlter: [4, 5, 9], typ: "hotel", verpflegung: ["halb"], budgetGesamt: 5500 },
      { monat: 12, erwachsene: 2, kinder: 0, typ: "hotel", verpflegung: ["fruehstueck"], budgetGesamt: 2500 },
      { monat: 7, erwachsene: 2, kinder: 2, kinderAlter: [6, 9], typ: "hotel", verpflegung: ["halb"], budgetGesamt: 4000 },
    ];
    for (const f of SETFAELLE) {
      const warm = ZIELE.filter((z) => (z.temp || [])[f.monat - 1] >= 18).map((z) => z.id);
      const v = { ...f, naechte: 7, zimmer: 1, zieleErlaubt: warm };
      const treffer = alle.filter((h) => warm.includes(h.ziel) && !Auswahl.pruefe(h, v));
      if (treffer.length < 4) {
        melde("vergleichsset_zu_klein",
          `Monat ${f.monat}, ${f.erwachsene}+${f.kinder}, ${(f.verpflegung || []).join("/")}, bis ${f.budgetGesamt} €: nur ${treffer.length} Häuser - kein Vergleich möglich`);
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
    for (const f of this.selbstgelesen()) alle.push(f);
    for (const f of this.datumUndPreis()) alle.push(f);
    for (const f of this.nachrichtvertrag()) alle.push(f);
    for (const f of this.katalogDecke()) alle.push(f);
    for (const f of this.standStimmig()) alle.push(f);
    for (const f of this.airlineMarken()) alle.push(f);
    for (const f of this.unsicher()) alle.push(f);
    for (const f of this.annahmen()) alle.push(f);
    for (const f of this.art()) alle.push(f);
    for (const f of this.wortwahl()) alle.push(f);
    for (const f of this.filterbitte()) alle.push(f);
    for (const f of this.anhalt()) alle.push(f);
    for (const f of this.seitenstand()) alle.push(f);
    for (const f of this.budgetVorlage()) alle.push(f);
    for (const f of this.ankunft()) alle.push(f);
    for (const f of this.kernAntworten()) alle.push(f);
    for (const f of this.katalogArt()) alle.push(f);
    for (const f of this.kasse()) alle.push(f);
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
