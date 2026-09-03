// Merkzettel: zeigt alle gemerkten Eintraege (Unterkuenfte, Mietwagen, Fluege)
// und erlaubt Entfernen sowie direkten Sprung in die Buchung.

function miniCard(entry) {
  if (entry.type === "car") {
    return `
    <div class="wish-row">
      <div class="car-visual small">${ICONS.car}</div>
      <div class="wish-main">
        <strong>${entry.model}</strong>
        <span>${entry.category} · ${entry.supplier} · ${entry.pickup}</span>
      </div>
      <div class="wish-side">
        <div class="price-main">${formatPrice(entry.pricePerDay)}</div>
        <div class="price-note">pro Tag</div>
      </div>
      <div class="wish-actions">
        <a class="btn btn-primary btn-sm" href="checkout.html?id=${entry.id}">Buchen</a>
        <button type="button" class="btn btn-ghost btn-sm js-remove" data-id="${entry.id}">Entfernen</button>
      </div>
    </div>`;
  }

  if (entry.type === "flight") {
    return `
    <div class="wish-row">
      <div class="car-visual small">${ICONS.plane}</div>
      <div class="wish-main">
        <strong>${entry.airline} · ${entry.fromCode} → ${entry.toCode}</strong>
        <span>${entry.depart}–${entry.arrive} · ${entry.duration} · ${entry.stops === 0 ? "Direktflug" : entry.stops + " Stopp"}</span>
      </div>
      <div class="wish-side">
        <div class="price-main">${formatPrice(entry.price)}</div>
        <div class="price-note">pro Person</div>
      </div>
      <div class="wish-actions">
        <a class="btn btn-primary btn-sm" href="checkout.html?id=${entry.id}">Buchen</a>
        <button type="button" class="btn btn-ghost btn-sm js-remove" data-id="${entry.id}">Entfernen</button>
      </div>
    </div>`;
  }

  return `
  <div class="wish-row">
    <a class="wish-media" href="stay.html?id=${entry.id}" data-bild="${titelbildVon(entry.id)}" aria-label="${entry.name}"></a>
    <div class="wish-main">
      <strong>${entry.name}</strong>
      <span>${ICONS.pin}${entry.location} · ${entry.type === "apartment" ? "Ferienwohnung" : starString(entry.stars)}</span>
      <span class="wish-rating">${ratingLabel(entry.rating)} ${entry.rating.toFixed(1)} · ${entry.reviewCount} Bewertungen</span>
    </div>
    <div class="wish-side">
      <div class="price-main">${formatPrice(entry.pricePerNight)}</div>
      <div class="price-note">pro Nacht</div>
    </div>
    <div class="wish-actions">
      <a class="btn btn-primary btn-sm" href="stay.html?id=${entry.id}">Ansehen</a>
      <button type="button" class="btn btn-ghost btn-sm js-remove" data-id="${entry.id}">Entfernen</button>
    </div>
  </div>`;
}

function render() {
  const ids = Wishlist.read();
  const entries = ids.map(getItemById).filter(Boolean);
  const box = document.getElementById("wishContent");
  const sub = document.getElementById("wishSubline");
  const clearBtn = document.getElementById("clearWish");

  sub.textContent = entries.length
    ? `${entries.length} ${entries.length === 1 ? "Eintrag" : "Einträge"} gespeichert`
    : "Noch nichts gemerkt";
  clearBtn.hidden = entries.length === 0;

  if (!entries.length) {
    box.innerHTML = `
      <div class="result-empty">
        <strong>Dein Merkzettel ist leer.</strong>
        <p style="margin:8px 0 16px">Tippe bei einer Unterkunft auf das Herz, um sie hier zu sammeln.</p>
        <a class="btn btn-primary" href="results.html?type=hotel">Hotels ansehen</a>
      </div>`;
    return;
  }

  box.innerHTML = `<div class="wish-list">${entries.map(miniCard).join("")}</div>`;
  applyScenes(box);

  box.querySelectorAll(".js-remove").forEach((btn) =>
    btn.addEventListener("click", () => {
      Wishlist.remove(btn.dataset.id);
      toast("Vom Merkzettel entfernt");
      render();
    })
  );
}

document.addEventListener("DOMContentLoaded", () => {
  mountChrome(null);
  render();

  document.getElementById("clearWish").addEventListener("click", () => {
    Wishlist.write([]);
    toast("Merkzettel geleert");
    render();
  });
});
