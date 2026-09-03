// Baut die fertigen Bilder in die Website ein.
//
// 1. verkleinert alles auf max. 1600 px Breite und wandelt in JPEG
//    (die Rohbilder sind bis 9500 px breit — fuer eine Website unnoetiger Ballast)
// 2. legt sie unter img/ ab, Ordnerstruktur bleibt erhalten
// 3. schreibt data/bildpfade.js, damit der Katalog die Pfade kennt
//
//   node bilder/einbauen.mjs

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");
const QUELLE = path.join(dir, "generiert");
const ZIEL = path.join(root, "img");
const MAX_BREITE = 1600;
const QUALITAET = 82;

// Objektordner direkt aus generiert/ lesen statt aus ordner.json.
// ordner.json kennt nur Objekte mit Bildregie - seit die Bilder aus dem
// Vorrat zugeordnet werden, gibt es aber Haeuser ohne Eintrag dort.
// Der Ordnername traegt die ID vorne: hotels/h27-thalassa-bay -> h27
function ordnerAusVerzeichnis(basis) {
  const gefunden = [];
  for (const bereich of ["hotels", "wohnungen", "mietwagen"]) {
    const p = path.join(basis, bereich);
    if (!fs.existsSync(p)) continue;
    for (const name of fs.readdirSync(p)) {
      const treffer = name.match(/^([a-z]\d+)-/);
      if (treffer) gefunden.push({ id: treffer[1], ordner: `${bereich}/${name}` });
    }
  }
  return gefunden;
}
const ordner = ordnerAusVerzeichnis(QUELLE);

let umgewandelt = 0, uebersprungen = 0, bytesVorher = 0, bytesNachher = 0;

function wandeln(quellDatei, zielDatei) {
  fs.mkdirSync(path.dirname(zielDatei), { recursive: true });

  // Schon vorhanden und neuer als die Quelle? Dann ueberspringen.
  if (fs.existsSync(zielDatei)
      && fs.statSync(zielDatei).mtimeMs > fs.statSync(quellDatei).mtimeMs) {
    uebersprungen++;
    return;
  }

  execFileSync("sips", [
    "-Z", String(MAX_BREITE),
    "-s", "format", "jpeg",
    "-s", "formatOptions", String(QUALITAET),
    quellDatei, "--out", zielDatei,
  ], { stdio: "ignore" });

  bytesVorher += fs.statSync(quellDatei).size;
  bytesNachher += fs.statSync(zielDatei).size;
  umgewandelt++;
}

// Alle Bilder unterhalb von generiert/ einsammeln.
// KI-Bilder kommen als PNG, die aus dem Stock-Vorrat zugeordneten als JPG.
function alleBilder(verzeichnis, gesammelt = []) {
  for (const eintrag of fs.readdirSync(verzeichnis, { withFileTypes: true })) {
    const voll = path.join(verzeichnis, eintrag.name);
    if (eintrag.isDirectory()) alleBilder(voll, gesammelt);
    else if (/\.(png|jpe?g)$/i.test(eintrag.name)) gesammelt.push(voll);
  }
  return gesammelt;
}

const bilder = alleBilder(QUELLE);
console.log(`${bilder.length} Bilder gefunden.\n`);

for (const quelle of bilder) {
  const rel = path.relative(QUELLE, quelle).replace(/\.(png|jpe?g)$/i, ".jpg");
  wandeln(quelle, path.join(ZIEL, rel));
}

// --- Pfadtabelle fuer den Katalog schreiben ------------------------------
// Bei Hotels liegt auf Position 2 die KI-Aussenansicht - also das Haus selbst,
// waehrend Position 1 nur den Ort zeigt. Fuer die Trefferkarte ist das Haus das
// bessere Bild, deshalb rueckt es in der Galerie nach vorn. Ferienwohnungen
// haben keine Aussenansicht und behalten ihre Reihenfolge.
// Sechs Haeuser aus der ersten Runde haben auf Position 2 kein Gebaeude,
// sondern Pool, Zimmer oder Strand. Bei ihnen bleibt Position 1 vorn.
const TITEL_BLEIBT_EINS = new Set(["h02", "h03", "h07", "h08", "h10", "h12"]);

function galerieOrdnung(bereich, id, dateien) {
  if (bereich !== "hotels" || TITEL_BLEIBT_EINS.has(id)) return dateien;
  const aussen = dateien.find((f) => f.startsWith("2."));
  return aussen ? [aussen, ...dateien.filter((f) => f !== aussen)] : dateien;
}

const eintraege = ordner.map((o) => {
  const zielOrdner = path.join(ZIEL, o.ordner);
  const vorhanden = fs.existsSync(zielOrdner)
    ? fs.readdirSync(zielOrdner).filter((f) => f.endsWith(".jpg")).sort()
    : [];
  return {
    id: o.id, ordner: o.ordner,
    dateien: galerieOrdnung(o.ordner.split("/")[0], o.id, vorhanden),
  };
});

// Regionen und Startseite liegen flach, ohne Objektordner
const flach = {};
for (const bereich of ["regionen", "hero", "avatare", "agent"]) {
  const p = path.join(ZIEL, bereich);
  if (!fs.existsSync(p)) continue;
  for (const f of fs.readdirSync(p).filter((f) => f.endsWith(".jpg"))) {
    flach[`${bereich}/${f.replace(/\.jpg$/, "")}`] = `img/${bereich}/${f}`;
  }
}

const js = `// Automatisch erzeugt von bilder/einbauen.mjs — nicht von Hand bearbeiten.
// Ordnet jeder Objekt-ID ihre Bildpfade zu.

const BILDER = {
${eintraege.map((e) => `  "${e.id}": [${e.dateien.map((d) => `"img/${e.ordner}/${d}"`).join(", ")}]`).join(",\n")}
};

const BILDER_EINZELN = ${JSON.stringify(flach, null, 2).replace(/\n/g, "\n")};

// Bildpfade eines Objekts. Erstes Bild ist das Titelbild.
function bilderVon(id) {
  return BILDER[id] || [];
}

function titelbildVon(id) {
  return (BILDER[id] || [])[0] || "";
}

function regionsbild(slug) {
  return BILDER_EINZELN["regionen/" + slug] || "";
}

function herobild(name) {
  return BILDER_EINZELN["hero/" + name] || "";
}

function avatarbild(nummer) {
  return BILDER_EINZELN["avatare/" + nummer] || "";
}

function agentbild(name = "marke") {
  return BILDER_EINZELN["agent/" + name] || "";
}
`;

fs.writeFileSync(path.join(root, "data/bildpfade.js"), js, "utf8");

const mb = (b) => (b / 1024 / 1024).toFixed(1);
console.log(`Umgewandelt: ${umgewandelt}, übersprungen: ${uebersprungen}`);
if (umgewandelt) {
  console.log(`Größe: ${mb(bytesVorher)} MB → ${mb(bytesNachher)} MB ` +
    `(${Math.round((1 - bytesNachher / bytesVorher) * 100)} % kleiner)`);
}
console.log(`\ndata/bildpfade.js geschrieben: ${eintraege.length} Objekte, ${Object.keys(flach).length} Einzelbilder.`);
