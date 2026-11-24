/* Chip-Pruefung und Formtoleranz (24.11.2026)
 *
 *   node agent/chip-test.cjs
 *   VOYARA_QUELLE=_backup/<ordner>/ node agent/chip-test.cjs   Gegenprobe
 *
 * Ben: "Bei den Chip-Antworten muss der Kern immer eine sinnvolle Aktion
 * parat haben - das kann er komplett alleine loesen." Und: Was das Modell
 * richtig meldet, darf nicht an der Schreibweise scheitern.
 *
 *   allein     Klick, das Modell schickt nichts             -> Stand richtig?
 *   gegen      Klick, das Modell schickt einen Widerspruch  -> Stand richtig?
 *   form       richtiger Modellwert, andere Schreibweise    -> angekommen?
 * Kostet nichts - es wird kein Modell gerufen.
 */
const { laden } = require("./satzbank-daten.cjs");
const { WK, KN } = laden();
const kern = (p, frage, du, extra = {}) => ({
  lauf: { profil: p, gespraech: [{ role: "assistant", content: frage }, { role: "user", content: du }], protokoll: [], annahmeOffen: [], gefragtWie: {}, verlauf: [], nachrichtArt: "antwort", runde: 1, zugSeit: 77, ...extra },
  notieren(e, d) { this.lauf.protokoll.push({ ereignis: e, ...d }); }, freigabe: () => "suchen", darf: () => false, logZeile() {}, sagen() {}, standAnzeigen() {}, sichern() {}, standKurz: () => "", antwortWerten() {}, gespraechPush() {}, sagenUndMerken() {} });
const G = { monat: 3, naechte: 7, erwachsene: 2, kinder: 0, personen: 2, vonPerson: {} };
const ohne = (o, ...f) => { const x = JSON.parse(JSON.stringify(o)); for (const k of f) delete x[k]; return x; };
const gesucht = { gesuchtMit: "x" };
// thema, Chip, Vorstand, was das Modell Falsches schicken koennte, Soll
const CHIPS = [
  ["art", "Hotel", G, { artEgal: true }, { typ: "hotel", artEgal: false }],
  ["art", "Hotel", G, { typ: "apartment" }, { typ: "hotel" }],
  ["art", "Ferienwohnung", G, { typ: "hotel" }, { typ: "apartment", artEgal: false }],
  ["art", "Beides zeigen", G, { typ: "hotel", artEgal: true }, { typ: undefined, artEgal: true }],
  ["art", "Beides zeigen", G, { typ: "apartment" }, { typ: undefined, artEgal: true }],
  ["flug", "Mit Flug", G, { flug: false }, { flug: true }],
  ["flug", "Nur die Unterkunft", G, { flug: true }, { flug: false }],
  ["flugKlasse", "Economy", { ...G, flug: true }, { flugKlasse: "business" }, { flugKlasse: "economy" }],
  ["flugKlasse", "Premium Economy", { ...G, flug: true }, { flugKlasse: "economy" }, { flugKlasse: "premium" }],
  ["flugKlasse", "Business", { ...G, flug: true }, { flugKlasse: "economy" }, { flugKlasse: "business" }],
  ["verpflegung", "All Inclusive", G, { verpflegung: "halb" }, { verpflegung: "ai" }],
  ["verpflegung", "Halbpension", G, { verpflegungEgal: true }, { verpflegung: "halb" }],
  ["verpflegung", "Nur Frühstück", G, { verpflegung: "halb" }, { verpflegung: "fruehstueck" }],
  ["verpflegung", "Egal", G, { verpflegung: "halb" }, { verpflegung: undefined, verpflegungEgal: true }],
  ["preis", "Offen", G, { maxPreis: 100 }, { preisEgal: true, maxPreis: undefined }],
  ["preis", "Feste Grenze", G, { preisEgal: true }, { preisEgal: undefined, maxPreis: undefined }],
  ["ziel", "Eher warm", G, { richtung: "kalt" }, { richtung: "warm" }],
  ["ziel", "Eher kalt", G, { richtung: "warm", ziel: "mallorca" }, { richtung: "kalt", zielId: undefined }],
  ["ziel", "Ich habe ein Ziel", G, { ziel: "mallorca", zielOffen: true }, { zielId: undefined, zielOffen: undefined }],
  ["reisende", "Keine Kinder", ohne(G, "kinder"), { kinder: 2 }, { kinder: 0, erwachsene: 2 }],
  ["reisende", "1 Kind", ohne(G, "kinder", "personen"), { kinder: 0 }, { kinder: 1 }],
  ["reisende", "2 Kinder", ohne(G, "kinder", "personen"), { kinder: 1 }, { kinder: 2 }],
  ["reisende", "2", ohne(G, "kinder", "personen", "erwachsene"), { personenGesamt: 3, erwachsene: 3 }, { personen: 2 }],
  ["anzahl", "Drei", { ...G, vorgehen: "top3" }, { anzahlVorschlaege: 5 }, { anzahlVorschlaege: 3 }, gesucht],
  ["anzahl", "Sechs", { ...G, vorgehen: "top3" }, { anzahlVorschlaege: 3 }, { anzahlVorschlaege: 6 }, gesucht],
  ["ausstattung", "Nein, nichts davon", G, { ausstattung: ["pool"] }, { ausstattung: undefined, ausstattungEgal: true }, gesucht],
  ["ausstattung", "Pool", G, { ausstattungEgal: true }, { ausstattung: ["pool"] }, gesucht],
  ["vorgehen", "Ich schaue selbst", G, { vorgehen: "top3" }, { vorgehen: "selbst" }, gesucht],
  ["vorgehen", "Such du für mich raus", G, { vorgehen: "selbst" }, { vorgehen: "top3" }, gesucht],
];
const GF = { ...G, flug: true };
const FORM = [
  ...["Düsseldorf", "Duesseldorf", "DÜSSELDORF", "DUS", "Flughafen Düsseldorf"].map((x) => ["flugAb", `ab düsseldorf bitte`, GF, { flugAb: x }, (p) => p.flugAb && /^(d(ü|ue)sseldorf|dus)$/i.test(p.flugAb) || p.flugAb && WK.flugCode?.(p.flugAb) === "DUS"]),
  ...["Koeln", "Köln", "CGN", "Köln/Bonn"].map((x) => ["flugAb", "köln", GF, { flugAb: x }, (p) => !!p.flugAb]),
  ...["Muenchen", "München", "MUC"].map((x) => ["flugAb", "von münchen aus", GF, { flugAb: x }, (p) => !!p.flugAb]),
  ["flugAb", "zürich", GF, { flugAb: "Zuerich" }, (p) => !!p.flugAb],
  ["flugAb", "köln oder düsseldorf", GF, { flugAbAuswahl: ["Koeln", "Duesseldorf"] }, (p) => (p.flugAbAuswahl || []).length === 2],
  ...["hotel", "Hotel", "hotels", "Hotels"].map((x) => ["art", "am liebsten ein Hotel", G, { typ: x }, (p) => p.typ === "hotel"]),
  ...["apartment", "ferienwohnung", "Ferienwohnung", "fewo"].map((x) => ["art", "lieber eine ferienwohnung", G, { typ: x }, (p) => p.typ === "apartment"]),
  ...["ai", "AI", "all inclusive", "All Inclusive", "all_inclusive"].map((x) => ["verpflegung", "gern mit allem drin, all inclusive", G, { verpflegung: x }, (p) => p.verpflegung === "ai"]),
  ...["halb", "halbpension", "Halbpension", "HP"].map((x) => ["verpflegung", "halbpension wäre gut", G, { verpflegung: x }, (p) => p.verpflegung === "halb"]),
  ...["fruehstueck", "frühstück", "Frühstück"].map((x) => ["verpflegung", "mit frühstück", G, { verpflegung: x }, (p) => p.verpflegung === "fruehstueck"]),
  ...["economy", "Economy", "premium_economy", "Premium Economy", "premium"].map((x) => ["flugKlasse", /prem/i.test(x) ? "lieber premium" : "economy reicht", GF, { flugKlasse: x }, (p) => p.flugKlasse === (/prem/i.test(x) ? "premium" : "economy")]),
  ...["suedtirol", "Südtirol", "südtirol", "Suedtirol"].map((x) => ["ziel", "nach südtirol", G, { ziel: x }, (p) => p.zielId === "suedtirol"]),
  ...["newyork", "New York", "new york", "new_york", "NYC"].map((x) => ["ziel", "new york", G, { ziel: x }, (p) => p.zielId === "newyork"]),
  ...["warm", "Warm", "eher warm"].map((x) => ["ziel", "eher was warmes", G, { richtung: x }, (p) => p.richtung === "warm"]),
  ...[3, "3", "März", "maerz", "march"].map((x) => ["zeit", "im märz", ohne(G, "monat"), { monat: x }, (p) => p.monat === 3]),
  ...[7, "7", "7 Nächte"].map((x) => ["dauer", "eine woche wäre super", ohne(G, "naechte"), { naechte: x }, (p) => p.naechte === 7]),
  ...["2027-03-28", "28.03.2027", "28.3."].map((x) => ["anreise", "am 28. märz", { ...G, vonPerson: { monat: true } }, { anreise: x }, (p) => /-03-28$/.test(p.anreise || "")]),
  ...[[[19, 17], 2, 1, 1], [[17, 19], 2, 1, 1], [["19", "17"], 2, 1, 1], [[28, 34], 1, 2, 2], [[17, 12], 1, 2, 2]].map(([alter, e, k]) => ["kinderAlter", alter.join(" und "),
    { ...G, erwachsene: 1, kinder: 2, personen: 3, kinderAlter: [] }, { kinderAlter: alter }, (p) => p.erwachsene === e && p.kinder === k && (p.kinderAlter || []).length === (alter.every((x) => +x >= 18) ? 0 : k)]),
];
const lies = (k, thema, du) => {
  try { WK.chipAntwortLesen(k, du); } catch (e) { k.fehler = e.message; }
  try { WK.fahrplanChipLesen?.(k, thema, du); } catch (e) { k.fehler = e.message; }
  try { WK.antwortSelbstLesen(k, thema, du); } catch (e) { k.fehler = e.message; }
  k.lauf.chipWirkung = null;
};
(async () => {
  const z = { allein: [0, 0], gegen: [0, 0], form: [0, 0] }, fehl = [];
  for (const [thema, chip, vor, falsch, soll, extra] of CHIPS) for (const modus of ["allein", "gegen"]) {
    const p = JSON.parse(JSON.stringify(vor)), k = kern(p, "Frage?", chip, { gefragt: thema, zuletztGefragt: thema, ...(extra || {}) });
    lies(k, thema, chip);
    let f = null;
    try { await WK.werkzeuge.stand_merken.call(WK, { nachricht_art: "antwort", frage_beantwortet: "ja", ...(modus === "gegen" ? JSON.parse(JSON.stringify(falsch)) : {}) }, k); } catch (e) { f = e.message; }
    const ab = Object.entries(soll).filter(([x, v]) => { const i = p[x]; const leer = i == null || i === false || (Array.isArray(i) && !i.length); return (v === undefined || v === false) ? !leer : JSON.stringify(i) !== JSON.stringify(v); }).map(([x, v]) => `${x}: soll ${JSON.stringify(v)}, ist ${JSON.stringify(p[x])}`);
    z[modus][1]++; if (!ab.length && !f) z[modus][0]++; else fehl.push(`[${modus}] ${thema} "${chip}"${modus === "gegen" ? " / Modell " + JSON.stringify(falsch) : ""} -> ${f || ab.join("; ")}`);
  }
  for (const [thema, du, vor, args, ok] of FORM) {
    const p = JSON.parse(JSON.stringify(vor)), k = kern(p, "Frage?", du, { gefragt: thema, zuletztGefragt: thema });
    let f = null;
    // ohne eigenes Lesen des Kerns: nur der Modellwert zaehlt hier
    try { await WK.werkzeuge.stand_merken.call(WK, { nachricht_art: "antwort", frage_beantwortet: "ja", ...JSON.parse(JSON.stringify(args)) }, k); } catch (e) { f = e.message; }
    let g = false; try { g = !!ok(p); } catch { g = false; }
    z.form[1]++; if (g && !f) z.form[0]++; else fehl.push(`[form] ${thema} "${du}" / Modell ${JSON.stringify(args)} -> ${f || JSON.stringify(Object.fromEntries(["flugAb", "flugAbAuswahl", "typ", "verpflegung", "flugKlasse", "zielId", "richtung", "monat", "naechte", "anreise", "erwachsene", "kinder", "kinderAlter"].filter((x) => p[x] !== undefined && JSON.stringify(p[x]) !== JSON.stringify(vor[x])).map((x) => [x, p[x]])))} ${k.lauf.protokoll.map((e) => e.ereignis).filter((e) => /verworfen|unbekannt|zu_hoch/.test(e)).join(",")}`);
  }
  // Vollstaendigkeit: Jeder Chip jeder Fahrplan-Frage hat eine Bedeutung
  z.voll = [0, 0];
  const FRAGEN = WK.FRAGEN || WK.LEITFADEN || WK.THEMEN || {};
  const staende = [{}, { personen: 3 }, { erwachsene: 2 }, { kinder: 1 }, { kinder: 2, ausstattung: ["kidsClub"] }, { ausstattung: ["pool", "spa"] }];
  for (const [thema, f] of Object.entries(FRAGEN)) for (const st of staende) {
    let c = null; try { c = typeof f.chips === "function" ? f.chips(st, WK, { gefragtWie: {} }) : f.chips; } catch { c = null; }
    for (const chip of String(c || "").split("|").map((x) => x.trim()).filter(Boolean)) {
      if (thema === "gewichtung") continue;   // Schwerpunkte: laufen ueber wuensche und WUNSCH_GENUG
      z.voll[1]++;
      if (WK.chipBedeutung?.(thema, chip, st)) z.voll[0]++; else fehl.push(`[voll] ${thema} "${chip}" hat keine Bedeutung`);
    }
  }
  // Bens Lauf vom 24.11.2026
  z.lauf = [0, 0];
  const pruefe = (name, ist, soll) => { z.lauf[1]++; if (JSON.stringify(ist) === JSON.stringify(soll)) z.lauf[0]++; else fehl.push(`[lauf] ${name}: soll ${JSON.stringify(soll)}, ist ${JSON.stringify(ist)}`); };
  const zug = async (thema, frage, du, vor, args, extra = {}) => {
    const p = JSON.parse(JSON.stringify(vor)), k = kern(p, frage, du, { gefragt: thema, zuletztGefragt: thema, ...extra });
    lies(k, thema, du);
    k.lauf.gespraech.push({ role: "assistant", content: null, tool_calls: [{ id: "x", type: "function", function: { name: "stand_merken", arguments: "{}" } }] });
    await WK.werkzeuge.stand_merken.call(WK, { nachricht_art: "antwort", frage_beantwortet: "ja", ...args }, k);
    return k;
  };
  let k = await zug("flugAb", "Soll ich mit Abflug ab Düsseldorf rechnen?", "Ja, Abflug ab Düsseldorf", GF, { flugAb: "Duesseldorf" }, { chipWirkung: { "Ja, Abflug ab Düsseldorf": { flugAb: "Düsseldorf" }, "Etwas anderes": {} }, chipThema: "flugAb" });
  pruefe("Düsseldorf-Knopf, Modell schickt Duesseldorf", k.lauf.profil.flugAb, "Düsseldorf");
  k = await zug("flugAb", "Soll ich mit Abflug ab Düsseldorf rechnen?", "Ja, Abflug ab Düsseldorf", GF, { flugAb: "Mannheim" }, { chipWirkung: { "Ja, Abflug ab Düsseldorf": { flugAb: "Düsseldorf" } }, chipThema: "flugAb" });
  pruefe("... Modell schickt einen Flughafen, den es nicht gibt", k.lauf.profil.flugAb, "Düsseldorf");
  k = await zug("flugAb", "Von welchem Flughafen?", "duesseldorf", GF, {});
  pruefe("Person tippt ohne Umlaut, Modell schickt nichts", k.lauf.profil.flugAb, "Düsseldorf");
  k = await zug("flugAb", "Von welchem Flughafen?", "lieber Köln", { ...GF, flugAb: "Hamburg" }, { flugAb: "Koeln" });
  pruefe("Wechsel des Flughafens geht weiter", k.lauf.profil.flugAb, "Köln");
  k = await zug("flugAb", "Von welchem Flughafen?", "ab Mannheim", { ...GF, flugAb: "Hamburg" }, { flugAb: "Mannheim" });
  pruefe("Unbekannter Flughafen löscht den alten nicht", k.lauf.profil.flugAb, "Hamburg");
  k = await zug("kinderAlter", "Wie alt sind deine beiden Mädels?", "19 und 17", { ...G, erwachsene: 1, kinder: 2, personen: 3, kinderAlter: [] }, { kinderAlter: [19, 17] });
  pruefe("19 und 17", [k.lauf.profil.erwachsene, k.lauf.profil.kinder, k.lauf.profil.kinderAlter, k.lauf.profil.personen], [2, 1, [17], 3]);
  pruefe("... mit Ansage", (k.lauf.annahmeOffen.find((x) => /Dann rechne ich/.test(x.text)) || {}).text, "Dann rechne ich mit 2 Erwachsenen und 1 Kind (17 Jahre).");
  pruefe("... ohne Rückfrage", WK.kinderErwachsenRueckfrage(k.lauf.profil, k.lauf), null);
  k = await zug("kinderAlter", "Wie alt?", "19 und 17", { ...G, erwachsene: 1, kinder: 2, personen: 3, kinderAlter: [] }, { erwachsene: 2, kinder: 1, kinderAlter: [17] });
  pruefe("19 und 17, Modell teilt selbst auf", [k.lauf.profil.erwachsene, k.lauf.profil.kinder, k.lauf.profil.kinderAlter], [2, 1, [17]]);
  k = await zug("kinderAlter", "Wie alt?", "28 und 34", { ...G, erwachsene: 1, kinder: 2, personen: 3, kinderAlter: [] }, { kinderAlter: [28, 34] });
  pruefe("28 und 34: weiter Rückfrage", !!WK.kinderErwachsenRueckfrage(k.lauf.profil, k.lauf), true);
  k = await zug("art", "Hotel, Ferienwohnung oder beides?", "Beides zeigen", G, { typ: "hotel", artEgal: true });
  pruefe("Beides zeigen: gesucht wird unter beidem", WK.seitenTyp(k.lauf.profil), "unterkunft");
  k = await zug("art", "Hotel, Ferienwohnung oder beides?", "ich bin da offen, beides ok", G, { typ: "hotel", artEgal: true });
  pruefe("frei formuliert, Modell widerspricht sich", [k.lauf.profil.typ ?? null, k.lauf.profil.artEgal], [null, true]);
  k = await zug("art", "Hotel, Ferienwohnung oder beides?", "nur hotels bitte", G, { typ: "hotel", artEgal: true });
  pruefe("'nur hotels bitte', Modell widerspricht sich", [k.lauf.profil.typ, !!k.lauf.profil.artEgal], ["hotel", false]);
  for (const [du, tag] of [["gerne einen tag nach ostern los fliegen", "29"], ["zwei tage nach ostern", "30"], ["einen Tag vor Ostern", "27"]]) {
    k = await zug("zeit", "Wann soll es losgehen?", du, { vonPerson: {} }, { anreise: "2027-03-28" });
    pruefe(`'${du}'`, [k.lauf.profil.monat, k.lauf.profil.anreise], [3, `2027-03-${tag}`]);
  }
  k = await zug("zeit", "Wann soll es losgehen?", "an Ostern", { vonPerson: {} }, {});
  pruefe("'an Ostern' bleibt eine Frage nach dem Tag", [k.lauf.profil.monat, k.lauf.profil.anreise ?? null, !!WK.datumRueckfrage(k.lauf.profil, k.lauf, "an Ostern")], [3, null, true]);
  const pH = { ...GF, zieleAuswahl: ["lappland", "mallorca"], zielOffen: false, typ: "hotel", artGenannt: true, anreise: "2027-03-28", von: "2027-03-28", bis: "2027-04-04", vonPerson: { flug: true, monat: true } };
  k = await zug("flugAb", "In welcher Stadt wohnst du ungefähr?", "Ich wohne in Hoffenheim", pH, {}, { gefragtWie: { flugAb: 2 }, nichtVerstanden: { flugAb: 2 } });
  pruefe("'Ich wohne in Hoffenheim': kein eigener Vorschlag des Kerns", k.lauf.vorschlag ?? null, null);
  // Bens Malle-Fall: ein Wunsch darf nie als Ausschluss enden, ein Ausschluss nie als Wunsch
  z.malle = [0, 0];
  for (const [soll, du] of [...["ich möchte unbedingt nach malle", "ja, ich möchte unbedingt nach Malle", "auf jeden fall malle", "nichts geht über malle", "warum nicht malle", "ich will nur nach malle", "malle, keine frage", "ich will nicht lange fliegen, am liebsten malle"].map((x) => ["RAUS", x]),
    ...["nicht nach malle", "bloß nicht malle", "alles außer malle", "ohne malle", "malle lieber nicht", "gerne kreta, aber malle bitte nicht", "gerne kreta aber nicht malle", "malle auf keinen fall"].map((x) => ["DRIN", x])])
    for (const args of [{}, { zieleAus: ["mallorca"] }, { zieleAus: ["mallorca"], belege: { zieleAus: du } }, { ziel: "mallorca" }, { ziel: "mallorca", belege: { ziel: du } }]) {
      const p = { ...G }, k = kern(p, "Wohin?", du, { gefragt: "ziel", zuletztGefragt: "ziel" });
      const m = [KN.lauf, KN.notieren, KN.standAnzeigen, KN.sichern]; KN.lauf = k.lauf; KN.notieren = k.notieren; KN.standAnzeigen = () => {}; KN.sichern = () => {};
      try { KN.regionenLesen(du); } catch { /* weiter */ } [KN.lauf, KN.notieren, KN.standAnzeigen, KN.sichern] = m;
      await WK.werkzeuge.stand_merken.call(WK, { nachricht_art: "antwort", frage_beantwortet: "ja", ...JSON.parse(JSON.stringify(args)) }, k);
      const ist = p.zielId === "mallorca" || (p.zieleAuswahl || []).includes("mallorca") ? "DRIN" : (p.zieleAus || []).includes("mallorca") ? "RAUS" : "-";
      z.malle[1]++; if (ist !== soll) z.malle[0]++; else fehl.push(`[malle] "${du}" / Modell ${JSON.stringify(args)} -> ${ist}`);
      // Widerspruch zwischen Kern und Modell: nachfragen
      if (soll === "DRIN" && args.ziel) { z.malle[1]++; const r = WK.bestaetigungRueckfrage(p, k.lauf); if (/dabei sein oder nicht/.test(r?.satz || "")) z.malle[0]++; else fehl.push(`[malle] "${du}": Widerspruch ohne Rückfrage`); }
    }
  for (const f of fehl) console.log("  " + f);
  console.log(`\nChip allein ${z.allein.join("/")}   Chip gegen falsches Modell ${z.gegen.join("/")}   Schreibweisen ${z.form.join("/")}   Chips mit Bedeutung ${z.voll.join("/")}   Lauf 24.11. ${z.lauf.join("/")}   Malle ${z.malle.join("/")}`);
  process.exit(fehl.length ? 1 : 0);
})();
