// Tauscht das Titelbild einzelner Objekte gegen ein frisches aus dem Vorrat.
//
//   node bilder/titelbild-tauschen.mjs a229 a238 a348 ...
//   node bilder/titelbild-tauschen.mjs h521=32669068      Bild von Hand setzen
//
// Die Handauswahl ist noetig, wo der Alt-Text nicht reicht: Er unterscheidet
// nicht zwischen "Gebaeude im richtigen Land" und "glaubwuerdige Unterkunft
// an diesem Ort". Fuer ein Kaufmannshaus von 1908 in einem Ort mit 1100
// Einwohnern hat die Automatik dreimal hintereinander einen Glasbau gewaehlt
// - jedes Mal regelkonform. Dann entscheidet das Auge (bilder/PRUEFUNG.md).
//
// Noetig, wenn eine Bildregel nachtraeglich schaerfer wird: Die Objekte sind
// dann schon gebaut, und nur Position 1 muss neu belegt werden. Das alte Bild
// geht in den Vorrat zurueck, damit es nicht verloren ist - aber in diesem Lauf
// nicht wieder vergeben wird.
//
// Danach: node bilder/einbauen.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const POOL = path.join(dir, "pool");
const VORRAT = path.join(POOL, "vorrat.json");
const ZIEL = path.join(dir, "generiert");
const ORTSNAMEN = JSON.parse(fs.readFileSync(path.join(dir, "ortsnamen.json"), "utf8"));

const argumente = process.argv.slice(2);
const handwahl = {};
for (const a of argumente) {
  const m = /^([ha]\d+)=(\d+)$/.exec(a);
  if (m) handwahl[m[1]] = Number(m[2]);
}
const ids = [...argumente.filter((a) => /^[ha]\d+$/.test(a)), ...Object.keys(handwahl)];
if (!ids.length) process.exit(console.error("Keine Objektkennungen angegeben."));

const vorrat = JSON.parse(fs.readFileSync(VORRAT, "utf8"));
const nachId = new Map(vorrat.map((v) => [v.pexels_id, v]));

const katalog = ["../data/hotels.js", "../data/inventory.js"]
  .map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n")
  + "\nmodule.exports = { APARTMENTS, HOTELS };";
const modul = { exports: {} };
new Function("module", katalog)(modul);
const haus = new Map([...modul.exports.APARTMENTS, ...modul.exports.HOTELS].map((o) => [o.id, o]));

// Dieselben Regeln wie in auto-zuordnen-katalog.mjs
const UNPASSEND = ["bridge", "skyline", "cathedral", "temple", "mosque", "museum",
  "stadium", "airport", "train station", "highway", "shopping mall", "office building",
  "skyscraper", "monument", "statue ", "golden pavilion", "monastery", "church",
  "chapel", "basilica", "abbey", "shrine", "pagoda", "palace", "castle", "fortress",
  "city hall", "town hall", "ruins", "archaeolog", "parliament", "opera house",
  "theatre", "theater", "university", "library", "bell tower", "clock tower",
  "gothic", "kyoto tower", "torii", "shrine gate", "japanese gate", "concert hall", "harpa", "lighthouse", "arena", "exhibition",
  "terminal", "power plant", "factory", "warehouse", "greenhouse", "windmill",
  "watermill", "observatory", "planetarium", "aquarium", "zoo ", "reindeer", "seagull", "sea bird"];
const GASTRONOMIE = ["tapas", "restaurant", "cocktail bar", "dining table",
  "table setting", "breakfast buffet"];
const FEIERTAG = ["christmas", "holiday decor", "holiday ornament", "advent",
  "santa", "xmas", "festive"];
const GROSSSTADT = ["megapolis", "downtown", "business cent", "high-rise", "highrise",
  // Ein Glasturm "in a city environment" als Titelbild fuer ein Kaufmannshaus
  // von 1908 in einem Ort mit 1100 Einwohnern - das war der Befund, der diese
  // Woerter hinzugefuegt hat (04.11.2026).
  "city environment", "cityscape", "urban", "metropolis", "city center",
  "city centre", "skyline"];
const STADTZIEL = new Set(["barcelona", "wien", "lissabon", "newyork", "kyoto", "marrakesch", "kapstadt"]);
const BAUWERK = ["building", "house", "facade", "hotel", "chalet", "cabin",
  "guesthouse", "apartment", "villa", "cottage", "architecture", "balcon",
  "roof", "street", "village", "town", "courtyard", "terrace", "window"];

const klein = (v) => (v.alt || "").toLowerCase();
const fremderOrt = (ziel, v) => {
  const erlaubt = new Set(ORTSNAMEN.erlaubt[ziel] || []);
  const text = (v.alt || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
  return (text.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || [])
    .some((w) => ORTSNAMEN.fremd.includes(w) && !erlaubt.has(w));
};

// Fotografen, die in dieser Region schon ein Titelbild stellen - ohne die
// Objekte, die gerade getauscht werden
const titelFotograf = {};
for (const v of vorrat) {
  if (!v.verwendet || !String(v.verwendet).endsWith("/1")) continue;
  if (ids.includes(String(v.verwendet).split("/")[0])) continue;
  (titelFotograf[v.ziel] ||= new Set()).add(v.fotograf || "");
}

const vergeben = new Set();
let getauscht = 0;
for (const id of ids) {
  const w = haus.get(id);
  if (!w) { console.log(`  ${id}: steht nicht im Katalog`); continue; }
  const alt = vorrat.find((v) => String(v.verwendet) === `${id}/1`);
  if (!alt) { console.log(`  ${id}: kein Titelbild aus dem Vorrat`); continue; }

  const genutzt = (titelFotograf[w.ziel] ||= new Set());
  const frei = vorrat.filter((v) => !v.verwendet && v.ziel === w.ziel && v.thema === "ort"
    && !vergeben.has(v.pexels_id)
    && !UNPASSEND.some((x) => klein(v).includes(x))
    && !GASTRONOMIE.some((x) => klein(v).includes(x))
    && !FEIERTAG.some((x) => klein(v).includes(x))
    && !(!STADTZIEL.has(w.ziel) && GROSSSTADT.some((x) => klein(v).includes(x)))
    && !fremderOrt(w.ziel, v)
    && !genutzt.has(v.fotograf || ""))
    .sort((a, b) => a.pexels_id - b.pexels_id);
  const vonHand = handwahl[id] ? nachId.get(handwahl[id]) : null;
  if (handwahl[id] && !vonHand) { console.log(`  ${id}: Bild ${handwahl[id]} steht nicht im Vorrat`); continue; }
  if (vonHand && vonHand.verwendet) { console.log(`  ${id}: Bild ${handwahl[id]} haengt schon an ${vonHand.verwendet}`); continue; }
  if (vonHand && vonHand.ziel !== w.ziel) { console.log(`  ${id}: Bild ${handwahl[id]} gehoert zu ${vonHand.ziel}`); continue; }
  const neu = vonHand
    ?? (frei.find((v) => BAUWERK.some((x) => klein(v).includes(x))) ?? frei[0]);
  if (!neu) { console.log(`  ${id}: kein passendes Bild mehr frei (${w.ziel})`); continue; }

  const ordner = path.join(ZIEL, String(alt.verwendet).startsWith("h") ? "hotels" : "wohnungen");
  // Den tatsaechlichen Ordner suchen, der Name traegt die Kennung vorne
  const unter = fs.readdirSync(ordner).find((n) => n.split("-")[0] === id);
  if (!unter) { console.log(`  ${id}: Bildordner nicht gefunden`); continue; }
  fs.copyFileSync(path.join(POOL, neu.datei), path.join(ordner, unter, "1.jpg"));

  alt.verwendet = null;
  neu.verwendet = `${id}/1`;
  genutzt.add(neu.fotograf || "");
  vergeben.add(neu.pexels_id);
  getauscht += 1;
  console.log(`  ${id}: ${alt.pexels_id} -> ${neu.pexels_id}  ${(neu.alt || "").slice(0, 70)}`);
}

fs.writeFileSync(VORRAT, JSON.stringify(vorrat, null, 2));
console.log(`\n${getauscht} Titelbilder getauscht. Jetzt: node bilder/einbauen.mjs`);
