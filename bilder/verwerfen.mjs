// Sortiert Bilder aus und sperrt sie dauerhaft.
//
//   node bilder/verwerfen.mjs hotels/h02-hotel-arenal-blau/2.png "Nacht statt Mittag"
//   node bilder/verwerfen.mjs --alle-offenen "Sammelverwurf"
//
// Loescht die Datei, nimmt sie aus dem Manifest und schreibt die Pexels-ID in
// verworfen.json. Dadurch waehlt stock-holen.py beim naechsten Lauf ein anderes
// Foto — ohne diese Sperre kam dieselbe Aufnahme immer wieder zurueck.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const ZIEL = path.join(dir, "generiert");
const MANIFEST = path.join(ZIEL, "bildquellen.json");
const VERWORFEN = path.join(dir, "verworfen.json");

const args = process.argv.slice(2);
if (!args.length) {
  console.log(`Aufruf:
  node bilder/verwerfen.mjs <datei> ["Grund"]
  node bilder/verwerfen.mjs --alle-offenen ["Grund"]   alle noch ungeprueften`);
  process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const verworfen = fs.existsSync(VERWORFEN) ? JSON.parse(fs.readFileSync(VERWORFEN, "utf8")) : [];

const alleOffenen = args[0] === "--alle-offenen";
const grund = (alleOffenen ? args[1] : args[1]) || "ohne Angabe";
const ziele = alleOffenen
  ? manifest.filter((m) => !m.geprueft).map((m) => m.datei)
  : [args[0]];

let raus = 0;
for (const datei of ziele) {
  const eintrag = manifest.find((m) => m.datei === datei);
  if (!eintrag) { console.warn(`  ? ${datei} steht nicht im Manifest`); continue; }

  const pfad = path.join(ZIEL, datei);
  if (fs.existsSync(pfad)) fs.unlinkSync(pfad);

  verworfen.push({
    pexels_id: eintrag.pexels_id,
    datei,
    grund,
    alt: eintrag.alt,
    am: new Date().toISOString().slice(0, 10),
  });
  raus++;
  console.log(`  verworfen: ${datei}  (${grund})`);
}

const bleibt = manifest.filter((m) => !ziele.includes(m.datei));
bleibt.forEach((m) => { m.geprueft = true; });

fs.writeFileSync(MANIFEST, JSON.stringify(bleibt, null, 2), "utf8");
fs.writeFileSync(VERWORFEN, JSON.stringify(verworfen, null, 2), "utf8");

console.log(`\n${raus} aussortiert und dauerhaft gesperrt.`);
console.log(`Im Bestand: ${bleibt.length} geprüfte Bilder.`);
console.log(`Gesperrt insgesamt: ${verworfen.length}`);
