/* Die Leser des Kerns mit schwierigen Formulierungen (27.11.2026)
 *
 *   node agent/leser-test.cjs
 *
 * Der Kern liest manche Antworten selbst (SELBST_LESEN) - und was er
 * EINDEUTIG liest, gilt sofort, vor dem Modell. Beim Preis war genau das
 * der Fehler ("250 pro Nacht, Anreise am 10." -> 10 Euro). Hier jede
 * Leserart mit Saetzen, die Menschen wirklich schreiben.
 *
 * Ergebnis je Satz:
 *   richtig      - der Kern liest den richtigen Wert
 *   modell       - der Kern liest nichts (oder nur einen Kandidaten), das Modell entscheidet -> unkritisch
 *   FALSCH       - der Kern uebernimmt sofort einen falschen Wert -> gefaehrlich
 *   kandidat-falsch - falscher Kandidat; gilt nur, wenn das Modell keinen Wert liefert -> beobachten
 */
const vm = require("vm");
const { laden } = require("./satzbank-daten.cjs");
const { WK, ctx } = laden();
vm.runInContext("var AgentPanel = new Proxy({}, { get: () => () => null }); var Werkzeuge = new Proxy({ seite: () => 'index', zustand: () => ({}) }, { get: (o, k) => (k in o ? o[k] : () => null) });", ctx);

// thema, satz, erwartet (null = der Kern soll nichts festlegen), Lage
const F = [
  ["zeit", "Juli", { monat: 7 }], ["zeit", "nicht im Juli, sondern im August", { monat: 8 }], ["zeit", "Juli oder August", { monate: [7, 8] }],
  ["zeit", "Ende Juni, Anfang Juli", { monate: [6, 7] }], ["zeit", "nächsten Monat", null], ["zeit", "März bis April", { monate: [3, 4] }],
  ["zeit", "irgendwann im Sommer", { jahreszeit: "sommer" }], ["zeit", "in den Osterferien", null], ["zeit", "lieber nicht im Winter", null],
  ["zeit", "Juni wäre super, aber Juli geht auch", { monate: [6, 7] }], ["zeit", "Mai", { monat: 5 }], ["zeit", "ich mag den Mai nicht so, eher Juni", { monat: 6 }],
  ["zeit", "wie letztes Jahr im Juli, diesmal aber im September", { monat: 9 }],
  // "10 Tage": der Kern liest 10; sagt das Modell 9, fragt der Kern (kernGegenModell, siehe regeln-test)
  ["dauer", "10 Tage", { naechte: 10 }], ["dauer", "übers Wochenende", null], ["dauer", "ein verlängertes Wochenende", null],
  ["dauer", "anderthalb Wochen", { naechte: 10 }], ["dauer", "2-3 Wochen", null], ["dauer", "eine Woche oder zehn Tage", null],
  ["dauer", "maximal 5 Nächte", { naechte: 5 }], ["dauer", "so 7 bis 10 Nächte", null], ["dauer", "wir haben 14 Tage Urlaub", { naechte: 14 }],
  ["dauer", "eine Woche", { naechte: 7 }], ["dauer", "9", { naechte: 9 }], ["dauer", "zwei Wochen", { naechte: 14 }],
  ["dauer", "nicht länger als eine Woche", { naechte: 7 }], ["dauer", "eine Woche, also 7 Nächte, ach nein lieber 8", { naechte: 8 }],
  ["dauer", "von Freitag bis Sonntag", { naechte: 2 }], ["dauer", "drei Nächte mehr als letztes Mal", null],
  ["reisende", "wir 4 plus Oma", null], ["reisende", "2 Erwachsene", { erwachsene: 2 }], ["reisende", "4 Leute, davon 2 Kinder", null],
  ["reisende", "zu viert", null], ["reisende", "ich und mein Sohn", null], ["reisende", "ich und meine Frau", { erwachsene: 2, kinder: 0 }],
  ["reisende", "3 Personen und ein Hund", { personen: 3 }], ["reisende", "zwei Pärchen", null], ["reisende", "wir sind 2 + 1", null],
  ["reisende", "5", { personen: 5 }], ["reisende", "ich allein", { erwachsene: 1, kinder: 0 }], ["reisende", "2 Erwachsene und 2 Kinder", { erwachsene: 2 }],
  ["reisende", "ich und meine Kleine", null], ["reisende", "6 Personen, aber 2 davon sind Babys", null],
  ["kinderAlter", "8 und 10", { kinderAlter: [8, 10] }, { kinder: 2 }], ["kinderAlter", "beide 5", { kinderAlter: [5, 5] }, { kinder: 2 }],
  ["kinderAlter", "der Große ist 12, die Kleine 3", { kinderAlter: [12, 3] }, { kinder: 2 }], ["kinderAlter", "12 und 3 Monate", null, { kinder: 2 }],
  ["kinderAlter", "5 Jahre und 18 Monate", null, { kinder: 2 }], ["kinderAlter", "zwei und vier", { kinderAlter: [2, 4] }, { kinder: 2 }],
  ["kinderAlter", "sie wird im Sommer 6", { kinderAlter: [6] }, { kinder: 1 }], ["kinderAlter", "ist 17, wird bald 18", null, { kinder: 1 }],
  ["kinderAlter", "die sind 6, 8 und 10", null, { kinder: 2 }],
  ["anreise", "am 12.", { anreise: "-07-12" }, { monat: 7, vonPerson: { monat: true } }], ["anreise", "ab dem 3.", { anreise: "-07-03" }, { monat: 7, vonPerson: { monat: true } }],
  ["anreise", "zwischen dem 5. und 10.", null, { monat: 7, vonPerson: { monat: true } }], ["anreise", "Anfang Juli", null, { monat: 7, vonPerson: { monat: true } }],
  ["anreise", "den 31.", { anreise: "-07-31" }, { monat: 7, vonPerson: { monat: true } }], ["anreise", "am Wochenende vom 12.", null, { monat: 7, vonPerson: { monat: true } }],
  ["anreise", "am 12. August", null, { monat: 7, vonPerson: { monat: true } }], ["anreise", "nicht vor dem 15.", null, { monat: 7, vonPerson: { monat: true } }],
  ["preis", "zwischen 100 und 150", null], ["preis", "max 150, lieber weniger", { maxPreis: 150 }], ["preis", "300 für alle", { maxPreis: 300 }],
  ["preis", "um die 2000 insgesamt", { budgetGesamt: 2000 }], ["preis", "50 pro Person", null], ["preis", "nicht mehr als 120", { maxPreis: 120 }],
  ["verpflegung", "Frühstück und Abendessen", null], ["verpflegung", "nur Frühstück", { verpflegung: "fruehstueck" }], ["verpflegung", "kein All Inclusive", null],
  ["verpflegung", "AI wäre toll", { verpflegung: "ai" }], ["verpflegung", "Halbpension oder All Inclusive", null],
  ["flugAb", "Hamburg oder Bremen", { flugAb: "Hamburg" }, { flug: true }], ["flugAb", "von Berlin", { flugAb: "Berlin" }, { flug: true }], ["flugAb", "Bremen", null, { flug: true }],
  ["flugAb", "nicht von Frankfurt", null, { flug: true }],
];

const gleich = (ist, soll) => {
  if (!ist && !soll) return true;
  if (!ist || !soll) return false;
  return Object.entries(soll).every(([f, w]) => (f === "anreise" ? String(ist[f] || "").endsWith(w) : JSON.stringify(ist[f]) === JSON.stringify(w)));
};

let n = { richtig: 0, modell: 0, FALSCH: 0, "kandidat-falsch": 0 };
const zeilen = [];
for (const [thema, satz, soll, lage = {}] of F) {
  const p = JSON.parse(JSON.stringify(lage));
  const kern = { lauf: { profil: p, gespraech: [{ role: "user", content: satz }], protokoll: [], gefragtWie: {}, uebersprungen: {}, zugSeit: 3 },
    notieren() {}, standAnzeigen() {}, sichern() {} };
  const vorher = JSON.stringify(p);
  let fehler = null;
  try { WK.antwortSelbstLesen(kern, thema, satz); } catch (e) { fehler = e.message; }
  const gesetzt = JSON.stringify(p) !== vorher ? Object.fromEntries(Object.entries(p).filter(([k, v]) => k !== "vonPerson" && JSON.stringify(v) !== JSON.stringify(JSON.parse(vorher)[k]))) : null;
  const kand = kern.lauf.kandidat ? kern.lauf.kandidat.werte : null;
  let wie;
  if (gesetzt) wie = gleich(gesetzt, soll) || (soll && Object.keys(soll).every((f) => f in gesetzt) && gleich(gesetzt, soll)) ? "richtig" : "FALSCH";
  else if (kand) wie = !soll || gleich(kand, soll) ? (gleich(kand, soll) ? "richtig" : "kandidat-falsch") : "kandidat-falsch";
  else wie = "modell";
  // Ein richtiger Wert, den der Kern nicht liest, ist unkritisch (das Modell liefert)
  n[wie]++;
  if (wie === "FALSCH" || wie === "kandidat-falsch") zeilen.push(`  ${wie.padEnd(15)} ${thema.padEnd(11)} "${satz}" -> ${JSON.stringify(gesetzt || kand)}  (soll ${JSON.stringify(soll)})${fehler ? " FEHLER " + fehler : ""}`);
}
console.log(`Saetze: ${F.length}  richtig ${n.richtig}  modell ${n.modell}  FALSCH ${n.FALSCH}  kandidat-falsch ${n["kandidat-falsch"]}`);
console.log(zeilen.join("\n"));
console.log(`\n${n.richtig + n.modell} richtig, ${n.FALSCH} falsch`);
