// Baut einen Kontaktbogen aller geholten Stock-Bilder zum Durchsehen.
// Zweck: Marken, erkennbare Gebaeude, Personen und offensichtliche Fehlgriffe
// finden, bevor die Bilder in die Website wandern.
//
//   node bilder/pruefen.mjs           Kontaktbogen bauen
//   node bilder/pruefen.mjs --offen   nur die noch ungeprueften
//
// Aussortieren: Bilddatei aus generiert/ loeschen, dann stock-holen.py erneut
// laufen lassen — es holt nur, was fehlt, und nimmt ein anderes Foto.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const ZIEL = path.join(dir, "generiert");
const MANIFEST = path.join(ZIEL, "bildquellen.json");

if (!fs.existsSync(MANIFEST)) {
  console.error("Noch keine Bilder geholt (bildquellen.json fehlt).");
  console.error("Zuerst:  python3 bilder/stock-holen.py");
  process.exit(1);
}

const nurOffen = process.argv.includes("--offen");
let eintraege = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
if (nurOffen) eintraege = eintraege.filter((e) => !e.geprueft);

// Verdachtsmomente markieren, damit beim Durchsehen der Blick gelenkt wird
const VERDACHT = [
  "hotel ", "resort ", "palace", "tower", "castle", "church", "cathedral",
  "sign", "logo", "brand", "name", "text", "letters",
  "woman", "man ", "people", "person", "couple", "guest",
];

function verdaechtig(e) {
  const alt = (e.alt || "").toLowerCase();
  return VERDACHT.filter((v) => alt.includes(v));
}

const karten = eintraege
  .map((e) => {
    const treffer = verdaechtig(e);
    const rel = path.relative(dir, path.join(ZIEL, e.datei));
    return `
  <figure class="karte ${treffer.length ? "warn" : ""}" data-datei="${e.datei}">
    <img src="${rel}" alt="" />
    <figcaption>
      <strong>${e.datei}</strong>
      <span class="kat">${e.kategorie}${e.ort ? " · " + e.ort : ""}</span>
      <span class="alt">${(e.alt || "(kein Alt-Text)").replace(/</g, "&lt;")}</span>
      ${treffer.length ? `<span class="flag">prüfen: ${treffer.join(", ")}</span>` : ""}
      <a href="${e.pexels_url}" target="_blank" rel="noopener">Quelle · ${e.fotograf}</a>
    </figcaption>
  </figure>`;
  })
  .join("");

const html = `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8" />
<title>Bildprüfung — Voyara (${eintraege.length})</title>
<style>
  body { font-family: -apple-system, "Segoe UI", sans-serif; margin: 0; background: #f6f8f7; color: #16211e; }
  header { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #e3e8e6; padding: 16px 24px; z-index: 5; }
  h1 { margin: 0 0 4px; font-size: 1.2rem; }
  header p { margin: 0; font-size: .88rem; color: #64736e; }
  .regeln { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 10px; font-size: .82rem; }
  .regeln span { background: #f1f9f7; border: 1px solid #e2f2ee; padding: 5px 10px; border-radius: 999px; }
  .raster { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; padding: 22px 24px 60px; }
  .karte { margin: 0; background: #fff; border: 1px solid #e3e8e6; border-radius: 12px; overflow: hidden; }
  .karte.warn { border-color: #e0a94a; box-shadow: 0 0 0 2px rgba(224,169,74,.18); }
  .karte img { width: 100%; aspect-ratio: 3/2; object-fit: cover; display: block; background: #e2f2ee; }
  figcaption { padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; font-size: .8rem; }
  figcaption strong { font-size: .85rem; }
  .kat { color: #0f6e5c; }
  .alt { color: #64736e; }
  .flag { color: #b06b12; font-weight: 600; }
  figcaption a { color: #64736e; font-size: .75rem; }
</style></head>
<body>
<header>
  <h1>Bildprüfung — ${eintraege.length} Bilder</h1>
  <p>Orange umrandet = Alt-Text enthält ein Verdachtswort. Das ist ein Hinweis, keine Diagnose — trotzdem alle durchsehen.</p>
  <div class="regeln">
    <span>Keine lesbaren Marken- oder Hotelnamen</span>
    <span>Keine erkennbaren realen Gebäude</span>
    <span>Keine Personen im Vordergrund</span>
    <span>Passt das Motiv zur Kategorie?</span>
    <span>Passt es zu Mallorca?</span>
  </div>
</header>
<div class="raster">${karten}</div>
</body></html>`;

const ziel = path.join(dir, "pruefung.html");
fs.writeFileSync(ziel, html, "utf8");

const auffaellig = eintraege.filter((e) => verdaechtig(e).length).length;
console.log(`Kontaktbogen gebaut: ${eintraege.length} Bilder, davon ${auffaellig} mit Verdachtswort im Alt-Text.`);
console.log(`Öffnen:  open "${ziel}"`);
console.log(`\nAussortieren: Datei aus bilder/generiert/ löschen, dann`);
console.log(`  python3 bilder/stock-holen.py`);
console.log(`holt für die Lücke ein anderes Foto.`);
