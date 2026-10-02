/* Ordnet den Haeusern vom 02.10.2026 Bilder aus dem Vorrat zu.
 *
 * Diese Haeuser sind entstanden, weil der Katalog im Winter zu duenn war
 * (im Dezember blieb ein einziges Haus im Vergleichsset uebrig). Sie haben
 * KEINE KI-Aussenansicht - die gibt es nur fuer die Haeuser der ersten
 * Runden. Position 2 traegt deshalb ein zweites Stockbild, und die ids
 * stehen in einbauen.mjs in TITEL_BLEIBT_EINS: Titelbild bleibt der Ort.
 *
 *   node bilder/vorrat-neue-haeuser.mjs          (nur anzeigen)
 *   node bilder/vorrat-neue-haeuser.mjs --tun    (kopieren und eintragen)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");
const VORRAT = path.join(dir, "pool/vorrat.json");
const tun = process.argv.includes("--tun");

const slug = (t) => t.toLowerCase()
  .replaceAll("ä", "ae").replaceAll("ö", "oe").replaceAll("ü", "ue").replaceAll("ß", "ss")
  .replaceAll("á", "a").replaceAll("é", "e").replaceAll("í", "i").replaceAll("ó", "o").replaceAll("ú", "u")
  .replaceAll("à", "a").replaceAll("è", "e").replaceAll("ò", "o").replaceAll("ç", "c").replaceAll("ñ", "n")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Die Haeuser aus dem Katalog lesen, ohne den Browser
const quelle = fs.readFileSync(path.join(root, "data/hotels.js"), "utf8");
const neue = [];
for (const m of quelle.matchAll(/id: "(h(?:1[89]\d|2[01]\d))",\s*\n\s*ziel: "([a-z]+)",\s*\n\s*name: "([^"]+)"/g)) {
  const n = Number(m[1].slice(1));
  if (n >= 185 && n <= 218) neue.push({ id: m[1], ziel: m[2], name: m[3] });
}

const vorrat = JSON.parse(fs.readFileSync(VORRAT, "utf8"));
const frei = {};
for (const v of vorrat) {
  if (v.verwendet) continue;
  ((frei[v.ziel] ||= {})[v.thema] ||= []).push(v);
}
for (const z of Object.keys(frei)) {
  for (const t of Object.keys(frei[z])) frei[z][t].sort((a, b) => a.pexels_id - b.pexels_id);
}

// Position 2 und 3: was das Ziel hergibt, Umgebung zuletzt
const MITTE = ["pool", "lobby", "wellness", "umgebung"];

const plan = [];
const fehlt = [];
for (const h of neue) {
  const f = frei[h.ziel] || {};
  const nimm = (thema) => (f[thema] || []).shift() || null;
  const bilder = {};
  bilder["1"] = nimm("ort");
  for (const pos of ["2", "3"]) {
    for (const t of MITTE) { const b = nimm(t); if (b) { bilder[pos] = b; break; } }
  }
  bilder["4"] = nimm("zimmer");
  bilder["5"] = nimm("essen");
  const ordner = `hotels/${h.id}-${slug(h.name)}`;
  const da = Object.entries(bilder).filter(([, b]) => b);
  if (da.length < 4) fehlt.push(`${h.id} (${da.length} Bilder)`);
  plan.push({ ...h, ordner, bilder: Object.fromEntries(da) });
}

console.log(`${plan.length} Haeuser, Bilder je Haus: ${plan.map((p) => Object.keys(p.bilder).length).join(",")}`);
if (fehlt.length) console.log("Zu wenig Vorrat:", fehlt.join(", "));
if (!tun) { console.log("\nNur Vorschau. Mit --tun wird kopiert."); process.exit(0); }

let kopiert = 0;
for (const p of plan) {
  const ziel = path.join(dir, "generiert", p.ordner);
  fs.mkdirSync(ziel, { recursive: true });
  for (const [pos, b] of Object.entries(p.bilder)) {
    const von = path.join(dir, "pool", b.datei);
    if (!fs.existsSync(von)) { console.log(`FEHLT: ${von}`); continue; }
    fs.copyFileSync(von, path.join(ziel, `${pos}.jpg`));
    b.verwendet = `${p.id}/${pos}`;
    kopiert++;
  }
}
fs.writeFileSync(VORRAT, JSON.stringify(vorrat, null, 1));
console.log(`${kopiert} Bilder kopiert, Vorrat aktualisiert.`);
console.log("Jetzt: node bilder/einbauen.mjs");
