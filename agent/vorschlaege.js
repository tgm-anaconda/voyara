/* Die Vorschlagsansicht.
   ------------------------------------------------------------------
   Bis zum 22.09.2026 legte der Agent seine drei Haeuser als drei
   Chatnachrichten vor. Fuer die Studie war das zu schwach: Die
   Offenlegung des Partnerhauses ist dort eine Textzeile zwischen
   Textzeilen, kaum zu variieren, ohne zugleich Laenge, Ton und
   Position zu aendern - und niemand weiss, ob sie gelesen wurde.

   Jetzt legt sich eine eigene Ansicht ueber die Seite: fuer alle
   gleich aufgebaut, drei Karten nebeneinander, mit Bild, Gesamtpreis,
   Teilnoten aus den Bewertungen und einem Satz, warum das Haus passt.
   Die Kennzeichnung des Partnerhauses ist ein gestaltetes Element an
   fester Stelle und damit die Stellschraube des Versuchs:

     keine    nichts (Kontrolle)
     chip     kleiner Chip "Partner" an der Karte
     banner   grosse Markierung "Bezahlte Platzierung" plus Erklaerung
     agent    die Karte bleibt neutral, der Agent sagt es im Chat
     log      nur im Agenten-Log, ganz unten (alte Bedingung)

   Gemessen wird, welche Karte geklickt wird, wie lange die Ansicht
   offen ist, ob jemand ohne Wahl schliesst und ob er danach selbst
   weitersucht. */

const Vorschlaege = {
  offen: false,
  geoeffnet: 0,
  daten: null,

  /* kandidaten: [{ id, item, preis, partner, satz, aspekte }] */
  zeigen(kandidaten, kern, { offenlegung = null, kontext = "" } = {}) {
    this.schliessen(true);
    this.daten = { kandidaten, kern, offenlegung };
    this.geoeffnet = Date.now();
    this.offen = true;

    const el = document.createElement("div");
    el.className = "vorschlag-schirm";
    el.id = "vorschlagSchirm";
    el.innerHTML = `
      <div class="vorschlag-fenster" role="dialog" aria-label="Vorschläge des Assistenten">
        <div class="vorschlag-kopf">
          <div>
            <p class="vorschlag-marke">Reise-Assistent</p>
            <h2>${kandidaten.length === 3 ? "Deine drei Vorschläge" : `Deine ${kandidaten.length} Vorschläge`}</h2>
            ${kontext ? `<p class="vorschlag-kontext">${kontext}</p>` : ""}
          </div>
          <button type="button" class="vorschlag-zu" aria-label="Schließen">✕</button>
        </div>
        <div class="vorschlag-karten">${kandidaten.map((k, i) => this.karte(k, i, offenlegung)).join("")}</div>
        <div class="vorschlag-fuss">
          <button type="button" class="btn btn-ghost" data-selbst>Ich schaue mir erst die Liste an</button>
          <p class="vorschlag-hinweis">Du kannst jederzeit im Chat weiterfragen, vergleichen lassen oder eigene Filter setzen.</p>
        </div>
      </div>`;
    document.body.appendChild(el);
    document.body.classList.add("vorschlag-offen");
    requestAnimationFrame(() => el.classList.add("da"));

    el.querySelector(".vorschlag-zu").addEventListener("click", () => this.schliessen(false, "kreuz"));
    el.querySelector("[data-selbst]").addEventListener("click", () => this.schliessen(false, "liste"));
    el.addEventListener("click", (e) => { if (e.target === el) this.schliessen(false, "daneben"); });
    el.querySelectorAll("[data-haus]").forEach((k) => k.addEventListener("click", () => this.waehlen(k.dataset.haus)));

    kern.notieren("vorschlagsansicht", { ids: kandidaten.map((k) => k.id), partner: kandidaten.find((k) => k.partner)?.id || null, offenlegung });
  },

  karte(k, i, offenlegung) {
    const item = k.item;
    const bild = typeof titelbildVon === "function" ? titelbildVon(item.id) : null;
    const note = (item.rating || 0).toFixed(1).replace(".", ",");
    const partner = k.partner && offenlegung;
    const marke = partner === "chip" ? `<span class="vorschlag-chip">Partner</span>` : "";
    const banner = partner === "banner"
      ? `<div class="vorschlag-banner">Bezahlte Platzierung<span>Voyara erhält für dieses Haus eine Provision.</span></div>` : "";
    return `
      <article class="vorschlag-karte${k.partner ? " ist-partner" : ""}" data-haus="${item.id}">
        <div class="vorschlag-bild">
          ${bild ? `<img src="${bild}" alt="${item.name}" loading="lazy">` : ""}
          <span class="vorschlag-platz">${i + 1}</span>
          ${marke}
        </div>
        <div class="vorschlag-text">
          ${banner}
          <h3>${item.name}</h3>
          <p class="vorschlag-ort">${item.location}${item.stars ? ` · ${item.stars} Sterne` : ""}</p>
          <div class="vorschlag-note"><b>${note}</b><span>${(item.reviewCount || 0).toLocaleString("de-DE")} Bewertungen</span></div>
          <div class="vorschlag-balken">${(k.aspekte || []).map((a) => `
            <div class="vorschlag-balken-zeile${a.wunsch ? " wunsch" : ""}">
              <span>${a.label}${a.wunsch ? " ★" : ""}</span>
              <span class="vorschlag-bar"><i style="width:${Math.min(100, a.note * 10)}%"></i></span>
              <b>${a.note.toFixed(1).replace(".", ",")}</b>
            </div>`).join("")}</div>
          <p class="vorschlag-grund">${k.satz}</p>
          <div class="vorschlag-preis">
            <div><b>${k.gesamtText}</b><span>${k.preisZusatz}</span></div>
            <span class="btn btn-accent btn-sm">Ansehen</span>
          </div>
        </div>
      </article>`;
  },

  waehlen(id) {
    const k = this.daten?.kern;
    const kand = this.daten?.kandidaten || [];
    const pos = kand.findIndex((x) => x.id === id);
    k?.notieren("vorschlag_geklickt", { id, position: pos + 1, partner: !!kand[pos]?.partner, sekunden: Math.round((Date.now() - this.geoeffnet) / 1000) });
    this.schliessen(true);
    if (k) { k.lauf.gewaehlt = id; k.sichern(); }
    const item = typeof getItemById === "function" ? getItemById(id) : null;
    let href = `stay.html?id=${encodeURIComponent(id)}`;
    if (typeof Belegung !== "undefined") href = Belegung.anLink(href);
    if (typeof Reisedaten !== "undefined") href = Reisedaten.anLink(href);
    if (typeof Flug !== "undefined") href = Flug.anLink(href);
    if (item) location.href = href;
  },

  schliessen(still = false, grund = null) {
    const el = document.getElementById("vorschlagSchirm");
    if (el) el.remove();
    document.body.classList.remove("vorschlag-offen");
    if (!still && this.offen && this.daten?.kern) {
      this.daten.kern.notieren("vorschlagsansicht_zu", { grund, sekunden: Math.round((Date.now() - this.geoeffnet) / 1000), gewaehlt: false });
    }
    this.offen = false;
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Vorschlaege };
