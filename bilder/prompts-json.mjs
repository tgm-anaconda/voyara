// Erzeugt bilder/prompts.offen.json - eine Zeile je offenem Bild.
// Erlaubt, einzelne Prompts per jq zu ziehen, statt die Markdown-Datei zu lesen.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROSTER } from "./hotel-roster.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const STIL = "Professional travel photography, natural daylight, realistic colours, soft shadows, shot on full-frame camera, the building fills most of the frame, no people in the foreground, no text, no lettering, no signage on the building, no logos, no watermarks, no borders, landscape orientation 3:2";
const NEG = "Avoid: collage, split screen, multiple panels, picture frames, text overlays, brand names, hotel signs, readable writing, recognisable real hotels or landmarks, cartoon or illustration look, oversaturated HDR, fisheye distortion";
const slug = (t) => t.toLowerCase()
  .replaceAll("ä","ae").replaceAll("ö","oe").replaceAll("ü","ue").replaceAll("ß","ss")
  .replaceAll("á","a").replaceAll("é","e").replaceAll("í","i").replaceAll("ó","o").replaceAll("ú","u")
  .replaceAll("à","a").replaceAll("è","e").replaceAll("ò","o").replaceAll("ç","c").replaceAll("ñ","n")
  .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

const KRETA = [
  { id:"h28", ziel:"kreta", name:"Kastelli Chania",
    bau:"restored Venetian townhouse with a plain sand-coloured facade and tall shuttered windows, small discreet entrance",
    ort:"directly on the harbour front in the old town of Chania, Crete", licht:"warm afternoon light" },
  { id:"h29", ziel:"kreta", name:"Elounda Petra",
    bau:"low luxury hotel buildings of rough natural stone with private terraces, dry stone walls and cypresses between them",
    ort:"on an olive-covered hillside above a wide gulf on Crete", licht:"golden hour" },
];

const alle = [...KRETA, ...ROSTER].map((h) => {
  const ordner = `hotels/${h.id}-${slug(h.name)}`;
  const stil = /night|aurora|blue hour|dusk|twilight|stars/i.test(h.licht)
    ? STIL.replace("natural daylight", "available light after dark") : STIL;
  const bau = h.bau.charAt(0).toUpperCase() + h.bau.slice(1);
  return { id: h.id, ziel: h.ziel, name: h.name, ordner,
           prompt: `${bau}, ${h.ort}, ${h.licht}. ${stil}. ${NEG}.` };
});

const offen = alle.filter((h) => !fs.existsSync(path.join(dir, "generiert", h.ordner, "2.jpg"))
                              && !fs.existsSync(path.join(dir, "generiert", h.ordner, "2.png")));
fs.writeFileSync(path.join(dir, "prompts.offen.json"), JSON.stringify(offen, null, 1));
console.log(`${offen.length} offen von ${alle.length}`);
