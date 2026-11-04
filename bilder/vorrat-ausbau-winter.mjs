/* Ordnet den Haeusern (h219 bis h404) und Wohnungen (a161 bis a202) des
 * Winterausbaus Bilder aus dem Vorrat zu.
 *
 * Gleiche Logik wie vorrat-neue-haeuser.mjs, nur mit der Quelle
 * bilder/specs/ausbau-2026-11-01/*.json statt data/hotels.js - die Haeuser
 * stehen noch nicht im Katalog.
 *
 * Diese Haeuser haben KEINE KI-Aussenansicht. Position 1 traegt den Ort und
 * bleibt Titelbild, deshalb muessen ihre ids beim Einbau in einbauen.mjs in
 * TITEL_BLEIBT_EINS landen.
 *
 *   node bilder/vorrat-ausbau-winter.mjs          nur planen, nichts anfassen
 *   node bilder/vorrat-ausbau-winter.mjs --tun    kopieren und Vorrat buchen
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const SPECS = path.join(dir, "specs/ausbau-2026-11-01");
const VORRAT = path.join(dir, "pool/vorrat.json");
const PLAN = path.join(SPECS, "bildplan.json");
const tun = process.argv.includes("--tun");

const slug = (t) => t.toLowerCase()
  .replaceAll("ä", "ae").replaceAll("ö", "oe").replaceAll("ü", "ue").replaceAll("ß", "ss")
  .replaceAll("á", "a").replaceAll("é", "e").replaceAll("í", "i").replaceAll("ó", "o").replaceAll("ú", "u")
  .replaceAll("à", "a").replaceAll("è", "e").replaceAll("ò", "o").replaceAll("ç", "c").replaceAll("ñ", "n")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const haeuser = [];
for (const datei of fs.readdirSync(SPECS).filter((f) => /^h\d+-h\d+-.*\.json$/.test(f)).sort()) {
  for (const h of JSON.parse(fs.readFileSync(path.join(SPECS, datei), "utf8")).hotels) {
    haeuser.push({ id: h.id, ziel: h.ziel, name: h.name, bereich: "hotels" });
  }
}
haeuser.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));

/* Wohnungen danach, nicht davor: Die Haeuser brauchen das Thema "ort" fuer
   ihr Titelbild, Wohnungen kommen auch mit "umgebung" aus. Wer zuerst
   zugreift, bekommt das knappere Thema - deshalb die Haeuser. */
const wohnungen = [];
for (const datei of fs.readdirSync(SPECS).filter((f) => /^a\d+-a\d+-.*\.json$/.test(f)).sort()) {
  for (const w of JSON.parse(fs.readFileSync(path.join(SPECS, datei), "utf8")).wohnungen) {
    wohnungen.push({ id: w.id, ziel: w.ziel, name: w.name, bereich: "wohnungen" });
  }
}
wohnungen.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));

const vorrat = JSON.parse(fs.readFileSync(VORRAT, "utf8"));

/* Benannte Hotels fliegen raus (02.11.2026).
   ------------------------------------------------------------------
   Im Thema "gebaeude" standen vier Aufnahmen, deren Alt-Text ein echtes
   Haus nennt - "Hotel Cailler", "Grand Hotel Victoria", "Hotel Splendid",
   "Hotel Riffelhaus 1853". Markenbekanntheit wirkt auf Vertrauen und
   waere in der Auswertung nicht mehr vom Agenteneffekt zu trennen; das
   ist der erste Ausschlussgrund aus PRUEFUNG.md.

   Ein abweichender Ortsname ist dagegen KEIN Ausschlussgrund - die
   Prüfanleitung lässt eine leicht abweichende Region ausdrücklich zu. */
const HOTELNAME = /\b(?:Hotel|Hostel|Resort)\s+[A-ZÄÖÜ][a-zäöüß]/;
const gesperrt = [];

/* Bevorzugt, was zum Ziel passt: Nennt der Alt-Text die eigene Region,
   rückt das Bild nach vorn. Das ersetzt keine Sichtprüfung, sortiert aber
   die offensichtlichen Fehlgriffe nach hinten. */
const ORTSWORT = {
  mallorca: /mallorca|majorca|balear|spain|spanish|mediterran/i,
  kreta: /crete|greece|greek|aegean/i,
  algarve: /algarve|portug|faro|lagos/i,
  sardinien: /sardinia|sardegna|ital/i,
  teneriffa: /tenerife|canary|canaria|spain/i,
  barcelona: /barcelona|catal|gaudi|spain/i,
  wien: /vienna|wien|austria|austrian/i,
  lissabon: /lisbon|lisboa|portug|azulejo/i,
  tirol: /tyrol|tirol|austria|alpine|alps/i,
  suedtirol: /south tyrol|alto adige|dolomit|ital|alpine/i,
  lappland: /lapland|finland|finnish|nordic|arctic/i,
  ostsee: /baltic|german|ruegen|usedom/i,
  marrakesch: /marrakech|marrakesh|morocc|riad|medina/i,
  kapstadt: /cape town|south africa|cape dutch/i,
  krabi: /krabi|thai|thailand|ao nang/i,
  island: /iceland|icelandic|reykjav/i,
  newyork: /new york|nyc|brooklyn|manhattan|soho|harlem/i,
  kyoto: /kyoto|japan|japanese|machiya|ryokan/i,
};

/* Kirchen, Tempel und Denkmaeler nach hinten (02.11.2026).
   ------------------------------------------------------------------
   Die Gebaeudesuche liefert Architektur, nicht zwingend Unterkuenfte:
   Fuer Wien kam die Karlskirche, fuer Krabi ein Tempel. Wahrzeichen des
   Ziels sind nach PRUEFUNG.md ausdruecklich erlaubt - als Bild DES
   HAUSES sind sie aber irrefuehrend. Sie werden deshalb nicht gesperrt,
   sondern zuletzt genommen: In sechs Zielen reicht der Vorrat sonst
   nicht, und ein Wahrzeichen ist immer noch besser als eine Luecke.

   Die Liste musste zweimal wachsen. Erst stand dort nur church, temple
   und dergleichen - durch kamen die Wiener Staatsoper ("opera house",
   kein Sakralbau) und Wat Benchamabophit, dessen Alt-Text das Wort
   "temple" gar nicht enthaelt, sondern das thailaendische "Wat".
   Dieses Muster faengt die haeufigen Faelle, nicht alle: Ob ein Bild
   nach Unterkunft aussieht, entscheidet am Ende das Auge am
   Kontaktbogen, nicht ein regulaerer Ausdruck. */
const SAKRAL = /church|temple|cathedral|basilica|mosque|shrine|monument|memorial|\bwat\b|pagoda|opera house|theatre|theater|museum|palace|castle|fortress|city hall|town hall|parliament|library/i;

const frei = {};
for (const v of vorrat) {
  if (v.verwendet) continue;
  if (v.thema === "gebaeude" && HOTELNAME.test(v.alt || "")) { gesperrt.push(v); continue; }
  ((frei[v.ziel] ||= {})[v.thema] ||= []).push(v);
}
for (const z of Object.keys(frei)) {
  const passt = ORTSWORT[z];
  for (const t of Object.keys(frei[z])) {
    const sakralZuletzt = t === "gebaeude";
    frei[z][t].sort((a, b) => {
      if (sakralZuletzt) {
        const sa = SAKRAL.test(a.alt || "") ? 1 : 0;
        const sb = SAKRAL.test(b.alt || "") ? 1 : 0;
        if (sa !== sb) return sa - sb;
      }
      if (passt) {
        const pa = passt.test(a.alt || "") ? 0 : 1;
        const pb = passt.test(b.alt || "") ? 0 : 1;
        if (pa !== pb) return pa - pb;
      }
      return a.pexels_id - b.pexels_id;
    });
  }
}
if (gesperrt.length) {
  console.log(`${gesperrt.length} Bilder wegen benanntem Hotel übersprungen: `
    + gesperrt.map((v) => `${v.ziel}/${v.pexels_id}`).join(", "));
}

/* Je Position die bevorzugten Themen, danach Ersatz. Haeuser tragen auf
   Position 1 den Ort, Wohnungen duerfen dort auch die Umgebung nehmen -
   genauso haelt es auto-zuordnen-katalog.mjs fuer den Bestand. */
/* Je Position ein eigenes Thema (02.11.2026).
   ------------------------------------------------------------------
   Vorher stand fuer Position 2 und 3 dieselbe Liste, und Position 3 griff
   einfach zum naechsten Bild derselben Sorte. Ergebnis: bei 292 von 335
   Objekten zweimal dasselbe Thema - zweimal Lobby, zweimal Pool, bei
   Khao Thong zweimal Longtailboote. Gemeldet vom Nutzer am 02.11.2026.

   Der zweite Teil der Meldung ("man sieht das Hotel fast gar nicht")
   liess sich mit Stockmaterial NICHT loesen. Versucht wurde ein eigenes
   Thema "gebaeude" auf Position 2. Das Ergebnis war schlechter als der
   Ausgangszustand: Fuer Khao Thong in Krabi stand dort die Skyline von
   Bangkok, weil im Alt-Text "Thailand" vorkommt und ein Alt-Text nicht
   zwischen "Gebaeude im richtigen Land" und "glaubwuerdige Unterkunft am
   richtigen Ort" unterscheiden kann. Acht Zielen fehlten passende
   Gebaeudebilder ohnehin ganz, dem Algarve alle.

   Position 2 traegt deshalb wieder ein Innenbild (Pool, Wellness oder
   Lobby) - davon gibt es ueberall genug, und es kann thematisch nicht
   danebenliegen. Das Thema "gebaeude" bleibt als letzter Rueckfall im
   Vorrat, falls einmal nichts anderes da ist.

   Ein bestimmtes Haus zeigen koennen nur die KI-Aussenansichten, die die
   Haeuser h01 bis h184 haben. Mit Stockfotos geht das nicht. */
const PLAN_HOTEL = [
  ["1", ["ort"]],
  ["2", ["pool", "wellness", "lobby", "umgebung", "gebaeude"]],
  ["3", ["umgebung", "gebaeude", "pool", "wellness", "lobby"]],
  ["4", ["zimmer"]],
  ["5", ["essen"]],
];
const PLAN_WOHNUNG = [
  ["1", ["ort", "umgebung"]],
  ["2", ["wohnen"]],
  ["3", ["kueche", "lobby", "wohnen"]],
  ["4", ["zimmer", "wohnen"]],
  ["5", ["umgebung", "gebaeude", "essen"]],
];

const plan = [];
const fehlt = [];
for (const o of [...haeuser, ...wohnungen]) {
  const f = frei[o.ziel] || {};
  const nimm = (thema) => (f[thema] || []).shift() || null;
  const bilder = {};
  /* Kein Thema zweimal am selben Objekt - das war der eigentliche Fehler.
     Erst wenn ein Objekt sonst leer bliebe, ist eine Wiederholung erlaubt. */
  const benutzteThemen = new Set();
  for (const [pos, themen] of (o.bereich === "hotels" ? PLAN_HOTEL : PLAN_WOHNUNG)) {
    let gesetzt = false;
    for (const t of themen) {
      if (benutzteThemen.has(t)) continue;
      const b = nimm(t);
      if (b) { bilder[pos] = b; benutzteThemen.add(t); gesetzt = true; break; }
    }
    if (gesetzt) continue;
    // Notnagel: lieber ein zweites Bild desselben Themas als eine Luecke
    for (const t of themen) { const b = nimm(t); if (b) { bilder[pos] = b; break; } }
  }
  const da = Object.entries(bilder).filter(([, b]) => b);
  if (da.length < 4) fehlt.push(`${o.id} ${o.ziel} (${da.length})`);
  plan.push({ ...o, ordner: `${o.bereich}/${o.id}-${slug(o.name)}`, bilder: Object.fromEntries(da) });
}

const zahl = plan.map((p) => Object.keys(p.bilder).length);
console.log(`${haeuser.length} Haeuser und ${wohnungen.length} Wohnungen. Bilder je Objekt: min ${Math.min(...zahl)}, max ${Math.max(...zahl)}, Summe ${zahl.reduce((a, b) => a + b, 0)}`);
const ohneOrt = plan.filter((p) => !p.bilder["1"]).map((p) => p.id);
if (ohneOrt.length) console.log(`Ohne Titelbild (Thema "ort"): ${ohneOrt.join(", ")}`);
if (fehlt.length) console.log(`Zu wenig Vorrat: ${fehlt.join(", ")}`);

// Doppelt vergebene Dateien waeren der schlimmste Fehler: gleiche Vorschaubilder
const gesehen = new Set();
const doppelt = [];
for (const p of plan) for (const b of Object.values(p.bilder)) {
  if (gesehen.has(b.datei)) doppelt.push(b.datei); else gesehen.add(b.datei);
}
console.log(doppelt.length ? `DOPPELT: ${doppelt.length}` : "Keine Datei doppelt vergeben.");

fs.writeFileSync(PLAN, JSON.stringify(plan.map((p) => ({
  id: p.id, ziel: p.ziel, bereich: p.bereich, ordner: p.ordner,
  bilder: Object.fromEntries(Object.entries(p.bilder).map(([k, b]) => [k, b.datei])),
})), null, 1));
console.log(`Plan geschrieben: ${path.relative(path.join(dir, ".."), PLAN)}`);

if (!tun) { console.log("\nNur Vorschau. Mit --tun wird nach bilder/generiert kopiert und der Vorrat gebucht."); process.exit(0); }

let kopiert = 0;
for (const p of plan) {
  const ziel = path.join(dir, "generiert", p.ordner);
  fs.mkdirSync(ziel, { recursive: true });
  for (const [pos, b] of Object.entries(p.bilder)) {
    const von = path.join(dir, "pool", b.datei);
    if (!fs.existsSync(von)) { console.log(`FEHLT: ${von}`); continue; }
    fs.copyFileSync(von, path.join(ziel, `${pos}.jpg`));
    b.verwendet = `${p.id}/${pos}`;
    kopiert++;
  }
}
fs.writeFileSync(VORRAT, JSON.stringify(vorrat, null, 1));
console.log(`${kopiert} Bilder kopiert, Vorrat gebucht.`);
console.log("Jetzt: ids in einbauen.mjs zu TITEL_BLEIBT_EINS, dann node bilder/einbauen.mjs");
