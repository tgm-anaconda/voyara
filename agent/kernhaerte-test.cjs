/* Kern-Haertetest (25.11.2026) - liest der Kern je etwas Falsches?
 *
 *   node agent/kernhaerte-test.cjs [--alle]
 *   VOYARA_QUELLE=_backup/<ordner>/ ...   Gegenprobe
 *
 * Ben: "Den Kern koennen wir auf Herz und Nieren pruefen, so dass der
 * wirklich keine Fehler mehr macht." Saetze werden aus Bausteinen gebaut:
 * jedes Thema x jeder Wert x jede Satzform. Das Modell hilft nicht.
 *   frage, erzaehlt, hypothese   -> im Stand darf sich nichts aendern
 *   ablehnung                    -> nichts davon gewaehlt (Regionen: hoechstens ausgeschlossen)
 *   antwort                      -> gelesen wird richtig oder gar nicht, nie etwas anderes
 *   streit                       -> Kern und Modell lesen freien Text verschieden: nie still uebernehmen
 */
const { laden } = require("./satzbank-daten.cjs");
const { WK, KN, ctx } = laden();
const vm = require("vm");
const ZIELE = vm.runInContext("ZIELE", ctx);
const vp = (...k) => Object.fromEntries(k.map((x) => [x, true]));
const G = { monat: 10, naechte: 7, erwachsene: 2, kinder: 0, personen: 2, kinderAlter: [], vonPerson: vp("monat", "naechte", "erwachsene", "kinder") };
const ohne = (...k) => { const x = JSON.parse(JSON.stringify(G)); k.forEach((y) => { delete x[y]; delete x.vonPerson[y]; }); return x; };
const H = { ...G, typ: "hotel", artGenannt: true }, HF = { ...H, zielId: "kreta", flug: true, flugAb: "Hamburg", flugKlasse: "economy" };
const MON = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
// thema -> Vorstand, Werte [Wort, Feld, Soll]
const THEMEN = {
  verpflegung: [HF, [["All Inclusive", "verpflegung", "ai"], ["Halbpension", "verpflegung", "halb"], ["Vollpension", "verpflegung", "voll"], ["Frühstück", "verpflegung", "fruehstueck"]]],
  art: [G, [["Hotel", "typ", "hotel"], ["Ferienwohnung", "typ", "apartment"]]],
  flugAb: [{ ...H, zielId: "kreta", flug: true }, ["Berlin", "Düsseldorf", "Frankfurt", "Hamburg", "Hannover", "Köln", "München", "Stuttgart", "Zürich"].map((x) => [x, "flugAb", x])],
  flugKlasse: [{ ...H, zielId: "kreta", flug: true, flugAb: "Hamburg" }, [["Economy", "flugKlasse", "economy"], ["Premium Economy", "flugKlasse", "premium"], ["Business", "flugKlasse", "business"]]],
  ziel: [H, ZIELE.map((z) => [z.name, "zielId", z.id])],
  zeit: [ohne("monat", "naechte"), MON.map((m, i) => [m, "monat", i + 1])],
};
const FORM = {
  frage: ["was kostet {x}?", "ist {x} teurer?", "was heißt {x} genau?", "habt ihr auch {x}?", "was spricht gegen {x}?", "lohnt sich {x}?", "wie ist {x} so?", "und was ist mit {x}?"],
  erzaehlt: ["letztes Jahr hatten wir {x}, das war furchtbar", "beim letzten Mal war es {x}", "meine Freundin hatte {x} und war nicht begeistert", "mein Chef schwärmt immer von {x}"],
  hypothese: ["wenn wir {x} nehmen würden, was wäre dann?", "ich weiß noch nicht, ob {x} das Richtige ist"],
  ablehnung: ["bloß nicht {x}", "{x} auf keinen Fall", "alles außer {x}", "kein {x} bitte", "hauptsache nicht {x}", "{x} lieber nicht"],
  antwort: ["{x}", "{x} bitte", "gerne {x}", "dann {x}", "ich nehme {x}", "{x}!", "ja, {x}", "am liebsten {x}", "{x} wäre super"],
};
const FELDER = ["monat", "anreise", "naechte", "erwachsene", "kinder", "personen", "kinderAlter", "typ", "artEgal", "zielId", "zieleAuswahl", "zieleAus", "richtung", "flug", "flugAb", "flugAbAuswahl", "flugKlasse", "verpflegung", "verpflegungEgal", "maxPreis", "budgetGesamt", "preisEgal", "ausstattung", "haustier"];
const text = (x) => JSON.stringify(x ?? null), leer = (x) => x == null || x === false || (Array.isArray(x) && !x.length);
let FRAGE_TEXT = null;
async function lauf(thema, vor, du, args) {
  const p = JSON.parse(JSON.stringify(vor)), kern = { lauf: { profil: p, gespraech: [{ role: "assistant", content: FRAGE_TEXT || "Möchtest du noch etwas wissen?" }, { role: "user", content: du }], protokoll: [], annahmeOffen: [], gefragtWie: {}, verlauf: [], nachrichtArt: "antwort", runde: 1, zugSeit: 77, gefragt: thema, zuletztGefragt: thema, gefragtVorher: thema, selbstGelesen: [] },
    notieren(e, d) { this.lauf.protokoll.push({ ereignis: e, ...d }); }, freigabe: () => "suchen", darf: () => false, logZeile() {}, sagen() {}, standAnzeigen() {}, sichern() {}, standKurz: () => "", antwortWerten() {}, gespraechPush() {}, sagenUndMerken() {} };
  const L = (fn) => { try { fn(); } catch (e) { kern.fehler ||= e.message; } };
  const alt = [KN.notieren, KN.standAnzeigen, KN.sichern]; KN.lauf = kern.lauf; KN.notieren = kern.notieren; KN.standAnzeigen = () => {}; KN.sichern = () => {};
  L(() => KN.haustierLesen?.(du)); L(() => KN.regionenLesen(du)); [KN.notieren, KN.standAnzeigen, KN.sichern] = alt;
  L(() => WK.chipAntwortLesen(kern, du)); L(() => WK.fahrplanChipLesen?.(kern, thema, du)); L(() => WK.antwortSelbstLesen(kern, thema, du)); kern.lauf.chipWirkung = null;
  try { await WK.werkzeuge.stand_merken.call(WK, JSON.parse(JSON.stringify(args)), kern); } catch (e) { kern.fehler ||= e.message; }
  let nach = null; L(() => { nach = WK.bestaetigungRueckfrage(p, kern.lauf); });
  return { p, kern, nach, anders: FELDER.filter((f) => text(p[f]) !== text(vor[f]) && !(leer(p[f]) && leer(vor[f]))) };
}
(async () => {
  const z = {}, fehl = [];
  const werte = (art, ok, zeile) => { (z[art] ||= [0, 0])[1]++; if (ok) z[art][0]++; else fehl.push(`[${art}] ${zeile}`); };
  const FRAGEND = { nachricht_art: "frage", frage_beantwortet: "nein" }, STILL = { nachricht_art: "sonstiges", frage_beantwortet: "nein" }, JA = { nachricht_art: "antwort", frage_beantwortet: "ja" };
  for (const [thema, [vor, liste]] of Object.entries(THEMEN)) for (const [wort, feld, soll] of liste) for (const [art, formen] of Object.entries(FORM)) for (const f of formen) {
    const du = f.replace("{x}", wort);
    for (const args of art === "antwort" ? [JA] : art === "frage" ? [FRAGEND] : [STILL, JA]) {
      const r = await lauf(thema, vor, du, args);
      const wie = `${thema} "${du}" (Modell ${args.frage_beantwortet}) -> ${r.anders.map((x) => `${x}=${text(r.p[x])}`).join(", ") || "nichts"} ${r.kern.fehler || ""}`;
      if (r.kern.fehler) { werte(art, false, wie); continue; }
      if (art === "antwort") werte(art, leer(r.p[feld]) || r.p[feld] === soll || (feld === "zielId" && (r.p.zieleAuswahl || []).includes(soll)), wie);
      else if (art === "ablehnung") werte(art, r.anders.every((x) => x === "zieleAus") && (thema === "ziel" || !r.anders.length) && (r.p.zieleAus || []).every((x) => thema === "ziel" && x === soll), wie);
      else werte(art, !r.anders.length, wie);
    }
  }
  // Streit: freier Text, das Modell liest etwas anderes
  const STREIT = [
    ["verpflegung", HF, "also eher Halbpension oder doch nicht so ganz", { verpflegung: "fruehstueck" }, "verpflegung"], ["verpflegung", HF, "vielleicht reicht uns ja auch Frühstück statt Halbpension", { verpflegung: "halb" }, "verpflegung"],
    ["flugAb", { ...H, zielId: "kreta", flug: true }, "Köln ist uns eigentlich zu weit weg", { flugAb: "Düsseldorf" }, "flugAb"], ["flugKlasse", { ...H, zielId: "kreta", flug: true, flugAb: "Hamburg" }, "Business können wir uns nicht leisten", { flugKlasse: "economy" }, "flugKlasse"],
    ["dauer", ohne("naechte"), "eine Woche ist uns zu kurz, lieber zehn", { naechte: 10 }, "naechte"], ["preis", HF, "200 sind uns zu viel, 150 wären gut", { maxPreis: 150 }, "maxPreis"],
    ["zeit", ohne("monat"), "Juli ist uns zu heiß, dann eher Mai", { monat: 5 }, "monat"], ["reisende", ohne("erwachsene", "kinder", "personen"), "eigentlich 4 Personen, aber Tim sagt wohl ab", { personenGesamt: 3 }, "personen"],
    ["flug", { ...H, zielId: "kreta" }, "mit Flug wird es mir zu teuer, wir nehmen das Auto", { flug: false }, "flug"], ["preis", HF, "Preis ist nicht egal, aber bis 180 geht", { maxPreis: 180 }, "maxPreis"],
  ];
  const FELD = { personen: "personenGesamt" };
  for (const [thema, vor, du, m, feld] of STREIT) {
    const r = await lauf(thema, vor, du, { ...JA, ...m }), modell = m[FELD[feld] || feld], ist = r.p[feld];
    const ok = leer(ist) ? true : text(ist) === text(modell);
    werte("streit", ok, `${thema} "${du}" Modell ${text(m)} -> ${feld}=${text(ist)} ${r.nach ? "| fragt: " + r.nach.satz : ""}`);
  }
  const GUTE = [   // richtige freie Antworten: das Modell liest richtig, der Kern darf nicht stoeren
    ["verpflegung", HF, "Halbpension reicht uns völlig, denke ich", { verpflegung: "halb" }], ["dauer", ohne("naechte"), "so zehn Nächte ungefähr", { naechte: 10 }], ["preis", HF, "ich denke 150 pro Nacht wären ok für uns", { maxPreis: 150 }],
    ["flugAb", { ...H, zielId: "kreta", flug: true }, "Köln passt uns am besten, das ist um die Ecke", { flugAb: "Köln" }], ["zeit", ohne("monat"), "wahrscheinlich im Mai, da haben wir Urlaub", { monat: 5 }], ["flug", { ...H, zielId: "kreta" }, "wir brauchen auf jeden Fall auch einen Flug dazu", { flug: true }],
    ["art", G, "wir sind eher so die Hotel Leute", { typ: "hotel" }], ["ziel", H, "Kreta haben uns Freunde empfohlen, da wollen wir hin", { ziel: "kreta" }], ["anreise", ohne(), "am 14. passt es uns gut", { anreise: "2027-10-14" }],
  ];
  for (const [thema, vor, du, m] of GUTE) {
    const r = await lauf(thema, vor, du, { ...JA, ...m }); const [k, v] = Object.entries(m)[0], feld = { ziel: "zielId" }[k] || k;
    werte("richtig bleibt", text(r.p[feld]) === text(v), `${thema} "${du}" Modell ${text(m)} -> ${feld}=${text(r.p[feld])}${r.nach ? " | fragt: " + r.nach.satz : ""}`);
  }
  // --- Teil 2: Zahlen, Reisende, Daten ---
  const ZAHLEN = {
    dauer: [ohne("naechte"), ["habt ihr auch 14 Nächte?", "was kosten denn 10 Nächte?", "letztes Jahr waren wir 12 Nächte weg", "ich weiß nicht, ob 7 Nächte reichen", "wenn wir 5 Nächte nehmen, wird es dann billiger?", "zwei Wochen sind uns zu lang", "keine 10 Tage", "bloß keine Woche", "mein Bruder erzählt immer von drei Wochen"]],
    preis: [HF, ["was bekomme ich für 100 Euro?", "letztes Mal haben wir 200 Euro bezahlt, das war zu viel", "250 Euro sind uns zu teuer", "wenn wir 300 Euro zahlen würden, was gäbe es dann?", "ist 150 Euro realistisch?", "gibt es was unter 80 Euro?", "der Preis ist nicht egal"]],
    reisende: [ohne("erwachsene", "kinder", "personen"), ["geht das auch mit 5 Personen?", "letztes Jahr waren wir 6 Personen", "ich weiß noch nicht, ob wir 4 Personen werden", "was kostet es für 3 Personen?", "wenn wir 2 Erwachsene wären, wie teuer wird es?"]],
    anreise: [G, ["ist der 12. noch frei?", "was kostet der 14. Oktober?", "der 3. Oktober ist uns zu früh", "bloß nicht am 13.", "letztes Jahr sind wir am 5. geflogen, das war gut", "ich weiß nicht, ob der 20. passt"]],
    flug: [{ ...H, zielId: "kreta" }, ["wie teuer ist es mit Flug?", "geht es auch ohne Flug?", "letztes Mal sind wir mit Flug gereist", "ich weiß noch nicht, ob mit Flug oder ohne", "mit Flug ist es uns zu teuer", "ist ein Flug dabei?"]],
    ausstattung: [H, ["habt ihr Hotels mit Katzen?", "ich habe Angst vor Hunden", "unser Hund bleibt zu Hause", "letztes Mal hat ein Hund gebellt, das war furchtbar", "haben die da eine Hotelkatze?", "das kostet ja hunderte Euro"]],
  };
  for (const [thema, [vor, saetze]] of Object.entries(ZAHLEN)) for (const du of saetze) for (const args of /\?$/.test(du) ? [FRAGEND] : [STILL, JA]) {
    const r = await lauf(thema, vor, du, args);
    werte("zahlen", !r.anders.length && !r.kern.fehler, `${thema} "${du}" (Modell ${args.frage_beantwortet}) -> ${r.anders.map((x) => `${x}=${text(r.p[x])}`).join(", ")} ${r.kern.fehler || ""}`);
  }
  for (const du of ["der Hund kommt mit", "mit Hund bitte", "darf mein Hund mit?", "wir haben zwei Hunde dabei"]) { const r = await lauf("ausstattung", H, du, JA); werte("haustier", (r.p.ausstattung || []).includes("petsAllowed"), `"${du}" nicht erkannt`); }
  // --- Teil 3: Buchen nur auf ein reines Ja ---
  const JAS = ["ja", "ok", "okay", "gerne", "klar", "passt", "bitte", "genau", "ja bitte", "mach das"];
  const ABER = ["aber", "aber ohne Versicherung", "aber erst morgen", "warte kurz", "gleich", "später", "nicht", "lieber nicht", "moment", "noch nicht", "wenn es billiger wird", "und was kostet das?", "?", "aber das andere Hotel", "ich überlege noch", "ich frage meine Frau", "oder doch nicht", "mit anderem Flug", "nächste Woche", "nur wenn stornierbar", "vielleicht", "theoretisch", "im Prinzip", "eigentlich", "nee doch nicht"];
  for (const j of JAS) { for (const a of ABER) werte("buchen nein", !WK.abschlussJa(`${j} ${a}`) && !WK.abschlussJa(`${j}, ${a}`), `"${j} ${a}" wuerde buchen`); werte("buchen ja", WK.abschlussJa(j) && WK.abschlussJa(j + "!"), `"${j}" bucht nicht`); }
  for (const t of ["nein", "ne", "bloß nicht", "nicht buchen", "bitte nicht buchen", "stopp", "abbrechen", "was passiert dann?", "", "hm", "danke", "das andere", "buchen wir später", "kann ich das stornieren", "noch mal zurück", "jaja", "ja?", "ok?", "buchen?", "soll ich ja sagen"]) werte("buchen nein", !WK.abschlussJa(t), `"${t}" wuerde buchen`);
  // --- Teil 4: Anzahl der Vorschlaege ---
  if (WK.anzahlAusText) {
    for (const t of ["wir haben 2 Kinder", "ich habe noch zwei Fragen", "die drei sind mir zu teuer", "nicht vier", "unter 1100 Euro", "mit 4 Sternen", "zu dritt", "5 Grad wären gut", "warum drei?", "in 2 Wochen", "wir brauchen 2 Zimmer"]) werte("anzahl", WK.anzahlAusText(t) == null, `"${t}" -> ${WK.anzahlAusText(t)}`);
    for (const [t, n] of [["vier", 4], ["5", 5], ["lieber sechs", 6], ["zeig mir vier", 4], ["drei reichen", 3], ["ja, fünf bitte", 5], ["nicht drei, sondern vier", 4], ["mach 6 draus", 6]]) werte("anzahl", WK.anzahlAusText(t) === n, `"${t}" -> ${WK.anzahlAusText(t)} statt ${n}`);
  } else werte("anzahl", false, "kein Leser");
  // --- Teil 5: Das Modell behauptet etwas, wovon die Nachricht nicht handelt ---
  const BEHAUPTET = { monat: 7, anreise: "2027-10-14", naechte: 9, personenGesamt: 4, erwachsene: 3, kinder: 2, kinderAlter: [4, 6], typ: "hotel", artEgal: true, ziel: "kreta", zieleAuswahl: ["kreta", "wien"], zieleAus: ["mallorca"], richtung: "warm", mindestGrad: 25,
    flug: true, flugAb: "Hamburg", flugAbEgal: true, flugKlasse: "business", verpflegung: "ai", verpflegungEgal: true, maxPreis: 120, budgetGesamt: 1500, preisEgal: true, ausstattung: ["pool"], mindestbewertung: 4.5, mindestSterne: 4, anzahlVorschlaege: 5, zimmer: 3, wlanInklusive: true };
  const STUMM = ["ja, das klingt gut", "hm okay", "erzähl mir mehr", "danke dir", "ok", "super, weiter"], NAME = { personenGesamt: "personen", ziel: "zielId" };
  const THEMEN_NAME = { monat: "zeit", naechte: "dauer", erwachsene: "reisende", kinder: "reisende", personenGesamt: "reisende", typ: "art", maxPreis: "preis" };
  for (const vor of [{ vonPerson: {} }, G]) for (const [f, v] of Object.entries(BEHAUPTET)) for (const du of STUMM) for (const meldet of [false, true]) {
    const r = await lauf(null, vor, du, { ...JA, ...(meldet ? { selbst_genannt: [THEMEN_NAME[f] || f] } : {}), [f]: v });
    const p = r.p[NAME[f] || f], gesetzt = text(p) !== text(vor[NAME[f] || f]) && !leer(p);
    werte("ohne grundlage", !gesetzt && !r.kern.fehler, `"${du}" Modell ${f}=${text(v)}${meldet ? " (gemeldet)" : ""} -> ${text(p)} ${r.kern.fehler || ""}`);
  }
  // Ein Ja auf einen Vorschlag des Agenten muss dagegen ankommen
  const VORSCHLAG = [["Soll ich Hamburg als Abflughafen nehmen?", "ja gerne", { flugAb: "Hamburg" }, "flugAb", { ...H, flug: true, zielId: "kreta" }], ["Soll ein Flug dazu?", "ja", { flug: true }, "flug", H], ["Soll ich mit Halbpension rechnen?", "ja passt", { verpflegung: "halb" }, "verpflegung", { ...HF }],
    ["Sollen wir es bis 150 € pro Nacht versuchen?", "ok", { maxPreis: 150 }, "maxPreis", HF], ["Soll ich auf Kreta schauen?", "ja gern", { ziel: "kreta" }, "zielId", H], ["Passt euch der Juli?", "ja", { monat: 7 }, "monat", ohne("monat")], ["Wollt ihr 10 Nächte bleiben?", "genau", { naechte: 10 }, "naechte", ohne("naechte")],
    ["Soll ich nach Hotels mit Pool suchen?", "ja bitte", { ausstattung: ["pool"] }, "ausstattung", H]];
  for (const [frage, du, m, feld, vor] of VORSCHLAG) { FRAGE_TEXT = frage; const r = await lauf(null, vor, du, { ...JA, ...m, selbst_genannt: [{ zielId: "ziel", monat: "zeit", naechte: "dauer" }[feld] || feld] }); FRAGE_TEXT = null; werte("ja auf vorschlag", text(r.p[feld]) === text(Object.values(m)[0]), `"${frage}" / "${du}" -> ${feld}=${text(r.p[feld])}`); }
  console.log(Object.entries(z).map(([k, [a, b]]) => `${k} ${a}/${b}`).join("   "));
  const max = process.argv.includes("--alle") ? 9999 : 25; console.log(fehl.slice(0, max).join("\n")); if (fehl.length > max) console.log(`... ${fehl.length} insgesamt`);
  const je = {}; fehl.forEach((x) => { const k = x.match(/^\[(.*?)\] (\w+)/) || [0, x.slice(0, 14), ""]; je[`${k[1]}/${k[2]}`] = (je[`${k[1]}/${k[2]}`] || 0) + 1; }); if (fehl.length) console.log(JSON.stringify(je));
  if (fehl.length) process.exitCode = 1;
})();
