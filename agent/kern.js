// Der Agentenkern: Gedaechtnis, Gespraechsfuehrung, Schrittabarbeitung.
//
// Zwei Aufgaben:
//   1. Einen Auftrag in ein Gespraech und eine Folge von Werkzeugaufrufen
//      uebersetzen und diese abarbeiten.
//   2. Den Seitenwechsel ueberleben. Die Website ist mehrseitig - jeder Klick
//      auf "Details ansehen" laedt alles neu und baut das Panel neu auf. Ohne
//      Gedaechtnis in sessionStorage waere der Agent danach blank.
//
// Der Lauf hat Phasen. Sie sind der Grund, warum der Agent ein Gespraech
// fuehrt und nicht nur eine Schrittfolge abspult:
//
//   eingangsfrage  Erst abstimmen oder direkt suchen? (Selbstselektion)
//   vorfrage       Zeitraum, Gruppe, Budget, eigenes Kriterium
//   arbeitet       Schritte werden ausgefuehrt
//   shortlist      Drei Vorschlaege liegen vor, die Person entscheidet
//   vertieft       Ein Vorschlag ist geoeffnet
//   nachfrage      Rueckfrage vor der Buchung
//   fertig
//
// Jede Phase ist zugleich eine Messstelle: wer stimmt ab, wer laesst
// suchen, wer schaerft nach, wer uebernimmt selbst. Die Uebergaenge landen
// in `lauf.protokoll`.

/* ==================================================================
   Stellschrauben
   Alles, was spaeter eine experimentelle Variable werden koennte, steht
   hier an einer Stelle und nicht im Code verstreut. Diese Tabelle ist
   zugleich die Gespraechsgrundlage mit dem Betreuer.
   ================================================================== */
const STELLSCHRAUBEN = {
  autonomie: "nachfrage",       // assistiert | nachfrage | autonom
  tempo: 1.0,                   // Geschwindigkeit des Zeigers
  fehler: "keine",              // keine | filter | kriterium | behauptung
  begruendung: "ausfuehrlich",  // knapp | ausfuehrlich
  initiative: "abwartend",      // abwartend | vorschlagend
  eingangsfrage: true,          // false = springt ohne Rueckfrage in die Suche
};

/* Gruppenzuweisung ueber die Adresse
   ------------------------------------------------------------------
   Die Werte oben sind Konstanten im Quelltext - fuer eine Studie zu
   unbeweglich: eine Gruppe zuzuweisen hiesse, die Datei zu editieren,
   und jeder Seitenwechsel setzt sie ohnehin zurueck.

   Deshalb duerfen sie einmalig ueber die Adresse gesetzt werden:

     index.html?autonomie=autonom&fehler=filter&eingangsfrage=0

   Die Zuweisung wandert in den sessionStorage und gilt danach fuer die
   ganze Sitzung, ueber alle Seiten hinweg. So bekommt jede teilnehmende
   Person einen Link und behaelt ihre Bedingung, auch wenn sie zwanzigmal
   zwischen Liste und Detailseite wechselt. */
(function stellschraubenAusAdresse() {
  const ERLAUBT = {
    autonomie: ["assistiert", "nachfrage", "autonom"],
    fehler: ["keine", "filter", "kriterium", "behauptung"],
    begruendung: ["knapp", "ausfuehrlich"],
    initiative: ["abwartend", "vorschlagend"],
  };
  const SCHLUESSEL = "voyara_agent_gruppe";
  let gruppe = {};
  try { gruppe = JSON.parse(sessionStorage.getItem(SCHLUESSEL) || "{}"); } catch { gruppe = {}; }

  const p = new URLSearchParams(location.search);
  let neu = false;
  for (const [feld, werte] of Object.entries(ERLAUBT)) {
    const v = p.get(feld);
    // Nur bekannte Werte uebernehmen - ein Tippfehler im Link darf den
    // Agenten nicht in einen undefinierten Zustand bringen.
    if (v && werte.includes(v)) { gruppe[feld] = v; neu = true; }
  }
  for (const feld of ["tempo"]) {
    const v = parseFloat(p.get(feld));
    if (!Number.isNaN(v) && v >= 0.25 && v <= 4) { gruppe[feld] = v; neu = true; }
  }
  for (const feld of ["eingangsfrage"]) {
    const v = p.get(feld);
    if (v === "0" || v === "1") { gruppe[feld] = v === "1"; neu = true; }
  }

  if (neu) { try { sessionStorage.setItem(SCHLUESSEL, JSON.stringify(gruppe)); } catch { /* egal */ } }
  Object.assign(STELLSCHRAUBEN, gruppe);
})();

const Kern = {
  SCHLUESSEL: "voyara_agent_lauf",
  MAX_SCHRITTE: 14,

  lauf: null,

  /* ==================================================================
     Gedaechtnis
     ================================================================== */

  leererLauf() {
    return {
      laufId: "r_" + Math.random().toString(36).slice(2, 8),
      phase: "leer",
      auftrag: "",
      profil: {},              // was der Agent ueber den Wunsch weiss
      vorfragenErledigt: [],
      offeneVorfrage: null,
      verlauf: [],             // Nachrichten fuer das Panel
      offeneSchritte: [],
      merker: {},              // was der Agent unterwegs erfahren hat
      kandidaten: [],          // die Shortlist
      gewaehlt: null,
      runde: 0,                // wie oft wurde nachgeschaerft
      protokoll: [],           // Messpunkte fuer die Auswertung
      zeiger: null,
    };
  },

  laden() {
    try {
      const roh = sessionStorage.getItem(this.SCHLUESSEL);
      this.lauf = roh ? JSON.parse(roh) : this.leererLauf();
    } catch {
      this.lauf = this.leererLauf();
    }
    // Laeufe aus einer Sitzung vor dem Umbau kennen keine Phase
    if (!this.lauf.phase) this.lauf = this.leererLauf();
    return this.lauf;
  },

  sichern() {
    this.lauf.zeiger = Zeiger.position();
    try {
      // `item` ist die Katalogreferenz eines Kandidaten - sie wird beim Laden
      // frisch geholt und muss nicht durch den sessionStorage.
      sessionStorage.setItem(this.SCHLUESSEL,
        JSON.stringify(this.lauf, (k, v) => (k === "item" ? undefined : v)));
    } catch { /* Speicher voll oder gesperrt - der Lauf laeuft trotzdem weiter */ }
  },

  zuruecksetzen() {
    this.lauf = this.leererLauf();
    sessionStorage.removeItem(this.SCHLUESSEL);
  },

  // Messpunkte. Die Studie will wissen, wer abstimmt, wer nachschaerft und
  // wer uebernimmt - deshalb wird jeder Uebergang festgehalten.
  notieren(ereignis, daten = {}) {
    (this.lauf.protokoll ||= []).push({ t: Date.now(), ereignis, ...daten });
  },

  /* ==================================================================
     Start auf jeder Seite
     ================================================================== */

  start() {
    if (this.gestartet) return;   // ein Seitenaufruf, ein Start
    this.gestartet = true;

    this.laden();
    Zeiger.tempo = STELLSCHRAUBEN.tempo;

    // Der Zeiger erscheint dort, wo er vor dem Seitenwechsel stand. Sprang er
    // in die Mitte, waere der Eindruck nach dem ersten Klick zerstoert.
    Zeiger.wiederherstellen(this.lauf.zeiger);

    // Gespraech zurueckschreiben, damit der Faden nicht abreisst. Der Kasten
    // wird vorher geleert, damit das Zurueckschreiben immer dasselbe Ergebnis
    // hat, egal was vorher darin stand.
    const kasten = document.getElementById("agentMessages");
    if (kasten) kasten.innerHTML = "";
    for (const n of this.lauf.verlauf) AgentPanel.say(n.text, n.rolle, { still: true, links: n.links });

    // Erste Seite der Sitzung: begruessen. Das muss hier passieren und nicht
    // im Panel - der Kasten wird eine Zeile darueber geleert, und eine vorher
    // gesetzte Nachricht waere damit weg gewesen.
    if (!this.lauf.verlauf.length) {
      this.sagen("Hallo! Wonach suchst du? Beschreib es einfach — ich suche, filtere und vergleiche für dich.");
      AgentPanel.setSuggestions(Politik.vorschlaege());
    }

    this.kandidatenAuffrischen();

    if (this.lauf.phase === "arbeitet" && this.lauf.offeneSchritte.length) {
      AgentPanel.status("macht weiter…");
      setTimeout(() => this.abarbeiten(), 500);
    } else if (this.lauf.phase === "arbeitet") {
      // Der letzte Schritt hat die Seite gewechselt und war zugleich der
      // letzte des Plans - der Abschluss steht also noch aus.
      setTimeout(() => this.abschluss(), 500);
    } else if (this.lauf.phase === "shortlist") {
      AgentPanel.status("wartet auf deine Wahl");
      AgentPanel.setSuggestions(this.shortlistChips());
      AgentPanel.oeffnen();
    } else if (this.lauf.phase === "vertieft") {
      AgentPanel.status("wartet auf deine Antwort");
      AgentPanel.setSuggestions(["Auf den Merkzettel", "Zur Buchung", "Zurück zur Auswahl"]);
      AgentPanel.oeffnen();
    } else if (["vorfrage", "eingangsfrage", "nachfrage"].includes(this.lauf.phase)) {
      AgentPanel.status("wartet auf deine Antwort");
      AgentPanel.oeffnen();
    }
  },

  // Die Kandidaten verlieren beim Sichern ihre Katalogreferenz - hier wird
  // sie nachgeladen. Faellt ein Objekt weg, faellt der Kandidat weg.
  kandidatenAuffrischen() {
    if (typeof getItemById !== "function") return;
    for (const k of this.lauf.kandidaten || []) if (!k.item) k.item = getItemById(k.id);
    this.lauf.kandidaten = (this.lauf.kandidaten || []).filter((k) => k.item);
  },

  /* ==================================================================
     Sprechen
     ================================================================== */

  // `links` sind anklickbare Verweise unter der Nachricht. Sie wandern mit
  // in den Verlauf, damit sie nach einem Seitenwechsel noch da sind - sonst
  // waere nach dem ersten Klick die halbe Shortlist tot.
  sagen(text, rolle = "bot", links = null) {
    const n = { rolle, text, zeit: Date.now() };
    if (links && links.length) n.links = links;
    this.lauf.verlauf.push(n);
    AgentPanel.say(text, rolle, { links });
    this.sichern();
  },

  // Mehrere Saetze nacheinander, mit Pause dazwischen. Der Unterschied zu
  // einem langen Absatz ist gross: man kann mitlesen, statt eine Wand zu
  // ueberfliegen. Genau das war die Kritik am ersten Entwurf.
  async sagenNacheinander(saetze, pause = 900) {
    for (const [i, s] of saetze.filter(Boolean).entries()) {
      if (i) await Zeiger.warte(pause);
      this.sagen(s);
    }
  },

  // Verweis auf eine Unterkunft - mit Zeitraum und Belegung daran, damit die
  // Detailseite dieselben Daten zeigt wie die Trefferliste. Genau so baut die
  // Ergebnisseite ihre Kartenverweise auch.
  linkZu(id, text) {
    let href = `stay.html?id=${encodeURIComponent(id)}`;
    if (typeof Belegung !== "undefined") href = Belegung.anLink(href);
    if (typeof Reisedaten !== "undefined") href = Reisedaten.anLink(href);
    return { text, href };
  },

  async denkpause(ms = 1100, text = "denkt nach…") {
    AgentPanel.status(text);
    Zeiger.denkt(true);
    await Zeiger.warte(ms);
    Zeiger.denkt(false);
  },

  /* ==================================================================
     Phase 1 - Auftrag und Eingangsfrage
     ================================================================== */

  async auftrag(text) {
    Zeiger.freigeben();
    const alt = this.lauf;
    this.lauf = this.leererLauf();
    this.lauf.verlauf = alt.verlauf;        // das Gespraech bleibt stehen
    this.lauf.protokoll = alt.protokoll || [];

    this.lauf.auftrag = text;
    this.sagen(text, "user");
    this.notieren("auftrag", {
      text,
      // Die Bedingung mitschreiben - ohne sie ist der Lauf spaeter keiner
      // Gruppe zuzuordnen.
      autonomie: STELLSCHRAUBEN.autonomie,
      fehler: STELLSCHRAUBEN.fehler,
      begruendung: STELLSCHRAUBEN.begruendung,
      eingangsfrage: STELLSCHRAUBEN.eingangsfrage,
    });

    await this.denkpause(700);

    const a = Politik.absicht(text);
    this.lauf.profil = {
      typ: a.typ, zielId: a.zielId, monat: a.monat, erwachsene: a.erwachsene,
      kinder: a.kinder, budget: a.budget, maxPreis: a.maxPreis,
      kriterien: a.kriterien || [],
    };

    // Ohne Ziel und ohne erkennbaren Wunsch lohnt keine Rueckfrage nach dem
    // Vorgehen - dann fehlt die Grundlage, und der Agent fragt danach.
    if (!a.zielId && !a.kriterien.length && a.erwachsene == null && !a.budget) {
      this.lauf.phase = "fertig";
      this.sagen("Das habe ich noch nicht ganz. Sag mir am besten, wohin es gehen soll - und wenn du magst, für wie viele Personen.");
      AgentPanel.status("online");
      AgentPanel.setSuggestions(Politik.vorschlaege());
      this.sichern();
      return;
    }

    const verstanden = Politik.ansage(this.lauf.profil);

    if (!STELLSCHRAUBEN.eingangsfrage) {
      if (verstanden) this.sagen(`Verstanden: ${verstanden}.`);
      return this.suchen();
    }

    // Die Eingangsfrage. Sie ist der Kern der Selbstselektion: Wer die
    // Eckdaten abstimmt, gibt dem Agenten mehr Information und bekommt eine
    // andere Interaktion als wer ihn einfach laufen laesst. Beides ist
    // erlaubt, die Wahl wird protokolliert.
    this.lauf.phase = "eingangsfrage";
    await this.sagenNacheinander([
      verstanden ? `Verstanden: ${verstanden}.` : "Verstanden.",
      "Wie möchtest du vorgehen? Ich kann vorher ein paar Eckdaten mit dir durchgehen — oder ich ziehe direkt los und zeige dir, was ich finde.",
    ], 800);
    AgentPanel.setSuggestions(["Eckdaten durchgehen", "Zieh direkt los"]);
    AgentPanel.status("wartet auf deine Antwort");
    AgentPanel.oeffnen();
    this.sichern();
  },

  async antwortEingangsfrage(text) {
    this.sagen(text, "user");
    const direkt = /direkt|einfach|sofort|leg los|zieh los|los ?geht|such einfach|mach du/i.test(text);
    const abstimmen = !direkt
      && /eckdaten|durchgehen|abstimmen|frag|erst|vorher|besprechen|klären|klaeren|ja/i.test(text);

    this.notieren("vorgehen", { gewaehlt: abstimmen ? "abstimmen" : "direkt" });

    if (!abstimmen) {
      await this.denkpause(600);
      this.sagen("Gut, dann schaue ich mich um und melde mich mit einer Auswahl.");
      return this.suchen();
    }

    this.sagen("Gerne. Ein paar kurze Fragen, dann suche ich.");
    await Zeiger.warte(600);
    return this.naechsteVorfrage();
  },

  /* ==================================================================
     Phase 2 - Vorfragen
     ------------------------------------------------------------------
     Einzeln gestellt statt als Formular, und eine Frage faellt aus, wenn
     die Antwort schon im Auftrag stand.
     ================================================================== */

  async naechsteVorfrage() {
    const frage = Politik.naechsteVorfrage(this.lauf.profil, this.lauf.vorfragenErledigt);
    if (!frage) {
      const zusammen = Politik.ansage(this.lauf.profil);
      await this.denkpause(800);
      this.sagen(zusammen ? `Alles notiert: ${zusammen}. Ich suche jetzt.` : "Alles notiert. Ich suche jetzt.");
      return this.suchen();
    }
    this.lauf.phase = "vorfrage";
    this.lauf.offeneVorfrage = frage.id;
    this.sagen(frage.frage);
    AgentPanel.setSuggestions(frage.chips);
    AgentPanel.status("wartet auf deine Antwort");
    AgentPanel.oeffnen();
    this.sichern();
  },

  async antwortVorfrage(text) {
    this.sagen(text, "user");
    const frage = Politik.VORFRAGEN.find((f) => f.id === this.lauf.offeneVorfrage);
    if (!frage) return this.naechsteVorfrage();

    const quittung = frage.auswerten(text, this.lauf.profil);
    this.lauf.vorfragenErledigt.push(frage.id);
    this.notieren("vorfrage", { frage: frage.id, antwort: text });

    await Zeiger.warte(450);
    if (quittung) this.sagen(quittung);
    await Zeiger.warte(500);
    return this.naechsteVorfrage();
  },

  /* ==================================================================
     Phase 3 - Suchen
     ================================================================== */

  async suchen() {
    this.lauf.phase = "arbeitet";
    const schritte = Politik.suchschritte(this.lauf.profil);

    // Detail-, Buchungs- und Merkzettelseite haben keine Suchmaske. Ohne
    // diesen Umweg lief der Agent dort die ganze Schrittfolge ins Leere und
    // meldete am Ende "finde nichts" - obwohl es an der Seite lag, nicht an
    // den Vorgaben.
    if (!Werkzeuge.hatSuchmaske()) {
      schritte.unshift({ werkzeug: "zurStartseite", status: "wechselt zur Suche…" });
    }

    this.lauf.offeneSchritte = schritte.slice(0, this.MAX_SCHRITTE);
    this.notieren("suche_start", { runde: this.lauf.runde });
    this.sichern();
    await this.abarbeiten();
  },

  async abarbeiten() {
    // Zwei gleichzeitig laufende Schleifen wuerden sich gegenseitig die
    // Schritte wegnehmen und einander in die Zeigerbewegung fahren.
    if (this.laeuft) return;
    this.laeuft = true;
    this.sperreAn();

    try {
      await this.schleife();
    } finally {
      this.laeuft = false;
    }
  },

  async schleife() {
    while (this.lauf.offeneSchritte.length) {
      if (Zeiger.abbruch) { this.angehalten(); return; }

      const schritt = this.lauf.offeneSchritte[0];
      AgentPanel.status(schritt.status || "arbeitet…");

      // Der Schritt wird entfernt und gesichert, BEVOR er ausgefuehrt wird.
      // Grund: Ein Klick auf "Details ansehen" startet die Navigation sofort:
      // die Seite wird entladen, noch waehrend die Zeigeranimation ausklingt.
      // Wuerde erst danach gesichert, staende der Schritt nach dem Laden noch
      // offen und wuerde ein zweites Mal versucht - auf einer Seite, die die
      // Trefferliste gar nicht mehr hat.
      this.lauf.offeneSchritte.shift();
      this.sichern();

      let ergebnis;
      try {
        ergebnis = await this.ausfuehren(schritt);
      } catch (fehler) {
        console.error("Agent-Schritt fehlgeschlagen", schritt, fehler);
        ergebnis = { ok: false, text: "Da bin ich hängengeblieben." };
      }

      // Abbruch durch die teilnehmende Person: Der Schritt kommt zurueck in die
      // Warteschlange, damit "Mach weiter" dort ansetzt, wo es aufhoerte.
      if (Zeiger.abbruch) {
        this.lauf.offeneSchritte.unshift(schritt);
        this.angehalten();
        return;
      }

      // Was der Schritt erfahren hat, wird unter seinem Merknamen abgelegt.
      if (schritt.merken && ergebnis.daten) this.lauf.merker[schritt.merken] = ergebnis.daten;
      if (ergebnis.text && schritt.melden !== false) this.sagen(ergebnis.text, "bot", ergebnis.links);

      // Ein Schritt, der die Seite wechselt, beendet diesen Durchlauf. Der
      // Rest wird nach dem Laden fortgesetzt.
      if (ergebnis.daten?.navigiert) {
        this.sichern();
        return;   // Sperre bleibt an, bis die neue Seite geladen ist
      }

      // Der Schritt hat das Gespraech uebernommen (Shortlist, Rueckfrage) -
      // dann endet die Schleife hier, ohne den Abschluss zu durchlaufen.
      if (ergebnis.daten?.uebernimmt) { this.sichern(); return; }

      this.sichern();
      await Zeiger.warte(340);
    }

    await this.abschluss();
  },

  async ausfuehren(schritt) {
    const w = Werkzeuge;
    switch (schritt.werkzeug) {
      case "suchen":
        // Vor der Navigation ansagen, nicht danach - siehe `vorher`
        this.vorher("Ich stelle die Suche ein und schaue nach.");
        return w.suchen(schritt.args || {});
      case "filterSetzen":       return this.filterMelden(await w.filterSetzen(schritt.args || {}));
      case "sortieren":          return w.sortieren(schritt.args?.nach);
      case "ergebnisseLesen":    return this.trefferMelden(await w.ergebnisseLesen(schritt.args?.anzahl ?? 8));
      case "bewertungenSichten": return w.bewertungenSichten(schritt.args?.anzahl ?? 5);
      case "shortlist":          return this.shortlistStellen();
      case "unterkunftOeffnen": {
        const id = this.aufloesen(schritt.args?.id);
        const name = (typeof getItemById === "function" ? getItemById(id)?.name : null) || id;
        this.vorher(schritt.ansage || `Ich öffne ${name}.`);
        return w.unterkunftOeffnen(id);
      }
      case "bewertungenLesen":   return w.bewertungenLesen(this.aufloesen(schritt.args?.id));
      case "merken":             return w.merken(this.aufloesen(schritt.args?.id));
      case "zurStartseite":
        this.vorher("Von hier aus kann ich nicht suchen — ich gehe kurz zurück zur Startseite.");
        return w.zurStartseite();
      case "zurueckZurListe":
        this.vorher("Ich gehe zurück in die Liste.");
        return w.zurueckZurListe();
      case "zurBuchung":
        this.vorher("Ich gehe zur Buchung.");
        return w.zurBuchung(this.aufloesen(schritt.args?.id));
      case "buchungAbschliessen": return w.buchungAbschliessen();
      case "vertiefung":          return this.vertiefungMelden();
      default:                    return { ok: false, text: `Unbekannter Schritt: ${schritt.werkzeug}` };
    }
  },

  /* Zwischenmeldungen mit Zahlen. Ohne sie arbeitet der Agent still vor sich
     hin und man kann ihm nicht folgen - genau das war die Kritik. */

  filterMelden(ergebnis) {
    const z = Werkzeuge.zustand();
    // Wuensche, fuer die es auf dieser Seite keinen Filter gibt, muessen
    // ausgesprochen werden. Ein stillschweigend fallengelassenes Kriterium
    // ist die Fehlerbedingung des Experiments (STELLSCHRAUBEN.fehler) und
    // darf nicht aus Versehen eintreten.
    const gesetzt = new Set(z.aktiveFilter?.ausstattung || []);
    const fehlend = (this.lauf.profil.kriterien || [])
      .map((x) => Politik.kriterium(x.id))
      .filter((k) => k?.filter?.ausstattung && !gesetzt.has(k.filter.ausstattung));
    if (fehlend.length && STELLSCHRAUBEN.fehler !== "kriterium") {
      const namen = Politik.aufzaehlen(fehlend.map((k) => k.label));
      this.lauf.nichtFilterbar = fehlend.map((k) => k.id);
      setTimeout(() => this.sagen(
        `${namen} kann ich hier nicht als Filter setzen — ich gewichte das stattdessen beim Vergleich.`), 400);
    }

    // Das Werkzeug nennt die Trefferzahl teils schon selbst - dann nicht
    // doppelt melden ("noch 4 Treffer Bleiben 4 Haeuser").
    if (ergebnis.ok && z.trefferGesamt != null && !/treffer|häuser/i.test(ergebnis.text || "")) {
      const wohnung = this.lauf.profil?.typ === "apartment";
      const wort = wohnung
        ? (z.trefferGesamt === 1 ? "Wohnung" : "Wohnungen")
        : (z.trefferGesamt === 1 ? "Haus" : "Häuser");
      return { ...ergebnis, text: `${ergebnis.text} Bleiben ${z.trefferGesamt} ${wort}.` };
    }
    return ergebnis;
  },

  trefferMelden(ergebnis) {
    const t = ergebnis.daten?.treffer || [];
    if (!t.length) return ergebnis;
    const preise = t.map((x) => x.preis).filter((x) => x != null);
    // Fuer spaetere Nachschaerfungen: "guenstiger" braucht einen Bezugswert
    this.lauf.profil.letzterPreisschnitt = preise.length
      ? Math.round(preise.reduce((a, b) => a + b, 0) / preise.length) : null;
    const spanne = preise.length ? `${Math.min(...preise)} bis ${Math.max(...preise)} € pro Nacht` : null;
    return { ...ergebnis, text: spanne ? `${t.length} Angebote angesehen, ${spanne}.` : ergebnis.text };
  },

  /* ==================================================================
     Phase 4 - Shortlist
     ------------------------------------------------------------------
     Der Agent legt drei Haeuser vor, statt eines zu oeffnen. Das ist der
     Punkt, an dem die teilnehmende Person eine echte Wahl hat - und der
     Punkt, an dem sie ein eigenes Kriterium nachreichen kann.
     ================================================================== */

  async shortlistStellen() {
    const treffer = this.lauf.merker.treffer?.treffer || Werkzeuge.zustand().treffer || [];
    if (!treffer.length) {
      this.lauf.phase = "shortlist";
      this.lauf.kandidaten = [];
      AgentPanel.setSuggestions(["Preis lockern", "Ausstattung lockern", "Anderes Ziel"]);
      AgentPanel.status("wartet auf deine Antwort");
      this.sperreAus();
      return {
        ok: true,
        daten: { uebernimmt: true },
        text: "Mit diesen Vorgaben finde ich nichts. Sag mir, worauf ich verzichten darf — Preis, Ausstattung oder Lage.",
      };
    }

    await this.denkpause(1200, "wägt ab…");

    const bewertet = Politik.bewerten(treffer, this.lauf.profil);
    this.lauf.kandidaten = bewertet.slice(0, 3);
    this.notieren("shortlist", { runde: this.lauf.runde, ids: this.lauf.kandidaten.map((k) => k.id) });

    // Die Zahl muss zur Liste passen - "Drei kommen in die engere Wahl"
    // ueber zwei Vorschlaegen faellt sofort auf.
    const n = this.lauf.kandidaten.length;
    const zahlwort = { 1: "Einer", 2: "Zwei", 3: "Drei" }[n] || `${n}`;
    const verb = n === 1 ? "kommt" : "kommen";
    this.sagen(this.lauf.runde === 0
      ? `${zahlwort} ${verb} für mich in die engere Wahl:`
      : "So sieht die Auswahl jetzt aus:");

    for (const [i, k] of this.lauf.kandidaten.entries()) {
      await Zeiger.warte(950);
      // Der Verweis macht aus dem Vorschlag ein Angebot statt einer Ansage:
      // wer lieber selbst schaut, klickt hier direkt hinein.
      this.sagen(`${i + 1}. ${Politik.vorschlagssatz(k, this.lauf.profil)}`,
        "bot", [this.linkZu(k.id, k.item.name)]);
    }
    await Zeiger.warte(900);

    // Autonomiestufe: Wer den Agenten autonom laufen laesst, bekommt keine
    // Wahl vorgelegt, sondern eine Entscheidung mitgeteilt. Die Shortlist
    // steht trotzdem im Verlauf - sonst waere die Entscheidung nicht pruefbar.
    if (STELLSCHRAUBEN.autonomie === "autonom") {
      this.sagen(`Ich nehme ${this.lauf.kandidaten[0].item.name} und sehe es mir genauer an.`);
      await this.vertiefen(this.lauf.kandidaten[0].id, { still: true });
      return { ok: true, daten: { uebernimmt: true } };
    }

    this.lauf.phase = "shortlist";
    this.sagen("Welches soll ich mir genauer ansehen? Oder sag mir, was dir noch fehlt — ich suche dann anders.");
    AgentPanel.setSuggestions(this.shortlistChips());
    AgentPanel.status("wartet auf deine Wahl");
    AgentPanel.oeffnen();
    this.sperreAus();
    this.sichern();
    return { ok: true, daten: { uebernimmt: true } };
  },

  // Die Chips bieten die Wahl an und zugleich zwei Nachschaerfungen. Sie sind
  // ein Angebot, kein Zwang - das Eingabefeld bleibt offen.
  shortlistChips() {
    const namen = (this.lauf.kandidaten || [])
      .map((k, i) => `${i + 1}. ${(k.item?.name || "").split(" ").slice(0, 2).join(" ")}`);
    return [...namen, "Etwas günstiger", "Lieber ruhiger"];
  },

  async antwortShortlist(text) {
    this.sagen(text, "user");
    this.kandidatenAuffrischen();

    // Erst pruefen, ob jemand einen der Vorschlaege gewaehlt hat
    const gewaehlt = Politik.auswahlAusText(text, this.lauf.kandidaten);
    if (gewaehlt) {
      this.notieren("auswahl", { id: gewaehlt, runde: this.lauf.runde });
      return this.vertiefen(gewaehlt);
    }

    // Sonst als Nachschaerfung lesen
    const { profil, gemacht } = Politik.nachschaerfung(text, this.lauf.profil);
    if (!gemacht.length) {
      this.sagen("Das konnte ich nicht sicher zuordnen. Nenn mir eine Nummer oder einen Namen — oder sag, was dir fehlt, zum Beispiel günstiger, ruhiger oder näher am Strand.");
      AgentPanel.setSuggestions(this.shortlistChips());
      this.sichern();
      return;
    }

    this.lauf.profil = profil;
    this.lauf.runde += 1;
    this.notieren("nachschaerfung", { text, gemacht, runde: this.lauf.runde });

    await this.denkpause(700);
    this.sagen(`Verstanden: ${Politik.aufzaehlen(gemacht)}. Ich sehe noch einmal nach.`);

    // Auf der Trefferliste reicht neu filtern, sonst muss der Agent erst zurueck
    if (Werkzeuge.seite() !== "results") {
      this.lauf.phase = "arbeitet";
      this.lauf.offeneSchritte = [
        { werkzeug: "zurueckZurListe", status: "geht zurück…" },
        ...Politik.suchschritte(this.lauf.profil).slice(1),
      ];
      this.sichern();
      return this.abarbeiten();
    }
    return this.suchen();
  },

  /* ==================================================================
     Phase 5 - Vertiefen
     ================================================================== */

  async vertiefen(id, { still = false } = {}) {
    this.kandidatenAuffrischen();
    const k = (this.lauf.kandidaten || []).find((x) => x.id === id);
    const name = k?.item?.name || (typeof getItemById === "function" ? getItemById(id)?.name : id);

    this.lauf.phase = "arbeitet";
    this.lauf.gewaehlt = id;

    // Steht das Haus schon offen - etwa weil jemand einem Verweis aus dem
    // Chat gefolgt ist -, darf der Agent es nicht noch einmal oeffnen wollen.
    // Auf der Detailseite gibt es keine Trefferkarte zum Anklicken, und der
    // Versuch endete mit "ist in der Liste gerade nicht sichtbar".
    const schonOffen = Werkzeuge.seite() === "stay"
      && new URLSearchParams(location.search).get("id") === id;
    if (schonOffen && !still) this.sagen(`Gute Wahl, ich sehe mir ${name} genauer an.`);

    this.lauf.offeneSchritte = [
      ...(schonOffen ? [] : [{ werkzeug: "unterkunftOeffnen", status: "öffnet…", args: { id },
        ansage: still ? `Ich öffne ${name}.` : `Gute Wahl, ich sehe mir ${name} genauer an.` }]),
      // melden: false - die Zusammenfassung im naechsten Schritt sagt dasselbe,
      // nur entlang der genannten Kriterien. Beides waere doppelt.
      { werkzeug: "bewertungenLesen", status: "liest Bewertungen…", merken: "bewertungen", melden: false, args: { id } },
      { werkzeug: "vertiefung", status: "fasst zusammen…" },
    ];
    this.sichern();
    return this.abarbeiten();
  },

  // Abschluss auf der Detailseite: was spricht dafuer, was dagegen, wie es
  // weitergeht. Die Zahlen kommen aus den Bewertungsdaten, nicht aus dem
  // Modell - erfundene Prozentwerte waeren in einer Studie fatal.
  vertiefungMelden() {
    const b = this.lauf.merker.bewertungen;
    const item = typeof getItemById === "function" ? getItemById(this.lauf.gewaehlt) : null;
    if (!b || !item) return { ok: true, text: "Ich habe dir das Haus geöffnet. Sieh es dir in Ruhe an." };

    const teile = [`${item.name} im Detail: ${b.anzahl.toLocaleString("de-DE")} Bewertungen ausgewertet.`];

    // Das genannte Kriterium zuerst - es ist der Grund, warum ueberhaupt
    // gefragt wurde. Ohne diesen Rueckbezug waere die Vorfrage Dekoration.
    const genannt = new Set();
    for (const x of (this.lauf.profil.kriterien || []).slice(0, 2)) {
      const k = Politik.kriterium(x.id);
      if (!k) continue;
      const eintrag = (b.bilanz || []).find((a) => a.aspekt === k.label);
      if (eintrag) {
        genannt.add(k.label);
        teile.push(`${k.label}: ${Math.round(eintrag.anteilPositiv * 100)} Prozent der ${eintrag.erwaehnungen} Erwähnungen sind positiv.`);
      }
    }
    // Was sonst noch gelobt wird - ohne zu wiederholen, was gerade dastand
    const uebrig = (b.gelobt || []).filter((g) => !genannt.has(g)).slice(0, 2);
    if (uebrig.length) {
      // "ausserdem" nur, wenn davor schon ein Kriterium stand - sonst
      // verweist das Wort auf nichts.
      const dazu = genannt.size ? "außerdem " : "vor allem ";
      teile.push(`Gelobt ${uebrig.length > 1 ? "werden" : "wird"} ${dazu}${Politik.aufzaehlen(uebrig)}.`);
    }
    if (b.kritisiert?.length) teile.push(`Kritik gibt es bei ${Politik.aufzaehlen(b.kritisiert)}.`);
    teile.push("Soll ich es vormerken, zur Buchung gehen — oder möchtest du zurück zur Auswahl?");

    this.lauf.phase = "vertieft";
    AgentPanel.setSuggestions(["Auf den Merkzettel", "Zur Buchung", "Zurück zur Auswahl"]);
    AgentPanel.status("wartet auf deine Antwort");
    AgentPanel.oeffnen();
    this.sperreAus();
    this.sichern();

    return {
      ok: true,
      daten: { uebernimmt: true },
      text: teile.join(" "),
      links: [{ text: "Merkzettel", href: "merkzettel.html" }],
    };
  },

  async antwortVertieft(text) {
    const t = text.toLowerCase();
    const id = this.lauf.gewaehlt;

    if (/merk|vormerken|merkzettel|speichern/.test(t)) {
      this.sagen(text, "user");
      this.notieren("merken", { id });
      this.lauf.phase = "arbeitet";
      this.lauf.offeneSchritte = [{ werkzeug: "merken", status: "merkt vor…", args: { id } }];
      this.sichern();
      return this.abarbeiten();
    }
    if (/buch|reservier|zur buchung|nehmen/.test(t)) {
      this.sagen(text, "user");
      this.notieren("zur_buchung", { id });
      this.lauf.phase = "arbeitet";
      this.lauf.offeneSchritte = [{ werkzeug: "zurBuchung", status: "öffnet Buchung…", args: { id } }];
      this.sichern();
      return this.abarbeiten();
    }
    if (/zurück|zurueck|auswahl|andere|nochmal|liste/.test(t)) {
      this.sagen(text, "user");
      this.notieren("zurueck_zur_auswahl", { id });
      this.lauf.phase = "arbeitet";
      this.lauf.offeneSchritte = [
        { werkzeug: "zurueckZurListe", status: "geht zurück…" },
        ...Politik.suchschritte(this.lauf.profil).slice(1),
      ];
      this.sichern();
      return this.abarbeiten();
    }

    // Alles andere als Nachschaerfung lesen - antwortShortlist protokolliert
    // die Eingabe selbst und schickt den Agenten zurueck in die Liste.
    return this.antwortShortlist(text);
  },

  // Ansage vor einem Schritt, der die Seite wechselt. Sie muss vorher gesagt
  // und gesichert werden: Sobald der Klick sitzt, wird die Seite entladen und
  // alles, was danach kaeme, ginge verloren. Nebenbei ueberbrueckt die stehende
  // Meldung die Ladezeit - ohne sie entstuende genau dort eine Luecke.
  vorher(text) {
    this.sagen(text);
  },

  // Schritte werden geplant, bevor die Treffer bekannt sind. "$bester" wird
  // deshalb erst beim Ausfuehren gegen das ersetzt, was tatsaechlich oben steht.
  aufloesen(wert) {
    if (wert !== "$bester") return wert;
    const treffer = this.lauf.merker.treffer?.treffer || Werkzeuge.zustand().treffer;
    return treffer?.[0]?.id || null;
  },

  /* ==================================================================
     Abschluss und Autonomiestufe
     ------------------------------------------------------------------
     Die Autonomiestufe greift an genau zwei Stellen: bei der Shortlist
     (oben) und hier vor der Buchung. Damit ist die spaetere Variation
     zwischen Studiengruppen eine Frage von zwei Zeilen.
     ================================================================== */

  async abschluss() {
    this.sperreAus();

    const aufBuchungsseite = Werkzeuge.seite() === "checkout";
    if (aufBuchungsseite && STELLSCHRAUBEN.autonomie !== "assistiert") {
      if (STELLSCHRAUBEN.autonomie === "nachfrage") {
        this.lauf.phase = "nachfrage";
        this.sagen("Ich bin bei der Buchung angekommen. Soll ich sie abschließen oder möchtest du das selbst machen?");
        AgentPanel.setSuggestions(["Ja, schließ ab", "Ich mache das selbst"]);
        AgentPanel.status("wartet auf deine Antwort");
        AgentPanel.oeffnen();
        this.sichern();
        return;
      }
      if (STELLSCHRAUBEN.autonomie === "autonom") {
        this.sagen("Ich schließe die Buchung jetzt ab. Sag Stopp, wenn du das nicht willst.");
        await Zeiger.warte(2600);
        if (!Zeiger.abbruch) {
          const e = await Werkzeuge.buchungAbschliessen();
          this.sagen(e.text);
          if (e.daten?.gebucht) this.notieren("gebucht", { id: this.lauf.gewaehlt, autonom: true });
          if (e.daten?.wartetAufDaten) { this.lauf.phase = "nachfrage"; this.sichern(); return; }
        }
      }
    }

    this.lauf.phase = "fertig";
    this.lauf.offeneSchritte = [];
    AgentPanel.status("online");
    AgentPanel.setSuggestions(this.lauf.kandidaten?.length
      ? ["Zurück zur Auswahl", "Etwas günstiger", "Neue Suche"]
      : Politik.vorschlaege());
    this.sichern();
  },

  // Antwort auf die Rueckfrage vor der Buchung
  async antwortAufNachfrage(text) {
    // Erst die Absage pruefen, dann die Zusage. "Jetzt abschliessen" wurde
    // sonst als Nein gelesen, weil die Wortgrenze vor "schlie" mitten im
    // Wort nicht greift - und ein falsch verstandenes Nein an dieser Stelle
    // ist der teuerste Fehler der ganzen Strecke.
    const nein = /(selbst|selber|\bnein\b|lieber nicht|nicht buchen|ich mach)/i.test(text);
    const ja = !nein && /(^|\s)(ja|klar|okay|ok|gerne|bitte|los)\b|abschlie|schließ|schliess|buch/i.test(text);
    this.sagen(text, "user");
    this.notieren("nachfrage_buchung", { antwort: ja ? "ja" : "nein" });
    if (ja) {
      this.lauf.phase = "arbeitet";
      this.sperreAn();
      const e = await Werkzeuge.buchungAbschliessen();
      this.sagen(e.text);
      this.sperreAus();
      if (e.daten?.gebucht) this.notieren("gebucht", { id: this.lauf.gewaehlt, autonom: false });
      // Es fehlen noch Gastdaten: der Agent bleibt in der Rueckfrage stehen,
      // damit "jetzt" nach dem Ausfuellen wieder hier ankommt.
      if (e.daten?.wartetAufDaten) {
        this.lauf.phase = "nachfrage";
        AgentPanel.setSuggestions(["Jetzt abschließen", "Ich mache das selbst"]);
        AgentPanel.status("wartet auf deine Antwort");
        this.sichern();
        return;
      }
    } else {
      this.sagen("Alles klar, dann überlasse ich dir den letzten Schritt. Ich bleibe hier, falls du noch etwas brauchst.");
    }
    this.lauf.phase = "fertig";
    AgentPanel.status("online");
    AgentPanel.setSuggestions(Politik.vorschlaege());
    this.sichern();
  },

  /* ==================================================================
     Uebernahme durch die teilnehmende Person
     ================================================================== */

  // Waehrend der Agent arbeitet, faengt eine unsichtbare Flaeche Klicks ab.
  // Ein Klick darauf loest nicht die Seite aus, sondern haelt den Agenten an.
  // Das verhindert widerspruechliche Zustaende und liefert gleichzeitig eine
  // saubere Messgroesse: wann uebernimmt jemand?
  sperreAn() {
    if (document.getElementById("agentSperre")) return;
    const sperre = document.createElement("div");
    sperre.id = "agentSperre";
    sperre.dataset.hinweis = "Der Chat arbeitet — klicken, um selbst zu übernehmen";
    sperre.addEventListener("click", () => this.uebernahme());
    document.body.appendChild(sperre);
  },

  sperreAus() {
    document.getElementById("agentSperre")?.remove();
  },

  uebernahme() {
    Zeiger.anhalten();
    this.sperreAus();
    this.lauf.phase = "angehalten";
    this.notieren("uebernahme", { seite: Werkzeuge.seite() });
    this.sagen("Angehalten — du hast übernommen. Sag Bescheid, wenn ich weitermachen soll.");
    AgentPanel.status("angehalten · du hast übernommen");
    AgentPanel.setSuggestions(this.lauf.offeneSchritte.length ? ["Mach weiter"] : Politik.vorschlaege());
    this.sichern();
  },

  angehalten() {
    this.sperreAus();
    this.lauf.phase = "angehalten";
    AgentPanel.status("angehalten");
    this.sichern();
  },

  async fortsetzen() {
    if (!this.lauf.offeneSchritte.length) {
      this.sagen("Es ist nichts offen. Sag mir einfach, was ich als Nächstes tun soll.");
      return;
    }
    Zeiger.freigeben();
    this.lauf.phase = "arbeitet";
    this.sagen("Mach weiter", "user");
    this.sichern();
    await this.abarbeiten();
  },

  /* ==================================================================
     Eingang aus dem Panel
     ------------------------------------------------------------------
     Eine Eingabe bedeutet je nach Phase etwas anderes: "Etwas guenstiger"
     ist in der Shortlist eine Nachschaerfung und ohne laufendes Gespraech
     ein neuer Auftrag.
     ================================================================== */

  // Kurze Absichten, die kein Suchauftrag sind. Ohne sie landeten Begruessung
  // und die Frage nach den Faehigkeiten in derselben Verlegenheitsantwort
  // ("Sag mir, wohin es gehen soll") - der Chat wirkte begriffsstutzig,
  // bevor er ueberhaupt etwas tun konnte.
  kleineAntwort(t) {
    if (/^(hallo|hi|hey|guten (tag|morgen|abend)|moin|servus|na)\b[\s!?.]*$/i.test(t)) {
      return "Hallo! Sag mir einfach, wohin es gehen soll — Ziel, Zeitraum und wie viele Personen reichen mir zum Anfangen.";
    }
    if (/(was kannst du|wie funktionier|was machst du|kannst du mir helfen|hilfe|wobei hilfst)/i.test(t)) {
      return "Ich kann für dich suchen, filtern und sortieren, die Bewertungen auswerten und dir eine Auswahl mit Begründung vorlegen. Bis zur Buchung frage ich vorher nach. Du kannst jederzeit selbst weiterklicken — beschreib einfach, was du suchst.";
    }
    if (/^(danke|dankeschön|merci|passt|alles klar|ok(ay)?)\b[\s!.]*$/i.test(t)) {
      return "Gern. Sag Bescheid, wenn ich weitersuchen soll.";
    }
    return null;
  },

  async eingabe(text) {
    const t = text.trim();
    if (/^(stopp?|halt|anhalten|warte)$/i.test(t)) {
      // Nichts angehalten, wenn nichts lief - sonst behauptet der Chat eine
      // Uebernahme, die es nie gab, und das Protokoll zaehlt sie mit.
      if (this.lauf.phase !== "arbeitet" && !this.laeuft) {
        this.sagen(t, "user");
        this.sagen("Ich arbeite gerade nicht. Sag mir einfach, was ich tun soll.");
        return;
      }
      return this.uebernahme();
    }

    // Nur ausserhalb eines laufenden Gespraechs - mitten in einer Rueckfrage
    // waere "ok" eine Antwort und keine Floskel.
    if (["leer", "fertig", "angehalten"].includes(this.lauf.phase)) {
      const kurz = this.kleineAntwort(t);
      if (kurz) {
        this.sagen(t, "user");
        this.sagen(kurz);
        AgentPanel.setSuggestions(Politik.vorschlaege());
        return;
      }
    }

    if (/^(mach weiter|weiter)$/i.test(t)) return this.fortsetzen();
    if (/^(neue suche|von vorn|neu anfangen)$/i.test(t)) {
      const verlauf = this.lauf.verlauf;
      this.zuruecksetzen();
      this.lauf.verlauf = verlauf;
      this.sagen(t, "user");
      this.sagen("Gut, fangen wir neu an. Wohin soll es gehen?");
      AgentPanel.setSuggestions(Politik.vorschlaege());
      return;
    }

    switch (this.lauf.phase) {
      case "eingangsfrage": return this.antwortEingangsfrage(t);
      case "vorfrage":      return this.antwortVorfrage(t);
      case "shortlist":     return this.antwortShortlist(t);
      case "vertieft":      return this.antwortVertieft(t);
      case "nachfrage":     return this.antwortAufNachfrage(t);
      default:              return this.auftrag(t);
    }
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Kern, STELLSCHRAUBEN };
