// Der sichtbare Mauszeiger des Agenten.
//
// Diese Datei entscheidet darüber, ob der Agent wie eine arbeitende KI wirkt
// oder wie ein Skript, das Zustände umschaltet. Sie kennt die Website nicht -
// sie bekommt ein DOM-Element und faehrt es an. Was angefahren wird, legt
// agent/werkzeuge.js fest.
//
// Grundsatz: Der Zeiger loest echte Ereignisse aus (pointerdown, mousedown,
// mouseup, click) an den tatsaechlichen Koordinaten. Kein element.click() als
// Abkuerzung, sonst laufen Handler ins Leere, die an pointerdown haengen.

const Zeiger = {
  /* --- Stellschrauben ---------------------------------------------------
     Alle Zeiten haengen an `tempo`. Fuer Pilottests laesst sich damit die
     ganze Choreografie beschleunigen, ohne vierzig Zahlen anzufassen.
     Im Experiment wird dieser Wert eingefroren.                          */
  tempo: 1.0,

  el: null,          // der Zeiger selbst
  ring: null,        // Klickring
  x: 0,
  y: 0,
  aktiv: false,      // faehrt gerade eine Aktion
  abbruch: false,    // Nutzer hat uebernommen
  driftId: null,

  /* ==================================================================
     Aufbau
     ================================================================== */

  mount() {
    if (this.el) return;

    const huelle = document.createElement("div");
    huelle.id = "agentZeiger";
    huelle.setAttribute("aria-hidden", "true");
    huelle.innerHTML = `
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path d="M4 2 L4 19 L8.5 14.5 L11.5 21 L14 20 L11 13.5 L18 13.5 Z"
              fill="#0f6e5c" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>
      </svg>
      <span class="agent-zeiger-marke">Agent</span>`;
    document.body.appendChild(huelle);
    this.el = huelle;

    const ring = document.createElement("div");
    ring.id = "agentKlickring";
    ring.setAttribute("aria-hidden", "true");
    document.body.appendChild(ring);
    this.ring = ring;

    // Startposition: der Sitzplatz des Agenten, also unten am Panel. Von dort
    // faehrt er los, wenn er das erste Mal etwas tut.
    const rail = document.getElementById("agentRail");
    const kasten = rail ? rail.getBoundingClientRect() : null;
    this.setzePosition(
      kasten ? kasten.right - 26 : 60,
      kasten ? kasten.bottom - 120 : window.innerHeight - 120,
    );
  },

  // Nach einem Seitenwechsel erscheint der Zeiger dort, wo er vorher stand.
  // Ohne das springt er bei jedem Klick auf "Details ansehen" in die Mitte
  // und der ganze Eindruck ist zerstoert.
  wiederherstellen(pos) {
    this.mount();
    if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
      this.setzePosition(pos.x, pos.y);
      this.zeigen();
    }
  },

  position() {
    return { x: this.x, y: this.y };
  },

  setzePosition(x, y) {
    this.x = x;
    this.y = y;
    if (this.el) this.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    if (this.ring) this.ring.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  },

  zeigen() { this.el?.classList.add("sichtbar"); },
  verbergen() { this.el?.classList.remove("sichtbar"); },

  /* ==================================================================
     Zeitliches
     ================================================================== */

  ms(wert) { return wert / this.tempo; },

  warte(dauer) {
    return new Promise((fertig) => setTimeout(fertig, this.ms(dauer)));
  },

  // Streuung um einen Wert, damit nichts im exakten Takt passiert
  streu(mitte, spanne) {
    return mitte + (Math.random() * 2 - 1) * spanne;
  },

  /* ==================================================================
     Bewegung
     ================================================================== */

  // Lineare Bewegung liest sich sofort als Maschine. Deshalb eine leichte
  // Kurve ueber eine quadratische Bezier, dazu Beschleunigen und Abbremsen.
  async bewegeZu(zielX, zielY, { ueberschwingen = true } = {}) {
    this.mount();
    this.zeigen();
    this.driftStoppen();

    const startX = this.x;
    const startY = this.y;
    const dx = zielX - startX;
    const dy = zielY - startY;
    const distanz = Math.hypot(dx, dy);
    if (distanz < 2) return;

    // Kurze Wege schnell, lange spuerbar - aber gedeckelt, sonst wirkt es zaeh
    const dauer = Math.min(900, 160 + distanz * 0.35);

    // Kontrollpunkt seitlich versetzt: senkrecht zur Strecke, Staerke waechst
    // mit der Distanz, Richtung zufaellig. Das ergibt die Kurve.
    const seite = Math.random() < 0.5 ? 1 : -1;
    const bauch = Math.min(distanz * 0.18, 90) * seite;
    const mx = startX + dx / 2 - (dy / distanz) * bauch;
    const my = startY + dy / 2 + (dx / distanz) * bauch;

    // Ueberschwingen: bei langen Wegen ein paar Pixel ueber das Ziel hinaus
    // und zurueck. Das ist der Effekt, der am meisten ausmacht.
    const ueber = ueberschwingen && distanz > 220;
    const uX = ueber ? zielX + (dx / distanz) * this.streu(6, 2) : zielX;
    const uY = ueber ? zielY + (dy / distanz) * this.streu(6, 2) : zielY;

    await this.entlangBezier(startX, startY, mx, my, uX, uY, dauer);
    if (ueber) {
      await this.entlangBezier(uX, uY, uX, uY, zielX, zielY, 130);
    }
  },

  entlangBezier(x0, y0, cx, cy, x1, y1, dauer) {
    const gesamt = this.ms(dauer);

    // In einem Hintergrundtab liefert requestAnimationFrame keine Bilder mehr.
    // Ohne diesen Ausstieg bliebe der Agent stehen, sobald jemand den Tab
    // wechselt - und waere nach der Rueckkehr fuer immer eingefroren.
    if (document.hidden) {
      this.setzePosition(x1, y1);
      return Promise.resolve();
    }

    return new Promise((fertig) => {
      const start = performance.now();
      let beendet = false;
      const abschliessen = () => {
        if (beendet) return;
        beendet = true;
        clearTimeout(notausId);
        fertig();
      };
      // Zweiter Sicherungsgurt: Wird der Tab mitten in der Bewegung versteckt,
      // springt der Zeiger ans Ziel und der Ablauf laeuft weiter.
      const notausId = setTimeout(() => {
        this.setzePosition(x1, y1);
        abschliessen();
      }, gesamt + 1200);

      const schritt = (jetzt) => {
        if (this.abbruch || beendet) return abschliessen();
        const t = Math.min(1, (jetzt - start) / gesamt);
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const g = 1 - e;
        this.setzePosition(
          g * g * x0 + 2 * g * e * cx + e * e * x1,
          g * g * y0 + 2 * g * e * cy + e * e * y1,
        );
        if (t < 1) requestAnimationFrame(schritt); else abschliessen();
      };
      requestAnimationFrame(schritt);
    });
  },

  /* ==================================================================
     Sichtfeld
     ================================================================== */

  imBlick(el) {
    const k = el.getBoundingClientRect();
    return k.top >= 60 && k.bottom <= window.innerHeight - 40;
  },

  // Ein Agent, der auf etwas klickt, das man nicht sieht, zerstoert die
  // Illusion. Also erst scrollen, warten bis es steht, dann anfahren.
  async insBlickfeld(el) {
    if (this.imBlick(el)) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    await this.warteAufScrollende();
  },

  warteAufScrollende() {
    if (document.hidden) return Promise.resolve();
    return new Promise((fertig) => {
      let letzte = window.scrollY;
      let ruhe = 0;
      const pruefen = () => {
        if (this.abbruch) return fertig();
        if (Math.abs(window.scrollY - letzte) < 1) {
          if (++ruhe > 3) return fertig();
        } else {
          ruhe = 0;
        }
        letzte = window.scrollY;
        requestAnimationFrame(pruefen);
      };
      requestAnimationFrame(pruefen);
      setTimeout(fertig, 1200);   // Notausstieg, falls der Scroll haengt
    });
  },

  // Zielpunkt streuen: millimetergenaue Treffer in der Elementmitte wirken
  // maschinell. Plus/minus 15 Prozent der Groesse, aber innerhalb des Rands.
  zielpunkt(el) {
    const k = el.getBoundingClientRect();
    return {
      x: k.left + k.width / 2 + this.streu(0, Math.min(k.width * 0.15, 14)),
      y: k.top + k.height / 2 + this.streu(0, Math.min(k.height * 0.15, 8)),
    };
  },

  /* ==================================================================
     Klicken
     ================================================================== */

  async klicke(el, { hinweis = "" } = {}) {
    if (!el || this.abbruch) return false;
    this.aktiv = true;

    await this.insBlickfeld(el);
    if (this.abbruch) return false;

    const ziel = this.zielpunkt(el);
    await this.bewegeZu(ziel.x, ziel.y);
    if (this.abbruch) return false;

    // Menschen klicken nicht in dem Moment, in dem der Zeiger ankommt
    el.classList.add("agent-hover");
    if (hinweis) this.beschrifte(hinweis);
    await this.warte(this.streu(185, 65));
    if (this.abbruch) { el.classList.remove("agent-hover"); return false; }

    this.klickringZeigen();
    this.el.classList.add("drueckt");
    await this.warte(70);

    this.echterKlick(el, ziel.x, ziel.y);

    await this.warte(90);
    this.el.classList.remove("drueckt");
    el.classList.remove("agent-hover");
    this.beschrifte("");
    this.aktiv = false;
    return true;
  },

  // Die volle Ereigniskette an den echten Koordinaten. element.click() wuerde
  // Handler ueberspringen, die an pointerdown oder mousedown haengen.
  echterKlick(el, x, y) {
    const gemeinsam = {
      bubbles: true, cancelable: true, composed: true,
      clientX: x, clientY: y, view: window, button: 0,
    };
    el.dispatchEvent(new PointerEvent("pointerdown", { ...gemeinsam, pointerType: "mouse", isPrimary: true }));
    el.dispatchEvent(new MouseEvent("mousedown", gemeinsam));
    el.dispatchEvent(new PointerEvent("pointerup", { ...gemeinsam, pointerType: "mouse", isPrimary: true }));
    el.dispatchEvent(new MouseEvent("mouseup", gemeinsam));
    el.dispatchEvent(new MouseEvent("click", gemeinsam));
  },

  klickringZeigen() {
    if (!this.ring) return;
    this.ring.classList.remove("puls");
    void this.ring.offsetWidth;        // Neustart der Animation erzwingen
    this.ring.classList.add("puls");
  },

  /* ==================================================================
     Tippen
     ================================================================== */

  async tippe(el, text, { hinweis = "" } = {}) {
    if (!el || this.abbruch) return false;
    this.aktiv = true;

    await this.insBlickfeld(el);
    const ziel = this.zielpunkt(el);
    await this.bewegeZu(ziel.x, ziel.y);
    if (this.abbruch) return false;

    if (hinweis) this.beschrifte(hinweis);
    this.klickringZeigen();
    this.echterKlick(el, ziel.x, ziel.y);
    el.focus();
    await this.warte(160);

    el.value = "";
    for (const zeichen of String(text)) {
      if (this.abbruch) break;
      el.value += zeichen;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      await this.warte(this.streu(80, 26));
    }
    el.dispatchEvent(new Event("change", { bubbles: true }));

    this.beschrifte("");
    this.aktiv = false;
    return true;
  },

  // Datumsfelder und Auswahlfelder werden nicht Zeichen fuer Zeichen bedient -
  // das entspricht auch im Browser nicht der Wirklichkeit.
  async setzeWert(el, wert, { hinweis = "" } = {}) {
    if (!el || this.abbruch) return false;
    this.aktiv = true;

    await this.insBlickfeld(el);
    const ziel = this.zielpunkt(el);
    await this.bewegeZu(ziel.x, ziel.y);
    if (this.abbruch) return false;

    if (hinweis) this.beschrifte(hinweis);
    el.classList.add("agent-hover");
    await this.warte(this.streu(190, 60));

    this.klickringZeigen();
    el.value = wert;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));

    await this.warte(120);
    el.classList.remove("agent-hover");
    this.beschrifte("");
    this.aktiv = false;
    return true;
  },

  /* ==================================================================
     Lesen
     ================================================================== */

  // Der Agent "liest" einen Bereich: hinfahren, kurz verweilen, den Bereich
  // hervorheben. Ohne diese Geste wirken Aussagen ueber Bewertungen, als
  // kaemen sie aus dem Nichts.
  async lies(el, { dauer = 900, hinweis = "" } = {}) {
    if (!el || this.abbruch) return false;
    this.aktiv = true;

    await this.insBlickfeld(el);
    const k = el.getBoundingClientRect();
    await this.bewegeZu(k.left + Math.min(k.width * 0.3, 120), k.top + 26);
    if (this.abbruch) return false;

    el.classList.add("agent-liest");
    if (hinweis) this.beschrifte(hinweis);
    await this.warte(dauer);
    el.classList.remove("agent-liest");
    this.beschrifte("");
    this.aktiv = false;
    return true;
  },

  /* ==================================================================
     Beschriftung und Denkpause
     ================================================================== */

  // Kurzer Text neben dem Zeiger: "setze Filter", "oeffne Vale Dourado".
  // Macht jede Aktion nachvollziehbar, auch wenn man das Panel nicht liest.
  beschrifte(text) {
    const marke = this.el?.querySelector(".agent-zeiger-marke");
    if (marke) marke.textContent = text || "Agent";
  },

  // Ein vollkommen stillstehender Zeiger wirkt eingefroren. Waehrend auf das
  // Modell gewartet wird, driftet er minimal.
  denkt(an = true) {
    this.mount();
    this.el.classList.toggle("denkt", an);
    if (an) {
      this.zeigen();
      if (this.driftId) return;
      const heimX = this.x;
      const heimY = this.y;
      const start = performance.now();
      const schritt = (jetzt) => {
        if (!this.el?.classList.contains("denkt")) return this.driftStoppen();
        const t = (jetzt - start) / 1000;
        this.setzePosition(
          heimX + Math.sin(t * 0.9) * 2.5,
          heimY + Math.cos(t * 0.7) * 2.0,
        );
        this.driftId = requestAnimationFrame(schritt);
      };
      this.driftId = requestAnimationFrame(schritt);
    } else {
      this.driftStoppen();
    }
  },

  driftStoppen() {
    if (this.driftId) cancelAnimationFrame(this.driftId);
    this.driftId = null;
    this.el?.classList.remove("denkt");
  },

  /* ==================================================================
     Uebernahme durch die teilnehmende Person
     ================================================================== */

  // Haelt die laufende Aktion an. Wird von der Uebernahme-Sperre gerufen.
  anhalten() {
    this.abbruch = true;
    this.aktiv = false;
    this.driftStoppen();
    document.querySelectorAll(".agent-hover, .agent-liest")
      .forEach((el) => el.classList.remove("agent-hover", "agent-liest"));
    this.beschrifte("");
  },

  freigeben() {
    this.abbruch = false;
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Zeiger };
