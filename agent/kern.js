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
/* ==================================================================
   Freigabestufen
   ------------------------------------------------------------------
   Wie viel der Agent tun darf, entscheidet die teilnehmende Person
   selbst - ueber einen sichtbaren Regler im Chat, jederzeit aenderbar.

   Damit ist der Autonomiegrad keine Manipulation mehr, sondern eine
   abhaengige Variable: Statt Gruppen zuzuweisen und zu schauen, was
   passiert, wird gemessen, wie viel Kontrolle Menschen von sich aus
   abgeben - und wie sich das im Verlauf aendert, etwa nachdem der
   Agent einen Fehler gemacht hat.

   Die Stufen bauen aufeinander auf. Jede schliesst die darunter ein.
   ================================================================== */
const FREIGABE = [
  { id: "vorschlagen", rang: 0, kurz: "Nur vorschlagen",
    lang: "Nur vorschlagen, klicken mache ich selbst" },
  { id: "suchen", rang: 1, kurz: "Suchen und filtern",
    lang: "Suchen und filtern darf er, entscheiden ich" },
  { id: "vorbereiten", rang: 2, kurz: "Buchung vorbereiten",
    lang: "Er darf die Buchung vorbereiten" },
  { id: "buchen", rang: 3, kurz: "Auch buchen",
    lang: "Er darf die Buchung auch abschließen" },
];
const FREIGABE_RANG = Object.fromEntries(FREIGABE.map((f) => [f.id, f.rang]));

const STELLSCHRAUBEN = {
  // Vorbelegung des Reglers. "zufall" teilt die Teilnehmenden in zwei
  // Haelften: die eine startet auf der niedrigsten Stufe, die andere auf
  // der hoechsten. Damit laesst sich messen, wie viele die Voreinstellung
  // einfach stehen lassen - eine Frage mit Gewicht, wenn Anbieter spaeter
  // "darf kaufen" vorbelegen.
  freigabeStart: "zufall",      // niedrig | hoch | zufall
  freigabeRegler: true,         // false = Regler unsichtbar, Stufe fest
  // Unter 1 wird alles langsamer. 0.75 ist die Geschwindigkeit, bei der
  // man dem Zeiger auf der Seite noch folgen kann - und damit die
  // Voraussetzung dafuer, ueberhaupt messen zu koennen, ob jemand
  // zusieht. Als Stellschraube variierbar (?tempo=1.5).
  tempo: 0.75,                  // Geschwindigkeit des Zeigers
  fehler: "keine",              // keine | filter | kriterium | behauptung
  // knapp      = nur der Vorschlag, keine Herleitung
  // ausfuehrlich = Vorschlag mit Zahlen und offengelegter Grundlage
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
    freigabeStart: ["niedrig", "hoch", "zufall"],
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
  for (const feld of ["eingangsfrage", "freigabeRegler"]) {
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
      zielAuswahl: [],         // Ziele, die zu einer genannten Reiseart passen
      freigabe: null,          // was der Agent tun darf - von der Person gewaehlt
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

  /* ==================================================================
     Freigabe
     ================================================================== */

  // Startstufe. Bei "zufall" entscheidet ein Muenzwurf zwischen der
  // niedrigsten und der hoechsten Stufe - und der Wurf wird festgehalten,
  // damit sich spaeter auswerten laesst, wer von wo aus gestartet ist.
  startFreigabe() {
    const s = STELLSCHRAUBEN.freigabeStart;
    if (s === "niedrig") return { stufe: "vorschlagen", gewuerfelt: false };
    if (s === "hoch") return { stufe: "buchen", gewuerfelt: false };
    return { stufe: Math.random() < 0.5 ? "vorschlagen" : "buchen", gewuerfelt: true };
  },

  freigabe() {
    return this.lauf?.freigabe || "suchen";
  },

  // Darf der Agent das? Die Stufen bauen aufeinander auf.
  darf(stufe) {
    return FREIGABE_RANG[this.freigabe()] >= FREIGABE_RANG[stufe];
  },

  // Aenderung durch die teilnehmende Person. `ausloeser` haelt fest, in
  // welcher Lage sie umgestellt hat - vor dem ersten Lauf, nach einem
  // Vorschlag, nach einem entdeckten Fehler. Das ist der Verlauf, um den
  // es geht.
  freigabeSetzen(stufe, ausloeser = "regler") {
    if (!FREIGABE_RANG.hasOwnProperty(stufe)) return;
    const vorher = this.lauf.freigabe;
    if (vorher === stufe) return;
    this.lauf.freigabe = stufe;
    this.notieren("freigabe", {
      von: vorher, nach: stufe,
      richtung: FREIGABE_RANG[stufe] > FREIGABE_RANG[vorher] ? "hoch" : "runter",
      ausloeser, phase: this.lauf.phase, runde: this.lauf.runde,
    });
    this.sichern();
    AgentPanel.freigabeZeigen(stufe);
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
    for (const n of this.lauf.verlauf) {
      // Funktionen ueberleben den sessionStorage nicht - die Ausklapp-
      // Funktion wird beim Zurueckschreiben neu angehaengt.
      const aktionen = (n.aktionen || []).map((a) => a.warumFuer
        ? { text: a.text, ausklappen: () => this.warumText(a.warumFuer) } : a);
      AgentPanel.say(n.text, n.rolle, { still: true, links: n.links, aktionen });
    }

    // Erste Seite der Sitzung: begruessen. Das muss hier passieren und nicht
    // im Panel - der Kasten wird eine Zeile darueber geleert, und eine vorher
    // gesetzte Nachricht waere damit weg gewesen.
    if (!this.lauf.verlauf.length) {
      this.sagen("Hallo! Wonach suchst du? Beschreib es einfach — ich suche, filtere und vergleiche für dich.");
      AgentPanel.setSuggestions(Politik.vorschlaege());
    }

    // Freigabestufe: einmal je Sitzung gewuerfelt, danach ueberdauert sie
    // den Seitenwechsel wie der Rest des Laufs.
    if (!this.lauf.freigabe) {
      const start = this.startFreigabe();
      this.lauf.freigabe = start.stufe;
      this.notieren("freigabe_start", { stufe: start.stufe, gewuerfelt: start.gewuerfelt });
      this.sichern();
    }
    AgentPanel.freigabeAufbauen(FREIGABE, this.lauf.freigabe, (stufe) => this.freigabeSetzen(stufe));

    this.kandidatenAuffrischen();
    AgentPanel.eckdatenZeigen(Politik.eckdaten(this.lauf.profil || {}));
    AgentPanel.ansEnde?.();

    if (this.lauf.phase === "arbeitet" && this.lauf.offeneSchritte.length) {
      AgentPanel.arbeitetAn();
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
    } else if (this.lauf.phase === "zielwahl") {
      AgentPanel.status("wartet auf deine Antwort");
      AgentPanel.setSuggestions(Politik.zielnamen(this.lauf.zielAuswahl || []));
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
  /* Lesepause nach einer Nachricht.
     ------------------------------------------------------------------
     Der Agent war zu schnell. Nachrichten und Schritte folgten so dicht
     aufeinander, dass man ihm nicht folgen konnte - und wer nicht folgen
     kann, schaltet ab und sieht weg. Fuer die Studie waere das fatal:
     Ob jemand zusieht, waehrend der Agent arbeitet, ist eine der
     Groessen, die gemessen werden sollen. Wenn niemand zusehen kann,
     misst man nur, wie schnell das Skript laeuft.

     Deshalb richtet sich die Pause nach der Laenge des Gesagten,
     ungefaehr an einer ruhigen Lesegeschwindigkeit. */
  lesezeit(text) {
    const woerter = String(text).trim().split(/\s+/).length;
    return Math.min(4200, 500 + woerter * 130);
  },

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

  // Formulieren durch das Modell, mit dem eigenen Satz als Rueckfall.
  // modell.js prueft vorher, ob die Antwort nur Zahlen enthaelt, die in
  // den Fakten stehen - sonst wird der eigene Satz genommen.
  async formulieren(fakten, ersatz) {
    if (typeof Modell === "undefined" || !fakten) return ersatz;
    return Modell.formulieren(fakten, ersatz);
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
    // Die Freigabestufe gilt fuer die Sitzung, nicht fuer den einzelnen
    // Auftrag. Wer sie einmal gesenkt hat, will sie nicht bei der
    // naechsten Frage wieder auf dem Ausgangswert vorfinden.
    this.lauf.freigabe = alt.freigabe || null;

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

    // Verstehen uebernimmt das Modell, wenn es erreichbar ist. Was es
    // liefert, wird in modell.js gegen den Katalog geprueft - ein
    // erfundenes Reiseziel faellt weg. Ist die Schnittstelle nicht da,
    // greift die Schluesselwort-Erkennung, und der Lauf geht weiter.
    let a = null;
    if (typeof Modell !== "undefined") a = await Modell.verstehen(text);
    const ausModell = !!a;
    if (!a) a = Politik.absicht(text);

    this.lauf.profil = {
      typ: a.typ, zielId: a.zielId, monat: a.monat, erwachsene: a.erwachsene,
      kinder: a.kinder, budget: a.budget, maxPreis: a.maxPreis,
      kriterien: a.kriterien || [],
    };
    // Fuer die Auswertung: hat das Modell verstanden oder die Ersatzlogik?
    this.notieren("verstanden", { quelle: ausModell ? "modell" : "schluesselwoerter", profil: this.lauf.profil });
    AgentPanel.eckdatenZeigen(Politik.eckdaten(this.lauf.profil));

    // Kein Ort genannt, aber eine Reiseart? Dann nicht nach dem Ortsnamen
    // fragen, sondern die passenden Ziele zur Wahl stellen. "In die Berge"
    // ist ein vollstaendiger Wunsch - die Seite hat Angebote dafuer, sie
    // heissen nur anders.
    if (!this.lauf.profil.zielId) {
      const thema = Politik.themaAusText(text);
      if (thema) {
        this.lauf.profil.thema = thema.id;
        this.lauf.zielAuswahl = thema.ziele;
        this.lauf.phase = "zielwahl";
        const namen = Politik.zielnamen(thema.ziele);
        this.notieren("zielwahl_gestellt", { thema: thema.id, ziele: thema.ziele });
        // Formuliert das Modell. Der Satz unten ist nur der Rueckfall, wenn
        // die Schnittstelle nicht antwortet - nicht die Regelantwort.
        const ersatz = `${thema.label.charAt(0).toUpperCase() + thema.label.slice(1)} — gerne. Dafür habe ich ${Politik.aufzaehlen(namen)}. Wohin soll ich schauen?`;
        this.sagen(await this.formulieren(Politik.faktenZielwahl(text, thema), ersatz));
        AgentPanel.setSuggestions(namen);
        AgentPanel.status("wartet auf deine Antwort");
        AgentPanel.oeffnen();
        this.sichern();
        return;
      }
    }

    // Ein Ort genannt, den es hier nicht gibt. Das ist kein
    // Verstaendnisproblem, sondern eine Luecke im Angebot - und die
    // gehoert benannt, nicht mit "das habe ich nicht ganz verstanden"
    // verdeckt.
    if (!this.lauf.profil.zielId && a.zielRoh) {
      const ersatz = Politik.ersatzziele(a.zielRoh);
      this.lauf.zielAuswahl = ersatz.map((z) => {
        const treffer = ZIELE.find((x) => x.name === z.name);
        return treffer ? treffer.id : null;
      }).filter(Boolean);
      this.lauf.phase = "zielwahl";
      this.notieren("ziel_unbekannt", { genannt: a.zielRoh, angeboten: this.lauf.zielAuswahl });
      const namen = Politik.zielnamen(this.lauf.zielAuswahl);
      const rueckfall = `${a.zielRoh} habe ich nicht im Angebot. Was ich habe: ${Politik.aufzaehlen(namen)}. Passt eines davon?`;
      this.sagen(await this.formulieren(Politik.faktenUnbekanntesZiel(a.zielRoh), rueckfall));
      AgentPanel.setSuggestions(namen);
      AgentPanel.status("wartet auf deine Antwort");
      AgentPanel.oeffnen();
      this.sichern();
      return;
    }

    // Kein Reisewunsch erkennbar. Das heisst nicht, dass nichts gesagt
    // wurde: "wie gehts dir", "was ist das hier", "kannst du auch Flüge"
    // sind Aeusserungen, auf die man antwortet. Frueher stand hier ein
    // fester Satz, und damit war jede Eingabe ausserhalb des Idealpfads
    // eine Sackgasse - der Chat wirkte wie ein Formular mit Fehlermeldung.
    if (!a.zielId && !a.zielRoh && !a.kriterien.length && a.erwachsene == null && !a.budget) {
      return this.plaudern(text);
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
    await this.eingangsfrageStellen(text);
  },

  /* Alles, was kein Suchauftrag ist.
     ------------------------------------------------------------------
     Begruessung, Rueckfrage, Smalltalk, eine Frage zur Seite. Das Modell
     bekommt die letzten Wendungen des Gespraechs mit, damit es sich nicht
     wiederholt, und antwortet in seiner Rolle. Ohne Modell bleibt ein
     Hinweis - besser als nichts, aber sichtbar duenner.

     Das ist bewusst die letzte Station: Alles, was der Agent konkret
     versteht, wird vorher abgefangen. Hier landet nur, was uebrig
     bleibt. */
  async plaudern(text) {
    this.lauf.phase = "fertig";
    const letzte = this.lauf.verlauf.slice(-6).map((n) => `${n.rolle === "user" ? "Person" : "Du"}: ${n.text}`);
    const fakten = {
      lage: "Die Person hat etwas geschrieben, das kein Suchauftrag ist. Antworte darauf. Wenn du im bisherigen Gespraech schon nach dem Reiseziel gefragt hast, frag nicht noch einmal danach - dann reicht deine Antwort allein.",
      wasDiePersonSchrieb: text,
      bisherigesGespraech: letzte,
      wasDuKannst: ["Unterkuenfte suchen", "filtern und sortieren", "Bewertungen auswerten", "eine Auswahl mit Begruendung vorlegen"],
      // Was es auf der Seite gibt, ist mehr als das, was der Agent selbst
      // tut. Ohne diese Unterscheidung behauptete er, es gebe hier keine
      // Fluege - dabei stehen 77 im Katalog, er bucht sie nur nicht.
      wasEsAufDerSeiteGibt: ["Hotels", "Ferienwohnungen", "Mietwagen", "Fluege"],
      wobeiDuNichtHilfst: "Mietwagen und Fluege - die gibt es auf der Seite, aber suchen und buchen muss die Person sie selbst",
      wasDuBrauchst: ["Reiseziel", "ungefaehrer Zeitraum", "wie viele Personen"],
      anzahlZiele: typeof ZIELE !== "undefined" ? ZIELE.length : null,
      freigabestufe: this.freigabe(),
    };
    const ersatz = "Sag mir, wohin es gehen soll, dann suche ich für dich. Zeitraum und Personenzahl helfen mir zusätzlich.";
    this.notieren("geplaudert", { text });
    this.sagen(await this.formulieren(fakten, ersatz));
    AgentPanel.status("online");
    AgentPanel.setSuggestions(Politik.vorschlaege());
    this.sichern();
  },

  async antwortZielwahl(text) {
    this.sagen(text, "user");
    const gesucht = text.toLowerCase();
    const auswahl = this.lauf.zielAuswahl || [];
    // Laengster Name zuerst: "Suedtirol" enthaelt "Tirol", und in der
    // Listenreihenfolge gewaenne sonst das kuerzere Ziel. Genau daran ist
    // die Zielerkennung schon einmal gescheitert.
    const nachLaenge = [...auswahl].sort((a, b) => {
      const n = (id) => (typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[id]?.name.length : 0) || 0;
      return n(b) - n(a);
    });
    let treffer = nachLaenge.find((id) => {
      const name = typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[id]?.name : null;
      return name && gesucht.includes(name.toLowerCase());
    });

    // "Egal" oder "such du aus": der Agent nimmt das erste - und sagt das,
    // statt es stillschweigend zu tun.
    const egal = /egal|such du|entscheide|aussuchen|beliebig|weiß nicht|weiss nicht/.test(gesucht);
    if (!treffer && egal) treffer = auswahl[0];

    if (!treffer) {
      const namen = Politik.zielnamen(auswahl);
      this.sagen(`Das konnte ich nicht zuordnen. Zur Wahl stehen ${Politik.aufzaehlen(namen)} — oder sag "egal", dann suche ich mir eins aus.`);
      AgentPanel.setSuggestions([...namen, "Ist mir egal"]);
      this.sichern();
      return;
    }

    this.lauf.profil.zielId = treffer;
    this.notieren("zielwahl", { gewaehlt: treffer, ausMehreren: auswahl.length, egal });
    const name = typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[treffer]?.name : treffer;
    await Zeiger.warte(400);
    if (egal) this.sagen(`Dann nehme ich ${name}.`);

    // Ab hier der normale Weg: erst die Frage nach dem Vorgehen
    const verstanden = Politik.ansage(this.lauf.profil);
    if (!STELLSCHRAUBEN.eingangsfrage) {
      if (verstanden) this.sagen(`Verstanden: ${verstanden}.`);
      return this.suchen();
    }
    this.lauf.phase = "eingangsfrage";
    await this.eingangsfrageStellen(text);
  },

  // Der Uebergang von "verstanden" zu "wie gehen wir vor". An zwei Stellen
  // gebraucht: direkt nach dem Auftrag und nach der Zielwahl.
  async eingangsfrageStellen(text) {
    const verstanden = Politik.ansage(this.lauf.profil);
    const ersatz = `${verstanden ? `Verstanden: ${verstanden}.` : "Verstanden."} Wie möchtest du vorgehen? Ich kann vorher ein paar Eckdaten mit dir durchgehen — oder ich ziehe direkt los und zeige dir, was ich finde.`;
    this.sagen(await this.formulieren(Politik.faktenAnsage(this.lauf.profil, text), ersatz));
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

    // Kein eigener Satz mehr davor - die Zusage wandert in dieselbe
    // Aeusserung wie die erste Frage. Zwei Nachrichten hintereinander,
    // von denen die erste nichts sagt, wirken wie ein Formular.
    await Zeiger.warte(400);
    return this.naechsteVorfrage("Die Person moechte die Eckdaten durchgehen.");
  },

  /* ==================================================================
     Phase 2 - Vorfragen
     ------------------------------------------------------------------
     Einzeln gestellt statt als Formular, und eine Frage faellt aus, wenn
     die Antwort schon im Auftrag stand.
     ================================================================== */

  // `quittung` ist das, was aus der letzten Antwort verstanden wurde. Sie
  // wandert in dieselbe Aeusserung wie die naechste Frage - ein Mensch
  // sagt "September, notiert. Und wie viele seid ihr?" in einem Zug und
  // nicht in zwei Nachrichten.
  async naechsteVorfrage(quittung) {
    const frage = Politik.naechsteVorfrage(this.lauf.profil, this.lauf.vorfragenErledigt);
    if (!frage) {
      const zusammen = Politik.ansage(this.lauf.profil);
      await this.denkpause(800);
      const ersatz = [quittung, zusammen ? `Alles notiert: ${zusammen}. Ich suche jetzt.` : "Alles notiert. Ich suche jetzt."]
        .filter(Boolean).join(" ");
      this.sagen(await this.formulieren({
        lage: "Sag kurz, dass du jetzt suchst.",
        wasDuVerstandenHast: quittung || null,
        auftrag: zusammen || null,
      }, ersatz));
      return this.suchen();
    }
    this.lauf.phase = "vorfrage";
    this.lauf.offeneVorfrage = frage.id;
    const ersatz = [quittung, frage.frage].filter(Boolean).join(" ");
    this.sagen(await this.formulieren(Politik.faktenVorfrage(frage, quittung, this.lauf.profil), ersatz));
    AgentPanel.setSuggestions(frage.chips);
    AgentPanel.status("wartet auf deine Antwort");
    AgentPanel.oeffnen();
    this.sichern();
  },

  async antwortVorfrage(text) {
    this.sagen(text, "user");
    const frage = Politik.VORFRAGEN.find((f) => f.id === this.lauf.offeneVorfrage);
    if (!frage) return this.naechsteVorfrage();

    const vorher = { ...this.lauf.profil, kriterien: [...(this.lauf.profil.kriterien || [])] };

    // Eine Antwort kann auch etwas korrigieren, das vorher schon gesagt
    // wurde. "Nein, zwei Kinder und zwei Erwachsene" auf die Budgetfrage
    // ist keine Budgetangabe - vorher wurde es als eine verbucht und die
    // Korrektur verschwand. Deshalb erst durch die allgemeine Erkennung,
    // dann durch die Auswertung der offenen Frage.
    Politik.uebernehmen(text, this.lauf.profil);

    const quittung = frage.auswerten(text, this.lauf.profil);
    this.lauf.vorfragenErledigt.push(frage.id);

    // Was sich geaendert hat, wird benannt - auch das, wonach gerade gar
    // nicht gefragt war. Sonst weiss niemand, was der Agent mitgenommen
    // hat und was er ueberhoert hat.
    const geaendert = Politik.aenderungen(vorher, this.lauf.profil);
    this.notieren("vorfrage", { frage: frage.id, antwort: text, geaendert });
    AgentPanel.eckdatenZeigen(Politik.eckdaten(this.lauf.profil));

    await Zeiger.warte(450);
    return this.naechsteVorfrage(geaendert.length ? geaendert.join(", ") : quittung);
  },

  /* ==================================================================
     Phase 3 - Suchen
     ================================================================== */

  async suchen() {
    // Stufe "nur vorschlagen": Der Agent fasst nicht auf die Seite. Er
    // sagt, was er tun wuerde, und ueberlaesst das Klicken der Person.
    // Ohne diese Sperre waere der Regler eine Attrappe.
    if (!this.darf("suchen")) {
      this.lauf.phase = "fertig";
      const ziel = this.lauf.profil.zielId && typeof ZIEL_NACH_ID !== "undefined"
        ? ZIEL_NACH_ID[this.lauf.profil.zielId]?.name : null;
      const ersatz = ziel
        ? `Du hast mir nur das Vorschlagen erlaubt, ich fasse die Seite also nicht an. Ich würde nach ${ziel} suchen${this.lauf.profil.maxPreis ? ` und den Preis auf ${this.lauf.profil.maxPreis} € begrenzen` : ""}. Mach das gern selbst — oder gib mir das Suchen frei, dann übernehme ich.`
        : "Du hast mir nur das Vorschlagen erlaubt. Sag mir, wonach ich schauen soll, dann beschreibe ich dir die Schritte — oder gib mir das Suchen frei.";
      this.notieren("gesperrt", { wollte: "suchen", freigabe: this.freigabe() });
      this.sagen(ersatz);
      AgentPanel.setSuggestions(["Such du", "Ich mache es selbst"]);
      AgentPanel.status("wartet auf deine Antwort");
      AgentPanel.oeffnen();
      this.sichern();
      return;
    }

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
    // Auf dem Handy klappt der Chat zusammen, solange gearbeitet wird -
    // sonst verdeckt er die Seite, auf der man ihn arbeiten sehen soll.
    AgentPanel.arbeitetAn();

    try {
      await this.schleife();
    } finally {
      this.laeuft = false;
      AgentPanel.arbeitetAus();
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
      // Nach einer Meldung so lange warten, wie man zum Lesen braucht.
      // Ohne Meldung reicht eine kurze Pause, damit die Bewegung auf der
      // Seite nicht in einem Ruck passiert.
      await Zeiger.warte(ergebnis.text ? this.lesezeit(ergebnis.text) : 700);
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
    // Bei einem einzigen Treffer stand da "1 Angebote angesehen, 168 bis
    // 168 € pro Nacht" - zweimal falsch in einem Satz.
    const min = preise.length ? Math.min(...preise) : null;
    const max = preise.length ? Math.max(...preise) : null;
    const spanne = preise.length
      ? (min === max ? `${min} € pro Nacht` : `${min} bis ${max} € pro Nacht`)
      : null;
    const wort = t.length === 1 ? "Angebot" : "Angebote";
    return { ...ergebnis, text: spanne ? `${t.length} ${wort} angesehen, ${spanne}.` : ergebnis.text };
  },

  /* ==================================================================
     Phase 4 - Shortlist
     ------------------------------------------------------------------
     Der Agent legt drei Haeuser vor, statt eines zu oeffnen. Das ist der
     Punkt, an dem die teilnehmende Person eine echte Wahl hat - und der
     Punkt, an dem sie ein eigenes Kriterium nachreichen kann.
     ================================================================== */

  async shortlistStellen() {
    // Beide Durchgaenge zusammenfuehren: der erste bringt die
    // bestbewerteten, der zweite die guenstigen. Doppelte fallen weg.
    const roh = [
      ...(this.lauf.merker.treffer?.treffer || []),
      ...(this.lauf.merker.treffer2?.treffer || []),
    ];
    const gesehen = new Set();
    const treffer = roh.filter((x) => (gesehen.has(x.id) ? false : gesehen.add(x.id)));
    if (!treffer.length) treffer.push(...(Werkzeuge.zustand().treffer || []));
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

    // Es gab Treffer, aber keiner haelt die ausdruecklichen Vorgaben ein.
    // Dann wird nichts vorgeschlagen: ein Haus fuer 320 Euro, wenn 300
    // die Grenze war, ist kein Vorschlag, sondern ein Uebergehen.
    if (!bewertet.length) {
      const grenzen = [];
      const p = this.lauf.profil;
      if (p.maxPreis) grenzen.push(`höchstens ${p.maxPreis} € pro Nacht`);
      if (p.maxStrand) grenzen.push(`höchstens ${p.maxStrand} km zum Strand`);
      const personen = (p.erwachsene || 0) + (p.kinder || 0);
      if (personen) grenzen.push(`Platz für ${personen} Personen`);
      this.lauf.phase = "shortlist";
      this.lauf.kandidaten = [];
      this.notieren("keine_treffer", { grund: "vorgaben", grenzen });
      AgentPanel.setSuggestions(["Preis lockern", "Anderes Ziel", "Doch ohne Vorgaben"]);
      AgentPanel.status("wartet auf deine Antwort");
      AgentPanel.oeffnen();
      this.sperreAus();
      return {
        ok: true,
        daten: { uebernimmt: true },
        text: grenzen.length
          ? `Hier gibt es nichts, was ${Politik.aufzaehlen(grenzen)} einhält. Ich schlage dir nichts vor, was deine Vorgaben reißt — sag mir lieber, wo ich nachgeben darf.`
          : "Mit diesen Vorgaben finde ich nichts. Sag mir, worauf ich verzichten darf.",
      };
    }

    const auswahl = Politik.auswaehlen(bewertet, this.lauf.profil);
    this.lauf.kandidaten = auswahl.kandidaten;
    this.lauf.strategie = auswahl.strategie;
    this.notieren("shortlist", {
      runde: this.lauf.runde,
      ids: this.lauf.kandidaten.map((k) => k.id),
      // Fuer die Auswertung: nach welchem Verfahren wurde ausgewaehlt und
      // wie viel hatte die Person bis dahin preisgegeben?
      strategie: auswahl.strategie,
      informationswert: auswahl.informationswert,
    });

    // Die Zahl muss zur Liste passen - "Drei kommen in die engere Wahl"
    // ueber zwei Vorschlaegen faellt sofort auf.
    const n = this.lauf.kandidaten.length;
    const zahlwort = { 1: "Einer", 2: "Zwei", 3: "Drei" }[n] || `${n}`;
    const verb = n === 1 ? "kommt" : "kommen";
    this.sagen(this.lauf.runde === 0
      ? `${zahlwort} ${verb} für mich in die engere Wahl:`
      : "So sieht die Auswahl jetzt aus:");

    for (const [i, k] of this.lauf.kandidaten.entries()) {
      await Zeiger.warte(i === 0 ? 900 : 1600);
      // Der Verweis macht aus dem Vorschlag ein Angebot statt einer Ansage:
      // wer lieber selbst schaut, klickt hier direkt hinein.
      const eigener = Politik.vorschlagssatz(k, this.lauf.profil);
      const satz = await this.formulieren(Politik.faktenVorschlag(k, this.lauf.profil), eigener);
      // Der Verweis fuehrt zum Haus, der Knopf klappt die Begruendung auf.
      // Beide sind freiwillig - und genau deshalb zaehlbar.
      this.lauf.verlauf.push({ rolle: "bot", text: `${i + 1}. ${satz}`, zeit: Date.now(),
        links: [this.linkZu(k.id, k.item.name)],
        aktionen: [{ text: "Warum dieses?", warumFuer: k.id }] });
      AgentPanel.say(`${i + 1}. ${satz}`, "bot", {
        links: [this.linkZu(k.id, k.item.name)],
        aktionen: [{ text: "Warum dieses?", ausklappen: () => this.warumText(k.id) }],
      });
      this.sichern();
    }
    await Zeiger.warte(1500);

    // Offenlegung: worauf beruht diese Reihenfolge? Waehrend der Arbeit
    // meldet der Agent nur knapp, was er tut - beim Ergebnis soll
    // nachvollziehbar sein, warum es dieses Haus ist.
    const grundlage = Politik.grundlage(this.lauf.kandidaten, this.lauf.profil, this.lauf.merker, auswahl);
    if (grundlage) {
      const fakten = Politik.faktenGrundlage(this.lauf.kandidaten, this.lauf.profil, this.lauf.merker, auswahl);
      this.sagen(await this.formulieren(fakten, grundlage));
      await Zeiger.warte(800);
    }

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

  // "Warum dieses Haus?" - die freiwillige Nachfrage nach der Begruendung.
  // Sie wird eigens protokolliert: Wie viele Menschen wollen ueberhaupt
  // wissen, warum eine Maschine so entschieden hat?
  async antwortWarum(text) {
    this.kandidatenAuffrischen();
    const kandidaten = this.lauf.kandidaten || [];
    const gesucht = text.toLowerCase();
    const k = kandidaten.find((x) => gesucht.includes((x.item?.name || "").toLowerCase()))
      || (Werkzeuge.seite() === "stay"
        ? kandidaten.find((x) => x.id === new URLSearchParams(location.search).get("id"))
        : null);
    if (!k) return false;

    this.sagen(text, "user");
    this.notieren("warum_gefragt", { id: k.id, runde: this.lauf.runde, phase: this.lauf.phase });
    await this.denkpause(700);
    const ersatz = Politik.warumSatz(k, kandidaten, this.lauf.profil);
    this.sagen(await this.formulieren(Politik.faktenWarum(k, kandidaten, this.lauf.profil), ersatz));
    AgentPanel.setSuggestions(this.shortlistChips());
    this.sichern();
    return true;
  },

  // Begruendung zu einem Haus, als Text. Erzeugt keine Chatnachricht -
  // sie klappt in der bestehenden auf.
  async warumText(id) {
    this.kandidatenAuffrischen();
    const kandidaten = this.lauf.kandidaten || [];
    const k = kandidaten.find((x) => x.id === id);
    if (!k) return "Dazu habe ich gerade nichts.";
    this.notieren("warum_gefragt", { id, runde: this.lauf.runde, phase: this.lauf.phase });
    this.sichern();
    const ersatz = Politik.warumSatz(k, kandidaten, this.lauf.profil);
    return this.formulieren(Politik.faktenWarum(k, kandidaten, this.lauf.profil), ersatz);
  },

  async antwortShortlist(text) {
    // Erst die Begruendungsfrage abfangen - sonst laese sie sich als
    // Auswahl ("Warum Baan Suan Retreat?" enthaelt den Namen).
    if (/^warum\b/i.test(text.trim()) && await this.antwortWarum(text)) return;

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
    if (/^warum\b/i.test(text.trim()) && await this.antwortWarum(text)) return;
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
      if (!this.darf("vorbereiten")) {
        this.notieren("gesperrt", { wollte: "vorbereiten", freigabe: this.freigabe() });
        this.sagen("Zur Buchung darf ich nicht — du hast mir das nicht freigegeben. Der Knopf ist auf der Seite, oder du hebst die Freigabe an.");
        AgentPanel.setSuggestions(["Freigabe anheben", "Ich mache es selbst"]);
        this.sichern();
        return;
      }
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

    // Die Freigabestufe entscheidet, was hier passiert. Sie ersetzt die
    // frueher fest zugewiesene Autonomiestufe: Nicht die Studienleitung
    // bestimmt, wie weit der Agent gehen darf, sondern die teilnehmende
    // Person - und genau diese Entscheidung ist die Messgroesse.
    const aufBuchungsseite = Werkzeuge.seite() === "checkout";
    if (aufBuchungsseite) {
      if (!this.darf("buchen")) {
        this.lauf.phase = "nachfrage";
        this.sagen("Ich bin bei der Buchung angekommen. Soll ich sie abschließen oder möchtest du das selbst machen?");
        AgentPanel.setSuggestions(["Ja, schließ ab", "Ich mache das selbst"]);
        AgentPanel.status("wartet auf deine Antwort");
        AgentPanel.oeffnen();
        this.sichern();
        return;
      }
      {
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

  async eingabe(text) {
    const t = text.trim();
    // Die Freigabe laesst sich auch im Gespraech aendern, nicht nur ueber
    // den Regler - wer gerade abgewiesen wurde, hat den Knopf vor Augen.
    if (/freigabe anheben|such du|du darfst suchen/i.test(t)) {
      this.sagen(t, "user");
      this.freigabeSetzen("suchen", "gespraech");
      this.sagen("Gut, ich darf jetzt suchen und filtern. Ich lege los.");
      return this.suchen();
    }
    if (/darfst buchen|freigabe.*buchen|buchung freigeben/i.test(t)) {
      this.sagen(t, "user");
      this.freigabeSetzen("buchen", "gespraech");
      this.sagen("Verstanden, ich darf die Buchung abschließen.");
      return;
    }

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

    }

    if (/^(mach weiter|weiter)$/i.test(t)) return this.fortsetzen();
    if (/^(neue suche|von vorn|neu anfangen)$/i.test(t)) {
      const verlauf = this.lauf.verlauf;
      const freigabe = this.lauf.freigabe;
      const protokoll = this.lauf.protokoll;
      this.zuruecksetzen();
      this.lauf.verlauf = verlauf;
      this.lauf.freigabe = freigabe;
      this.lauf.protokoll = protokoll || [];
      this.sagen(t, "user");
      this.sagen("Gut, fangen wir neu an. Wohin soll es gehen?");
      AgentPanel.setSuggestions(Politik.vorschlaege());
      return;
    }

    switch (this.lauf.phase) {
      case "zielwahl":      return this.antwortZielwahl(t);
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
