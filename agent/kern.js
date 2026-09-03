// Ablaufsteuerung des Agenten.
//
// Zwei Aufgaben:
//   1. Einen Auftrag in eine Folge von Werkzeugaufrufen uebersetzen und diese
//      abarbeiten.
//   2. Den Seitenwechsel ueberleben. Die Website ist mehrseitig - jeder Klick
//      auf "Details ansehen" laedt alles neu und baut das Panel neu auf. Ohne
//      Gedaechtnis in sessionStorage waere der Agent danach blank.
//
// Die Schrittfolge kommt vorerst aus einer festen Politik (unten). Spaeter
// liefert das Modell nur die erkannte Absicht, die Folge bleibt hinterlegt -
// siehe AGENT-KONZEPT.md, Abschnitt 8.

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
};

const Kern = {
  SCHLUESSEL: "voyara_agent_lauf",
  MAX_SCHRITTE: 12,

  lauf: null,

  /* ==================================================================
     Gedaechtnis
     ================================================================== */

  leererLauf() {
    return {
      laufId: "r_" + Math.random().toString(36).slice(2, 8),
      status: "leer",          // leer | laufend | wartet_auf_nutzer | angehalten | fertig
      auftrag: "",
      verlauf: [],             // Nachrichten fuer das Panel
      offeneSchritte: [],
      merker: {},              // was der Agent unterwegs erfahren hat
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
    return this.lauf;
  },

  sichern() {
    this.lauf.zeiger = Zeiger.position();
    try {
      sessionStorage.setItem(this.SCHLUESSEL, JSON.stringify(this.lauf));
    } catch { /* Speicher voll oder gesperrt - der Lauf laeuft trotzdem weiter */ }
  },

  zuruecksetzen() {
    this.lauf = this.leererLauf();
    sessionStorage.removeItem(this.SCHLUESSEL);
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
    for (const n of this.lauf.verlauf) AgentPanel.say(n.text, n.rolle, { still: true });

    if (this.lauf.status === "laufend" && this.lauf.offeneSchritte.length) {
      AgentPanel.status("macht weiter…");
      setTimeout(() => this.abarbeiten(), 500);
    } else if (this.lauf.status === "laufend") {
      // Der letzte Schritt hat die Seite gewechselt und war zugleich der
      // letzte des Plans. Der Abschluss steht also noch aus - dort haengt die
      // Autonomiestufe und damit die Rueckfrage vor der Buchung.
      setTimeout(() => this.abschluss(), 500);
    } else if (this.lauf.status === "wartet_auf_nutzer") {
      AgentPanel.status("wartet auf deine Antwort");
    }
  },

  /* ==================================================================
     Sprechen und protokollieren
     ================================================================== */

  sagen(text, rolle = "bot") {
    this.lauf.verlauf.push({ rolle, text, zeit: Date.now() });
    AgentPanel.say(text, rolle);
    this.sichern();
  },

  /* ==================================================================
     Auftrag entgegennehmen
     ================================================================== */

  async auftrag(text) {
    Zeiger.freigeben();
    this.lauf.auftrag = text;
    this.lauf.status = "laufend";
    this.lauf.merker = {};
    this.sagen(text, "user");

    AgentPanel.status("denkt nach…");
    Zeiger.denkt(true);
    await Zeiger.warte(700);
    Zeiger.denkt(false);

    const plan = Politik.planen(text);
    if (!plan.schritte.length) {
      this.lauf.status = "fertig";
      this.sagen("Das habe ich nicht verstanden. Sag mir am besten, wohin es gehen soll und für wie viele Personen.");
      AgentPanel.status("bereit · beobachtet die Seite");
      this.sichern();
      return;
    }

    if (plan.ansage) this.sagen(plan.ansage);
    this.lauf.offeneSchritte = plan.schritte.slice(0, this.MAX_SCHRITTE);
    this.sichern();
    await this.abarbeiten();
  },

  /* ==================================================================
     Schritte abarbeiten
     ================================================================== */

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
      // Spaetere Schritte greifen darauf zu - etwa die Zusammenfassung auf die
      // Bewertungsbilanz.
      if (schritt.merken && ergebnis.daten) this.lauf.merker[schritt.merken] = ergebnis.daten;
      if (ergebnis.text && schritt.melden !== false) this.sagen(ergebnis.text);

      // Ein Schritt, der die Seite wechselt, beendet diesen Durchlauf. Der
      // Rest wird nach dem Laden fortgesetzt.
      if (ergebnis.daten?.navigiert) {
        this.sichern();
        return;   // Sperre bleibt an, bis die neue Seite geladen ist
      }

      this.sichern();
      await Zeiger.warte(260);
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
      case "filterSetzen":       return w.filterSetzen(schritt.args || {});
      case "sortieren":          return w.sortieren(schritt.args?.nach);
      case "ergebnisseLesen":    return w.ergebnisseLesen(schritt.args?.anzahl ?? 5);
      case "unterkunftOeffnen": {
        const id = this.aufloesen(schritt.args?.id);
        const name = (typeof getItemById === "function" ? getItemById(id)?.name : null) || id;
        this.vorher(`Ich öffne ${name}.`);
        return w.unterkunftOeffnen(id);
      }
      case "bewertungenLesen":   return w.bewertungenLesen(this.aufloesen(schritt.args?.id));
      case "merken":             return w.merken(this.aufloesen(schritt.args?.id));
      case "zurBuchung":
        this.vorher("Ich gehe zur Buchung.");
        return w.zurBuchung(this.aufloesen(schritt.args?.id));
      case "buchungAbschliessen":return w.buchungAbschliessen();
      case "antworten":          return { ok: true, text: Politik.formulieren(schritt.args?.was, this.lauf) };
      default:                   return { ok: false, text: `Unbekannter Schritt: ${schritt.werkzeug}` };
    }
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
     ================================================================== */

  async abschluss() {
    this.sperreAus();

    // Die Autonomiestufe entscheidet nur hier, an genau einer Stelle. Damit
    // ist die spaetere Variation zwischen Gruppen eine einzige Zeile.
    const aufBuchungsseite = Werkzeuge.seite() === "checkout";
    if (aufBuchungsseite && STELLSCHRAUBEN.autonomie !== "assistiert") {
      if (STELLSCHRAUBEN.autonomie === "nachfrage") {
        this.lauf.status = "wartet_auf_nutzer";
        this.sagen("Ich bin bei der Buchung angekommen. Soll ich sie abschließen oder möchtest du das selbst machen?");
        AgentPanel.setSuggestions(["Ja, schließ ab", "Ich mache das selbst"]);
        AgentPanel.status("wartet auf deine Antwort");
        this.sichern();
        return;
      }
      if (STELLSCHRAUBEN.autonomie === "autonom") {
        this.sagen("Ich schließe die Buchung jetzt ab. Sag Stopp, wenn du das nicht willst.");
        await Zeiger.warte(2600);
        if (!Zeiger.abbruch) {
          const e = await Werkzeuge.buchungAbschliessen();
          this.sagen(e.text);
        }
      }
    }

    this.lauf.status = "fertig";
    this.lauf.offeneSchritte = [];
    AgentPanel.status("bereit · beobachtet die Seite");
    AgentPanel.setSuggestions(Politik.vorschlaege());
    this.sichern();
  },

  // Antwort auf die Rueckfrage vor der Buchung
  async antwortAufNachfrage(text) {
    const ja = /\b(ja|klar|mach|schlie|buch|ok|okay|gerne)\b/i.test(text);
    this.sagen(text, "user");
    if (ja) {
      this.lauf.status = "laufend";
      this.sperreAn();
      const e = await Werkzeuge.buchungAbschliessen();
      this.sagen(e.text);
      this.sperreAus();
    } else {
      this.sagen("Alles klar, dann überlasse ich dir den letzten Schritt. Ich bleibe hier, falls du noch etwas brauchst.");
    }
    this.lauf.status = "fertig";
    AgentPanel.status("bereit · beobachtet die Seite");
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
    sperre.dataset.hinweis = "Agent arbeitet — klicken, um selbst zu übernehmen";
    sperre.addEventListener("click", () => this.uebernahme());
    document.body.appendChild(sperre);
  },

  sperreAus() {
    document.getElementById("agentSperre")?.remove();
  },

  uebernahme() {
    Zeiger.anhalten();
    this.sperreAus();
    this.lauf.status = "angehalten";
    this.sagen("Angehalten — du hast übernommen. Sag Bescheid, wenn ich weitermachen soll.");
    AgentPanel.status("angehalten · du hast übernommen");
    AgentPanel.setSuggestions(this.lauf.offeneSchritte.length ? ["Mach weiter"] : Politik.vorschlaege());
    this.sichern();
  },

  angehalten() {
    this.sperreAus();
    this.lauf.status = "angehalten";
    AgentPanel.status("angehalten");
    this.sichern();
  },

  async fortsetzen() {
    if (!this.lauf.offeneSchritte.length) {
      this.sagen("Es ist nichts offen. Sag mir einfach, was ich als Nächstes tun soll.");
      return;
    }
    Zeiger.freigeben();
    this.lauf.status = "laufend";
    this.sagen("Mach weiter", "user");
    this.sichern();
    await this.abarbeiten();
  },

  /* ==================================================================
     Eingang aus dem Panel
     ================================================================== */

  async eingabe(text) {
    if (this.lauf.status === "wartet_auf_nutzer") return this.antwortAufNachfrage(text);
    if (/^(mach weiter|weiter)$/i.test(text.trim())) return this.fortsetzen();
    if (/^(stopp?|halt|anhalten)$/i.test(text.trim())) return this.uebernahme();
    return this.auftrag(text);
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Kern, STELLSCHRAUBEN };
