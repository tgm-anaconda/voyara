/* Kontaktbogen fuer den Winterausbau: zeigt alle geplanten Bilder je Haus,
 * direkt aus dem Vorrat, ohne etwas zu kopieren.
 *
 *   node bilder/pruefung-ausbau.mjs
 *   open bilder/specs/ausbau-2026-11-01/pruefung.html
 *
 * Maßstab und Ausschlussgruende stehen in bilder/PRUEFUNG.md.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const SPECS = path.join(dir, "specs/ausbau-2026-11-01");
const plan = JSON.parse(fs.readFileSync(path.join(SPECS, "bildplan.json"), "utf8"));
const vorrat = JSON.parse(fs.readFileSync(path.join(dir, "pool/vorrat.json"), "utf8"));
const nach = Object.fromEntries(vorrat.map((v) => [v.datei, v]));

const namen = {};
for (const d of fs.readdirSync(SPECS).filter((f) => /^h\d+-h\d+-.*\.json$/.test(f))) {
  for (const h of JSON.parse(fs.readFileSync(path.join(SPECS, d), "utf8")).hotels) {
    namen[h.id] = { name: h.name, ort: h.ort, kat: h.kategorie, preis: h.preis, sterne: h.sterne };
  }
}
for (const d of fs.readdirSync(SPECS).filter((f) => /^a\d+-a\d+-.*\.json$/.test(f))) {
  for (const w of JSON.parse(fs.readFileSync(path.join(SPECS, d), "utf8")).wohnungen) {
    namen[w.id] = { name: w.name, ort: w.ort, kat: `Wohnung, ${w.schlafzimmer} Schlafzimmer, ${w.gaeste} Gäste`, preis: w.preis };
  }
}

/* Je Ziel erst die Haeuser, dann die Wohnungen - so sieht man beim
   Durchsehen, ob die Vorschaubilder einer Region sich unterscheiden. */
const jeZiel = {};
for (const h of plan) (jeZiel[h.ziel] ||= []).push(h);
for (const z of Object.keys(jeZiel)) {
  jeZiel[z].sort((a, b) => (a.bereich === b.bereich
    ? Number(a.id.slice(1)) - Number(b.id.slice(1))
    : (a.bereich === "hotels" ? -1 : 1)));
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

let koerper = "";
for (const ziel of Object.keys(jeZiel).sort()) {
  const hz = jeZiel[ziel].filter((x) => x.bereich === "hotels").length;
  const wz = jeZiel[ziel].length - hz;
  koerper += `<h2>${esc(ziel)} <span class="n">${hz} Häuser, ${wz} Wohnungen</span></h2>\n`;
  for (const h of jeZiel[ziel]) {
    const m = namen[h.id] || {};
    const bilder = Object.entries(h.bilder).sort(([a], [b]) => a - b);
    const sterne = m.sterne ? ` · ${m.sterne}★` : "";
    koerper += `<section class="${h.bereich}"><header><b>${esc(h.id)}</b> ${esc(m.name || "")}
      <span class="n">${esc(m.ort || "")} · ${esc(m.kat || "")}${sterne} · ${m.preis || "?"} €</span></header><div class="reihe">`;
    for (const [pos, datei] of bilder) {
      const v = nach[datei] || {};
      koerper += `<figure class="${pos === "1" ? "titel" : ""}">
        <img src="../../pool/${esc(datei)}" loading="lazy" alt="">
        <figcaption>${pos}: ${esc(datei.split("/")[1])}<br><span class="n">${esc((v.alt || "").slice(0, 70))}</span></figcaption>
      </figure>`;
    }
    koerper += "</div></section>\n";
  }
}

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<title>Bildprüfung Winterausbau</title>
<style>
  body { font: 15px/1.5 -apple-system, system-ui, sans-serif; margin: 0 auto; max-width: 1400px; padding: 24px; color: #1a1a1a; }
  h1 { font-size: 24px; }
  h2 { margin: 40px 0 8px; text-transform: capitalize; border-bottom: 2px solid #ddd; padding-bottom: 6px; }
  .n { color: #777; font-weight: 400; font-size: 13px; }
  section { margin: 16px 0 24px; }
  header { margin-bottom: 6px; }
  .reihe { display: flex; gap: 8px; align-items: flex-start; }
  figure { margin: 0; width: 200px; }
  figure.titel { width: 300px; }
  img { width: 100%; height: auto; border-radius: 4px; display: block; background: #eee; }
  figure.titel img { outline: 3px solid #2a6; outline-offset: 2px; }
  section.wohnungen header b { color: #a35; }
  figcaption { font-size: 11px; color: #555; margin-top: 4px; }
  .hinweis { background: #f5f5f5; padding: 12px 16px; border-radius: 6px; }
</style></head><body>
<h1>Bildprüfung Winterausbau (h219 bis h454, a161 bis a234)</h1>
<p class="hinweis">Grün umrandet ist das Titelbild, also das Vorschaubild in der Trefferliste.
Maßstab und die vier Ausschlussgründe stehen in <code>bilder/PRUEFUNG.md</code>.
Es wurde noch nichts kopiert und nichts eingebaut: die Bilder liegen im Vorrat.</p>
${koerper}
</body></html>`;

fs.writeFileSync(path.join(SPECS, "pruefung.html"), html, "utf8");
const hz = plan.filter((p) => p.bereich === "hotels").length;
console.log(`pruefung.html geschrieben: ${hz} Häuser, ${plan.length - hz} Wohnungen, `
  + `${plan.reduce((s, p) => s + Object.keys(p.bilder).length, 0)} Bilder.`);
