// Detailseite fuer Hotels und Ferienwohnungen.
// Hotels: Zimmerkategorien + Verpflegung. Ferienwohnungen: ganze Wohnung,
// dafuer Reinigungspauschale und Mindestaufenthalt.

const BREAKDOWN_LABELS = {
  lage: "Lage", sauberkeit: "Sauberkeit", service: "Service", ausstattung: "Ausstattung",
  essen: "Essen", preis: "Preis-Leistung", kommunikation: "Kommunikation", checkin: "Check-in",
};

let item = null;
let isApartment = false;
let selectedRoom = 0;
let selectedBoard = 0;
let reviewFilter = "alle";
let reviewSeite = 0;
const REVIEWS_PRO_SEITE = 10;
let nights = 7;

function readParams() {
  const p = new URLSearchParams(window.location.search);
  const id = p.get("id");
  item = HOTELS.find((h) => h.id === id) || APARTMENTS.find((a) => a.id === id) || HOTELS[0];
  isApartment = item.type === "apartment";

  const from = p.get("from"), to = p.get("to");
  if (from && to) {
    const diff = Math.round((new Date(to) - new Date(from)) / 86400000);
    if (diff > 0) nights = diff;
  }
  if (isApartment && nights < item.minNights) nights = item.minNights;

  // Erstes Zimmer waehlen, das zur Reisegruppe passt
  if (!isApartment && item.rooms) {
    const b = Belegung.get();
    const proZimmer = Math.ceil(b.personen / b.zimmer);
    const treffer = item.rooms.findIndex((r) => r.maxGuests >= proZimmer);
    if (treffer > -1) selectedRoom = treffer;
  }
}

function renderHead() {
  document.title = `${item.name} — Voyara`;
  const typeLabel = isApartment ? "Ferienwohnung" : CATEGORY_LABELS[item.category];
  const listHref = `results.html?type=${isApartment ? "apartment" : "hotel"}`;

  document.getElementById("breadcrumb").innerHTML =
    `<a href="index.html">Startseite</a> › <a href="${listHref}">${isApartment ? "Ferienwohnungen" : "Hotels"}</a> › <a href="${listHref}&q=${encodeURIComponent(item.region)}">${item.region}</a> › <span>${item.name}</span>`;

  document.getElementById("detailHead").innerHTML = `
    <div>
      <div class="hotel-stars" style="margin-bottom:4px">${isApartment ? "" : starString(item.stars) + " "}<span style="color:var(--ink-500);font-size:.8rem;letter-spacing:0">${isApartment ? "" : "· "}${typeLabel}</span></div>
      <h1>${item.name}</h1>
      <div class="detail-sub">
        <span>${ICONS.pin} ${item.location}</span>
        ${item.distanceToBeach === null ? "" : `<span>${item.distanceToBeach === 0 ? "Direkt am Strand" : `${String(item.distanceToBeach).replace(".", ",")} km zum Strand`}</span>`}
        <span>${String(item.distanceToCenter).replace(".", ",")} km zum Zentrum</span>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:10px">
      <button type="button" class="btn btn-ghost btn-sm" id="detailWish"></button>
      <div class="rating-chip">
        <span class="rating-text" style="text-align:right"><strong>${ratingLabel(item.rating)}</strong><span>${item.reviewCount} Bewertungen</span></span>
        <span class="rating-score" style="font-size:1rem;padding:7px 11px">${item.rating.toFixed(1)}</span>
      </div>
    </div>`;

  const wishBtn = document.getElementById("detailWish");
  const paint = () => {
    const on = Wishlist.has(item.id);
    wishBtn.innerHTML = `${on ? ICONS.heartFilled : ICONS.heart} ${on ? "Gemerkt" : "Merken"}`;
    wishBtn.classList.toggle("is-wished", on);
  };
  paint();
  wishBtn.addEventListener("click", () => {
    const added = Wishlist.toggle(item.id);
    paint();
    toast(added ? "Zum Merkzettel hinzugefügt" : "Vom Merkzettel entfernt");
  });

  // Galerie zeigt alle Bilder des Objekts; das Rasterlayout nutzt die ersten drei
  document.getElementById("gallery").innerHTML = bilderVon(item.id)
    .map((pfad) => `<div data-bild="${pfad}"></div>`).join("");
  applyScenes(document.getElementById("gallery"));
}

function renderAbout() {
  const facts = isApartment
    ? `<div class="fact">${ICONS.home}<div><strong>${item.bedrooms} Schlafzimmer</strong><span>${item.bathrooms} Bad${item.bathrooms > 1 ? "er" : ""}</span></div></div>
       <div class="fact">${ICONS.building}<div><strong>${item.size} m²</strong><span>Wohnfläche</span></div></div>
       <div class="fact">${ICONS.users}<div><strong>bis ${item.maxGuests} Personen</strong><span>Belegung</span></div></div>
       <div class="fact">${ICONS.clock}<div><strong>ab ${item.minNights} Nächte</strong><span>Mindestaufenthalt</span></div></div>`
    : `${item.distanceToBeach === null ? "" : `<div class="fact">${ICONS.wave}<div><strong>${item.distanceToBeach === 0 ? "Direkt am Strand" : String(item.distanceToBeach).replace(".", ",") + " km"}</strong><span>zum Strand</span></div></div>`}
       <div class="fact">${ICONS.building}<div><strong>${String(item.distanceToCenter).replace(".", ",")} km</strong><span>zum Zentrum</span></div></div>
       <div class="fact">${ICONS.plane}<div><strong>${item.distanceToAirport} km</strong><span>zum Flughafen</span></div></div>
       <div class="fact">${ICONS.clock}<div><strong>ab 15:00 Uhr</strong><span>Check-in</span></div></div>`;

  document.getElementById("aboutPanel").innerHTML = `
    <h2>Über diese Unterkunft</h2>
    <p>${item.description}</p>
    <div class="hotel-tags" style="margin-top:4px">
      ${item.highlights.map((h) => `<span class="tag tag-brand">${h}</span>`).join("")}
    </div>
    <div class="fact-row">${facts}</div>`;
}

function renderAmenities() {
  document.getElementById("amenityPanel").innerHTML = `
    <h2>Ausstattung &amp; Services</h2>
    <div class="amenity-grid">
      ${item.amenities.map((a) => `<div class="amenity">${ICONS.check}${AMENITY_LABELS[a] || a}</div>`).join("")}
    </div>`;
}

const roomPrice = (i) => item.pricePerNight + item.rooms[i].priceDelta;
const boardPrice = (i) => item.boards[i].priceDelta;

// Wie viele Personen muessen je Zimmer unterkommen?
function personenProZimmer() {
  const b = Belegung.get();
  return Math.ceil(b.personen / b.zimmer);
}

function zimmerPasst(i) {
  return item.rooms[i].maxGuests >= personenProZimmer();
}

function renderRooms() {
  const panel = document.getElementById("roomPanel");

  if (isApartment) {
    panel.innerHTML = `
      <h2>Die ganze Wohnung für dich</h2>
      <p>Du buchst das komplette Objekt — keine geteilten Bereiche mit anderen Gästen.</p>
      <div class="room-table">
        <div class="room-row selected">
          <div class="room-info">
            <h4>${item.name}</h4>
            <div class="room-meta">
              <span>${item.size} m²</span><span>${item.bedrooms} Schlafzimmer</span>
              <span>${item.bathrooms} Bad${item.bathrooms > 1 ? "er" : ""}</span><span>bis ${item.maxGuests} Personen</span>
            </div>
            <div class="room-feats">${item.highlights.map((f) => `<span class="tag">${f}</span>`).join("")}</div>
          </div>
          <div class="room-pick">
            <div class="room-price">${formatPrice(item.pricePerNight)}<small>pro Nacht</small></div>
          </div>
        </div>
      </div>
      <p class="hint" style="margin-top:12px">Zzgl. einmalige Endreinigung ${formatPrice(item.cleaningFee)} · Mindestaufenthalt ${item.minNights} Nächte</p>`;
    return;
  }

  panel.innerHTML = `
    <h2>Zimmer wählen</h2>
    <div class="room-table">
      ${item.rooms.map((room, i) => {
        const passt = zimmerPasst(i);
        return `
        <div class="room-row ${i === selectedRoom ? "selected" : ""} ${passt ? "" : "zu-klein"}">
          <div class="room-info">
            <h4>${room.name}</h4>
            <div class="room-meta"><span>${room.size} m²</span><span>bis ${room.maxGuests} ${room.maxGuests === 1 ? "Person" : "Personen"}</span></div>
            <div class="room-feats">${room.features.map((f) => `<span class="tag">${f}</span>`).join("")}</div>
            ${passt ? "" : `<p class="room-hinweis">Reicht nicht für ${personenProZimmer()} Personen pro Zimmer</p>`}
          </div>
          <div class="room-pick">
            <div class="room-price">${formatPrice(roomPrice(i))}<small>pro Nacht</small></div>
            <button type="button" class="btn ${i === selectedRoom ? "btn-primary" : "btn-ghost"} btn-sm js-room" data-room="${i}" ${passt ? "" : "disabled"}>
              ${i === selectedRoom ? "Ausgewählt" : "Auswählen"}
            </button>
          </div>
        </div>`; }).join("")}
    </div>
    <h3 style="margin-top:22px">Verpflegung</h3>
    <div class="board-options">
      ${item.boards.map((b, i) => `
        <button type="button" class="board-chip ${i === selectedBoard ? "active" : ""} js-board" data-board="${i}">
          ${BOARD_LABELS[b.key]}
          <small>${b.priceDelta === 0 ? "im Preis enthalten" : `+ ${formatPrice(b.priceDelta)} / Nacht`}</small>
        </button>`).join("")}
    </div>`;

  panel.querySelectorAll(".js-room").forEach((btn) =>
    btn.addEventListener("click", () => { selectedRoom = +btn.dataset.room; renderRooms(); renderWidget(); }));
  panel.querySelectorAll(".js-board").forEach((btn) =>
    btn.addEventListener("click", () => { selectedBoard = +btn.dataset.board; renderRooms(); renderWidget(); }));
}

// Was wird in den Bewertungstexten eigentlich gelobt und bemaengelt?
//
// Das ist die Auswertung, die spaeter der Agent uebernehmen soll: Er liest
// nicht "4,2 von 5", sondern zaehlt aus, dass das Essen in 2.140 Bewertungen
// nur in 54 Prozent der Erwaehnungen gelobt wird. Deshalb steht der Block
// hier schon sichtbar auf der Seite - der Mehrwert des Agenten ist dann, dass
// er diese Arbeit abnimmt, statt dass der Nutzer sich durchblaettert.
function aspektBlock() {
  const k = aspektKurzfassung(item);
  if (!k.bilanz.length) return "";

  const zeilen = k.bilanz.map((a) => {
    const prozent = Math.round(a.anteilPositiv * 100);
    const ton = k.staerken.includes(a.label) ? "stark" : k.schwaechen.includes(a.label) ? "schwach" : "";
    return `<div class="aspekt-zeile ${ton}">
      <span class="aspekt-name">${a.label}</span>
      <span class="aspekt-bar"><i style="width:${prozent}%"></i></span>
      <span class="aspekt-wert">${prozent} % positiv</span>
      <span class="aspekt-zahl">${a.erwaehnungen.toLocaleString("de-DE")} Erwähnungen</span>
    </div>`;
  }).join("");

  const fazit = [];
  if (k.staerken.length) fazit.push(`Besonders gelobt: <strong>${k.staerken.join(", ")}</strong>`);
  if (k.schwaechen.length) fazit.push(`Häufiger bemängelt: <strong>${k.schwaechen.join(", ")}</strong>`);

  return `
    <div class="aspekt-block">
      <div class="aspekt-kopf">
        <h3>Was Gäste konkret erwähnen</h3>
        <span class="aspekt-hinweis">aus ${item.reviewCount.toLocaleString("de-DE")} Bewertungstexten ausgewertet</span>
      </div>
      <div class="aspekt-liste">${zeilen}</div>
      ${fazit.length ? `<p class="aspekt-fazit">${fazit.join(" · ")}</p>` : ""}
    </div>`;
}

// Zeigt unter jeder Bewertung, welche Aspekte sie anspricht. Macht sichtbar,
// worauf die Auswertung oben beruht.
function aspektMarker(r) {
  const eintraege = Object.entries(r.aspekte || {});
  if (!eintraege.length) return "";
  return `<div class="aspekt-marker">${eintraege.map(([id, w]) =>
    `<span class="marker ${w > 0 ? "plus" : "minus"}">${w > 0 ? "+" : "−"} ${ASPEKT_LABELS[id] || id}</span>`
  ).join("")}</div>`;
}

function renderReviews() {
  const gesamt = item.reviewCount;
  const verteilung = notenverteilung(item);

  // Beim Filtern wird ein groesserer Vorrat durchsucht, damit auch
  // "nur kritische" genug Treffer liefert
  const vorrat = reviewFilter === "alle"
    ? bewertungenFuer(item, 0, (reviewSeite + 1) * REVIEWS_PRO_SEITE)
    : bewertungenFuer(item, 0, Math.min(gesamt, 400))
        .filter((r) => (reviewFilter === "top" ? r.rating >= 5 : r.rating <= 3))
        .slice(0, (reviewSeite + 1) * REVIEWS_PRO_SEITE);

  const gefiltertGesamt = reviewFilter === "alle"
    ? gesamt
    : reviewFilter === "top"
      ? verteilung[5]
      : verteilung[3] + verteilung[2] + verteilung[1];

  const balken = [5, 4, 3, 2, 1].map((n) => {
    const anteil = gesamt ? (verteilung[n] / gesamt) * 100 : 0;
    return `<div class="verteilung-zeile">
      <span>${n} Sterne</span>
      <span class="breakdown-bar"><i style="width:${anteil}%"></i></span>
      <span class="verteilung-zahl">${verteilung[n].toLocaleString("de-DE")}</span>
    </div>`;
  }).join("");

  document.getElementById("reviewPanel").innerHTML = `
    <h2>Gästebewertungen</h2>
    <div class="review-summary">
      <div class="review-score-box">
        <div class="review-score-num">${item.rating.toFixed(1).replace(".", ",")}<span>/5</span></div>
        <div class="review-score-label">${ratingLabel(item.rating)}</div>
        <p>${gesamt.toLocaleString("de-DE")} Bewertungen</p>
      </div>
      <div class="breakdown">
        ${Object.entries(item.ratingBreakdown).map(([k, v]) => `
          <div class="breakdown-row">
            <span>${BREAKDOWN_LABELS[k] || k}</span>
            <span class="breakdown-bar"><i style="width:${(v / 5) * 100}%"></i></span>
            <span class="breakdown-val">${v.toFixed(1).replace(".", ",")}</span>
          </div>`).join("")}
      </div>
    </div>

    <div class="verteilung">${balken}</div>

    ${aspektBlock()}

    <div class="review-filters">
      <button type="button" class="board-chip ${reviewFilter === "alle" ? "active" : ""} js-rf" data-f="alle">Alle (${gesamt.toLocaleString("de-DE")})</button>
      <button type="button" class="board-chip ${reviewFilter === "top" ? "active" : ""} js-rf" data-f="top">Nur Bestnoten (${verteilung[5].toLocaleString("de-DE")})</button>
      <button type="button" class="board-chip ${reviewFilter === "kritisch" ? "active" : ""} js-rf" data-f="kritisch">Kritische (${(verteilung[3] + verteilung[2] + verteilung[1]).toLocaleString("de-DE")})</button>
    </div>

    <div class="review-list">
      ${vorrat.length ? vorrat.map((r) => `
        <article class="review-item">
          <div class="review-head">
            <div class="review-avatar"${r.avatar ? ` style="background-image:url('${avatarbild(r.avatar)}')"` : ""}>${r.avatar ? "" : r.author.charAt(0)}</div>
            <div class="review-who"><strong>${r.author}</strong><span>${r.travelType} · ${formatReviewDate(r.date)}</span></div>
            <span class="review-rating">${r.rating.toFixed(1)}</span>
          </div>
          <h4>${r.title}</h4>
          <p>${r.text}</p>
          ${aspektMarker(r)}
        </article>`).join("")
        : `<p style="color:var(--ink-500)">Für diesen Filter liegen keine Bewertungen vor.</p>`}
    </div>

    ${vorrat.length < gefiltertGesamt
      ? `<button type="button" class="btn btn-ghost btn-block" id="mehrReviews" style="margin-top:14px">
           Weitere Bewertungen laden (${(gefiltertGesamt - vorrat.length).toLocaleString("de-DE")} weitere)
         </button>`
      : ""}`;

  document.querySelectorAll(".js-rf").forEach((btn) =>
    btn.addEventListener("click", () => { reviewFilter = btn.dataset.f; reviewSeite = 0; renderReviews(); }));

  document.getElementById("mehrReviews")?.addEventListener("click", () => {
    reviewSeite++;
    renderReviews();
  });
}

function renderSimilar() {
  const source = isApartment ? APARTMENTS : HOTELS;
  const others = source.filter((h) => h.id !== item.id);
  const primary = others.filter((h) => h.region === item.region || h.category === item.category);
  const rest = others.filter((h) => !primary.includes(h))
    .sort((a, b) => Math.abs(a.pricePerNight - item.pricePerNight) - Math.abs(b.pricePerNight - item.pricePerNight));
  const similar = [...primary, ...rest].slice(0, 3);
  if (!similar.length) { document.getElementById("similarPanel").remove(); return; }

  const panel = document.getElementById("similarPanel");
  panel.innerHTML = `<h2>Ähnliche Unterkünfte</h2><div class="hotel-grid">${similar.map(stayCard).join("")}</div>`;
  applyScenes(panel);
  bindWishButtons(panel);
}

function renderWidget() {
  const b = Belegung.get();
  // Bei Hotels wird je gebuchtem Zimmer berechnet, eine Wohnung wird ganz gebucht
  const zimmerAnzahl = isApartment ? 1 : b.zimmer;
  const perNight = isApartment ? item.pricePerNight : roomPrice(selectedRoom) + boardPrice(selectedBoard);
  const stay = perNight * nights * zimmerAnzahl;
  const cleaning = isApartment ? item.cleaningFee : 35 * zimmerAnzahl;
  const total = stay + cleaning;
  const nightOptions = isApartment
    ? [item.minNights, item.minNights + 2, 7, 10, 14].filter((n, i, arr) => n >= item.minNights && arr.indexOf(n) === i)
    : [3, 5, 7, 10, 14];

  const subtitle = isApartment
    ? `Gesamte Wohnung · ${Belegung.text()}`
    : `${item.rooms[selectedRoom].name} · ${BOARD_LABELS[item.boards[selectedBoard].key]} · ${Belegung.text()}`;

  document.getElementById("bookingWidget").innerHTML = `
    <div class="bw-price">
      <strong>${formatPrice(perNight)}</strong>
      ${item.oldPrice ? `<s>${formatPrice(item.oldPrice)}</s>` : ""}
      <span style="font-size:.82rem;color:var(--ink-500)">/ Nacht</span>
    </div>
    <div class="bw-note">${subtitle}</div>
    <div class="field" style="margin-bottom:12px">
      <label for="bwNights">Aufenthaltsdauer</label>
      <select class="select" id="bwNights">
        ${nightOptions.map((n) => `<option value="${n}" ${n === nights ? "selected" : ""}>${n} Nächte</option>`).join("")}
      </select>
    </div>
    <div class="bw-lines">
      <div class="bw-line"><span>${formatPrice(perNight)} × ${nights} Nächte${zimmerAnzahl > 1 ? ` × ${zimmerAnzahl} Zimmer` : ""}</span><span>${formatPrice(stay)}</span></div>
      <div class="bw-line"><span>Endreinigung</span><span>${formatPrice(cleaning)}</span></div>
      <div class="bw-line" style="color:var(--ok)"><span>Servicegebühr</span><span>0 €</span></div>
    </div>
    <div class="bw-total"><span>Gesamtpreis</span><strong>${formatPrice(total)}</strong></div>
    <a class="btn btn-accent btn-block" href="${Belegung.anLink(`checkout.html?id=${item.id}&nights=${nights}&room=${selectedRoom}&board=${selectedBoard}`)}">Jetzt buchen</a>
    <p class="bw-hint">${ICONS.check} Kostenlos stornierbar bis 24 h vor Anreise</p>`;

  document.getElementById("bwNights").addEventListener("change", (e) => { nights = +e.target.value; renderWidget(); });
}

document.addEventListener("DOMContentLoaded", () => {
  readParams();
  mountChrome(isApartment ? "apartment" : "hotel");
  renderHead();
  renderAbout();
  renderAmenities();
  renderRooms();
  renderReviews();
  renderSimilar();
  renderWidget();
});
