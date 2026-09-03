// Zeigt je Objekt, welche Bilder vorliegen und woher sie kommen.
//   node bilder/stand.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const ZIEL = path.join(dir, "generiert");

const ordner = JSON.parse(fs.readFileSync(path.join(dir, "ordner.json"), "utf8"));
const kiListe = new Set(JSON.parse(fs.readFileSync(path.join(dir, "prompts.json"), "utf8")).map((p) => p.file));
const stockListe = new Set(JSON.parse(fs.readFileSync(path.join(dir, "stock-bedarf.json"), "utf8")).map((s) => s.file));

let kiFertig = 0, kiGesamt = 0, stockFertig = 0, stockGesamt = 0;

console.log("Zeichen:  K = KI nötig   S = Stock   ● = vorhanden   ○ = fehlt\n");

for (const o of ordner) {
  const zellen = [];
  for (let i = 1; i <= o.bilder; i++) {
    const datei = `${o.ordner}/${i}.png`;
    const daIst = fs.existsSync(path.join(ZIEL, datei));
    const istKi = kiListe.has(datei);

    if (istKi) { kiGesamt++; if (daIst) kiFertig++; }
    else if (stockListe.has(datei)) { stockGesamt++; if (daIst) stockFertig++; }

    zellen.push(`${istKi ? "K" : "S"}${daIst ? "●" : "○"}`);
  }
  const fehlt = zellen.filter((z) => z.endsWith("○")).length;
  const markierung = fehlt === 0 ? "✓" : " ";
  console.log(`${markierung} ${o.ordner.padEnd(34)} ${zellen.join(" ")}`);
}

// Regionen und Startseite haben keinen eigenen Ordner
const einzeln = [...stockListe].filter((f) => f.startsWith("regionen/") || f.startsWith("hero/"));
const einzelnDa = einzeln.filter((f) => fs.existsSync(path.join(ZIEL, f)));
stockGesamt += einzeln.length;
stockFertig += einzelnDa.length;

console.log(`\n  regionen + hero                    ${einzelnDa.length} von ${einzeln.length} vorhanden`);
console.log(`\nKI    : ${kiFertig} von ${kiGesamt}`);
console.log(`Stock : ${stockFertig} von ${stockGesamt}`);
console.log(`Gesamt: ${kiFertig + stockFertig} von ${kiGesamt + stockGesamt}`);
