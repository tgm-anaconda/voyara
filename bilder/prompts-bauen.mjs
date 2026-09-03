// Erzeugt die Prompt-Liste fuer alle Aussenansichten aus dem Roster.
//   node bilder/prompts-bauen.mjs > /dev/null

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROSTER } from "./hotel-roster.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));

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

// Ziele in der Reihenfolge des Rosters, aber gruppiert
const zieleInReihenfolge = [...new Set(ROSTER.map((h) => h.ziel))];
const NAME = {
  algarve: "Algarve, Portugal", sardinien: "Sardinien, Italien", teneriffa: "Teneriffa, Spanien",
  barcelona: "Barcelona, Spanien", wien: "Wien, Österreich", lissabon: "Lissabon, Portugal",
  tirol: "Tirol, Österreich", suedtirol: "Südtirol, Italien", lappland: "Lappland, Finnland",
  ostsee: "Ostsee, Deutschland", kreta: "Kreta, Griechenland", marrakesch: "Marrakesch, Marokko",
  kapstadt: "Kapstadt, Südafrika", krabi: "Krabi, Thailand", island: "Island",
  newyork: "New York, USA", kyoto: "Kyoto, Japan", mallorca: "Mallorca, Spanien",
};

// Bereits vorhandene Prompts der drei Kreta-Haeuser vorne anhaengen
const KRETA_FERTIG = [
  { id: "h27", name: "Thalassa Bay", ziel: "kreta",
    bau: "white terraced four-star hotel built into a green hillside, low buildings stepping down the slope, balconies facing the water",
    ort: "above a Mediterranean bay on Crete, oleander and olive trees between the buildings", licht: "late morning light in June" },
  { id: "h28", name: "Kastelli Chania", ziel: "kreta",
    bau: "restored Venetian townhouse with a plain sand-coloured facade and tall shuttered windows, small discreet entrance",
    ort: "directly on the harbour front in the old town of Chania, Crete", licht: "warm afternoon light" },
  { id: "h29", name: "Elounda Petra", ziel: "kreta",
    bau: "low luxury hotel buildings of rough natural stone with private terraces, dry stone walls and cypresses between them",
    ort: "on an olive-covered hillside above a wide gulf on Crete", licht: "golden hour" },
];

const alle = [...KRETA_FERTIG, ...ROSTER];

const zeilen = [];
const w = (t = "") => zeilen.push(t);

w("# KI-Außenansichten — alle Prompts");
w("");
w(`Stand ${new Date().toISOString().slice(0, 10)}. **${alle.length} Bilder**, eines je Hotel.`);
w("Ferienwohnungen brauchen keine — die laufen komplett über Stockmaterial.");
w("");
w("## Was zu tun ist");
w("");
w("Jeden Prompt in ChatGPT geben, das Ergebnis als **`2.png`** im angegebenen Ordner");
w("unter `bilder/generiert/` ablegen. Die Ordner lege ich an, sobald das jeweilige");
w("Haus im Katalog steht — falls einer fehlt, einfach anlegen.");
w("");
w("**Jedes Ziel in einem eigenen Chat.** Ein Bildmodell nimmt die vorherigen Bilder");
w("desselben Chats als Kontext und zieht Details mit, die nicht im Prompt stehen:");
w("dieselbe Fassadenfarbe, dieselbe Tageszeit, dieselbe Perspektive. Bei achtzehn");
w("Zielen in einem Chat sähen am Ende alle Häuser gleich aus. Nach etwa fünf Bildern");
w("ohnehin neu anfangen, und sobald ein Haus dem vorherigen auffällig ähnelt.");
w("");
w("**Nur den Prompt schicken**, keine Zusätze wie „wie eben, aber ...\" — genau");
w("darüber wandern die Details mit.");
w("");
w("## Warum KI und nicht Stock");
w("");
w("Auf diesen Bildern ist das Gebäude selbst das Motiv. Der Stockvorrat hat gezeigt,");
w("wohin das führt: Hotel Sacher, W Barcelona, und bei einem Kreta-Haus stand");
w("„HOTEL CASA LEONE\" lesbar an der Fassade. Markenbekanntheit wirkt auf Vertrauen");
w("und wäre in der Auswertung nicht mehr vom Agenten-Effekt zu trennen.");
w("");
w("## Übersicht");
w("");
w("| Ziel | Bilder |");
w("|---|---|");
for (const z of [...new Set(alle.map((h) => h.ziel))]) {
  w(`| ${NAME[z]} | ${alle.filter((h) => h.ziel === z).length} |`);
}
w(`| **Gesamt** | **${alle.length}** |`);
w("");
w("---");

let n = 0;
for (const z of [...new Set(alle.map((h) => h.ziel))]) {
  w("");
  w(`## ${NAME[z]}`);
  w("");
  w("*Eigener Chat für dieses Ziel.*");
  w("");
  for (const h of alle.filter((x) => x.ziel === z)) {
    n++;
    w(`### ${n}. ${h.name}`);
    w("");
    w("`hotels/" + h.id + "-" + slug(h.name) + "/2.png`");
    w("");
    w("```");
    const stil = /night|aurora|blue hour|dusk|twilight|stars/i.test(h.licht)
      ? STIL.replace("natural daylight", "available light after dark")
      : STIL;
    const bau = h.bau.charAt(0).toUpperCase() + h.bau.slice(1);
    w(`${bau}, ${h.ort}, ${h.licht}. ${stil}. ${NEG}.`);
    w("```");
    w("");
  }
}

w("---");
w("");
w("## Danach");
w("");
w("```bash");
w("node bilder/einbauen.mjs");
w("```");

fs.writeFileSync(path.join(dir, "KI-AUSSENANSICHTEN.md"), zeilen.join("\n") + "\n");
console.error(`${alle.length} Prompts geschrieben nach bilder/KI-AUSSENANSICHTEN.md`);
