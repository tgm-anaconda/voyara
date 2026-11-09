/* Pruefung der Befunde aus dem Testlauf vom 05.11.2026.
 *
 *   node agent/durchgang-test.cjs         der jetzige Stand, erwartet 0 falsch
 *   node agent/durchgang-test.cjs --alt   Gegenprobe am Stand davor
 *                                         (_backup/2026-11-09-reisende/)
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
const quelle = alt ? B + "_backup/2026-11-09-reisende/" : B;

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
  const flach = quelle + f.replace("agent/", "");
  const pfad = (f.startsWith("agent/") && fs.existsSync(flach)) ? flach : B + f;
  try { vm.runInContext(fs.readFileSync(pfad, "utf8"), ctx, { filename: f }); }
  catch (e) { console.log("LADEFEHLER", f, e.message.slice(0, 160)); process.exit(2); }
}
vm.runInContext("this.WK=typeof Werkzeugkasten!=='undefined'?Werkzeugkasten:null;"
  + "this.KN=typeof Kern!=='undefined'?Kern:null;"
  // Die Kataloge sind `const` im Skript und haengen nicht am Kontext -
  // geholt wird deshalb ueber den Werkzeugkasten, von innen.
  + "this.KAT=Werkzeugkasten.katalog({ typ: 'hotel' });", ctx);
const { WK, KN, KAT } = ctx;
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
pruefe("artZahl 1 Hotel", WK.artZahl?.(1, HOTEL), "1 Hotel");
pruefe("artZahl 2 Ferienwohnungen", WK.artZahl?.(2, WOHNUNG), "2 Ferienwohnungen");
pruefe("artZahl 1 Ferienwohnung", WK.artZahl?.(1, WOHNUNG), "1 Ferienwohnung");
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
const kernStub = () => ({
  lauf: { gefragtVorher: "art", antwortGewertet: false, frageBeantwortet: null,
    nachrichtArt: "antwort", ohneAntwort: {}, klaertNoch: {} },
  notieren() {},
  antwortWerten: KN.antwortWerten,
});
/* Die Gegenprobe laeuft gegen einen Kern, der antwortWerten noch gar
   nicht kennt. Dann soll die Pruefung FEHLSCHLAGEN und nicht abstuerzen -
   ein Absturz misst eine fehlende Funktion, kein falsches Verhalten. */
const werte = (urteil, art = "antwort", vor = {}) => {
  const k = kernStub();
  Object.assign(k.lauf.ohneAntwort, vor);
  k.lauf.frageBeantwortet = urteil;
  k.lauf.nachrichtArt = art;
  if (typeof k.antwortWerten !== "function") return { ohneAntwort: { art: "antwortWerten fehlt" } };
  k.antwortWerten();
  return k.lauf;
};
pruefe("Rueckfrage zaehlt nicht als ausgebliebene Antwort",
  werte("nein_klaert_noch").ohneAntwort.art || 0, 0);
pruefe("Korrektur zaehlt nicht als ausgebliebene Antwort",
  werte("nein_klaert_noch", "einwand").ohneAntwort.art || 0, 0);
pruefe("Echtes Ausweichen zaehlt", werte("nein").ohneAntwort.art, 1);
pruefe("Ohne Auskunft des Modells zaehlt es wie bisher",
  werte(null).ohneAntwort.art, 1);
pruefe("Eine Antwort setzt den Zaehler zurueck",
  werte("ja", "antwort", { art: 1 }).ohneAntwort.art, 0);
// Dreimal klaeren ohne je zu antworten: dann zaehlt es doch, sonst
// liesse sich der Fahrplan mit Rueckfragen beliebig aufhalten
let kDrei = kernStub();
for (let i = 0; i < 3 && typeof kDrei.antwortWerten === "function"; i++) {
  kDrei.lauf.antwortGewertet = false;
  kDrei.lauf.frageBeantwortet = "nein_klaert_noch";
  kDrei.antwortWerten();
}
pruefe("Dreimal klaeren ohne Antwort zaehlt doch", kDrei.lauf.ohneAntwort.art, 1);

/* Die Annahme haengt am neuen Zaehler, nicht mehr an der Zahl der
   Fragen. Derselbe Stand wie im gemeldeten Fall: zweimal nach der Art
   gefragt, beide Male hat die Person geklaert statt geantwortet. */
const artProfil = () => ({ monat: 12, naechte: 5, erwachsene: 2, kinder: 1,
  kinderAlter: [17], zielOffen: true, flug: false, vonPerson: {} });
const pA = artProfil();
try { WK.fahrplan(pA, { gefragtWie: { art: 2 }, ohneAntwort: {}, besprochen: {}, protokoll: [] }); } catch { /* egal */ }
pruefe("Zweimal gefragt, aber geklaert: keine Annahme zur Art",
  !pA.artEgal && !pA.artGenannt, true);
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

  console.log(`\n${gut} richtig, ${schlecht} falsch`);
  process.exit(schlecht ? 1 : 0);
})();
