// Ordnet jeder Ferienwohnung ohne Bildordner fuenf Stockbilder zu.
//
// Wohnungen bekommen keine KI-Aussenansicht, also ist auch Position 2 frei:
// 1 Ort, 2 Wohnen, 3 Kueche, 4 Zimmer, 5 Umgebung.
//
// Fehlt einem Ziel ein Thema (Kyoto und New York haben keine Kuechenbilder
// im Vorrat), rueckt das naechste Thema der Ersatzliste nach.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const vorrat = JSON.parse(fs.readFileSync(path.join(dir, "pool/vorrat.json"), "utf8"));
const quelle = ["../data/hotels.js", "../data/inventory.js"]
  .map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n")
  + "\nmodule.exports = { APARTMENTS };";
const modul = { exports: {} };
new Function("module", quelle)(modul);

const slug = (t) => t.toLowerCase()
  .replaceAll("ä","ae").replaceAll("ö","oe").replaceAll("ü","ue").replaceAll("ß","ss")
  .replaceAll("á","a").replaceAll("é","e").replaceAll("í","i").replaceAll("ó","o").replaceAll("ú","u")
  .replaceAll("à","a").replaceAll("è","e").replaceAll("ò","o").replaceAll("ç","c").replaceAll("ñ","n")
  .replaceAll("'","").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const frei = {};
for (const v of vorrat) {
  if (v.verwendet) continue;
  ((frei[v.ziel] ||= {})[v.thema] ||= []).push(v.pexels_id);
}
for (const z of Object.keys(frei))
  for (const t of Object.keys(frei[z])) frei[z][t].sort((a, b) => a - b);

// Position -> bevorzugtes Thema, danach Ersatz
const PLAN = [
  ["1", ["ort", "umgebung"]],
  ["2", ["wohnen"]],
  ["3", ["kueche", "wohnen", "lobby", "umgebung"]],
  ["4", ["zimmer", "wohnen"]],
  ["5", ["umgebung", "ort", "lobby"]],
];

const bestand = new Set(
  fs.existsSync(path.join(dir, "generiert/wohnungen"))
    ? fs.readdirSync(path.join(dir, "generiert/wohnungen")).map((n) => n.split("-")[0])
    : []);

const zaehler = {};
const zuordnung = {};
const luecken = [];

for (const w of modul.exports.APARTMENTS) {
  if (bestand.has(w.id)) continue;
  const i = (zaehler[w.ziel] = (zaehler[w.ziel] ?? -1) + 1);
  const f = frei[w.ziel] || {};
  const belegt = new Set();
  const bilder = {};

  for (const [position, themen] of PLAN) {
    for (const thema of themen) {
      const liste = (f[thema] || []).filter((id) => !belegt.has(id));
      // Innerhalb eines Themas rueckt jede Wohnung einen Platz weiter, damit
      // sich die Bilder zwischen den Haeusern eines Ziels nicht wiederholen.
      // Kein Modulo: hat ein Ziel weniger Bilder als Wohnungen, bekaeme sonst
      // jede zweite Wohnung dasselbe Bild. Stattdessen rueckt das Ersatzthema
      // nach - lieber ein Wohnzimmer statt einer Kueche als zweimal dieselbe.
      const treffer = liste[i];
      if (treffer === undefined) continue;
      belegt.add(treffer);
      bilder[position] = treffer;
      break;
    }
  }
  if (Object.keys(bilder).length < 5) luecken.push(`${w.id} (${Object.keys(bilder).length})`);
  zuordnung[w.id] = { ordner: `wohnungen/${w.id}-${slug(w.name)}`, bilder };
}

fs.writeFileSync("/tmp/auto-zuordnung-wohnungen.json", JSON.stringify(zuordnung, null, 1));
console.log(`${Object.keys(zuordnung).length} Wohnungen zugeordnet.`);
if (luecken.length) console.log("Unvollstaendig:", luecken.join(", "));
