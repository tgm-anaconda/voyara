/* Pruefung der Befunde aus dem Testlauf vom 05.11.2026.
 *
 *   node agent/durchgang-test.cjs         der jetzige Stand, erwartet 0 falsch
 *   node agent/durchgang-test.cjs --alt   Gegenprobe am Stand davor
 *                                         (_backup/2026-11-15-favorit/)
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
/* Gegenprobe gegen einen frei waehlbaren Stand (17.11.2026).
   ------------------------------------------------------------------
   `--alt` nimmt wie bisher die Sicherung vom 15.11. Die enthaelt aber
   nur die damals geaenderten Dateien - wer eine Pruefung schreibt, die
   werkzeugkasten.js betrifft, probiert damit gegen die AKTUELLE Datei
   und kann gar nicht fehlschlagen. Genau das ist am 15.11. passiert und
   heute noch einmal.

   Deshalb: `--alt=_backup/17-11-ausweg/` prueft gegen den genannten
   Ordner. Wer eine neue Pruefung schreibt, nennt in ihrem Kommentar den
   Ordner, gegen den sie belegt ist. */
const altArg = process.argv.find((x) => x.startsWith("--alt"));
const alt = !!altArg;
const altOrdner = altArg && altArg.includes("=") ? altArg.split("=")[1] : "_backup/2026-11-15-favorit/";
const quelle = alt ? B + altOrdner.replace(/\/?$/, "/") : B;

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
/* Hier stand bis zum 17.11.2026 das Gegenteil: "Beim zweiten Mal greift
   sie doch - sonst liesse sich der Fahrplan aufhalten." Im Durchlauf vom
   17.11. hat sich das als falsch erwiesen. Ben fragte dreimal sachlich
   zum Alter der Kinder nach und bekam danach "Ich rechne vorlaeufig mit
   je acht Jahren".

   Aufhalten laesst sich der Fahrplan dadurch nicht: Der Agent antwortet
   auf jede Frage, die Unterhaltung geht weiter. Die Annahme gibt es fuer
   Schweigen und Ausweichen, nicht fuer Beteiligung. */
const p5b = flugProfil(); p5b.flugAb = null;
const l5b = flugLauf(); l5b.nachrichtArt = "frage"; l5b.frageAufschub = { flugAb: 1 };
try { WK.fahrplan(p5b, l5b); } catch { /* siehe oben */ }
pruefe("Auch die zweite Frage haelt die Annahme zurueck", p5b.flugAb == null, true);
// Und die dritte
const p5c = flugProfil(); p5c.flugAb = null;
const l5c = flugLauf(); l5c.nachrichtArt = "frage"; l5c.frageAufschub = { flugAb: 2 };
try { WK.fahrplan(p5c, l5c); } catch { /* siehe oben */ }
pruefe("Auch die dritte Frage haelt sie zurueck", p5c.flugAb == null, true);
/* Der Kern erkennt die Frage auch, wenn das Modell sie falsch
   einordnet - im Messlauf hat es zwei von drei nicht als "frage"
   gemeldet. */
const p5d = flugProfil(); p5d.flugAb = null;
const l5d = flugLauf(); l5d.nachrichtArt = "sonstiges";
l5d.gespraech = [{ role: "user", content: "und welcher flughafen waere denn guenstiger?" }];
try { WK.fahrplan(p5d, l5d); } catch { /* siehe oben */ }
pruefe("Fragezeichen genuegt, auch ohne Urteil des Modells", p5d.flugAb == null, true);
// Echtes Ausweichen fuehrt weiter zur Annahme
const p5e = flugProfil(); p5e.flugAb = null;
const l5e = flugLauf(); l5e.nachrichtArt = "sonstiges";
l5e.gespraech = [{ role: "user", content: "keine ahnung" }];
try { WK.fahrplan(p5e, l5e); } catch { /* siehe oben */ }
pruefe("Ausweichen fuehrt weiter zur Annahme", typeof p5e.flugAb === "string" && !!p5e.flugAb, true);

/* ====================================================================
   6. Keine Entschuldigung, wenn etwas angekommen ist
   ==================================================================== */
/* Die Stelle in kern.js ist in den Zug eingebettet und von aussen nicht
   aufrufbar. Geprueft wird deshalb die Bedingung selbst - sie ist eine
   Oder-Verknuepfung ueber drei Quellen, und die dritte ist neu. */
/* Wie beim Laden oben: haelt die Sicherung diese Datei nicht, kommt sie
   aus dem Projekt. Sonst scheitert die Gegenprobe an einer fehlenden
   Datei statt an altem Code. */
/* Fragebogen und Vorschlagsansicht dazu (15.11.2026). Beide haengen am
   DOM, aber die Teile, die hier geprueft werden - Bloecke, Mischung,
   Protokollfelder - kommen ohne aus. Fehlt eine Datei in der Sicherung,
   gilt dieselbe Regel wie oben: dann die aus dem Projekt. */
for (const f of ["agent/fragebogen.js"]) {
  const flach = quelle + f.replace(/^agent\//, "");
  const pfadF = (alt && fs.existsSync(flach)) ? flach : B + f;
  try { vm.runInContext(fs.readFileSync(pfadF, "utf8"), ctx, { filename: f }); }
  catch (e) { console.log("LADEFEHLER", f, e.message.slice(0, 160)); }
}
vm.runInContext("this.FB = typeof Fragebogen !== 'undefined' ? Fragebogen : null;"
  + "this.FBLISTE = typeof FRAGEBOGEN !== 'undefined' ? FRAGEBOGEN : null;", ctx);
const { FB, FBLISTE } = ctx;

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
/* Hier stand bis zum 17.11.2026: "Dreimal klaeren ohne Antwort zaehlt
   doch" - die Nachsicht fuer Rueckfragen war auf zwei Runden begrenzt.
   Das war falsch gedacht, und es ist Ben im Durchlauf aufgefallen: Auf
   "In welcher Klasse moechtet ihr fliegen?" kamen zwei Sachfragen, und
   danach nahm der Agent Economy an.

   Die Annahme gibt es fuer Schweigen und Ausweichen, nicht fuer
   Beteiligung. Wer dreimal sachlich nachfragt, ist engagierter als
   jemand, der einmal antwortet. Die Grenze ist weg. */
pruefe("Auch die dritte Rueckfrage zaehlt nicht",
  runde("nein_klaert_noch", {}, { dauer: 2 }).ohne || 0, 0);

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

  /* ==================================================================
     Die Empfehlung und die geloste Reihenfolge (15.11.2026)
     ==================================================================
     Das Losen soll den Positionseffekt aus der Hauptgroesse nehmen.
     Dafuer muss dreierlei stimmen: Es muss wirklich gleich verteilt
     losen, es darf das Partnerhaus nicht austauschen, und der Satz des
     Agenten muss in jeder Zelle derselbe sein. */
  {
    // Ein Kern-Ersatz mit genau dem, was anzeigeReihenfolge anfasst
    /* In der Gegenprobe gab es beides noch nicht. Dann soll der Lauf das
       melden statt abzustuerzen - sonst bleiben alle Pruefungen danach
       ungelaufen, und die Gegenprobe sagt weniger, nicht mehr. */
    const fehlt = (was) => () => `${was} fehlt`;
    const kern = { lauf: {},
      anzeigeReihenfolge: typeof KN.anzeigeReihenfolge === "function" ? KN.anzeigeReihenfolge : () => ["fehlt"],
      favoritenSatz: typeof KN.favoritenSatz === "function" ? KN.favoritenSatz : fehlt("favoritenSatz") };
    const kand = [{ id: "a" }, { id: "b" }, { id: "c" }];

    // 1. Gleichverteilung ueber viele Ziehungen
    const zaehl = { a: [0, 0, 0], b: [0, 0, 0], c: [0, 0, 0] };
    const N = 6000;
    for (let i = 0; i < N; i++) {
      kern.lauf = {};
      const r = kern.anzeigeReihenfolge(kand);
      r.forEach((id, pos) => { if (zaehl[id]) zaehl[id][pos]++; });
    }
    const erwartet = N / 3;
    const schlimmste = Math.max(...Object.values(zaehl).flat().map((n) => Math.abs(n - erwartet) / erwartet));
    pruefe("Losen: jede Position etwa gleich haeufig",
      schlimmste < 0.08 ? "gleichverteilt" : `${Math.round(schlimmste * 100)} % daneben: ${JSON.stringify(zaehl)}`,
      "gleichverteilt");
    // Und jede der sechs Anordnungen kommt vor - ein Verfahren, das nur
    // rotiert, waere auch "gleichverteilt" je Position, aber falsch
    const formen = new Set();
    for (let i = 0; i < 400; i++) { kern.lauf = {}; formen.add(kern.anzeigeReihenfolge(kand).join("")); }
    pruefe("Losen: alle sechs Anordnungen kommen vor", formen.size, 6);

    // 2. Einmal je Vorlage, nicht bei jedem Zeichnen
    kern.lauf = {};
    const erst = kern.anzeigeReihenfolge(kand).join("");
    let stabil = true;
    for (let i = 0; i < 50; i++) if (kern.anzeigeReihenfolge(kand).join("") !== erst) stabil = false;
    pruefe("Losen: dieselbe Vorlage behaelt ihre Anordnung", stabil ? "stabil" : "springt", "stabil");
    // Andere Haeuser, neues Los
    const andere = kern.anzeigeReihenfolge([{ id: "a" }, { id: "b" }, { id: "d" }]);
    pruefe("Losen: andere Vorlage wird neu gelost",
      (andere || []).includes("d") && !(andere || []).includes("c") ? "neu" : "alt", "neu");

    // 3. Der Favoritensatz - zeichengleich, egal welche Bedingung
    const satz = kern.favoritenSatz("Casa Lumara", 3);
    pruefe("Favoritensatz nennt den Namen", /Casa Lumara/.test(satz) ? "ja" : satz, "ja");
    pruefe("Favoritensatz: Wortlaut",
      satz, "Mein Favorit ist Casa Lumara. Die beiden anderen sind nah dran, deshalb zeige ich sie dir mit.");
    /* Er darf kein Wort ueber Provision, Partner oder Kennzeichnung
       enthalten - sonst stuende neben der Kennzeichnung ein zweiter
       Unterschied zwischen den Gruppen. */
    pruefe("Favoritensatz schweigt zur Kennzeichnung",
      /provision|partner|kennzeich|etikett|bezahlt|werbung/i.test(satz) ? "nennt sie" : "schweigt", "schweigt");
    pruefe("Favoritensatz bei zwei Haeusern",
      kern.favoritenSatz("X", 2), "Mein Favorit ist X. Das andere ist nah dran, deshalb zeige ich es dir mit.");
    pruefe("Favoritensatz ohne Namen faellt weg", kern.favoritenSatz(null, 3), null);

    /* 4. Der Satz faellt genau einmal je Vorlage. Geprueft am Quelltext,
       weil die Stelle am DOM haengt: Die Marke muss gesetzt und gegen
       dieselbe Vorlage geprueft werden. */
    pruefe("Favoritensatz nur einmal je Vorlage",
      /favoritGenanntFuer/.test(quelltext) && /favNeu/.test(quelltext) ? "einmal" : "bei jedem Oeffnen", "einmal");

    /* 5. Gelost wird nur ueber die erste Reihe (15.11.2026).
       Drei Karten passen ins Bild, ab der vierten scrollt das Fenster.
       Der Favorit darf nie unterhalb der Kante landen. */
    {
      const sechs = ["a","b","c","d","e","f"].map((id) => ({ id }));
      const plaetze = {};
      let hintenVerschoben = 0;
      for (let i = 0; i < 2000; i++) {
        kern.lauf = {};
        const r = kern.anzeigeReihenfolge(sechs);
        plaetze[r.indexOf("a")] = (plaetze[r.indexOf("a")] || 0) + 1;
        // Die Haeuser ab Platz vier behalten ihre Reihenfolge nach Guete
        if (r.slice(3).join("") !== "def") hintenVerschoben++;
      }
      const erste = (plaetze[0] || 0) + (plaetze[1] || 0) + (plaetze[2] || 0);
      pruefe("Sechs Karten: Favorit immer in der ersten Reihe", erste, 2000);
      pruefe("Sechs Karten: zweite Reihe bleibt nach Guete", hintenVerschoben, 0);
      const ab = [0, 1, 2].map((i) => Math.abs((plaetze[i] || 0) - 2000 / 3) / (2000 / 3));
      pruefe("Sechs Karten: erste Reihe gleichverteilt",
        Math.max(...ab) < 0.1 ? "gleich" : `${Math.round(Math.max(...ab) * 100)} % daneben: ${JSON.stringify(plaetze)}`, "gleich");
      // Bei drei Karten aendert sich nichts
      kern.lauf = {};
      const drei = kern.anzeigeReihenfolge([{ id: "a" }, { id: "b" }, { id: "c" }]);
      pruefe("Drei Karten: weiterhin alle drei im Los", drei.length, 3);
    }

    // 6. Die feste 1 im Log ist weg
    pruefe("Keine feste Eins mehr im Vorschlagslog",
      /Vorschlag 1 \(mein Vorschlag\)/.test(quelltext) ? "noch da" : "weg", "weg");
  }

  /* ==================================================================
     Die drei Mechanismus-Bloecke im Fragebogen (15.11.2026)
     ================================================================== */
  if (FB && FBLISTE) {
    const alleFragen = FBLISTE.flatMap((b) => b.fragen);
    const ids = alleFragen.map((f) => f.id);
    for (const id of ["p_absicht", "p_eigeninteresse", "p_nachvollzug",
      "p_nichts_verschwiegen", "p_angaben_verlass",
      "p_unbehagen", "p_misstrauen", "p_leicht_uebergehen",
      "m_etikett", "m_optik"]) {
      pruefe(`Fragebogen hat ${id}`, ids.includes(id) ? "ja" : "fehlt", "ja");
    }
    pruefe("Keine Kennung doppelt", ids.length, new Set(ids).size);
    /* Kein Item nennt die Provision - sonst liesse es sich in der Gruppe
       ohne Kennzeichnung nicht stellen, und beide Gruppen brauchen
       dieselben Items. */
    const neue = alleFragen.filter((f) => /^p_(absicht|eigeninteresse|nachvollzug|nichts_verschwiegen|angaben_verlass|unbehagen|misstrauen|leicht_uebergehen)$/.test(f.id));
    pruefe("Die neuen Bloecke zaehlen acht Items", neue.length, 8);
    const verraeter = neue.filter((f) => /provision|partner|bezahlt|werbung|kennzeich/i.test(f.text));
    pruefe("Kein neues Item nennt die Provision", verraeter.map((f) => f.id).join(",") || "keins", "keins");
    // Alle siebenstufig und zustimmungsbasiert
    const falscheSkala = neue.filter((f) => f.skala?.stufen !== 7);
    pruefe("Alle neuen Items siebenstufig", falscheSkala.map((f) => f.id).join(",") || "alle", "alle");
    // Je Block genau ein umgekehrt gepoltes Item dort, wo es hingehoert
    pruefe("p_nachvollzug ist umgekehrt gepolt",
      !!alleFragen.find((f) => f.id === "p_nachvollzug")?.umgekehrt, true);
    pruefe("p_leicht_uebergehen ist umgekehrt gepolt",
      !!alleFragen.find((f) => f.id === "p_leicht_uebergehen")?.umgekehrt, true);
    /* Der Satz "Der Assistent geht ehrlich mit mir um" steht schon als
       v_ehrlich im TiA-Block. Dieselbe Aussage zweimal im Bogen waere
       ein Fehler, der sich in der Reliabilitaet versteckt. */
    const texte = alleFragen.map((f) => f.text.toLowerCase().replace(/[^a-zäöüß ]/g, "").trim());
    const doppelte = texte.filter((t, i) => texte.indexOf(t) !== i);
    pruefe("Keine Aussage steht zweimal im Bogen", doppelte.join(" | ") || "keine", "keine");
    // Die Manipulationskontrolle braucht "Weiss nicht"
    const mk = alleFragen.find((f) => f.id === "m_etikett");
    pruefe("Manipulationskontrolle mit Weiss nicht",
      (mk?.optionen || []).join(","), "Ja,Nein,Weiß nicht");
    // Die Optikfrage rechnet ihre Optionen erst zur Laufzeit
    const ok = alleFragen.find((f) => f.id === "m_optik");
    pruefe("Optikfrage holt ihre Namen zur Laufzeit", typeof ok?.optionen, "function");
    pruefe("Optionen einer Funktion werden aufgeloest",
      typeof FB.optionenVon === "function"
        && Array.isArray(FB.optionenVon({ optionen: () => ["A", "B"] })) ? "ja" : "nein", "ja");

    // Mischen: Fisher-Yates, alle Anordnungen, und stabil je Person
    const drei = [{ id: "x" }, { id: "y" }, { id: "z" }];
    const lager = {};
    ctx.sessionStorage.getItem = (k) => (k in lager ? lager[k] : null);
    ctx.sessionStorage.setItem = (k, v) => { lager[k] = v; };
    const mische = (t, l) => (typeof FB.gemischt === "function" ? FB.gemischt(t, l) : l);
    const formen2 = new Set();
    for (let i = 0; i < 400; i++) { delete lager["voyara_fb_mischung_T"]; formen2.add(mische("T", drei).map((f) => f.id).join("")); }
    pruefe("Mischen: alle sechs Anordnungen kommen vor", formen2.size, 6);
    delete lager["voyara_fb_mischung_T"];
    const einmal = mische("T", drei).map((f) => f.id).join("");
    let gleich = true;
    for (let i = 0; i < 20; i++) if (mische("T", drei).map((f) => f.id).join("") !== einmal) gleich = false;
    pruefe("Mischen: bleibt fuer dieselbe Person stehen", gleich ? "stabil" : "springt", "stabil");
    pruefe("Mischen: keine Frage geht verloren", mische("T", drei).length, 3);
  } else {
    pruefe("Fragebogen geladen", "nein", "ja");
  }

  /* Die Markierung des Favoriten auf der Karte (15.11.2026) */
  {
    /* Aus der Sicherung lesen, wenn sie die Datei haelt - sonst prueft
       die Gegenprobe den neuen Quelltext und besteht immer. Dieselbe
       Regel wie beim Laden oben; am 15.11. erst vergessen und an einer
       Gegenprobe aufgefallen, die nur fuenf statt zehn Fehler meldete. */
    const quelle2 = (datei, flach) => {
      const ausSicherung = quelle + flach;
      return fs.readFileSync(alt && fs.existsSync(ausSicherung) ? ausSicherung : B + datei, "utf8");
    };
    const vq = quelle2("agent/vorschlaege.js", "vorschlaege.js");
    const cq = quelle2("style.css", "style.css");
    pruefe("Karte kennt den Favoriten", /istFavorit/.test(vq) ? "ja" : "nein", "ja");
    pruefe("Band liegt im Bild, nicht darueber",
      /\.vorschlag-favorit\s*\{[^}]*position:\s*absolute/.test(cq) ? "im Bild" : "darueber", "im Bild");
    /* Gruen, nicht gold: Das Amber gehoert der Kennzeichnung. Ein
       goldener Favoritenrahmen waere in der Gruppe ohne Etikett als
       Partnerhaus-Zeichen lesbar und wuerde die Manipulationskontrolle
       zerstoeren. */
    const regel = (cq.match(/\.vorschlag-favorit\s*\{[^}]*\}/) || [""])[0]
      + (cq.match(/\.vorschlag-karte\.ist-favorit\s*\{[^}]*\}/) || [""])[0];
    pruefe("Favoritenfarbe ist nicht das Amber der Kennzeichnung",
      /e0a94e|c98a2e|7a4b00/i.test(regel) ? "Amber" : "andere Farbe", "andere Farbe");
    pruefe("Favoritenfarbe kommt aus der Markenfarbe",
      /--brand-/.test(regel) ? "ja" : "nein", "ja");
    // Die Platzziffer darf nicht hinter dem Band verschwinden
    pruefe("Platzziffer weicht dem Band aus",
      /\.vorschlag-platz\.unter-band/.test(cq) ? "ja" : "nein", "ja");
  }

  /* Das Partnerhaus ist immer das beste (15.11.2026) */
  {
    const sqA = quelle + "studie.js";
    const sq = fs.readFileSync(alt && fs.existsSync(sqA) ? sqA : B + "agent/studie.js", "utf8");
    pruefe("Beste/zweitbeste wird nicht mehr gelost",
      /partnerBesteIn = reihenfolge\[Math\.random/.test(sq) ? "wird gelost" : "fest", "fest");
    pruefe("Standard ist das beste Haus",
      /else partnerBesteIn = "beide";/.test(sq) ? "beide" : "etwas anderes", "beide");
  }

  /* Die Manipulationskontrolle zielt auf das Mitverdienen, nicht auf
     jede Markierung - sonst koennte seit dem gruenen Band jeder
     wahrheitsgemaess "ja" ankreuzen. */
  if (FB && FBLISTE) {
    const mk = FBLISTE.flatMap((b) => b.fragen).find((f) => f.id === "m_etikett");
    pruefe("Manipulationskontrolle nennt das Mitverdienen",
      /mitverdient|provision|verdient/i.test(mk?.text || "") ? "ja" : `nein: ${mk?.text}`, "ja");
    pruefe("Manipulationskontrolle fragt nicht nach jeder Markierung",
      /gekennzeichnet/i.test(mk?.text || "") ? "zu weit" : "eng genug", "eng genug");
  }

  /* Relative Zeitangaben, alle drei Einheiten (17.11.2026)
     ------------------------------------------------------------------
     Aus einem echten Durchlauf: "Gerne in ungefaehr 70 Tagen" - der
     Agent antwortete "70 Tage sind ja bald" und fragte danach noch
     einmal nach dem Monat. Wochen und Monate konnte der Kern rechnen,
     Tage nie. Fuer die Person sah das aus, als hoere er nicht zu.

     Fester Stichtag, sonst prueft der Test den Kalender des Tages, an
     dem er laeuft.

     ACHTUNG, zur Gegenprobe: `--alt` belegt diese Pruefungen NICHT.
     Die Sicherung `2026-11-15-favorit/` enthaelt kein
     werkzeugkasten.js, also laedt der Test dort die aktuelle Datei -
     mitsamt der Reparatur. Genau die Falle vom 15.11.2026.

     Belegt ist es von Hand gegen `_backup/16-11-vertrauensmasse/
     werkzeugkasten.js` (der Stand von heute frueh, vor der Reparatur):
     Dort geben "in 70 tagen", "in 14 tagen" und "in 100 tagen" null,
     waehrend Wochen und Monate schon stimmten. Wer diese Pruefungen
     kuenftig ernsthaft gegenproben will, muss werkzeugkasten.js in die
     Sicherung legen, gegen die er laeuft. */
  if (WK) {
    const heute = new Date(2026, 10, 17);           // 17.11.2026
    const faelle = [
      ["gerne in ungefähr 70 tagen", 1],            // 26.01.2027
      ["in 14 tagen", 12],                          // 01.12.2026
      ["in 100 tagen", 2],                          // 25.02.2027
      ["in drei wochen", 12],
      ["in zwei monaten", 1],
      ["nächsten monat", 12],
    ];
    for (const [text, soll] of faelle) {
      pruefe(`Relative Angabe: "${text}"`, WK.relativerMonat(text, heute), soll);
    }
    /* Die Einheit entscheidet ueber den Anreisetag: Wer in Tagen
       rechnet, meint einen Tag und wird danach gefragt; wer in Monaten
       spricht, hat keinen Kalender vor sich. */
    pruefe("Einheit wird mitgegeben (Tage)",
      WK.relativeAngabe?.("in 70 tagen", heute)?.einheit || "Funktion fehlt", "tage");
    pruefe("Einheit wird mitgegeben (Monate)",
      WK.relativeAngabe?.("in zwei monaten", heute)?.einheit || "Funktion fehlt", "monate");
    // Unsinn bleibt Unsinn
    pruefe("Keine Zahl, kein Monat", WK.relativerMonat("irgendwann mal", heute), null);
    pruefe("Zu weit weg wird verworfen", WK.relativerMonat("in 900 tagen", heute), null);

    /* Feiertage und Ferien (17.11.2026)
       ----------------------------------------------------------------
       Bens Frage: "Was ist, wenn jemand sagt, ich wuerde gerne an
       Ostern verreisen?" Vorher rechnete der Kern das nicht - er liess
       nur zu, dass das Modell den Monat setzt, ungeprueft. Ostern
       wandert aber: 2027 der 28. Maerz, 2028 der 16. April.

       Erst die Rechnung selbst gegen nachgeschlagene Daten, dann die
       Zuordnung der Formulierungen. */
    const datum = (x) => `${String(x.getDate()).padStart(2, "0")}.${String(x.getMonth() + 1).padStart(2, "0")}.${x.getFullYear()}`;
    for (const [jahr, soll] of [[2026, "05.04.2026"], [2027, "28.03.2027"],
      [2028, "16.04.2028"], [2029, "01.04.2029"], [2030, "21.04.2030"]]) {
      pruefe(`Ostersonntag ${jahr}`, WK.ostersonntag ? datum(WK.ostersonntag(jahr)) : "Funktion fehlt", soll);
    }
    pruefe("1. Advent 2027", WK.ersterAdvent ? datum(WK.ersterAdvent(2027)) : "Funktion fehlt", "28.11.2027");
    pruefe("1. Advent 2028", WK.ersterAdvent ? datum(WK.ersterAdvent(2028)) : "Funktion fehlt", "03.12.2028");

    /* Stichtag 17.11.2026, also faellt alles Fruehjahrs-Bewegliche auf
       Ostern 2027 (28.03.). Geprueft wird der Monat UND ob der Kern
       sich festlegt oder nachfragt - bei Laendersache darf er nicht
       raten. */
    const anker = (t) => { if (!WK.zeitanker) return "Funktion fehlt"; const a = WK.zeitanker(t, heute); return a ? (a.sicher ? String(a.monat) : a.monate.join("/")) : "nichts"; };
    const faelleAnker = [
      ["ich würde gerne an ostern verreisen", "3"],
      ["über ostern", "3"], ["karfreitag", "3"], ["karwoche", "3"],
      ["über karneval", "2"], ["zu fasching", "2"], ["rosenmontag", "2"], ["altweiber", "2"],
      ["an pfingsten", "5"], ["über himmelfahrt", "5"], ["vatertag", "5"], ["fronleichnam", "5"],
      ["über weihnachten", "12"], ["heiligabend", "12"], ["über die feiertage", "12"],
      ["silvester", "12"], ["zwischen den jahren", "12"], ["guten rutsch", "12"],
      ["am 1. advent", "11"], ["in der adventszeit", "12"], ["nikolaus", "12"],
      ["zum oktoberfest", "9"], ["auf die wiesn", "9"],
      ["halloween", "10"], ["allerheiligen", "11"], ["valentinstag", "2"],
      ["zum muttertag", "5"], ["am 1. mai", "5"], ["tag der deutschen einheit", "10"],
      ["herbstferien", "10"], ["weihnachtsferien", "12"], ["in den faschingsferien", "2"],
      ["pfingstferien", "5"],
      // Laendersache: hier MUSS nachgefragt werden
      ["in den osterferien", "3/4"], ["in den sommerferien", "7/8"],
      ["die großen ferien", "7/8"], ["winterferien", "1/2"], ["skiferien", "1/2"],
      // Nichts dergleichen
      ["ans meer", "nichts"], ["mit dem hund", "nichts"],
    ];
    for (const [t, soll] of faelleAnker) pruefe(`Zeitanker: "${t}"`, anker(t), soll);

    // Nahe Angaben ohne Zahl
    pruefe("morgen", WK.relativerMonat("morgen", heute), 11);
    pruefe("übermorgen", WK.relativerMonat("übermorgen", heute), 11);
    pruefe("nächste woche", WK.relativerMonat("nächste woche", heute), 11);
    pruefe("übernächste woche", WK.relativerMonat("übernächste woche", heute), 12);
    pruefe("nahe Angabe zaehlt als Tage",
      WK.relativeAngabe?.("nächste woche", heute)?.einheit || "Funktion fehlt", "tage");
  }

  /* Der Ausweg fuer das Modell, und der Waechter dahinter (17.11.2026)
     ------------------------------------------------------------------
     Gemessen an 100 Formulierungen: An mehreren Stellen prueft der Kern
     den Wert des Modells gegen eine Wortliste und loescht ihn, wenn kein
     Wort passt. Beim Kinderalter kam dadurch KEINE von sechs normalen
     Antworten an, auch "zwei und vier" nicht.

     Seit dem 09.11. gibt es dagegen das Richtige: Das Modell steht mit
     `frage_beantwortet` dafuer ein, dass die Person genau diese Frage
     beantwortet hat. Das galt nur fuer vier Themen; jetzt fuer alle, bei
     denen es um Bedeutung geht. Der Kern ueberstimmt das Modell weiter
     dort, wo er etwas weiss, das es nicht wissen kann - Datum, Rechnen,
     Katalog.

     Geprueft wird funktional, nicht als Textsuche: stand_merken wird
     wirklich aufgerufen. */
  if (WK && WK.werkzeuge && WK.werkzeuge.stand_merken) {
    const kernStub = (satz, gefragtVorher) => ({
      lauf: { gespraech: [{ role: "user", content: satz }], profil: {}, protokoll: [],
        annahmeOffen: [], gefragtWie: {}, verlauf: [{ rolle: "user", text: satz }],
        gefragtVorher, nachrichtArt: "antwort", runde: 1 },
      notieren(e, d) { this.lauf.protokoll.push({ ereignis: e, ...d }); },
      freigabe: () => "suchen", darf: () => false, logZeile() {}, sagen() {},
      standAnzeigen() {}, sichern() {}, standKurz: () => "",
    });
    const kommtAn = async (satz, aufnahme, feld, gefragtVorher, ja) => {
      const kern = kernStub(satz, gefragtVorher);
      const a = { nachricht_art: "antwort",
        frage_beantwortet: ja ? "ja" : "keine_frage_offen", ...aufnahme };
      try { await WK.werkzeuge.stand_merken.call(WK, a, kern); } catch (e) { return "FEHLER " + e.message.slice(0, 40); }
      const w = kern.lauf.profil[feld];
      return (w != null && !(Array.isArray(w) && !w.length)) ? "kommt an" : "verworfen";
    };
    // Kinderalter: ohne Ausweg verworfen, mit Ausweg da
    pruefe("Alter 'zwei und vier' kommt an",
      await kommtAn("zwei und vier", { kinderAlter: [2, 4] }, "kinderAlter", "kinderAlter", true), "kommt an");
    /* Korrigiert am 17.11.2026 nach Bens Durchlauf. Hier stand zuerst
       das Gegenteil: "beide sind noch klein" sollte ankommen. Das war
       falsch, und der Fehler fiel in einem echten Lauf auf - auf "meine
       zwei kleinen" stand im Kasten "2 Kinder (3, 5 J.)", obwohl
       niemand ein Alter genannt hatte.

       "Klein" ist kein Alter. Dass daraus drei und fuenf wird, ist
       geraten, und genau dagegen gibt es diese Sperre. Die ANZAHL der
       Kinder kommt weiterhin an - das ist Bedeutung. */
    pruefe("Alter aus 'beide sind noch klein' wird NICHT gesetzt",
      await kommtAn("beide sind noch klein", { kinderAlter: [3, 5] }, "kinderAlter", "reisende", true), "verworfen");
    pruefe("Alter aus 'meine zwei kleinen' wird NICHT gesetzt",
      await kommtAn("ich meine frau und meine zwei kleinen",
        { erwachsene: 2, kinder: 2, kinderAlter: [3, 5] }, "kinderAlter", "reisende", true), "verworfen");
    pruefe("Die Zahl der Kinder kommt trotzdem an",
      await kommtAn("ich meine frau und meine zwei kleinen",
        { erwachsene: 2, kinder: 2 }, "kinder", "reisende", true), "kommt an");
    pruefe("Ein echtes Altersmerkmal kommt an",
      await kommtAn("eins ist noch ein baby", { kinderAlter: [1] }, "kinderAlter", "reisende", true), "kommt an");
    pruefe("Alter ohne Einstehen des Modells bleibt streng",
      await kommtAn("hallo", { kinderAlter: [3, 5] }, "kinderAlter", null, false), "verworfen");
    // Ausstattung: Wortluecken
    pruefe("Wunsch 'mit sauna' kommt an",
      await kommtAn("mit sauna", { ausstattung: ["spa"] }, "ausstattung", "wuensche", true), "kommt an");
    pruefe("Wunsch 'strandnah bitte' kommt an",
      await kommtAn("strandnah bitte", { ausstattung: ["beachfront"] }, "ausstattung", "wuensche", true), "kommt an");
    pruefe("Wunsch ohne Einstehen bleibt streng",
      await kommtAn("hallo", { ausstattung: ["pool"] }, "ausstattung", null, false), "verworfen");
    // Reisende: der Fall vom 09.11., muss weiter gehen
    pruefe("'ich und meine mutter' kommt an",
      await kommtAn("ich und meine mutter", { erwachsene: 2, kinder: 0 }, "erwachsene", "reisende", true), "kommt an");
    /* Der Monat ist strenger: "hauptsache warm" -> Oktober war der
       teuerste gemessene Fehlgriff, deshalb zaehlt hier nur ein klares
       Ja, und ein halbes reicht nicht. */
    const monatMit = async (fb) => {
      const kern = kernStub("hauptsache warm", "zeit");
      await WK.werkzeuge.stand_merken.call(WK, { nachricht_art: "antwort", frage_beantwortet: fb, monat: 10 }, kern);
      return kern.lauf.profil.monat == null ? "verworfen" : "kommt an";
    };
    pruefe("Monat bei klarem Ja", await monatMit("ja"), "kommt an");
    pruefe("Monat bei halbem Ja bleibt streng", await monatMit("teilweise"), "verworfen");
    pruefe("Monat ohne Antwort bleibt streng", await monatMit("keine_frage_offen"), "verworfen");
  }

  /* Der Waechter (Stufe 2): verworfener Wert wird zur Frage, aber erst
     ab dem zweiten Anlauf - beim ersten waere es kuenstlich, und ein
     verworfener Wert kann erfunden sein. */
  if (WK && WK.verstaendnisRueckfrage) {
    const frag = (verworfen, gefragtWie, profil = {}, schon = {}) =>
      WK.verstaendnisRueckfrage({ kinder: 2, ...profil },
        { verworfenWert: verworfen, gefragtWie, rueckversichert: schon, unsicher: [] });
    pruefe("Waechter schweigt beim ersten Anlauf",
      frag({ monat: 10 }, {}) ? "fragt" : "still", "still");
    pruefe("Waechter fragt beim zweiten Anlauf",
      frag({ monat: 10 }, { zeit: 1 })?.satz || "still", "Meinst du Oktober?");
    pruefe("Waechter schweigt, wenn der Wert schon steht",
      frag({ monat: 10 }, { zeit: 1 }, { monat: 7 }) ? "fragt" : "still", "still");
    pruefe("Waechter schweigt ueber der Obergrenze",
      frag({ monat: 10 }, { zeit: 1 }, {}, { a: 1, b: 1 }) ? "fragt" : "still", "still");
    pruefe("Waechter kennt den Anreisetag",
      frag({ anreise: "2027-01-04" }, { anreise: 1 })?.satz || "still", "Soll es der 4. Januar sein?");
    // Der alte Weg darf dabei nicht kaputtgehen
    pruefe("Gemeldete Unsicherheit hat weiter Vorrang",
      WK.verstaendnisRueckfrage({ erwachsene: 2, kinder: 1 },
        { unsicher: ["erwachsene"], verworfenWert: { monat: 10 },
          gefragtWie: { zeit: 1 }, rueckversichert: {} })?.feld || "keine", "erwachsene");
  }

  /* Das Ziel: Ausweg mit strenger Regel plus Ansage (17.11.2026)
     ------------------------------------------------------------------
     `regionGenannt` prueft Name, Kennung und Flughafencode. "Nach
     Mallorca" kam damit an, "nach Malle", "auf die Balearen" und "nach
     Griechenland" nicht - das Feld fuer das Land ist bei allen 18
     Regionen leer.

     Hier geht es aber um mehr als Verstehen: Wer das Reiseziel waehlt,
     ist die zentrale Entscheidung dieser Erhebung. Deshalb nur mit
     klarem Ja, und was der Kern nicht selbst erkennen konnte, sagt der
     Agent an - sonst merkt niemand, dass jemand fuer ihn entschieden
     hat. Gegenprobe: _backup/16-11-vertrauensmasse/ */
  if (WK && WK.werkzeuge && WK.werkzeuge.stand_merken) {
    const zielLauf = async (satz, ziel, fb) => {
      const kern = { lauf: { gespraech: [{ role: "user", content: satz }], profil: {}, protokoll: [],
          annahmeOffen: [], gefragtWie: {}, verlauf: [{ rolle: "user", text: satz }],
          gefragtVorher: "ziel", nachrichtArt: "antwort", runde: 1 },
        notieren(e, d) { this.lauf.protokoll.push({ ereignis: e, ...d }); },
        freigabe: () => "suchen", darf: () => false, logZeile() {}, sagen() {},
        standAnzeigen() {}, sichern() {}, standKurz: () => "" };
      await WK.werkzeuge.stand_merken.call(WK,
        { nachricht_art: "antwort", frage_beantwortet: fb, ziel }, kern);
      const satzAn = (WK.annahmeSaetze ? WK.annahmeSaetze(kern.lauf, kern.lauf.profil) : [])
        .find((x) => /schaue dann/.test(x));
      return { ziel: kern.lauf.profil.zielId || null, angesagt: !!satzAn };
    };
    pruefe("'nach malle' kommt an", (await zielLauf("nach malle", "mallorca", "ja")).ziel, "mallorca");
    pruefe("'auf die balearen' kommt an", (await zielLauf("auf die balearen", "mallorca", "ja")).ziel, "mallorca");
    pruefe("'nach griechenland' kommt an", (await zielLauf("nach griechenland", "kreta", "ja")).ziel, "kreta");
    pruefe("Ziel bei halbem Ja bleibt streng", (await zielLauf("ans mittelmeer", "mallorca", "teilweise")).ziel, null);
    pruefe("Ziel ohne Antwort bleibt streng", (await zielLauf("ans mittelmeer", "mallorca", "keine_frage_offen")).ziel, null);
    // Die Ansage: nur, wenn der Kern den Namen NICHT selbst erkennen konnte
    pruefe("Erschlossenes Ziel wird angesagt", (await zielLauf("nach malle", "mallorca", "ja")).angesagt, true);
    pruefe("Erkanntes Ziel wird nicht wiederholt", (await zielLauf("nach mallorca", "mallorca", "ja")).angesagt, false);
  }

  /* Nebenbei Gesagtes (17.11.2026, aus dem Live-Testlauf)
     ------------------------------------------------------------------
     Der Lauf auf der echten Seite: Der Agent fragte "Hotel oder
     Ferienwohnung?", die Person antwortete "hotel. wir wollen nach
     malle". Das Ziel wurde verworfen und danach noch einmal gefragt.

     Die Ursache lag in MEINER Reparatur von einer Stunde davor: Der
     Ausweg haengt an `gefragtVorher`, und gefragt war die Art. Die
     sieben Zielpruefungen, die ich dazu geschrieben hatte, waren alle
     gruen - weil ich in jeder einzelnen die Zielfrage als gestellt
     gesetzt hatte. Ein Pfad geprueft, der danebenliegende nicht.

     Deshalb hier ausdruecklich der andere Pfad: `gefragtVorher` ist ein
     ANDERES Thema, und die Angabe kommt ueber `selbst_genannt`. */
  if (WK && WK.werkzeuge && WK.werkzeuge.stand_merken) {
    const nebenbei = async (satz, aufnahme, feld, gefragtVorher, fb = "ja") => {
      const kern = { lauf: { gespraech: [{ role: "user", content: satz }], profil: {}, protokoll: [],
          annahmeOffen: [], gefragtWie: {}, verlauf: [{ rolle: "user", text: satz }],
          gefragtVorher, nachrichtArt: "antwort", runde: 1 },
        notieren(e, d) { this.lauf.protokoll.push({ ereignis: e, ...d }); },
        freigabe: () => "suchen", darf: () => false, logZeile() {}, sagen() {},
        standAnzeigen() {}, sichern() {}, standKurz: () => "" };
      await WK.werkzeuge.stand_merken.call(WK, { nachricht_art: "antwort",
        frage_beantwortet: fb, ...aufnahme }, kern);
      const w = kern.lauf.profil[feld];
      return (w != null && !(Array.isArray(w) && !w.length)) ? "kommt an" : "verworfen";
    };
    // Genau der Satz aus dem Testlauf, mit "art" als gestellter Frage
    pruefe("'hotel. wir wollen nach malle' - Ziel kommt an",
      await nebenbei("hotel. wir wollen nach malle",
        { typ: "hotel", ziel: "mallorca", selbst_genannt: ["art", "ziel"] }, "zielId", "art"), "kommt an");
    pruefe("Ohne selbst_genannt bleibt es verworfen",
      await nebenbei("hotel. wir wollen nach malle",
        { typ: "hotel", ziel: "mallorca" }, "zielId", "art"), "verworfen");
    pruefe("Nebenbei genanntes Alter kommt an",
      await nebenbei("ja zwei, die sind zwei und vier",
        { kinder: 2, kinderAlter: [2, 4], selbst_genannt: ["reisende", "kinderAlter"] },
        "kinderAlter", "reisende"), "kommt an");
    pruefe("Nebenbei genannter Monat kommt an",
      await nebenbei("zu zweit, im juli",
        { erwachsene: 2, monat: 7, selbst_genannt: ["reisende", "zeit"] }, "monat", "reisende"), "kommt an");
    pruefe("Nebenbei genannter Wunsch kommt an",
      await nebenbei("nur unterkunft, hauptsache mit sauna",
        { flug: false, ausstattung: ["spa"], selbst_genannt: ["flug", "wuensche"] },
        "ausstattung", "flug"), "kommt an");
    // Die Sperre bleibt: ein Thema, das NICHT in selbst_genannt steht
    pruefe("Fremdes Thema bleibt gesperrt",
      await nebenbei("hotel bitte",
        { typ: "hotel", ziel: "mallorca", selbst_genannt: ["art"] }, "zielId", "art"), "verworfen");
    /* "richtung" darf die Zielsperre NICHT aufschliessen. Im Messlauf
       meldete das Modell auf "hauptsache warm" genau das - richtig, aber
       es ist kein Ziel. Wuerde es hier zaehlen, waere der Fehlgriff
       "hauptsache warm" -> Oktober/Mallorca wieder moeglich. */
    pruefe("'richtung' schliesst das Ziel nicht auf",
      await nebenbei("hauptsache warm",
        { richtung: "warm", ziel: "mallorca", selbst_genannt: ["richtung"] }, "zielId", "zeit"), "verworfen");
    /* Mit dem Wortlaut und der Meldung aus dem echten Messlauf: Auf
       "hauptsache warm" meldete gpt-4.1-mini `frage_beantwortet:
       "teilweise"` und `selbst_genannt: ["richtung"]`. Ein erster
       Anlauf dieser Pruefung setzte stur "ja" und schlug deshalb fehl -
       die Pruefung war falsch gebaut, nicht der Code. Mit "ja" waere
       es auch richtig: Dann behauptet das Modell, die Monatsfrage sei
       beantwortet, und dafuer steht es ein. */
    pruefe("'richtung' schliesst den Monat nicht auf",
      await nebenbei("hauptsache warm",
        { richtung: "warm", monat: 10, selbst_genannt: ["richtung"] }, "monat", "zeit", "teilweise"), "verworfen");
    // Unbekannte Werte laufen ins Leere, statt etwas aufzuschliessen
    pruefe("Unbekanntes Thema schliesst nichts auf",
      await nebenbei("irgendwas",
        { ziel: "mallorca", selbst_genannt: ["quatsch", "erfunden"] }, "zielId", "art"), "verworfen");
  }

  /* Abwinken bei den Wuenschen, auch nebenbei - derselbe Testlauf:
     "verpflegung ist egal, sonst nichts weiter" beendete das Thema
     nicht, weil gerade nach der Verpflegung gefragt war. */
  if (KN && KN.WUNSCH_GENUG) {
    pruefe("Abwinken wird als solches erkannt",
      KN.WUNSCH_GENUG.test("verpflegung ist egal, sonst nichts weiter"), true);
    const q = fs.readFileSync(alt && fs.existsSync(quelle + "kern.js") ? quelle + "kern.js" : B + "agent/kern.js", "utf8");
    pruefe("Abwinken gilt auch mit Wunsch im Stand",
      /gefragt === "wuensche" \|\| hatWunsch/.test(q) ? "ja" : "nein", "ja");
  }

  /* Ein vorlaeufiger Monat wird als solcher uebergeben (17.11.2026)
     ------------------------------------------------------------------
     Aus dem Messlauf: Auf "weiss ich ehrlich gesagt noch nicht so genau"
     setzt der Kern den ersten Kandidatenmonat vorlaeufig und merkt einen
     Vergleich vor. Der Stand sagte aber nur "Monat Dezember", also
     sprach das Modell darueber wie ueber einen gewaehlten Monat und
     sagte zugleich, man koenne ihn spaeter festlegen.
     Gegenprobe: _backup/17-11-ausweg/ */
  if (KN && KN.standKurz) {
    const stand = (lauf, profil) => {
      const alt = KN.lauf;
      KN.lauf = { profil, ...lauf };
      try { return KN.standKurz(); } finally { KN.lauf = alt; }
    };
    const p = { monat: 12, naechte: 7, erwachsene: 2, kinder: 0 };
    pruefe("Vorlaeufiger Monat ist als solcher markiert",
      /VORLAEUFIG/.test(stand({ monatsvergleich: { monate: [12, 1, 2, 3] } }, p)) ? "ja" : "nein", "ja");
    pruefe("Entschiedener Monat ohne Vorbehalt",
      /VORLAEUFIG/.test(stand({ monatsvergleich: null }, p)) ? "ja" : "nein", "nein");
    pruefe("Von der Person genannter Monat ohne Vorbehalt",
      /VORLAEUFIG/.test(stand({ monatsvergleich: { monate: [12, 1] } },
        { ...p, vonPerson: { monat: true } })) ? "ja" : "nein", "nein");
  }

  /* Der Anzahl-Satz faellt erst vor den Vorschlaegen (17.11.2026)
     ------------------------------------------------------------------
     Er hing zuerst daran, dass `vorgehen` auf top3 gesetzt wird - also
     direkt nach der ersten Suche. Ben im Durchlauf: "Das ist hier noch
     viel zu frueh. Jetzt sollten erst mal noch alle Fakten geklaert
     werden." Zwischen erster Suche und Vorlage liegen Preis,
     Verpflegung, Wuensche und der Anreisetag.
     Gegenprobe: _backup/17-11-ausweg/ */
  if (WK && WK.fahrplan && WK.eckdatenSchluessel) {
    const vollerStand = () => ({ zielId: "mallorca", typ: "hotel", monat: 7, naechte: 7,
      erwachsene: 2, kinder: 0, kinderAlter: [], zimmer: 1, artGenannt: true, flug: false,
      anreise: "2027-07-10", maxPreis: 2000, verpflegungEgal: true, ausstattungEgal: true, wuensche: [] });
    const satzNach = (p, male = 1) => {
      const lauf = { gefragtWie: {}, verlauf: [], chips: null, annahmeOffen: [],
        gesuchtMit: WK.eckdatenSchluessel(p) };
      for (let i = 0; i < male; i++) WK.fahrplan(p, lauf);
      return (lauf.annahmeOffen || []).filter((e) => e.thema === "anzahl").length;
    };
    const offeneBeratung = vollerStand();
    delete offeneBeratung.maxPreis; delete offeneBeratung.verpflegungEgal; delete offeneBeratung.ausstattungEgal;
    pruefe("Kein Anzahl-Satz, solange die Beratung laeuft", satzNach(offeneBeratung), 0);
    pruefe("Anzahl-Satz, wenn es an die Vorschlaege geht", satzNach(vollerStand()), 1);
    pruefe("Anzahl-Satz faellt nur einmal", satzNach(vollerStand(), 3), 1);
    pruefe("Kein Anzahl-Satz bei eigener Zahl",
      satzNach({ ...vollerStand(), anzahlVorschlaege: 6 }), 0);
  }

  /* Drei Funde aus Bens Durchlauf vom 17.11.2026 abends
     ------------------------------------------------------------------
     Gegenprobe fuer alle drei: _backup/17-11-abend/ */

  // 1. "Dazunehmen" heisst dazunehmen, nicht ersetzen
  if (WK && WK.widerspruchRueckfrage) {
    const p = { monat: 3, richtung: "warm", zielVorgemerkt: "lappland",
      zieleErlaubt: ["krabi", "kapstadt", "marrakesch", "teneriffa", "algarve", "lissabon"] };
    const r = WK.widerspruchRueckfrage(p, { widerspruchGefragt: {} });
    const dazu = r && r.wirkung[Object.keys(r.wirkung)[0]];
    pruefe("Lappland wird DAZUgenommen, nicht ersetzt",
      (dazu?.zieleAuswahl || []).join(","),
      "krabi,kapstadt,marrakesch,teneriffa,algarve,lissabon,lappland");
    /* Mit `??` geprueft lieferte das hier beim ersten Anlauf den
       Ersatztext, weil `null ?? x` eben x ist - die Pruefung schlug an,
       obwohl der Code stimmte. Also auf das Vorhandensein des Feldes
       pruefen, nicht auf seinen Wert. */
    pruefe("Das einzelne Ziel wird dabei geleert",
      dazu && "zielId" in dazu ? String(dazu.zielId) : "Feld fehlt", "null");
    pruefe("Die Richtung wird aufgehoben",
      dazu && "richtung" in dazu ? String(dazu.richtung) : "Feld fehlt", "null");
    // Ohne erlaubte Liste gibt es nichts, wozu man dazunehmen koennte
    const r2 = WK.widerspruchRueckfrage({ monat: 3, richtung: "warm", zielVorgemerkt: "lappland", zieleErlaubt: [] },
      { widerspruchGefragt: {} });
    const d2 = r2 && r2.wirkung[Object.keys(r2.wirkung)[0]];
    pruefe("Ohne Liste bleibt es beim einzelnen Ziel", d2?.zielId, "lappland");
  }

  /* 2. Rueckfragen zaehlen nicht als Fehlversuche.
     Auf "In welcher Klasse moechtet ihr fliegen?" kamen zwei Sachfragen -
     danach nahm der Agent Economy an. Die Annahme gibt es fuer Schweigen,
     nicht fuer Beteiligung. */
  if (WK && WK.fahrplan) {
    const stand = () => ({ zielId: "mallorca", typ: "hotel", monat: 7, naechte: 7, erwachsene: 2,
      kinder: 0, kinderAlter: [], zimmer: 1, artGenannt: true, flug: true, flugAb: "CGN" });
    const zaehlen = (faelle) => {
      const lauf = { gefragtWie: {}, verlauf: [], chips: null, annahmeOffen: [],
        gefragtVorher: "flugKlasse", zugSeit: 0 };
      for (const [satz, art, urteil] of faelle) {
        lauf.gespraech = [{ role: "user", content: satz }];
        lauf.nachrichtArt = art; lauf.frageBeantwortet = urteil;
        lauf.zugSeit += 1;
        WK.fahrplan(stand(), lauf);
      }
      return (lauf.ohneAntwort || {}).flugKlasse || 0;
    };
    // Das Modell urteilt hier bewusst falsch ("nein") - der Kern sieht das Fragezeichen selbst
    pruefe("Drei Sachfragen zaehlen nicht", zaehlen([
      ["was ist der unterschied?", "frage", "nein"],
      ["wie teuer sind die jeweils?", "frage", "nein"],
      ["und wie lange dauert der flug?", "frage", "nein"]]), 0);
    pruefe("Echte Nicht-Antworten zaehlen weiter", zaehlen([
      ["hm", "sonstiges", "nein"],
      ["keine ahnung", "sonstiges", "nein"]]), 2);
  }

  // 3. Schnipsel kennen den Stand
  if (WK && WK.THEMEN && WK.THEMEN.wuensche) {
    const chips = (ids, runde) => WK.THEMEN.wuensche.chips(
      { kriterien: ids.map((id) => ({ id })) }, WK, { gefragtWie: { wuensche: runde } }) || "";
    pruefe("Genanntes Kriterium wird nicht erneut vorgeschlagen",
      /Sauberkeit/.test(chips(["sauberkeit"], 1)) ? "doch" : "nein", "nein");
    pruefe("Es bleiben Vorschlaege uebrig",
      chips(["essen"], 1).split("|").length >= 3 ? "ja" : "nein", "ja");
    pruefe("Alles genannt: nur noch Abwinken", chips(
      ["sauberkeit", "essen", "lage", "ruhe", "service", "preis"], 2).trim(), "Nein, das war's");
  }

  /* Vier weitere Funde aus Bens Durchlauf (17.11.2026 abends)
     Gegenprobe fuer alle: _backup/17-11-abend/ */

  // Der Chip wirkt auch ausserhalb des Fahrplans
  if (WK && WK.chipAntwortLesen) {
    const kern = { lauf: { profil: { zielId: "lappland", monat: 3 }, protokoll: [], gespraech: [],
        chipWirkung: { "Ja, Suche ausweiten": { zielId: null, zieleAuswahl: [], zielOffen: true },
          "Nein, ist mir wichtig": {} },
        chipThema: null, gefragt: null, zuletztGemerkt: [], selbstGelesen: [] },
      notieren() {}, standAnzeigen() {}, sichern() {}, logZeile() {} };
    const r = WK.chipAntwortLesen(kern, "Ja, Suche ausweiten");
    pruefe("Engstellen-Chip wird gelesen", r ? "ja" : "nein", "ja");
    pruefe("Engstellen-Chip oeffnet das Ziel", kern.lauf.profil.zielOffen, true);
    // Und die Stelle, an der er gerufen wird - ohne sie passierte gar nichts
    const kq = fs.readFileSync(alt && fs.existsSync(quelle + "kern.js") ? quelle + "kern.js" : B + "agent/kern.js", "utf8");
    pruefe("Der Leser haengt an chipWirkung, nicht an gefragt",
      /if \(this\.lauf\.chipWirkung\) \{\s*\n\s*const gelesen/.test(kq) ? "ja" : "nein", "ja");
    pruefe("Eine geloeschte Behauptung hinterlaesst keine Luecke",
      /luecke_gefuellt/.test(kq) ? "ja" : "nein", "ja");
  }

  // Schrittzeilen fuer die Arbeit, die man sonst nicht sieht
  {
    const wq = fs.readFileSync(alt && fs.existsSync(quelle + "werkzeugkasten.js") ? quelle + "werkzeugkasten.js" : B + "agent/werkzeugkasten.js", "utf8");
    pruefe("Bewertungen lesen erzeugt eine Schrittzeile",
      /Bewertungen gelesen: \$\{item\.name\}/.test(wq) ? "ja" : "nein", "ja");
    pruefe("Haus ansehen erzeugt eine Schrittzeile",
      /Haus angesehen: \$\{item\.name\}/.test(wq) ? "ja" : "nein", "ja");
    pruefe("FAQ nachschlagen erzeugt eine Schrittzeile",
      /Im FAQ nachgeschlagen/.test(wq) ? "ja" : "nein", "ja");
  }

  /* Katalogzahlen beantwortet der Kern, nicht das Modell. Als Funktion
     hinterlegt, damit sie nicht veralten - am 09.11. ist der Katalog
     zuletzt gewachsen, eine eingetippte Zahl waere seitdem falsch. */
  if (typeof faqSuchen === "function") {
    const antwort = (q) => { const t = faqSuchen(q); return t.length ? String(t[0].antwort) : ""; };
    pruefe("Frage nach der Zahl der Hotels wird beantwortet",
      /\d{2,}\s*Hotels/.test(antwort("Wie viele hotels bietet ihr auf der Seite an?")) ? "ja" : "nein", "ja");
    pruefe("Die Zahl stimmt mit dem Katalog ueberein",
      new RegExp(`${(typeof HOTELS !== "undefined" ? HOTELS.length : -1)} Hotels`)
        .test(antwort("wie viele unterkünfte habt ihr")) ? "ja" : "nein", "ja");
    pruefe("Frage nach den Regionen wird beantwortet",
      /Regionen im Angebot/.test(antwort("in welche regionen kann ich reisen")) ? "ja" : "nein", "ja");
  }

  /* Das FAQ muss auf den Seiten liegen, auf denen der Agent arbeitet
     ------------------------------------------------------------------
     Gefunden im Testlauf am 17.11.2026, und zwar erst, nachdem das
     Modell das Werkzeug endlich benutzte: Es bekam "Das FAQ steht hier
     nicht bereit" zurueck. `data/faq.js` war nur in faq.html
     eingebunden - also lief `faq_nachschlagen` auf JEDER Seite ins
     Leere, auf der der Agent ueberhaupt laeuft. Die ganze
     FAQ-Faehigkeit war tot, seit es sie gibt.

     Dass zwei Reparaturen davor nichts brachten, lag daran. Erst die
     Fehlermeldung des Modells hat es sichtbar gemacht. */
  for (const seite of ["index.html", "results.html", "stay.html", "checkout.html"]) {
    const q = fs.readFileSync(B + seite, "utf8");
    pruefe(`${seite} laedt das FAQ`, /data\/faq\.js/.test(q) ? "ja" : "nein", "ja");
  }

  /* Der Schritte-Block steht in beiden Armen (18.11.2026)
     ------------------------------------------------------------------
     Bis dahin nur in Arm B, als Ausgleich dafuer, dass man dort nicht
     zusehen kann. Das verdarb die Messung: Zwischen den Armen
     unterschieden sich zwei Dinge gleichzeitig. Entscheidung des
     Nutzers: in beide Arme, dann variiert nur das Zusehen, und ob
     jemand das Protokoll oeffnet, ist messbar.
     Gegenprobe: _backup/17-11-abend/ */
  {
    const kq = fs.readFileSync(alt && fs.existsSync(quelle + "kern.js") ? quelle + "kern.js" : B + "agent/kern.js", "utf8");
    const cq = fs.readFileSync(alt && fs.existsSync(quelle + "components.js") ? quelle + "components.js" : B + "components.js", "utf8");
    pruefe("Schritte werden unabhaengig vom Arm abgelegt",
      /schritteAblegen\(\) \{\s*\n\s*if \(typeof AgentPanel === "undefined"\) return;/.test(kq) ? "ja" : "nein", "ja");
    pruefe("Schritte werden unabhaengig vom Arm gezeigt",
      /schritteZeigen\(eintrag, \{ still = false \} = \{\}\) \{\s*\n\s*const box/.test(cq) ? "ja" : "nein", "ja");
    // Die Messung dazu muss in der Auswertung ankommen
    const sq = fs.readFileSync(alt && fs.existsSync(quelle + "studie.js") ? quelle + "studie.js" : B + "agent/studie.js", "utf8");
    pruefe("Das Oeffnen des Protokolls steht in den Spalten",
      /schritteGeoeffnet/.test(sq) ? "ja" : "nein", "ja");
  }

  /* Bilder laden erst, wenn sie gebraucht werden (18.11.2026)
     ------------------------------------------------------------------
     Gemessen auf der Trefferliste: 360 Karten, 12.135 DOM-Knoten, 360
     Bildanfragen bei EINEM Seitenaufruf, Seitenhoehe 94.229 Pixel. Das
     Zeichnen dauert 290 ms und ist nicht das Problem; die 360
     gleichzeitigen Bilder sind es. Nach der Aenderung: 24 beim Laden,
     der Rest beim Scrollen.

     Keine Blaetterung, obwohl vorgeschlagen: Welche Karten sichtbar
     sind und wo der Favorit steht, ist der Reiz dieser Erhebung.

     Drei Ebenen, weil sich die oberste im Pruefbrowser nicht pruefen
     laesst - dort meldet der IntersectionObserver nichts, auch im
     Gegentest nicht. Geprueft wird hier, dass alle drei da sind.
     Gegenprobe: _backup/17-11-abend/components-vor-lazy.js */
  {
    const cq = fs.readFileSync(alt && fs.existsSync(quelle + "components.js") ? quelle + "components.js" : B + "components.js", "utf8");
    pruefe("Die ersten Karten laden ohne Bedingung",
      /const SOFORT = \d+;\s*\n\s*alle\.slice\(0, SOFORT\)\.forEach\(setzen\);/.test(cq) ? "ja" : "nein", "ja");
    pruefe("Der Rest haengt am Beobachter",
      /new IntersectionObserver/.test(cq) ? "ja" : "nein", "ja");
    pruefe("Es gibt einen Rettungsanker am Scrollen",
      /addEventListener\("scroll", beiScroll/.test(cq) ? "ja" : "nein", "ja");
    pruefe("Ohne Beobachter wird alles gesetzt",
      /typeof IntersectionObserver !== "function"\) \{ rest\.forEach\(setzen\)/.test(cq) ? "ja" : "nein", "ja");
  }

  /* Der Schritte-Block ueberlebt einen Seitenwechsel (18.11.2026)
     ------------------------------------------------------------------
     Gemessen: Ein Lauf, in dem der Agent sichtbar die Suchmaske
     ausfuellte, filterte und scrollte - und am Ende stand kein Block da.
     Das Log ueberlebte den Seitenwechsel vollstaendig (5 Zeilen im
     Speicher), die Marke `schritteVon` auch. Ueberschrieben wurde sie:
     Nach einem Wechsel setzt `fortsetzen` den Zug mit einem erneuten
     Aufruf von `zug()` fort, und dort stand die Zuweisung ohne
     Bedingung.

     Damit fielen alle Schritte vor dem Wechsel aus dem Block - und weil
     der Agent frueh wechselt, blieb meist nichts uebrig. Betroffen
     waren ausgerechnet die arbeitsreichen Zuege.
     Gegenprobe: _backup/17-11-abend/ */
  {
    const kq = fs.readFileSync(alt && fs.existsSync(quelle + "kern.js") ? quelle + "kern.js" : B + "agent/kern.js", "utf8");
    pruefe("Die Schrittmarke wird beim Fortsetzen nicht zurueckgesetzt",
      /if \(this\.lauf\.schritteVon == null\) this\.lauf\.schritteVon = /.test(kq) ? "ja" : "nein", "ja");
    pruefe("Nach dem Ablegen wird sie wieder frei",
      /this\.lauf\.schritteVon = null;/.test(kq) ? "ja" : "nein", "ja");
  }

  console.log(`\n${gut} richtig, ${schlecht} falsch`);
  process.exit(schlecht ? 1 : 0);
})();
