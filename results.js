// Ergebnisseite fuer alle vier Bestaende. Filterleiste und Sortierung
// wechseln je nach Typ (Hotel, Ferienwohnung, Mietwagen, Flug).

const FILTER_AMENITIES = ["pool", "beachfront", "spa", "familyFriendly", "kidsClub", "parking", "restaurant", "petsAllowed", "adultsOnly", "gym", "bikeRental", "seaView"];
// "spa" und "terrace" fehlten hier, obwohl 15 bzw. 65 Wohnungen sie fuehren.
// Wer nach einer Sauna suchte, konnte danach schlicht nicht filtern.
const APT_AMENITIES = ["kitchen", "washer", "balcony", "terrace", "pool", "spa", "parking", "aircon", "seaView", "petsAllowed", "familyFriendly", "wifi"];

const SORT_OPTIONS = {
  // Der gemeinsame Reiter kennt nur, was beide Arten haben - Sterne gibt
  // es bei Ferienwohnungen nicht, Wohnflaeche nicht bei Hotels
  unterkunft: [
    { v: "empfehlung", l: "Empfehlung" }, { v: "preis-asc", l: "Preis (niedrigster zuerst)" },
    { v: "preis-desc", l: "Preis (höchster zuerst)" }, { v: "rating", l: "Beste Bewertung" },
    { v: "strand", l: "Entfernung zum Strand" },
  ],
  hotel: [
    { v: "empfehlung", l: "Empfehlung" }, { v: "preis-asc", l: "Preis (niedrigster zuerst)" },
    { v: "preis-desc", l: "Preis (höchster zuerst)" }, { v: "rating", l: "Beste Bewertung" },
    { v: "stars", l: "Meiste Sterne" }, { v: "strand", l: "Entfernung zum Strand" },
  ],
  apartment: [
    { v: "empfehlung", l: "Empfehlung" }, { v: "preis-asc", l: "Preis (niedrigster zuerst)" },
    { v: "preis-desc", l: "Preis (höchster zuerst)" }, { v: "rating", l: "Beste Bewertung" },
    { v: "groesse", l: "Größte Wohnfläche" }, { v: "strand", l: "Entfernung zum Strand" },
  ],
  car: [
    { v: "empfehlung", l: "Empfehlung" }, { v: "preis-asc", l: "Preis (niedrigster zuerst)" },
    { v: "preis-desc", l: "Preis (höchster zuerst)" }, { v: "rating", l: "Beste Bewertung" },
    { v: "seats", l: "Meiste Sitzplätze" },
  ],
  flight: [
    { v: "empfehlung", l: "Empfehlung" }, { v: "preis-asc", l: "Preis (niedrigster zuerst)" },
    { v: "preis-desc", l: "Preis (höchster zuerst)" }, { v: "abflug", l: "Abflugzeit" },
    { v: "dauer", l: "Kürzeste Reisezeit" },
  ],
};

const state = {
  type: "hotel",
  q: "",
  ziel: "",                 // Mietwagen und Fluege: genau ein Ziel
  /* Unterkuenfte: mehrere Ziele auf einmal.
     ------------------------------------------------------------------
     Bis zum 27.09.2026 war das Reiseziel eine Reihe von Radioknoepfen -
     entweder alle oder genau eines. Der Agent konnte "eher warm" deshalb
     nicht in die Spalte uebersetzen: Er sagte "alle warmen Regionen sind
     ausgewaehlt", und links stand weiter "Alle Ziele". Der Nutzer am
     27.09.: "Da muss dann quasi auch eine Aktion sein, die er machen
     kann."

     Mit Haken statt Punkten laesst sich eine Himmelsrichtung abbilden.
     Nebenbei faellt damit die Kruecke weg, dass der Agent zwei Zahlen
     nennen musste - die Treffer der Seite und die, die wirklich passen. */
  ziele: new Set(),
  priceMax: 999,
  gesamtMax: null,     // Grenze fuer die ganze Reise; null = kein Gesamtbudget gesetzt
  stars: new Set(),
  categories: new Set(),
  amenities: new Set(),
  boards: new Set(),
  carCategories: new Set(),
  transmissions: new Set(),
  airlines: new Set(),
  minRating: 0,
  maxBeach: null,
  minBedrooms: 0,
  directOnly: false,
  freeCancel: false,
  onlyDeals: false,
  wlanFrei: false,
  sort: "empfehlung",
  withFlight: false,
};

/* Der Vorrat, aus dem gefiltert und gezaehlt wird.
   ------------------------------------------------------------------
   Die Belegung sitzt hier und nicht in matches(): Die Zahlen neben den
   Filtern zaehlen ueber pool(), nicht ueber die gefilterte Liste. Stuende
   sie in matches(), zeigte die Spalte "11 Haeuser mit Pool", waehrend in
   der Liste nur sieben stehen. */
function pool() {
  if (state.type === "car") return CARS;
  if (state.type === "flight") return FLIGHTS;
  const monat = reisemonat();
  const alle = state.type === "unterkunft" ? [...HOTELS, ...APARTMENTS]
    : (state.type === "apartment" ? APARTMENTS : HOTELS);
  return typeof freiImMonat === "function" ? alle.filter((x) => freiImMonat(x, monat)) : alle;
}

function priceOf(item) {
  return item.pricePerNight ?? item.pricePerDay ?? item.price ?? 0;
}

function priceBounds() {
  const prices = pool().map(priceOf);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

// Verweis auf die Hausseite mit Reisedaten, Reisenden und Flugwahl
function hausLink(id) {
  let href = Reisedaten.anLink(Belegung.anLink(`stay.html?id=${id}`));
  if (typeof Flug !== "undefined" && state.type === "hotel") href = Flug.anLink(href);
  return href;
}

/* Was die ganze Reise kostet - dieselbe Summe, die auf der Karte steht.
   ------------------------------------------------------------------
   Wunsch des Nutzers am 02.10.2026: "Wir brauchen einen Preisregler fuer
   das Gesamtbudget auch. Nicht nur Preis pro Nacht." Grund: Wer 5.000
   Euro sagt, meint die Reise, nicht die Nacht - und ohne Regler dafuer
   ist nicht nachvollziehbar, was die Liste eigentlich zeigt.

   Gerechnet wird wie in der Karte und wie im Agenten (`reisepreis` im
   Werkzeugkasten): Unterkunft fuer alle Zimmer und Naechte plus
   Endreinigung, dazu der Flug fuer alle Reisenden, wenn einer dabei ist.
   Eine Zahl, drei Orte. */
function gesamtpreisFuer(item) {
  if (!item || (item.type !== "hotel" && item.type !== "apartment")) return null;
  const b = typeof Belegung !== "undefined" ? Belegung.get() : { personen: 2, zimmer: 1 };
  const naechte = typeof Reisedaten !== "undefined" ? Reisedaten.naechte(7) : 7;
  const proNacht = saisonpreis(item);
  if (proNacht == null) return null;
  const unterkunft = item.type === "apartment"
    ? proNacht * naechte + (item.cleaningFee || 0)
    : proNacht * naechte * Math.max(1, b.zimmer) + 35 * Math.max(1, b.zimmer);
  let flug = 0;
  if (state.withFlight && item.type === "hotel" && typeof Flug !== "undefined") {
    try { flug = Flug.paket(item, b.personen || 1)?.gesamt || 0; } catch { flug = 0; }
  }
  return unterkunft + flug;
}

// Paketpreis mit Flug in der Trefferkarte (nur Hotels, nur mit Flug dazu)
function paketZeile(item, preisProNacht) {
  if (!state.withFlight || state.type !== "hotel" || typeof Flug === "undefined") return "";
  const b = Belegung.get();
  const paket = Flug.paket(item, b.personen);
  if (!paket) return `<div class="price-flight"><small>Kein Flug ab ${Flug.abText(null, "deinem Flughafen")} zu diesem Ziel</small></div>`;
  const naechte = Reisedaten.naechte(7);
  const unterkunft = preisProNacht * naechte * b.zimmer + 35 * b.zimmer;
  return `<div class="price-flight">
    <strong>${formatPrice(unterkunft + paket.gesamt)} mit Flug</strong>
    <small>${naechte} Nächte + ${paket.flug.airline} ab ${paket.flug.from}, ${paket.klasse}, Hin und zurück, ${b.personen} ${b.personen === 1 ? "Person" : "Personen"}</small>
  </div>`;
}

function readUrl() {
  const p = new URLSearchParams(window.location.search);
  state.type = p.get("type") || "hotel";
  state.q = p.get("q") || p.get("region") || "";
  if (p.get("category")) state.categories.add(p.get("category"));
  if (p.get("sort")) state.sort = p.get("sort");
  if (p.get("deals")) state.onlyDeals = true;
  // Flug dazu: aus der Adresse, sonst aus dem gemerkten Zustand
  state.withFlight = typeof Flug !== "undefined" ? Flug.get().mit : p.get("flight") === "1";
  state.ziel = p.get("ziel") || "";
  // Mehrere Ziele kommen als Liste: ?ziele=tirol,island
  const zieleRoh = (p.get("ziele") || "").split(",").map((x) => x.trim()).filter(Boolean);
  state.ziele = new Set(zieleRoh.length ? zieleRoh : (state.ziel ? [state.ziel] : []));
}

// Reisemonat aus dem Anreisedatum. Bestimmt, ob ein Ziel Haupt- oder
// Nebensaison hat - und damit auch den Preis.
// Genau ein gewaehltes Ziel - fuer Ueberschrift und Flugpreis. Bei mehreren
// (oder keinem) gibt es kein "nach X", und der Flugpreis haengt am Ziel.
function einzigesZiel() {
  if (state.type === "car" || state.type === "flight") return state.ziel || "";
  return state.ziele.size === 1 ? [...state.ziele][0] : "";
}

function reisemonat() {
  return Reisedaten.monat();
}

// Preis einer Unterkunft im gewaehlten Zeitraum
function saisonpreis(item) {
  return preisImMonat(item, reisemonat());
}

/* ---------- Filter-Logik ---------- */
/* `ausser` laesst genau einen Filter aus.
   ------------------------------------------------------------------
   Gebraucht fuer die Zahlen in der Spalte: Neben "Mallorca" soll stehen,
   wie viele Haeuser dort in der Liste staenden - also unter allen
   gesetzten Filtern ausser der Region selbst. Ohne diese Ausnahme zeigte
   jede andere Region null, sobald eine angehakt ist.

   Nutzer am 30.09.2026: "Ich wuerde die Zahl auf Grundlage der Filter
   bestimmen, also welche tatsaechlich aus dieser Region angezeigt
   werden." Vorher zaehlten die Zahlen ueber den ganzen Vorrat und
   aenderten sich nie. */
function matches(item, ausser = null) {
  const q = state.q.trim().toLowerCase();

  if (state.type === "car") {
    // Nach Ziel filtern, nicht nur nach Freitext: sonst bekommt jemand in
    // Lappland Wagen ab Flughafen Palma angeboten.
    if (state.ziel && item.ziel !== state.ziel) return false;
    if (q && !`${item.model} ${item.category} ${item.supplier} ${item.pickup} ${(typeof ZIEL_NACH_ID !== 'undefined' && ZIEL_NACH_ID[item.ziel]?.name) || ''}`.toLowerCase().includes(q)) return false;
    if (item.pricePerDay > state.priceMax) return false;
    if (state.carCategories.size && !state.carCategories.has(item.category)) return false;
    if (state.transmissions.size && !state.transmissions.has(item.transmission)) return false;
    if (state.minRating && item.rating < state.minRating) return false;
    if (state.freeCancel && !item.freeCancellation) return false;
    return true;
  }

  if (state.type === "flight") {
    if (state.ziel && item.ziel !== state.ziel) return false;
    if (q && !`${item.airline} ${item.from} ${item.fromCode}`.toLowerCase().includes(q.replace(/\s*\(.*\)/, "").toLowerCase())) return false;
    if (item.price > state.priceMax) return false;
    if (state.airlines.size && !state.airlines.has(item.airline)) return false;
    if (state.directOnly && item.stops > 0) return false;
    return true;
  }

  // Unterkuenfte - Zielname und Land gehoeren mit in die Suche, sonst findet
  // "Kreta" oder "Portugal" nichts
  const ziel = typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[item.ziel] : null;
  const suchtext = `${item.name} ${item.location} ${item.region} ${ziel ? ziel.name + " " + ziel.land : ""}`.toLowerCase();
  if (q && !suchtext.includes(q)) return false;
  if (ausser !== "ziel" && state.ziele.size && !state.ziele.has(item.ziel)) return false;
  /* Ausserhalb der Saison heisst: nicht im Angebot.
     ------------------------------------------------------------------
     Bis zum 30.09.2026 standen diese Haeuser in der Liste, mit dem
     Vermerk "Ausserhalb der Saison" auf der Karte. Der Agent zaehlte sie
     nie mit - er sagte 125, die Liste zeigte 177, und der Unterschied
     brauchte jedes Mal einen Erklaersatz, den niemand verstand.

     Nutzer am 30.09.2026: "Zeig einfach die Menge von den Ausgegrauten
     nicht mehr, dann ist es gefixt." Genau so. Seite und Agent zeigen
     jetzt dieselbe Zahl.

     Ohne Ausnahme, auch wenn die Region angehakt ist. Erst gab es eine:
     Wer sie ausdruecklich waehlte, bekam sie zu sehen. Damit haette aber
     ein ausgegrauter Haken doch noch etwas bewirken muessen, und der
     Agent haette Haeuser zaehlen koennen, die die Liste nicht zeigt.
     Eine Regel an beiden Orten ist mehr wert als eine Hintertuer. */
  if (ziel && typeof saisonPassung === "function"
    && saisonPassung(ziel, reisemonat()) < 0.5) return false;
  // Reisegruppe muss hineinpassen - vorher wurde die Personenzahl ignoriert
  if (!Belegung.passt(item)) return false;
  if (ausser !== "preis" && saisonpreis(item) > state.priceMax) return false;
  // Das Gesamtbudget gilt fuer die ganze Reise, mit Flug
  if (ausser !== "gesamt" && state.gesamtMax != null) {
    const g = gesamtpreisFuer(item);
    if (g != null && g > state.gesamtMax) return false;
  }
  if (ausser !== "bewertung" && state.minRating && item.rating < state.minRating) return false;
  // Binnenziele haben distanceToBeach null - sie erfuellen keinen Strandfilter
  if (ausser !== "strand" && state.maxBeach !== null
      && (item.distanceToBeach === null || item.distanceToBeach > state.maxBeach)) return false;
  if (ausser !== "ausstattung") for (const a of state.amenities) if (!item.amenities.includes(a)) return false;

  /* Im gemeinsamen Reiter gelten die Filter, die auf beides passen.
     ------------------------------------------------------------------
     Sterne, Unterkunftsart und Verpflegung kennt nur ein Hotel,
     Schlafzimmer nur eine Wohnung. Wuerde man sie im gemeinsamen Reiter
     anwenden, fiele jeweils die andere Haelfte heraus, ohne dass jemand
     das gewollt haette. Der Angebotsfilter gilt fuer beide - dort ist
     "kein alter Preis" eine Aussage und kein fehlendes Merkmal. */
  if (ausser !== "angebote" && state.onlyDeals && !item.oldPrice) return false;
  // WLAN hat jedes Haus, aber nicht ueberall ohne Aufpreis. Gilt wie der
  // Angebotsfilter fuer Hotels und Wohnungen gleichermassen.
  if (ausser !== "wlan" && state.wlanFrei && typeof wlanGebuehr === "function" && wlanGebuehr(item) > 0) return false;
  if (state.type === "hotel") {
    if (ausser !== "sterne" && state.stars.size && !state.stars.has(String(item.stars))) return false;
    if (ausser !== "kategorie" && state.categories.size && !state.categories.has(item.category)) return false;
    if (ausser !== "verpflegung" && state.boards.size) {
      const keys = item.boards.map((b) => b.key);
      if (![...state.boards].some((b) => keys.includes(b))) return false;
    }
  } else if (state.type === "apartment") {
    if (ausser !== "schlafzimmer" && state.minBedrooms && item.bedrooms < state.minBedrooms) return false;
  }
  /* Der Mindestaufenthalt gilt fuer beide Reiter.
     ------------------------------------------------------------------
     Er stand bisher nur als Text auf der Hausseite. Damit konnte man
     eine Wohnung mit fuenf Naechten Minimum fuer drei Naechte in der
     Liste sehen - und erst in der Kasse merken, dass es nicht geht.
     Agent und Seite rechnen ihn jetzt gleich. */
  const gesuchteNaechte = typeof Reisedaten !== "undefined" ? Reisedaten.naechte(0) : 0;
  if (gesuchteNaechte && item.minNights && gesuchteNaechte < item.minNights) return false;
  return true;
}

function sortItems(list) {
  const c = [...list];
  switch (state.sort) {
    case "preis-asc": return c.sort((a, b) => priceOf(a) - priceOf(b));
    case "preis-desc": return c.sort((a, b) => priceOf(b) - priceOf(a));
    case "rating": return c.sort((a, b) => b.rating - a.rating);
    case "stars": return c.sort((a, b) => b.stars - a.stars || b.rating - a.rating);
    // Ohne Strand ans Ende, nicht an den Anfang
    case "strand": return c.sort((a, b) =>
      (a.distanceToBeach ?? Infinity) - (b.distanceToBeach ?? Infinity));
    case "groesse": return c.sort((a, b) => b.size - a.size);
    case "seats": return c.sort((a, b) => b.seats - a.seats);
    case "abflug": return c.sort((a, b) => a.depart.localeCompare(b.depart));
    case "dauer": return c.sort((a, b) => parseInt(a.duration) - parseInt(b.duration) || a.stops - b.stops);
    default:
      if (state.type === "flight") return c.sort((a, b) => a.stops - b.stops || a.price - b.price);
      return c.sort((a, b) => b.rating * 20 + b.reviewCount / 100 - (a.rating * 20 + a.reviewCount / 100));
  }
}

const countIn = (pred) => pool().filter(pred).length;
/* Wie viele stuenden in der Liste, wenn man genau diesen Filter waehlt:
   alle gesetzten Filter ausser diesem einen, dann der Wert selbst. */
const zaehleFuer = (feld, pred) => pool().filter((h) => matches(h, feld) && pred(h)).length;

/* ---------- Filterleiste ---------- */
function group(title, inner) {
  return `<div class="filter-group"><h4>${title}</h4>${inner}</div>`;
}

/* Die Zahl neben einem Filter ist immer die, die auch in der Liste
   steht.
   ------------------------------------------------------------------
   Nutzer am 30.09.2026: "Ich wuerde die Zahl auf Grundlage der Filter
   bestimmen, also welche tatsaechlich aus dieser Region angezeigt
   werden. Und wenn gar keine da sind, sollte da auch gar keine Zahl
   stehen."

   Bei null bleibt das Feld deshalb leer - eine Null neben einer
   gesperrten Region liest sich wie ein Fehler, und eine Zahl, die etwas
   anderes zaehlt als die Liste, ist schlimmer als keine. */
function zahlFeld(count) {
  return `<span class="count">${count ? count : ""}</span>`;
}

function checkRow(cls, value, label, count, checked, zeilenKlasse = "", gesperrt = false) {
  return `<label class="check-row${zeilenKlasse ? ` ${zeilenKlasse}` : ""}"><input type="checkbox" class="${cls}" value="${value}" ${checked ? "checked" : ""}${gesperrt ? " disabled" : ""}/><span>${label}</span>${zahlFeld(count)}</label>`;
}

function radioRow(name, cls, value, label, count, checked) {
  return `<label class="check-row"><input type="radio" name="${name}" class="${cls}" value="${value}" ${checked ? "checked" : ""}/><span>${label}</span>${zahlFeld(count)}</label>`;
}

function renderFilters() {
  const b = priceBounds();
  const unit = state.type === "car" ? "pro Tag" : state.type === "flight" ? "pro Person" : "pro Nacht";
  const panel = document.getElementById("filterPanel");
  verdrahteFilterschalter(panel);
  let html = group(`Preis ${unit}`,
    `<div class="range-row"><input type="range" id="fPrice" min="${b.min}" max="${b.max}" step="1" value="${state.priceMax}" /></div>
     <div style="font-size:.84rem;color:var(--ink-500);margin-top:6px">bis <strong id="fPriceOut">${formatPrice(state.priceMax)}</strong></div>`);

  const istUnterkunft = ["unterkunft", "hotel", "apartment"].includes(state.type);
  /* Der zweite Regler: die ganze Reise.
     ------------------------------------------------------------------
     Er steht direkt unter dem Nachtpreis, weil beide dasselbe meinen und
     sich nur im Bezug unterscheiden. Die Spanne kommt aus den Haeusern,
     die ueberhaupt in der Liste stehen - sonst stuende ein Regler da,
     dessen rechtes Ende niemand erreicht. Ganz rechts heisst "keine
     Grenze"; dann faellt der Filter weg. */
  if (istUnterkunft) {
    const summen = alleHaeuser().map(gesamtpreisFuer).filter((x) => x != null && x > 0);
    if (summen.length > 1) {
      const gMin = Math.floor(Math.min(...summen) / 50) * 50;
      const gMax = Math.ceil(Math.max(...summen) / 50) * 50;
      const wert = state.gesamtMax == null ? gMax : Math.min(gMax, Math.max(gMin, state.gesamtMax));
      const naechte = typeof Reisedaten !== "undefined" ? Reisedaten.naechte(7) : 7;
      const mitFlug = state.withFlight && state.type === "hotel";
      html += group("Gesamt für die Reise",
        `<div class="range-row"><input type="range" id="fGesamt" min="${gMin}" max="${gMax}" step="50" value="${wert}" /></div>
         <div style="font-size:.84rem;color:var(--ink-500);margin-top:6px">bis <strong id="fGesamtOut">${wert >= gMax ? "ohne Grenze" : formatPrice(wert)}</strong>
         <span style="display:block;margin-top:2px">${naechte} Nächte${mitFlug ? ", mit Flug" : ""}</span></div>`);
    }
  }
  if (istUnterkunft) {
    const monat = reisemonat();
    /* Die Liste zeigt Haeuser ausserhalb ihrer Saison nicht mehr - also
       zaehlt `countIn` fuer solche Regionen null, und sie fielen ganz aus
       der Spalte. Sichtbar bleiben sollen sie trotzdem: Wer im Maerz nach
       Kreta schaut, soll sehen, dass es die Region gibt und warum gerade
       nichts dasteht. `bestandOhneSaison` entscheidet nur darueber, ob
       die Zeile ueberhaupt erscheint - die Zahl daneben kommt weiterhin
       aus der Liste und bleibt bei gesperrten Regionen leer. */
    const alleHaeuser = () => [...(typeof HOTELS !== "undefined" ? HOTELS : []), ...(typeof APARTMENTS !== "undefined" ? APARTMENTS : [])];
    const ausserSaison = (z) => typeof saisonPassung === "function" && saisonPassung(z, monat) < 0.5;
    const bestandOhneSaison = (z) => alleHaeuser().filter((h) => h.ziel === z.id
      && (typeof freiImMonat !== "function" || freiImMonat(h, monat)) && Belegung.passt(h)).length;
    const zieleImBestand = ZIELE.filter((z) => countIn((h) => h.ziel === z.id) || (ausserSaison(z) && bestandOhneSaison(z)));
    if (zieleImBestand.length > 1) {
      // Kein Haken heisst: alle Ziele. Ein eigener Knopf dafuer waere eine
      // vierte Moeglichkeit neben an, aus und halb - und muesste erklaert werden.
      html += group("Reiseziel",
        zieleImBestand.map((z) => {
          const aus = ausserSaison(z);
          /* Ausgegraut und gesperrt.
             --------------------------------------------------------------
             Wunsch des Nutzers, zweimal geaeussert. Der Einwand dagegen
             (ein Gespraech ueber "Kreta im Maerz" waere dann nicht mehr
             darstellbar) ist geloest, indem die Saisonregel jetzt ueberall
             gilt - auch fuer den Agenten. Er zeigt die Region dann nicht
             mehr, sondern sagt, dass sie gerade keine Saison hat, und
             bietet einen anderen Monat oder eine andere Region an.

             Die Zahl daneben ist die, die es dort ohne die Saisongrenze
             gaebe - sonst staende ueberall null und die Zeile saehe aus
             wie ein Fehler. */
          const zusatz = aus ? " ·&nbsp;außerhalb der Saison"
            : (saisonPassung(z, monat) === 1 ? " ·&nbsp;Saison" : "");
          // Immer die Zahl aus der Liste - bei gesperrten Regionen ist das
          // null, und dann steht dort nichts.
          return checkRow("js-ziel", z.id, `${z.name}${zusatz}`,
            zaehleFuer("ziel", (h) => h.ziel === z.id),
            state.ziele.has(z.id), aus ? "aus-saison" : "", aus);
        }).join(""));
    }

    html += group("Gästebewertung",
      [{ v: 4.5, l: "Hervorragend ab 4,5" }, { v: 4.0, l: "Sehr gut ab 4,0" }, { v: 3.5, l: "Gut ab 3,5" }, { v: 0, l: "Alle Bewertungen" }]
        .map((o) => radioRow("fRating", "js-rating", o.v, o.l, zaehleFuer("bewertung", (h) => h.rating >= o.v), state.minRating === o.v)).join(""));

    /* "Ich haette gern ein Hotel, das im Angebot ist."
       ----------------------------------------------------------------
       Am 27.09.2026 gemeldet: Der Agent verstand den Satz nicht. Er
       konnte ihn auch nicht verstehen - den Angebotsfilter gab es nur
       ueber die Adresse (?deals=1), nicht als Schalter in der Spalte.
       Damit fehlte ihm das Werkzeug, nicht das Verstaendnis. Jetzt steht
       er hier, sichtbar, und der Agent kann ihn klicken wie jeden
       anderen. */
    // Reduzierte Haeuser gibt es nur bei Hotels - ohne welche im Vorrat
    // waere der Schalter ein Filter, der immer alles wegnimmt
    if (countIn((h) => h.oldPrice)) {
      html += group("Preisnachlass",
        `<label class="check-row"><input type="checkbox" class="js-deals" ${state.onlyDeals ? "checked" : ""}/><span>Nur reduzierte Häuser</span>${zahlFeld(zaehleFuer("angebote", (h) => h.oldPrice))}</label>`);
    }

    /* WLAN inklusive.
       ----------------------------------------------------------------
       Alle Haeuser haben WLAN, ein Viertel verlangt eine Tagesgebuehr
       (data/ziele.js, wlanGebuehr). Deshalb heisst der Haken nicht
       "WLAN", sondern "ohne Aufpreis" - sonst filtert er nichts. */
    if (typeof wlanGebuehr === "function" && countIn((h) => wlanGebuehr(h) > 0)) {
      html += group("WLAN",
        `<label class="check-row"><input type="checkbox" class="js-wlan" ${state.wlanFrei ? "checked" : ""}/><span>Nur ohne Aufpreis</span>${zahlFeld(zaehleFuer("wlan", (h) => wlanGebuehr(h) === 0))}</label>`);
    }

    html += group("Entfernung zum Strand",
      [{ v: 0.2, l: "Direkt am Strand" }, { v: 1, l: "Bis 1 km" }, { v: 5, l: "Bis 5 km" }, { v: null, l: "Egal" }]
        .map((o) => radioRow("fBeach", "js-beach", o.v === null ? "" : o.v, o.l,
          o.v === null ? zaehleFuer("strand", () => true) : zaehleFuer("strand", (h) => h.distanceToBeach !== null && h.distanceToBeach <= o.v), state.maxBeach === o.v)).join(""));
  }

  if (state.type === "hotel") {
    html += group("Sterne", [5, 4, 3, 2].map((s) => checkRow("js-star", s, "★".repeat(s), zaehleFuer("sterne", (h) => h.stars === s), state.stars.has(String(s)))).join(""));
    html += group("Unterkunftsart", Object.entries(CATEGORY_LABELS).filter(([k]) => countIn((h) => h.category === k))
      .map(([k, l]) => checkRow("js-cat", k, l, zaehleFuer("kategorie", (h) => h.category === k), state.categories.has(k))).join(""));
    html += group("Verpflegung", Object.entries(BOARD_LABELS).filter(([k]) => countIn((h) => h.boards.some((x) => x.key === k)))
      .map(([k, l]) => checkRow("js-board", k, l, zaehleFuer("verpflegung", (h) => h.boards.some((x) => x.key === k)), state.boards.has(k))).join(""));
    html += group("Ausstattung", FILTER_AMENITIES.filter((a) => countIn((h) => h.amenities.includes(a)))
      .map((a) => checkRow("js-amen", a, AMENITY_LABELS[a], zaehleFuer("ausstattung", (h) => h.amenities.includes(a)), state.amenities.has(a))).join(""));
  }

  /* Der gemeinsame Reiter "Unterkuenfte".
     ------------------------------------------------------------------
     Bis zum 29.09.2026 hatte er keine Ausstattungsfilter: Sterne,
     Verpflegung und Ausstattung standen nur unter "Hotels", Schlafzimmer
     und Ausstattung nur unter "Ferienwohnungen". Die Seitenpruefung hat
     es gefunden, und es war nicht nur eine Luecke fuer Menschen: Der
     Agent rief `filterSetzen` mit "pool" auf, fand keine Checkbox, setzte
     still nichts und meldete trotzdem Erfolg. Fuer das Modell sah es
     aus, als staende der Filter.

     Sterne und Verpflegung bleiben hier bewusst draussen: Beides gibt es
     nur bei Hotels, und ein Haken darauf wuerde ohne Ankuendigung alle
     Ferienwohnungen aus der Liste nehmen. Wer danach filtern will, kommt
     ueber den Reiter "Hotels" dorthin - der Agent wechselt dafuer selbst
     und sagt, warum. */
  if (state.type === "unterkunft") {
    const gemeinsam = [...new Set([...FILTER_AMENITIES, ...APT_AMENITIES])];
    html += group("Ausstattung", gemeinsam.filter((a) => countIn((h) => (h.amenities || []).includes(a)))
      .map((a) => checkRow("js-amen", a, AMENITY_LABELS[a], zaehleFuer("ausstattung", (h) => (h.amenities || []).includes(a)), state.amenities.has(a))).join(""));
  }

  if (state.type === "apartment") {
    html += group("Schlafzimmer",
      [{ v: 0, l: "Egal" }, { v: 1, l: "1 oder mehr" }, { v: 2, l: "2 oder mehr" }, { v: 3, l: "3 oder mehr" }]
        .map((o) => radioRow("fBed", "js-bed", o.v, o.l, countIn((a) => a.bedrooms >= o.v), state.minBedrooms === o.v)).join(""));
    html += group("Ausstattung", APT_AMENITIES.filter((a) => countIn((h) => h.amenities.includes(a)))
      .map((a) => checkRow("js-amen", a, AMENITY_LABELS[a], zaehleFuer("ausstattung", (h) => h.amenities.includes(a)), state.amenities.has(a))).join(""));
  }

  if (state.type === "car") {
    html += group("Fahrzeugklasse", [...new Set(CARS.map((c) => c.category))]
      .map((c) => checkRow("js-carcat", c, c, countIn((x) => x.category === c), state.carCategories.has(c))).join(""));
    html += group("Getriebe", ["Automatik", "Schaltgetriebe"]
      .map((t) => checkRow("js-trans", t, t, countIn((x) => x.transmission === t), state.transmissions.has(t))).join(""));
    html += group("Bewertung",
      [{ v: 4.5, l: "Ab 4,5" }, { v: 4.0, l: "Ab 4,0" }, { v: 0, l: "Alle" }]
        .map((o) => radioRow("fRating", "js-rating", o.v, o.l, countIn((c) => c.rating >= o.v), state.minRating === o.v)).join(""));
    html += group("Bedingungen",
      `<label class="check-row"><input type="checkbox" class="js-cancel" ${state.freeCancel ? "checked" : ""}/><span>Kostenlos stornierbar</span><span class="count">${countIn((c) => c.freeCancellation)}</span></label>`);
  }

  if (state.type === "flight") {
    html += group("Fluggesellschaft", [...new Set(FLIGHTS.map((f) => f.airline))].sort()
      .map((a) => checkRow("js-airline", a, a, countIn((f) => f.airline === a), state.airlines.has(a))).join(""));
    html += group("Stopps",
      `<label class="check-row"><input type="checkbox" class="js-direct" ${state.directOnly ? "checked" : ""}/><span>Nur Direktflüge</span><span class="count">${countIn((f) => f.stops === 0)}</span></label>`);
  }

  html += `<div class="filter-group filter-reset"><button type="button" class="btn btn-ghost btn-sm btn-block" id="fReset">Filter zurücksetzen</button></div>`;
  panel.innerHTML = html;

  const price = panel.querySelector("#fPrice");
  price.addEventListener("input", () => {
    state.priceMax = +price.value;
    panel.querySelector("#fPriceOut").textContent = formatPrice(state.priceMax);
    renderResults();
  });

  const gesamt = panel.querySelector("#fGesamt");
  if (gesamt) {
    gesamt.addEventListener("input", () => {
      const max = +gesamt.max;
      state.gesamtMax = +gesamt.value >= max ? null : +gesamt.value;
      panel.querySelector("#fGesamtOut").textContent = state.gesamtMax == null ? "ohne Grenze" : formatPrice(state.gesamtMax);
      renderResults();
    });
  }

  const bindSet = (cls, target) => panel.querySelectorAll(cls).forEach((el) =>
    el.addEventListener("change", () => { el.checked ? target.add(el.value) : target.delete(el.value); renderResults(); }));

  bindSet(".js-ziel", state.ziele);
  bindSet(".js-star", state.stars);
  bindSet(".js-cat", state.categories);
  bindSet(".js-amen", state.amenities);
  bindSet(".js-board", state.boards);
  bindSet(".js-carcat", state.carCategories);
  bindSet(".js-trans", state.transmissions);
  bindSet(".js-airline", state.airlines);

  panel.querySelectorAll(".js-rating").forEach((el) => el.addEventListener("change", () => { state.minRating = +el.value; renderResults(); }));
  panel.querySelectorAll(".js-beach").forEach((el) => el.addEventListener("change", () => { state.maxBeach = el.value === "" ? null : +el.value; renderResults(); }));
  panel.querySelectorAll(".js-bed").forEach((el) => el.addEventListener("change", () => { state.minBedrooms = +el.value; renderResults(); }));

  panel.querySelector(".js-direct")?.addEventListener("change", (e) => { state.directOnly = e.target.checked; renderResults(); });
  panel.querySelector(".js-cancel")?.addEventListener("change", (e) => { state.freeCancel = e.target.checked; renderResults(); });
  panel.querySelector(".js-deals")?.addEventListener("change", (e) => { state.onlyDeals = e.target.checked; renderResults(); });
  panel.querySelector(".js-wlan")?.addEventListener("change", (e) => { state.wlanFrei = e.target.checked; renderResults(); });

  panel.querySelector("#fReset").addEventListener("click", () => {
    state.stars.clear(); state.categories.clear(); state.amenities.clear(); state.boards.clear();
    state.carCategories.clear(); state.transmissions.clear(); state.airlines.clear();
    state.minRating = 0; state.maxBeach = null; state.minBedrooms = 0;
    state.directOnly = false; state.freeCancel = false; state.onlyDeals = false; state.wlanFrei = false;
    state.ziel = ""; state.ziele.clear();
    state.priceMax = priceBounds().max;
    state.gesamtMax = null;
    renderFilters(); renderResults();
  });
}

/* ---------- Karten je Typ ---------- */
function stayResultCard(item) {
  const isApt = item.type === "apartment";
  const sub = isApt
    ? `${item.bedrooms} Schlafzimmer · ${item.size} m² · bis ${item.maxGuests} Personen`
    : `${starString(item.stars)} · ${CATEGORY_LABELS[item.category]}`;
  /* "wifi" traegt das Etikett "WLAN inklusive" - das stimmt nicht bei
     jedem Haus, seit ein Viertel eine Tagesgebuehr verlangt. Auf der
     Karte steht deshalb der Preis, wenn es einen gibt, und der
     allgemeine Haken faellt weg. */
  const tags = item.amenities.filter((a) => a !== "wifi").slice(0, 5);

  const ziel = typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[item.ziel] : null;
  const saison = ziel ? saisonLabel(ziel, reisemonat()) : null;
  const preis = saisonpreis(item);

  return `
<div class="result-card">
  <a class="result-media" href="${hausLink(item.id)}" data-bild="${titelbildVon(item.id)}" aria-label="${item.name}">
    ${item.oldPrice ? '<span class="hotel-flag">Angebot</span>' : ""}
    ${wishButton(item.id)}
  </a>
  <div class="result-body">
    <div class="result-main">
      <div class="hotel-stars">${sub}</div>
      <a class="hotel-name" style="font-size:1.1rem;text-decoration:none" href="${hausLink(item.id)}">${item.name}</a>
      <div class="hotel-loc">${ICONS.pin}${item.location}${ziel ? ` · ${ziel.name}, ${ziel.land}` : ""}</div>
      ${saison ? `<div class="saison-zeile"><span class="saison ${saison.klasse}">${saison.text}</span><span class="saison-info">Hauptsaison ${saisonText(ziel)}</span></div>` : ""}
      <p class="result-desc">${item.shortDescription}</p>
      <div class="hotel-tags">${tags.map((a) => `<span class="tag">${AMENITY_LABELS[a] || a}</span>`).join("")}${
        typeof wlanGebuehr === "function"
          ? (wlanGebuehr(item) > 0
            ? `<span class="tag tag-hinweis">WLAN ${wlanGebuehr(item)} € pro Tag</span>`
            : `<span class="tag">WLAN inklusive</span>`) : ""}</div>
    </div>
    <div class="result-side">
      <div class="rating-chip">
        <span class="rating-text" style="text-align:right"><strong>${ratingLabel(item.rating)}</strong><span>${item.reviewCount} Bewertungen</span></span>
        <span class="rating-score">${item.rating.toFixed(1)}</span>
      </div>
      <div class="result-price">
        ${preis < item.pricePerNight ? `<div class="price-old">${formatPrice(item.pricePerNight)}</div>`
          : item.oldPrice ? `<div class="price-old">${formatPrice(item.oldPrice)}</div>` : ""}
        <div class="price-main">${formatPrice(preis)}</div>
        <div class="price-note">pro Nacht${Reisedaten.flex() ? ` im ${Reisedaten.MONATSNAMEN[Reisedaten.flex().monat - 1]}` : ""} inkl. Steuern</div>
        ${paketZeile(item, preis)}
        <a class="btn btn-primary btn-sm" style="margin-top:8px" href="${hausLink(item.id)}">Details ansehen</a>
      </div>
    </div>
  </div>
</div>`;
}

function carResultCard(car) {
  return `
<div class="result-card compact">
  <div class="result-media" data-bild="${titelbildVon(car.id)}" aria-label="${car.model}"></div>
  <div class="result-body">
    <div class="result-main">
      <div class="hotel-name" style="font-size:1.08rem">${car.model}${typeof bildIstStellvertreter === "function" && bildIstStellvertreter(car.id) ? ` <span class="hint" style="font-weight:400">oder ähnlich</span>` : ""}</div>
      <div class="hotel-loc">${ICONS.pin}${car.pickup} · ${car.supplier}</div>
      <div class="spec-row">
        <span>${ICONS.users}${car.seats} Sitze</span>
        <span>${ICONS.luggage}${car.bags} Koffer</span>
        <span>${ICONS.gear}${car.transmission}</span>
        <span>${car.fuel}</span>
      </div>
      <div class="hotel-tags">
        <span class="tag">${car.mileage}</span>
        ${car.aircon ? '<span class="tag">Klimaanlage</span>' : ""}
        ${car.freeCancellation ? '<span class="tag tag-ok">Kostenlos stornierbar</span>' : ""}
      </div>
    </div>
    <div class="result-side">
      <div class="rating-chip">
        <span class="rating-text" style="text-align:right"><strong>${ratingLabel(car.rating)}</strong><span>${car.reviewCount} Bewertungen</span></span>
        <span class="rating-score">${car.rating.toFixed(1)}</span>
      </div>
      <div class="result-price">
        <div class="price-main">${formatPrice(car.pricePerDay)}</div>
        <div class="price-note">pro Tag</div>
        <button type="button" class="btn btn-primary btn-sm js-book" data-id="${car.id}" style="margin-top:8px">Auswählen</button>
      </div>
    </div>
  </div>
</div>`;
}

// Wie viele Tage spaeter kommt der Flug an? Auf der Langstrecke stand sonst
// eine Ankunft um 04:47 unter einem Abflug um 11:26 - das liest sich, als
// landete das Flugzeug vor dem Start.
function tagesversatz(f) {
  const min = (s) => { const [h, m] = String(s).split(":").map(Number); return h * 60 + m; };
  const d = String(f.duration).match(/(\d+)h\s*(\d+)?/);
  if (!d) return 0;
  const dauer = +d[1] * 60 + (+d[2] || 0);
  return Math.floor((min(f.depart) + dauer) / 1440);
}

function flightResultCard(f) {
  const plus = tagesversatz(f);
  return `
<div class="result-card compact">
  <div class="result-body flight-body">
    <div class="flight-route">
      <div class="flight-airline">${ICONS.plane}${f.airline}</div>
      <div class="flight-times">
        <div><strong>${f.depart}</strong><span>${f.fromCode}</span></div>
        <div class="flight-line"><span>${f.duration}</span><i></i><small>${f.stops === 0 ? "Direktflug" : `${f.stops} ${f.stops === 1 ? "Stopp" : "Stopps"}`}</small></div>
        <div><strong>${f.arrive}${plus ? `<sup style="font-size:.62em;margin-left:1px">+${plus}</sup>` : ""}</strong><span>${f.toCode}</span></div>
      </div>
      <div class="flight-meta">${f.from} → ${f.to} · ${f.aircraft} · ${f.baggage}</div>
    </div>
    <div class="result-side">
      <div class="result-price">
        <div class="price-main">${formatPrice(f.price)}</div>
        <div class="price-note">pro Person</div>
        <button type="button" class="btn btn-primary btn-sm js-book" data-id="${f.id}" style="margin-top:8px">Auswählen</button>
      </div>
    </div>
  </div>
</div>`;
}

function cardFor(item) {
  if (item.type === "car") return carResultCard(item);
  if (item.type === "flight") return flightResultCard(item);
  return stayResultCard(item);
}

/* ---------- Flug-Zusatzblock bei Unterkunftssuche ---------- */
function renderFlightAddon() {
  const box = document.getElementById("flightAddon");
  if (!state.withFlight || state.type !== "hotel" || typeof Flug === "undefined") { box.innerHTML = ""; return; }
  // Eine Zeile: was der Flug kostet, steht bei jedem Hotel in der Karte.
  // Den konkreten Flug waehlt man auf der Hausseite.
  const s = Flug.get();
  const ab = Flug.abText(s.ab);
  const b = Belegung.get();
  // Ein konkreter Flugpreis nur, wenn genau ein Ziel gefiltert ist
  const zielId = einzigesZiel();
  const ziel = zielId && typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[zielId] : null;
  const flug = ziel ? Flug.wahl(ziel.id) : null;
  box.innerHTML = `
  <div class="addon-panel">
    <div class="addon-head">
      <div>${ICONS.plane}<strong>Mit Flug ab ${ab}</strong> · ${Flug.KLASSEN[s.klasse].label} · Hin- und Rückflug für ${b.personen} ${b.personen === 1 ? "Person" : "Personen"}${flug ? ` · ab ${formatPrice(Flug.preisProPerson(flug))} pro Person nach ${ziel.name}` : ""}</div>
      <a class="section-link" href="results.html?type=flight${zielId ? `&ziel=${zielId}` : ""}">Alle Flüge ansehen →</a>
    </div>
  </div>`;
}

/* ---------- Rendern ---------- */
/* Die Zahlen in der Spalte nachfuehren, ohne sie neu zu bauen.
   ------------------------------------------------------------------
   Neu bauen wuerde beim Ziehen des Preisreglers den Fokus wegnehmen und
   die Spalte springen lassen. Also werden nur die Zahlen ersetzt - nach
   jeder Filteraenderung, damit sie zeigen, was wirklich in der Liste
   steht. Bei null bleibt das Feld leer. */
function zahlenAktualisieren() {
  const panel = document.getElementById("filterPanel");
  if (!panel || !["unterkunft", "hotel", "apartment"].includes(state.type)) return;
  const setze = (el, n) => {
    const feld = el.closest(".check-row")?.querySelector(".count");
    if (feld) feld.textContent = n ? String(n) : "";
  };
  panel.querySelectorAll(".js-ziel").forEach((el) => setze(el, zaehleFuer("ziel", (h) => h.ziel === el.value)));
  panel.querySelectorAll(".js-amen").forEach((el) => setze(el, zaehleFuer("ausstattung", (h) => (h.amenities || []).includes(el.value))));
  panel.querySelectorAll(".js-star").forEach((el) => setze(el, zaehleFuer("sterne", (h) => h.stars === +el.value)));
  panel.querySelectorAll(".js-cat").forEach((el) => setze(el, zaehleFuer("kategorie", (h) => h.category === el.value)));
  panel.querySelectorAll(".js-board").forEach((el) => setze(el, zaehleFuer("verpflegung", (h) => (h.boards || []).some((x) => x.key === el.value))));
  panel.querySelectorAll(".js-rating").forEach((el) => setze(el, zaehleFuer("bewertung", (h) => h.rating >= +el.value)));
  panel.querySelectorAll(".js-beach").forEach((el) => setze(el, el.value === ""
    ? zaehleFuer("strand", () => true)
    : zaehleFuer("strand", (h) => h.distanceToBeach !== null && h.distanceToBeach <= +el.value)));
  const deals = panel.querySelector(".js-deals");
  if (deals) setze(deals, zaehleFuer("angebote", (h) => h.oldPrice));
  const wlan = panel.querySelector(".js-wlan");
  if (wlan && typeof wlanGebuehr === "function") setze(wlan, zaehleFuer("wlan", (h) => wlanGebuehr(h) === 0));
}

function renderResults() {
  const filtered = sortItems(pool().filter(matches));
  const list = document.getElementById("resultList");

  // Ueberschrift folgt dem gewaehlten Ziel, nicht mehr fest Mallorca
  const einzeln = einzigesZiel();
  const gewaehlt = einzeln && typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[einzeln] : null;
  document.getElementById("resultsTitle").textContent =
    TYPE_LABELS[state.type] + (gewaehlt ? ` nach ${gewaehlt.name}` : "");
  const belegungText = ["unterkunft", "hotel", "apartment"].includes(state.type)
    ? ` · ${Reisedaten.text() ? `${Reisedaten.text()} · ` : ""}${Belegung.text()}` : "";
  document.getElementById("resultsCount").textContent =
    `${filtered.length} von ${pool().length} Ergebnissen${state.q ? ` für „${state.q}“` : ""}${belegungText}`;

  list.innerHTML = filtered.length
    ? filtered.map(cardFor).join("")
    : `<div class="result-empty"><strong>Nichts gefunden.</strong><p style="margin:8px 0 0">Versuche es mit weniger Filtern oder einem größeren Preisrahmen.</p></div>`;

  applyScenes(list);
  bindWishButtons(list);
  bindBookButtons(list);
  // Die Zahlen in der Spalte zeigen, was jetzt in der Liste steht
  zahlenAktualisieren();
}

function bindBookButtons(root) {
  root.querySelectorAll(".js-book").forEach((btn) =>
    btn.addEventListener("click", () => {
      // Zeitraum und Reisegruppe mitgeben, sonst rechnet der Checkout beim
      // Mietwagen mit sieben Standardtagen und beim Flug mit einer Person
      window.location.href = Reisedaten.anLink(Belegung.anLink(`checkout.html?id=${btn.dataset.id}`));
    })
  );
}

function renderSortOptions() {
  const sel = document.getElementById("sortSelect");
  sel.innerHTML = SORT_OPTIONS[state.type].map((o) => `<option value="${o.v}">${o.l}</option>`).join("");
  sel.value = SORT_OPTIONS[state.type].some((o) => o.v === state.sort) ? state.sort : "empfehlung";
  state.sort = sel.value;
}

function switchType(type) {
  state.type = type;
  state.stars.clear(); state.categories.clear(); state.amenities.clear(); state.boards.clear();
  state.carCategories.clear(); state.transmissions.clear(); state.airlines.clear();
  state.minRating = 0; state.maxBeach = null; state.minBedrooms = 0;
  state.directOnly = false; state.freeCancel = false; state.onlyDeals = false;
  state.priceMax = priceBounds().max;
  state.gesamtMax = null;
  state.sort = "empfehlung";

  document.querySelectorAll(".header-nav a").forEach((a) =>
    a.classList.toggle("active", a.getAttribute("href").includes(`type=${type}`)));

  renderSortOptions();
  renderFilters();
  renderFlightAddon();
  renderResults();
}

document.addEventListener("DOMContentLoaded", () => {
  readUrl();
  mountChrome(state.type);
  state.priceMax = priceBounds().max;
  state.gesamtMax = null;

  SearchBox.mount("#searchBox", {
    onSubmit: (query) => {
      const typeChanged = query.type !== state.type;
      state.q = query.q;
      state.withFlight = query.flight === "1";
      if (typeof Flug !== "undefined") Flug.set({ mit: state.withFlight, ab: query.ab || "", klasse: query.klasse || "economy" });
      // Zuerst die URL setzen: Belegung.get() liest die Reisegruppe daraus.
      // Vorher wurde erst gerendert und danach die URL geschrieben - eine
      // geaenderte Personenzahl wirkte deshalb erst nach dem Neuladen.
      window.history.replaceState({}, "", `results.html?${new URLSearchParams(query).toString()}`);
      if (typeChanged) switchType(query.type);
      else { renderFlightAddon(); renderResults(); }
    },
  });

  renderSortOptions();
  document.getElementById("sortSelect").addEventListener("change", (e) => { state.sort = e.target.value; renderResults(); });

  renderFilters();
  renderFlightAddon();
  renderResults();

  document.addEventListener("wishlist:change", () => Wishlist.updateBadge());
});

/* Filter auf dem Handy auf- und zuklappen. Die Zahl der gesetzten Filter
   steht am Knopf - sonst weiss man nach dem Zuklappen nicht mehr, ob und
   was gerade filtert. */
function verdrahteFilterschalter(panel) {
  const knopf = document.getElementById("filterSchalter");
  if (!knopf || !panel) return;

  const beschriften = () => {
    const n = [...panel.querySelectorAll("input[type=checkbox]")].filter((i) => i.checked).length
      + [...panel.querySelectorAll("input[type=radio]")].filter((i) => i.checked && i.value !== "" && i.value !== "0").length;
    knopf.textContent = n ? `Filter (${n})` : "Filter";
  };
  beschriften();
  panel.addEventListener("change", beschriften);

  if (knopf.dataset.verdrahtet) return;
  knopf.dataset.verdrahtet = "1";
  knopf.addEventListener("click", () => {
    const offen = panel.classList.toggle("offen");
    knopf.setAttribute("aria-expanded", String(offen));
  });
}
