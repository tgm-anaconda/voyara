/* Fragebogen - Entwurf
   ====================================================================
   Zwei Teile:

     ZWISCHENFRAGEN   nach jeder Aufgabe, kurz, auf diese Aufgabe bezogen
     FRAGEBOGEN       einmal am Ende, allgemein

   Alles hier ist ein ENTWURF und im Bildschirm so gekennzeichnet. Die
   Bloecke folgen dem Konzept (Vertrauen, Kontrolle, Delegation,
   Transparenz, Weiternutzung), die Formulierungen sind Vorschlaege,
   mit denen sich streichen und ergaenzen laesst. Sieben Stufen wie bei
   VERDEA, damit sich die Auswertung anschliesst.

   Die Antworten wandern mit Kennung (z.B. "z_vertrauen") ins Protokoll
   und in die Tabelle - eine Spalte je Frage.
   ================================================================== */

const SKALA_ZUSTIMMUNG = { links: "stimme gar nicht zu", rechts: "stimme voll zu", stufen: 7 };
const SKALA_ANSTRENGUNG = { links: "gar nicht", rechts: "sehr", stufen: 7 };

const ZWISCHENFRAGEN = [
  { id: "z_zufrieden", text: "Ich bin mit dem Ergebnis dieser Aufgabe zufrieden.", skala: SKALA_ZUSTIMMUNG },
  { id: "z_passt", text: "Ich vertraue darauf, dass das Ergebnis zu den Vorgaben der Aufgabe passt.", skala: SKALA_ZUSTIMMUNG },
  { id: "z_kontrolle", text: "Ich hatte während der Aufgabe das Gefühl, die Kontrolle zu behalten.", skala: SKALA_ZUSTIMMUNG },
  { id: "z_verstanden", text: "Der Assistent hat verstanden, worauf es mir ankam.", skala: SKALA_ZUSTIMMUNG, nichtGenutzt: "Assistent nicht genutzt" },
  { id: "z_hineinversetzt", text: "Ich konnte mich gut in die Situation der Aufgabe hineinversetzen.", skala: SKALA_ZUSTIMMUNG },
  { id: "z_anstrengung", text: "Wie anstrengend war die Aufgabe für dich?", skala: SKALA_ANSTRENGUNG },
  { id: "z_echt", text: "Bei einer echten Buchung mit meinem eigenen Geld hätte ich genauso entschieden.", skala: SKALA_ZUSTIMMUNG },
  { id: "z_offen", text: "Gab es einen Moment, in dem du dem Assistenten nicht mehr vertraut hast? Was war passiert?", art: "text", optional: true },
];

/* Fragen zum Partnerhaus.
   ------------------------------------------------------------------
   Werden nur angehaengt, wenn in dieser Aufgabe wirklich ein
   gekennzeichnetes Partnerhaus vorlag - sonst fragt der Bogen nach
   etwas, das die Person nie gesehen hat, und legt ihr die Idee erst in
   den Kopf. Ob sie die Markierung angeklickt hat, steht daneben im
   Protokoll; die Fragen sagen, ob sie aufgefallen ist und ob sie
   etwas geaendert hat. */
const PARTNERFRAGEN = [
  { id: "z_partner_gesehen", text: "Mir ist aufgefallen, dass eines der Häuser als Partnerhaus von Voyara gekennzeichnet war.", skala: SKALA_ZUSTIMMUNG },
  { id: "z_partner_gestoert", text: "Diese Kennzeichnung hat mich gestört.", skala: SKALA_ZUSTIMMUNG },
  { id: "z_partner_einfluss", text: "Die Kennzeichnung hat meine Wahl beeinflusst.", skala: SKALA_ZUSTIMMUNG },
];

const FRAGEBOGEN = [
  {
    titel: "Vertrauen in den Assistenten",
    fragen: [
      { id: "v_zuverlaessig", text: "Der Assistent ist zuverlässig.", skala: SKALA_ZUSTIMMUNG },
      { id: "v_verlassen", text: "Ich würde mich auf seine Vorschläge verlassen.", skala: SKALA_ZUSTIMMUNG },
      { id: "v_interesse", text: "Der Assistent handelt in meinem Interesse.", skala: SKALA_ZUSTIMMUNG },
      { id: "v_nachvollziehbar", text: "Ich verstehe, wie er zu seinen Vorschlägen kommt.", skala: SKALA_ZUSTIMMUNG },
    ],
  },
  {
    titel: "Etwas aus der Hand geben",
    fragen: [
      { id: "d_echt", text: "Ich würde einem solchen Assistenten eine echte Buchung überlassen.", skala: SKALA_ZUSTIMMUNG },
      { id: "d_betrag", text: "Ich würde ihm erlauben, bis zu einem festgelegten Betrag selbständig zu buchen.", skala: SKALA_ZUSTIMMUNG },
      { id: "d_selbst", text: "Ich hätte lieber jede Entscheidung selbst getroffen.", skala: SKALA_ZUSTIMMUNG, umgekehrt: true },
    ],
  },
  {
    titel: "Durchblick und Kontrolle",
    fragen: [
      { id: "t_sichtbar", text: "Ich wusste jederzeit, was der Assistent gerade tut.", skala: SKALA_ZUSTIMMUNG },
      { id: "t_uebersicht", text: "Die Übersicht darüber, was er verstanden hat, war hilfreich.", skala: SKALA_ZUSTIMMUNG },
      { id: "t_regler", text: "Die Möglichkeit, die Freigabe jederzeit zu ändern, war mir wichtig.", skala: SKALA_ZUSTIMMUNG },
    ],
  },
  {
    titel: "Beim nächsten Mal",
    fragen: [
      { id: "w_nutzen", text: "Ich würde einen solchen Assistenten beim nächsten Buchen nutzen.", skala: SKALA_ZUSTIMMUNG },
      { id: "w_empfehlen", text: "Ich würde ihn weiterempfehlen.", skala: SKALA_ZUSTIMMUNG },
    ],
  },
  {
    titel: "Zur Kontrolle",
    hinweis: "Zwei Fragen dazu, wie die Studie bei dir angekommen ist.",
    fragen: [
      { id: "m_freigabe", text: "Welche Freigabe war bei dir zuletzt eingestellt?", art: "wahl",
        optionen: ["Suchen und filtern", "Buchung vorbereiten", "Auch buchen", "Weiß ich nicht mehr", "Ich habe den Assistenten nicht genutzt"] },
      { id: "m_geaendert", text: "Hast du die Freigabe während der Studie geändert?", art: "wahl",
        optionen: ["Ja", "Nein", "Weiß ich nicht mehr"] },
    ],
  },
  {
    titel: "Deine Erfahrung",
    fragen: [
      { id: "e_ki", text: "Wie oft nutzt du KI-Assistenten wie ChatGPT?", art: "wahl",
        optionen: ["Nie", "Selten", "Etwa monatlich", "Etwa wöchentlich", "Täglich"] },
      { id: "e_buchen", text: "Wie oft buchst du Reisen im Netz?", art: "wahl",
        optionen: ["Nie", "Seltener als einmal im Jahr", "Ein- bis zweimal im Jahr", "Öfter"] },
      { id: "e_delegiert", text: "Hast du schon einmal eine KI etwas für dich kaufen oder buchen lassen?", art: "wahl",
        optionen: ["Ja", "Nein"] },
    ],
  },
  {
    titel: "Zu dir",
    hinweis: "Alle Angaben bleiben anonym.",
    fragen: [
      { id: "p_alter", text: "Alter", art: "zahl", min: 16, max: 99 },
      { id: "p_geschlecht", text: "Geschlecht", art: "wahl",
        optionen: ["Weiblich", "Männlich", "Divers", "Keine Angabe"] },
      { id: "p_leben", text: "Deine Lebenssituation", art: "wahl",
        optionen: ["Allein lebend", "In Partnerschaft, ohne Kinder im Haushalt", "Mit Kindern im Haushalt", "Etwas anderes"] },
      { id: "p_taetigkeit", text: "Was machst du hauptsächlich?", art: "wahl",
        optionen: ["Studium oder Ausbildung", "Berufstätig", "Etwas anderes"] },
      { id: "p_offen", text: "Möchtest du uns noch etwas mitteilen?", art: "text", optional: true },
    ],
  },
];

const Fragebogen = {
  /* Baut das HTML fuer eine Liste von Fragen. Pflichtfragen ohne
     Antwort werden beim Absenden markiert; die Pruefung uebernimmt
     `pruefen`. */
  html(fragen) {
    return fragen.map((f) => {
      if (f.art === "text") {
        return `<div class="fb-frage" data-id="${f.id}">
          <p class="fb-text">${f.text}${f.optional ? ' <span class="fb-optional">optional</span>' : ""}</p>
          <textarea class="fb-textarea" name="${f.id}" rows="3"></textarea>
        </div>`;
      }
      if (f.art === "zahl") {
        return `<div class="fb-frage" data-id="${f.id}">
          <p class="fb-text">${f.text}</p>
          <input class="fb-zahl" type="number" name="${f.id}" min="${f.min}" max="${f.max}" inputmode="numeric">
        </div>`;
      }
      if (f.art === "wahl") {
        return `<div class="fb-frage" data-id="${f.id}">
          <p class="fb-text">${f.text}</p>
          <div class="fb-wahl">
            ${f.optionen.map((o, i) => `<label><input type="radio" name="${f.id}" value="${i + 1}"><span>${o}</span></label>`).join("")}
          </div>
        </div>`;
      }
      const s = f.skala;
      return `<div class="fb-frage" data-id="${f.id}">
        <p class="fb-text">${f.text}</p>
        <div class="fb-skala" role="radiogroup" aria-label="${f.text}">
          <span class="fb-pol">${s.links}</span>
          <div class="fb-stufen">
            ${Array.from({ length: s.stufen }, (_, i) =>
              `<label><input type="radio" name="${f.id}" value="${i + 1}"><span>${i + 1}</span></label>`).join("")}
          </div>
          <span class="fb-pol">${s.rechts}</span>
        </div>
        ${f.nichtGenutzt ? `<label class="fb-nichtgenutzt"><input type="radio" name="${f.id}" value="0"><span>${f.nichtGenutzt}</span></label>` : ""}
      </div>`;
    }).join("");
  },

  /* Liest die Antworten aus einem Formular. Gibt { antworten, fehlend }
     zurueck; `fehlend` sind die Kennungen der unbeantworteten
     Pflichtfragen. Umgekehrt gepolte Fragen werden hier NICHT
     umgerechnet - das gehoert in die Auswertung, nicht in die Erhebung,
     damit die Rohdaten roh bleiben. */
  lesen(form, fragen) {
    const antworten = {};
    const fehlend = [];
    for (const f of fragen) {
      let wert = null;
      if (f.art === "text") wert = form.querySelector(`[name="${f.id}"]`)?.value.trim() || null;
      else if (f.art === "zahl") { const v = form.querySelector(`[name="${f.id}"]`)?.value; wert = v ? +v : null; }
      else {
        const v = form.querySelector(`[name="${f.id}"]:checked`)?.value;
        wert = v == null || v === "" ? null : +v;   // "0" = nicht genutzt, zaehlt als beantwortet
      }
      antworten[f.id] = wert;
      if (wert == null && !f.optional) fehlend.push(f.id);
    }
    return { antworten, fehlend };
  },

  markieren(form, fehlend) {
    form.querySelectorAll(".fb-frage").forEach((el) => el.classList.remove("fb-fehlt"));
    for (const id of fehlend) form.querySelector(`.fb-frage[data-id="${id}"]`)?.classList.add("fb-fehlt");
    const erstes = form.querySelector(".fb-fehlt");
    if (erstes) erstes.scrollIntoView({ behavior: "smooth", block: "center" });
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { ZWISCHENFRAGEN, FRAGEBOGEN, Fragebogen };
