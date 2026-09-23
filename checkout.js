// Buchungsstrecke in drei Schritten: Daten → Prüfen → Bestätigung.
// Bewusst ohne Zahlungsdaten: es ist ein Studienprototyp, es fließt kein Geld.

let entry = null;
let step = 1;
let nights = 7;
let roomIdx = 0;
let boardIdx = 0;
let guest = { name: "", mail: "", phone: "", note: "" };

function readParams() {
  const p = new URLSearchParams(window.location.search);
  entry = getItemById(p.get("id")) || HOTELS[0];
  // "nights" kommt von der Detailseite, sonst aus dem Reisezeitraum der Suche
  nights = p.get("nights") ? +p.get("nights") : Reisedaten.naechte(7);
  roomIdx = +(p.get("room") || 0);
  boardIdx = +(p.get("board") || 0);
  // Gastdaten aus dem Konto - so, wie jede Buchungsseite die Felder fuer
  // angemeldete Nutzer vorbelegt
  const konto = Account.konto?.();
  if (konto) { guest.name = `${konto.vorname} ${konto.nachname}`.trim(); guest.mail = konto.mail || ""; }
}

function isStay() { return entry.type === "hotel" || entry.type === "apartment"; }

function priceLines() {
  if (entry.type === "car") {
    const days = nights;
    const base = entry.pricePerDay * days;
    return { unit: `${formatPrice(entry.pricePerDay)} × ${days} Tage`, base, extraLabel: "Versicherungspaket", extra: 45, total: base + 45 };
  }
  if (entry.type === "flight") {
    const personen = Belegung.get().personen;
    const base = entry.price * personen;
    return {
      unit: `${formatPrice(entry.price)} × ${personen} ${personen === 1 ? "Person" : "Personen"}`,
      base, extraLabel: "Steuern und Gebühren", extra: 0, total: base,
    };
  }
  const b = Belegung.get();
  const zimmerAnzahl = entry.type === "apartment" ? 1 : b.zimmer;
  // Nachtpreis im Reisemonat (Saison), dieselbe Formel wie Liste und Hausseite
  const basis = preisImMonat(entry, Reisedaten.monat());
  const perNight = entry.type === "apartment"
    ? basis
    : basis + entry.rooms[roomIdx].priceDelta + entry.boards[boardIdx].priceDelta;
  const base = perNight * nights * zimmerAnzahl;
  const cleaning = (entry.type === "apartment" ? entry.cleaningFee : 35) * zimmerAnzahl;
  // Flug dazu (nur Hotels): gewaehlte Verbindung, Hin- und Rueckflug, alle Reisenden
  const f = flugDazu();
  return {
    unit: `${formatPrice(perNight)} × ${nights} Nächte${zimmerAnzahl > 1 ? ` × ${zimmerAnzahl} Zimmer` : ""}`,
    base, extraLabel: "Endreinigung", extra: cleaning,
    unterkunft: base + cleaning,
    flug: f,
    total: base + cleaning + (f ? f.gesamt : 0),
  };
}

function flugDazu() {
  if (entry.type !== "hotel" || typeof Flug === "undefined" || !Flug.get().mit) return null;
  const flug = Flug.wahl(entry.ziel);
  if (!flug) return null;
  const personen = Belegung.get().personen;
  const proPerson = Flug.preisProPerson(flug);
  return { flug, id: flug.id, proPerson, personen, gesamt: proPerson * personen, text: Flug.text(flug) };
}

function subtitle() {
  if (entry.type === "car") return `${entry.category} · ${entry.supplier} · Abholung: ${entry.pickup} · ${nights} Miettage`;
  if (entry.type === "flight") {
    const personen = Belegung.get().personen;
    return `${entry.from} → ${entry.to} · ${entry.depart}–${entry.arrive} · ${entry.stops === 0 ? "Direktflug" : entry.stops + " Stopp"} · ${personen} ${personen === 1 ? "Person" : "Personen"}`;
  }
  const zeit = typeof Reisedaten !== "undefined" && Reisedaten.text() ? `${Reisedaten.text()} · ` : "";
  if (entry.type === "apartment") return `${zeit}Gesamte Wohnung · ${Belegung.text()}`;
  const f = flugDazu();
  return `${zeit}${entry.rooms[roomIdx].name} · ${BOARD_LABELS[entry.boards[boardIdx].key]} · ${Belegung.text()}${f ? ` · mit Flug: ${f.text}` : ""}`;
}

function renderSteps() {
  const labels = ["Deine Daten", "Prüfen", "Bestätigung"];
  document.getElementById("checkoutSteps").innerHTML = labels
    .map((l, i) => `<div class="step ${i + 1 === step ? "active" : ""} ${i + 1 < step ? "done" : ""}">
        <span class="step-num">${i + 1 < step ? ICONS.check : i + 1}</span>${l}
      </div>`).join("");
}

function renderStep1() {
  document.getElementById("checkoutMain").innerHTML = `
    <section class="panel">
      <h2>Deine Daten</h2>
      <p class="hint" style="margin-bottom:16px">Reine Demo-Eingabe. Es werden keine Daten an einen Server gesendet und keine Zahlungsdaten abgefragt.</p>
      <form id="guestForm" class="form-stack">
        <div class="form-two">
          <div class="field"><label for="gName">Vor- und Nachname</label><input class="input" id="gName" value="${guest.name}" required placeholder="Alex Musterperson" /></div>
          <div class="field"><label for="gMail">E-Mail</label><input class="input" id="gMail" type="email" value="${guest.mail}" required placeholder="alex@beispiel.de" /></div>
        </div>
        <div class="form-two">
          <div class="field"><label for="gPhone">Telefon (optional)</label><input class="input" id="gPhone" value="${guest.phone}" placeholder="+49 …" /></div>
          <div class="field"><label for="gNote">Wunsch (optional)</label><input class="input" id="gNote" value="${guest.note}" placeholder="z. B. späte Anreise" /></div>
        </div>
        <label class="check-row" style="padding:6px 0">
          <input type="checkbox" id="gTerms" required />
          <span>Ich habe die <a href="info.html?p=agb">Hinweise zur Studie</a> gelesen und weiß, dass keine echte Buchung erfolgt.</span>
        </label>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <a class="btn btn-ghost" href="${isStay() ? `stay.html?id=${entry.id}` : `results.html?type=${entry.type}`}">Zurück</a>
          <button type="submit" class="btn btn-primary">Weiter zur Prüfung</button>
        </div>
      </form>
    </section>`;

  document.getElementById("guestForm").addEventListener("submit", (e) => {
    e.preventDefault();
    guest = {
      name: document.getElementById("gName").value.trim(),
      mail: document.getElementById("gMail").value.trim(),
      phone: document.getElementById("gPhone").value.trim(),
      note: document.getElementById("gNote").value.trim(),
    };
    step = 2;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Hier endet die Aufgabe ausdruecklich NICHT. Schritt 2 ist die
    // Pruefseite - gebucht ist noch nichts. Bis zum 23.09.2026 stand an
    // dieser Stelle derselbe Abschluss wie nach der Bestaetigung. Damit
    // sprangen bei der Freigabe "Buchung vorbereiten" die Zwischenfragen
    // an, sobald der Agent die Gastdaten eingetragen hatte: Die Person
    // kam nie dazu, selbst zu bestaetigen, und in den Daten stand
    // trotzdem "gebucht". Genau die Hauptmessgroesse war damit falsch.
  });
}

function renderStep2() {
  const p = priceLines();
  document.getElementById("checkoutMain").innerHTML = `
    <section class="panel">
      <h2>Bitte prüfen</h2>
      <div class="review-block">
        <h3>${itemTitle(entry)}</h3>
        <p style="margin:0 0 10px;color:var(--ink-500)">${subtitle()}</p>
        ${p.flug ? `<div class="kv"><span>Unterkunft</span><strong>${formatPrice(p.unterkunft)}</strong></div>
        <div class="kv"><span>Flug (${p.flug.personen} ${p.flug.personen === 1 ? "Person" : "Personen"}, Hin und zurück)</span><strong>${formatPrice(p.flug.gesamt)}</strong></div>` : ""}
        <div class="kv"><span>Gesamtpreis</span><strong>${formatPrice(p.total)}</strong></div>
      </div>
      <div class="review-block">
        <h3>Kontaktdaten</h3>
        <div class="kv"><span>Name</span><strong>${guest.name || "—"}</strong></div>
        <div class="kv"><span>E-Mail</span><strong>${guest.mail || "—"}</strong></div>
        ${guest.phone ? `<div class="kv"><span>Telefon</span><strong>${guest.phone}</strong></div>` : ""}
        ${guest.note ? `<div class="kv"><span>Wunsch</span><strong>${guest.note}</strong></div>` : ""}
      </div>
      <p class="hint">Mit dem nächsten Klick wird keine echte Buchung ausgelöst. Es erscheint lediglich eine simulierte Bestätigung.</p>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
        <button type="button" class="btn btn-ghost" id="backBtn">Zurück</button>
        <button type="button" class="btn btn-accent" id="confirmBtn">Buchung abschließen</button>
      </div>
    </section>`;

  document.getElementById("backBtn").addEventListener("click", () => { step = 1; render(); });
  document.getElementById("confirmBtn").addEventListener("click", () => {
    step = 3;
    // Der Studienablauf erfaehrt von der Buchung - egal, ob die Person
    // oder der Agent geklickt hat
    if (typeof Studie !== "undefined") {
      // Fuer die Auswertung zaehlt der Unterkunftspreis (die Aufgaben-
      // Budgets gelten fuer die Unterkunft); der Flug steht daneben.
      const pl = priceLines();
      Studie.buchungBestaetigt({ id: entry.id, gesamt: pl.unterkunft ?? pl.total, naechte: nights, flug: pl.flug ? { id: pl.flug.id, gesamt: pl.flug.gesamt, personen: pl.flug.personen } : null });
    }
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Die Aufgabe ist mit der Buchung zu Ende. Ohne diesen Schritt konnte
    // man einfach weiterklicken und die Zwischenfragen kamen nie.
    if (typeof Studie !== "undefined" && Studie.aufgabeAbschliessen) {
      setTimeout(() => Studie.aufgabeAbschliessen("gebucht"), 2600);
    }
  });
}

function renderStep3() {
  const p = priceLines();
  const ref = "VY-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  document.getElementById("checkoutMain").innerHTML = `
    <section class="panel confirm-panel">
      <div class="confirm-icon">${ICONS.check}</div>
      <h2 style="margin-bottom:6px">Buchung bestätigt</h2>
      <p>Vielen Dank${guest.name ? ", " + guest.name.split(" ")[0] : ""}! Deine Buchungsnummer lautet <strong>${ref}</strong>.</p>
      <p class="hint" style="margin:14px 0 20px">Hinweis: Voyara ist ein Studienprototyp. Diese Bestätigung ist simuliert, es wurde nichts gebucht und nichts bezahlt.</p>
      <div class="review-block" style="text-align:left">
        <h3>${itemTitle(entry)}</h3>
        <p style="margin:0 0 10px;color:var(--ink-500)">${subtitle()}</p>
        <div class="kv"><span>Gesamtpreis</span><strong>${formatPrice(p.total)}</strong></div>
        <div class="kv"><span>Bestätigung an</span><strong>${guest.mail || "—"}</strong></div>
      </div>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:20px">
        ${typeof Studie !== "undefined" && Studie.laeuft()
          ? `<button type="button" class="btn btn-primary" id="studieWeiter">Weiter zur Studie</button>`
          : `<a class="btn btn-ghost" href="merkzettel.html">Zum Merkzettel</a>
             <a class="btn btn-primary" href="index.html">Weitere Reise suchen</a>`}
      </div>
    </section>`;
  // Nach der Buchung geht es in die Zwischenfragen. Der Knopf statt
  // eines Automatismus: Die Person soll die Bestaetigung lesen koennen.
  document.getElementById("studieWeiter")?.addEventListener("click", () => Studie.aufgabeAbschliessen("gebucht"));
}

function renderSummary() {
  const p = priceLines();
  const media = isStay()
    ? `<div class="summary-media" data-bild="${titelbildVon(entry.id)}"></div>`
    : `<div class="car-visual small" style="margin-bottom:12px">${entry.type === "car" ? ICONS.car : ICONS.plane}</div>`;

  document.getElementById("checkoutSummary").innerHTML = `
    ${media}
    <div class="bw-note" style="font-weight:600;color:var(--ink-900);font-size:.95rem">${itemTitle(entry)}</div>
    <div class="bw-note">${subtitle()}</div>
    <div class="bw-lines">
      <div class="bw-line"><span>${p.unit}</span><span>${formatPrice(p.base)}</span></div>
      <div class="bw-line"><span>${p.extraLabel}</span><span>${formatPrice(p.extra)}</span></div>
      <div class="bw-line" style="color:var(--ok)"><span>Servicegebühr</span><span>0 €</span></div>
      ${p.flug ? `<div class="bw-line"><span>Flug ${formatPrice(p.flug.proPerson)} × ${p.flug.personen} (Hin und zurück)</span><span>${formatPrice(p.flug.gesamt)}</span></div>` : ""}
    </div>
    <div class="bw-total"><span>Gesamt${p.flug ? " mit Flug" : ""}</span><strong>${formatPrice(p.total)}</strong></div>
    <p class="bw-hint">${ICONS.shield} Simulierte Buchung — keine Zahlung, keine Weitergabe von Daten</p>`;

  applyScenes(document.getElementById("checkoutSummary"));
}

function render() {
  renderSteps();
  if (step === 1) renderStep1();
  else if (step === 2) renderStep2();
  else renderStep3();
  renderSummary();
}

document.addEventListener("DOMContentLoaded", () => {
  readParams();
  mountChrome(isStay() ? (entry.type === "apartment" ? "apartment" : "hotel") : entry.type);
  document.getElementById("breadcrumb").innerHTML =
    `<a href="index.html">Startseite</a> › ${isStay() ? `<a href="stay.html?id=${entry.id}">${entry.name}</a>` : `<a href="results.html?type=${entry.type}">${TYPE_LABELS[entry.type]}</a>`} › <span>Buchung</span>`;
  render();
});
