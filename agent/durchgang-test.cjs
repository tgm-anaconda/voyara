/* Pruefung der Befunde aus dem Testlauf vom 05.11.2026.
 *
 *   node agent/durchgang-test.cjs         der jetzige Stand, erwartet 0 falsch
 *   node agent/durchgang-test.cjs --alt   Gegenprobe am Stand davor
 *                                         (_backup/2026-11-12-ausstattung/)
 *
 * Geprueft wird, was Logik ist:
 *
 *   1. Wortwahl   "Haeuser" stand fest eingetippt, auch wenn die Person
 *                 ausdruecklich nur Hotels suchte (artWort/artZahl/artEins,
 *                 PHASEN mit {art}).
 *   2. Zaehlung   "mit deinen Vorgaben passen aber nur 2" neben "waeren es
 *                 27 statt 3" - zwei Zahlen aus zwei Quellen in einem Satz.
 *                 Hier geprueft an der Quelle: engstelleRueckfrage zaehlt
 *                 die passenden, nicht das Vergleichsset.
 *   3. Engstelle  Der Rundgang lief los, obwohl zu wenige Treffer da waren;
 *                 gefragt wurde erst danach. Geprueft wird, dass es
 *                 Kern.engstelleVorRundgang gibt und dass es bei wenigen
 *                 Treffern anhaelt und bei vielen durchlaesst.
 *   4. Flughafen  Die Annahme fiel auf ein festes "Frankfurt" zurueck.
 *   5. Rueckfrage Wer zurueckfragt, hat nicht abgelehnt - die Annahme wird
 *                 einmal zurueckgestellt.
 *   6. Entschuldigung  "Ich habe Lappland ausgeschlossen. Entschuldige, das
 *                 habe ich nicht sicher verstanden."
 *
 * Nicht hier: die Lage der Sperrleiste und der fehlende Schliessknopf.
 * Das ist Gestaltung und steht in der Seitenpruefung.
 */
const fs = require("fs"), vm = require("vm");
const B = "/Users/tom-gabrielmielicki/Desktop/Bachelor Arbeit/Website/";
const alt = process.argv.includes("--alt");
const quelle = alt ? B + "_backup/2026-11-12-ausstattung/" : B;

const ctx = { console, window: {},
  document: { querySelectorAll: () => [], querySelector: () => null, getElementById: () => null,
    createElement: () => ({ setAttribute() {}, append() {}, appendChild() {}, querySelector: () => null, classList: { add() {}, remove() {} }, style: {} }),
    head: { appendChild() {} },
    body: { classList: { contains: () => false, add() {}, remove() {}, toggle() {} } },
    documentElement: { classList: { add() {}, remove() {} } }, addEventListener() {} },
  location: { search: "", href: "" }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  sessionStorage: { getItem: () => null, setItem() {} }, setTimeout, clearTimeout,
  fetch: () => Promise.reject(new Error("kein Netz")),
  navigator: { userAgent: "test" }, matchMedia: () => ({ matches: false, addEventListener() {} }),
  URLSearchParams, URL, Date, JSON, Math, Promise, Intl,
  requestAnimationFrame: (f) => setTimeout(f, 0), cancelAnimationFrame: clearTimeout,
  addEventListener() {}, removeEventListener() {}, screen: { width: 1440, height: 900 },
  innerWidth: 1440, innerHeight: 900, scrollTo() {}, getComputedStyle: () => ({ getPropertyValue: () => "" }) };
ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);
for (const f of ["data/ziele.js", "data/hotels.js", "data/inventory.js", "data/auswahl.js",
  "data/faq.js", "agent/fluege.js", "agent/politik.js", "agent/werkzeugkasten.js", "agent/kern.js"]) {
  /* Die Sicherung haelt nur die geaenderten Dateien, flach abgelegt.
     Alles andere kommt aus dem Projekt - sonst misst die Gegenprobe
     fehlende Dateien statt alten Code. */
  /* Auch Datendateien kommen aus der Sicherung, wenn sie dort liegen -
     sonst misst die Gegenprobe zu einem alten Code den neuen Katalog,
     und Pruefungen zur Ausstattung bestehen auf beiden Seiten (gefunden
     am 09.11.2026). */
  const flach = quelle + f.replace(/^(agent|data)\//, "");
  // Nur in der Gegenprobe: Ohne --alt ist `quelle` die Projektwurzel, und
  // der flache Name trifft dort andere Dateien (faq.js statt data/faq.js).
  const pfad = (alt && fs.existsSync(flach)) ? flach : B + f;
  try { vm.runInContext(fs.readFileSync(pfad, "utf8"), ctx, { filename: f }); }
  catch (e) { console.log("LADEFEHLER", f, e.message.slice(0, 160)); process.exit(2); }
}
vm.runInContext("this.PO=typeof Politik!=='undefined'?Politik:null;"
  + "this.AL=typeof AMENITY_LABELS!=='undefined'?AMENITY_LABELS:null;"
  + "this.WK=typeof Werkzeugkasten!=='undefined'?Werkzeugkasten:null;"
  + "this.KN=typeof Kern!=='undefined'?Kern:null;"
  // Die Kataloge sind `const` im Skript und haengen nicht am Kontext -
  // geholt wird deshalb ueber den Werkzeugkasten, von innen.
  + "this.KAT=Werkzeugkasten.katalog({ typ: 'hotel' });", ctx);
const { WK, KN, KAT, PO, AL } = ctx;
if (!WK || !KN) { console.log("Werkzeugkasten oder Kern nicht geladen"); process.exit(2); }

let gut = 0, schlecht = 0;
const pruefe = (name, ist, soll) => {
  const a = JSON.stringify(ist), b = JSON.stringify(soll);
  if (a === b) gut++;
  else { schlecht++; console.log(`  FEHLT: ${name}\n    ist  ${a}\n    soll ${b}`); }
};
console.log(alt ? "GEGENPROBE am alten Code" : "NEUER Code");

const HOTEL = { typ: "hotel" };
const WOHNUNG = { typ: "apartment" };
const OFFEN = {};

/* ====================================================================
   1. Wortwahl - "Haeuser" nur noch, wo es stimmt
   ==================================================================== */
pruefe("artZahl 3 Hotels", WK.artZahl?.(3, HOTEL), "3 Hotels");
/* Bei eins steht seit dem 09.11.2026 das Wort statt der Ziffer: "nur 1
   Hotel uebrig" las sich wie ein Platzhalter, der nicht gefuellt wurde. */
pruefe("artZahl 1 Hotel", WK.artZahl?.(1, HOTEL), "ein Hotel");
pruefe("artZahl 2 Ferienwohnungen", WK.artZahl?.(2, WOHNUNG), "2 Ferienwohnungen");
pruefe("artZahl 1 Ferienwohnung", WK.artZahl?.(1, WOHNUNG), "eine Ferienwohnung");
pruefe("artZahl 5 Unterkuenfte ohne Art", WK.artZahl?.(5, OFFEN), "5 Unterkünfte");
pruefe("artEins bestimmt (Hotel)", WK.artEins?.(HOTEL, true), "das Hotel");
pruefe("artEins bestimmt (Wohnung)", WK.artEins?.(WOHNUNG, true), "die Ferienwohnung");

// Die Phase traegt die Art, und zwar die aus dem Profil
pruefe("Phase suchen (Hotel)", WK.phaseText("suchen", HOTEL), "Sucht passende Hotels");
pruefe("Phase suchen (Wohnung)", WK.phaseText("suchen", WOHNUNG), "Sucht passende Ferienwohnungen");
pruefe("Phase suchen (offen)", WK.phaseText("suchen", OFFEN), "Sucht passende Unterkünfte");
pruefe("Phase Rundgang (Hotel)", WK.phaseText("haeuser_ansehen", HOTEL), "Sieht sich einzelne Hotels an");
// Buchhaltung bleibt stumm, Unbekanntes bleibt "Arbeitet"
pruefe("Phase stand_merken bleibt null", WK.phaseText("stand_merken", HOTEL), null);
pruefe("Phase unbekannt", WK.phaseText("gibtesnicht", HOTEL), "Arbeitet");

// In beiden Armen derselbe Text - die Art haengt am Profil, nicht am Arm
pruefe("Phase in beiden Armen gleich",
  WK.phaseText("suchen", HOTEL) === WK.phaseText("suchen", { ...HOTEL }), true);

/* ====================================================================
   2. Zaehlung - die Rueckfrage zaehlt die passenden
   ==================================================================== */
// engstelleRueckfrage baut ihren Satz aus lauf.letzteEngstelle. Geprueft
// wird, dass dort die Zahl der PASSENDEN steht und dass der Satz die Art
// nennt, nicht pauschal "Haeuser".
const laufMit = (jetzt, ohne, feld) => ({ letzteEngstelle: { feld, ohne, jetzt }, engstelleGefragt: {} });
const pHotel = { typ: "hotel", kriterien: [{ id: "pool" }], maxPreis: 150 };
const ef = WK.engstelleRueckfrage?.(pHotel, laufMit(3, 27, "ausstattung"));
pruefe("Rueckfrage nennt die passenden (3)", !!ef && /nur 3 Hotels/.test(ef.satz), true);
pruefe("Rueckfrage nennt die Art, nicht Haeuser", !!ef && !/Häuser/.test(ef.satz), true);
pruefe("Rueckfrage nennt den Gewinn (27)", !!ef && /wären es 27/.test(ef.satz), true);
const efW = WK.engstelleRueckfrage?.({ typ: "apartment", kriterien: [{ id: "pool" }] }, laufMit(2, 20, "ausstattung"));
pruefe("Rueckfrage Wohnungen", !!efW && /nur 2 Ferienwohnungen/.test(efW.satz), true);
// Oberhalb der Grenze wird nicht gefragt
pruefe("Keine Rueckfrage ab der Grenze",
  WK.engstelleRueckfrage?.(pHotel, laufMit(WK.ENGSTELLE_FRAGE_GRENZE, 27, "ausstattung")) ?? null, null);
// Je Feld nur einmal
const einmal = laufMit(3, 27, "ausstattung"); einmal.engstelleGefragt = { ausstattung: true };
pruefe("Je Feld nur einmal", WK.engstelleRueckfrage?.(pHotel, einmal) ?? null, null);

/* ====================================================================
   3. Der Halt VOR dem Rundgang
   ==================================================================== */
pruefe("engstelleVorRundgang gibt es", typeof KN.engstelleVorRundgang, "function");

/* Die Gegenprobe laeuft am alten Stand, und dort gibt es die Funktion
   noch nicht. Eine Pruefung, die dann abstuerzt, misst nichts - sie
   soll durchfallen und weiterzaehlen. */
const vorRundgang = (k, liste, p) => (typeof KN.engstelleVorRundgang === "function"
  ? KN.engstelleVorRundgang.call(k, liste, p) : null);

// Ein Kern-Doppel, das nur mitschreibt
const kernDoppel = () => {
  const k = Object.create(KN);
  k.gesagt = []; k.chips = null; k.notiert = [];
  k.lauf = { profil: null, gespraech: [], verlauf: [], engstelleGefragt: {}, protokoll: [] };
  k.sagen = (t) => k.gesagt.push(String(t));
  k.gespraechPush = () => {};
  k.notieren = (e, d) => k.notiert.push([e, d]);
  k.sichern = () => {};
  return k;
};
ctx.AgentPanel = { setSuggestions: (c) => { ctx.__chips = c; } };

// Wenige Treffer: es wird gefragt, und zwar bevor irgendetwas laeuft
const k1 = kernDoppel();
const wenige = KAT.slice(0, 3);
const halt = vorRundgang(k1, wenige, pHotel);
pruefe("Wenige Treffer: Halt", !!halt && halt.ergebnis?.nichtVorgelegt === true, true);
pruefe("Wenige Treffer: der Chat hat gefragt", k1.gesagt.length > 0 && /ausweiten/.test(k1.gesagt[0]), true);
pruefe("Wenige Treffer: Modell soll schweigen",
  !!halt && /KEIN Werkzeug/.test(halt.ergebnis?.hinweis || ""), true);
pruefe("Wenige Treffer: es steht im Protokoll",
  k1.notiert.some(([e]) => e === "engstelle_vor_rundgang"), true);
pruefe("Wenige Treffer: Kern wartet", k1.lauf.kernWartet === true, true);

// Genug Treffer: kein Halt, der Rundgang darf laufen
const k2 = kernDoppel();
const viele = KAT.slice(0, 40);
pruefe("Genug Treffer: kein Halt", vorRundgang(k2, viele, pHotel), null);
pruefe("Genug Treffer: nichts gesagt", k2.gesagt.length, 0);

// Leere Liste ist kein Fall fuer diese Frage - dafuer gibt es den Engpass
const k3 = kernDoppel();
pruefe("Leere Liste: kein Halt", vorRundgang(k3, [], pHotel), null);

// Und nicht zweimal fuer dasselbe Feld
const k4 = kernDoppel();
vorRundgang(k4, wenige, pHotel);
const zweimal = vorRundgang(k4, wenige, pHotel);
pruefe("Nicht zweimal fuer dasselbe Feld", zweimal, null);

/* ====================================================================
   4. Flughafen - kein blindes Frankfurt
   ==================================================================== */
/* Die Annahme laeuft im Fahrplan. Geprueft wird sie hier an ihrer
   Wirkung: zweimal gefragt, nichts gesagt, kein Flughafen genannt - was
   steht danach im Stand? Frankfurt waere der alte Rueckfall. */
const flugProfil = () => ({ flug: true, typ: "hotel", monat: 10, naechte: 7,
  erwachsene: 2, kinder: 0, richtung: "kalt", vonPerson: {} });
/* `ohneAntwort` ist seit dem 06.11.2026 der Zaehler, an dem die Annahme
   haengt - zweimal gefragt UND zweimal keine Antwort. `gefragtWie` steht
   weiter daneben, es bestimmt nur noch die Formulierung der Frage. */
const flugLauf = () => ({ gefragtWie: { flugAb: 2 }, ohneAntwort: { flugAb: 2 },
  besprochen: {}, profil: null, nachrichtArt: "antwort", protokoll: [] });
const p4 = flugProfil(); const l4 = flugLauf();
try { WK.fahrplan(p4, l4); } catch { /* der Fahrplan braucht mehr Welt, die Annahme reicht */ }
pruefe("Flughafen gesetzt", typeof p4.flugAb === "string" && p4.flugAb.length > 0, true);
pruefe("Flughafen ist begruendbar, nicht blind Frankfurt",
  p4.flugAb !== "Frankfurt" || (WK.guenstigsterFlughafen([], null)?.ab === "Frankfurt"), true);

/* ====================================================================
   5. Wer zurueckfragt, hat nicht abgelehnt
   ==================================================================== */
const p5 = flugProfil(); const l5 = flugLauf(); l5.nachrichtArt = "frage";
try { WK.fahrplan(p5, l5); } catch { /* siehe oben */ }
pruefe("Frage: Annahme wird zurueckgestellt", p5.flugAb == null, true);
pruefe("Frage: der Aufschub steht fest", !!l5.frageAufschub?.flugAb, true);
// Beim zweiten Mal greift sie doch - sonst liesse sich der Fahrplan aufhalten
const p5b = flugProfil(); p5b.flugAb = null;
const l5b = flugLauf(); l5b.nachrichtArt = "frage"; l5b.frageAufschub = { flugAb: true };
try { WK.fahrplan(p5b, l5b); } catch { /* siehe oben */ }
pruefe("Zweite Frage: Annahme greift doch", typeof p5b.flugAb === "string" && !!p5b.flugAb, true);

/* ====================================================================
   6. Keine Entschuldigung, wenn etwas angekommen ist
   ==================================================================== */
/* Die Stelle in kern.js ist in den Zug eingebettet und von aussen nicht
   aufrufbar. Geprueft wird deshalb die Bedingung selbst - sie ist eine
   Oder-Verknuepfung ueber drei Quellen, und die dritte ist neu. */
/* Wie beim Laden oben: haelt die Sicherung diese Datei nicht, kommt sie
   aus dem Projekt. Sonst scheitert die Gegenprobe an einer fehlenden
   Datei statt an altem Code. */
const kernAlt = quelle + "kern.js";
const quelltext = fs.readFileSync(alt && fs.existsSync(kernAlt) ? kernAlt : B + "agent/kern.js", "utf8");
const stelle = quelltext.slice(quelltext.indexOf("const zeigtVerstaendnis"),
  quelltext.indexOf("const zeigtVerstaendnis") + 400);
pruefe("Uebernommenes zaehlt als Verstaendnis",
  /zuletztGemerkt \|\| \[\]\)\.length > 0/.test(stelle), true);

/* ====================================================================
   7. Eine Engstelle je Nachricht, nicht zwei
   ==================================================================== */
/* Gefunden am 05.11.2026 beim Durchlauf am echten DOM, nicht gemeldet:
   Bei einer festgelegten Region standen BEIDE Superlative in einer
   Nachricht - "Am meisten nimmt die Festlegung auf diese Region weg:
   ohne diese Vorgabe waeren es 6 statt 2" und "Am engsten ist dabei die
   Mindestzahl an Sternen: Ohne sie waeren es 5". `engpass` kennt die
   Region nur ohne `zielId`, `engstelle` kennt sie immer, also nennt
   engpass den Zweitplatzierten und gibt ihn als den Ersten aus. */
const engProfil = () => ({
  typ: "hotel", artGenannt: true, zielId: "kreta", erwachsene: 2, kinder: 0,
  naechte: 7, monat: 7, mindestSterne: 5, mindestbewertung: 4.5, maxStrand: 0.2,
  vonPerson: { typ: true, zielId: true, mindestSterne: true, mindestbewertung: true, maxStrand: true },
});
let engSatz = "", engTreffer = -1;
try {
  const ep = engProfil();
  const liste = WK.katalogTreffer(ep, WK.filterAusStand(ep));
  engTreffer = liste.length;
  engSatz = WK.lageSatz(liste, ep, WK.umfang(liste, ep), null, { }) || "";
} catch (e) { engSatz = "FEHLER " + e.message; }
const zaehlSuperlativ = (t) => (String(t).match(/Am meisten nimmt|Am engsten ist/g) || []).length;
pruefe("Engstellen-Lage: der Fall hat wirklich zwei Treffer", engTreffer, 2);
pruefe("Engstellen-Lage: nur EIN Superlativ im Satz", zaehlSuperlativ(engSatz), 1);
pruefe("Engstellen-Lage: das Angebot zu lockern steht drin",
  /lockern soll/.test(engSatz), true);

/* ====================================================================
   8. Rueckfrage und Korrektur sind keine ausgebliebenen Antworten
   --------------------------------------------------------------------
   Gemeldet am 06.11.2026: Auf "Hotel oder Ferienwohnung?" kam erst
   "wann zaehlt man als Kind?", dann "dann sind wir doch 2 Erwachsene und
   ein Kind". Der Kern zaehlte zwei vergebliche Anlaeufe, nahm "beides"
   an und erzwang im selben Zug die Suche.

   Geprueft wird die ganze Kette: die Wertung im Kern, der Zaehler, an
   dem die Annahme haengt, und der Zwang zur Suche.
   ==================================================================== */
/* Gezaehlt wird seit dem 10.11.2026 im Fahrplan, wo steht, ob das Thema
   danach wirklich geschlossen ist. Vorher hing die Zaehlung am Urteil
   des Modells - und wurde zurueckgesetzt, sobald es "beantwortet"
   meldete, auch ohne dass ein Wert ankam. Im Pruefstand hiess das: 91
   gestellte Themen, keine einzige Annahme. */
const runde = (urteil, vor = {}, klaert = {}, geschlossen = false) => {
  const p = { typ: "hotel", artGenannt: true, erwachsene: 2, kinder: 0, monat: 7,
    zielOffen: true, flug: false, vonPerson: {} };
  if (geschlossen) p.naechte = 7;
  const lauf = { gefragtVorher: "dauer", zugSeit: Date.now() + Math.random(),
    frageBeantwortet: urteil, ohneAntwort: { ...vor }, klaertNoch: { ...klaert },
    gefragtWie: { dauer: 2 }, besprochen: {}, protokoll: [] };
  try { WK.fahrplan(p, lauf); } catch { /* der Fahrplan braucht mehr Welt */ }
  return { ohne: lauf.ohneAntwort.dauer ?? null, klaert: lauf.klaertNoch.dauer ?? null };
};
pruefe("Rueckfrage zaehlt nicht als ausgebliebene Antwort", runde("nein_klaert_noch").ohne || 0, 0);
pruefe("Rueckfrage wird aber vermerkt", runde("nein_klaert_noch").klaert, 1);
pruefe("Echtes Ausweichen zaehlt", runde("nein").ohne, 1);
pruefe("Ohne Auskunft des Modells zaehlt es wie bisher", runde(null).ohne, 1);
pruefe("Ein geschlossenes Thema setzt den Zaehler zurueck",
  runde("ja", { dauer: 1 }, {}, true).ohne, 0);
/* Und der Fall, an dem der Pruefstand gescheitert ist: Das Modell meldet
   "beantwortet", aber es kam nichts an. Frueher: Zaehler zurueck auf
   null, die Frage wiederholte sich endlos. */
pruefe("'Beantwortet' ohne Wert zaehlt trotzdem", runde("ja", { dauer: 1 }).ohne, 2);
// Dreimal klaeren ohne Antwort: ab der dritten Runde zaehlt es doch
pruefe("Dreimal klaeren ohne Antwort zaehlt doch",
  runde("nein_klaert_noch", {}, { dauer: 2 }).ohne, 1);

/* Die Annahme haengt am neuen Zaehler, nicht mehr an der Zahl der
   Fragen. Derselbe Stand wie im gemeldeten Fall: zweimal nach der Art
   gefragt, beide Male hat die Person geklaert statt geantwortet. */
const artProfil = () => ({ monat: 12, naechte: 5, erwachsene: 2, kinder: 1,
  kinderAlter: [17], zielOffen: true, flug: false, vonPerson: {} });
/* Hier stand bis zum 10.11.2026 das Gegenteil: zweimal gefragt, die
   Person hat beide Male geklaert statt geantwortet - dann sollte NICHT
   angenommen werden. Der Nutzer hat das aufgehoben und den haerteren
   Anspruch gesetzt: Eine Frage steht nie ein drittes Mal im Chat, egal
   was dazwischen passiert ist. Also klaert der Kern jetzt auch hier. */
const pA = artProfil();
try { WK.fahrplan(pA, { gefragtWie: { art: 1 }, ohneAntwort: {}, besprochen: {}, protokoll: [] }); } catch { /* egal */ }
pruefe("Einmal gefragt: noch keine Annahme zur Art",
  !pA.artEgal && !pA.artGenannt, true);
const pA2 = artProfil();
try { WK.fahrplan(pA2, { gefragtWie: { art: 2 }, ohneAntwort: {}, klaertNoch: { art: 1 }, besprochen: {}, protokoll: [] }); } catch { /* egal */ }
pruefe("Zweimal gefragt: der Kern klaert es selbst, auch nach einer Rueckfrage",
  !!pA2.artEgal, true);
const pB = artProfil();
try { WK.fahrplan(pB, { gefragtWie: { art: 2 }, ohneAntwort: { art: 2 }, besprochen: {}, protokoll: [] }); } catch { /* egal */ }
pruefe("Zweimal ausgewichen: Annahme zur Art greift", !!pB.artEgal, true);

/* Und die Suche laeuft nicht im selben Zug los, in dem die Annahme
   gerade erst gefallen ist. */
const laufC = { gefragtWie: { art: 2 }, ohneAntwort: { art: 2 }, besprochen: {},
  protokoll: [], zugSeit: 1000, gesuchtMit: null };
const pC = artProfil();
let zwangC = null;
try { zwangC = WK.zwang(pC, laufC); } catch (e) { zwangC = "FEHLER " + e.message; }
pruefe("Annahme-Zug: noch keine Suche", zwangC !== "suchen", true);
// Im naechsten Zug schon
laufC.zugSeit = 2000;
let zwangD = null;
try { zwangD = WK.zwang(pC, laufC); } catch (e) { zwangD = "FEHLER " + e.message; }
pruefe("Naechster Zug: jetzt wird gesucht", zwangD, "suchen");

/* ====================================================================
   9. Der Monat: ein Entschluss, nicht zwei
   --------------------------------------------------------------------
   Gemeldet am 06.11.2026: "Er hat gesagt, okay, dann empfehle ich
   Dezember, hat aber trotzdem fuer Januar, Maerz und so rausgesucht."
   Die stille Annahme und der sichtbare Vergleich liefen gleichzeitig.
   ==================================================================== */
const laufAnnahme = () => ({
  uebersprungen: { zeit: true },
  annahmeOffen: [{ thema: "zeit", text: "Ich nehme Dezember.", felder: { monat: 12 } },
    { thema: "dauer", text: "Ich rechne mit einer Woche.", felder: { naechte: 7 } }],
  uebersprungenNotiert: { zeit: true },
});
/* Wie oben bei antwortWerten: Kennt der alte Code die Funktion nicht,
   soll die Pruefung fehlschlagen statt abzustuerzen. */
const zurueckNehmen = (k, t) => (typeof WK.annahmeZuruecknehmen === "function"
  ? WK.annahmeZuruecknehmen(k, t) : "annahmeZuruecknehmen fehlt");
const kAn = { lauf: laufAnnahme(), notieren() {} };
const zurueck = zurueckNehmen(kAn, "zeit");
pruefe("Annahme zur Zeit wird zurueckgenommen", zurueck, true);
pruefe("Ihr Satz steht nicht mehr an",
  kAn.lauf.annahmeOffen.some((x) => x.thema === "zeit"), false);
pruefe("Andere Annahmen bleiben unberuehrt",
  kAn.lauf.annahmeOffen.map((x) => x.thema), ["dauer"]);
pruefe("Nichts zurueckzunehmen meldet auch nichts",
  zurueckNehmen({ lauf: { annahmeOffen: [] } }, "zeit"), false);

/* Und der Satz der Rechnung nennt die richtige Zahl Monate. Im
   gemeldeten Fall waren es vier, im Chat stand "die drei Monate". */
const monatProfil = { typ: "hotel", artGenannt: true, erwachsene: 2, kinder: 0, naechte: 7, zielOffen: true };
const satzVier = WK.monatWaehlen(monatProfil, [12, 1, 2, 3])?.satz || "";
const satzZwei = WK.monatWaehlen(monatProfil, [6, 7])?.satz || "";
pruefe("Vier verglichene Monate heissen nicht drei", /\bdrei\b/.test(satzVier), false);
pruefe("Zwei verglichene Monate heissen nicht drei", /\bdrei\b/.test(satzZwei), false);
pruefe("Der Satz laedt genau einmal zum Widerspruch ein",
  (satzVier.match(/Sag (gern )?Bescheid/g) || []).length, 1);

/* Und der Rahmen um diesen Satz, der ihn bisher verdoppelt hat. Er
   entsteht im Fahrplan, also wird er dort abgeholt: Monat offen, zweimal
   ohne Antwort - dann legt ANNAHME.zeit ihren Satz in annahmeOffen. */
const zeitProfil = { typ: "hotel", artGenannt: true, erwachsene: 2, kinder: 0,
  naechte: 7, zielOffen: true, flug: false, vonPerson: {} };
const zeitLauf = { gefragtWie: { zeit: 2 }, ohneAntwort: { zeit: 2 }, besprochen: {}, protokoll: [] };
try { WK.fahrplan(zeitProfil, zeitLauf); } catch { /* egal */ }
const zeitSatz = (zeitLauf.annahmeOffen || []).find((x) => x.thema === "zeit")?.text || "";
pruefe("Monatsannahme: der Satz steht ueberhaupt da", zeitSatz.length > 0, true);
pruefe("Monatsannahme: nur einmal verglichen",
  (zeitSatz.match(/verglichen/g) || []).length, 1);
pruefe("Monatsannahme: nur einmal Bescheid sagen",
  (zeitSatz.match(/Sag (gern )?Bescheid/g) || []).length, 1);

/* Und der Auftrag ans Modell unterscheidet die beiden Faelle: Wer
   klaert, bekommt nicht vorgehalten, nicht geantwortet zu haben. */
const auftrag = (klaert) => {
  const pp = { typ: "hotel", artGenannt: true, erwachsene: 2, kinder: 0, monat: 7,
    naechte: 7, zielOffen: true, flug: false, vonPerson: {} };
  delete pp.naechte;
  const l = { gefragtWie: { dauer: 1 }, ohneAntwort: {}, klaertNoch: klaert ? { dauer: 1 } : {},
    besprochen: {}, protokoll: [] };
  try { return String(WK.fahrplan(pp, l).frage || ""); } catch (e) { return "FEHLER " + e.message; }
};
pruefe("Klaerende Rueckfrage: erst ihre Sache zu Ende",
  /ZUERST ihre Sache zu Ende/.test(auftrag(true)), true);
pruefe("Echtes Ausweichen: der alte Auftrag bleibt",
  /nicht eingegangen/.test(auftrag(false)), true);

/* ====================================================================
   10. "Ich und meine Mutter" sind zwei Erwachsene
   --------------------------------------------------------------------
   Gemeldet am 09.11.2026. Das Modell hatte es verstanden, der Kern hat
   seine Angabe weggeworfen: Zahlen zu den Reisenden galten nur, wenn die
   letzte Nachricht ein Wort aus einer festen Liste enthielt. "Freundin"
   stand darin, "Mutter" nicht.

   Jetzt entscheidet das Modell (frage_beantwortet), und der Kern haelt
   nur noch die unbestimmte Mehrzahl zurueck - den einen Fall, fuer den
   die Liste urspruenglich gedacht war.
   ==================================================================== */
const reiseStub = (text) => ({
  lauf: { profil: {}, gespraech: [{ role: "user", content: text }], besprochen: {},
    gefragt: "reisende", gefragtVorher: "reisende" },
  ereignisse: [],
  notieren(e, d) { this.ereignisse.push(e + (d && d.feld ? `(${d.feld})` : "")); },
  sichern() {}, standAnzeigen() {}, sagen() {}, darf: () => true,
  antwortWerten() {}, logZeile() {}, standKurz: () => "",
});
const liesReisende = async (text, felder, urteil = "ja") => {
  const k = reiseStub(text);
  try {
    await WK.ausfuehren("stand_merken",
      { nachricht_art: "antwort", frage_beantwortet: urteil, ...felder }, k, 1);
  } catch { /* der Rest des Werkzeugs braucht die Seite */ }
  const p = k.lauf.profil;
  return { erwachsene: p.erwachsene ?? null, kinder: p.kinder ?? null, personen: p.personen ?? null };
};

(async () => {
  // Genannte Menschen lassen sich zaehlen - egal mit welchem Wort
  for (const satz of ["Ich und meine Mutter", "Ich und mein Cousin",
    "meine Schwester und ich", "Ich und mein Kumpel", "Ich und meine Freundin"]) {
    const r = await liesReisende(satz, { erwachsene: 2, kinder: 0 });
    pruefe(`Reisende: "${satz}" ergibt 2 Erwachsene`, r.erwachsene, 2);
    pruefe(`Reisende: "${satz}" ergibt 0 Kinder`, r.kinder, 0);
  }
  // Eine unbestimmte Mehrzahl bleibt offen - sonst steht eine geratene
  // Zahl in den Studiendaten, als haette die Person sie genannt
  for (const satz of ["Ich fahre mit den Kindern", "mit meiner Familie", "wir fahren mit Freunden"]) {
    const r = await liesReisende(satz, { erwachsene: 2, kinder: 2 });
    pruefe(`Reisende: "${satz}" bleibt offen`, r.kinder, null);
  }
  // Und ohne Rueckendeckung des Modells gilt weiter die alte Vorsicht
  const ohne = await liesReisende("Mir ist das Wetter wichtig", { erwachsene: 2, kinder: 0 }, "nein");
  pruefe("Reisende: ohne Bezug zur Frage wird nichts gesetzt", ohne.erwachsene, null);

  /* ==================================================================
     11. Die Befunde vom 09.11.2026, zweite Haelfte
     ================================================================== */
  // Ausstattung: tolerant genug, um nicht jede Suche zu erwuergen
  const anteil = (merkmal) => {
    const liste = WK.katalog({});
    const n = liste.filter((h) => (h.amenities || []).includes(merkmal)).length;
    return Math.round((100 * n) / liste.length);
  };
  pruefe("Haustiere sind kein Sonderfall mehr (mind. 25 %)", anteil("petsAllowed") >= 25, true);
  pruefe("Whirlpool gibt es ueberhaupt", anteil("whirlpool") > 0, true);
  pruefe("Sauna gibt es ueberhaupt", anteil("sauna") > 0, true);
  pruefe("Garten gibt es ueberhaupt", anteil("garten") > 0, true);
  pruefe("Alle neuen Merkmale haben eine Beschriftung",
    ["whirlpool", "sauna", "garten"].every((m) => AL && AL[m]), true);

  /* Die Engstelle benennt das Merkmal, an dem es haengt - nicht die
     ganze Ausstattung. Gemeldet: "Da muss er darauf hinweisen, welche
     Begrenzungen in der Kombination das Problem sind." */
  const engP = { typ: "hotel", artGenannt: true, richtung: "kalt", maxGrad: 25, erwachsene: 3, kinder: 0,
    monat: 8, naechte: 11, flug: true, flugAb: "Hamburg", verpflegung: "fruehstueck",
    budgetGesamt: 2450, ausstattung: ["petsAllowed", "bar", "pool"], vonPerson: {} };
  const engListe = WK.katalogTreffer(engP, WK.filterAusStand(engP));
  /* Wie oben: Kennt der alte Code die Funktion nicht, soll die Pruefung
     fehlschlagen statt abzustuerzen. */
  const engE = typeof WK.ausstattungEngste === "function" ? WK.ausstattungEngste(engP) : null;
  pruefe("Engstelle: ein einzelnes Merkmal sticht heraus", !!engE, true);
  pruefe("Engstelle: alle Wuensche einzeln gerechnet", engE ? engE.einzeln.length : 0, 3);
  const engR = WK.engstelle(engListe, engP, {});
  pruefe("Engstelle: der Satz nennt das Merkmal, nicht 'die gewuenschte Ausstattung'",
    engR ? /die Vorgabe „/.test(engR.satz) : false, true);
  pruefe("Engstelle: die Zahl gehoert zu diesem Merkmal",
    engR && engE ? engR.ohne === engE.ohne : false, true);
  // Und gelockert wird nur dieses eine Merkmal
  const gelockert = WK.ENGSTELLE_LOCKERN.ausstattung(engP) || {};
  pruefe("Engstelle: nur das engste Merkmal faellt weg",
    gelockert.ausstattung ? gelockert.ausstattung.length : -1, 2);

  /* Regionen untereinander, wenn es wenige sind */
  const kaltP = { typ: "hotel", artGenannt: true, richtung: "kalt", erwachsene: 3, kinder: 0, monat: 8, naechte: 11 };
  const th = (PO.THEMEN || []).find((t) => t.id === "kalt");
  kaltP.zieleErlaubt = WK.regionenFuerRichtung(th, kaltP);
  const kaltSatz = WK.richtungSatz(kaltP) || "";
  pruefe("Kalt: die Regionen stehen untereinander", /\n•/.test(kaltSatz), true);
  pruefe("Kalt: kein irrefuehrendes 'darunter'", /darunter/.test(kaltSatz), false);
  pruefe("Kalt: jede Region mit Zahl der Haeuser", (kaltSatz.match(/Hotels|Hotel\b/g) || []).length >= 2, true);

  /* ==================================================================
     12. Eine Frage steht nie ein drittes Mal im Chat
     --------------------------------------------------------------------
     Anspruch des Nutzers vom 10.11.2026: "Ich würde schon den Anspruch
     haben, dass so ein Wächter gar nicht zum Tragen kommt. Also dass man
     das Ganze so aufbaut, dass eine dreimalige Nennung ausgeschlossen
     ist."

     Ausgeschlossen heisst: Es gibt keinen Pfad dorthin, nicht "es ist
     selten". Deshalb wird es hier nicht gemessen, sondern durchgespielt -
     ein Mensch, der auf keine einzige Frage antwortet, durch alle
     Kombinationen von Art, Vorgehen und Flug. Der Fahrplan muss jedes
     Thema von sich aus schliessen und bis zu den Vorschlaegen kommen.

     Genau dieser Fall fehlte im Netz: Die Kernpruefung spielt tausende
     Gespraeche, aber in jedem davon antwortet die Person auf jede Frage.
     Mein Fehler vom 06.11. lebte in der Luecke dazwischen. */
  const stummerDurchlauf = (start) => {
    const p = { flexibel: true, ...start };
    const lauf = { gespraech: [], gefragtWie: {}, ohneAntwort: {}, klaertNoch: {},
      besprochen: {}, protokoll: [], gesuchtMit: null, gefiltertMit: null, zugSeit: 1 };
    const gestellt = [];
    for (let i = 0; i < 40; i++) {
      lauf.zugSeit = i + 1;          // jeder Durchgang ist ein eigener Zug
      const fp = WK.fahrplan(p, lauf);
      const erzwungen = WK.zwang(p, lauf);
      if (erzwungen === "suchen" || fp.phase === "suche") {
        lauf.gesuchtMit = fp.schluessel;
        lauf.gefiltertMit = WK.filterSchluessel(p);
        if (p.vorgehen) lauf.vorgehenFuer = fp.schluessel + p.vorgehen;
        continue;
      }
      if (fp.phase === "vorschlaege" || fp.phase === "selbst") return { gestellt, fertig: true };
      if (!fp.naechstes) return { gestellt, fertig: false, grund: `SACKGASSE(${fp.phase})` };
      // Die Frage steht im Chat - und die Person antwortet nicht
      gestellt.push(fp.naechstes);
      lauf.gefragtWie[fp.naechstes] = (lauf.gefragtWie[fp.naechstes] || 0) + 1;
      lauf.gefragtVorher = fp.naechstes;
      lauf.frageBeantwortet = "nein";
    }
    return { gestellt, fertig: false, grund: "ABBRUCH_NACH_40" };
  };

  let schlimmste = 0, haengt = 0, laeufe = 0, beispiel = null;
  for (const art of ["hotel", "apartment", null]) {
    for (const vorgehen of [null, "top3", "selbst"]) {
      for (const flug of [null, true, false]) {
        const start = {};
        if (art) { start.typ = art; start.artGenannt = true; }
        if (vorgehen) start.vorgehen = vorgehen;
        if (flug !== null) start.flug = flug;
        const r = stummerDurchlauf(start);
        laeufe++;
        const zaehl = {};
        for (const t of r.gestellt) zaehl[t] = (zaehl[t] || 0) + 1;
        const max = Math.max(0, ...Object.values(zaehl));
        if (max > schlimmste) { schlimmste = max; beispiel = { start, zaehl }; }
        if (!r.fertig) { haengt++; if (!beispiel || max <= schlimmste) beispiel = { start, grund: r.grund, zaehl }; }
      }
    }
  }
  pruefe("Stumme Durchlaeufe: alle gespielt", laeufe, 27);
  pruefe("Keine Frage steht ein drittes Mal", schlimmste <= 2 ? "hoechstens zweimal" : `${schlimmste}-mal: ${JSON.stringify(beispiel)}`, "hoechstens zweimal");
  pruefe("Kein Durchlauf bleibt stehen", haengt === 0 ? "keiner" : `${haengt}: ${JSON.stringify(beispiel)}`, "keiner");

  /* Die Verstaendnis-Rueckfrage (12.11.2026).
     ------------------------------------------------------------------
     Gefragt wird, was der Nutzer verlangt hat: EINMAL nachfragen, wenn
     das Modell unsicher ist - und nicht mehr. Die Sperren sind der Punkt
     der Pruefung, nicht der Satz. */
  const rf = (p, lauf) => WK.verstaendnisRueckfrage(p, lauf);
  const zwei = { erwachsene: 2, kinder: 0 };
  pruefe("Rueckfrage: ohne Meldung keine Frage",
    rf(zwei, {}) ? "Frage" : "keine", "keine");
  pruefe("Rueckfrage: gemeldetes Feld wird gefragt",
    (rf(zwei, { unsicher: ["erwachsene"] }) || {}).feld || "keine", "erwachsene");
  pruefe("Rueckfrage: nennt die Deutung im Klartext",
    /zwei Erwachsene/.test((rf(zwei, { unsicher: ["erwachsene"] }) || {}).satz || "") ? "ja" : "nein", "ja");
  pruefe("Rueckfrage: Korrektur steht als Karte",
    ((rf(zwei, { unsicher: ["erwachsene"] }) || {}).chips || []).length >= 2 ? "ja" : "nein", "ja");
  pruefe("Rueckfrage: erste Karte bestaetigt",
    ((rf(zwei, { unsicher: ["erwachsene"] }) || {}).chips || [])[0] || "", "Ja, genau");
  /* Jede Korrekturkarte muss eine Zahl tragen (12.11.2026).
     ------------------------------------------------------------------
     Eine Karte ist kein Sonderweg in den Kern: `setSuggestions` schickt
     ihren Text durch `handleUserInput`, also durch das Modell, und dort
     steht das Zahl-Veto. Eine Karte ohne Zahl setzt nichts.

     Ausgenommen die erste (sie bestaetigt nur) und das Kinderalter (dort
     gibt es keine Alternative zu rechnen, und das genaue Alter muss
     ohnehin von der Person kommen). */
  {
    const ZAHL = /\d|\bein\b|\beine\b|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn/i;
    const ohneZahl = [];
    const staende = { erwachsene: { erwachsene: 2, kinder: 0 }, naechte: { naechte: 9 },
      zimmer: { zimmer: 1 }, kinderAlter: { kinderAlter: [8] } };
    for (const [feld, p] of Object.entries(staende)) {
      const r = rf(p, { unsicher: [feld] });
      if (!r) { ohneZahl.push(`${feld}: keine Rueckfrage`); continue; }
      for (const c of r.chips.slice(1)) {
        if (feld === "kinderAlter") continue;
        if (!ZAHL.test(c)) ohneZahl.push(`${feld}: "${c}"`);
      }
    }
    pruefe("Jede Korrekturkarte traegt eine Zahl", ohneZahl.join(" | ") || "alle", "alle");
    // Und keine Karte wiederholt den gedeuteten Wert
    const r2 = rf({ erwachsene: 2, kinder: 0 }, { unsicher: ["erwachsene"] });
    pruefe("Karten wiederholen den Wert nicht",
      r2.chips.filter((c) => c === "2 Erwachsene").length, 0);
    const r3 = rf({ erwachsene: 1, kinder: 0 }, { unsicher: ["erwachsene"] });
    pruefe("Bei einer Person keine Karte mit null", r3.chips.some((c) => /^0 /.test(c)) ? "ja" : "nein", "nein");
  }
  pruefe("Rueckfrage: dasselbe Feld nie zweimal",
    rf(zwei, { unsicher: ["erwachsene"], rueckversichert: { erwachsene: true } }) ? "Frage" : "keine", "keine");
  pruefe("Rueckfrage: Feld ohne Eintrag bleibt still",
    rf({ sortierung: "preis" }, { unsicher: ["sortierung"] }) ? "Frage" : "keine", "keine");
  pruefe("Rueckfrage: Feld ohne Wert bleibt still",
    rf({}, { unsicher: ["naechte"] }) ? "Frage" : "keine", "keine");
  pruefe("Rueckfrage: hoechstens zwei im Gespraech",
    rf({ naechte: 9 }, { unsicher: ["naechte"], rueckversichert: { erwachsene: true, zimmer: true } })
      ? "Frage" : "keine", "keine");
  pruefe("Rueckfrage: Obergrenze steht bei zwei", WK.RUECKFRAGE_HOECHSTENS, 2);
  /* Die vier Felder sind genau die, bei denen aus einem Satz eine Zahl
     wird. Kommt eines dazu, das TIPPFEHLER schon abdeckt, waeren es zwei
     Mechanismen fuer dieselbe Frage - siehe Kommentar an RUECKFRAGE_FELDER. */
  pruefe("Rueckfrage: nur die vier Zahlenfelder",
    Object.keys(WK.RUECKFRAGE_FELDER).sort().join(","), "erwachsene,kinderAlter,naechte,zimmer");
  for (const f of Object.keys(WK.RUECKFRAGE_FELDER)) {
    if (WK.TIPPFEHLER?.[f]) pruefe(`Rueckfrage: ${f} doppelt zu TIPPFEHLER`, "doppelt", "nicht doppelt");
  }
  /* Und die Gegenrichtung: Die Rueckfrage darf keinen Anlauf kosten.
     Sonst waere das Ergebnis weniger Fragen bis zur Annahme - das
     Gegenteil von "nicht zu schnell Sachen annehmen". */
  {
    const p = { flexibel: true, erwachsene: 2, kinder: 0 };
    const lauf = { gespraech: [], gefragtWie: {}, ohneAntwort: {}, klaertNoch: {}, besprochen: {},
      protokoll: [], gesuchtMit: null, gefiltertMit: null, zugSeit: 1, unsicher: ["erwachsene"] };
    const vorher = WK.fahrplan(p, lauf).naechstes;
    WK.verstaendnisRueckfrage(p, lauf);
    const nachher = WK.fahrplan(p, lauf).naechstes;
    pruefe("Rueckfrage kostet keinen Anlauf", nachher, vorher);
  }

  /* Harte Vorgabe gegen weichen Wunsch (12.11.2026).
     ------------------------------------------------------------------
     Die Trennung steckt in den Daten (ein Kriterium mit `filter`
     filtert, eines ohne nicht). Geprueft wird, dass die Leiste und die
     Lockerung sie auch benutzen. */
  {
    const hart = ctx.PO.KRITERIEN.filter((k) => k.filter).map((k) => k.id).sort();
    const weich = ctx.PO.KRITERIEN.filter((k) => !k.filter).map((k) => k.id).sort();
    pruefe("Kriterien: die weichen kommen aus Bewertungen", weich.join(","),
      "essen,getraenke,lage,preis,ruhe,sauberkeit,service");
    pruefe("Kriterien: die harten filtern den Katalog", hart.join(","),
      "bewertung,familie,kinderclub,meerblick,pool,strandnah,wellness");
    // Jedes weiche Kriterium hat eine Teilnote oder einen Aspekt, sonst
    // koennte es die Reihenfolge gar nicht beeinflussen
    const ohneGrundlage = ctx.PO.KRITERIEN.filter((k) => !k.filter && !k.note && !k.aspekt).map((k) => k.id);
    pruefe("Weiche Kriterien haben eine Grundlage", ohneGrundlage.join(",") || "keins", "keins");

    const leiste = (profil) => ctx.PO.eckdaten(profil);
    const zeilen = leiste({ kriterien: [{ id: "ruhe" }, { id: "pool" }, { id: "sauberkeit" }] });
    const feld = (wert) => (zeilen.find((z) => z.wert === wert) || {}).feld || "fehlt";
    pruefe("Leiste: Ruhe steht als Wichtig", feld("Ruhe"), "Wichtig");
    pruefe("Leiste: Sauberkeit steht als Wichtig", feld("Sauberkeit"), "Wichtig");
    pruefe("Leiste: Pool steht als Muss", feld("Pool"), "Muss");
    // Nichts darf doppelt erscheinen
    const werte = zeilen.map((z) => z.wert);
    pruefe("Leiste: keine Zeile doppelt", werte.length, new Set(werte).size);
    // Strandnaehe und Note haben eigene Zeilen - das Kriterium nicht noch dazu
    const mitStrand = leiste({ kriterien: [{ id: "strandnah" }], maxStrand: 1 });
    pruefe("Leiste: Strandnaehe nicht zweimal",
      mitStrand.filter((z) => z.feld === "Strand" || z.wert === "Strandnähe").length, 1);

    /* Weiche Wuensche filtern nichts - am echten Pfad, nicht simuliert.
       Das ist die Grundlage der ganzen Trennung: Waere sie falsch,
       waeren "Wichtig" und "Muss" in der Leiste eine Luege. */
    const pW = { typ: "hotel", artGenannt: true, monat: 8, erwachsene: 2, kinder: 0, naechte: 7 };
    const nurWeich = { ...pW, kriterien: [{ id: "ruhe" }, { id: "sauberkeit" }, { id: "service" },
      { id: "essen" }, { id: "lage" }, { id: "preis" }, { id: "getraenke" }] };
    pruefe("Weiche Wuensche kuerzen die Liste nicht",
      WK.katalogTreffer(nurWeich, WK.filterAusStand(nurWeich)).length,
      WK.katalogTreffer(pW, WK.filterAusStand(pW)).length);
    // Und jedes harte kuerzt sie
    for (const k of ctx.PO.KRITERIEN.filter((x) => x.filter)) {
      const pH = { ...pW, kriterien: [{ id: k.id }], ...(k.filter.maxStrand != null ? { maxStrand: k.filter.maxStrand } : {}),
        ...(k.filter.mindestbewertung != null ? { mindestbewertung: k.filter.mindestbewertung } : {}) };
      const n = WK.katalogTreffer(pH, WK.filterAusStand(pH)).length;
      const alle = WK.katalogTreffer(pW, WK.filterAusStand(pW)).length;
      pruefe(`Hartes Kriterium kuerzt: ${k.id}`, n < alle ? "kuerzt" : `${n} von ${alle}`, "kuerzt");
    }
    /* Die Aufraeumung in `engpass` ist nachgemessen wirkungslos - weiche
       Kriterien liefern der Probe kein Merkmal. Festgehalten, damit
       niemand sie fuer eine Fehlerbehebung haelt und damit auffaellt,
       wenn sich daran je etwas aendert. */
    {
      const pE = { typ: "hotel", artGenannt: true, monat: 8, erwachsene: 2, kinder: 2, kinderAlter: [5, 8],
        naechte: 7, kriterien: [{ id: "ruhe" }, { id: "sauberkeit" }, { id: "pool" }, { id: "kinderclub" }],
        ausstattung: ["pool", "kidsClub"], mindestbewertung: 4.5, maxStrand: 1 };
      const e = WK.engpass(pE);
      pruefe("Engpass nennt die Ausstattung", (e || {}).label, "die Ausstattungswünsche");
      pruefe("Engpass: Zahl unveraendert von der Aufraeumung", (e || {}).haeuser, 47);
    }
  }

  /* Der Leer-Zustand und sein Selektor (12.11.2026).
     ------------------------------------------------------------------
     Der Pruefstand suchte ".results-empty" (mit s), die Seite baut
     ".result-empty". Elf gemeldete Befunde waren Fehlalarme. Gegen genau
     diesen Fehler: Der Selektor wird jetzt am Quelltext der Seiten
     geprueft, nicht am Gedaechtnis. */
  {
    const ps = fs.readFileSync(B + "agent/pruefstand.js", "utf8");
    const sel = (ps.match(/LEER_ZUSTAND:\s*"([^"]+)"/) || [])[1] || null;
    pruefe("Leer-Zustand: Selektor steht an einer Stelle", sel, ".result-empty");
    const klasse = String(sel || "").replace(/^\./, "");
    for (const datei of ["results.js", "merkzettel.js"]) {
      const q = fs.readFileSync(B + datei, "utf8");
      pruefe(`Leer-Zustand: ${datei} baut ihn`,
        q.includes(`class="${klasse}"`) ? "ja" : "nein", "ja");
    }
    const css = fs.readFileSync(B + "style.css", "utf8");
    pruefe("Leer-Zustand ist gestaltet", css.includes(`.${klasse} {`) ? "ja" : "nein", "ja");
    pruefe("Leer-Zustand: der falsche Selektor ist weg",
      ps.includes(".results-empty") ? "noch da" : "weg", "weg");
  }

  /* Was der Agent bei null Treffern sagt. Vorher stand da die Zahl und
     sonst nichts - bei festem Ziel ohne jede Aufschluesselung. */
  {
    const leer = (p) => WK.lageSatz(WK.katalogTreffer(p, WK.filterAusStand(p)), p, {}, null, {});
    const pZwei = { typ: "hotel", artGenannt: true, monat: 8, erwachsene: 2, kinder: 2, kinderAlter: [5, 8],
      naechte: 7, ausstattung: ["pool", "kidsClub", "seaView"], mindestSterne: 5, maxPreis: 80 };
    pruefe("Leer: Treffer sind wirklich null",
      WK.katalogTreffer(pZwei, WK.filterAusStand(pZwei)).length, 0);
    const sZwei = leer(pZwei);
    pruefe("Leer: nennt die Vorgaben, die es loesen",
      /Preisgrenze/.test(sZwei) && /Ausstattungswünsche/.test(sZwei) ? "ja" : `nein: ${sZwei}`, "ja");
    pruefe("Leer: nennt die Zahl danach", /wären es \d+ Hotels/.test(sZwei) ? "ja" : `nein: ${sZwei}`, "ja");
    pruefe("Leer: entscheidet nicht selbst", /\?$/.test(sZwei.trim()) ? "fragt" : `entscheidet: ${sZwei}`, "fragt");
    pruefe("Leer: sagt, dass einzeln nichts hilft",
      /Einzeln bringt keine Vorgabe/.test(sZwei) ? "ja" : "nein", "ja");

    // Feste Region, in der nichts hilft: Das Ziel wird genannt, aber nicht angefasst
    const pRegion = { typ: "hotel", artGenannt: true, monat: 1, zielId: "lappland", erwachsene: 2, kinder: 3,
      kinderAlter: [2, 5, 8], naechte: 14, ausstattung: ["pool", "kidsClub", "spa", "seaView"],
      mindestbewertung: 4.8, mindestSterne: 5, maxPreis: 60, maxStrand: 0.2 };
    const sRegion = leer(pRegion);
    pruefe("Leer: feste Region wird genannt", /in Lappland/.test(sRegion) ? "ja" : `nein: ${sRegion}`, "ja");
    pruefe("Leer: Region bleibt die Entscheidung der Person",
      /Sollen wir es in einer anderen Gegend versuchen/.test(sRegion) ? "fragt" : `nein: ${sRegion}`, "fragt");

    // Und die Praeposition, die zwei Stellen verschieden falsch hatten
    /* In der Gegenprobe gab es die Funktion noch nicht - dann soll der
       Durchlauf das melden und nicht abstuerzen, sonst bleiben die
       Pruefungen danach ungelaufen. */
    const ort = (id) => (typeof WK.ortSatz === "function" ? WK.ortSatz(id) : "ortSatz fehlt");
    pruefe("Ort: auf Mallorca", ort("mallorca"), "auf Mallorca");
    pruefe("Ort: in Lappland", ort("lappland"), "in Lappland");
    pruefe("Ort: in Wien", ort("wien"), "in Wien");
    pruefe("Ort: an der Ostsee", ort("ostsee"), "an der Ostsee");
    pruefe("Ort: unbekanntes Ziel bleibt leer", ort("gibtsnicht"), null);
    // Jedes Ziel des Katalogs bekommt einen Satz
    const ohneOrt = (typeof ctx.KAT !== "undefined" ? [] : []);
    const alleZiele = vm.runInContext("typeof ZIELE !== 'undefined' ? ZIELE.map(z => z.id) : []", ctx);
    for (const id of alleZiele) if (!ort(id)) ohneOrt.push(id);
    pruefe("Ort: kein Ziel ohne Satz", ohneOrt.join(",") || "keins", "keins");
  }

  console.log(`\n${gut} richtig, ${schlecht} falsch`);
  process.exit(schlecht ? 1 : 0);
})();
