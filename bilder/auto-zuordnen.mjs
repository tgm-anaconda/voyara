// Ordnet jedem Hotel ohne Katalogeintrag vier Stockbilder zu.
//
// Position 1 = Ort (Titelbild), 2 = KI-Aussenansicht (liegt schon),
// 3 = Pool/Wellness/Lobby je nach Zieltyp, 4 = Zimmer, 5 = Essen.
//
// Innerhalb eines Ziels bekommt jedes Haus einen anderen Index, damit sich
// nichts wiederholt.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROSTER } from "./hotel-roster.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const vorrat = JSON.parse(fs.readFileSync(path.join(dir, "pool/vorrat.json"), "utf8"));

const slug = (t) => t.toLowerCase()
  .replaceAll("ä","ae").replaceAll("ö","oe").replaceAll("ü","ue").replaceAll("ß","ss")
  .replaceAll("á","a").replaceAll("é","e").replaceAll("í","i").replaceAll("ó","o").replaceAll("ú","u")
  .replaceAll("à","a").replaceAll("è","e").replaceAll("ò","o").replaceAll("ç","c").replaceAll("ñ","n")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Freie Bilder je Ziel und Thema, stabil sortiert
const frei = {};
for (const v of vorrat) {
  if (v.verwendet) continue;
  (frei[v.ziel] ||= {})[v.thema] ||= [];
  frei[v.ziel][v.thema].push(v.pexels_id);
}
for (const z of Object.keys(frei))
  for (const t of Object.keys(frei[z])) frei[z][t].sort((a, b) => a - b);

// Welches Thema kommt auf Position 3? Haengt am Vorrat des Ziels.
function themaDrei(ziel) {
  const f = frei[ziel] || {};
  for (const t of ["pool", "wellness", "lobby"]) if ((f[t] || []).length) return t;
  return "umgebung";
}

const zaehler = {};
const zuordnung = {};
let ohneVorrat = [];

for (const h of ROSTER) {
  const i = (zaehler[h.ziel] = (zaehler[h.ziel] ?? -1) + 1);
  const f = frei[h.ziel] || {};
  const nimm = (thema) => (f[thema] || [])[i];

  const bilder = {};
  const t1 = nimm("ort"), t3 = nimm(themaDrei(h.ziel)), t4 = nimm("zimmer"), t5 = nimm("essen");
  if (t1) bilder["1"] = t1;
  if (t3) bilder["3"] = t3;
  if (t4) bilder["4"] = t4;
  if (t5) bilder["5"] = t5;

  if (Object.keys(bilder).length < 4) ohneVorrat.push(h.id);
  zuordnung[h.id] = { ordner: `hotels/${h.id}-${slug(h.name)}`, bilder };
}

fs.writeFileSync("/tmp/auto-zuordnung.json", JSON.stringify(zuordnung, null, 1));
console.log(`${Object.keys(zuordnung).length} Hotels zugeordnet.`);
if (ohneVorrat.length) console.log("Unvollstaendig:", ohneVorrat.join(", "));
