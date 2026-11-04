// Ordnet jedem Katalogobjekt ohne Bildordner fuenf Stockbilder zu -
// Ferienwohnungen wie Hotels.
//
// Wohnungen bekommen keine KI-Aussenansicht, also ist auch Position 2 frei:
// 1 Ort, 2 Wohnen, 3 Kueche, 4 Zimmer, 5 Umgebung.
// Hotels folgen dem Aufbau der zuletzt gebauten Haeuser (h480 aufwaerts):
// 1 Ort, 2 Pool/Wellness/Lobby, 3 Umgebung, 4 Zimmer, 5 Essen.
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
  + "\nmodule.exports = { APARTMENTS, HOTELS };";
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

// Wahrzeichen, Verkehrsbauten und Innenstadtkulissen. An Position 5 (Umgebung)
// gehoeren sie hin - eine Skyline ist in Barcelona die Umgebung. An Position 1
// nicht: dort steht das Titelbild der Wohnung, und eine Kathedrale ist keine
// Unterkunft. In den Innenraeumen schon gar nicht (eine Moschee als
// Schlafzimmer war einer der Befunde, die diesen Filter ausgeloest haben).
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
// Das Umgebungsbild darf ein Wahrzeichen zeigen - bei Wohnungen steht es auf
// Position 5, bei Hotels auf Position 3.
const umgebungsPosition = (art) => (art === "hotels" ? "3" : "5");
const alt = {};
const vorratAlt = {};
const fotograf = {};
for (const v of vorrat) {
  alt[v.pexels_id] = (v.alt || "").toLowerCase();
  vorratAlt[v.pexels_id] = v.alt || "";
  fotograf[v.pexels_id] = v.fotograf || "";
}
const landmarke = (id) => UNPASSEND.some((w) => alt[id].includes(w));

// Fremde Orte an den sichtbaren Ortspositionen. "Hotel Puerta de Sevilla" als
// Titelbild einer Wohnung auf Mallorca und ein Hochgeschwindigkeitszug in
// Madrid in der Algarve waren zwei der Befunde. Innenraumbilder bleiben frei:
// dort sieht man die Stadt nicht, und der Alt-Text wandert nicht auf die Seite.
const ORTSNAMEN = JSON.parse(fs.readFileSync(path.join(dir, "ortsnamen.json"), "utf8"));

const fremderOrt = (ziel, id) => {
  const erlaubt = new Set(ORTSNAMEN.erlaubt[ziel] || []);
  const text = (vorratAlt[id] || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const woerter = text.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || [];
  return woerter.some((w) => ORTSNAMEN.fremd.includes(w) && !erlaubt.has(w));
};

// Weihnachtsdeko ist in jedem Innenraum sichtbar und passt zu keiner Buchung
// ausserhalb des Dezembers. Der Katalog kennt keine Jahreszeit je Bild.
const FEIERTAG = ["christmas", "holiday decor", "holiday ornament", "advent",
  "santa", "xmas", "festive"];
const feiertag = (id) => FEIERTAG.some((w) => (vorratAlt[id] || "").toLowerCase().includes(w));

// Eine Hochhauskulisse ist in New York die Wahrheit und auf Island eine
// Erfindung - "Hotelkomplex zwischen Buerotuermen in der Innenstadt einer
// Megapolis" stand als Titelbild bei einer Huette am Polarkreis.
// Am Titelbild hat ein Haus Vorrang vor einer blossen Landschaft: Dort soll
// zu sehen sein, WO man wohnt, nicht nur WO man ist. Kein harter Filter -
// reicht der Vorrat nicht, ist eine Bergkulisse besser als gar nichts.
const BAUWERK = ["building", "house", "facade", "hotel", "chalet", "cabin",
  "guesthouse", "apartment", "villa", "cottage", "architecture", "balcon",
  "roof", "street", "village", "town", "courtyard", "terrace", "window"];
const bauwerk = (id) => BAUWERK.some((w) => alt[id].includes(w));

// Ein gedeckter Tisch ist bei Hotels Position 5 und damit richtig - als
// TITELBILD einer Wohnung ist er es nicht.
const GASTRONOMIE = ["tapas", "restaurant", "cocktail bar", "dining table",
  "table setting", "breakfast buffet"];
const gastronomie = (id) => GASTRONOMIE.some((w) => alt[id].includes(w));

const GROSSSTADT = ["megapolis", "downtown", "business cent", "high-rise", "highrise",
  // Ein Glasturm "in a city environment" als Titelbild fuer ein Kaufmannshaus
  // von 1908 in einem Ort mit 1100 Einwohnern - das war der Befund, der diese
  // Woerter hinzugefuegt hat (04.11.2026).
  "city environment", "cityscape", "urban", "metropolis", "city center",
  "city centre", "skyline"];
const STADTZIEL = new Set(["barcelona", "wien", "lissabon", "newyork", "kyoto", "marrakesch", "kapstadt"]);
const grossstadt = (ziel, id) =>
  !STADTZIEL.has(ziel) && GROSSSTADT.some((w) => alt[id].includes(w));

// Position -> bevorzugtes Thema, danach Ersatz
const PLAN_WOHNUNG = [
  ["1", ["ort", "umgebung"]],
  ["2", ["wohnen"]],
  ["3", ["kueche", "wohnen", "lobby", "umgebung"]],
  ["4", ["zimmer", "wohnen"]],
  ["5", ["umgebung", "ort", "lobby"]],
];
// Position 2 haengt an der Ausstattung: ein Poolbild bei einem Haus ohne Pool
// widerspricht der Filterspalte und dem Beschreibungstext.
const planHotel = (h) => [
  ["1", ["ort", "umgebung"]],
  ["2", [
    ...((h.amenities || []).includes("pool") ? ["pool"] : []),
    ...((h.amenities || []).some((a) => ["spa", "wellness", "sauna", "hallenbad"].includes(a))
      ? ["wellness"] : []),
    "lobby", "wohnen", "umgebung",
  ]],
  ["3", ["umgebung", "ort"]],
  ["4", ["zimmer", "wohnen"]],
  ["5", ["essen", "lobby", "kueche"]],
];

const bestandAus = (ordner) => fs.existsSync(path.join(dir, ordner))
  ? fs.readdirSync(path.join(dir, ordner)).map((n) => n.split("-")[0]) : [];
const bestand = new Set([...bestandAus("generiert/wohnungen"), ...bestandAus("generiert/hotels")]);

const zuordnung = {};
const luecken = [];
// Jedes Bild wird nur einmal vergeben, deshalb reicht ein Satz ueber den
// ganzen Lauf; die Wohnungen eines Ziels koennen sich nicht in die Quere
// kommen. Reicht ein Thema nicht fuer alle Wohnungen, rueckt das Ersatzthema
// nach - lieber ein Wohnzimmer statt einer Kueche als zweimal dasselbe Bild.
const vergeben = new Set();
// Am Titelbild zusaetzlich: in einer Region kein zweites Bild desselben
// Fotografen. Stockfotos kommen in Serien, zwei Bilder derselben Serie zeigen
// dasselbe Haus aus zwei Winkeln - und dann sehen zwei Angebote gleich aus.
// Nur an Position 1: in den Innenraeumen stammt fast der ganze Vorrat von
// wenigen Innenraumfotografen, dort waere die Regel nicht zu erfuellen.
// Schon vergebene Titelbild-Fotografen aus frueheren Laeufen. Ohne das
// gilt die Regel nur innerhalb eines Laufs, und ein spaeterer Nachtrag
// bekaeme wieder dieselbe Fotoserie wie ein frueher gebautes Haus.
const fotografen = {};
for (const v of vorrat) {
  if (!v.verwendet || !String(v.verwendet).endsWith("/1")) continue;
  (fotografen[v.ziel] ||= new Set()).add(v.fotograf || "");
}

const objekte = [
  ...modul.exports.APARTMENTS.map((w) => ({ ...w, art: "wohnungen", plan: PLAN_WOHNUNG })),
  ...modul.exports.HOTELS.map((h) => ({ ...h, art: "hotels", plan: planHotel(h) })),
];

for (const w of objekte) {
  if (bestand.has(w.id)) continue;
  const f = frei[w.ziel] || {};
  const bilder = {};
  const genutzt = (fotografen[w.ziel] ||= new Set());

  for (const [position, themen] of w.plan) {
    for (const thema of themen) {
      const passt = (id) => !vergeben.has(id)
        && (position === umgebungsPosition(w.art) || !landmarke(id))
        && !((position === "1" || position === umgebungsPosition(w.art))
          && fremderOrt(w.ziel, id))
        && !feiertag(id)
        && !(position === "1" && grossstadt(w.ziel, id))
        && !(position === "1" && gastronomie(id))
        && !(position === "1" && genutzt.has(fotograf[id]));
      const kandidaten = (f[thema] || []).filter(passt);
      const treffer = position === "1"
        ? (kandidaten.find(bauwerk) ?? kandidaten[0])
        : kandidaten[0];
      if (treffer === undefined) continue;
      vergeben.add(treffer);
      if (position === "1") genutzt.add(fotograf[treffer]);
      bilder[position] = treffer;
      break;
    }
  }
  if (Object.keys(bilder).length < 5) luecken.push(`${w.id} (${Object.keys(bilder).length})`);
  zuordnung[w.id] = { ordner: `${w.art}/${w.id}-${slug(w.name)}`, bilder };
}

fs.writeFileSync("/tmp/auto-zuordnung-katalog.json", JSON.stringify(zuordnung, null, 1));
console.log(`${Object.keys(zuordnung).length} Objekte zugeordnet.`);
if (luecken.length) console.log("Unvollstaendig:", luecken.join(", "));
