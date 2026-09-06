/* Startbildschirm - Cookie-Hinweis und Wahl der Freigabestufe
   ====================================================================
   Der Bildschirm, den jede teilnehmende Person als Erstes sieht.

   Warum es ihn gibt
   -------------------------------------------------------------------
   Die Freigabestufe ist die abhaengige Variable dieser Untersuchung:
   Wie viel Entscheidungsgewalt gibt jemand einem Agenten, den er nicht
   kennt? Solange die Stufe nur in einem Regler im Chatfenster steckt,
   misst man vor allem, wer den Regler ueberhaupt entdeckt. Wer ihn
   uebersieht, bleibt auf dem Startwert und erzeugt einen Datenpunkt,
   der nichts ueber seine Bereitschaft aussagt.

   Hier wird die Wahl deshalb einmal ausdruecklich gestellt, bevor die
   Seite benutzbar ist - so, wie ein Cookie-Hinweis gestellt wird. Alle
   sehen denselben Text, alle entscheiden sich, niemand rutscht durch.

   Und es bleibt eine realistische Lage: Genau so werden Einwilligungen
   im Netz eingeholt. Die Wahl ist nicht endgueltig, der Regler im
   Chatfenster bleibt waehrend der ganzen Sitzung bedienbar. Damit gibt
   es zwei Messungen statt einer - die Bereitschaft vor dem ersten
   Kontakt und ihre Bewegung waehrend der Nutzung.

   Was gegen Verzerrung getan wird
   -------------------------------------------------------------------
   Nichts ist vorausgewaehlt. Ein gesetzter Haken wird uebernommen,
   und die Verteilung haette dann mehr mit dieser Voreinstellung zu tun
   als mit den Menschen.

   Die Reihenfolge der vier Stufen wird je Sitzung gedreht. Was oben
   steht, wird haeufiger gewaehlt; bei fester Reihenfolge waere dieser
   Effekt in allen Daten derselbe und nicht mehr herausrechenbar. Die
   Richtung wird mitprotokolliert und laesst sich als Kontrollvariable
   pruefen.

   Die vier Beschreibungen sind gleich lang und gleich sachlich. Keine
   Stufe wird empfohlen, keine gewarnt. "Bequem" bei der hohen Stufe
   oder "sicher" bei der niedrigen waere bereits die halbe Antwort.

   Der Cookie-Hinweis
   -------------------------------------------------------------------
   Er steht da, weil er zur Lage gehoert - eine Buchungsseite ohne ihn
   wirkt nicht echt. Sein Text ist trotzdem wahr: Die Seite legt
   tatsaechlich nur im sessionStorage ab, was fuer den Besuch noetig
   ist, und gibt nichts an Dritte. Eine erfundene Einwilligung waere
   unnoetig gewesen, die richtige Angabe tut es auch.
   ================================================================== */

const Startbildschirm = {
  SCHLUESSEL: "voyara_start_erledigt",

  erledigt() {
    try { return sessionStorage.getItem(this.SCHLUESSEL) === "1"; } catch { return false; }
  },

  merken() {
    try { sessionStorage.setItem(this.SCHLUESSEL, "1"); } catch { /* egal */ }
  },

  /* Zeigt den Bildschirm und ruft `fertig(stufe, messung)` auf, sobald
     gewaehlt wurde. Vorher passiert auf der Seite nichts. */
  zeigen(stufen, fertig) {
    const abwaerts = Math.random() < 0.5;
    const reihe = abwaerts ? [...stufen].reverse() : [...stufen];
    const gezeigt = Date.now();
    let aufgeklappt = false;

    const el = document.createElement("div");
    el.className = "startschirm";
    el.innerHTML = `
      <div class="startschirm-karte" role="dialog" aria-modal="true" aria-labelledby="startTitel">
        <h2 id="startTitel">Willkommen bei Voyara</h2>

        <p class="startschirm-cookie">
          Wir speichern während deines Besuchs, was du ausgewählt hast, damit deine
          Suche beim Seitenwechsel erhalten bleibt. Die Angaben verlassen deinen
          Browser nicht und werden nicht an Dritte weitergegeben.
        </p>

        <div class="startschirm-block">
          <h3>Dein Reise-Assistent</h3>
          <p>
            Auf dieser Seite hilft dir ein Assistent bei der Suche. Du sagst ihm,
            wonach du suchst, und er arbeitet die Seite für dich durch - er sucht,
            setzt Filter, vergleicht Häuser und liest Bewertungen.
          </p>
          <p>
            Wie weit er dabei gehen darf, entscheidest du. Wähle, was dir am ehesten
            entspricht:
          </p>

          <div class="startschirm-stufen" role="radiogroup" aria-labelledby="startTitel">
            ${reihe.map((s) => `
              <label class="startschirm-stufe">
                <input type="radio" name="freigabe" value="${s.id}">
                <span class="startschirm-stufe-text">
                  <strong>${s.kurz}</strong>
                  <span>${this.ERKLAERUNG[s.id]}</span>
                </span>
              </label>`).join("")}
          </div>

          <button type="button" class="startschirm-mehr" data-mehr>
            Was heißt das genau?
          </button>
          <div class="startschirm-detail" hidden>
            <p>
              Der Assistent bewegt den Mauszeiger sichtbar über die Seite. Du siehst
              also jederzeit, was er gerade tut, und kannst ihn im Chatfenster
              unterbrechen.
            </p>
            <p>
              Deine Wahl gilt nicht für immer. Im Chatfenster steht oben ein Regler,
              mit dem du sie jederzeit änderst - nach oben wie nach unten.
            </p>
          </div>
        </div>

        <button type="button" class="btn btn-primary startschirm-weiter" disabled data-weiter>
          Weiter zu Voyara
        </button>
      </div>`;

    document.body.appendChild(el);
    document.body.classList.add("startschirm-offen");

    const weiter = el.querySelector("[data-weiter]");
    let gewaehlt = null;

    el.addEventListener("change", (e) => {
      if (e.target.name !== "freigabe") return;
      gewaehlt = e.target.value;
      weiter.disabled = false;
    });

    el.querySelector("[data-mehr]").addEventListener("click", (e) => {
      const kasten = el.querySelector(".startschirm-detail");
      aufgeklappt = true;
      kasten.hidden = !kasten.hidden;
      e.target.textContent = kasten.hidden ? "Was heißt das genau?" : "Weniger anzeigen";
    });

    weiter.addEventListener("click", () => {
      if (!gewaehlt) return;
      this.merken();
      el.remove();
      document.body.classList.remove("startschirm-offen");
      fertig(gewaehlt, {
        // Wie lange jemand ueberlegt hat, sagt etwas darueber, wie sehr
        // die Wahl eine Wahl war. Zwei Sekunden heisst durchgeklickt.
        bedenkzeitMs: Date.now() - gezeigt,
        reihenfolge: abwaerts ? "hoch_nach_niedrig" : "niedrig_nach_hoch",
        erklaerungGeoeffnet: aufgeklappt,
      });
    });

    // Kein Wegklicken: keine Schliessen-Schaltflaeche, kein Escape, kein
    // Klick daneben. Wer sich hier nicht entscheidet, erzeugt einen
    // Datensatz ohne den einen Wert, um den es geht.
    el.addEventListener("keydown", (e) => { if (e.key === "Escape") e.stopPropagation(); }, true);

    // Bewusst kein Fokus auf das erste Feld: Der Browser scrollt es in
    // den Blick, und auf einem kleinen Bildschirm stand die Karte damit
    // sofort mitten in der Stufenliste - Ueberschrift und Erklaerung
    // waren nach oben herausgeschoben, bevor jemand sie lesen konnte.
    // Fokussiert wird die Karte selbst, damit die Tastaturbedienung
    // trotzdem im Bildschirm beginnt.
    const karte = el.querySelector(".startschirm-karte");
    karte.setAttribute("tabindex", "-1");
    setTimeout(() => karte.focus({ preventScroll: true }), 50);
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
