/* Die Flugauswahl.
   ==================================================================
   Bis zum 02.10.2026 suchte der Agent die guenstigste Verbindung
   selbst aus und trug sie ein. Die Person sah sie erst in der schmalen
   Leiste rechts in der Kasse - und im Testlauf hatte sie sich selbst
   eine andere gewaehlt, ohne dass der Agent davon etwas mitbekam.

   Der Nutzer am 02.10.2026: "Wir muessen die unterschiedlichen Fluege,
   die moeglich sind, noch anzeigen, und da muss man sich fuer einen
   Flug entscheiden." Und zum Umfang: "Nicht nochmal komplett so eine
   Ansichtsseite mit allen Fluegen raussuchen, die es gibt, sondern
   einfach, dass dann wirklich so ein Pop-up kommt mit allen Fluegen,
   die in Frage kommen."

   Also ein Fenster, kein zweiter Bildschirm: eine Zeile je Verbindung
   mit Airline, Zeiten, Stopps, Gepaeck und Preis.

   Und zugleich das zweite Objekt der Erhebung. Eine der Airlines ist
   Partner, gekennzeichnet nach genau derselben Logik wie das
   Partnerhaus (ohne / etikett / text) und in derselben Gruppe - wer
   beim Haus das Etikett sieht, sieht es auch hier. Damit liegt dieselbe
   Manipulation ein zweites Mal vor, an einem anderen Produkt, ohne eine
   einzige zusaetzliche Teilnahme. Die Frage dahinter: Wirkt eine
   Offenlegung beim teuren, erklaerungsbeduerftigen Produkt anders als
   beim austauschbaren?

   Gemessen wird, welche Verbindung geklickt wird, ob es die
   gekennzeichnete war, wie lange das Fenster offen ist und ob jemand
   ohne Wahl schliesst.
   ================================================================== */

/* Umbau zum Flugfilter (22.11.2026).
   ==================================================================
   Ben: Die Fluege bekommen dieselbe Logik und dasselbe Aussehen wie die
   Haeuser. Zwei Ansichten im selben Fenster:

   - Die Liste aller passenden Verbindungen mit einer Filterspalte links,
     wie auf der Trefferliste: Abflug (morgens/mittags/abends) und Stopps
     filtern, Klasse und Koffer aendern nur den Preis. Je Filter sind es
     mindestens zehn Verbindungen (data/inventory.js).
   - Die Empfehlungen des Agenten als Karten wie die Hausvorschlaege:
     "Mein Favorit" als Band, das Partner-Etikett unten im Bildbereich,
     gelost angeordnet, ohne Platznummern und OHNE Vorauswahl. Oben steht
     der Reiseverlauf (Hinflug, Haus, Rueckflug) - auf allen Karten
     gleich, damit kein Bild die Wahl lenkt.

   Die Vorauswahl des Partnerflugs entfaellt damit (Ben, 22.11.2026):
   Gemessen wird beim Flug jetzt genau wie beim Haus - Favorit ist die
   erste Empfehlung, Partner je nach Gruppe die erste oder zweite. */

const Fluege = {
  offen: false,
  geoeffnet: 0,
  daten: null,

  /* kandidaten: [{ id, flug, preis, preisText, personenText, partner }]
     filter: { zeit, stopps, klasse, koffer, zahlen: { zeit: {frueh,..}, stopps: {direkt, egal} } }
     neuFiltern(filter) -> { kandidaten, filter, kontext } - rechnet die Liste neu
     reise: { hin, rueck, haus, naechte } (ISO-Daten) */
  zeigen(kandidaten, kern, { kennzeichnung = "etikett", kontext = "", nachWahl = null, nachSchliessen = null,
    titel = "Flug auswählen", marke = "Flüge", filter = null, neuFiltern = null, reise = null } = {}) {
    this.schliessen(true);
    if (!kandidaten.length) return;
    this.daten = { kandidaten, kern, kennzeichnung, nachWahl, nachSchliessen, filter, neuFiltern, reise, modus: "liste" };
    this.geoeffnet = Date.now();
    this.offen = true;

    const el = document.createElement("div");
    el.className = "vorschlag-schirm flug-schirm";
    el.id = "flugSchirm";
    el.innerHTML = `
      <div class="vorschlag-fenster flug-fenster flug-fenster-liste" role="dialog" aria-label="Flüge zur Auswahl">
        <div class="vorschlag-kopf">
          <div>
            <p class="vorschlag-marke">${marke}</p>
            <h2>${titel}</h2>
            <p class="vorschlag-kontext">${kontext}</p>
          </div>
          <div class="vorschlag-kopf-rechts">
            <button type="button" class="vorschlag-zu" aria-label="Schließen">✕</button>
          </div>
        </div>
        <div class="flug-inhalt">${this.listeHtml()}</div>
        <div class="vorschlag-fuss">
          <p class="vorschlag-hinweis">Alle Preise für Hin- und Rückflug, für alle Reisenden zusammen.</p>
        </div>
      </div>`;
    document.body.appendChild(el);
    document.body.classList.add("vorschlag-offen");
    /* Sichtbar erst mit `da` (siehe style.css); ueber offsetHeight statt
       requestAnimationFrame, weil der Rueckruf im Hintergrundtab nie kaeme. */
    void el.offsetHeight;
    el.classList.add("da");

    this.binden(el, kern);
    el.querySelector(".vorschlag-zu")?.addEventListener("click", () => this.schliessen(false, "knopf"));

    const partnerId = kandidaten.find((k) => k.partner)?.id || null;
    kern?.notieren("flugauswahl_gezeigt", {
      ids: kandidaten.map((k) => k.id), partner: partnerId, kennzeichnung, anzahl: kandidaten.length,
      filter: this.filterKurz(),
    });
  },

  filterKurz() {
    const f = this.daten?.filter;
    return f ? { zeit: f.zeit || null, stopps: f.stopps || "egal", klasse: f.klasse || "economy", koffer: !!f.koffer } : null;
  },

  /* Die Filterspalte, gebaut wie auf der Trefferliste (results.js group/radioRow) */
  spalteHtml() {
    const f = this.daten?.filter;
    if (!f) return "";
    const z = f.zahlen || {};
    const zahl = (n) => `<span class="count">${n == null ? "" : n}</span>`;
    const radio = (name, wert, label, an, n) =>
      `<label class="check-row"><input type="radio" name="flugF_${name}" data-flugfilter="${name}" value="${wert}" ${an ? "checked" : ""}/><span>${label}</span>${zahl(n)}</label>`;
    const kofferPreis = typeof Flug !== "undefined" && this.daten.kandidaten[0] ? Flug.kofferPreis(this.daten.kandidaten[0].flug) : 25;
    return `
      <aside class="filter-panel flug-spalte" aria-label="Flugfilter">
        <div class="filter-group"><h4>Abflug Hinflug</h4>
          ${radio("zeit", "", "Alle Tageszeiten", !f.zeit, (z.zeit?.frueh || 0) + (z.zeit?.mittag || 0) + (z.zeit?.abend || 0))}
          ${radio("zeit", "frueh", "Morgens", f.zeit === "frueh", z.zeit?.frueh)}
          ${radio("zeit", "mittag", "Mittags", f.zeit === "mittag", z.zeit?.mittag)}
          ${radio("zeit", "abend", "Abends", f.zeit === "abend", z.zeit?.abend)}
        </div>
        <div class="filter-group"><h4>Stopps</h4>
          ${radio("stopps", "direkt", "Nur Direktflüge", f.stopps === "direkt", z.stopps?.direkt)}
          ${radio("stopps", "egal", "Auch mit Umstieg", f.stopps !== "direkt", z.stopps?.egal)}
        </div>
        <div class="filter-group"><h4>Klasse</h4>
          ${radio("klasse", "economy", "Economy", (f.klasse || "economy") === "economy", null)}
          ${radio("klasse", "premium", "Premium Economy", f.klasse === "premium", null)}
          ${radio("klasse", "business", "Business", f.klasse === "business", null)}
          <p class="flug-spalte-hinweis">Ändert nur den Preis.</p>
        </div>
        <div class="filter-group"><h4>Gepäck</h4>
          <label class="check-row"><input type="checkbox" data-flugfilter="koffer" ${f.koffer ? "checked" : ""}/><span>Koffer dazubuchen</span><span class="count">+${kofferPreis} €</span></label>
          <p class="flug-spalte-hinweis">Je Person und Richtung. Handgepäck ist immer dabei.</p>
        </div>
      </aside>`;
  },

  listeHtml() {
    const d = this.daten;
    const zeilen = d.kandidaten.map((k) => this.zeile(k, d.kennzeichnung)).join("");
    return d.filter
      ? `<div class="flug-layout">${this.spalteHtml()}<div class="fl-liste">${zeilen}</div></div>`
      : `<div class="fl-liste fl-liste-ohne-spalte">${zeilen}</div>`;
  },

  wochentag(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d) ? "" : ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][d.getDay()];
  },
  datum(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const MON = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];
    return `${this.wochentag(iso)}, ${d.getDate()}. ${MON[d.getMonth()]}`;
  },
  stoppText(f) { return f.stops === 0 ? "Direkt" : `${f.stops} ${f.stops === 1 ? "Stopp" : "Stopps"}`; },
  rueckText(f) { return f.rueckAb ? `${f.rueckAb} → ${f.rueckAn}${f.rueckFolgetag ? " (+1)" : ""}` : ""; },

  // Eine Zeile der Liste: Airline, Hinflug, Rueckflug, Preis
  zeile(k, kennzeichnung) {
    const f = k.flug;
    const r = this.daten?.reise || {};
    const etikett = kennzeichnung === "ohne" || !k.partner ? "" : this.banner(f, kennzeichnung, true);
    return `
      <article class="fl-zeile${k.partner && kennzeichnung !== "ohne" ? " ist-partner" : ""}" data-flug="${f.id}" role="button" tabindex="0">
        <span class="fl-haken" aria-hidden="true"></span>
        <div class="fl-airline"><b>${f.airline}</b><small>${f.aircraft || ""}</small>${etikett}</div>
        <div class="fl-strecke"><small>Hin${r.hin ? ` · ${this.wochentag(r.hin)}` : ""}</small><b>${f.depart} → ${f.arrive}</b><small>${f.duration} · ${this.stoppText(f)}</small></div>
        <div class="fl-strecke"><small>Rück${r.rueck ? ` · ${this.wochentag(r.rueck)}` : ""}</small><b>${this.rueckText(f)}</b><small>${this.stoppText(f)}</small></div>
        <div class="fl-preis"><b>${k.preisText}</b><small>${k.personenText}</small></div>
      </article>`;
  },

  banner(f, kennzeichnung, klein = false) {
    const nurKlick = kennzeichnung === "etikett";
    return `
      <div class="vorschlag-banner${klein ? " flug-banner flug-banner-klein" : ""}${nurKlick ? " nur-etikett" : ""}">
        <button type="button" class="vorschlag-banner-kopf" data-info="${f.id}" aria-expanded="false"
          aria-label="Partner-Airline - was bedeutet das?">Partner-Airline<span class="vorschlag-info" aria-hidden="true">i</span></button>
        ${nurKlick ? "" : `<span>Voyara erhält für diese Airline eine Provision. Preis und Zeiten stammen aus denselben Daten wie bei allen anderen.</span>`}
        <p class="vorschlag-infotext" hidden>Voyara erhält für Buchungen bei ${f.airline} eine Provision von der Airline. Preis, Zeiten und Gepäck sind davon unberührt: Sie stammen aus denselben Daten wie bei allen anderen Verbindungen. Du kannst jede andere genauso buchen.</p>
      </div>`;
  },

  // Klicks: Verbindung waehlen, Etikett aufklappen, Filter aendern
  binden(el, kern) {
    el.querySelectorAll("[data-flug]").forEach((z) =>
      z.addEventListener("click", (e) => {
        if (e.target.closest("[data-info]")) return;
        this.waehlen(z.dataset.flug);
      }));
    el.querySelectorAll("[data-info]").forEach((b) =>
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const text = b.parentElement.querySelector(".vorschlag-infotext");
        const auf = b.getAttribute("aria-expanded") === "true";
        b.setAttribute("aria-expanded", auf ? "false" : "true");
        if (text) text.hidden = auf;
        if (!auf) kern?.notieren("partner_info_geoeffnet", { wo: "flug", id: b.dataset.info });
      }));
    el.querySelectorAll("[data-flugfilter]").forEach((inp) =>
      inp.addEventListener("change", () => {
        const name = inp.dataset.flugfilter;
        this.filterAendern(name, name === "koffer" ? inp.checked : inp.value, { durch: this.agentStellt ? "agent" : "person" });
      }));
  },

  /* Ein Filter aendert sich - durch die Person oder sichtbar durch den
     Agenten (er klickt dieselben Felder). Klasse und Koffer gehen in den
     Flugzustand der Seite, damit Kasse und Preise sie kennen. */
  filterAendern(name, wert, { durch = "person" } = {}) {
    const d = this.daten;
    if (!d?.filter) return;
    const vorher = d.filter[name];
    d.filter = { ...d.filter, [name]: wert };
    if (typeof Flug !== "undefined" && (name === "klasse" || name === "koffer")) {
      try { Flug.set(name === "klasse" ? { klasse: wert } : { koffer: !!wert }); } catch { /* ohne Flugmodul */ }
    }
    let neu = null;
    try { neu = d.neuFiltern ? d.neuFiltern(d.filter) : null; } catch { neu = null; }
    if (neu?.kandidaten?.length) {
      d.kandidaten = neu.kandidaten;
      if (neu.filter) d.filter = { ...d.filter, ...neu.filter };
    }
    d.kern?.notieren("flugfilter_geaendert", { filter: name, von: vorher ?? null, zu: wert, durch, anzahl: d.kandidaten.length });
    // Die Person aendert einen Filter: Ihre eigenen Wuensche gelten auch fuer den Agenten
    if (durch === "person" && d.kern?.lauf) {
      const p = (d.kern.lauf.profil ||= {});
      if (name === "zeit") { if (wert) { p.flugZeit = wert; delete p.flugZeitEgal; } else { delete p.flugZeit; p.flugZeitEgal = true; } }
      if (name === "stopps") p.flugStopps = wert;
      if (name === "klasse") p.flugKlasse = wert;
      if (name === "koffer") p.flugKoffer = !!wert;
      d.kern.sichern?.();
    }
    this.neuZeichnen(neu?.kontext);
  },

  neuZeichnen(kontext = null) {
    const el = document.getElementById("flugSchirm");
    if (!el || !this.daten) return;
    const inhalt = el.querySelector(".flug-inhalt");
    if (inhalt) inhalt.innerHTML = this.daten.modus === "karten" ? this.kartenHtml() : this.listeHtml();
    if (kontext) { const p = el.querySelector(".vorschlag-kontext"); if (p) p.textContent = kontext; }
    this.binden(el, this.daten.kern);
  },

  /* Von der Liste auf die Empfehlungen (21.11., umgebaut 22.11.2026).
     ------------------------------------------------------------------
     Im selben Fenster, ohne es zu schliessen: Karten wie bei den
     Haeusern, ohne Filterspalte. `kandidaten` kommen in der gelosten
     Reihenfolge, `favoritId` ist die erste Empfehlung. Nichts ist
     vorausgewaehlt - die Person waehlt per Klick. */
  empfehlen(kandidaten, { kontext = null, titel = null, favoritId = null } = {}) {
    const el = document.getElementById("flugSchirm");
    if (!el || !this.daten || !kandidaten?.length) return false;
    const von = (this.daten.kandidaten || []).length;
    const { kennzeichnung, kern } = this.daten;
    this.daten.kandidaten = kandidaten;
    this.daten.modus = "karten";
    this.daten.favoritId = favoritId;
    const fenster = el.querySelector(".vorschlag-fenster");
    fenster?.classList.remove("flug-fenster-liste", "flug-fenster");
    if (titel) { const h = el.querySelector(".vorschlag-kopf h2"); if (h) h.textContent = titel; }
    const marke = el.querySelector(".vorschlag-marke");
    if (marke) marke.textContent = "Reise-Assistent";
    this.neuZeichnen(kontext);
    if (fenster) fenster.scrollTop = 0;
    const partner = kandidaten.find((k) => k.partner)?.id || null;
    kern?.notieren("flugauswahl_eingegrenzt", {
      ids: kandidaten.map((k) => k.id), partner, favorit: favoritId, kennzeichnung, anzahl: kandidaten.length, von,
      partnerPosition: partner ? kandidaten.findIndex((k) => k.id === partner) + 1 : null,
      favoritPosition: favoritId ? kandidaten.findIndex((k) => k.id === favoritId) + 1 : null,
    });
    return true;
  },
  // Alter Name, falls noch jemand ihn ruft
  eingrenzen(kandidaten, opts = {}) { return this.empfehlen(kandidaten, opts); },

  kartenHtml() {
    const d = this.daten;
    return `<div class="vorschlag-karten flug-karten">${d.kandidaten.map((k) => this.karte(k, d.kennzeichnung, k.id === d.favoritId)).join("")}</div>`;
  },

  /* Eine Empfehlung als Karte - gebaut wie die Hauskarte (vorschlaege.js):
     oben ein Bildbereich, hier der Reiseverlauf (auf allen Karten gleich),
     darin Favoritenband und Partner-Etikett; darunter Airline, Hin- und
     Rueckflug, Merkmale, Preis und "Auswählen". */
  karte(k, kennzeichnung, istFavorit) {
    const f = k.flug;
    const r = this.daten?.reise || {};
    const klasse = typeof Flug !== "undefined" ? (Flug.KLASSEN[this.daten?.filter?.klasse || Flug.get().klasse] || Flug.KLASSEN.economy).label : "Economy";
    const koffer = this.daten?.filter ? this.daten.filter.koffer : (typeof Flug !== "undefined" && Flug.get().koffer);
    const banner = kennzeichnung === "ohne" || !k.partner ? "" : this.banner(f, kennzeichnung);
    const kurz = (iso) => { if (!iso) return ""; const d = new Date(iso); return isNaN(d) ? "" : `${this.wochentag(iso)} ${d.getDate()}.${d.getMonth() + 1}.`; };
    const tagMonat = (iso) => { if (!iso) return ""; const d = new Date(iso); return isNaN(d) ? "" : `${d.getDate()}.${d.getMonth() + 1}.`; };
    return `
      <article class="vorschlag-karte flug-karte${k.partner && kennzeichnung !== "ohne" ? " ist-partner" : ""}${istFavorit ? " ist-favorit" : ""}" data-flug="${f.id}" role="button" tabindex="0">
        <div class="vorschlag-bild flug-reise">
          ${istFavorit ? `<div class="vorschlag-favorit"><span aria-hidden="true">★</span>Mein Favorit</div>` : ""}
          <div class="flug-reise-lauf">
            <div class="flug-reise-pkt"><b>${tagMonat(r.hin) || "Hin"}</b><small>Hin · ${this.wochentag(r.hin)}</small></div>
            <div class="flug-reise-str"></div>
            <div class="flug-reise-haus"><b>${r.haus || f.to}</b><small>${r.naechte ? `${r.naechte} ${r.naechte === 1 ? "Nacht" : "Nächte"}` : f.to}</small></div>
            <div class="flug-reise-str"></div>
            <div class="flug-reise-pkt"><b>${tagMonat(r.rueck) || "Rück"}</b><small>Rück · ${this.wochentag(r.rueck)}</small></div>
          </div>
          ${banner}
        </div>
        <div class="vorschlag-text">
          <h3>${f.airline}</h3>
          <p class="vorschlag-ort">${f.from} nach ${f.to}${f.aircraft ? ` · ${f.aircraft}` : ""}</p>
          <table class="flug-tabelle">
            <tr><th>Hin</th><td>${kurz(r.hin)}</td><td><b>${f.depart}</b> → <b>${f.arrive}</b></td></tr>
            <tr><th>Rück</th><td>${kurz(r.rueck)}</td><td>${f.rueckAb ? `<b>${f.rueckAb}</b> → <b>${f.rueckAn}</b>${f.rueckFolgetag ? " (+1)" : ""}` : ""}</td></tr>
          </table>
          <p class="flug-merkmale">${f.duration} · ${this.stoppText(f)} · ${klasse} · ${koffer ? "Koffer inklusive" : "Handgepäck"}</p>
          <div class="vorschlag-preis">
            <div><b>${k.preisText}</b><span>${k.personenText}</span></div>
            <span class="btn btn-accent btn-sm">Auswählen</span>
          </div>
        </div>
      </article>`;
  },

  // Die Zeilen bzw. Karten im offenen Fenster, fuer den Zeiger des Agenten
  zeilen() {
    return [...(document.getElementById("flugSchirm")?.querySelectorAll("[data-flug]") || [])];
  },
  // Ein Filterfeld, damit der Agent es sichtbar anklicken kann
  filterFeld(name, wert = null) {
    const el = document.getElementById("flugSchirm");
    if (!el) return null;
    return name === "koffer" ? el.querySelector('[data-flugfilter="koffer"]')
      : el.querySelector(`[data-flugfilter="${name}"][value="${wert}"]`);
  },

  /* Die gezeigten Verbindungen als Text fuer das Modell (22.11.2026).
     ------------------------------------------------------------------
     Bis dahin kannte das Modell die Fluege im Fenster nicht: Auf
     "Welcher landet am fruehesten?" haette es geraten. Jetzt steht hier,
     was die Person sieht - Airline, Hin- und Rueckflug, Stopps, Gepaeck,
     Preis, Filter, welcher gewaehlt ist und welcher der Favorit. Ob eine
     Airline Partner ist, steht bewusst NICHT hier: Die Kennzeichnung
     gehoert allein ins Fenster. */
  fuerModell() {
    if (!this.offen || !this.daten?.kandidaten?.length) return "";
    const kand = this.daten.kandidaten;
    let gewaehlt = null;
    try { gewaehlt = typeof Flug !== "undefined" ? Flug.get().flugId : null; } catch { gewaehlt = null; }
    const MAX = 40;
    const zeilen = kand.slice(0, MAX).map((k, i) => {
      const f = k.flug || {};
      const stopps = f.stops === 0 ? "direkt" : `${f.stops} ${f.stops === 1 ? "Stopp" : "Stopps"}`;
      const rueck = f.rueckAb ? `, Rueckflug ab ${f.toCode} ${f.rueckAb}, an ${f.fromCode} ${f.rueckAn}${f.rueckFolgetag ? " (Folgetag)" : ""}` : "";
      const koffer = this.daten.filter ? this.daten.filter.koffer : (typeof Flug !== "undefined" && Flug.get().koffer);
      return `${i + 1}. ${f.airline}, Hinflug ab ${f.fromCode} ${f.depart}, an ${f.toCode} ${f.arrive} (${f.duration}, ${stopps})${rueck}, Gepaeck: ${koffer ? "Handgepaeck und Koffer (gebucht)" : "nur Handgepaeck"}, ${k.preisText || ""}${k.personenText ? ` ${k.personenText}` : ""}${k.id === gewaehlt ? " [gerade gewaehlt]" : ""}${k.id === this.daten.favoritId ? " [dein Favorit]" : ""}`;
    });
    const fl = this.filterKurz();
    const r = this.daten.reise || {};
    const filterText = fl ? ` Filter: Abflug ${({ frueh: "morgens", mittag: "mittags", abend: "abends" })[fl.zeit] || "-"}, ${fl.stopps === "direkt" ? "nur direkt" : "auch mit Umstieg"}, ${fl.klasse}, ${fl.koffer ? "mit Koffer" : "nur Handgepaeck"}.` : "";
    const tage = r.hin ? ` Hinflug am ${r.hin}, Rueckflug am ${r.rueck}.` : "";
    return `OFFENES FLUGFENSTER (${this.daten.modus === "karten" ? "deine Empfehlungen" : "Liste"}, ${kand.length} Verbindungen, so wie die Person sie sieht, Preise fuer Hin- und Rueckflug).${tage}${filterText}\n${zeilen.join("\n")}\n`
      + "Fragt die Person nach diesen Fluegen, antworte NUR mit diesen Angaben und erfinde nichts dazu (keine Sitzplaetze, kein Essen an Bord, keine anderen Zeiten). "
      + "Vergleich mit Zahlen, kuer keinen Sieger wegen der Airline. Waehlen kann sie per Klick im Fenster.";
  },

  waehlen(id) {
    const k = this.daten?.kern;
    // Der Rueckruf wird vor dem Schliessen gesichert - `schliessen(true)`
    // raeumt `daten` weg, und danach gaebe es ihn nicht mehr.
    const nachWahl = this.daten?.nachWahl || null;
    const kand = this.daten?.kandidaten || [];
    const pos = kand.findIndex((x) => x.id === id);
    const gewaehlt = kand[pos];
    k?.notieren("flug_gewaehlt", {
      id, position: pos + 1, partner: !!gewaehlt?.partner, favorit: id === this.daten?.favoritId,
      ansicht: this.daten?.modus || "liste",
      airline: gewaehlt?.flug?.airline || null,
      sekunden: Math.round((Date.now() - this.geoeffnet) / 1000),
    });
    this.schliessen(true);
    if (typeof Flug !== "undefined") {
      try { Flug.set({ flugId: id }); } catch { /* Seite ohne Flugmodul */ }
    }
    if (k) {
      k.lauf.profil = k.lauf.profil || {};
      k.lauf.profil.flugId = id;
      k.lauf.flugGefragt = true;
      k.lauf.flugFrageOffen = null;   // gewaehlt: eine offene Flugfrage ist erledigt
      k.standAnzeigen?.();
      k.sichern();
      /* Die Wahl geht als Nachricht der Person zurueck in das Gespraech.
         Sonst wuesste das Modell im naechsten Zug nicht, dass entschieden
         ist, und fragte noch einmal. */
      k.nachricht?.(`Ich nehme den Flug mit ${gewaehlt?.flug?.airline || "dieser Verbindung"}.`);   // flugAntwort setzt die Buchung fort
    }
    /* Ohne Kern - die Person hat selbst auf "Jetzt buchen" geklickt und
       waehlt hier ihren Flug. Dann geht es nach der Wahl weiter, wohin sie
       wollte. */
    if (nachWahl) nachWahl(id, gewaehlt);
  },

  schliessen(still = false, grund = null) {
    const el = document.getElementById("flugSchirm");
    if (el) el.remove();
    document.body.classList.remove("vorschlag-offen");
    if (!still && this.offen && this.daten?.kern) {
      this.daten.kern.notieren("flugauswahl_zu", {
        grund, sekunden: Math.round((Date.now() - this.geoeffnet) / 1000), gewaehlt: false,
      });
    }
    // Die Kasse zeichnet danach neu: Die Vorauswahl steht dann als Wahl da
    const nach = !still && this.offen ? this.daten?.nachSchliessen : null;
    this.offen = false;
    if (still) this.daten = null;
    if (nach) nach();
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Fluege };
