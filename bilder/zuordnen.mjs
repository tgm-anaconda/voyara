// Ordnet Bilder aus dem Vorrat einem Katalogobjekt zu.
//
//   node bilder/zuordnen.mjs zuordnung.json
//
// Die Zuordnungsdatei listet je Objekt die Pexels-IDs in Anzeigereihenfolge.
// Position 2 bleibt bei Hotels frei - dort kommt die KI-Aussenansicht hin.
//
//   { "h27": { "ordner": "hotels/h27-thalassa-bay", "bilder": {"1": 34762303, "3": 10923534} } }

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const POOL = path.join(dir, "pool");
const ZIEL = path.join(dir, "generiert");
const VORRAT = path.join(POOL, "vorrat.json");

const datei = process.argv[2];
if (!datei) process.exit(console.error("Zuordnungsdatei fehlt"));

const vorrat = JSON.parse(fs.readFileSync(VORRAT, "utf8"));
const nachId = Object.fromEntries(vorrat.map((v) => [String(v.pexels_id), v]));
const zuordnung = JSON.parse(fs.readFileSync(path.resolve(datei), "utf8"));

let kopiert = 0, fehlend = [];
for (const [objektId, eintrag] of Object.entries(zuordnung)) {
  const ordner = path.join(ZIEL, eintrag.ordner);
  fs.mkdirSync(ordner, { recursive: true });
  for (const [position, pexelsId] of Object.entries(eintrag.bilder)) {
    const quelle = nachId[String(pexelsId)];
    if (!quelle) { fehlend.push(`${objektId}/${position}: ${pexelsId} nicht im Vorrat`); continue; }
    const von = path.join(POOL, quelle.datei);
    if (!fs.existsSync(von)) { fehlend.push(`${objektId}/${position}: Datei fehlt`); continue; }
    fs.copyFileSync(von, path.join(ordner, `${position}.jpg`));
    quelle.verwendet = `${objektId}/${position}`;
    kopiert++;
  }
  console.log(`  ${objektId} → ${eintrag.ordner} (${Object.keys(eintrag.bilder).length} Bilder)`);
}

fs.writeFileSync(VORRAT, JSON.stringify(vorrat, null, 2));
console.log(`\n${kopiert} Bilder zugeordnet.`);
if (fehlend.length) console.log("Nicht gefunden:\n  " + fehlend.join("\n  "));
