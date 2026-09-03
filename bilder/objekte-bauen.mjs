// Baut Katalogeintraege aus einer knappen Beschreibung.
//
// Von Hand kommt nur, was man auf der Seite tatsaechlich liest: Name, Ort,
// Kurz- und Langbeschreibung, Highlights. Alles Schematische - Zimmer,
// Verpflegung, Ausstattung, Teilnoten - wird hier erzeugt.
//
// Handgeschriebene Bewertungen entfallen: die macht data/bewertungen.js aus
// den Teilnoten, und zwar so viele, wie das Haus ausweist.
//
//   node bilder/objekte-bauen.mjs spec.json > block.js

import fs from "node:fs";

// --- Ausstattung je Kategorie -------------------------------------------
const AUSSTATTUNG = {
  strand:   ["pool", "wifi", "restaurant", "bar", "aircon", "beachfront", "parking", "seaView"],
  familie:  ["pool", "wifi", "restaurant", "bar", "aircon", "familyFriendly", "kidsClub", "parking"],
  boutique: ["wifi", "restaurant", "bar", "aircon", "terrace"],
  luxus:    ["pool", "spa", "wifi", "restaurant", "bar", "aircon", "gym", "parking", "terrace"],
  stadt:    ["wifi", "restaurant", "bar", "aircon", "terrace"],
  finca:    ["pool", "wifi", "restaurant", "aircon", "parking", "terrace", "bikeRental"],
  budget:   ["wifi", "aircon", "bar"],
  apart:    ["pool", "wifi", "aircon", "parking", "familyFriendly"],
  berg:     ["spa", "wifi", "restaurant", "bar", "parking", "terrace", "gym"],
};

// --- Verpflegung je Kategorie -------------------------------------------
const VERPFLEGUNG = {
  strand:   [["fruehstueck", 0], ["halb", 28], ["ai", 58]],
  familie:  [["halb", 0], ["voll", 30], ["ai", 52]],
  boutique: [["ohne", 0], ["fruehstueck", 16]],
  luxus:    [["fruehstueck", 0], ["halb", 48]],
  stadt:    [["ohne", 0], ["fruehstueck", 18]],
  finca:    [["fruehstueck", 0], ["halb", 34]],
  budget:   [["ohne", 0], ["fruehstueck", 10]],
  apart:    [["ohne", 0], ["fruehstueck", 15], ["halb", 33]],
  berg:     [["fruehstueck", 0], ["halb", 38], ["voll", 62]],
};

// --- Zimmerkategorien ----------------------------------------------------
// Drei Stufen: Standard, gehoben, gross. Namen und Merkmale passen zur
// Kategorie, die Groesse haengt an den Sternen.
const ZIMMER = {
  strand: (s) => [
    ["Doppelzimmer Landseite", 20 + s * 2, 2, 0, ["Balkon zum Garten", "Klimaanlage"]],
    ["Doppelzimmer Meerblick", 23 + s * 2, 3, 30, ["Balkon zum Wasser", "Sitzgruppe"]],
    ["Familienzimmer", 34 + s * 3, 5, 68, ["Zwei Schlafbereiche", "Große Terrasse", "Zwei Bäder"]],
  ],
  familie: (s) => [
    ["Doppelzimmer", 20 + s * 2, 3, 0, ["Balkon", "Kühlschrank"]],
    ["Familienzimmer", 30 + s * 3, 4, 40, ["Etagenbett", "Balkon zur Anlage"]],
    ["Familiensuite", 44 + s * 3, 6, 94, ["Zwei getrennte Schlafzimmer", "Wohnbereich", "Zwei Bäder"]],
  ],
  boutique: (s) => [
    ["Zimmer Standard", 16 + s * 2, 2, 0, ["Ruhige Lage", "Holzboden"]],
    ["Zimmer Komfort", 20 + s * 2, 2, 26, ["Eigener Balkon", "Sitzecke"]],
    ["Suite", 30 + s * 3, 4, 70, ["Zwei Räume", "Dachterrasse", "Wanne"]],
  ],
  luxus: (s) => [
    ["Deluxe-Zimmer", 26 + s * 2, 2, 0, ["Private Terrasse", "Regendusche"]],
    ["Juniorsuite", 36 + s * 3, 2, 72, ["Freistehende Wanne", "Große Terrasse"]],
    ["Suite", 52 + s * 4, 3, 168, ["Privater Pool", "Zwei Terrassen", "Butlerservice"]],
  ],
  stadt: (s) => [
    ["Zimmer Hinterhof", 16 + s * 2, 2, 0, ["Ruhig zum Innenhof", "Schreibtisch"]],
    ["Zimmer Straßenseite", 20 + s * 2, 2, 24, ["Hohe Fenster", "Sitzbank am Fenster"]],
    ["Juniorsuite", 32 + s * 3, 3, 62, ["Wohnbereich", "Wanne"]],
  ],
  finca: (s) => [
    ["Zimmer Garten", 18 + s * 2, 2, 0, ["Blick ins Grüne", "Natursteinwand"]],
    ["Zimmer Terrasse", 24 + s * 2, 3, 24, ["Eigene Terrasse", "Sitzecke"]],
    ["Suite", 38 + s * 3, 4, 64, ["Zwei Räume", "Kamin", "Wanne"]],
  ],
  budget: () => [
    ["Einzelzimmer", 12, 1, -14, ["Eigenes Bad", "Schreibtisch"]],
    ["Doppelzimmer", 16, 2, 0, ["Französisches Bett", "Klimaanlage"]],
    ["Dreibettzimmer", 21, 3, 18, ["Zusatzbett", "Kleiner Balkon"]],
  ],
  apart: (s) => [
    ["Studio", 26 + s * 2, 2, 0, ["Küchenzeile", "Balkon"]],
    ["Apartment 1 Schlafzimmer", 40 + s * 2, 4, 32, ["Separates Schlafzimmer", "Schlafcouch"]],
    ["Apartment 2 Schlafzimmer", 54 + s * 3, 6, 70, ["Zwei Schlafzimmer", "Große Terrasse", "Zwei Bäder"]],
  ],
  berg: (s) => [
    ["Zimmer Tal", 20 + s * 2, 2, 0, ["Balkon ins Tal", "Holzvertäfelung"]],
    ["Zimmer Panorama", 26 + s * 2, 3, 32, ["Großer Balkon", "Sitzecke"]],
    ["Suite mit Kamin", 40 + s * 3, 4, 82, ["Zwei Räume", "Kamin", "Wanne"]],
  ],
};

// --- Teilnoten -----------------------------------------------------------
// Leiten sich aus der Gesamtnote ab, mit typischen Abweichungen je Kategorie.
// Luxushaeuser sind beim Preis schwaecher, Budgethaeuser genau umgekehrt.
const TENDENZ = {
  strand:   { lage: +0.2, sauberkeit: 0, service: 0, preis: -0.1, ausstattung: 0, essen: -0.2 },
  familie:  { lage: +0.1, sauberkeit: -0.1, service: 0, preis: 0, ausstattung: +0.2, essen: -0.3 },
  boutique: { lage: +0.2, sauberkeit: +0.1, service: +0.2, preis: -0.2, ausstattung: -0.1, essen: 0 },
  luxus:    { lage: +0.1, sauberkeit: +0.1, service: +0.1, preis: -0.6, ausstattung: +0.1, essen: +0.1 },
  stadt:    { lage: +0.3, sauberkeit: 0, service: 0, preis: -0.1, ausstattung: -0.2, essen: -0.1 },
  finca:    { lage: -0.2, sauberkeit: +0.1, service: +0.3, preis: +0.1, ausstattung: -0.1, essen: +0.2 },
  budget:   { lage: +0.3, sauberkeit: -0.1, service: -0.1, preis: +0.6, ausstattung: -0.7, essen: -0.4 },
  apart:    { lage: +0.1, sauberkeit: -0.1, service: -0.1, preis: +0.3, ausstattung: 0, essen: -0.4 },
  berg:     { lage: +0.2, sauberkeit: +0.1, service: +0.2, preis: -0.3, ausstattung: 0, essen: +0.2 },
};

// Kleiner fester Streuwert je Haus, damit nicht alle Teilnoten gleich aussehen
function streu(text, feld) {
  let h = 2166136261;
  for (const z of text + feld) { h ^= z.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (((h >>> 0) % 21) - 10) / 100;      // -0,10 bis +0,10
}

const runde = (x) => Math.max(3.0, Math.min(5.0, Math.round(x * 10) / 10));

function teilnoten(o) {
  const t = TENDENZ[o.kategorie] || TENDENZ.strand;
  const noten = {};
  for (const feld of ["lage", "sauberkeit", "service", "preis", "ausstattung", "essen"]) {
    noten[feld] = runde(o.rating + t[feld] + streu(o.id + o.name, feld));
  }
  return noten;
}

// --- Zusammenbauen -------------------------------------------------------
// Ziele, an denen weder Aussenpool noch Klimaanlage glaubwuerdig sind
const KALTE_ZIELE = new Set(["lappland", "island", "tirol", "suedtirol", "ostsee"]);

function hotel(o) {
  const s = o.sterne;
  const zimmer = (ZIMMER[o.kategorie] || ZIMMER.strand)(s)
    .map(([name, groesse, gaeste, delta, merkmale]) =>
      `      { name: "${name}", size: ${groesse}, maxGuests: ${gaeste}, priceDelta: ${delta}, features: [${merkmale.map((m) => `"${m}"`).join(", ")}] },`)
    .join("\n");

  // Ein Aussenpool gehoert nicht an jedes Ziel: in Lappland oder an der Ostsee
  // waere er unglaubwuerdig. Wer trotzdem einen hat, traegt ihn in `extras` ein.
  const OHNE_POOL = new Set(["lappland", "island", "wien", "ostsee", "newyork", "kyoto"]);
  // Klimaanlage ebenso: an kalten Zielen hat sie kein Haus.
  const kalt = KALTE_ZIELE.has(o.ziel);
  const vorgabe = (AUSSTATTUNG[o.kategorie] || [])
    .filter((a) => !(a === "pool" && OHNE_POOL.has(o.ziel)) && !(a === "aircon" && kalt));
  const ausstattung = [...new Set([...vorgabe, ...(o.extras || [])])];
  const boards = (VERPFLEGUNG[o.kategorie] || VERPFLEGUNG.strand)
    .map(([k, d]) => `      { key: "${k}", priceDelta: ${d} },`).join("\n");
  const noten = teilnoten(o);

  return `  {
    id: "${o.id}",
    ziel: "${o.ziel}",
    name: "${o.name}",
    location: "${o.ort}",
    region: "${o.region}",
    category: "${o.kategorie === "berg" ? "finca" : o.kategorie}",
    stars: ${s},
    pricePerNight: ${o.preis},${o.altpreis ? `\n    oldPrice: ${o.altpreis},` : ""}
    rating: ${o.rating},
    reviewCount: ${o.bewertungen},
    shortDescription:
      "${o.kurz}",
    description:
      "${o.lang}",
    highlights: [${o.highlights.map((h) => `"${h}"`).join(", ")}],
    distanceToBeach: ${o.strand},
    distanceToCenter: ${o.zentrum},
    distanceToAirport: ${o.flughafen},
    amenities: [${ausstattung.map((a) => `"${a}"`).join(", ")}],
    boards: [
${boards}
    ],
    rooms: [
${zimmer}
    ],
    ratingBreakdown: { lage: ${noten.lage}, sauberkeit: ${noten.sauberkeit}, service: ${noten.service}, preis: ${noten.preis}, ausstattung: ${noten.ausstattung}, essen: ${noten.essen} },
  },`;
}

function wohnung(o) {
  const basis = ["wifi", "kitchen", "washer", ...(o.extras || [])];
  if (o.kategorie !== "berg" && !KALTE_ZIELE.has(o.ziel)) basis.push("aircon");
  const ausstattung = [...new Set(basis)];
  const t = { lage: +0.1, sauberkeit: 0, ausstattung: 0, preis: +0.2, kommunikation: +0.2, checkin: 0 };
  const noten = {};
  for (const feld of Object.keys(t)) noten[feld] = runde(o.rating + t[feld] + streu(o.id + o.name, feld));

  return `  {
    id: "${o.id}", type: "apartment",
    ziel: "${o.ziel}",
    name: "${o.name}",
    location: "${o.ort}", region: "${o.region}",
    pricePerNight: ${o.preis}, rating: ${o.rating}, reviewCount: ${o.bewertungen},
    bedrooms: ${o.schlafzimmer}, bathrooms: ${o.baeder}, size: ${o.groesse}, maxGuests: ${o.gaeste},
    shortDescription: "${o.kurz}",
    description: "${o.lang}",
    highlights: [${o.highlights.map((h) => `"${h}"`).join(", ")}],
    amenities: [${ausstattung.map((a) => `"${a}"`).join(", ")}],
    distanceToBeach: ${o.strand}, distanceToCenter: ${o.zentrum},
    minNights: ${o.minNaechte || 3}, cleaningFee: ${o.reinigung},
    ratingBreakdown: { lage: ${noten.lage}, sauberkeit: ${noten.sauberkeit}, ausstattung: ${noten.ausstattung}, preis: ${noten.preis}, kommunikation: ${noten.kommunikation}, checkin: ${noten.checkin} },
  },`;
}

const spec = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const hotels = (spec.hotels || []).map(hotel).join("\n");
const wohnungen = (spec.wohnungen || []).map(wohnung).join("\n");

fs.writeFileSync("/tmp/block-hotels.js", hotels);
fs.writeFileSync("/tmp/block-wohnungen.js", wohnungen);

// Zuordnungsdatei fuer die Bilder gleich mit erzeugen
const zuordnung = {};
const slug = (t) => t.toLowerCase()
  .replaceAll("ä","ae").replaceAll("ö","oe").replaceAll("ü","ue").replaceAll("ß","ss")
  .replaceAll("á","a").replaceAll("é","e").replaceAll("í","i").replaceAll("ó","o").replaceAll("ú","u")
  .replaceAll("à","a").replaceAll("è","e").replaceAll("ò","o").replaceAll("ç","c").replaceAll("ñ","n")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
for (const o of spec.hotels || []) if (o.bilder) zuordnung[o.id] = { ordner: `hotels/${o.id}-${slug(o.name)}`, bilder: o.bilder };
for (const o of spec.wohnungen || []) if (o.bilder) zuordnung[o.id] = { ordner: `wohnungen/${o.id}-${slug(o.name)}`, bilder: o.bilder };
fs.writeFileSync("/tmp/zuordnung.json", JSON.stringify(zuordnung, null, 2));

console.error(`${(spec.hotels || []).length} Hotels, ${(spec.wohnungen || []).length} Wohnungen gebaut.`);
console.error("Bloecke: /tmp/block-hotels.js, /tmp/block-wohnungen.js");
console.error("Zuordnung: /tmp/zuordnung.json");
