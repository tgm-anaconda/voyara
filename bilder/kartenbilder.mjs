// Kleine Kartenfassungen der Titelbilder (19.11.2026).
// ---------------------------------------------------------------------
// Jede Karte zeigte bis hierher das volle Foto, 1200 x 801 Pixel und
// rund 280 KB. Eine Trefferliste mit 200 Karten waren damit 50 bis 100
// MB. Der erste Versuch dagegen (18.11.2026) lud die Bilder erst beim
// Scrollen nach - und genau dann scrollt der Agent. Das Ergebnis war
// ein ruckelndes Durchscrollen, gemeldet von Ben am 19.11.2026.
//
// Dieses Skript legt neben jedes Titelbild eine Fassung "<name>-karte.jpg"
// mit 600 Pixeln Breite (reicht fuer die breiteste Karte auf einem
// Bildschirm mit doppelter Pixeldichte). Damit kann die Seite wieder
// alle Bilder sofort laden, wie vor dem 18.11.
//
//   node bilder/kartenbilder.mjs          fehlende anlegen
//   node bilder/kartenbilder.mjs --neu    alle neu anlegen
//
// Braucht `sips` (macOS, vorinstalliert). Stufe "low": bei Kartengroesse
// nicht vom Original zu unterscheiden (nachgesehen am 19.11.2026), rund
// 30 KB statt 90 KB bei Stufe 70.
import { readFileSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const quelle = readFileSync(join(WURZEL, "data/bildpfade.js"), "utf8");
const neu = process.argv.includes("--neu");

// Das erste Bild jedes Eintrags ist das Titelbild
const titel = new Set();
for (const m of quelle.matchAll(/^\s*"[^"]+":\s*\["([^"]+)"/gm)) titel.add(m[1]);

const kartePfad = (p) => p.slice(0, p.lastIndexOf(".")) + "-karte.jpg";
let angelegt = 0, schon = 0, fehlt = 0, vorher = 0, nachher = 0;
for (const p of titel) {
  const von = join(WURZEL, p);
  const nach = join(WURZEL, kartePfad(p));
  if (!existsSync(von)) { fehlt++; continue; }
  if (existsSync(nach) && !neu) { schon++; continue; }
  execFileSync("sips", ["-Z", "600", "-s", "format", "jpeg", "-s", "formatOptions", "low", von, "--out", nach], { stdio: "ignore" });
  vorher += statSync(von).size; nachher += statSync(nach).size;
  angelegt++;
}
const mb = (b) => (b / 1024 / 1024).toFixed(1);
console.log(`${titel.size} Titelbilder: ${angelegt} angelegt, ${schon} schon da, ${fehlt} Quelle fehlt`);
if (angelegt) console.log(`Groesse der angelegten: ${mb(vorher)} MB -> ${mb(nachher)} MB`);
