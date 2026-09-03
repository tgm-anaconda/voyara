// Baut aus der Bildregie (art-direction.js) die fertige Prompt-Liste.
// Ausgabe: prompts.json (maschinenlesbar) und prompts.md (zum Reinkopieren).
//
// Aufruf:  node bilder/generate-prompts.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  STYLE, NEGATIVE, HOTEL_ART, APARTMENT_ART, CAR_ART, REGION_ART, HERO_ART,
} from "./art-direction.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");

// Namen aus den echten Datendateien ziehen, damit Prompt und Objekt zusammenpassen
function loadData() {
  const src = fs.readFileSync(path.join(root, "data/hotels.js"), "utf8")
    + fs.readFileSync(path.join(root, "data/inventory.js"), "utf8");
  const globals = {};
  const patched = src.replace(
    /const (HOTELS|APARTMENTS|CARS|FLIGHTS|AMENITY_LABELS|CATEGORY_LABELS|BOARD_LABELS|APARTMENT_BREAKDOWN_LABELS)/g,
    "globalThis.$1"
  );
  new Function("module", patched)({ exports: {} });
  return {
    hotels: globalThis.HOTELS,
    apartments: globalThis.APARTMENTS,
    cars: globalThis.CARS,
  };
}

const { hotels, apartments, cars } = loadData();
const prompts = [];   // per KI zu erzeugen
const stock = [];     // ueber Pexels zu beschaffen

// Aus "Casa Lumara" wird "casa-lumara" — der Ordnername bleibt so im Finder lesbar
function slug(text) {
  return text.toLowerCase()
    .replaceAll("ä", "ae").replaceAll("ö", "oe").replaceAll("ü", "ue").replaceAll("ß", "ss")
    .replaceAll("á", "a").replaceAll("é", "e").replaceAll("í", "i").replaceAll("ó", "o").replaceAll("ú", "u")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Ein Ordner je Objekt: hotels/h01-casa-lumara/1.png
function ordner(bereich, id, name) {
  return `${bereich}/${id}-${slug(name)}`;
}

function add(file, subject, context) {
  prompts.push({
    file,                                   // Zieldateiname, exakt so speichern
    prompt: `${subject}. ${context}. ${STYLE}. ${NEGATIVE}.`,
  });
}

// Ordnet eine Bildbeschreibung einer Pexels-Kategorie zu, damit die
// Stock-Pipeline weiss, wonach sie suchen soll.
function kategorie(text) {
  const t = text.toLowerCase();
  if (/\b(bath|shower|hammam|spa)\b/.test(t)) return "bad";
  if (/\b(pool|infinity)\b/.test(t)) return "pool";
  if (/\b(room|bedroom|bed|living|studio|loft|apartment interior)\b/.test(t)) return "zimmer";
  if (/\b(lobby|reception|restaurant|buffet|breakfast|dining|bar|kitchen)\b/.test(t)) return "lobby";
  return "aussen";
}

// Aus der DNA die stilpraegenden Adjektive ziehen — ohne die sucht die
// Stock-Pipeline blind und liefert fuer ein helles Strandhotel dunkle
// Kolonialzimmer, weil sie den Charakter des Hauses nicht kennt.
function stilhinweis(dna) {
  if (!dna) return "";
  const stil = dna.match(/\b(bright|white|blue|warm|rustic|natural|stone|wooden|modern|minimal|elegant|marble|rugged|functional|sustainable|refined)\b/gi);
  return stil ? [...new Set(stil.map((s) => s.toLowerCase()))].slice(0, 4).join(" ") : "";
}

function addStock(file, subject, ort, stil = "") {
  stock.push({ file, kategorie: kategorie(subject), motiv: subject, ort, stil });
}

// Ordnerzuordnung mitschreiben, damit der Website-Code sie uebernehmen kann
const zuordnung = [];

// Hotels — nur die in "ki" markierten Aufnahmen werden generiert
hotels.forEach((h) => {
  const art = HOTEL_ART[h.id];
  if (!art) return;
  const dir = ordner("hotels", h.id, h.name);
  const kiSet = new Set(art.ki || []);
  zuordnung.push({ id: h.id, name: h.name, typ: "hotel", ordner: dir, bilder: art.shots.length });

  art.shots.forEach((shot, i) => {
    const file = `${dir}/${i + 1}.png`;
    if (kiSet.has(i + 1)) add(file, shot, `Setting: ${art.dna}, on Mallorca, Spain`);
    else addStock(file, shot, h.location, stilhinweis(art.dna));
  });
});

// Ferienwohnungen
apartments.forEach((a) => {
  const art = APARTMENT_ART[a.id];
  if (!art) return;
  const dir = ordner("wohnungen", a.id, a.name);
  const kiSet = new Set(art.ki || []);
  zuordnung.push({ id: a.id, name: a.name, typ: "apartment", ordner: dir, bilder: art.shots.length });

  art.shots.forEach((shot, i) => {
    const file = `${dir}/${i + 1}.png`;
    if (kiSet.has(i + 1)) add(file, shot, `Setting: ${art.dna}, on Mallorca, Spain`);
    else addStock(file, shot, a.location, stilhinweis(art.dna));
  });
});

// Mietwagen — komplett ueber Stock. Echte Fahrzeugfotos sind hier sogar
// passender, weil der Katalog reale Modelle nennt (wie bei Mietwagenportalen ueblich).
cars.forEach((c) => {
  if (!CAR_ART[c.id]) return;
  const dir = ordner("mietwagen", c.id, c.model);
  zuordnung.push({ id: c.id, name: c.model, typ: "car", ordner: dir, bilder: 1 });
  addStock(`${dir}/1.png`, `${c.model}, ${c.category}, rental car exterior`, "Mallorca");
});

// Regionen — komplett ueber Stock, hier liefert Pexels echte Ortsaufnahmen
Object.entries(REGION_ART).forEach(([region, shot]) => {
  addStock(`regionen/${slug(region)}.png`, shot, region);
});

// Startseite — ebenfalls Stock
Object.entries(HERO_ART).forEach(([key, shot]) => {
  addStock(`hero/${key}.png`, shot, "Mallorca");
});

// --- Ausgabe ------------------------------------------------------------
fs.writeFileSync(path.join(dir, "prompts.json"), JSON.stringify(prompts, null, 2), "utf8");

const md = [
  "# Bild-Prompts für Voyara",
  "",
  `Insgesamt **${prompts.length} Bilder**. Jede Zeile: Zieldatei + Prompt.`,
  "Die Datei-Namen bitte exakt so übernehmen — der Code erwartet genau diese Pfade.",
  "",
  "| # | Datei | Prompt |",
  "|---|-------|--------|",
  ...prompts.map((p, i) => `| ${i + 1} | \`${p.file}\` | ${p.prompt.replace(/\|/g, "/")} |`),
].join("\n");
fs.writeFileSync(path.join(dir, "prompts.md"), md, "utf8");

fs.writeFileSync(path.join(dir, "stock-bedarf.json"), JSON.stringify(stock, null, 2), "utf8");
fs.writeFileSync(path.join(dir, "ordner.json"), JSON.stringify(zuordnung, null, 2), "utf8");

const zaehl = (list) => list.reduce((acc, p) => {
  const f = p.file.split("/")[0];
  acc[f] = (acc[f] || 0) + 1;
  return acc;
}, {});

const gesamt = prompts.length + stock.length;
console.log(`Gesamt ${gesamt} Bilder.`);
console.log(`  KI zu erzeugen : ${prompts.length}`, zaehl(prompts));
console.log(`  ueber Stock    : ${stock.length}`, zaehl(stock));
console.log(`\nErsparnis gegenueber "alles per KI": ${gesamt - prompts.length} Bilder (${Math.round((1 - prompts.length / gesamt) * 100)} %).`);
