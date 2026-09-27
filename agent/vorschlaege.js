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
  zeigen(kandidaten, kern, { offenlegung = null, kontext = "", kennzeichnung = "etikett" } = {}) {
    this.schliessen(true);
    this.daten = { kandidaten, kern, offenlegung, kennzeichnung };
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
          <div class="vorschlag-kopf-rechts">
            <button type="button" class="btn btn-ghost btn-sm" data-selbst>Ich schaue mir erst die Liste an</button>
            <button type="button" class="vorschlag-zu" aria-label="Schließen">✕</button>
          </div>
        </div>
        <div class="vorschlag-karten">${kandidaten.map((k, i) => this.karte(k, i, offenlegung, kennzeichnung)).join("")}</div>
        <div class="vorschlag-fuss">
          <p class="vorschlag-hinweis">Du kannst jederzeit im Chat weiterfragen, vergleichen lassen oder eigene Filter setzen.</p>
        </div>
      </div>`;
    document.body.appendChild(el);
    document.body.classList.add("vorschlag-offen");
    /* Alle Karten auf eine Linie - ohne Platzhalter.
       ------------------------------------------------------------------
       Bis zum 27.09.2026 stand die Kennzeichnung im Textteil der Karte
       und schob dort alles nach unten. Damit die Teilnoten trotzdem
       nebeneinander lagen, bekamen die anderen Karten einen leeren
       Platzhalter in gemessener Hoehe - eine Kruecke, die nur wegen der
       Position noetig war, und die die Karte um gut hundert Pixel
       verlaengerte.

       Jetzt liegt die Kennzeichnung im Bild. Unterhalb des Bildes sind
       alle Karten Zeile fuer Zeile gleich gebaut, ganz ohne Messen, und
       die Ansicht passt wieder auf einen Bildschirm. */
    requestAnimationFrame(() => el.classList.add("da"));

    el.querySelector(".vorschlag-zu").addEventListener("click", () => this.schliessen(false, "kreuz"));
    el.querySelector("[data-selbst]").addEventListener("click", () => this.schliessen(false, "liste"));
    el.addEventListener("click", (e) => { if (e.target === el) this.schliessen(false, "daneben"); });
    el.querySelectorAll("[data-haus]").forEach((k) => k.addEventListener("click", () => this.waehlen(k.dataset.haus)));
    /* Die Bewertungsuebersicht.
       ------------------------------------------------------------------
       Wunsch des Nutzers vom 27.09.2026. Sie steht auf der Karte, weil
       dort entschieden wird, und sie steht auf ALLEN Karten gleich -
       eine Uebersicht, die es nur fuer ein Haus gibt, waere keine
       Vergleichshilfe, sondern ein Daumen auf der Waage.

       Dass jemand sie oeffnet, wird mitgeschrieben. Damit gibt es neben
       dem Klick auf die Kennzeichnung eine zweite Verhaltensmessung:
       Graben Menschen beim Partnerhaus tiefer oder weniger tief? */
    el.querySelectorAll("[data-bild]").forEach((b) => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const kand = (this.daten?.kandidaten || []).find((x) => x.id === b.dataset.bild);
      if (!kand?.bild) return;
      kern.notieren("bewertungsbild_geoeffnet", { id: kand.id, partner: !!kand.partner,
        sekunden: Math.round((Date.now() - this.geoeffnet) / 1000) });
      this.bildZeigen(kand, kern);
    }));
    // Das Fragezeichen oeffnet die Erklaerung und darf die Karte nicht mitklicken
    /* Der Klick auf die Kennzeichnung ist die Messung.
       ------------------------------------------------------------------
       Vorschlag des Nutzers vom 27.09.2026: Nur das Wort "Partnerhaus"
       steht da; was es bedeutet, erscheint erst auf Klick. Wer klickt,
       hat sich nicht nur das Etikett angesehen, sondern wissen wollen,
       was dahinter steht - und das laesst sich zaehlen, im Gegensatz zu
       "hat es gelesen".

       Geklickt wird auf das ganze Etikett, nicht auf ein kleines
       Fragezeichen daneben: Ein Ziel von fuenfzehn Pixeln haette vor
       allem gemessen, wer gut trifft. */
    el.querySelectorAll("[data-info]").forEach((b) => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const feld = b.closest(".vorschlag-banner").querySelector(".vorschlag-infotext");
      if (!feld) return;
      const auf = feld.hidden;
      feld.hidden = !auf;
      b.setAttribute("aria-expanded", String(auf));
      b.classList.toggle("offen", auf);
      if (auf) kern.notieren("partner_info_geoeffnet", { id: b.dataset.info, kennzeichnung, sekunden: Math.round((Date.now() - this.geoeffnet) / 1000) });
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
    kern.notieren("vorschlagsansicht", { ids: kandidaten.map((k) => k.id), partner: partnerId, offenlegung, kennzeichnung,
      karten: kandidaten.length, marke: kennzeichnung === "ohne" ? false : (partnerId ? marke : null) });
    // In der Kontrollbedingung ist die fehlende Marke der Sollzustand
    if (partnerId && !marke && kennzeichnung !== "ohne") kern.notieren("partner_ohne_marke", { id: partnerId });
  },

  karte(k, i, offenlegung, kennzeichnung = "etikett") {
    const item = k.item;
    const bild = typeof titelbildVon === "function" ? titelbildVon(item.id) : null;
    const note = (item.rating || 0).toFixed(1).replace(".", ",");
    /* Die Kennzeichnung liegt im Bild, am unteren Rand.
       ----------------------------------------------------------------
       Zwei Gruende, beide vom Nutzer am 27.09.2026 genannt: Sie schob
       im Textteil alles nach unten, sodass die Ansicht nicht mehr auf
       einen Bildschirm passte, und sie stand doppelt da. Jetzt gibt es
       eine Kennzeichnung an einer Stelle, und unterhalb des Bildes ist
       jede Karte gleich gebaut.

       Drei Formen - der Between-Faktor der Erhebung:

       "ohne"     Gar keine Kennzeichnung. Dieselbe Reihenfolge, dasselbe
                  Haus auf Platz eins, nur steht nichts daran. Die
                  Kontrollbedingung: Wie oft folgen Menschen der
                  Empfehlung, wenn nichts sie stoert?

       "etikett"  Nur das Wort "Partnerhaus". Was es bedeutet, erscheint
                  erst auf Klick. Der Klick ist damit ein Beleg dafuer,
                  dass jemand die Kennzeichnung nicht nur gesehen, sondern
                  verstanden wissen wollte - etwas, das sich zaehlen
                  laesst, anders als "hat es gelesen".

       "text"     Etikett und Erklaerungssatz stehen sofort da. Jeder
                  liest dasselbe, niemand muss etwas tun.

       Unterschiedlich ist nur, wie viel davon ungefragt dasteht. Alles
       andere - Reihenfolge, Haus, Preis, Noten - bleibt gleich. */
    const nurKlick = kennzeichnung === "etikett";
    const banner = kennzeichnung === "ohne" ? "" : k.partner
      ? `<div class="vorschlag-banner${nurKlick ? " nur-etikett" : ""}">
           <button type="button" class="vorschlag-banner-kopf" data-info="${item.id}" aria-expanded="false"
             aria-label="Partnerhaus - was bedeutet das?">Partnerhaus<span class="vorschlag-info" aria-hidden="true">i</span></button>
           ${nurKlick ? "" : `<span>Voyara erhält für dieses Haus eine Provision. Preis und Noten stammen aus denselben Daten wie bei allen anderen.</span>`}
           <p class="vorschlag-infotext" hidden>Voyara erhält für Buchungen in ${item.name} eine Provision vom Anbieter. Preis, Gästenote und Teilnoten sind davon unberührt: Sie stammen aus denselben Daten wie bei allen anderen Häusern. Du kannst jedes andere Haus genauso buchen.</p>
         </div>`
      : "";
    return `
      <article class="vorschlag-karte${k.partner && kennzeichnung !== "ohne" ? " ist-partner" : ""}" data-haus="${item.id}">
        <div class="vorschlag-bild">
          ${bild ? `<img src="${bild}" alt="${item.name}" loading="lazy">` : ""}
          <span class="vorschlag-platz">${i + 1}</span>
          ${banner}
        </div>
        <div class="vorschlag-text">
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
          ${k.bild ? `<button type="button" class="vorschlag-bewertungsknopf" data-bild="${item.id}">
            Was ${(item.reviewCount || 0).toLocaleString("de-DE")} Gäste schreiben
          </button>` : ""}
          <div class="vorschlag-preis">
            <div><b>${k.gesamtText}</b><span>${k.preisZusatz}</span></div>
            <span class="btn btn-accent btn-sm">Ansehen</span>
          </div>
        </div>
      </article>`;
  },

  /* Die Uebersicht legt sich ueber die Vorschlaege, nicht in die Karte.
     ------------------------------------------------------------------
     Inline haette sie die Karte um ein Vielfaches verlaengert, und die
     Ansicht passte nicht mehr auf einen Bildschirm - genau das, was
     beim Partnerbanner gerade behoben wurde. Als Ebene bleibt die
     Gegenueberstellung darunter unveraendert stehen. */
  bildZeigen(kand, kern) {
    document.getElementById("bewertungsbild")?.remove();
    const b = kand.bild;
    const item = kand.item;
    const note = (x) => x.toFixed(1).replace(".", ",");
    const el = document.createElement("div");
    el.className = "bild-schirm";
    el.id = "bewertungsbild";
    el.innerHTML = `
      <div class="bild-fenster" role="dialog" aria-label="Was Gäste über ${item.name} schreiben">
        <div class="bild-kopf">
          <div>
            <p class="bild-marke">Aus den Bewertungen</p>
            <h3>${item.name}</h3>
            <p class="bild-grundlage">${(b.anzahl || 0).toLocaleString("de-DE")} Bewertungen, Gesamtnote ${note(b.note || 0)}</p>
          </div>
          <button type="button" class="vorschlag-zu" data-bildzu aria-label="Schließen">✕</button>
        </div>
        ${b.hinweise.length ? `
        <div class="bild-block">
          <h4>Was in den Bewertungen steht, aber nicht in der Beschreibung</h4>
          <ul class="bild-hinweise">
            ${b.hinweise.map((h) => `<li class="${h.art}"><span>${h.text}</span><b>${h.erwaehnungen}×</b></li>`).join("")}
          </ul>
        </div>` : ""}
        ${b.bilanz.length ? `
        <div class="bild-block">
          <h4>Teilnoten</h4>
          <div class="vorschlag-balken">
            ${b.bilanz.slice(0, 7).map((a) => `
              <div class="vorschlag-balken-zeile">
                <span>${a.label}</span>
                <span class="vorschlag-bar"><i style="width:${Math.min(100, Politik.teilnote(a.anteilPositiv) * 10)}%"></i></span>
                <b>${note(Politik.teilnote(a.anteilPositiv))}</b>
              </div>`).join("")}
          </div>
        </div>` : ""}
        ${b.stimmen.length ? `
        <div class="bild-block">
          <h4>Stimmen im Wortlaut</h4>
          ${b.stimmen.map((s) => `
            <blockquote class="bild-stimme ${s.art}">
              <p>${s.text}</p>
              <cite>${s.autor}, ${s.note} von 5</cite>
            </blockquote>`).join("")}
        </div>` : ""}
      </div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("da"));
    const zu = () => {
      kern.notieren("bewertungsbild_zu", { id: kand.id, partner: !!kand.partner });
      el.remove();
    };
    el.querySelector("[data-bildzu]").addEventListener("click", (e) => { e.stopPropagation(); zu(); });
    el.addEventListener("click", (e) => { if (e.target === el) zu(); });
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
      /* Kein Schnipsel fuer etwas, das schon als Link dasteht.
         ----------------------------------------------------------------
         "Zeig die Vorschlaege nochmal" stand hier, obwohl im Chat
         darueber ein Knopf genau dafuer liegt. Der Nutzer am 27.09.2026:
         "Das macht keinen Sinn, wenn es diesen Link gibt." Ein Schnipsel
         ist dafuer da, etwas anzubieten, worauf man sonst nicht kommt -
         hier also: die Auswahl verwerfen oder sie erklaert bekommen. */
      kern.lauf.chips = ["Such mir andere raus", "Worin unterscheiden sie sich?", "Ich schaue selbst weiter"];
      AgentPanel.setSuggestions?.(kern.lauf.chips);
      kern.vorschlaegeMerken?.();
      kern.sichern();
    }
    this.offen = false;
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Vorschlaege };
