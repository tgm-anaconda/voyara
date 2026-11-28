/* Pruefung der sechs Befunde aus dem Testlauf vom 03.11.2026.
 *
 *   node agent/befunde-test.cjs              der jetzige Stand, erwartet 0 falsch
 *   node agent/befunde-test.cjs --alt        Gegenprobe am Stand von 03.11.2026
 *   node agent/befunde-test.cjs --alt=<ord>  Gegenprobe gegen eine andere Sicherung
 *
 * Der feste Ordner war eine Falle (18.11.2026): Eine korrigierte
 * Pruefung liess sich nur gegen den Stand von 03.11. gegenproben, und
 * der bestand sie zufaellig - die Gegenprobe war gruen, ohne irgendetwas
 * zu messen. Wie in durchgang-test.cjs nimmt --alt= jetzt den Ordner.
 * Die Sicherung muss die Datei enthalten, um die es geht, sonst misst
 * die Gegenprobe den neuen Code gegen sich selbst.
 *
 * Geprueft werden die drei Punkte, die Logik sind: der selbst gelesene
 * Regionsausschluss, das Nachhaken bei den Wuenschen und der Abbruch im
 * Rundgang. Die Statuszeile, die Scrollbereiche und der Wortlaut der
 * Budgetfrage sind Text und Gestaltung - die stehen in der Seitenpruefung
 * und im Auge, nicht hier.
 */
const fs = require("fs"), vm = require("vm");
const B = "/Users/tom-gabrielmielicki/Desktop/Bachelor Arbeit/Website/";
const altArg = process.argv.find((x) => x === "--alt" || x.startsWith("--alt="));
const alt = !!altArg;
const ordner = altArg && altArg.includes("=")
  ? altArg.slice(altArg.indexOf("=") + 1).replace(/\/$/, "") + "/"
  : "_backup/2026-11-03-vor-sechs-befunden/";
const quelle = alt ? B + ordner : B;

const ctx = { console, window: {},
  document: { querySelectorAll: () => [], querySelector: () => null, getElementById: () => null,
    createElement: () => ({ setAttribute() {}, append() {}, appendChild() {}, querySelector: () => null, classList: { add() {}, remove() {} }, style: {} }),
    head: { appendChild() {} },
    body: { classList: { contains: () => false, add() {}, remove() {}, toggle() {} } },
    documentElement: { classList: { add() {}, remove() {} } }, addEventListener() {} },
  location: { search: "", href: "" }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  sessionStorage: { getItem: () => null, setItem() {} }, setTimeout, clearTimeout,
  fetch: () => Promise.reject(new Error("kein Netz")),
  navigator: { userAgent: "test" }, matchMedia: () => ({ matches: false, addEventListener() {} }),
  URLSearchParams, URL, Date, JSON, Math, Promise, Intl,
  requestAnimationFrame: (f) => setTimeout(f, 0), cancelAnimationFrame: clearTimeout,
  addEventListener() {}, removeEventListener() {}, screen: { width: 1440, height: 900 },
  innerWidth: 1440, innerHeight: 900, scrollTo() {}, getComputedStyle: () => ({ getPropertyValue: () => "" }) };
ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);
for (const f of ["data/ziele.js", "data/hotels.js", "data/inventory.js", "data/auswahl.js",
  "data/faq.js", "agent/fluege.js", "agent/politik.js", "agent/werkzeugkasten.js", "agent/kern.js"]) {
  /* Die neueren Sicherungen legen die Dateien flach ab (werkzeugkasten.js
     statt agent/werkzeugkasten.js). Was dort nicht liegt, kommt aus dem
     Projekt - sonst misst die Gegenprobe fehlende Dateien statt altem
     Code. */
  const flach = quelle + f.replace(/^(agent|data)\//, "");
  const tief = (f.startsWith("agent/") ? quelle : B) + f;
  const pfad = (alt && fs.existsSync(flach)) ? flach : (fs.existsSync(tief) ? tief : B + f);
  try { vm.runInContext(fs.readFileSync(pfad, "utf8"), ctx, { filename: f }); }
  catch (e) { console.log("LADEFEHLER", f, e.message.slice(0, 160)); process.exit(2); }
}
vm.runInContext("this.PK=typeof Politik!=='undefined'?Politik:null;"
  + "this.WK=typeof Werkzeugkasten!=='undefined'?Werkzeugkasten:null;"
  + "this.KN=typeof Kern!=='undefined'?Kern:null;", ctx);
const { WK, KN } = ctx;
if (!WK || !KN) { console.log("Werkzeugkasten oder Kern nicht geladen"); process.exit(2); }

let gut = 0, schlecht = 0;
const pruefe = (name, ist, soll) => {
  const a = JSON.stringify(ist), b = JSON.stringify(soll);
  if (a === b) gut++;
  else { schlecht++; console.log(`  FEHLT: ${name}\n    ist  ${a}\n    soll ${b}`); }
};
console.log(alt ? "GEGENPROBE am alten Code" : "NEUER Code");

/* ====================================================================
   1. Der Regionsausschluss, vom Kern selbst gelesen
   ==================================================================== */
// Ein Kern-Doppel: nur die Felder, die regionenLesen anfasst.
const kernMit = (profil, gespraech = []) => ({
  lauf: { profil, gespraech, zuletztGemerkt: [], selbstGelesen: [] },
  notieren() {}, sichern() {}, standAnzeigen() {},
  regionenLesen: KN.regionenLesen, ausschlussRein: KN.ausschlussRein, AUSSCHLUSS_REIN: KN.AUSSCHLUSS_REIN, AUSSCHLUSS_WORT: KN.AUSSCHLUSS_WORT, AUSSCHLUSS_ENDE: KN.AUSSCHLUSS_ENDE,
  // seit dem 24.11.2026 getrennt, damit auch der Modellwert daran geprueft wird
  ausschlussLesen: KN.ausschlussLesen, regionenIm: KN.regionenIm, ohneSchein: KN.ohneSchein, SCHEIN_VERNEINUNG: KN.SCHEIN_VERNEINUNG,
});
const liest = (satz, profil = {}) => {
  const k = kernMit(profil);
  if (typeof k.regionenLesen !== "function") return "keine Funktion";
  k.regionenLesen.call(k, satz);
  // Seit dem 28.11.2026: in laengeren Saetzen ist der gelesene Ausschluss ein Pruefwert (Rueckfrage, wenn das Modell schweigt)
  return [...new Set([...(k.lauf.profil.zieleAus || []), ...(k.lauf.ausschlussKern || [])])].sort();
};

pruefe("der gemeldete Satz schliesst beide Regionen aus",
  liest("ich möchte bitte nicht nach lissabon oder marrakesch die bitte rausnehmen aus der suche"),
  ["lissabon", "marrakesch"]);
pruefe("'ohne Wien' wird gelesen", liest("gerne irgendwas Warmes, aber ohne Wien"), ["wien"]);
// Bens Beispiele (28.11.2026): "nicht" und ein Ort im selben Satz heisst noch nicht "Ort nein"
pruefe("Ben: 'schon lange nicht mehr Urlaub gemacht, jetzt nach Kreta' schliesst Kreta nicht aus", liest("ich habe schon lange nicht mehr Urlaub gemacht, jetzt geht's ab nach Kreta"), []);
pruefe("Ben: 'Mallorca mochte ich nicht, lieber Kreta' schliesst nur Mallorca aus", liest("Mallorca mochte ich nicht, ich fahre lieber nach Kreta"), ["mallorca"]);
pruefe("Reiner Satz 'nicht nach Kreta' gilt sofort", (() => { const k = kernMit({}); k.regionenLesen.call(k, "nicht nach Kreta"); return [(k.lauf.profil.zieleAus || []).join(","), (k.lauf.ausschlussKern || []).join(",")]; })(), ["kreta", ""]);
pruefe("Laengerer Satz ist nur Pruefwert", (() => { const k = kernMit({}); k.regionenLesen.call(k, "Mallorca mochte ich nicht, ich fahre lieber nach Kreta"); return [(k.lauf.profil.zieleAus || []).join(","), (k.lauf.ausschlussKern || []).join(",")]; })(), ["", "mallorca"]);
pruefe("'rausnehmen' allein reicht", liest("nimm Kreta bitte raus"), ["kreta"]);
pruefe("'alles ausser Mallorca'", liest("alles außer Mallorca bitte"), ["mallorca"]);
pruefe("ohne Verneinung wird nichts ausgeschlossen", liest("Mallorca und Kreta klingen beide gut"), []);
pruefe("'lieber' dreht den Satz um",
  liest("nicht nach Mallorca, lieber Kreta"), ["mallorca"]);
pruefe("'sondern' dreht den Satz um",
  liest("nicht Marrakesch, sondern Teneriffa"), ["marrakesch"]);
pruefe("ein zweiter Satz kommt dazu",
  liest("Kreta fände ich schön. Island bitte nicht."), ["island"]);
pruefe("schon Ausgeschlossenes bleibt stehen",
  liest("und Wien bitte auch nicht", { zieleAus: ["lissabon"] }), ["lissabon", "wien"]);

/* Umkehrwort VOR der Verneinung (gemeldet 04.11.2026).
   --------------------------------------------------------------------
   "Gerne Kreta, aber Mallorca bitte nicht" trug beide Regionen in den
   Ausschluss ein: Das "nicht" steht am Satzende, hinter ihm folgt also
   kein Umkehrwort mehr, und ohne einen Schnitt davor wurde der ganze
   Teilsatz gelesen - samt Wunschziel. Gelesen wird jetzt vom letzten
   Umkehrwort vor der Verneinung bis zum ersten danach. */
pruefe("Wunsch vor dem 'aber' bleibt draussen",
  liest("Gerne Kreta, aber Mallorca bitte nicht."), ["mallorca"]);
pruefe("Wunsch vor dem 'aber', Verneinung in der Mitte",
  liest("Kreta ja, aber nicht Mallorca."), ["mallorca"]);
pruefe("'am liebsten' schneidet ebenfalls",
  liest("Am liebsten Kreta und auf keinen Fall Mallorca."), ["mallorca"]);
pruefe("'nur ... nicht' nach einem Wunsch",
  liest("Barcelona wäre schön, nur Kyoto nicht."), ["kyoto"]);
pruefe("Wunsch und Ablehnung ohne Umkehrwort dazwischen",
  liest("Ohne Marrakesch bitte, am liebsten Sardinien."), ["marrakesch"]);

// Das abgelehnte Ziel darf nicht gleichzeitig das feste Ziel sein
(() => {
  const k = kernMit({ zielId: "marrakesch", zieleAuswahl: ["marrakesch", "kreta"] });
  if (typeof k.regionenLesen !== "function") { pruefe("Ablehnung raeumt Ziel und Auswahl", "keine Funktion", "geraeumt"); return; }
  k.regionenLesen.call(k, "Marrakesch bitte nicht");
  pruefe("Ablehnung raeumt Ziel und Auswahl",
    { zielId: k.lauf.profil.zielId, auswahl: k.lauf.profil.zieleAuswahl },
    { zielId: null, auswahl: ["kreta"] });
})();

// Der Kern meldet die Aufnahme, damit eine Quittung moeglich ist
(() => {
  const k = kernMit({});
  if (typeof k.regionenLesen !== "function") { pruefe("Aufnahme wird vermerkt", "keine Funktion", ["zieleAus"]); return; }
  k.regionenLesen.call(k, "Lissabon bitte nicht");
  pruefe("Aufnahme wird vermerkt", k.lauf.zuletztGemerkt, ["zieleAus"]);
})();

/* Das Modell darf einen Ausschluss ergaenzen, aber nicht leeren.
   Geprueft am Werkzeug stand_merken, mit einem Kern-Doppel. */
const standMerken = async (args, profil, gespraech) => {
  const k = { lauf: { profil, gespraech, selbstGelesen: [], zuletztGemerkt: [], besprochen: {}, nichtVerstanden: {}, gefragt: null },
    notieren() {}, sichern() {}, standAnzeigen() {}, sagen() {}, logZeile() {}, standKurz: () => "" };
  try { await WK.werkzeuge.stand_merken(args, k); } catch (e) { return "Fehler: " + e.message; }
  return (k.lauf.profil.zieleAus || []).slice().sort();
};
const gespr = [{ role: "user", content: "nicht nach Lissabon oder Marrakesch" }];
(async () => {
  pruefe("Modell ergaenzt einen Ausschluss",
    await standMerken({ zieleAus: ["marrakesch"] }, { zieleAus: ["lissabon"] }, gespr),
    ["lissabon", "marrakesch"]);
  pruefe("Modell leert den Ausschluss NICHT",
    await standMerken({ zieleAus: [] }, { zieleAus: ["lissabon"] }, gespr),
    ["lissabon"]);

  /* ==================================================================
     2. Nachhaken bei den Wuenschen
     ================================================================== */
  /* Heisst seit dem 19.11.2026 `gewichtung`: Die Wuensche wurden in zwei
     Themen geteilt - was das Haus haben MUSS (ausstattung, gefragt nach
     einer Suche) und worauf in den Bewertungen geachtet wird
     (gewichtung, als letztes Thema). Das Nachhaken, um das es hier geht,
     gehoert zur Gewichtung. */
  const fertigWuensche = (profil, lauf) => {
    try { return !!WK.fahrplan(profil, lauf).fertig.gewichtung; }
    catch (e) { return "Fehler: " + e.message; }
  };
  const basis = { typ: "hotel", monat: 10, naechte: 7, erwachsene: 2, kinder: 0, kriterien: [{ id: "essen" }] };
  pruefe("nach der ersten Antwort noch offen",
    fertigWuensche(basis, { gefragtWie: { gewichtung: 1 }, gespraech: [], besprochen: { gewichtung: true } }), false);
  pruefe("nach der zweiten Antwort noch offen",
    fertigWuensche(basis, { gefragtWie: { gewichtung: 2 }, gespraech: [], besprochen: { gewichtung: true } }), false);
  pruefe("nach der dritten Antwort besprochen",
    fertigWuensche(basis, { gefragtWie: { gewichtung: 3 }, gespraech: [], besprochen: { gewichtung: true } }), true);
  pruefe("Abwinken beendet das Thema sofort",
    fertigWuensche(basis, { wuenscheGenug: true, gefragtWie: { gewichtung: 1 }, gespraech: [], besprochen: { gewichtung: true } }), true);
  // Wer dreimal gefragt wurde und nie etwas genannt hat, bekommt wie
  // bisher die Annahme ("keine besondere Ausstattung") - sonst dreht sich
  // das Gespraech im Kreis. Nur ueber einen GENANNTEN Wunsch geht sie nicht.
  /* `ohneAntwort` steht seit dem 06.11.2026 daneben: Die Annahme haengt
     nicht mehr daran, wie oft gefragt wurde, sondern daran, wie oft keine
     Antwort kam. Gemeint ist hier derselbe Fall wie vorher - dreimal
     gefragt, dreimal nichts genannt. */
  pruefe("ohne jeden Wunsch greift die Annahme",
    fertigWuensche({ ...basis, kriterien: [] }, { gefragtWie: { gewichtung: 3 }, ohneAntwort: { wuensche: 3 }, gespraech: [], besprochen: {}, nichtVerstanden: {} }), true);
  pruefe("'keine besondere Ausstattung' schliesst weiter ab",
    fertigWuensche({ ...basis, kriterien: [], gewichtungEgal: true }, { gefragtWie: {}, gespraech: [], besprochen: {} }), true);

  // Die Annahme nach zwei Fragen darf den genannten Wunsch nicht kippen
  (() => {
    let p2;
    try { p2 = WK.fahrplan({ ...basis }, { gefragtWie: { gewichtung: 2 }, gespraech: [], besprochen: { gewichtung: true }, nichtVerstanden: {} }); }
    catch (e) { pruefe("Annahme kippt den Wunsch nicht", "Fehler: " + e.message, true); return; }
    pruefe("Annahme kippt den Wunsch nicht", !(p2.annahmen || []).some((x) => /ausstattung/i.test(JSON.stringify(x))), true);
  })();

  // Das Abwinkmuster des Kerns
  const winkt = (s) => (KN.WUNSCH_GENUG ? KN.WUNSCH_GENUG.test(s) : "kein Muster");
  pruefe("'nein' ist ein Abwinken", winkt("nein"), true);
  pruefe("'das war's' ist ein Abwinken", winkt("das war's"), true);
  pruefe("'such los' ist ein Abwinken", winkt("such los"), true);
  pruefe("'Pool wäre schön' ist kein Abwinken", winkt("Pool wäre schön"), false);

  // Der Fragesatz selbst: ab der zweiten Runde wird nachgehakt
  const satz = (lauf, p = basis) => { try { return WK.themenSatz("gewichtung", p, lauf); } catch (e) { return "Fehler: " + e.message; } };
  /* Diese Pruefung stand hier falsch (korrigiert am 18.11.2026).
     ------------------------------------------------------------------
     Sie fragte mit `basis` - und in `basis` steht schon ein Kriterium
     (essen). Behauptet wurde also: Obwohl die Person "Essen" genannt
     hat, fragt der Agent offen "Worauf achtest du besonders?". Genau
     das ist der Fehler, der im Lauf vom 18.11.2026 auffiel, und die
     Pruefung hat ihn gedeckt - sie war gruen, weil sie das falsche
     Verhalten als richtig eingetragen hatte.

     Gemeint war: Wer noch nichts genannt hat, bekommt die offene
     Frage. Also wird jetzt ohne Kriterien geprueft, und der Fall mit
     Kriterien steht daneben. */
  const ohneWunsch = { ...basis, kriterien: [] };
  /* Der Satz der ersten Runde heisst seit dem 19.11.2026 anders: Er
     sagt jetzt dazu, dass die Angabe NICHTS ausschliesst, sondern die
     Reihenfolge entscheidet - vorher war das weder gesagt noch wahr. */
  const offeneFrage = /Gibt es da welche|achtest du|achtet ihr/i;
  pruefe("Runde 1 fragt offen, wenn nichts dasteht",
    offeneFrage.test(satz({ gefragtWie: {}, gespraech: [] }, ohneWunsch)), true);
  pruefe("Runde 1 sagt, dass es nichts ausschliesst",
    /schließt keine Häuser aus/.test(satz({ gefragtWie: {}, gespraech: [] }, ohneWunsch)), true);
  pruefe("Runde 1 fragt NICHT offen, wenn schon ein Wunsch dasteht",
    offeneFrage.test(satz({ gefragtWie: {}, gespraech: [] })), false);
  pruefe("Runde 2 hakt nach", /noch etwas ein/i.test(satz({ gefragtWie: { gewichtung: 1 }, gespraech: [] })), true);
  pruefe("Runde 2 nennt den schon genannten Wunsch", /neben/i.test(satz({ gefragtWie: { gewichtung: 1 }, gespraech: [] })), true);
  pruefe("Runde 3 bietet die Suche an", /weitermachen/i.test(satz({ gefragtWie: { gewichtung: 2 }, gespraech: [] })), true);

  /* ==================================================================
     3. Abbruch im Rundgang legt nichts vor
     ================================================================== */
  const rundgang = async () => {
    let vorgelegt = false;
    const ctx2 = {
      lauf: { profil: { typ: "hotel", monat: 10, naechte: 7, erwachsene: 2 },
        rundgang: { ids: ["h01", "h02", "h03", "h04"], i: 2, gesehen: [{ id: "h01" }, { id: "h02" }], zurueck: "x" },
        gespraech: [], ausstehend: null },
      notieren() {}, sichern() {}, sagen() {}, logZeile() {}, sperreAn() {}, sperreAus() {},
      auswahlVorlegen: async () => { vorgelegt = true; return { ergebnis: { vorgelegt: true } }; },
      linkZu: (id, n) => ({ href: "#" + id, name: n }),
    };
    ctx.Zeiger = { abbruch: true, warte: () => Promise.resolve(), anhalten() {}, freigeben() {} };
    ctx.Werkzeuge = { seite: () => "results", zurueckZurListe: async () => {}, unterkunftOeffnen: async () => ({ ok: true }),
      filterSetzen: async () => ({ text: "" }), filterAbdruck: () => "", sortieren: async () => {}, hausPruefen: async () => ({ text: "", daten: {} }) };
    let r;
    try { r = await WK.werkzeuge.haeuser_ansehen({}, ctx2, 2); }
    catch (e) { return { fehler: e.message }; }
    return { vorgelegt, rundgangBleibt: !!ctx2.lauf.rundgang, bei: ctx2.lauf.rundgang?.i ?? null, ergebnis: r?.ergebnis?.angehalten ?? null };
  };
  const r = await rundgang();
  pruefe("Abbruch legt die Auswahl NICHT vor", r.vorgelegt, false);
  pruefe("der Rundgang bleibt stehen, wo er war", { bleibt: r.rundgangBleibt, bei: r.bei }, { bleibt: true, bei: 2 });
  pruefe("das Ergebnis sagt dem Modell, dass angehalten wurde", r.ergebnis, true);

  /* Die Flugklassen-Antwort steht NICHT hier.
     ------------------------------------------------------------------
     Versucht und wieder herausgenommen: `flugKlassenPreise` braucht die
     Flugliste der Seite, und die laesst sich ohne Browser nicht
     nachstellen - der Helfer gab hier immer null zurueck, die Pruefung
     waere also gruen gewesen, ohne etwas zu pruefen. Sie gehoert in die
     Seitenpruefung, wo die Seite wirklich laeuft. */
  console.log(`\n${gut} richtig, ${schlecht} falsch`);
  process.exit(schlecht ? 1 : 0);
})();

