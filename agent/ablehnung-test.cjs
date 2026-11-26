/* Ablehnungs-Inventar (26.11.2026)
 *
 *   node agent/ablehnung-test.cjs          (Zusammenfassung)
 *   ZEIG=1 node agent/ablehnung-test.cjs   (jeder Befund einzeln)
 *
 * Ben: "Wenn das Modell etwas meldet, was thematisch richtig ist, dann darf
 * das nie einfach nur ignoriert werden und es darf die naechste Frage
 * gestellt werden - dann muss immer eine Rueckfrage kommen."
 *
 * Jeder Fall: ein Satz der Person, die RICHTIGE Antwort des Modells darauf,
 * eine Lage im Gespraech (frueh, mittendrin, nach der Suche) und die Frage,
 * die gerade offen war (dieselbe oder eine andere). Danach wird gelesen:
 *   uebernommen  - der Wert steht im Stand
 *   rueckfrage   - der Kern hat eine Rueckfrage zu genau diesem Wert angesetzt
 *   verworfen    - weder noch: der Wert ist weg, das Gespraech geht weiter
 */
const vm = require("vm");
const { laden } = require("./satzbank-daten.cjs");
const { WK, ctx } = laden();
vm.runInContext("var AgentPanel = new Proxy({}, { get: () => () => null }); var Werkzeuge = new Proxy({ seite: () => 'results', zustand: () => ({}), hatSuchmaske: () => true }, { get: (o, k) => (k in o ? o[k] : () => null) });", ctx);

const FAELLE = [
  // feld, thema, satz, modell, erwartet (Pruefung auf dem Stand)
  ["monat", "zeit", "im Januar", { monat: 1 }, (p) => p.monat === 1],
  ["monat", "zeit", "januar", { monat: 1 }, (p) => p.monat === 1],
  ["monat", "zeit", "Juli wäre schön", { monat: 7 }, (p) => p.monat === 7],
  ["monat", "zeit", "so Anfang Juli", { monat: 7 }, (p) => p.monat === 7],
  ["monat", "zeit", "lieber im März", { monat: 3 }, (p) => p.monat === 3],
  ["naechte", "dauer", "9 Nächte", { naechte: 9 }, (p) => p.naechte === 9],
  ["naechte", "dauer", "9", { naechte: 9 }, (p) => p.naechte === 9],
  ["naechte", "dauer", "neun Nächte", { naechte: 9 }, (p) => p.naechte === 9],
  ["naechte", "dauer", "eine Woche", { naechte: 7 }, (p) => p.naechte === 7],
  ["naechte", "dauer", "zwei Wochen", { naechte: 14 }, (p) => p.naechte === 14],
  ["naechte", "dauer", "ne ich will 9", { naechte: 9 }, (p) => p.naechte === 9],
  ["naechte", "dauer", "so 5 Nächte", { naechte: 5 }, (p) => p.naechte === 5],
  ["reisende", "reisende", "2 Erwachsene 3 Kinder", { erwachsene: 2, kinder: 3 }, (p) => p.erwachsene === 2 && p.kinder === 3],
  ["reisende", "reisende", "wir sind 2 große und 3 kleine", { erwachsene: 2, kinder: 3 }, (p) => p.erwachsene === 2 && p.kinder === 3],
  ["reisende", "reisende", "wir sind zu zweit", { erwachsene: 2, kinder: 0 }, (p) => p.erwachsene === 2 && p.kinder === 0],
  ["reisende", "reisende", "ich und meine Frau", { erwachsene: 2, kinder: 0 }, (p) => p.erwachsene === 2 && p.kinder === 0],
  ["reisende", "reisende", "ich alleine", { erwachsene: 1, kinder: 0 }, (p) => p.erwachsene === 1 && p.kinder === 0],
  ["reisende", "reisende", "ich und meine Arbeitskollegin", { erwachsene: 2, kinder: 0 }, (p) => p.erwachsene === 2 && p.kinder === 0],
  ["reisende", "reisende", "wir sind 4, davon 2 Kinder", { erwachsene: 2, kinder: 2 }, (p) => p.erwachsene === 2 && p.kinder === 2],
  ["reisende", "reisende", "meine Frau, ich und unsere drei Kinder", { erwachsene: 2, kinder: 3 }, (p) => p.erwachsene === 2 && p.kinder === 3],
  ["kinderAlter", "kinderAlter", "5 und 8", { kinderAlter: [5, 8] }, (p) => JSON.stringify(p.kinderAlter) === "[5,8]", { erwachsene: 2, kinder: 2 }],
  ["kinderAlter", "kinderAlter", "die sind 3 und 6", { kinderAlter: [3, 6] }, (p) => JSON.stringify(p.kinderAlter) === "[3,6]", { erwachsene: 2, kinder: 2 }],
  ["richtung", "ziel", "irgendwo wo es warm ist", { richtung: "warm" }, (p) => p.richtung === "warm"],
  ["richtung", "ziel", "eher kalt", { richtung: "kalt" }, (p) => p.richtung === "kalt"],
  ["richtung", "ziel", "ich würde gerne in eine warme Region", { richtung: "warm" }, (p) => p.richtung === "warm"],
  ["ziel", "ziel", "nach Mallorca", { ziel: "mallorca" }, (p) => p.zielId === "mallorca" || (p.zieleAuswahl || []).includes("mallorca")],
  ["ziel", "ziel", "Malle", { ziel: "mallorca" }, (p) => p.zielId === "mallorca" || (p.zieleAuswahl || []).includes("mallorca")],
  ["ziel", "ziel", "Kreta bitte", { ziel: "kreta" }, (p) => p.zielId === "kreta" || (p.zieleAuswahl || []).includes("kreta")],
  ["ziel", "ziel", "auf die Kanaren", { ziel: "teneriffa" }, (p) => p.zielId === "teneriffa" || (p.zieleAuswahl || []).includes("teneriffa")],
  ["ziel", "ziel", "Mallorca oder Kreta", { zieleAuswahl: ["mallorca", "kreta"] }, (p) => ["mallorca", "kreta"].every((z) => (p.zieleAuswahl || []).includes(z))],
  ["mindestGrad", "ziel", "mindestens 25 Grad", { mindestGrad: 25 }, (p) => p.mindestGrad === 25, { richtung: "warm" }],
  ["mindestGrad", "ziel", "lieber erst ab 20", { mindestGrad: 20 }, (p) => p.mindestGrad === 20, { richtung: "warm" }],
  ["mindestGrad", "ziel", "es darf auch kühler sein, so 18", { mindestGrad: 18 }, (p) => p.mindestGrad === 18, { richtung: "warm" }],
  ["flug", "flug", "mit Flug", { flug: true }, (p) => p.flug === true],
  ["flug", "flug", "ohne Flug", { flug: false }, (p) => p.flug === false],
  ["flug", "flug", "nur das Hotel", { flug: false }, (p) => p.flug === false],
  ["flugAb", "flugAb", "ab Hamburg", { flugAb: "Hamburg" }, (p) => p.flugAb === "Hamburg", { flug: true }],
  ["flugAb", "flugAb", "Hamburg", { flugAb: "Hamburg" }, (p) => p.flugAb === "Hamburg", { flug: true }],
  ["flugAb", "flugAb", "von München aus", { flugAb: "München" }, (p) => p.flugAb === "München", { flug: true }],
  ["flugKlasse", "flugKlasse", "Business", { flugKlasse: "business" }, (p) => p.flugKlasse === "business", { flug: true, flugAb: "Hamburg" }],
  ["flugKlasse", "flugKlasse", "economy reicht", { flugKlasse: "economy" }, (p) => p.flugKlasse === "economy", { flug: true, flugAb: "Hamburg" }],
  ["anreise", "anreise", "am 8.", { anreise: "2027-01-08" }, (p) => /-01-08$/.test(p.anreise || ""), { monat: 1 }],
  ["anreise", "anreise", "am 12. Januar", { anreise: "2027-01-12" }, (p) => /-01-12$/.test(p.anreise || ""), { monat: 1 }],
  ["anreise", "anreise", "ab dem 3.1.", { anreise: "2027-01-03" }, (p) => /-01-03$/.test(p.anreise || ""), { monat: 1 }],
  ["preis", "preis", "max 150 pro Nacht", { maxPreis: 150 }, (p) => p.maxPreis === 150],
  ["preis", "preis", "so 120 die Nacht", { maxPreis: 120 }, (p) => p.maxPreis === 120],
  ["preis", "preis", "insgesamt 2000 Euro", { budgetGesamt: 2000 }, (p) => p.budgetGesamt === 2000],
  ["preis", "preis", "150", { maxPreis: 150 }, (p) => p.maxPreis === 150],
  ["verpflegung", "verpflegung", "all inclusive", { verpflegung: "ai" }, (p) => p.verpflegung === "ai"],
  ["verpflegung", "verpflegung", "Halbpension", { verpflegung: "halb" }, (p) => p.verpflegung === "halb"],
  ["verpflegung", "verpflegung", "Frühstück reicht", { verpflegung: "fruehstueck" }, (p) => p.verpflegung === "fruehstueck"],
  ["typ", "art", "Ferienwohnung", { typ: "apartment" }, (p) => p.typ === "apartment"],
  ["typ", "art", "lieber ein Apartment", { typ: "apartment" }, (p) => p.typ === "apartment"],
  ["typ", "art", "ein Hotel", { typ: "hotel" }, (p) => p.typ === "hotel"],
  ["bewertung", "gewichtung", "mindestens 4,5 Sterne Bewertung", { mindestbewertung: 4.5 }, (p) => p.mindestbewertung === 4.5],
  ["strand", "gewichtung", "direkt am Strand, höchstens 200 Meter", { maxStrandMeter: 200 }, (p) => p.maxStrand === 0.2],
  // Korrekturen: der Wert steht schon anders im Stand
  ["monat", "zeit", "doch lieber Februar", { monat: 2 }, (p) => p.monat === 2, { monat: 1 }],
  ["monat", "dauer", "ach und doch im März statt Januar", { monat: 3 }, (p) => p.monat === 3, { monat: 1 }],
  ["naechte", "dauer", "doch lieber 10 Nächte", { naechte: 10 }, (p) => p.naechte === 10, { naechte: 7 }],
  ["naechte", "reisende", "ach und nur 5 Nächte", { naechte: 5 }, (p) => p.naechte === 5, { naechte: 7 }],
  ["reisende", "reisende", "doch nur zu zweit, die Kinder bleiben zuhause", { erwachsene: 2, kinder: 0 }, (p) => p.erwachsene === 2 && p.kinder === 0, { erwachsene: 2, kinder: 2, kinderAlter: [5, 8] }],
  ["reisende", "dauer", "meine Schwester kommt noch mit, also zu dritt", { erwachsene: 3, kinder: 0 }, (p) => p.erwachsene === 3, { erwachsene: 2, kinder: 0 }],
  ["reisende", "reisende", "zu fünft", { erwachsene: 5, kinder: 0 }, (p) => p.erwachsene === 5 && p.kinder === 0],
  ["ziel", "ziel", "doch nicht Mallorca, lieber Kreta", { ziel: "kreta" }, (p) => p.zielId === "kreta" || ((p.zieleAuswahl || []).includes("kreta") && !(p.zieleAuswahl || []).includes("mallorca")), { zielId: "mallorca" }],
  ["mindestGrad", "ziel", "darf auch 15 sein", { mindestGrad: 15 }, (p) => p.mindestGrad === 15, { richtung: "warm", mindestGrad: 22 }],
  ["mindestGrad", "ziel", "es muss nicht so heiß sein, 18 Grad reichen", { mindestGrad: 18 }, (p) => p.mindestGrad === 18, { richtung: "warm" }],
  ["richtung", "ziel", "doch lieber was Kaltes", { richtung: "kalt" }, (p) => p.richtung === "kalt", { richtung: "warm" }],
  ["flug", "flug", "doch ohne Flug", { flug: false }, (p) => p.flug === false, { flug: true, flugAb: "Hamburg" }],
  ["flug", "verpflegung", "ach und doch mit Flug", { flug: true }, (p) => p.flug === true, { flug: false }],
  ["flugAb", "flugAb", "doch lieber ab Bremen... nein Hannover", { flugAb: "Hannover" }, (p) => p.flugAb === "Hannover", { flug: true, flugAb: "Hamburg" }],
  ["typ", "art", "doch lieber eine Ferienwohnung", { typ: "apartment" }, (p) => p.typ === "apartment", { typ: "hotel", artGenannt: true }],
  ["preis", "preis", "doch bis 200 pro Nacht", { maxPreis: 200 }, (p) => p.maxPreis === 200, { maxPreis: 120 }],
  ["verpflegung", "verpflegung", "doch nur Frühstück", { verpflegung: "fruehstueck" }, (p) => p.verpflegung === "fruehstueck", { verpflegung: "ai" }],
  ["anreise", "anreise", "doch lieber am 15.", { anreise: "2027-01-15" }, (p) => /-01-15$/.test(p.anreise || ""), { monat: 1, anreise: "2027-01-08" }],
  // Mehrere Angaben in einer Nachricht, ausserhalb der Reihenfolge
  ["kombi", "zeit", "9 Nächte zu zweit im Januar", { naechte: 9, erwachsene: 2, kinder: 0, monat: 1 }, (p) => p.naechte === 9 && p.erwachsene === 2 && p.monat === 1],
  ["kombi", "dauer", "eine Woche, mit Flug ab Hamburg", { naechte: 7, flug: true, flugAb: "Hamburg" }, (p) => p.naechte === 7 && p.flug === true && p.flugAb === "Hamburg"],
  ["kombi", "reisende", "wir sind 2 Erwachsene und ein Kind (6), Ferienwohnung auf Kreta", { erwachsene: 2, kinder: 1, kinderAlter: [6], typ: "apartment", ziel: "kreta" }, (p) => p.erwachsene === 2 && p.kinder === 1 && p.typ === "apartment" && (p.zielId === "kreta" || (p.zieleAuswahl || []).includes("kreta"))],
  ["kombi", "zeit", "im Juli, warm und am Meer, max 150 die Nacht", { monat: 7, richtung: "warm", maxPreis: 150 }, (p) => p.monat === 7 && p.richtung === "warm" && p.maxPreis === 150],
];

/* Lagen im Gespraech: was schon feststeht, bevor der Satz kommt. */
const LAGEN = {
  frueh: {},
  mitte: { monat: 1, naechte: 7, erwachsene: 2, kinder: 0, personen: 2, vonPerson: { monat: true, naechte: true, erwachsene: true, kinder: true } },
  spaet: { monat: 1, naechte: 7, erwachsene: 2, kinder: 0, personen: 2, typ: "hotel", artGenannt: true, zielOffen: true, flug: false,
    vonPerson: { monat: true, naechte: true, erwachsene: true, kinder: true, typ: true, flug: true }, _gesucht: true },
};

/* Woran eine Rueckfrage zu erkennen ist: eine offene Frage des Kerns, die
   genau diesen Wert betrifft. */
const RUECKFRAGE = (feld, l, p) => {
  if (l.datumWiderspruch && ["monat", "anreise"].includes(feld)) return "datumWiderspruch";
  if (l.spanneOffen && feld === "mindestGrad") return "spanne";
  if ((l.alterZuHoch || []).length && ["kinderAlter", "reisende"].includes(feld)) return "kinderOderErwachsen";
  if (l.tagUnklar && feld === "anreise") return "tagUnklar";
  if ((p.zielVorgemerkt || (p.zieleVorgemerkt || []).length) && ["ziel"].includes(feld)) return "zielWiderspruch";
  if (l.zielKonflikt && feld === "ziel") return "zielKonflikt";
  if (l.reisendeRueckfrage && feld === "reisende") return "reisende";
  if ((l.zweiteLesungOffen || l.lesungOffen) && true) return "lesung";
  return null;
};

const kern = (p, text, frage, lage) => {
  const k = { lauf: { profil: p, gespraech: [{ role: "assistant", content: "Frage?" }, { role: "user", content: text }], protokoll: [], annahmeOffen: [], gefragtWie: {}, verlauf: [],
    nachrichtArt: "antwort", runde: 1, zugSeit: 7, gefragt: frage, zuletztGefragt: frage, gefragtVorher: frage, gesagt: [], besprochen: {} },
  ereignisse: [],
  notieren(e, d) { k.ereignisse.push(e); }, standAnzeigen() {}, sagen() {}, sichern() {}, gespraechPush() {}, logZeile() {}, kuerzen() {}, darf: () => true, standKurz: () => "", freigabe: () => "suchen" };
  if (lage._gesucht) { k.lauf.gesuchtMit = "x"; }
  return k;
};

(async () => {
  const ergebnis = [];
  for (const [feld, thema, satz, modell, ok, vor = {}] of FAELLE) {
    for (const [lageName, lage] of Object.entries(LAGEN)) {
      for (const frageArt of ["eigene", "andere"]) {
        const frage = frageArt === "eigene" ? thema : (thema === "dauer" ? "reisende" : "dauer");
        const p = JSON.parse(JSON.stringify({ ...lage, ...vor, vonPerson: { ...(lage.vonPerson || {}), ...Object.fromEntries(Object.keys(vor).map((f) => [f, true])) } }));
        delete p._gesucht;
        // Ein Feld, das die Lage schon hat, wird hier neu gesagt (Korrektur)
        const k = kern(p, satz, frage, lage);
        let fehler = null;
        try {
          await WK.werkzeuge.stand_merken.call(WK, { nachricht_art: "antwort", frage_beantwortet: frageArt === "eigene" ? "ja" : "nein",
            selbst_genannt: frageArt === "andere" ? [thema] : undefined, ...modell }, k);
        } catch (e) { fehler = e.message; }
        let wie = fehler ? "absturz" : ok(p) ? "uebernommen" : (RUECKFRAGE(feld, k.lauf, p) ? "rueckfrage" : "verworfen");
        ergebnis.push({ feld, satz, lage: lageName, frage: frageArt, wie, grund: RUECKFRAGE(feld, k.lauf, p),
          ereignisse: k.ereignisse.filter((e) => /verworf|abgelehnt|nicht_|anderer_monat|ignor|gesperrt|wartet/.test(e)), fehler });
      }
    }
  }
  const zaehl = (f) => ergebnis.filter(f).length;
  console.log(`Faelle: ${ergebnis.length}  uebernommen ${zaehl((x) => x.wie === "uebernommen")}  rueckfrage ${zaehl((x) => x.wie === "rueckfrage")}  VERWORFEN ${zaehl((x) => x.wie === "verworfen")}  absturz ${zaehl((x) => x.wie === "absturz")}`);
  const jeFeld = {};
  for (const x of ergebnis) { const j = (jeFeld[x.feld] ||= { n: 0, weg: 0 }); j.n++; if (x.wie === "verworfen" || x.wie === "absturz") j.weg++; }
  console.log("Je Feld (verworfen / Faelle):", Object.entries(jeFeld).map(([f, j]) => `${f} ${j.weg}/${j.n}`).join("  "));
  const weg = ergebnis.filter((x) => x.wie === "verworfen" || x.wie === "absturz");
  // Nach Satz gruppiert, damit man sieht, in welchen Lagen es passiert
  const gruppe = {};
  for (const x of weg) (gruppe[`${x.feld} | "${x.satz}"`] ||= []).push(`${x.lage}/${x.frage}${x.ereignisse.length ? " [" + [...new Set(x.ereignisse)].join(",") + "]" : ""}${x.fehler ? " FEHLER " + x.fehler : ""}`);
  for (const [k, v] of Object.entries(gruppe)) console.log(`  ${k}: ${v.length}/6  ${process.env.ZEIG ? v.join("; ") : v.slice(0, 3).join("; ")}`);
  require("fs").writeFileSync(process.env.AUS || "/dev/null", JSON.stringify(ergebnis, null, 1));
})();
