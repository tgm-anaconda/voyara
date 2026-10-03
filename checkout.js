// Buchungsstrecke in drei Schritten: Daten → Prüfen → Bestätigung.
// Bewusst ohne Zahlungsdaten: es ist ein Studienprototyp, es fließt kein Geld.

let entry = null;
let step = 1;
let nights = 7;
let roomIdx = 0;
let boardIdx = 0;
let guest = { name: "", mail: "", phone: "", note: "" };

/* ==================================================================
   Die Buchungsstrecke als Arbeit
   ------------------------------------------------------------------
   Bis zum 27.09.2026 waren es vier Felder, von denen zwei aus dem Konto
   kamen. Der Unterschied zwischen "ich buche selbst" und "der Agent
   bucht" war damit ein einziger Klick - und ein Klick misst nichts.

   Jetzt gibt es fuenf Abschnitte, von denen drei Arbeit sind (Reisende,
   Gepaeck, Ankunftszeit) und zwei Geld kosten, ohne dass es auffaellt
   (Versicherung, Zahlungsart). Ein Mensch braucht dafuer einige Minuten,
   der Agent Sekunden - und genau diese Asymmetrie ist das, was hier
   gemessen werden soll: Gibt man eine laestige Aufgabe ab?

   Die Reiseruecktrittsversicherung steht vorausgewaehlt da. Das ist kein
   Versehen, sondern der zweite Messpunkt: Wer das Formular selbst
   ausfuellt, scrollt an ihr vorbei. Wer den Agenten nutzt, sieht sie
   womoeglich nie - weil der Agent berichtet, was er GETAN hat, und er
   hat sie nicht angefasst. Der blinde Fleck entsteht aus dieser Regel,
   nicht aus einer Absicht, und genau deshalb ist er ein Befund.
   ================================================================== */
let reisende = [];          // [{ name, geburt, gepaeck }]
let ankunft = "";           // voraussichtliche Ankunft am Haus
let versicherung = true;    // vorausgewaehlt
let zahlung = "karte";      // karte | lastschrift

const GEPAECK = [
  { id: "hand", label: "Nur Handgepäck", preis: 0 },
  { id: "20", label: "Koffer bis 20 kg", preis: 45 },
  { id: "30", label: "Koffer bis 30 kg", preis: 75 },
];
const VERSICHERUNG_PREIS = 49;
const KARTENGEBUEHR = 0.02;
const ANKUNFTSZEITEN = ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "nach 22:00"];

/* Zurueck mit allem, was gewaehlt ist: Zeitraum, Reisende, Zimmer und
   Verpflegung - sonst stand auf der Hausseite das vorausgewaehlte Zimmer,
   und wer nachpruefen wollte, sah etwas anderes, als er buchte. */
function hausLink() {
  let href = `stay.html?id=${encodeURIComponent(entry.id)}`;
  const zimmer = entry.rooms?.[roomIdx]?.name;
  const board = entry.boards?.[boardIdx]?.key;
  if (board) href += `&board=${encodeURIComponent(board)}`;
  if (zimmer) href += `&zimmerart=${encodeURIComponent(zimmer)}`;
  if (typeof Belegung !== "undefined" && Belegung.anLink) href = Belegung.anLink(href);
  if (typeof Reisedaten !== "undefined" && Reisedaten.anLink) href = Reisedaten.anLink(href);
  return href;
}
function listeLink() {
  return typeof Rueckweg !== "undefined" ? Rueckweg.liste(entry.type) : `results.html?type=${entry.type}`;
}

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

  /* Eine Zeile je Reisendem, aus der Belegung der Suche.
     ----------------------------------------------------------------
     Bis zum 02.10.2026 war nur die erste Zeile vorbelegt; alle anderen
     Namen und alle Geburtsdaten mussten aus dem Gespraech kommen. Das
     war als Pruefstein gedacht ("zeigt sich, ob jemand den Agenten fuer
     etwas Laestiges benutzt") und war in der Praxis nur laestig: Im
     Testlauf fragte der Agent fuenf Geburtsdaten und fuenf Namen ab und
     kam trotzdem nicht ans Ende.

     Jetzt kommen die Reisenden aus dem Konto, so wie bei jedem Portal,
     bei dem man angemeldet ist (Account.mitreisende). Die Geburtsdaten
     der Kinder rechnet die Seite aus dem Alter, das in der Belegung
     steht - also aus dem, was die Person im Gespraech gesagt hat. Wer
     etwas aendern will, kann jedes Feld weiter ueberschreiben. */
  const b = Belegung.get();
  const kinder = (b.alter || []).slice();
  const ausKonto = typeof Account !== "undefined" && Account.mitreisende
    ? Account.mitreisende(b.erwachsene, kinder)
    : [];
  reisende = Array.from({ length: b.personen }, (_, i) => ({
    name: ausKonto[i]?.name || (i === 0 ? guest.name : ""),
    geburt: ausKonto[i]?.geburt || "",
    gepaeck: "hand",
    // Ab dem letzten Platz aufwaerts sind es die Kinder
    kind: i >= b.erwachsene,
    alter: i >= b.erwachsene ? kinder[i - b.erwachsene] ?? null : null,
  }));
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
  const zusatz = zusatzkosten(f);
  return {
    unit: `${formatPrice(perNight)} × ${nights} Nächte${zimmerAnzahl > 1 ? ` × ${zimmerAnzahl} Zimmer` : ""}`,
    base, extraLabel: "Endreinigung", extra: cleaning,
    unterkunft: base + cleaning,
    flug: f,
    ...zusatz,
    total: base + cleaning + (f ? f.gesamt : 0) + zusatz.zusatzGesamt,
  };
}

/* Was in Schritt eins dazukommt.
   ------------------------------------------------------------------
   Gepaeck nur bei Flug, Versicherung immer, Kartengebuehr auf alles
   davor. Die Gebuehr rechnet sich prozentual und ist deshalb genau die
   Sorte Kosten, die man beim Ueberfliegen nicht bemerkt. */
function zusatzkosten(f) {
  const gepaeck = f
    ? reisende.reduce((sum, r) => sum + (GEPAECK.find((g) => g.id === r.gepaeck)?.preis || 0), 0)
    : 0;
  const schutz = versicherung ? VERSICHERUNG_PREIS : 0;
  return { gepaeck, versicherung: schutz, zahlung,
    kartengebuehr: 0, zusatzGesamt: gepaeck + schutz };
}

// Die Kartengebuehr haengt am Gesamtbetrag und wird deshalb erst danach
// gerechnet - sonst wuerde sie sich selbst verzinsen.
function kartengebuehr(total) {
  return zahlung === "karte" ? Math.round(total * KARTENGEBUEHR) : 0;
}

function endsumme() {
  const p = priceLines();
  return p.total + kartengebuehr(p.total);
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
  const mitFlug = !!flugDazu();
  const zeile = (r, i) => `
    <div class="reisender-zeile">
      <span class="reisender-nr">${i + 1}${r.kind ? " · Kind" : ""}</span>
      <div class="field"><label for="rName${i}">Name wie im Ausweis</label>
        <input class="input" id="rName${i}" data-r="${i}" data-feld="name" value="${r.name}" placeholder="${i === 0 ? "Alex Musterperson" : "Vor- und Nachname"}" required /></div>
      <div class="field"><label for="rGeburt${i}">Geburtsdatum</label>
        <input class="input" id="rGeburt${i}" data-r="${i}" data-feld="geburt" type="date" value="${r.geburt}" required /></div>
      ${mitFlug ? `<div class="field"><label for="rGepaeck${i}">Gepäck</label>
        <select class="select" id="rGepaeck${i}" data-r="${i}" data-feld="gepaeck">
          ${GEPAECK.map((g) => `<option value="${g.id}" ${g.id === r.gepaeck ? "selected" : ""}>${g.label}${g.preis ? ` (+${g.preis} €)` : ""}</option>`).join("")}
        </select></div>` : ""}
    </div>`;

  document.getElementById("checkoutMain").innerHTML = `
    <section class="panel">
      <h2>Deine Daten</h2>
      <p class="hint" style="margin-bottom:16px">Reine Demo-Eingabe. Es werden keine Daten an einen Server gesendet und keine Zahlungsdaten abgefragt. Namen und Geburtsdaten dürfen erfunden sein.</p>
      <form id="guestForm" class="form-stack">

        <h3 class="formular-titel">Reisende</h3>
        <p class="hint">Die Namen müssen mit dem Ausweis übereinstimmen, sonst wird am Flughafen abgewiesen.</p>
        <div id="reisendeListe">${reisende.map(zeile).join("")}</div>

        <h3 class="formular-titel">Kontakt für die Buchung</h3>
        <div class="form-two">
          <div class="field"><label for="gMail">E-Mail</label><input class="input" id="gMail" type="email" value="${guest.mail}" required placeholder="alex@beispiel.de" /></div>
          <div class="field"><label for="gPhone">Telefon (optional)</label><input class="input" id="gPhone" value="${guest.phone}" placeholder="+49 …" /></div>
        </div>

        <h3 class="formular-titel">Ankunft</h3>
        <div class="form-two">
          <div class="field"><label for="cAnkunft">Voraussichtliche Ankunft am Haus</label>
            <select class="select" id="cAnkunft" required>
              <option value="">Bitte wählen</option>
              ${ANKUNFTSZEITEN.map((z) => `<option value="${z}" ${z === ankunft ? "selected" : ""}>${z}</option>`).join("")}
            </select></div>
          <div class="field"><label for="gNote">Wunsch (optional)</label><input class="input" id="gNote" value="${guest.note}" placeholder="z. B. ruhiges Zimmer" /></div>
        </div>
        <p class="hint">Die Rezeption ist rund um die Uhr besetzt. Ohne Angabe wird das Zimmer bis 18:00 gehalten.</p>

        <h3 class="formular-titel">Extras</h3>
        <label class="check-row">
          <input type="checkbox" id="cVersicherung" ${versicherung ? "checked" : ""} />
          <span>Reiserücktrittsversicherung <small style="color:var(--ink-500)">— erstattet den Reisepreis bei Krankheit, Unfall oder Jobverlust</small></span>
          <span class="count">${VERSICHERUNG_PREIS} €</span>
        </label>

        <h3 class="formular-titel">Zahlungsart</h3>
        <label class="check-row"><input type="radio" name="zahlung" class="js-zahlung" value="karte" ${zahlung === "karte" ? "checked" : ""} /><span>Kreditkarte <small style="color:var(--ink-500)">— sofortige Bestätigung</small></span><span class="count">+2 %</span></label>
        <label class="check-row"><input type="radio" name="zahlung" class="js-zahlung" value="lastschrift" ${zahlung === "lastschrift" ? "checked" : ""} /><span>Lastschrift <small style="color:var(--ink-500)">— Bestätigung nach einem Werktag</small></span><span class="count">0 €</span></label>

        <label class="check-row" style="margin-top:12px">
          <input type="checkbox" id="gTerms" required />
          <span>Ich habe die <a href="info.html?p=agb">Hinweise zur Studie</a> gelesen und weiß, dass keine echte Buchung erfolgt.</span>
        </label>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <a class="btn btn-ghost" href="${isStay() ? hausLink() : listeLink()}">Zurück</a>
          <button type="submit" class="btn btn-primary">Weiter zur Prüfung</button>
        </div>
      </form>
    </section>`;

  // Jede Eingabe wandert sofort in den Stand: Die Seitenleiste rechnet mit,
  // und der Agent findet beim naechsten Zeichnen vor, was schon dasteht.
  const main = document.getElementById("checkoutMain");
  main.querySelectorAll("[data-r]").forEach((el) => {
    const uebernehmen = () => {
      const r = reisende[+el.dataset.r];
      if (!r) return;
      r[el.dataset.feld] = el.value;
      if (el.dataset.feld === "gepaeck") renderSummary();
    };
    el.addEventListener("input", uebernehmen);
    el.addEventListener("change", uebernehmen);
  });
  document.getElementById("cAnkunft").addEventListener("change", (e) => { ankunft = e.target.value; });
  document.getElementById("cVersicherung").addEventListener("change", (e) => { versicherung = e.target.checked; renderSummary(); });
  main.querySelectorAll(".js-zahlung").forEach((el) =>
    el.addEventListener("change", () => { zahlung = el.value; renderSummary(); }));

  document.getElementById("guestForm").addEventListener("submit", (e) => {
    e.preventDefault();
    guest = {
      name: reisende[0]?.name?.trim() || "",
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
        ${p.gepaeck ? `<div class="kv"><span>Gepäck</span><strong>${formatPrice(p.gepaeck)}</strong></div>` : ""}
        ${p.versicherung ? `<div class="kv"><span>Reiserücktrittsversicherung</span><strong>${formatPrice(p.versicherung)}</strong></div>` : ""}
        ${kartengebuehr(p.total) ? `<div class="kv"><span>Kartengebühr</span><strong>${formatPrice(kartengebuehr(p.total))}</strong></div>` : ""}
        <div class="kv"><span>Gesamtpreis</span><strong>${formatPrice(p.total + kartengebuehr(p.total))}</strong></div>
      </div>
      <div class="review-block">
        <h3>Reisende</h3>
        ${reisende.map((r, i) => `<div class="kv"><span>${i + 1}${r.kind ? " · Kind" : ""}</span><strong>${r.name || "—"}${r.geburt ? `, ${new Date(r.geburt).toLocaleDateString("de-DE")}` : ""}${p.flug ? ` · ${GEPAECK.find((g) => g.id === r.gepaeck)?.label || ""}` : ""}</strong></div>`).join("")}
      </div>
      <div class="review-block">
        <h3>Kontakt und Ankunft</h3>
        <div class="kv"><span>E-Mail</span><strong>${guest.mail || "—"}</strong></div>
        ${guest.phone ? `<div class="kv"><span>Telefon</span><strong>${guest.phone}</strong></div>` : ""}
        <div class="kv"><span>Ankunft am Haus</span><strong>${ankunft || "keine Angabe"}</strong></div>
        ${guest.note ? `<div class="kv"><span>Wunsch</span><strong>${guest.note}</strong></div>` : ""}
      </div>
      <div class="review-block">
        <h3>Extras und Zahlung</h3>
        <div class="kv"><span>Reiserücktrittsversicherung</span><strong>${versicherung ? `${VERSICHERUNG_PREIS} €` : "nicht gebucht"}</strong></div>
        <div class="kv"><span>Zahlungsart</span><strong>${zahlung === "karte" ? `Kreditkarte (+${formatPrice(kartengebuehr(p.total))})` : "Lastschrift"}</strong></div>
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
      /* Die Zusaetze gehen mit in die Auswertung.
         --------------------------------------------------------------
         `versicherung` ist der zweite Messpunkt neben der Wahl des
         Hauses: Sie stand vorausgewaehlt da, und ob sie am Ende noch
         drin ist, sagt etwas darueber, wie genau jemand hingesehen hat -
         mit Agent und ohne. */
      Studie.buchungBestaetigt({ id: entry.id, gesamt: pl.unterkunft ?? pl.total, naechte: nights,
        flug: pl.flug ? { id: pl.flug.id, gesamt: pl.flug.gesamt, personen: pl.flug.personen } : null,
        versicherung, zahlung, gepaeck: pl.gepaeck,
        kartengebuehr: kartengebuehr(pl.total),
        reisende: reisende.map((r) => ({ name: !!r.name, geburt: !!r.geburt, gepaeck: r.gepaeck })),
        ankunft: ankunft || null });
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
        <div class="kv"><span>Gesamtpreis</span><strong>${formatPrice(p.total + kartengebuehr(p.total))}</strong></div>
        <div class="kv"><span>Bestätigung an</span><strong>${guest.mail || "—"}</strong></div>
      </div>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:20px">
        ${typeof Studie !== "undefined" && Studie.laeuft()
          ? ""
          : `<a class="btn btn-ghost" href="merkzettel.html">Zum Merkzettel</a>
             <a class="btn btn-primary" href="index.html">Weitere Reise suchen</a>`}
      </div>
    </section>`;
  /* Kein Knopf "Weiter zur Studie" mehr.
     ------------------------------------------------------------------
     Gemeldet am 02.10.2026: "Man sieht da noch kurz quasi die Seite mit
     weiter zur Studie mit so einem Button, und dann springt es aber
     dennoch sofort in den Umfragebogen. Das einfach weglassen."

     Er hat recht: Der Knopf war als Ruhepunkt gedacht, aber der
     Uebergang laeuft ohnehin nach 2,6 Sekunden von selbst (weiter oben).
     Zwei Wege zum selben Ziel, von denen einer immer gewinnt - uebrig
     blieb ein Knopf, den niemand druecken kann. Jetzt bleibt nur die
     Bestaetigung stehen, und der Uebergang kommt. */
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
      ${p.gepaeck ? `<div class="bw-line"><span>Gepäck</span><span>${formatPrice(p.gepaeck)}</span></div>` : ""}
      ${p.versicherung ? `<div class="bw-line"><span>Reiserücktrittsversicherung</span><span>${formatPrice(p.versicherung)}</span></div>` : ""}
      ${kartengebuehr(p.total) ? `<div class="bw-line"><span>Kartengebühr 2 %</span><span>${formatPrice(kartengebuehr(p.total))}</span></div>` : ""}
    </div>
    <div class="bw-total"><span>Gesamt${p.flug ? " mit Flug" : ""}</span><strong>${formatPrice(p.total + kartengebuehr(p.total))}</strong></div>
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
    `<a href="index.html">Startseite</a> › ${isStay() ? `<a href="${hausLink()}">${entry.name}</a>` : `<a href="${listeLink()}">${TYPE_LABELS[entry.type]}</a>`} › <span>Buchung</span>`;
  render();
});
