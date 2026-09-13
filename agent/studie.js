/* Studienablauf
   ====================================================================
   Was eine teilnehmende Person von Anfang bis Ende durchlaeuft:

     hinweis        Teilnahmehinweis, Einwilligung        (start.js)
     konto          Voyara-Konto: Name und Mail
     aufgabe        Aufgabe 1 lesen
     (cookie)       Freigabe waehlen - nur vor Aufgabe 1 (start.js)
     arbeitet       die Seite benutzen, mit oder ohne Agent
     zwischenfragen kurze Fragen zu dieser Aufgabe
     aufgabe        Aufgabe 2 lesen, Seite und Agent neu
     arbeitet
     zwischenfragen
     fragebogen     der allgemeine Fragebogen
     aufloesung     was untersucht wurde, Verlosung
     fertig

   Warum ein eigenes Modul
   -------------------------------------------------------------------
   Der Agentenkern (kern.js) weiss, wie man sucht und bucht. Er weiss
   nicht, dass es eine Studie gibt. Das soll so bleiben: Der Kern
   verhaelt sich in beiden Aufgaben gleich, und was die Studie um ihn
   herum baut - Aufgaben, Fragen, Messung, Datenversand -, steht hier.
   Wer den Agenten ohne Studie zeigen will, laesst diese Datei weg.

   Was gemessen wird, ohne dass jemand etwas berichtet
   -------------------------------------------------------------------
   Neben dem, was der Kern selbst protokolliert (Freigabe, Nachfragen,
   Suchschritte), kommen hier dazu: Einfuegen im Chat (Delegation oder
   Diktat?), Klicks auf Ergebnisse ausserhalb der Shortlist (Kontrolle
   trotz Agent), Verweildauer auf Detailseiten (Pruefen oder
   Durchwinken?), die Guete der Buchung gegen die objektiv beste Option
   (in Euro und Rang), und was von der Aufgabe im Gespraech ankam.

   Datenschutz
   -------------------------------------------------------------------
   Die Studiendaten tragen eine zufaellige Teilnehmer-Nummer und keinen
   Namen. Name und Mail aus dem Konto bleiben im Browser; die Mail geht
   ein einziges Mal getrennt in die Verlosungsliste, ohne die Nummer.
   Beides ist im Einstieg so gesagt und hier so gebaut.
   ================================================================== */

const Studie = {
  SCHLUESSEL: "voyara_studie",
  PFAD_DATEN: "/api/daten",
  daten: null,
  kern: null,

  /* ==================================================================
     Gedaechtnis
     ================================================================== */

  leer() {
    // Reihenfolge der Aufgaben ausgelost und festgehalten - der
    // Reihenfolgeeffekt laesst sich damit als Kontrollvariable pruefen
    const reihenfolge = Math.random() < 0.5 ? ["familie", "paar"] : ["paar", "familie"];
    return {
      teilnehmerId: "t_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      erstellt: Date.now(),
      phase: "hinweis",
      konto: null,
      reihenfolge,
      aktuelle: 0,                // Index in reihenfolge
      durchlaeufe: [],            // je Aufgabe ein Eintrag, siehe durchlaufAnlegen
      einstieg: {},               // hinweisSekunden, Freigabemessung
      fragebogen: null,
      ereignisse: [],             // Messpunkte ausserhalb des Kerns
      gesendet: {},               // welche Sicherungspunkte beim Server angekommen sind
    };
  },

  laden() {
    try {
      const roh = sessionStorage.getItem(this.SCHLUESSEL);
      this.daten = roh ? JSON.parse(roh) : this.leer();
    } catch { this.daten = this.leer(); }
    if (!this.daten.phase) this.daten = this.leer();
    return this.daten;
  },

  sichern() {
    try { sessionStorage.setItem(this.SCHLUESSEL, JSON.stringify(this.daten)); } catch { /* egal */ }
  },

  aktiv() { return !!this.daten && this.daten.phase !== "fertig"; },
  laeuft() { return this.daten?.phase === "arbeitet"; },

  notieren(ereignis, extra = {}) {
    if (!this.daten) return;
    this.daten.ereignisse.push({ t: Date.now(), ereignis, aufgabe: this.aufgabe()?.id || null, ...extra });
    this.sichern();
  },

  aufgabe() {
    if (!this.daten || typeof Aufgaben === "undefined") return null;
    return Aufgaben.nach(this.daten.reihenfolge[this.daten.aktuelle]);
  },

  durchlauf() {
    return this.daten?.durchlaeufe[this.daten.aktuelle] || null;
  },

  durchlaufAnlegen() {
    const a = this.aufgabe();
    this.daten.durchlaeufe[this.daten.aktuelle] = {
      aufgabe: a.id,
      nummer: this.daten.aktuelle + 1,
      gestartet: Date.now(),
      beendet: null,
      grund: null,                // gebucht | abgebrochen
      buchung: null,              // { id, gesamt, naechte, autonom }
      bewertung: null,            // Aufgaben.bewerten(...)
      uebergeben: null,           // Aufgaben.uebergeben(...)
      protokoll: [],              // Kopie des Kern-Protokolls am Ende
      verlauf: [],                // Kopie des Chatverlaufs am Ende
      zwischenfragen: null,
      freigabeStart: this.kern?.lauf?.freigabe || null,
      freigabeEnde: null,
    };
    this.sichern();
  },

  /* ==================================================================
     Start auf jeder Seite
     ------------------------------------------------------------------
     Wird vom Kern aufgerufen, sobald sein Lauf geladen ist. Zeigt den
     Bildschirm, der zur Phase gehoert, und gibt zurueck, ob die Seite
     dahinter gerade gesperrt ist.
     ================================================================== */

  start(kern) {
    this.kern = kern;
    this.laden();
    this.messungenAnbinden();
    this.ausstehendesSenden();

    switch (this.daten.phase) {
      case "hinweis":
        Startbildschirm.hinweisZeigen((messung) => {
          this.daten.einstieg.hinweisSekunden = messung.hinweisSekunden;
          this.phaseSetzen("konto");
          this.kontoZeigen();
        });
        return true;
      case "konto":
        this.kontoZeigen();
        return true;
      case "aufgabe":
        this.aufgabeZeigen();
        return true;
      case "arbeitet":
        this.reiterZeigen();
        // Vor der ersten Aufgabe kommt die Einwilligung mit der
        // Freigabewahl. Vor der zweiten nicht mehr: Die Stufe steht, und
        // ob sie jemand aendert, ist die Messung.
        if (!this.daten.einstieg.freigabe && this.kern) {
          Startbildschirm.einwilligungZeigen(FREIGABE, (stufe, messung) => {
            this.daten.einstieg.freigabe = { stufe, ...messung };
            const d = this.durchlauf(); if (d) d.freigabeStart = stufe;
            this.kern.freigabeStartSetzen(stufe, { quelle: "startbildschirm", ...messung });
            this.sichern();
            this.senden("start");
          });
          return true;
        }
        return false;
      case "zwischenfragen":
        this.zwischenfragenZeigen();
        return true;
      case "fragebogen":
        this.fragebogenZeigen();
        return true;
      case "aufloesung":
        this.aufloesungZeigen();
        return true;
      default:
        return false;
    }
  },

  phaseSetzen(phase) {
    this.daten.phase = phase;
    this.notieren("phase", { phase });
  },

  /* ==================================================================
     Konto
     ================================================================== */

  kontoZeigen() {
    const el = this.blatt("konto", `
      <p class="einstieg-etikett">Dein Konto</p>
      <h1>Angemeldet bei Voyara</h1>
      <p class="einstieg-vorspann">
        Wie auf jeder Buchungsseite bist du hier angemeldet. Der Assistent nutzt diese
        Angaben, wenn er für dich bucht - so, wie es ein echter Kaufagent mit deinem
        Profil tun würde.
      </p>

      <form class="konto-form" id="kontoForm" novalidate>
        <div class="konto-zeile">
          <label>Vorname<input type="text" name="vorname" autocomplete="given-name" required></label>
          <label>Nachname<input type="text" name="nachname" autocomplete="family-name" required></label>
        </div>
        <label>E-Mail<input type="email" name="mail" autocomplete="email" required placeholder="name@beispiel.de"></label>
        <p class="konto-fehler" hidden></p>
      </form>

      <div class="einstieg-merker">
        <span class="einstieg-merker-symbol">${Startbildschirm.SYMBOL.hinweis}</span>
        <span>
          <strong>Der Name darf erfunden sein.</strong> Er wird nirgends gespeichert und
          verschwindet, sobald du das Fenster schließt. Die E-Mail-Adresse geht
          <strong>nur in die Verlosung</strong> ein: Unter allen, die die Studie
          abschließen, verlosen wir ${STUDIE.gutscheine} Amazon-Gutscheine im Wert von je
          ${STUDIE.gutscheinWert} Euro. Gewinner werden per Mail benachrichtigt, danach wird
          die Liste gelöscht. Sie ist nicht mit deinen Antworten verknüpft, und du bekommst
          keine weitere Post.
        </span>
      </div>

      <div class="einstieg-fuss">
        <button type="submit" form="kontoForm" class="einstieg-knopf">Weiter</button>
      </div>`);

    const form = el.querySelector("#kontoForm");
    const fehler = el.querySelector(".konto-fehler");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const konto = {
        vorname: String(f.get("vorname") || "").trim(),
        nachname: String(f.get("nachname") || "").trim(),
        mail: String(f.get("mail") || "").trim(),
      };
      const mailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(konto.mail);
      if (!konto.vorname || !konto.nachname || !mailOk) {
        fehler.textContent = !mailOk && konto.vorname && konto.nachname
          ? "Die E-Mail-Adresse sieht nicht vollständig aus."
          : "Bitte fülle alle drei Felder aus.";
        fehler.hidden = false;
        return;
      }
      this.daten.konto = konto;
      if (typeof Account !== "undefined") Account.setzen(konto);
      this.notieren("konto", { mailDomain: konto.mail.split("@")[1] || null });
      el.remove();
      document.body.classList.remove("startschirm-offen");
      this.phaseSetzen("aufgabe");
      this.aufgabeZeigen();
    });
    setTimeout(() => form.querySelector("input")?.focus({ preventScroll: true }), 80);
  },

  /* ==================================================================
     Aufgabe
     ================================================================== */

  aufgabeHtml(a, nummer) {
    return `
      <p class="einstieg-etikett">Aufgabe ${nummer} von 2</p>
      <h1>${a.titel}</h1>
      <p class="einstieg-vorspann aufgabe-szene">${a.szene}</p>

      <div class="aufgabe-vorgaben">
        <h3>Eure Vorgaben</h3>
        <ul>${a.vorgaben.map((v) => `<li>${v}</li>`).join("")}</ul>
        <p class="aufgabe-wuensche">${a.wuensche}</p>
      </div>`;
  },

  aufgabeZeigen() {
    const a = this.aufgabe();
    const nummer = this.daten.aktuelle + 1;
    const gezeigt = Date.now();

    const el = this.blatt("aufgabe", `
      ${this.aufgabeHtml(a, nummer)}
      <div class="einstieg-merker">
        <span class="einstieg-merker-symbol">${Startbildschirm.SYMBOL.hinweis}</span>
        <span>
          Such auf Voyara eine Unterkunft, die dazu passt, und buche sie - so, wie du es
          zu Hause tun würdest. Ob du den Assistenten nutzt und wie weit, liegt bei dir.
          Die Aufgabe kannst du jederzeit über den Reiter <strong>"Aufgabe"</strong> am
          rechten Rand wieder öffnen.
        </span>
      </div>
      <div class="einstieg-fuss">
        <button type="button" class="einstieg-knopf" data-weiter>Zur Buchungsseite</button>
      </div>`);

    el.querySelector("[data-weiter]").addEventListener("click", () => {
      this.durchlaufAnlegen();
      this.notieren("aufgabe_gelesen", { sekunden: Math.round((Date.now() - gezeigt) / 1000) });
      this.phaseSetzen("arbeitet");
      this.sichern();

      // Jede Aufgabe beginnt auf der Startseite. Nach der ersten Buchung
      // stuende man sonst noch auf der Bestaetigungsseite der letzten -
      // und die Einwilligung (vor Aufgabe 1) zeigt start() nach dem Laden.
      const aufStartseite = /(^|\/)(index\.html)?$/.test(location.pathname);
      if (!aufStartseite) { location.href = "index.html"; return; }
      el.remove();
      document.body.classList.remove("startschirm-offen");
      this.start(this.kern);
    });
  },

  /* Der Reiter am rechten Rand, ueber den die Aufgabe jederzeit wieder
     zu sehen ist - und ueber den man sie abschliesst, wenn man nicht
     bucht. Ohne diesen zweiten Weg saessen alle fest, die sich gegen
     eine Buchung entscheiden. */
  reiterZeigen() {
    if (document.getElementById("aufgabeReiter")) return;
    const a = this.aufgabe();
    if (!a) return;
    const knopf = document.createElement("button");
    knopf.type = "button";
    knopf.id = "aufgabeReiter";
    knopf.className = "aufgabe-reiter";
    knopf.innerHTML = `<span>Aufgabe ${this.daten.aktuelle + 1}/2</span>`;
    knopf.addEventListener("click", () => this.reiterOeffnen());
    document.body.appendChild(knopf);
  },

  reiterOeffnen() {
    const a = this.aufgabe();
    this.notieren("aufgabe_erneut_geoeffnet");
    const el = document.createElement("div");
    el.className = "aufgabe-fenster";
    el.innerHTML = `
      <div class="aufgabe-fenster-karte" role="dialog" aria-modal="true">
        ${this.aufgabeHtml(a, this.daten.aktuelle + 1)}
        <div class="aufgabe-fenster-fuss">
          <button type="button" class="startschirm-knopf" data-schliessen>Zurück zur Seite</button>
          <button type="button" class="aufgabe-abschliessen" data-abschliessen>Aufgabe ohne Buchung beenden</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.querySelector("[data-schliessen]").addEventListener("click", () => el.remove());
    el.addEventListener("click", (e) => { if (e.target === el) el.remove(); });
    el.querySelector("[data-abschliessen]").addEventListener("click", () => {
      if (!confirm("Die Aufgabe ohne Buchung beenden? Das ist in Ordnung, wenn du nichts Passendes gefunden hast oder nicht buchen möchtest.")) return;
      el.remove();
      this.aufgabeAbschliessen("abgebrochen");
    });
  },

  /* ==================================================================
     Buchung und Abschluss einer Aufgabe
     ================================================================== */

  // Von der Kasse aufgerufen, sobald die Bestaetigung erscheint - egal,
  // ob die Person oder der Agent geklickt hat. Ob der Agent es war,
  // steht im Kern-Protokoll ("gebucht" mit autonom: true).
  buchungBestaetigt({ id, gesamt, naechte }) {
    if (!this.laeuft()) return;
    const d = this.durchlauf();
    if (!d || d.buchung) return;
    // Ob der Agent geklickt hat: Waehrend seines letzten Klicks liegt die
    // Sperrflaeche ueber der Seite. Ob er vorher gefragt hat (Stufe
    // "vorbereiten") oder nicht (Stufe "buchen"), steht im Kern-Protokoll
    // und wird beim Abschluss der Aufgabe nachgetragen.
    const durchAgent = !!document.getElementById("agentSperre");
    d.buchung = { id, gesamt: Math.round(gesamt), naechte, durchAgent, ohneRueckfrage: null, zeit: Date.now() };
    this.notieren("buchung", { id, gesamt: Math.round(gesamt), durchAgent });
    this.sichern();
  },

  aufgabeAbschliessen(grund) {
    const d = this.durchlauf();
    const a = this.aufgabe();
    if (!d || !a) return;
    d.beendet = Date.now();
    d.grund = grund;
    d.freigabeEnde = this.kern?.lauf?.freigabe || null;
    d.protokoll = [...(this.kern?.lauf?.protokoll || [])];
    if (d.buchung) {
      const g = d.protokoll.find((p) => p.ereignis === "gebucht");
      d.buchung.ohneRueckfrage = g ? !!g.autonom : false;
    }
    d.verlauf = (this.kern?.lauf?.verlauf || []).map((n) => ({ rolle: n.rolle, text: n.text, zeit: n.zeit }));
    d.uebergeben = Aufgaben.uebergeben(a, d.verlauf);
    if (d.buchung) d.bewertung = Aufgaben.bewerten(a, d.buchung.id, d.buchung.gesamt);
    this.notieren("aufgabe_beendet", { grund, gebucht: d.buchung?.id || null });
    document.getElementById("aufgabeReiter")?.remove();
    this.phaseSetzen("zwischenfragen");
    this.zwischenfragenZeigen();
  },

  /* ==================================================================
     Zwischenfragen
     ================================================================== */

  zwischenfragenZeigen() {
    const a = this.aufgabe();
    const d = this.durchlauf();
    const nummer = this.daten.aktuelle + 1;
    const ergebnis = d?.buchung
      ? `Du hast <strong>${d.bewertung?.gebuchtName || "eine Unterkunft"}</strong> gebucht.`
      : `Du hast diese Aufgabe ohne Buchung beendet.`;

    const el = this.blatt("fragen", `
      <p class="einstieg-etikett">Aufgabe ${nummer} von 2 · Kurze Fragen</p>
      <h1>Wie war das gerade?</h1>
      <p class="einstieg-vorspann">${ergebnis} Ein paar Fragen dazu, dann geht es weiter.
        <span class="fb-entwurf">Entwurf</span></p>
      <form id="zwischenForm" class="fb-form" novalidate>
        ${Fragebogen.html(ZWISCHENFRAGEN)}
        <p class="konto-fehler" hidden>Bitte beantworte alle Fragen mit Skala.</p>
      </form>
      <div class="einstieg-fuss">
        <button type="submit" form="zwischenForm" class="einstieg-knopf">Weiter</button>
      </div>`);

    el.querySelector("#zwischenForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const form = e.target;
      const { antworten, fehlend } = Fragebogen.lesen(form, ZWISCHENFRAGEN);
      if (fehlend.length) { Fragebogen.markieren(form, fehlend); form.querySelector(".konto-fehler").hidden = false; return; }
      d.zwischenfragen = antworten;
      this.sichern();
      this.senden(`aufgabe${nummer}`);
      el.remove();
      document.body.classList.remove("startschirm-offen");

      if (this.daten.aktuelle < this.daten.reihenfolge.length - 1) {
        this.daten.aktuelle += 1;
        this.phaseSetzen("aufgabe");
        // Neuer Lauf fuer den Agenten: Gespraech und Suche von vorn, die
        // Freigabestufe bleibt, wo die Person sie zuletzt hatte.
        this.kern?.neuerDurchlauf();
        this.aufgabeZeigen();
      } else {
        this.phaseSetzen("fragebogen");
        this.fragebogenZeigen();
      }
    });
  },

  /* ==================================================================
     Fragebogen
     ================================================================== */

  fragebogenZeigen() {
    const alleFragen = FRAGEBOGEN.flatMap((b) => b.fragen);
    const el = this.blatt("fragen fragen-lang", `
      <p class="einstieg-etikett">Zum Schluss</p>
      <h1>Ein paar Fragen zu dir und dem Assistenten</h1>
      <p class="einstieg-vorspann">Etwa fünf Minuten. Es gibt keine richtigen oder falschen
        Antworten. <span class="fb-entwurf">Entwurf</span></p>
      <form id="fragebogenForm" class="fb-form" novalidate>
        ${FRAGEBOGEN.map((b) => `
          <section class="fb-block">
            <h3>${b.titel}</h3>
            ${b.hinweis ? `<p class="fb-hinweis">${b.hinweis}</p>` : ""}
            ${Fragebogen.html(b.fragen)}
          </section>`).join("")}
        <p class="konto-fehler" hidden>Ein paar Fragen sind noch offen - sie sind markiert.</p>
      </form>
      <div class="einstieg-fuss">
        <button type="submit" form="fragebogenForm" class="einstieg-knopf">Absenden</button>
      </div>`);

    el.querySelector("#fragebogenForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const form = e.target;
      const { antworten, fehlend } = Fragebogen.lesen(form, alleFragen);
      if (fehlend.length) { Fragebogen.markieren(form, fehlend); form.querySelector(".konto-fehler").hidden = false; return; }
      this.daten.fragebogen = antworten;
      this.daten.beendet = Date.now();
      this.sichern();
      this.senden("ende");
      this.verlosungEintragen();
      el.remove();
      document.body.classList.remove("startschirm-offen");
      this.phaseSetzen("aufloesung");
      this.aufloesungZeigen();
    });
  },

  /* ==================================================================
     Aufloesung
     ------------------------------------------------------------------
     Was untersucht wurde, in drei Absaetzen. Sobald der eingebaute
     Fehler kommt (Konzept, Abschnitt 17), gehoert hier der Absatz
     dazu, der ihn aufloest - fuer die Personen in der Fehlerbedingung
     ist das nicht optional.
     ================================================================== */

  aufloesungZeigen() {
    const el = this.blatt("aufloesung", `
      <p class="einstieg-etikett">Geschafft</p>
      <h1>Danke fürs Mitmachen.</h1>
      <p class="einstieg-vorspann">
        Hier ist, worum es tatsächlich ging.
      </p>
      <div class="aufloesung-text">
        <p>
          <strong>Untersucht wurde, wie viel Entscheidungsgewalt Menschen einem
          Kaufagenten geben</strong> - und wovon das abhängt. Der Regler "Freigabe" war
          deshalb nicht nur eine Einstellung, sondern die zentrale Messgröße: welche Stufe
          du zu Beginn gewählt hast, ob du sie während der Aufgaben verändert hast, und
          in welchem Moment.
        </p>
        <p>
          Dazu kam, was du dem Assistenten von der Aufgabe erzählt hast, ob du seine
          Vorschläge nachgeprüft hast, und wie gut die gebuchte Unterkunft zu den Vorgaben
          passte. Beide Aufgaben hatten im Katalog genau eine Option, die alle Vorgaben
          erfüllt und die genannten Wünsche am besten trifft. Das war für dich nicht
          erkennbar, und es gab keine falsche Antwort.
        </p>
        <p>
          <strong>Es wurde nichts gebucht</strong>, und die Seite ist ein Nachbau. Die
          Studiendaten tragen nur eine Zufallsnummer. Deine E-Mail-Adresse steht getrennt
          davon in der Verlosungsliste und wird nach der Ziehung gelöscht.
        </p>
        ${STUDIE.kontakt ? `<p>Fragen oder Anmerkungen: <a href="mailto:${STUDIE.kontakt}">${STUDIE.kontakt}</a></p>` : ""}
      </div>
      <div class="einstieg-fuss">
        <button type="button" class="einstieg-knopf" data-fertig>Fenster schließen</button>
      </div>`);

    el.querySelector("[data-fertig]").addEventListener("click", () => {
      this.phaseSetzen("fertig");
      this.sichern();
      el.remove();
      document.body.classList.remove("startschirm-offen");
      document.body.insertAdjacentHTML("beforeend",
        `<div class="studie-fertig">Die Studie ist abgeschlossen. Du kannst dieses Fenster schließen.</div>`);
    });
  },

  /* ==================================================================
     Messungen ausserhalb des Kerns
     ------------------------------------------------------------------
     Einmal je Seitenaufruf angebunden. Alles landet in `ereignisse`
     mit der aktuellen Aufgabe, damit sich die Auswertung je Durchlauf
     trennen laesst.
     ================================================================== */

  messungenAnbinden() {
    if (this.angebunden) return;
    this.angebunden = true;

    // Einfuegen im Chat: Wer die Aufgabe eins zu eins hineinkopiert, hat
    // nicht delegiert, sondern diktiert. Gemessen wird die Laenge und
    // wie viel davon aus dem Aufgabentext stammt.
    document.addEventListener("paste", (e) => {
      if (!this.laeuft()) return;
      const ziel = e.target;
      if (!(ziel instanceof HTMLElement) || ziel.id !== "agentInput") return;
      const text = (e.clipboardData || window.clipboardData)?.getData("text") || "";
      if (!text.trim()) return;
      const a = this.aufgabe();
      const quelle = a ? [a.szene, ...a.vorgaben, a.wuensche].join(" ").toLowerCase() : "";
      const woerter = text.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
      const getroffen = woerter.filter((w) => quelle.includes(w)).length;
      this.notieren("einfuegen", {
        zeichen: text.length,
        woerter: woerter.length,
        ausAufgabe: woerter.length ? Math.round((getroffen / woerter.length) * 100) / 100 : 0,
      });
    }, true);

    // Klicks auf Ergebnisse: Wer trotz Shortlist selbst in andere Haeuser
    // schaut, kontrolliert den Agenten. Wer nur die Shortlist oeffnet,
    // folgt ihm.
    document.addEventListener("click", (e) => {
      if (!this.laeuft()) return;
      const link = e.target.closest?.('a[href*="stay.html"]');
      if (!link) return;
      const id = new URL(link.href, location.href).searchParams.get("id");
      if (!id) return;
      const kandidaten = (this.kern?.lauf?.kandidaten || []).map((k) => k.id);
      this.notieren("detail_geoeffnet", {
        id,
        inShortlist: kandidaten.includes(id),
        shortlistVorhanden: kandidaten.length > 0,
        ueberChat: !!e.target.closest?.("#agentRail, .msg-link"),
      });
    }, true);
  },

  // Von stay.js beim Verlassen der Detailseite aufgerufen
  detailVerlassen(id, sekunden) {
    if (!this.laeuft()) return;
    this.notieren("detail_verweildauer", { id, sekunden });
  },

  /* ==================================================================
     Datenversand
     ------------------------------------------------------------------
     Eine Zeile je Person, an drei Sicherungspunkten ueberschrieben:
     nach der Freigabewahl, nach jeder Aufgabe, nach dem Fragebogen.
     Geht ein Versand schief, bleibt er als ausstehend vermerkt und wird
     beim naechsten Seitenaufruf erneut versucht. Die Kopie im Browser
     bleibt in jedem Fall.
     ================================================================== */

  async senden(punkt) {
    if (!this.daten) return;
    this.daten.gesendet[punkt] = this.daten.gesendet[punkt] || { ok: false, versuche: 0 };
    this.sichern();
    const koerper = { art: "daten", teilnehmerId: this.daten.teilnehmerId, punkt, spalten: this.auswertung(punkt), json: this.daten };
    const ok = await this.post(koerper);
    this.daten.gesendet[punkt] = { ok, versuche: this.daten.gesendet[punkt].versuche + 1, zuletzt: Date.now() };
    this.sichern();
  },

  async ausstehendesSenden() {
    if (!this.daten) return;
    for (const [punkt, stand] of Object.entries(this.daten.gesendet)) {
      if (!stand.ok && stand.versuche < 6) await this.senden(punkt);
    }
  },

  async verlosungEintragen() {
    const mail = this.daten?.konto?.mail;
    if (!mail || this.daten.verlosungEingetragen) return;
    // Bewusst ohne Teilnehmer-Nummer: Die Liste darf sich nicht mit
    // den Studiendaten verbinden lassen.
    const ok = await this.post({ art: "verlosung", mail });
    if (ok) { this.daten.verlosungEingetragen = true; this.sichern(); }
  },

  async post(koerper, versuche = 3) {
    // Ohne Serverfunktion (lokaler Dateiserver) fuer diesen Seitenaufruf
    // gar nicht erst anklopfen - sonst steht die Konsole voller 501er
    if (this.ablageFehlt) return false;
    for (let i = 0; i < versuche; i++) {
      try {
        const r = await fetch(this.PFAD_DATEN, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(koerper), keepalive: true,
        });
        if (r.ok) return true;
        // 404/501: keine Serverfunktion (lokaler Dateiserver) - nicht
        // weiter versuchen, die Daten bleiben im Browser
        if ([404, 405, 501].includes(r.status)) { this.ablageFehlt = true; return false; }
      } catch { /* Netz weg - gleich noch einmal */ }
      await new Promise((f) => setTimeout(f, 800 * (i + 1)));
    }
    return false;
  },

  /* Die flache Sicht auf die Daten: eine Spalte je Kennzahl, damit die
     Tabelle direkt in SPSS oder R geht. Das vollstaendige Protokoll
     haengt als JSON daneben, fuer alles, was hier nicht vorgesehen ist. */
  auswertung(punkt) {
    const d = this.daten;
    const z = (n) => (n == null ? "" : n);
    const spalten = {
      teilnehmerId: d.teilnehmerId,
      erstellt: new Date(d.erstellt).toISOString(),
      aktualisiert: new Date().toISOString(),
      punkt,
      phase: d.phase,
      reihenfolge: d.reihenfolge.join("-"),
      hinweisSekunden: z(d.einstieg.hinweisSekunden),
      freigabeStart: z(d.einstieg.freigabe?.stufe),
      freigabeBedenkzeitMs: z(d.einstieg.freigabe?.bedenkzeitMs),
      freigabeReihenfolge: z(d.einstieg.freigabe?.reihenfolge),
      freigabeErklaerungGeoeffnet: z(d.einstieg.freigabe?.erklaerungGeoeffnet),
    };

    d.durchlaeufe.forEach((r, i) => {
      const p = `a${i + 1}_`;
      const ereignisse = d.ereignisse.filter((e) => e.aufgabe === r.aufgabe);
      const protokoll = r.protokoll || [];
      const zaehle = (liste, name) => liste.filter((e) => e.ereignis === name).length;
      const einfuegen = ereignisse.filter((e) => e.ereignis === "einfuegen");
      const details = ereignisse.filter((e) => e.ereignis === "detail_geoeffnet");
      const verweil = ereignisse.filter((e) => e.ereignis === "detail_verweildauer");
      Object.assign(spalten, {
        [p + "aufgabe"]: r.aufgabe,
        [p + "dauerS"]: r.beendet ? Math.round((r.beendet - r.gestartet) / 1000) : "",
        [p + "grund"]: z(r.grund),
        [p + "freigabeStart"]: z(r.freigabeStart),
        [p + "freigabeEnde"]: z(r.freigabeEnde),
        [p + "freigabeAenderungen"]: zaehle(protokoll, "freigabe"),
        [p + "nachrichten"]: (r.verlauf || []).filter((n) => n.rolle === "user").length,
        [p + "uebergebenAnteil"]: z(r.uebergeben?.anteil),
        [p + "gebucht"]: z(r.buchung?.id),
        [p + "gebuchtGesamt"]: z(r.buchung?.gesamt),
        [p + "gebuchtDurchAgent"]: r.buchung ? (r.buchung.durchAgent ? 1 : 0) : "",
        [p + "gebuchtOhneRueckfrage"]: r.buchung ? (r.buchung.ohneRueckfrage ? 1 : 0) : "",
        [p + "zulaessig"]: r.bewertung ? (r.bewertung.zulaessig ? 1 : 0) : "",
        [p + "verletzt"]: (r.bewertung?.verletzt || []).join("; "),
        [p + "beste"]: z(r.bewertung?.beste),
        [p + "istBeste"]: r.bewertung ? (r.bewertung.istBeste ? 1 : 0) : "",
        [p + "abstandEur"]: z(r.bewertung?.abstandEur),
        [p + "platz"]: z(r.bewertung?.platz),
        [p + "rangGebucht"]: z(r.bewertung?.rangGebucht),
        [p + "rangBeste"]: z(r.bewertung?.rangBeste),
        [p + "warumKlicks"]: zaehle(protokoll, "warum"),
        [p + "gesperrt"]: zaehle(protokoll, "gesperrt"),
        [p + "uebernahmen"]: zaehle(protokoll, "uebernahme"),
        [p + "einfuegen"]: einfuegen.length,
        [p + "einfuegenAusAufgabeMax"]: einfuegen.length ? Math.max(...einfuegen.map((e) => e.ausAufgabe)) : "",
        [p + "detailsGeoeffnet"]: details.length,
        [p + "detailsAusserhalbShortlist"]: details.filter((e) => e.shortlistVorhanden && !e.inShortlist).length,
        [p + "detailSekunden"]: verweil.reduce((s, e) => s + (e.sekunden || 0), 0),
        [p + "aufgabeErneutGeoeffnet"]: zaehle(ereignisse, "aufgabe_erneut_geoeffnet"),
      });
      for (const [k, v] of Object.entries(r.zwischenfragen || {})) spalten[p + k] = z(v);
    });

    for (const [k, v] of Object.entries(d.fragebogen || {})) spalten["f_" + k] = z(v);
    return spalten;
  },

  /* ==================================================================
     Gemeinsamer Rahmen der Bildschirme
     ================================================================== */

  blatt(art, inhalt) {
    document.querySelectorAll(".einstieg").forEach((e) => e.remove());
    const el = document.createElement("div");
    el.className = `einstieg einstieg-${art}`;
    el.innerHTML = `<div class="einstieg-blatt" role="dialog" aria-modal="true" tabindex="-1">${inhalt}</div>`;
    document.body.appendChild(el);
    document.body.classList.add("startschirm-offen");
    el.addEventListener("keydown", (e) => { if (e.key === "Escape") e.stopPropagation(); }, true);
    setTimeout(() => el.querySelector(".einstieg-blatt").focus({ preventScroll: true }), 50);
    return el;
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Studie };
