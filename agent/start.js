/* Einstieg in die Sitzung - Studienhinweis und Einwilligungsfenster
   ====================================================================
   Zwei Bildschirme, die jede teilnehmende Person nacheinander sieht:

     1. Studienhinweis   Worum es geht, wie lange es dauert, was mit
                         den Angaben passiert. Wie bei jeder Erhebung.
     2. Einwilligung     Ein Fenster in der Form, die man von jeder
                         Seite kennt - und darin die Wahl, wie weit
                         der Assistent gehen darf.

   Warum die Reihenfolge so ist
   -------------------------------------------------------------------
   Der Studienhinweis gehoert an den Anfang, weil ohne ihn niemand
   einwilligen kann. Er nennt das Thema, aber nicht die Fragestellung:
   "wie sich Einkaufen veraendert, wenn Aufgaben an Assistenten
   abgegeben werden koennen" sagt, worum es geht. "Wir messen, wie viel
   Sie abgeben" waere die halbe Antwort und wuerde genau das Verhalten
   erzeugen, das gemessen werden soll.

   Warum die Freigabewahl im Einwilligungsfenster steht
   -------------------------------------------------------------------
   Die Freigabestufe ist die abhaengige Variable: Wie viel
   Entscheidungsgewalt gibt jemand einem Agenten, den er nicht kennt?
   Solange die Stufe nur in einem Regler im Chatfenster steckt, misst
   man vor allem, wer den Regler entdeckt. Wer ihn uebersieht, bleibt
   auf dem Startwert und erzeugt einen Datenpunkt ueber ein
   Bedienelement statt ueber seine Bereitschaft.

   Hier wird die Wahl einmal ausdruecklich gestellt, bevor die Seite
   benutzbar ist - so, wie Einwilligungen im Netz eingeholt werden. Die
   Wahl ist nicht endgueltig: Der Regler im Chatfenster bleibt die ganze
   Sitzung ueber bedienbar. Damit gibt es zwei Messungen statt einer -
   die Bereitschaft vor dem ersten Kontakt und ihre Bewegung waehrend
   der Nutzung.

   Was gegen Verzerrung getan wird
   -------------------------------------------------------------------
   Nichts ist vorausgewaehlt. Ein gesetzter Haken wird uebernommen, und
   die Verteilung haette dann mehr mit dieser Voreinstellung zu tun als
   mit den Menschen.

   Die Reihenfolge der vier Stufen wird je Sitzung gedreht. Was oben
   steht, wird haeufiger gewaehlt; bei fester Reihenfolge waere dieser
   Effekt in allen Daten derselbe und nicht mehr herausrechenbar. Die
   Richtung wird protokolliert und laesst sich als Kontrollvariable
   pruefen.

   Die vier Beschreibungen sind gleich lang und gleich sachlich. Keine
   Stufe wird empfohlen, vor keiner wird gewarnt. "Bequem" bei der hohen
   oder "sicher" bei der niedrigen waere bereits die halbe Antwort.

   Der Cookie-Hinweis
   -------------------------------------------------------------------
   Er steht da, weil er zur Lage gehoert - eine Buchungsseite ohne ihn
   wirkt nicht echt. Sein Text ist trotzdem wahr: Die Seite legt
   tatsaechlich nur im sessionStorage ab, was fuer den Besuch noetig
   ist, und gibt nichts an Dritte. Eine erfundene Einwilligung waere
   eine Taeuschung, die nichts einbringt.

   Gebaut ist er nach dem, was solche Hinweise ueblicherweise ausmacht:
   eine Karte unten rechts, schmal, kurzer Text, Kategorien mit
   Auswahlfeldern, darunter eine Schaltflaeche und die kleinen Verweise.
   Die Ecke unten rechts ist der Quasi-Standard; auf dem Handy nimmt die
   Karte die Breite ein.

   Die Good-Practice-Leitlinien des Bundesjustizministeriums zum
   Einwilligungsmanagement verlangen dabei genau das, was die Erhebung
   ohnehin braucht: prominent, aber nicht bildschirmfuellend; keine
   Vorauswahl von Kategorien; alle Handlungsoptionen optisch
   gleichberechtigt, ohne dass eine durch Farbe oder Groesse bevorzugt
   wird. Fuer die Freigabestufen heisst das: vier gleich gestaltete
   Zeilen, gleich lange Beschreibungen, nichts hervorgehoben. Was
   rechtlich gegen Nudging gedacht ist, haelt hier den Messwert sauber.
   ================================================================== */

/* Angaben zur Erhebung. Hier eintragen, was auf dem Hinweis stehen
   soll - der Rest des Textes bleibt davon unberuehrt. */
const STUDIE = {
  rahmen: "Bachelorarbeit",
  hochschule: "",                 // z.B. "Universität Musterstadt"
  kontakt: "",                    // Mailadresse für Rückfragen
  dauerMinuten: 15,
};

const Startbildschirm = {
  SCHLUESSEL: "voyara_start_erledigt",

  erledigt() {
    try { return sessionStorage.getItem(this.SCHLUESSEL) === "1"; } catch { return false; }
  },

  merken() {
    try { sessionStorage.setItem(this.SCHLUESSEL, "1"); } catch { /* egal */ }
  },

  /* Beide Bildschirme nacheinander. `fertig(stufe, messung)` wird
     aufgerufen, sobald die Freigabestufe gewaehlt ist. */
  zeigen(stufen, fertig) {
    this.hinweisZeigen((hinweisMessung) => {
      this.einwilligungZeigen(stufen, (stufe, messung) => {
        this.merken();
        document.body.classList.remove("startschirm-offen");
        fertig(stufe, { ...hinweisMessung, ...messung });
      });
    });
  },

  /* ==================================================================
     1. Studienhinweis
     ================================================================== */

  hinweisZeigen(weiter) {
    const gezeigt = Date.now();
    const zusatz = [STUDIE.rahmen, STUDIE.hochschule].filter(Boolean).join(", ");

    // Deckt die Seite vollstaendig ab. Vorher lag der Hinweis als Kasten
    // ueber der Buchungsseite, und die war dahinter zu sehen - das
    // erzeugte vor allem den Wunsch, ihn wegzuklicken und nachzusehen,
    // was dahinter liegt. Ein eigener Bildschirm laesst nichts anderes
    // zu, als ihn zu lesen.
    const el = document.createElement("div");
    el.className = "einstieg";
    el.innerHTML = `
      <div class="einstieg-blatt" role="dialog" aria-modal="true" tabindex="-1">
        <header class="einstieg-kopf">
          <span class="einstieg-marke">Voyara</span>
          <span class="einstieg-etikett">Teilnahmehinweis</span>
        </header>

        <h1>Schön, dass du dabei bist.</h1>
        <p class="einstieg-vorspann">
          Diese Erhebung entsteht im Rahmen ${zusatz ? `einer ${zusatz}` : "einer Bachelorarbeit"}
          und fragt, wie sich das Buchen im Netz verändert, wenn sich Aufgaben an
          automatisierte Assistenten abgeben lassen. Du brauchst dafür kein Vorwissen -
          buch einfach so, wie du es sonst auch tun würdest.
        </p>

        <div class="einstieg-ablauf">
          <div>
            <span>1</span>
            <h3>Eine Buchungsseite benutzen</h3>
            <p>Du bekommst gleich eine Aufgabe und suchst dafür auf dieser Seite eine
               Unterkunft. Etwa zehn Minuten.</p>
          </div>
          <div>
            <span>2</span>
            <h3>Ein paar Fragen beantworten</h3>
            <p>Danach geht es um deine Eindrücke: was gut lief, was nicht, und wie du
               das Erlebte einschätzt. Etwa fünf Minuten.</p>
          </div>
          <div>
            <span>3</span>
            <h3>Auflösung</h3>
            <p>Zum Schluss erfährst du, was genau untersucht wurde und warum.</p>
          </div>
        </div>

        <div class="einstieg-hinweise">
          <p>
            <strong>Es wird nichts wirklich gebucht.</strong> Die Seite ist ein Nachbau für
            diese Untersuchung. Es entstehen keine Kosten, und Zahlungsdaten werden an keiner
            Stelle abgefragt. Wenn dich ein Formular nach Namen oder Adresse fragt, trag ein,
            was du möchtest.
          </p>
          <p>
            <strong>Freiwillig und anonym.</strong> Du kannst jederzeit abbrechen, indem du das
            Fenster schließt. Ausgewertet wird nur, was du auf dieser Seite tust und antwortest -
            keine Namen, keine Mailadressen, keine IP-Adressen.
            ${STUDIE.kontakt ? `Fragen? <a href="mailto:${STUDIE.kontakt}">${STUDIE.kontakt}</a>` : ""}
          </p>
        </div>

        <button type="button" class="einstieg-knopf" data-weiter>
          Verstanden, los geht es
        </button>
        <p class="einstieg-dauer">Insgesamt etwa ${STUDIE.dauerMinuten} Minuten</p>
      </div>`;

    document.body.appendChild(el);
    document.body.classList.add("startschirm-offen");
    el.addEventListener("keydown", (e) => { if (e.key === "Escape") e.stopPropagation(); }, true);
    setTimeout(() => el.querySelector(".einstieg-blatt").focus({ preventScroll: true }), 50);

    el.querySelector("[data-weiter]").addEventListener("click", () => {
      el.remove();
      weiter({ hinweisSekunden: Math.round((Date.now() - gezeigt) / 1000) });
    });
  },

  /* ==================================================================
     2. Einwilligung und Freigabewahl
     ------------------------------------------------------------------
     Aufgebaut wie ein Einwilligungsfenster: eine Zeile fuer die
     notwendigen Cookies, die nicht abwaehlbar ist, darunter die
     Einstellung, um die es geht, unten die Schaltflaeche und die
     ueblichen kleinen Verweise.
     ================================================================== */

  einwilligungZeigen(stufen, fertig) {
    const abwaerts = Math.random() < 0.5;
    const reihe = abwaerts ? [...stufen].reverse() : [...stufen];
    const gezeigt = Date.now();
    let aufgeklappt = false;
    let gewaehlt = null;

    const el = document.createElement("div");
    el.className = "cookiehinweis";
    el.innerHTML = `
      <div class="cookiehinweis-karte" role="dialog" aria-modal="true" tabindex="-1">
        <h2>Cookies und Einstellungen</h2>
        <p>
          Wir speichern nur, was für deinen Besuch nötig ist. Nichts davon verlässt
          deinen Browser. <a href="info.html?p=cookies" target="_blank" rel="noopener">Mehr erfahren</a>
        </p>

        <div class="cookiehinweis-kategorie">
          <span>Notwendig</span>
          <span class="cookiehinweis-fest">Immer aktiv</span>
        </div>

        <div class="cookiehinweis-kategorie cookiehinweis-kategorie-offen">
          <span>Reise-Assistent</span>
        </div>
        <p class="cookiehinweis-frage">Wie weit darf er gehen?</p>

        <div class="cookiehinweis-stufen" role="radiogroup" aria-label="Freigabe für den Assistenten">
          ${reihe.map((s) => `
            <label class="cookiehinweis-stufe">
              <input type="radio" name="freigabe" value="${s.id}">
              <span>
                <strong>${s.kurz}</strong>
                <em>${this.KURZ[s.id]}</em>
              </span>
            </label>`).join("")}
        </div>

        <button type="button" class="cookiehinweis-mehr" data-mehr>Was heißt das genau?</button>
        <div class="cookiehinweis-detail" hidden>
          ${stufen.map((s) => `<p><strong>${s.kurz}.</strong> ${this.ERKLAERUNG[s.id]}</p>`).join("")}
          <p>Du kannst das jederzeit im Chatfenster ändern.</p>
        </div>

        <button type="button" class="cookiehinweis-knopf" disabled data-weiter>Speichern</button>

        <div class="cookiehinweis-verweise">
          <a href="info.html?p=datenschutz" target="_blank" rel="noopener">Datenschutz</a>
          <a href="info.html?p=impressum" target="_blank" rel="noopener">Impressum</a>
        </div>
      </div>`;

    document.body.appendChild(el);
    document.body.classList.add("startschirm-offen");
    el.addEventListener("keydown", (e) => { if (e.key === "Escape") e.stopPropagation(); }, true);

    const knopf = el.querySelector("[data-weiter]");
    el.addEventListener("change", (e) => {
      if (e.target.name !== "freigabe") return;
      gewaehlt = e.target.value;
      knopf.disabled = false;
    });

    el.querySelector("[data-mehr]").addEventListener("click", (e) => {
      const kasten = el.querySelector(".cookiehinweis-detail");
      aufgeklappt = true;
      kasten.hidden = !kasten.hidden;
      e.target.textContent = kasten.hidden ? "Was heißt das genau?" : "Weniger anzeigen";
    });

    knopf.addEventListener("click", () => {
      if (!gewaehlt) return;
      el.remove();
      fertig(gewaehlt, {
        // Wie lange jemand ueberlegt hat, sagt etwas darueber, wie sehr
        // die Wahl eine Wahl war. Zwei Sekunden heisst durchgeklickt.
        bedenkzeitMs: Date.now() - gezeigt,
        reihenfolge: abwaerts ? "hoch_nach_niedrig" : "niedrig_nach_hoch",
        erklaerungGeoeffnet: aufgeklappt,
      });
    });
  },

  /* Ein Satz je Stufe, gleich gebaut: was er tut, was bei dir bleibt.
     In der schmalen Karte muss es kurz sein, gleich lang bleibt es
     trotzdem - eine ausfuehrlichere Zeile waere eine Empfehlung. */
  KURZ: {
    vorschlagen: "Er schlägt vor, du klickst selbst.",
    suchen:      "Er sucht und filtert, du entscheidest.",
    vorbereiten: "Er legt die Buchung bereit, du bestätigst.",
    buchen:      "Er bucht in deinem Rahmen selbst.",
  },

  /* Gleich lang, gleich sachlich, keine Stufe empfohlen. Jede sagt, was
     der Assistent tut und was bei der Person bleibt - denn genau dieser
     zweite Teil ist es, den man abwaegt. */
  ERKLAERUNG: {
    vorschlagen: "Er nennt dir passende Häuser und begründet seine Auswahl. Suchen, filtern und klicken machst du selbst.",
    suchen:      "Er sucht und setzt die Filter für dich. Welches Haus es wird und ob gebucht wird, entscheidest du.",
    vorbereiten: "Er sucht, vergleicht und legt die Buchung ausgefüllt bereit. Den letzten Schritt bestätigst du.",
    buchen:      "Er sucht, vergleicht und schließt die Buchung im Rahmen deiner Vorgaben selbst ab. Du siehst danach das Ergebnis.",
  },
};
