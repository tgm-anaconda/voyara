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
for (const f of ["data/ziele.js", "data/hotels.js", "data/inventory.js", "data/auswahl.js", "data/bildpfade.js",
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
/* `kriterien: [{id:"pool"}]` stand hier und machte die Ausstattung zur
   Engstelle. Seit dem 19.11.2026 filtern Kriterien nicht mehr (siehe
   Politik.KRITERIEN), also steht der Pool jetzt da, wo er hingehoert:
   in `ausstattung`. Zwei Merkmale, damit die Aufteilung je Wunsch
   ueberhaupt etwas zu teilen hat. */
const pHotel = { typ: "hotel", ausstattung: ["pool", "spa"], maxPreis: 150,
  zielId: "mallorca", artGenannt: true, monat: 7, naechte: 7, erwachsene: 2, kinder: 0 };
const ef = WK.engstelleRueckfrage?.(pHotel, laufMit(3, 27, "ausstattung"));
pruefe("Rueckfrage nennt die passenden (3)", !!ef && /nur 3 Hotels/.test(ef.satz), true);
pruefe("Rueckfrage nennt die Art, nicht Haeuser", !!ef && !/Häuser/.test(ef.satz), true);
/* Der Satz nennt jetzt je Vorgabe die Zahl ohne sie (19.11.2026).
   Vorher stand da "ohne diese Vorgabe wären es 27", weil nur EINE
   Vorgabe zur Wahl stand. Jetzt steht die Rangliste da, und hinter
   jeder Vorgabe ihre eigene Zahl. Begruendung bei engstelleRueckfrage. */
/* Die Zahl steht hinter der Handlung, nicht hinter der Vorgabe: Seit
   es gestufte Vorschlaege gibt (19.11.2026), war "die Grenze auf 210 €,
   ohne sie 12" Unsinn. Und die Zahl kommt jetzt aus den Werten, die der
   Knopf wirklich setzt - vorher nannte der Satz die Zahl fuer "Vorgabe
   ganz weg" und angewandt wurde 1,25 x Grenze. */
pruefe("Rueckfrage nennt je Moeglichkeit eine Zahl",
  !!ef && (ef.satz.match(/: \d+ Hotels?\./g) || []).length === ef.kandidaten.length, true);
pruefe("Rueckfrage fragt, was geaendert werden soll", !!ef && /Was soll ich ändern\?/.test(ef.satz), true);
pruefe("Und bietet das Behalten an", !!ef && ef.chips.some((c) => /Keine, so ist es richtig/.test(c)), true);
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
pruefe("Wenige Treffer: der Chat hat gefragt", k1.gesagt.length > 0 && /Was soll ich ändern\?/.test(k1.gesagt[0]), true);
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
/* Seit dem 20.11.2026 wird der Flughafen nicht mehr angenommen, sondern
   vorgeschlagen und gefragt (Ben: "Er haette nicht einfach einen annehmen
   duerfen"). Geprueft wird: nichts gesetzt, aber ein begruendeter
   Vorschlag liegt bereit. */
const p4 = flugProfil(); const l4 = flugLauf();
try { WK.fahrplan(p4, l4); } catch { /* der Fahrplan braucht mehr Welt, die Annahme reicht */ }
pruefe("Flughafen wird nicht gesetzt", p4.flugAb == null ? "nicht gesetzt" : p4.flugAb, "nicht gesetzt");
pruefe("Aber vorgeschlagen", typeof l4.vorschlag?.werte?.flugAb === "string" ? "ja" : "nein", "ja");
pruefe("Vorschlag ist begruendbar, nicht blind Frankfurt",
  l4.vorschlag?.werte?.flugAb !== "Frankfurt" || (WK.guenstigsterFlughafen([], null)?.ab === "Frankfurt"), true);
/* Hat der Agent eben selbst einen Flughafen genannt ("der naechste zu
   Lueneburg ist Hamburg"), wird der vorgeschlagen - der Fall vom
   20.11.2026, in dem stattdessen Duesseldorf gesetzt wurde. */
const p4b = flugProfil(); const l4b = flugLauf();
l4b.gespraech = [{ role: "user", content: "Welcher ist der nächste zu mir. ich wohne in lüneburg" },
  { role: "assistant", content: "Der nächste Flughafen zu Lüneburg ist Hamburg." }];
try { WK.fahrplan(p4b, l4b); } catch { /* egal */ }
pruefe("Der genannte Flughafen wird vorgeschlagen", l4b.vorschlag?.werte?.flugAb, "Hamburg");
/* Damit der Flughafen die naechste Frage ist, muss davor alles stehen
   und einmal gesucht worden sein. */
Object.assign(p4b, { artGenannt: true, kinderAlter: [], zimmer: 1 });
l4b.gesuchtMit = (() => { try { return WK.fahrplan(p4b, l4b).schluessel; } catch { return null; } })();
const fpV = (() => { try { return WK.fahrplan(p4b, l4b); } catch { return null; } })();
pruefe("Und als Frage gestellt", /Soll ich mit Abflug ab Hamburg rechnen/.test(fpV?.satz || "") ? "ja" : (fpV?.satz || "").slice(0, 60), "ja");

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
pruefe("Ausweichen fuehrt zum Vorschlag, nicht zur Annahme",
  p5e.flugAb == null && !!l5e.vorschlag ? "vorgeschlagen" : (p5e.flugAb ? "angenommen" : "nichts"), "vorgeschlagen");

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
/* Seit dem 20.11.2026 wird der Monat nicht mehr angenommen (Ben: "Das
   war auch schon bei Dezember ein Problem"). Statt des Annahmesatzes
   kommt ein Vorschlag als Frage - und der Monat bleibt leer, bis die
   Person zustimmt. */
pruefe("Kein Monat ohne Zustimmung", zeitProfil.monat ?? "leer", "leer");
pruefe("Kein Annahmesatz zum Monat", (zeitLauf.annahmeOffen || []).some((x) => x.thema === "zeit") ? "doch" : "nein", "nein");
pruefe("Stattdessen ein Vorschlag", zeitLauf.vorschlag?.thema || "keiner", "zeit");

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
      /* Seit dem 20.11.2026 nimmt der Kern bei echten Werten nichts mehr
         an, sondern fragt mit einem Vorschlag nach - so lange, bis eine
         Antwort kommt. Eine Person, die NIE antwortet, kaeme also nie ans
         Ende; das ist gewollt (Ben: "nicht einfach irgendwelche Sachen
         nehmen, bei keiner der Antworten"). Gespielt wird deshalb eine
         Person, die offene Fragen uebergeht, einen Vorschlag mit Knopf
         aber annimmt. */
      if (fp.vorschlag) {
        gestellt.push(fp.naechstes);
        Object.assign(p, fp.vorschlag.werte);
        p.vonPerson = { ...(p.vonPerson || {}), ...Object.fromEntries(Object.keys(fp.vorschlag.werte).map((f) => [f, true])) };
        lauf.vorschlag = null;
        continue;
      }
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
  /* Zweimal offen, beim dritten Mal als Vorschlag mit Knopf - mehr
     nicht (seit 20.11.2026; vorher war nach zweimal die Annahme). */
  pruefe("Keine Frage steht ein viertes Mal", schlimmste <= 3 ? "hoechstens dreimal" : `${schlimmste}-mal: ${JSON.stringify(beispiel)}`, "hoechstens dreimal");
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

  /* Kein Kriterium filtert mehr (19.11.2026).
     ------------------------------------------------------------------
     Hier stand die Trennung "hart gegen weich": Ein Kriterium mit
     `filter` schnitt die Liste zu, eines ohne wog nur. Die Pruefungen
     schrieben das als richtig fest - und damit auch, dass ein
     beilaeufiges "Strand waere schoen" in der offenen Frage
     `maxStrand <= 1 km` setzt.

     Ben am 19.11.2026: "Das mit diesem, auf was achtest du, Essen - das
     soll zum Beispiel gar nicht einschraenken." Seitdem wiegen alle
     Kriterien nur noch; eingeschraenkt wird ueber `ausstattung`,
     `maxStrand` und `mindestbewertung`, die das Modell nur bei einer
     ausgesprochenen Bedingung setzt. Begruendung bei Politik.KRITERIEN. */
  {
    pruefe("Kein Kriterium filtert mehr",
      ctx.PO.KRITERIEN.filter((k) => k.filter).map((k) => k.id).join(",") || "keins", "keins");
    /* Jedes Kriterium braucht etwas, womit es wiegen kann - sonst
       verfaellt der Wunsch stillschweigend. Teilnote, Aspekt, ein
       Ausstattungsmerkmal, die Strandnaehe oder die Gesamtnote. */
    const ohneGrundlage = ctx.PO.KRITERIEN
      .filter((k) => !k.note && !k.aspekt && !k.merkmal && !k.naehe && !k.gesamtnote)
      .map((k) => k.id);
    pruefe("Jedes Kriterium hat eine Grundlage", ohneGrundlage.join(",") || "keins", "keins");

    const leiste = (profil) => ctx.PO.eckdaten(profil);
    const zeilen = leiste({ kriterien: [{ id: "ruhe" }, { id: "pool" }, { id: "sauberkeit" }] });
    const feld = (wert) => (zeilen.find((z) => z.wert === wert) || {}).feld || "fehlt";
    pruefe("Leiste: Ruhe steht als Wichtig", feld("Ruhe"), "Wichtig");
    pruefe("Leiste: Sauberkeit steht als Wichtig", feld("Sauberkeit"), "Wichtig");
    // Pool als Wunsch ist "Wichtig". Erst als Bedingung wird daraus ein Muss.
    pruefe("Leiste: Pool als Wunsch ist Wichtig", feld("Pool"), "Wichtig");
    const mussPool = leiste({ ausstattung: ["pool"] });
    pruefe("Leiste: Pool als Bedingung ist Muss",
      (mussPool.find((z) => z.wert === "Pool") || {}).feld || "fehlt", "Muss");
    // Nichts darf doppelt erscheinen
    const werte = zeilen.map((z) => z.wert);
    pruefe("Leiste: keine Zeile doppelt", werte.length, new Set(werte).size);
    // Strandnaehe als Wunsch und die Entfernung als Vorgabe sind zwei Dinge,
    // aber jedes steht hoechstens einmal da
    const mitStrand = leiste({ kriterien: [{ id: "strandnah" }], maxStrand: 1 });
    const strandWerte = mitStrand.map((z) => z.wert);
    pruefe("Leiste: nichts doppelt, auch beim Strand",
      strandWerte.length, new Set(strandWerte).size);

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
    /* "nach malle" erkennt der Kern seit dem 20.11.2026 selbst
       (REGION_SPITZNAMEN). Ein wirklich erschlossenes Ziel braucht eine
       Umschreibung, die nur das Modell aufloesen kann. */
    pruefe("Erschlossenes Ziel wird angesagt", (await zielLauf("auf die Insel mit dem Ballermann", "mallorca", "ja")).angesagt, true);
    pruefe("Malle erkennt der Kern selbst und wiederholt es nicht", (await zielLauf("nach malle", "mallorca", "ja")).angesagt, false);
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
    pruefe("Ohne selbst_genannt bleibt eine Umschreibung verworfen",
      await nebenbei("hotel. wir wollen auf die insel mit dem ballermann",
        { typ: "hotel", ziel: "mallorca" }, "zielId", "art"), "verworfen");
    pruefe("Malle kommt auch ohne selbst_genannt an (Spitzname)",
      await nebenbei("hotel. wir wollen nach malle",
        { typ: "hotel", ziel: "mallorca" }, "zielId", "art"), "kommt an");
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
      /gefragt === "gewichtung" \|\| hatWunsch/.test(q) ? "ja" : "nein", "ja");
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
    /* Hier standen bis zum 18.11.2026 vier Pruefungen zum Anzahl-SATZ,
       der ueber annahmeOffen fiel. Aus der Ansage ist eine Bestaetigung
       geworden, und sie sitzt nicht mehr im Fahrplan, sondern in
       `auswahl_vorlegen` - dort, wo die Vorlage wirklich entsteht.

       Der Grund fuer den Umzug: Ein erster Anlauf liess den Fahrplan in
       "beratung" ohne Thema parken, bis die Person bestaetigt. Die
       Kernpruefung meldete prompt eine Sackgasse - einen Zustand, den
       der Fahrplan allein nicht mehr verlassen kann. Ein Haltepunkt
       gehoert nicht in den Fahrplan, sondern vor die Handlung, die er
       aufhalten soll.

       Geprueft wird jetzt an der neuen Stelle, weiter unten. */
    pruefe("Kein Anzahl-Satz mehr im Fahrplan", satzNach(vollerStand()), 0);
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

  /* Kleine Kartenbilder statt Nachladen (19.11.2026)
     ------------------------------------------------------------------
     Hier standen bis zum 19.11.2026 vier Pruefungen, die das Nachladen
     beim Scrollen festschrieben (24 sofort, Rest per Beobachter, dazu ein
     Scroll-Handler). Genau das liess das Durchscrollen des Agenten
     ruckeln - Ben: "Die Seite hat noch gar nicht richtig geladen und er
     scrollt schon so ganz verrueckt runter." Die Pruefungen waren gruen,
     waehrend der Fehler im Live-Lauf zu sehen war.

     Die Ursache lag eine Ebene tiefer: Karten zeigten das volle Foto,
     1200 x 801 Pixel, rund 280 KB. Jetzt zeigen sie `kartenbildVon`,
     600 Pixel breit, rund 20 KB - und alles laedt wieder sofort. */
  {
    const cq = fs.readFileSync(alt && fs.existsSync(quelle + "components.js") ? quelle + "components.js" : B + "components.js", "utf8");
    const rumpf = (cq.split("function applyScenes")[1] || "").split("\nfunction ")[0];
    pruefe("Beim Scrollen wird kein Bild mehr nachgeladen",
      /IntersectionObserver\(|addEventListener\("scroll"/.test(rumpf) ? "doch" : "nein", "nein");
    pruefe("Alle Kartenbilder werden sofort gesetzt",
      /querySelectorAll\("\[data-bild\]"\)\.forEach/.test(rumpf) ? "ja" : "nein", "ja");
    /* Jede Karte zeigt die kleine Fassung, und die gibt es auch - sonst
       stuende eine graue Flaeche da. */
    const KB = vm.runInContext("typeof kartenbildVon === 'function' ? kartenbildVon : null", ctx);
    const ids = vm.runInContext("Object.keys(BILDER)", ctx);
    const fehlend = KB ? ids.map((id) => KB(id)).filter((pf) => pf && !fs.existsSync(B + pf)) : ["keine Funktion"];
    pruefe("Zu jedem Titelbild gibt es die Kartenfassung",
      fehlend.length ? `${fehlend.length} fehlen, z.B. ${fehlend[0]}` : "alle da", "alle da");
    const groesste = KB ? Math.max(...ids.map((id) => KB(id)).filter((pf) => pf && fs.existsSync(B + pf)).map((pf) => fs.statSync(B + pf).size)) : 0;
    pruefe("Keine Kartenfassung ist groesser als 80 KB",
      groesste && groesste <= 80 * 1024 ? "ja" : `${Math.round(groesste / 1024)} KB`, "ja");
    for (const datei of ["results.js", "components.js", "merkzettel.js", "checkout.js", "agent/vorschlaege.js"]) {
      const q = fs.readFileSync(B + datei, "utf8");
      pruefe(`${datei}: Karten zeigen die kleine Fassung`,
        /titelbildVon\(/.test(q) ? "volles Foto" : "klein", "klein");
    }
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

  /* Der Haltepunkt vor der Vorlage, und die uebrigen Funde vom 18.11.
     Gegenprobe: _backup/18-11-abend/ */
  if (WK && WK.werkzeuge && WK.werkzeuge.auswahl_vorlegen) {
    const kernStub = (lauf = {}) => ({
      lauf: { profil: { zielId: "mallorca", typ: "hotel", monat: 7, naechte: 7, erwachsene: 2,
          kinder: 0, kinderAlter: [], zimmer: 1, artGenannt: true, flug: false, anreise: "2027-07-10",
          /* `gewichtungEgal` seit dem 19.11.2026: Der Schwerpunkt fuer die
             Bewertungen ist ein eigenes Thema und steht als letztes vor
             dem Haltepunkt. Ohne das Feld haelt der Fahrplan ihn fuer
             offen und legt gar nichts vor. */
          maxPreis: 2000, verpflegungEgal: true, ausstattungEgal: true, gewichtungEgal: true,
          wuensche: [], vorgehen: "top3" },
        protokoll: [], gespraech: [], verlauf: [], chips: null, gefragtWie: {}, annahmeOffen: [], ...lauf },
      notieren(e, d) { this.lauf.protokoll.push({ ereignis: e, ...d }); },
      sagen(t) { (this.lauf.gesagt ||= []).push(t); },
      gespraechPush() {}, sichern() {}, logZeile() {}, standKurz: () => "",
      auswahlVorlegen: () => ({ ergebnis: { vorgelegt: true } }),
      freigabe: () => "suchen", darf: () => false, standAnzeigen() {},
      /* Die echte Kern-Methode, nicht nachgebaut: Seit dem 18.11.2026
         steht der Haltepunkt in kern.js und wird vom Fahrplan vor dem
         Rundgang und von auswahl_vorlegen gerufen. Ein Nachbau im Stub
         haette den Stub geprueft statt den Code. */
      anzahlVorRundgang: KN.anzahlVorRundgang,
    });
    const ruf = async (lauf) => {
      const kern = kernStub(lauf);
      const r = await WK.werkzeuge.auswahl_vorlegen.call(WK, { ids: ["h1", "h2", "h3"] }, kern);
      return { kern, r };
    };
    const erst = await ruf({});
    pruefe("Erst wird gefragt, nicht vorgelegt",
      erst.r?.ergebnis?.nichtVorgelegt ? "gefragt" : "vorgelegt", "gefragt");
    pruefe("Die Frage nennt keine Zahlenauswahl",
      /Drei|Vier|Sechs/.test((erst.kern.lauf.chips || []).join(" ")) ? "doch" : "nein", "nein");
    pruefe("Zwei Knoepfe: weiter oder mehr",
      (erst.kern.lauf.chips || []).length, 2);
    pruefe("Die Frage faellt nur einmal",
      (await ruf({ anzahlBestaetigt: true })).r?.ergebnis?.nichtVorgelegt ? "nochmal" : "einmal", "einmal");
    pruefe("Wer selbst eine Zahl genannt hat, wird nicht gefragt",
      (await ruf({ profil: { ...kernStub().lauf.profil, anzahlVorschlaege: 6 } })).r?.ergebnis?.nichtVorgelegt
        ? "gefragt" : "direkt", "direkt");
    /* Der Halt loescht den Suchstempel (18.11.2026, 22:15)
       ----------------------------------------------------------------
       Gemessen: Nach "Ja, such sie raus" rief das Modell nur
       `stand_merken` und zaehlte drei Hotels mit erfundenen Preisen auf.
       `vorgehenFuer` stand noch, also erzwang `zwang` keine Suche mehr -
       der Halt hatte den Zug verbraucht, der zum Rundgang gefuehrt
       haette. Begruendung bei Kern.anzahlVorRundgang. */
    /* Die Zahl in der Frage ist die wirkliche (18.11.2026, 22:40)
       ----------------------------------------------------------------
       Gemessen: Die Frage sagte "3 Hotels", vorgelegt wurden 2 - das
       Vergleichsset war eingeschnuert. Die Frage versprach etwas, was
       der Kern gleich danach brach. */
    {
      /* In der Gegenprobe gibt es die Methode nicht - dann soll die
         Pruefung durchfallen, nicht abbrechen. */
      const sag = (n) => { const k = kernStub();
        if (typeof k.anzahlVorRundgang !== "function") return "keine Methode";
        k.anzahlVorRundgang(k.lauf.profil, n); return (k.lauf.gesagt || []).join(" "); };
      const satz = sag(2);
      pruefe("Die Frage nennt die wirkliche Zahl",
        /\b2\b/.test(satz) && !/\b3\b/.test(satz) ? "zwei" : satz.slice(0, 90), "zwei");
      pruefe("Und bei sechs auch",
        /\b6\b/.test(sag(6)) ? "sechs" : "nein", "sechs");
      pruefe("Der Fahrplan gibt die Setgroesse mit",
        /anzahlVorRundgang\(p, engere\.length\)/.test(
          fs.readFileSync(alt && fs.existsSync(quelle + "werkzeugkasten.js") ? quelle + "werkzeugkasten.js" : B + "agent/werkzeugkasten.js", "utf8")
        ) ? "ja" : "nein", "ja");
    }
    pruefe("Der Halt loescht den Suchstempel",
      (await ruf({ vorgehenFuer: "irgendwas" })).kern.lauf.vorgehenFuer ?? "geloescht", "geloescht");
    {
      /* Und dann erzwingt der Zwang wieder eine Suche - sonst waere das
         Loeschen eine Behauptung. */
      const lauf = { profil: { zielId: "mallorca", typ: "hotel", monat: 7, naechte: 7, erwachsene: 2,
          kinder: 0, kinderAlter: [], zimmer: 1, artGenannt: true, flug: false, anreise: "2027-07-10",
          /* `gewichtungEgal` seit dem 19.11.2026: Der Schwerpunkt fuer die
             Bewertungen ist ein eigenes Thema und steht als letztes vor
             dem Haltepunkt. Ohne das Feld haelt der Fahrplan ihn fuer
             offen und legt gar nichts vor. */
          maxPreis: 2000, verpflegungEgal: true, ausstattungEgal: true, gewichtungEgal: true,
          wuensche: [], vorgehen: "top3" },
        gesuchtMit: "x", gespraech: [], gefragtWie: {} };
      const fp = WK.fahrplan(lauf.profil, lauf);
      lauf.vorgehenFuer = fp.schluessel + lauf.profil.vorgehen;
      pruefe("Mit Stempel wird nichts erzwungen", WK.zwang(lauf.profil, lauf) || "nichts", "nichts");
      lauf.vorgehenFuer = null;
      pruefe("Ohne Stempel wird gesucht", WK.zwang(lauf.profil, lauf), "suchen");
    }
  }

  /* Der Haltepunkt sitzt VOR dem Rundgang (18.11.2026, abends)
     ------------------------------------------------------------------
     Gemessen in einem Lauf gegen das echte Modell: Der Agent lief den
     Rundgang - Haus oeffnen, Bewertungen lesen, zurueck, rund 45
     Sekunden - und erst danach kam die Frage, ob drei Haeuser passen.
     Der erste Bau haing in `auswahl_vorlegen`, und das ist hinter dem
     Rundgang. Genau Bens Einwand: gefragt wird, wenn die Arbeit schon
     getan ist.
     Gegenprobe: _backup/18-11-haltepunkt/ */
  {
    const kq = fs.readFileSync(alt && fs.existsSync(quelle + "kern.js") ? quelle + "kern.js" : B + "agent/kern.js", "utf8");
    const wq = fs.readFileSync(alt && fs.existsSync(quelle + "werkzeugkasten.js") ? quelle + "werkzeugkasten.js" : B + "agent/werkzeugkasten.js", "utf8");
    pruefe("Der Haltepunkt ist eine eigene Kern-Methode",
      /anzahlVorRundgang\(p, wieViele/.test(kq) ? "ja" : "nein", "ja");
    const iHalt = wq.indexOf("kern.anzahlVorRundgang(p, engere.length)");
    const iRundgang = wq.indexOf("kern.lauf.rundgang = {");
    pruefe("Der Fahrplan ruft ihn ueberhaupt", iHalt >= 0 ? "ja" : "nein", "ja");
    pruefe("Er steht vor dem Rundgang",
      iHalt >= 0 && iRundgang >= 0 && iHalt < iRundgang ? "davor" : "danach", "davor");
    pruefe("Die Engstelle kommt zuerst, dann die Anzahl",
      (() => { const e = wq.indexOf("kern.engstelleVorRundgang(auswahl, p)");
        return e >= 0 && iHalt > e ? "ja" : "nein"; })(), "ja");
  }

  /* Was dasteht, zaehlt wie eine Runde (18.11.2026, 23:00)
     ------------------------------------------------------------------
     Gemessen: Die Person sagte im ersten Satz "Ruhige Lage und gutes
     Essen sind mir wichtig", der Agent nahm beides auf - und fragte
     danach "Worauf achtest du bei der Unterkunft besonders? Zum
     Beispiel Ruhe, gutes Essen oder die Lage." Die Chips boten kein
     Abwinken an. Begruendung bei Werkzeugkasten.wunschRunde.
     Gegenprobe: _backup/18-11-nacht/ */
  if (WK && WK.THEMEN && WK.THEMEN.wuensche) {
    const th = WK.THEMEN.wuensche;
    const krit = [{ id: "ruhe" }, { id: "essen" }];
    const satz = (p, lauf) => String(typeof th.satz === "function" ? th.satz(p, WK, lauf) : th.satz);
    const chips = (p, lauf) => String((typeof th.chips === "function" ? th.chips(p, WK, lauf) : th.chips) || "");
    pruefe("Ohne Wunsch kommt die offene Frage",
      /Worauf achtest du/.test(satz({ kriterien: [] }, { gefragtWie: {} })) ? "offen" : "anders", "offen");
    pruefe("Mit genanntem Wunsch nicht mehr die offene Frage",
      /Worauf acht/.test(satz({ kriterien: krit }, { gefragtWie: {} })) ? "doch" : "nein", "nein");
    pruefe("Stattdessen wird nachgehakt mit dem, was steht",
      /Fällt dir/.test(satz({ kriterien: krit }, { gefragtWie: {} })) ? "nachgehakt" : "nein", "nachgehakt");
    pruefe("Auch Ausstattung allein zaehlt",
      /Worauf acht/.test(satz({ kriterien: [], ausstattung: ["pool"] }, { gefragtWie: {} })) ? "doch" : "nein", "nein");
    pruefe("Das Abwinken liegt gleich als Chip daneben",
      /Nein, das war/.test(chips({ kriterien: krit }, { gefragtWie: {} })) ? "da" : "fehlt", "da");
    pruefe("Ohne Wunsch kein Abwinken-Chip",
      /Nein, das war/.test(chips({ kriterien: [] }, { gefragtWie: {} })) ? "da" : "fehlt", "fehlt");
    pruefe("Die Chips bieten nichts an, was schon steht",
      /Ruhe|Essen/.test(chips({ kriterien: krit }, { gefragtWie: {} })) ? "doch" : "nein", "nein");
  }

  /* Der Kern liest die Flugangabe selbst (18.11.2026, 23:00)
     ------------------------------------------------------------------
     Gemessen: "... bis 2000 Euro, ohne Flug." Das Modell schrieb
     dreizehn Felder, `flug` war nicht dabei, und der Kern fragte danach.
     Begruendung an der Stelle in stand_merken.
     Gegenprobe: _backup/18-11-nacht/ */
  if (WK && WK.werkzeuge && WK.werkzeuge.stand_merken) {
    const lies = async (text, vorgabe = {}) => {
      const kern = { lauf: { profil: { ...vorgabe }, protokoll: [], gespraech: [{ role: "user", content: text }],
          verlauf: [], gefragtWie: {}, annahmeOffen: [], chips: null },
        notieren(e, d) { this.lauf.protokoll.push({ ereignis: e, ...d }); },
        sagen() {}, gespraechPush() {}, sichern() {}, logZeile() {}, standKurz: () => "",
        freigabe: () => "suchen", darf: () => false, standAnzeigen() {} };
      await WK.werkzeuge.stand_merken.call(WK, { frage_beantwortet: "keine_frage_offen" }, kern);
      return kern.lauf.profil.flug;
    };
    pruefe("ohne Flug kommt an", await lies("7 Nächte Mallorca, ohne Flug."), false);
    pruefe("nur die Unterkunft kommt an", await lies("Nur die Unterkunft bitte."), false);
    pruefe("mit Flug kommt an", await lies("Mit Flug von Hamburg."), true);
    pruefe("Eine Frage nach dem Flugpreis ist keine Entscheidung",
      await lies("Wie teuer wäre der Flug?") ?? "offen", "offen");
    pruefe("Beides im Satz bleibt offen",
      await lies("Mit Flug oder ohne Flug, keine Ahnung") ?? "offen", "offen");
    pruefe("Ein gesetzter Wert wird nicht ueberschrieben",
      await lies("Ohne Flug.", { flug: true }), true);
  }

  /* Das Ja zur Ausweitung in eigenen Worten (19.11.2026)
     ------------------------------------------------------------------
     Gemessen: Der Chat fragt "Soll ich die Suche ausweiten?", und
     `chipAntwortLesen` vergleicht den Wortlaut genau. "Ja, Suche
     ausweiten" wirkte, "ja", "ja bitte" und "ok mach das" fielen durch -
     die Preisgrenze blieb bei 90 statt auf 113 zu gehen. Der Chip war am
     17.11.2026 repariert worden, der freie Text nicht.
     Gegenprobe: _backup/19-11-ausweiten/ */
  if (WK && WK.engstelleRueckfrage && WK.werkzeuge && WK.werkzeuge.stand_merken) {
    const basis = () => ({ zielId: "mallorca", typ: "hotel", monat: 7, naechte: 7, erwachsene: 2,
      kinder: 0, kinderAlter: [], zimmer: 1, artGenannt: true, flug: false, maxPreis: 120, ausstattung: ["pool"] });
    /* 120 € und Pool ergeben auf Mallorca im Juli wirklich 2 Treffer -
       nachgerechnet am 19.11.2026. Vorher standen hier 90 €, und dazu
       gibt es 0; die gestuften Vorschlaege brachten dann auch nichts
       ueber die erfundene `jetzt: 2` hinaus, und die ganze Rueckfrage
       fiel aus. Eine Pruefung mit erfundenen Zahlen misst nichts. */
    const ef = WK.engstelleRueckfrage(basis(), { letzteEngstelle: { feld: "preis", jetzt: 2, ohne: 18 },
      engstelleGefragt: {}, gefragtWie: {} });
    pruefe("Die Engstellenfrage liefert die Kandidaten einzeln mit",
      ef && ef.kandidaten?.length ? "ja" : "fehlt", "ja");
    /* Nicht mehr `maxPreis * 1.25` als einziger Vorschlag, sondern zwei
       Stufen (19.11.2026). Geprueft wird, dass der erste Kandidat eine
       Preisstufe ist und die Grenze ANHEBT, nicht streicht. */
    const preisK = (ef?.kandidaten || []).filter((k) => k.feld.startsWith("preis:"));
    /* Nachgerechnet am 19.11.2026: 120 € mit Pool gibt 2 Hotels, 130 €
       (+10 %) bringt zu wenig dazu und faellt weg, 150 € (+25 %) gibt 7.
       Geprueft wird also, dass eine STUFE kommt - nicht das Streichen. */
    pruefe("Der Preis steht gestuft zur Wahl", preisK.length >= 1 ? "ja" : `${preisK.length}`, "ja");
    pruefe("Die Stufen heben die Grenze an, sie streichen sie nicht",
      preisK.every((k) => k.werte.maxPreis > 120) ? "ja" : "nein", "ja");
    /* Der Strandabstand wird genauso gestuft (0,2 / 1 / 5 km) statt
       gestrichen - gemessen am 19.11.2026: 0,2 km gibt 9 Hotels, 1 km
       14, 5 km 20, gar keine Grenze 25. */
    const strandR = WK.engstelleRueckfrage({ zielId: "mallorca", typ: "hotel", artGenannt: true,
      monat: 7, naechte: 7, erwachsene: 2, kinder: 0, maxStrand: 0.2 },
      { letzteEngstelle: { feld: "strand", ohne: 18, jetzt: 3 }, engstelleGefragt: {} });
    const strandK = (strandR?.kandidaten || []).filter((k) => k.feld.startsWith("strand:"));
    pruefe("Der Strandabstand wird gestuft angeboten",
      strandK.length >= 2 ? "ja" : `${strandK.length}`, "ja");
    pruefe("Und zwar groesser, nicht gestrichen",
      strandK.every((k) => k.werte.maxStrand > 0.2 && !k.werte.strandEgal) ? "ja" : "nein", "ja");
    pruefe("Die Stufe ist die, die wirklich etwas bringt",
      preisK.some((k) => k.werte.maxPreis === 150) ? "ja" : preisK.map((k) => k.werte.maxPreis).join(","), "ja");
    pruefe("Eine Stufe, die zu wenig bringt, steht nicht da",
      preisK.some((k) => k.werte.maxPreis === 130) ? "doch" : "nein", "nein");
    const probe = async (args, offen = true) => {
      const kern = { lauf: { profil: basis(), protokoll: [], gespraech: [{ role: "user", content: "ja" }],
          verlauf: [], gefragtWie: {}, annahmeOffen: [], chips: null,
          engstelleOffen: offen ? { feld: "preis", werte: ef && ef.werte,
            kandidaten: (ef && ef.kandidaten) || [] } : null },
        notieren(e, d) { this.lauf.protokoll.push({ ereignis: e, ...d }); },
        sagen() {}, gespraechPush() {}, sichern() {}, logZeile() {}, standKurz: () => "",
        freigabe: () => "suchen", darf: () => false, standAnzeigen() {} };
      await WK.werkzeuge.stand_merken.call(WK, { frage_beantwortet: "ja", ...args }, kern);
      return kern;
    };
    /* Ein blankes "ja" nimmt den ersten Kandidaten - den, der am
       meisten bringt. Welche Zahl das ist, rechnet der Kern; geprueft
       wird, dass sie gesetzt wird und die Grenze anhebt. */
    pruefe("Ein Ja nimmt den ersten Kandidaten",
      (() => { const k0 = (ef?.kandidaten || [])[0]; if (!k0) return "kein Kandidat"; return "ok"; })(), "ok");
    pruefe("Und steht in den Daten",
      (await probe({ ausweiten: "ja" })).lauf.protokoll.some((e) => e.ereignis === "ausweiten_zugestimmt") ? "ja" : "nein", "ja");
    pruefe("Ein Nein laesst die Vorgabe stehen",
      (await probe({ ausweiten: "nein" })).lauf.profil.maxPreis, 120);
    pruefe("Eine genannte Stufe wird genau so gesetzt",
      (await probe({ ausweiten: "preis:25" })).lauf.profil.maxPreis, 150);
    pruefe("Ein Nein schliesst die Frage trotzdem",
      (await probe({ ausweiten: "nein" })).lauf.engstelleOffen ? "offen" : "zu", "zu");
    pruefe("Ohne Antwort bleibt die Frage offen",
      (await probe({})).lauf.engstelleOffen ? "offen" : "zu", "offen");
    pruefe("Ohne offene Frage wirkt ein Ja nicht",
      (await probe({ ausweiten: "ja" }, false)).lauf.profil.maxPreis, 120);
    pruefe("Der Kern merkt sich die offene Frage",
      /this\.lauf\.engstelleOffen = \{ feld: ef\.grund/.test(
        fs.readFileSync(alt && fs.existsSync(quelle + "kern.js") ? quelle + "kern.js" : B + "agent/kern.js", "utf8")
      ) ? "ja" : "nein", "ja");
    pruefe("Und sagt dem Modell, dass sie offen ist",
      /Offene Frage des Chats: Welche Vorgabe soll gelockert werden/.test(
        fs.readFileSync(alt && fs.existsSync(quelle + "kern.js") ? quelle + "kern.js" : B + "agent/kern.js", "utf8")
      ) ? "ja" : "nein", "ja");
  }

  /* Die Rueckfrage stellt die Vorgaben zur Wahl (19.11.2026)
     ------------------------------------------------------------------
     Ben am 19.11.2026: "Suche ausweiten soll nicht automatisch einfach
     nur den Preis ausweiten, sondern es soll fragen: Welche von den
     Lockerungen soll ich fuer dich aendern? Und dann die nennen, die am
     meisten einschraenken."
     Gegenprobe: _backup/19-11-ausweiten/ */
  if (WK && WK.engstelleRueckfrage && WK.engstelle) {
    /* Ohne Ausstattungswuensche: Dann bleiben Region und zwei
       Preisstufen uebrig - mehrere Moeglichkeiten nebeneinander, und
       genau darum geht es hier. Mit petsAllowed und spa blieb nach dem
       Sieb nur eine, weil die anderen zu wenig brachten (19.11.2026). */
    const pv = { zielId: "mallorca", typ: "hotel", monat: 7, naechte: 7, erwachsene: 2, kinder: 0,
      kinderAlter: [], zimmer: 1, artGenannt: true, flug: false, maxPreis: 170,
      verpflegung: "halb" };
    const kat = WK.katalog(pv);
    const vg = WK.vorgaben(pv, WK.filterAusStand(pv));
    const AW = vm.runInContext("typeof Auswahl !== 'undefined' ? Auswahl : null", ctx);
    const trf = AW ? AW.treffer(kat, vg) : [];
    const lf = { protokoll: [] };
    WK.engstelle(trf, pv, lf);
    const r = WK.engstelleRueckfrage(pv, lf);
    pruefe("Die Engstelle merkt sich die Rangliste",
      (lf.letzteEngstelle?.rang || []).length >= 2 ? "ja" : "nein", "ja");
    pruefe("Zur Wahl stehen mehrere Vorgaben",
      r && r.kandidaten?.length >= 2 ? "ja" : "nein", "ja");
    pruefe("Der Preis steht gestuft zur Wahl, nicht als Streichung",
      r && (r.kandidaten || []).some((k) => k.feld.startsWith("preis:")) ? "ja" : "nein", "ja");
    pruefe("Die Stufe hebt die Grenze an",
      r && (r.kandidaten || []).filter((k) => k.feld.startsWith("preis:")).every((k) => k.werte.maxPreis > 170) ? "ja" : "nein", "ja");
    /* Seit dem 19.11.2026 steht die Zahl hinter der HANDLUNG ("Die
       Region offen lassen: 51 Hotels") statt hinter der Vorgabe ("ohne
       sie 51") - mit gestuften Vorschlaegen passte die alte Form nicht
       mehr ("die Grenze auf 210 €, ohne sie 12"). */
    pruefe("Hinter jeder Moeglichkeit steht ihre eigene Zahl",
      r && (r.satz.match(/: (\d+|ein(e)?) \S+\./g) || []).length === (r.kandidaten || []).length
        ? "ja" : `${(r?.satz.match(/: (\d+|ein(e)?) \S+\./g) || []).length} von ${(r?.kandidaten || []).length}`, "ja");
    pruefe("Je Vorgabe ein Knopf, plus Behalten",
      r ? r.chips.length : 0, (r ? (r.kandidaten || []).length : 0) + 1);
    pruefe("Jeder Knopf lockert nur seine eigene Vorgabe",
      r && r.kandidaten?.length && r.kandidaten.every((k) => Object.keys(k.werte || {}).length >= 1) ? "ja" : "nein", "ja");
    pruefe("Hoechstens drei zur Wahl",
      r && r.kandidaten?.length && r.kandidaten.length <= 3 ? "ja" : "nein", "ja");
    /* Zwei Wuensche, die nur ZUSAMMEN die Liste leeren: Einzeln bringt
       keiner genug, die Gruppe schon. Dann darf die Frage nicht
       ausfallen - gemessen am 19.11.2026, als sie es tat. */
    const pEng = { ...pv, maxPreis: 200, ausstattung: ["pets", "spa"] };
    const trf2 = AW ? AW.treffer(WK.katalog(pEng), WK.vorgaben(pEng, WK.filterAusStand(pEng))) : [];
    const lf2 = { protokoll: [] };
    WK.engstelle(trf2, pEng, lf2);
    pruefe("Bringen die Wuensche einzeln nichts, faellt die Frage nicht aus",
      WK.engstelleRueckfrage(pEng, lf2) ? "gefragt" : "stumm", "gefragt");
  }

  /* Abschnitt 1 der Erhebung: die Kennzeichnung ist fest (19.11.2026)
     ------------------------------------------------------------------
     Ben am 19.11.2026: Die Stufe ohne Label soll erst im spaeteren Teil
     der Umfrage freigeschaltet werden. Begruendung bei
     STELLSCHRAUBEN.kennzeichnung. */
  {
    const kq = fs.readFileSync(alt && fs.existsSync(quelle + "kern.js") ? quelle + "kern.js" : B + "agent/kern.js", "utf8");
    const sq = fs.readFileSync(alt && fs.existsSync(quelle + "studie.js") ? quelle + "studie.js" : B + "agent/studie.js", "utf8");
    pruefe("Die Kennzeichnung wird nicht gelost",
      /kennzeichnung: "etikett",/.test(kq) ? "fest" : "gelost", "fest");
    pruefe("Die Tabelle haelt fest, ob gelost wurde",
      /gruppeKennzeichnungQuelle/.test(sq) ? "ja" : "nein", "ja");
    pruefe("Und die Auslosung setzt den Wert",
      /kennzeichnungQuelle = fest \? "fest" : "gelost"/.test(sq) ? "ja" : "nein", "ja");
  }

  /* Die ganze Reihenfolge, einmal durchgespielt (19.11.2026)
     ------------------------------------------------------------------
     Ben am 19.11.2026: "Da muessen wir uns auf jeden Fall sauber darauf
     verlassen koennen, dass da jetzt die aktuelle Reihenfolge gut ist."
     Also wird sie hier nicht in Einzelteilen geprueft, sondern am
     Stueck: Eine Person nennt die Eckdaten und antwortet auf jede Frage.
     Herauskommen muss:

       SUCHE, verpflegung, SUCHE, preis, SUCHE, ausstattung, anreise,
       gewichtung, VORSCHLAEGE

     Drei sichtbare Suchen waehrend der Beratung, die harte Frage erst
     nach einer davon und mit der Trefferzahl im Satz, die Gewichtung
     als letztes. Gegenprobe: _backup/19-11-trennung/ */
  if (WK && WK.fahrplan && WK.themenSatz) {
    const AW = vm.runInContext("typeof Auswahl !== 'undefined' ? Auswahl : null", ctx);
    const pr = { zielId: "mallorca", typ: "hotel", artGenannt: true, monat: 7, naechte: 7,
      erwachsene: 2, kinder: 0, kinderAlter: [], zimmer: 1, flug: false };
    const lr = { gespraech: [], gefragtWie: {}, besprochen: {}, protokoll: [],
      gesuchtMit: null, gefiltertMit: null, letzteTreffer: [], zugSeit: 1 };
    const ANTWORT = { verpflegung: (x) => { x.verpflegung = "halb"; },
      preis: (x) => { x.maxPreis = 200; }, ausstattung: (x) => { x.ausstattungEgal = true; },
      anreise: (x) => { x.anreise = "2027-07-10"; },
      gewichtung: (x) => { x.kriterien = [{ id: "essen", gewicht: 1 }]; x.gewichtungEgal = true; } };
    const ablauf = [];
    let ausstattungsSatz = "";
    for (let i = 0; i < 30; i++) {
      lr.zugSeit = i + 1;
      const fp = WK.fahrplan(pr, lr);
      if (WK.zwang(pr, lr) === "suchen" || fp.phase === "suche") {
        lr.gesuchtMit = fp.schluessel; lr.gefiltertMit = WK.filterSchluessel(pr);
        if (pr.vorgehen) lr.vorgehenFuer = fp.schluessel + pr.vorgehen;
        const t = AW ? AW.treffer(WK.katalog(pr), WK.vorgaben(pr, WK.filterAusStand(pr))) : [];
        lr.letzteTreffer = t.map((x) => x.id);
        ablauf.push("SUCHE"); continue;
      }
      if (fp.phase === "vorschlaege") { ablauf.push("VORSCHLAEGE"); break; }
      if (!fp.naechstes) { ablauf.push("SACKGASSE:" + fp.phase); break; }
      if (fp.naechstes === "ausstattung") {
        try { ausstattungsSatz = String(WK.themenSatz("ausstattung", pr, lr) || ""); } catch { ausstattungsSatz = ""; }
      }
      ablauf.push(fp.naechstes);
      lr.gefragtWie[fp.naechstes] = (lr.gefragtWie[fp.naechstes] || 0) + 1;
      lr.gefragtVorher = fp.naechstes; lr.frageBeantwortet = "ja";
      if (ANTWORT[fp.naechstes]) ANTWORT[fp.naechstes](pr);
      else { ablauf.push("UNERWARTET:" + fp.naechstes); break; }
    }
    pruefe("Die Reihenfolge der Beratung", ablauf.join(" "),
      "SUCHE verpflegung SUCHE preis SUCHE ausstattung anreise gewichtung VORSCHLAEGE");
    pruefe("Drei sichtbare Suchen in der Beratung",
      ablauf.filter((x) => x === "SUCHE").length, 3);
    pruefe("Die harte Frage nennt die Trefferzahl",
      /Es sind jetzt noch \d+ Hotels/.test(ausstattungsSatz) ? "ja" : ausstattungsSatz.slice(0, 60), "ja");
    pruefe("Die harte Frage sagt, dass Haeuser rausfallen",
      /fallen raus/.test(ausstattungsSatz) ? "ja" : "nein", "ja");
    pruefe("Die Gewichtung steht hinter der Ausstattung",
      ablauf.indexOf("gewichtung") > ablauf.indexOf("ausstattung") ? "ja" : "nein", "ja");
    pruefe("Und unmittelbar vor den Vorschlaegen",
      ablauf[ablauf.indexOf("VORSCHLAEGE") - 1], "gewichtung");
  }

  /* Einschneidende Vorgaben sagen, was sie kosten (19.11.2026)
     ------------------------------------------------------------------
     Ben am 19.11.2026: "Strandnaehe und so Aspekte sind ja auch schon
     wichtig, dass man die nennen kann. Gute Bewertung, oder ich moechte
     primaer Haeuser im Angebot haben. Aber das sollte halt immer klar
     gemacht werden, wenn das halt so einschneidende Sachen sind, was das
     dann bedeutet fuer die spaetere Auswahl."

     `aenderungsSatz` sprang nur an, wenn ein Wert sich AENDERTE - eine
     Vorgabe, die zum ersten Mal gesetzt wird, lief stumm durch. Und
     genau die schneidet am meisten weg.
     Gegenprobe: _backup/19-11-folgen/ */
  if (WK) {
    const bas = { zielId: "mallorca", typ: "hotel", artGenannt: true, monat: 7, naechte: 7,
      erwachsene: 2, kinder: 0, kinderAlter: [], zimmer: 1, flug: false };
    /* Nicht `if (WK.folgenSatz)`: In der Gegenprobe gibt es die Funktion
       nicht, und der ganze Block waere uebersprungen worden - eine
       gruene Gegenprobe, die nichts misst. Derselbe Fehler wie am
       17. und 18.11.2026. Also wird hier ein leerer Satz geliefert,
       und die Pruefungen fallen durch, wie sie sollen. */
    const sag = (feld, wert) => (typeof WK.folgenSatz === "function"
      ? WK.folgenSatz({ ...bas, [feld]: wert }, bas, [feld]) : "") || "";
    pruefe("Die Mindestnote sagt, was sie kostet",
      /Mit einer Note ab 4,5 bleiben \d+ Hotels statt \d+/.test(sag("mindestbewertung", 4.5)) ? "ja" : sag("mindestbewertung", 4.5).slice(0, 70), "ja");
    pruefe("Die Strandnaehe auch",
      /Mit höchstens 1 km zum Strand bleiben \d+/.test(sag("maxStrand", 1)) ? "ja" : "nein", "ja");
    /* "Nur Angebote" gibt es seit dem 19.11.2026 nicht mehr - Ben: "Einfach
       die Filterung nach Angebot raus und auch, dass manche Haeuser im
       Angebot sind. Es ist einfach kein Haus im Angebot." */
    pruefe("Nur Angebote gibt es nicht mehr",
      sag("nurAngebote", true) ? "doch" : "weg", "weg");
    pruefe("Die Sterne auch",
      /Mit mindestens 5 Sternen bleiben \d+/.test(sag("mindestSterne", 5)) ? "ja" : "nein", "ja");
    pruefe("Und sagt dazu, dass Haeuser rausfallen",
      /die anderen fallen damit raus/.test(sag("mindestbewertung", 4.5)) ? "ja" : "nein", "ja");
    /* Kein Satz, wo nichts passiert - sonst waere jede Angabe von einer
       Zahl begleitet, und die Ansage waere Laerm statt Auskunft. */
    pruefe("Eine Vorgabe ohne Wirkung bleibt stumm", sag("mindestbewertung", 3.0) || "stumm", "stumm");

    /* Und nichts doppelt: Wer einen Wert KORRIGIERT, bekommt den
       aenderungsSatz, nicht beides. */
    const korrigiert = WK.aenderungsSatz({ ...bas, mindestbewertung: 4.5 },
      { ...bas, mindestbewertung: 4.0 }, ["mindestbewertung"]) || "";
    pruefe("Eine Korrektur bekommt den alten Satz, nicht den neuen",
      /Mit einer Note/.test(korrigiert) ? "doppelt" : "einer", "einer");
    /* Die Grammatik: "Mit eine Note ab 4,5" stand am 19.11.2026 im
       ersten Bau, ebenso "Nur reduzierte Haeuser IST eine Bedingung". */
    for (const [f, w] of [["mindestbewertung", 4.5], ["maxStrand", 1], ["mindestSterne", 5]]) {
      pruefe(`Kein "Mit eine/ein" bei ${f}`, /Mit eine\b|Mit ein\b|Mit nur reduzierte\b|Mit mindestens \d+ Sterne\b/.test(sag(f, w)) ? "falsch" : "richtig", "richtig");
    }
  }

  /* Der Monat ist die letzte Stellschraube, nicht die erste (19.11.2026)
     ------------------------------------------------------------------
     Ben am 19.11.2026: "Die Frage, ob der Monat geaendert werden darf,
     soll natuerlich nicht kommen, wenn die Person schon festes
     Reisedatum angesagt hat, sondern nur, wenn sie flexibel war
     innerhalb des Monats. Und dann soll auch nicht irgendein random
     Monat empfohlen werden, sondern nur der naechste oder der davor.
     Insgesamt wuerde ich schon eher versuchen, nicht ueber den Monat
     das zu machen, sondern ueber andere Stellschrauben."

     Im ersten Bau stand der Monat gleichberechtigt im Wettbewerb nach
     Trefferzahl - und gewann damit oft, weil ein anderer Monat fast
     immer mehr Haeuser hat. Jetzt faellt er nur auf, wenn sonst
     hoechstens eine Stellschraube da ist.
     Gegenprobe: _backup/19-11-stufen/ */
  if (WK && WK.engstelleRueckfrage) {
    const lapp = (zusatz = {}) => {
      const p = { zielId: "lappland", typ: "hotel", artGenannt: true, monat: 5, naechte: 7,
        erwachsene: 2, kinder: 0, kinderAlter: [], zimmer: 1, flug: false, ...zusatz };
      return WK.engstelleRueckfrage(p, { letzteEngstelle: { feld: "ziel", ohne: 400, jetzt: 0 }, engstelleGefragt: {} });
    };
    const monate = (r) => (r?.kandidaten || []).filter((k) => k.feld.startsWith("monat:"));
    pruefe("Ohne festes Datum wird der Nachbarmonat angeboten",
      monate(lapp()).length ? "ja" : "nein", "ja");
    pruefe("Und zwar nur ein Nachbarmonat",
      monate(lapp()).every((k) => ["monat:4", "monat:6"].includes(k.feld)) ? "ja" : monate(lapp()).map((k) => k.feld).join(","), "ja");
    pruefe("Mit festem Anreisetag nicht",
      monate(lapp({ anreise: "2027-05-10" })).length ? "doch" : "nein", "nein");
    pruefe("Mit festem Zeitraum auch nicht",
      monate(lapp({ von: "2027-05-10", bis: "2027-05-17" })).length ? "doch" : "nein", "nein");
    /* Und er draengelt sich nicht vor: Wo zwei andere Stellschrauben
       etwas bringen, bleibt der Monat weg. Mallorca im Juli mit 200 m
       zum Strand - 1 km und 5 km bringen 14 und 20 Haeuser. */
    const strandR = WK.engstelleRueckfrage({ zielId: "mallorca", typ: "hotel", artGenannt: true,
      monat: 7, naechte: 7, erwachsene: 2, kinder: 0, maxStrand: 0.2 },
      { letzteEngstelle: { feld: "strand", ohne: 18, jetzt: 3 }, engstelleGefragt: {} });
    pruefe("Wo andere Stellschrauben reichen, bleibt der Monat weg",
      monate(strandR).length ? "doch" : "nein", "nein");
  }

  /* Was die Rangliste verspricht, muss lieferbar sein (19.11.2026)
     ------------------------------------------------------------------
     Im Live-Lauf vom 19.11.2026 stand der Agent bei drei Hotels
     (Mallorca, Juli, Halbpension, 200 € pro Nacht, Pool, Note ab 4,5).
     Die Rangliste meldete "ohne die Preisgrenze 11 Hotels" - angeboten
     wurde nur "Die Region offen lassen: 7 Hotels".

     Zwei Ursachen, beide hier festgehalten:
     1. `ENGSTELLE_LOCKERN.preis` war seit jeher 1,25 x Grenze. Ein
        "ganz offen" gab es fuer den Preis nie, die Rangliste rechnete
        aber damit.
     2. Eine Stufe mit winzigem Gewinn wurde gebaut, verhinderte damit
        den Rueckfall - und wurde danach vom Sieb doch verworfen.
     Gegenprobe: _backup/19-11-stufen/ */
  if (WK && WK.engstelleRueckfrage) {
    const eng = { zielId: "mallorca", typ: "hotel", artGenannt: true, monat: 7, naechte: 7,
      erwachsene: 2, kinder: 0, kinderAlter: [], zimmer: 1, flug: false, verpflegung: "halb",
      maxPreis: 200, mindestbewertung: 4.5, ausstattung: ["pool"],
      von: "2027-07-08", bis: "2027-07-15" };
    const AW2 = vm.runInContext("typeof Auswahl !== 'undefined' ? Auswahl : null", ctx);
    const tr = AW2 ? AW2.treffer(WK.katalog(eng), WK.vorgaben(eng, WK.filterAusStand(eng))) : [];
    const lf = { protokoll: [] };
    WK.engstelle(tr, eng, lf);
    const r = WK.engstelleRueckfrage(eng, lf);
    pruefe("Die Preisgrenze steht zur Wahl, wenn sie der Engpass ist",
      (r?.kandidaten || []).some((k) => k.feld.startsWith("preis")) ? "ja" : (r?.kandidaten || []).map((k) => k.feld).join(",") || "keine", "ja");
    pruefe("Und zwar als ganz offen, weil die Stufen zu wenig bringen",
      (r?.kandidaten || []).some((k) => k.feld === "preis:offen") ? "ja" : "nein", "ja");
    pruefe("Der Knopf heisst nicht \"Auf ohne Grenze\"",
      (r?.chips || []).some((c) => /^Auf ohne/.test(c)) ? "falsch" : "richtig", "richtig");
    /* Jede genannte Zahl muss auch erreichbar sein: Der Wert, den der
       Knopf setzt, muss wirklich so viele Haeuser ergeben. */
    pruefe("Jede genannte Zahl ist mit dem Knopf erreichbar",
      (r?.kandidaten || []).every((k) => {
        const probe = { ...eng, ...k.werte };
        for (const [f, w] of Object.entries(k.werte)) if (w == null) delete probe[f];
        /* Mit `katalogTreffer` gezaehlt, genau wie der Kern selbst -
           `Auswahl.treffer` nimmt einen anderen Weg und kommt auf
           andere Zahlen. Eine Pruefung, die anders rechnet als der Code,
           misst den Unterschied der Rechenwege, nicht den Fehler. */
        const n = WK.katalogTreffer(probe, WK.filterAusStand(probe)).length;
        return n === k.ohne;
      }) ? "ja" : "nein", "ja");
    /* Und die Vollform draengelt sich nicht vor, wo die Stufen reichen:
       Mallorca, Juli, 170 € - da bringen 190 € und 210 € genug. */
    const mild = { zielId: "mallorca", typ: "hotel", artGenannt: true, monat: 7, naechte: 7,
      erwachsene: 2, kinder: 0, kinderAlter: [], zimmer: 1, flug: false, maxPreis: 170, verpflegung: "halb" };
    const tr2 = AW2 ? AW2.treffer(WK.katalog(mild), WK.vorgaben(mild, WK.filterAusStand(mild))) : [];
    const lf2 = { protokoll: [] };
    WK.engstelle(tr2, mild, lf2);
    const r2 = WK.engstelleRueckfrage(mild, lf2);
    pruefe("Wo die Stufen reichen, kommt kein ganz offen",
      (r2?.kandidaten || []).some((k) => k.feld.endsWith(":offen")) ? "doch" : "nein", "nein");
    pruefe("Dort stehen die Stufen",
      (r2?.kandidaten || []).filter((k) => /^preis:\d/.test(k.feld)).length >= 2 ? "ja" : "nein", "ja");
  }

  /* Die Gewichtungsfrage schreibt Substantive gross (19.11.2026) */
  if (WK && WK.themenSatz) {
    const sg = WK.themenSatz("gewichtung",
      { kriterien: [{ id: "ruhe" }, { id: "essen" }], typ: "hotel" }, { gefragtWie: { gewichtung: 1 } });
    pruefe("Nicht \"neben ruhe und essen\"", /neben ruhe|neben essen/.test(String(sg)) ? "klein" : "gross", "gross");
    pruefe("Sondern mit Namen", /neben Ruhe und Essen/.test(String(sg)) ? "ja" : String(sg).slice(0, 60), "ja");
  }

  /* Funde aus Bens Lauf vom 19.11.2026, nachmittags.
     Gegenprobe: _backup/19-11-ben-lauf/ */
  if (WK && WK.werkzeuge && WK.werkzeuge.stand_merken) {
    const merke = async (args, profil, zusatzLauf = {}, saetze = []) => {
      const kern = { lauf: { profil, protokoll: [], gespraech: saetze.map((t, i) => ({ role: i % 2 ? "assistant" : "user", content: t })),
          verlauf: [], gefragtWie: {}, annahmeOffen: [], chips: null, ...zusatzLauf },
        notieren(e, d) { this.lauf.protokoll.push({ ereignis: e, ...d }); },
        sagen() {}, gespraechPush() {}, sichern() {}, logZeile() {}, standKurz: () => "",
        freigabe: () => "suchen", darf: () => false, standAnzeigen() {} };
      await WK.werkzeuge.stand_merken.call(WK, { frage_beantwortet: "ja", ...args }, kern);
      return kern;
    };
    const kalt = () => {
      const p = { monat: 4, naechte: 6, erwachsene: 3, kinder: 0, kinderAlter: [], artGenannt: true, artEgal: true, richtung: "kalt" };
      const th = (ctx.PO.THEMEN || []).find((t) => t.id === "kalt");
      p.zieleErlaubt = WK.regionenFuerRichtung(th, p);
      return p;
    };
    const gespr = ["Eher kalt", "Bis 20 Grad kämen Südtirol, New York, Mallorca und 3 weitere dazu. Bei 16 Grad bleiben oder auf 20 gehen?",
      "Gerne bis 20 gehen und noch kappstadt mit aufnehmen"];
    const lauf0 = (p) => ({ spanneOffen: { grenze: 16, weiter: 20 }, richtungRegionen: p.zieleErlaubt.slice() });

    // Kapstadt und 20 Grad in einem Satz
    {
      const p = kalt(); const k = await merke({ ziel: "kapstadt", mindestGrad: 20 }, p, lauf0(p), gespr);
      const l = p.zieleAuswahl || p.zieleErlaubt || [];
      pruefe("Kapstadt kommt trotz Tippfehler dazu", l.includes("kapstadt") ? "ja" : "nein", "ja");
      pruefe("Und die Regionen bis 20 Grad auch", l.includes("suedtirol") && l.includes("mallorca") ? "ja" : "nein", "ja");
      pruefe("Die kalten bleiben drin", l.includes("lappland") && l.includes("island") ? "ja" : "nein", "ja");
      pruefe("Der Agent sagt es an, mit Temperatur",
        /Kapstadt nehme ich wie gewünscht mit - dort sind es im April etwa \d+ Grad/.test((k.lauf.annahmeOffen || []).map((x) => x.text).join(" ")) ? "ja" : "nein", "ja");
    }
    {
      const p = kalt(); await merke({ zieleAuswahl: ["kapstadt"] }, p, lauf0(p), gespr);
      pruefe("Auch wenn das Modell Kapstadt als Liste schickt",
        (p.zieleAuswahl || []).includes("kapstadt") && (p.zieleAuswahl || []).includes("suedtirol") ? "ja" : "nein", "ja");
    }
    {
      const p = kalt(); await merke({}, p, lauf0(p), gespr);
      pruefe("Bis 20 ohne das Wort Grad kommt an, auch ohne Modell",
        p.mindestGrad === 20 && (p.zieleErlaubt || []).includes("suedtirol") ? "ja" : `${p.mindestGrad}`, "ja");
    }
    {
      const p = kalt(); await merke({ mindestGrad: 20 }, p, {}, ["wir sind 20 Leute"]);
      pruefe("Ohne offene Frage und ohne Grad bleibt die Sperre", p.mindestGrad ?? "nicht gesetzt", "nicht gesetzt");
    }
    pruefe("Ein Buchstabe Unterschied zaehlt als genannt",
      WK.regionGenannt({ gespraech: [{ role: "user", content: "noch kappstadt" }] }, "kapstadt") ? "ja" : "nein", "ja");
    pruefe("Bei kurzen Namen nicht",
      WK.regionGenannt({ gespraech: [{ role: "user", content: "nach krebi" }] }, "krabi") ? "doch" : "nein", "nein");
    pruefe("Und kein Teilwort",
      WK.regionGenannt({ gespraech: [{ role: "user", content: "nach Südtirol" }] }, "tirol") ? "doch" : "nein", "nein");

    // Pool als Bedingung steht nicht zusaetzlich als Wunsch da
    {
      const p = { typ: "hotel", artGenannt: true, monat: 7, erwachsene: 2, kinder: 0, naechte: 7, zielId: "mallorca" };
      await merke({ ausstattung: ["pool"], wuensche: ["pool"] }, p, { gefragtVorher: "ausstattung" }, ["Pool"]);
      pruefe("Pool steht nur noch als Muss", (p.kriterien || []).some((k) => k.id === "pool") ? "doppelt" : "einmal", "einmal");
      pruefe("Die Gewichtung beginnt danach offen",
        /Bei der Analyse der Bewertungen/.test(String(WK.themenSatz("gewichtung", p, { gefragtWie: {} }))) ? "offen" : "nachgehakt", "offen");
    }
    // Ein Wunsch ohne Merkmal wird nicht verschluckt
    {
      const p = { typ: "hotel", artGenannt: true, monat: 7, erwachsene: 2, kinder: 0, naechte: 7 };
      const k = await merke({ wunsch_unbekannt: ["Hollywood-Schaukel"] }, p, {}, ["hollywood schaukel"]);
      pruefe("Hollywood-Schaukel wird als nicht filterbar gemeldet",
        k.lauf.protokoll.some((e) => e.ereignis === "wunsch_ohne_feld" && (e.wuensche || []).includes("Hollywood-Schaukel")) ? "ja" : "nein", "ja");
    }
  }
  {
    // Anreisetag auch mit Flug
    const fp = WK.fahrplan({ typ: "hotel", artGenannt: true, monat: 4, naechte: 6, erwachsene: 3, kinder: 0, flug: true }, { gefragtWie: {} });
    pruefe("Mit Flug wird der Anreisetag gefragt", fp.fertig.anreise ? "uebersprungen" : "gefragt", "gefragt");
    // FAQ: eine Frage mit Treffer erzwingt das sichtbare Nachschlagen
    const fq = { gespraech: [{ role: "user", content: "Wie viele Hotels bietet ihr an?" }], nachrichtArt: "frage", gefragtWie: {} };
    pruefe("Eine Frage zum Angebot fuehrt ins FAQ", WK.zwang({ typ: "hotel" }, fq), "faq_nachschlagen");
    pruefe("Nur einmal je Nachricht", WK.zwang({ typ: "hotel" }, fq) === "faq_nachschlagen" ? "nochmal" : "einmal", "einmal");
    const fa = { gespraech: [{ role: "user", content: "Halbpension" }], nachrichtArt: "antwort", gefragtWie: {} };
    pruefe("Eine Antwort fuehrt nicht ins FAQ", WK.zwang({ typ: "hotel" }, fa) === "faq_nachschlagen" ? "doch" : "nein", "nein");
    pruefe("Zu Feiertagen steht etwas im FAQ",
      typeof ctx.faqSuchen === "function" || vm.runInContext("typeof faqSuchen", ctx) === "function"
        ? (vm.runInContext("faqSuchen('fliegt ihr auch über Feiertage?', 1)", ctx)[0]?.id || "nichts") : "keine Suche", "f-feiertage");
  }
  {
    const lies = (d) => fs.readFileSync(alt && fs.existsSync(quelle + d.split("/").pop()) ? quelle + d.split("/").pop() : B + d, "utf8");
    const kq = lies("agent/kern.js"), sq = lies("agent/studie.js"), wq = lies("agent/werkzeugkasten.js");
    pruefe("Nach 'mehr vergleichen' wird die Anzahl erfragt", /Wie viele möchtest du vergleichen - 4, 5 oder 6\?/.test(kq) ? "ja" : "nein", "ja");
    pruefe("Und die gewaehlte Zahl gesetzt", /profil\.anzahlVorschlaege = zahl;/.test(kq) ? "ja" : "nein", "ja");
    pruefe("Das Konto laesst sich ueberspringen", /data-ueberspringen/.test(sq) ? "ja" : "nein", "ja");
    pruefe("Kein Kontofeld ist Pflicht", /name="(vorname|nachname|mail)"[^>]*required/.test(sq) ? "Pflicht" : "frei", "frei");
    pruefe("Kein Angebotsfeld mehr im Modell", /nurAngebote: \{ type/.test(wq) ? "noch da" : "weg", "weg");
    pruefe("Keine alten Preise in den Daten", /oldPrice:/.test(fs.readFileSync(B + "data/hotels.js", "utf8")) ? "noch da" : "weg", "weg");
    pruefe("Die Hausseite passt neben den Chat", /\.app-main > \*, \.app-main \.wrap \{ min-width: 0; \}/.test(fs.readFileSync(B + "style.css", "utf8")) ? "ja" : "nein", "ja");
  }

  /* Funde aus Bens Lauf vom 20.11.2026. Gegenprobe: _backup/20-11-ben/ */
  if (WK && WK.werkzeuge && WK.werkzeuge.stand_merken) {
    const p = { monat: 7, naechte: 13, erwachsene: 3, kinder: 0, kinderAlter: [], artGenannt: true, artEgal: true, richtung: "kalt" };
    p.zieleErlaubt = WK.regionenFuerRichtung((ctx.PO.THEMEN || []).find((t) => t.id === "kalt"), p);
    const gespr = [{ role: "user", content: "Eher kalt" }, { role: "assistant", content: "Bei 21 Grad bleiben oder auf 25 gehen?" },
      { role: "user", content: "bis 25 grade gehen und noch malle kappstadt ergänzen" }];
    const kern = { lauf: { profil: p, protokoll: [], gespraech: gespr, verlauf: [], gefragtWie: {}, annahmeOffen: [], chips: null,
        spanneOffen: { grenze: 21, weiter: 25 }, richtungRegionen: p.zieleErlaubt.slice() },
      notieren(e, d) { this.lauf.protokoll.push({ ereignis: e, ...d }); }, sagen() {}, gespraechPush() {}, sichern() {}, logZeile() {},
      standKurz: () => "", freigabe: () => "suchen", darf: () => false, standAnzeigen() {} };
    await WK.werkzeuge.stand_merken.call(WK, { frage_beantwortet: "ja", zieleAuswahl: ["mallorca", "kapstadt"] }, kern);
    const nach1 = (p.zieleAuswahl || p.zieleErlaubt || []).slice();
    pruefe("Malle und Kappstadt kommen zu den kalten dazu",
      nach1.includes("mallorca") && nach1.includes("kapstadt") && nach1.includes("island") ? "ja" : nach1.join(","), "ja");
    kern.lauf.gespraech.push({ role: "assistant", content: "Soll ein Flug dazu?" }, { role: "user", content: "Mit Flug" });
    await WK.werkzeuge.stand_merken.call(WK, { frage_beantwortet: "ja", flug: true, zieleAuswahl: ["kapstadt"] }, kern);
    pruefe("Schickt das Modell spaeter nur Kapstadt, bleibt die Liste",
      (p.zieleAuswahl || []).length === nach1.length ? "bleibt" : (p.zieleAuswahl || []).join(","), "bleibt");
    kern.lauf.gespraech.push({ role: "assistant", content: "..." }, { role: "user", content: "doch lieber nur Kapstadt" });
    await WK.werkzeuge.stand_merken.call(WK, { frage_beantwortet: "ja", zieleAuswahl: ["kapstadt"] }, kern);
    pruefe("'lieber nur Kapstadt' ersetzt die Liste", (p.zieleAuswahl || []).join(","), "kapstadt");
    const band = ctx.PO.eckdaten({ richtung: "kalt", zieleErlaubt: ["island", "ostsee"] }).find((z) => z.feld === "Ziel")?.wert || "";
    pruefe("Das Band nennt die Regionen hinter der Richtung", /Island/.test(band) && /Ostsee/.test(band) ? "ja" : band, "ja");
  }
  {
    const wz = fs.readFileSync(alt && fs.existsSync(quelle + "werkzeuge.js") ? quelle + "werkzeuge.js" : B + "agent/werkzeuge.js", "utf8");
    const kq = fs.readFileSync(alt && fs.existsSync(quelle + "kern.js") ? quelle + "kern.js" : B + "agent/kern.js", "utf8");
    const cq = fs.readFileSync(alt && fs.existsSync(quelle + "components.js") ? quelle + "components.js" : B + "components.js", "utf8");
    const sq = fs.readFileSync(alt && fs.existsSync(quelle + "stay.js") ? quelle + "stay.js" : B + "stay.js", "utf8");
    pruefe("Ein fremdes Suchwort wird geleert", /hinweis: "Suchfeld leeren"/.test(wz) ? "ja" : "nein", "ja");
    pruefe("Eigene Aenderungen der Person werden bemerkt", /seite_von_person_geaendert/.test(kq) ? "ja" : "nein", "ja");
    pruefe("Jede Seite beginnt oben", /history\.scrollRestoration = "manual"/.test(cq) ? "ja" : "nein", "ja");
    pruefe("Die Hausseite hat einen Zurueck-Pfeil", /id="zurueckZurListe"/.test(sq) ? "ja" : "nein", "ja");
    pruefe("Der Agent nimmt den Pfeil", /this\.finde\("#zurueckZurListe"\)/.test(wz) ? "ja" : "nein", "ja");
  }

  /* Allgemeinwissen: in beiden Armen nur Chat, kein Arbeitsmodus
     (20.11.2026). Ben: "Er darf dann bei beiden Ansichten nicht in den
     Agentenmodus gehen - nicht das Arbeitsfenster oeffnen und nicht aktiv
     etwas auf der Seite machen." Gegenprobe: _backup/20-11-ben/ */
  {
    const p = { typ: "hotel", artGenannt: true, monat: 7, naechte: 7, erwachsene: 2, kinder: 0, kinderAlter: [], zielOffen: true, flug: false };
    const fall = (art, text) => WK.zwang(p, { gespraech: [{ role: "user", content: text }], nachrichtArt: art, gefragtWie: {}, gesuchtMit: null });
    pruefe("Ohne Frage waere eine Suche faellig", fall("antwort", "Juli, zu zweit, eine Woche"), "suchen");
    pruefe("Eine Frage aus Allgemeinwissen erzwingt keine Suche",
      fall("frage", "Ist Lüneburg eigentlich eine schöne Stadt?") ?? "nichts", "nichts");
    /* Grenzfall: Enthaelt die Frage ein FAQ-Thema ("Flughafen"), wird im
       FAQ nachgeschlagen - echte Daten der Seite, in beiden Armen gleich
       (Arm B verdeckt, Arm A sieht zu). */
    pruefe("Mit FAQ-Thema wird nachgeschlagen, in beiden Armen gleich",
      fall("frage", "Welcher Flughafen liegt am nächsten an Lüneburg?"), "faq_nachschlagen");
    pruefe("Eine Frage mit FAQ-Eintrag fuehrt weiter ins FAQ",
      fall("frage", "Fliegt ihr auch an Feiertagen?"), "faq_nachschlagen");
    const aq = fs.readFileSync(B + "api/agent.js", "utf8");
    pruefe("Der Agent sagt, dass es allgemeines Wissen ist", /Aus allgemeinem Wissen, nicht von der Seite/.test(aq) ? "ja" : "nein", "ja");
    pruefe("Und ruft dafuer kein Werkzeug ausser stand_merken", /rufst du ausser stand_merken KEIN Werkzeug/.test(aq) ? "ja" : "nein", "ja");
    const sieb = vm.runInContext("Kern.UEBER_DIE_SEITE", ctx);
    pruefe("Der Satz wird vor der ersten Suche nicht gestrichen",
      sieb.test("Aus allgemeinem Wissen, nicht von der Seite: Von Lüneburg ist Hamburg der nächste Flughafen.") ? "gestrichen" : "bleibt", "bleibt");
  }

  /* "Ja, August" wurde zu Dezember (20.11.2026, abends). Der Monats-
     vorschlag war gemerkt, aber nie im Chat zu sehen - dort stand "Meinst
     du August?". Und "Ja, August" galt als Ja zum Vorschlag.
     Gegenprobe: _backup/20-11-abend/ */
  if (KN && typeof KN.vorschlagJaLesen === "function") {
    const kj = (letzte, t) => {
      const k = Object.create(KN);
      k.lauf = { profil: { monat: null }, protokoll: [], gespraech: [{ role: "assistant", content: letzte }],
        vorschlagOffen: { thema: "zeit", werte: { monat: 12 }, text: "Dezember" }, chipWirkung: null };
      k.notieren = function (e, d) { this.lauf.protokoll.push({ ereignis: e, ...d }); };
      k.sichern = () => {}; k.standAnzeigen = () => {};
      const ok = k.vorschlagJaLesen(t);
      return { ok, monat: k.lauf.profil.monat };
    };
    pruefe("'Ja, August' auf 'Meinst du August?' setzt keinen Dezember",
      kj("Meinst du August?", "Ja, August").monat ?? "nichts", "nichts");
    pruefe("Auch ein reines Ja nicht, wenn der Vorschlag nie im Chat stand",
      kj("Meinst du August?", "ja").monat ?? "nichts", "nichts");
    pruefe("Ja mit eigenem Wert ist kein Ja zum Vorschlag",
      kj("Damit ich weitermachen kann: Soll ich mit Dezember rechnen?", "Ja, aber lieber August").monat ?? "nichts", "nichts");
    pruefe("Ein reines Ja auf den sichtbaren Vorschlag wirkt",
      kj("Damit ich weitermachen kann: Soll ich mit Dezember rechnen, oder möchtest du etwas anderes?", "Ja gerne").monat, 12);
    const satzZeit = WK.vorschlagText("zeit", { monat: 12 });
    pruefe("Kein 'mit den Dezember'", /^den /.test(satzZeit) ? "falsch" : satzZeit, "Dezember");
  } else {
    pruefe("'Ja, August' auf 'Meinst du August?' setzt keinen Dezember", "Funktion fehlt", "nichts");
  }

  /* Haenger nach Seitenwechsel (20.11.2026, abends). Gemeldet: "Er hat
     ewig geladen, ich habe rumgeklickt, dann ist nichts mehr passiert."
     Wechselt die Seite, waehrend der Kern auf das Modell wartet, geht der
     Zug verloren: Die letzte Nachricht im Gespraech ist die der Person,
     eine Antwort kommt nie. Die neue Seite nimmt den Zug wieder auf.
     Gegenprobe: _backup/20-11-abend/ */
  if (KN && typeof KN.zugUnterbrochen === "function") {
    const ku = (gespraech, extra = {}) => {
      const k = Object.create(KN);
      k.lauf = { gespraech, ...extra }; k.laeuft = false; k.istAngehalten = () => false;
      return k.zugUnterbrochen() ? "aufnehmen" : "ruhig";
    };
    pruefe("Letzte Nachricht von der Person: Zug wird aufgenommen",
      ku([{ role: "assistant", content: "Wann?" }, { role: "user", content: "Im Juli" }]), "aufnehmen");
    pruefe("Werkzeugergebnis ohne Antwort: Zug wird aufgenommen",
      ku([{ role: "user", content: "x" }, { role: "assistant", content: null, tool_calls: [{}] }, { role: "tool", content: "{}" }]), "aufnehmen");
    pruefe("Agent hat geantwortet: nichts aufnehmen",
      ku([{ role: "user", content: "Im Juli" }, { role: "assistant", content: "Wie lange?" }]), "ruhig");
    pruefe("Laufende Kette (ausstehend) bleibt beim alten Weg",
      ku([{ role: "user", content: "x" }], { ausstehend: { a: 1 } }), "ruhig");
    pruefe("Angehalten: nichts aufnehmen",
      ku([{ role: "user", content: "x" }], { stumm: true }), "ruhig");
    const kq = fs.readFileSync(alt && fs.existsSync(quelle + "kern.js") ? quelle + "kern.js" : B + "agent/kern.js", "utf8");
    pruefe("Die Seite ruft die Wiederaufnahme beim Laden",
      /else if \(this\.zugUnterbrochen\(\)\)/.test(kq) ? "ja" : "nein", "ja");
  } else {
    pruefe("Letzte Nachricht von der Person: Zug wird aufgenommen", "Funktion fehlt", "aufnehmen");
  }

  /* Modellaufruf mit Zeitgrenze im Browser: Ein haengender Aufruf darf
     nicht endlos "denkt" zeigen. */
  {
    const mq = fs.readFileSync(alt && fs.existsSync(quelle + "modell.js") ? quelle + "modell.js" : B + "agent/modell.js", "utf8");
    pruefe("Modellaufruf hat eine Zeitgrenze",
      /signal: abbruch\.signal/.test(mq) && /ZEITGRENZE_MS:\s*\d+/.test(mq) ? "ja" : "nein", "ja");
  }

  /* FAQ-Seite zeigte Quelltext (20.11.2026, abends): Antworten, die
     Funktionen sind, landeten als "() => { ... }" auf der Seite. Und
     einige Antworten klangen wie Anweisungen an den Bot. */
  {
    /* In den Sicherungen liegt data/faq.js flach als "faq.js" und
       ueberdeckt die Seitendatei gleichen Namens - dann gilt die Seite
       aus dem Projekt (21.11.2026, Fehlalarm in der Gegenprobe). */
    const fqFlach = alt && fs.existsSync(quelle + "faq.js") ? fs.readFileSync(quelle + "faq.js", "utf8") : null;
    const fq = fqFlach && !/const FAQ = \[/.test(fqFlach) ? fqFlach : fs.readFileSync(B + "faq.js", "utf8");
    pruefe("FAQ-Seite ruft Funktionsantworten auf",
      /typeof e\.antwort === "function" \? String\(e\.antwort\(\)\)/.test(fq) ? "ja" : "nein", "ja");
    const liste = vm.runInContext("FAQ.map((e) => ({ id: e.id, t: typeof e.antwort === 'function' ? String(e.antwort()) : String(e.antwort || '') }))", ctx);
    const schlecht = liste.filter((e) => /=>|\bfunction\b|\$\{|\bundefined\b|\bnull\b|\bNaN\b|sehe ich nach|sag mir|frag mich|Regler/i.test(e.t));
    pruefe("Keine FAQ-Antwort mit Code oder Bot-Anweisung", schlecht.map((e) => e.id).join(", ") || "keine", "keine");
    const wq2 = fs.readFileSync(alt && fs.existsSync(quelle + "werkzeugkasten.js") ? quelle + "werkzeugkasten.js" : B + "agent/werkzeugkasten.js", "utf8");
    pruefe("FAQ wird ueber den Reiter 'Fragen' geoeffnet",
      /\.header-action\[href='faq\.html'\]/.test(wq2) ? "ja" : "nein", "ja");
  }

  /* Kein Streichpreis auf den Karten (20.11.2026): Ein durchgestrichener
     Normalpreis wirkt wie ein Angebot und waere ein Kaufanreiz neben dem
     Agenten. Gegenprobe: _backup/20-11-saisonpreis/ */
  {
    const rq = fs.readFileSync(alt && fs.existsSync(quelle + "results.js") ? quelle + "results.js" : B + "results.js", "utf8");
    pruefe("Karten zeigen keinen durchgestrichenen Preis", /class="price-old"/.test(rq) ? "Streichpreis" : "keiner", "keiner");
  }

  /* Suche ueber die Maske ohne Agent (20.11.2026): Filterspalte auf dem
     neuen Monat, Rueckweg mit der neuen Adresse, Zuruecksetzen gemerkt,
     Reiter nehmen die Suche mit. Gegenprobe: _backup/20-11-suche/ */
  {
    const rq = fs.readFileSync(alt && fs.existsSync(quelle + "results.js") ? quelle + "results.js" : B + "results.js", "utf8");
    const cq = fs.readFileSync(alt && fs.existsSync(quelle + "components.js") ? quelle + "components.js" : B + "components.js", "utf8");
    const abschnitt = rq.slice(rq.indexOf("onSubmit: (query)"), rq.indexOf("onSubmit: (query)") + 2600);
    pruefe("Nach 'Suchen' wird die Filterspalte neu gezeichnet", /renderFilters\(\); renderFlightAddon\(\); renderResults\(\);/.test(abschnitt) ? "ja" : "nein", "ja");
    pruefe("Nach 'Suchen' merkt sich der Rueckweg die neue Adresse", /Rueckweg\.merken\(\)/.test(abschnitt) ? "ja" : "nein", "ja");
    const reset = rq.slice(rq.indexOf('#fReset").addEventListener'), rq.indexOf('#fReset").addEventListener') + 900);
    pruefe("'Filter zuruecksetzen' wird gespeichert", /filterMerken\(\)/.test(reset) ? "ja" : "nein", "ja");
    pruefe("Reiter nehmen die Suche mit", /reiterSetzen\(\)\s*\{/.test(cq) && /Rueckweg\.reiterSetzen\(\)/.test(cq) ? "ja" : "nein", "ja");
    /* Ablauf im Kleinen: Reiter-Links aus einer gemerkten Suche */
    if (/reiterSetzen\(\)\s*\{/.test(cq)) {
      const links = ["results.html?type=unterkunft", "results.html?type=hotel"].map((h) => {
        const a = { dataset: {}, h, getAttribute() { return this.h; }, setAttribute(_, v) { this.h = v; } }; return a; });
      const c2 = { location: { pathname: "/stay.html", search: "?id=h1" }, URLSearchParams,
        sessionStorage: { getItem: () => "?type=unterkunft&q=mallorca&from=2027-05-22&to=2027-05-29" },
        document: { querySelectorAll: () => links } };
      vm.createContext(c2);
      const rw = cq.slice(cq.indexOf("const Rueckweg = {"), cq.indexOf("const Flug = {"));
      vm.runInContext(rw + ";Rueckweg.reiterSetzen();", c2);
      pruefe("Reiter 'Hotels' behaelt Ziel und Daten", links[1].h, "results.html?type=hotel&q=mallorca&from=2027-05-22&to=2027-05-29");
    } else {
      pruefe("Reiter 'Hotels' behaelt Ziel und Daten", "Funktion fehlt", "results.html?type=hotel&q=mallorca&from=2027-05-22&to=2027-05-29");
    }
  }

  /* Arbeit auf der Seite (21.11.2026). Die Bewegungen selbst sind im
     Browser gemessen (Playwright, drei Fenstergroessen); hier steht, dass
     der Code die Stellen noch hat, an denen die Fehler lagen.
     Gegenprobe: _backup/21-11-morgen/ */
  {
    const lies = (name, pfad) => fs.readFileSync(alt && fs.existsSync(quelle + name) ? quelle + name : B + pfad, "utf8");
    const wz = lies("werkzeuge.js", "agent/werkzeuge.js");
    const ze = lies("zeiger.js", "agent/zeiger.js");
    const wk = lies("werkzeugkasten.js", "agent/werkzeugkasten.js");
    const rs = lies("results.js", "results.js");
    const sd = wz.slice(wz.indexOf("async scrollDurch("), wz.indexOf("async strecke(", wz.indexOf("async scrollDurch(")));
    pruefe("Liste rollt fliessend (feste Geschwindigkeit, kein Sprung je Schritt)",
      /const geschwindigkeit = /.test(sd) && !/y = Math\.min\(bis, y \+ schritt\)/.test(sd) ? "ja" : "nein", "ja");
    pruefe("Waehrend eines Halts setzt der Takt den Zeiger nicht",
      /setInterval\(\(\) => \{ if \(imHalt\) return;/.test(sd) ? "ja" : "nein", "ja");
    pruefe("Zeiger gleitet zur Ruhestelle statt zu springen", /const zurRuhe = async/.test(sd) ? "ja" : "nein", "ja");
    pruefe("Nach dem Filter: Suchen klicken und Zahl ablesen statt Scan",
      /async trefferZahlZeigen\(\)/.test(wz) && /ueberflogenFuer === lageJetzt/.test(wk) ? "ja" : "nein", "ja");
    pruefe("Zielen erst, wenn das Element selbst stillsteht",
      /await this\.warteBisRuhig\(el\);/.test(ze.slice(ze.indexOf("async insBlickfeld"), ze.indexOf("async insBlickfeld") + 1500)) ? "ja" : "nein", "ja");
    pruefe("Klick zielt nach, wenn sich das Ziel bewegt hat",
      /ziel = await this\.nachzielen\(el, ziel\)/.test(ze) && /ziel = await Zeiger\.nachzielen\(zeile, ziel\)/.test(wz) ? "ja" : "nein", "ja");
    pruefe("Nach dem Filtern zurueck zur Trefferzahl", /Zurueck zur Trefferzahl, ruhig/.test(wz) ? "ja" : "nein", "ja");
    pruefe("Filterzahlen je Gruppe einmal gerechnet", /const _zaehlSpeicher = /.test(rs) ? "ja" : "nein", "ja");
    const faq = wk.slice(wk.indexOf("async faq_nachschlagen("), wk.indexOf("async faq_nachschlagen(") + 4000);
    const iSpeichern = faq.search(/ausstehend\.stufe = 2;\s*kern\.sichern\(\);/), iKlick = faq.indexOf("Zeiger.klicke(link");
    pruefe("FAQ: Rueckweg gespeichert, bevor geklickt wird", iSpeichern > 0 && iSpeichern < iKlick ? "ja" : "nein", "ja");
    pruefe("Art wechseln ueber den Reiter statt ueber die Startseite",
      /async reiterWechseln\(typ\)/.test(wz) && /Werkzeuge\.reiterWechseln\(Werkzeugkasten\.seitenTyp\(p\)\)/.test(wk) ? "ja" : "nein", "ja");
  }

  /* "Seid ihr zwei Erwachsene?" - "Ja, genau" - und trotzdem zweimal
     nachgefragt (21.11.2026). Gegenprobe: _backup/21-11-morgen/ */
  if (KN && typeof KN.rueckfrageJaLesen === "function") {
    const rj = (t, extra = {}) => {
      const k = Object.create(KN);
      k.lauf = { profil: { erwachsene: 2 }, protokoll: [], gespraech: [{ role: "assistant", content: "Kurz zur Sicherheit: Ich habe dich so verstanden, dass ihr zwei Erwachsene seid. Stimmt das?" }],
        rueckfrageOffen: { feld: "erwachsene", wert: 2 }, ...extra };
      k.notieren = function (e, d) { this.lauf.protokoll.push({ ereignis: e, ...d }); };
      k.sichern = () => {}; k.standAnzeigen = () => {};
      k.rueckfrageJaLesen(t);
      return k.lauf.profil;
    };
    pruefe("'Ja, genau' setzt 2 Erwachsene und 0 Kinder", JSON.stringify([rj("Ja, genau").erwachsene, rj("Ja, genau").kinder]), "[2,0]");
    pruefe("'ja' genauso", rj("ja").kinder, 0);
    pruefe("'Stimmt.' genauso", rj("Stimmt.").kinder, 0);
    pruefe("'Ja, aber mit Kind' setzt nichts (geht ans Modell)", rj("Ja, aber mit Kind").kinder ?? "offen", "offen");
    pruefe("'3 Erwachsene' setzt nichts (geht ans Modell)", rj("3 Erwachsene").kinder ?? "offen", "offen");
    pruefe("Andere Rueckfrage offen: nichts", rj("ja", { rueckfrageOffen: { feld: "naechte", wert: 7 } }).kinder ?? "offen", "offen");
    pruefe("Genannte Kinder bleiben", rj("ja", { profil: { erwachsene: 2, kinder: 1 } }).kinder, 1);
    const fertig = rj("Ja, genau");
    pruefe("Danach gilt das Thema Reisende als erledigt", fertig.erwachsene != null && fertig.kinder != null ? "erledigt" : "offen", "erledigt");
    pruefe("Nur Kinder offen: Frage nach Kindern", WK.themenSatz("reisende", { erwachsene: 2 }, { gefragtWie: {} }), "Reist auch ein Kind mit?");
    pruefe("Nichts bekannt: wie bisher", WK.themenSatz("reisende", {}, { gefragtWie: {} }), "Wer reist mit?");
    pruefe("Karten passend zur Kinderfrage", WK.THEMEN.reisende.chips({ erwachsene: 2 }), "Keine Kinder | 1 Kind | 2 Kinder");
  } else {
    pruefe("'Ja, genau' setzt 2 Erwachsene und 0 Kinder", "Funktion fehlt", "[2,0]");
  }

  /* Preiswarnung und null Treffer (21.11.2026), Bens Lage: April, acht
     warme Regionen, 9 Naechte, zu zweit, Fruehstueck, Flug ab Duesseldorf.
     Gegenprobe: _backup/21-11-morgen/ */
  if (WK && typeof WK.preisWarnung === "function") {
    const warm = ["krabi", "marrakesch", "teneriffa", "kapstadt", "kreta", "algarve", "lissabon", "kyoto"];
    const ben = { monat: 4, naechte: 9, erwachsene: 2, kinder: 0, typ: "hotel", flug: true, flugAb: "Düsseldorf", flugKlasse: "economy",
      verpflegung: "fruehstueck", zieleErlaubt: warm, vonPerson: { maxPreis: true } };
    const w70 = WK.preisWarnung({ ...ben, maxPreis: 70 }, { protokoll: [] });
    pruefe("70 €: Warnung mit Durchschnitt und Empfehlung", w70 && /Hälfte der Hotels bis \d+ € pro Nacht/.test(w70.satz) && /Ich würde eher bis \d+ € suchen/.test(w70.satz) ? "ja" : "nein", "ja");
    pruefe("70 €: drei Wege (Empfehlung, vorsichtig, bleiben)", w70 ? w70.chips.length : 0, 3);
    pruefe("70 €: 'Bleiben' setzt nichts", w70 ? JSON.stringify(w70.wirkung[w70.chips[2]]) : "", "{}");
    pruefe("120 €: keine Warnung", WK.preisWarnung({ ...ben, maxPreis: 120 }, { protokoll: [] }) ? "warnt" : "still", "still");
    pruefe("Schon gewarnt: still", WK.preisWarnung({ ...ben, maxPreis: 70 }, { protokoll: [], preisGewarnt: { 70: true } }) ? "warnt" : "still", "still");
    pruefe("Preis nicht von der Person: still", WK.preisWarnung({ ...ben, maxPreis: 70, vonPerson: {} }, { protokoll: [] }) ? "warnt" : "still", "still");
    // Null Treffer: kein "nur 0", und einmal mehr fragen, auch wenn die Vorgabe schon gefragt war
    const leer = { ...ben, maxPreis: 70, ausstattung: ["pool"] };
    const l0 = { protokoll: [] };
    WK.engstelle(WK.katalogTreffer(leer, WK.filterAusStand(leer)), leer, l0);
    const f0 = WK.engstelleRueckfrage(leer, l0);
    pruefe("0 Treffer: Rueckfrage kommt", f0 ? "ja" : "nein", "ja");
    pruefe("0 Treffer: kein 'nur 0'", f0 && !/nur 0\b/.test(f0.satz) ? "ja" : "nein", "ja");
    const l1 = { ...l0, engstelleGefragt: { [l0.letzteEngstelle?.feld]: true } };
    pruefe("0 Treffer, Vorgabe schon gefragt: einmal mehr", WK.engstelleRueckfrage(leer, l1) ? "fragt" : "still", "fragt");
    const l2 = { ...l1, engstelleGefragt: { ...l1.engstelleGefragt, leer: true } };
    pruefe("Danach nicht noch einmal (keine Schleife)", WK.engstelleRueckfrage(leer, l2) ? "fragt" : "still", "still");
    const kq = fs.readFileSync(alt && fs.existsSync(quelle + "kern.js") ? quelle + "kern.js" : B + "agent/kern.js", "utf8");
    pruefe("Kern: Preiswarnung vor der Engstelle", /const pw = [^\n]*preisWarnung[\s\S]{0,900}const ef = kernFrage \? null : Werkzeugkasten\.engstelleRueckfrage/.test(kq) ? "ja" : "nein", "ja");
    const wq3 = fs.readFileSync(alt && fs.existsSync(quelle + "werkzeugkasten.js") ? quelle + "werkzeugkasten.js" : B + "agent/werkzeugkasten.js", "utf8");
    pruefe("Beratungssuche mit wenigen Treffern rechnet die Engstelle neu", /kern\.notieren\("engstelle_in_beratung"/.test(wq3) ? "ja" : "nein", "ja");
  } else {
    pruefe("70 €: Warnung mit Durchschnitt und Empfehlung", "Funktion fehlt", "ja");
  }

  /* Feiertage, Lappland, "wie viele Hotels", 70 € fuer die ganze Reise
     (21.11.2026). Gegenprobe: _backup/21-11-morgen/ */
  {
    const ft = vm.runInContext("typeof feiertageText === 'function' ? feiertageText(new Date(2026, 10, 21)) : ''", ctx);
    pruefe("Ostern 2027 berechnet (28. März)", /2027 ist Ostersonntag am 28\. März/.test(ft) ? "ja" : "nein", "ja");
    pruefe("Pfingsten 2027 (16. Mai) und Himmelfahrt (6. Mai)", /Pfingstsonntag am 16\. Mai/.test(ft) && /Himmelfahrt ist am 6\. Mai/.test(ft) ? "ja" : "nein", "ja");
    const fs1 = vm.runInContext("faqSuchen('wobei weißt du wann nächstes jahr ostern ist? also an welchem tag?').map(t => t.id)", ctx);
    pruefe("Bens Osterfrage findet die Feiertagsdaten zuerst", fs1[0], "f-feiertage-daten");

    const warm = ["krabi", "marrakesch", "teneriffa", "kapstadt", "kreta", "algarve", "lissabon", "kyoto"];
    const lap = WK.richtungKorrektur({ richtung: "warm", monat: 4, mindestGrad: 20, zieleErlaubt: warm.slice(), zieleAuswahl: [...warm, "lappland"] }, [...warm, "lappland"]);
    pruefe("Lappland dazugenommen: kein 'faellt weg'", lap && /fällt Lappland weg/.test(lap) ? lap : "kein falscher Satz", "kein falscher Satz");
    const dazu = WK.richtungKorrektur({ richtung: "warm", monat: 4, zieleErlaubt: [...warm, "mallorca"] }, warm.slice());
    pruefe("Ohne ausdrueckliche Auswahl: Aenderung wird weiter gemeldet", dazu && /Mallorca dazu/.test(dazu) ? "ja" : String(dazu), "ja");

    const wq4 = fs.readFileSync(alt && fs.existsSync(quelle + "werkzeugkasten.js") ? quelle + "werkzeugkasten.js" : B + "agent/werkzeugkasten.js", "utf8");
    pruefe("'Wie viele Hotels bietet ihr an?' ist keine Erwaehnung der Art", /const frageNachAngebot = /.test(wq4) ? "ja" : "nein", "ja");

    const kq2 = fs.readFileSync(alt && fs.existsSync(quelle + "kern.js") ? quelle + "kern.js" : B + "agent/kern.js", "utf8");
    pruefe("'inklusive Flug' gilt als Frage nach der ganzen Reise", /const gesamtGefragt = \/[^\n]*inklusive flug/.test(kq2) ? "ja" : "nein", "ja");
  }

  /* Wartezeiten (21.11.2026): Ein haengender erster Modellaufruf kostete
     22 s, weil der Server die vollen 20 s abwartete; und die Dauer eines
     Zugs wurde nach jedem Seitenwechsel neu gestartet ("2 Sekunden" fuer
     einen Zug von 11 s). Gegenprobe: _backup/21-11-dauer/ */
  {
    const apiPfad = alt && fs.existsSync(quelle + "agent-api.js") ? quelle + "agent-api.js" : B + "api/agent.js";
    const api = fs.readFileSync(apiPfad, "utf8");
    const m = api.match(/const NACHZUEGLER_MS = (\d+);/);
    pruefe("Haengender Modellaufruf: Nachzuegler nach hoechstens 5 s", m && +m[1] <= 5000 && /mitNachzuegler\(koerper, VORUEBERGEHEND\)/.test(api) ? "ja" : "nein", "ja");
    pruefe("Nach einer Zeitueberschreitung sofort neu", /e\.status === 504 \? 0/.test(api) ? "ja" : "nein", "ja");
    const kq3 = fs.readFileSync(alt && fs.existsSync(quelle + "kern.js") ? quelle + "kern.js" : B + "agent/kern.js", "utf8");
    pruefe("Zugdauer ueberlebt den Seitenwechsel", /if \(this\.lauf\.zugSeit == null\) this\.lauf\.zugSeit = Date\.now\(\);/.test(kq3)
      && /if \(!this\.lauf\.ausstehend\) this\.lauf\.zugSeit = null;/.test(kq3) ? "ja" : "nein", "ja");
    const cq2 = fs.readFileSync(alt && fs.existsSync(quelle + "components.js") ? quelle + "components.js" : B + "components.js", "utf8");
    pruefe("Arbeitsuhr zaehlt ab Beginn des Zugs", /this\._arbeitSeit = \(typeof Kern !== "undefined" && Kern\.lauf\?\.zugSeit\) \|\| Date\.now\(\)/.test(cq2) ? "ja" : "nein", "ja");
  }

  /* Startseite ohne vorbelegte Daten (21.11.2026).
     Gegenprobe: _backup/21-11-datum/ */
  {
    const sb = fs.readFileSync(alt && fs.existsSync(quelle + "searchbox.js") ? quelle + "searchbox.js" : B + "searchbox.js", "utf8");
    pruefe("Ohne gesuchte Daten starten die Datumsfelder leer", /const ohneVorbelegung = !params\.get\("from"\) && !params\.get\("to"\);/.test(sb) ? "ja" : "nein", "ja");
    const cq3 = fs.readFileSync(alt && fs.existsSync(quelle + "components.js") ? quelle + "components.js" : B + "components.js", "utf8");
    const mon = cq3.slice(cq3.indexOf("  monat() {"), cq3.indexOf("  monat() {") + 200);
    pruefe("Ohne Daten kein Reisemonat (keine Saisongrenze)", /const \{ von \} = this\.roh\(\);\s*return von \? new Date\(von\)\.getMonth\(\) \+ 1 : null;/.test(mon) ? "ja" : "nein", "ja");
    pruefe("Datenschicht: ohne Monat keine Saisongrenze, Grundpreis, frei",
      vm.runInContext("JSON.stringify([saisonPassung(ZIEL_NACH_ID.mallorca, null), freiImMonat(HOTELS[0], null), preisImMonat(HOTELS[0], null) === HOTELS[0].pricePerNight])", ctx), "[1,true,true]");
  }

  // Kinder oder Erwachsene
  if (WK && WK.kinderErwachsenRueckfrage) {
    const f = WK.kinderErwachsenRueckfrage({ erwachsene: 1, kinder: 2 }, { alterZuHoch: [28, 34] });
    pruefe("Alter ab 18 loest die Rueckfrage aus", f ? "ja" : "nein", "ja");
    pruefe("Die Antwort macht Erwachsene daraus", f?.wirkung?.[f.chips[0]]?.erwachsene, 3);
    pruefe("Nur einmal gefragt",
      WK.kinderErwachsenRueckfrage({ erwachsene: 1, kinder: 2 }, { alterZuHoch: [28, 34], alterGefragt: true }) ? "nochmal" : "einmal", "einmal");
    pruefe("Ohne Widerspruch keine Rueckfrage",
      WK.kinderErwachsenRueckfrage({ erwachsene: 2, kinder: 2 }, {}) ? "fragt" : "still", "still");
  }

  // Eine Jahreszeit ist keine Nennung mehrerer Monate
  {
    const wq = fs.readFileSync(alt && fs.existsSync(quelle + "werkzeugkasten.js") ? quelle + "werkzeugkasten.js" : B + "agent/werkzeugkasten.js", "utf8");
    pruefe("Jahreszeit setzt keine Monatsliste",
      /monate_aus_jahreszeit_verworfen/.test(wq) ? "ja" : "nein", "ja");
    /* Seit dem 19.11.2026 steht neben `filterVeraltet` auch `ohneSuche`
       in der Bedingung: Vor der Ausstattungsfrage muss ueberhaupt
       einmal gefiltert worden sein, sonst hat sie keine Zahl zu nennen. */
    pruefe("Zwischensuche waehrend der Beratung",
      /if \(offen && \(filterVeraltet \|\| ohneSuche\)\) \{ phase = "suche"; \}/.test(wq) ? "ja" : "nein", "ja");
    pruefe("Vor der Ausstattungsfrage wird gesucht",
      /const ohneSuche = offen === "ausstattung" && !lauf\.gefiltertMit;/.test(wq) ? "ja" : "nein", "ja");
  }

  console.log(`\n${gut} richtig, ${schlecht} falsch`);
  process.exit(schlecht ? 1 : 0);
})();
