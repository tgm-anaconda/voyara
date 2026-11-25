/* Muster-Pruefung (25.11.2026): dieselben Fehlermuster wie in der Modellbank,
   andere Saetze und Werte - traegt die Regel allgemein? Dazu Gegenrichtung:
   Was vorher richtig gelesen wurde, muss bleiben.  node agent/muster-test.cjs */
const { laden } = require("./satzbank-daten.cjs");
const { WK } = laden();
const kern = (p, msgs, t) => ({ lauf: { profil: p, gespraech: msgs.flatMap((m) => [{ role: "assistant", content: "Frage" }, { role: "user", content: m }]), protokoll: [], annahmeOffen: [], gefragtWie: {}, verlauf: [], nachrichtArt: "antwort", runde: 1, zugSeit: 77, gefragt: t, zuletztGefragt: t, gefragtVorher: t },
  notieren(e, d) { this.lauf.protokoll.push({ ereignis: e, ...d }); }, freigabe: () => "suchen", darf: () => false, logZeile() {}, sagen() {}, standAnzeigen() {}, sichern() {}, standKurz: () => "", antwortWerten() {}, gespraechPush() {}, sagenUndMerken() {} });
const vp = (...k) => Object.fromEntries(k.map((x) => [x, true]));
const G = { monat: 10, naechte: 7, erwachsene: 2, kinder: 0, personen: 2, kinderAlter: [], vonPerson: vp("monat", "naechte", "erwachsene", "kinder") };
const H = { ...G, typ: "hotel", artGenannt: true }, F = { ...H, flug: true, zielId: "kreta" };
const O = (...k) => { const x = JSON.parse(JSON.stringify(G)); k.forEach((y) => { delete x[y]; delete x.vonPerson[y]; }); return x; };
const A = [
  ["Feldname dauer", O("naechte"), "dauer", "zehn Tage", { dauer: 10 }, (p) => p.naechte === 10],
  ["Feldname dauer als Text", O("naechte"), "zeit", "im Mai fuer 9 Nächte", { monat: 5, dauer: "9 Nächte" }, (p) => p.naechte === 9],
  ["Feldname preis", { ...F }, "preis", "bis 90 euro die nacht", { preis: 90 }, (p) => p.maxPreis === 90],
  ["Feldname preis, aber gesamt gemeint", { ...F }, "preis", "insgesamt nicht mehr als 1500 für die Unterkunft", { preis: 1500 }, (p) => p.budgetGesamt === 1500 && !p.maxPreis],
  ["Feldname art als Liste", { ...G }, "art", "lieber hotel", { art: ["hotel"] }, (p) => p.typ === "hotel"],
  ["Feldname art mit zweien", { ...G }, "art", "hotel oder ferienwohnung, beides ok", { art: ["hotel", "apartment"], artEgal: true }, (p) => !p.typ && p.artEgal === true],
  ["Feldname flughafen", { ...F }, "flugAb", "ab Leipzig? nee Berlin", { flughafen: "Berlin" }, (p) => p.flugAb === "Berlin"],
  ["Feldname personen", O("erwachsene", "kinder", "personen"), "reisende", "zu viert", { personen: 4 }, (p) => p.personen === 4],
  ["Namen bleiben Namen", { ...F }, "flug", "Die Reisenden sind Anna Muster und Ben Muster", { reisende: ["Anna Muster", "Ben Muster"] }, (p) => p.personen === 2],
  ["Freitext als Datum", { ...G }, "flug", "wir kommen mit der bahn", { anreise: "bahn", flug: false }, (p) => !p.anreise && p.flug === false],
  ["Echtes Datum bleibt", { ...G }, "anreise", "am 14.", { anreise: "2027-10-14" }, (p) => p.anreise === "2027-10-14"],
  ["Art erfunden", O("naechte"), "zeit", "Im Juli 8 Nächte Sardinien zu zweit", { monat: 7, naechte: 8, ziel: "sardinien", typ: "hotel", selbst_genannt: ["art"] }, (p) => !p.typ],
  ["Art genannt: Unterkunft Fewo", O("naechte"), "zeit", "Im Juli 8 Nächte Fewo auf Sardinien", { monat: 7, naechte: 8, ziel: "sardinien", typ: "apartment" }, (p) => p.typ === "apartment"],
  ["Art genannt: Finca", O("naechte"), "zeit", "eine Finca auf Mallorca im Mai", { monat: 5, ziel: "mallorca", typ: "apartment" }, (p) => p.typ === "apartment"],
  ["Frage zu Halbpension", { ...F }, "verpflegung", "was heißt denn Halbpension?", { nachricht_art: "frage", frage_beantwortet: "nein" }, (p) => !p.verpflegung],
  ["Halbpension als Antwort", { ...F }, "verpflegung", "Halbpension wäre schön", { verpflegung: "halb" }, (p) => p.verpflegung === "halb"],
  ["Bitte als Frage", { ...F }, "verpflegung", "können wir All Inclusive nehmen?", { nachricht_art: "antwort", verpflegung: "ai" }, (p) => p.verpflegung === "ai"],
  ["Ablehnung Halbpension", { ...F }, "verpflegung", "bitte keine Halbpension", { verpflegung: "ai" }, (p) => !p.verpflegung],
  ["Ablehnung mit Wahl", { ...F }, "verpflegung", "nicht All Inclusive, lieber Halbpension", { verpflegung: "halb" }, (p) => p.verpflegung === "halb"],
  ["Frage zur Art", { ...G }, "art", "habt ihr auch Ferienwohnungen oder nur Hotels?", { nachricht_art: "frage", frage_beantwortet: "nein" }, (p) => !p.typ && !p.artEgal],
  ["Feiertag statt Abgabe", O("monat", "naechte"), "zeit", "irgendwas um Fronleichnam rum", { monatUeberlassen: true }, (p) => p.monat === 5 || p.monat === 6],
  ["Das Genauere gewinnt: Ferien", O("monat", "naechte"), "zeit", "in den Sommerferien, erste Augustwoche", { monat: 8 }, (p) => p.monat === 8],
  ["Das Genauere gewinnt: Feiertag", O("monat", "naechte"), "zeit", "vor Weihnachten, so Ende November", { monat: 11 }, (p) => p.monat === 11],
  ["Statt ist eine Wahl", { ...G }, "flug", "lieber Juni statt Oktober", { monat: 6 }, (p) => p.monat === 6],
  ["Jahr statt Abgabe", O("monat", "naechte"), "zeit", "erst 2028", { monatUeberlassen: true }, (p) => !p.monat],
  ["Echte Abgabe", O("monat", "naechte"), "zeit", "such du den günstigsten monat aus", { monatUeberlassen: true }, (p) => !!p.monat && !p.vonPerson.monat],
  ["Wochentage", O("naechte"), "dauer", "von Donnerstag bis Montag", {}, (p) => p.naechte === 4],
  ["Wochentage eine Woche", O("naechte"), "dauer", "Samstag bis Samstag", {}, (p) => p.naechte === 7],
  ["Ordnungszahl", { ...G }, "anreise", "am einundzwanzigsten", {}, (p) => /-10-21$/.test(p.anreise || "")],
  ["Ordnungszahl mit anderem Monat", { ...G }, "anreise", "am ersten august", {}, (p) => !p.anreise],
  ["Ordnungszahl, anderes gemeint", { ...G }, "anreise", "am ersten tag wollen wir an den strand", {}, (p) => !p.anreise],
  ["Korrektur der Naechte", { ...F }, "verpflegung", "nicht 7, sondern 12 bitte", { selbst_genannt: ["dauer"] }, (p) => p.naechte === 12],
  ["Korrektur ohne Wert", { ...F }, "verpflegung", "die naechte stimmen nicht", { selbst_genannt: ["dauer"] }, (p) => p.naechte === 7],
  ["Gruppe waechst", { ...F }, "verpflegung", "wir sind jetzt doch zu viert", { personenGesamt: 4 }, (p) => p.erwachsene === 4 && p.personen === 4],
  ["Gruppe waechst um ein Kind", { ...F }, "verpflegung", "meine tochter kommt noch mit, sie ist 6", { personenGesamt: 3, erwachsene: 2, kinder: 1, kinderAlter: [6] }, (p) => p.erwachsene === 2 && p.kinder === 1],
];
const AUS = [["es gibt nichts Schöneres als Mallorca", []], ["nirgends ist es toller als auf Kreta", []], ["nichts gegen Wien, aber lieber Island", null], ["nicht nach Kreta, da ist es nicht schöner als woanders", ["kreta"]], ["kein Mallorca bitte", ["mallorca"]], ["auf keinen Fall Lappland", ["lappland"]]];
(async () => {
  let g = 0, n = 0;
  for (const [name, vor, t, du, args, ok] of A) {
    n++; const p = JSON.parse(JSON.stringify(vor)), k = kern(p, [du], t); let f = "";
    try { WK.chipAntwortLesen(k, du); WK.fahrplanChipLesen?.(k, t, du); WK.antwortSelbstLesen(k, t, du); k.lauf.chipWirkung = null;
      await WK.werkzeuge.stand_merken.call(WK, { nachricht_art: "antwort", frage_beantwortet: "ja", ...args }, k); } catch (e) { f = e.message; }
    let r = false; try { r = !!ok(p) && !f; } catch { r = false; }
    if (r) g++; else console.log("FEHLT", name, JSON.stringify({ n: p.naechte, m: p.monat, an: p.anreise, e: p.erwachsene, k: p.kinder, pers: p.personen, t: p.typ, ae: p.artEgal, v: p.verpflegung, mp: p.maxPreis, b: p.budgetGesamt, fa: p.flugAb, fl: p.flug }), f);
  }
  const K = require("./satzbank-daten.cjs").laden().KN;
  for (const [s, soll] of AUS) { if (soll === null) continue; n++; const ist = K.ausschlussLesen(s); if (JSON.stringify(ist) === JSON.stringify(soll)) g++; else console.log("FEHLT Ausschluss", s, JSON.stringify(ist)); }
  console.log(`${g}/${n}`); if (g < n) process.exitCode = 1;
})();
