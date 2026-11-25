/* Modellbank-Lauf (25.11.2026)
 *
 *   node agent/modellbank-test.cjs            spielt die GESPEICHERTEN echten
 *                                             Antworten nach - kostenlos
 *   node agent/modellbank-test.cjs --alle     jeden Satz zeigen
 *   node agent/modellbank-test.cjs --echt     ruft das Modell (ca. 0,11 USD,
 *                                             nur mit Bens Erlaubnis) und
 *                                             schreibt modellantworten.json
 *   VOYARA_QUELLE=_backup/<ordner>/ ...       Gegenprobe
 *
 * Ben (25.11.): "Wir beheben was, und dann wird das, was wir behoben haben,
 * wieder kaputt gemacht." Deshalb: einmal echt fragen, Antworten behalten,
 * danach laeuft jede Aenderung am Kern gegen dieselben echten Antworten.
 *
 * Urteil je Satz:  richtig  alles Geforderte steht, nichts Falsches
 *                  offen    etwas fehlt, aber nichts Falsches (der Agent fragt)
 *                  FALSCH   ein falscher oder erfundener Wert steht im Stand
 */
const vm = require("vm"), fs = require("fs"), path = require("path");
const { laden } = require("./satzbank-daten.cjs");
const { B: B1, leer } = require("./modellbank-daten.cjs");
const { B: B2 } = require("./modellbank2-daten.cjs");
const B = [...B1, ...B2.map((c, i) => ({ ...c, nr: B1.length + 1 + i }))];
const { WK, KN, ctx } = laden();
vm.runInContext("var Werkzeuge = new Proxy({ seite: () => 'index', zustand: () => ({}) }, { get: (o, k) => (k in o ? o[k] : () => null) });"
  + "var AgentPanel = new Proxy({}, { get: () => () => null });", ctx);
const ECHT = process.argv.includes("--echt"), ALLE = process.argv.includes("--alle");
const ABLAGE = path.join(__dirname, "modellantworten.json");
const URL_API = "https://voyara-virid.vercel.app/api/agent";
const DECKEL = 0.115;   // USD, danach wird nicht weiter gerufen
const PREIS = { eingabe: 0.4, zwischengespeichert: 0.1, ausgabe: 1.6 };
const vp = (...k) => Object.fromEntries(k.map((x) => [x, true]));
const ZWEI = { erwachsene: 2, kinder: 0, personen: 2, kinderAlter: [] };
const VOR = {
  zeit: {}, anreise: { monat: 10, vonPerson: vp("monat") }, dauer: { monat: 10, vonPerson: vp("monat") },
  reisende: { monat: 10, naechte: 7, vonPerson: vp("monat", "naechte") },
  kinderAlter: { monat: 10, naechte: 7, erwachsene: 2, kinder: 2, personen: 4, vonPerson: vp("monat", "naechte", "erwachsene", "kinder") },
  art: { monat: 10, naechte: 7, ...ZWEI, vonPerson: vp("monat", "naechte", "erwachsene", "kinder") },
  ziel: { monat: 10, naechte: 7, ...ZWEI, typ: "hotel", artGenannt: true, vonPerson: vp("monat", "naechte", "erwachsene", "kinder", "typ") },
};
VOR.flug = { ...VOR.ziel, zielId: "kreta", vonPerson: { ...VOR.ziel.vonPerson, zielId: true } };
VOR.flugAb = { ...VOR.flug, flug: true, vonPerson: { ...VOR.flug.vonPerson, flug: true } };
VOR.verpflegung = { ...VOR.flugAb, flugAb: "Hamburg", flugKlasse: "economy", vonPerson: { ...VOR.flugAb.vonPerson, flugAb: true, flugKlasse: true } };
VOR.preis = { ...VOR.verpflegung, verpflegung: "halb", vonPerson: { ...VOR.verpflegung.vonPerson, verpflegung: true } };
const FRAGE = { zeit: "Wann soll es denn ungefähr losgehen? Ein Monat reicht mir erst mal.", anreise: "Weißt du im Oktober schon einen genauen Anreisetag, oder bist du da flexibel?",
  reisende: "Wer reist mit?", kinderAlter: "Wie alt sind die Kinder?", ziel: "Soll es eher in eine warme oder eher in eine kalte Gegend gehen, oder hast du schon ein Ziel im Kopf?",
  art: "Soll es ein Hotel werden, eine Ferienwohnung, oder darf ich dir beides zusammen zeigen?", dauer: "Wie lange soll die Reise werden?",
  flug: "Soll ein Flug dazu, oder nur die Unterkunft?", flugAb: "Von welchem Flughafen soll es losgehen?",
  verpflegung: "Welche Verpflegung soll es sein - All Inclusive, Halbpension, nur Frühstück, oder ist dir das egal?", preis: "Hast du beim Preis eine feste Grenze, oder bist du da offen?" };
const GRUPPE = { monat: "zeit", anreise: "anreise", naechte: "dauer", erwachsene: "reisende", kinder: "reisende", personen: "reisende", kinderAlter: "reisende",
  typ: "art", zielId: "ziel", zieleAuswahl: "ziel", zieleAus: "ziel", richtung: "ziel", flug: "flug", flugAb: "flugAb", flugAbAuswahl: "flugAb",
  verpflegung: "verpflegung", maxPreis: "preis", budgetGesamt: "preis", ausstattung: "ausstattung", anzahlVorschlaege: "anzahl" };
// Wie schlimm ist ein falscher Wert? (Ben, 25.11.: "keine drastischen Fehler")
const DRASTISCH = /^(monat|anreise|naechte|erwachsene|kinder|personen|zielId|zieleAuswahl|zieleAus|flug|maxPreis|budgetGesamt|Absturz)\b/;
// Was ohne Nachfragen zusammengehoert
const MIT = { anreise: ["zeit"], flugAb: ["flug"], verpflegung: ["art"] };
// Spaetere Phasen (Durchlauf 1, 25.11.2026)
const MAL = { monat: 7, naechte: 7, ...ZWEI, zimmer: 1, typ: "hotel", artGenannt: true, flexibel: true, zielId: "mallorca", vonPerson: vp("monat", "naechte", "erwachsene", "kinder", "typ", "zielId", "flug", "maxPreis", "verpflegung") };
VOR.warnung = { ...MAL, flug: false, verpflegung: "halb", maxPreis: 90 };
VOR.engstelle = { ...MAL, flug: false, verpflegung: "ai", maxPreis: 120 };
VOR.grad = { ...MAL, zielId: undefined, flug: undefined, richtung: "warm", vonPerson: { ...MAL.vonPerson, zielId: undefined, richtung: true } };
VOR.anzahl = { ...MAL, flug: true, flugAb: "Hamburg", flugKlasse: "economy", verpflegung: "halb", maxPreis: 180 };
VOR.ausstattung = VOR.anzahl; VOR.gewichtung = VOR.anzahl; VOR.vorlage = { ...VOR.anzahl, anzahlVorschlaege: 3 }; VOR.flugwahl = VOR.vorlage; VOR.kasse = VOR.vorlage;
Object.assign(FRAGE, { grad: "Warm heißt für mich ab 22 Grad. Im Juli sind das 9 Regionen. Ab 19 Grad kämen Wien und Lissabon dazu. Bei 22 Grad bleiben oder auf 19 gehen?",
  anzahl: "Für die Entscheidung stelle ich dir drei Häuser zusammen - passt das, oder möchtest du mehr vergleichen?", ausstattung: "Gibt es etwas, das die Unterkunft haben MUSS - zum Beispiel ein Pool? Häuser ohne das fallen raus.",
  gewichtung: "Zuletzt noch: Worauf achtest du bei den Bewertungen besonders? Zum Beispiel Ruhe, gutes Essen oder die Lage. Das schließt keine Häuser aus.",
  vorlage: "Ich habe drei Häuser für dich: Hotel Cala Blanca (151 € pro Nacht, Note 4,5), Mar i Pins (158 € pro Nacht, Note 4,4, Meerblick) und Es Foguero (163 € pro Nacht, Note 4,6). Mein Favorit ist Hotel Cala Blanca. Was meinst du?",
  flugwahl: "Ich habe drei Flüge ab Hamburg für dich, alle in Economy. Welcher soll es sein?", kasse: "Es ist alles ausgefüllt, der Gesamtpreis ist 1.934 €. Soll ich die Buchung abschließen?" });
const GEFRAGT = { warnung: "preis", engstelle: null, grad: "ziel", vorlage: null, flugwahl: null, kasse: null };
const PHASE = (c, lauf, p) => {
  if (c.t === "warnung") { const w = WK.preisWarnung(p, lauf); FRAGE.warnung = w.satz; lauf.chipWirkung = w.wirkung; lauf.chipThema = "preis"; }
  if (c.t === "engstelle") { lauf.preisGewarnt = { 120: true }; const L = WK.katalogTreffer(p, WK.filterAusStand(p)); WK.engstelle(L, p, lauf); const q = WK.engstelleRueckfrage(p, lauf); FRAGE.engstelle = q.satz; lauf.chipWirkung = q.wirkung; lauf.kernWartet = true; }
  if (c.t === "grad") { lauf.spanneOffen = { grenze: 22, weiter: 19 }; p.zieleErlaubt = ["mallorca", "kreta", "algarve", "sardinien", "teneriffa", "barcelona", "marrakesch", "krabi", "newyork"]; }
  if (["anzahl", "ausstattung", "gewichtung"].includes(c.t)) lauf.gesuchtMit = "x";
  if (["vorlage", "flugwahl", "kasse"].includes(c.t)) { lauf.gesuchtMit = "x"; lauf.letzteVorlage = ["h1", "h2", "h3"]; lauf.vorlageFuer = "x"; lauf.besprochen = { preis: true, gewichtung: true, ausstattung: true }; }
  const g = lauf.gespraech[0]; if (g) g.content = FRAGE[c.t];
};
const text = (x) => JSON.stringify(x ?? null);
const kernFuer = (c) => {
  const thema = c.t in GEFRAGT ? GEFRAGT[c.t] : c.t;
  const b = VOR[c.t] || {}, p = JSON.parse(JSON.stringify({ ...b, ...(c.vor || {}), vonPerson: { ...(b.vonPerson || {}), ...((c.vor || {}).vonPerson || {}) } }));
  const kern = { lauf: { profil: p, gespraech: [{ role: "assistant", content: FRAGE[c.t] }, { role: "user", content: c.du }], protokoll: [], annahmeOffen: [], gefragtWie: {}, verlauf: [],
      nachrichtArt: "antwort", runde: 1, zugSeit: 77, gefragt: thema, zuletztGefragt: thema, gefragtVorher: thema },
    notieren(e, d) { this.lauf.protokoll.push({ ereignis: e, ...d }); }, freigabe: () => "suchen", darf: () => false, logZeile() {}, sagen() {}, standAnzeigen() {}, sichern() {},
    standKurz: () => "", antwortWerten() {}, gespraechPush() {}, sagenUndMerken() {} };
  try { PHASE(c, kern.lauf, p); } catch (e) { kern.phaseFehler = e.message; }
  return { p, kern, thema };
};
async function fragen(c) {
  const { p, kern } = kernFuer(c);
  KN.lauf = kern.lauf;
  let stand = ""; try { stand = KN.standFuerModell(); } catch { stand = `Stand: ${JSON.stringify(p)}`; }
  const koerper = { aufgabe: "agent", nachrichten: kern.lauf.gespraech, werkzeuge: WK.definitionen("suchen"), stand, werkzeugPflicht: "stand_merken" };
  for (let v = 0; v < 2; v++) {
    try {
      const r = await fetch(URL_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(koerper) });
      const d = await r.json(); if (!r.ok) continue;
      const call = (d.tool_calls || []).find((t) => t.function?.name === "stand_merken"), u = d.verbrauch || {};
      return { args: JSON.parse(call?.function?.arguments || "{}"),
        usd: ((Math.max(0, (u.eingabe || 0) - (u.zwischengespeichert || 0))) * PREIS.eingabe + (u.zwischengespeichert || 0) * PREIS.zwischengespeichert + (u.ausgabe || 0) * PREIS.ausgabe) / 1e6 };
    } catch { /* noch einmal */ }
  }
  return null;
}
async function nachspielen(c, args) {
  const { p, kern, thema } = kernFuer(c), vorher = JSON.parse(JSON.stringify(p)); let fehler = kern.phaseFehler || null;
  const L = (fn) => { try { fn(); } catch (e) { fehler ||= e.message; } };
  L(() => WK.chipAntwortLesen(kern, c.du)); L(() => WK.fahrplanChipLesen?.(kern, thema, c.du)); L(() => WK.antwortSelbstLesen(kern, thema, c.du));
  kern.lauf.chipWirkung = null;
  const alt = [KN.notieren, KN.standAnzeigen, KN.sichern]; KN.lauf = kern.lauf; KN.notieren = kern.notieren; KN.standAnzeigen = () => {}; KN.sichern = () => {};
  L(() => KN.regionenLesen(c.du)); [KN.notieren, KN.standAnzeigen, KN.sichern] = alt;
  try { await WK.werkzeuge.stand_merken.call(WK, { nachricht_art: "antwort", ...JSON.parse(JSON.stringify(args)) }, kern); } catch (e) { fehler ||= e.message; }
  const falsch = [], offen = [], erlaubt = new Set(c.zusatz || []);
  for (const k of Object.keys(c.soll)) { const g = GRUPPE[k]; if (g) { erlaubt.add(g); (MIT[g] || []).forEach((x) => erlaubt.add(x)); } }
  for (const [k, v] of Object.entries(c.soll)) {
    const ist = p[k], gut = typeof v === "function" ? v(ist) : text(ist) === text(v);
    if (gut) continue;
    const unver = text(ist) === text(vorher[k]);
    (leer(ist) || unver ? offen : falsch).push(`${k}=${text(ist)}`);
  }
  for (const k of Object.keys(c.nie || {})) if (!leer(p[k])) falsch.push(`${k}=${text(p[k])} verboten`);
  for (const [k, g] of Object.entries(GRUPPE)) if (!(k in c.soll) && !erlaubt.has(g) && text(p[k]) !== text(vorher[k]) && !leer(p[k])) falsch.push(`${k}=${text(p[k])} erfunden`);
  if (fehler) falsch.push("Absturz " + fehler);
  let nachfrage = null; { try { nachfrage = WK.bestaetigungRueckfrage(p, kern.lauf)?.satz || null; } catch { nachfrage = null; } }
  return { falsch, offen, nachfrage, urteil: falsch.length ? (falsch.some((x) => DRASTISCH.test(x)) ? "DRASTISCH" : "leicht") : offen.length ? "offen" : "richtig", verworfen: kern.lauf.protokoll.filter((e) => /verworfen/.test(e.ereignis)).map((e) => e.ereignis) };
}
(async () => {
  let ablage = {}; try { ablage = JSON.parse(fs.readFileSync(ABLAGE, "utf8")); } catch { ablage = {}; }
  if (ECHT) {
    let usd = 0; const offen = B.filter((c) => !ablage[c.du]);
    for (let i = 0; i < offen.length; i += 3) {
      if (usd > DECKEL) { console.log(`Deckel erreicht nach ${i} Saetzen`); break; }
      await Promise.all(offen.slice(i, i + 3).map(async (c) => { const r = await fragen(c); if (r) { ablage[c.du] = r.args; usd += r.usd; } else console.log("keine Antwort:", c.du); }));
      fs.writeFileSync(ABLAGE, JSON.stringify(ablage, null, 1));
    }
    console.log(`Kosten dieses Laufs: ${usd.toFixed(4)} USD`);
  }
  let fragen_ = 0; const z = {}, zeilen = [], halb = { arbeit: [0, 0, 0, 0], kontrolle: [0, 0, 0, 0] };
  for (const c of B) {
    if (!ablage[c.du]) { (z.ohneAntwort ||= 0); z.ohneAntwort++; continue; }
    const r = await nachspielen(c, ablage[c.du]); if (r.nachfrage) { fragen_++; if (ALLE) console.log("fragt:", c.du, "->", r.nachfrage); } const i = ["richtig", "offen", "leicht", "DRASTISCH"].indexOf(r.urteil);
    ((z[c.k] ||= [0, 0, 0, 0]))[i]++; halb[c.nr % 2 ? "arbeit" : "kontrolle"][i]++;
    if (r.urteil !== "richtig" || ALLE) zeilen.push(`${r.urteil.padEnd(9)} ${String(c.nr).padStart(2)}${c.nr % 2 ? " " : "K"} [${c.k}/${c.t}] "${c.du}" -> ${[...r.falsch, ...r.offen.map((x) => x + " fehlt")].join("; ")}${r.nachfrage ? " | fragt: " + r.nachfrage : ""} | Modell ${JSON.stringify(Object.fromEntries(Object.entries(ablage[c.du]).filter(([k]) => !["belege"].includes(k)))).slice(0, 230)} ${r.verworfen.join(",")}`);
  }
  console.log("Bereich      richtig  offen leicht DRASTISCH"); for (const [k, v] of Object.entries(z)) if (Array.isArray(v)) console.log(k.padEnd(12), v.map((x) => String(x).padStart(6)).join(" "));
  console.log(`Bestaetigungsfragen: ${fragen_} von ${B.length}`);
  const s = (a) => `${a[0]} richtig, ${a[1]} offen, ${a[2]} leicht, ${a[3]} DRASTISCH`;
  console.log(`Arbeitshaelfte: ${s(halb.arbeit)}\nKontrollhaelfte: ${s(halb.kontrolle)}${z.ohneAntwort ? `\nohne Antwort: ${z.ohneAntwort}` : ""}`);
  console.log(zeilen.join("\n"));
  // Torwaechter: kein falscher Wert, nicht weniger richtig als erreicht
  const richtig = halb.arbeit[0] + halb.kontrolle[0], falsch = halb.arbeit[2] + halb.kontrolle[2] + halb.arbeit[3] + halb.kontrolle[3], drastisch = halb.arbeit[3] + halb.kontrolle[3];
  console.log(`GESAMT ${richtig}/${B.length} richtig, ${falsch} falsch, davon ${drastisch} DRASTISCH`);
  if (falsch || richtig < 170) process.exitCode = 1;
})();
