// Reiseziele des Voyara-Katalogs.
//
// Voyara ist bewusst kein Mallorca-Portal mehr: Ein Buchungsportal, auf dem man
// nur im Sommer an einen einzigen Ort reisen kann, wirkt nicht wie eine echte
// Plattform. Es gibt Ziele fuer jede Jahreszeit - Wintersonne auf den Kanaren,
// Skiurlaub in Tirol, Staedtereisen ganzjaehrig, Nordlichter im finnischen
// Winter.
//
// `monate` sagt, wann das Ziel Hauptsaison hat. Daraus ergeben sich zwei Dinge:
// die Sortierung der Trefferliste nach Passung zum gewaehlten Reisezeitraum und
// der Saisonaufschlag auf den Preis.

const ZIELE = [
  {
    id: "mallorca", name: "Mallorca", land: "Spanien", typ: "strand",
    flughafen: "PMI", flughafenName: "Palma de Mallorca",
    monate: [4, 5, 6, 7, 8, 9, 10],
    kurz: "Buchten, Tramuntana und Palmas Altstadt — der Klassiker im Mittelmeer.",
  },
  {
    id: "kreta", name: "Kreta", land: "Griechenland", typ: "strand",
    flughafen: "HER", flughafenName: "Heraklion",
    monate: [5, 6, 7, 8, 9, 10],
    kurz: "Lange Sandstrände, Bergdörfer und minoische Ausgrabungen.",
  },
  {
    id: "algarve", name: "Algarve", land: "Portugal", typ: "strand",
    flughafen: "FAO", flughafenName: "Faro",
    monate: [4, 5, 6, 7, 8, 9, 10],
    kurz: "Goldene Steilküsten, Felsbögen und ruhige Fischerorte im Süden Portugals.",
  },
  {
    id: "sardinien", name: "Sardinien", land: "Italien", typ: "strand",
    flughafen: "AHO", flughafenName: "Alghero",
    monate: [6, 7, 8, 9],
    kurz: "Karibisch klares Wasser, Granitfelsen und Macchia.",
  },
  {
    id: "teneriffa", name: "Teneriffa", land: "Spanien", typ: "strand",
    flughafen: "TFS", flughafenName: "Teneriffa Süd",
    monate: [1, 2, 3, 4, 10, 11, 12],
    kurz: "Wintersonne am Atlantik, dazu der Teide und schwarze Lavastrände.",
    winterziel: true,
  },
  {
    id: "barcelona", name: "Barcelona", land: "Spanien", typ: "stadt",
    flughafen: "BCN", flughafenName: "Barcelona",
    monate: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    kurz: "Modernisme, Tapas und Stadtstrand — funktioniert das ganze Jahr.",
  },
  {
    id: "wien", name: "Wien", land: "Österreich", typ: "stadt",
    flughafen: "VIE", flughafenName: "Wien-Schwechat",
    monate: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    kurz: "Kaffeehäuser, Ringstraße und im Dezember die Christkindlmärkte.",
  },
  {
    id: "lissabon", name: "Lissabon", land: "Portugal", typ: "stadt",
    flughafen: "LIS", flughafenName: "Lissabon",
    monate: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    kurz: "Azulejos, Aussichtsterrassen und die alte Straßenbahn 28.",
  },
  {
    id: "tirol", name: "Tirol", land: "Österreich", typ: "berge",
    flughafen: "INN", flughafenName: "Innsbruck",
    monate: [1, 2, 3, 6, 7, 8, 9, 12],
    kurz: "Im Winter Skigebiete, im Sommer Almwege — zwei Saisons in einem Tal.",
    winterziel: true,
  },
  {
    id: "suedtirol", name: "Südtirol", land: "Italien", typ: "berge",
    flughafen: "VRN", flughafenName: "Verona",
    monate: [1, 2, 3, 6, 7, 8, 9, 10, 12],
    kurz: "Dolomiten, Weinberge und Südtiroler Küche zwischen zwei Sprachen.",
    winterziel: true,
  },
  {
    id: "lappland", name: "Lappland", land: "Finnland", typ: "natur",
    flughafen: "RVN", flughafenName: "Rovaniemi",
    monate: [1, 2, 3, 11, 12],
    kurz: "Polarnacht, Nordlichter und Schneewälder nördlich des Polarkreises.",
    winterziel: true,
  },
  {
    id: "ostsee", name: "Ostsee", land: "Deutschland", typ: "strand",
    flughafen: "RLG", flughafenName: "Rostock-Laage",
    monate: [5, 6, 7, 8, 9, 10],
    kurz: "Steilküste, Bäderarchitektur und Strandkörbe — auch im Herbst schön.",
  },
  {
    id: "marrakesch", name: "Marrakesch", land: "Marokko", typ: "stadt",
    flughafen: "RAK", flughafenName: "Marrakesch Menara",
    monate: [1, 2, 3, 4, 10, 11, 12],
    kurz: "Souks, Riads und der Atlas am Horizont — angenehm, wenn Europa kalt ist.",
    winterziel: true,
  },
  {
    id: "kapstadt", name: "Kapstadt", land: "Südafrika", typ: "stadt",
    flughafen: "CPT", flughafenName: "Kapstadt",
    monate: [1, 2, 3, 11, 12],
    kurz: "Tafelberg, Weingüter und Atlantikstrände — Hochsommer in unserem Winter.",
    winterziel: true,
  },
  {
    id: "krabi", name: "Krabi", land: "Thailand", typ: "strand",
    flughafen: "KBV", flughafenName: "Krabi",
    monate: [1, 2, 3, 11, 12],
    kurz: "Kalksteinfelsen, warmes Wasser und lange Trockenzeit über den Winter.",
    winterziel: true,
  },
  {
    id: "island", name: "Island", land: "Island", typ: "natur",
    flughafen: "KEF", flughafenName: "Reykjavík-Keflavík",
    monate: [1, 2, 3, 6, 7, 8, 9, 10, 11, 12],
    kurz: "Nordlichter im Winter, Mitternachtssonne im Sommer, Dampf das ganze Jahr.",
    winterziel: true,
  },
  {
    id: "newyork", name: "New York", land: "USA", typ: "stadt",
    flughafen: "JFK", flughafenName: "New York JFK",
    monate: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    kurz: "Ganzjährig, aber im Dezember zwischen Lichtern und Eisbahnen am schönsten.",
  },
  {
    id: "kyoto", name: "Kyoto", land: "Japan", typ: "stadt",
    flughafen: "KIX", flughafenName: "Osaka Kansai",
    monate: [3, 4, 5, 10, 11],
    kurz: "Kirschblüte im Frühjahr, rotes Ahornlaub im Herbst, Tempel dazwischen.",
  },
];

const ZIEL_NACH_ID = Object.fromEntries(ZIELE.map((z) => [z.id, z]));

const TYP_LABELS = {
  strand: "Strand & Meer",
  stadt: "Städtereise",
  berge: "Berge & Ski",
  natur: "Natur & Weite",
};

/* ==================================================================
   Saison
   ================================================================== */

// Wie gut passt ein Ziel zum gewaehlten Reisemonat? 1 = Hauptsaison,
// 0.5 = Randzeit (Monat direkt daneben), 0.15 = klar ausserhalb.
function saisonPassung(ziel, monat) {
  if (!ziel || !monat) return 1;
  if (ziel.monate.includes(monat)) return 1;
  const davor = monat === 1 ? 12 : monat - 1;
  const danach = monat === 12 ? 1 : monat + 1;
  if (ziel.monate.includes(davor) || ziel.monate.includes(danach)) return 0.5;
  return 0.15;
}

function saisonLabel(ziel, monat) {
  const p = saisonPassung(ziel, monat);
  if (p === 1) return { text: "Hauptsaison", klasse: "haupt" };
  if (p === 0.5) return { text: "Nebensaison", klasse: "neben" };
  return { text: "Außerhalb der Saison", klasse: "ausserhalb" };
}

// Preisfaktor je nach Saison. In der Hauptsaison kostet dieselbe Unterkunft
// mehr als im November - ohne das bliebe das Reisedatum folgenlos, und wer
// die Daten verschiebt, saehe denselben Preis.
function saisonFaktor(ziel, monat) {
  const p = saisonPassung(ziel, monat);
  if (p === 1) return 1;
  if (p === 0.5) return 0.82;
  return 0.68;
}

const MONATSNAMEN = ["Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"];

// Monate, in denen ein Ziel Hauptsaison hat, als lesbarer Text
function saisonText(ziel) {
  if (ziel.monate.length >= 12) return "ganzjährig";
  // Zusammenhaengende Blocke zusammenfassen, z. B. "Dez–März, Juni–Sept"
  const m = [...ziel.monate].sort((a, b) => a - b);
  const bloecke = [];
  let start = m[0], vorher = m[0];
  for (const x of m.slice(1)) {
    if (x === vorher + 1) { vorher = x; continue; }
    bloecke.push([start, vorher]);
    start = x; vorher = x;
  }
  bloecke.push([start, vorher]);

  // Dezember und Januar gehoeren zusammen
  if (bloecke.length > 1 && bloecke[0][0] === 1 && bloecke[bloecke.length - 1][1] === 12) {
    const letzter = bloecke.pop();
    bloecke[0] = [letzter[0], bloecke[0][1]];
  }
  const kurz = (i) => MONATSNAMEN[i - 1].slice(0, 3);
  return bloecke.map(([a, b]) => (a === b ? kurz(a) : `${kurz(a)}–${kurz(b)}`)).join(", ");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { ZIELE, ZIEL_NACH_ID, TYP_LABELS, saisonPassung, saisonFaktor, saisonText };
}
