// Schreibt eine Datei mit genau den Aussenansichten, die noch fehlen.
//
// Prueft dazu, ob die 2.png schon im Ordner liegt. Was erledigt ist,
// taucht nicht mehr auf - damit ist immer klar, was noch zu tun ist.
//
//   node bilder/prompts-offen.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROSTER } from "./hotel-roster.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");

const STIL = "Professional travel photography, natural daylight, realistic colours, "
  + "soft shadows, shot on full-frame camera, the building fills most of the frame, "
  + "no people in the foreground, no text, no lettering, no signage on the building, "
  + "no logos, no watermarks, no borders, landscape orientation 3:2";
const NEG = "Avoid: collage, split screen, multiple panels, picture frames, text overlays, "
  + "brand names, hotel signs, readable writing, recognisable real hotels or landmarks, "
  + "cartoon or illustration look, oversaturated HDR, fisheye distortion";

const slug = (t) => t.toLowerCase()
  .replaceAll("ä","ae").replaceAll("ö","oe").replaceAll("ü","ue").replaceAll("ß","ss")
  .replaceAll("á","a").replaceAll("é","e").replaceAll("í","i").replaceAll("ó","o").replaceAll("ú","u")
  .replaceAll("à","a").replaceAll("è","e").replaceAll("ò","o").replaceAll("ç","c").replaceAll("ñ","n")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const KRETA = [
  { id: "h27", ziel: "kreta", name: "Thalassa Bay",
    bau: "white terraced four-star hotel built into a green hillside, low buildings stepping down the slope, balconies facing the water",
    ort: "above a Mediterranean bay on Crete, oleander and olive trees between the buildings", licht: "late morning light in June" },
  { id: "h28", ziel: "kreta", name: "Kastelli Chania",
    bau: "restored Venetian townhouse with a plain sand-coloured facade and tall shuttered windows, small discreet entrance",
    ort: "directly on the harbour front in the old town of Chania, Crete", licht: "warm afternoon light" },
  { id: "h29", ziel: "kreta", name: "Elounda Petra",
    bau: "low luxury hotel buildings of rough natural stone with private terraces, dry stone walls and cypresses between them",
    ort: "on an olive-covered hillside above a wide gulf on Crete", licht: "golden hour" },
];

const NAME = {
  kreta: "Kreta, Griechenland", algarve: "Algarve, Portugal", sardinien: "Sardinien, Italien",
  teneriffa: "Teneriffa, Spanien", barcelona: "Barcelona, Spanien", wien: "Wien, Österreich",
  lissabon: "Lissabon, Portugal", tirol: "Tirol, Österreich", suedtirol: "Südtirol, Italien",
  lappland: "Lappland, Finnland", ostsee: "Ostsee, Deutschland", marrakesch: "Marrakesch, Marokko",
  kapstadt: "Kapstadt, Südafrika", krabi: "Krabi, Thailand", island: "Island",
  newyork: "New York, USA", kyoto: "Kyoto, Japan", mallorca: "Mallorca, Spanien",
};

const alle = [...KRETA, ...ROSTER].map((h) => ({ ...h, ordner: `hotels/${h.id}-${slug(h.name)}` }));
// Bilder aus dem Browser landen als JPEG, von Hand abgelegte als PNG
const offen = alle.filter((h) => !fs.existsSync(path.join(dir, "generiert", h.ordner, "2.png"))
                              && !fs.existsSync(path.join(dir, "generiert", h.ordner, "2.jpg")));
const fertig = alle.length - offen.length;

const z = [];
const w = (t = "") => z.push(t);

w("# Außenansichten — was noch zu erzeugen ist");
w("");
w(`Stand ${new Date().toISOString().slice(0, 10)}.`);
w("");
w(`**${offen.length} Bilder offen**${fertig ? ` · ${fertig} bereits erledigt und hier nicht mehr aufgeführt` : ""}.`);
w("");
w("Diese Datei wird neu erzeugt mit `node bilder/prompts-offen.mjs`. Was fertig ist,");
w("verschwindet daraus — es steht also immer nur drin, was noch fehlt.");
w("");
w("## Ablage");
w("");
w("Jedes Bild als **`2.png`** in den Ordner, der über dem Prompt steht, unterhalb von");
w("`Bachelor Arbeit/Website/bilder/generiert/`. Ordner notfalls anlegen.");
w("");
w("Beispiel: Das erste Bild kommt nach");
w("");
w("```");
w(`Bachelor Arbeit/Website/bilder/generiert/${offen[0] ? offen[0].ordner : "hotels/..."}/2.png`);
w("```");
w("");
w("## Zwei Regeln");
w("");
w("**1. Ein Chat pro Ziel.** Ein Bildmodell nimmt die vorherigen Bilder desselben");
w("Chats als Kontext und zieht Details mit, die nicht im Prompt stehen: gleiche");
w("Fassadenfarbe, gleiche Tageszeit, gleiche Perspektive. Bei allen Zielen in einem");
w("Chat sähen am Ende alle Häuser gleich aus.");
w("");
w("**2. Nur den Prompt schicken.** Keine Zusätze wie „wie eben, aber in Blau\" —");
w("genau darüber wandern die Details mit.");
w("");
w("## Übersicht");
w("");
w("| Ziel | offen |");
w("|---|---|");
const ziele = [...new Set(offen.map((h) => h.ziel))];
for (const zi of ziele) w(`| ${NAME[zi]} | ${offen.filter((h) => h.ziel === zi).length} |`);
w(`| **Gesamt** | **${offen.length}** |`);

let n = 0;
for (const zi of ziele) {
  w("");
  w("---");
  w("");
  w(`## ${NAME[zi]}`);
  w("");
  w("*Hierfür einen frischen Chat öffnen.*");
  w("");
  for (const h of offen.filter((x) => x.ziel === zi)) {
    n++;
    const stil = /night|aurora|blue hour|dusk|twilight|stars/i.test(h.licht)
      ? STIL.replace("natural daylight", "available light after dark") : STIL;
    const bau = h.bau.charAt(0).toUpperCase() + h.bau.slice(1);
    w(`### ${n}. ${h.name}`);
    w("");
    w("Ablage: `" + h.ordner + "/2.png`");
    w("");
    w("```");
    w(`${bau}, ${h.ort}, ${h.licht}. ${stil}. ${NEG}.`);
    w("```");
    w("");
  }
}

w("---");
w("");
w("## Wenn du fertig bist");
w("");
w("Sag mir Bescheid, dann baue ich sie ein. Oder selbst:");
w("");
w("```bash");
w("node bilder/einbauen.mjs");
w("```");

const ziel = path.join(root, "PROMPTS-AUSSENANSICHTEN.md");
fs.writeFileSync(ziel, z.join("\n") + "\n");
console.log(`${offen.length} offene Prompts geschrieben nach`);
console.log(ziel);
