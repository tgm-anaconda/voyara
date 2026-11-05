/* Vollstaendigkeit des Katalogs.
 *
 *   node agent/katalog-test.cjs         der jetzige Stand, erwartet 0 falsch
 *   node agent/katalog-test.cjs --alt   Gegenprobe gegen den letzten Commit
 *                                       (git show HEAD:data/hotels.js)
 *
 * Anlass, 05.11.2026: Auf der Karte von "Nova Icària Beachhotel" stand
 *
 *     ★★★★☆ · undefined
 *
 * Fuenf Haeuser aus dem Katalogausbau vom 04.11. trugen das Feld
 * `kategorie` statt `category` - ein deutscher Schluessel in einem
 * Datensatz, der sonst englisch heisst. Die Seite las `item.category`,
 * fand nichts und schrieb das Ergebnis hin. Dieselben fuenf hatten
 * keinen `distanceToAirport`.
 *
 * Der Fehler ist nicht aufgefallen, weil nichts danach gefragt hat:
 * Kernpruefung und Seitenpruefung rechnen mit dem Katalog, pruefen ihn
 * aber nicht. 534 Hotels und 370 Wohnungen von Hand durchzusehen ist
 * keine Pruefung, sondern eine Hoffnung.
 *
 * Verfahren: Welche Felder PFLICHT sind, wird nicht hier festgelegt,
 * sondern aus dem Bestand gelesen - was 95 Prozent der Objekte haben,
 * gehoert dazu. So waechst die Pruefung mit dem Katalog mit, statt eine
 * zweite Wahrheit daneben zu stellen, die altert.
 */
const fs = require("fs"), vm = require("vm"), { execSync } = require("child_process");
const B = "/Users/tom-gabrielmielicki/Desktop/Bachelor Arbeit/Website/";
const alt = process.argv.includes("--alt");

const lies = (datei) => (alt && datei === "data/hotels.js"
  ? execSync(`git -C "${B}" show HEAD:data/hotels.js`, { maxBuffer: 1 << 28 }).toString()
  : fs.readFileSync(B + datei, "utf8"));

const ctx = { console, module: {}, window: {} };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ["data/ziele.js", "data/hotels.js", "data/inventory.js"]) {
  try { vm.runInContext(lies(f), ctx, { filename: f }); }
  catch (e) { console.log("LADEFEHLER", f, e.message.slice(0, 160)); process.exit(2); }
}
vm.runInContext("this.H=typeof HOTELS!=='undefined'?HOTELS:[];"
  + "this.A=typeof APARTMENTS!=='undefined'?APARTMENTS:[];"
  + "this.KL=typeof CATEGORY_LABELS!=='undefined'?CATEGORY_LABELS:{};"
  + "this.BL=typeof BOARD_LABELS!=='undefined'?BOARD_LABELS:{};"
  + "this.ZL=typeof ZIEL_NACH_ID!=='undefined'?ZIEL_NACH_ID:{};", ctx);
const { H, A, KL, BL, ZL } = ctx;

let gut = 0, schlecht = 0;
const pruefe = (name, ist, soll) => {
  const a = JSON.stringify(ist), b = JSON.stringify(soll);
  if (a === b) gut++;
  else { schlecht++; console.log(`  FEHLT: ${name}\n    ist  ${a}\n    soll ${b}`); }
};
console.log(alt ? "GEGENPROBE gegen HEAD:data/hotels.js" : "NEUER Stand");
pruefe("Hotels geladen", H.length > 500, true);
pruefe("Wohnungen geladen", A.length > 300, true);

/* ====================================================================
   1. Kein Pflichtfeld fehlt
   ==================================================================== */
/* Gezaehlt wird, wo ein Feld einen WERT hat, nicht wo der Schluessel
   steht. `distanceToBeach` traegt jedes Haus, aber nur 298 von 534
   haben eine Zahl darin - Haeuser im Binnenland haben keinen Strand,
   und das ist richtig so. Nach Schluesseln gezaehlt waere das Feld
   Pflicht gewesen und die Pruefung haette 236 Fehlalarme gemeldet. */
const pflichtfelder = (liste) => {
  const wieOft = {};
  for (const x of liste) {
    for (const [k, v] of Object.entries(x)) {
      if (v !== undefined && v !== null && v !== "") wieOft[k] = (wieOft[k] || 0) + 1;
    }
  }
  return Object.keys(wieOft).filter((k) => wieOft[k] >= liste.length * 0.95);
};
const luecken = (liste) => {
  const raus = {};
  for (const x of liste) {
    for (const k of pflichtfelder(liste)) {
      if (x[k] === undefined || x[k] === null || x[k] === "") (raus[k] ||= []).push(x.id);
    }
  }
  return raus;
};
for (const [name, liste] of [["Hotels", H], ["Wohnungen", A]]) {
  const l = luecken(liste);
  const text = Object.entries(l).map(([k, ids]) => `${k} bei ${ids.length} (${ids.slice(0, 6).join(" ")})`);
  pruefe(`${name}: kein Pflichtfeld fehlt`, text, []);
}

/* ====================================================================
   2. Kein deutscher Schluessel in einem englischen Datensatz
   ==================================================================== */
/* Genau der Fehler vom 04.11.: `kategorie` neben lauter englischen
   Feldern.

   "Ein seltenes Feld ist verdaechtig" waere zu grob - `image`,
   `gallery`, `oldPrice` und `reviews` sind selten und voellig in
   Ordnung. Gesucht wird stattdessen die SIGNATUR eines Tippfehlers:
   ein seltenes Feld, und ausgerechnet die Objekte, die es tragen,
   vermissen ein Pflichtfeld. Das trifft `kategorie` (5 Objekte, und
   genau diese 5 ohne `category`) und laesst die anderen in Ruhe. */
const seltene = (liste, name) => {
  const pflicht = pflichtfelder(liste);
  const wieOft = {};
  for (const x of liste) for (const k of Object.keys(x)) wieOft[k] = (wieOft[k] || 0) + 1;
  const verdaechtig = [];
  for (const [k, n] of Object.entries(wieOft)) {
    if (n === 0 || n >= liste.length * 0.05 || pflicht.includes(k)) continue;
    const traeger = liste.filter((x) => x[k] !== undefined);
    const luecke = pflicht.find((pf) => traeger.every((x) => x[pf] === undefined || x[pf] === null));
    if (luecke) verdaechtig.push(`${k} (nur ${n}x, und genau denen fehlt ${luecke})`);
  }
  pruefe(`${name}: kein Feld sieht aus wie ein vertippter Schluessel`, verdaechtig, []);
};
seltene(H, "Hotels");
seltene(A, "Wohnungen");

/* ====================================================================
   3. Jeder Schluessel findet sein Etikett
   ==================================================================== */
/* Das ist die Stelle, an der "undefined" auf der Karte stand: Die Seite
   schreibt CATEGORY_LABELS[item.category] hin, ohne nachzusehen. */
const ohneEtikett = (liste, feld, tabelle, name) => {
  const fehlt = [...new Set(liste.map((x) => x[feld]).filter((v) => v != null && !(v in tabelle)))];
  pruefe(`${name}: jedes ${feld} hat ein Etikett`, fehlt, []);
};
ohneEtikett(H, "category", KL, "Hotels");
ohneEtikett(H, "ziel", ZL, "Hotels");
ohneEtikett(A, "ziel", ZL, "Wohnungen");
/* Verpflegung steht als Liste von { key, priceDelta } - `Object.keys`
   darauf liefert die Indizes 0 bis 4 und haette fuenf Fehlalarme
   gemeldet. Gelesen wird der `key`. */
const boardsOhne = [...new Set(H.flatMap((h) => (h.boards || []).map((b) => b.key))
  .filter((b) => b != null && !(b in BL)))];
pruefe("Hotels: jede Verpflegung hat ein Etikett", boardsOhne, []);

/* ====================================================================
   4. Was die Karten wirklich hinschreiben
   ==================================================================== */
/* Die Probe aufs Exempel: dieselbe Zeile wie in results.js, ueber den
   ganzen Katalog. Steht irgendwo "undefined" oder "NaN", faellt es hier
   auf und nicht erst der Person im Versuch. */
const sternzeile = (h) => `${"★".repeat(h.stars || 0)} · ${KL[h.category]}`;
const kaputt = H.filter((h) => /undefined|NaN|null/.test(sternzeile(h))).map((h) => h.id);
pruefe("Keine Karte schreibt undefined in die Sternzeile", kaputt.slice(0, 8), []);

/* ====================================================================
   5. Eindeutige Kennungen
   ==================================================================== */
const doppelt = (liste, name) => {
  const gesehen = new Set(), raus = [];
  for (const x of liste) { if (gesehen.has(x.id)) raus.push(x.id); gesehen.add(x.id); }
  pruefe(`${name}: keine doppelte id`, raus, []);
};
doppelt(H, "Hotels");
doppelt(A, "Wohnungen");
pruefe("Hotels und Wohnungen teilen keine id",
  H.map((h) => h.id).filter((id) => A.some((a) => a.id === id)), []);

console.log(`\n${gut} richtig, ${schlecht} falsch`);
process.exit(schlecht ? 1 : 0);
