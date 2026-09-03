// Sperrt Bilder aus dem Vorrat dauerhaft.
//   node bilder/vorrat-verwerfen.mjs 36644768 "Hotel Sacher, lesbarer Schriftzug"
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const VORRAT = path.join(dir, "pool/vorrat.json");
const VERWORFEN = path.join(dir, "verworfen.json");

const [id, grund] = process.argv.slice(2);
if (!id) process.exit(console.error("Pexels-ID fehlt"));

const vorrat = JSON.parse(fs.readFileSync(VORRAT, "utf8"));
const treffer = vorrat.find((v) => String(v.pexels_id) === String(id));
if (!treffer) process.exit(console.error("Nicht im Vorrat:", id));

const datei = path.join(dir, "pool", treffer.datei);
if (fs.existsSync(datei)) fs.unlinkSync(datei);

const verworfen = fs.existsSync(VERWORFEN) ? JSON.parse(fs.readFileSync(VERWORFEN, "utf8")) : [];
verworfen.push({ pexels_id: treffer.pexels_id, datei: treffer.datei, grund: grund || "" });
fs.writeFileSync(VERWORFEN, JSON.stringify(verworfen, null, 2));
fs.writeFileSync(VORRAT, JSON.stringify(vorrat.filter((v) => v !== treffer), null, 2));
console.log(`gesperrt: ${treffer.datei} — ${grund || ""}`);
