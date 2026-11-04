// Prueft die fertige Bildzuordnung, BEVOR eingebaut wird - und schreibt dazu
// einen Kontaktbogen, auf dem jede Zeile eine Wohnung ist.
//
//   node bilder/zuordnung-pruefen.mjs [pfad-zur-zuordnung.json] [ziel]
//   node bilder/zuordnung-pruefen.mjs --eingebaut        alles, was schon liegt
//
// --eingebaut prueft nur die INHALTLICHEN Regeln (Region, Wahrzeichen,
// fremde Orte, Feiertagsdeko, Fotoserie am Titelbild). Die strukturellen
// - Zahl der Bilder, Thema je Position, Doppelungen zwischen Haeusern -
// bleiben aussen vor: Die frueher gebauten Haeuser folgen aelteren
// Bildplaenen (h01 bis h184 haben auf Position 2 eine KI-Aussenansicht,
// die ersten Wohnungen eine ganz andere Reihenfolge), das waeren 457
// Befunde ueber Entscheidungen, die bewusst so getroffen wurden.
//
// Was eine Maschine pruefen kann, prueft sie hier: Zahl der Bilder, Doppelungen
// innerhalb eines Hauses und zwischen Haeusern, richtige Region, Thema je
// Position, Verdachtswoerter im Alt-Text. Was sie nicht kann - ob ein Bild als
// Unterkunft an diesem Ort glaubwuerdig ist -, entscheidet das Auge am
// Kontaktbogen (siehe PRUEFUNG.md).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const argumente = process.argv.slice(2);
const nurZiel = argumente.find((a) => !a.includes("/") && !a.endsWith(".json"));
const quelle = argumente.find((a) => a.endsWith(".json")) || "/tmp/auto-zuordnung-katalog.json";
/* --eingebaut baut die Zuordnung aus dem Vorrat zurueck: Jedes benutzte
   Bild traegt dort "verwendet": "h27/3". So laesst sich der FERTIGE Stand
   gegen dieselben Regeln pruefen - noetig, sobald eine Regel strenger
   wird, denn die eingebauten Haeuser wurden gegen die alte geprueft. */
const eingebaut = argumente.includes("--eingebaut");
const zuordnung = eingebaut ? {} : JSON.parse(fs.readFileSync(quelle, "utf8"));
const vorrat = JSON.parse(fs.readFileSync(path.join(dir, "pool/vorrat.json"), "utf8"));
const nach = new Map(vorrat.map((v) => [v.pexels_id, v]));
if (eingebaut) {
  for (const v of vorrat) {
    if (!v.verwendet) continue;
    const [objekt, position] = String(v.verwendet).split("/");
    if (!objekt || !position) continue;
    ((zuordnung[objekt] ||= { ordner: objekt, bilder: {} }).bilder)[position] = v.pexels_id;
  }
}

const katalog = ["../data/hotels.js", "../data/inventory.js"]
  .map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n")
  + "\nmodule.exports = { APARTMENTS, HOTELS };";
const modul = { exports: {} };
new Function("module", katalog)(modul);
const haus = new Map([...modul.exports.APARTMENTS, ...modul.exports.HOTELS]
  .map((o) => [o.id, o]));

// Erlaubt je Position: erstes Thema ist das gewuenschte, die weiteren sind
// die dokumentierten Ersatzthemen aus auto-zuordnen-katalog.mjs.
const PLAN_WOHNUNG = {
  1: ["ort", "umgebung"],
  2: ["wohnen"],
  3: ["kueche", "wohnen", "lobby", "umgebung"],
  4: ["zimmer", "wohnen"],
  5: ["umgebung", "ort", "lobby"],
};
const planHotel = (h) => ({
  1: ["ort", "umgebung"],
  2: [
    ...((h.amenities || []).includes("pool") ? ["pool"] : []),
    ...((h.amenities || []).some((a) => ["spa", "wellness", "sauna", "hallenbad"].includes(a))
      ? ["wellness"] : []),
    "lobby", "wohnen", "umgebung",
  ],
  3: ["umgebung", "ort"],
  4: ["zimmer", "wohnen"],
  5: ["essen", "lobby", "kueche"],
});
const planFuer = (o) => (o.id.startsWith("h") ? planHotel(o) : PLAN_WOHNUNG);

// Menschen und Marken sind Ausschlussgruende, nicht Geschmacksfragen.
const VERDACHT = ["woman", "man ", " men ", "people", "person", "child", "family",
  "couple", "smiling", "guest", "tourist", "portrait", "logo", "brand", "signage"];
// Bilder, die als Unterkunft unglaubwuerdig sind: Wahrzeichen, Verkehrsbauten,
// Innenstadtkulissen. Nur ein Vorsortierer, kein Urteil.
const UNPASSEND = ["bridge", "skyline", "cathedral", "temple", "mosque", "museum",
  "stadium", "airport", "train station", "highway", "shopping mall", "office building",
  "skyscraper", "monument", "statue ", "golden pavilion", "monastery", "church",
  "chapel", "basilica", "abbey", "shrine", "pagoda", "palace", "castle", "fortress",
  "city hall", "town hall", "ruins", "archaeolog", "parliament", "opera house",
  "theatre", "theater", "university", "library", "bell tower", "clock tower", "gothic", "kyoto tower", "torii", "shrine gate", "japanese gate",
  "concert hall", "harpa", "lighthouse", "arena", "exhibition",
  "terminal", "power plant", "factory", "warehouse", "greenhouse", "windmill",
  "watermill", "observatory", "planetarium", "aquarium", "zoo ",
    // Tiere sind nicht die Unterkunft, sondern Beiwerk
  "reindeer", "seagull", "sea bird"];

// Dieselbe Tabelle, die auch die Zuordnung benutzt - sonst prueft der Pruefer
// etwas anderes als das, was gebaut wurde.
const ORTSNAMEN = JSON.parse(fs.readFileSync(path.join(dir, "ortsnamen.json"), "utf8"));
// Sichtbare Ortspositionen: Titelbild und Umgebung. Bei Hotels liegt die
// Umgebung auf 3, bei Wohnungen auf 5.
const ortsposition = (id, position) =>
  position === "1" || position === (id.startsWith("h") ? "3" : "5");
const GASTRONOMIE = ["tapas", "restaurant", "cocktail bar", "dining table",
  "table setting", "breakfast buffet"];
// Grossstadtkulisse: nur in den Stadtzielen die Wahrheit, sonst eine Erfindung
const GROSSSTADT = ["megapolis", "downtown", "business cent", "high-rise", "highrise",
  "city environment", "cityscape", "urban", "metropolis", "city center",
  "city centre", "skyline"];
const STADTZIEL = new Set(["barcelona", "wien", "lissabon", "newyork", "kyoto",
  "marrakesch", "kapstadt"]);
const FEIERTAG = ["christmas", "holiday decor", "holiday ornament", "advent",
  "santa", "xmas", "festive"];

// Titelbilder einer Region duerfen nicht aus derselben Fotoserie stammen.
const titelFotograf = {};

/* Ab diesen Kennungen stammen die Objekte aus dem Ausbau vom 03./04.11.2026
   und wurden gegen die heutigen Regeln gebaut. Alles darunter ist aelterer
   Bestand: Dort gelten dieselben Regeln noch nicht, weil es sie beim Bau
   nicht gab - die Befunde dort sind eine Bestandsaufnahme, keine
   Regelverletzung. */
const NEU_AB = { h: 512, a: 203 };
const istNeu = (id) => {
  const m = /^([ha])(\d+)$/.exec(id);
  return !!m && Number(m[2]) >= NEU_AB[m[1]];
};

const fund = [];
const fundAlt = [];
let melde = (art, text) => fund.push(`${art}: ${text}`);
const benutztVon = new Map();
if (!eingebaut) {
  for (const v of vorrat) if (v.verwendet) benutztVon.set(v.pexels_id, String(v.verwendet));
}

const ersatz = {};
const wahrzeichen = [];
for (const [id, o] of Object.entries(zuordnung)) {
  const w = haus.get(id);
  melde = istNeu(id)
    ? (art, text) => fund.push(`${art}: ${text}`)
    : (art, text) => fundAlt.push(`${art}: ${text}`);
  if (!w) { melde("unbekannt", `${id} steht nicht im Katalog`); continue; }
  const ids = Object.values(o.bilder);
  if (!eingebaut && ids.length !== 5)
    melde("anzahl", `${id} hat ${ids.length} statt 5 Bilder`);
  if (new Set(ids).size !== ids.length) melde("doppelt-haus", `${id} nutzt ein Bild zweimal`);

  for (const [position, bild] of Object.entries(o.bilder)) {
    const v = nach.get(bild);
    if (!v) { melde("fehlt", `${id} Position ${position}: ${bild} nicht im Vorrat`); continue; }
    if (v.ziel !== w.ziel) melde("region", `${id} (${w.ziel}) Position ${position}: Bild aus ${v.ziel}`);
    const erlaubt = planFuer(w)[position] || [];
    if (eingebaut) { /* aeltere Bildplaene, siehe Kopf */ }
    else if (!erlaubt.includes(v.thema))
      melde("thema", `${id} Position ${position}: ${v.thema}, erlaubt ${erlaubt.join("/")}`);
    else if (v.thema !== erlaubt[0])
      (ersatz[`${position}: ${erlaubt[0]} -> ${v.thema}`] ||= []).push(id);

    const alt = (v.alt || "").toLowerCase();
    for (const wort of VERDACHT) if (alt.includes(wort))
      melde("verdacht", `${id} Position ${position} (${bild}): "${v.alt}"`);
    // An Position 5 ist ein Wahrzeichen die Umgebung und damit richtig;
    // ueberall sonst ist es ein Befund. Dieselbe Trennung wie in der Zuordnung.
    for (const wort of UNPASSEND) if (alt.includes(wort)) {
      if (position === (id.startsWith("h") ? "3" : "5")) wahrzeichen.push(`${id}: ${v.alt}`);
      else melde("unpassend", `${id} Position ${position} (${bild}): "${v.alt}"`);
      break;
    }

    if (ortsposition(id, position)) {
      const erlaubt = new Set(ORTSNAMEN.erlaubt[w.ziel] || []);
      const text = (v.alt || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const fremd = [...new Set(text.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || [])]
        .filter((n) => ORTSNAMEN.fremd.includes(n) && !erlaubt.has(n));
      if (fremd.length)
        melde("fremdort", `${id} Position ${position} (${bild}): ${fremd.join(", ")} - "${v.alt}"`);
    }
    if (position === "1" && !STADTZIEL.has(w.ziel))
      for (const wort of GROSSSTADT) if (alt.includes(wort)) {
        melde("grossstadt", `${id} Titelbild (${bild}, ${w.ziel}): "${v.alt}"`);
        break;
      }
    if (position === "1") for (const wort of GASTRONOMIE) if (alt.includes(wort)) {
      melde("gastronomie", `${id} Titelbild (${bild}): "${v.alt}"`);
      break;
    }
    for (const wort of FEIERTAG) if (alt.includes(wort)) {
      melde("feiertag", `${id} Position ${position} (${bild}): "${v.alt}"`);
      break;
    }

    if (position === "1") {
      const schluessel = `${w.ziel}|${v.fotograf}`;
      if (titelFotograf[schluessel])
        melde("fotoserie", `${id} und ${titelFotograf[schluessel]} haben beide ein Titelbild `
          + `von ${v.fotograf} (${w.ziel})`);
      titelFotograf[schluessel] = id;
    }

    const schon = benutztVon.get(bild);
    if (schon) melde("doppelt-vorrat", `${id} Position ${position}: ${bild} haengt schon an ${schon}`);
    benutztVon.set(bild, id);

    if (!fs.existsSync(path.join(dir, "pool", v.datei)))
      melde("datei", `${id} Position ${position}: pool/${v.datei} fehlt`);
  }
}

// Kontaktbogen: eine Zeile je Wohnung, nach Ziel sortiert
const zeilen = Object.entries(zuordnung)
  .map(([id, o]) => ({ id, o, w: haus.get(id) }))
  .filter((x) => x.w)
  .filter((x) => !nurZiel || x.w.ziel === nurZiel)
  .sort((a, b) => a.w.ziel.localeCompare(b.w.ziel) || a.id.localeCompare(b.id));

const html = `<!doctype html><meta charset="utf-8"><title>Zuordnung Wohnungen</title><style>
 body{margin:0;background:#fff;font-family:system-ui;font-size:11px}
 h2{margin:14px 6px 4px;font-size:13px;position:sticky;top:0;background:#fff;padding:4px 0}
 .zeile{display:grid;grid-template-columns:150px repeat(5,1fr);gap:2px;margin-bottom:2px;align-items:stretch}
 .kopf{padding:3px 5px;background:#f1f1f1;line-height:1.25;overflow:hidden}
 figure{margin:0;position:relative}
 img{width:100%;height:96px;object-fit:cover;display:block;background:#eee}
 figcaption{position:absolute;left:0;bottom:0;right:0;font-size:8px;padding:1px 3px;
  background:rgba(255,255,255,.86);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .warn img{outline:3px solid #d08b00;outline-offset:-3px}
</style>
${zeilen.map((x, i) => {
  const vorher = i === 0 || zeilen[i - 1].w.ziel !== x.w.ziel;
  const bilder = [1, 2, 3, 4, 5].map((p) => {
    const v = nach.get(x.o.bilder[p]);
    if (!v) return `<figure><img></figure>`;
    const alt = (v.alt || "").toLowerCase();
    const warn = [...VERDACHT, ...UNPASSEND].some((w) => alt.includes(w));
    return `<figure class="${warn ? "warn" : ""}"><img src="pool/${v.datei}" loading="eager">
      <figcaption>${p} ${v.thema} - ${v.alt || "ohne Alt-Text"}</figcaption></figure>`;
  }).join("");
  return `${vorher ? `<h2>${x.w.ziel}</h2>` : ""}
    <div class="zeile"><div class="kopf"><b>${x.id}</b><br>${x.w.name}</div>${bilder}</div>`;
}).join("")}`;
fs.writeFileSync(path.join(dir, "zuordnung-pruefung.html"), html);

console.log(`${Object.keys(zuordnung).length} Wohnungen geprueft, `
  + `${zeilen.length} davon auf dem Kontaktbogen${nurZiel ? ` (nur ${nurZiel})` : ""}.`);
const nachArt = {};
for (const f of fund) (nachArt[f.split(":")[0]] ||= []).push(f);
for (const [art, liste] of Object.entries(nachArt)) {
  console.log(`\n${art} (${liste.length}):`);
  for (const f of liste.slice(0, 12)) console.log("  " + f);
  if (liste.length > 12) console.log(`  ... und ${liste.length - 12} weitere`);
}
if (!fund.length) console.log("\nKeine maschinellen Befunde.");
if (fundAlt.length) {
  const nachArtAlt = {};
  for (const f of fundAlt) (nachArtAlt[f.split(":")[0]] ||= []).push(f);
  console.log(`\nAelterer Bestand (vor dem 03.11.2026 gebaut), `
    + `${fundAlt.length} Befunde - Bestandsaufnahme, keine Regelverletzung:`);
  for (const [art, liste] of Object.entries(nachArtAlt))
    console.log(`  ${art}: ${liste.length}`);
}
console.log("\nErsatzthemen (erlaubt, nur zur Kenntnis):");
for (const [k, v] of Object.entries(ersatz).sort()) console.log(`  ${k}: ${v.length}x`);
console.log(`\nUmgebungsbilder mit Wahrzeichen (in Ordnung): ${wahrzeichen.length}`);
console.log("\nJETZT ANSEHEN: bilder/zuordnung-pruefung.html");
process.exitCode = fund.length ? 1 : 0;
