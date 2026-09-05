// Ergebnisseite fuer alle vier Bestaende. Filterleiste und Sortierung
// wechseln je nach Typ (Hotel, Ferienwohnung, Mietwagen, Flug).

const FILTER_AMENITIES = ["pool", "beachfront", "spa", "familyFriendly", "kidsClub", "parking", "restaurant", "petsAllowed", "adultsOnly", "gym", "bikeRental", "seaView"];
// "spa" und "terrace" fehlten hier, obwohl 15 bzw. 65 Wohnungen sie fuehren.
// Wer nach einer Sauna suchte, konnte danach schlicht nicht filtern.
const APT_AMENITIES = ["kitchen", "washer", "balcony", "terrace", "pool", "spa", "parking", "aircon", "seaView", "petsAllowed", "familyFriendly", "wifi"];

const SORT_OPTIONS = {
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
  ziel: "",
  priceMax: 999,
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
  sort: "empfehlung",
  withFlight: false,
};

function pool() {
  if (state.type === "apartment") return APARTMENTS;
  if (state.type === "car") return CARS;
  if (state.type === "flight") return FLIGHTS;
  return HOTELS;
}

function priceOf(item) {
  return item.pricePerNight ?? item.pricePerDay ?? item.price ?? 0;
}

function priceBounds() {
  const prices = pool().map(priceOf);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

function readUrl() {
  const p = new URLSearchParams(window.location.search);
  state.type = p.get("type") || "hotel";
  state.q = p.get("q") || p.get("region") || "";
  if (p.get("category")) state.categories.add(p.get("category"));
  if (p.get("sort")) state.sort = p.get("sort");
  if (p.get("deals")) state.onlyDeals = true;
  if (p.get("flight") === "1") state.withFlight = true;
  state.ziel = p.get("ziel") || "";
}

// Reisemonat aus dem Anreisedatum. Bestimmt, ob ein Ziel Haupt- oder
// Nebensaison hat - und damit auch den Preis.
function reisemonat() {
  const von = Reisedaten.get().von;
  return von ? new Date(von).getMonth() + 1 : new Date().getMonth() + 1;
}

// Preis einer Unterkunft im gewaehlten Zeitraum
function saisonpreis(item) {
  const ziel = typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[item.ziel] : null;
  if (!ziel) return item.pricePerNight;
  return Math.round(item.pricePerNight * saisonFaktor(ziel, reisemonat()));
}

/* ---------- Filter-Logik ---------- */
function matches(item) {
  const q = state.q.trim().toLowerCase();

  if (state.type === "car") {
    if (q && !`${item.model} ${item.category} ${item.supplier} ${item.pickup}`.toLowerCase().includes(q)) return false;
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
  if (state.ziel && item.ziel !== state.ziel) return false;
  // Reisegruppe muss hineinpassen - vorher wurde die Personenzahl ignoriert
  if (!Belegung.passt(item)) return false;
  if (saisonpreis(item) > state.priceMax) return false;
  if (state.minRating && item.rating < state.minRating) return false;
  // Binnenziele haben distanceToBeach null - sie erfuellen keinen Strandfilter
  if (state.maxBeach !== null
      && (item.distanceToBeach === null || item.distanceToBeach > state.maxBeach)) return false;
  for (const a of state.amenities) if (!item.amenities.includes(a)) return false;

  if (state.type === "hotel") {
    if (state.stars.size && !state.stars.has(String(item.stars))) return false;
    if (state.categories.size && !state.categories.has(item.category)) return false;
    if (state.onlyDeals && !item.oldPrice) return false;
    if (state.boards.size) {
      const keys = item.boards.map((b) => b.key);
      if (![...state.boards].some((b) => keys.includes(b))) return false;
    }
  } else {
    if (state.minBedrooms && item.bedrooms < state.minBedrooms) return false;
  }
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

/* ---------- Filterleiste ---------- */
function group(title, inner) {
  return `<div class="filter-group"><h4>${title}</h4>${inner}</div>`;
}

function checkRow(cls, value, label, count, checked) {
  return `<label class="check-row"><input type="checkbox" class="${cls}" value="${value}" ${checked ? "checked" : ""}/><span>${label}</span><span class="count">${count}</span></label>`;
}

function radioRow(name, cls, value, label, count, checked) {
  return `<label class="check-row"><input type="radio" name="${name}" class="${cls}" value="${value}" ${checked ? "checked" : ""}/><span>${label}</span><span class="count">${count}</span></label>`;
}

function renderFilters() {
  const b = priceBounds();
  const unit = state.type === "car" ? "pro Tag" : state.type === "flight" ? "pro Person" : "pro Nacht";
  const panel = document.getElementById("filterPanel");
  let html = group(`Preis ${unit}`,
    `<div class="range-row"><input type="range" id="fPrice" min="${b.min}" max="${b.max}" step="1" value="${state.priceMax}" /></div>
     <div style="font-size:.84rem;color:var(--ink-500);margin-top:6px">bis <strong id="fPriceOut">${formatPrice(state.priceMax)}</strong></div>`);

  if (state.type === "hotel" || state.type === "apartment") {
    const monat = reisemonat();
    const zieleImBestand = ZIELE.filter((z) => countIn((h) => h.ziel === z.id));
    if (zieleImBestand.length > 1) {
      html += group("Reiseziel",
        [{ id: "", name: "Alle Ziele" }, ...zieleImBestand]
          .map((z) => radioRow("fZiel", "js-ziel", z.id, z.id
            ? `${z.name}${saisonPassung(z, monat) === 1 ? " ·&nbsp;Saison" : ""}`
            : z.name,
            z.id ? countIn((h) => h.ziel === z.id) : pool().length, state.ziel === z.id)).join(""));
    }

    html += group("Gästebewertung",
      [{ v: 4.5, l: "Hervorragend ab 4,5" }, { v: 4.0, l: "Sehr gut ab 4,0" }, { v: 3.5, l: "Gut ab 3,5" }, { v: 0, l: "Alle Bewertungen" }]
        .map((o) => radioRow("fRating", "js-rating", o.v, o.l, countIn((h) => h.rating >= o.v), state.minRating === o.v)).join(""));

    html += group("Entfernung zum Strand",
      [{ v: 0.2, l: "Direkt am Strand" }, { v: 1, l: "Bis 1 km" }, { v: 5, l: "Bis 5 km" }, { v: null, l: "Egal" }]
        .map((o) => radioRow("fBeach", "js-beach", o.v === null ? "" : o.v, o.l,
          o.v === null ? pool().length : countIn((h) => h.distanceToBeach !== null && h.distanceToBeach <= o.v), state.maxBeach === o.v)).join(""));
  }

  if (state.type === "hotel") {
    html += group("Sterne", [5, 4, 3, 2].map((s) => checkRow("js-star", s, "★".repeat(s), countIn((h) => h.stars === s), state.stars.has(String(s)))).join(""));
    html += group("Unterkunftsart", Object.entries(CATEGORY_LABELS).filter(([k]) => countIn((h) => h.category === k))
      .map(([k, l]) => checkRow("js-cat", k, l, countIn((h) => h.category === k), state.categories.has(k))).join(""));
    html += group("Verpflegung", Object.entries(BOARD_LABELS).filter(([k]) => countIn((h) => h.boards.some((x) => x.key === k)))
      .map(([k, l]) => checkRow("js-board", k, l, countIn((h) => h.boards.some((x) => x.key === k)), state.boards.has(k))).join(""));
    html += group("Ausstattung", FILTER_AMENITIES.filter((a) => countIn((h) => h.amenities.includes(a)))
      .map((a) => checkRow("js-amen", a, AMENITY_LABELS[a], countIn((h) => h.amenities.includes(a)), state.amenities.has(a))).join(""));
  }

  if (state.type === "apartment") {
    html += group("Schlafzimmer",
      [{ v: 0, l: "Egal" }, { v: 1, l: "1 oder mehr" }, { v: 2, l: "2 oder mehr" }, { v: 3, l: "3 oder mehr" }]
        .map((o) => radioRow("fBed", "js-bed", o.v, o.l, countIn((a) => a.bedrooms >= o.v), state.minBedrooms === o.v)).join(""));
    html += group("Ausstattung", APT_AMENITIES.filter((a) => countIn((h) => h.amenities.includes(a)))
      .map((a) => checkRow("js-amen", a, AMENITY_LABELS[a], countIn((h) => h.amenities.includes(a)), state.amenities.has(a))).join(""));
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

  const bindSet = (cls, target) => panel.querySelectorAll(cls).forEach((el) =>
    el.addEventListener("change", () => { el.checked ? target.add(el.value) : target.delete(el.value); renderResults(); }));

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
  panel.querySelectorAll(".js-ziel").forEach((el) => el.addEventListener("change", () => { state.ziel = el.value; renderResults(); }));
  panel.querySelector(".js-direct")?.addEventListener("change", (e) => { state.directOnly = e.target.checked; renderResults(); });
  panel.querySelector(".js-cancel")?.addEventListener("change", (e) => { state.freeCancel = e.target.checked; renderResults(); });

  panel.querySelector("#fReset").addEventListener("click", () => {
    state.stars.clear(); state.categories.clear(); state.amenities.clear(); state.boards.clear();
    state.carCategories.clear(); state.transmissions.clear(); state.airlines.clear();
    state.minRating = 0; state.maxBeach = null; state.minBedrooms = 0;
    state.directOnly = false; state.freeCancel = false; state.onlyDeals = false;
    state.ziel = "";
    state.priceMax = priceBounds().max;
    renderFilters(); renderResults();
  });
}

/* ---------- Karten je Typ ---------- */
function stayResultCard(item) {
  const isApt = item.type === "apartment";
  const sub = isApt
    ? `${item.bedrooms} Schlafzimmer · ${item.size} m² · bis ${item.maxGuests} Personen`
    : `${starString(item.stars)} · ${CATEGORY_LABELS[item.category]}`;
  const tags = isApt ? item.amenities.slice(0, 5) : item.amenities.slice(0, 5);

  const ziel = typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[item.ziel] : null;
  const saison = ziel ? saisonLabel(ziel, reisemonat()) : null;
  const preis = saisonpreis(item);

  return `
<div class="result-card">
  <a class="result-media" href="${Reisedaten.anLink(Belegung.anLink(`stay.html?id=${item.id}`))}" data-bild="${titelbildVon(item.id)}" aria-label="${item.name}">
    ${item.oldPrice ? '<span class="hotel-flag">Angebot</span>' : ""}
    ${wishButton(item.id)}
  </a>
  <div class="result-body">
    <div class="result-main">
      <div class="hotel-stars">${sub}</div>
      <a class="hotel-name" style="font-size:1.1rem;text-decoration:none" href="${Reisedaten.anLink(Belegung.anLink(`stay.html?id=${item.id}`))}">${item.name}</a>
      <div class="hotel-loc">${ICONS.pin}${item.location}${ziel ? ` · ${ziel.name}, ${ziel.land}` : ""}</div>
      ${saison ? `<div class="saison-zeile"><span class="saison ${saison.klasse}">${saison.text}</span><span class="saison-info">Hauptsaison ${saisonText(ziel)}</span></div>` : ""}
      <p class="result-desc">${item.shortDescription}</p>
      <div class="hotel-tags">${tags.map((a) => `<span class="tag">${AMENITY_LABELS[a] || a}</span>`).join("")}</div>
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
        <div class="price-note">pro Nacht inkl. Steuern</div>
        <a class="btn btn-primary btn-sm" style="margin-top:8px" href="${Reisedaten.anLink(Belegung.anLink(`stay.html?id=${item.id}`))}">Details ansehen</a>
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
      <div class="hotel-name" style="font-size:1.08rem">${car.model}</div>
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

function flightResultCard(f) {
  return `
<div class="result-card compact">
  <div class="result-body flight-body">
    <div class="flight-route">
      <div class="flight-airline">${ICONS.plane}${f.airline}</div>
      <div class="flight-times">
        <div><strong>${f.depart}</strong><span>${f.fromCode}</span></div>
        <div class="flight-line"><span>${f.duration}</span><i></i><small>${f.stops === 0 ? "Direktflug" : `${f.stops} Stopp`}</small></div>
        <div><strong>${f.arrive}</strong><span>${f.toCode}</span></div>
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
  if (!state.withFlight || (state.type !== "hotel" && state.type !== "apartment")) { box.innerHTML = ""; return; }
  // Nur Fluege zum gesuchten Ziel vorschlagen - vorher kamen die drei
  // guenstigsten der ganzen Welt, unabhaengig vom Reiseziel
  const passend = state.ziel ? FLIGHTS.filter((f) => f.ziel === state.ziel) : FLIGHTS;
  const cheapest = [...passend].sort((a, b) => a.price - b.price).slice(0, 3);
  box.innerHTML = `
  <div class="addon-panel">
    <div class="addon-head">
      <div>${ICONS.plane}<strong>Flug dazubuchen</strong></div>
      <a class="section-link" href="results.html?type=flight${state.ziel ? `&ziel=${state.ziel}` : ""}">Alle Flüge ansehen →</a>
    </div>
    <div class="addon-flights">
      ${cheapest.map((f) => `
        <button type="button" class="addon-flight js-book" data-id="${f.id}">
          <span class="af-air">${f.airline}</span>
          <span class="af-route">${f.fromCode} → ${f.toCode}</span>
          <span class="af-time">${f.depart}–${f.arrive}</span>
          <span class="af-price">${formatPrice(f.price)}</span>
        </button>`).join("")}
    </div>
  </div>`;
}

/* ---------- Rendern ---------- */
function renderResults() {
  const filtered = sortItems(pool().filter(matches));
  const list = document.getElementById("resultList");

  // Ueberschrift folgt dem gewaehlten Ziel, nicht mehr fest Mallorca
  const gewaehlt = state.ziel && typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[state.ziel] : null;
  document.getElementById("resultsTitle").textContent =
    TYPE_LABELS[state.type] + (gewaehlt ? ` nach ${gewaehlt.name}` : "");
  const belegungText = (state.type === "hotel" || state.type === "apartment")
    ? ` · ${Belegung.text()}` : "";
  document.getElementById("resultsCount").textContent =
    `${filtered.length} von ${pool().length} Ergebnissen${state.q ? ` für „${state.q}“` : ""}${belegungText}`;

  list.innerHTML = filtered.length
    ? filtered.map(cardFor).join("")
    : `<div class="result-empty"><strong>Nichts gefunden.</strong><p style="margin:8px 0 0">Versuche es mit weniger Filtern oder einem größeren Preisrahmen.</p></div>`;

  applyScenes(list);
  bindWishButtons(list);
  bindBookButtons(list);
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

  SearchBox.mount("#searchBox", {
    onSubmit: (query) => {
      const typeChanged = query.type !== state.type;
      state.q = query.q;
      state.withFlight = query.flight === "1";
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
