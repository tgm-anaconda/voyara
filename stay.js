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
let anreise = null;      // "" = flexibel gesucht, Anreisetag noch offen
let vonFest = null;      // feste Anreise aus der Suche (from=...)

function readParams() {
  const p = new URLSearchParams(window.location.search);
  const id = p.get("id");
  item = HOTELS.find((h) => h.id === id) || APARTMENTS.find((a) => a.id === id) || HOTELS[0];
  isApartment = item.type === "apartment";

  const from = p.get("from"), to = p.get("to");
  if (from && to) {
    const diff = Math.round((new Date(to) - new Date(from)) / 86400000);
    if (diff > 0) nights = diff;
    vonFest = from;
  } else if (Reisedaten.flex()) {
    // Flexibel im Monat: Dauer aus der Suche, Anreisetag wird im
    // Buchungskasten gewaehlt
    nights = Reisedaten.flex().naechte;
    anreise = "";
  }
  if (isApartment && nights < item.minNights) nights = item.minNights;

  // Erstes Zimmer waehlen, das zur Reisegruppe passt
  if (!isApartment && item.rooms) {
    const b = Belegung.get();
    const proZimmer = Math.ceil(b.personen / b.zimmer);
    const treffer = item.rooms.findIndex((r) => r.maxGuests >= proZimmer);
    if (treffer > -1) selectedRoom = treffer;
  }

  /* Was der Agent eingestellt hat, bleibt eingestellt.
     ------------------------------------------------------------------
     Am 27.09.2026: Der Agent stellt beim Rundgang Halbpension ein, die
     Vorschlagskarte rechnet damit - und auf der Hausseite stand wieder
     Fruehstueck. Die Person sieht dann einen anderen Preis als gerade
     eben und weiss nicht, welcher gilt. Verpflegung und Zimmer wandern
     deshalb in der Adresse mit. */
  const board = p.get("board");
  if (board && !isApartment && item.boards) {
    const i = item.boards.findIndex((b) => b.key === board);
    if (i > -1) selectedBoard = i;
  }
  const zimmer = p.get("zimmerart");
  if (zimmer && !isApartment && item.rooms) {
    const i = item.rooms.findIndex((r) => String(r.name).toLowerCase() === String(zimmer).toLowerCase());
    if (i > -1) selectedRoom = i;
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
      ${item.amenities.filter((a) => a !== "wifi")
        .map((a) => `<div class="amenity">${ICONS.check}${AMENITY_LABELS[a] || a}</div>`).join("")}
      ${/* WLAN hat jedes Haus, der Preis unterscheidet sich - deshalb steht
           hier der Preis statt des allgemeinen Hakens "WLAN inklusive",
           der sonst auch bei Haeusern mit Tagesgebuehr dastuende. */ ""}
      <div class="amenity${typeof wlanGebuehr === "function" && wlanGebuehr(item) > 0 ? " amenity-kostet" : ""}">
        ${ICONS.check}${typeof wlanText === "function" ? wlanText(item) : "WLAN"}</div>
    </div>`;
}

// Nachtpreis im Reisemonat (Saison), wie in der Trefferliste
const basisPreis = () => preisImMonat(item, Reisedaten.monat());
const roomPrice = (i) => basisPreis() + item.rooms[i].priceDelta;
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
            <div class="room-price">${formatPrice(basisPreis())}<small>pro Nacht</small></div>
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
/* Ausgebaut am 27.09.2026.
   ------------------------------------------------------------------
   Der Block stand hier als Vorlage fuer das, was der Agent spaeter
   uebernehmen sollte. Genau das war der Fehler: Wenn die Auswertung
   ohnehin auf der Seite steht, ist es sinnlos, dass der Agent die
   Bewertungen durchgeht - er traegt dann nur ab, was jeder sehen kann.
   Nutzer am 27.09.: "Dadurch wird dieses Bewertung durchlesen eigentlich
   voellig irrelevant."

   Jetzt entsteht die Gegenueberstellung nur einmal, naemlich durch den
   Agenten. Die Hausseite zeigt weiter die Gesamtnote, die Teilnoten der
   Kategorien und alle Bewertungstexte - was der Agent daraus zaehlt,
   steht nur bei ihm.

   Bewusste Folge: Die Zahlen des Agenten lassen sich auf der Seite nicht
   mehr gegenpruefen. Fuer die Untersuchung ist das gewollt, es muss in
   der Arbeit aber benannt werden. */
function aspektBlock() {
  return "";
}

function aspektBlockAlt() {
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
      <!-- Die Teilnoten je Kategorie standen hier als Balkenliste. Sie
           sind am 27.09.2026 ausgebaut: Die Gegenueberstellung nach
           Kategorien soll nur an einer Stelle entstehen, naemlich beim
           Agenten. Gesamtnote und Zahl der Bewertungen bleiben, ebenso
           die Verteilung und alle Bewertungstexte - was ein Mensch
           daraus zieht, muss er selbst lesen. -->
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

/* Der Agent laedt mehr, als ein Mensch laden wuerde.
   ------------------------------------------------------------------
   Wunsch des Nutzers vom 27.09.2026: Beim Durchgehen der Bewertungen
   soll der Agent hundert Stimmen auf einmal vor sich haben und sie
   sichtbar durchrauschen lassen - "das muss sehr, sehr schnell
   aussehen". Mit zehn Karten je Klick geht das nicht: Die Liste ist zu
   kurz, um schnell zu wirken, egal wie schnell gescrollt wird. Die
   Strecke macht den Eindruck, nicht das Tempo.

   Wer die Seite von Hand bedient, bekommt weiter zehn je Klick. Das ist
   Absicht und nicht Bequemlichkeit: Dass der Agent in einem Zug
   ueberblickt, wofuer ein Mensch zehnmal klicken muesste, ist genau der
   Unterschied, um den es in dieser Arbeit geht. Wuerde die Seite jedem
   hundert zeigen, waere das Durchscrollen nur noch eine Animation. */
window.bewertungenAufstocken = function (anzahl) {
  const ziel = Math.min(Math.max(10, anzahl | 0), item.reviewCount || 0, 400);
  const seiten = Math.ceil(ziel / REVIEWS_PRO_SEITE) - 1;
  if (seiten <= reviewSeite) return document.querySelectorAll(".review-item").length;
  reviewSeite = seiten;
  renderReviews();
  return document.querySelectorAll(".review-item").length;
};

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
  const perNight = isApartment ? basisPreis() : roomPrice(selectedRoom) + boardPrice(selectedBoard);
  const stay = perNight * nights * zimmerAnzahl;
  const cleaning = isApartment ? item.cleaningFee : 35 * zimmerAnzahl;
  const total = stay + cleaning;
  // Die gesuchte Dauer muss dabei sein, sonst steht im Feld etwas anderes,
  // als die Person gesucht hat (11 Naechte fielen so auf 7 zurueck)
  const nightOptions = [...new Set((isApartment
    ? [item.minNights, item.minNights + 2, 7, 10, 14].filter((n) => n >= item.minNights)
    : [3, 5, 7, 10, 14]).concat(nights))].sort((a, b) => a - b);

  const subtitle = isApartment
    ? `Gesamte Wohnung · ${Belegung.text()}`
    : `${item.rooms[selectedRoom].name} · ${BOARD_LABELS[item.boards[selectedBoard].key]} · ${Belegung.text()}`;

  // Flug dazu (nur Hotels): der gewaehlte oder guenstigste Flug ab dem
  // Abflughafen aus der Suchleiste, Klasse aenderbar
  const flugAn = !isApartment && typeof Flug !== "undefined" && Flug.get().mit;
  const flugStand = flugAn ? Flug.get() : null;
  const flugOptionen = flugAn ? (Flug.optionen(item.ziel, flugStand.ab).length ? Flug.optionen(item.ziel, flugStand.ab) : Flug.optionen(item.ziel, "")) : [];
  const flug = flugAn ? Flug.wahl(item.ziel) : null;
  const flugProPerson = flug ? Flug.preisProPerson(flug) : 0;
  const flugGesamt = flugProPerson * b.personen;
  const totalMitFlug = total + flugGesamt;
  const flugBlock = !flugAn ? "" : `
    <div class="bw-flight">
      <div class="bw-flight-head">${ICONS.plane} Flug dazu</div>
      ${flug ? `
      <!-- Kein Auswahlfeld fuer die Verbindung.
           Wunsch des Nutzers am 02.10.2026: "Dass man es in keinem
           Dropdown bestimmen kann, welchen Flug man nimmt, sondern nur in
           so einer Uebersichtskarte. Genau wie auch bei den Hotels."
           Der Grund ist nicht Geschmack: Im Auswahlfeld steht keine
           Kennzeichnung der Partner-Airline. Wer dort waehlt, bekaeme die
           Manipulation gar nicht zu sehen und waere fuer die Erhebung
           verloren. -->
      <div class="field">
        <label>Verbindung</label>
        <div class="bw-flug-wahl">
          <div class="bw-flug-jetzt">
            <strong>${flug.airline}</strong>
            <small>${flug.depart}–${flug.arrive} · ${flug.stops === 0 ? "direkt" : `${flug.stops} Stopp`}${flug.baggage ? ` · ${flug.baggage}` : ""}</small>
            <small>${formatPrice(Flug.preisProPerson(flug))} pro Person</small>
          </div>
          ${flugOptionen.length > 1 ? `<button type="button" class="btn btn-ghost" id="bwFlugWahl">Andere Verbindung</button>` : ""}
        </div>
      </div>
      <div class="field" style="margin-bottom:0">
        <label for="bwKlasse">Klasse</label>
        <select class="select" id="bwKlasse">
          ${Object.entries(Flug.KLASSEN).map(([k, v]) => `<option value="${k}" ${k === flugStand.klasse ? "selected" : ""}>${v.label}</option>`).join("")}
        </select>
      </div>` : `<div class="bw-flight-none">Ab ${Flug.abText(flugStand.ab, "deinem Flughafen")} gibt es keinen Flug zu diesem Ziel.</div>`}
    </div>`;

  // Anreisetag. Flexibel gesucht: wird hier gewaehlt, vorher gibt es
  // keinen Buchungsknopf - kein erfundenes Datum. Mit Flug: nur an
  // Flugtagen der Verbindung, und nach n Naechten muss wieder einer sein;
  // das gilt auch fuer feste Daten, die keinen Flugtag treffen.
  const flex = Reisedaten.flex();
  const monatSchluessel = flex ? flex.schluessel : (vonFest ? vonFest.slice(0, 7) : null);
  const flugTage = flug && monatSchluessel ? Flug.anreiseTage(flug, monatSchluessel, nights) : null;
  const festPasst = !vonFest || !flug || Flug.passtTag(flug, vonFest, nights);
  const anreiseNoetig = !!flex || !festPasst;
  const anreiseFeld = !anreiseNoetig ? "" : (() => {
    const monatName = monatSchluessel ? Reisedaten.MONATSNAMEN[parseInt(monatSchluessel.slice(5, 7), 10) - 1] : "";
    const abreise = anreise ? `Abreise ${new Date(new Date(anreise).getTime() + nights * 86400000).toLocaleDateString("de-DE")}` : "";
    if (flug) {
      const tageText = `${flug.airline} ab ${flug.from} fliegt ${Flug.tageText(flug, true)}.`;
      if (!flugTage.length) {
        const alt = Flug.naechteAlternativen(flug, monatSchluessel, nights);
        return `
    <div class="field" style="margin-bottom:12px">
      <label>Anreise im ${monatName}</label>
      <small class="hint">${tageText} Mit ${nights} Nächten passt kein Rückflug${alt.length ? `; mit ${alt.join(" oder ")} Nächten geht es` : ""}.</small>
    </div>`;
      }
      return `
    <div class="field" style="margin-bottom:12px">
      <label for="bwAnreise">Anreise im ${monatName}</label>
      <select class="select" id="bwAnreise">
        <option value="" ${!anreise ? "selected" : ""}>Flugtag wählen</option>
        ${flugTage.map((d) => `<option value="${d}" ${d === anreise ? "selected" : ""}>${Flug.datumText(d)}</option>`).join("")}
      </select>
      <small class="hint">${tageText}${!festPasst && !anreise ? ` Der ${Flug.datumText(vonFest)} ist kein Flugtag, bitte einen wählen.` : ""}${abreise ? ` ${abreise}.` : ""}</small>
    </div>`;
    }
    const min = `${flex.schluessel}-01`;
    const letzter = new Date(flex.jahr, flex.monat, 0).getDate();
    const max = `${flex.schluessel}-${String(letzter).padStart(2, "0")}`;
    return `
    <div class="field" style="margin-bottom:12px">
      <label for="bwAnreise">Anreise im ${monatName}</label>
      <input class="input" type="date" id="bwAnreise" min="${min}" max="${max}" value="${anreise || ""}" />
      <small class="hint">${anreise ? abreise : "Im ganzen Monat frei, Preis gleich. Für die Buchung brauchen wir den Tag."}</small>
    </div>`;
  })();
  const buchenLink = (() => {
    let href = `checkout.html?id=${item.id}&nights=${nights}&room=${selectedRoom}&board=${selectedBoard}`;
    href = Belegung.anLink(href);
    if (anreiseNoetig && anreise) {
      const bis = new Date(new Date(anreise).getTime() + nights * 86400000);
      href += `&from=${anreise}&to=${Reisedaten.alsIso(bis)}`;
    } else if (!flex) {
      href = Reisedaten.anLink(href);
    }
    return typeof Flug !== "undefined" ? Flug.anLink(href) : href;
  })();
  const buchenKnopf = anreiseNoetig && !anreise
    ? `<button type="button" class="btn btn-accent btn-block" id="bwBook" disabled title="Bitte erst den Anreisetag wählen">${flug ? "Flugtag wählen" : "Anreisetag wählen"}</button>`
    : `<a class="btn btn-accent btn-block" id="bwBook" href="${buchenLink}">Jetzt buchen</a>`;

  document.getElementById("bookingWidget").innerHTML = `
    <div class="bw-price">
      <strong>${formatPrice(perNight)}</strong>
      ${item.oldPrice ? `<s>${formatPrice(item.oldPrice)}</s>` : ""}
      <span style="font-size:.82rem;color:var(--ink-500)">/ Nacht</span>
    </div>
    <div class="bw-note">${subtitle}</div>
    ${anreiseFeld}
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
      ${flug ? `<div class="bw-line"><span>Flug ${formatPrice(flugProPerson)} × ${b.personen} ${b.personen === 1 ? "Person" : "Personen"} (Hin und zurück)</span><span>${formatPrice(flugGesamt)}</span></div>` : ""}
    </div>
    ${flugBlock}
    <div class="bw-total"><span>Gesamtpreis${flug ? " mit Flug" : ""}</span><strong>${formatPrice(totalMitFlug)}</strong></div>
    ${buchenKnopf}
    <p class="bw-hint">${ICONS.check} Kostenlos stornierbar bis 24 h vor Anreise</p>`;

  document.getElementById("bwNights").addEventListener("change", (e) => { nights = +e.target.value; if (flug) anreise = ""; renderWidget(); });
  document.getElementById("bwAnreise")?.addEventListener("change", (e) => { anreise = e.target.value; renderWidget(); });
  document.getElementById("bwKlasse")?.addEventListener("change", (e) => { Flug.set({ klasse: e.target.value }); renderWidget(); });

  /* Die Verbindung waehlt man in der Uebersicht - an zwei Stellen.
     ------------------------------------------------------------------
     Der Nutzer am 02.10.2026: "Wenn ich mich fuer ein Hotel entschieden
     habe und auf Buchen klicke, dass dann das Flugpop-up noch kommt" -
     und: "Dass man es in keinem Dropdown bestimmen kann, sondern nur in
     so einer Uebersichtskarte. Genau wie auch bei den Hotels."

     Beides fuehrt hierher: der Klick auf "Jetzt buchen", solange noch
     keine Verbindung gewaehlt ist, und der Knopf "Andere Verbindung" in
     der Leiste. Dieselben Zeilen, dieselbe Kennzeichnung der
     Partner-Airline wie beim Agenten - sonst haenge die Manipulation
     davon ab, ob jemand den Agenten benutzt oder selbst klickt. */
  function flugKandidaten() {
    if (!flug || typeof Fluege === "undefined" || typeof Werkzeugkasten === "undefined") return [];
    const b = Belegung.get();
    // flugAb bleibt null: Flug.optionen nimmt dann den gemerkten
    // Flughafen - dieselbe Quelle, aus der die Leiste rechnet.
    try {
      return Werkzeugkasten.flugAuswahl(item, { flug: true, flugAb: null,
        flugKlasse: Flug.get().klasse || null, erwachsene: b.erwachsene, kinder: b.kinder });
    } catch { return []; }
  }

  function flugFensterOeffnen(weiterZu) {
    const kandidaten = flugKandidaten();
    if (kandidaten.length < 2) return false;
    const ids = kandidaten.map((k) => k.id);
    const partnerId = typeof Studie !== "undefined" && Studie.partnerflug ? Studie.partnerflug(ids) : null;
    /* Dieselbe Kennzeichnung wie beim Partnerhaus und beim Agenten - die
       Logik steht in Studie.gruppe(), damit es nicht zwei Wahrheiten gibt
       (siehe Kern.kennzeichnung). */
    const feste = ["ohne", "etikett", "text"];
    let stufe = typeof STELLSCHRAUBEN !== "undefined" && feste.includes(STELLSCHRAUBEN.kennzeichnung)
      ? STELLSCHRAUBEN.kennzeichnung : null;
    if (!stufe && typeof Studie !== "undefined" && Studie.daten && Studie.gruppe) {
      stufe = Studie.gruppe().kennzeichnung || null;
    }
    Fluege.zeigen(kandidaten.map((k) => ({ ...k, partner: k.id === partnerId })), null, {
      kennzeichnung: feste.includes(stufe) ? stufe : "etikett",
      kontext: `${item.name} · ${kandidaten.length} Verbindungen`,
      nachWahl: (id, gewaehlt) => {
        if (typeof Studie !== "undefined" && Studie.notieren) {
          Studie.notieren("flug_gewaehlt_selbst", { id, partner: id === partnerId,
            airline: gewaehlt?.flug?.airline || null, haus: item.id, wo: weiterZu ? "buchen" : "leiste" });
        }
        if (weiterZu) {
          /* Mit der Wahl im Gepaeck weiter zur Kasse. Der Link wurde ohne
             Flugkennung gebaut (es war keine gewaehlt), also kommt sie
             jetzt dazu - nicht noch einmal anLink, das wuerde ab und
             klasse doppelt anhaengen. */
          location.href = `${weiterZu}${weiterZu.includes("?") ? "&" : "?"}flug=${encodeURIComponent(id)}`;
          return;
        }
        // Aus der Leiste heraus: Flugtage und Preise neu rechnen
        anreise = anreise === null ? null : "";
        renderWidget();
      },
    });
    return true;
  }

  document.getElementById("bwFlugWahl")?.addEventListener("click", () => flugFensterOeffnen(null));

  const knopf = document.getElementById("bwBook");
  if (knopf && knopf.tagName === "A" && flug) {
    knopf.addEventListener("click", (e) => {
      if (Flug.get().flugId) return;            // schon gewaehlt
      const ziel = knopf.getAttribute("href");
      if (flugFensterOeffnen(ziel)) e.preventDefault();
    });
  }
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

  // Verweildauer auf der Detailseite - fuer die Studie: Wer drei Sekunden
  // bleibt, hat durchgewunken; wer eine Minute liest, hat geprueft.
  // pagehide statt unload, weil es auch beim Zurueck-Wischen auf dem
  // Handy zuverlaessig feuert; der sessionStorage-Schreibzugriff darin
  // ist synchron und geht nicht verloren.
  if (typeof Studie !== "undefined" && item) {
    let seit = Date.now();
    let gemeldet = false;
    const melden = () => {
      if (gemeldet) return;
      gemeldet = true;
      Studie.detailVerlassen(item.id, Math.round((Date.now() - seit) / 1000));
    };
    window.addEventListener("pagehide", melden);
    // Wer den Tab wechselt und zurueckkommt, liest weiter: Der zweite
    // Abschnitt wird als eigener Eintrag gemeldet, die Auswertung summiert.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") melden();
      else { seit = Date.now(); gemeldet = false; }
    });
  }
});
