/* Die Mietwagenauswahl.
   ==================================================================
   Wunsch des Nutzers vom 03.10.2026: "Mietwagen, wenn gewuenscht.
   Aehnlich wie bei der Hotelsuche auch Reiter oeffnen, suchen. Drei
   besten vorschlagen, Partnerwagen darstellen, im besten Fall drei
   Autos waehlen, die aehnlich sind, sodass dadurch kein Bias entsteht."

   Aufbau wie die Flugauswahl (agent/fluege.js): ein Fenster, eine Zeile
   je Wagen, der Partnerwagen nach derselben Kennzeichnung wie Haus und
   Airline (ohne / etikett / text). Die drei Wagen kommen aus einer
   Gruppe gleicher Klasse mit gleichen Merkmalen (data/inventory.js,
   mietwagenGruppen); sie unterscheiden sich nur in Modell, Vermieter
   und wenigen Prozent im Preis.

   Gemessen wird, welcher Wagen gewaehlt wird, ob es der
   gekennzeichnete war und wie lange das Fenster offen war.
   ================================================================== */

const Mietwagen = {
  offen: false,
  geoeffnet: 0,
  daten: null,

  // Welche Klasse zur Gruppe passt, wenn die Person keine nennt
  klasseFuer(personen) {
    if (personen >= 6) return "Van (7 Sitze)";
    if (personen >= 3) return "Kompaktklasse";
    return "Kleinwagen";
  },

  // Drei aehnliche Wagen einer Klasse am Ziel, der Partnerwagen vorn
  kandidaten(ziel, klasse) {
    if (typeof CARS === "undefined") return [];
    return CARS.filter((c) => c.ziel === ziel && c.category === klasse)
      .sort((a, b) => a.pricePerDay - b.pricePerDay).slice(0, 3);
  },

  /* kandidaten: [{ id, wagen, partner, preisText, tageText }] */
  zeigen(kandidaten, kern, { kennzeichnung = "etikett", kontext = "", tage = 7 } = {}) {
    this.schliessen(false, "neu");
    this.offen = true;
    this.geoeffnet = Date.now();
    this.daten = { kandidaten, kern, tage, kennzeichnung };
    const el = document.createElement("div");
    el.className = "vorschlag-schirm";
    el.id = "mietwagenFenster";
    el.innerHTML = `
      <div class="vorschlag-fenster flug-fenster" role="dialog" aria-label="Mietwagen zur Auswahl">
        <div class="vorschlag-kopf">
          <div>
            <p class="vorschlag-marke">Reise-Assistent</p>
            <h2 class="vorschlag-titel">Mietwagen zur Auswahl</h2>
            ${kontext ? `<p class="vorschlag-kontext">${kontext}</p>` : ""}
          </div>
          <div class="vorschlag-kopf-rechts">
            <button type="button" class="vorschlag-zu" aria-label="Schließen">✕</button>
          </div>
        </div>
        <div class="flug-liste">${kandidaten.map((k) => this.zeile(k, kennzeichnung)).join("")}</div>
        <div class="vorschlag-fuss">
          <p class="vorschlag-hinweis">Preise für ${tage} ${tage === 1 ? "Tag" : "Tage"}, Versicherungspaket in der Kasse dazu. Der Wagen wird getrennt von der Unterkunft gebucht.</p>
        </div>
      </div>`;
    document.body.appendChild(el);
    document.body.classList.add("vorschlag-offen");
    // Sichtbar erst mit `da` (siehe agent/fluege.js)
    void el.offsetHeight;
    el.classList.add("da");

    el.querySelectorAll("[data-wagen]").forEach((z) =>
      z.addEventListener("click", (e) => {
        if (e.target.closest("[data-info]")) return;
        this.waehlen(z.dataset.wagen);
      }));
    el.querySelector(".vorschlag-zu")?.addEventListener("click", () => this.schliessen(false, "knopf"));
    el.querySelectorAll("[data-info]").forEach((b) =>
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const text = b.parentElement.querySelector(".vorschlag-infotext");
        const auf = b.getAttribute("aria-expanded") === "true";
        b.setAttribute("aria-expanded", auf ? "false" : "true");
        if (text) text.hidden = auf;
        if (!auf) kern?.notieren("partner_info_geoeffnet", { wo: "mietwagen", id: b.dataset.info });
      }));

    kern?.notieren("mietwagen_gezeigt", {
      ids: kandidaten.map((k) => k.id), partner: kandidaten.find((k) => k.partner)?.id || null,
      kennzeichnung, anzahl: kandidaten.length,
    });
  },

  zeile(k, kennzeichnung) {
    const c = k.wagen;
    const nurKlick = kennzeichnung === "etikett";
    const banner = kennzeichnung === "ohne" || !k.partner ? "" : `
      <div class="vorschlag-banner flug-banner${nurKlick ? " nur-etikett" : ""}">
        <button type="button" class="vorschlag-banner-kopf" data-info="${c.id}" aria-expanded="false"
          aria-label="Partner-Vermieter - was bedeutet das?">Partner-Vermieter<span class="vorschlag-info" aria-hidden="true">i</span></button>
        ${nurKlick ? "" : `<span>Voyara erhält für diesen Vermieter eine Provision. Preis und Ausstattung stammen aus denselben Daten wie bei allen anderen.</span>`}
        <p class="vorschlag-infotext" hidden>Voyara erhält für Buchungen bei ${c.supplier} eine Provision vom Vermieter. Preis und Ausstattung sind davon unberührt. Du kannst jeden anderen Wagen genauso buchen.</p>
      </div>`;
    return `
      <article class="flug-zeile${k.partner && kennzeichnung !== "ohne" ? " ist-partner" : ""}"
        data-wagen="${c.id}" role="button" tabindex="0">
        <div class="flug-kopf">
          <span class="flug-haken" aria-hidden="true"></span>
          <div class="flug-airline">
            <strong>${c.model} <span class="hint" style="font-weight:400">oder ähnlich</span></strong>
            <small>${c.supplier} · ${c.category}</small>
          </div>
          ${banner}
        </div>
        <div class="flug-fuss">
          <small>${c.seats} Sitze · ${c.bags} Koffer · ${c.transmission} · ${c.fuel} · ${c.mileage} · Abholung ${c.pickup}</small>
          <div class="flug-preis">
            <strong>${k.preisText}</strong>
            <small>${k.tageText}</small>
          </div>
        </div>
      </article>`;
  },

  waehlen(id) {
    const d = this.daten || {};
    const k = d.kern;
    const kand = d.kandidaten || [];
    const pos = kand.findIndex((x) => x.id === id);
    const gewaehlt = kand[pos];
    k?.notieren("mietwagen_gewaehlt", {
      id, position: pos + 1, partner: !!gewaehlt?.partner, vermieter: gewaehlt?.wagen?.supplier || null,
      sekunden: Math.round((Date.now() - this.geoeffnet) / 1000),
    });
    if (typeof Studie !== "undefined" && Studie.notieren) {
      try { Studie.notieren("mietwagen_gewaehlt", { id, partner: !!gewaehlt?.partner, wo: "fenster" }); } catch { /* ohne Studie */ }
    }
    this.schliessen(true);
    if (k) {
      k.lauf.mietwagen = { id, partner: !!gewaehlt?.partner };
      k.sagen(`${gewaehlt?.wagen?.model || "Der Wagen"} von ${gewaehlt?.wagen?.supplier || "dem Vermieter"} liegt jetzt in der Kasse. Den Mietwagen buchst du getrennt von der Unterkunft.`);
      k.sichern();
    }
    let href = `checkout.html?id=${encodeURIComponent(id)}`;
    if (typeof Reisedaten !== "undefined") href = Reisedaten.anLink(href);
    if (d.tage && !/[?&](nights|from)=/.test(href)) href += `&nights=${d.tage}`;
    setTimeout(() => { location.href = href; }, 400);
  },

  schliessen(gewaehlt = false, wie = "knopf") {
    const el = document.getElementById("mietwagenFenster");
    if (!el) return;
    if (!gewaehlt && this.daten?.kern) {
      this.daten.kern.notieren("mietwagen_ohne_wahl", { wie, sekunden: Math.round((Date.now() - this.geoeffnet) / 1000) });
    }
    el.remove();
    document.body.classList.remove("vorschlag-offen");
    this.offen = false;
    if (!gewaehlt) this.daten = null;
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Mietwagen };
