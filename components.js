// Gemeinsame Bausteine: App-Rahmen (Agent-Panel + Website), Header, Footer,
// Icons, Merkzettel, Login-Dialog, Karten. Jede Seite bindet das ein.

const ICONS = {
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  heart: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>',
  heartFilled: '<svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>',
  chat: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-4-.8L3 21l1.9-4.6A8.3 8.3 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5Z"/></svg>',
  user: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  bed: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18v-7h20v7M2 11V6M22 18v2M2 18v2"/><circle cx="7.5" cy="9" r="2"/></svg>',
  home: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V21H3Z"/><path d="M9.5 21v-6h5v6"/></svg>',
  car: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14M3 17v-4l2-5h14l2 5v4"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/></svg>',
  plane: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.8 16 14l4-4a2.1 2.1 0 0 0-3-3l-4 4-5.8-1.8a1 1 0 0 0-1 .3l-1 1a.7.7 0 0 0 .2 1.1l4.6 2.3-2.3 2.3-2-.3a.8.8 0 0 0-.7.2l-.6.6a.6.6 0 0 0 .1 1l2.3 1.2 1.2 2.3a.6.6 0 0 0 1 .1l.6-.6a.8.8 0 0 0 .2-.7l-.3-2 2.3-2.3 2.3 4.6a.7.7 0 0 0 1.1.2l1-1a1 1 0 0 0 .3-1Z"/></svg>',
  sparkle: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.1 5.9L20 11l-5.9 2.1L12 19l-2.1-5.9L4 11l5.9-2.1Z"/></svg>',
  pin: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12.5 5.5 5.5L20 7"/></svg>',
  shield: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v6c0 4.4 3 8.4 7 9.5 4-1.1 7-5.1 7-9.5V6Z"/><path d="m9 12 2 2 4-4"/></svg>',
  eye: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  tag: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4 12 22l-9-9V4h9l8.6 8.6a1.9 1.9 0 0 1 0 .8Z"/><circle cx="7.5" cy="8.5" r="1.4"/></svg>',
  clock: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5.3l3.4 2"/></svg>',
  wave: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2M2 14c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2"/></svg>',
  building: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V5l8-3 8 3v16"/><path d="M9 21v-5h6v5M9 8h.01M15 8h.01M9 12h.01M15 12h.01"/></svg>',
  mountain: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 19 6.5-11 4 6 2.5-3.5L21 19Z"/></svg>',
  sun: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></svg>',
  close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  send: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7Z"/></svg>',
  users: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.4"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M17 5.2a3.4 3.4 0 0 1 0 6.6M18.5 20a6.5 6.5 0 0 0-3-5.5"/></svg>',
  luggage: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="7" width="14" height="14" rx="2"/><path d="M9 7V4h6v3M9 21v1M15 21v1"/></svg>',
  gear: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></svg>',
};

const CATEGORY_ICONS = {
  strand: ICONS.wave, boutique: ICONS.sparkle, familie: ICONS.home, finca: ICONS.sun,
  stadt: ICONS.building, luxus: ICONS.sparkle, budget: ICONS.tag, apart: ICONS.bed,
};

const PARTNERS = [
  { name: "Reiseblick", short: "R", color: "#2f6fdc" },
  { name: "SolTours", short: "S", color: "#e08a2f" },
  { name: "Nordwind Reisen", short: "N", color: "#1d9179" },
  { name: "Bluewave", short: "B", color: "#2aa5c4" },
  { name: "AtlasHotels", short: "A", color: "#8a5bd6" },
  { name: "Ferienwerk", short: "F", color: "#d6555b" },
];

const NAV_ITEMS = [
  { key: "hotel", label: "Hotels", icon: ICONS.bed, href: "results.html?type=hotel" },
  { key: "apartment", label: "Ferienwohnungen", icon: ICONS.home, href: "results.html?type=apartment" },
  { key: "car", label: "Mietwagen", icon: ICONS.car, href: "results.html?type=car" },
  { key: "flight", label: "Flüge", icon: ICONS.plane, href: "results.html?type=flight" },
];

const TYPE_LABELS = {
  hotel: "Hotels", apartment: "Ferienwohnungen", car: "Mietwagen", flight: "Flüge",
};

/* ==================================================================
   Belegung — wie viele Reisende, wie viele Zimmer
   Wird aus der URL gelesen und von Trefferliste, Detailseite und
   Buchung gemeinsam genutzt, damit die Angabe durchgaengig wirkt.
   ================================================================== */
const Belegung = {
  get() {
    const p = new URLSearchParams(window.location.search);
    const erwachsene = Math.max(1, +(p.get("adults") || 2));
    const kinder = Math.max(0, +(p.get("children") || 0));
    const zimmer = Math.max(1, +(p.get("rooms") || 1));
    return { erwachsene, kinder, zimmer, personen: erwachsene + kinder };
  },
  text() {
    const b = this.get();
    const teile = [`${b.erwachsene} Erwachsene${b.erwachsene === 1 ? "r" : ""}`];
    if (b.kinder) teile.push(`${b.kinder} Kind${b.kinder === 1 ? "" : "er"}`);
    if (b.zimmer > 1) teile.push(`${b.zimmer} Zimmer`);
    return teile.join(", ");
  },
  // Haengt die aktuelle Belegung an einen Link, damit sie beim Seitenwechsel
  // nicht verloren geht
  anLink(href) {
    const b = this.get();
    const trenner = href.includes("?") ? "&" : "?";
    return `${href}${trenner}adults=${b.erwachsene}&children=${b.kinder}&rooms=${b.zimmer}`;
  },
  // Passt die Unterkunft zur Reisegruppe?
  passt(item) {
    const b = this.get();
    if (item.type === "apartment") return item.maxGuests >= b.personen;
    if (item.rooms) {
      const groesstes = Math.max(...item.rooms.map((r) => r.maxGuests));
      return groesstes * b.zimmer >= b.personen;
    }
    return true;
  },
};

/* ==================================================================
   Reisezeitraum — dasselbe Prinzip wie bei der Belegung: die in der
   Suchmaske gewaehlten Daten stehen in der URL und muessen bei jedem
   Seitenwechsel mitwandern, sonst rechnet der Checkout mit Standardwerten.
   ================================================================== */
const Reisedaten = {
  // Datum als YYYY-MM-DD in Ortszeit. toISOString() waere hier falsch: Es
  // rechnet nach UTC, wodurch aus dem 12. Oktober in Mitteleuropa der 11.
  // wird - das Datum rutscht um einen Tag zurueck.
  alsIso(d) {
    const zwei = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
  },
  // Was tatsaechlich in der URL steht - leer, solange nichts gesucht wurde.
  roh() {
    const p = new URLSearchParams(window.location.search);
    return { von: p.get("from") || "", bis: p.get("to") || "" };
  },
  // Vorbelegung der Suchmaske: in 30 Tagen, eine Woche lang. Steht hier und
  // nicht in searchbox.js, damit Anzeige und Saisonrechnung denselben Zeitraum
  // benutzen - sonst zeigt das Feld September und der Preis gilt fuer August.
  standard() {
    const iso = (d) => this.alsIso(d);
    const start = new Date();
    start.setDate(start.getDate() + 30);
    const ende = new Date(start);
    ende.setDate(start.getDate() + 7);
    return { von: iso(start), bis: iso(ende) };
  },
  get() {
    const { von, bis } = this.roh();
    return von && bis ? { von, bis } : this.standard();
  },
  // Anzahl Naechte bzw. Miettage; ohne Datum der uebergebene Standardwert
  naechte(standard = 7) {
    const { von, bis } = this.get();
    if (!von || !bis) return standard;
    const tage = Math.round((new Date(bis) - new Date(von)) / 86400000);
    return tage > 0 ? tage : standard;
  },
  anLink(href) {
    const { von, bis } = this.roh();
    if (!von || !bis) return href;
    const trenner = href.includes("?") ? "&" : "?";
    return `${href}${trenner}from=${von}&to=${bis}`;
  },
};

/* ==================================================================
   Merkzettel — echte Funktion via localStorage
   ================================================================== */
const Wishlist = {
  key: "voyara_wishlist",
  read() {
    try { return JSON.parse(localStorage.getItem(this.key)) || []; } catch { return []; }
  },
  write(ids) {
    localStorage.setItem(this.key, JSON.stringify(ids));
    this.updateBadge();
    document.dispatchEvent(new CustomEvent("wishlist:change", { detail: ids }));
  },
  has(id) { return this.read().includes(id); },
  toggle(id) {
    const ids = this.read();
    const i = ids.indexOf(id);
    if (i === -1) ids.push(id); else ids.splice(i, 1);
    this.write(ids);
    return i === -1;
  },
  remove(id) { this.write(this.read().filter((x) => x !== id)); },
  count() { return this.read().length; },
  updateBadge() {
    const el = document.getElementById("wishCount");
    if (!el) return;
    const n = this.count();
    el.textContent = n;
    el.hidden = n === 0;
  },
};

/* ==================================================================
   Konto (fiktiv) — damit "Anmelden" nicht ins Leere läuft
   ================================================================== */
const Account = {
  key: "voyara_user",
  get() { return localStorage.getItem(this.key); },
  login(name) { localStorage.setItem(this.key, name); this.refresh(); },
  logout() { localStorage.removeItem(this.key); this.refresh(); },
  refresh() {
    const el = document.getElementById("accountLabel");
    if (el) el.textContent = this.get() ? this.get().split(" ")[0] : "Anmelden";
  },
};

/* ==================================================================
   Dialog-Helfer
   ================================================================== */
function openModal(title, bodyHtml, footerHtml = "") {
  document.querySelectorAll(".modal-backdrop").forEach((m) => m.remove());
  const el = document.createElement("div");
  el.className = "modal-backdrop";
  el.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="modal-head">
        <h3>${title}</h3>
        <button type="button" class="icon-btn" data-close>${ICONS.close}</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      ${footerHtml ? `<div class="modal-foot">${footerHtml}</div>` : ""}
    </div>`;
  document.body.appendChild(el);
  const close = () => el.remove();
  el.addEventListener("click", (e) => { if (e.target === el || e.target.closest("[data-close]")) close(); });
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
  });
  return { el, close };
}

function toast(message) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `${ICONS.check}<span>${message}</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("show"), 10);
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 250); }, 2600);
}

/* ==================================================================
   Agent-Panel (permanent links)
   ================================================================== */
function renderAgentRail() {
  return `
<div class="agent-rail-inner">
  <div class="agent-head">
    <div class="agent-avatar"${typeof agentbild === "function" && agentbild() ? ` style="background-image:url('${agentbild()}');background-size:cover"` : ""}>${typeof agentbild === "function" && agentbild() ? "" : ICONS.sparkle}</div>
    <div>
      <div class="agent-name">Voyara Agent</div>
      <div class="agent-status" id="agentStatus">bereit · beobachtet die Seite</div>
    </div>
    <button type="button" class="icon-btn" id="agentCollapse" title="Panel einklappen">${ICONS.close}</button>
  </div>

  <div class="agent-messages" id="agentMessages"></div>

  <div class="agent-suggestions" id="agentSuggestions"></div>

  <form class="agent-input" id="agentForm">
    <input class="input" type="text" id="agentInput" placeholder="Was soll ich für dich suchen?" autocomplete="off" />
    <button type="submit" class="btn btn-primary" aria-label="Senden">${ICONS.send}</button>
  </form>
  <p class="agent-foot">Der Agent kann für dich suchen, filtern und vormerken. Du kannst jederzeit selbst weiterklicken.</p>
</div>`;
}

const AgentPanel = {
  messages: [],
  mount() {
    const rail = document.getElementById("agentRail");
    if (!rail) return;
    rail.innerHTML = renderAgentRail();

    // Der Agentenkern stellt ein laufendes Gespraech wieder her. Nur wenn es
    // keines gibt, wird begruesst - sonst stuende die Begruessung mitten im
    // Verlauf.
    const fortsetzung = typeof Kern !== "undefined" && Kern.laden().verlauf.length > 0;
    if (!fortsetzung) {
      this.say("Hi! Ich bin dein Reiseagent. Sag mir, wonach du suchst — ich schaue mich für dich auf der Seite um.", "bot");
      this.setSuggestions(typeof Politik !== "undefined" ? Politik.vorschlaege()
        : ["Hotel am Strand für 2 Personen", "Günstige Ferienwohnung"]);
    }

    document.getElementById("agentForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("agentInput");
      const text = input.value.trim();
      if (!text) return;
      this.handleUserInput(text);
      input.value = "";
    });

    document.getElementById("agentCollapse").addEventListener("click", () => {
      document.body.classList.toggle("agent-collapsed");
    });
  },
  // `still` unterdrueckt das Einblenden - wird beim Wiederherstellen des
  // Gespraechs nach einem Seitenwechsel gebraucht.
  say(text, role = "bot", { still = false } = {}) {
    const box = document.getElementById("agentMessages");
    if (!box) return;
    const el = document.createElement("div");
    el.className = `msg ${role}${still ? "" : " neu"}`;
    el.textContent = text;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
  },
  status(text) {
    const el = document.getElementById("agentStatus");
    if (el) el.textContent = text;
  },
  setSuggestions(list) {
    const box = document.getElementById("agentSuggestions");
    if (!box) return;
    box.innerHTML = list.map((s) => `<button type="button" class="chip">${s}</button>`).join("");
    box.querySelectorAll(".chip").forEach((chip) =>
      chip.addEventListener("click", () => this.handleUserInput(chip.textContent))
    );
  },
  // Die eigentliche Arbeit macht agent/kern.js. Fehlt der Agentencode - etwa
  // weil eine Seite ihn nicht einbindet - bleibt das Panel eine Anzeige.
  handleUserInput(text) {
    this.setSuggestions([]);
    if (typeof Kern !== "undefined") {
      Kern.eingabe(text);
    } else {
      this.say(text, "user");
      this.say("Der Agent ist auf dieser Seite nicht aktiv.");
    }
  },
};

/* ==================================================================
   Header & Footer
   ================================================================== */
function renderHeader(active) {
  return `
<header class="site-header">
  <div class="wrap">
    <div class="header-main">
      <a class="brand" href="index.html">
        <span class="brand-mark">V</span>
        <span class="brand-name">Voyara</span>
      </a>
      <div class="header-search">
        ${ICONS.search}
        <input type="text" placeholder="Hotel, Ferienwohnung oder Ort suchen" aria-label="Suche" id="headerSearch" />
      </div>
      <div class="header-actions">
        <a class="header-action" href="merkzettel.html" title="Merkzettel">
          <span class="action-icon">${ICONS.heart}<span class="badge" id="wishCount" hidden>0</span></span>
          <span>Merkzettel</span>
        </a>
        <button type="button" class="header-action" id="helpBtn" title="Hilfe">${ICONS.chat}<span>Hilfe</span></button>
        <button type="button" class="header-action" id="accountBtn" title="Konto">${ICONS.user}<span id="accountLabel">Anmelden</span></button>
      </div>
    </div>
    <nav class="header-nav">
      ${NAV_ITEMS.map((n) => `<a href="${n.href}" class="${n.key === active ? "active" : ""}">${n.icon}${n.label}</a>`).join("")}
    </nav>
  </div>
</header>`;
}

function renderFooter() {
  return `
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-top">
      <div class="footer-brand">
        <a class="brand" href="index.html">
          <span class="brand-mark">V</span>
          <span class="brand-name">Voyara</span>
        </a>
        <p>Reisevergleich mit KI-Agent. Prototyp im Rahmen einer wissenschaftlichen Studie.</p>
      </div>
      <div class="footer-col">
        <h4>Buchen</h4>
        <a href="results.html?type=hotel">Hotels</a>
        <a href="results.html?type=apartment">Ferienwohnungen</a>
        <a href="results.html?type=car">Mietwagen</a>
        <a href="results.html?type=flight">Flüge</a>
        <a href="merkzettel.html">Merkzettel</a>
      </div>
      <div class="footer-col">
        <h4>Über das Projekt</h4>
        <a href="info.html?p=studie">Hintergrund der Studie</a>
        <a href="info.html?p=team">Forschungsteam</a>
        <a href="info.html?p=ablauf">Studienablauf</a>
        <a href="info.html?p=faq">Häufige Fragen</a>
      </div>
      <div class="footer-col">
        <h4>Rechtliches</h4>
        <a href="info.html?p=datenschutz">Datenschutz &amp; Einwilligung</a>
        <a href="info.html?p=impressum">Impressum</a>
        <a href="info.html?p=agb">AGB</a>
        <a href="info.html?p=cookies">Cookie-Einstellungen</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 Voyara — fiktiver Studienprototyp, keine echten Buchungen möglich.</span>
      <nav>
        <a href="info.html?p=datenschutz">Datenschutz</a>
        <a href="info.html?p=impressum">Impressum</a>
        <a href="info.html?p=kontakt">Kontakt</a>
      </nav>
    </div>
  </div>
</footer>`;
}

/* ==================================================================
   Karten & Bausteine
   ================================================================== */
function starString(count) {
  return "★".repeat(count) + "☆".repeat(Math.max(0, 5 - count));
}

// Setzt Hintergrundbilder per JS-Property statt im style-Attribut — so koennen
// Anfuehrungszeichen oder Sonderzeichen im Pfad nichts kaputtmachen.
// Frueher waren das SVG-Platzhalter, jetzt echte Fotos aus img/.
function applyScenes(root = document) {
  root.querySelectorAll("[data-bild]").forEach((el) => {
    const pfad = el.dataset.bild;
    if (pfad) el.style.backgroundImage = `url("${pfad}")`;
  });
}

function wishButton(id) {
  const active = Wishlist.has(id);
  return `<button type="button" class="wish-btn ${active ? "active" : ""}" data-wish="${id}" title="Merken">${active ? ICONS.heartFilled : ICONS.heart}</button>`;
}

// Klick-Handler fuer alle Merken-Buttons innerhalb eines Containers
function bindWishButtons(root = document) {
  root.querySelectorAll("[data-wish]").forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const added = Wishlist.toggle(btn.dataset.wish);
      btn.classList.toggle("active", added);
      btn.innerHTML = added ? ICONS.heartFilled : ICONS.heart;
      toast(added ? "Zum Merkzettel hinzugefügt" : "Vom Merkzettel entfernt");
    });
  });
}

function stayCard(item) {
  const isApartment = item.type === "apartment";
  const tags = isApartment
    ? [`${item.bedrooms} Schlafz.`, `${item.size} m²`, `bis ${item.maxGuests} Pers.`]
    : item.amenities.slice(0, 3).map((a) => AMENITY_LABELS[a] || a);

  return `
<a class="hotel-card" href="stay.html?id=${item.id}" data-item-id="${item.id}">
  <div class="hotel-media" data-bild="${titelbildVon(item.id)}">
    ${item.oldPrice ? '<span class="hotel-flag">Angebot</span>' : ""}
    ${wishButton(item.id)}
  </div>
  <div class="hotel-body">
    <div class="hotel-stars">${isApartment ? "Ferienwohnung" : starString(item.stars)}</div>
    <div class="hotel-name">${item.name}</div>
    <div class="hotel-loc">${ICONS.pin}${item.location}</div>
    <div class="hotel-tags">${tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
    <div class="hotel-foot">
      <div class="rating-chip">
        <span class="rating-score">${item.rating.toFixed(1)}</span>
        <span class="rating-text"><strong>${ratingLabel(item.rating)}</strong><span>${item.reviewCount} Bew.</span></span>
      </div>
      <div class="price-block">
        ${item.oldPrice ? `<div class="price-old">${formatPrice(item.oldPrice)}</div>` : ""}
        <div class="price-main">${formatPrice(item.pricePerNight)}</div>
        <div class="price-note">pro Nacht</div>
      </div>
    </div>
  </div>
</a>`;
}

// Rueckwaertskompatibler Alias
const hotelCard = stayCard;

/* ==================================================================
   Mount
   ================================================================== */
function mountChrome(activeNav) {
  const shellHeader = document.getElementById("siteHeader");
  const shellFooter = document.getElementById("siteFooter");
  if (shellHeader) shellHeader.innerHTML = renderHeader(activeNav);
  if (shellFooter) shellFooter.innerHTML = renderFooter();

  AgentPanel.mount();
  // Der Agentenkern startet nach dem Panel: Er schreibt das Gespraech zurueck,
  // setzt den Zeiger an seine alte Stelle und setzt einen unterbrochenen Lauf
  // fort. Ohne Agentencode laeuft die Seite unveraendert weiter.
  if (typeof Kern !== "undefined") Kern.start();
  Wishlist.updateBadge();
  Account.refresh();

  const search = document.getElementById("headerSearch");
  if (search) {
    search.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && search.value.trim()) {
        window.location.href = Reisedaten.anLink(Belegung.anLink(`results.html?type=hotel&q=${encodeURIComponent(search.value.trim())}`));
      }
    });
  }

  const help = document.getElementById("helpBtn");
  if (help) {
    help.addEventListener("click", () =>
      openModal(
        "Hilfe & Kontakt",
        `<p>Voyara ist ein Prototyp für eine wissenschaftliche Studie. Es sind keine echten Buchungen möglich.</p>
         <p><strong>Fragen zur Bedienung?</strong> Der Reiseagent links im Panel hilft dir bei der Suche.</p>
         <p><strong>Fragen zur Studie?</strong> Schreib an <a href="mailto:studie@voyara.example">studie@voyara.example</a>.</p>`,
        `<a class="btn btn-ghost" href="info.html?p=faq">Zu den häufigen Fragen</a>
         <button type="button" class="btn btn-primary" data-close>Verstanden</button>`
      )
    );
  }

  const account = document.getElementById("accountBtn");
  if (account) {
    account.addEventListener("click", () => {
      if (Account.get()) {
        openModal(
          "Dein Konto",
          `<p>Angemeldet als <strong>${Account.get()}</strong>.</p>
           <p>Dein Merkzettel enthält aktuell ${Wishlist.count()} ${Wishlist.count() === 1 ? "Eintrag" : "Einträge"}.</p>`,
          `<a class="btn btn-ghost" href="merkzettel.html">Merkzettel öffnen</a>
           <button type="button" class="btn btn-primary" id="logoutBtn">Abmelden</button>`
        );
        document.getElementById("logoutBtn").addEventListener("click", () => {
          Account.logout();
          document.querySelector(".modal-backdrop")?.remove();
          toast("Abgemeldet");
        });
      } else {
        const { close } = openModal(
          "Anmelden",
          `<form id="loginForm" class="form-stack">
             <div class="field"><label for="loginName">Name</label><input class="input" id="loginName" placeholder="Vor- und Nachname" required /></div>
             <div class="field"><label for="loginMail">E-Mail</label><input class="input" id="loginMail" type="email" placeholder="name@beispiel.de" required /></div>
             <p class="hint">Reine Demo-Anmeldung. Es werden keine Daten an einen Server gesendet, alles bleibt in diesem Browser.</p>
           </form>`,
          `<button type="button" class="btn btn-ghost" data-close>Abbrechen</button>
           <button type="submit" form="loginForm" class="btn btn-primary">Anmelden</button>`
        );
        document.getElementById("loginForm").addEventListener("submit", (e) => {
          e.preventDefault();
          Account.login(document.getElementById("loginName").value.trim() || "Gast");
          close();
          toast("Willkommen zurück!");
        });
      }
    });
  }

  bindWishButtons(document);
}
