/* Fehler des Modells: faengt der Kern sie ab? (27.11.2026)
 *
 *   node agent/fehler-test.cjs          (Zusammenfassung)
 *   ZEIG=1 node agent/fehler-test.cjs   (jeder Fall)
 *
 * Ben: "ob hier selbst bei Fehlern der Kern die richtige Rueckfrage
 * anbringt - das ist ja viel wichtiger." Das gespielte Modell macht hier
 * ABSICHTLICH die typischen Fehler (falscher Wert, erfundener Wert, Wert
 * fehlt, falsches Feld, Korrektur ueberhoert, Verneinung ueberlesen).
 * Ein Zug wie im Agenten: erst liest der Kern selbst, dann kommt
 * stand_merken mit der falschen Antwort, dann die Rueckfragen des Kerns.
 *
 * Ergebnis je Fall:
 *   korrigiert   - am Ende steht der richtige Wert
 *   rueckfrage   - der Kern fragt genau dazu nach (Ja/Nein, A oder B, Monat ...)
 *   fragt_neu    - nichts Falsches im Stand, das Thema wird noch einmal gefragt
 *   FALSCH       - der falsche Wert steht im Stand, ohne Rueckfrage   (schlimmster Fall)
 *   UEBERGANGEN  - nichts im Stand, keine Rueckfrage, das Thema gilt als erledigt
 */
const vm = require("vm");
const { laden } = require("./satzbank-daten.cjs");
const { WK, ctx } = laden();
vm.runInContext("var AgentPanel = new Proxy({}, { get: () => () => null }); var Werkzeuge = new Proxy({ seite: () => 'index', zustand: () => ({}) }, { get: (o, k) => (k in o ? o[k] : () => null) });", ctx);
const Pol = vm.runInContext("Politik", ctx);

const M1 = { monat: 1, vonPerson: { monat: true } };
const F = [
  // art, thema (offene Frage), satz, falsche Modellantwort, richtig?, falsch?, lage
  ["A falscher Wert", "zeit", "im Juli", { monat: 8 }, (p) => p.monat === 7, (p) => p.monat === 8],
  ["A falscher Wert", "dauer", "9 Nächte", { naechte: 7 }, (p) => p.naechte === 9, (p) => p.naechte === 7],
  ["A falscher Wert", "dauer", "zwei Wochen", { naechte: 7 }, (p) => p.naechte === 14, (p) => p.naechte === 7],
  ["A falscher Wert", "reisende", "2 Erwachsene und 3 Kinder", { erwachsene: 2, kinder: 2 }, (p) => p.erwachsene === 2 && p.kinder === 3, (p) => p.kinder === 2],
  ["A falscher Wert", "reisende", "wir sind zu dritt", { erwachsene: 2, kinder: 0 }, (p) => p.erwachsene === 3 || p.personen === 3, (p) => p.erwachsene === 2],
  ["A falscher Wert", "kinderAlter", "5 und 8", { kinderAlter: [5, 9] }, (p) => JSON.stringify(p.kinderAlter) === "[5,8]", (p) => JSON.stringify(p.kinderAlter) === "[5,9]", { erwachsene: 2, kinder: 2 }],
  ["A falscher Wert", "preis", "max 150 pro Nacht", { maxPreis: 1500 }, (p) => p.maxPreis === 150, (p) => p.maxPreis === 1500],
  ["A falscher Wert", "preis", "insgesamt 2000 Euro", { maxPreis: 2000 }, (p) => p.budgetGesamt === 2000, (p) => p.maxPreis === 2000],
  ["A falscher Wert", "verpflegung", "Halbpension", { verpflegung: "ai" }, (p) => p.verpflegung === "halb", (p) => p.verpflegung === "ai"],
  ["A falscher Wert", "ziel", "nach Kreta", { ziel: "mallorca" }, (p) => p.zielId === "kreta", (p) => p.zielId === "mallorca"],
  ["A falscher Wert", "flugAb", "ab Hamburg", { flugAb: "München" }, (p) => p.flugAb === "Hamburg", (p) => p.flugAb === "München", { flug: true }],
  ["A falscher Wert", "anreise", "am 10.", { anreise: "2027-01-01" }, (p) => /-01-10$/.test(p.anreise || ""), (p) => /-01-01$/.test(p.anreise || ""), M1],
  ["A falscher Wert", "ziel", "erst ab 22", { mindestGrad: 19 }, (p) => p.mindestGrad === 22, (p) => p.mindestGrad === 19, { ...M1, richtung: "warm" }, { spanneOffen: { grenze: 19, weiter: 15, stufen: [22, 19, 15] }, spanneFrage: 1 }],
  ["A falscher Wert", "art", "eine Ferienwohnung", { typ: "hotel" }, (p) => p.typ === "apartment", (p) => p.typ === "hotel"],
  ["A falscher Wert", "flug", "ohne Flug", { flug: true }, (p) => p.flug === false, (p) => p.flug === true],
  ["A falscher Wert", "flugKlasse", "Business", { flugKlasse: "economy" }, (p) => p.flugKlasse === "business", (p) => p.flugKlasse === "economy", { flug: true, flugAb: "Hamburg" }],
  ["B erfunden", "dauer", "hm okay", { monat: 9 }, (p) => !p.monat, (p) => p.monat === 9],
  ["B erfunden", "zeit", "danke dir", { naechte: 10 }, (p) => !p.naechte, (p) => p.naechte === 10],
  ["B erfunden", "zeit", "klingt gut", { erwachsene: 4 }, (p) => !p.erwachsene, (p) => p.erwachsene === 4],
  ["B erfunden", "zeit", "wie warm ist es auf Kreta?", { ziel: "kreta" }, (p) => !p.zielId, (p) => p.zielId === "kreta"],
  ["B erfunden", "zeit", "hauptsache warm", { monat: 10, richtung: "warm" }, (p) => !p.monat, (p) => p.monat === 10],
  ["B erfunden", "preis", "wir sind flexibel", { maxPreis: 200 }, (p) => !p.maxPreis, (p) => p.maxPreis === 200],
  ["C fehlt", "zeit", "im Juli", {}, (p) => p.monat === 7, () => false],
  ["C fehlt", "dauer", "10 Nächte", {}, (p) => p.naechte === 10, () => false],
  ["C fehlt", "reisende", "2 Erwachsene", {}, (p) => p.erwachsene === 2, () => false],
  ["C fehlt", "flugAb", "Hamburg", {}, (p) => p.flugAb === "Hamburg", () => false, { flug: true }],
  ["C fehlt", "verpflegung", "Halbpension bitte", {}, (p) => p.verpflegung === "halb", () => false],
  ["C fehlt", "art", "lieber ein Hotel", {}, (p) => p.typ === "hotel", () => false],
  ["D falsches Feld", "reisende", "wir sind 4", { naechte: 4 }, (p) => p.personen === 4 || p.erwachsene === 4, (p) => p.naechte === 4],
  ["D falsches Feld", "dauer", "9 Nächte", { erwachsene: 9 }, (p) => p.naechte === 9 && p.erwachsene !== 9, (p) => p.erwachsene === 9],
  ["D falsches Feld", "anreise", "am 12.", { naechte: 12 }, (p) => /-01-12$/.test(p.anreise || "") && p.naechte !== 12, (p) => p.naechte === 12, M1],
  ["D falsches Feld", "preis", "150", { naechte: 150 }, (p) => p.maxPreis === 150 && p.naechte !== 150, (p) => p.naechte === 150],
  ["E Korrektur ueberhoert", "verpflegung", "doch lieber 10 Nächte", {}, (p) => p.naechte === 10, (p) => p.naechte === 7, { naechte: 7, vonPerson: { naechte: true } }],
  ["E Korrektur ueberhoert", "verpflegung", "doch lieber im März", {}, (p) => p.monat === 3, (p) => p.monat === 1, M1],
  ["E Korrektur ueberhoert", "verpflegung", "doch ohne Flug", {}, (p) => p.flug === false, (p) => p.flug === true, { flug: true, flugAb: "Hamburg" }],
  ["E Korrektur ueberhoert", "verpflegung", "doch nur zu zweit, ohne Kinder", {}, (p) => p.erwachsene === 2 && p.kinder === 0, (p) => p.kinder === 2, { erwachsene: 2, kinder: 2, kinderAlter: [5, 8] }],
  ["E Korrektur ueberhoert", "verpflegung", "lieber Kreta statt Mallorca", {}, (p) => p.zielId === "kreta", (p) => p.zielId === "mallorca", { zielId: "mallorca" }],
  ["F Verneinung", "ziel", "bloß nicht nach Mallorca", { ziel: "mallorca" }, (p) => (p.zieleAus || []).includes("mallorca"), (p) => p.zielId === "mallorca"],
  ["F Verneinung", "verpflegung", "kein All Inclusive", { verpflegung: "ai" }, (p) => p.verpflegung !== "ai" && !(p._frage || "").includes("All Inclusive?"), (p) => p.verpflegung === "ai"],
  ["F Verneinung", "flug", "wir fliegen nicht, wir fahren mit dem Auto", { flug: true }, (p) => p.flug === false, (p) => p.flug === true],
  ["F Verneinung", "ziel", "eher kalt", { richtung: "warm" }, (p) => p.richtung === "kalt", (p) => p.richtung === "warm"],
];

/* Sichere Bereiche (Ben, 27.11.2026): Monat, Temperatur, Art der Unterkunft,
   Richtung - hier gilt der Wert des Modells, der Kern prueft nicht. Diese
   Faelle zeigen, was dann durchgeht; sie zaehlen nicht als Fehler des Kerns. */
const ERLAUBT = new Set(["erst ab 22", "eine Ferienwohnung", "hauptsache warm", "eher kalt"]);

const THEMA_FELD = { zeit: ["monat"], dauer: ["naechte"], reisende: ["erwachsene", "kinder", "personen"], kinderAlter: ["kinderAlter"], preis: ["maxPreis", "budgetGesamt"],
  verpflegung: ["verpflegung"], ziel: ["zielId", "richtung", "mindestGrad", "zieleAus"], flugAb: ["flugAb"], anreise: ["anreise"], art: ["typ"], flug: ["flug"], flugKlasse: ["flugKlasse"] };

(async () => {
  const zahl = {};
  const zeilen = [];
  for (const [art, thema, satz, modell, richtig, falsch, lage = {}, laufExtra = {}] of F) {
    const p = JSON.parse(JSON.stringify({ ...lage, vonPerson: { ...(lage.vonPerson || {}) } }));
    const l = { profil: p, gespraech: [{ role: "assistant", content: "Frage?" }, { role: "user", content: satz }], protokoll: [], annahmeOffen: [], gefragtWie: { [thema]: 1 },
      verlauf: [], nachrichtArt: /\?\s*$/.test(satz) ? "frage" : "antwort", runde: 2, zugSeit: 5, gefragt: thema, zuletztGefragt: thema, gefragtVorher: thema, gesagt: [], besprochen: {},
      uebersprungen: {}, selbstGelesen: [], ...laufExtra };
    const ereignisse = [];
    const kern = { lauf: l, notieren(e) { ereignisse.push(e); }, standAnzeigen() {}, sagen() {}, sichern() {}, gespraechPush() {}, logZeile() {}, kuerzen() {}, darf: () => true, standKurz: () => "", freigabe: () => "suchen" };
    let fehler = null, rueck = null, fp = null;
    try {
      WK.antwortSelbstLesen(kern, thema, satz);
      // Das Modell meldet die Frage als beantwortet (das tut es auch, wenn es falsch liegt)
      await WK.werkzeuge.stand_merken.call(WK, { nachricht_art: l.nachrichtArt, frage_beantwortet: Object.keys(modell).length ? "ja" : "ja", ...modell }, kern);
      rueck = WK.bestaetigungRueckfrage(p, l) || WK.datumWiderspruch?.(p, satz) || null;
      if (!rueck && l.datumWiderspruch) rueck = l.datumWiderspruch;
      if (!rueck && (l.alterZuHoch || []).length) rueck = { satz: "Kinder oder Erwachsene?" };
      if (!rueck && l.zielVorgemerkt) rueck = { satz: "Widerspruch Ziel" };
      if (!rueck && (p.zielVorgemerkt || (p.zieleVorgemerkt || []).length)) rueck = { satz: "Ziel vorgemerkt" };
      fp = WK.fahrplan(p, l);
    } catch (e) { fehler = e.message; }
    p._frage = rueck?.satz || "";
    const ok = !fehler && richtig(p), schlecht = !fehler && falsch(p);
    delete p._frage;
    let wie;
    if (fehler) wie = "ABSTURZ";
    else if (ok) wie = "korrigiert";
    else if (rueck) wie = schlecht && !art.startsWith("E") ? "rueckfrage (Wert steht schon)" : "rueckfrage";
    else if (schlecht && ERLAUBT.has(satz)) wie = "erlaubt (sicherer Bereich)";
    else if (schlecht) wie = "FALSCH";
    else if (fp && fp.naechstes === thema) wie = "fragt_neu";
    else wie = "UEBERGANGEN";
    zahl[wie] = (zahl[wie] || 0) + 1;
    const felder = Object.fromEntries((THEMA_FELD[thema] || []).concat(Object.keys(modell)).filter((f) => p[f] != null).map((f) => [f, p[f]]));
    zeilen.push({ art, satz, wie, felder, rueck: rueck?.satz || null, naechstes: fp?.naechstes || null, fehler,
      ereig: [...new Set(ereignisse.filter((e) => /verworf|grundlage|konflikt|netz|abgelesen|widerspruch|gelesen|kern_gegen/.test(e)))].join(",") });
  }
  const gut = (zahl.korrigiert || 0) + (zahl.rueckfrage || 0) + (zahl.fragt_neu || 0) + (zahl["erlaubt (sicherer Bereich)"] || 0);
  console.log(`Faelle: ${F.length}  ` + Object.entries(zahl).map(([k, v]) => `${k} ${v}`).join("  "));
  for (const z of zeilen) if (process.env.ZEIG || !["korrigiert", "rueckfrage"].includes(z.wie)) {
    console.log(`  ${z.wie.padEnd(28)} ${z.art.padEnd(22)} "${z.satz}" -> ${JSON.stringify(z.felder)}${z.rueck ? ` | Frage: ${z.rueck.slice(0, 80)}` : ""}${z.wie === "fragt_neu" || z.wie === "UEBERGANGEN" ? ` | weiter mit: ${z.naechstes}` : ""} [${z.ereig}]${z.fehler ? " FEHLER " + z.fehler : ""}`);
  }
  console.log(`\n${gut} richtig, ${F.length - gut} falsch`);
})();
