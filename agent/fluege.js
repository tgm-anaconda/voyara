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

const Fluege = {
  offen: false,
  geoeffnet: 0,
  daten: null,

  /* kandidaten: [{ id, flug, preis, partner, dauerText, gepaeck }] */
  zeigen(kandidaten, kern, { kennzeichnung = "etikett", kontext = "", nachWahl = null } = {}) {
    this.schliessen(true);
    if (!kandidaten.length) return;
    this.daten = { kandidaten, kern, kennzeichnung, nachWahl };
    /* Vorausgewaehlt ist der Partnerflug.
       ----------------------------------------------------------------
       Der Nutzer am 02.10.2026: "Wichtig hierbei ist, dass der
       vorausgewaehlte Flug immer der Partnerflug ist." Das ist die
       Manipulation an diesem Produkt - dieselbe Rolle, die beim
       Partnerhaus Platz eins spielt. Alle Verbindungen im Fenster sind
       nach Preis, Stopps und Gepaeck gleichwertig (siehe `flugAuswahl`),
       also wirkt allein die Vorauswahl und ihre Kennzeichnung.

       In der Kontrollbedingung ohne Kennzeichnung gibt es kein
       Partnerobjekt; dann ist nichts vorausgewaehlt, und die Person
       entscheidet ohne jeden Anker. */
    const vorwahl = kandidaten.find((k) => k.partner)?.id || null;
    if (vorwahl && typeof Flug !== "undefined") {
      try { if (!Flug.get().flugId) Flug.set({ flugId: vorwahl }); } catch { /* Seite ohne Flugmodul */ }
    }
    this.geoeffnet = Date.now();
    this.offen = true;

    const el = document.createElement("div");
    el.className = "vorschlag-schirm flug-schirm";
    el.id = "flugSchirm";
    el.innerHTML = `
      <div class="vorschlag-fenster flug-fenster" role="dialog" aria-label="Flüge zur Auswahl">
        <div class="vorschlag-kopf">
          <div>
            <p class="vorschlag-marke">Reise-Assistent</p>
            <h2>Welchen Flug soll ich nehmen?</h2>
            ${kontext ? `<p class="vorschlag-kontext">${kontext}</p>` : ""}
          </div>
          <div class="vorschlag-kopf-rechts">
            <button type="button" class="vorschlag-zu" aria-label="Schließen">✕</button>
          </div>
        </div>
        <div class="flug-liste">${kandidaten.map((k, i) => this.zeile(k, i, kennzeichnung, k.id === vorwahl)).join("")}</div>
        <div class="vorschlag-fuss">
          <p class="vorschlag-hinweis">Alle Preise für Hin- und Rückflug, für alle Reisenden zusammen.</p>
        </div>
      </div>`;
    document.body.appendChild(el);
    document.body.classList.add("vorschlag-offen");
    /* Sichtbar wird das Fenster erst mit der Klasse `da`.
       ----------------------------------------------------------------
       `.vorschlag-schirm` steht in style.css auf `opacity: 0`, und erst
       `.da` blendet es ein - so macht es die Vorschlagsansicht seit jeher
       (agent/vorschlaege.js). Hier fehlte die Zeile: Das Fenster lag mit
       allen drei Verbindungen im Dokument und war unsichtbar. Gemessen am
       02.10.2026 auf der Hausseite - opacity 0 bei offenem Schirm.

       Nicht ueber requestAnimationFrame: Im Hintergrundtab liefert der
       Browser keine Bilder, der Rueckruf kaeme nie, und das Fenster
       bliebe unsichtbar. Das Lesen von offsetHeight erzwingt den Umbruch,
       danach laeuft der Uebergang trotzdem. */
    void el.offsetHeight;
    el.classList.add("da");

    el.querySelectorAll("[data-flug]").forEach((z) =>
      z.addEventListener("click", (e) => {
        if (e.target.closest("[data-info]")) return;
        this.waehlen(z.dataset.flug);
      }));
    el.querySelector(".vorschlag-zu")?.addEventListener("click", () => this.schliessen(false, "knopf"));
    el.querySelectorAll("[data-info]").forEach((b) =>
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const text = b.parentElement.querySelector(".vorschlag-infotext");
        const auf = b.getAttribute("aria-expanded") === "true";
        b.setAttribute("aria-expanded", auf ? "false" : "true");
        if (text) text.hidden = auf;
        if (!auf) kern?.notieren("partner_info_geoeffnet", { wo: "flug", id: b.dataset.info });
      }));

    const partnerId = kandidaten.find((k) => k.partner)?.id || null;
    kern?.notieren("flugauswahl_gezeigt", {
      ids: kandidaten.map((k) => k.id), partner: partnerId, kennzeichnung, anzahl: kandidaten.length,
    });
  },

  /* Die Zeile sieht aus wie eine Flugkarte.
     ------------------------------------------------------------------
     Der Nutzer am 02.10.2026: "Diese Visualisierung, die man aktuell bei
     Fluegen hat, diese Kacheln, wo das von wo zu wo angezeigt wird mit so
     einem Flugzeug - das koennen wir gerne in dieser Vorschau-Ansicht
     nehmen." Dieselbe Darstellung wie in der frueheren Flugliste: Zeit,
     Kennung, Dauer mit Linie, Stopps, dann Gepaeck und Preis. */
  zeile(k, i, kennzeichnung, gewaehlt = false) {
    const f = k.flug;
    const nurKlick = kennzeichnung === "etikett";
    const banner = kennzeichnung === "ohne" || !k.partner ? "" : `
      <div class="vorschlag-banner flug-banner${nurKlick ? " nur-etikett" : ""}">
        <button type="button" class="vorschlag-banner-kopf" data-info="${f.id}" aria-expanded="false"
          aria-label="Partner-Airline - was bedeutet das?">Partner-Airline<span class="vorschlag-info" aria-hidden="true">i</span></button>
        ${nurKlick ? "" : `<span>Voyara erhält für diese Airline eine Provision. Preis und Zeiten stammen aus denselben Daten wie bei allen anderen.</span>`}
        <p class="vorschlag-infotext" hidden>Voyara erhält für Buchungen bei ${f.airline} eine Provision von der Airline. Preis, Zeiten und Gepäck sind davon unberührt: Sie stammen aus denselben Daten wie bei allen anderen Verbindungen. Du kannst jede andere genauso buchen.</p>
      </div>`;
    return `
      <article class="flug-zeile${k.partner && kennzeichnung !== "ohne" ? " ist-partner" : ""}${gewaehlt ? " ist-gewaehlt" : ""}"
        data-flug="${f.id}" role="button" tabindex="0" aria-pressed="${gewaehlt ? "true" : "false"}">
        <div class="flug-kopf">
          <span class="flug-haken" aria-hidden="true"></span>
          <div class="flug-airline">
            <strong>${f.airline}</strong>
            <small>${f.aircraft || ""}</small>
          </div>
          ${banner}
          ${gewaehlt ? `<span class="flug-vorwahl">Vorausgewählt</span>` : ""}
        </div>
        <div class="flug-strecke">
          <div class="flug-punkt"><strong>${f.depart}</strong><span>${f.fromCode}</span></div>
          <div class="flug-linie">
            <span>${f.duration}</span>
            <i></i>
            <small>${f.stops === 0 ? "Direktflug" : `${f.stops} ${f.stops === 1 ? "Stopp" : "Stopps"}`}</small>
          </div>
          <div class="flug-punkt"><strong>${f.arrive}</strong><span>${f.toCode}</span></div>
        </div>
        <div class="flug-fuss">
          <small>${f.from} nach ${f.to} · ${f.baggage || ""}</small>
          <div class="flug-preis">
            <strong>${k.preisText}</strong>
            <small>${k.personenText}</small>
          </div>
        </div>
      </article>`;
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
      id, position: pos + 1, partner: !!gewaehlt?.partner,
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
    this.offen = false;
    if (still) this.daten = null;
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Fluege };
