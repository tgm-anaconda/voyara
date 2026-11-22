/* Satzbank gegen das echte Modell (22.11.2026) - sparsam.
 *
 *   node agent/satzbank-modell.cjs            alle Saetze (ca. 96 Aufrufe)
 *   node agent/satzbank-modell.cjs --nur=ziel nur ein Bereich
 *
 * Ben: "Die Tests creditarm simulieren und am Ende die Auswertung geben."
 * Und: "Die Absprache zwischen Modell und Kern muss perfekt sein - das
 * Modell braucht eine gewisse Freiheit." Gemessen wird deshalb vor allem,
 * wie oft der Kern einen RICHTIGEN Wert des Modells blockiert.
 *
 * Je Satz genau EIN Aufruf an die Live-Schnittstelle (gpt-4.1-mini, wie im
 * echten Gespraech: Rolle auf dem Server, Stand und Fahrplan vom Kern,
 * stand_merken erzwungen). Danach laeuft die Antwort durch den echten Kern
 * wie im Zug: Kern liest selbst, dann stand_merken mit den Werten des
 * Modells. Keine Seite, keine Suche, keine Folgeaufrufe.
 */
const vm = require("vm");
const { laden, BANK } = require("./satzbank-daten.cjs");
const { WK, KN, ctx } = laden();
vm.runInContext("var Werkzeuge = new Proxy({ seite: () => 'index', zustand: () => ({}) }, { get: (o, k) => (k in o ? o[k] : () => null) });"
  + "var AgentPanel = new Proxy({}, { get: () => () => null });", ctx);

const URL_API = "https://voyara-virid.vercel.app/api/agent";
const nur = (process.argv.find((x) => x.startsWith("--nur=")) || "").split("=")[1] || null;
// gpt-4.1-mini, USD je 1 Mio. Token (Stand der Preisliste des Modells)
const PREIS = { eingabe: 0.4, zwischengespeichert: 0.1, ausgabe: 1.6 };

// Der Stand, den man an dieser Stelle im Gespraech haette (damit der Fahrplan die passende Frage stellt)
const V = { vonPerson: {} };
const VORSTAND = {
  zeit: {},
  anreise: { monat: 10, vonPerson: { monat: true } },
  reisende: { monat: 10, vonPerson: { monat: true } },
  kinderAlter: { monat: 10, erwachsene: 2, kinder: 2, personen: 4, vonPerson: { monat: true, erwachsene: true, kinder: true } },
  ziel: { monat: 10, erwachsene: 2, kinder: 0, personen: 2, kinderAlter: [], vonPerson: { monat: true, erwachsene: true, kinder: true } },
  art: { monat: 10, erwachsene: 2, kinder: 0, personen: 2, kinderAlter: [], zielOffen: true, vonPerson: { monat: true, erwachsene: true, kinder: true } },
  dauer: { monat: 10, erwachsene: 2, kinder: 0, personen: 2, kinderAlter: [], zielId: "mallorca", typ: "hotel", artGenannt: true, vonPerson: { monat: true, erwachsene: true, kinder: true, zielId: true, typ: true } },
  flug: { monat: 10, naechte: 7, erwachsene: 2, kinder: 0, personen: 2, kinderAlter: [], zielId: "mallorca", typ: "hotel", artGenannt: true, vonPerson: { monat: true, naechte: true, zielId: true } },
  flugAb: { monat: 10, naechte: 7, erwachsene: 2, kinder: 0, personen: 2, kinderAlter: [], zielId: "mallorca", typ: "hotel", artGenannt: true, flug: true, vonPerson: { monat: true, naechte: true, flug: true } },
  verpflegung: { monat: 10, naechte: 7, erwachsene: 2, kinder: 0, personen: 2, kinderAlter: [], zielId: "mallorca", typ: "hotel", artGenannt: true, flug: true, flugAb: "Hamburg", flugKlasse: "economy", vorgehen: "top3", vonPerson: { monat: true, naechte: true, flug: true, flugAb: true } },
};
const themaVon = (fall) => fall.thema || ({ korrektur: "art", ausschluss: "ziel" }[fall.b]) || fall.b;

const sortiert = (x) => (Array.isArray(x) ? JSON.stringify([...x].map(String).sort()) : JSON.stringify(x ?? null));
const MODELLFELD = { personen: "personenGesamt", zielId: "ziel" };
const vergleiche = (p, soll) => Object.entries(soll).filter(([k, v]) => sortiert(p[k]) !== sortiert(v)).map(([k, v]) => `${k}: soll ${sortiert(v)}, ist ${sortiert(p[k])}`);

const stubKern = (fall, p, thema) => ({ lauf: { profil: p, gespraech: [], protokoll: [], annahmeOffen: [], gefragtWie: {}, verlauf: [],
    nachrichtArt: "antwort", runde: 1, zugSeit: 77, gefragt: thema, zuletztGefragt: thema, ...(fall.lauf || {}) },
  notieren(e, d) { this.lauf.protokoll.push({ ereignis: e, ...d }); },
  freigabe: () => "suchen", darf: () => false, logZeile() {}, sagen() {}, standAnzeigen() {}, sichern() {}, standKurz: () => "", antwortWerten() {},
  gespraechPush() {}, sagenUndMerken() {} });

async function einFall(fall) {
  const thema = themaVon(fall);
  const p = JSON.parse(JSON.stringify({ ...(VORSTAND[thema] || V), ...(fall.vor || {}), vonPerson: { ...((VORSTAND[thema] || V).vonPerson || {}), ...((fall.vor || {}).vonPerson || {}) } }));
  const kern = stubKern(fall, p, thema);
  // Frage, wie der Kern sie stellen wuerde
  let frage = null;
  try { frage = WK.fahrplan(JSON.parse(JSON.stringify(p)), { ...kern.lauf }).satz; } catch { frage = null; }
  const FRAGE = { zeit: "Wann soll es denn ungefähr losgehen? Ein Monat reicht mir erst mal.", anreise: "An welchem Tag im Oktober wollt ihr anreisen?",
    reisende: "Wer reist mit?", kinderAlter: "Wie alt sind die Kinder?", ziel: "Soll es eher warm oder eher kalt werden, oder hast du schon ein Ziel im Kopf?",
    art: "Soll es ein Hotel werden, eine Ferienwohnung, oder darf ich dir beides zusammen zeigen?", dauer: "Wie lange soll die Reise werden?",
    flug: "Soll ein Flug dazu, oder nur die Unterkunft?", flugAb: "Von welchem Flughafen soll es losgehen?",
    verpflegung: "Welche Verpflegung soll es sein - All Inclusive, Halbpension, nur Frühstück, oder ist dir das egal?" };
  frage = FRAGE[thema] || frage || "Wie kann ich helfen?";
  kern.lauf.gespraech = [{ role: "assistant", content: frage }, { role: "user", content: fall.du }];
  // Stand fuer das Modell, wie der Kern ihn schickt
  KN.lauf = kern.lauf;
  let stand = "";
  try { stand = KN.standFuerModell(); } catch (e) { stand = `Stand: ${JSON.stringify(p)}`; }
  const koerper = { aufgabe: "agent", nachrichten: kern.lauf.gespraech, werkzeuge: WK.definitionen("suchen"), stand, werkzeugPflicht: "stand_merken" };
  let antwort = null, fehler = null;
  for (let versuch = 0; versuch < 2 && !antwort; versuch++) {
    try {
      const r = await fetch(URL_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(koerper) });
      const j = await r.json();
      if (!r.ok) { fehler = j?.fehler || `HTTP ${r.status}`; continue; }
      antwort = j;
    } catch (e) { fehler = e.message; }
  }
  if (!antwort) return { fall, thema, fehler };
  const call = (antwort.tool_calls || []).find((t) => t.function?.name === "stand_merken");
  let args = {};
  try { args = JSON.parse(call?.function?.arguments || "{}"); } catch { args = {}; }
  // Durch den echten Kern
  try { WK.antwortSelbstLesen(kern, thema, fall.du); } catch { /* weiter */ }
  // KN.lauf direkt davor setzen - die Aufrufe laufen zu viert gleichzeitig
  if (KN.regionenLesen) {
    const n = KN.notieren, sa = KN.standAnzeigen, si = KN.sichern;
    KN.lauf = kern.lauf; KN.notieren = kern.notieren; KN.standAnzeigen = () => {}; KN.sichern = () => {};
    try { KN.regionenLesen(fall.du); } catch { /* weiter */ }
    KN.notieren = n; KN.standAnzeigen = sa; KN.sichern = si;
  }
  try { await WK.werkzeuge.stand_merken.call(WK, { nachricht_art: "antwort", ...args }, kern); } catch (e) { fehler = e.message; }
  const end = vergleiche(p, fall.soll);
  // Lag das Modell selbst richtig?
  const modellFalsch = Object.entries(fall.soll).filter(([k, v]) => {
    const mk = MODELLFELD[k] || k;
    if (!(mk in args)) return true;
    return sortiert(args[mk]) !== sortiert(v);
  }).map(([k]) => k);
  const belege = args.belege && typeof args.belege === "object" ? Object.keys(args.belege) : [];
  const belegEv = kern.lauf.protokoll.filter((e) => /^beleg_/.test(e.ereignis)).map((e) => `${e.ereignis === "beleg_angenommen" ? "+" : "-"}${e.feld}${e.grund ? `(${e.grund})` : ""}`);
  let nachfrage = null;
  if (end.length) { try { nachfrage = WK.bestaetigungRueckfrage(p, kern.lauf)?.satz || null; } catch { nachfrage = null; } }
  const v = antwort.verbrauch || {};
  const kosten = ((Math.max(0, (v.eingabe || 0) - (v.zwischengespeichert || 0))) * PREIS.eingabe + (v.zwischengespeichert || 0) * PREIS.zwischengespeichert + (v.ausgabe || 0) * PREIS.ausgabe) / 1e6;
  return { fall, thema, args, end, modellFalsch, belege, belegEv, nachfrage, kosten, verworfen: kern.lauf.protokoll.filter((e) => /verworfen/.test(e.ereignis)).map((e) => e.ereignis + (e.feld ? `:${e.feld}` : "")) };
}

(async () => {
  const faelle = BANK.filter((f) => !f.nurFalsch && (!nur || f.b === nur));
  const erg = [];
  for (let i = 0; i < faelle.length; i += 4) {
    const teil = await Promise.all(faelle.slice(i, i + 4).map(einFall));
    erg.push(...teil);
    process.stdout.write(`\r${erg.length}/${faelle.length}`);
  }
  console.log("\n");
  const z = { gut: 0, blockiert: 0, gerettet: 0, beideFalsch: 0, fehler: 0, belegeDa: 0, kosten: 0 };
  const je = {};
  for (const r of erg) {
    const b = (je[r.fall.b] ||= { n: 0, gut: 0, blockiert: 0, gerettet: 0, beide: 0, belege: 0 });
    b.n++;
    if (r.fehler && !r.args) { z.fehler++; continue; }
    z.kosten += r.kosten || 0;
    if (r.belege.length) { z.belegeDa++; b.belege++; }
    const modellRichtig = !r.modellFalsch.length;
    if (!r.end.length) { z.gut++; b.gut++; if (!modellRichtig) { z.gerettet++; b.gerettet++; } }
    else if (modellRichtig) { z.blockiert++; b.blockiert++; }
    else { z.beideFalsch++; b.beide++; }
  }
  console.log("ECHTES MODELL - je Bereich (gut = Endstand richtig; blockiert = Modell richtig, Kern hat es nicht uebernommen;");
  console.log("                gerettet = Modell falsch/unvollstaendig, Kern hat es richtig gestellt; beide = beide falsch)\n");
  console.log("Bereich       Faelle  gut  blockiert  gerettet  beide  mit Belegen");
  for (const [b, x] of Object.entries(je)) console.log(`${b.padEnd(13)} ${String(x.n).padStart(6)} ${String(x.gut).padStart(4)} ${String(x.blockiert).padStart(10)} ${String(x.gerettet).padStart(9)} ${String(x.beide).padStart(6)} ${String(x.belege).padStart(12)}`);
  console.log(`\nGESAMT: ${erg.length} Saetze, gut ${z.gut}, blockiert ${z.blockiert}, gerettet ${z.gerettet}, beide falsch ${z.beideFalsch}, Fehler ${z.fehler}; Belege mitgeschickt in ${z.belegeDa}; Kosten ca. ${z.kosten.toFixed(3)} USD`);
  console.log("\nKERN BLOCKIERT RICHTIGES (das wichtigste):");
  for (const r of erg.filter((r) => r.end?.length && !r.modellFalsch?.length)) console.log(`  [${r.fall.b}] "${r.fall.du}" -> ${r.end.join("; ")} | Belege ${r.belegEv.join(",") || "keine"} | ${r.verworfen.join(",")}${r.nachfrage ? ` | Nachfrage: ${r.nachfrage}` : ""}`);
  console.log("\nBEIDE FALSCH (Modell hat es nicht verstanden, Kern auch nicht):");
  for (const r of erg.filter((r) => r.end?.length && r.modellFalsch?.length)) console.log(`  [${r.fall.b}] "${r.fall.du}" -> ${r.end.join("; ")} | Modell schickte ${JSON.stringify(Object.fromEntries(Object.entries(r.args).filter(([k]) => !["nachricht_art", "frage_beantwortet", "themen", "belege"].includes(k))))}${r.nachfrage ? ` | Nachfrage: ${r.nachfrage}` : ""}`);
  console.log("\nKERN HAT GERETTET:");
  for (const r of erg.filter((r) => !r.end?.length && r.modellFalsch?.length)) console.log(`  [${r.fall.b}] "${r.fall.du}" (Modell fehlte/falsch: ${r.modellFalsch.join(",")})`);
  console.log("\nBELEGE ABGELEHNT:");
  for (const r of erg.filter((r) => r.belegEv?.some((x) => x.startsWith("-")))) console.log(`  [${r.fall.b}] "${r.fall.du}" -> ${r.belegEv.filter((x) => x.startsWith("-")).join(", ")} | Zitate ${JSON.stringify(r.args.belege)}`);
  if (z.fehler) { console.log("\nFEHLER:"); for (const r of erg.filter((r) => r.fehler && !r.args)) console.log(`  "${r.fall.du}" -> ${r.fehler}`); }
})();
