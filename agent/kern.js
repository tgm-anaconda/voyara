// Der Agentenkern: Gedaechtnis, Gespraechsfuehrung, Werkzeugausfuehrung.
//
// Seit dem 19.09.2026 ein Werkzeug-Agent: Das Modell (api/agent.js) fuehrt
// das Gespraech und entscheidet, wann es welches Werkzeug ruft
// (werkzeugkasten.js). Der Kern haelt das Gedaechtnis ueber Seitenwechsel
// (sessionStorage), fuehrt die Werkzeuge aus, protokolliert die
// Messpunkte fuer die Studie und haelt die Leitplanken: Freigabe,
// Partnerhaus, Zahlenpruefung, Uebernahme durch die Person.
//
// Die Website ist mehrseitig - jeder Klick auf "Details ansehen" laedt
// alles neu. Ein Werkzeug, das die Seite wechselt, hinterlaesst deshalb
// seinen Stand in lauf.ausstehend, und der Kern setzt dort nach dem Laden
// fort (fortsetzenNachLaden).

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
/* Die Freigabestufen.
   ------------------------------------------------------------------
   "Nur vorschlagen" ist am 25.09.2026 weggefallen. Auf dieser Stufe
   durfte der Agent die Seite nicht bedienen: kein Filter, keine Liste,
   kein Rundgang - er redete nur. Damit fehlte genau das, worum es in
   der Erhebung geht (sichtbare Arbeit, Uebergabe von Kontrolle), und
   der Zeiger stand nutzlos in der Ecke. Die unterste Stufe ist jetzt
   "Suchen und filtern": Er arbeitet auf der Seite, entschieden wird
   weiterhin von der Person. */
const FREIGABE = [
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
  tempo: 0.6,                   // Geschwindigkeit des Zeigers (0.75 war zu schnell zum Folgen)
  fehler: "keine",              // keine | filter | kriterium | behauptung
  // knapp      = nur der Vorschlag, keine Herleitung
  // ausfuehrlich = Vorschlag mit Zahlen und offengelegter Grundlage
  begruendung: "ausfuehrlich",  // knapp | ausfuehrlich
  initiative: "abwartend",      // abwartend | vorschlagend
  eingangsfrage: true,
  startbildschirm: true,   // Wahl der Freigabestufe vor dem ersten Kontakt          // false = springt ohne Rueckfrage in die Suche

  /* Aufbau der Erhebung (Stand 18.09.2026), siehe AGENT-KONZEPT Abschnitt 25.
     ------------------------------------------------------------------
     zugang       schublade = der Agent ist zu Beginn unsichtbar und nur
                  ueber einen schmalen Reiter am rechten Rand erreichbar;
                  seitenleiste = die alte, dauerhaft offene Spalte links.
     einladung    Ort des Angebots "Moechtest du den Assistenten nutzen?",
                  das nach dem Ausloeser erscheint, falls der Reiter bis
                  dahin nicht benutzt wurde. keine = kein Angebot.
     einladungAusloeser  detail = beim ersten Oeffnen einer Detailseite;
                  danach greift in jedem Fall die Zeit (Sekunden seit
                  Beginn der Aufgabe) als Ersatz fuer Personen, die nichts
                  oeffnen.
     freigabeFrage  erstoeffnung = die Freigabestufe wird beim ersten
                  Oeffnen des Agenten erfragt, als seine erste Nachricht,
                  ohne Voreinstellung; start = im Einstieg (alt).
     offenlegung  Wie der Agent zu erkennen gibt, dass sein erster
                  Vorschlag ein Partnerhaus ist: etikett (Chip am
                  Vorschlag), log (nur im Agenten-Log, ganz unten), offen
                  (er sagt es selbst, mit Begruendung). Wird je Person
                  ausgelost (studie.js); ueber die Adresse festlegbar.
     partner      Welches zulaessige Haus der Aufgabe das Partnerhaus ist:
                  zweitbeste | beste | wechselnd (eine Aufgabe die beste,
                  die andere die zweitbeste, ausgelost) | keine.
     log          Agenten-Log oben rechts im Kopf der Seite. */
  zugang: "schublade",           // schublade | seitenleiste
  einladung: "unten-rechts",     // unten-rechts | cursor | mitte | liste | keine
  einladungAusloeser: "detail",  // detail | zeit
  einladungSekunden: 60,
  freigabeFrage: "erstoeffnung", // erstoeffnung | start
  offenlegung: null,             // keine | chip | banner | agent | log | null = auslosen
  // Wie die drei Vorschlaege gezeigt werden: eigene Ansicht ueber der Seite
  // oder (alt) als drei Chatnachrichten
  vorschlag: "ansicht",          // ansicht | chat
  partner: "wechselnd",          // zweitbeste | beste | wechselnd | keine
  // Sieht der Agent sich die engere Auswahl vorher sichtbar an (Haus
  // oeffnen, Bewertungen lesen, Zimmer und Verpflegung setzen)? Kostet
  // acht bis zehn Sekunden je Haus und ist der Kern der Fragestellung:
  // ob nachvollziehbare Arbeit das Vertrauen in die Empfehlung aendert.
  rundgang: true,                // true | false
  log: true,
  // Schrittmeldungen ("Filter gesetzt, noch 9 Treffer") im Chat oder nur
  // im Log. Mit Log: nur im Log. Der Chat sagt beim Start einmal, wo man
  // nachsehen kann - ob jemand das tut, ist eine der Messungen.
  prozessImChat: false,
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
    zugang: ["schublade", "seitenleiste"],
    einladung: ["unten-rechts", "unten-links", "cursor", "mitte", "liste", "keine"],
    einladungAusloeser: ["detail", "zeit"],
    freigabeFrage: ["erstoeffnung", "start"],
    offenlegung: ["keine", "chip", "banner", "agent", "etikett", "log", "offen"],
    vorschlag: ["ansicht", "chat"],
    partner: ["zweitbeste", "beste", "wechselnd", "keine"],
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
  {
    const v = parseInt(p.get("einladungSekunden"), 10);
    if (!Number.isNaN(v) && v >= 5 && v <= 600) { gruppe.einladungSekunden = v; neu = true; }
  }
  for (const feld of ["eingangsfrage", "freigabeRegler", "log", "prozessImChat", "rundgang"]) {
    const v = p.get(feld);
    if (v === "0" || v === "1") { gruppe[feld] = v === "1"; neu = true; }
  }

  if (neu) { try { sessionStorage.setItem(SCHLUESSEL, JSON.stringify(gruppe)); } catch { /* egal */ } }
  Object.assign(STELLSCHRAUBEN, gruppe);

  // Schubladen-Zugang so frueh wie moeglich an den Body, damit die alte
  // Seitenleiste nicht erst aufblitzt. Ob die Schublade offen war, weiss
  // der sessionStorage (siehe AgentPanel.umschalten).
  if (typeof document !== "undefined") {
    if (STELLSCHRAUBEN.zugang === "schublade") {
      document.body.classList.add("agent-schublade");
      let offen = null;
      try { offen = sessionStorage.getItem("voyara_chat_offen"); } catch { /* egal */ }
      if (offen === "1") document.body.classList.add("agent-open");
    } else {
      document.body.classList.remove("agent-schublade");
    }
    // Die Seiten tragen die Schubladen-Klasse schon im HTML, damit die
    // Spalte nicht vor dem ersten Zeichnen als Leiste erscheint. Bis
    // hierher sind Uebergaenge aus ("agent-lautlos") - sonst schnellte
    // die geschlossene Schublade beim Laden sichtbar aus dem Bild.
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove("agent-lautlos")));
  }
})();


/* ==================================================================
   Der Kern des Werkzeug-Agenten (seit 19.09.2026)
   ------------------------------------------------------------------
   Das Modell fuehrt das Gespraech und ruft Werkzeuge (werkzeugkasten.js).
   Der Kern haelt das Gedaechtnis ueber Seitenwechsel hinweg, schickt
   jeden Zug ans Modell, fuehrt die Werkzeugaufrufe aus, protokolliert
   fuer die Studie und haelt die Leitplanken: Freigabe, Partnerhaus,
   Zahlenpruefung, Uebernahme durch die Person.

   lauf.gespraech ist das Gespraech im Format der Schnittstelle (user,
   assistant mit tool_calls, tool). lauf.verlauf ist, was im Panel steht.
   ================================================================== */
const Kern = {
  SCHLUESSEL: "voyara_agent_lauf",
  MAX_ZUEGE: 8,             // Modellaufrufe je Nachricht der Person
  MAX_GESPRAECH: 48,        // Nachrichten, die ans Modell gehen (aeltere fallen weg)
  lauf: null,
  laeuft: false,

  /* ==================================================================
     Gedaechtnis
     ================================================================== */
  leererLauf() {
    return {
      laufId: "r_" + Math.random().toString(36).slice(2, 8),
      phase: "leer",           // leer | gespraech | arbeitet | angehalten | fertig
      profil: {},              // der Stand, den das Modell mit stand_merken pflegt
      verlauf: [],             // Nachrichten fuer das Panel
      gespraech: [],           // Nachrichten fuer das Modell
      ausstehend: null,        // Werkzeugaufrufe, die ueber einen Seitenwechsel laufen
      letzteTreffer: [],       // ids des letzten Suchergebnisses
      letzteVorlage: [],       // ids der zuletzt vorgelegten Haeuser
      kandidaten: [],          // vorgelegte Haeuser mit Belegen (fuer "Warum dieses?")
      besprochen: {},          // Themen des Fahrplans, die gefragt und beantwortet sind
      gefragt: null,           // Thema, das der Agent zuletzt gefragt hat
      gesuchtMit: null,        // Eckdaten-Schluessel der letzten Suche
      vorgehenFuer: null,      // Eckdaten + Vorgehen, fuer die schon gesucht wurde
      vorlageFuer: null,       // Vorgaben, fuer die zuletzt vorgelegt wurde
      rundgang: null,          // laufender Rundgang durch die engere Auswahl
      rundgangFuer: null,      // Vorgaben, fuer die schon ein Rundgang lief
      gelesen: {},             // Haeuser, deren Bewertungen gelesen wurden
      gefragtWie: {},          // wie oft ein Thema schon gefragt wurde
      ueberblickGezeigt: false,
      abschlussFaellig: false,
      gewaehlt: null,
      freigabe: null,
      runde: 0,
      protokoll: [],           // Messpunkte fuer die Auswertung
      log: [],
      kosten: { aufrufe: 0, eingabe: 0, zwischengespeichert: 0, ausgabe: 0, euro: 0 },
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
    if (!this.lauf.phase || !Array.isArray(this.lauf.gespraech)) this.lauf = this.leererLauf();
    return this.lauf;
  },

  sichern() {
    this.lauf.zeiger = Zeiger.position();
    try {
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
  startFreigabe() {
    const s = STELLSCHRAUBEN.freigabeStart;
    if (s === "niedrig") return { stufe: "suchen", gewuerfelt: false };
    if (s === "hoch") return { stufe: "buchen", gewuerfelt: false };
    return { stufe: Math.random() < 0.5 ? "suchen" : "buchen", gewuerfelt: true };
  },

  freigabeStartSetzen(stufe, messung = {}) {
    if (!FREIGABE_RANG.hasOwnProperty(stufe)) return;
    this.lauf.freigabe = stufe;
    this.lauf.freigabeGewaehlt = true;
    this.notieren("freigabe_start", { stufe, ...messung });
    this.sichern();
    AgentPanel.freigabeZeigen(stufe);
  },

  /* Freigabe beim ersten Oeffnen: die erste Nachricht des Agenten ist
     die Frage, wie weit er gehen darf. Vier Stufen, keine vorausgewaehlt,
     kein Eingabefeld, bis gewaehlt ist. Danach die Begruessung. */
  freigabeFragen() {
    if (this.lauf.freigabeGewaehlt) return;
    const box = document.getElementById("agentMessages");
    if (!box || document.getElementById("freigabeKarte")) return;

    const gezeigt = Date.now();
    const el = document.createElement("div");
    el.className = "msg bot freigabe-karte neu";
    el.id = "freigabeKarte";
    const frage = document.createElement("p");
    frage.innerHTML = "Hallo! Bevor ich loslege: <strong>Wie weit darf ich für dich gehen?</strong> Du kannst das jederzeit ändern.";
    el.appendChild(frage);
    const liste = document.createElement("div");
    liste.className = "freigabe-karte-optionen";
    for (const s of FREIGABE) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.stufe = s.id;
      const k = document.createElement("b"); k.textContent = s.kurz;
      const l = document.createElement("span"); l.textContent = s.lang;
      b.append(k, l);
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const messung = { quelle: "erstoeffnung", bedenkzeitMs: Date.now() - gezeigt };
        el.remove();
        document.body.classList.remove("agent-ohne-freigabe");
        this.freigabeStartSetzen(s.id, messung);
        if (typeof Studie !== "undefined") Studie.freigabeGewaehlt?.(s.id, messung);
        this.begruessen();
        document.getElementById("agentInput")?.focus({ preventScroll: true });
      });
      liste.appendChild(b);
    }
    el.appendChild(liste);
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
    document.body.classList.add("agent-ohne-freigabe");
    this.notieren("freigabe_gefragt", { quelle: "erstoeffnung" });
    this.sichern();
  },

  // Die Begruessung ist fest - sie kostet keinen Modellaufruf und steht
  // vor dem ersten Wort der Person ohnehin ohne Zusammenhang.
  begruessen() {
    if (this.lauf.verlauf.length) return;
    this.sagen("Wonach suchst du? Erzähl mir einfach, was du vorhast, dann finde ich das Passende.");
    AgentPanel.setSuggestions(Politik.vorschlaege());
    this.lauf.phase = "gespraech";
    this.sichern();
    AgentPanel.ansEnde?.();
  },

  neuerDurchlauf() {
    const freigabe = this.lauf.freigabe;
    const gewaehlt = !!this.lauf.freigabeGewaehlt;
    const durchlauf = (this.lauf.durchlauf || 0) + 1;
    const kosten = this.lauf.kosten;
    this.lauf = this.leererLauf();
    this.lauf.freigabe = freigabe;
    this.lauf.freigabeGewaehlt = gewaehlt;
    this.lauf.durchlauf = durchlauf;
    this.lauf.kostenVorher = kosten;
    this.sichern();
    Zeiger.verbergen?.();
    const kasten = document.getElementById("agentMessages");
    if (kasten) kasten.innerHTML = "";
    AgentPanel.eckdatenZeigen([]);
    if (gewaehlt) {
      this.sagen("Neue Reise? Sag mir, wonach du diesmal suchst, ich fange bei null an.");
      AgentPanel.setSuggestions(Politik.vorschlaege());
      this.lauf.phase = "gespraech";
      this.sichern();
    }
    AgentPanel.status("online");
    if (typeof Log !== "undefined") Log.leeren();
  },

  freigabe() {
    return this.lauf?.freigabe || "suchen";
  },

  darf(stufe) {
    return FREIGABE_RANG[this.freigabe()] >= FREIGABE_RANG[stufe];
  },

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

  notieren(ereignis, daten = {}) {
    (this.lauf.protokoll ||= []).push({ t: Date.now(), ereignis, ...daten });
  },

  logZeile(text, art = "schritt") {
    if (!text) return;
    if (typeof Log !== "undefined" && Log.zeile) Log.zeile(text, art);
    else (this.lauf.log ||= []).push({ t: Date.now(), text, art });
  },

  /* ==================================================================
     Start auf jeder Seite
     ================================================================== */
  start() {
    if (this.gestartet) return;
    this.gestartet = true;
    this.laden();
    Zeiger.tempo = STELLSCHRAUBEN.tempo;
    Zeiger.mount?.();
    if (this.lauf.ausstehend) Zeiger.wiederherstellen(this.lauf.zeiger);
    else if (this.lauf.zeiger) Zeiger.setzePosition?.(this.lauf.zeiger.x, this.lauf.zeiger.y);

    const kasten = document.getElementById("agentMessages");
    if (kasten) kasten.innerHTML = "";
    for (const n of this.lauf.verlauf) {
      const aktionen = (n.aktionen || []).map((a) => a.warumFuer
        ? { text: a.text, ausklappen: () => this.warumText(a.warumFuer) }
        : (a.vorschlaegeZeigen ? { text: a.text, tun: () => this.vorschlaegeNochmal("verlauf") } : a));
      AgentPanel.say(n.text, n.rolle, { still: true, links: n.links, aktionen, etikett: n.etikett || null });
    }

    const erstoeffnung = STELLSCHRAUBEN.freigabeFrage === "erstoeffnung";
    if (!this.lauf.verlauf.length && (!erstoeffnung || this.lauf.freigabeGewaehlt)) this.begruessen();

    if (!this.lauf.freigabe) {
      this.lauf.freigabe = FREIGABE[0].id;
      this.sichern();
    }

    if (!this.lauf.freigabeGewaehlt) {
      if (typeof Studie !== "undefined") {
        Studie.start(this);
      } else if (erstoeffnung) {
        // Die Frage kommt beim ersten Oeffnen (Zugang)
      } else if (STELLSCHRAUBEN.startbildschirm && typeof Startbildschirm !== "undefined" && !Startbildschirm.erledigt()) {
        Startbildschirm.zeigen(FREIGABE, (stufe, messung) => this.freigabeStartSetzen(stufe, { quelle: "startbildschirm", ...messung }));
      } else {
        const start = this.startFreigabe();
        this.freigabeStartSetzen(start.stufe, { quelle: start.gewuerfelt ? "zufall" : "vorgabe" });
      }
    } else if (typeof Studie !== "undefined") {
      Studie.start(this);
    }
    AgentPanel.freigabeAufbauen(FREIGABE, this.lauf.freigabe, (stufe) => this.freigabeSetzen(stufe));
    document.body.classList.toggle("agent-ohne-freigabe", erstoeffnung && !this.lauf.freigabeGewaehlt);

    // Pruefstand (nur wenn ausdruecklich gestartet): spielt feste Gespraeche
    // gegen den echten Agenten und zaehlt, wie oft die Leitplanken greifen
    if (sessionStorage.getItem("voyara_pruefstand")) {
      if (typeof Pruefstand === "undefined") {
        const el = document.createElement("script");
        el.src = "agent/pruefstand.js?v=" + Date.now();
        el.onload = () => Pruefstand.anbinden(this);
        document.head.appendChild(el);
      } else {
        Pruefstand.anbinden(this);
      }
    }
    if (typeof Zugang !== "undefined") Zugang.anbinden(this);
    if (typeof Log !== "undefined") Log.anbinden(this);
    if (erstoeffnung && !this.lauf.freigabeGewaehlt && typeof Zugang !== "undefined" && Zugang.istOffen()) {
      this.freigabeFragen();
    }

    this.kandidatenAuffrischen();
    this.standAnzeigen();
    if (this.lauf.chips?.length && !this.lauf.ausstehend) AgentPanel.setSuggestions(this.lauf.chips);
    AgentPanel.ansEnde?.();

    // Ein Werkzeug hatte die Seite gewechselt: dort weitermachen
    if (this.lauf.ausstehend) {
      AgentPanel.arbeitetAn();
      AgentPanel.status("macht weiter…");
      setTimeout(() => this.fortsetzenNachLaden(), 600);
    } else if (this.lauf.phase === "gespraech" && this.lauf.verlauf.length) {
      AgentPanel.status("online");
    }
  },

  kandidatenAuffrischen() {
    if (typeof getItemById !== "function") return;
    for (const k of this.lauf.kandidaten || []) if (!k.item) k.item = getItemById(k.id);
    this.lauf.kandidaten = (this.lauf.kandidaten || []).filter((k) => k.item);
  },

  /* ==================================================================
     Sprechen und Stand
     ================================================================== */
  sagen(text, rolle = "bot", links = null, extra = null) {
    const n = { rolle, text, zeit: Date.now() };
    if (links && links.length) n.links = links;
    // Wer den Satz geschrieben hat. Saetze des Kerns (Lage, Buchungsansage,
    // Rundgangsmeldung) sind gewollt lang und stehen mit festen Zahlen da;
    // Saetze des Modells sind die, die danebengehen koennen. Der Pruefstand
    // bewertet nur die zweiten.
    if (extra) Object.assign(n, extra);
    this.lauf.verlauf.push(n);
    AgentPanel.say(text, rolle, { links });
    this.sichern();
  },

  /* Der Link auf eine Hausseite - mit der gesuchten Reise daran.
     ------------------------------------------------------------------
     Reisedaten.anLink liest aus der Adresse der aktuellen Seite. Steht
     die Suche dort nicht mehr (etwa weil man ueber den Brotkrumenpfad
     zur Liste zurueckgekommen ist), fehlten Monat und Dauer: Die Karte
     sagte "507 Euro, 4 Naechte", die Hausseite rechnete mit sieben und
     zeigte 1.225 Euro. Deshalb springt der Stand ein. */
  linkZu(id, text) {
    let href = `stay.html?id=${encodeURIComponent(id)}`;
    if (typeof Belegung !== "undefined") href = Belegung.anLink(href);
    if (typeof Reisedaten !== "undefined") href = Reisedaten.anLink(href);
    const p = this.lauf.profil || {};
    if (!/[?&](from|flex)=/.test(href)) {
      if (p.von && p.bis) href += `&from=${p.von}&to=${p.bis}`;
      else if (typeof Werkzeugkasten !== "undefined") {
        const f = Werkzeugkasten.flexWahl(p);
        if (f) href += `&flex=1&monat=${f.monat}&nights=${f.naechte}`;
      }
    }
    return { text, href };
  },

  standAnzeigen() {
    if (typeof Politik !== "undefined") AgentPanel.eckdatenZeigen(Politik.eckdaten(this.lauf.profil || {}));
  },

  // Der Stand als Text fuer das Modell
  standKurz() {
    const p = this.lauf.profil || {};
    const teile = [];
    if (p.zielId && typeof ZIEL_NACH_ID !== "undefined") teile.push(`Ziel ${ZIEL_NACH_ID[p.zielId]?.name}`);
    else if (p.richtung && typeof Politik !== "undefined") teile.push(`Ziel offen, Richtung ${(Politik.THEMEN || []).find((x) => x.id === p.richtung)?.label || p.richtung} (${(p.zieleErlaubt || []).map((id) => ZIEL_NACH_ID?.[id]?.name || id).join(", ")})`);
    else if (p.zielOffen) teile.push("Ziel offen (alle Regionen)");
    if (p.monat && typeof Politik !== "undefined") {
      const name = Object.keys(Politik.MONATE).find((m) => Politik.MONATE[m] === p.monat && m.length > 3);
      if (name) teile.push(`Monat ${name}`);
    }
    if (p.von && p.bis) teile.push(`${p.von} bis ${p.bis}`);
    else if (p.flexibel) teile.push(`Daten flexibel im Monat${p.anreise ? `, Anreise ${p.anreise}` : " (Anreisetag noch offen)"}`);
    if (p.naechte) teile.push(`${p.naechte} Nächte`);
    if (p.personen != null && p.erwachsene == null) teile.push(`${p.personen} Personen (Aufteilung Erwachsene/Kinder noch offen)`);
    if (p.erwachsene != null) teile.push(`${p.erwachsene} Erwachsene`);
    if (p.kinder != null) teile.push(p.kinder ? `${p.kinder} ${p.kinder === 1 ? "Kind" : "Kinder"}${p.kinderAlter?.length ? ` (${p.kinderAlter.join(", ")} Jahre)` : ""}` : "keine Kinder");
    if (p.artGenannt) teile.push(p.typ === "apartment" ? "Ferienwohnung" : "Hotel");
    else if (p.artEgal) teile.push("Art nicht festgelegt (Hotels zuerst)");
    if (p.vorgehen) teile.push(p.vorgehen === "top3" ? "Vorgehen: drei Favoriten" : "Vorgehen: schaut selbst");
    if (p.zimmer) teile.push(`${p.zimmer} Zimmer`);
    if (p.budgetGesamt) teile.push(`Budget ${p.budgetGesamt} € gesamt (${p.maxPreis ? `bis ${p.maxPreis} €/Nacht` : ""})`);
    else if (p.maxPreis) teile.push(`bis ${p.maxPreis} €/Nacht`);
    if (p.maxStrand != null) teile.push(`Strand bis ${Math.round(p.maxStrand * 1000)} m`);
    if (p.mindestbewertung) teile.push(`Note ab ${p.mindestbewertung}`);
    if (p.mindestSterne) teile.push(`ab ${p.mindestSterne} Sterne`);
    const egal = [p.preisEgal && "Preis", p.bewertungEgal && "Bewertung", p.strandEgal && "Strand", p.verpflegungEgal && "Verpflegung", p.ausstattungEgal && "Ausstattung"].filter(Boolean);
    if (egal.length) teile.push(`egal: ${egal.join(", ")}`);
    if (p.kriterien?.length) teile.push(`Wünsche: ${p.kriterien.map((k) => k.id).join(", ")}`);
    if (p.verpflegung) teile.push(`Verpflegung ${p.verpflegung}`);
    if (p.flug != null) teile.push(p.flug ? `mit Flug${p.flugAb ? ` ab ${p.flugAb}` : ""}${p.flugKlasse ? `, ${p.flugKlasse}` : ""}` : "nur Unterkunft");
    return teile.length ? teile.join("; ") : "noch nichts";
  },

  // Zweite Systemnachricht: was sich je Zug aendert
  standFuerModell() {
    const f = FREIGABE.find((x) => x.id === this.freigabe());
    const konto = typeof Account !== "undefined" && Account.konto?.() ? "vorhanden (Name und E-Mail liegen vor)" : "fehlt";
    const seite = { index: "Startseite mit Suchmaske", results: "Trefferliste", stay: "Seite eines Hauses", checkout: "Buchungsstrecke", merkzettel: "Merkzettel" }[Werkzeuge.seite()] || Werkzeuge.seite();
    const heute = new Date();
    const zeilen = [
      `Heute: ${heute.toISOString().slice(0, 10)}.`,
      `Deine Freigabe: ${f ? `${f.id} (${f.lang})` : this.freigabe()}.`,
      `Seite, die die Person gerade sieht: ${seite}.`,
      `Konto der Person fuer die Buchung: ${konto}.`,
      `Stand (was feststeht): ${this.standKurz()}.`,
    ];
    if (this.lauf.letzteVorlage?.length) zeilen.push(`Zuletzt vorgelegt: ${this.lauf.letzteVorlage.map((id, i) => `${i + 1}. ${getItemById?.(id)?.name || id} (${id})`).join(", ")}.`);
    else if (this.lauf.letzteTreffer?.length) zeilen.push(`Letztes Suchergebnis (ids): ${this.lauf.letzteTreffer.join(", ")}.`);
    if (this.lauf.gewaehlt) zeilen.push(`Geoeffnetes Haus: ${getItemById?.(this.lauf.gewaehlt)?.name || this.lauf.gewaehlt} (${this.lauf.gewaehlt}).`);
    zeilen.push(this.fahrplanText());
    for (const block of this.regelnJetzt()) zeilen.push(block);
    if (this.lauf.phase === "angehalten") zeilen.push("Die Person hat waehrend deiner Arbeit selbst geklickt; du hast angehalten.");
    zeilen.push("Fuer deine naechste Antwort: hoechstens drei Saetze, genau eine Frage (nie zwei), und wenn du fragst, als letzte Zeile CHIPS: mit zwei bis vier Antworten.");
    return zeilen.join("\n");
  },

  /* Regeln, die gerade gelten.
     ------------------------------------------------------------------
     Bis zum 22.09.2026 stand alles in der festen Rolle: Buchungsregeln,
     Flugregeln, Vorlageregeln, auch wenn gerade nur der Reisemonat
     gefragt war. Sechzig Vorgaben auf einmal haelt ein kleines Modell
     nicht durch. Jetzt bekommt es den festen Kern (Ton, eine Frage,
     keine erfundenen Zahlen) plus die Bloecke, die zur Lage passen.

     Bewusst grosszuegig: Ein Block kommt schon mit, wenn er gleich
     gebraucht werden koennte - lieber eine Regel zu viel als eine zu
     wenig. Die Flugregeln haengen deshalb am Flug im Stand, nicht an
     der Phase; die Buchungsregeln an der Freigabe, nicht daran, ob
     gerade ein Haus offen ist. */
  regelnJetzt() {
    const p = this.lauf.profil || {};
    const fp = Werkzeugkasten.fahrplan(p, this.lauf);
    const seite = Werkzeuge.seite();
    const bloecke = [];

    // Flug: sobald er im Gespraech ist oder gleich gefragt wird
    if (p.flug || fp.naechstes === "flug" || fp.naechstes === "flugAb" || (p.flug == null && p.typ !== "apartment")) {
      bloecke.push("FLUG: Bei Hotels kann die Seite einen Flug dazubuchen (Hin- und Rueckflug fuer alle Reisenden; Abflughaefen Hamburg, Stuttgart, Duesseldorf, Hannover, Muenchen, Koeln, Frankfurt, Berlin; Klassen Economy, Premium Economy, Business, gerechnet ist Economy). Nicht jede Verbindung fliegt taeglich: Mit Flug haengt der Anreisetag von den Flugtagen ab, und nach der Reisedauer muss wieder ein Flugtag sein. Welche Tage gehen, sagen dir die Werkzeuge - erfinde keine. Bei Ferienwohnungen gibt es keinen Flug.");
    }
    // Vorlage und Vergleiche: sobald Haeuser im Spiel sind
    if (this.lauf.letzteVorlage?.length || fp.phase === "vorschlaege" || this.lauf.gewaehlt || seite === "stay") {
      bloecke.push("VORSCHLAEGE: Die Haeuser stehen mit festen Saetzen im Chat (Preis, Note, Belege). Du wiederholst sie nicht, sondern fragst in einem Satz, welches sie sich ansehen will oder ob etwas fehlt. Nachfragen und Vergleiche beantwortest du mit haus_details, nie mit buchung_vorbereiten. Will sie ein Haus sehen, ruf haus_oeffnen. Neue Vorgaben merkst du und suchst neu; suchen legt dann neu vor. Bei nur einem oder keinem Treffer lockerst du eine Vorgabe, sagst welche, und suchst noch einmal.");
    }
    // Bewertungen: sobald Haeuser im Spiel sind. Der Block haengt bewusst
    // an derselben Bedingung wie VORSCHLAEGE - sobald ein Haus genannt
    // werden kann, kann auch ueber seine Bewertungen geredet werden.
    if (this.lauf.letzteVorlage?.length || fp.phase === "vorschlaege" || this.lauf.gewaehlt || seite === "stay") {
      const gelesen = Object.keys(this.lauf.gelesen || {})
        .map((id) => (typeof getItemById === "function" ? getItemById(id)?.name : null) || id);
      bloecke.push(`BEWERTUNGEN: Was Gaeste loben oder kritisieren, Teilnoten und einzelne Aspekte (Essen, Lage, Sauberkeit, Service, Ruhe) sagst du erst, nachdem du bewertungen_lesen fuer genau dieses Haus gerufen hast - auch wenn du die Zahlen aus einem frueheren Ergebnis zu kennen glaubst. Das Lesen ist auf der Seite sichtbar und dauert einen Moment; kuendige es in einem halben Satz an ("ich schau mir die Bewertungen an"). Teilnoten immer als "x von 10", nie als Prozent. ${gelesen.length ? `Gelesen hast du bisher: ${gelesen.join(", ")}.` : "Gelesen hast du bisher noch keines."}`);
    }
    // Buchung: sobald die Freigabe es hergibt
    if (this.darf("vorbereiten")) {
      const autonom = this.darf("buchen");
      bloecke.push(`BUCHEN: In die Buchungsstrecke gehst du nur, wenn die Person ausdruecklich buchen will ("buch das", "nehmen wir"). Vorher braucht es einen Anreisetag von ihr (bei flexibler Suche; mit Flug einen Flugtag) - such ihn nicht selbst aus. ${autonom ? "Du darfst abschliessen: buchung_vorbereiten und dann buchung_abschliessen; die Ansage uebernimmt die Seite." : "Du darfst vorbereiten, nicht abschliessen: leg vor, was gebucht wuerde (Haus, Zeitraum, Gesamtpreis, Name), und frag, ob du abschliessen sollst. Erst nach einem klaren Ja buchung_abschliessen."} Liegt ein Preis ueber dem gemerkten Budget, sagst du das.`);
    } else if (fp.phase === "vorschlaege" || this.lauf.gewaehlt) {
      bloecke.push("BUCHEN: Du darfst nicht buchen. Will die Person buchen, sag ihr freundlich, dass sie den Knopf auf der Seite selbst druecken kann oder dir die Freigabe anheben darf.");
    }
    return bloecke;
  },

  // Der Fahrplan als Vorgabe fuer das Modell: was als Naechstes dran ist
  fahrplanText() {
    const p = this.lauf.profil || {};
    const fp = Werkzeugkasten.fahrplan(p, this.lauf);
    const bekannt = this.standKurz();
    const chipsHinweis = fp.naechstes ? (fp.chips ? ` Chips etwa: ${fp.chips}.` : " Keine CHIPS-Zeile - die Frage ist offen.") : "";
    if (fp.phase === "eckdaten") return `FAHRPLAN: Eckdaten. Naechstes Thema, genau eines: ${fp.naechstes}. ${fp.frage}${chipsHinweis} Nicht mehr fragen, was im Stand steht (${bekannt}). Geht die Person auf etwas anderes ein oder fragt sie etwas, antworte darauf zuerst - und stell dann diese Frage. Du darfst jederzeit suchen, wenn du fuer eine Antwort Zahlen brauchst.`;
    if (fp.phase === "suche") return fp.empfehlungBereit
      ? `FAHRPLAN: Die Eckdaten haben sich geaendert. Ruf suchen - es legt die passenden Haeuser neu vor.`
      : `FAHRPLAN: Alle Eckdaten sind da. Ruf suchen - die Lage (Zahlen) sagt danach die Seite selbst; du ergaenzt hoechstens einen Satz aus deinem Wissen und fragst das naechste Thema.`;
    if (fp.phase === "beratung") return `FAHRPLAN: Beratung, die Lage ist bekannt. Naechstes Thema, genau eines: ${fp.naechstes}. ${fp.frage}${chipsHinweis}`;
    if (fp.phase === "selbst") return `FAHRPLAN: Die Person schaut selbst durch die Liste. ${this.lauf.vorgehenFuer ? "Antworte nur, wenn sie etwas fragt oder will; keine Vorschlaege von dir, keine Frage hinterher." : "Ruf suchen (stellt die Filter) und sag ihr, dass die Liste steht."}`;
    // vorschlaege
    if (!this.lauf.letzteVorlage?.length) return `FAHRPLAN: Beratung abgeschlossen. Ruf suchen - es legt die drei passendsten Haeuser gleich im Chat vor. Danach ein Satz: welches sie sich ansehen will oder ob etwas fehlt.`;
    return `FAHRPLAN: Vorschlaege liegen vor. Geh auf die Person ein: Nachfragen mit haus_details, ansehen mit haus_oeffnen, neue Vorgaben mit stand_merken und suchen (legt dann neu vor), buchen nach Freigabe.`;
  },

  async denkpause(ms = 1100, text = "denkt nach…") {
    AgentPanel.status(text);
    Zeiger.denkt(true);
    await Zeiger.warte(ms);
    Zeiger.denkt(false);
  },

  /* ==================================================================
     Eingang aus dem Panel
     ================================================================== */
  async eingabe(text) {
    const t = String(text || "").trim();
    if (!t) return;
    if (/^stopp?$/i.test(t)) {
      this.sagen(t, "user");
      Zeiger.anhalten();
      this.notieren("stopp", { seite: Werkzeuge.seite() });
      this.gespraechPush({ role: "user", content: t });
      if (!this.laeuft) await this.zug();
      return;
    }
    if (this.laeuft) {
      // Waehrend der Agent arbeitet, wird die Nachricht angehaengt und
      // nach dem laufenden Zug beantwortet
      this.sagen(t, "user");
      this.lauf.nachtrag = (this.lauf.nachtrag || []).concat(t);
      this.sichern();
      return;
    }
    if (!this.lauf.freigabeGewaehlt && STELLSCHRAUBEN.freigabeFrage === "erstoeffnung") {
      this.freigabeFragen();
      return;
    }
    // "Zeig die Vorschlaege nochmal" oeffnet die Ansicht direkt, statt das
    // Modell darum zu bitten - es hat die Karten gar nicht in der Hand.
    const willSehen = (/(vorschl[aä]ge?|auswahl)\b/i.test(t) || /\bdie (drei|vier|fünf|fuenf|sechs)\b/i.test(t))
      && /(nochmal|noch einmal|wieder|zeig|sehen|ansehen|anschauen|zurück|zurueck|wo sind)/i.test(t);
    if (willSehen && (this.lauf.letzteVorlage || []).length) {
      this.sagen(t, "user");
      this.gespraechPush({ role: "user", content: t });
      this.vorschlaegeNochmal("chip");
      return;
    }
    this.sagen(t, "user");
    this.gespraechPush({ role: "user", content: t });
    // Merker des vorigen Zuges (Lage, Vorlage, Anreise-Chips) gelten nicht mehr.
    // Nicht am Anfang von zug() zuruecksetzen: die Suche wechselt die Seite,
    // und der Zug laeuft nach dem Laden weiter
    this.lauf.vorlageImZug = false;
    this.lauf.lageImZug = null;
    this.lauf.anreiseChips = null;
    // Sagt die Person etwas, bevor der Abschluss lief, entscheidet wieder das
    // Gespraech - nur ein glattes Ja haelt den Abschluss am Leben
    if (this.lauf.abschlussFaellig && !/^\s*(ja|jap|jo|okay|ok|gern|bitte|mach|klar|passt|genau)\b/i.test(t)) this.lauf.abschlussFaellig = false;
    // Die Antwort auf ein gefragtes Thema zaehlt als besprochen - was die
    // Person dazu gesagt hat, traegt das Modell mit stand_merken ein
    if (this.lauf.gefragt) {
      (this.lauf.besprochen ||= {})[this.lauf.gefragt] = true;
      this.notieren("thema_beantwortet", { thema: this.lauf.gefragt });
      this.lauf.gefragt = null;
    }
    this.lauf.phase = "gespraech";
    Zeiger.freigeben?.();
    await this.zug();
  },

  gespraechPush(n) {
    this.lauf.gespraech.push(n);
    this.sichern();
  },

  // Das Gespraech fuer das Modell: die letzten Nachrichten, aber nie mit
  // einem abgeschnittenen Werkzeugblock am Anfang
  gespraechFuerModell() {
    let liste = this.lauf.gespraech.slice(-this.MAX_GESPRAECH);
    while (liste.length && (liste[0].role === "tool" || (liste[0].role === "assistant" && liste[0].tool_calls))) liste = liste.slice(1);
    // Werkzeugergebnisse sind lang (acht Haeuser mit Bewertungen, die Lage).
    // Aeltere werden gekuerzt: Das Modell braucht sie nur noch als Erinnerung,
    // was es getan hat. Ohne das lief ein langes Gespraech in die
    // Zeichengrenze des Endpunkts und brach ab ("Da ist etwas schiefgegangen").
    let tool = 0;
    liste = liste.map((n, i) => n).reverse().map((n) => {
      if (n.role !== "tool") return n;
      tool += 1;
      const grenze = tool <= 2 ? 4000 : 400;
      const c = String(n.content || "");
      return c.length <= grenze ? n : { ...n, content: `${c.slice(0, grenze)} … (gekuerzt)` };
    }).reverse();
    // Notbremse: passt es immer noch nicht, fallen die aeltesten Nachrichten weg
    while (liste.length > 6 && JSON.stringify(liste).length > 45000) {
      liste = liste.slice(1);
      while (liste.length && (liste[0].role === "tool" || (liste[0].role === "assistant" && liste[0].tool_calls))) liste = liste.slice(1);
    }
    return liste;
  },

  /* Ein Zug: Modell rufen, Werkzeuge ausfuehren, bis Text kommt. */
  async zug() {
    if (this.laeuft) return;
    this.laeuft = true;
    AgentPanel.arbeitetAn();
    AgentPanel.status("denkt nach…");
    try {
      const erzwungen = new Set();
      for (let i = 0; i < this.MAX_ZUEGE; i++) {
        if (typeof Modell === "undefined" || !Modell.verfuegbar()) {
          this.sagen("Ich bin gerade nicht erreichbar. Du kannst auf der Seite selbst weitersuchen, ich melde mich, sobald es wieder geht.");
          break;
        }
        // Erster Zug nach einer Nachricht der Person: ein Werkzeug ist Pflicht
        // (stand_merken). Danach erzwingt der Fahrplan, was ansteht: den
        // Ueberblick, die erste Suche, die Suche nach der Beratung - je
        // einmal pro Zug, damit ein Fehlschlag keine Schleife wird.
        const letzte = this.lauf.gespraech[this.lauf.gespraech.length - 1];
        let pflicht = i === 0 && letzte?.role === "user" ? "stand_merken" : false;
        if (!pflicht) {
          const z = Werkzeugkasten.zwang(this.lauf.profil || {}, this.lauf);
          if (z && !erzwungen.has(z)) { erzwungen.add(z); pflicht = z; this.notieren("zwang", { werkzeug: z }); }
        }
        const antwort = await Modell.agent(this.gespraechFuerModell(), Werkzeugkasten.definitionen(), this.standFuerModell(), pflicht);
        if (!antwort) {
          this.sagen("Da ist gerade etwas schiefgegangen. Sag es mir bitte noch einmal.");
          break;
        }
        this.kostenMerken(antwort.verbrauch);
        const nachricht = { role: "assistant", content: antwort.text || null };
        if (antwort.tool_calls?.length) {
          nachricht.tool_calls = antwort.tool_calls.map((c) => ({ id: c.id, type: "function", function: { name: c.function.name, arguments: c.function.arguments || "{}" } }));
        }
        let text = antwort.text || "";
        if (text && !nachricht.tool_calls) {
          // Zwei Leitplanken, je einmal neu schreiben lassen: Zahlen, die
          // nirgends belegt sind, und mehr als eine Frage in einer Nachricht
          const fremd = Modell.fremdeZahlen(text, this.belege());
          const fragen = this.fragenZaehlen(text);
          const thema = this.themaVerfehlt(text);
          let hinweis = null;
          if (fremd.length) { this.notieren("zahl_ungedeckt", { zahlen: fremd }); hinweis = `Deine letzte Antwort enthielt die Zahl ${fremd.join(" und ")}, die in keinem Werkzeugergebnis und keiner Nachricht der Person vorkommt. Schreib die Antwort neu: nur belegte Zahlen, oder lass die Zahl weg. Wenn du die Zahl brauchst, ruf das passende Werkzeug.`; }
          else if (fragen > 1) { this.notieren("zwei_fragen", { fragen }); hinweis = `Deine letzte Antwort enthielt ${fragen} Fragen. Schreib sie neu mit genau einer Frage - die wichtigste zuerst, die andere kommt spaeter. Chips nur zu dieser einen Frage.`; }
          else if (thema) { this.notieren("thema_verfehlt", { thema: thema.id }); hinweis = `Deine Frage passt nicht zum Thema, das laut FAHRPLAN dran ist: ${thema.id}. ${thema.frage} Schreib die Antwort neu - erst die Antwort auf das, was die Person gesagt oder gefragt hat, dann genau diese eine Frage.`; }
          if (hinweis) {
            const zweiter = await Modell.agent(
              [...this.gespraechFuerModell(), { role: "assistant", content: text },
                { role: "system", content: hinweis }],
              Werkzeugkasten.definitionen(), this.standFuerModell());
            if (zweiter) {
              this.kostenMerken(zweiter.verbrauch);
              text = zweiter.text || "";
              antwort.chips = zweiter.chips;
              nachricht.content = text || null;
              if (zweiter.tool_calls?.length) nachricht.tool_calls = zweiter.tool_calls.map((c) => ({ id: c.id, type: "function", function: { name: c.function.name, arguments: c.function.arguments || "{}" } }));
              antwort.tool_calls = zweiter.tool_calls;
            }
          }
        }
        // Kommt der Text zusammen mit einem Werkzeugaufruf, greift die
        // Leitplanke oben nicht - das Werkzeug muss ja laufen. Genau so kam
        // "Wie viele seid ihr insgesamt? Sind Kinder dabei, und wenn ja, wie
        // alt sind sie?" durch. Hier wird nicht neu gefragt, sondern die
        // zweite Frage faellt weg; sie ist ohnehin als naechstes Thema dran.
        if (text && nachricht.tool_calls && this.fragenZaehlen(text) > 1) {
          const saetze = text.split(/(?<=[.!?])\s+/);
          const bis = saetze.findIndex((x) => /\?\s*$/.test(x) && this.FRAGEWORT.test(x));
          if (bis >= 0) {
            text = saetze.slice(0, bis + 1).join(" ").trim();
            nachricht.content = text;
            this.notieren("zwei_fragen_gekuerzt", {});
          }
        }
        this.gespraechPush(nachricht);
        // Denselben Satz nicht zweimal zeigen (das kleine Modell wiederholt
        // nach einem Werkzeug gern, was es davor schon gesagt hat)
        // Nur innerhalb desselben Zuges vergleichen - hat die Person die Frage
        // nicht beantwortet, darf sie noch einmal kommen
        const seitPerson = this.lauf.verlauf.slice(Math.max(0, this.lauf.verlauf.map((n) => n.rolle).lastIndexOf("user")) + 1);
        const zuletzt = [...seitPerson].reverse().find((n) => n.rolle === "bot")?.text || "";
        const gleich = (x, y) => x && y && x.replace(/\W+/g, "").toLowerCase() === y.replace(/\W+/g, "").toLowerCase();
        // Nach der Lage im selben Zug erzaehlt das Modell sie gern noch einmal -
        // Saetze mit denselben Zahlen fallen weg, die Frage bleibt
        if (text && this.lauf.lageImZug) {
          const zahlen = new Set((this.lauf.lageImZug.match(/\d+/g) || []).filter((z) => +z >= 5));
          const saetze = text.split(/(?<=[.!?])\s+/);
          // Fragen bleiben stehen, auch wenn Zahlen darin vorkommen. Sonst
          // frass dieser Filter die Frage nach dem Anreisetag ("am 1., 6.
          // oder 11. Oktober?"), weil 6 und 11 auch in der Lage standen -
          // uebrig blieb "oder 11.?".
          const rest = saetze.filter((x) => /\?/.test(x) || !(x.match(/\d+/g) || []).some((z) => zahlen.has(z)));
          if (rest.length !== saetze.length) {
            text = rest.length ? rest.join(" ") : "Möchtest du die Filter so einstellen und selbst schauen, oder soll ich dir drei Häuser raussuchen?";
            nachricht.content = text;
            this.notieren("lage_wiederholt");
          }
          this.lauf.lageImZug = null;
        }
        // Nach einer Vorlage nennt das Modell manchmal ganz andere Haeuser aus
        // einem frueheren Werkzeugergebnis ("Familienhof Zingst, Rentierhof
        // Saariselkä ..."), die gar nicht im Chat stehen. Solche Saetze fallen weg.
        if (text && this.lauf.vorlageImZug && this.lauf.letzteVorlage?.length) {
          const eigene = this.lauf.letzteVorlage.map((id) => getItemById?.(id)?.name).filter(Boolean);
          const alle = [...(typeof HOTELS !== "undefined" ? HOTELS : []), ...(typeof APARTMENTS !== "undefined" ? APARTMENTS : [])];
          const fremde = alle.map((h) => h.name).filter((n) => !eigene.includes(n) && text.includes(n));
          if (fremde.length) {
            const saetze = text.split(/(?<=[.!?])\s+/).filter((x) => !fremde.some((n) => x.includes(n)));
            text = saetze.join(" ").trim() || "Welches möchtest du dir genauer ansehen, oder fehlt dir noch etwas?";
            nachricht.content = text;
            this.notieren("fremdes_haus", { namen: fremde.slice(0, 3) });
          }
        }
        // Nach einer Vorlage im selben Zug zaehlt das Modell die Haeuser gern
        // noch einmal auf - dann bleibt nur die Frage
        if (text && this.lauf.vorlageImZug && this.lauf.letzteVorlage?.length) {
          const namen = this.lauf.letzteVorlage.map((id) => getItemById?.(id)?.name).filter(Boolean);
          if (namen.filter((n) => text.includes(n)).length >= 2) {
            const saetze = text.split(/(?<=[.!?])\s+/);
            const frage = saetze.filter((x) => /\?\s*$/.test(x) && !namen.some((n) => x.includes(n)));
            text = frage.length ? frage[frage.length - 1] : "Welches möchtest du dir genauer ansehen, oder fehlt dir noch etwas?";
            nachricht.content = text;
            this.notieren("vorlage_wiederholt");
          }
        }
        // "Oktober ist notiert." - das Modell bestaetigt gern, was die Person
        // ohnehin in der Leiste sieht. Der Bestaetigungssatz faellt weg,
        // wenn danach noch etwas kommt.
        if (text) {
          const saetze = text.split(/(?<=[.!?])\s+/);
          if (saetze.length > 1 && /(notiert|gemerkt|vermerkt|verstanden|^danke|^super|^alles klar|^prima|^perfekt)/i.test(saetze[0]) && !/\?/.test(saetze[0])) {
            text = saetze.slice(1).join(" ");
            nachricht.content = text;
          }
        }
        /* Das Netz unter allen Sackgassen.
           ----------------------------------------------------------------
           Der Pruefstand vom 25.09.2026 fand denselben Bauplan an drei
           Stellen: eine Frage, die nicht beantwortet wird; ein leeres
           Suchergebnis, das nicht kleiner wird; eine Buchung, der etwas
           fehlt. Jedes Mal stand dieselbe Nachricht drei-, vier-, achtmal
           im Chat. Jede einzelne Stelle ist repariert - aber es wird
           weitere geben, die ich noch nicht kenne.

           Deshalb hier eine Bremse, die nichts ueber den Grund wissen
           muss: Sagt das Modell zum dritten Mal fast dasselbe, sagt der
           Kern stattdessen, dass es nicht weitergeht, und gibt ab. Das
           ist auch die ehrlichere Nachricht - ein Agent, der dreimal
           dasselbe fragt, hat die Frage nicht gestellt, sondern nur
           wiederholt. */
        if (text && !nachricht.tool_calls) {
          const vorige = [...this.lauf.verlauf].reverse()
            .filter((n) => n.rolle === "bot" && n.vomModell && n.text).slice(0, 2).map((n) => n.text);
          if (vorige.length === 2 && vorige.every((v) => this.aehnlich(v, text) >= 0.8)) {
            this.notieren("festgefahren", { text: text.slice(0, 160) });
            text = "Ich komme hier gerade nicht weiter und wiederhole mich. Sag mir in einem Satz, was ich als Nächstes tun soll, oder schau selbst in der Liste weiter - ich bin da, wenn du etwas wissen willst.";
            nachricht.content = text;
            antwort.chips = ["Ich schaue selbst weiter", "Fang noch mal von vorn an"];
          }
        }
        if (text && !gleich(text, zuletzt)) this.sagen(text, "bot", null, { vomModell: true });
        if (!nachricht.tool_calls) {
          // Welches Thema des Fahrplans der Agent damit gefragt hat
          const fp = Werkzeugkasten.fahrplan(this.lauf.profil || {}, this.lauf);
          // Themen, auf die zweimal keine Antwort kam: der Kern nimmt das
          // Naheliegende an und geht weiter. Fuer die Auswertung zaehlt,
          // wie oft das noetig war.
          this.lauf.uebersprungenNotiert = this.lauf.uebersprungenNotiert || {};
          for (const t of Object.keys(this.lauf.uebersprungen || {})) {
            if (this.lauf.uebersprungenNotiert[t]) continue;
            this.lauf.uebersprungenNotiert[t] = true;
            this.notieren("thema_uebersprungen", { thema: t });
          }
          if (fp.naechstes && /\?/.test(text)) {
            this.lauf.gefragt = fp.naechstes;
            // Wie oft dasselbe Thema schon gefragt wurde. Beim zweiten Mal
            // formuliert der Fahrplan anders - eine woertlich wiederholte
            // Frage wirkt, als haette der Agent nicht zugehoert.
            this.lauf.gefragtWie = this.lauf.gefragtWie || {};
            this.lauf.gefragtWie[fp.naechstes] = (this.lauf.gefragtWie[fp.naechstes] || 0) + 1;
            // Der Fragesatz selbst wird mitgeschrieben: Beim zweiten Anlauf
            // muss er anders klingen, und das laesst sich nur nachpruefen,
            // wenn beide Fassungen dastehen.
            const fragesatz = (text.split(/(?<=[.!?])\s+/).filter((x) => /\?/.test(x)).pop() || text).slice(0, 220);
            this.notieren("thema_gefragt", { thema: fp.naechstes, phase: fp.phase, mal: this.lauf.gefragtWie[fp.naechstes], frage: fragesatz });
          }
          // Chips nur, wo das Thema welche vorsieht - das Modell haengt sonst
          // an jede Frage Vorschlaege, die die Person in eine Richtung draengen
          if (fp.naechstes && !fp.chips) antwort.chips = [];
          else if (fp.naechstes && fp.chips && !(antwort.chips || []).length) antwort.chips = fp.chips.split("|").map((x) => x.trim());
          // Fragt der Agent nach dem Anreisetag, obwohl ein Flug dabei ist, haengt
          // der Kern die Flugtage an - das Modell fragt sonst ins Blaue
          if (/anreise|anreisetag|welchen tag|welcher tag|datum/i.test(text) && /\?/.test(text) && !/fliegt|flugtag/i.test(text)) {
            const h = this.flugtageHilfe();
            if (h) { text = `${text} ${h.satz}`; nachricht.content = text; if (!this.lauf.anreiseChips?.length) this.lauf.anreiseChips = h.chips; }
          }
          // Moegliche Anreisetage (Flugtage) als Chips - konkreter als jede Umschreibung
          if (this.lauf.anreiseChips?.length) { antwort.chips = this.lauf.anreiseChips; this.lauf.anreiseChips = null; }
          this.lauf.chips = (antwort.chips || []).length ? antwort.chips : this.ersatzChips();
          AgentPanel.setSuggestions(this.lauf.chips);
          break;
        }
        this.lauf.letztesWerkzeug = nachricht.tool_calls[nachricht.tool_calls.length - 1]?.function?.name || null;
        this.lauf.chips = [];
        AgentPanel.setSuggestions([]);
        this.lauf.ausstehend = { calls: antwort.tool_calls, i: 0, stufe: 1 };
        this.lauf.phase = "arbeitet";
        this.sichern();
        const fertig = await this.werkzeugeAusfuehren();
        if (!fertig) return;   // Seite laedt neu, dort geht es weiter
      }
    } finally {
      this.zugBeenden();
    }
  },

  /* Fragt das Modell etwas anderes als das Thema des Fahrplans? Grob an
     Schluesselwoertern erkannt - nur in der Eckdaten- und Beratungsphase,
     und nur, wenn ueberhaupt eine Frage im Text steht. */
  THEMA_WOERTER: {
    zeit: /wann|monat|zeitpunkt|losgehen|reisezeit|jahreszeit|termin|zeitraum|daten/i,
    reisende: /\bwer\b|personen|wie viele|kinder|erwachsene|zu zweit|allein|mitreis|reist/i,
    kinderAlter: /\balt\b|alter|jahre|jährig/i,
    ziel: /warm|kalt|ziel|wohin|region|richtung|land|insel/i,
    art: /hotel|ferienwohnung|unterkunft/i,
    weiter: /schauen|sehen|klären|klaeren|eckdaten|angaben|weiter/i,
    dauer: /lange|nächte|naechte|tage|dauer|woche/i,
    flug: /flug/i,
    flugAb: /flughafen|abflug|ab welch|von wo|fliegen/i,
    vorgehen: /selbst|drei|filter|raussuch|favorit|vorschl|liste/i,
    preis: /preis|budget|kosten|euro|grenze|ausgeben/i,
    verpflegung: /verpflegung|inclusive|inklusive|halbpension|vollpension|frühstück|fruehstueck|mahlzeit|all ?in/i,
    wuensche: /wichtig|achte|wert|wünsch|wuensch|vorstell|lieber/i,
  },
  themaVerfehlt(text) {
    if (!/\?/.test(text)) return null;
    const fp = Werkzeugkasten.fahrplan(this.lauf.profil || {}, this.lauf);
    if (!fp.naechstes || !(fp.phase === "eckdaten" || fp.phase === "beratung")) return null;
    const re = this.THEMA_WOERTER[fp.naechstes];
    if (!re || re.test(text)) return null;
    return { id: fp.naechstes, frage: fp.frage };
  },

  /* Saetze, die wirklich eine zweite Frage sind.
     ------------------------------------------------------------------
     Nicht mitgezaehlt werden: Nachsaetze ("Oder ist es egal?") und
     Aufzaehlungen der moeglichen Antworten ("Juni, Juli, August oder
     egal?", "Pool, Kinderclub, Strand oder etwas anderes?"). Die
     gehoeren zur Frage davor; sie als zweite Frage zu zaehlen, kostete
     einen unnoetigen zweiten Modellaufruf und liess die Messung
     schlechter aussehen, als der Agent war. */
  FRAGEWORT: /\b(wie|was|wo|wer|wen|wem|worauf|wofür|wofuer|womit|wohin|woran|wobei|wann|welche[rsnm]?|warum|wieso|ob|soll|sollen|möchte|moechte|möchtest|moechtest|möchtet|moechtet|willst|wollt|hast|habt|haben|ist|sind|seid|bist|gibt|kann|kannst|könnt|koennt|darf|brauchst|braucht|passt|interessiert)\b/i,
  fragenZaehlen(text) {
    return String(text).split(/(?<=[.!?])\s+/)
      .filter((s) => /\?\s*$/.test(s))
      .filter((s) => !/^(oder|bzw\.?|beziehungsweise|also|und wenn|zum beispiel|etwa|z\. ?b\.?)\b/i.test(s.trim()))
      .filter((s) => this.FRAGEWORT.test(s))
      .length;
  },

  // Wenn das Modell keine Antwortvorschlaege mitgibt: passende aus der Lage
  ersatzChips() {
    const w = this.lauf.letztesWerkzeug;
    const seite = Werkzeuge.seite();
    if (w === "buchung_vorbereiten" && seite === "checkout") return ["Ja, schließ ab", "Ich mache das selbst"];
    if (w === "buchung_abschliessen") return [];
    if (w === "auswahl_vorlegen" && this.lauf.letzteVorlage?.length) {
      return [...this.lauf.letzteVorlage.map((id, i) => `${i + 1}. ${(getItemById?.(id)?.name || id).split(" ").slice(0, 2).join(" ")}`), "Etwas anderes"];
    }
    // Nur direkt nach dem Oeffnen. Vorher galten diese drei Vorschlaege auf
    // der ganzen Hausseite - auch unter der Frage "Welchen Tag moechtest du
    // als Anreisetag?", wo "Zur Buchung" als Antwort keinen Sinn ergibt.
    if (w === "haus_oeffnen") return ["Auf den Merkzettel", "Zur Buchung", "Zurück zur Auswahl"];
    if (this.lauf.gefragt) { const fp = Werkzeugkasten.fahrplan(this.lauf.profil || {}, this.lauf); if (fp.chips) return fp.chips.split("|").map((x) => x.trim()); }
    return [];
  },

  zugBeenden() {
    this.laeuft = false;
    if (this.lauf.phase === "arbeitet") this.lauf.phase = "gespraech";
    this.sperreAus();
    AgentPanel.arbeitetAus();
    AgentPanel.status(this.lauf.phase === "angehalten" ? "angehalten · du hast übernommen" : "online");
    AgentPanel.oeffnen?.();
    this.sichern();
    setTimeout(() => { if (!this.laeuft) Zeiger.verbergen(); }, 900);
    // Nachricht, die waehrend der Arbeit kam
    const nachtrag = this.lauf.nachtrag || [];
    if (nachtrag.length) {
      this.lauf.nachtrag = [];
      for (const t of nachtrag) this.gespraechPush({ role: "user", content: t });
      setTimeout(() => this.zug(), 300);
    }
  },

  kostenMerken(v) {
    if (!v) return;
    const k = this.lauf.kosten ||= { aufrufe: 0, eingabe: 0, zwischengespeichert: 0, ausgabe: 0, euro: 0 };
    k.aufrufe += 1;
    k.eingabe += v.eingabe || 0;
    k.zwischengespeichert += v.zwischengespeichert || 0;
    k.ausgabe += v.ausgabe || 0;
    k.euro = Math.round(Modell.kosten(k) * 1000) / 1000;
    console.info(`Modell: ${k.aufrufe} Aufrufe, ${k.eingabe} Eingabe-Tokens (${k.zwischengespeichert} aus dem Speicher), ${k.ausgabe} Ausgabe, ca. ${k.euro} USD`);
  },

  // Alles, was Zahlen belegt: Werkzeugergebnisse, Nachrichten der Person, Stand
  belege() {
    return [
      ...this.lauf.gespraech.filter((n) => n.role === "tool" || n.role === "user").map((n) => n.content),
      this.standKurz(),
    ];
  },

  /* Die Argumente eines Werkzeugaufrufs lesen - auch kaputte.
     ------------------------------------------------------------------
     Am 25.09.2026 blieb das Modell mitten in einem stand_merken haengen
     und wiederholte "preisEgal":false, bis das Token-Budget aufgebraucht
     war. Die Zeichenkette brach mitten im naechsten Schluessel ab, JSON
     liess sich nicht lesen, und der ganze Aufruf fiel auf ein leeres
     Objekt zurueck: Monat, Dauer, Reisende, Kinder samt Alter, Pool,
     Strandentfernung, Preis - alles weg, obwohl es sauber dastand. Der
     Agent fragte danach nach dem Reisemonat, den die Person gerade
     genannt hatte.

     Statt alles zu verwerfen, werden jetzt alle vollstaendigen Paare
     gerettet. Doppelte Schluessel fallen dabei von selbst zusammen, der
     abgeschnittene Rest bleibt liegen. Im Protokoll steht, dass es
     passiert ist - wie oft das vorkommt, gehoert zur Messung. */
  argumenteLesen(roh, werkzeug = "") {
    const text = String(roh || "{}");
    try { return JSON.parse(text); } catch { /* unten weiter */ }
    const paare = [...text.matchAll(/"([A-Za-z_][A-Za-z0-9_]*)"\s*:\s*("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false|null|\[[^\]]*\])/g)];
    const raus = {};
    for (const m of paare) { try { raus[m[1]] = JSON.parse(m[2]); } catch { /* Paar ueberspringen */ } }
    this.notieren("argumente_repariert", { werkzeug, felder: Object.keys(raus), zeichen: text.length });
    console.warn("Werkzeugargumente waren kaputt, gerettet:", Object.keys(raus));
    return raus;
  },

  /* Werkzeugaufrufe des aktuellen Zuges der Reihe nach ausfuehren.
     Liefert false, wenn die Seite gleich neu laedt. */
  async werkzeugeAusfuehren() {
    const a = this.lauf.ausstehend;
    if (!a) return true;
    while (a.i < a.calls.length) {
      const call = a.calls[a.i];
      let args = {};
      args = this.argumenteLesen(call.function.arguments, call.function.name);
      if (a.stufe === 1) {
        const zeile = Werkzeugkasten.logText(call.function.name, args);
        if (zeile) this.logZeile(zeile, "schritt");
        AgentPanel.status(zeile ? `${zeile.charAt(0).toLowerCase()}${zeile.slice(1)}…` : "arbeitet…");
      }
      let r;
      if (Zeiger.abbruch) {
        r = { ergebnis: { abgebrochen: true, hinweis: "Die Person hat selbst uebernommen oder Stopp gesagt. Frag kurz, wie es weitergehen soll." } };
      } else {
        r = await Werkzeugkasten.ausfuehren(call.function.name, args, this, a.stufe);
      }
      if (r.navigiert) {
        a.stufe = r.stufe || (a.stufe + 1);
        this.sichern();
        return false;
      }
      if (r.log) this.logZeile(r.log, "ergebnis");
      this.gespraechPush({ role: "tool", tool_call_id: call.id, content: JSON.stringify(r.ergebnis ?? { ok: true }) });
      a.i += 1;
      a.stufe = 1;
      this.sichern();
    }
    this.lauf.ausstehend = null;
    this.sichern();
    return true;
  },

  // Nach einem Seitenwechsel: das unterbrochene Werkzeug zu Ende bringen
  // und den Zug fortsetzen
  async fortsetzenNachLaden() {
    if (!this.lauf.ausstehend) return;
    this.laeuft = true;
    AgentPanel.arbeitetAn();
    try {
      const fertig = await this.werkzeugeAusfuehren();
      if (!fertig) return;
    } catch (e) {
      console.error("Fortsetzen fehlgeschlagen", e);
      this.lauf.ausstehend = null;
    }
    this.laeuft = false;
    await this.zug();
  },

  /* ==================================================================
     Vorlage der Auswahl (Werkzeug auswahl_vorlegen)
     ------------------------------------------------------------------
     Feste Saetze aus den Daten, Partnerhaus je Bedingung an Platz 1,
     "Warum dieses?" und Verweise. Das Modell bekommt zurueck, was
     gesagt wurde, und fragt danach nur noch, welches Haus es sein soll.
     ================================================================== */
  async auswahlVorlegen(ids) {
    const p = this.lauf.profil || {};
    const preisVon = (item) => Werkzeugkasten.preis(item, p.monat);
    const alsTreffer = (id) => ({ id, preis: preisVon(getItemById(id)) });
    // Nur die Wuensche gewichten - die harten Vorgaben hat das Modell beim
    // Suchen schon angelegt (und vielleicht bewusst gelockert)
    const weich = { kriterien: p.kriterien || [], budget: p.budget || null };
    let kandidaten = Politik.bewerten(ids.map(alsTreffer), weich);
    // Reihenfolge des Modells behalten - es hat gewaehlt
    kandidaten.sort((x, y) => ids.indexOf(x.id) - ids.indexOf(y.id));

    // Partnerhaus: aus dem ganzen letzten Suchergebnis, nicht nur aus der
    // Wahl des Modells - zulaessig muss es sein, sonst kommt es nicht.
    const grundmenge = [...new Set([...(this.lauf.letzteTreffer || []), ...ids])];
    // Nach welcher Reihenfolge das Partnerhaus gewaehlt wird: nach der, die
    // sich aus dem Gespraech ergibt. Sonst kann das "beste" Haus der Aufgabe
    // genau das sein, das den ausgesprochenen Wunsch verfehlt.
    const rangliste = Politik.bewerten(grundmenge.map(alsTreffer), weich).map((k) => k.id);
    /* Beim zweiten Vorlegen bleibt es dasselbe Partnerhaus.
       ----------------------------------------------------------------
       Bis zum 25.09.2026 stand hier `!this.lauf.partnerId`: Wer die
       Vorschlaege ein zweites Mal sah (weil sich der Anreisetag geaendert
       hatte oder weil er "zeig sie mir nochmal" sagte), bekam eine
       Ansicht ohne jede Kennzeichnung - das Haus rutschte aus Platz eins
       und die Marke fehlte ganz. Genau das hatte der Nutzer am 24.09.
       gemeldet ("diese Button, wo klar wird, dass es ein Partnerhotel
       ist. Das war einfach nicht da").

       Einmal ausgelost, bleibt es dasselbe Haus - aber nur, solange es
       die Vorgaben noch erfuellt, also noch im letzten Suchergebnis
       steht. Faellt es heraus, gibt es keins mehr, statt eines, das
       nicht mehr passt. */
    const schonGesetzt = this.lauf.partnerId && grundmenge.includes(this.lauf.partnerId)
      ? { id: this.lauf.partnerId, rang: this.lauf.partnerRang || null, erneut: true } : null;
    const partner = schonGesetzt || (typeof Studie !== "undefined" && Studie.partnerhaus && !this.lauf.partnerId
      ? Studie.partnerhaus(grundmenge, rangliste) : null);
    let offenlegung = !partner ? null
      : (this.lauf.offenlegung || (typeof Studie !== "undefined" && Studie.gruppe ? Studie.gruppe().offenlegung : STELLSCHRAUBEN.offenlegung));
    // Die alten Namen bleiben gueltig: etikett wurde zum Chip an der Karte,
    // offen zur Ansage des Agenten im Chat
    offenlegung = { etikett: "chip", offen: "agent" }[offenlegung] || offenlegung;
    if (partner) {
      let k = kandidaten.find((x) => x.id === partner.id);
      if (!k) k = Politik.bewerten([alsTreffer(partner.id)], weich)[0];
      if (k) {
        k.partner = true;
        const wieViele = Math.max(2, Math.min(6, p.anzahlVorschlaege || ids.length || 3));
        kandidaten = [k, ...kandidaten.filter((x) => x.id !== partner.id)].slice(0, wieViele);
        this.lauf.partnerId = partner.id;
        this.lauf.partnerRang = partner.rang || this.lauf.partnerRang || null;
        this.lauf.offenlegung = offenlegung;
        this.notieren("partner_vorgelegt", { id: partner.id, rang: this.lauf.partnerRang, offenlegung, position: 1,
          zulaessigeImErgebnis: grundmenge.length, ...(partner.erneut ? { erneut: true } : {}) });
      }
    } else if (!this.lauf.partnerId && typeof Studie !== "undefined" && Studie.daten) {
      this.notieren("partner_fehlt", { grund: "kein_zulaessiges_haus_im_ergebnis", treffer: grundmenge.length });
    }

    this.lauf.kandidaten = kandidaten;
    this.lauf.letzteVorlage = kandidaten.map((k) => k.id);
    this.lauf.vorlageImZug = true;
    this.notieren("shortlist", { runde: this.lauf.vorlagen || 0, ids: this.lauf.letzteVorlage, partnerId: this.lauf.partnerId || null, offenlegung: this.lauf.offenlegung || null });
    this.lauf.vorlagen = (this.lauf.vorlagen || 0) + 1;

    await this.denkpause(900, "stellt zusammen…");

    // Vorschlagsansicht (seit 22.09.2026): eine eigene Ebene ueber der Seite
    // statt drei Chatnachrichten. Die Kennzeichnung des Partnerhauses ist
    // dort ein gestaltetes Element an fester Stelle - erst damit laesst sie
    // sich als Stellschraube variieren und messen.
    if (STELLSCHRAUBEN.vorschlag === "ansicht" && typeof Vorschlaege !== "undefined") {
      const gezeigtA = this.vorschlagsansicht(kandidaten);
      return { ergebnis: { vorgelegt: gezeigtA, hinweis: "Die Vorschlaege liegen als eigene Ansicht VOR der Person, mit Bild, Preis und Teilnoten - nicht in der Trefferliste. Sag in einem Satz, dass sie da sind, und frag, welches sie sich ansehen moechte. Das Wort 'Liste' passt hier nicht. Zaehl die Haeuser nicht auf, wiederhole keine Zahlen, und frag nicht offen 'Was moechtest du?'." }, log: null };
    }

    const gezeigt = [];
    for (const [i, k] of kandidaten.entries()) {
      await Zeiger.warte(i === 0 ? 400 : 1400);
      const istPartner = !!k.partner;
      const satz = Politik.vorschlagssatz(k, p);
      let text = istPartner ? `Mein Vorschlag: ${satz}` : `${i + 1}. ${satz}`;
      if (istPartner && this.lauf.offenlegung === "agent") {
        text += ` Nur zur Info: Für dieses Haus bekommt Voyara eine Provision. Ich halte es trotzdem für die beste Option für euch, weil ${Politik.partnerGruende(k, p)}.`;
      }
      const etikett = istPartner && this.lauf.offenlegung === "chip" ? "Partner" : null;
      this.lauf.verlauf.push({ rolle: "bot", text, zeit: Date.now(),
        links: [this.linkZu(k.id, k.item.name)],
        aktionen: [{ text: "Warum dieses?", warumFuer: k.id }],
        etikett });
      AgentPanel.say(text, "bot", {
        links: [this.linkZu(k.id, k.item.name)],
        aktionen: [{ text: "Warum dieses?", ausklappen: () => this.warumText(k.id) }],
        etikett,
      });
      this.logZeile(`${istPartner ? "Vorschlag 1 (mein Vorschlag)" : `Vorschlag ${i + 1}`}: ${k.item.name}, ${k.preis} € pro Nacht, Bewertung ${k.item.rating}`, "ergebnis");
      gezeigt.push({ platz: i + 1, id: k.id, name: k.item.name, preisProNacht: k.preis, note: k.item.rating, gesagt: text });
      this.sichern();
    }
    // Wie gut ist der genannte Wunsch in dieser Auswahl ueberhaupt zu haben?
    // Ohne diese Einordnung liest sich "Essen 73 Prozent positiv" wie ein
    // guter Wert, obwohl es schlicht das Beste ist, was die Filter zulassen.
    const wunsch = (p.kriterien || []).map((k) => Politik.kriterium(k.id)).find((k) => k?.aspekt);
    if (wunsch && typeof aspektbilanz === "function" && (this.lauf.letzteTreffer || []).length > 2) {
      const werte = this.lauf.letzteTreffer.map((id) => {
        const item = getItemById?.(id);
        const e = item ? (aspektbilanz(item, 400) || []).find((x) => x.id === wunsch.aspekt) : null;
        return e ? e.anteilPositiv : null;
      }).filter((x) => x != null);
      const best = werte.length ? Math.max(...werte) : null;
      if (best != null && best < 0.8) {
        await Zeiger.warte(700);
        this.sagen(`Zur Einordnung: Beim Thema ${wunsch.label} liegt der beste Wert in dieser Auswahl bei ${Politik.teilnoteText(best)}. Mehr ist mit deinen Vorgaben nicht zu haben; wenn dir das zu wenig ist, können wir eine lockern.`);
        this.notieren("wunsch_eingeordnet", { aspekt: wunsch.aspekt, best: Math.round(best * 100) });
      }
    }
    if (this.lauf.partnerId && this.lauf.offenlegung === "log") {
      const pk = kandidaten.find((k) => k.partner);
      if (pk) this.logZeile(`${pk.item.name}: Partnerhaus von Voyara, bevorzugt gelistet (Provision)`, "hinweis");
    }
    return {
      ergebnis: { vorgelegt: gezeigt, hinweis: "Die Haeuser stehen jetzt im Chat. Wiederhole nichts davon. Ein Satz: welches soll sie sich ansehen, oder fehlt etwas?" },
      log: null,
    };
  },

  /* Flugtage fuer das Haus, um das es gerade geht: das geoeffnete, das in
     der letzten Nachricht der Person genannte ("das dritte", Name) oder das
     erste der Vorlage. Liefert Satz und Chips oder null (kein Flug). */
  flugtageHilfe() {
    const p = this.lauf.profil || {};
    if (!p.flug || !p.monat || typeof Flug === "undefined" || typeof getItemById !== "function") return null;
    const letzte = [...this.lauf.gespraech].reverse().find((n) => n.role === "user")?.content || "";
    const vorlage = this.lauf.letzteVorlage || [];
    let id = null;
    const ord = { erste: 0, erstes: 0, "1": 0, zweite: 1, zweites: 1, "2": 1, dritte: 2, drittes: 2, "3": 2 };
    for (const [w, i] of Object.entries(ord)) if (new RegExp(`\\b(das|dem|die|den|nummer|nr\\.?)\\s*${w}\\b`, "i").test(letzte) && vorlage[i]) id = vorlage[i];
    if (!id) id = vorlage.find((v) => { const n = getItemById(v)?.name || ""; return n && letzte.toLowerCase().includes(n.split(" ")[0].toLowerCase()); }) || null;
    if (!id) id = this.lauf.gewaehlt || vorlage[0] || null;
    const item = id ? getItemById(id) : null;
    if (!item || item.type === "apartment") return null;
    const flug = Flug.wahl(item.ziel);
    if (!flug) return null;
    const monat = p.von ? p.von.slice(0, 7) : Werkzeugkasten.flexWahl(p)?.monat;
    const naechte = p.naechte || 7;
    const tage = Flug.anreiseTage(flug, monat, naechte);
    const MON = ["Jan.", "Feb.", "März", "April", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];
    const kurz = (d) => `${new Date(d).getDate()}. ${MON[new Date(d).getMonth()]}`;
    if (!tage.length) {
      const alt = Flug.naechteAlternativen(flug, monat, naechte);
      return { satz: `${flug.airline} ab ${flug.from} fliegt ${Flug.tageText(flug, true)}; mit ${naechte} Nächten passt kein Rückflug${alt.length ? `, mit ${alt.join(" oder ")} Nächten schon` : ""}.`, chips: [] };
    }
    return { satz: `${flug.airline} ab ${flug.from} fliegt ${Flug.tageText(flug, true)}; mit ${naechte} Nächten geht zum Beispiel der ${tage.slice(0, 3).map(kurz).join(", der ")}.`, chips: tage.slice(0, 4).map(kurz) };
  },

  /* Die Haeuser fuer die Vorschlagsansicht aufbereiten: Gesamtpreis wie an
     der Kasse, Teilnoten aus den Bewertungen (der genannte Wunsch zuerst),
     ein Satz zur Begruendung. */
  vorschlagsansicht(kandidaten) {
    const p = this.lauf.profil || {};
    const wunschIds = (p.kriterien || []).map((k) => Politik.kriterium(k.id)?.aspekt).filter(Boolean);
    const naechte = p.naechte || null;
    const personen = (p.erwachsene || 0) + (p.kinder || 0);
    // Bester Wert des genannten Wunsches in der Auswahl - damit auf der
    // Karte stehen kann, dass mehr nicht zu haben ist
    const wunsch = (p.kriterien || []).map((k) => Politik.kriterium(k.id)).find((k) => k?.aspekt);
    let einordnung = null;
    if (wunsch && typeof aspektbilanz === "function") {
      const werte = (this.lauf.letzteTreffer || []).map((id) => {
        const item = getItemById?.(id);
        const e = item ? (aspektbilanz(item, 400) || []).find((x) => x.id === wunsch.aspekt) : null;
        return e ? e.anteilPositiv : null;
      }).filter((x) => x != null);
      if (werte.length) einordnung = { id: wunsch.label, best: Math.max(...werte) };
    }
    const aufbereitet = kandidaten.map((k) => {
      const item = k.item;
      const bilanz = typeof aspektbilanz === "function" ? (aspektbilanz(item, 400) || []) : [];
      const sortiert = [...bilanz].sort((a, b) => {
        const wa = wunschIds.includes(a.id) ? 1 : 0, wb = wunschIds.includes(b.id) ? 1 : 0;
        return wb - wa || b.anteilPositiv - a.anteilPositiv;
      }).slice(0, 4);
      const preisInfo = Politik.aufenthaltspreis(item, p, k.preis);
      const paket = p.flug && item.type !== "apartment" && typeof Flug !== "undefined" ? Flug.paket(item, personen || 1, p.flugKlasse || null) : null;
      const gesamt = preisInfo.gesamt + (paket?.gesamt || 0);
      // "der beste Wert der Auswahl" nur bei dem Haus, das ihn wirklich hat
      const istBest = einordnung && wunsch && bilanz.some((a) => a.id === wunsch.aspekt && Math.abs(a.anteilPositiv - einordnung.best) < 0.005);
      const eigeneEinordnung = einordnung ? { id: einordnung.id, best: !!istBest } : null;
      return {
        id: k.id, item, partner: !!k.partner, satz: Politik.kartensatz(k, p, eigeneEinordnung),
        aspekte: sortiert.map((a) => ({ label: a.label, note: Politik.teilnote(a.anteilPositiv), wunsch: wunschIds.includes(a.id) })),
        gesamtText: naechte ? Politik.euro(gesamt) : `${Politik.euro(k.preis)} pro Nacht`,
        preisZusatz: naechte
          ? `${naechte} Nächte${personen ? `, ${personen} ${personen === 1 ? "Person" : "Personen"}` : ""}${paket ? ", mit Flug" : ""}`
          : "pro Nacht",
      };
    });
    const kontext = [typeof Reisedaten !== "undefined" ? Reisedaten.text() : null,
      typeof Belegung !== "undefined" ? Belegung.text() : null,
      Werkzeugkasten.filterText(p) !== "ohne Filter" ? Werkzeugkasten.filterText(p) : null].filter(Boolean).join(" · ");
    Vorschlaege.zeigen(aufbereitet, this, { offenlegung: this.lauf.offenlegung, kontext });
    for (const k of aufbereitet) {
      this.logZeile(`${k.partner ? "Vorschlag 1 (mein Vorschlag)" : "Vorschlag"}: ${k.item.name}, ${k.gesamtText}, Bewertung ${k.item.rating}`, "ergebnis");
    }
    if (this.lauf.partnerId && this.lauf.offenlegung === "log") {
      const pk = aufbereitet.find((k) => k.partner);
      if (pk) this.logZeile(`${pk.item.name}: Partnerhaus von Voyara, bevorzugt gelistet (Provision)`, "hinweis");
    }
    if (this.lauf.offenlegung === "agent") {
      const pk = aufbereitet.find((k) => k.partner);
      if (pk) this.sagen(`Ein Hinweis zu ${pk.item.name}: Für dieses Haus bekommt Voyara eine Provision. Ich halte es trotzdem für die beste Wahl für euch.`);
    }
    return aufbereitet.map((k, i) => ({ platz: i + 1, id: k.id, name: k.item.name, gesamt: k.gesamtText, note: k.item.rating }));
  },

  /* Die Vorschlaege noch einmal zeigen.
     ------------------------------------------------------------------
     Wer auf "Ansehen" klickt, landet auf der Hausseite - und die Ansicht
     mit den anderen Vorschlaegen war weg, ohne Weg zurueck. Die Auswahl
     bleibt jetzt erreichbar, bis wirklich entschieden ist: ueber einen
     Knopf in der Nachricht, der auch nach einem Seitenwechsel noch da
     ist, und ueber den Antwortvorschlag im Chat. */
  /* Wie aehnlich sind zwei Nachrichten? Anteil gemeinsamer Woerter,
     bezogen auf die kuerzere. 1 heisst woertlich gleich. */
  aehnlich(a, b) {
    const wort = (x) => String(x).toLowerCase().replace(/[^a-zäöüß ]/g, " ").split(/\s+/).filter((w) => w.length > 3);
    const A = wort(a); const B = new Set(wort(b));
    if (A.length < 4 || B.size < 4) return 0;
    const treffer = A.filter((w) => B.has(w)).length;
    return Math.round((treffer / Math.min(A.length, B.size)) * 100) / 100;
  },

  vorschlaegeNochmal(ueber = "knopf") {
    const ids = this.lauf.letzteVorlage || [];
    if (!ids.length || typeof Vorschlaege === "undefined") return;
    this.kandidatenAuffrischen();
    const p = this.lauf.profil || {};
    const weich = { kriterien: p.kriterien || [], budget: p.budget || null };
    const kandidaten = Politik.bewerten(ids.map((id) => ({ id, preis: Werkzeugkasten.preis(getItemById(id), p.monat) })), weich);
    kandidaten.sort((x, y) => ids.indexOf(x.id) - ids.indexOf(y.id));
    for (const k of kandidaten) if (k.id === this.lauf.partnerId) k.partner = true;
    this.notieren("vorschlaege_erneut", { ueber, ids });
    this.vorschlagsansicht(kandidaten);
  },

  // Der Knopf, der die Auswahl erreichbar haelt. Steht im Verlauf, damit er
  // einen Seitenwechsel ueberlebt.
  vorschlaegeMerken() {
    const text = "Deine Auswahl bleibt hier stehen, bis du dich entschieden hast.";
    const aktion = { text: "Die Vorschläge ansehen", vorschlaegeZeigen: true };
    const letzte = this.lauf.verlauf[this.lauf.verlauf.length - 1];
    if (letzte?.aktionen?.some((a) => a.vorschlaegeZeigen)) return;
    this.lauf.verlauf.push({ rolle: "bot", text, zeit: Date.now(), aktionen: [aktion] });
    AgentPanel.say(text, "bot", { aktionen: [{ text: aktion.text, tun: () => this.vorschlaegeNochmal("knopf") }] });
    this.sichern();
  },

  // "Warum dieses Haus?" - klappt in der Nachricht auf, ein Modellaufruf ohne Werkzeuge
  async warumText(id) {
    this.kandidatenAuffrischen();
    const kandidaten = this.lauf.kandidaten || [];
    const k = kandidaten.find((x) => x.id === id);
    if (!k) return "Dazu habe ich gerade nichts.";
    this.notieren("warum_gefragt", { id, runde: this.lauf.runde });
    this.sichern();
    const ersatz = Politik.warumSatz(k, kandidaten, this.lauf.profil);
    if (typeof Modell === "undefined" || !Modell.verfuegbar()) return ersatz;
    const fakten = Politik.faktenWarum(k, kandidaten, this.lauf.profil);
    const a = await Modell.text([
      { role: "user", content: `Die Person fragt, warum du ${k.item.name} vorgeschlagen hast. Begruende in zwei, drei Saetzen nur mit diesen Fakten, nenne auch, was dagegen spricht, keine Frage am Ende:\n${JSON.stringify(fakten)}` },
    ], this.standFuerModell());
    if (a) this.kostenMerken(a.verbrauch);
    const text = a?.text || "";
    return text && !Modell.fremdeZahlen(text, [fakten]).length ? text : ersatz;
  },

  /* ==================================================================
     Uebernahme durch die Person
     ================================================================== */
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
    AgentPanel.status("angehalten · du hast übernommen");
    this.sichern();
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Kern, FREIGABE, STELLSCHRAUBEN };
