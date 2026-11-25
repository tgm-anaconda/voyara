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
const { B, leer } = require("./modellbank-daten.cjs");
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
  verpflegung: "verpflegung", maxPreis: "preis", budgetGesamt: "preis", ausstattung: "ausstattung" };
// Was ohne Nachfragen zusammengehoert
const MIT = { anreise: ["zeit"], flugAb: ["flug"], verpflegung: ["art"] };
const text = (x) => JSON.stringify(x ?? null);
const kernFuer = (c) => {
  const b = VOR[c.t] || {}, p = JSON.parse(JSON.stringify({ ...b, ...(c.vor || {}), vonPerson: { ...(b.vonPerson || {}), ...((c.vor || {}).vonPerson || {}) } }));
  const kern = { lauf: { profil: p, gespraech: [{ role: "assistant", content: FRAGE[c.t] }, { role: "user", content: c.du }], protokoll: [], annahmeOffen: [], gefragtWie: {}, verlauf: [],
      nachrichtArt: "antwort", runde: 1, zugSeit: 77, gefragt: c.t, zuletztGefragt: c.t, gefragtVorher: c.t },
    notieren(e, d) { this.lauf.protokoll.push({ ereignis: e, ...d }); }, freigabe: () => "suchen", darf: () => false, logZeile() {}, sagen() {}, standAnzeigen() {}, sichern() {},
    standKurz: () => "", antwortWerten() {}, gespraechPush() {}, sagenUndMerken() {} };
  return { p, kern };
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
  const { p, kern } = kernFuer(c), vorher = JSON.parse(JSON.stringify(p)); let fehler = null;
  const L = (fn) => { try { fn(); } catch (e) { fehler ||= e.message; } };
  L(() => WK.chipAntwortLesen(kern, c.du)); L(() => WK.fahrplanChipLesen?.(kern, c.t, c.du)); L(() => WK.antwortSelbstLesen(kern, c.t, c.du));
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
  let nachfrage = null; if (offen.length) { try { nachfrage = WK.bestaetigungRueckfrage(p, kern.lauf)?.satz || null; } catch { nachfrage = null; } }
  return { falsch, offen, nachfrage, urteil: falsch.length ? "FALSCH" : offen.length ? "offen" : "richtig", verworfen: kern.lauf.protokoll.filter((e) => /verworfen/.test(e.ereignis)).map((e) => e.ereignis) };
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
  const z = {}, zeilen = [], halb = { arbeit: [0, 0, 0], kontrolle: [0, 0, 0] };
  for (const c of B) {
    if (!ablage[c.du]) { (z.ohneAntwort ||= 0); z.ohneAntwort++; continue; }
    const r = await nachspielen(c, ablage[c.du]); const i = ["richtig", "offen", "FALSCH"].indexOf(r.urteil);
    ((z[c.k] ||= [0, 0, 0]))[i]++; halb[c.nr % 2 ? "arbeit" : "kontrolle"][i]++;
    if (r.urteil !== "richtig" || ALLE) zeilen.push(`${r.urteil.padEnd(7)} ${String(c.nr).padStart(2)}${c.nr % 2 ? " " : "K"} [${c.k}/${c.t}] "${c.du}" -> ${[...r.falsch, ...r.offen.map((x) => x + " fehlt")].join("; ")}${r.nachfrage ? " | fragt: " + r.nachfrage : ""} | Modell ${JSON.stringify(Object.fromEntries(Object.entries(ablage[c.du]).filter(([k]) => !["belege"].includes(k)))).slice(0, 230)} ${r.verworfen.join(",")}`);
  }
  console.log("Bereich      richtig  offen  FALSCH"); for (const [k, v] of Object.entries(z)) if (Array.isArray(v)) console.log(k.padEnd(12), v.map((x) => String(x).padStart(6)).join(" "));
  const s = (a) => `${a[0]} richtig, ${a[1]} offen, ${a[2]} FALSCH`;
  console.log(`Arbeitshaelfte: ${s(halb.arbeit)}\nKontrollhaelfte: ${s(halb.kontrolle)}${z.ohneAntwort ? `\nohne Antwort: ${z.ohneAntwort}` : ""}`);
  console.log(zeilen.join("\n"));
  // Torwaechter: kein falscher Wert, nicht weniger richtig als erreicht
  const richtig = halb.arbeit[0] + halb.kontrolle[0], falsch = halb.arbeit[2] + halb.kontrolle[2];
  console.log(`GESAMT ${richtig}/${B.length} richtig, ${falsch} FALSCH`);
  if (falsch || richtig < 89) process.exitCode = 1;
})();
