/* Zugang zum Agenten: Reiter, Einladung, Messung
   ====================================================================
   Aufbau der Erhebung (Konzept, Abschnitt 25): Der Agent ist zu Beginn
   nicht zu sehen. Es gibt nur einen schmalen Reiter am rechten Rand,
   ueber den sich die Schublade aufziehen laesst - so dezent, wie
   Assistenten auf echten Seiten sitzen. Wer ihn bis zu einem Ausloeser
   (erste Detailseite, sonst Zeit) nicht benutzt hat, bekommt einmal
   eine Einladung: "Moechtest du ihn nutzen?" Ja oder Nein.

   Daraus ergeben sich drei Klicks, sauber getrennt:

     Pull            Reiter von selbst geoeffnet, vor der Einladung
     Push            Einladung angenommen (nur die, die nicht von selbst
                     kamen)
     Umentschieden   nach "Nein" spaeter doch den Reiter geoeffnet

   Alles wird ueber die Studie protokolliert (mit Aufgabe), ohne Studie
   ueber den Kern. Der Stand (schon geoeffnet? Einladung gezeigt?) lebt
   im sessionStorage, damit er den Seitenwechsel ueberlebt - die
   Einladung soll je Person genau einmal kommen, nicht auf jeder Seite.
   ================================================================== */

const Zugang = {
  SCHLUESSEL: "voyara_zugang",
  kern: null,
  stand: null,
  maus: null,
  timer: null,

  leer() {
    return {
      start: Date.now(),          // Beginn, ab dem die Zeit fuer die Einladung laeuft
      geoeffnet: null,            // erstes Oeffnen: { t, quelle, art }
      einladung: null,            // { t, ausloeser, position, antwort, antwortT }
      oeffnungen: 0,
    };
  },

  laden() {
    try {
      const roh = sessionStorage.getItem(this.SCHLUESSEL);
      this.stand = roh ? JSON.parse(roh) : this.leer();
    } catch { this.stand = this.leer(); }
    if (!this.stand.start) this.stand = this.leer();
  },

  sichern() {
    try { sessionStorage.setItem(this.SCHLUESSEL, JSON.stringify(this.stand)); } catch { /* egal */ }
  },

  // Beginn der laufenden Aufgabe - von dort zaehlt die Zeit bis zur
  // Einladung. Ohne Studie: seit dem ersten Seitenaufruf.
  aufgabeStart() {
    if (typeof Studie !== "undefined" && Studie.durchlauf?.()) return Studie.durchlauf().gestartet;
    return this.stand.start;
  },

  sekundenSeitAufgabe() {
    return Math.round((Date.now() - this.aufgabeStart()) / 1000);
  },

  melden(ereignis, daten = {}) {
    if (typeof Studie !== "undefined" && Studie.daten) Studie.notieren(ereignis, daten);
    else this.kern?.notieren(ereignis, daten);
  },

  /* ==================================================================
     Anbinden - einmal je Seitenaufruf, vom Kern gerufen
     ================================================================== */

  anbinden(kern) {
    if (this.angebunden) return;
    this.angebunden = true;
    this.kern = kern;
    this.laden();
    if (!document.body.classList.contains("agent-schublade")) return;

    this.reiterBauen();
    document.addEventListener("mousemove", (e) => { this.maus = { x: e.clientX, y: e.clientY }; }, { passive: true });

    // Die Einladung gibt es nur, waehrend eine Aufgabe laeuft - nicht
    // auf dem Studienhinweis, nicht nach dem Ende.
    if (typeof Studie !== "undefined" && Studie.daten && !Studie.laeuft()) return;
    this.einladungPruefen();
  },

  istOffen() { return document.body.classList.contains("agent-open"); },
  jeGeoeffnet() { return !!this.stand?.geoeffnet; },

  /* ==================================================================
     Reiter
     ================================================================== */

  reiterBauen() {
    if (document.getElementById("agentReiter")) return;
    const b = document.createElement("button");
    b.type = "button";
    b.id = "agentReiter";
    b.className = "agent-reiter";
    b.setAttribute("aria-label", "Reise-Assistent öffnen");
    b.innerHTML = `<span class="agent-reiter-pfeil">${typeof ICONS !== "undefined" ? ICONS.chevronLeft : "‹"}</span><span class="agent-reiter-text">Assistent</span>`;
    b.addEventListener("click", () => this.oeffnen("reiter"));
    document.body.appendChild(b);
  },

  neueNachricht() {
    if (this.istOffen()) return;
    document.getElementById("agentReiter")?.classList.add("hat-neues");
  },

  /* ==================================================================
     Oeffnen und Schliessen
     ================================================================== */

  oeffnen(quelle) {
    if (!this.istOffen()) {
      document.body.classList.add("agent-open");
      try { sessionStorage.setItem("voyara_chat_offen", "1"); } catch { /* egal */ }
    }
    this.nachOeffnen(quelle);
  },

  // Von AgentPanel.umschalten gerufen, nachdem die Klasse gesetzt ist
  zustandGemeldet(offen) {
    if (offen) this.nachOeffnen("kopf");
    else this.melden("agent_geschlossen", { sekundenSeitAufgabe: this.sekundenSeitAufgabe() });
  },

  nachOeffnen(quelle) {
    document.getElementById("agentReiter")?.classList.remove("hat-neues");
    document.getElementById("agentEinladung")?.remove();
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (typeof AgentPanel !== "undefined") { AgentPanel.ungelesenLeeren?.(); AgentPanel.ansEnde?.(); }

    const erstes = !this.stand.geoeffnet;
    let art = "erneut";
    if (erstes) {
      if (quelle === "einladung") art = "push";
      else if (this.stand.einladung?.antwort === "nein") art = "umentschieden";
      else art = "pull";
      this.stand.geoeffnet = { t: Date.now(), quelle, art };
    }
    this.stand.oeffnungen += 1;
    this.sichern();
    this.melden("agent_geoeffnet", { quelle, art, erstes, sekundenSeitAufgabe: this.sekundenSeitAufgabe(),
      einladungGezeigt: !!this.stand.einladung });

    // Die erste Nachricht des Agenten ist die Frage nach der Freigabe
    if (this.kern && !this.kern.lauf?.freigabeGewaehlt
      && typeof STELLSCHRAUBEN !== "undefined" && STELLSCHRAUBEN.freigabeFrage === "erstoeffnung") {
      this.kern.freigabeFragen();
    }
  },

  /* ==================================================================
     Einladung
     ================================================================== */

  einladungPruefen() {
    const s = typeof STELLSCHRAUBEN !== "undefined" ? STELLSCHRAUBEN : {};
    if (!s.einladung || s.einladung === "keine") return;
    if (this.stand.einladung || this.stand.geoeffnet) return;

    // Ausloeser nach Verhalten: die erste geoeffnete Detailseite. So
    // stehen alle am selben Punkt der Reise, egal wie schnell sie
    // klicken. Wer keine Detailseite oeffnet, bekommt die Einladung
    // nach Ablauf der Zeit.
    const seite = typeof Werkzeuge !== "undefined" && Werkzeuge.seite ? Werkzeuge.seite() : "";
    if (s.einladungAusloeser === "detail" && seite === "stay") {
      setTimeout(() => this.einladungZeigen("detail"), 900);
      return;
    }
    const rest = (s.einladungSekunden || 75) * 1000 - (Date.now() - this.aufgabeStart());
    this.timer = setTimeout(() => this.einladungZeigen("zeit"), Math.max(1500, rest));
  },

  einladungZeigen(ausloeser) {
    if (this.stand.einladung || this.stand.geoeffnet || this.istOffen()) return;
    if (document.body.classList.contains("startschirm-offen")) {
      // Ein Bildschirm der Studie liegt gerade darueber - spaeter noch einmal
      this.timer = setTimeout(() => this.einladungZeigen(ausloeser), 2000);
      return;
    }
    const s = typeof STELLSCHRAUBEN !== "undefined" ? STELLSCHRAUBEN : {};
    let position = s.einladung || "unten-rechts";
    const seite = typeof Werkzeuge !== "undefined" && Werkzeuge.seite ? Werkzeuge.seite() : "";
    if (position === "liste" && seite !== "results") position = "unten-rechts";
    if (position === "cursor" && !this.maus) position = "unten-rechts";

    const gezeigt = Date.now();
    this.stand.einladung = { t: gezeigt, ausloeser, position, antwort: null, antwortT: null };
    this.sichern();
    this.melden("einladung_gezeigt", { ausloeser, position, sekundenSeitAufgabe: this.sekundenSeitAufgabe(), seite });

    const el = document.createElement("div");
    el.id = "agentEinladung";
    el.className = `einladung einladung-${position}`;
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Reise-Assistent");
    el.innerHTML = `
      <div class="einladung-karte">
        <div class="einladung-kopf">
          <span class="einladung-symbol">${typeof ICONS !== "undefined" ? ICONS.chat : ""}</span>
          <strong>Übrigens: Voyara hat einen Reise-Assistenten.</strong>
        </div>
        <p>Er sucht und vergleicht für dich und kann die Buchung übernehmen. Möchtest du ihn nutzen?</p>
        <div class="einladung-knoepfe">
          <button type="button" class="einladung-ja" data-ja>Ja, gern</button>
          <button type="button" class="einladung-nein" data-nein>Nein, danke</button>
        </div>
      </div>`;

    if (position === "liste") {
      const liste = document.querySelector("#resultList");
      if (liste) liste.prepend(el); else document.body.appendChild(el);
    } else {
      document.body.appendChild(el);
    }

    if (position === "cursor" && this.maus) {
      // Am Zeiger verankert, aber innerhalb des Fensters gehalten
      const karte = el.querySelector(".einladung-karte");
      const b = 340, h = 150;
      const x = Math.min(Math.max(12, this.maus.x + 14), window.innerWidth - b - 12);
      const y = Math.min(Math.max(12, this.maus.y + 14), window.innerHeight - h - 12);
      karte.style.left = `${x}px`;
      karte.style.top = `${y}px`;
    }

    const antworten = (antwort) => {
      this.stand.einladung.antwort = antwort;
      this.stand.einladung.antwortT = Date.now();
      this.sichern();
      this.melden(`einladung_${antwort}`, { bedenkzeitMs: Date.now() - gezeigt, position, ausloeser });
      el.remove();
      if (antwort === "ja") this.oeffnen("einladung");
    };
    el.querySelector("[data-ja]").addEventListener("click", () => antworten("ja"));
    el.querySelector("[data-nein]").addEventListener("click", () => antworten("nein"));
    requestAnimationFrame(() => el.classList.add("sichtbar"));
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Zugang };
