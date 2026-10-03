/* Studienablauf
   ====================================================================
   Was eine teilnehmende Person von Anfang bis Ende durchlaeuft:

     hinweis        Teilnahmehinweis, Einwilligung        (start.js)
     konto          Voyara-Konto: Name und Mail
     aufgabe        Aufgabe 1 lesen
     arbeitet       die Seite benutzen; der Agent ist nur ueber einen
                    Reiter erreichbar (zugang.js), nach dem Ausloeser
                    kommt einmal die Einladung; wer ihn oeffnet, waehlt
                    als Erstes die Freigabe (kern.js, freigabeFragen)
     fragebogen     ein Bogen am Ende, in Abschnitten: erst die Fragen
                    zu dieser Buchung, dann Assistent, Delegation,
                    Kontrollfragen, Erfahrung, Demografie. Bis zum
                    28.09.2026 gab es davor "zwischenfragen" je Aufgabe;
                    mit einer Aufgabe je Person ist das derselbe Moment
     aufloesung     was untersucht wurde (auch das Partnerhaus), Verlosung
     fertig

   Between-Faktor: die Offenlegung des Partnerhauses (etikett | log |
   offen), ausgelost in auslosen(). Alles andere ist fuer alle gleich
   und wird gemessen. Konzept, Abschnitt 25.

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
    /* Wie viele Aufgaben eine Person bekommt.
       ------------------------------------------------------------------
       Bis zum 28.09.2026 zwei. Der Nutzer: "Ich glaube, das waere jetzt
       sowieso erstmal fuer meinen Prof zum ersten Review besser, wenn es
       erstmal nur eine Aufgabe ist."

       Dazu kommt sein eigenes Argument von vorher: Die Kennzeichnung ist
       ein Faktor zwischen Personen, nicht innerhalb. Zwei Durchlaeufe
       derselben Person unter derselben Bedingung liefern kaum eine
       zweite unabhaengige Beobachtung - wer Partnerhaeuser meidet, meidet
       sie auch im zweiten Lauf. Welche der beiden Aufgaben es wird,
       bleibt ausgelost; so sind beide weiter im Umlauf. */
    const alle = Math.random() < 0.5 ? ["familie", "paar"] : ["paar", "familie"];
    const wieViele = Math.max(1, Math.min(2, (typeof STELLSCHRAUBEN !== "undefined" && STELLSCHRAUBEN.aufgaben) || 1));
    /* Freie Aufgabe (Stand 29.09.2026, Stellschraube `aufgabe`).
       ------------------------------------------------------------------
       "frei" heisst: Die Person schreibt sich ihre Aufgabe vor dem ersten
       Kontakt selbst, mit drei Angaben (agent/aufgaben.js, ECKPUNKTE).
       "fest" ist der alte Weg mit den beiden vorgegebenen Aufgaben - er
       bleibt vollstaendig erhalten, damit sich beide Varianten im
       Testlauf vergleichen lassen und nichts verloren geht. */
    const frei = (typeof STELLSCHRAUBEN === "undefined" ? "frei" : STELLSCHRAUBEN.aufgabe || "frei") === "frei";
    const reihenfolge = frei ? ["frei"] : alle.slice(0, wieViele);
    return {
      teilnehmerId: "t_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      erstellt: Date.now(),
      phase: "hinweis",
      konto: null,
      reihenfolge,
      gruppe: this.auslosen(reihenfolge),
      aktuelle: 0,                // Index in reihenfolge
      durchlaeufe: [],            // je Aufgabe ein Eintrag, siehe durchlaufAnlegen
      einstieg: {},               // hinweisSekunden, Freigabemessung
      fragebogen: null,
      eckpunkte: null,            // die drei Angaben der Person (freie Aufgabe)
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

  /* Gruppenzuweisung
     ------------------------------------------------------------------
     Der Between-Faktor ist seit dem 27.09.2026 die KENNZEICHNUNG des
     Hauses auf Platz eins, in drei Stufen, je Person einmal ausgelost:

       ohne     Platz eins traegt keine Kennzeichnung. Die Reihenfolge
                ist dieselbe wie ueberall, das Haus dasselbe - nur steht
                nichts daran. Das ist die Kontrollbedingung: Wie oft
                folgen Menschen der Empfehlung des Agenten, wenn nichts
                sie stoert?
       etikett  Nur das Wort "Partnerhaus". Was es bedeutet, erscheint
                erst auf Klick. Misst, ob schon das Etikett reicht.
       text     Etikett plus Erklaerungssatz, sofort sichtbar. Misst, ob
                die Erklaerung den Effekt verstaerkt.

     Der Aufbau steht und faellt damit, dass Platz eins in allen drei
     Stufen dasselbe Haus ist, naemlich das objektiv bestpassende. Nur
     dann laesst sich eine Verschiebung auf Platz zwei der Kennzeichnung
     zuschreiben und sonst nichts - denn sonst spraeche nichts fuer Platz
     zwei. Deshalb steht `partner` fest auf "beste".

     Die alte Variable `offenlegung` (chip | log | agent) ist damit
     abgeloest. Sie bleibt als Schalter fuer Tests erhalten, wird aber
     nicht mehr ausgelost: Ihre Stufe "agent" haette die Provision
     zusaetzlich im Chat genannt - dann waere in der Stufe "etikett" die
     Erklaerung doch angekommen, und der Klick haette nichts mehr
     gemessen. */
  auslosen(reihenfolge) {
    const s = typeof STELLSCHRAUBEN !== "undefined" ? STELLSCHRAUBEN : {};
    const stufen = ["ohne", "etikett", "text"];
    const kennzeichnung = stufen.includes(s.kennzeichnung)
      ? s.kennzeichnung : stufen[Math.floor(Math.random() * stufen.length)];
    // Nur noch fuer Tests und alte Links; im Normalfall "log" (still)
    const ALT = ["chip", "log", "agent", "etikett", "offen", "keine"];
    const offenlegung = ALT.includes(s.offenlegung) ? s.offenlegung : "log";
    let partnerBesteIn = null;
    if (s.partner === "beste") partnerBesteIn = "beide";
    else if (s.partner === "zweitbeste") partnerBesteIn = "keine";
    else if (s.partner === "keine") partnerBesteIn = "ohne";
    else partnerBesteIn = reihenfolge[Math.floor(Math.random() * reihenfolge.length)];
    return { kennzeichnung, offenlegung, partnerBesteIn, einladung: s.einladung || null, ausgelost: Date.now() };
  },

  gruppe() {
    if (!this.daten) this.laden();
    if (!this.daten.gruppe) { this.daten.gruppe = this.auslosen(this.daten.reihenfolge); this.sichern(); }
    return this.daten.gruppe;
  },

  // Das Partnerhaus der laufenden Aufgabe: die beste oder die zweitbeste
  // zulaessige Option, je nach Auslosung. Null, wenn keins vorgesehen ist.
  // Das Partnerhaus der laufenden Aufgabe, bezogen auf das, was der Agent
  // gerade gefunden hat (ids): das beste oder zweitbeste zulaessige Haus
  // darunter. Ohne ids: ueber den ganzen Katalog.
  partnerhaus(ids = null, reihenfolge = null) {
    const a = this.aufgabe();
    if (!a || typeof Aufgaben === "undefined") return null;
    const g = this.gruppe();
    if (g.partnerBesteIn === "ohne") return null;
    const beste = g.partnerBesteIn === "beide" || g.partnerBesteIn === a.id;
    if (ids) return Aufgaben.partnerAus(a, ids, beste ? "beste" : "zweitbeste", reihenfolge);
    const zulaessige = Aufgaben.zulaessige(a);
    if (zulaessige.length < 2) return null;
    const wahl = beste ? zulaessige[0] : zulaessige[1];
    return { id: wahl.id, name: wahl.name, rang: beste ? "beste" : "zweitbeste" };
  },

  /* Die Partner-Airline.
     ------------------------------------------------------------------
     Dasselbe Verfahren wie beim Partnerhaus, nur auf der Rangfolge der
     Fluege: Die Gruppe entscheidet, ob die beste oder die zweitbeste
     Verbindung gekennzeichnet wird, und die Kennzeichnungsform
     (ohne/etikett/text) ist dieselbe wie beim Haus. Wer beim Haus das
     Etikett sieht, sieht es auch hier - sonst waeren es zwei Versuche
     statt einer Replikation.

     "Beste" heisst hier, was `flugAuswahl` nach oben sortiert hat: erst
     direkt, dann guenstig. Das Partnerobjekt ist damit eine plausible
     Wahl, genau wie beim Haus - gemessen wird die Kennzeichnung, nicht
     ob jemand einen Fehlgriff bemerkt. */
  partnerflug(ids = []) {
    if (!Array.isArray(ids) || ids.length < 2) return null;
    const g = this.gruppe();
    if (g.partnerBesteIn === "ohne") return null;
    const a = this.aufgabe();
    const beste = g.partnerBesteIn === "beide" || g.partnerBesteIn === a?.id;
    return ids[beste ? 0 : 1] || null;
  },

  // Vom Kern gerufen, wenn die Person beim ersten Oeffnen die Stufe waehlt
  freigabeGewaehlt(stufe, messung = {}) {
    if (!this.daten) return;
    this.daten.einstieg.freigabe = { stufe, ...messung, aufgabe: this.aufgabe()?.id || null };
    const d = this.durchlauf(); if (d) d.freigabeStart = stufe;
    this.sichern();
    this.senden("start");
  },

  aktiv() { return !!this.daten && this.daten.phase !== "fertig"; },
  laeuft() { return this.daten?.phase === "arbeitet"; },

  notieren(ereignis, extra = {}) {
    if (!this.daten) return;
    this.daten.ereignisse.push({ t: Date.now(), ereignis, aufgabe: this.aufgabe()?.id || null, ...extra });
    this.sichern();
  },

  /* Die Aufgabe dieser Person.
     ------------------------------------------------------------------
     Bei der freien Variante wird sie aus den drei Eckpunkten gebaut und
     gemerkt; solange die noch fehlen, gibt es keine Aufgabe - dann
     zeigt der Ablauf erst den Eckpunkte-Bildschirm. */
  aufgabe() {
    if (this.daten?.reihenfolge?.[this.daten.aktuelle] === "frei") {
      if (this.daten.eckpunkte) {
        if (!this._freieAufgabe) this._freieAufgabe = Aufgaben.ausEckpunkten(this.daten.eckpunkte);
        return this._freieAufgabe;
      }
      /* Ohne Eckpunkte-Bildschirm kommt der Massstab aus dem Gespraech -
         und zwar bei jedem Aufruf neu, weil er mit dem Stand waechst. Vor
         Monat und Gruppe gibt es keinen, und das ist richtig so: Vorher
         kann der Agent auch nichts vorlegen. */
      const p = typeof Kern !== "undefined" ? (Kern.lauf?.profil || null) : null;
      return Aufgaben.ausGespraech(p);
    }
    return this.aufgabeAlt();
  },

  aufgabeAlt() {
    if (!this.daten || typeof Aufgaben === "undefined") return null;
    return Aufgaben.nach(this.daten.reihenfolge[this.daten.aktuelle]);
  },

  durchlauf() {
    return this.daten?.durchlaeufe?.[this.daten.aktuelle] || null;
  },

  durchlaufAnlegen() {
    const a = this.aufgabe();
    this.daten.durchlaeufe[this.daten.aktuelle] = {
      // Ohne Eckpunkte steht der Massstab der freien Aufgabe erst spaeter
      // fest; die Kennung ist trotzdem schon klar
      aufgabe: a?.id || this.daten.reihenfolge[this.daten.aktuelle],
      nummer: this.daten.aktuelle + 1,
      gestartet: Date.now(),
      beendet: null,
      grund: null,                // gebucht | abgebrochen
      buchung: null,              // { id, gesamt, naechte, autonom }
      bewertung: null,            // Aufgaben.bewerten(...)
      uebergeben: null,           // Aufgaben.uebergeben(...)
      protokoll: [],              // Kopie des Kern-Protokolls am Ende
      verlauf: [],                // Kopie des Chatverlaufs am Ende
      zwischenfragen: null,       // bis 28.09.2026 eigener Schritt, jetzt im Bogen
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
        // Die Freigabestufe wird nicht mehr vorab erfragt, sondern als
        // erste Nachricht des Agenten, wenn jemand ihn oeffnet
        // (Kern.freigabeFragen). Wer ihn nie oeffnet, waehlt auch nie -
        // und das ist eine Messung, keine Luecke. Die alte Einwilligung
        // im Cookie-Stil bleibt fuer freigabeFrage = "start" erhalten.
        if (typeof STELLSCHRAUBEN !== "undefined" && STELLSCHRAUBEN.freigabeFrage === "start"
          && !this.daten.einstieg.freigabe && this.kern) {
          Startbildschirm.einwilligungZeigen(FREIGABE, (stufe, messung) => {
            this.daten.einstieg.freigabe = { stufe, ...messung };
            const d = this.durchlauf(); if (d) d.freigabeStart = stufe;
            this.kern.freigabeStartSetzen(stufe, { quelle: "startbildschirm", ...messung });
            this.sichern();
            this.senden("start");
          });
          return true;
        }
        if (!this.daten.gesendet?.start) this.senden("start");
        return false;
      // "zwischenfragen" gab es bis zum 28.09.2026 als eigenen Schritt.
      // Gespeicherte Sitzungen koennen noch darauf stehen, deshalb
      // faellt der Fall in den Bogen.
      case "zwischenfragen":
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
        Wie auf jeder Buchungsseite bist du hier angemeldet. Die Seite trägt diese
        Angaben beim Buchen für dich ein, so wie es dein Profil bei einem echten
        Anbieter tun würde.
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
    /* Die freie Aufgabe ohne Eckpunkte-Bildschirm.
       ----------------------------------------------------------------
       Seit dem 02.10.2026 die Regel: Es gibt keine Angaben, die vorher
       abgefragt wurden, also kann der Reiter auch keine zeigen. Was er
       zeigt, ist die Aufgabe selbst - und die lautet, sich eine Reise zu
       suchen, die man wirklich machen wuerde. */
    const freiOhneKarte = this.daten?.reihenfolge?.[this.daten.aktuelle] === "frei"
      && !this.daten?.eckpunkte;
    if (freiOhneKarte) {
      return `
        <p class="einstieg-etikett">Deine Aufgabe</p>
        <h1>Such dir eine Reise aus</h1>
        <p class="einstieg-vorspann">Keine Vorgaben von uns. Such auf Voyara eine Reise,
          die du dir wirklich vorstellen könntest, und buche sie.</p>
        <div class="aufgabe-vorgaben">
          <ul>
            <li>Wohin, wann, wie lange und mit wem entscheidest du</li>
            <li>Nimm etwas, das du zu Hause auch buchen würdest</li>
            <li>Den Assistenten am rechten Rand kannst du nutzen - musst du aber nicht</li>
          </ul>
        </div>`;
    }
    /* Die freie Aufgabe mit Eckpunkten zeigt, was die Person selbst
       angegeben hat. */
    if (a?.frei) {
      const e = a.eckpunkte || {};
      const mitWem = ECKPUNKTE.mitWem.find((m) => m.id === e.mitWem)?.label || "";
      const budget = ECKPUNKTE.budget.find((b) => b.wert === e.budget)?.label || `bis ${e.budget} €`;
      return `
        <p class="einstieg-etikett">Deine Angaben</p>
        <h1>Deine Reise</h1>
        <p class="einstieg-vorspann">Das hast du dir vorgenommen. Der Assistent kennt es nicht -
          erzähl ihm, was du für richtig hältst.</p>
        <div class="aufgabe-vorgaben">
          <ul>
            <li>${mitWem}, ${a.personen} ${a.personen === 1 ? "Person" : "Personen"}</li>
            <li>${MONATSNAMEN[a.monat - 1]}, etwa ${a.naechte} Nächte</li>
            <li>Unterkunft ${budget}</li>
          </ul>
        </div>`;
    }
    return `
      <p class="einstieg-etikett">${nummer > 1 || (this.daten?.reihenfolge?.length || 1) > 1 ? `Aufgabe ${nummer} von ${this.daten.reihenfolge.length}` : "Deine Aufgabe"}</p>
      <h1>${a.titel}</h1>
      <p class="einstieg-vorspann aufgabe-szene">${a.szene}</p>

      <div class="aufgabe-vorgaben">
        <h3>Eure Vorgaben</h3>
        <ul>${a.vorgaben.map((v) => `<li>${v}</li>`).join("")}</ul>
        <p class="aufgabe-wuensche">${a.wuensche}</p>
      </div>`;
  },

  /* Die drei Eckpunkte, die sich die Person selbst setzt.
     ------------------------------------------------------------------
     Kommt an die Stelle der vorgegebenen Aufgabe (Stellschraube
     `aufgabe: "frei"`). Alles ist anklickbar, nichts muss getippt
     werden. Das Ziel wird ausdruecklich nicht gefragt - das erarbeitet
     der Agent mit der Person, und genau daran soll sich zeigen, wie gut
     er das kann.

     Der Hinweis, dass der Assistent diese Angaben nicht sieht, steht
     bewusst da: Er macht aus der scheinbaren Doppelung (der Bot fragt
     gleich noch einmal) einen verstaendlichen Teil des Aufbaus. */
  eckpunkteZeigen() {
    const gezeigt = Date.now();
    const jetzt = new Date();
    const monate = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(jetzt.getFullYear(), jetzt.getMonth() + 1 + i, 1);
      return { wert: d.getMonth() + 1, label: `${MONATSNAMEN[d.getMonth()]} ${d.getFullYear()}` };
    });
    const knopfreihe = (name, liste) => `<div class="eckpunkt-wahl" data-feld="${name}">
      ${liste.map((o) => `<button type="button" class="eckpunkt-knopf" data-wert="${o.wert}">${o.label}</button>`).join("")}
    </div>`;

    const el = this.blatt("aufgabe eckpunkte", `
      <p class="einstieg-etikett">Bevor es losgeht</p>
      <h1>Was suchst du?</h1>
      <p class="einstieg-vorspann">
        Drei Angaben für uns, damit wir deine Suche später einordnen können.
        <strong>Der Assistent bekommt sie nicht zu sehen</strong> - was du ihm erzählst,
        entscheidest du selbst. Alles andere ist offen: wohin, Hotel oder Ferienwohnung,
        mit oder ohne Flug.
      </p>
      <div class="eckpunkt-block">
        <h3>Mit wem reist du?</h3>
        ${knopfreihe("mitWem", ECKPUNKTE.mitWem.map((m) => ({ wert: m.id, label: m.label })))}
        <div class="eckpunkt-personen" hidden>
          <h3>Wie viele seid ihr insgesamt?</h3>
          ${knopfreihe("personen", [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ wert: n, label: String(n) })))}
        </div>
      </div>
      <div class="eckpunkt-block">
        <h3>Wann etwa?</h3>
        ${knopfreihe("monat", monate.map((m) => ({ wert: m.wert, label: m.label })))}
      </div>
      <div class="eckpunkt-block">
        <h3>Was darf die Unterkunft insgesamt höchstens kosten?</h3>
        ${knopfreihe("budget", ECKPUNKTE.budget.map((b) => ({ wert: b.wert, label: b.label })))}
      </div>
      <p class="konto-fehler" hidden>Bitte beantworte alle drei Fragen.</p>
      <div class="einstieg-fuss">
        <button type="button" class="einstieg-knopf" data-weiter disabled>Weiter</button>
      </div>`);

    const wahl = {};
    const weiter = el.querySelector("[data-weiter]");
    const personenBlock = el.querySelector(".eckpunkt-personen");
    const pruefe = () => { weiter.disabled = !(wahl.mitWem && wahl.personen && wahl.monat && wahl.budget); };
    el.querySelectorAll(".eckpunkt-wahl").forEach((reihe) => {
      const feld = reihe.dataset.feld;
      reihe.addEventListener("click", (e) => {
        const knopf = e.target.closest(".eckpunkt-knopf");
        if (!knopf) return;
        reihe.querySelectorAll(".eckpunkt-knopf").forEach((k) => k.classList.remove("gewaehlt"));
        knopf.classList.add("gewaehlt");
        wahl[feld] = feld === "mitWem" ? knopf.dataset.wert : +knopf.dataset.wert;
        if (feld === "mitWem") {
          /* Die Personenzahl steht nicht fest, nur die Vorauswahl.
             "Mit Familie" kann zu dritt oder zu sechst sein - deshalb
             wird sie immer noch einmal geklickt, mit einer sinnvollen
             Vorbelegung. Dieselbe Lehre wie beim Chip "4 oder mehr":
             eine Zahl, die niemand bestaetigt hat, ist keine Angabe. */
          personenBlock.hidden = false;
          const vor = ECKPUNKTE.mitWem.find((m) => m.id === wahl.mitWem)?.personen || 2;
          if (!wahl.personen) {
            const k = personenBlock.querySelector(`.eckpunkt-knopf[data-wert="${vor}"]`);
            if (k) { k.click(); }
          }
        }
        pruefe();
      });
    });

    weiter.addEventListener("click", () => {
      if (weiter.disabled) return;
      this.daten.eckpunkte = { ...wahl, naechte: 7, sekunden: Math.round((Date.now() - gezeigt) / 1000) };
      this._freieAufgabe = null;
      this.notieren("eckpunkte_gesetzt", { ...wahl });
      this.sichern();
      el.remove();
      document.body.classList.remove("startschirm-offen");
      this.aufgabeZeigen();
    });
  },

  aufgabeZeigen() {
    /* Freie Aufgabe ohne Eckpunkte: erst die drei Fragen - sofern der
       Bildschirm ueberhaupt noch vorgesehen ist (STELLSCHRAUBEN.eckpunkte). */
    if (this.daten?.reihenfolge?.[this.daten.aktuelle] === "frei" && !this.daten.eckpunkte
      && typeof STELLSCHRAUBEN !== "undefined" && STELLSCHRAUBEN.eckpunkte) {
      this.eckpunkteZeigen();
      return;
    }
    const a = this.aufgabe();
    const nummer = this.daten.aktuelle + 1;
    const gezeigt = Date.now();

    const el = this.blatt("aufgabe", `
      ${this.aufgabeHtml(a, nummer)}
      <div class="einstieg-merker">
        <span class="einstieg-merker-symbol">${Startbildschirm.SYMBOL.hinweis}</span>
        <span>
          Such auf Voyara eine Unterkunft, die dazu passt, und buche sie - so, wie du es
          zu Hause tun würdest. Es gibt kein Zeitlimit; schau dich in Ruhe um. Die
          Aufgabe kannst du jederzeit über den Reiter <strong>"Aufgabe"</strong> am
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

      // Jede Aufgabe beginnt mit geschlossener Schublade, wie ein neuer
      // Besuch der Seite. Ob jemand den Assistenten in Aufgabe 2 wieder
      // aufzieht, ist die Wiederverwendung - und die braucht einen Klick.
      try { sessionStorage.setItem("voyara_chat_offen", "0"); } catch { /* egal */ }
      document.body.classList.remove("agent-open");

      // Jede Aufgabe beginnt auf der Startseite. Nach der ersten Buchung
      // stuende man sonst noch auf der Bestaetigungsseite der letzten -
      // und die Einwilligung (vor Aufgabe 1) zeigt start() nach dem Laden.
      const aufStartseite = /(^|\/)(index\.html)?$/.test(location.pathname);
      if (!aufStartseite) { location.href = "index.html"; return; }
      el.remove();
      document.body.classList.remove("startschirm-offen");
      this.start(this.kern);
      // Ohne Seitenwechsel muss die Uhr fuer die Einladung hier gestellt
      // werden - beim Laden der Seite lief noch keine Aufgabe.
      if (typeof Zugang !== "undefined" && Zugang.stand) Zugang.einladungPruefen();
    });
  },

  /* Der Reiter am rechten Rand, ueber den die Aufgabe jederzeit wieder
     zu sehen ist - und ueber den man sie abschliesst, wenn man nicht
     bucht. Ohne diesen zweiten Weg saessen alle fest, die sich gegen
     eine Buchung entscheiden. */
  reiterZeigen() {
    if (document.getElementById("aufgabeReiter")) return;
    const a = this.aufgabe();
    /* Bei der freien Aufgabe ohne Eckpunkte gibt es den Massstab erst,
       wenn Monat und Gruppe im Gespraech stehen. Der Reiter muss trotzdem
       da sein: Ueber ihn beendet man die Aufgabe, wenn man nicht bucht. */
    const freiOhneKarte = this.daten?.reihenfolge?.[this.daten.aktuelle] === "frei"
      && !this.daten?.eckpunkte;
    if (!a && !freiOhneKarte) return;
    const knopf = document.createElement("button");
    knopf.type = "button";
    knopf.id = "aufgabeReiter";
    knopf.className = "aufgabe-reiter";
    // Bei nur einer Aufgabe waere "1/1" eine Zaehlung ohne Sinn
    knopf.innerHTML = this.daten.reihenfolge.length > 1
      ? `<span>Aufgabe ${this.daten.aktuelle + 1}/${this.daten.reihenfolge.length}</span>`
      : `<span>Aufgabe</span>`;
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
  buchungBestaetigt({ id, gesamt, naechte, flug = null }) {
    // Frueher stand hier eine Phasenpruefung. In einem Testlauf am
    // 22.09.2026 war die Buchung auf der Seite abgeschlossen, in den
    // Studiendaten aber nicht - die Hauptmessgroesse fehlte. Warum die
    // Pruefung griff, liess sich nicht rekonstruieren; da sie nichts
    // schuetzt (ohne laufenden Durchlauf gibt es ohnehin kein Ziel),
    // faellt sie weg.
    const d = this.durchlauf();
    if (!d || d.buchung) return;
    // Ob der Agent geklickt hat: Waehrend seines letzten Klicks liegt die
    // Sperrflaeche ueber der Seite. Ob er vorher gefragt hat (Stufe
    // "vorbereiten") oder nicht (Stufe "buchen"), steht im Kern-Protokoll
    // und wird beim Abschluss der Aufgabe nachgetragen.
    // Die Sperrflaeche liegt waehrend der Agentenarbeit ueber der Seite; sie
    // ist das eine Indiz. Das Kern-Protokoll ist das andere und zaehlt auch
    // dann, wenn die Sperre schon aufgehoben war.
    const durchAgent = !!document.getElementById("agentSperre")
      || (this.kern?.lauf?.protokoll || []).some((x) => x.ereignis === "gebucht" && Date.now() - x.t < 15000);
    d.buchung = { id, gesamt: Math.round(gesamt), naechte, durchAgent, ohneRueckfrage: null, zeit: Date.now(), flug: flug || null };
    this.notieren("buchung", { id, gesamt: Math.round(gesamt), durchAgent });
    this.sichern();
  },

  aufgabeAbschliessen(grund) {
    const d = this.durchlauf();
    const a = this.aufgabe();
    /* Ohne Aufgabe wurde der Durchlauf frueher gar nicht beendet. Bei der
       freien Variante ohne Eckpunkte kann der Massstab aber fehlen (wer
       weder den Agenten benutzt noch die Maske anfasst), und dann waere
       die Buchung verloren. Erfasst wird sie trotzdem; nur die Bewertung
       dagegen faellt aus, und das steht so in den Daten. */
    if (!d || d.beendet) return;
    if (!a) this.notieren("aufgabe_ohne_massstab", { grund });
    // Zweiter Netzanschluss: Wurde gebucht, aber nichts erfasst, wird die
    // Buchung hier aus der Seite nachgetragen, statt sie zu verlieren.
    // Nachgetragen wird nur, wenn die Bestaetigungsseite wirklich dasteht.
    // Ohne diese Pruefung trug der Notnagel am 23.09.2026 eine Buchung
    // nach, die es nie gab - der Agent hatte nur die Pruefseite gefuellt.
    // Eine erfundene Buchung ist schlimmer als eine fehlende.
    const bestaetigt = !document.getElementById("confirmBtn")
      && /bestätigt|buchungsnummer/i.test(document.getElementById("checkoutMain")?.innerText || "");
    if (grund === "gebucht" && !d.buchung && bestaetigt && typeof Werkzeuge !== "undefined") {
      const id = new URLSearchParams(location.search).get("id");
      const z = Werkzeuge.buchungsZusammenfassung?.();
      const zahl = z?.gesamt ? parseInt(String(z.gesamt).replace(/[^\d]/g, ""), 10) : null;
      if (id) {
        // Wer geklickt hat, weiss das Kern-Protokoll sicherer als die
        // Sperrflaeche, die zum Zeitpunkt des Nachtragens schon weg ist
        const eintrag = [...(this.kern?.lauf?.protokoll || [])].reverse().find((x) => x.ereignis === "gebucht");
        d.buchung = { id, gesamt: zahl || 0, naechte: parseInt(new URLSearchParams(location.search).get("nights"), 10) || null,
          durchAgent: !!eintrag, ohneRueckfrage: eintrag ? !!eintrag.autonom : null, zeit: Date.now(), flug: null, nachgetragen: true };
        this.notieren("buchung_nachgetragen", { id, gesamt: d.buchung.gesamt });
      }
    }
    d.beendet = Date.now();
    // "gebucht" darf nur dranstehen, wenn auch eine Buchung erfasst ist.
    d.grund = grund === "gebucht" && !d.buchung ? "ohne_buchung" : grund;
    d.freigabeEnde = this.kern?.lauf?.freigabe || null;
    d.protokoll = [...(this.kern?.lauf?.protokoll || [])];
    d.weiter = this.kern?.lauf?.profil?.weiter || null;
    if (d.buchung) {
      const g = d.protokoll.find((p) => p.ereignis === "gebucht");
      d.buchung.ohneRueckfrage = g ? !!g.autonom : false;
    }
    d.verlauf = (this.kern?.lauf?.verlauf || []).map((n) => ({ rolle: n.rolle, text: n.text, zeit: n.zeit }));
    d.uebergeben = a ? Aufgaben.uebergeben(a, d.verlauf, this.kern?.lauf?.profil || null) : null;
    if (d.buchung && a) d.bewertung = Aufgaben.bewerten(a, d.buchung.id, d.buchung.gesamt);
    this.notieren("aufgabe_beendet", { grund, gebucht: d.buchung?.id || null });
    document.getElementById("aufgabeReiter")?.remove();

    /* Zwischenstand sichern und abschicken.
       ------------------------------------------------------------------
       Bis zum 28.09.2026 geschah das am Ende der Zwischenfragen. Die
       sind weg (eine Aufgabe je Person, ein Bogen am Ende), der
       Speicherpunkt bleibt: Wer den Fragebogen abbricht, soll uns die
       Aufgabe trotzdem hinterlassen haben. */
    this.sichern();
    this.senden(`aufgabe${this.daten.aktuelle + 1}`);

    if (this.daten.aktuelle < this.daten.reihenfolge.length - 1) {
      this.daten.aktuelle += 1;
      this.phaseSetzen("aufgabe");
      // Neuer Lauf fuer den Agenten: Gespraech und Suche von vorn, die
      // Freigabestufe bleibt, wo die Person sie zuletzt hatte.
      this.kern?.neuerDurchlauf();
      this.aufgabeZeigen();
      return;
    }
    this.phaseSetzen("fragebogen");
    this.fragebogenZeigen();
  },

  /* ==================================================================
     Fragebogen
     ================================================================== */

  fragebogenZeigen() {
    /* Die Abschnitte kommen aus `Fragebogen.bloecke()`, nicht direkt
       aus FRAGEBOGEN: Ein Abschnitt kann eine Bedingung tragen. Nach
       dem Assistenten wird nur gefragt, wenn die Person ihm etwas
       geschrieben hat. */
    const bloecke = Fragebogen.bloecke();
    const alleFragen = bloecke.flatMap((b) => b.fragen);
    const el = this.blatt("fragen fragen-lang", `
      <p class="einstieg-etikett">Zum Schluss</p>
      <h1>Ein paar Fragen zu deiner Buchung und zu dir</h1>
      <p class="einstieg-vorspann">Etwa vier Minuten, ${alleFragen.length} Fragen. Es gibt keine
        richtigen oder falschen Antworten.</p>
      <form id="fragebogenForm" class="fb-form" novalidate>
        ${bloecke.map((b) => `
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
        Zum Schluss, wofür deine Angaben verwendet werden - und ein Punkt, den wir dir
        vorher nicht sagen konnten.
      </p>
      <div class="aufloesung-text">
        <p>
          <strong>Untersucht wurde, wie Menschen mit einem Kaufagenten umgehen, der für
          sie sucht und bucht</strong>: ob sie ihn überhaupt öffnen und wann, wie viel
          sie ihm erlauben, ob sie nachsehen, was er tut, und wie sie mit seinen
          Vorschlägen umgehen.
        </p>
        <p>
          <strong>Ein Punkt war absichtlich gebaut:</strong> Der erste Vorschlag des
          Assistenten war ein "Partnerhaus", für das Voyara angeblich eine Provision
          bekommt. Ob und wie er das zu erkennen gab (ein Etikett, ein Satz, oder nur eine
          Zeile ganz unten im Agenten-Log), war je Person verschieden. Wir wollten wissen,
          welche Form der Offenlegung überhaupt ankommt. Tatsächlich gibt es weder
          Partnerhäuser noch Provisionen; das Haus war in jedem Fall eine gute, zulässige
          Wahl - in einer Aufgabe die beste, in der anderen die zweitbeste.
        </p>
        <p>
          Dazu kam, was du dem Assistenten von der Aufgabe erzählt hast, ob du seine
          Vorschläge nachgeprüft hast, und wie gut die gebuchte Unterkunft zu den Vorgaben
          passte. Beide Aufgaben hatten im Katalog genau eine Option, die alle Vorgaben
          erfüllt und die genannten Wünsche am besten trifft. Es gab keine falsche Antwort.
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
    // Probelauf: der Pruefstand spielt Aufgaben nach, damit Partnerhaus,
    // Vorschlagsansicht und Buchungsweg wirklich durchlaufen werden. In die
    // Erhebungstabelle darf davon nichts.
    if (this.probelauf) { this.daten.gesendet[punkt] = { ok: true, versuche: 0, probelauf: true }; return; }
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
      gruppeOffenlegung: z(d.gruppe?.offenlegung),
      gruppePartnerBesteIn: z(d.gruppe?.partnerBesteIn),
      gruppeEinladung: z(d.gruppe?.einladung),
      freigabeStart: z(d.einstieg.freigabe?.stufe),
      freigabeQuelle: z(d.einstieg.freigabe?.quelle),
      freigabeInAufgabe: z(d.einstieg.freigabe?.aufgabe),
      freigabeBedenkzeitMs: z(d.einstieg.freigabe?.bedenkzeitMs),
      freigabeReihenfolge: z(d.einstieg.freigabe?.reihenfolge),
      freigabeErklaerungGeoeffnet: z(d.einstieg.freigabe?.erklaerungGeoeffnet),
      /* Die drei Eckpunkte der freien Aufgabe. Sie sind der Massstab,
         gegen den die Buchung gemessen wird - und sie standen fest,
         bevor der Agent etwas zeigen konnte. */
      eckMitWem: z(d.eckpunkte?.mitWem),
      eckPersonen: z(d.eckpunkte?.personen),
      eckMonat: z(d.eckpunkte?.monat),
      eckBudget: z(d.eckpunkte?.budget),
      eckSekunden: z(d.eckpunkte?.sekunden),
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
        [p + "gebuchtMitFlug"]: r.buchung ? (r.buchung.flug ? 1 : 0) : "",
        [p + "gebuchtFlugGesamt"]: z(r.buchung?.flug?.gesamt),
        [p + "gebuchtDurchAgent"]: r.buchung ? (r.buchung.durchAgent ? 1 : 0) : "",
        /* Die Zusaetze an der Kasse.
           --------------------------------------------------------------
           Die Reiseruecktrittsversicherung steht vorausgewaehlt da (49
           Euro) und der Agent laesst sie in Ruhe, weil er ueber seine
           Handlungen berichtet und nicht ueber den Zustand des
           Formulars. Ob sie drin bleibt, ist der zweite Sorgfaltswert
           neben der Wahl der Unterkunft - bis zum 28.09.2026 kam er in
           den Studiendaten an, stand aber in keiner Spalte.
           Deutbar wird er erst mit f_versicherungGewohnt weiter unten:
           Wer sie privat immer mitbucht, hat nichts uebersehen. */
        [p + "versicherung"]: r.buchung ? (r.buchung.versicherung ? 1 : 0) : "",
        [p + "zahlungsart"]: z(r.buchung?.zahlung),
        [p + "gepaeckEur"]: z(r.buchung?.gepaeck),
        [p + "kartengebuehrEur"]: z(r.buchung?.kartengebuehr),
        [p + "ankunftzeit"]: z(r.buchung?.ankunft),
        [p + "gebuchtOhneRueckfrage"]: r.buchung ? (r.buchung.ohneRueckfrage ? 1 : 0) : "",
        [p + "zulaessig"]: r.bewertung ? (r.bewertung.zulaessig ? 1 : 0) : "",
        [p + "verletzt"]: (r.bewertung?.verletzt || []).join("; "),
        [p + "beste"]: z(r.bewertung?.beste),
        [p + "istBeste"]: r.bewertung ? (r.bewertung.istBeste ? 1 : 0) : "",
        [p + "ziel"]: z(r.bewertung?.ziel),
        [p + "besteImZiel"]: z(r.bewertung?.besteImZiel),
        [p + "istBesteImZiel"]: r.bewertung ? (r.bewertung.istBesteImZiel ? 1 : 0) : "",
        [p + "platzImZiel"]: z(r.bewertung?.platzImZiel),
        [p + "abstandEur"]: z(r.bewertung?.abstandEur),
        [p + "platz"]: z(r.bewertung?.platz),
        /* Dominanz: gab es eine Unterkunft, die guenstiger UND besser
           bewertet war und dieselben Vorgaben erfuellt hat? Das Guetemass
           der freien Aufgabe, das ohne Wunsch-Rangfolge auskommt. */
        [p + "dominiert"]: z(r.bewertung?.dominiert),
        [p + "dominierendeAnzahl"]: z(r.bewertung?.dominierendeAnzahl),
        [p + "dominanzErspartEur"]: z(r.bewertung?.dominanzErspartEur),
        // Was von den eigenen Eckpunkten beim Agenten angekommen ist
        [p + "uebergebenZeit"]: r.uebergeben?.treffer ? (r.uebergeben.treffer.zeit ? 1 : 0) : "",
        [p + "uebergebenGruppe"]: r.uebergeben?.treffer ? (r.uebergeben.treffer.gruppe ? 1 : 0) : "",
        [p + "uebergebenBudget"]: r.uebergeben?.treffer ? (r.uebergeben.treffer.budget ? 1 : 0) : "",
        [p + "rangGebucht"]: z(r.bewertung?.rangGebucht),
        [p + "rangBeste"]: z(r.bewertung?.rangBeste),
        [p + "warumKlicks"]: zaehle(protokoll, "warum"),
        [p + "gesperrt"]: zaehle(protokoll, "gesperrt"),
        [p + "uebernahmen"]: zaehle(protokoll, "uebernahme"),
        // Fahrplan (seit 20.09.2026): gefragte Themen, Wahl zwischen Top 3
        // und Selbst-Schauen, Korrekturen der Suchmaske
        [p + "themenGefragt"]: protokoll.filter((e) => e.ereignis === "thema_gefragt").map((e) => e.thema).join(","),
        [p + "vorgehen"]: z([...protokoll].reverse().find((e) => e.ereignis === "vorgehen")?.wahl),
        [p + "weiter"]: z(r.weiter),
        [p + "selbstGesucht"]: zaehle(protokoll, "selbst_gesucht"),
        [p + "maskeKorrigiert"]: zaehle(protokoll, "maske_korrigiert"),
        [p + "datumVerworfen"]: zaehle(protokoll, "datum_verworfen"),
        // Vorschlaege (23.09.2026): wie viele die Person haben wollte,
        // ob der Agent die Haeuser vorher sichtbar durchgegangen ist und
        // ob die Auswahl noch einmal geoeffnet wurde
        [p + "anzahlVorschlaege"]: z([...protokoll].reverse().find((e) => e.ereignis === "anzahl_vorschlaege")?.anzahl),
        /* Wie homogen die Vorlage war - die Guete des Reizes.
           --------------------------------------------------------------
           Am 02.10.2026 standen in einer Vorlage ein Haus fuer 14.603
           Euro und fuenf fuer rund 6.000. Dort gab es nichts zu
           entscheiden, und ein Nullbefund haette nichts bedeutet. Seit
           v=367 wird ein Vergleichsset gebaut; diese drei Spalten sagen
           je Teilnahme, wie gut das gelungen ist. Wer sie in der Arbeit
           berichtet, kann den Reiz beschreiben, statt ihn zu behaupten. */
        [p + "setGroesse"]: z([...protokoll].reverse().find((e) => e.ereignis === "vorschlagsset")?.anzahl),
        [p + "setSpanneProzent"]: z([...protokoll].reverse().find((e) => e.ereignis === "vorschlagsset")?.spanneProzent),
        [p + "setGleichlauf"]: z([...protokoll].reverse().find((e) => e.ereignis === "vorschlagsset")?.gleichlauf),
        /* Der Flug als zweites Objekt der Erhebung (v=376).
           --------------------------------------------------------------
           Dieselbe Kennzeichnung an einem anderen Produkt - eine
           Replikation innerhalb derselben Person, ohne zusaetzliche
           Teilnahme. `flugPartnerGewaehlt` ist das Gegenstueck zu
           "Partnerhaus gebucht"; der Vergleich der beiden Quoten ist der
           eigentliche Befund. */
        [p + "flugAuswahlGezeigt"]: zaehle(protokoll, "flugauswahl_gezeigt"),
        [p + "flugGewaehlt"]: z([...protokoll].reverse().find((e) => e.ereignis === "flug_gewaehlt")?.airline),
        [p + "flugPartnerGewaehlt"]: (() => {
          const e = [...protokoll].reverse().find((x) => x.ereignis === "flug_gewaehlt");
          return e ? (e.partner ? 1 : 0) : "";
        })(),
        [p + "flugPosition"]: z([...protokoll].reverse().find((e) => e.ereignis === "flug_gewaehlt")?.position),
        [p + "flugSekunden"]: z([...protokoll].reverse().find((e) => e.ereignis === "flug_gewaehlt")?.sekunden),
        [p + "flugOhneWahlGeschlossen"]: zaehle(protokoll, "flugauswahl_zu"),
        [p + "rundgangHaeuser"]: z([...protokoll].reverse().find((e) => e.ereignis === "rundgang_fertig")?.haeuser),
        [p + "rundgangAbgebrochen"]: zaehle(protokoll, "rundgang_abgebrochen"),
        [p + "bewertungenGelesen"]: zaehle(protokoll, "bewertungen_gelesen"),
        [p + "vorschlaegeErneut"]: zaehle(protokoll, "vorschlaege_erneut"),
        [p + "partnerInfoGeoeffnet"]: zaehle(protokoll, "partner_info_geoeffnet"),
        [p + "argumenteRepariert"]: zaehle(protokoll, "argumente_repariert"),
        [p + "hausKorrigiert"]: zaehle(protokoll, "haus_korrigiert"),
        [p + "falscheSeite"]: zaehle(protokoll, "falsche_hausseite") + zaehle(protokoll, "falsche_buchungsseite"),
        [p + "spracheGenutzt"]: zaehle(protokoll, "sprache_start"),
        [p + "spracheSekunden"]: protokoll.filter((e) => e.ereignis === "sprache_ende").reduce((s2, e) => s2 + (e.sekunden || 0), 0),
        [p + "partnerInfoSekunden"]: z(protokoll.find((e) => e.ereignis === "partner_info_geoeffnet")?.sekunden),
        [p + "themaZweimalGefragt"]: protokoll.filter((e) => e.ereignis === "thema_gefragt" && (e.mal || 1) > 1).length,
        /* Wenn der Agent eine Antwort nicht lesen konnte.
           --------------------------------------------------------------
           Drei Stufen, und jede steht in einer eigenen Spalte, weil sie
           verschieden schwer wiegen: Er vermutet einen Tippfehler und
           fragt mit seiner Vermutung nach (leicht), er sagt nur, dass er
           es nicht verstanden hat (mittel), er nimmt nach zwei Anlaeufen
           das Naheliegende an (schwer - hier steht am Ende ein Wert im
           Stand, den die Person nicht selbst genannt hat). */
        [p + "tippfehlerVermutungen"]: zaehle(protokoll, "tippfehler_rueckfrage"),
        [p + "nichtVerstanden"]: zaehle(protokoll, "antwort_nicht_verstanden"),
        [p + "themenUebersprungen"]: protokoll.filter((e) => e.ereignis === "thema_uebersprungen").map((e) => e.thema).join(","),
        /* Die Frage nach dem genauen Anreisetag (01.10.2026).
           --------------------------------------------------------------
           Sie ist selbst ein kleines Experiment: Bringt eine ausdrueckliche
           Nachfrage Leute dazu, ein Datum zu nennen, das sie ohnehin im
           Kopf hatten? `datumGenannt` haelt das Ergebnis fest, sobald die
           Frage beantwortet ist - 1, wenn danach ein Tag oder ein
           Zeitraum im Stand stand. */
        [p + "datumRueckfrage"]: zaehle(protokoll, "datum_rueckfrage"),
        [p + "datumGenannt"]: (() => {
          const e = [...protokoll].reverse().find((x) => x.ereignis === "datum_geklaert");
          return e ? (e.hatDatum ? 1 : 0) : "";
        })(),
        [p + "einfuegen"]: einfuegen.length,
        [p + "einfuegenAusAufgabeMax"]: einfuegen.length ? Math.max(...einfuegen.map((e) => e.ausAufgabe)) : "",
        [p + "detailsGeoeffnet"]: details.length,
        [p + "detailsAusserhalbShortlist"]: details.filter((e) => e.shortlistVorhanden && !e.inShortlist).length,
        [p + "detailSekunden"]: verweil.reduce((s, e) => s + (e.sekunden || 0), 0),
        [p + "aufgabeErneutGeoeffnet"]: zaehle(ereignisse, "aufgabe_erneut_geoeffnet"),
      });

      /* Zugang: die drei Klicks (Pull, Push, Umentschieden) und das Log */
      const oeffnungen = ereignisse.filter((e) => e.ereignis === "agent_geoeffnet");
      const einladung = ereignisse.find((e) => e.ereignis === "einladung_gezeigt");
      const antwort = ereignisse.find((e) => e.ereignis === "einladung_ja" || e.ereignis === "einladung_nein");
      const logAuf = protokoll.filter((e) => e.ereignis === "log_geoeffnet");
      const logZu = protokoll.filter((e) => e.ereignis === "log_geschlossen");
      const buchungT = r.buchung?.zeit || null;
      Object.assign(spalten, {
        [p + "agentGeoeffnet"]: oeffnungen.length,
        [p + "agentGeoeffnetArt"]: z(oeffnungen[0]?.art),
        [p + "agentGeoeffnetQuelle"]: z(oeffnungen[0]?.quelle),
        [p + "agentGeoeffnetS"]: z(oeffnungen[0]?.sekundenSeitAufgabe),
        [p + "einladungGezeigt"]: einladung ? 1 : 0,
        [p + "einladungAusloeser"]: z(einladung?.ausloeser),
        [p + "einladungPosition"]: z(einladung?.position),
        [p + "einladungS"]: z(einladung?.sekundenSeitAufgabe),
        [p + "einladungAntwort"]: antwort ? antwort.ereignis.replace("einladung_", "") : "",
        [p + "einladungBedenkzeitMs"]: z(antwort?.bedenkzeitMs),
        [p + "logGeoeffnet"]: logAuf.length,
        [p + "logGeoeffnetVorBuchung"]: buchungT ? logAuf.filter((e) => e.t < buchungT).length : logAuf.length,
        [p + "logDauerMs"]: logZu.reduce((s, e) => s + (e.dauerMs || 0), 0),
        [p + "logScrollMax"]: logZu.length ? Math.max(...logZu.map((e) => e.scrollMax || 0)) : "",
        [p + "logEndeErreicht"]: logZu.length ? (logZu.some((e) => e.endeErreicht) ? 1 : 0) : "",
        [p + "logScrollNoetig"]: logAuf.length ? (logAuf.some((e) => e.scrollNoetig) ? 1 : 0) : "",
      });

      /* Partnerhaus und Vorlage: wurde es vorgelegt, wurde es gebucht,
         und wie "ueberzeugt" war die Person - schnell, ohne
         Nachpruefung, mit Rueckfragen? */
      const vorgelegt = protokoll.find((e) => e.ereignis === "partner_vorgelegt");
      const fehlt = protokoll.find((e) => e.ereignis === "partner_fehlt");
      const vorlage = protokoll.find((e) => e.ereignis === "shortlist" && e.runde === 0);
      const vorlageT = vorlage?.t || null;
      const vorlageIds = vorlage?.ids || [];
      const auswahl = protokoll.find((e) => e.ereignis === "auswahl" && vorlageT && e.t >= vorlageT);
      const detailsNach = vorlageT ? details.filter((e) => e.t >= vorlageT) : [];
      const ersterKlickNach = [auswahl?.t, ...detailsNach.filter((e) => e.inShortlist).map((e) => e.t)].filter(Boolean).sort()[0] || null;
      const userNach = vorlageT ? (r.verlauf || []).filter((n) => n.rolle === "user" && n.zeit >= vorlageT).length : 0;
      const partnerId = vorgelegt?.id || fehlt?.id || null;
      Object.assign(spalten, {
        [p + "partnerId"]: z(partnerId),
        [p + "partnerRang"]: z(vorgelegt?.rang || fehlt?.rang),
        [p + "partnerVorgelegt"]: vorgelegt ? 1 : (fehlt ? 0 : ""),
        [p + "partnerFehltGrund"]: z(fehlt?.grund),
        [p + "partnerGebucht"]: r.buchung && partnerId ? (r.buchung.id === partnerId ? 1 : 0) : "",
        [p + "vorlageVorhanden"]: vorlage ? 1 : 0,
        [p + "vorlageGebucht"]: r.buchung && vorlage ? (vorlageIds.includes(r.buchung.id) ? 1 : 0) : "",
        [p + "uebernahmeOhnePruefung"]: r.buchung && vorlage
          ? (vorlageIds.includes(r.buchung.id) && !detailsNach.some((e) => !e.inShortlist) ? 1 : 0) : "",
        [p + "vorlageBisKlickS"]: vorlageT && ersterKlickNach ? Math.round((ersterKlickNach - vorlageT) / 1000) : "",
        [p + "vorlageBisBuchungS"]: vorlageT && buchungT ? Math.round((buchungT - vorlageT) / 1000) : "",
        [p + "detailsAusserhalbNachVorlage"]: detailsNach.filter((e) => !e.inShortlist).length,
        [p + "nachrichtenNachVorlage"]: userNach,
        [p + "warumNachVorlage"]: protokoll.filter((e) => e.ereignis === "warum_gefragt" && vorlageT && e.t >= vorlageT).length,
      });
      for (const [k, v] of Object.entries(r.zwischenfragen || {})) spalten[p + k] = z(v);
    });

    for (const [k, v] of Object.entries(d.fragebogen || {})) spalten["f_" + k] = z(v);

    /* Zwei abgeleitete Spalten aus dem Bogen, damit die Auswertung sie
       nicht jedes Mal neu herstellen muss.
       ------------------------------------------------------------------
       aufmerksamOk  Die Aufmerksamkeitskontrolle hat genau eine richtige
                     Antwort (Stufe 2). Sie schliesst niemanden aus; die
                     Spalte erlaubt, die Auswertung einmal mit und einmal
                     ohne diese Faelle zu rechnen.
       versicherungGewohnt  Kreuzt die Person an, dass sie privat eine
                     Reiseruecktrittsversicherung mitbucht (Option 1 in
                     e_zusaetze)? Ohne diesen Wert ist die stehen
                     gelassene Versicherung an der Kasse nicht deutbar. */
    const richtig = FRAGEBOGEN.flatMap((b) => b.fragen).find((f) => f.richtig != null);
    if (richtig) {
      const wert = d.fragebogen?.[richtig.id];
      spalten.f_aufmerksamOk = wert == null ? "" : (wert === richtig.richtig ? 1 : 0);
    }
    const zusaetze = d.fragebogen?.e_zusaetze;
    spalten.f_versicherungGewohnt = zusaetze == null ? ""
      : (String(zusaetze).split(",").includes("1") ? 1 : 0);
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
