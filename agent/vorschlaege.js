/* Die Vorschlagsansicht.
   ------------------------------------------------------------------
   Bis zum 22.09.2026 legte der Agent seine drei Haeuser als drei
   Chatnachrichten vor. Fuer die Studie war das zu schwach: Die
   Offenlegung des Partnerhauses ist dort eine Textzeile zwischen
   Textzeilen, kaum zu variieren, ohne zugleich Laenge, Ton und
   Position zu aendern - und niemand weiss, ob sie gelesen wurde.

   Jetzt legt sich eine eigene Ansicht ueber die Seite: fuer alle
   gleich aufgebaut, die Karten nebeneinander, mit Bild, Gesamtpreis,
   Teilnoten aus den Bewertungen und einem Satz, warum das Haus passt.

   Die Kennzeichnung des Partnerhauses steht seit dem 23.09.2026 immer
   hier, gross und an fester Stelle. Vorher konnte sie je nach Bedingung
   auch nur im Chat oder nur im Agenten-Log auftauchen - dann sah die
   Ansicht aus wie eine neutrale Empfehlung, und was gemessen wurde, war
   vor allem, ob jemand das Log aufmacht. `offenlegung` entscheidet jetzt
   nur noch, ob es zusaetzlich gesagt (agent) oder protokolliert (log)
   wird; sichtbar ist es in jedem Fall.

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
            <h2>Deine ${["", "", "zwei", "drei", "vier", "fünf", "sechs"][kandidaten.length] || kandidaten.length} Vorschläge</h2>
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
    // Das Fragezeichen oeffnet die Erklaerung und darf die Karte nicht mitklicken
    el.querySelectorAll("[data-info]").forEach((b) => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const feld = b.closest(".vorschlag-banner").querySelector(".vorschlag-infotext");
      const auf = feld.hidden;
      feld.hidden = !auf;
      b.setAttribute("aria-expanded", String(auf));
      b.classList.toggle("offen", auf);
      if (auf) kern.notieren("partner_info_geoeffnet", { id: b.dataset.info, sekunden: Math.round((Date.now() - this.geoeffnet) / 1000) });
    }));

    /* Die Ansicht prueft sich selbst.
       ----------------------------------------------------------------
       Ein Partnerhaus ohne sichtbare Kennzeichnung waere ein stiller
       Ausfall der Manipulation: Im Protokoll stuende, dass es vorgelegt
       wurde, auf dem Bildschirm waere nichts davon zu sehen, und in der
       Auswertung liesse sich das nicht mehr unterscheiden. Deshalb steht
       hier, was wirklich im Dokument steht. */
    const partnerId = kandidaten.find((k) => k.partner)?.id || null;
    const marke = !!el.querySelector(".vorschlag-karte.ist-partner") && /Partnerhaus/.test(el.textContent || "");
    kern.notieren("vorschlagsansicht", { ids: kandidaten.map((k) => k.id), partner: partnerId, offenlegung,
      karten: kandidaten.length, marke: partnerId ? marke : null });
    if (partnerId && !marke) kern.notieren("partner_ohne_marke", { id: partnerId });
  },

  karte(k, i, offenlegung) {
    const item = k.item;
    const bild = typeof titelbildVon === "function" ? titelbildVon(item.id) : null;
    const note = (item.rating || 0).toFixed(1).replace(".", ",");
    // Immer sichtbar, nicht mehr je nach Bedingung
    const marke = k.partner ? `<span class="vorschlag-chip">Partnerhaus</span>` : "";
    /* Das Fragezeichen an der Markierung.
       ----------------------------------------------------------------
       Ein Klick darauf ist der Beleg, dass jemand die Kennzeichnung nicht
       nur gesehen, sondern wissen wollte, was sie bedeutet. Ohne ihn
       bleibt offen, ob die Offenlegung ueberhaupt ankam; im Fragebogen
       laesst sich danach fragen, hier laesst es sich zaehlen. */
    const banner = k.partner
      ? `<div class="vorschlag-banner">
           <span class="vorschlag-banner-kopf">Partnerhaus
             <button type="button" class="vorschlag-info" data-info="${item.id}" aria-label="Was heißt Partnerhaus?" aria-expanded="false">i</button>
           </span>
           <span>Voyara erhält für dieses Haus eine Provision. Es steht deshalb an erster Stelle.</span>
           <p class="vorschlag-infotext" hidden>${item.name} ist ein Partnerhaus von Voyara. Der Anbieter zahlt Voyara eine Provision für Buchungen in diesem Haus, und Voyara zeigt es dafür bevorzugt an erster Stelle an. Preis, Gästenote und Teilnoten sind davon unberührt: Sie stammen aus denselben Daten wie bei allen anderen Häusern. Du kannst jedes andere Haus genauso buchen.</p>
         </div>` : "";
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
    // Vor dem Wechsel auf die Hausseite bleibt ein Knopf im Chat stehen:
    // Wer sich das erste Haus ansieht, hat sich noch nicht entschieden.
    if (k) { k.lauf.gewaehlt = id; k.vorschlaegeMerken?.(); k.sichern(); }
    const item = typeof getItemById === "function" ? getItemById(id) : null;
    // Ueber den Kern, damit Monat und Dauer aus dem Stand mitkommen, auch
    // wenn die Adresse der Liste sie gerade nicht mehr traegt
    let href = k ? k.linkZu(id, "").href : `stay.html?id=${encodeURIComponent(id)}`;
    if (typeof Flug !== "undefined") href = Flug.anLink(href);
    if (item) location.href = href;
  },

  schliessen(still = false, grund = null) {
    const el = document.getElementById("vorschlagSchirm");
    if (el) el.remove();
    document.body.classList.remove("vorschlag-offen");
    if (!still && this.offen && this.daten?.kern) {
      const kern = this.daten.kern;
      kern.notieren("vorschlagsansicht_zu", { grund, sekunden: Math.round((Date.now() - this.geoeffnet) / 1000), gewaehlt: false });
      // Die Ansicht ist weg, die Vorschlaege sind es nicht: Der Chat bietet
      // an, sie wieder zu zeigen, sonst wirkt der Agent, als haette er
      // seine eigene Empfehlung vergessen.
      kern.lauf.chips = ["Zeig die Vorschläge nochmal", "Ich schaue selbst weiter"];
      AgentPanel.setSuggestions?.(kern.lauf.chips);
      kern.vorschlaegeMerken?.();
      kern.sichern();
    }
    this.offen = false;
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Vorschlaege };
