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
    temp: [15, 15, 17, 19, 23, 27, 30, 30, 27, 23, 19, 16],
    kurz: "Buchten, Tramuntana und Palmas Altstadt — der Klassiker im Mittelmeer.",
  },
  {
    id: "kreta", name: "Kreta", land: "Griechenland", typ: "strand",
    flughafen: "HER", flughafenName: "Heraklion",
    monate: [5, 6, 7, 8, 9, 10],
    temp: [16, 16, 18, 21, 25, 29, 31, 31, 28, 24, 21, 17],
    kurz: "Lange Sandstrände, Bergdörfer und minoische Ausgrabungen.",
  },
  {
    id: "algarve", name: "Algarve", land: "Portugal", typ: "strand",
    flughafen: "FAO", flughafenName: "Faro",
    monate: [4, 5, 6, 7, 8, 9, 10],
    temp: [16, 17, 19, 21, 23, 27, 29, 29, 27, 23, 19, 17],
    kurz: "Goldene Steilküsten, Felsbögen und ruhige Fischerorte im Süden Portugals.",
  },
  {
    id: "sardinien", name: "Sardinien", land: "Italien", typ: "strand",
    flughafen: "AHO", flughafenName: "Alghero",
    monate: [6, 7, 8, 9],
    temp: [14, 15, 17, 19, 23, 27, 30, 31, 27, 23, 18, 15],
    kurz: "Karibisch klares Wasser, Granitfelsen und Macchia.",
  },
  {
    id: "teneriffa", name: "Teneriffa", land: "Spanien", typ: "strand",
    flughafen: "TFS", flughafenName: "Teneriffa Süd",
    monate: [1, 2, 3, 4, 10, 11, 12],
    temp: [21, 21, 22, 23, 24, 26, 29, 29, 28, 26, 24, 22],
    kurz: "Wintersonne am Atlantik, dazu der Teide und schwarze Lavastrände.",
    winterziel: true,
  },
  {
    id: "barcelona", name: "Barcelona", land: "Spanien", typ: "stadt",
    flughafen: "BCN", flughafenName: "Barcelona",
    monate: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    temp: [14, 15, 17, 19, 22, 26, 29, 29, 26, 22, 17, 15],
    kurz: "Modernisme, Tapas und Stadtstrand — funktioniert das ganze Jahr.",
  },
  {
    id: "wien", name: "Wien", land: "Österreich", typ: "stadt",
    flughafen: "VIE", flughafenName: "Wien-Schwechat",
    monate: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    temp: [4, 6, 11, 16, 21, 24, 26, 26, 20, 14, 8, 4],
    kurz: "Kaffeehäuser, Ringstraße und im Dezember die Christkindlmärkte.",
  },
  {
    id: "lissabon", name: "Lissabon", land: "Portugal", typ: "stadt",
    flughafen: "LIS", flughafenName: "Lissabon",
    monate: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    temp: [15, 16, 19, 20, 23, 26, 28, 29, 27, 22, 18, 15],
    kurz: "Azulejos, Aussichtsterrassen und die alte Straßenbahn 28.",
  },
  {
    id: "tirol", name: "Tirol", land: "Österreich", typ: "berge",
    flughafen: "INN", flughafenName: "Innsbruck",
    monate: [1, 2, 3, 6, 7, 8, 9, 12],
    temp: [3, 5, 10, 14, 19, 22, 24, 23, 19, 14, 8, 4],
    kurz: "Im Winter Skigebiete, im Sommer Almwege — zwei Saisons in einem Tal.",
    winterziel: true,
  },
  {
    id: "suedtirol", name: "Südtirol", land: "Italien", typ: "berge",
    flughafen: "VRN", flughafenName: "Verona",
    monate: [1, 2, 3, 6, 7, 8, 9, 10, 12],
    temp: [5, 8, 13, 17, 22, 25, 28, 27, 22, 16, 10, 5],
    kurz: "Dolomiten, Weinberge und Südtiroler Küche zwischen zwei Sprachen.",
    winterziel: true,
  },
  {
    id: "lappland", name: "Lappland", land: "Finnland", typ: "natur",
    flughafen: "RVN", flughafenName: "Rovaniemi",
    monate: [1, 2, 3, 11, 12],
    temp: [-11, -10, -5, 2, 9, 16, 19, 16, 10, 2, -4, -9],
    kurz: "Polarnacht, Nordlichter und Schneewälder nördlich des Polarkreises.",
    winterziel: true,
  },
  {
    id: "ostsee", name: "Ostsee", land: "Deutschland", typ: "strand",
    flughafen: "RLG", flughafenName: "Rostock-Laage",
    monate: [5, 6, 7, 8, 9, 10],
    temp: [3, 3, 6, 11, 16, 19, 21, 21, 17, 12, 7, 4],
    kurz: "Steilküste, Bäderarchitektur und Strandkörbe — auch im Herbst schön.",
  },
  {
    id: "marrakesch", name: "Marrakesch", land: "Marokko", typ: "stadt",
    flughafen: "RAK", flughafenName: "Marrakesch Menara",
    monate: [1, 2, 3, 4, 10, 11, 12],
    temp: [19, 21, 24, 26, 30, 34, 38, 38, 33, 28, 23, 19],
    kurz: "Souks, Riads und der Atlas am Horizont — angenehm, wenn Europa kalt ist.",
    winterziel: true,
  },
  {
    id: "kapstadt", name: "Kapstadt", land: "Südafrika", typ: "stadt",
    flughafen: "CPT", flughafenName: "Kapstadt",
    monate: [1, 2, 3, 11, 12],
    temp: [27, 27, 26, 23, 20, 18, 18, 18, 20, 22, 24, 26],
    kurz: "Tafelberg, Weingüter und Atlantikstrände — Hochsommer in unserem Winter.",
    winterziel: true,
  },
  {
    id: "krabi", name: "Krabi", land: "Thailand", typ: "strand",
    flughafen: "KBV", flughafenName: "Krabi",
    monate: [1, 2, 3, 11, 12],
    temp: [32, 33, 34, 34, 33, 32, 32, 32, 31, 31, 31, 31],
    kurz: "Kalksteinfelsen, warmes Wasser und lange Trockenzeit über den Winter.",
    winterziel: true,
  },
  {
    id: "island", name: "Island", land: "Island", typ: "natur",
    flughafen: "KEF", flughafenName: "Reykjavík-Keflavík",
    monate: [1, 2, 3, 6, 7, 8, 9, 10, 11, 12],
    temp: [2, 3, 4, 6, 10, 12, 14, 14, 11, 7, 4, 2],
    kurz: "Nordlichter im Winter, Mitternachtssonne im Sommer, Dampf das ganze Jahr.",
    winterziel: true,
  },
  {
    id: "newyork", name: "New York", land: "USA", typ: "stadt",
    flughafen: "JFK", flughafenName: "New York JFK",
    monate: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    temp: [4, 6, 10, 17, 22, 27, 29, 28, 25, 18, 12, 6],
    kurz: "Ganzjährig, aber im Dezember zwischen Lichtern und Eisbahnen am schönsten.",
  },
  {
    id: "kyoto", name: "Kyoto", land: "Japan", typ: "stadt",
    flughafen: "KIX", flughafenName: "Osaka Kansai",
    monate: [3, 4, 5, 10, 11],
    temp: [9, 10, 14, 20, 25, 28, 32, 34, 29, 23, 17, 11],
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

// Preis pro Nacht eines Hauses im Reisemonat. Eine Formel fuer alle
// Seiten: Trefferliste, Hausseite, Kasse, Agent und Auswertung - vorher
// rechnete die Liste mit Saison, Hausseite und Kasse ohne, und dieselbe
// Reise kostete je nach Seite etwas anderes.
function preisImMonat(item, monat) {
  const ziel = typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[item.ziel] : null;
  if (!ziel || !monat) return item.pricePerNight;
  return Math.round(item.pricePerNight * saisonFaktor(ziel, monat));
}

/* Der Preis pro Nacht fuer DIESE Gruppe (03.10.2026).
   ------------------------------------------------------------------
   Gemeldet: "bis 50 € pro Nacht" - die Liste zeigte 48 €, auf der
   Hausseite standen 88 €. Die 48 waren das Doppelzimmer; vier Personen
   passen nur ins Familienzimmer. Filter, Karte, Agent und Budgetwarnung
   rechneten alle mit dem Grundpreis und lagen deshalb gemeinsam falsch.

   Jetzt rechnen alle mit dem, was diese Gruppe pro Nacht zahlt:
   - das guenstigste Zimmer, das fuer die Personen je Zimmer reicht
     (oder das gewaehlte), mal die Zahl der Zimmer;
   - ist genau eine Verpflegung gewuenscht, ihr Preis pro Person mal
     die Personen (Verpflegung kostet pro Person - Entscheidung des
     Nutzers vom selben Tag).
   Ohne Angaben zur Gruppe bleibt es der Grundpreis. Ferienwohnungen
   werden ganz gebucht, dort aendert sich nichts. */
function personenDerGruppe(g) {
  if (!g) return 0;
  return (g.erwachsene || 0) + (g.kinder || 0) || g.personen || 0;
}

function zimmerFuerGruppe(item, g) {
  if (!item || item.type === "apartment" || !(item.rooms || []).length) return null;
  const personen = personenDerGruppe(g);
  const zimmerZahl = Math.max(1, (g && g.zimmer) || 1);
  const jeZimmer = personen ? Math.ceil(personen / zimmerZahl) : 1;
  if (g && g.zimmerTyp) {
    const gewaehlt = item.rooms.find((r) => r.name === g.zimmerTyp && (r.maxGuests || 0) >= jeZimmer);
    if (gewaehlt) return gewaehlt;
  }
  const passend = item.rooms.filter((r) => (r.maxGuests || 0) >= jeZimmer)
    .sort((a, b) => (a.priceDelta || 0) - (b.priceDelta || 0));
  return passend[0] || null;
}

// Gewuenschte Verpflegung als Schluessel - nur wenn es genau eine ist
function verpflegungDerGruppe(g) {
  if (!g || !g.verpflegung) return null;
  const v = Array.isArray(g.verpflegung) ? g.verpflegung : [g.verpflegung];
  return v.length === 1 ? v[0] : null;
}

function nachtpreisGruppe(item, monat, g = null) {
  const basis = preisImMonat(item, monat);
  if (!g || !item || item.type === "apartment" || !(item.rooms || []).length) return basis;
  const zimmer = zimmerFuerGruppe(item, g);
  const zimmerZahl = Math.max(1, g.zimmer || 1);
  const raum = (basis + (zimmer ? zimmer.priceDelta || 0 : 0)) * zimmerZahl;
  const vk = verpflegungDerGruppe(g);
  const board = vk ? (item.boards || []).find((b) => b.key === vk) : null;
  return raum + (board ? (board.priceDelta || 0) * Math.max(1, personenDerGruppe(g)) : 0);
}

/* Was der Aufenthalt kostet - eine Rechnung fuer Hausseite, Kasse,
   Karte und Agent. `wahl` setzt Zimmer (Objekt) und Verpflegung
   (Schluessel), wenn sie schon gewaehlt sind; sonst gelten das
   guenstigste passende Zimmer und die gewuenschte Verpflegung. */
function aufenthaltKosten(item, monat, g, naechte, wahl = {}) {
  const n = Math.max(1, naechte || 7);
  const basis = preisImMonat(item, monat);
  if (!item || item.type === "apartment") {
    const reinigung = (item && item.cleaningFee) || 0;
    return { zimmer: null, board: null, zimmerProNacht: basis, zimmerZahl: 1, verpflegungProPerson: 0,
      personen: personenDerGruppe(g), proNacht: basis, unterkunft: basis * n, verpflegung: 0, reinigung, gesamt: basis * n + reinigung };
  }
  const zimmerZahl = Math.max(1, (g && g.zimmer) || 1);
  const personen = Math.max(1, personenDerGruppe(g) || 2);
  const zimmer = wahl.zimmer || zimmerFuerGruppe(item, g) || (item.rooms || [])[0] || null;
  const vk = wahl.board || verpflegungDerGruppe(g);
  const board = (item.boards || []).find((b) => b.key === vk) || (item.boards || [])[0] || null;
  const zimmerProNacht = basis + (zimmer ? zimmer.priceDelta || 0 : 0);
  const verpflegungProPerson = board ? board.priceDelta || 0 : 0;
  const proNacht = zimmerProNacht * zimmerZahl + verpflegungProPerson * personen;
  const unterkunft = zimmerProNacht * zimmerZahl * n;
  const verpflegung = verpflegungProPerson * personen * n;
  const reinigung = 35 * zimmerZahl;
  return { zimmer, board, zimmerProNacht, zimmerZahl, verpflegungProPerson, personen,
    proNacht, unterkunft, verpflegung, reinigung, gesamt: unterkunft + verpflegung + reinigung };
}

/* ==================================================================
   Belegung je Monat
   ------------------------------------------------------------------
   Bis zum 27.09.2026 war jedes Haus in jedem Monat frei. Damit war die
   Frage nach dem Reisemonat folgenlos: Der Agent konnte drei Monate der
   Jahreszeit nebeneinanderlegen und kam dreimal auf dieselbe Zahl, was
   den ganzen Vergleich zur Geste ohne Inhalt machte.

   Jetzt ist ein Teil der Haeuser je Monat ausgebucht, in der Hauptsaison
   deutlich mehr als ausserhalb - so, wie es sich anfuehlt, wenn man im
   August eine Woche Mallorca sucht. Damit wird "in welchem Monat ist am
   meisten frei" eine Frage mit Antwort.

   Entschieden wird deterministisch aus Haus-id und Monat, nicht
   zufaellig. Das ist hier keine Feinheit, sondern Bedingung: Dieselbe
   Zahl muss bei jedem Seitenaufruf herauskommen, in der Trefferliste
   wie beim Agenten, sonst verschwinden Haeuser zwischen zwei Klicks und
   der Agent nennt Zahlen, die auf der Seite nicht stehen.
   ================================================================== */

// FNV-1a: kurz, stabil, gleichmaessig verteilt. Ergebnis 0-999.
/* Wie warm es wird.
   ====================================================================
   `temp` an jeder Region: zwoelf Tageshoechstwerte, Januar bis Dezember,
   gerundete Durchschnitte. Gebraucht fuer die Frage "eher warm oder eher
   kalt": Nutzer am 30.09.2026: "Sag ihm kurz, welche Regionen fuer ihn
   in warm reinzaehlen - Mallorca, Kreta und Sardinien sind im Oktober
   immer noch mit mindestens 23 Grad sehr warm. Und dann waere es auch
   moeglich, dass die Person sagt, mir reicht es, wenn es 20 Grad sind."

   Damit ist "warm" keine feste Liste mehr, sondern eine Schwelle im
   gewaehlten Monat - und die Person kann sie verschieben. */
function grad(ziel, monat) {
  if (!ziel || !Array.isArray(ziel.temp) || !monat) return null;
  return ziel.temp[Math.max(0, Math.min(11, monat - 1))];
}

// Alle Regionen, in denen es im Monat mindestens so warm ist
function regionenAbGrad(monat, grenze) {
  if (typeof ZIELE === "undefined" || !monat) return [];
  return ZIELE.filter((z) => { const t = grad(z, monat); return t != null && t >= grenze; })
    .sort((a, b) => grad(b, monat) - grad(a, monat));
}

function belegungsZahl(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 1000;
}

function freiImMonat(item, monat) {
  if (!item || !monat) return true;
  const ziel = typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[item.ziel] : null;
  const passung = ziel ? saisonPassung(ziel, monat) : 1;
  // Anteil der ausgebuchten Haeuser: Hauptsaison knapp ein Drittel,
  // Randzeit ein Sechstel, ausserhalb der Saison kaum etwas.
  const belegt = passung === 1 ? 320 : passung === 0.5 ? 160 : 60;
  return belegungsZahl(`${item.id}|${monat}`) >= belegt;
}

/* WLAN kostet nicht ueberall gleich.
   ====================================================================
   Alle 344 Haeuser haben WLAN - deshalb war ein Haken "WLAN" in der
   Filterspalte wertlos und stand dort auch nie. Interessant ist nicht
   ob, sondern zu welchem Preis: Ein Viertel der Haeuser verlangt eine
   Tagesgebuehr, und das folgt demselben Muster wie in echten Portalen.
   Guenstige Stadthotels berechnen es, Resorts fast nie, Ferienwohnungen
   haben meist den Anschluss der Wohnung.

   Bewusst NICHT an der Kasse: Dort steht genau eine vorausgewaehlte
   Zusatzleistung, die Reiseruecktrittsversicherung, und die ist ein
   Messwert der Erhebung. Ein zweiter versteckter Posten daneben wuerde
   ihn unbrauchbar machen - dann waere nicht mehr zu unterscheiden, was
   jemand uebersehen hat. WLAN ist ein Suchmerkmal, keine Falle.

   Gibt die Tagesgebuehr in Euro zurueck, 0 heisst inklusive. Fester
   Zufall ueber die id, damit dasselbe Haus immer denselben Preis hat. */
function wlanGebuehr(item) {
  if (!item) return 0;
  const zahl = belegungsZahl(`wlan|${item.id}`);
  const anteil = item.type === "apartment" ? 120
    : (item.stars >= 5 ? 100 : item.stars <= 3 ? 350 : 250);
  if (zahl >= anteil) return 0;
  return [3, 5, 8, 12][zahl % 4];
}

// "WLAN inklusive" oder "WLAN 5 € pro Tag"
function wlanText(item) {
  const g = wlanGebuehr(item);
  return g ? `WLAN ${g} € pro Tag` : "WLAN inklusive";
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
