// Listet alle Bilder auf, die zwar erzeugt, aber noch in keinem Katalogeintrag
// verwendet werden - als Übergabe an eine andere Sitzung.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROSTER } from "./hotel-roster.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");

const src = (fs.readFileSync(path.join(root, "data/hotels.js"), "utf8")
  + fs.readFileSync(path.join(root, "data/inventory.js"), "utf8"))
  .replace(/const (HOTELS|APARTMENTS|CARS|FLIGHTS|AMENITY_LABELS|CATEGORY_LABELS|BOARD_LABELS)/g, "globalThis.$1");
new Function("module", src)({ exports: {} });
const imKatalog = new Set(globalThis.HOTELS.map((h) => h.id));

const slug = (t) => t.toLowerCase()
  .replaceAll("ä","ae").replaceAll("ö","oe").replaceAll("ü","ue").replaceAll("ß","ss")
  .replaceAll("á","a").replaceAll("é","e").replaceAll("í","i").replaceAll("ó","o").replaceAll("ú","u")
  .replaceAll("à","a").replaceAll("è","e").replaceAll("ò","o").replaceAll("ç","c").replaceAll("ñ","n")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const ZIELNAME = {
  algarve: "Algarve, Portugal", sardinien: "Sardinien, Italien", teneriffa: "Teneriffa, Spanien",
  barcelona: "Barcelona, Spanien", wien: "Wien, Österreich", lissabon: "Lissabon, Portugal",
  tirol: "Tirol, Österreich", suedtirol: "Südtirol, Italien", lappland: "Lappland, Finnland",
  ostsee: "Ostsee, Deutschland", kreta: "Kreta, Griechenland", marrakesch: "Marrakesch, Marokko",
  kapstadt: "Kapstadt, Südafrika", krabi: "Krabi, Thailand", island: "Island",
  newyork: "New York, USA", kyoto: "Kyoto, Japan", mallorca: "Mallorca, Spanien",
};
const KAT = {
  luxus: "Luxushotel (5 Sterne)", boutique: "Boutique-Hotel", strand: "Strandhotel",
  familie: "Familienresort", stadt: "Stadthotel", budget: "Günstig & einfach",
  finca: "Finca & Landhaus", apart: "Aparthotel", berg: "Berghotel",
};

const offen = ROSTER.filter((h) => !imKatalog.has(h.id))
  .map((h) => ({ ...h, ordner: `hotels/${h.id}-${slug(h.name)}` }))
  .sort((a, b) => (a.ziel + a.id).localeCompare(b.ziel + b.id));

const z = [];
const w = (t = "") => z.push(t);

w("# Bilder ohne Katalogeintrag");
w("");
w(`Stand ${new Date().toISOString().slice(0, 10)}.`);
w("");
w(`**${offen.length} Hotels** haben eine fertige KI-Außenansicht, existieren aber noch`);
w("nicht in `data/hotels.js`. Die Bilder liegen bereits am richtigen Ort — was fehlt,");
w("ist der Katalogeintrag, der sie sichtbar macht.");
w("");
w("## Projektwurzel");
w("");
w("```");
w("/Users/tom-gabrielmielicki/Desktop/Bachelor Arbeit/Website");
w("```");
w("");
w("Alle Pfade unten sind relativ dazu.");
w("");
w("## Was jeweils schon da ist und was fehlt");
w("");
w("| | |");
w("|---|---|");
w("| Vorhanden | `2.jpg` — die KI-Außenansicht |");
w("| Fehlt als Bild | Position 1, 3, 4, 5 (Ort, Pool/Wellness/Lobby, Zimmer, Essen) |");
w("| Fehlt im Code | der komplette Eintrag in `data/hotels.js` |");
w("");
w("Die fehlenden Bilder kommen **nicht** aus KI, sondern aus dem Stockvorrat unter");
w("`bilder/pool/<ziel>/<thema>/`. Zuordnen mit `node bilder/zuordnen.mjs <datei.json>`,");
w("Format der Zuordnungsdatei:");
w("");
w("```json");
w('{ "h30": { "ordner": "hotels/h30-vale-dourado",');
w('           "bilder": { "1": 34762303, "3": 10923534, "4": 33400871, "5": 38313075 } } }');
w("```");
w("");
w("Die Zahlen sind Pexels-IDs aus `bilder/pool/vorrat.json`.");
w("");
w("## Danach");
w("");
w("```bash");
w("node bilder/einbauen.mjs      # verkleinert und schreibt data/bildpfade.js neu");
w("```");
w("");
w("Struktur eines Katalogeintrags baut `node bilder/objekte-bauen.mjs <spec.json>` —");
w("Zimmerkategorien, Verpflegung, Ausstattung und Teilnoten entstehen daraus");
w("automatisch. Von Hand kommen nur Name, Ort, Kurz- und Langbeschreibung, Highlights.");
w("");
w("**Wichtig: Namen und Ordner sind eingefroren.** Eine Umbenennung würde das");
w("bereits erzeugte Bild von seinem Haus trennen.");
w("");
w("---");
w("");

let ziel = "";
for (const h of offen) {
  if (h.ziel !== ziel) {
    ziel = h.ziel;
    w("");
    w(`## ${ZIELNAME[ziel]}`);
    w("");
    w("| ID | Name | Kategorie | Sterne | Ordner |");
    w("|---|---|---|---|---|");
  }
  w(`| ${h.id} | ${h.name} | ${KAT[h.kat] || h.kat} | ${h.sterne} | \`img/hotels/${h.id}-${slug(h.name)}/\` |`);
}

w("");
w("---");
w("");
w("## Reine Pfadliste");
w("");
w("```");
for (const h of offen) w(`img/hotels/${h.id}-${slug(h.name)}/2.jpg`);
w("```");

fs.writeFileSync(path.join(root, "BILDER-OHNE-EINTRAG.md"), z.join("\n") + "\n");
console.log(`${offen.length} Hotels ohne Eintrag → BILDER-OHNE-EINTRAG.md`);
