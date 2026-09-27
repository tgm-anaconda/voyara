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
    for (const f of this.alleThemen()) alle.push(f);

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
