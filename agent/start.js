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

   Der Cookie-Teil
   -------------------------------------------------------------------
   Er steht da, weil er zur Lage gehoert - eine Buchungsseite ohne ihn
   wirkt nicht echt. Sein Text ist trotzdem wahr: Die Seite legt
   tatsaechlich nur im sessionStorage ab, was fuer den Besuch noetig
   ist, und gibt nichts an Dritte. Eine erfundene Einwilligung waere
   eine Taeuschung, die nichts einbringt.
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

    const el = this.rahmenBauen("einstieg", `
      <p class="startschirm-marke">Teilnahmehinweis</p>
      <h2>Studie zur Reisebuchung im Netz</h2>

      <p>
        Danke, dass du dir Zeit nimmst. Diese Erhebung entsteht im Rahmen
        ${zusatz ? `einer ${zusatz}` : "einer Bachelorarbeit"} und untersucht, wie sich
        das Buchen im Netz verändert, wenn sich Aufgaben an automatisierte Assistenten
        abgeben lassen.
      </p>

      <div class="startschirm-ablauf">
        <div><span>1</span><p><strong>Eine Buchungsseite benutzen.</strong> Du bekommst gleich
          eine Aufgabe und suchst dafür auf dieser Seite eine Unterkunft. Etwa zehn Minuten.</p></div>
        <div><span>2</span><p><strong>Ein paar Fragen beantworten.</strong> Danach geht es um
          deine Eindrücke: was gut lief, was nicht, und wie du das Erlebte einschätzt. Etwa fünf Minuten.</p></div>
        <div><span>3</span><p><strong>Auflösung.</strong> Zum Schluss erfährst du, was genau
          untersucht wurde und warum.</p></div>
      </div>

      <p class="startschirm-klein">
        Die Seite ist ein Nachbau für diese Untersuchung. <strong>Es wird nichts
        wirklich gebucht</strong>, es entstehen keine Kosten, und Zahlungsdaten werden
        an keiner Stelle abgefragt. Wenn dich ein Formular nach Namen oder Adresse
        fragt, kannst du eintragen, was du möchtest.
      </p>
      <p class="startschirm-klein">
        Die Teilnahme ist freiwillig und anonym; du kannst jederzeit abbrechen, indem du
        das Fenster schließt. Ausgewertet wird nur, was du auf dieser Seite tust und
        antwortest - keine Namen, keine Mailadressen, keine IP-Adressen.
        ${STUDIE.kontakt ? `Fragen? <a href="mailto:${STUDIE.kontakt}">${STUDIE.kontakt}</a>` : ""}
      </p>`,
      `<button type="button" class="startschirm-knopf startschirm-knopf-stark" data-weiter>
         Verstanden, los geht es
       </button>`);

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

    const el = this.rahmenBauen("einwilligung", `
      <p class="startschirm-marke">Datenschutz und Einstellungen</p>
      <h2>Bevor es losgeht</h2>

      <p class="startschirm-klein">
        Wir speichern während deines Besuchs, was du ausgewählt hast, damit deine Suche
        beim Seitenwechsel erhalten bleibt. Die Angaben verlassen deinen Browser nicht
        und werden nicht an Dritte weitergegeben.
      </p>

      <div class="startschirm-zeile">
        <span class="startschirm-zeile-name">Notwendige Cookies</span>
        <span class="startschirm-zeile-fest">Immer aktiv</span>
      </div>

      <div class="startschirm-zeile startschirm-zeile-offen">
        <span class="startschirm-zeile-name">Reise-Assistent</span>
      </div>

      <p class="startschirm-klein">
        Ein Assistent hilft dir bei der Suche: Er sucht, setzt Filter, vergleicht Häuser
        und liest Bewertungen. Wie weit er dabei gehen darf, entscheidest du.
      </p>

      <div class="startschirm-stufen" role="radiogroup" aria-label="Freigabe für den Assistenten">
        ${reihe.map((s) => `
          <label class="startschirm-stufe">
            <input type="radio" name="freigabe" value="${s.id}">
            <span class="startschirm-stufe-text">
              <strong>${s.kurz}</strong>
              <span>${this.ERKLAERUNG[s.id]}</span>
            </span>
          </label>`).join("")}
      </div>

      <button type="button" class="startschirm-mehr" data-mehr>Was heißt das genau?</button>
      <div class="startschirm-detail" hidden>
        <p class="startschirm-klein">
          Der Assistent bewegt den Mauszeiger sichtbar über die Seite. Du siehst jederzeit,
          was er gerade tut, und kannst ihn im Chatfenster unterbrechen.
        </p>
        <p class="startschirm-klein">
          Deine Wahl gilt nicht für immer: Im Chatfenster steht oben ein Regler, mit dem du
          sie jederzeit änderst - nach oben wie nach unten.
        </p>
      </div>`,
      `<div class="startschirm-fussverweise">
         <a href="info.html?p=datenschutz" target="_blank" rel="noopener">Datenschutz</a>
         <a href="info.html?p=cookies" target="_blank" rel="noopener">Cookies</a>
         <a href="info.html?p=impressum" target="_blank" rel="noopener">Impressum</a>
       </div>
       <button type="button" class="startschirm-knopf startschirm-knopf-stark" disabled data-weiter>
         Auswahl bestätigen
       </button>`);

    const knopf = el.querySelector("[data-weiter]");

    el.addEventListener("change", (e) => {
      if (e.target.name !== "freigabe") return;
      gewaehlt = e.target.value;
      knopf.disabled = false;
    });

    el.querySelector("[data-mehr]").addEventListener("click", (e) => {
      const kasten = el.querySelector(".startschirm-detail");
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

  /* ==================================================================
     Gemeinsamer Rahmen
     ================================================================== */

  rahmenBauen(art, inhalt, fuss) {
    const el = document.createElement("div");
    el.className = `startschirm startschirm-${art}`;
    el.innerHTML = `
      <div class="startschirm-karte" role="dialog" aria-modal="true" tabindex="-1">
        <div class="startschirm-inhalt">${inhalt}</div>
        <div class="startschirm-fuss">${fuss}</div>
      </div>`;
    document.body.appendChild(el);
    document.body.classList.add("startschirm-offen");

    // Kein Wegklicken: keine Schliessen-Schaltflaeche, kein Escape, kein
    // Klick daneben. Wer sich hier nicht entscheidet, erzeugt einen
    // Datensatz ohne den einen Wert, um den es geht.
    el.addEventListener("keydown", (e) => { if (e.key === "Escape") e.stopPropagation(); }, true);

    // Bewusst kein Fokus auf ein Eingabefeld: Der Browser scrollt es in
    // den Blick, und auf einem kleinen Bildschirm stand die Karte damit
    // sofort mitten in der Liste - Ueberschrift und Erklaerung waren
    // nach oben herausgeschoben, bevor jemand sie lesen konnte.
    const karte = el.querySelector(".startschirm-karte");
    setTimeout(() => karte.focus({ preventScroll: true }), 50);
    return el;
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
