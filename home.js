// Startseite: baut Hero-Elemente, Kategorien, Hotel-Sektionen, Vorteile,
// Partner, Bewertungs-Teaser und FAQ aus den Katalogdaten auf.

const FAQ_ITEMS = [
  {
    q: "Wie finde ich schnell die passende Unterkunft?",
    a: "Grenze zuerst über Reiseziel, Zeitraum und Personenzahl ein und nutze dann die Filter für Preis, Ausstattung und Entfernung zum Strand. Wer mag, kann seine Wünsche auch im Chat beschreiben.",
  },
  {
    q: "Kann ich meine Auswahl später noch ändern?",
    a: "Ja, jederzeit. Der komplette Hotelkatalog bleibt frei durchklickbar — du kannst parallel selbst suchen, filtern und eine andere Unterkunft wählen.",
  },
  {
    q: "Ist eine Auswahl sofort verbindlich?",
    a: "Nein. Erst der letzte Schritt im Buchungsprozess wäre verbindlich. Bis dahin lässt sich jede Auswahl ändern oder verwerfen.",
  },
  {
    q: "Woher kommen die Bewertungen?",
    a: "Bewertungen stammen von Gästen, die den jeweiligen Aufenthalt abgeschlossen haben. Auf jeder Hoteldetailseite findest du Einzelbewertungen und Teilnoten für Lage, Sauberkeit, Service, Ausstattung, Essen und Preis-Leistung.",
  },
  {
    q: "Was kostet die Nutzung von Voyara?",
    a: "Der Vergleich ist für dich kostenlos. Es entstehen keine Vermittlungsgebühren.",
  },
  {
    q: "Sind die Hotels und Preise echt?",
    a: "Nein. Voyara ist ein Prototyp für eine wissenschaftliche Studie. Alle Häuser, Preise und Bewertungen sind erfunden, es sind keine echten Buchungen möglich.",
  },
];

const USPS = [
  { icon: ICONS.sparkle, title: "Bewertungen im Klartext", text: "Zu jedem Haus siehst du, worüber Gäste wirklich schreiben — nach Lage, Sauberkeit, Service und Essen getrennt." },
  { icon: ICONS.eye, title: "Keine versteckten Kosten", text: "Der ausgewiesene Preis ist der Preis. Keine Servicegebühr, keine Aufschläge im letzten Schritt." },
  { icon: ICONS.tag, title: "Transparente Preise", text: "Der angezeigte Preis enthält alle Pflichtkosten. Keine Gebühren, die erst im Checkout auftauchen." },
  { icon: ICONS.shield, title: "Geprüfte Bewertungen", text: "Nur Gäste mit abgeschlossenem Aufenthalt können bewerten — inklusive Teilnoten je Kategorie." },
];

// Welches Headerbild die Startseite zeigt.
//
// Bewusst FEST und nicht zufaellig: In der Studie saehe sonst jede
// teilnehmende Person ein anderes Bild. Das Headerbild ist zwar nur
// Dekoration, aber Urlaubsfotos mit Menschen wirken auf die Stimmung, und
// Stimmung wirkt auf Vertrauen - genau die abhaengige Variable. Eine
// Stoergroesse, die nichts kostet, wenn man sie einfach konstant haelt.
//
// Zum Wechseln hier den Namen aendern: hero-1 und hero-2 sind Landschaften
// ohne Menschen, hero-3 bis hero-6 zeigen Urlaubssituationen.
const HERO_BILD = "hero-3";

function heroExtras() {
  // Grossflaechiges Foto hinter dem Hero
  const hero = document.querySelector(".hero");
  const bild = herobild(HERO_BILD) || herobild("hero-1");
  if (hero && bild) {
    hero.style.backgroundImage =
      `linear-gradient(100deg, rgba(6,53,44,.88) 0%, rgba(8,66,55,.62) 52%, rgba(8,66,55,.20) 100%), url("${bild}")`;
    hero.classList.add("hero-foto");
  }

  const stays = [...HOTELS, ...APARTMENTS];
  const avg = (stays.reduce((s, h) => s + h.rating, 0) / stays.length).toFixed(1);
  const totalReviews = stays.reduce((s, h) => s + h.reviewCount, 0);

  document.getElementById("heroEyebrow").innerHTML = `${ICONS.sparkle} Kostenlos stornierbar bis 24 Stunden vor Anreise`;
  document.getElementById("heroTrust").innerHTML = `
    <span>${ICONS.check} ${stays.length} Unterkünfte, ${CARS.length} Mietwagen, ${FLIGHTS.length} Flüge</span>
    <span>${ICONS.check} ⌀ ${avg.replace(".", ",")} von 5 Sternen</span>
    <span>${ICONS.check} ${totalReviews.toLocaleString("de-DE")} Gästebewertungen</span>`;
}

function renderCategories() {
  const counts = {};
  HOTELS.forEach((h) => (counts[h.category] = (counts[h.category] || 0) + 1));

  document.getElementById("categoryRow").innerHTML = Object.keys(CATEGORY_LABELS)
    .filter((key) => counts[key])
    .map(
      (key) => `
    <a class="category-tile" href="results.html?type=hotel&category=${key}">
      <div class="cat-icon">${CATEGORY_ICONS[key] || ICONS.bed}</div>
      <strong>${CATEGORY_LABELS[key]}</strong>
      <span>${counts[key]} ${counts[key] === 1 ? "Haus" : "Häuser"}</span>
    </a>`
    )
    .join("");
}

// Regionsname -> Dateiname, gleiche Regel wie in generate-prompts.mjs
function regionSlug(region) {
  return region.toLowerCase()
    .replaceAll("ä","ae").replaceAll("ö","oe").replaceAll("ü","ue").replaceAll("ß","ss")
    .replaceAll("á","a").replaceAll("é","e").replaceAll("í","i").replaceAll("ó","o").replaceAll("ú","u")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}

// Eigene Regionsbilder gibt es nur fuer die fuenfzehn Mallorca-Regionen aus
// der ersten Fassung. Fuer Wien, Lappland oder Kyoto existiert keins, und eine
// leere Kachel sieht nach einem Fehler aus. Ersatz kommt deshalb aus der Region
// selbst: Position 1 ist bei Hotels wie Ferienwohnungen das Ortsbild, also die
// Landschafts- oder Stadtaufnahme - genau das, was eine Regionskachel zeigt.
function regionsbildOderErsatz(region) {
  const eigenes = regionsbild(regionSlug(region));
  if (eigenes) return eigenes;

  const ausDerRegion = [...HOTELS, ...APARTMENTS]
    .filter((h) => h.region === region)
    .sort((a, b) => b.rating - a.rating);

  for (const item of ausDerRegion) {
    const ortsbild = (BILDER[item.id] || []).find((f) => f.endsWith("/1.jpg"));
    if (ortsbild) return ortsbild;
  }
  return "";
}

function renderRegions() {
  const counts = {};
  [...HOTELS, ...APARTMENTS].forEach((h) => (counts[h.region] = (counts[h.region] || 0) + 1));

  document.getElementById("regionRow").innerHTML = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([region, count]) => `
    <a class="category-tile region-tile" href="results.html?type=hotel&q=${encodeURIComponent(region)}">
      <div class="region-bild" data-bild="${regionsbildOderErsatz(region)}"></div>
      <strong>${region}</strong>
      <span>${count} ${count === 1 ? "Unterkunft" : "Unterkünfte"}</span>
    </a>`
    )
    .join("");
  applyScenes(document.getElementById("regionRow"));
}

function renderHotelSections() {
  const top = [...HOTELS].sort((a, b) => b.rating - a.rating).slice(0, 4);
  document.getElementById("topHotels").innerHTML = top.map(stayCard).join("");

  const apts = [...APARTMENTS].sort((a, b) => b.rating - a.rating).slice(0, 4);
  document.getElementById("topApartments").innerHTML = apts.map(stayCard).join("");

  const deals = HOTELS.filter((h) => h.oldPrice);
  document.getElementById("dealHotels").innerHTML = deals.map(stayCard).join("");

  ["topHotels", "topApartments", "dealHotels"].forEach((id) => {
    const el = document.getElementById(id);
    applyScenes(el);
    bindWishButtons(el);
  });
}

// Mietwagen- und Flug-Teaser auf der Startseite
function renderExtras() {
  const cheapestCar = [...CARS].sort((a, b) => a.pricePerDay - b.pricePerDay)[0];
  const cheapestFlight = [...FLIGHTS].sort((a, b) => a.price - b.price)[0];

  document.getElementById("extrasRow").innerHTML = `
    <a class="extra-card" href="results.html?type=car">
      <div class="extra-icon">${ICONS.car}</div>
      <div class="extra-body">
        <strong>Mietwagen ab Flughafen Palma</strong>
        <span>${CARS.length} Fahrzeuge von Kleinwagen bis Van</span>
        <span class="extra-price">ab ${formatPrice(cheapestCar.pricePerDay)} pro Tag</span>
      </div>
    </a>
    <a class="extra-card" href="results.html?type=flight">
      <div class="extra-icon">${ICONS.plane}</div>
      <div class="extra-body">
        <strong>Flüge nach Palma</strong>
        <span>Direktverbindungen aus ${new Set(FLIGHTS.map((f) => f.fromCode)).size} deutschen Städten</span>
        <span class="extra-price">ab ${formatPrice(cheapestFlight.price)} pro Person</span>
      </div>
    </a>`;
}

function renderUsps() {
  document.getElementById("uspGrid").innerHTML = USPS.map(
    (u) => `
    <article class="usp-card">
      <div class="usp-icon">${u.icon}</div>
      <h3>${u.title}</h3>
      <p>${u.text}</p>
    </article>`
  ).join("");
}

function renderPartners() {
  document.getElementById("partnerList").innerHTML = PARTNERS.map(
    (p) => `
    <div class="partner">
      <span class="partner-mark" style="background:${p.color}">${p.short}</span>
      ${p.name}
    </div>`
  ).join("");
}

function renderReviewTeaser() {
  const stays = [...HOTELS, ...APARTMENTS];
  const avg = stays.reduce((s, h) => s + h.rating, 0) / stays.length;
  const total = stays.reduce((s, h) => s + h.reviewCount, 0);

  document.getElementById("scoreCard").innerHTML = `
    <div class="score-big">${avg.toFixed(1).replace(".", ",")}<span>/5</span></div>
    <div class="score-stars">${"★".repeat(5)}</div>
    <p><strong>${ratingLabel(avg)}</strong><br>${total.toLocaleString("de-DE")} Bewertungen insgesamt</p>`;

  // Je eine starke Bewertung aus drei verschiedenen Haeusern
  // Nicht jedes Haus hat handgeschriebene Bewertungen - seit dem Generator
  // brauchen neue Objekte keine mehr. Fehlende werden erzeugt.
  const mitZitat = HOTELS.map((h) => {
    const echte = (h.reviews || []).find((r) => r.rating === 5);
    if (echte) return { hotel: h, review: echte };
    const erzeugt = bewertungenFuer(h, 0, 30).find((r) => r.rating === 5);
    return erzeugt ? { hotel: h, review: erzeugt } : null;
  }).filter(Boolean);
  const picks = mitZitat.slice(0, 3);

  document.getElementById("quoteGrid").innerHTML = picks
    .map(
      ({ hotel, review }) => `
    <article class="quote-card">
      <div class="hotel-stars" style="margin-bottom:8px">${"★".repeat(review.rating)}</div>
      <p>„${review.text}“</p>
      <div class="quote-meta"><strong>${review.author}</strong> · ${hotel.name}</div>
    </article>`
    )
    .join("");
}

function renderFaq() {
  document.getElementById("faqList").innerHTML = FAQ_ITEMS.map(
    (item) => `
    <div class="faq-item">
      <button type="button" class="faq-q">${item.q}</button>
      <div class="faq-a"><p>${item.a}</p></div>
    </div>`
  ).join("");

  document.querySelectorAll(".faq-item").forEach((item) => {
    item.querySelector(".faq-q").addEventListener("click", () => {
      const wasOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach((o) => o.classList.remove("open"));
      if (!wasOpen) item.classList.add("open");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  mountChrome(null);
  heroExtras();
  SearchBox.mount("#searchBox");
  renderCategories();
  renderHotelSections();
  renderExtras();
  renderRegions();
  renderUsps();
  renderPartners();
  renderReviewTeaser();
  renderFaq();
});
