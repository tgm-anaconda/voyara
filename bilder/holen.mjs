// Helfer fuer den Browser-Weg: sagt an, welcher Prompt als naechstes dran ist,
// und ordnet heruntergeladene Bilder dem richtigen Zieldateinamen zu.
//
//   node bilder/holen.mjs status            Fortschritt anzeigen
//   node bilder/holen.mjs next 3            die naechsten 3 offenen Prompts ausgeben
//   node bilder/holen.mjs save hotels/h01-1.png
//                                           neuestes Bild aus ~/Downloads dorthin ablegen
//   node bilder/holen.mjs fehlend           alle noch offenen Zieldateien auflisten
//
// "save" nimmt immer die zuletzt heruntergeladene Bilddatei. Deshalb nach jedem
// einzelnen Download sofort speichern, bevor der naechste Download startet.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(dir, "generiert");
const EINGANG = path.join(dir, "eingang");
const DOWNLOADS = path.join(os.homedir(), "Downloads");
const IMG_EXT = [".png", ".webp", ".jpg", ".jpeg"];

// Wo nach frisch heruntergeladenen Bildern gesucht wird.
// Reihenfolge: eigener Ordner "eingang" zuerst, sonst der Download-Ordner.
// Ueberschreibbar mit  VOYARA_DL="/pfad/zum/ordner"
function watchFolders() {
  if (process.env.VOYARA_DL) return [process.env.VOYARA_DL];
  return [EINGANG, DOWNLOADS];
}

const prompts = JSON.parse(fs.readFileSync(path.join(dir, "prompts.json"), "utf8"));
const isDone = (file) => fs.existsSync(path.join(OUT, file));
const open = () => prompts.filter((p) => !isDone(p.file));

const [, , cmd, ...args] = process.argv;

function status() {
  const total = prompts.length;
  const offen = open().length;
  console.log(`Fertig: ${total - offen} von ${total}. Offen: ${offen}.`);
}

function next() {
  const n = Number(args[0]) || 1;
  const batch = open().slice(0, n);
  if (!batch.length) return console.log("Nichts mehr offen.");

  batch.forEach((p, i) => {
    console.log(`\n──────── ${i + 1} ────────`);
    console.log(`DATEI: ${p.file}`);
    console.log(`PROMPT:\n${p.prompt}`);
  });
  console.log(`\n(${open().length} insgesamt noch offen)`);
}

function newestDownload() {
  const files = [];
  for (const folder of watchFolders()) {
    if (!fs.existsSync(folder)) continue;
    for (const f of fs.readdirSync(folder)) {
      if (!IMG_EXT.includes(path.extname(f).toLowerCase())) continue;
      const full = path.join(folder, f);
      files.push({ full, name: f, folder, time: fs.statSync(full).mtimeMs });
    }
  }
  files.sort((a, b) => b.time - a.time);
  return files[0] || null;
}

function save() {
  const target = args[0];
  if (!target) return console.error("Zieldatei fehlt. Beispiel: save hotels/h01-1.png");

  const known = prompts.find((p) => p.file === target);
  if (!known) console.warn(`Warnung: ${target} steht nicht in prompts.json.`);

  const src = newestDownload();
  if (!src) return console.error(`Keine Bilddatei gefunden in:\n  ${watchFolders().join("\n  ")}`);

  const alter = Math.round((Date.now() - src.time) / 1000);
  if (alter > 600) {
    console.error(`Neueste Bilddatei ist ${alter}s alt ("${src.name}") — das ist vermutlich nicht der frische Download.`);
    console.error("Abgebrochen. Bitte Download pruefen.");
    process.exit(1);
  }

  const dest = path.join(OUT, target);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(src.full, dest);

  const kb = Math.round(fs.statSync(dest).size / 1024);
  const woher = src.folder === EINGANG ? "eingang" : path.basename(src.folder);
  console.log(`Gespeichert: ${target}  (${kb} KB, aus ${woher}/"${src.name}")`);
  status();
}

function fehlend() {
  const list = open();
  console.log(`${list.length} offen:`);
  list.forEach((p) => console.log(`  ${p.file}`));
}

switch (cmd) {
  case "status": status(); break;
  case "next": next(); break;
  case "save": save(); break;
  case "fehlend": fehlend(); break;
  default:
    console.log(`Befehle:
  status              Fortschritt
  next [n]            naechste n offene Prompts ausgeben
  save <zieldatei>    neuesten Download dorthin ablegen
  fehlend             alle offenen Zieldateien

Gesucht wird nach Downloads in:
  ${watchFolders().join("\n  ")}`);
}
