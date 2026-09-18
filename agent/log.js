/* Agenten-Log
   ====================================================================
   Ein Knopf oben rechts im Kopf der Seite, geschlossen. Dahinter die
   nuechterne Spur dessen, was der Agent tut: Suchmaske, Filter,
   Sortierung, Treffer, Vorschlaege. Der Chat erklaert und fragt; das
   Log zeigt.

   Gemessen wird nicht nur, ob jemand das Log oeffnet, sondern ob er
   es liest: Das Fenster ist bewusst niedrig, so dass man scrollen
   muss, um alles zu sehen. Festgehalten werden Oeffnen, Dauer, die
   tiefste Scrollposition und ob das Ende erreicht wurde. In der
   Bedingung "Offenlegung im Log" steht der Hinweis auf das
   Partnerhaus als letzte Zeile - nur wer bis unten liest, sieht ihn.

   Die Zeilen liegen im Lauf des Kerns (lauf.log) und ueberleben so
   den Seitenwechsel; mit jeder neuen Aufgabe beginnt das Log leer.
   ================================================================== */

const Log = {
  kern: null,
  offenSeit: null,
  scrollMax: 0,
  endeErreicht: false,
  gesehen: 0,        // Zeilen, die beim letzten Schliessen schon da waren

  zeilen() { return this.kern?.lauf?.log || []; },

  anbinden(kern) {
    this.kern = kern;
    if (typeof STELLSCHRAUBEN !== "undefined" && STELLSCHRAUBEN.log === false) return;
    const knopf = document.getElementById("logBtn");
    if (!knopf) return;
    knopf.hidden = false;
    if (!knopf.dataset.verdrahtet) {
      knopf.dataset.verdrahtet = "1";
      knopf.addEventListener("click", (e) => { e.stopPropagation(); this.umschalten(); });
      document.addEventListener("click", (e) => {
        const p = document.getElementById("logPanel");
        if (p && !p.hidden && !e.target.closest("#logPanel, #logBtn")) this.schliessen();
      });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") this.schliessen(); });
    }
    try { this.gesehen = +(sessionStorage.getItem("voyara_log_gesehen") || 0); } catch { this.gesehen = 0; }
    this.abzeichen();
  },

  panel() {
    let p = document.getElementById("logPanel");
    if (p) return p;
    p = document.createElement("div");
    p.id = "logPanel";
    p.className = "log-panel";
    p.hidden = true;
    p.setAttribute("role", "dialog");
    p.setAttribute("aria-label", "Agenten-Log");
    p.innerHTML = `
      <div class="log-kopf">
        <strong>Was der Assistent gemacht hat</strong>
        <button type="button" class="icon-btn" data-schliessen aria-label="Schließen">${typeof ICONS !== "undefined" ? ICONS.close : "×"}</button>
      </div>
      <ol class="log-liste" id="logListe"></ol>`;
    document.body.appendChild(p);
    p.querySelector("[data-schliessen]").addEventListener("click", () => this.schliessen());
    const liste = p.querySelector("#logListe");
    liste.addEventListener("scroll", () => {
      const anteil = liste.scrollHeight > liste.clientHeight
        ? (liste.scrollTop + liste.clientHeight) / liste.scrollHeight : 1;
      if (anteil > this.scrollMax) this.scrollMax = Math.min(1, anteil);
      if (anteil >= 0.98) this.endeErreicht = true;
    }, { passive: true });
    return p;
  },

  zeile(text, art = "schritt") {
    if (!this.kern?.lauf) return;
    (this.kern.lauf.log ||= []).push({ t: Date.now(), text: String(text), art });
    this.kern.sichern?.();
    this.rendern();
    this.abzeichen();
  },

  leeren() {
    if (this.kern?.lauf) this.kern.lauf.log = [];
    this.gesehen = 0;
    try { sessionStorage.setItem("voyara_log_gesehen", "0"); } catch { /* egal */ }
    this.rendern();
    this.abzeichen();
  },

  rendern() {
    const p = document.getElementById("logPanel");
    if (!p || p.hidden) return;
    const liste = p.querySelector("#logListe");
    // Hinweise (Partnerhaus) stehen immer ganz unten, auch wenn danach
    // noch Schritte dazukommen - sie sind das Kleingedruckte des Logs.
    const alle = this.zeilen();
    const zeilen = [...alle.filter((z) => z.art !== "hinweis"), ...alle.filter((z) => z.art === "hinweis")];
    liste.innerHTML = "";
    if (!zeilen.length) {
      const li = document.createElement("li");
      li.className = "log-leer";
      li.textContent = "Noch nichts. Sobald der Assistent arbeitet, steht hier jeder Schritt.";
      liste.appendChild(li);
      return;
    }
    for (const z of zeilen) {
      const li = document.createElement("li");
      li.className = `log-zeile log-${z.art}`;
      const zeit = document.createElement("time");
      const d = new Date(z.t);
      zeit.textContent = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
      const text = document.createElement("span");
      text.textContent = z.text;
      li.append(zeit, text);
      liste.appendChild(li);
    }
  },

  // Zaehlblase am Knopf: neue Zeilen seit dem letzten Blick. Ohne sie
  // wuesste niemand, dass sich hinter dem Knopf etwas bewegt.
  abzeichen() {
    const b = document.getElementById("logBadge");
    const knopf = document.getElementById("logBtn");
    if (!b || !knopf) return;
    const p = document.getElementById("logPanel");
    const neu = p && !p.hidden ? 0 : Math.max(0, this.zeilen().length - this.gesehen);
    b.hidden = neu === 0;
    b.textContent = neu > 9 ? "9+" : String(neu);
    knopf.classList.toggle("hat-neues", neu > 0);
  },

  umschalten() {
    const p = this.panel();
    if (p.hidden) this.oeffnen(); else this.schliessen();
  },

  oeffnen() {
    const p = this.panel();
    p.hidden = false;
    const knopf = document.getElementById("logBtn");
    knopf?.setAttribute("aria-expanded", "true");
    // Unter dem Knopf ausrichten, rechtsbuendig - nicht am Fensterrand,
    // denn dort liegt die Schublade, wenn sie offen ist.
    if (knopf) {
      const r = knopf.getBoundingClientRect();
      const breite = Math.min(380, window.innerWidth - 24);
      p.style.top = `${Math.round(r.bottom + 6)}px`;
      p.style.left = `${Math.round(Math.max(12, Math.min(r.right - breite, window.innerWidth - breite - 12)))}px`;
      p.style.right = "auto";
    }
    this.offenSeit = Date.now();
    this.scrollMax = 0;
    this.endeErreicht = false;
    this.rendern();
    const liste = p.querySelector("#logListe");
    liste.scrollTop = 0;
    // Passt alles ohne Scrollen hinein, ist das Ende sofort erreicht
    if (liste.scrollHeight <= liste.clientHeight + 2) { this.scrollMax = 1; this.endeErreicht = true; }
    this.kern?.notieren("log_geoeffnet", {
      zeilen: this.zeilen().length,
      scrollNoetig: liste.scrollHeight > liste.clientHeight + 2,
      seite: typeof Werkzeuge !== "undefined" && Werkzeuge.seite ? Werkzeuge.seite() : "",
      phase: this.kern?.lauf?.phase || null,
    });
    this.kern?.sichern?.();
    this.abzeichen();
  },

  schliessen() {
    const p = document.getElementById("logPanel");
    if (!p || p.hidden) return;
    p.hidden = true;
    document.getElementById("logBtn")?.setAttribute("aria-expanded", "false");
    const dauerMs = this.offenSeit ? Date.now() - this.offenSeit : 0;
    this.gesehen = this.zeilen().length;
    try { sessionStorage.setItem("voyara_log_gesehen", String(this.gesehen)); } catch { /* egal */ }
    this.kern?.notieren("log_geschlossen", {
      dauerMs,
      scrollMax: Math.round(this.scrollMax * 100) / 100,
      endeErreicht: this.endeErreicht,
      zeilen: this.zeilen().length,
    });
    this.kern?.sichern?.();
    this.offenSeit = null;
    this.abzeichen();
  },
};

// Beim Verlassen der Seite mit offenem Log: Dauer und Scrolltiefe
// trotzdem festhalten, sonst fehlt genau der Blick, der zaehlt.
window.addEventListener("pagehide", () => { try { Log.schliessen(); } catch { /* egal */ } });

if (typeof module !== "undefined" && module.exports) module.exports = { Log };
