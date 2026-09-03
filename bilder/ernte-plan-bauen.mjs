// Baut den Ernteplan aus data/ziele.js.
// Je Ziel fuenf Themen, je Thema mehrere Suchanfragen - Pexels antwortet auf
// den einen Begriff mal gut und mal gar nicht, deshalb immer Alternativen.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");

const src = fs.readFileSync(path.join(root, "data/ziele.js"), "utf8")
  .replace(/const (ZIELE|ZIEL_NACH_ID|TYP_LABELS)/g, "globalThis.$1");
new Function("module", src)({ exports: {} });
const ZIELE = globalThis.ZIELE;

// Themen je Zieltyp. "aussen" und "umgebung" tragen den Ortsbezug,
// die uebrigen drei sind Innenaufnahmen und funktionieren ueberall.
const THEMEN = {
  strand: ["ort", "zimmer", "pool", "umgebung", "essen", "wohnen", "kueche"],
  stadt:  ["ort", "zimmer", "lobby", "umgebung", "essen", "wohnen", "kueche"],
  berge:  ["ort", "zimmer", "wellness", "umgebung", "essen", "wohnen", "kueche"],
  natur:  ["ort", "zimmer", "wellness", "umgebung", "essen", "wohnen", "kueche"],
};

// Suchanfragen je Ziel und Thema. Ort und Kulturraum stehen im Begriff -
// ohne das liefert Pexels zuverlaessig die nordeuropaeische Lesart.
const ORT = {
  mallorca:  { land: "Mallorca Spain", stil: "mediterranean" },
  kreta:     { land: "Crete Greece", stil: "greek island whitewashed" },
  algarve:   { land: "Algarve Portugal", stil: "portuguese coastal" },
  sardinien: { land: "Sardinia Italy", stil: "italian coastal" },
  teneriffa: { land: "Tenerife Canary Islands", stil: "canary volcanic" },
  barcelona: { land: "Barcelona Spain", stil: "catalan city" },
  wien:      { land: "Vienna Austria", stil: "viennese classic" },
  lissabon:  { land: "Lisbon Portugal", stil: "portuguese azulejo" },
  tirol:     { land: "Tyrol Austria alps", stil: "alpine chalet wood" },
  suedtirol: { land: "South Tyrol Dolomites Italy", stil: "alpine wood stone" },
  lappland:  { land: "Lapland Finland arctic", stil: "nordic cabin snow" },
  ostsee:    { land: "Baltic Sea Germany Ruegen", stil: "north german seaside" },
  marrakesch:{ land: "Marrakesh Morocco", stil: "moroccan riad ochre" },
  kapstadt:  { land: "Cape Town South Africa", stil: "cape dutch white gable" },
  krabi:     { land: "Krabi Thailand", stil: "thai teak tropical" },
  island:    { land: "Iceland", stil: "icelandic black timber turf" },
  newyork:   { land: "New York City", stil: "new york brownstone brick" },
  kyoto:     { land: "Kyoto Japan", stil: "japanese machiya timber" },
};

const VORLAGEN = {
  ort: (o, z) => [
    `${o.land} hotel exterior building`,
    `${o.stil} hotel facade architecture`,
    z.typ === "berge" ? `alpine hotel chalet exterior ${o.land}` :
    z.typ === "stadt" ? `historic townhouse facade ${o.land}` :
    z.typ === "natur" ? `wooden cabin exterior ${o.land}` :
                        `beachfront hotel building ${o.land}`,
  ],
  zimmer: (o, z) => [
    `${o.stil} hotel room interior bed`,
    z.typ === "berge" || z.typ === "natur"
      ? "cosy wooden alpine hotel bedroom interior"
      : "bright hotel bedroom interior window",
    "hotel suite interior design bed",
  ],
  pool: (o) => [
    `${o.land} hotel swimming pool`,
    "outdoor hotel pool sun loungers palm",
    "infinity pool terrace sea view",
  ],
  lobby: (o) => [
    `${o.stil} hotel lobby interior`,
    "boutique hotel lounge interior armchair",
    "hotel reception interior design",
  ],
  wellness: () => [
    "hotel spa sauna wooden interior",
    "wellness area indoor pool hotel",
    "spa relaxation room loungers",
  ],
  umgebung: (o, z) => [
    `${o.land} landscape`,
    z.typ === "berge" ? `${o.land} mountains snow winter` :
    z.typ === "stadt" ? `${o.land} old town street architecture` :
    z.typ === "natur" ? `${o.land} northern lights forest` :
                        `${o.land} beach coast`,
    `${o.land} scenic view`,
  ],
  essen: (o) => [
    `${o.land} food restaurant table`,
    "hotel breakfast buffet table",
    "restaurant interior dining table candle",
  ],
  // Wohnraeume fuer Ferienwohnungen - ein Hotelzimmer sieht anders aus als
  // ein Wohnzimmer mit Sofa und Esstisch
  wohnen: (o, z) => [
    z.typ === "berge" || z.typ === "natur"
      ? "cosy wooden living room fireplace cabin interior"
      : "bright holiday apartment living room sofa interior",
    "open plan living dining room apartment interior",
    "living room with sofa and coffee table daylight",
  ],
  kueche: () => [
    "modern apartment kitchen interior",
    "holiday home kitchen dining table interior",
    "kitchen counter interior daylight",
  ],
};

const eintraege = [];
for (const z of ZIELE) {
  const o = ORT[z.id];
  if (!o) { console.warn("Kein Ortsprofil fuer", z.id); continue; }
  for (const thema of THEMEN[z.typ]) {
    eintraege.push({ ziel: z.id, thema, queries: VORLAGEN[thema](o, z) });
  }
}

fs.writeFileSync(path.join(dir, "ernte-plan.json"),
  JSON.stringify({ stand: new Date().toISOString().slice(0, 10), eintraege }, null, 2), "utf8");

console.log(`Ernteplan: ${ZIELE.length} Ziele, ${eintraege.length} Kombinationen.`);
const proTyp = {};
ZIELE.forEach((z) => { proTyp[z.typ] = (proTyp[z.typ] || 0) + 1; });
console.log("Zieltypen:", proTyp);
