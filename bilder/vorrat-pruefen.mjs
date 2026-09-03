// Kontaktbogen fuer den Bildvorrat.
//
//   node bilder/vorrat-pruefen.mjs            alles
//   node bilder/vorrat-pruefen.mjs kreta      nur ein Ziel
//
// Ausschlussgruende sind weiterhin nur vier: lesbare Marken, erkennbare reale
// Gebaeude, Personen im Vordergrund, passt gar nicht zum Urlaub.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const vorrat = JSON.parse(fs.readFileSync(path.join(dir, "pool/vorrat.json"), "utf8"));
const filter = process.argv[2];
const liste = filter ? vorrat.filter((v) => v.ziel === filter || v.thema === filter) : vorrat;

// Verdachtswoerter im Alt-Text vorab markieren
const VERDACHT = ["woman", "man ", "people", "person", "child", "family", "couple",
  "smiling", "guest", "tourist", "portrait", "logo", "sign", "brand"];

const html = `<style>
  body{margin:0;background:#fff;font-family:system-ui}
  .g{display:grid;grid-template-columns:repeat(8,1fr);gap:2px}
  figure{margin:0;position:relative}
  img{width:100%;height:120px;object-fit:cover;display:block;background:#eee}
  figcaption{font-size:8px;line-height:1.15;padding:1px 2px;background:#eee;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .warn figcaption{background:#fde8c8}
</style>
<div class="g">${liste.map((v) => {
  const warn = VERDACHT.some((w) => (v.alt || "").toLowerCase().includes(w));
  return `<figure class="${warn ? "warn" : ""}">
    <img src="pool/${v.datei}" loading="eager">
    <figcaption>${v.ziel}/${v.thema} ${v.pexels_id}</figcaption>
  </figure>`;
}).join("")}</div>`;

fs.writeFileSync(path.join(dir, "vorrat-pruefung.html"), html);
const auffaellig = liste.filter((v) => VERDACHT.some((w) => (v.alt || "").toLowerCase().includes(w))).length;
console.log(`Kontaktbogen: ${liste.length} Bilder, ${auffaellig} mit Verdachtswort im Alt-Text.`);
console.log("Oeffnen: bilder/vorrat-pruefung.html");
