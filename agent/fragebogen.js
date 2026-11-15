/* Fragebogen
   ====================================================================
   Ein Bogen am Ende, in Abschnitten. Bis zum 28.09.2026 waren es zwei
   Teile (Zwischenfragen nach jeder Aufgabe, dann der allgemeine
   Bogen). Mit nur einer Aufgabe je Person gibt es keinen Grund mehr
   dafuer: Die Fragen zur Buchung stehen jetzt als erster Abschnitt im
   Bogen, solange die Erinnerung frisch ist.

   Leitlinien der Fassung vom 28.09.2026 (Nutzerwunsch: der Entwurf war
   zu lang, teils doppelt, und offene Fragen kosten Abbrueche):

     1. Geschlossen vor offen. Genau ein freies Feld, optional, am Ende.
     2. Validierte Vorlagen, wo es welche gibt. Der Vertrauensblock ist
        an den TiA-Fragebogen von Koerber (2018) angelehnt, die Fragen
        zur bezahlten Platzierung an die PKS-SC (Boerman u.a. 2018).
     3. Keine Frage, die schon in den Daten steht. "Hast du die
        Freigabe geaendert?" ist rausgeflogen, weil das Protokoll es
        exakt weiss und die Frage nur Erinnerungsfehler hinzufuegt.
     4. Keine Frage, die auf Erinnerungsluecken zielt. Statt "ist dir
        das Etikett aufgefallen?" fragt der Bogen nach dem Eindruck.
        Begruendung des Nutzers: Nicht-Erinnern hat viele Ursachen, die
        nichts mit der Kennzeichnung zu tun haben. Die harte Exposition
        kommt aus dem Verhalten (war das Etikett im sichtbaren Bereich,
        Verweildauer auf der Vorschlagsansicht), nicht aus dem Kopf.

   Warum die Fragen so und nicht anders: siehe im Vault
   "Agentic Commerce - Fragebogen v2 und freie Aufgabe".

   Die Antworten wandern mit Kennung (z.B. "z_sicher") ins Protokoll
   und in die Tabelle - eine Spalte je Frage, Praefix "f_".
   ================================================================== */

const SKALA_ZUSTIMMUNG = { links: "stimme gar nicht zu", rechts: "stimme voll zu", stufen: 7 };

const FRAGEBOGEN = [
  /* ------------------------------------------------------------------
     1. Diese Buchung
     ------------------------------------------------------------------
     z_sicher ist der wichtigste neue Wert: gegen den objektiven Rang
     der gebuchten Unterkunft gerechnet ergibt er die Ueberschaetzung.
     Wer sicher ist, das Beste zu haben, und auf Platz acht liegt, ist
     der Fall, um den es in der Arbeit geht.

     z_echt bleibt auf ausdruecklichen Wunsch des Nutzers (28.09.2026).
     Nicht als Beweis, sondern als Stuetze: Sagt die Mehrheit, sie
     haette mit eigenem Geld anders entschieden, gehoert das in die
     Limitationen und ins Feld. Siehe Vault, "Limitationen", Punkt 1.
     ------------------------------------------------------------------ */
  {
    titel: "Diese Buchung",
    fragen: [
      { id: "z_zufrieden", text: "Ich bin mit dem Ergebnis zufrieden.", skala: SKALA_ZUSTIMMUNG },
      { id: "z_sicher", text: "Im Angebot gab es nichts, was besser gepasst hätte.", skala: SKALA_ZUSTIMMUNG },
      { id: "z_ausschlag", text: "Was hat bei deiner Wahl den Ausschlag gegeben?", art: "wahl",
        optionen: ["Der Preis", "Die Lage", "Die Bewertungen", "Die Ausstattung", "Die Verpflegung",
          "Der Assistent hat sie empfohlen", "Die Bilder", "Weiß ich nicht"] },
      { id: "z_kontrolle", text: "Ich hatte während der Suche das Gefühl, die Kontrolle zu behalten.", skala: SKALA_ZUSTIMMUNG },
      { id: "z_echt", text: "Mit meinem eigenen Geld hätte ich genauso entschieden.", skala: SKALA_ZUSTIMMUNG },
    ],
  },

  /* ------------------------------------------------------------------
     2. Die Vorschlaege
     ------------------------------------------------------------------
     Der Block gehoert zum Between-Faktor (Kennzeichnung: ohne,
     etikett, text) und wird allen drei Gruppen gestellt. In der Gruppe
     ohne Hinweis ist hohe Zustimmung bei k_bevorzugt keine Falschaussage,
     sondern Projektion - und selbst ein Befund. Deshalb eine Skala und
     kein Ja/Nein: Drei Gruppen vergleichen sich ueber Mittelwerte
     besser als ueber Anteile.
     ------------------------------------------------------------------ */
  {
    titel: "Die Vorschläge",
    fragen: [
      { id: "k_bevorzugt", text: "Ich hatte den Eindruck, dass eine der Unterkünfte von der Plattform bevorzugt gezeigt wurde.", skala: SKALA_ZUSTIMMUNG },
      { id: "k_provision", text: "Voyara verdient an manchen Unterkünften mehr als an anderen.", skala: SKALA_ZUSTIMMUNG },
      { id: "k_fair", text: "Ich finde es in Ordnung, wenn eine Plattform Partnerunterkünfte bevorzugt zeigt.", skala: SKALA_ZUSTIMMUNG },
    ],
  },

  /* ------------------------------------------------------------------
     2b. Warum die Kennzeichnung wirkt - oder sich aufhebt (15.11.2026)
     ------------------------------------------------------------------
     Die Kennzeichnung kann ueber zwei gegenlaeufige Wege wirken. Der
     eine senkt die Buchung: Die Person erkennt die Verkaufsabsicht und
     wertet das Haus ab. Der andere hebt sie: Offenlegung wirkt ehrlich,
     und das Empfohlene abzulehnen fuehlt sich an wie ein
     Misstrauensvorwurf.

     Heben sich beide auf, zeigt die Buchungsquote nichts, obwohl beides
     passiert ist - ein Nullbefund, der keiner waere. Die drei Bloecke
     machen die Wege einzeln sichtbar.

     Alle Aussagen siebenstufig, Reihenfolge innerhalb jedes Blocks
     gemischt (`mischen: true`), Position zwischen Buchung und
     Demografie.

     Keine dieser Aussagen nennt die Provision. Sonst liessen sie sich
     in der Gruppe ohne Kennzeichnung nicht stellen, und fuer den
     Vergleich muessen beide Gruppen dieselben Items bekommen.
     ------------------------------------------------------------------ */
  {
    titel: "Die Auswahl des Assistenten",
    wenn: () => Fragebogen.agentGenutzt(),
    mischen: true,
    fragen: [
      { id: "p_absicht", text: "Der Assistent wollte mich zu einem bestimmten Haus bringen.", skala: SKALA_ZUSTIMMUNG },
      { id: "p_eigeninteresse", text: "Bei der Auswahl ging es dem Assistenten auch um eigene Interessen.", skala: SKALA_ZUSTIMMUNG },
      { id: "p_nachvollzug", text: "Mir war klar, warum der Assistent gerade diese Häuser vorgeschlagen hat.", skala: SKALA_ZUSTIMMUNG, umgekehrt: true },
    ],
  },

  /* ------------------------------------------------------------------
     2c. Wahrgenommene Ehrlichkeit
     ------------------------------------------------------------------
     Zwei Items statt drei, und das ist kein Versehen.

     Der dritte Vorschlag lautete "Der Assistent geht ehrlich mit mir
     um" - und genau dieser Satz steht seit dem 28.09.2026 im
     TiA-Block als `v_ehrlich`, Wort fuer Wort. Dieselbe Aussage zweimal
     im selben Bogen zu stellen, treibt die scheinbare Reliabilitaet der
     Skala hoch, kostet Geduld und laesst offen, welche der beiden
     Messungen in die Auswertung geht.

     Also bleibt er dort stehen, wo er validiert hergeleitet ist. Der
     Index der Ehrlichkeit bildet sich in der Auswertung aus DREI Items:
     `v_ehrlich` plus die beiden hier. Steht so auch im Vault.
     ------------------------------------------------------------------ */
  {
    titel: "Was der Assistent dir sagt",
    wenn: () => Fragebogen.agentGenutzt(),
    mischen: true,
    fragen: [
      { id: "p_nichts_verschwiegen", text: "Ich habe den Eindruck, dass mir der Assistent nichts verschweigt.", skala: SKALA_ZUSTIMMUNG },
      { id: "p_angaben_verlass", text: "Auf die Angaben des Assistenten kann ich mich verlassen.", skala: SKALA_ZUSTIMMUNG },
    ],
  },

  /* ------------------------------------------------------------------
     2d. Unbehagen beim Ablehnen
     ------------------------------------------------------------------
     Der zweite Weg: Wer eine Empfehlung ausschlaegt, widerspricht
     jemandem. Ist das unangenehm, steigt die Buchungsquote des
     empfohlenen Hauses - aus Hoeflichkeit, nicht aus Ueberzeugung.

     Dieser Block setzt voraus, dass die Person ueberhaupt eine
     Empfehlung gehoert hat. Seit dem 15.11.2026 nennt der Agent seinen
     Favoriten im Klartext, also trifft das auf jede Bedingung zu -
     ausser, es kam nie zu einer Vorlage. Dann faellt der Block weg,
     statt nach einem Gefuehl zu fragen, das es nicht geben konnte.
     ------------------------------------------------------------------ */
  {
    titel: "Die Empfehlung",
    wenn: () => Fragebogen.empfehlungGehoert(),
    mischen: true,
    fragen: [
      { id: "p_unbehagen", text: "Ein anderes als das empfohlene Haus zu nehmen, hätte sich unangenehm angefühlt.", skala: SKALA_ZUSTIMMUNG },
      { id: "p_misstrauen", text: "Ich hätte das Gefühl gehabt, dem Assistenten zu misstrauen, wenn ich mich anders entschieden hätte.", skala: SKALA_ZUSTIMMUNG },
      { id: "p_leicht_uebergehen", text: "Es fiel mir leicht, die Empfehlung des Assistenten zu übergehen.", skala: SKALA_ZUSTIMMUNG, umgekehrt: true },
    ],
  },

  /* ------------------------------------------------------------------
     3. Der Assistent
     ------------------------------------------------------------------
     Vier Facetten des TiA: Zuverlaessigkeit/Kompetenz,
     Verstaendlichkeit/Vorhersagbarkeit, Absicht der Betreiber und
     Vertrauen direkt (Koerber selbst weist darauf hin, dass zwei
     direkte Items als Mass des Vertrauens genuegen koennen).
     v_ehrlich kommt dazu, weil die Selbstoffenlegung des Agenten ueber
     Ehrlichkeit wirken soll (Cain, Loewenstein und Moore 2005) - das
     ist der Pfad, auf dem die Text-Bedingung etwas bewegen kann.

     Der Block faellt weg, wenn die Person dem Assistenten nie etwas
     geschrieben hat. Dann hat sie keine Grundlage, ihn zu beurteilen,
     und geraten wird hier nicht.
     ------------------------------------------------------------------ */
  {
    titel: "Der Assistent",
    wenn: () => Fragebogen.agentGenutzt(),
    fragen: [
      { id: "v_zuverlaessig", text: "Der Assistent arbeitet zuverlässig.", skala: SKALA_ZUSTIMMUNG },
      { id: "v_nachvollziehbar", text: "Ich verstehe, wie er zu seinen Vorschlägen kommt.", skala: SKALA_ZUSTIMMUNG },
      { id: "v_interesse", text: "Er handelt in meinem Interesse.", skala: SKALA_ZUSTIMMUNG },
      { id: "v_ehrlich", text: "Er geht ehrlich mit mir um.", skala: SKALA_ZUSTIMMUNG },
      { id: "v_vertrauen", text: "Ich vertraue ihm.", skala: SKALA_ZUSTIMMUNG },
      { id: "v_verlassen", text: "Ich würde mich auf seine Vorschläge verlassen.", skala: SKALA_ZUSTIMMUNG },
    ],
  },

  /* ------------------------------------------------------------------
     4. Aus der Hand geben
     ------------------------------------------------------------------
     d_grenze ist bewusst ein Betrag und keine Skala: "bis 500 Euro"
     ist ein Ergebnis, das man zitieren kann, "stimme eher zu" nicht.
     d_selbst ist umgekehrt gepolt und dient doppelt - als
     Delegationsitem und als Erkennung von Durchklickern, die ueberall
     dasselbe ankreuzen.
     ------------------------------------------------------------------ */
  {
    titel: "Aus der Hand geben",
    fragen: [
      { id: "d_echt", text: "Ich würde einem solchen Assistenten eine echte Buchung überlassen.", skala: SKALA_ZUSTIMMUNG },
      { id: "d_grenze", text: "Bis zu welchem Betrag würdest du ihn allein buchen lassen?", art: "wahl",
        optionen: ["Gar nicht", "Bis 100 €", "Bis 500 €", "Bis 2.000 €", "Egal, wie hoch"] },
      { id: "d_selbst", text: "Ich hätte lieber jede Entscheidung selbst getroffen.", skala: SKALA_ZUSTIMMUNG, umgekehrt: true },
    ],
  },

  /* ------------------------------------------------------------------
     5. Ueberblick
     ------------------------------------------------------------------
     t_log ist keine Meinungsfrage, sondern die Voraussetzung, um die
     Log-Daten zu deuten: Wenn die Haelfte nicht wusste, dass es das
     Log gibt, bedeutet eine niedrige Scrolltiefe etwas anderes als
     Desinteresse.

     m_aufmerksam ist die Aufmerksamkeitskontrolle. Sie schliesst
     niemanden aus (Entscheidung des Nutzers, 28.09.2026: keine
     wertvollen Faelle verlieren), sondern wird berichtet und die
     Auswertung einmal mit und einmal ohne diese Faelle gerechnet.
     `richtig` haelt die erwartete Antwort fest, damit die Auswertung
     sie nicht erraten muss.
     ------------------------------------------------------------------ */
  {
    titel: "Überblick",
    fragen: [
      { id: "t_sichtbar", text: "Ich wusste jederzeit, was der Assistent gerade tut.", skala: SKALA_ZUSTIMMUNG },
      { id: "m_aufmerksam", text: "Diese Frage dient nur der Kontrolle. Bitte wähle hier die Stufe 2.", skala: SKALA_ZUSTIMMUNG, richtig: 2 },
      { id: "t_log", text: "Mir war klar, dass ich im Agenten-Log jeden seiner Schritte nachlesen kann.", skala: SKALA_ZUSTIMMUNG },
      { id: "w_nutzen", text: "Ich würde einen solchen Assistenten beim nächsten Buchen nutzen.", skala: SKALA_ZUSTIMMUNG },
    ],
  },

  /* ------------------------------------------------------------------
     6. Zum Ablauf
     ------------------------------------------------------------------
     m_freigabe ist die einzige verbliebene Erinnerungsfrage, und sie
     ist neutral gestellt ("was durfte er", nicht "weisst du noch").
     Ihr Zweck ist nicht die Stufe - die steht in den Daten - sondern
     der Abgleich: Wer "auch buchen" erlaubt hat und es nicht weiss,
     hat Autonomie vergeben, ohne sie wahrzunehmen.

     m_zweck ersetzt die offene Verdachtsabfrage. Geschlossen mit
     Distraktoren, damit niemand schreiben muss. Wer Antwort 3 waehlt,
     hat die Manipulation erraten und wird in der Auswertung markiert.
     ------------------------------------------------------------------ */
  {
    titel: "Zum Ablauf",
    fragen: [
      { id: "m_freigabe", text: "Was durfte der Assistent am Ende tun?", art: "wahl",
        optionen: ["Suchen und filtern", "Die Buchung vorbereiten", "Auch buchen",
          "Weiß ich nicht", "Ich habe ihn nicht genutzt"] },
      { id: "m_zweck", text: "Was wurde in dieser Studie nach deiner Vermutung untersucht?", art: "wahl",
        optionen: ["Wie Menschen eine Reiseseite bedienen",
          "Ob ein Assistent beim Buchen hilft",
          "Wie Menschen auf Hinweise zu bezahlten Platzierungen reagieren",
          "Wie schnell man eine Buchung abschließt",
          "Weiß ich nicht"] },
      /* Die Manipulationskontrolle (15.11.2026).
         --------------------------------------------------------------
         Beiden Gruppen gestellt, und das ist der Punkt: Die Gruppe ohne
         Kennzeichnung liefert die Falschalarmrate. Sagt dort ein Drittel
         "ja, da war ein Etikett", ist ein Unterschied von zehn Punkten
         in der anderen Gruppe nichts wert.

         "Weiss nicht" steht ausdruecklich dabei. Ohne diese Stufe raten
         die Unsicheren, und Raten verteilt sich auf Ja und Nein - damit
         waere die Falschalarmrate geschoent. */
      { id: "m_etikett", text: "War eines der vorgeschlagenen Häuser besonders gekennzeichnet?", art: "wahl",
        optionen: ["Ja", "Nein", "Weiß nicht"] },
      /* Die Optik, als Robustheitspruefung.
         --------------------------------------------------------------
         Die drei Haeuser sind preisnah und vergleichbar zusammengestellt,
         aber ihre Bilder sind es nicht - die kommen aus dem Katalog. Ist
         die Antwort ueber alle vier Zellen gleich verteilt, ist belegt,
         dass die Bebilderung die Wahl nicht verschoben hat. Ist sie es
         nicht, gehoert das in die Limitationen, und zwar mit Zahl.

         Die Namen kommen aus der Vorlage, stehen also erst zur Laufzeit
         fest. Welche drei es waren und in welcher Reihenfolge sie hier
         standen, notiert `optionenMerken` - sonst ist die gespeicherte
         Zahl (1, 2 oder 3) hinterher nicht zu deuten. */
      { id: "m_optik", text: "Welches der drei Häuser sprach dich rein optisch am meisten an?", art: "wahl",
        wenn: () => Fragebogen.vorlageNamen().length >= 2,
        optionen: () => [...Fragebogen.vorlageNamen(), "Keines besonders"] },
    ],
  },

  /* ------------------------------------------------------------------
     7. Wie du sonst buchst
     ------------------------------------------------------------------
     e_zusaetze ist die Kontrollvariable zur vorausgewaehlten
     Reiseruecktrittsversicherung an der Kasse (49 Euro). Ohne sie ist
     "Versicherung stehen gelassen" nicht deutbar: Wer sie privat immer
     mitbucht, hat nichts uebersehen, sondern seine Gewohnheit
     fortgesetzt. Erst die Verbindung "bucht sie normalerweise nicht,
     hat sie hier aber drin" ist der Befund.

     Bewusst als Liste mit vier Zusaetzen statt als Einzelfrage zur
     Versicherung: So steht die Versicherung nicht im Scheinwerfer, und
     niemand faengt an, sein Verhalten von vorhin zu rechtfertigen.
     ------------------------------------------------------------------ */
  {
    titel: "Wie du sonst buchst",
    fragen: [
      { id: "e_buchen", text: "Wie oft buchst du Reisen im Netz?", art: "wahl",
        optionen: ["Nie", "Seltener als einmal im Jahr", "Ein- bis zweimal im Jahr", "Öfter"] },
      { id: "e_zusaetze", text: "Was buchst du normalerweise mit, wenn du selbst eine Reise buchst?", art: "mehrfach",
        optionen: ["Eine Reiserücktrittsversicherung", "Eine Sitzplatzreservierung", "Zusätzliches Gepäck",
          "Einen Mietwagen", "Nichts davon"] },
      { id: "e_ki", text: "Wie oft nutzt du KI-Assistenten wie ChatGPT?", art: "wahl",
        optionen: ["Nie", "Selten", "Etwa monatlich", "Etwa wöchentlich", "Täglich"] },
      { id: "e_delegiert", text: "Hast du schon einmal eine KI etwas für dich kaufen oder buchen lassen?", art: "wahl",
        optionen: ["Ja", "Nein"] },
    ],
  },

  /* ------------------------------------------------------------------
     8. Zu dir
     ------------------------------------------------------------------
     Beruf und Einkommen auf Wunsch des Nutzers (28.09.2026): uebliche
     Angaben, und als Moderatoren der Partnerhaus-Wahl plausibel. Wichtig
     fuer die Auswertung: Bei etwa 43 Personen je Gruppe bleiben
     Moderatoreffekte auf fuenfstufigen Demografievariablen explorativ,
     so wie die Demografie-Befunde in VERDEA.

     Einkommen als Netto und ueber alle Quellen, weil Brutto in einer
     studentisch gepraegten Stichprobe schlecht trennt.
     ------------------------------------------------------------------ */
  {
    titel: "Zu dir",
    hinweis: "Alle Angaben bleiben anonym.",
    fragen: [
      { id: "p_alter", text: "Alter", art: "zahl", min: 16, max: 99 },
      { id: "p_geschlecht", text: "Geschlecht", art: "wahl",
        optionen: ["Weiblich", "Männlich", "Divers", "Keine Angabe"] },
      { id: "p_taetigkeit", text: "Was machst du hauptsächlich?", art: "wahl",
        optionen: ["Schule, Studium oder Ausbildung", "Angestellt", "Selbständig",
          "Zurzeit nicht berufstätig", "Etwas anderes"] },
      { id: "p_einkommen", text: "Wie viel Geld hast du im Monat zur Verfügung? (netto, alle Quellen zusammen)", art: "wahl",
        optionen: ["Unter 500 €", "500 bis 1.000 €", "1.000 bis 2.000 €", "2.000 bis 3.000 €",
          "Über 3.000 €", "Keine Angabe"] },
      { id: "p_offen", text: "Möchtest du uns noch etwas mitteilen?", art: "text", optional: true },
    ],
  },
];

const Fragebogen = {
  /* Hat die Person dem Assistenten ueberhaupt etwas geschrieben? Nur
     dann wird nach ihm gefragt. Ueber den Kern, weil der den Verlauf
     haelt; im Zweifel (kein Kern erreichbar) wird gefragt. */
  agentGenutzt() {
    const verlauf = (typeof Studie !== "undefined" && Studie.kern?.lauf?.verlauf)
      || (typeof Kern !== "undefined" && Kern.lauf?.verlauf) || null;
    if (!verlauf) return true;
    return verlauf.some((n) => n.rolle === "user");
  },

  /* Hat die Person ueberhaupt eine Empfehlung gehoert? (15.11.2026)
     ------------------------------------------------------------------
     Der Block zum Unbehagen fragt nach einem Gefuehl beim Ablehnen.
     Wer nie eine Vorlage gesehen hat, kann nichts abgelehnt haben, und
     die Antwort waere geraten. Gefragt wird deshalb das Protokoll, nicht
     die Erinnerung. */
  empfehlungGehoert() {
    const prot = (typeof Studie !== "undefined" && Studie.kern?.lauf?.protokoll)
      || (typeof Kern !== "undefined" && Kern.lauf?.protokoll) || null;
    if (!prot) return true;
    return prot.some((e) => e.ereignis === "favorit_genannt" || e.ereignis === "vorschlagsansicht");
  },

  /* Die Namen der vorgelegten Haeuser, in Anzeigereihenfolge.
     Leer, wenn es keine Vorlage gab - dann faellt die Optikfrage weg. */
  vorlageNamen() {
    const lauf = (typeof Studie !== "undefined" && Studie.kern?.lauf)
      || (typeof Kern !== "undefined" && Kern.lauf) || null;
    const prot = lauf?.protokoll || [];
    const letzte = [...prot].reverse().find((e) => e.ereignis === "vorschlagsansicht");
    const ids = letzte?.reihenfolge || letzte?.ids || lauf?.letzteVorlage || [];
    return ids.map((id) => (typeof getItemById === "function" ? getItemById(id)?.name : null) || null).filter(Boolean);
  },

  /* Die Abschnitte, die fuer diese Person gelten. */
  bloecke() {
    return FRAGEBOGEN
      .filter((b) => typeof b.wenn !== "function" || b.wenn())
      .map((b) => (b.mischen ? { ...b, fragen: this.gemischt(b.titel, b.fragen) } : b))
      .map((b) => ({ ...b, fragen: b.fragen.filter((f) => typeof f.wenn !== "function" || f.wenn()) }));
  },

  /* Reihenfolge innerhalb eines Blocks mischen - einmal je Person.
     ------------------------------------------------------------------
     Gemischt wird gegen Reihenfolgeeffekte: Steht "Der Assistent wollte
     mich zu einem bestimmten Haus bringen" immer zuerst, faerbt sie auf
     die beiden danach ab.

     Einmal je Person, nicht bei jedem Zeichnen: Der Bogen wird beim
     Blaettern und nach einem Neuladen neu gebaut, und eine Person, der
     die Fragen zwischendurch die Plaetze tauschen, haelt das fuer einen
     Fehler. Die Ziehung liegt deshalb in sessionStorage.

     Fisher-Yates, nicht sort(() => Math.random() - 0.5): Letzteres ist
     nicht gleichverteilt, und bei drei Items faellt das auf. */
  gemischt(schluessel, fragen) {
    const lager = `voyara_fb_mischung_${schluessel}`;
    let reihe = null;
    try { reihe = JSON.parse(sessionStorage.getItem(lager) || "null"); } catch { reihe = null; }
    const ids = fragen.map((f) => f.id);
    const gueltig = Array.isArray(reihe) && reihe.length === ids.length
      && reihe.every((id) => ids.includes(id));
    if (!gueltig) {
      const neu = [...ids];
      for (let i = neu.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [neu[i], neu[j]] = [neu[j], neu[i]];
      }
      reihe = neu;
      try { sessionStorage.setItem(lager, JSON.stringify(reihe)); } catch { /* egal */ }
    }
    return reihe.map((id) => fragen.find((f) => f.id === id)).filter(Boolean);
  },

  /* Die Optionen einer Frage - fest eingetippt oder zur Laufzeit
     gerechnet. Gebraucht fuer die Optikfrage, deren Antworten die Namen
     der drei vorgelegten Haeuser sind. */
  optionenVon(f) {
    return typeof f.optionen === "function" ? (f.optionen() || []) : (f.optionen || []);
  },

  fragen() {
    return this.bloecke().flatMap((b) => b.fragen);
  },

  /* Baut das HTML fuer eine Liste von Fragen. Pflichtfragen ohne
     Antwort werden beim Absenden markiert; die Pruefung uebernimmt
     `lesen`. */
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
      if (f.art === "mehrfach") {
        return `<div class="fb-frage" data-id="${f.id}">
          <p class="fb-text">${f.text} <span class="fb-optional">mehrere möglich</span></p>
          <div class="fb-wahl">
            ${Fragebogen.optionenVon(f).map((o, i) => `<label><input type="checkbox" name="${f.id}" value="${i + 1}"><span>${o}</span></label>`).join("")}
          </div>
        </div>`;
      }
      if (f.art === "wahl") {
        return `<div class="fb-frage" data-id="${f.id}">
          <p class="fb-text">${f.text}</p>
          <div class="fb-wahl">
            ${Fragebogen.optionenVon(f).map((o, i) => `<label><input type="radio" name="${f.id}" value="${i + 1}"><span>${o}</span></label>`).join("")}
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
     damit die Rohdaten roh bleiben. Mehrfachauswahl kommt als Liste
     der angekreuzten Nummern, aufsteigend, mit Komma getrennt. */
  lesen(form, fragen) {
    const antworten = {};
    const fehlend = [];
    for (const f of fragen) {
      let wert = null;
      if (f.art === "text") wert = form.querySelector(`[name="${f.id}"]`)?.value.trim() || null;
      else if (f.art === "zahl") { const v = form.querySelector(`[name="${f.id}"]`)?.value; wert = v ? +v : null; }
      else if (f.art === "mehrfach") {
        const an = [...form.querySelectorAll(`[name="${f.id}"]:checked`)].map((e) => +e.value).sort((a, b) => a - b);
        wert = an.length ? an.join(",") : null;
      } else {
        const v = form.querySelector(`[name="${f.id}"]:checked`)?.value;
        wert = v == null || v === "" ? null : +v;   // "0" = nicht genutzt, zaehlt als beantwortet
      }
      antworten[f.id] = wert;
      /* Eine Zahl ohne ihre Beschriftung ist nichts wert (15.11.2026).
         --------------------------------------------------------------
         Gespeichert wird bei Wahlfragen der Index (1, 2, 3). Bei festen
         Optionen steht im Code, was die 2 war. Bei der Optikfrage sind
         es die Namen der drei vorgelegten Haeuser - je Person andere,
         und in geloster Reihenfolge. Ohne die Beschriftung waere die 2
         in der Tabelle nicht zu deuten.

         Also wandert sie als eigene Spalte mit: der gewaehlte Name, und
         die ganze Liste, wie sie dastand. */
      if (typeof f.optionen === "function") {
        const liste = this.optionenVon(f);
        antworten[`${f.id}_gewaehlt`] = Number.isFinite(wert) && liste[wert - 1] ? liste[wert - 1] : null;
        antworten[`${f.id}_optionen`] = liste.join(" | ");
      }
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

if (typeof module !== "undefined" && module.exports) module.exports = { FRAGEBOGEN, Fragebogen };
