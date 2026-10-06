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
  /* Der Eckpunkte-Bildschirm vor der freien Aufgabe.
     ------------------------------------------------------------------
     Aus am 02.10.2026. Er fragte Monat, Gruppe und Budget ab, die im
     Gespraech ohnehin fallen, und seine Budgetstufen passten nicht mehr
     zum Katalog: Die oberste hiess "mehr als 2.500 Euro", waehrend eine
     Familienreise mit Flug bei 4.300 Euro beginnt - jede Buchung lag
     damit ueber dem angeklickten Rahmen. Der Massstab kommt jetzt aus
     dem Stand (Aufgaben.ausGespraech). Auf true gestellt kommt der
     Bildschirm zurueck, dann mit Stufen aus den echten Preisen. */
  eckpunkte: false,
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
  /* Entscheidung des Nutzers vom 27.09.2026 nach eigenen Testlaeufen:
     Der Agent steht von Anfang an offen in der Spalte, kein
     zugeklappter Reiter und keine Einladung, die aufspringt. "Da habe
     ich mich aktiv dagegen entschieden."

     Damit faellt eine Frage weg, die das Projekt eine Weile mitgefuehrt
     hat - ob Menschen den Agenten ueberhaupt oeffnen. Sie war
     interessant, aber sie kostete jede Sitzung, in der niemand ihn
     fand: Wer den Agenten nie oeffnet, liefert zur Kennzeichnung des
     Partnerhauses keinen einzigen Messwert. */
  /* Woher die Aufgabe kommt (29.09.2026).
     ------------------------------------------------------------------
     frei = die Person setzt sich vor dem ersten Kontakt drei Eckpunkte
     (mit wem, wann etwa, Hoechstpreis) und sucht danach, was sie will.
     fest = die beiden vorgegebenen Aufgaben (Familie Mallorca, Paar
     Algarve). Beides bleibt erhalten, umschaltbar auch ueber die
     Adresse: ?aufgabe=fest. */
  aufgabe: "frei",               // frei | fest
  zugang: "seitenleiste",        // schublade | seitenleiste
  einladung: "keine",            // unten-rechts | cursor | mitte | liste | keine
  einladungAusloeser: "detail",  // detail | zeit
  einladungSekunden: 60,
  freigabeFrage: "erstoeffnung", // erstoeffnung | start
  offenlegung: null,             // keine | chip | banner | agent | log | null = auslosen
  // Wie die drei Vorschlaege gezeigt werden: eigene Ansicht ueber der Seite
  // oder (alt) als drei Chatnachrichten
  vorschlag: "ansicht",          // ansicht | chat
  /* Entscheidung des Nutzers vom 27.09.2026: das beste Haus.
     ------------------------------------------------------------------
     Damit kostet die Provision niemanden etwas - der Agent haette
     dieses Haus ohnehin empfohlen, und wer Platz eins bucht, hat
     trotzdem das beste bekommen. Gemessen wird dann, ob die
     Kennzeichnung auffaellt und was sie mit dem Vertrauen macht, nicht,
     ob sie vor einem Nachteil schuetzt. */
  partner: "beste",              // zweitbeste | beste | wechselnd | keine
  /* Der Between-Faktor der Erhebung (Aufbau des Nutzers, 27.09.2026).
     ------------------------------------------------------------------
     ohne    = Platz eins ohne Kennzeichnung (Kontrollgruppe)
     etikett = nur das Wort "Partnerhaus", Erklaerung auf Klick
     text    = Etikett plus Erklaerungssatz, sofort sichtbar
     zufall  = je Person ausgelost (Normalfall der Erhebung) */
  /* Bis auf Weiteres fest auf "etikett" (Entscheidung des Nutzers vom
     03.10.2026): Jede Person sieht das Partner-Label an Haus und Flug.
     Wer den Prototyp ansieht - etwa der Betreuer -, soll nicht zufaellig
     in der Kontrollgruppe landen und gar kein Label sehen. Fuer die
     Erhebung kommt die Auslosung zurueck: "zufall" (oder eine feste
     Stufe) hier eintragen. Ueber die Adresse laesst sich das bewusst
     nicht umstellen - nur im Code. */
  kennzeichnung: "etikett",      // zufall | ohne | etikett | text
  // Sieht der Agent sich die engere Auswahl vorher sichtbar an (Haus
  // oeffnen, Bewertungen lesen, Zimmer und Verpflegung setzen)? Kostet
  // acht bis zehn Sekunden je Haus und ist der Kern der Fragestellung:
  // ob nachvollziehbare Arbeit das Vertrauen in die Empfehlung aendert.
  // Wie viele Aufgaben eine Person bekommt (1 oder 2)
  aufgaben: 1,
  rundgang: true,                // true | false
  // Sieht der Agent nach der ersten Suche kurz in ein, zwei Haeuser
  // hinein (Zimmer, Verpflegung, keine Bewertungen)? Kostet zwei
  // Seitenwechsel und macht aus "184 Haeuser gefunden" eine Aussage,
  // die er auf der Seite nachgesehen hat.
  stichprobe: true,              // true | false
  // Stellt der Agent die Liste sichtbar auf jeden Monat einer Jahreszeit
  // um, wenn ihm die Wahl ueberlassen wird? false = er rechnet still im
  // Katalog und nennt nur das Ergebnis mit Begruendung.
  monatsvergleich: true,         // true | false
  mietwagenFrage: true,          // einmal vor der Kasse fragen (04.10.2026)
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
    // kennzeichnung absichtlich nicht: nur im Code umstellbar (03.10.2026)
    aufgabe: ["frei", "fest"],
    aufgaben: ["1", "2"],
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
  // Eine Kennzeichnung aus einem alten Link gilt nicht mehr - nur der Code
  delete gruppe.kennzeichnung;
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
    /* Seit dem 27.09.2026 ist die offene Spalte der Normalfall, und die
       Seiten tragen die Schubladen-Klasse nicht mehr im HTML - sie kommt
       oben dazu, wenn die Stellschraube sie verlangt. Bis hierher sind
       Uebergaenge aus ("agent-lautlos"), sonst schnellte die Spalte beim
       Laden sichtbar ins Bild. */
    /* Die Sperre der Uebergaenge faellt auch dann, wenn keine Bilder
       gezeichnet werden: In einem Hintergrundtab liefert
       requestAnimationFrame nichts, und der Agent haette dort fuer immer
       ohne Animationen dagestanden. */
    const wieder = () => document.body.classList.remove("agent-lautlos");
    requestAnimationFrame(() => requestAnimationFrame(wieder));
    setTimeout(wieder, 400);
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
      monatsvergleich: null,   // angesetzter Vergleich mehrerer Monate in der Liste
      zwangFrei: null,         // Werkzeug, das in diesem Zug noch einmal erzwungen werden darf
      kennzeichnung: null,     // Stufe des Between-Faktors fuer diese Sitzung
      stichprobe: null,        // laufender kurzer Blick in ein, zwei Haeuser
      stichprobeGemacht: false,// einmal je Gespraech, nach der ersten Suche
      abgeleitet: [],          // eigene Entscheidungen des Kerns, die noch erklaert werden muessen
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

  /* Was die Person selbst eingestellt hat.
     ------------------------------------------------------------------
     Gemeldet am 02.10.2026: Der Nutzer war selbst auf ein Haus gegangen,
     hatte das Datum gewaehlt, das Zimmer gesetzt und eine andere
     Flugverbindung genommen. Dann bat er den Agenten, das Formular
     auszufuellen - und der fragte nach Haus und Anreisetag, die laengst
     dastanden. Sein Wunsch: "Dass der Kern sieht: okay, Nutzer sucht
     selbst eins von den von mir vorgeschlagenen Haeusern aus und stellt
     das Datum ein. Und wenn der Nutzer dann schreibt, fuell mir bitte das
     Formular aus, muss der Kern auch wissen, in welcher Ansicht der
     Nutzer gerade ist."

     Gelesen wird bei jedem Seitenaufbau, was auf der Seite steht: welche
     Ansicht, welches Haus, welcher Zeitraum, wie viele Reisende, welcher
     Flug. Was dort steht und im Stand fehlt oder abweicht, uebernimmt der
     Kern - und sagt es in einem Satz, statt es stillschweigend zu tun.

     Nicht waehrend einer laufenden Werkzeugkette (`ausstehend`): Dort
     laedt die Seite zwischendurch neu, und was dort steht, hat der Agent
     gerade selbst eingestellt. */
  seitenstandUebernehmen() {
    if (this.lauf.ausstehend) return;
    if (typeof Werkzeuge === "undefined") return;
    const seite = Werkzeuge.seite();
    this.lauf.seite = seite;
    if (seite !== "stay" && seite !== "checkout") return;
    const p = (this.lauf.profil ||= {});
    const neu = [];

    const id = new URLSearchParams(location.search).get("id");
    const item = id && typeof getItemById === "function" ? getItemById(id) : null;
    if (item && this.lauf.gewaehlt !== id) {
      const ausVorlage = (this.lauf.letzteVorlage || []).includes(id);
      this.lauf.gewaehlt = id;
      this.notieren("selbst_geoeffnet", { id, ausVorlage, seite });
      neu.push(ausVorlage ? `${item.name} aus meiner Auswahl` : item.name);
    }

    /* Nur Daten, die wirklich gesetzt sind.
       ------------------------------------------------------------------
       Hier stand `Reisedaten.get()`. Das liefert ohne gesetzte Daten die
       Vorbelegung der Suchmaske - in 30 Tagen, eine Woche lang. Gemeldet
       am 03.10.2026: Im Chat "12. August" und "9 Naechte", in der Leiste
       "02.11. bis 09.11." und "7 Naechte". Die Vorbelegung galt als Wahl
       der Person, ueberschrieb Anreisetag und Dauer, und die Monatspruefung
       warf danach den November weg - und mit ihm den 12. August. Beim
       Buchen hiess es dann "kein festes Datum".

       Jetzt zaehlt nur, was in der Adresse steht (`roh`), und im
       flexiblen Monat gar kein Zeitraum. Und ein uebernommener Zeitraum
       nimmt seinen Monat mit: Wer auf der Seite den Monat wechselt, hat
       den Monat gewechselt. */
    if (typeof Reisedaten !== "undefined" && !Reisedaten.flex?.()) {
      const r = Reisedaten.roh();
      if (r?.von && r?.bis && (p.von !== r.von || p.bis !== r.bis)) {
        p.von = r.von; p.bis = r.bis;
        const n = Math.round((new Date(r.bis) - new Date(r.von)) / 86400000);
        if (n > 0 && n < 60) p.naechte = n;
        const m = new Date(r.von).getMonth() + 1;
        if (m >= 1 && m <= 12) p.monat = m;
        p.flexibel = false;
        p.anreise = r.von;
        // Auf der Seite eingestellt ist so fest wie gesagt (04.10.2026)
        Object.assign((p.vonPerson ||= {}), { von: true, bis: true, anreise: true, monat: true, naechte: true });
        neu.push(`den ${new Date(r.von).getDate()}. als Anreisetag`);
      }
    }

    /* Das Zimmer, das die Person auf der Hausseite angeklickt hat. Ohne
       diesen Weg fragte der Agent beim Buchen noch einmal - oder nahm das
       vorausgewaehlte. */
    try {
      const z = JSON.parse(sessionStorage.getItem("voyara_zimmerwahl") || "null");
      if (z && z.id && z.name && item && z.id === item.id && p.zimmerTyp !== z.name) {
        p.zimmerTyp = z.name;
        p.zimmerFuer = item.id;
        this.lauf.zimmerGefragt = true;
        neu.push(`das Zimmer „${z.name}“`);
      }
    } catch { /* ohne Speicher */ }

    if (typeof Flug !== "undefined") {
      try {
        const f = Flug.lesen();
        /* Die Vorauswahl im Flugfenster ist keine Wahl (04.10.2026): Auf
           "Spaeter am Tag" galt der vorausgewaehlte Partnerflug als
           gewaehlt, und die Buchung lief damit weiter. Solange das Fenster
           auf eine Wahl wartet, zaehlt nur ein Klick (Fluege.waehlen). */
        const nurVorwahl = this.lauf.flugWartet && !p.flugId;
        if (f.flugId && p.flugId !== f.flugId && !nurVorwahl) {
          p.flugId = f.flugId;
          this.lauf.flugGefragt = true;
          const v = typeof FLIGHTS !== "undefined" ? FLIGHTS.find((x) => x.id === f.flugId) : null;
          neu.push(v ? `den Flug mit ${v.airline}` : "deine Flugverbindung");
        }
      } catch { /* Seite ohne Flugmodul */ }
    }

    if (!neu.length) return;
    this.notieren("seitenstand_uebernommen", { teile: neu, seite });
    /* Nur die letzte Uebernahme zaehlt.
       ------------------------------------------------------------------
       Wer drei Haeuser durchklickt, bevor er etwas schreibt, bekaeme sonst
       drei Saetze auf einmal - zwei davon ueber Haeuser, die er laengst
       wieder verlassen hat. Deshalb ein eigener Platz statt der Liste:
       Ein neuer Seitenstand ersetzt den alten. */
    this.lauf.uebernahmeSatz = `Du hast ${neu.join(" und ")} schon ausgewählt - das übernehme ich.`;
    this.lauf.uebernahmeAlter = 0;
    this.standAnzeigen?.();
    this.sichern();
  },

  notieren(ereignis, daten = {}) {
    (this.lauf.protokoll ||= []).push({ t: Date.now(), ereignis, ...daten });
    /* Alles, was in diesem Zug verworfen wurde, ist ein Zeichen von
       Verstaendnis - nicht von Unverstaendnis. Das Modell hat einen Wert
       mitgebracht, und der Kern hat ihn abgelehnt (ein Monat ohne
       genannten Monatsnamen, eine Zahl Reisender ohne Zahl im Satz).
       Wer so etwas ablehnt, darf nicht im selben Atemzug sagen, er habe
       nichts verstanden. Zurueckgesetzt wird das Zeichen mit jeder neuen
       Nachricht der Person. */
    if (/_verworfen$/.test(ereignis)) this.lauf.verworfenImZug = { ereignis, ...daten };
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
      const aktionen = this.aktionenBinden(n.aktionen || []);
      AgentPanel.say(n.text, n.rolle, { still: true, links: n.links, aktionen, etikett: n.etikett || null });
    }

    /* Steht die Spalte noch so, wie der Agent sie gesetzt hat?
       ------------------------------------------------------------------
       Ein Reiterwechsel ("Hotels") laedt die Seite neu und setzt die
       Filter zurueck. Der Agent merkte davon nichts: Er vergleicht seinen
       eigenen Stand mit dem, womit er zuletzt gefiltert hat, und der ist
       unveraendert. Also behauptete er weiter, die Filter staenden.

       Verglichen wird deshalb mit der Seite. Nicht waehrend einer
       laufenden Werkzeugkette (`ausstehend`): Dort laedt die Seite
       zwischendurch neu, und die Filter kommen erst danach - der
       Unterschied waere dann seine eigene Arbeit und kein fremder
       Eingriff. */
    if (this.lauf.filterAbdruck && !this.lauf.ausstehend && typeof Werkzeuge !== "undefined") {
      const jetzt = Werkzeuge.filterAbdruck();
      if (jetzt && jetzt !== this.lauf.filterAbdruck) {
        this.lauf.filterFremd = true;
        this.notieren("filter_fremd_geaendert", {});
        this.sichern();
      }
    }

    this.seitenstandUebernehmen();

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
    // Die Seite darf jetzt sichtbar werden: Entweder liegt ein Blatt der
    // Studie darueber, oder es kommt keines mehr.
    document.documentElement.classList.remove("studie-wartet");
    AgentPanel.freigabeAufbauen(FREIGABE, this.lauf.freigabe, (stufe) => this.freigabeSetzen(stufe));
    document.body.classList.toggle("agent-ohne-freigabe", erstoeffnung && !this.lauf.freigabeGewaehlt);

    /* Die Kernpruefung: ?kernpruefung=1 an jede Adresse.
       ------------------------------------------------------------------
       Sie geht den Fahrplan durch rund dreissigtausend erfundene Staende
       und haelt jeden Satz gegen feste Regeln. Kostet keinen Modellaufruf
       und laeuft in Sekunden; das Ergebnis steht in der Konsole. Geladen
       wird sie nur auf Zuruf - fuer Teilnehmende waere es totes Gewicht. */
    if (new URLSearchParams(location.search).get("kernpruefung")) {
      const el = document.createElement("script");
      el.src = "agent/kernpruefung.js?v=" + Date.now();
      el.onload = () => Kernpruefung.lauf();
      document.head.appendChild(el);
    }

    /* Die Seitenpruefung: ?seitenpruefung=1 an results, stay oder checkout.
       ------------------------------------------------------------------
       Die Kernpruefung sieht den Fahrplan, aber nicht die Seite. Diese
       hier setzt die Filter wirklich, liest die Spalte zurueck und
       vergleicht die Zahl im Chat mit den Karten auf der Seite. Auch sie
       kostet keinen Modellaufruf. */
    if (new URLSearchParams(location.search).get("seitenpruefung")) {
      const el = document.createElement("script");
      el.src = "agent/seitenpruefung.js?v=" + Date.now();
      document.head.appendChild(el);
    }

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
  /* Wuerde der Agent dieselbe Frage noch einmal stellen?
     ------------------------------------------------------------------
     Das Zeichen dafuer, dass von der Antwort nichts angekommen ist. Zwei
     Faelle, die gleich aussehen und es nicht sind:

       "gerne im sommer"  Im Profil aendert sich nichts, der Monat steht
                          weiter aus - aber der Fahrplan fragt danach
                          nicht mehr offen, sondern nach einem der drei
                          Sommermonate. Angekommen.
       "Gerne im Augus"   Dieselbe Frage, Wort fuer Wort. Nicht angekommen.

     Die zweite Fassung einer Frage zaehlt nicht als Aenderung: Jedes
     Thema hat zwei Formulierungen, damit sich nichts woertlich
     wiederholt, und gewechselt wird nach dem Zaehler - nicht nach dem,
     was die Person gesagt hat. */
  wiederholtDieFrage(thema, satzJetzt) {
    const vorher = this.lauf?.letzteFrage;
    if (!thema || !satzJetzt || !vorher || vorher.thema !== thema || !vorher.satz) return false;
    const schluck = (x) => String(x || "").toLowerCase().replace(/[^a-zäöüß0-9]/g, "");
    if (schluck(vorher.satz) === schluck(satzJetzt)) return true;
    const fassungen = typeof Werkzeugkasten !== "undefined" ? Werkzeugkasten.THEMEN?.[thema]?.satz : null;
    return Array.isArray(fassungen) && fassungen.includes(vorher.satz) && fassungen.includes(satzJetzt);
  },

  sagen(text, rolle = "bot", links = null, extra = null) {
    /* Nach dem Anhalten spricht nur noch die Person.
       ----------------------------------------------------------------
       Gemeldet am 03.10.2026: Die Meldung zum Anhalten kam erst nach der
       Lage und der naechsten Frage - der angehaltene Zug lief noch zu
       Ende und redete. Die Meldung kommt jetzt sofort beim Klick, und
       bis die Person antwortet, faellt alles andere weg (protokolliert). */
    if (rolle === "bot" && this.lauf?.stumm && !this.anhaltSpricht) {
      this.notieren("nach_anhalt_verschluckt", { text: String(text).slice(0, 80) });
      return;
    }
    /* Kein Platzhalter im Chat (04.10.2026: "undefined € insgesamt").
       Letzte Sicherung fuer jeden Satz: Teilsaetze mit undefined, NaN
       oder null fallen weg, und es wird notiert, damit die Quelle
       gefunden wird. */
    if (rolle === "bot" && /\b(undefined|NaN|null)\b/.test(String(text))) {
      this.notieren("platzhalter_gestrichen", { text: String(text).slice(0, 120) });
      text = String(text).split(/(?<=[.!?])\s+/).map((satz) => satz.split(/,\s+/).filter((teil) => !/\b(undefined|NaN|null)\b/.test(teil)).join(", "))
        .filter((satz) => satz.trim()).join(" ").replace(/,\s*([.!?])/g, "$1").trim();
      if (!text) return;
    }
    /* Nichts zweimal hintereinander.
       ----------------------------------------------------------------
       Gemeldet am 02.10.2026, mit Bild: "Ich sehe mir die 4 Haeuser jetzt
       der Reihe nach an: Bewertungen, Zimmer, Verpflegung." stand zweimal
       untereinander im Chat. "Ausserdem muss das immer unbedingt
       aufhoeren, dass er manche Sachen einfach doppelt macht."

       Der Schutz dagegen stand nur an einer Stelle - beim Text des
       Modells. Ansagen des Kerns gingen daran vorbei, und wenn ein
       Werkzeug zweimal anlief (etwa weil das Modell es wiederholt
       aufrief), stand die Ansage auch zweimal da. Hier ist die Stelle, an
       der jeder Satz vorbeikommt, also gehoert die Regel hierher. Dass es
       passiert ist, wird notiert - ein doppelter Aufruf ist ein Fehler,
       auch wenn man ihn nicht mehr sieht. */
    if (rolle === "bot" && text) {
      const letzte = [...(this.lauf.verlauf || [])].reverse().find((x) => x.rolle === "bot");
      const gleichLaut = (a, b) => String(a).replace(/\s+/g, " ").trim() === String(b).replace(/\s+/g, " ").trim();
      if (letzte && gleichLaut(letzte.text, text)) {
        this.notieren("doppelte_nachricht", { satz: String(text).slice(0, 120) });
        return;
      }
    }
    const n = { rolle, text, zeit: Date.now() };
    if (links && links.length) n.links = links;
    // Wer den Satz geschrieben hat. Saetze des Kerns (Lage, Buchungsansage,
    // Rundgangsmeldung) sind gewollt lang und stehen mit festen Zahlen da;
    // Saetze des Modells sind die, die danebengehen koennen. Der Pruefstand
    // bewertet nur die zweiten.
    if (extra) Object.assign(n, extra);
    this.lauf.verlauf.push(n);
    AgentPanel.say(text, rolle, { links, aktionen: n.aktionen ? this.aktionenBinden(n.aktionen) : undefined });
    this.sichern();
  },

  /* Knoepfe in einer Nachricht.
     ------------------------------------------------------------------
     Im Verlauf stehen sie als Daten (sie muessen einen Seitenwechsel
     ueberstehen), gebunden werden sie hier - an einer Stelle fuer das
     erste Anzeigen und fuer das Wiederherstellen. */
  aktionenBinden(liste) {
    return (liste || []).map((a) => {
      if (a.warumFuer) return { text: a.text, ausklappen: () => this.warumText(a.warumFuer) };
      if (a.vorschlaegeZeigen) return { text: a.text, tun: () => this.vorschlaegeNochmal("verlauf") };
      if (a.mehrErfahren) return { text: a.text, tun: () => this.mehrErfahren(a.mehrErfahren) };
      if (a.zimmerWaehlen) return { text: a.text, tun: () => this.zimmerWaehlenOeffnen(a.zimmerWaehlen) };
      if (a.merken) return { text: a.text, tun: () => { const it = getItemById?.(a.merken); this.eingabe(`Merk dir bitte ${it?.name || "dieses Haus"}.`); } };
      return a;
    });
  },

  /* "Mehr erfahren" unter einem Haus des Rundgangs.
     ------------------------------------------------------------------
     Wunsch des Nutzers vom 03.10.2026: Der Agent soll die Hausseite
     sichtbar oeffnen, so aussehen, als schaue er kurz hin, und dann im
     Chat antworten. Die Bitte geht als Nachricht der Person ins
     Gespraech, und der naechste Zug ruft haus_oeffnen (fortsetzenMit) -
     danach liest das Modell die Seite und antwortet. */
  mehrErfahren(id) {
    const item = typeof getItemById === "function" ? getItemById(id) : null;
    if (!item) return;
    this.notieren("mehr_erfahren", { id, ausVorlage: (this.lauf.letzteVorlage || []).includes(id) });
    this.lauf.fortsetzenMit = "haus_oeffnen";
    this.eingabe(`Erzähl mir mehr über ${item.name}.`);
  },

  // "Zimmer auswählen": die Hausseite bei den Zimmern - die Wahl trifft die
  // Person dort selbst, und seitenstandUebernehmen liest sie
  zimmerWaehlenOeffnen(id) {
    const item = typeof getItemById === "function" ? getItemById(id) : null;
    if (!item) return;
    this.notieren("zimmer_waehlen_geoeffnet", { id });
    this.sichern();
    location.href = `${this.linkZu(id, item.name).href}#roomPanel`;
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
    // Verpflegung und Zimmer, wie der Agent sie eingestellt hat - sonst
    // steht auf der Hausseite ein anderer Preis als auf seiner Karte
    const p0 = this.lauf.profil || {};
    if (p0.verpflegung) href += `&board=${encodeURIComponent(p0.verpflegung)}`;
    // Die Wahl der Person geht vor - vorher gewann das Zimmer aus dem
    // Rundgang, und die Kasse zeigte das falsche (03.10.2026)
    const hausZimmer = (typeof getItemById === "function" ? getItemById(id)?.rooms : null) || [];
    const zim = (p0.zimmerTyp && hausZimmer.some((r) => r.name === p0.zimmerTyp))
      ? p0.zimmerTyp : (this.lauf.zimmerWahl || {})[id];
    if (zim) href += `&zimmerart=${encodeURIComponent(zim)}`;
    /* Die Gruppe aus dem Gespraech, nicht von der Seite: Stand dort
       gerade die Vorgabe (2 Erwachsene), ging sie bisher mit in die Kasse
       (03.10.2026, "2 Erwachsene" statt 2 + 2). */
    if (p0.erwachsene) {
      const kinder = p0.kinder || 0;
      const alter = (p0.kinderAlter || []).slice(0, kinder);
      while (alter.length < kinder) alter.push(6);
      href += `&adults=${p0.erwachsene}&children=${kinder}&rooms=${p0.zimmer || 1}${kinder ? `&ages=${alter.join(",")}` : ""}`;
    } else if (typeof Belegung !== "undefined") href = Belegung.anLink(href);
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

  // Hat die Person gerade auf eine "Soll ich ...?"-Frage mit Ja geantwortet?
  zustimmungZu() {
    const verlauf = this.lauf.verlauf || [];
    const letzteNutzer = [...verlauf].reverse().find((x) => x.rolle === "user")?.text || "";
    if (!/^\s*(ja|jap|jo|jawohl|ok(ay)?|gern(e)?|bitte|mach (das|es|bitte)?|klar|genau|passt|einverstanden|ja,? bitte|ja,? mach)\b[\s.!]*$/i.test(letzteNutzer)) return null;
    const i = verlauf.map((x) => x.rolle).lastIndexOf("user");
    const davor = [...verlauf.slice(0, i)].reverse().find((x) => x.rolle === "bot")?.text || "";
    const frage = (davor.match(/[^.!?]*\?/g) || []).pop();
    if (!frage || !/\b(soll ich|möchtest du,? dass ich|moechtest du,? dass ich|darf ich|willst du,? dass ich)\b/i.test(frage)) return null;
    return frage.trim();
  },

  standAnzeigen() {
    if (typeof Politik !== "undefined") AgentPanel.eckdatenZeigen(Politik.eckdaten(this.lauf.profil || {}));
  },

  // Der Stand als Text fuer das Modell
  standKurz() {
    const p = this.lauf.profil || {};
    const teile = [];
    if (p.zielId && typeof ZIEL_NACH_ID !== "undefined") teile.push(`Ziel ${ZIEL_NACH_ID[p.zielId]?.name}`);
    else if (p.richtung && typeof Politik !== "undefined") {
      /* Genannt werden nur Regionen, in denen im gemerkten Monat etwas
         buchbar ist (06.10.2026). Stand hier die ganze Temperaturspanne,
         zaehlte das Modell Regionen auf, in denen kein Haus frei ist -
         genau das war der Fall "Island, Lappland, Kapstadt und die
         Ostsee" im August. */
      const nennbar = Werkzeugkasten.regionenMitHaeusern(p);
      teile.push(`Ziel offen, Richtung ${(Politik.THEMEN || []).find((x) => x.id === p.richtung)?.label || p.richtung} (${nennbar.map((id) => ZIEL_NACH_ID?.[id]?.name || id).join(", ")})`);
    }
    else if (p.zielOffen) teile.push("Ziel offen (alle Regionen)");
    if (p.monat && typeof Politik !== "undefined") {
      const name = Object.keys(Politik.MONATE).find((m) => Politik.MONATE[m] === p.monat && m.length > 3);
      if (name) teile.push(`Monat ${name}`);
    }
    if (p.von && p.bis) teile.push(`${p.von} bis ${p.bis}`);
    else if (p.flexibel) teile.push(`Daten flexibel im Monat${p.anreise ? `, Anreise ${p.anreise}` : " (Anreisetag noch offen)"}`);
    if (p.anreiseBis) teile.push(`Anreise spätestens ${p.anreiseBis}`);
    if (p.anreiseAb) teile.push(`Anreise frühestens ${p.anreiseAb}`);
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
    // Was die Seite nicht kann - damit das Modell eine Grenze nennen kann,
    // statt sie zu umgehen
    const grenzen = Werkzeugkasten.grenzenText(this.lauf.profil || {});
    if (grenzen) zeilen.push(grenzen);
    for (const block of this.regelnJetzt()) zeilen.push(block);
    zeilen.push("VERGLEICH: Vergleichst du Haeuser, nenn Unterschiede mit Zahlen - aber kuer keinen Sieger und sprich keine Empfehlung aus, auch nicht auf 'welches findest du besser?'. Sag dann, worin sie sich unterscheiden und dass es darauf ankommt, was der Person wichtiger ist.");
    /* Keine erfundenen Sperren, und ein Ja wird ausgefuehrt (03.10.2026).
       Gemeldet: fuenfmal "Ich kann das nicht, ohne die Buchung zu
       verlassen. Soll ich?" - "ja" - und dieselbe Frage zurueck. */
    // Tag und Monat der Person widersprechen sich (04.10.2026): nachfragen
    const zk = (this.lauf.profil || {}).zeitKonflikt;
    if (zk) {
      const tagText = typeof Flug !== "undefined" && Flug.datumText ? Flug.datumText(zk.tag) : zk.tag;
      const monatText = typeof MONATSNAMEN !== "undefined" ? MONATSNAMEN[zk.monat - 1] : zk.monat;
      zeilen.push(`KONFLIKT: Die Person hat ${tagText} als Anreise genannt und spaeter ${monatText} als Monat. Frag in einem Satz, was gilt. Gilt der Tag, ruf reisedaten_aendern mit anreise; gilt der Monat, ruf reisedaten_aendern mit monat. Loesch nichts von dir aus.`);
    }
    zeilen.push("SPERREN: Sag nie, dass etwas nicht geht oder dass du dafuer erst etwas verlassen musst, wenn kein Werkzeug das gemeldet hat. Andere Daten (Monat, Anreisetag, Naechte) aendert reisedaten_aendern auf jeder Seite, auch in der Kasse.");
    const zustimmung = this.zustimmungZu();
    if (zustimmung) zeilen.push(`JA: Die Person hat gerade zugestimmt zu deiner Frage "${zustimmung}". Fuehr das JETZT mit dem passenden Werkzeug aus und frag nicht noch einmal.`);
    if (this.lauf.phase === "angehalten") zeilen.push("Die Person hat waehrend deiner Arbeit selbst geklickt; du hast angehalten.");
    if (this.lauf.fortsetzenHinweis) zeilen.push(`Die Person hatte dich angehalten und jetzt gesagt, dass du weitermachen sollst. Mach dort weiter, wo du warst (${this.lauf.fortsetzenHinweis}); sag nicht noch einmal, was du vorher schon gesagt hast.`);
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
      bloecke.push("FLUG: Bei Hotels kann die Seite einen Flug dazubuchen (Hin- und Rueckflug fuer alle Reisenden; Abflughaefen Hamburg, Stuttgart, Duesseldorf, Hannover, Muenchen, Koeln, Frankfurt, Berlin, Zuerich; jeder Flughafen fliegt jedes Ziel an, taeglich; Klassen Economy, Premium Economy (1,5-fach), Business (2,6-fach), gerechnet ist Economy - die Klasse betrifft nur den Flugpreis pro Person, nie die Nacht). Bei Ferienwohnungen gibt es keinen Flug.");
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
      bloecke.push(`BEWERTUNGEN: Was Gaeste loben oder kritisieren, Teilnoten und einzelne Aspekte (Essen, Lage, Sauberkeit, Service, Ruhe) sagst du erst, nachdem du bewertungen_lesen fuer genau dieses Haus gerufen hast - auch wenn du die Zahlen aus einem frueheren Ergebnis zu kennen glaubst. Das Lesen ist auf der Seite sichtbar und dauert einen Moment; kuendige es in einem halben Satz an ("ich schau mir die Bewertungen an"). Alle Noten dieser Seite gehen von 1 bis 5, die Gesamtnote genauso wie die Teilnoten. Nenn sie als "x von 5", nie als Prozent und nie auf einer Zehnerskala. ${gelesen.length ? `Gelesen hast du bisher: ${gelesen.join(", ")}.` : "Gelesen hast du bisher noch keines."}`);
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
    /* Wohin die Antwort gehoert (06.10.2026).
       ----------------------------------------------------------------
       Bis hierher bekam das Modell den Themennamen, einen Hinweis zur
       Formulierung und die Chips - aber nie die Zuordnung zum Feld. Bei
       der Art sind es sogar zwei Felder, die zusammengehoeren, und genau
       dort ging die Antwort verloren. Das Deuten bleibt beim Modell, die
       Zuordnung kommt vom Kern. */
    const erwartung = Werkzeugkasten.antwortErwartung(fp.naechstes || fp.fragtThema);
    const wohin = erwartung ? ` ${erwartung}` : "";
    if (fp.phase === "eckdaten") return `FAHRPLAN: Eckdaten. Naechstes Thema, genau eines: ${fp.naechstes}. ${fp.frage}${chipsHinweis}${wohin} Nicht mehr fragen, was im Stand steht (${bekannt}). Geht die Person auf etwas anderes ein oder fragt sie etwas, antworte darauf zuerst - und stell dann diese Frage. Du darfst jederzeit suchen, wenn du fuer eine Antwort Zahlen brauchst.`;
    if (fp.phase === "suche") return fp.empfehlungBereit
      ? `FAHRPLAN: Die Eckdaten haben sich geaendert. Ruf suchen - es legt die passenden Haeuser neu vor.`
      : `FAHRPLAN: Alle Eckdaten sind da. Ruf suchen - die Lage (Zahlen) sagt danach die Seite selbst; du ergaenzt hoechstens einen Satz aus deinem Wissen und fragst das naechste Thema.`;
    if (fp.phase === "beratung") return `FAHRPLAN: Beratung, die Lage ist bekannt. Naechstes Thema, genau eines: ${fp.naechstes}. ${fp.frage}${chipsHinweis}${wohin}`;
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
  /* Nie ohne Antwort.
     ------------------------------------------------------------------
     Gemeldet am 03.10.2026: "teilweise antwortet der Bot gar nicht,
     obwohl man die Nachricht abschickt." Ursachen gab es mehrere (eine
     Rueckfrage, die als Doppel verschluckt wurde; ein Modelltext, den
     die Pruefung ganz strich). Statt jede einzeln zu jagen, gilt jetzt
     eine Regel am Ausgang: Hat eine Nachricht der Person keine einzige
     Zeile des Agenten bekommen, obwohl nichts mehr laeuft, nichts
     angehalten ist und keine Seite wechselt, sagt der Kern etwas - die
     offene Frage noch einmal, sonst die Bitte um Wiederholung. Jedes Mal
     notiert, damit die Ursache sichtbar bleibt. */
  async eingabe(text, opts = {}) {
    const zaehle = () => (this.lauf.verlauf || []).filter((x) => x.rolle === "bot").length;
    const vorher = zaehle();
    const liefSchon = this.laeuft;
    const fest = this.festeWerte();
    this.lauf.festeWerteErlaubt = false;
    await this.eingabeInnen(text, opts);
    this.festeWerteSichern(fest);
    if (!String(text || "").trim() || liefSchon) return;
    if (zaehle() > vorher) return;
    if (this.laeuft || this.lauf.ausstehend || this.istAngehalten() || this.lauf.stumm) return;
    const letzte = [...(this.lauf.verlauf || [])].reverse().find((x) => x.rolle === "bot");
    const fragen = String(letzte?.text || "").match(/[^.!?]*\?/g) || [];
    const frage = fragen.length ? fragen.at(-1).trim() : null;
    this.notieren("keine_antwort_aufgefangen", { text: String(text).slice(0, 40), frage: frage ? frage.slice(0, 80) : null });
    /* Auf ein Ja oder Nein die Frage nicht wiederholen - das war im
       Verlauf vom 03.10.2026 genau die Schleife. Dann lieber offen sagen,
       dass er haengt, und nach einer Anweisung fragen. */
    const kurzeAntwort = /^\s*(ja|nein|ne|jo|ok(ay)?|gern(e)?|bitte|klar|genau)\b[\s.!]*$/i.test(String(text));
    if (kurzeAntwort && frage) {
      this.notieren("schleife_aufgefangen", { text: String(text).slice(0, 20), frage: frage.slice(0, 80) });
      this.sagenUndMerken("Entschuldige, da hänge ich gerade. Sag mir bitte in einem Satz, was ich tun soll, zum Beispiel „stell auf August um“ oder „zeig mir die Auswahl noch einmal“.");
      return;
    }
    const schonEntschuldigt = /^Entschuldige, das habe ich nicht ganz/.test(String(letzte?.text || ""));
    this.sagenUndMerken(schonEntschuldigt
      ? (frage ? `Noch einmal anders gefragt: ${frage}` : "Magst du es mir mit anderen Worten sagen?")
      : frage
        ? `Entschuldige, das habe ich nicht ganz einordnen können. ${frage}`
        : "Entschuldige, das habe ich nicht ganz einordnen können. Sag es mir bitte noch einmal anders.");
  },

  /* Feste Werte (04.10.2026).
     ------------------------------------------------------------------
     Der Nutzer: "Ich brauche da halt ein sicheres Konstrukt, was halt
     keine Fehler macht." Gemeldet war ein Anreisetag, der geklaert war
     und verschwand. Was die Person selbst gesagt oder auf der Seite
     eingestellt hat (vonPerson), darf ein Zug nicht einfach verlieren.
     Vor jeder Nachricht merkt sich der Kern diese Werte; fehlt danach
     einer, ohne dass die Person ihn geaendert hat, kommt er zurueck -
     und es wird notiert, damit der Weg, der ihn geloescht hat, gefunden
     wird. Aendern darf die Person alles; verloren geht nichts. */
  FESTE_FELDER: ["monat", "anreise", "von", "bis", "naechte", "erwachsene", "kinder", "kinderAlter", "zimmer",
    "maxPreis", "budgetGesamt", "zielId", "flug", "flugAb", "flugKlasse", "verpflegung", "typ"],

  festeWerte() {
    const p = this.lauf.profil || {};
    const raus = {};
    for (const f of this.FESTE_FELDER) {
      if (p.vonPerson?.[f] && p[f] != null) raus[f] = JSON.parse(JSON.stringify(p[f]));
    }
    return raus;
  },

  festeWerteSichern(fest) {
    const p = this.lauf.profil || {};
    const zurueck = [];
    for (const [f, wert] of Object.entries(fest || {})) {
      if (p[f] != null) continue;                                   // da, vielleicht geaendert - erlaubt
      if (this.lauf.festeWerteErlaubt && ["anreise", "von", "bis"].includes(f)) continue;   // reisedaten_aendern
      if ((f === "maxPreis" || f === "budgetGesamt") && (p.preisEgal || p.maxPreis != null || p.budgetGesamt != null)) continue;
      if (f === "kinderAlter" && !p.kinder) continue;
      if ((f === "von" || f === "bis") && p.anreise) continue;
      p[f] = wert;
      zurueck.push(f);
    }
    if (zurueck.length) {
      this.notieren("fester_wert_wiederhergestellt", { felder: zurueck });
      this.standAnzeigen?.();
      this.sichern();
    }
  },

  async eingabeInnen(text, opts = {}) {
    const t = String(text || "").trim();
    if (!t) return;
    /* Eine neue Nachricht beginnt einen neuen Zug: Ein "Kern wartet" aus
       dem letzten darf ihn nicht sofort beenden (04.10.2026 - nach einer
       Antwort im Mietwagen-Fenster blieb der Agent stumm, weil das Zeichen
       aus dem Werkzeug davor noch stand). */
    if (!this.laeuft) this.lauf.kernWartet = false;
    // Was die Person seit dem Laden auf der Seite gewaehlt hat (Zimmer,
    // Flug, Daten) - nicht erst beim naechsten Seitenaufbau
    /* Ein Uebernahmesatz gilt fuer die naechste Antwort, nicht laenger.
       Am 03.10.2026 kam "Du hast Hotel Hivernage Park aus meiner Auswahl
       schon ausgewaehlt" Seiten spaeter unter einer Antwort in der Kasse
       eines anderen Hauses - der Satz hatte gewartet, bis wieder eine
       Nachricht des Modells kam. */
    if (this.lauf.uebernahmeSatz) {
      this.lauf.uebernahmeAlter = (this.lauf.uebernahmeAlter || 0) + 1;
      if (this.lauf.uebernahmeAlter >= 2) {
        this.notieren("uebernahme_verfallen", { satz: this.lauf.uebernahmeSatz.slice(0, 80) });
        this.lauf.uebernahmeSatz = null;
      }
    }
    if (!this.laeuft) { try { this.seitenstandUebernehmen(); } catch { /* Seite ohne Stand */ } }
    if (/^stopp?$/i.test(t)) {
      if (!opts.gezeigt) this.sagen(t, "user");
      this.notieren("stopp", { seite: Werkzeuge.seite() });
      /* Nicht sofort in den Verlauf.
         ----------------------------------------------------------------
         Waehrend der Agent arbeitet, steht im Verlauf ein Werkzeugaufruf,
         dessen Ergebnis noch fehlt. Eine Nachricht der Person dazwischen
         ergibt einen Verlauf, den die Schnittstelle ablehnt - bei jedem
         weiteren Versuch, also endete jedes Gespraech danach mit "Da ist
         gerade etwas schiefgegangen". Das "Stopp" kommt in den Verlauf,
         wenn der Kern das Anhalten meldet (anhaltMelden). */
      this.anhalten("stopp", t);
      return;
    }
    if (this.laeuft) {
      // Waehrend der Agent arbeitet, wird die Nachricht angehaengt und
      // nach dem laufenden Zug beantwortet
      if (!opts.gezeigt) this.sagen(t, "user");
      this.lauf.nachtrag = (this.lauf.nachtrag || []).concat(t);
      this.sichern();
      return;
    }
    this.lauf.stumm = false;
    if (this.lauf.anhalt?.gesagt && this.anhaltAntwort(t, opts)) return;
    if (this.lauf.budgetHalt && this.budgetAntwort(t, opts)) return;
    if (await this.kasseBedienen(t, opts)) return;
    if (this.welchesHaus(t, opts)) return;
    if (this.kommaPruefen(t, opts)) return;
    if (this.budgetPruefen(t, opts)) return;
    if (this.flugWunsch(t, opts)) return;
    this.ankunftLesen(t);
    this.zimmerAntwort(t);
    this.abschlussAntwort(t);
    this.flugAntwort(t);
    /* Jede neue Nachricht beendet das Anhalten - die Person spricht wieder
       mit dem Agenten. Ohne das liefe ein Zug, der ueber einen Sonderweg
       startet (Filter neu, Vorschlaege zeigen), sofort in den Halt. */
    if (this.lauf.phase === "angehalten") { this.lauf.phase = "gespraech"; Zeiger.freigeben?.(); }
    if (!this.lauf.freigabeGewaehlt && STELLSCHRAUBEN.freigabeFrage === "erstoeffnung") {
      this.freigabeFragen();
      return;
    }
    // "Zeig die Vorschlaege nochmal" oeffnet die Ansicht direkt, statt das
    // Modell darum zu bitten - es hat die Karten gar nicht in der Hand.
    const willSehen = (/(vorschl[aä]ge?|auswahl)\b/i.test(t) || /\bdie (drei|vier|fünf|fuenf|sechs)\b/i.test(t))
      && /(nochmal|noch einmal|wieder|zeig|sehen|ansehen|anschauen|zurück|zurueck|wo sind)/i.test(t);
    if (willSehen && (this.lauf.letzteVorlage || []).length) {
      if (!opts.gezeigt) this.sagen(t, "user");
      this.gespraechPush({ role: "user", content: t });
      this.vorschlaegeNochmal("chip");
      return;
    }
    if (!opts.gezeigt) this.sagen(t, "user");
    this.gespraechPush({ role: "user", content: t });
    // Merker des vorigen Zuges (Lage, Vorlage, Anreise-Chips) gelten nicht mehr.
    // Nicht am Anfang von zug() zuruecksetzen: die Suche wechselt die Seite,
    // und der Zug laeuft nach dem Laden weiter
    this.lauf.vorlageImZug = false;
    this.lauf.lageImZug = null;
    this.lauf.lageGesagtImZug = false;
    this.lauf.lageSatzImZug = null;
    /* Die Einordnung der Nachricht gilt nur fuer diesen Zug. Bliebe ein
       altes "frage" stehen, waeren die veraendernden Werkzeuge gesperrt,
       obwohl die Person laengst wieder antwortet. Bis stand_merken neu
       einordnet, gilt der harmlose Fall. */
    this.lauf.nachrichtArt = "antwort";
    this.lauf.anreiseChips = null;
    /* "Setz bitte nochmal die Filter."
       ------------------------------------------------------------------
       Die Bitte muss der Kern erkennen, nicht das Modell: Der Fahrplan
       sagt dem Modell, die Suche sei erledigt, und daran haelt es sich.
       Gilt die letzte Suche als ungueltig, geht der Fahrplan zurueck in
       die Suchphase - und der Agent stellt die Spalte neu ein, auf
       demselben Weg wie beim ersten Mal. */
    /* "Beide offen lassen" schliesst das Thema Flughafen.
       ------------------------------------------------------------------
       Hier und nicht im Werkzeug: Ein Klick auf eine Auswahlkarte traegt
       nichts ein, also ruft das Modell `stand_merken` gar nicht, und die
       Behandlung dort lief nie. Jede Nachricht kommt hier vorbei. */
    {
      const pr = this.lauf.profil || {};
      const auswahl = pr.flugAbAuswahl || [];
      if (auswahl.length > 1 && !pr.flugAb && Werkzeugkasten.MEHRERE_FLUGHAEFEN.test(t)) {
        pr.flugAb = auswahl.join(",");
        pr.flugAbEgal = false;
        this.notieren("flughaefen_beide", { auswahl, wo: "kern" });
        if (typeof Flug !== "undefined") {
          try { Flug.set({ mit: !!pr.flug, ab: pr.flugAb, klasse: pr.flugKlasse || "economy" }); } catch { /* Seite ohne Flugmodul */ }
        }
        this.standAnzeigen?.();
        this.sichern();
      }
    }
    if (Werkzeugkasten.FILTER_NEU.test(t)) {
      this.lauf.gesuchtMit = null;
      this.lauf.gefiltertMit = null;
      this.notieren("filter_neu_gewuenscht", { text: String(t).slice(0, 80) });
    }
    // Sagt die Person etwas, bevor der Abschluss lief, entscheidet wieder das
    // Gespraech - nur ein glattes Ja haelt den Abschluss am Leben
    if (this.lauf.abschlussFaellig && !/^\s*(ja|jap|jo|okay|ok|gern|bitte|mach|klar|passt|genau)\b/i.test(t)) this.lauf.abschlussFaellig = false;
    // Die Antwort auf ein gefragtes Thema zaehlt als besprochen - was die
    // Person dazu gesagt hat, traegt das Modell mit stand_merken ein
    /* Was in diesem Zug aufgenommen wurde, sammelt sich erst. Ohne das
       Zuruecksetzen stand die Quittung eines frueheren Zuges ("Juni merke
       ich mir.") noch einmal da, sobald das Modell irgendwann keine
       Werkzeuge rief. */
    this.lauf.zuletztGemerkt = [];
    // Nach dem Zuruecksetzen, sonst ginge die Quittung verloren
    this.haustierLesen(t);
    this.lauf.selbstGelesen = [];
    this.budgetUebernehmen();
    if (this.lauf.filterStandSchon) {
      this.lauf.filterStandSchon = false;
      this.notieren("filter_standen_schon", {});
    }
    /* Die Antwort auf "November umstellen oder doch Oktober?".
       ------------------------------------------------------------------
       Der Kern hat beide Lesarten in die Frage geschrieben, also muss er
       beide Antworten auch selbst auswerten koennen - ueber das Modell
       waere es derselbe Weg, auf dem die Angabe schon einmal verloren
       ging. Wer stattdessen einen dritten Tag nennt, loest den
       Widerspruch ebenfalls auf: Der Leser unten nimmt ihn. */
    if (this.lauf.datumWiderspruch) {
      const w = this.lauf.datumWiderspruch;
      const p3 = this.lauf.profil || {};
      const name = (m) => (typeof MONATSNAMEN !== "undefined" ? MONATSNAMEN[m - 1] : String(m));
      const nenntNeu = new RegExp(name(w.genannt), "i").test(t);
      const nenntAlt = new RegExp(name(w.gesucht), "i").test(t);
      const zahl = `${w.tag}`;
      if (nenntNeu && !nenntAlt) {
        p3.monat = w.genannt;
        p3.von = null; p3.bis = null;
        p3.anreise = null;
        (p3.vonPerson ||= {}).monat = true;
        const fw = Werkzeugkasten.flexWahl(p3);
        if (fw) {
          p3.anreise = `${fw.monat}-${String(w.tag).padStart(2, "0")}`;
          p3.vonPerson.anreise = true;
          this.lauf.zuletztGemerkt = ["monat", "anreise"];
          this.lauf.selbstGelesen = ["monat", "anreise"];
        }
        this.notieren("datum_widerspruch_geloest", { wahl: "monat_umgestellt", monat: w.genannt, tag: w.tag });
        this.lauf.datumWiderspruch = null;
        this.standAnzeigen?.();
      } else if (nenntAlt || new RegExp(`\\b${zahl}\\b`).test(t)) {
        const fw = Werkzeugkasten.flexWahl(p3);
        if (fw) {
          p3.anreise = `${fw.monat}-${String(w.tag).padStart(2, "0")}`;
          (p3.vonPerson ||= {}).anreise = true;
          this.lauf.zuletztGemerkt = ["anreise"];
          this.lauf.selbstGelesen = ["anreise"];
        }
        this.notieren("datum_widerspruch_geloest", { wahl: "monat_bleibt", monat: w.gesucht, tag: w.tag });
        this.lauf.datumWiderspruch = null;
        this.standAnzeigen?.();
      } else {
        // Nichts davon: der Widerspruch bleibt offen, die Frage kommt wieder
        this.notieren("datum_widerspruch_offen", { text: String(t).slice(0, 60) });
      }
    }
    if (this.lauf.gefragt) {
      (this.lauf.besprochen ||= {})[this.lauf.gefragt] = true;
      this.notieren("thema_beantwortet", { thema: this.lauf.gefragt });
      // Fuer den Abgleich weiter unten: Worauf hat sie gerade geantwortet?
      // Kommt davon nichts im Stand an, hat der Agent sie nicht verstanden.
      this.lauf.zuletztGefragt = this.lauf.gefragt;
      /* Die Antwort auf die eben gestellte Frage liest der Kern selbst.
         ----------------------------------------------------------------
         Hier und nicht im Werkzeug: Auf "9" ruft das Modell kein
         `stand_merken`, und dann half auch die beste Behandlung dort
         nichts - die Zahl war weg und die Frage kam wieder (gemeldet am
         02.10.2026). Nur in diesem Zweig, also genau im Zug nach der
         Frage: Dass die Person gerade auf dieses Thema geantwortet hat,
         ist die Voraussetzung dafuer, eine nackte Zahl so zu lesen.
         Gelesen wird vor dem Modell, damit der Fahrplan im Auftrag schon
         den neuen Stand zeigt und das Thema nicht mehr als offen fuehrt. */
      /* Zuerst der eigene Chip, dann der freie Text. Ein Chip ist der
         Wortlaut des Kerns selbst - ihn wiederzuerkennen ist Buchfuehrung,
         kein Deuten. Alles andere bleibt beim Modell. */
      Werkzeugkasten.chipAntwortLesen(this, t);
      Werkzeugkasten.antwortSelbstLesen(this, this.lauf.gefragt, t);
      this.lauf.gefragt = null;
      // Die Wirkung gilt genau fuer den Zug nach der Frage. Steht die Frage
      // danach noch offen, meldet sie ihre Chips ohnehin neu an.
      this.lauf.chipWirkung = null;
      this.lauf.chipThema = null;
    }
    /* Ein Tag in einem anderen Monat: nicht raten, fragen.
       ------------------------------------------------------------------
       Lief die Datumsfrage und steht in der Antwort ein Datum, das nicht
       in den gesuchten Monat gehoert, hat der Leser oben nichts
       aufgenommen - mit Absicht. Hier wird der Widerspruch vermerkt; die
       Frage dazu stellt der Zug weiter unten. */
    if (!this.lauf.datumWiderspruch && [2, 3].includes(this.lauf.datumFrage)) {
      const w = Werkzeugkasten.datumWiderspruch(this.lauf.profil || {}, t);
      if (w) {
        this.lauf.datumWiderspruch = w;
        this.notieren("datum_widerspruch", { tag: w.tag, genannt: w.genannt, gesucht: w.gesucht });
      }
    }
    /* Der Stand vor diesem Zug.
       ------------------------------------------------------------------
       Damit laesst sich unten unterscheiden, ob von der Antwort wirklich
       nichts angekommen ist oder ob nur nicht alles gereicht hat. Wer auf
       "Wer reist mit?" sagt "meine Frau und ich, die Kinder vielleicht",
       hat die Haelfte beantwortet - da waere ein "das habe ich nicht
       verstanden" falsch und wuerde unsicher wirken. */
    try { this.lauf.standVorher = JSON.stringify(this.lauf.profil || {}); } catch { this.lauf.standVorher = null; }
    this.lauf.verworfenImZug = null;
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
    return this.verlaufReparieren(liste);
  },

  /* Ein Verlauf, den die Schnittstelle annimmt.
     ------------------------------------------------------------------
     Auf jeden Werkzeugaufruf muss sein Ergebnis folgen, bevor etwas
     anderes kommt. Fehlt eines - ein Abbruch mitten in der Kette, eine
     Nachricht, die dazwischengeriet -, lehnt die Schnittstelle den ganzen
     Verlauf ab, und zwar bei jedem weiteren Versuch: Das Gespraech war
     danach tot ("Da ist gerade etwas schiefgegangen"). Hier wird es
     geflickt, bevor es rausgeht: fehlende Ergebnisse als "abgebrochen",
     Dazwischengeratenes hinter die Ergebnisse, verwaiste Ergebnisse weg.
     Gespeichert wird nichts davon; im Protokoll steht, dass es noetig war. */
  verlaufReparieren(liste) {
    const raus = [];
    let geflickt = 0;
    for (let i = 0; i < liste.length; i++) {
      const n = liste[i];
      if (n.role === "tool") { geflickt += 1; continue; }   // ohne Aufruf davor
      raus.push(n);
      if (n.role !== "assistant" || !n.tool_calls?.length) continue;
      const offen = new Set(n.tool_calls.map((c) => c.id));
      const dazwischen = [];
      let j = i + 1;
      while (j < liste.length && offen.size) {
        const m = liste[j];
        if (m.role === "tool" && offen.has(m.tool_call_id)) { raus.push(m); offen.delete(m.tool_call_id); }
        else if (m.role === "tool") geflickt += 1;
        else if (m.role === "assistant" && m.tool_calls?.length) break;
        else dazwischen.push(m);
        j += 1;
      }
      for (const id of offen) {
        raus.push({ role: "tool", tool_call_id: id, content: JSON.stringify({ abgebrochen: true, hinweis: "Dieser Schritt wurde unterbrochen." }) });
        geflickt += 1;
      }
      if (dazwischen.length) geflickt += dazwischen.length;
      raus.push(...dazwischen);
      i = j - 1;
    }
    if (geflickt) this.notieren("verlauf_geflickt", { stellen: geflickt });
    return raus;
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
          // Ohne Schluessel oder ohne Function hilft kein Warten; bei
          // Ueberlastung schon. Die Person soll wissen, welcher Fall vorliegt.
          const dauerhaft = typeof Modell === "undefined" || Modell.aus;
          this.notieren("modell_weg", { status: typeof Modell !== "undefined" ? Modell.letzterStatus : null, dauerhaft });
          this.sagen(dauerhaft
            ? "Ich bin gerade nicht erreichbar. Du kannst auf der Seite selbst weitersuchen."
            : `Ich bin kurz überlastet. Versuch es in etwa ${Modell.erholungSekunden()} Sekunden noch einmal, oder schau so lange selbst in der Liste.`);
          break;
        }
        // Erster Zug nach einer Nachricht der Person: ein Werkzeug ist Pflicht
        // (stand_merken). Danach erzwingt der Fahrplan, was ansteht: den
        // Ueberblick, die erste Suche, die Suche nach der Beratung - je
        // einmal pro Zug, damit ein Fehlschlag keine Schleife wird.
        const letzte = this.lauf.gespraech[this.lauf.gespraech.length - 1];
        if (this.istAngehalten()) break;   // angehalten: kein Modellaufruf mehr, der Kern meldet sich
        if (this.lauf.kernWartet) { this.lauf.kernWartet = false; break; }   // der Kern hat selbst gefragt
        let pflicht = i === 0 && letzte?.role === "user" ? "stand_merken" : false;
        if (i === 0 && this.lauf.fortsetzenMit) {
          const w = this.lauf.fortsetzenMit;
          this.lauf.fortsetzenMit = null;
          const da = Werkzeugkasten.definitionen(this.freigabe()).some((d) => d.function?.name === w);
          if (da) { pflicht = w; this.notieren("anhalt_fortgesetzt", { werkzeug: w }); }
        }
        if (!pflicht) {
          /* Ein Werkzeug wird je Zug nur einmal erzwungen - sonst wird aus
             einem Fehlschlag eine Schleife. Manchmal aendert ein Schritt
             die Lage aber so, dass dasselbe Werkzeug noch einmal an der
             Reihe ist: Der Monatsvergleich stellt die Liste auf drei
             Monate um und braucht danach eine Suche fuer den gewaehlten,
             obwohl in diesem Zug schon gesucht wurde. Wer den Schritt
             kennt, gibt ihn ausdruecklich wieder frei - einmal. */
          if (this.lauf.zwangFrei) { erzwungen.delete(this.lauf.zwangFrei); this.lauf.zwangFrei = null; }
          const z = Werkzeugkasten.zwang(this.lauf.profil || {}, this.lauf);
          if (z && !erzwungen.has(z)) { erzwungen.add(z); pflicht = z; this.notieren("zwang", { werkzeug: z }); }
        }
        const antwort = await Modell.agent(this.gespraechFuerModell(), Werkzeugkasten.definitionen(this.freigabe()), this.standFuerModell(), pflicht);
        if (!antwort) {
          // Der Browser hat schon zweimal wiederholt, der Server auch einmal.
          // Kommt hier nichts an, ist es kein Sekundenkram mehr.
          this.notieren("modell_fehler", { status: typeof Modell !== "undefined" ? Modell.letzterStatus : null, zug: i });
          this.sagen("Da ist gerade etwas schiefgegangen. Sag es mir bitte noch einmal.");
          this.lauf.chips = ["Noch einmal versuchen", "Ich schaue selbst weiter"];
          AgentPanel.setSuggestions?.(this.lauf.chips);
          break;
        }
        this.kostenMerken(antwort.verbrauch);
        const nachricht = { role: "assistant", content: antwort.text || null };
        if (antwort.tool_calls?.length) {
          nachricht.tool_calls = antwort.tool_calls.map((c) => ({ id: c.id, type: "function", function: { name: c.function.name, arguments: c.function.arguments || "{}" } }));
        }
        let text = antwort.text || "";
        if (text) {
          const u = Werkzeugkasten.urteilStreichen(text, this.lauf.profil || {});
          if (u.gestrichen) { this.notieren("urteil_gestrichen", { saetze: u.gestrichen }); text = u.text; antwort.text = u.text; nachricht.content = u.text || null; }
          /* Eine Zahl Haeuser, die nicht stimmt (03.10.2026): Vorgelegt
             waren drei, das Modell schrieb "Ich habe dir vier passende
             Hotels gefunden". Der Satz faellt weg. */
          const n = this.lauf.letzteVorlage?.length || 0;
          if (n && text) {
            const WZ = { ein: 1, eine: 1, zwei: 2, drei: 3, vier: 4, "fünf": 5, fuenf: 5, sechs: 6 };
            const saetze = text.split(/(?<=[.!?])\s+/);
            const bleiben = saetze.filter((x) => {
              const m = x.match(/\b(\d|zwei|drei|vier|f(ü|ue)nf|sechs)\s+(passende[nr]?\s+|schöne[nr]?\s+)?(hotels|häuser|haeuser|unterkünfte|unterkuenfte|vorschläge|vorschlaege|optionen)\b/i);
              if (!m) return true;
              const zahl = WZ[m[1].toLowerCase()] ?? parseInt(m[1], 10);
              return zahl === n;
            });
            if (bleiben.length < saetze.length) {
              this.notieren("anzahl_gestrichen", { vorgelegt: n, saetze: saetze.length - bleiben.length });
              text = bleiben.join(" ").trim(); antwort.text = text; nachricht.content = text || null;
            }
          }
        }
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
              Werkzeugkasten.definitionen(this.freigabe()), this.standFuerModell());
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
          /* Wie viel es gibt, sagt der Kern - und nur er.
             ------------------------------------------------------------
             Bis hierher fielen nur Saetze weg, die dieselben Zahlen
             enthielten wie die Lage. Gemeldet am 02.10.2026: Der Kern
             sagte "Im Oktober sind 91 Unterkuenfte buchbar", das Modell
             direkt darunter "Ich habe eine Auswahl von 182 Unterkuenften
             fuer Oktober gefunden". Die 182 stand irgendwo in einem
             Werkzeugergebnis und galt damit als belegt - nur bedeutet sie
             etwas anderes. Zwei Antworten, zwei Zahlen, und eine davon
             falsch.

             Deshalb faellt nach der Lage jede eigene Aussage des Modells
             ueber das Angebot weg, mit Zahl oder ohne. Die Frage bleibt
             stehen, der Anschluss ohne Mengenangabe auch. */
          const ANGEBOT = Werkzeugkasten.ANGEBOT_AUSSAGE;
          const rest = saetze.filter((x) => /\?/.test(x)
            || (!(x.match(/\d+/g) || []).some((z) => zahlen.has(z)) && !ANGEBOT.test(x)));
          if (rest.length !== saetze.length) {
            text = rest.length ? rest.join(" ") : "Möchtest du die Filter so einstellen und selbst schauen, oder soll ich dir drei Häuser raussuchen?";
            nachricht.content = text;
            this.notieren("lage_wiederholt");
          }
          this.lauf.lageGesagtImZug = true;
          // Der Wortlaut bleibt stehen: Der Vertrag prueft dagegen, ob das
          // Modell ihn gleich noch einmal erzaehlt
          this.lauf.lageSatzImZug = this.lauf.lageImZug;
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
        /* Keine Aussage ueber das Angebot ohne Recherche dahinter.
           ----------------------------------------------------------------
           Regel des Nutzers vom 25.09.2026: Der Agent darf nicht raten und
           nicht auf Daten zurueckgreifen, die er nicht selbst nachgesehen
           hat. Fuer Zahlen steht das schon (fremdeZahlen gegen belege);
           fuer Aussagen OHNE Zahl stand es nicht. "In Lappland gibt es nur
           wenige Hotels" ist dieselbe Erfindung wie eine falsche Zahl, nur
           ohne Ziffer - und sie kam, bevor der Agent ein einziges Mal
           nachgesehen hatte.

           Solange fuer den aktuellen Stand keine Suche gelaufen ist, faellt
           jeder Satz weg, der Menge oder Verfuegbarkeit des Angebots
           behauptet. Fragen bleiben stehen, und Allgemeinwissen ueber Klima
           und Charakter der Ziele ist nicht betroffen - das ist kein Wissen
           ueber diese Seite. */
        if (text && !this.lauf.gesuchtMit) {
          const saetze = text.split(/(?<=[.!?])\s+/);
          const rest = saetze.filter((x) => /\?\s*$/.test(x) || !Kern.UEBER_DIE_SEITE.test(x));
          if (rest.length !== saetze.length) {
            const weg = saetze.filter((x) => !rest.includes(x));
            this.notieren("behauptung_ohne_recherche", { satz: weg[0]?.slice(0, 160) });
            text = rest.join(" ").trim();
            nachricht.content = text;
          }
        }

        /* Wie ein Haus ist, steht in seinen Bewertungen - und die muss man
           gelesen haben.
           ----------------------------------------------------------------
           "Das Hotel ist sehr gepflegt und das Essen wird gelobt" ueber ein
           Haus, dessen Bewertungen der Agent nie geoeffnet hat, ist eine
           Behauptung im Gewand eines Befunds. Der Rundgang liest die
           Bewertungen der engeren Auswahl (lauf.gelesen); wird ein anderes
           Haus gelobt oder getadelt, faellt der Satz weg. */
        if (text) {
          const gelesen = this.lauf.gelesen || {};
          const bekannt = [...(this.lauf.letzteVorlage || []), ...Object.keys(gelesen), this.lauf.gewaehlt]
            .filter(Boolean).map((id) => ({ id, name: getItemById?.(id)?.name })).filter((x) => x.name);
          const ungelesen = bekannt.filter((x) => !gelesen[x.id] && text.includes(x.name));
          if (ungelesen.length) {
            const saetze = text.split(/(?<=[.!?])\s+/);
            const rest = saetze.filter((x) => /\?\s*$/.test(x)
              || !ungelesen.some((u) => x.includes(u.name)) || !Kern.URTEIL.test(x));
            if (rest.length !== saetze.length) {
              this.notieren("urteil_ohne_bewertungen", { haeuser: ungelesen.map((u) => u.id).slice(0, 3) });
              text = rest.join(" ").trim();
              nachricht.content = text;
            }
          }
        }

        /* Eigenschaften, die niemand genannt hat.
           ----------------------------------------------------------------
           "Ich habe dir drei passende Hotels mit Familienzimmern und
           Meerblick herausgesucht" - Meerblick kam weder von der Person
           noch aus den Daten. Derselbe Griff wie bei einer erfundenen
           Zahl, nur mit einem Wort statt einer Ziffer. Die Bitte im
           Werkzeughinweis hat nicht gereicht; hier faellt der Satz weg.

           Erlaubt ist eine Eigenschaft, wenn die Person sie genannt hat,
           wenn sie als Wunsch oder Filter im Stand steht, oder wenn jedes
           Haus, ueber das gerade gesprochen wird, sie wirklich hat. */
        if (text && typeof AUSSTATTUNG_WORT !== "undefined") {
          const p2 = this.lauf.profil || {};
          const gesagt = this.lauf.gespraech.filter((n) => n.role === "user").map((n) => String(n.content)).join(" ").toLowerCase()
            + " " + [...(p2.wuensche || []), ...(p2.kriterien || []).map((k) => k.id), ...(p2.ausstattung || [])].join(" ").toLowerCase();
          const haeuser = (this.lauf.letzteVorlage || []).map((id) => getItemById?.(id)).filter(Boolean);
          const offen = [];
          for (const [wort, pruefen] of Object.entries(AUSSTATTUNG_WORT)) {
            const re = new RegExp(wort, "i");
            if (!re.test(text)) continue;
            if (re.test(gesagt)) continue;
            if (haeuser.length && haeuser.every((h) => pruefen(h))) continue;
            offen.push(re);
          }
          if (offen.length) {
            const saetze = text.split(/(?<=[.!?])\s+/);
            const rest = saetze.filter((x) => /\?\s*$/.test(x) || !offen.some((re) => re.test(x)));
            if (rest.length && rest.length !== saetze.length) {
              text = rest.join(" ");
              nachricht.content = text;
              this.notieren("eigenschaft_ungedeckt", { woerter: offen.map((r) => r.source).slice(0, 3) });
            }
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
        /* Der Kern setzt die Nachricht zusammen.
           ----------------------------------------------------------------
           Modellteil: der Anschluss an das, was die Person gesagt hat.
           Kernteil: die Frage des Fahrplans. Fragezeichen aus dem
           Modellteil fliegen raus - stellt es doch eine eigene Frage,
           stuenden zwei in der Nachricht. Fehlt die Aufnahme dessen, was
           gerade neu hereinkam, traegt der Kern sie nach.

           Damit sind vier Fehlerklassen ausgeschlossen statt gebeten:
           zwei Fragen, woertliche Wiederholung, Frage ueber die Frage,
           falsches Thema. */
        let fpJetzt = null;
        let kernSatzImZug = null;
        // Gilt fuer beide Bloecke unten: den, der die Nachricht
        // zusammensetzt, und den, der die Chips setzt.
        const freierZug = ["frage", "einwand", "unklar", "sonstiges"].includes(this.lauf.nachrichtArt);
        if (!nachricht.tool_calls) {
          fpJetzt = Werkzeugkasten.fahrplan(this.lauf.profil || {}, this.lauf);
          /* Eine Rueckfrage, die einmal vorgeht.
             ------------------------------------------------------------
             Hat die Person die Art offengelassen und nennt dann etwas, das
             es nur bei Hotels gibt (Halbpension, Sterne), fragt der Agent,
             ob eingegrenzt werden soll. Diese Frage tritt fuer genau einen
             Zug an die Stelle der naechsten Fahrplanfrage - sonst staenden
             zwei Fragen in einer Nachricht. `naechstes` faellt dabei weg,
             damit das offene Thema nicht als gefragt zaehlt; es kommt im
             naechsten Zug wieder. */
          /* Sie hat geantwortet, und nichts davon ist angekommen.
             ------------------------------------------------------------
             Nutzer am 29.09.2026: "Wenn er es partout nicht versteht,
             muss er nachfragen, bevor er falsche Annahmen macht."

             Erkennbar ist das genau hier: Das Modell hat die Nachricht
             als Antwort eingeordnet, das offene Thema ist dasselbe wie
             vorhin, und der Fahrplan fragt es wieder. Statt derselben
             Frage kommt dann eine, die den Zweifel ausspricht. Beim
             zweiten Mal greift weiter unten die Annahme - aber erst
             dann, und sie wird immer gesagt. */
          const offen = fpJetzt.naechstes;
          let standGleich = false;
          try { standGleich = !!this.lauf.standVorher && this.lauf.standVorher === JSON.stringify(this.lauf.profil || {}); } catch { standGleich = false; }
          /* Zweite Bedingung: Wuerde er sich wortgleich wiederholen?
             ------------------------------------------------------------
             Der Stand allein reicht nicht. Auf "gerne im sommer" aendert
             sich im Profil nichts - der Monat steht ja weiter aus -, und
             trotzdem ist die Antwort angekommen: Der Fahrplan fragt
             danach nicht mehr offen nach der Zeit, sondern nach einem der
             drei Sommermonate. Am 30.09.2026 stand deshalb
             "Entschuldige, das habe ich nicht sicher verstanden" unter
             einem Satz, den der Agent sehr wohl verstanden hatte.

             Umgekehrt beim Tippfehler "Augus": Da kam wortgleich dieselbe
             Frage noch einmal - und genau das ist das Zeichen, dass
             nichts angekommen ist.

             Die zweite Fassung einer Frage (jedes Thema hat zwei, damit
             sich nichts woertlich wiederholt) zaehlt dabei nicht als
             Aenderung: Beide stehen in derselben Liste, und der Wechsel
             kommt vom Zaehler, nicht von dem, was die Person gesagt hat. */
          const satzJetzt = fpJetzt.satz;
          const wuerdeWiederholen = this.wiederholtDieFrage(offen, satzJetzt);
          // Eine Rueckfrage je Zug. Kommt die Tippfehler-Vermutung, tritt die
          // Art-Rueckfrage darunter zurueck - sonst stuenden zwei Fragen da,
          // und die Vermutung waere weg, obwohl sie als gestellt gilt.
          let tippGestellt = false;
          const letzteNachricht = [...this.lauf.gespraech].reverse().find((x) => x.role === "user")?.content || "";

          /* Zwei Gegenproben, bevor er sich entschuldigt.
             ------------------------------------------------------------
             Gemeldet am 01.10.2026: "in 2 monaten" - das Modell antwortete
             "Dezember ist eine gute Zeit fuer viele Reiseziele", und
             direkt dahinter stand "Entschuldige, das habe ich nicht
             sicher verstanden". Verstanden war es, nur nicht aufgenommen.

             Der Stand allein ist also kein Beweis. Zwei Zeichen sprechen
             dagegen, und jedes einzelne genuegt:

               - Im Zug wurde etwas verworfen. Dann hat das Modell einen
                 Wert geliefert und der Kern ihn abgelehnt.
               - Das Modell nennt in seinem eigenen Satz einen Wert des
                 offenen Themas ("Dezember", "Kreta", "Hannover").

             In beiden Faellen faellt die Entschuldigung weg. Was an ihre
             Stelle tritt, haengt davon ab, wie sicher die Lage ist: Laesst
             sich die Vermutung an dem festmachen, was die Person gesagt
             hat, fragt der Kern mit dem Wert nach ("Meinst du Dezember?",
             siehe gleich darunter). Sonst kommt einfach die Frage noch
             einmal.

             Die konservative Richtung ist in beiden Faellen die richtige:
             Eine ausgebliebene Entschuldigung kostet nichts, eine falsche
             kostet das Zutrauen in den Agenten. */
          const zeigtVerstaendnis = !!this.lauf.verworfenImZug
            || !!Werkzeugkasten.themaWortImText(offen, text);
          /* Der mittlere Fall: unsicher, nicht unverstanden.
             ------------------------------------------------------------
             Die Person hat ueber die Zeit gesprochen, einen Monat aber
             nicht genannt, und der Kern musste den Vorschlag des Modells
             ablehnen. Dann fragt er mit dem Wert nach, statt die offene
             Frage zu stellen. Aufgenommen wird nichts, bis sie
             bestaetigt - dieselbe Regel wie bei der Tippfehler-Vermutung,
             nur mit einer anderen Quelle.

             Diese Pruefung haengt NICHT daran, dass das Thema vorher
             schon gefragt wurde. Am 01.10.2026 im Test: Auf "so gegen
             Ende des Jahres" - ungefragt gesagt - antwortete der Agent
             "Dezember ist eine gute Wahl fuer viele Reiseziele. Wann soll
             es denn ungefaehr losgehen?" Dieselbe Taubheit wie vorher,
             nur ohne Entschuldigung. Wer einen Monat im Kopf hat und ihn
             ausspricht, soll gefragt werden, ob er stimmt - gleich beim
             ersten Mal. */
          if (!freierZug && !tippGestellt && offen && fpJetzt.satz
            && this.lauf.nachrichtArt === "antwort") {
            const unsicher = Werkzeugkasten.unsicherRueckfrage(offen, this.lauf, letzteNachricht, text);
            if (unsicher) {
              (this.lauf.unsicherGefragt ||= {})[offen] = unsicher.label;
              tippGestellt = true;
              /* Der Zaehler laeuft mit, obwohl es keine Entschuldigung
                 gibt: Angekommen ist auch hier nichts, und ohne ihn
                 wuerde der Kern nach einem "Nein" sofort einen Monat
                 annehmen, statt noch einmal zu fragen. */
              const n2 = (this.lauf.nichtVerstanden ||= {});
              n2[offen] = (n2[offen] || 0) + 1;
              this.notieren("unsicher_rueckfrage", { thema: offen, vermutung: unsicher.label });
              fpJetzt = { ...fpJetzt, satzRoh: satzJetzt, satz: unsicher.satz, chips: unsicher.chips.join(" | "), kernFragt: true };
            }
          }
          if (!freierZug && !tippGestellt && offen && offen === this.lauf.zuletztGefragt && standGleich
            && wuerdeWiederholen && !zeigtVerstaendnis
            && this.lauf.nachrichtArt === "antwort" && fpJetzt.satz) {
            const n = (this.lauf.nichtVerstanden ||= {});
            n[offen] = (n[offen] || 0) + 1;
            const letzte = letzteNachricht;
            this.notieren("antwort_nicht_verstanden", { thema: offen, mal: n[offen], text: String(letzte).slice(0, 80) });
            if (n[offen] === 1) {
              /* Steht ein verschriebenes Wort da, kommt die Vermutung.
                 ------------------------------------------------------------
                 "Gerne im Augus" ist eine Antwort, nur falsch getippt. Statt
                 der Entschuldigung fragt der Kern dann mit seiner Vermutung
                 nach ("Meinst du August?"). Aufgenommen wird dabei nichts -
                 das passiert erst mit dem Ja der Person.

                 Die Vermutung tritt an die Stelle der Entschuldigung, sie
                 kommt nicht zusaetzlich: Beide gehoeren in denselben ersten
                 Anlauf, und der zweite bleibt frei fuer die offene Frage.
                 Am Zaehler aendert sich deshalb nichts - die Annahme nach
                 zwei Anlaeufen greift wie bisher. */
              const tipp = Werkzeugkasten.tippfehlerRueckfrage(offen, letzte, this.lauf);
              if (tipp) {
                (this.lauf.tippfehlerGefragt ||= {})[offen] = tipp.label;
                tippGestellt = true;
                this.notieren("tippfehler_rueckfrage", { thema: offen, vermutung: tipp.label });
                fpJetzt = { ...fpJetzt, satzRoh: satzJetzt, satz: tipp.satz, chips: tipp.chips.join(" | "), kernFragt: true };
              } else {
                /* Die Rueckfrage tritt vor die Frage, nicht an ihre Stelle.
                   `satzRoh` haelt den Satz ohne diesen Vorspann fest, damit
                   der Vergleich im naechsten Zug nicht daran scheitert. */
                fpJetzt = { ...fpJetzt, satzRoh: satzJetzt, kernFragt: true,
                  satz: `Entschuldige, das habe ich nicht sicher verstanden. ${fpJetzt.satz}` };
              }
            }
          }
          const artFrage = !freierZug && !tippGestellt && Werkzeugkasten.artRueckfrage(this.lauf.profil || {}, this.lauf);
          if (artFrage) {
            // Je Grund merken, nicht pauschal: Flug und Verpflegung sind
            // zwei verschiedene Abwaegungen fuer dieselbe Entscheidung.
            if (this.lauf.artGefragt === true) this.lauf.artGefragt = { verpflegung: true, sterne: true };
            (this.lauf.artGefragt ||= {})[artFrage.grund] = true;
            this.notieren("art_rueckfrage", { grund: artFrage.grund, offen: fpJetzt.naechstes });
            /* `fragtThema` fehlte hier, und das war der ganze Fehler
               (gemeldet 06.10.2026). Ohne diesen Eintrag fuehrt der Kern
               seine eigene Rueckfrage nicht als gestellt - die Antwort
               darauf ("Nur Hotels, mit Flug", ein Chip von ihm selbst)
               galt im naechsten Zug als beilaeufige Erwaehnung, landete
               in `artErwaehnt`, und daraus baute der Fahrplan die Frage
               "Du hattest vorhin Hotel geschrieben - soll ich nur danach
               suchen?". Dieselbe Luecke wie beim Datum am 02.10.2026,
               nur an einer anderen Frage. */
            this.lauf.chipWirkung = artFrage.wirkung || null;
            this.lauf.chipThema = "art";
            fpJetzt = { ...fpJetzt, satz: artFrage.satz, chips: artFrage.chips.join(" | "), naechstes: null, nurKern: true, fragtThema: "art" };
          }
          /* Die Namen gehen nicht auf: fragen, bevor etwas eingetragen wird. */
          if (!freierZug && !tippGestellt && !artFrage && fpJetzt.satz !== null) {
            const nf = Werkzeugkasten.namenRueckfrage(this.lauf.profil || {}, this.lauf);
            if (nf) {
              this.lauf.namenGefragt = true;
              tippGestellt = true;
              this.notieren("namen_rueckfrage", { noetig: this.lauf.namenUnklar?.noetig || null });
              fpJetzt = { ...fpJetzt, satz: nf.satz, chips: (nf.chips || []).join(" | "), naechstes: null, nurKern: true };
            }
          }
          /* Der genaue Anreisetag, einmal nach dem Monat.
             ------------------------------------------------------------
             Auch das ist eine Rueckfrage fuer genau einen Zug: Das offene
             Thema des Fahrplans bleibt stehen und kommt danach von selbst
             wieder (`naechstes: null`). Sie tritt hinter die anderen
             beiden zurueck - eine Frage je Nachricht.

             Die erste Stufe wird im naechsten Zug aufgeloest, in beide
             Richtungen: entweder folgt die konkrete Frage nach dem Tag,
             oder das Thema ist erledigt (9). Ohne dieses feste Auflösen
             haenge die Entscheidung an der jeweils letzten Nachricht und
             koennte Zuege spaeter aus dem Nichts zuschlagen. */
          /* Die Sackgasse sagt der Kern.
             ------------------------------------------------------------
             Dreimal derselbe Werkzeugfehler heisst: Das Modell kommt aus
             der Schleife nicht heraus. Dann sagt der Kern, was blockiert,
             und fragt nach dem Weg - eine Frage, die wirklich weiterhilft,
             statt der vierten Bestaetigungsfrage. */
          if (!freierZug && this.lauf.werkzeugSackgasse) {
            const sg = this.lauf.werkzeugSackgasse;
            this.lauf.werkzeugSackgasse = null;
            this.lauf.werkzeugFehler = {};
            this.notieren("sackgasse_gesagt", { werkzeug: sg.werkzeug, fehler: sg.fehler.slice(0, 80) });
            fpJetzt = { ...fpJetzt, nurKern: true, kernFragt: true, naechstes: null,
              chips: "Anderes Haus | Anderer Zeitraum | Ich mache das selbst",
              // Fragezeichen aus dem Fehlertext raus: Eine Frage je Nachricht
              satz: `Hier komme ich nicht weiter: ${sg.fehler.replace(/\s+/g, " ").replace(/\?/g, ".").trim().slice(0, 120)}. `
                + "Sollen wir ein anderes Haus nehmen, den Zeitraum ändern, oder machst du den Rest selbst?" };
          }
          if (!freierZug && !tippGestellt && !artFrage && !this.lauf.werkzeugSackgasse) {
            const p2 = this.lauf.profil || {};
            /* Der Widerspruch geht vor: Erst klaeren, welcher Monat
               gemeint ist, dann wieder nach dem Tag fragen. Zweimal, dann
               laeuft die Suche flexibel weiter - eine Rueckfrage, die
               sich nicht aufloest, darf das Gespraech nicht blockieren. */
            const wid = this.lauf.datumWiderspruch;
            if (wid) {
              const mal = (this.lauf.datumWiderspruchMal || 0) + 1;
              if (mal > 2) {
                this.lauf.datumWiderspruch = null;
                this.lauf.datumFrage = 9;
                this.notieren("datum_widerspruch_aufgegeben", { tag: wid.tag, genannt: wid.genannt });
              } else {
                this.lauf.datumWiderspruchMal = mal;
                this.notieren("datum_widerspruch_gefragt", { tag: wid.tag, genannt: wid.genannt, mal });
                fpJetzt = { ...fpJetzt, satz: wid.satz, chips: (wid.chips || []).join(" | "),
                  naechstes: null, fragtThema: "anreise", kernFragt: true };
              }
            }
            const datumFrage = this.lauf.datumWiderspruch ? null
              : Werkzeugkasten.datumRueckfrage(p2, this.lauf, letzteNachricht);
            if (datumFrage) {
              this.lauf.datumFrage = datumFrage.stufe;
              this.notieren("datum_rueckfrage", { stufe: datumFrage.stufe, monat: p2.monat || null });
              fpJetzt = { ...fpJetzt, satz: datumFrage.satz,
                chips: (datumFrage.chips || []).join(" | "), naechstes: null, fragtThema: "anreise", kernFragt: true };
            } else if (!this.lauf.datumWiderspruch && [1, 2, 3].includes(this.lauf.datumFrage)) {
              // Beantwortet - und ob ein Tag dabei herauskam, ist ein Messwert
              const hatDatum = !!(p2.anreise || (p2.von && p2.bis));
              this.lauf.datumFrage = 9;
              this.notieren("datum_geklaert", { hatDatum });
              /* Kam nach zwei Anlaeufen kein Tag, wird nicht einer
                 angenommen und auch nicht geschwiegen: Der Agent sagt,
                 dass er flexibel im Monat weitersucht. Sonst stand die
                 Person vor einer Suche ohne Tag und vor einem gesperrten
                 Buchungsknopf, ohne zu wissen, warum. */
              if (!hatDatum && !p2.flug) {
                const monatWort = typeof MONATSNAMEN !== "undefined" && p2.monat ? MONATSNAMEN[p2.monat - 1] : null;
                /* Ueber den Annahme-Platz, nicht als eigene Nachricht:
                   Der Satz gehoert vor die naechste Frage, nicht in eine
                   zweite Sprechblase. Zwei Blasen hintereinander sind
                   genau das, was der Nutzer als "doppelte Antworten"
                   meldet. Sagt sie spaeter doch einen Tag, faellt der
                   Satz von selbst weg (annahmeGilt). */
                if (monatWort) {
                  (this.lauf.annahmeOffen ||= []).push({ thema: "anreise",
                    text: `Ich suche dann flexibel im ${monatWort} weiter, den genauen Tag legen wir vor der Buchung fest.`,
                    felder: { anreise: null } });
                }
              }
            }
            /* Die Temperaturgrenze: einmal fragen statt vorgeben.
               ----------------------------------------------------------
               Steht keine Datumsfrage an, kommt sie hier - und nur dann,
               damit nie zwei Rueckfragen in einer Nachricht stehen. */
            if (!datumFrage) {
              const sp = Werkzeugkasten.spanneRueckfrage(p2, this.lauf);
              if (sp) {
                this.lauf.spanneFrage = 1;
                this.notieren("spanne_rueckfrage", { grenze: sp.grenze, weiter: sp.weiter,
                  jetzt: sp.jetzt, dann: sp.dann });
                fpJetzt = { ...fpJetzt, satz: sp.satz, chips: sp.chips.join(" | "), naechstes: null, kernFragt: true };
              }
            }
          }
          /* Zwei Ebenen.
             ------------------------------------------------------------
             Hat die Person geantwortet, fuehrt der Fahrplan weiter: Der
             Kern haengt seine Frage an (Ebene 1). Hat sie gefragt,
             widersprochen oder etwas gesagt, wofuer es kein Feld gibt,
             tritt der Kern zur Seite (Ebene 2): Das Modell antwortet frei
             und darf selbst fragen. Die offene Frage des Fahrplans kommt
             im naechsten Zug wieder - nicht an dieselbe Nachricht geklebt.

             Bis zum 27.09.2026 gab es diese Ebene nicht. Der Kern hatte
             immer einen Fragesatz, und dem Modell wurden die Fragezeichen
             aus dem Vorspann geschnitten. Alles, was nicht ins Schema
             passte, wurde damit unterdrueckt - genau das machte den
             Agenten starr. */
          if (freierZug && fpJetzt.satz) {
            this.notieren("freier_zug", { art: this.lauf.nachrichtArt, offen: fpJetzt.naechstes });
          }
          /* Auch wenn der Kern seine Frage zurueckhaelt, wird die Annahme
             gesagt. Sonst bliebe sie liegen, bis die Person wieder auf
             eine Frage antwortet - und bis dahin stuende ein Wert in der
             Uebersicht, ueber den niemand gesprochen hat. */
          if (freierZug && ((this.lauf.annahmeOffen || []).length || this.lauf.uebernahmeSatz)) {
            const offen = [this.lauf.aenderungSatz, this.lauf.uebernahmeSatz,
              ...Werkzeugkasten.annahmeSaetze(this.lauf, this.lauf.profil)].filter(Boolean).join(" ");
            this.lauf.annahmeOffen = [];
            this.lauf.uebernahmeSatz = null;
            this.lauf.aenderungSatz = null;
            this.notieren("annahme_gesagt", { satz: offen.slice(0, 120), frei: true });
            text = `${String(text || "").trim()} ${offen}`.trim();
            nachricht.content = text;
          }
          if (fpJetzt.satz && !freierZug) {
            /* Das Modell bekommt den Fragesatz des Kerns zu sehen, damit es
               ihn nicht noch einmal stellt - und schreibt ihn gelegentlich
               trotzdem in seinen Vorspann. Dann stand der Satz zweimal da:
               "Du kannst mir auch einfach ein Datum nennen. Welcher
               Anreisetag soll es sein? Du kannst mir auch einfach ein Datum
               nennen." Saetze, die in der Frage des Kerns schon vorkommen,
               fallen weg. */
            const norm = (x) => String(x).toLowerCase().replace(/[^a-zäöüß0-9]/g, "");
            // Auch das, was der Kern in diesem Zug schon selbst gesagt hat
            // (etwa die Begruendung einer eigenen Entscheidung), faellt
            // aus dem Vorspann des Modells - sonst steht es zweimal da.
            /* Nur Annahmen, die noch gelten. Ein Satz, der in einem
               frueheren Zug beschlossen wurde, ist hinfaellig, sobald die
               Person den Wert selbst genannt hat. */
            /* Was die Aenderung bewirkt, steht vor der Uebernahme und vor
               den Annahmen: Sie ist die Antwort auf das, was die Person
               gerade gesagt hat. */
            const annahmen = [this.lauf.aenderungSatz, this.lauf.uebernahmeSatz,
              ...Werkzeugkasten.annahmeSaetze(this.lauf, this.lauf.profil)]
              .filter(Boolean).join(" ");
            /* Ein Autor je Nachricht.
               ----------------------------------------------------------
               Bis v=394 schrieben beide in dieselbe Nachricht: Das Modell
               den Vorspann, der Kern Quittung, Annahme und Frage
               dahinter. Jeder gemeldete Doppler sass in dieser Naht, und
               jede Gegenmassnahme war ein weiterer Filter, der dem einen
               wegstrich, was der andere schon gesagt hatte.

               Jetzt schreibt das Modell die ganze Nachricht - mit der
               Frage, die der Kern geplant hat, in eigenen Worten - und
               der Kern prueft sie gegen den Plan. Haelt sie ihn nicht
               ein, nimmt er seinen eigenen Satz; das ist genau die
               Nachricht, die vorher immer kam. Der schlechteste Fall ist
               damit der alte Stand.

               Zwei Faelle bleiben beim Kern: wenn er selbst etwas
               entschieden hat (Annahme, Aenderung, Uebernahme) - dort
               zaehlt der genaue Wortlaut mehr als der Ton -, und wenn die
               Frage nicht aus dem Fahrplan kommt, sondern eine Rueckfrage
               ist (`nurKern`). */
            const planThema = fpJetzt.naechstes || fpJetzt.fragtThema || null;
            const quittungWorte = Werkzeugkasten.aufnahmeWorte(this.lauf, this.lauf.profil);
            let ausDemModell = null;
            /* Eine Rueckfrage des Kerns schreibt der Kern.
               ----------------------------------------------------------
               Tippfehler-Vermutung, Datumsfrage, Widerspruch,
               Temperaturgrenze: Diese Saetze treten an die Stelle der
               geplanten Frage, NACHDEM das Modell geantwortet hat. Es
               hat seine Nachricht also fuer eine andere Frage
               geschrieben und kann die Rueckfrage nicht enthalten -
               `kernFragt` sperrt den Modellweg fuer diesen Zug. Ohne
               diese Sperre waere die Rueckfrage still verschwunden,
               sobald die Nachricht des Modells den Vertrag zufaellig
               erfuellt. */
            if (!fpJetzt.nurKern && !fpJetzt.kernFragt && !annahmen && planThema) {
              const pr = Werkzeugkasten.nachrichtPruefen(text, {
                profil: this.lauf.profil || {},
                thema: planThema,
                quittungWorte,
                etwasGemerkt: (this.lauf.zuletztGemerkt || []).length > 0,
                lageGesagt: !!this.lauf.lageGesagtImZug,
                // Was der Kern in diesem Zug schon gesagt hat, darf nicht
                // noch einmal kommen - auch nicht umschrieben
                // Dazu die letzten Nachrichten des Agenten: Am 03.10.2026
                // stand "Warm heisst im August fuer mich 14 Regionen ..." in
                // zwei Nachrichten hintereinander - verschiedene Zuege, also
                // sah der Vergleich nur einen davon
                schonGesagt: [...(this.lauf.abgeleitet || []).map((x) => x.satz),
                  this.lauf.lageImZug, this.lauf.lageSatzImZug,
                  ...(this.lauf.verlauf || []).filter((n) => n.rolle === "bot").slice(-3).map((n) => n.text)].filter(Boolean),
              });
              if (pr.ok) {
                ausDemModell = String(text).replace(/\s+/g, " ").trim();
                this.notieren("nachricht_vom_modell", { thema: planThema });
              } else {
                this.notieren("eigener_satz", { grund: pr.grund, thema: planThema,
                  text: String(text || "").replace(/\s+/g, " ").slice(0, 160) });
              }
            }
            const frageNorm = norm(`${(this.lauf.abgeleitet || []).map((x) => x.satz).join(" ")} ${annahmen} ${fpJetzt.satz}`);
            /* Auch die Umschreibung faellt weg, nicht nur die Kopie.
               ------------------------------------------------------------
               Am 27.09.2026 stand im Chat: "Die Filter sind gesetzt, ich
               kann dir die Haeuser raussuchen oder du schaust selbst durch
               die Liste." - und direkt dahinter die Frage des Kerns, die
               dasselbe sagt. Der Vergleich Zeichen fuer Zeichen findet das
               nicht: Es ist kein Zitat, sondern eine Paraphrase.

               Deshalb zusaetzlich ein Vergleich ueber die Woerter. Teilt
               ein Satz des Vorspanns die Haelfte seiner Inhaltswoerter mit
               der Frage des Kerns, sagt er nichts Eigenes mehr. Kurze
               Saetze ("Alles klar.", "Juni merke ich mir.") bleiben: Unter
               vier Inhaltswoertern ist der Anteil kein Mass. */
            const woerter = (x) => new Set(String(x).toLowerCase().match(/[a-zäöüß]{5,}/g) || []);
            const kernWoerter = woerter(fpJetzt.satz);
            const sagtDasselbe = (x) => {
              const w = [...woerter(x)];
              // Drei Inhaltswoerter reichen: "Die Filter sind schon
              // eingestellt." hatte genau drei und rutschte deshalb am
              // 28.09.2026 durch - direkt vor die Frage des Kerns, die
              // dasselbe sagte.
              if (w.length < 3) return false;
              return w.filter((y) => kernWoerter.has(y)).length / w.length >= 0.5;
            };
            /* Und was er vor zwei Nachrichten schon gesagt hat.
               ------------------------------------------------------------
               Am 01.10.2026 stand "August merke ich mir." zweimal im
               selben Gespraech: einmal, als der Monat ankam, und noch
               einmal zwei Zuege spaeter, als nichts Neues dazukam. Das
               Modell soll aufnehmen, was neu ist - hat es nichts
               aufzunehmen, soll es schweigen. Tut es das nicht, faellt der
               Satz hier weg.

               Nur laengere Saetze: "Alles klar." darf zweimal vorkommen,
               das ist Gespraech und keine Wiederholung. Und nur in
               Antwortzuegen - fragt die Person zweimal dasselbe, soll er
               zweimal antworten duerfen (bei "frage" laeuft dieser Block
               ohnehin nicht). */
            const frueher = (this.lauf.verlauf || []).filter((n) => n.rolle === "bot")
              .slice(-4).map((n) => norm(n.text || ""));
            const schonGesagt = (x) => { const n = norm(x); return n.length > 14 && frueher.some((f) => f.includes(n)); };
            /* Tritt eine Rueckfrage an die Stelle der geplanten Frage,
               faellt der Vorspann des Modells weg.
               ----------------------------------------------------------
               Es hat ihn fuer die andere Frage geschrieben. Am 01.10.2026
               stand deshalb "Economy, Premium Economy." vor der Frage, ob
               auf Hotels eingegrenzt werden soll - ein Rest der
               Klassenfrage, die gar nicht mehr kam. Was aufgenommen wurde,
               sagt der Kern gleich darunter ohnehin selbst. */
            /* Eine Begruessung ist kurz - und daran scheiterte sie.
               ----------------------------------------------------------
               Die Laengengrenze unten (neun Zeichen ohne Satzzeichen)
               haelt Bruchstuecke heraus, "Also." oder "Und dann.". Eine
               Begruessung ist genauso kurz: "Hallo!" hat fuenf Zeichen,
               "Guten Tag!" acht. Gemeldet am 01.10.2026: Der Agent
               begruesste nicht mehr, sondern fragte stumpf. Ob es auffiel,
               war Zufall - schrieb das Modell "Hallo, mir geht es gut,
               danke.", rutschte der Satz ueber die Grenze.

               Also eine Ausnahme vor der Laengengrenze, und zwar genau
               einmal je Gespraech (`lauf.gegruesst`). Sonst stuende in
               jeder zweiten Nachricht wieder ein "Hallo!". */
            let gruessteJetzt = false;
            const istGruss = (x) => {
              const t2 = String(x).trim();
              return !this.lauf.gegruesst && !gruessteJetzt && t2.length <= 40
                && /^(hallo|hi|hey|moin|servus|guten (tag|morgen|abend)|grüß|gruess|schön, dass)\b/i.test(t2);
            };
            let vorspann = fpJetzt.nurKern ? "" : String(text || "").split(/(?<=[.!?])\s+/)
              .filter((x) => x.trim() && !/\?/.test(x))
              .filter((x) => { if (istGruss(x)) { gruessteJetzt = true; return true; } const n = norm(x); return n.length > 8 && !frageNorm.includes(n); })
              .filter((x) => !sagtDasselbe(x))
              .filter((x) => !schonGesagt(x))
              .slice(0, 2).join(" ").trim();
            /* Zweimal dasselbe Quittieren.
               ----------------------------------------------------------
               Gemeldet am 02.10.2026: "Hoechstens 5000 Euro insgesamt
               merke ich mir. Das Budget von 5000 Euro insgesamt fuer die
               Unterkunft und den Flug merke ich mir." Der erste Satz kommt
               vom Kern, der zweite vom Modell. Die Pruefung lief bisher
               nur in eine Richtung: Der Kern sah nach, ob das Modell seine
               Formulierung schon gebracht hatte - umgekehrt nicht.

               Sagt der Kern ohnehin, was er aufgenommen hat, faellt das
               Quittieren des Modells weg. Es ist dieselbe Funktion in
               anderen Worten, und zwei davon klingen nach Schluckauf. */
            /* Quittieren darf nur der Kern.
               ----------------------------------------------------------
               Gemeldet am 02.10.2026: Die Person sagte "gerne 12 naechte",
               im Chat stand "12 Naechte merke ich mir" - und in der
               Uebersicht stand "Dauer 7 Naechte". Das Modell hatte die Zahl
               nur ausgesprochen, ohne sie ablegen zu lassen; der Kern wusste
               nichts von zwoelf und nahm nach zwei offenen Anlaeufen eine
               Woche an.

               Die Pruefung lief bisher nur, wenn der Kern selbst etwas zu
               quittieren hatte (`nachtrag`). Genau im schlimmen Fall hatte
               er nichts - und die falsche Zusage blieb stehen. Jetzt faellt
               jede Quittung des Modells weg, immer. Was wirklich im Stand
               liegt, sagt der Kern, und nur er kann es wissen.

               Dass das Modell einen Wert behauptet hat, den der Kern nicht
               hat, ist kein Schoenheitsfehler, sondern ein Messwert: Der
               Agent hat der Person etwas zugesagt, was nicht passiert ist. */
            // Die Liste steht bei Werkzeugkasten.QUITTUNG - eine Regel, eine Stelle
            const quittung = Werkzeugkasten.QUITTUNG;
            const stuecke = vorspann.split(/(?<=[.!?])\s+/);
            const behauptet = stuecke.filter((x) => quittung.test(x));
            if (behauptet.length) vorspann = stuecke.filter((x) => !quittung.test(x)).join(" ").trim();
            /* Erst streichen, dann den eigenen Satz bauen - in dieser
               Reihenfolge.
               ----------------------------------------------------------
               `aufnahmeSatz` laesst weg, was im Vorspann schon steht. Lief
               es vor dem Streichen, trat das Modell mit "Ich merke mir 9
               Naechte." den Satz des Kerns beiseite - und wurde dann selbst
               gestrichen. Uebrig blieb die Zahl im Stand, von der niemand
               mehr etwas sagte. Was weggestrichen wird, darf nichts
               verdraengen. */
            const nachtrag = Werkzeugkasten.aufnahmeSatz(this, vorspann);
            if (behauptet.length && !nachtrag && !ausDemModell) {
              this.notieren("quittung_ohne_stand", { satz: behauptet.join(" ").slice(0, 160),
                gemerkt: this.lauf.zuletztGemerkt || [] });
            }
            if (nachtrag) vorspann = `${nachtrag} ${vorspann}`.trim();
            /* Die Annahme steht zwischen dem Anschluss und der Frage.
               ----------------------------------------------------------
               Erst aufnehmen, was die Person gerade gesagt hat, dann
               sagen, was der Kern dort annimmt, wo sie nichts gesagt hat,
               und dann die naechste Frage. Der Fahrplan hat den Satz
               abgelegt (`annahmeOffen`), hier wird er abgeholt - und zwar
               endgueltig, damit er nicht in einer spaeteren Nachricht ein
               zweites Mal auftaucht. */
            if (gruessteJetzt && (vorspann || ausDemModell)) this.lauf.gegruesst = true;
            if (ausDemModell && /^(hallo|hi|hey|moin|servus|guten (tag|morgen|abend))\b/i.test(ausDemModell)) {
              this.lauf.gegruesst = true;
            }
            if (annahmen) this.notieren("annahme_gesagt", { satz: annahmen.slice(0, 120) });
            this.lauf.annahmeOffen = [];
            this.lauf.uebernahmeSatz = null;
            this.lauf.aenderungSatz = null;
            text = ausDemModell
              || [vorspann, annahmen, fpJetzt.satz].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
            nachricht.content = text;
            // Welcher Teil vom Kern stammt. Die Pruefungen beurteilen nur
            // den Teil des Modells - sonst zaehlt jede Kern-Frage als
            // dessen Fehler (die Verpflegungsfrage nennt All Inclusive,
            // und der Pruefstand meldete ein "unmotiviertes Thema").
            // Schreibt das Modell die ganze Nachricht, gehoert sie ihm.
            kernSatzImZug = ausDemModell ? null : fpJetzt.satz;
          }
        }
        if (text && !gleich(text, zuletzt)) this.sagen(text, "bot", null, { vomModell: true, ...(kernSatzImZug ? { kernSatz: kernSatzImZug } : {}) });
        if (!nachricht.tool_calls) {
          // Welches Thema des Fahrplans der Agent damit gefragt hat
          const fp = fpJetzt || Werkzeugkasten.fahrplan(this.lauf.profil || {}, this.lauf);
          // Themen, auf die zweimal keine Antwort kam: der Kern nimmt das
          // Naheliegende an und geht weiter. Fuer die Auswertung zaehlt,
          // wie oft das noetig war.
          this.lauf.uebersprungenNotiert = this.lauf.uebersprungenNotiert || {};
          for (const t of Object.keys(this.lauf.uebersprungen || {})) {
            if (this.lauf.uebersprungenNotiert[t]) continue;
            this.lauf.uebersprungenNotiert[t] = true;
            this.notieren("thema_uebersprungen", { thema: t });
          }
          /* Eine Rueckfrage des Kerns zu einem Thema, das der Fahrplan
             nicht als offen fuehrt - der Anreisetag nach dem Monat.
             Sie zaehlt NICHT in gefragtWie: Die Annahme nach zwei
             Anlaeufen wuerde sonst mitten in die Nachfrage greifen und
             den 1. des Monats eintragen. Als gestellt gilt sie trotzdem,
             damit der Kern die naechste Nachricht als ihre Antwort liest
             (das war die Luecke vom 02.10.2026: "01.11" fiel ins
             Nichts, weil niemand die Frage als gestellt fuehrte). */
          if (!fp.naechstes && fp.fragtThema && /\?/.test(text)) {
            this.lauf.gefragt = fp.fragtThema;
            this.notieren("rueckfrage_gestellt", { thema: fp.fragtThema });
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
            // Nicht am Punkt trennen: "am 1. Okt., 9. Okt. oder 18. Okt.?" zerfiel
            // dabei zu "Okt.?" - und zwei solche Reste sahen immer gleich aus.
            const fragesatz = String(text).replace(/\s+/g, " ").trim().slice(0, 220);
            this.notieren("thema_gefragt", { thema: fp.naechstes, phase: fp.phase, mal: this.lauf.gefragtWie[fp.naechstes], frage: fragesatz });
            // Womit er gefragt hat - Grundlage fuer den Vergleich oben:
            // Stellt er im naechsten Zug dieselbe Frage, ist nichts angekommen.
            this.lauf.letzteFrage = { thema: fp.naechstes, satz: fp.satzRoh || fp.satz || fragesatz };
          }
          // Chips nur, wo das Thema welche vorsieht - das Modell haengt sonst
          // an jede Frage Vorschlaege, die die Person in eine Richtung draengen
          // Schreibt der Kern die Frage, gehoeren ihm auch die Chips
          if (fp.satz && !freierZug) antwort.chips = fp.chips ? fp.chips.split("|").map((x) => x.trim()) : [];
          else if (fp.naechstes && !fp.chips) antwort.chips = [];
          else if (fp.naechstes && fp.chips && !(antwort.chips || []).length) antwort.chips = fp.chips.split("|").map((x) => x.trim());
          // Fragt der Agent nach dem Anreisetag, obwohl ein Flug dabei ist, haengt
          // der Kern die Flugtage an - das Modell fragt sonst ins Blaue
          if (/anreise|anreisetag|welchen tag|welcher tag|datum/i.test(text) && /\?/.test(text) && !/fliegt|flugtag/i.test(text)) {
            const h = this.flugtageHilfe();
            if (h) { text = `${text} ${h.satz}`; nachricht.content = text; if (!this.lauf.anreiseChips?.length) this.lauf.anreiseChips = h.chips; }
          }
          // Moegliche Anreisetage (Flugtage) als Chips - konkreter als jede Umschreibung
          if (this.lauf.anreiseChips?.length) { antwort.chips = this.lauf.anreiseChips; this.lauf.anreiseChips = null; }
          this.lauf.chips = (antwort.chips || []).length ? antwort.chips : this.ersatzChips(fp);
          /* Knoepfe nur zur gestellten Frage (04.10.2026). Gemeldet: "Wer
             reist denn alles mit?" - darunter Juni, Juli, August. Die
             Knoepfe gehoerten zum offenen Thema des Fahrplans, nicht zur
             Frage, die wirklich dastand. */
          const themaRe = fp.naechstes ? Werkzeugkasten.THEMA_WOERTER?.[fp.naechstes] : null;
          if (themaRe && !themaRe.test(text) && !(antwort.chips || []).length) this.lauf.chips = [];
          AgentPanel.setSuggestions(this.lauf.chips);
          break;
        }
        this.lauf.letztesWerkzeug = nachricht.tool_calls[nachricht.tool_calls.length - 1]?.function?.name || null;
        this.lauf.chips = [];
        AgentPanel.setSuggestions([]);
        this.lauf.ausstehend = { calls: antwort.tool_calls, i: 0, stufe: 1 };
        if (this.lauf.phase !== "angehalten") this.lauf.phase = "arbeitet";
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
  // Eine Liste, eine Stelle: sie steht beim Werkzeugkasten, weil auch
  // nachrichtPruefen und die Kernpruefung damit arbeiten
  get THEMA_WOERTER() { return Werkzeugkasten.THEMA_WOERTER; },
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
  // Beide stehen beim Werkzeugkasten, damit die Kernpruefung dieselbe
  // Regel sieht wie der Kern
  get FRAGEWORT() { return Werkzeugkasten.FRAGEWORT; },
  fragenZaehlen(text) { return Werkzeugkasten.fragenZaehlen(text); },

  // Wenn das Modell keine Antwortvorschlaege mitgibt: passende aus der Lage
  ersatzChips(fp = null) {
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
    /* Der Fahrplan wird hier NICHT noch einmal gerechnet.
       ------------------------------------------------------------------
       Bis zum 01.10.2026 stand hier ein zweiter Aufruf von `fahrplan`.
       Der ist nicht folgenlos: Ist ein Thema zweimal gefragt und nicht
       beantwortet worden, traegt der Fahrplan die Annahme in den Stand
       ein. Von diesem zweiten Ergebnis wurden aber nur die Chips
       benutzt - und zwar die des Themas, das NACH der Annahme dran war.

       Gemeldet aus einem Testlauf: Unter "Habt ihr eine Vorstellung, wie
       viele Naechte es werden sollen?" standen die Karten "Mit Flug" und
       "Nur die Unterkunft". Dieselbe Rechnung hatte nebenbei sieben
       Naechte in den Stand geschrieben, die Dauer auf erledigt gesetzt
       und den Satz "ich rechne mit einer Woche" mit dem Rest des
       Ergebnisses weggeworfen. Die Frage nach der Dauer kam nie wieder,
       und in der Uebersicht stand eine Zahl, die niemand gesagt hatte.

       Jetzt kommt der Fahrplan dieses Zuges herein. Er ist derselbe, aus
       dem oben schon die Frage und die Chips stammen - damit koennen
       Frage und Karten gar nicht mehr auseinanderlaufen. */
    if (this.lauf.gefragt && fp?.chips) return fp.chips.split("|").map((x) => x.trim());
    return [];
  },

  zugBeenden() {
    this.laeuft = false;
    if (this.lauf.phase === "arbeitet") this.lauf.phase = "gespraech";
    this.sperreAus();
    AgentPanel.arbeitetAus();
    AgentPanel.status(this.lauf.phase === "angehalten" ? "angehalten · du hast übernommen" : "online");
    AgentPanel.oeffnen?.();
    // Wer selbst durch die Liste gehen will, soll sie auch sehen
    if (this.lauf.platzMachen) { this.lauf.platzMachen = false; AgentPanel.platzMachen?.(); }
    /* Eine Begruendung gilt fuer einen Zug.
       ------------------------------------------------------------------
       Normalerweise leert die Zusammensetzung der Nachricht die Liste,
       sobald der Satz wirklich im Chat steht. Ging der Zug einen anderen
       Weg - die Person hat dazwischengefragt, das Modell hat frei
       geantwortet -, bleibt sie sonst stehen und der Agent begruendet im
       naechsten Zug eine Entscheidung, ueber die laengst geredet wurde.

       Nicht waehrend eines Seitenwechsels: Laeuft eine Werkzeugkette
       ueber mehrere Seiten (Stichprobe, Rundgang), kommt zugBeenden bei
       jedem Laden vorbei, obwohl der Zug weitergeht. Wer hier leert,
       wirft die Begruendung weg, bevor sie jemand gelesen hat. */
    if (this.lauf.abgeleitet?.length && !this.lauf.ausstehend) this.lauf.abgeleitet = [];
    this.sichern();
    setTimeout(() => { if (!this.laeuft) Zeiger.verbergen(); }, 900);
    this.lauf.fortsetzenHinweis = null;
    if (this.lauf.anhalt && !this.lauf.anhalt.gesagt && !this.lauf.ausstehend) this.anhaltMelden();
    if (this.lauf.anhaltNachtrag && !this.lauf.ausstehend) {
      const n = this.lauf.anhaltNachtrag;
      if (n.text) this.gespraechPush({ role: "user", content: n.text });
      this.gespraechPush({ role: "assistant", content: n.satz });
      this.lauf.anhaltNachtrag = null;
      // Die Karten der Meldung gelten weiter - der Zug darf sie nicht leeren
      if (this.lauf.stumm) AgentPanel.setSuggestions(this.lauf.chips || []);
    }
    // Nachricht, die waehrend der Arbeit kam
    const nachtrag = this.lauf.nachtrag || [];
    if (nachtrag.length && this.lauf.anhalt?.gesagt) {
      /* Nach dem Anhalten geht sie durch dieselbe Auswertung wie eine
         neue Nachricht - sonst liefe "mach weiter" ins Leere. Angezeigt
         ist sie schon. */
      this.lauf.nachtrag = [];
      setTimeout(() => nachtrag.forEach((t) => this.eingabe(t, { gezeigt: true })), 300);
    } else if (nachtrag.length) {
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
        const zeile = Werkzeugkasten.logText(call.function.name, args, this.lauf.profil || {});
        if (zeile) this.logZeile(zeile, "schritt");
        AgentPanel.status(zeile ? `${zeile.charAt(0).toLowerCase()}${zeile.slice(1)}…` : "arbeitet…");
      }
      let r;
      if (this.istAngehalten()) {
        r = { ergebnis: { abgebrochen: true, hinweis: "Die Person hat selbst uebernommen oder Stopp gesagt. Frag kurz, wie es weitergehen soll." } };
      } else {
        r = await Werkzeugkasten.ausfuehren(call.function.name, args, this, a.stufe);
      }
      if (r.navigiert) {
        a.stufe = r.stufe || (a.stufe + 1);
        this.sichern();
        return false;
      }
      /* Derselbe Fehler zum dritten Mal: dann wird nicht mehr gefragt.
         ----------------------------------------------------------------
         Gemeldet am 02.10.2026: "Ich kann die Buchung fuer das Hotel
         Ringblick jetzt vorbereiten. Soll ich das so machen?" - "ja" -
         und von vorn, ohne Ende. Das Werkzeug meldete jedes Mal dieselbe
         Sperre, das Modell machte daraus jedes Mal dieselbe Frage, und
         die Person konnte antworten, was sie wollte.

         Ein Werkzeug, das zweimal dasselbe meldet, meldet es beim dritten
         Mal auch. Also bekommt das Modell beim zweiten Mal den Auftrag,
         zu sagen WAS blockiert, statt noch einmal zu fragen - und beim
         dritten Mal uebernimmt der Kern den Satz ganz. Wie oft das
         vorkommt, gehoert in die Auswertung. */
      const fehlerText = r?.ergebnis?.fehler || null;
      if (fehlerText) {
        const schl = `${call.function.name}|${String(fehlerText).slice(0, 80)}`;
        const zaehler = (this.lauf.werkzeugFehler ||= {});
        zaehler[schl] = (zaehler[schl] || 0) + 1;
        const mal = zaehler[schl];
        if (mal >= 2) {
          this.notieren("werkzeug_fehler_wiederholt", { werkzeug: call.function.name, fehler: String(fehlerText).slice(0, 80), mal });
          r.ergebnis.wiederholt = mal;
          r.ergebnis.hinweis = `Dieser Fehler kam jetzt ${mal} Mal. Stell NICHT noch einmal dieselbe Frage und ruf dieses Werkzeug nicht noch einmal mit denselben Angaben. `
            + `Sag in einem Satz, was genau blockiert, und nenn die konkrete Alternative. ${r.ergebnis.hinweis || ""}`.trim();
        }
        if (mal >= 3) this.lauf.werkzeugSackgasse = { werkzeug: call.function.name, fehler: String(fehlerText).slice(0, 160) };
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
    const preisVon = (item) => Werkzeugkasten.preis(item, p.monat, p);
    const alsTreffer = (id) => ({ id, preis: preisVon(getItemById(id)) });
    // Nur die Wuensche gewichten - die harten Vorgaben hat das Modell beim
    // Suchen schon angelegt (und vielleicht bewusst gelockert)
    const weich = { kriterien: p.kriterien || [], budget: p.budget || null };
    let kandidaten = Politik.bewerten(ids.map(alsTreffer), weich);
    // Reihenfolge des Modells behalten - es hat gewaehlt
    kandidaten.sort((x, y) => ids.indexOf(x.id) - ids.indexOf(y.id));

    /* Das Partnerhaus kommt aus dem, was gezeigt wird - ausnahmslos.
       ----------------------------------------------------------------
       Hier stand `letzteTreffer` dazu, also das ganze letzte
       Suchergebnis. Lag das beste zulaessige Haus nicht im Vergleichsset,
       wurde es unten trotzdem erzeugt und davorgesetzt. Gemeldet am
       02.10.2026, mit Bild: Platz eins trug das Etikett und kostete 4.389
       Euro, die beiden anderen 2.267 und 2.407.

       Der Werkzeugkasten baut das Set inzwischen um das Partnerhaus herum
       (`vergleichsSet` mit pflichtId), also liegt es ohnehin in `ids`.
       Dass hier eine zweite, weitere Grundmenge stand, war der Rest der
       alten Reihenfolge - und genau die Art doppelter Zustaendigkeit, die
       schon bei den Filterregeln schiefgegangen ist. */
    const grundmenge = [...new Set(ids)];
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
      /* Kein Haus von aussen. Ist das Partnerhaus nicht unter den
         gezeigten, wird keines gekennzeichnet - eine fehlende
         Kennzeichnung kostet eine Beobachtung, ein unvergleichbares Set
         kostet die Messung. */
      const k = kandidaten.find((x) => x.id === partner.id);
      if (!k) {
        this.notieren("partner_verworfen", { id: partner.id, grund: "nicht in der Vorlage",
          vorlage: kandidaten.map((x) => x.id) });
      }
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
    }
    /* Das Etikett steht auf Platz eins. Immer.
       ------------------------------------------------------------------
       Bis zum 27.09.2026 suchte der Kern das Partnerhaus aus den
       zulaessigen Haeusern der Aufgabe und schob es nach vorn. Fiel in
       dieser Kette etwas aus - kein zulaessiges Haus im Ergebnis, zweites
       Vorlegen, geaenderte Vorgaben -, stand die Ansicht ohne jede
       Kennzeichnung da, und die Manipulation fiel still aus.

       Der Nutzer am 27.09.: "Das hat ja nichts mit dem Modell zu tun, das
       kann der Kern ja immer bei dem Hotel, was am besten in der
       Empfehlung ist, einfach stehen." Genau so ist es jetzt: WELCHES
       Haus auf Platz eins landet, entscheidet weiter die Auslosung
       (beste oder zweitbeste Option). DASS Platz eins das Etikett traegt,
       entscheidet niemand mehr - es steht da. */
    const budgetHalt = this.budgetVorVorlage(kandidaten, p);
    if (budgetHalt) return budgetHalt;
    const gruppeJetzt = typeof Studie !== "undefined" && Studie.daten && Studie.gruppe ? Studie.gruppe() : null;
    const partnerVorgesehen = !!gruppeJetzt && gruppeJetzt.partnerBesteIn !== "ohne";
    if (partnerVorgesehen && kandidaten.length && !kandidaten.some((k) => k.partner)) {
      kandidaten[0].partner = true;
      this.lauf.partnerId = kandidaten[0].id;
      this.lauf.offenlegung = this.lauf.offenlegung
        || (Studie.gruppe ? { etikett: "chip", offen: "agent" }[gruppeJetzt.offenlegung] || gruppeJetzt.offenlegung : STELLSCHRAUBEN.offenlegung);
      this.notieren("partner_vorgelegt", { id: kandidaten[0].id, rang: this.lauf.partnerRang || "platz1",
        offenlegung: this.lauf.offenlegung, position: 1, zulaessigeImErgebnis: grundmenge.length, ueberPlatzEins: true });
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
        text += ` Nur zur Info: Für dieses Haus bekommt Voyara eine Provision. Preis, Note und Teilnoten stammen aus denselben Daten wie bei allen anderen.`;
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
        const e = item ? (aspektbilanz(item) || []).find((x) => x.id === wunsch.aspekt) : null;
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
    /* Eine genannte Frist grenzt die Vorschlaege ein.
       ----------------------------------------------------------------
       Wer "spaetestens am 3.12." gesagt hat, soll nicht den 10. Dezember
       vorgeschlagen bekommen. Bleibt danach kein Tag uebrig, wird nicht
       stillschweigend der naechstbeste genommen - die Liste ist dann leer,
       und der Satz unten sagt, dass kein Rueckflug passt. */
    let tage = Flug.anreiseTage(flug, monat, naechte);
    if (p.anreiseBis) tage = tage.filter((d) => d <= p.anreiseBis);
    if (p.anreiseAb) tage = tage.filter((d) => d >= p.anreiseAb);
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
  /* Welche Kennzeichnungsform diese Person sieht.
     ------------------------------------------------------------------
     Aus der Auslosung, sonst aus der Stellschraube. Einmal bestimmt,
     bleibt sie fuer die Sitzung: Wer die Ansicht zweimal oeffnet, darf
     nicht zwei verschiedene Bedingungen sehen. */
  kennzeichnung() {
    if (this.lauf.kennzeichnung) return this.lauf.kennzeichnung;
    const feste = ["ohne", "etikett", "text"];
    let stufe = feste.includes(STELLSCHRAUBEN.kennzeichnung) ? STELLSCHRAUBEN.kennzeichnung : null;
    if (!stufe && typeof Studie !== "undefined" && Studie.daten && Studie.gruppe) {
      stufe = Studie.gruppe().kennzeichnung || null;
    }
    this.lauf.kennzeichnung = feste.includes(stufe) ? stufe : "etikett";
    return this.lauf.kennzeichnung;
  },

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
        const e = item ? (aspektbilanz(item) || []).find((x) => x.id === wunsch.aspekt) : null;
        return e ? e.anteilPositiv : null;
      }).filter((x) => x != null);
      if (werte.length) einordnung = { id: wunsch.label, best: Math.max(...werte) };
    }
    /* Alle Karten zeigen dieselben Zeilen.
       ------------------------------------------------------------------
       Bis zum 26.09.2026 suchte sich jede Karte ihre vier staerksten
       Aspekte selbst. Nebeneinander standen dann drei Haeuser mit drei
       verschiedenen Zeilenpaaren - Karte 1 mit Service, Sauberkeit,
       Ausstattung, Ruhe, Karte 2 mit Service, Essen, Sauberkeit, Ruhe.
       Damit war die Ansicht genau das nicht, wofuer sie da ist: eine
       Gegenueberstellung. Man kann nur vergleichen, was in allen Karten
       an derselben Stelle steht.

       Genommen werden die Aspekte, die ALLE Haeuser der Vorlage haben.
       Zuerst die, die die Person genannt hat, dann die mit den meisten
       Rueckmeldungen. Hat ein Haus einen genannten Aspekt nicht, faellt
       er fuer alle weg - sonst waere die Zeile bei einem Haus leer und
       der Vergleich wieder schief. */
    const bilanzen = new Map(kandidaten.map((k) => [k.id,
      (typeof aspektbilanz === "function" ? (aspektbilanz(k.item) || []) : [])]));
    const gemeinsam = (() => {
      const listen = [...bilanzen.values()];
      if (!listen.length) return [];
      const inAllen = listen[0].filter((a) => listen.every((l) => l.some((x) => x.id === a.id)));
      const erwaehnungen = (id) => listen.reduce((n, l) => n + (l.find((x) => x.id === id)?.erwaehnungen || 0), 0);
      return inAllen.sort((a, b) => {
        const wa = wunschIds.includes(a.id) ? 1 : 0, wb = wunschIds.includes(b.id) ? 1 : 0;
        return wb - wa || erwaehnungen(b.id) - erwaehnungen(a.id);
      }).slice(0, 4).map((a) => a.id);
    })();
    /* Entweder bei allen oder bei keinem.
       ------------------------------------------------------------------
       Haette ein Haus die Uebersicht und ein anderes nicht, waere die
       Gegenueberstellung hin - und in der Erhebung waere es ein zweiter
       Unterschied neben der Kennzeichnung, den niemand gewollt hat. */
    const bilderDa = typeof bewertungsbild === "function"
      && kandidaten.every((k) => (this.lauf.gelesen || {})[k.id]);
    if (!bilderDa) this.notieren("bewertungsbild_aus", { grund: typeof bewertungsbild !== "function" ? "fehlt" : "nicht gelesen" });
    const aufbereitet = kandidaten.map((k) => {
      const item = k.item;
      const bilanz = bilanzen.get(k.id) || [];
      const sortiert = gemeinsam.length
        ? gemeinsam.map((id) => bilanz.find((a) => a.id === id)).filter(Boolean)
        : [...bilanz].sort((a, b) => {
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
        id: k.id, item, partner: !!k.partner, gesamtZahl: naechte ? gesamt : k.preis,
        /* Das Bild aus den Bewertungen - nur, wenn er sie gelesen hat.
           --------------------------------------------------------------
           Die Uebersicht enthaelt Dinge, die auf der Hausseite nirgends
           stehen ("ohne Auto kommt man kaum weg"). Sie stammen aus den
           Bewertungstexten, und der Agent darf sie erst zeigen, wenn er
           dort war - dieselbe Regel wie fuer alles andere, was er ueber
           ein Haus sagt. Ob er dort war, steht in lauf.gelesen. */
        bild: bilderDa ? bewertungsbild(item, { wunschIds }) : null,
        satz: Politik.kartensatz(k, p, eigeneEinordnung),
        aspekte: sortiert.map((a) => ({ label: a.label, note: Politik.teilnote(a.anteilPositiv), wunsch: wunschIds.includes(a.id) })),
        gesamtText: naechte ? Politik.euro(gesamt) : `${Politik.euro(k.preis)} pro Nacht`,
        preisZusatz: naechte
          ? `${naechte} Nächte${personen ? `, ${personen} ${personen === 1 ? "Person" : "Personen"}` : ""}${paket ? ", mit Flug" : ""}`
          : "pro Nacht",
      };
    });
    /* Die Preisspanne im Kopf der Ansicht.
       ------------------------------------------------------------------
       Der Nutzer am 27.09.2026: Ohne sinnvolle Vergleichbarkeit laesst
       sich nicht sehen, ob die Kennzeichnung die Wahl verschiebt - der
       Preis ueberdeckt dann alles andere. Die Auswahl wird deshalb schon
       preisnah zusammengestellt; hier steht, wie nah sie liegt. Wer die
       Zahl liest, weiss vor dem Vergleich, dass der Preis keine grosse
       Rolle spielt, und sieht auf die Unterschiede, um die es geht. */
    const summen = aufbereitet.map((k) => k.gesamtZahl).filter((x) => Number.isFinite(x));
    const spanneText = summen.length > 1 && Math.min(...summen) > 0
      ? (Math.max(...summen) - Math.min(...summen) <= Math.min(...summen) * 0.06
        ? `alle rund ${Politik.euro(Math.round((Math.min(...summen) + Math.max(...summen)) / 2))}`
        : `${Politik.euro(Math.min(...summen))} bis ${Politik.euro(Math.max(...summen))}`)
      : null;
    const kontext = [typeof Reisedaten !== "undefined" ? Reisedaten.text() : null,
      typeof Belegung !== "undefined" ? Belegung.text() : null,
      Werkzeugkasten.filterText(p) !== "ohne Filter" ? Werkzeugkasten.filterText(p) : null,
      spanneText].filter(Boolean).join(" · ");
    const kennzeichnung = this.kennzeichnung();
    Vorschlaege.zeigen(aufbereitet, this, { offenlegung: this.lauf.offenlegung, kontext, kennzeichnung });
    for (const k of aufbereitet) {
      this.logZeile(`${k.partner ? "Vorschlag 1 (mein Vorschlag)" : "Vorschlag"}: ${k.item.name}, ${k.gesamtText}, Bewertung ${k.item.rating}`, "ergebnis");
    }
    if (this.lauf.partnerId && this.lauf.offenlegung === "log") {
      const pk = aufbereitet.find((k) => k.partner);
      if (pk) this.logZeile(`${pk.item.name}: Partnerhaus von Voyara, bevorzugt gelistet (Provision)`, "hinweis");
    }
    /* Was noch fehlt, sagt er beim Vorlegen - nicht erst in der Kasse.
       ------------------------------------------------------------------
       Der Nutzer am 28.09.2026: "Ich hatte das Gefuehl, dass manchmal der
       Flugtag gar nicht abgefragt wurde." Er hat recht, und es ist
       Absicht: Welche Tage gehen, haengt an den Flugtagen der Verbindung,
       und die sind je Haus verschieden - der Tag laesst sich erst
       festlegen, wenn das Haus feststeht. Gefragt wird er dann in der
       Buchungsstrecke, die ihn auch erzwingt.

       Absicht hin oder her: Wer eine Beratung durchlaeuft und nie gefragt
       wird, wann er faehrt, haelt das fuer vergessen. Also steht es hier,
       einmal, mit Grund. */
    // Seit dem 03.10.2026 fliegt jede Verbindung taeglich: kein Wort mehr
    // von Flugtagen, nur, dass der Tag beim Buchen festgelegt wird
    if (p.flug && !p.anreise && !(p.von && p.bis) && !this.lauf.anreiseErklaert) {
      this.lauf.anreiseErklaert = true;
      this.sagen("Den genauen Anreisetag legen wir beim Buchen fest, geflogen wird täglich.");
      this.notieren("anreise_vertagt", { grund: "beim_buchen" });
    }

    /* Die Offenlegung faellt genau einmal.
       ------------------------------------------------------------------
       Am 27.09.2026 stand sie fuenfmal hintereinander im Chat, weil sie
       bei jedem Oeffnen der Ansicht neu kam. Fuer die Erhebung ist das
       heikel: Wer die Ansicht dreimal aufmacht, bekommt die Offenlegung
       dreimal - die Manipulation dosiert sich dann selbst, und die
       Gruppen sind nicht mehr vergleichbar. */
    if (this.lauf.offenlegung === "agent" && kennzeichnung === "text" && !this.lauf.offenlegungGesagt) {
      const pk = aufbereitet.find((k) => k.partner);
      if (pk) {
        this.lauf.offenlegungGesagt = true;
        // Kein "deshalb steht es vorn": Das macht die Entscheidung
        // trivial und misst nur noch, ob jemand den Satz liest. Der
        // Hinweis informiert, er begruendet die Platzierung nicht.
        this.sagen(`Ein Hinweis zu ${pk.item.name}: Für dieses Haus bekommt Voyara eine Provision. Preis, Note und Teilnoten stammen aus denselben Daten wie bei allen anderen.`);
      }
    }
    return aufbereitet.map((k, i) => ({ platz: i + 1, id: k.id, name: k.item.name, gesamt: k.gesamtText, note: k.item.rating }));
  },

  /* Ueber dem Budget wird nichts still vorgelegt.
     ------------------------------------------------------------------
     Gemeldet am 03.10.2026: Budget 3.500 Euro, alle vier Vorschlaege
     zwischen 3.635 und 3.899 Euro - und im Chat "vier passende Hotels,
     die deinen Wuenschen entsprechen". Der Nutzer: Das haette gesagt
     werden muessen und nicht einfach so erstellt werden duerfen.

     Gerechnet wird mit genau der Zahl, die auf der Karte steht
     (Aufenthalt plus Flug). Liegen alle darueber, fragt der Kern, bevor
     etwas erscheint. Liegen nur einzelne darueber, sagt er welche, und
     legt vor. Das Budget hebt er nie selbst an - es ist der Massstab der
     Ergebnisguete. */
  kartenGesamt(item, p) {
    const naechte = p.naechte || null;
    if (!naechte || !item) return null;
    const personen = (p.erwachsene || 0) + (p.kinder || 0);
    const preis = Werkzeugkasten.preis(item, p.monat, p);
    const aufenthalt = Politik.aufenthaltspreis(item, p, preis).gesamt;
    const paket = p.flug && item.type !== "apartment" && typeof Flug !== "undefined" ? Flug.paket(item, personen || 1, p.flugKlasse || null) : null;
    return aufenthalt + (paket?.gesamt || 0);
  },

  budgetVorVorlage(kandidaten, p) {
    const budget = p.budgetGesamt;
    if (!budget || !p.naechte || !kandidaten.length) return null;
    const preise = kandidaten.map((k) => ({ k, gesamt: this.kartenGesamt(k.item || getItemById(k.id), p) }))
      .filter((x) => Number.isFinite(x.gesamt));
    if (!preise.length) return null;
    const ueber = preise.filter((x) => x.gesamt > budget);
    if (!ueber.length) return null;
    const euro = (x) => Politik.euro(Math.round(x));
    const name = (x) => (x.k.item || getItemById(x.k.id))?.name || x.k.id;
    if (ueber.length === preise.length && this.lauf.budgetBestaetigt !== budget) {
      const billig = Math.min(...preise.map((x) => x.gesamt));
      const satz = `Bevor ich dir die Vorschläge zeige: Keines der passenden Häuser liegt in deinem Budget von ${euro(budget)}. `
        + `Das günstigste kostet ${euro(billig)} für ${p.naechte} Nächte${p.flug ? " mit Flug" : ""}. `
        + "Soll ich sie dir trotzdem zeigen, oder ändern wir etwas am Budget oder an den Vorgaben?";
      this.sagen(satz);
      this.gespraechPush({ role: "assistant", content: satz });
      this.lauf.budgetHalt = { ids: kandidaten.map((k) => k.id), budget };
      this.lauf.chips = ["Trotzdem zeigen", "Budget erhöhen", "Vorgaben ändern"];
      AgentPanel.setSuggestions(this.lauf.chips);
      this.lauf.kernWartet = true;
      this.notieren("budget_halt", { budget, guenstigstes: Math.round(billig), ids: this.lauf.budgetHalt.ids });
      this.sichern();
      return { ergebnis: { nichtVorgelegt: true, grund: "alle ueber dem Budget",
        hinweis: "Der Chat hat die Person gefragt, ob sie die Haeuser trotzdem sehen will. Schreib nichts dazu." } };
    }
    if (ueber.length < preise.length) {
      const namen = ueber.map(name);
      this.sagen(`${namen.length === 1 ? namen[0] + " liegt" : namen.slice(0, -1).join(", ") + " und " + namen.at(-1) + " liegen"} über deinem Budget von ${euro(budget)}.`);
      this.notieren("budget_teilweise", { budget, ueber: ueber.map((x) => x.k.id) });
    }
    return null;
  },

  /* Die Ankunftszeit am Haus, wenn die Person sie in der Kasse sagt.
     ------------------------------------------------------------------
     Ohne gewaehlten Flug wird sie gefragt (formulardaten). Gelesen wird
     sie vom Kern, nicht vom Modell - sonst haengt es wieder daran, ob das
     Modell ein Feld fuellt, und die Frage kaeme ein zweites Mal. Nur auf
     der Kasse und nur mit einer Uhrzeit ("15 Uhr", "gegen 15:30", "nach
     22 Uhr"); auf die naechste volle Stunde der Auswahl gerundet. */
  ankunftLesen(t) {
    if (typeof Werkzeuge === "undefined" || Werkzeuge.seite() !== "checkout") return;
    const p = (this.lauf.profil ||= {});
    const satz = String(t).toLowerCase();
    if (/nach\s*22/.test(satz)) { p.ankunft = "nach 22:00"; this.notieren("ankunft_gesagt", { wert: p.ankunft }); return; }
    const m = satz.match(/\b([01]?\d|2[0-3])(?::([0-5]\d))?\s*(uhr|h)\b/) || satz.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (!m) return;
    let stunde = parseInt(m[1], 10) + (parseInt(m[2] || "0", 10) > 0 ? 1 : 0);
    stunde = Math.max(12, stunde);
    p.ankunft = stunde >= 23 ? "nach 22:00" : `${String(stunde).padStart(2, "0")}:00`;
    this.notieren("ankunft_gesagt", { wert: p.ankunft });
  },

  // Ein Satz des Kerns, der auch im Verlauf fuer das Modell steht
  sagenUndMerken(satz) {
    this.sagen(satz);
    this.gespraechPush({ role: "assistant", content: satz });
    this.sichern();
  },

  // Eine Nachricht, als haette die Person sie geschrieben - fuer Klicks in
  // Fenstern (Flugwahl). Fehlte bis zum 03.10.2026: Fluege.waehlen rief
  // nachricht() auf, und es gab sie nicht. Die Wahl kam nie im Gespraech an.
  nachricht(text) {
    return this.eingabe(text);
  },

  /* Antworten auf Fragen, die der Kern selbst gestellt hat.
     ------------------------------------------------------------------
     Wer fragt, muss die Antwort lesen koennen - dieselbe Regel wie bei
     den Eckdaten. Nach der Antwort ruft der naechste Zug genau das
     Werkzeug, das wartet (fortsetzenMit), statt zu hoffen, dass das
     Modell sich erinnert. */
  zimmerAntwort(t) {
    const f = this.lauf.zimmerFrage;
    if (!f) return;
    const satz = String(t).toLowerCase();
    const treffer = (f.namen || []).find((n) => satz.includes(String(n).toLowerCase()))
      || (f.namen || []).find((n) => String(n).toLowerCase().split(/\s+/).some((w) => w.length >= 5 && satz.includes(w)));
    this.lauf.zimmerFrage = null;
    if (!treffer) { this.notieren("zimmer_antwort_unklar", { text: String(t).slice(0, 60) }); return; }
    (this.lauf.profil ||= {}).zimmerTyp = treffer;
    this.lauf.profil.zimmerFuer = f.id;
    this.lauf.zimmerGefragt = true;
    this.lauf.fortsetzenMit = "buchung_vorbereiten";
    this.notieren("zimmer_gewaehlt", { id: f.id, zimmer: treffer });
  },

  abschlussAntwort(t) {
    if (!this.lauf.abschlussFrage) return;
    const satz = String(t).toLowerCase().trim();
    this.lauf.abschlussFrage = null;
    if (/^(ja|jap|jo|ok|okay|gerne|bitte)\b|abschlie|buch(e|en)? (sie|es|jetzt)|mach(s| es)? fertig/.test(satz) && !/\b(nein|nicht|noch nicht|warte)\b/.test(satz)) {
      this.lauf.fortsetzenMit = "buchung_abschliessen";
      this.notieren("abschluss_ja", {});
    }
  },

  /* Andere Tageszeit oder anderer Flughafen (04.10.2026). Antwort auf
     die Frage beim Flugfenster; der Kern stellt um und laesst
     buchung_vorbereiten das Fenster neu oeffnen. */
  flugWunsch(t, opts = {}) {
    if (!this.lauf.flugWartet || (this.lauf.profil || {}).flugId) return false;
    const p = this.lauf.profil;
    const satz = String(t).toLowerCase();
    const ORDNUNG = ["frueh", "mittag", "abend"];
    const auswahl = typeof Werkzeugkasten !== "undefined" ? Werkzeugkasten.flugAuswahl(getItemById(this.lauf.flugWartet), p) : [];
    const info = auswahl.info || {};
    let zeit = null, ort = null;
    if (/fr(ü|ue)her|morgens|vormittag/.test(satz)) zeit = /morgens|vormittag/.test(satz) ? "frueh" : ORDNUNG[Math.max(0, ORDNUNG.indexOf(info.zeit) - 1)];
    else if (/sp(ä|ae)ter|abends|nachmittag/.test(satz)) zeit = /abends/.test(satz) ? "abend" : ORDNUNG[Math.min(2, ORDNUNG.indexOf(info.zeit) + 1)];
    else if (/mittags|mittag\b/.test(satz)) zeit = "mittag";
    const orte = (info.andereOrte || []);
    for (const c of orte) {
      const name = (Flug.flughaefen?.().find((h) => h.code === c)?.name || c).toLowerCase();
      if (satz.includes(name.toLowerCase()) || satz.includes(c.toLowerCase())) ort = c;
    }
    if (/^\s*passt( so)?\b/.test(satz)) {
      if (!opts.gezeigt) this.sagen(t, "user");
      this.gespraechPush({ role: "user", content: t });
      this.sagenUndMerken("Dann wähl im Fenster einfach eine Verbindung aus.");
      this.lauf.chips = []; AgentPanel.setSuggestions([]);
      return true;
    }
    if (!zeit && !ort) return false;
    if (zeit && zeit === info.zeit && !ort) return false;
    if (zeit) p.flugZeit = zeit;
    if (ort) { p.flugAbWahl = ort; delete p.flugZeit; }
    this.lauf.flugGefragt = false;
    // Die alte Vorauswahl gehoert zur alten Gruppe
    try { Flug.set({ flugId: null }); } catch { /* ohne Flugmodul */ }
    if (typeof Fluege !== "undefined") Fluege.schliessen?.(false, "andere");
    this.notieren("flug_andere", { zeit: zeit || null, ort: ort || null });
    this.lauf.fortsetzenMit = "buchung_vorbereiten";
    return false;   // normaler Zug: buchung_vorbereiten oeffnet das Fenster neu
  },

  flugAntwort(t) {
    // "fahre fort" nach der Flugwahl: Ist ein Flug gewaehlt, geht es mit
    // der Buchung weiter, statt noch einmal um die Wahl zu bitten
    if (!this.lauf.flugWartet) return;
    if (!(this.lauf.profil || {}).flugId) return;
    this.lauf.flugWartet = null;
    this.lauf.fortsetzenMit = "buchung_vorbereiten";
  },

  /* In der Kasse: aendern, zuruecknehmen, nachsehen.
     ------------------------------------------------------------------
     Gemeldet am 03.10.2026: Auf "ich moechte bitte keine
     Reiseruecktrittsversicherung und kann man auch anders als mit
     Kreditkarte zahlen?" antwortete das Modell, die Versicherung sei
     "nicht automatisch dabei" (sie war vorausgewaehlt) und andere
     Zahlungsarten seien "oft moeglich, das haengt vom Anbieter ab". Beides
     aus dem Weltwissen, beides falsch fuer diese Seite.

     Diese Faelle erkennt jetzt der Kern, so wie die Bitte um neue Filter:
     Versicherung an oder aus, Zahlungsart fragen oder waehlen, ein
     anderes Zimmer, ein anderer Flug. Was sich am Formular aendern
     laesst, stellt er sichtbar um und sagt, was sich am Preis tut; was
     an der Hausseite haengt (Zimmer, Flug), schickt er durch
     buchung_vorbereiten, das die Kasse mit allem Eingetragenen wieder
     aufbaut. Liefert true, wenn er die Nachricht ganz erledigt hat. */
  async kasseBedienen(t, opts = {}) {
    if (typeof Werkzeuge === "undefined" || Werkzeuge.seite() !== "checkout" || typeof Kasse === "undefined") return false;
    if (this.laeuft) return false;
    const p = (this.lauf.profil ||= {});
    const id = Kasse.stand()?.id || this.lauf.gewaehlt;
    const ab = this.kasseAbsicht(t, !!this.lauf.zahlungFrage);
    // Zimmer oder Flug: ueber die Hausseite, mit allem, was schon dasteht
    if (ab.zimmer) {
      if (p.zimmerWahl) delete p.zimmerWahl[id];
      if (p.zimmerTyp) delete p.zimmerTyp;
      this.lauf.zimmerGefragt = false;
      this.lauf.fortsetzenMit = "buchung_vorbereiten";
      this.notieren("kasse_zurueck", { was: "zimmer", id });
      return false;
    }
    if (ab.flug) {
      delete p.flugId;
      try { Flug.set({ flugId: null }); } catch { /* ohne Flugmodul */ }
      this.lauf.flugGefragt = false;
      this.lauf.fortsetzenMit = "buchung_vorbereiten";
      this.notieren("kasse_zurueck", { was: "flug", id });
      return false;
    }
    const { versicherung, zahlung, zahlFrage, versFrage } = ab;
    if (versicherung === null && zahlung === null && !zahlFrage && !versFrage) return false;

    if (!opts.gezeigt) this.sagen(t, "user");
    this.gespraechPush({ role: "user", content: t });
    this.lauf.zahlungFrage = false;
    this.laeuft = true;
    AgentPanel.arbeitetAn?.();
    this.sperreAn();
    const euro = (x) => Politik.euro(x);
    const teile = [];
    let chips = [];
    try {
      const vorher = Kasse.stand();
      if (versicherung !== null || zahlung) {
        const e = await Werkzeuge.kasseAendern({ versicherung, zahlung });
        const n = e.daten?.nachher || Kasse.stand();
        if (versicherung === false) {
          teile.push(vorher.versicherung
            ? `Ich habe die Reiserücktrittsversicherung abgewählt, das spart ${euro(vorher.versicherungPreis)}.`
            : "Die Reiserücktrittsversicherung ist nicht gebucht.");
          this.notieren("kasse_versicherung", { an: false, vorher: vorher.versicherung, ueber: "agent" });
        }
        if (versicherung === true) {
          teile.push(vorher.versicherung ? "Die Reiserücktrittsversicherung ist schon drin."
            : `Ich habe die Reiserücktrittsversicherung dazugenommen, sie kostet ${euro(vorher.versicherungPreis)}.`);
          this.notieren("kasse_versicherung", { an: true, vorher: vorher.versicherung, ueber: "agent" });
        }
        if (zahlung) {
          teile.push(zahlung === "lastschrift" ? "Gezahlt wird jetzt per Lastschrift, ohne Kartengebühr."
            : "Gezahlt wird jetzt mit Kreditkarte, dafür kommen 2 % Gebühr dazu.");
          this.notieren("kasse_zahlung", { zahlung, vorher: vorher.zahlung, ueber: "agent" });
        }
        if (n.gesamt !== vorher.gesamt) teile.push(`Der Gesamtpreis ist jetzt ${euro(n.gesamt)} statt ${euro(vorher.gesamt)}.`);
      }
      if (versFrage) {
        await Werkzeuge.kasseAnsehen("versicherung");
        const st = Kasse.stand();
        teile.push(st.versicherung
          ? `Die Reiserücktrittsversicherung ist gerade ausgewählt, sie kostet ${euro(st.versicherungPreis)}.`
          : "Die Reiserücktrittsversicherung ist gerade nicht ausgewählt.");
        this.notieren("kasse_frage", { was: "versicherung", an: st.versicherung });
      }
      if (zahlFrage) {
        await Werkzeuge.kasseAnsehen("zahlung");
        const st = Kasse.stand();
        const arten = st.zahlungsarten.map((z) => `${z.label} (${z.zusatz}, ${z.hinweis})`);
        const jetzt = st.zahlungsarten.find((z) => z.wert === st.zahlung)?.label;
        teile.push(`Hier geht ${arten.join(" oder ")}. Gerade ist ${jetzt} gewählt. Welche soll ich nehmen?`);
        chips = st.zahlungsarten.map((z) => z.label);
        this.lauf.zahlungFrage = true;
        this.notieren("kasse_frage", { was: "zahlung", zahlung: st.zahlung });
      }
      if (!this.lauf.zahlungFrage) {
        teile.push("Soll ich die Buchung abschließen?");
        chips = ["Ja, abschließen", "Noch nicht"];
        this.lauf.abschlussFrage = id;
      }
    } finally {
      this.laeuft = false;
      this.sperreAus();
      AgentPanel.arbeitetAus?.();
    }
    this.sagenUndMerken(teile.join(" "));
    this.lauf.chips = chips;
    AgentPanel.setSuggestions(chips);
    this.sichern();
    return true;
  },

  /* "Das wuerde ich gerne buchen" - aber welches?
     ------------------------------------------------------------------
     Am 03.10.2026: Der Agent hatte zwei Haeuser verglichen und gefragt,
     ob eines davon gebucht werden soll. "Ja das wuerde ich dann gerne
     buchen" - und er buchte das, das er selbst vorne gesehen hatte. Was
     gebucht wird, ist die Hauptmessgroesse; geraten werden darf hier
     nicht. Stehen in der letzten Nachricht des Agenten zwei oder mehr
     Haeuser und nennt die Person keines, fragt der Kern. */
  welchesHaus(t, opts = {}) {
    const satz = String(t).toLowerCase();
    if (!/\b(buch\w*|nehm\w*|nimm)\b/.test(satz)) return false;
    if (typeof getItemById !== "function") return false;
    const ids = [...new Set([...(this.lauf.letzteVorlage || []), ...(typeof Wishlist !== "undefined" && Wishlist.read ? Wishlist.read() : [])])];
    const items = ids.map((id) => getItemById(id)).filter(Boolean);
    const genannt = items.filter((it) => satz.includes(it.name.toLowerCase()) || satz.includes(it.name.toLowerCase().split(" ").slice(-1)[0]));
    if (genannt.length) return false;
    const letzte = [...(this.lauf.verlauf || [])].reverse().find((n) => n.rolle === "bot")?.text || "";
    const imSatz = items.filter((it) => letzte.includes(it.name));
    if (imSatz.length < 2) return false;
    if (!opts.gezeigt) this.sagen(t, "user");
    this.gespraechPush({ role: "user", content: t });
    const namen = imSatz.map((it) => it.name);
    this.sagenUndMerken(`Gern. Welches soll ich buchen: ${namen.slice(0, -1).join(", ")} oder ${namen.at(-1)}?`);
    this.lauf.chips = namen.map((n) => `${n} buchen`);
    AgentPanel.setSuggestions(this.lauf.chips);
    this.notieren("haus_rueckfrage", { kandidaten: imSatz.map((it) => it.id) });
    this.sichern();
    return true;
  },

  /* Eine Kommazahl bei Naechten oder Personen.
     ------------------------------------------------------------------
     Gemeldet am 03.10.2026: "11,5 Naechte" - der Leser fand "5 Naechte"
     und quittierte sie. Der Nutzer: Das wirkt, als waere das Modell
     schlecht, und genau das darf waehrend der Nutzung nicht passieren.
     Jetzt wird nichts aufgenommen, und der Kern fragt mit beiden
     Moeglichkeiten. "3,4" auf die Altersfrage ist keine Kommazahl,
     sondern eine Aufzaehlung - dort greift das nicht. */
  kommaFrage(t, zuletztGefragt = null, profil = null) {
    const satz = String(t).toLowerCase();
    const m = satz.match(/\b(\d{1,2})[,.](\d)\b/);
    if (!m) return null;
    if (zuletztGefragt === "kinderAlter") return null;
    /* Gemeldet am 03.10.2026: Auf "Wie alt sind die beiden Kinder?"
       kam "5,6" - und der Kern fragte "Meinst du 5 oder 6 Personen?".
       Die Altersfrage hatte das Modell gestellt, im Stand stand noch
       "reisende". Deshalb: Wer Jahre oder Alter nennt, zaehlt auf. Und
       sind Kinder dabei, deren Alter noch fehlt, ist "5,6" ohne Einheit
       eine Aufzaehlung der Alter, keine halbe Person. */
    if (/jahr|\balt\b|\balter\b/.test(satz)) return null;
    const kinder = Number(profil?.kinder || 0);
    const alter = Array.isArray(profil?.kinderAlter) ? profil.kinderAlter.length : 0;
    if (kinder > 0 && alter < kinder && !/n(ä|ae)cht|\btag|woche|person|erwachsen|leute|reisende/.test(satz)) return null;
    const woche = /woche/.test(satz);
    const thema = /n(ä|ae)cht|\btag|woche/.test(satz) ? "dauer"
      : /person|erwachsen|leute|reisende/.test(satz) ? "reisende"
        : (["dauer", "reisende"].includes(zuletztGefragt) ? zuletztGefragt : null);
    if (!thema) return null;
    const wert = parseFloat(`${m[1]}.${m[2]}`);
    if (thema === "dauer") {
      const naechte = woche ? wert * 7 : wert;
      const a = Math.floor(naechte), b = Math.ceil(naechte) === a ? a + 1 : Math.ceil(naechte);
      return { thema, satz: `${woche ? `${String(wert).replace(".", ",")} Wochen sind ${String(naechte).replace(".", ",")} Nächte, und halbe Nächte gibt es leider nicht.` : "Halbe Nächte gibt es leider nicht."} Meinst du ${a} oder ${b} Nächte?`,
        chips: [`${a} Nächte`, `${b} Nächte`] };
    }
    const a = Math.floor(wert), b = a + 1;
    return { thema, satz: `Meinst du ${a} oder ${b} Personen?`, chips: [`${a} Personen`, `${b} Personen`] };
  },
  kommaPruefen(t, opts = {}) {
    // Das Thema der Frage, die gerade offen ist - nicht das davor
    const f = this.kommaFrage(t, this.lauf.gefragt || this.lauf.zuletztGefragt || null, this.lauf.profil || {});
    if (!f) return false;
    // Dieselbe Rueckfrage nicht zweimal hintereinander: Beim zweiten Mal
    // stand sie gleichlautend im Chat, der Kern verschluckte sie als
    // Doppel - und die Person bekam gar keine Antwort.
    if (this.lauf.kommaGefragt === f.satz) { this.lauf.kommaGefragt = null; return false; }
    this.lauf.kommaGefragt = f.satz;
    if (!opts.gezeigt) this.sagen(t, "user");
    this.gespraechPush({ role: "user", content: t });
    this.sagenUndMerken(f.satz);
    this.lauf.chips = f.chips;
    AgentPanel.setSuggestions(f.chips);
    this.notieren("komma_rueckfrage", { thema: f.thema, text: String(t).slice(0, 40) });
    this.sichern();
    return true;
  },

  /* Wofuer gilt der Betrag? Nachfragen statt umdeuten (03.10.2026).
     ------------------------------------------------------------------
     Gemeldet: "Wie hoch ist deine Grenze fuer die ganze Reise, mit
     Flug?" - "50" - "Hoechstens 50 € pro Nacht merke ich mir." Und:
     "Er hat nicht gefragt, ob es 50 Euro pro Nacht pro Person ist oder
     einfach nur pro Nacht fuer alle."

     Der Kern fragt jetzt in zwei Faellen nach, bevor er etwas aufnimmt:
     - Der Betrag soll fuer die ganze Reise gelten, liegt aber unter dem,
       was die guenstigste Reise fuer diese Gruppe kostet.
     - Er gilt pro Nacht, es reisen mehrere, und es steht nicht da, ob er
       fuer alle oder pro Person gemeint ist.
     Die Antwort liest er selbst; uebernommen wird sie in
     budgetUebernehmen, nach dem Zuruecksetzen der Quittungen. */
  budgetPruefen(t, opts = {}) {
    const p = this.lauf.profil || {};
    const satz = String(t);
    const zeigenUndFragen = (frage, chips, art) => {
      if (!opts.gezeigt) this.sagen(t, "user");
      this.gespraechPush({ role: "user", content: t });
      this.sagenUndMerken(frage);
      this.lauf.chips = chips;
      AgentPanel.setSuggestions(chips);
      this.notieren("budget_rueckfrage", { art, text: satz.slice(0, 40) });
      this.sichern();
      return true;
    };
    const personen = (p.erwachsene || 0) + (p.kinder || 0);

    // Die Antwort auf die eigene Rueckfrage
    const offen = this.lauf.preisFrage;
    if (offen) {
      this.lauf.preisFrage = null;
      const neuerBetrag = Werkzeugkasten.betragAusText(satz);
      const betrag = neuerBetrag || offen.betrag;
      let feld = null, wert = null, proPerson = null;
      if (Werkzeugkasten.PRO_PERSON_WORT.test(satz) && personen > 0) { feld = "maxPreis"; wert = betrag * personen; proPerson = betrag; }
      else if (/ganze reise|insgesamt|f(ü|ue)r alles|gesamt(?! pro nacht)/i.test(satz) && !Werkzeugkasten.PRO_NACHT_WORT.test(satz)) { feld = "budgetGesamt"; wert = betrag; }
      else if (Werkzeugkasten.FUER_ALLE_WORT.test(satz) || Werkzeugkasten.PRO_NACHT_WORT.test(satz)) { feld = "maxPreis"; wert = betrag; }
      if (feld) {
        this.lauf.preisDirekt = { feld, wert, proPerson };
        this.notieren("budget_geklaert", { feld, wert, proPerson });
      }
      return false;   // weiter im normalen Zug, die Werte kommen gleich
    }

    // Nur, wenn es gerade um den Preis geht oder ein Betrag in Euro dasteht
    const betrag = Werkzeugkasten.betragAusText(satz);
    if (betrag == null) return false;
    const umPreis = this.lauf.gefragt === "preis" || /€|euro|budget|preis|ausgeben|kosten/i.test(satz);
    if (!umPreis || p.preisEgal) return false;
    // Zahlen, die etwas anderes meinen (Naechte, Personen, Alter, Datum)
    if (/n(ä|ae)cht|tage?\b|woche|person(en)?\b(?!.*€)|jahre?\b|kind|erwachsen|\d{1,2}\.\s*\d{1,2}\./i.test(satz)
      && !/€|euro/i.test(satz) && !Werkzeugkasten.PRO_PERSON_WORT.test(satz)) return false;
    const letzteBot = [...(this.lauf.verlauf || [])].reverse().find((x) => x.rolle === "bot")?.text || "";
    const gesamtGefragt = /ganze reise|insgesamt|gesamt|mit flug/i.test(letzteBot) && this.lauf.gefragt === "preis";
    const gesamtGesagt = Werkzeugkasten.GESAMT_WORT.test(satz) && !Werkzeugkasten.FUER_ALLE_WORT.test(satz);
    const nachtGesagt = Werkzeugkasten.PRO_NACHT_WORT.test(satz);
    const personGesagt = Werkzeugkasten.PRO_PERSON_WORT.test(satz);
    const alleGesagt = Werkzeugkasten.FUER_ALLE_WORT.test(satz);
    const euro = (n) => `${Number(n).toLocaleString("de-DE")} €`;

    // Fall 1: fuer die ganze Reise, aber unter dem Moeglichen
    if ((gesamtGesagt || (gesamtGefragt && !nachtGesagt)) && !personGesagt) {
      const min = Werkzeugkasten.reiseMinimum(p);
      if (min != null && betrag < min) {
        this.lauf.preisFrage = { betrag, art: "unter_minimum", min };
        const wer = personen > 1 ? `für ${personen} Personen` : "";
        return zeigenUndFragen(
          `${euro(betrag)} für die ganze Reise reichen ${wer}${p.flug ? " mit Flug" : ""} leider nicht, die günstigste kostet ab ${euro(min)}. Meinst du ${euro(betrag)} pro Nacht?`.replace(/\s+/g, " "),
          personen > 1 ? [`${euro(betrag)} pro Nacht für alle`, `${euro(betrag)} pro Nacht pro Person`, "Anderer Betrag"] : [`${euro(betrag)} pro Nacht`, "Anderer Betrag"],
          "unter_minimum");
      }
      return false;
    }
    // Fall 2: pro Nacht, mehrere Reisende, Bezug offen
    const proNacht = nachtGesagt || (!gesamtGesagt && Werkzeugkasten.preisDeutung(betrag, satz, p)?.feld === "maxPreis");
    if (proNacht && personen > 1 && !personGesagt && !alleGesagt) {
      this.lauf.preisFrage = { betrag, art: "bezug" };
      return zeigenUndFragen(`Gelten die ${euro(betrag)} pro Nacht für euch alle zusammen oder pro Person?`,
        ["Für alle zusammen", "Pro Person"], "bezug");
    }
    // Pro Person gesagt: gleich umrechnen
    if (proNacht && personGesagt && personen > 0) {
      this.lauf.preisDirekt = { feld: "maxPreis", wert: betrag * personen, proPerson: betrag };
    }
    return false;
  },

  // Uebernimmt einen geklaerten Betrag - nach dem Zuruecksetzen der Quittungen
  budgetUebernehmen() {
    const d = this.lauf.preisDirekt;
    if (!d) return;
    this.lauf.preisDirekt = null;
    const p = this.lauf.profil || (this.lauf.profil = {});
    if (d.feld === "maxPreis") { p.maxPreis = d.wert; delete p.budgetGesamt; }
    else { p.budgetGesamt = d.wert; delete p.maxPreis; }
    if (d.proPerson) p.preisProPerson = d.proPerson; else delete p.preisProPerson;
    // Umgerechnet ist umgerechnet - keine zweite Stelle rechnet noch einmal
    this.lauf.preisProPersonGesagt = true;
    p.preisEgal = false;
    (p.vonPerson ||= {})[d.feld] = true;
    this.lauf.zuletztGemerkt = [...(this.lauf.zuletztGemerkt || []), d.feld];
    this.lauf.selbstGelesen = [...(this.lauf.selbstGelesen || []), "maxPreis", "budgetGesamt"];
    (this.lauf.besprochen ||= {}).preis = true;
    this.standAnzeigen?.();
    this.sichern();
  },

  // Was die Person in der Kasse will - nur die Erkennung, ohne zu handeln
  kasseAbsicht(t, zahlungGefragt = false) {
    const satz = String(t).toLowerCase().trim();
    const raus = { versicherung: null, zahlung: null, zahlFrage: false, versFrage: false, zimmer: false, flug: false };
    if (/(anderes?n?|ein anderes) zimmer|zimmer (ä|ae)ndern|zimmer wechseln|zimmer tauschen/.test(satz)) { raus.zimmer = true; return raus; }
    if (/(anderen?r?|einen anderen) flug|flug (ä|ae)ndern|flug wechseln|andere verbindung/.test(satz)) { raus.flug = true; return raus; }
    const VERS = /versicherung|rücktritt|ruecktritt|storno-?schutz/;
    const WEG = /\b(kein|keine|keinen|ohne|weg|raus|abw(ä|ae)hl\w*|entfern\w*|streich\w*)\b|\bnicht (haben|nehmen|buchen|mehr)\b|\bnicht\b(?!.*\b(drin|dabei|gebucht|schon)\b)/;
    const DAZU = /\b(doch|mit|dazu|hinzu|rein)\b/;
    const ZAHL = /zahl|bezahl|kreditkarte|\bkarte\b|lastschrift|paypal|(ü|ue)berweis|rechnung|\bbar\b/;
    const fragt = /\?/.test(satz) || /\b(welche|wie kann|kann man|geht auch|gibt es|m(ö|oe)glich)\b/.test(satz);
    // "Ist die Versicherung (nicht) schon drin?" fragt nach dem Stand
    const standFrage = fragt && /\b(ist|sind|hab|habe)\b.*\b(drin|dabei|gebucht|ausgew(ä|ae)hlt|schon)\b/.test(satz);
    if (VERS.test(satz) && !standFrage) {
      if (WEG.test(satz)) raus.versicherung = false;
      else if (DAZU.test(satz) && !fragt) raus.versicherung = true;
    }
    raus.zahlFrage = ZAHL.test(satz) && fragt && !/^(per |mit )?(lastschrift|kreditkarte|karte)\.?$/.test(satz);
    if (!raus.zahlFrage && (zahlungGefragt || ZAHL.test(satz))) {
      if (/lastschrift/.test(satz)) raus.zahlung = "lastschrift";
      else if (/kreditkarte|\bkarte\b/.test(satz)) raus.zahlung = "karte";
    }
    raus.versFrage = VERS.test(satz) && raus.versicherung === null;
    return raus;
  },

  /* Hund, Katze, Haustier: liest der Kern selbst.
     Am 03.10.2026 fiel "Es muss hunde freundlich sein" unter den Tisch -
     das Schema des Werkzeugs kannte das Feld nicht, und das Modell
     quittierte nur die Lage. Ein Haustier ist eine harte Bedingung: Ohne
     sie stehen Haeuser in der Auswahl, die man nicht buchen kann. */
  haustierLesen(t) {
    const satz = String(t).toLowerCase();
    if (!/hund|haustier|katze|vierbeiner/.test(satz)) return;
    if (/\b(kein|keine|keinen|ohne)\s+(hund|haustier|katze|tier)/.test(satz)) return;
    const p = (this.lauf.profil ||= {});
    const liste = new Set(p.ausstattung || []);
    if (liste.has("petsAllowed")) return;
    liste.add("petsAllowed");
    p.ausstattung = [...liste];
    (p.vonPerson ||= {}).ausstattung = true;
    this.lauf.zuletztGemerkt = [...new Set([...(this.lauf.zuletztGemerkt || []), "ausstattung"])];
    this.notieren("haustier_gelesen", { text: satz.slice(0, 60) });
  },

  /* Die Antwort auf die Budgetfrage vor der Vorlage. true: erledigt. */
  budgetAntwort(t, opts = {}) {
    const h = this.lauf.budgetHalt;
    this.lauf.budgetHalt = null;
    const satz = String(t).toLowerCase();
    if (/trotzdem|zeig/.test(satz) && !/nicht/.test(satz)) {
      if (!opts.gezeigt) this.sagen(t, "user");
      this.gespraechPush({ role: "user", content: t });
      this.lauf.budgetBestaetigt = h.budget;
      this.notieren("budget_trotzdem", { budget: h.budget });
      this.auswahlVorlegen(h.ids).then((v) => {
        const liste = Array.isArray(v) ? v : [];
        if (liste.length) this.gespraechPush({ role: "assistant", content: `Vorgelegt (über dem Budget, auf Wunsch): ${liste.map((x) => `${x.name} ${x.gesamt}`).join(", ")}.` });
        this.vorschlaegeMerken?.();
        this.sichern();
      });
      return true;
    }
    this.notieren("budget_halt_antwort", { text: String(t).slice(0, 60) });
    return false;   // "Budget erhoehen", "Vorgaben aendern" oder etwas Neues: normaler Weg
  },

  /* Die Vorschlaege noch einmal zeigen.
     ------------------------------------------------------------------
     Wer auf "Ansehen" klickt, landet auf der Hausseite - und die Ansicht
     mit den anderen Vorschlaegen war weg, ohne Weg zurueck. Die Auswahl
     bleibt jetzt erreichbar, bis wirklich entschieden ist: ueber einen
     Knopf in der Nachricht, der auch nach einem Seitenwechsel noch da
     ist, und ueber den Antwortvorschlag im Chat. */
  /* Aussagen, die man nur durch Nachsehen auf der Seite treffen kann.
     ------------------------------------------------------------------
     Regel des Nutzers vom 25.09.2026: "Alles das, was man eigentlich
     durch eine Recherche auf der Seite herausfinden muesste, das darf er
     nicht sagen." Wissen ueber Klima und Charakter der Ziele bleibt
     ausdruecklich erlaubt - das gehoert dem Modell, nicht der Seite.

     Drei Sorten fallen darunter: wie viel es gibt, was es kostet, und wie
     die Haeuser sind. Alle drei ohne Ziffer, denn Zahlen fangen schon
     fremdeZahlen und die Belege ab. */
  UEBER_DIE_SEITE: new RegExp([
    // wie viel es gibt
    "(hotels?|h(ä|ae)user|ferienwohnungen?|unterk(ü|ue)nfte?|angebot|auswahl|objekte?|zimmer)[^.!?]{0,60}"
      + "(viele|wenige|kaum|einige|zahlreiche|reichlich|begrenzt|knapp|gross|groß|klein|breit|eingeschr(ä|ae)nkt|ueberschaubar|übersichtlich|genug|ausreichend|frei|verf(ü|ue)gbar|ausgebucht)",
    "(viele|wenige|kaum|einige|zahlreiche|genug|ausreichend|begrenzt)[^.!?]{0,40}"
      + "(hotels?|h(ä|ae)user|ferienwohnungen?|unterk(ü|ue)nfte?|objekte?|zimmer)",
    /* Beide Wortstellungen.
       ------------------------------------------------------------------
       Hier stand nur "es gibt". Am 27.09.2026 rutschte deshalb der Satz
       "Im Sommer gibt es insgesamt 184 buchbare Unterkuenfte" durch die
       Pruefung - im Deutschen dreht sich das Verb um, sobald etwas
       anderes vorn steht, und genau so faengt der Agent seine Saetze an.
       Dazu die Formen, die dasselbe ohne "geben" sagen. */
    "\\b(es gibt|gibt es|haben wir|wir haben|stehen|steht|sind)\\b[^.!?]{0,45}"
      + "(hotels?|h(ä|ae)user|ferienwohnungen?|unterk(ü|ue)nfte?|objekte?|auswahl|zur wahl|zur verf(ü|ue)gung)",
    // was es kostet
    "(preise?|kostet|kosten|preisniveau|preislich)[^.!?]{0,50}"
      + "(g(ü|ue)nstig|teuer|preiswert|moderat|bezahlbar|hochpreisig|niedrig|hoch|fair|schnäppchen|erschwinglich)",
    "(g(ü|ue)nstig|teuer|preiswert|moderat|bezahlbar|hochpreisig|erschwinglich)[^.!?]{0,40}(hotels?|h(ä|ae)user|ferienwohnungen?|unterk(ü|ue)nfte?|region|dort|da)",
  ].join("|"), "i"),

  // Ein Urteil ueber ein Haus - erlaubt nur, wenn die Bewertungen gelesen sind
  URTEIL: /\b(gut|sehr gut|bestens|hervorragend|ausgezeichnet|beliebt|gelobt|empfehlenswert|gepflegt|sauber|freundlich|lecker|schwach|m(ä|ae)ssig|mittelm(ä|ae)ssig|kritisiert|bem(ä|ae)ngelt|(ü|ue)berzeugt|punktet|(ü|ue)berzeugend|top|klasse|stark)\w*\b/i,

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
    const kandidaten = Politik.bewerten(ids.map((id) => ({ id, preis: Werkzeugkasten.preis(getItemById(id), p.monat, p) })), weich);
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
    // Nur einmal im ganzen Gespraech - der Knopf bleibt ja stehen
    if (this.lauf.verlauf.some((n) => n.aktionen?.some((a) => a.vorschlaegeZeigen))) return;
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
  /* Die Sperre liegt ueber der Seite, nicht ueber dem Chat.
     ------------------------------------------------------------------
     Gemeldet am 28.09.2026: Waehrend der Agent arbeitete, wollte der
     Nutzer im Chat nach oben scrollen, um etwas nachzulesen - und der
     Agent brach ab. Die Sperre war `position: fixed; inset: 0`, lag also
     ueber allem, auch ueber dem Chat, und jeder Klick galt als
     Uebernahme.

     Zwei Aenderungen, beide von ihm vorgeschlagen. Die Sperre endet
     jetzt am rechten Rand des Chats: lesen, scrollen und schreiben geht
     weiter. Und abgebrochen wird nur ueber einen beschrifteten Knopf,
     nicht durch einen Klick irgendwohin.

     Fuer die Erhebung ist das ein Gewinn: Bisher zaehlte ein
     versehentlicher Klick als Uebernahme. Ab jetzt ist jede eine
     Entscheidung - dafuer sind die Zahlen mit frueheren Testlaeufen
     nicht mehr vergleichbar. */
  sperreAn() {
    if (document.getElementById("agentSperre")) return;
    const sperre = document.createElement("div");
    sperre.id = "agentSperre";

    const knopf = document.createElement("button");
    knopf.type = "button";
    knopf.id = "agentStopp";
    knopf.textContent = "Agent anhalten";
    knopf.addEventListener("click", (e) => { e.stopPropagation(); this.uebernahme(); });

    const hinweis = document.createElement("span");
    hinweis.className = "sperre-hinweis";
    hinweis.textContent = "Der Assistent arbeitet gerade";

    const leiste = document.createElement("div");
    leiste.className = "sperre-leiste";
    leiste.append(hinweis, knopf);
    sperre.appendChild(leiste);
    document.body.appendChild(sperre);
    this.sperreAusrichten();
    this.scrollSperre(true);
  },

  /* Auch Scrollen sperren (04.10.2026).
     ------------------------------------------------------------------
     Die Sperre fing nur Klicks ab; Mausrad, Wischen und Pfeiltasten
     bewegten die Seite weiter. Gemeldet: nicht stoerend, aber die Seite
     soll unberuehrt bleiben, solange der Agent arbeitet. Abgefangen wird,
     was die Person tut - der Chat und offene Fenster bleiben scrollbar,
     und der Agent selbst scrollt weiter (scrollIntoView, scrollBy). */
  scrollSperre(an) {
    const frei = (e) => !!(e.target && e.target.closest && e.target.closest(".agent-rail-inner, .agent-rail, #agentMessages, .vorschlag-fenster, input, textarea"));
    if (an) {
      if (this._scrollStopp) return;
      const stopp = (e) => { if (!frei(e)) e.preventDefault(); };
      const tasten = (e) => {
        if (frei(e)) return;
        if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)) e.preventDefault();
      };
      this._scrollStopp = { stopp, tasten };
      window.addEventListener("wheel", stopp, { passive: false, capture: true });
      window.addEventListener("touchmove", stopp, { passive: false, capture: true });
      window.addEventListener("keydown", tasten, { capture: true });
    } else if (this._scrollStopp) {
      const { stopp, tasten } = this._scrollStopp;
      window.removeEventListener("wheel", stopp, { capture: true });
      window.removeEventListener("touchmove", stopp, { capture: true });
      window.removeEventListener("keydown", tasten, { capture: true });
      this._scrollStopp = null;
    }
  },

  /* Wo der Chat aufhoert, faengt die Sperre an.
     Gemessen statt geraten: Die Breite der Spalte haengt am Fenster, und
     auf schmalen Geraeten liegt der Chat ueber der Seite statt daneben -
     dort klappt der Agent ohnehin zu, waehrend er arbeitet. */
  sperreAusrichten() {
    const sperre = document.getElementById("agentSperre");
    if (!sperre) return;
    const rail = document.getElementById("agentRail");
    const k = rail ? rail.getBoundingClientRect() : null;
    const daneben = k && k.width > 0 && k.right < window.innerWidth - 40;
    sperre.style.left = daneben ? `${Math.round(k.right)}px` : "0px";
  },

  sperreAus() {
    document.getElementById("agentSperre")?.remove();
    this.scrollSperre(false);
  },

  uebernahme() {
    this.notieren("uebernahme", { seite: Werkzeuge.seite() });
    this.anhalten("knopf");
  },

  /* ==================================================================
     Angehalten - und dann?
     ------------------------------------------------------------------
     Gemeldet am 03.10.2026: Der Agent wurde waehrend der Suche
     angehalten, danach kam kein Wort mehr, und "mach weiter" ergab
     "Da ist gerade etwas schiefgegangen". Drei Ursachen:

     1. Wer sich meldet, war dem Modell ueberlassen ("frag kurz, wie es
        weitergehen soll" im Werkzeugergebnis). Dessen Text geht durch
        den Vertrag fuer die Nachricht und fiel dort oft ganz weg.
     2. Der Merker `Zeiger.abbruch` lebt nur bis zum naechsten Laden der
        Seite. Lief die Werkzeugkette ueber einen Seitenwechsel, machte
        sie danach einfach weiter.
     3. Ein getipptes "Stopp" landete im Verlauf zwischen Werkzeugaufruf
        und Ergebnis - ein Verlauf, den die Schnittstelle ablehnt.

     Jetzt gilt: Angehalten heisst, das Modell wird in diesem Zug nicht
     mehr gerufen. Der Kern sagt selbst, dass er angehalten hat, und
     bietet drei Wege an: weitermachen (dasselbe Werkzeug noch einmal),
     selbst weitersuchen, etwas aendern. Was die Person waehlt, steht im
     Protokoll - fuer die Erhebung ist das eine Entscheidung ueber die
     Kontrolle, genau wie die Uebernahme selbst.
     ================================================================== */
  istAngehalten() {
    return Zeiger.abbruch || this.lauf.phase === "angehalten";
  },

  anhalten(quelle, text = null) {
    Zeiger.anhalten();
    this.sperreAus();
    const a = this.lauf.ausstehend;
    const werkzeug = a?.calls?.[a.i]?.function?.name || this.lauf.letztesWerkzeug || null;
    if (!this.lauf.anhalt || this.lauf.anhalt.gesagt) {
      // untaetig: "Stopp" kam, als gar nichts lief - dann gibt es keine
      // Taetigkeit, die er nennen koennte
      const untaetig = !this.laeuft && !this.lauf.ausstehend;
      this.lauf.anhalt = { werkzeug: untaetig ? null : werkzeug, seite: Werkzeuge.seite(), quelle, text, untaetig, gesagt: false };
    }
    this.lauf.phase = "angehalten";
    AgentPanel.status("angehalten · du hast übernommen");
    this.sichern();
    // Die Meldung kommt sofort - nicht erst, wenn der angehaltene Zug zu
    // Ende ist. Bis zur Antwort der Person ist der Agent danach stumm.
    this.anhaltMelden();
  },

  ANHALT_TAETIGKEIT: {
    suchen: "die Suche eingestellt habe",
    regionen_zaehlen: "die Regionen durchgezählt habe",
    regionen_vergleichen: "die Regionen verglichen habe",
    monate_vergleichen: "die Monate verglichen habe",
    stichprobe_nehmen: "mir Häuser von innen angesehen habe",
    haeuser_ansehen: "die Häuser durchgegangen bin",
    haus_details: "mir ein Haus genauer angesehen habe",
    haus_oeffnen: "ein Haus geöffnet habe",
    bewertungen_lesen: "die Bewertungen gelesen habe",
    bewertungen_durchsuchen: "die Bewertungen durchsucht habe",
    auswahl_vorlegen: "die Vorschläge zusammengestellt habe",
    buchung_vorbereiten: "die Buchung vorbereitet habe",
    formular_ausfuellen: "das Formular ausgefüllt habe",
    faq_nachschlagen: "im FAQ nachgeschlagen habe",
  },

  anhaltMelden() {
    const h = this.lauf.anhalt;
    if (!h || h.gesagt) return;
    h.gesagt = true;
    const mitten = !!(this.lauf.ausstehend || this.laeuft);
    if (h.text && !mitten) this.gespraechPush({ role: "user", content: h.text });
    const buchung = h.werkzeug === "buchung_abschliessen";
    const taetigkeit = this.ANHALT_TAETIGKEIT[h.werkzeug] || "gearbeitet habe";
    const satz = buchung
      ? "Ich habe angehalten und nichts gebucht. Soll ich die Buchung doch abschließen?"
      : h.untaetig
        ? "Ich halte an und mache erst weiter, wenn du es sagst. Wie soll es weitergehen?"
        : `Du hast mich angehalten, während ich ${taetigkeit}. Ich mache erst weiter, wenn du es sagst. Wie soll es weitergehen?`;
    this.lauf.chips = buchung
      ? ["Doch buchen", "Nicht buchen", "Ich möchte etwas ändern"]
      : ["Weitermachen", "Ich suche selbst weiter", "Ich möchte etwas ändern"];
    this.anhaltSpricht = true;
    try { this.sagen(satz); } finally { this.anhaltSpricht = false; }
    this.lauf.stumm = true;
    // Steht noch ein Werkzeugaufruf ohne Ergebnis im Verlauf, kommt die
    // Meldung erst danach hinein (verlaufReparieren raeumt sonst auf)
    if (mitten) this.lauf.anhaltNachtrag = { satz, text: h.text || null };
    else this.gespraechPush({ role: "assistant", content: satz });
    AgentPanel.setSuggestions(this.lauf.chips);
    this.notieren("anhalt_gemeldet", { werkzeug: h.werkzeug, seite: h.seite, quelle: h.quelle });
    this.sichern();
  },

  /* Die Antwort auf "Wie soll es weitergehen?". Liefert true, wenn der
     Kern sie selbst erledigt hat. Alles andere ist eine neue Nachricht
     und geht den normalen Weg - die Person darf auch einfach etwas
     Neues sagen. */
  anhaltAntwort(t, opts = {}) {
    const h = this.lauf.anhalt;
    this.lauf.anhalt = null;
    const satz = String(t).toLowerCase().replace(/[.!]+$/, "").trim();
    const weiter = /^(ja[, ]*)?(bitte )?(weiter(machen)?|mach( doch| bitte)? weiter|weiter so|fortsetzen|such(e)? weiter|suche fortsetzen|doch buchen|leg los|los|mach)( bitte)?$/i.test(satz)
      || /\b(mach|such|arbeite|geh)\w* (doch |bitte |einfach )?weiter\b/.test(satz)
      || /\bfortsetzen\b/.test(satz);
    const selbst = /\b(selbst|selber|allein|alleine)\b/.test(satz) && !/\bnicht (selbst|selber|allein)/.test(satz);
    const aendern = /etwas (anderes|ändern|aendern)|was ändern|was aendern|^nicht buchen$/.test(satz);
    const zeigen = () => { if (!opts.gezeigt) this.sagen(t, "user"); this.gespraechPush({ role: "user", content: t }); };

    if (weiter && !selbst) {
      this.notieren("anhalt_weiter", { werkzeug: h?.werkzeug || null });
      this.lauf.fortsetzenMit = h?.werkzeug && h.werkzeug !== "stand_merken" ? h.werkzeug : null;
      this.lauf.fortsetzenHinweis = this.ANHALT_TAETIGKEIT[h?.werkzeug] ? `zuletzt: ${h.werkzeug}` : "zuletzt: deine Arbeit auf der Seite";
      return false;   // normaler Weg: Nachricht zeigen, Zug starten
    }
    if (selbst) {
      zeigen();
      const s = "Alles klar, die Seite gehört dir. Wenn du mich wieder brauchst, schreib einfach. Ich weiß noch, was wir besprochen haben.";
      this.sagen(s);
      this.gespraechPush({ role: "assistant", content: s });
      this.lauf.chips = [];
      AgentPanel.setSuggestions([]);
      this.notieren("anhalt_selbst", { werkzeug: h?.werkzeug || null });
      AgentPanel.platzMachen?.();
      this.sichern();
      return true;
    }
    if (aendern) {
      zeigen();
      const s = /nicht buchen/.test(satz)
        ? "Alles klar, ich buche nicht. Sag mir einfach, was ich stattdessen tun soll."
        : "Sag mir einfach, was ich anders machen soll, zum Beispiel ein anderes Budget, eine andere Region oder andere Wünsche.";
      this.sagen(s);
      this.gespraechPush({ role: "assistant", content: s });
      this.lauf.chips = [];
      AgentPanel.setSuggestions([]);
      this.notieren("anhalt_aendern", { werkzeug: h?.werkzeug || null });
      this.lauf.phase = "gespraech";
      this.sichern();
      return true;
    }
    this.notieren("anhalt_neue_nachricht", { werkzeug: h?.werkzeug || null });
    return false;
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Kern, FREIGABE, STELLSCHRAUBEN };
