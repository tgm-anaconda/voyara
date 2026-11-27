/* Leser-Stresstest (27.11.2026)
 *
 *   node agent/leser-stress-test.cjs
 *
 * Ben: "dass das Schlimmste, was passieren kann, ist, dass eine Rueckfrage
 * nochmal kommt. Aber dass auf jeden Fall keine falschen Informationen
 * einfach uebernommen werden." Der Kern uebernimmt sofort nur den REINEN
 * Wert ("Juli", "9", "150 €"). Hier rund 160 kurze und kniffelige Saetze:
 *   SOLL   - genau diese Saetze gelten sofort, mit genau diesem Wert
 *   alles andere darf NICHT sofort gelten (das Modell liefert, der Kern
 *   vergleicht oder fragt).
 */
const vm = require("vm");
const { laden } = require("./satzbank-daten.cjs");
const { WK, ctx } = laden();
vm.runInContext("var AgentPanel = new Proxy({}, { get: () => () => null }); var Werkzeuge = new Proxy({ seite: () => 'index', zustand: () => ({}) }, { get: (o, k) => (k in o ? o[k] : () => null) });", ctx);

// [thema, satz, lage]
const F = [
["zeit","Juli"],["zeit","im Juli"],["zeit","Juli bitte"],["zeit","Mai 2027"],["zeit","Sommerferien"],["zeit","Ostern"],["zeit","Pfingsten"],["zeit","Weihnachten"],["zeit","Jänner"],["zeit","Sept"],["zeit","nächstes Jahr"],["zeit","Juni/Juli"],["zeit","Juni, Juli"],["zeit","egal"],["zeit","7"],["zeit","Mitte August"],["zeit","Ende März"],["zeit","im Frühling"],["zeit","Herbst"],["zeit","März ist schlecht"],["zeit","außer Juli"],["zeit","nicht Juli"],
["dauer","9"],["dauer","1 Woche"],["dauer","10 Tage"],["dauer","14"],["dauer","eine Nacht"],["dauer","3-4 Nächte"],["dauer","ein Monat"],["dauer","Wochenende"],["dauer","5 Tage"],["dauer","5 Nächte"],["dauer","2 Wochen bitte"],["dauer","10 Tage, 9 Nächte"],["dauer","eine gute Woche"],["dauer","ca 10"],["dauer","max 7"],["dauer","mindestens 7"],["dauer","kurz"],["dauer","lang"],["dauer","20 Uhr"],["dauer","200"],["dauer","1"],
["reisende","2"],["reisende","zu zweit"],["reisende","zu dritt"],["reisende","wir zwei"],["reisende","4 Personen"],["reisende","2 und 2"],["reisende","2+2"],["reisende","2 Erw. 1 Kind"],["reisende","Familie"],["reisende","Paar"],["reisende","allein"],["reisende","mit Freundin"],["reisende","3 Kinder"],["reisende","2 Erwachsene 3 Kinder"],["reisende","ich, Frau, Kind"],["reisende","4 plus Baby"],["reisende","12"],["reisende","40"],["reisende","Mama und ich"],["reisende","wir 3"],
["kinderAlter","5",{kinder:1}],["kinderAlter","5",{kinder:2}],["kinderAlter","3 und 7",{kinder:2}],["kinderAlter","3, 7",{kinder:2}],["kinderAlter","Baby",{kinder:1}],["kinderAlter","1 Jahr",{kinder:1}],["kinderAlter","Teenager",{kinder:1}],["kinderAlter","18",{kinder:1}],["kinderAlter","10 Monate",{kinder:1}],["kinderAlter","3 7 9",{kinder:3}],["kinderAlter","Zwillinge, 4",{kinder:2}],["kinderAlter","4 und 6",{kinder:3}],
["preis","150"],["preis","150 €"],["preis","max 150"],["preis","1500"],["preis","bis 100 pro Nacht"],["preis","2000 gesamt"],["preis","egal"],["preis","günstig"],["preis","100-150"],["preis","50"],["preis","20"],["preis","8000"],["preis","150 pro Person"],["preis","3"],["preis","um 100"],["preis","100 Euro pro Person"],
["verpflegung","HP"],["verpflegung","VP"],["verpflegung","Frühstück"],["verpflegung","keine"],["verpflegung","ohne"],["verpflegung","Selbstversorger"],["verpflegung","all in"],["verpflegung","egal"],["verpflegung","nur Übernachtung"],["verpflegung","Abendessen"],["verpflegung","Vollpension bitte"],
["flugAb","Hamburg",{flug:true}],["flugAb","HAM",{flug:true}],["flugAb","Köln",{flug:true}],["flugAb","Düsseldorf",{flug:true}],["flugAb","München",{flug:true}],["flugAb","Frankfurt",{flug:true}],["flugAb","egal",{flug:true}],["flugAb","nächster",{flug:true}],["flugAb","Wien",{flug:true}],["flugAb","Berlin",{flug:true}],["flugAb","Hannover",{flug:true}],
["anreise","12",{monat:7,vonPerson:{monat:true}}],["anreise","am 12.",{monat:7,vonPerson:{monat:true}}],["anreise","12.7.",{monat:7,vonPerson:{monat:true}}],["anreise","12.8.",{monat:7,vonPerson:{monat:true}}],["anreise","Samstag",{monat:7,vonPerson:{monat:true}}],["anreise","31",{monat:6,vonPerson:{monat:true}}],["anreise","Monatsanfang",{monat:7,vonPerson:{monat:true}}],["anreise","egal",{monat:7,vonPerson:{monat:true}}],["anreise","1.",{monat:7,vonPerson:{monat:true}}],["anreise","Mitte",{monat:7,vonPerson:{monat:true}}],
["zeit","März ist schlecht"],["zeit","Juli geht nicht"],["zeit","Juli eher nicht"],["zeit","im Juli können wir nicht, lieber August"],["zeit","Juli war letztes Mal, jetzt was anderes"],["zeit","Juli? hm"],["zeit","Mai passt leider nicht"],["zeit","ungern Juli"],["zeit","Juli wäre blöd"],
["dauer","10 Nächte sind zu lang"],["dauer","eine Woche ist zu kurz"],["dauer","letztes Mal 7 Nächte, diesmal mehr"],["dauer","7 Nächte reichen nicht"],["dauer","die 9 Nächte passen nicht"],
["reisende","2 sind zu wenig"],["reisende","mit meinen 2 Kindern"],["reisende","Oma kommt nicht mit, also 3"],["reisende","wir waren mal 5, jetzt 4"],
["preis","100 ist zu wenig"],["preis","150 ist zu teuer"],["preis","nicht 100, eher 200"],["preis","letztes Mal 80 pro Nacht, jetzt mehr"],
["verpflegung","Frühstück brauchen wir nicht"],["verpflegung","HP ist zu teuer"],["verpflegung","All Inclusive auf keinen Fall"],["verpflegung","Halbpension lieber nicht"],
["flugAb","Hamburg ist zu weit",{flug:true}],["flugAb","Berlin geht nicht",{flug:true}],["flugAb","wohnen in Hamburg, fliegen aber ab Bremen",{flug:true}],
["anreise","der 12. geht nicht",{monat:7,vonPerson:{monat:true}}],["anreise","12. ist schlecht",{monat:7,vonPerson:{monat:true}}],
];

// Was sofort gelten darf - von Hand geprueft (27.11.2026)
const SOLL = {
  "zeit|Juli": { monat: 7 }, "zeit|im Juli": { monat: 7 }, "zeit|Juli bitte": { monat: 7 }, "zeit|Mai 2027": { monat: 5 }, "zeit|Sept": { monat: 9 },
  "zeit|Juni/Juli": { monate: [6, 7], monat: 6 }, "zeit|Mitte August": { monat: 8 }, "zeit|Ende März": { monat: 3 },
  "dauer|9": { naechte: 9 }, "dauer|1 Woche": { naechte: 7 }, "dauer|14": { naechte: 14 }, "dauer|5 Nächte": { naechte: 5 }, "dauer|2 Wochen bitte": { naechte: 14 }, "dauer|1": { naechte: 1 },
  "reisende|2": { personen: 2 }, "reisende|4 Personen": { personen: 4 }, "reisende|allein": { erwachsene: 1, kinder: 0 }, "reisende|2 Erwachsene 3 Kinder": { erwachsene: 2, kinder: 3 }, "reisende|12": { personen: 12 },
  "kinderAlter|5|1": { kinderAlter: [5] }, "kinderAlter|3 und 7": { kinderAlter: [3, 7] }, "kinderAlter|1 Jahr": { kinderAlter: [1] }, "kinderAlter|3 7 9": { kinderAlter: [3, 7, 9] },
  "preis|150": { maxPreis: 150 }, "preis|150 €": { maxPreis: 150 }, "preis|max 150": { maxPreis: 150 }, "preis|2000 gesamt": { budgetGesamt: 2000 }, "preis|egal": { preisEgal: true }, "preis|50": { maxPreis: 50 },
  "verpflegung|HP": { verpflegung: "halb", verpflegungEgal: false }, "verpflegung|VP": { verpflegung: "voll", verpflegungEgal: false }, "verpflegung|Frühstück": { verpflegung: "fruehstueck", verpflegungEgal: false },
  "verpflegung|egal": { verpflegungEgal: true }, "verpflegung|Vollpension bitte": { verpflegung: "voll", verpflegungEgal: false },
  "flugAb|Hamburg": { flugAb: "Hamburg", flugAbEgal: false }, "flugAb|Köln": { flugAb: "Köln", flugAbEgal: false }, "flugAb|Düsseldorf": { flugAb: "Düsseldorf", flugAbEgal: false },
  "flugAb|München": { flugAb: "München", flugAbEgal: false }, "flugAb|Frankfurt": { flugAb: "Frankfurt", flugAbEgal: false }, "flugAb|Berlin": { flugAb: "Berlin", flugAbEgal: false }, "flugAb|Hannover": { flugAb: "Hannover", flugAbEgal: false },
  "anreise|12": { anreise: "2027-07-12" }, "anreise|am 12.": { anreise: "2027-07-12" }, "anreise|12.7.": { anreise: "2027-07-12" }, "anreise|1.": { anreise: "2027-07-01" },
};

let gut = 0, schlecht = 0;
const zeilen = [];
for (const [thema, satz, lage = {}] of F) {
  const p = JSON.parse(JSON.stringify(lage));
  const kern = { lauf: { profil: p, gespraech: [{ role: "user", content: satz }], protokoll: [], gefragtWie: {}, uebersprungen: {}, zugSeit: 3 }, notieren() {}, standAnzeigen() {}, sichern() {}, sagen() {} };
  const vorher = JSON.stringify(p);
  try { WK.antwortSelbstLesen(kern, thema, satz); } catch { /* zaehlt nur, was im Stand steht */ }
  const sofort = JSON.stringify(p) !== vorher ? Object.fromEntries(Object.entries(p).filter(([k, w]) => k !== "vonPerson" && JSON.stringify(w) !== JSON.stringify(JSON.parse(vorher)[k]))) : null;
  const schl = thema === "kinderAlter" && satz === "5" ? `${thema}|${satz}|${lage.kinder}` : `${thema}|${satz}`;
  const soll = SOLL[schl] || null;
  const ok = JSON.stringify(sofort) === JSON.stringify(soll);
  if (ok) gut++; else { schlecht++; zeilen.push(`  FALSCH ${thema.padEnd(11)} "${satz}" -> sofort ${JSON.stringify(sofort)}  (soll ${JSON.stringify(soll)})`); }
}
console.log(`Saetze: ${F.length}`);
if (zeilen.length) console.log(zeilen.join("\n"));
console.log(`\n${gut} richtig, ${schlecht} falsch`);
if (schlecht) process.exitCode = 1;
