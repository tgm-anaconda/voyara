/* Satzbank-Lauf (22.11.2026) - viele typische Antworten durch den Kern.
 *
 *   node agent/satzbank-test.cjs           Bericht je Bereich und Fassung
 *   node agent/satzbank-test.cjs --alle    zusaetzlich jeden Treffer
 *
 * Ben: "Ganz viele unterschiedliche Nachrichten durch den Kern jagen und
 * automatisch auswerten, ob sauber ausgelesen wurde - damit man sieht,
 * welche Fragen noch nicht sauber hinterlegt sind."
 *
 * Jeder Satz laeuft wie im echten Zug: erst liest der Kern selbst
 * (antwortSelbstLesen, regionenLesen), dann uebernimmt er die Werte des
 * Modells (stand_merken). Drei Fassungen des Modells:
 *   stumm   schickt nichts            -> was kann der Kern allein?
 *   naiv    schickt die richtigen Werte, ohne Belege -> verwirft der Kern
 *           Richtiges? (Dann zaehlt, ob wenigstens nachgefragt wird.)
 *   beleg   wie naiv, mit Belegen (Zitat = ganze Nachricht)
 * Dazu Faelle, in denen das Modell FALSCHES schickt: Der Kern darf es
 * nicht uebernehmen.
 * Kostet nichts - es wird kein Modell gerufen.
 */
const fs = require("fs"), vm = require("vm");
const B = "/Users/tom-gabrielmielicki/Desktop/Bachelor Arbeit/Website/";
const ctx = { console, window: {},
  document: { querySelectorAll: () => [], querySelector: () => null, getElementById: () => null,
    createElement: () => ({ setAttribute() {}, append() {}, appendChild() {}, querySelector: () => null, classList: { add() {}, remove() {} }, style: {} }),
    head: { appendChild() {} }, body: { classList: { contains: () => false, add() {}, remove() {}, toggle() {} } },
    documentElement: { classList: { add() {}, remove() {} } }, addEventListener() {} },
  location: { search: "", href: "" }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  sessionStorage: { getItem: () => null, setItem() {} }, setTimeout, clearTimeout,
  fetch: () => Promise.reject(new Error("kein Netz")), navigator: { userAgent: "test" }, matchMedia: () => ({ matches: false, addEventListener() {} }),
  URLSearchParams, URL, Date, JSON, Math, Promise, Intl, requestAnimationFrame: (f) => setTimeout(f, 0), cancelAnimationFrame: clearTimeout,
  addEventListener() {}, removeEventListener() {}, screen: { width: 1440, height: 900 }, innerWidth: 1440, innerHeight: 900, scrollTo() {},
  getComputedStyle: () => ({ getPropertyValue: () => "" }) };
ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);
for (const f of ["data/ziele.js", "data/hotels.js", "data/inventory.js", "data/auswahl.js", "data/bildpfade.js",
  "data/faq.js", "agent/fluege.js", "agent/politik.js", "agent/werkzeugkasten.js", "agent/kern.js"]) {
  try { vm.runInContext(fs.readFileSync(B + f, "utf8"), ctx, { filename: f }); }
  catch (e) { console.log("LADEFEHLER", f, e.message.slice(0, 160)); process.exit(2); }
}
vm.runInContext("this.WK=Werkzeugkasten; this.KN=Kern;", ctx);
const { WK, KN } = ctx;
const alle = process.argv.includes("--alle");

/* Die Satzbank: thema = offene Frage, vor = Stand davor, du = Nachricht,
   soll = was danach im Stand stehen muss (Teilmenge), m = was ein richtig
   verstehendes Modell schickt (ohne Angabe: soll, mit personen ->
   personenGesamt), falsch = was ein falsch verstehendes Modell schickt,
   verboten = was dann NICHT im Stand stehen darf. */
const M10 = { monat: 10, vonPerson: { monat: true } };
const E2 = { erwachsene: 2, kinder: 0, personen: 2, vonPerson: { erwachsene: true, kinder: true } };
const E3 = { erwachsene: 3, kinder: 0, personen: 3, vonPerson: { erwachsene: true, kinder: true } };
const BANK = [
  // --- Reisezeit ---
  { b: "zeit", du: "im März", soll: { monat: 3 } },
  { b: "zeit", du: "Oktober", soll: { monat: 10 } },
  { b: "zeit", du: "gerne im august", soll: { monat: 8 } },
  { b: "zeit", du: "an Ostern", soll: { monat: 3 } },
  { b: "zeit", du: "über ostern", soll: { monat: 3 } },
  { b: "zeit", du: "zu Pfingsten", soll: { monat: 5 } },
  { b: "zeit", du: "an Weihnachten", soll: { monat: 12 } },
  { b: "zeit", du: "über Silvester", soll: { monat: 12 } },
  { b: "zeit", du: "ich würde gerne am reformationstag fliegen", soll: { monat: 10, anreise: "2027-10-31" } },
  { b: "zeit", du: "an Halloween", soll: { monat: 10, anreise: "2027-10-31" } },
  { b: "zeit", du: "am 3. Oktober", soll: { monat: 10, anreise: "2027-10-03" } },
  { b: "zeit", du: "am 31.10.", soll: { monat: 10, anreise: "2027-10-31" } },
  { b: "zeit", du: "Ende Oktober", soll: { monat: 10 } },
  { b: "zeit", du: "Anfang Juli", soll: { monat: 7 } },
  { b: "zeit", du: "in den Herbstferien", soll: { monat: 10 } },
  { b: "zeit", du: "nächsten Monat", soll: { monat: 12 } },
  { b: "zeit", du: "in zwei Monaten", soll: { monat: 1 } },
  { b: "zeit", du: "am Valentinstag", soll: { monat: 2, anreise: "2027-02-14" } },
  { b: "zeit", du: "zum Nikolaus", soll: { monat: 12 } },
  // --- Anreisetag (Monat steht, Tagesfrage offen) ---
  { b: "anreise", vor: M10, lauf: { datumFrage: 2 }, du: "am 31.", soll: { anreise: "2027-10-31" } },
  { b: "anreise", vor: M10, lauf: { datumFrage: 2 }, du: "31", soll: { anreise: "2027-10-31" } },
  { b: "anreise", vor: M10, lauf: { datumFrage: 2 }, du: "31 wie gesagt", soll: { anreise: "2027-10-31" } },
  { b: "anreise", vor: M10, lauf: { datumFrage: 2 }, du: "der 31. bitte", soll: { anreise: "2027-10-31" } },
  { b: "anreise", vor: M10, lauf: { datumFrage: 2 }, du: "den 5.", soll: { anreise: "2027-10-05" } },
  { b: "anreise", vor: M10, lauf: { datumFrage: 2 }, du: "5.10.", soll: { anreise: "2027-10-05" } },
  { b: "anreise", vor: M10, lauf: { datumFrage: 2 }, du: "lieber am 8ten", soll: { anreise: "2027-10-08" } },
  { b: "anreise", vor: M10, lauf: { datumFrage: 2 }, du: "ja am reformationstag", soll: { anreise: "2027-10-31" } },
  { b: "anreise", vor: M10, lauf: { datumFrage: 2 }, du: "am 12. Oktober", soll: { anreise: "2027-10-12" } },
  { b: "anreise", vor: M10, lauf: { datumFrage: 2 }, du: "ja, am 20.", soll: { anreise: "2027-10-20" } },
  // --- Dauer ---
  { b: "dauer", du: "9", soll: { naechte: 9 } },
  { b: "dauer", du: "9 Nächte", soll: { naechte: 9 } },
  { b: "dauer", du: "eine Woche", soll: { naechte: 7 } },
  { b: "dauer", du: "zwei Wochen", soll: { naechte: 14 } },
  { b: "dauer", du: "so 10 nächte", soll: { naechte: 10 } },
  { b: "dauer", du: "ich will gerne 9 nächte nach malle", soll: { naechte: 9, zielId: "mallorca" } },
  // --- Reisende ---
  { b: "reisende", du: "ich und meine Freundin", soll: { erwachsene: 2, kinder: 0 } },
  { b: "reisende", du: "ich und meine Oma", soll: { erwachsene: 2, kinder: 0 } },
  { b: "reisende", du: "ich und mein cousin", soll: { erwachsene: 2, kinder: 0 } },
  { b: "reisende", du: "ich alleine", soll: { erwachsene: 1, kinder: 0 } },
  { b: "reisende", du: "2 Erwachsene", soll: { erwachsene: 2, kinder: 0 } },
  { b: "reisende", du: "4 Erwachsene und 1 Kind", soll: { erwachsene: 4, kinder: 1 } },
  { b: "reisende", du: "meine Frau, ich und unsere zwei Kinder", soll: { erwachsene: 2, kinder: 2 } },
  { b: "reisende", du: "wir sind zu dritt", soll: { personen: 3 } },
  { b: "reisende", du: "3", soll: { personen: 3 } },
  { b: "reisende", du: "ich und zwei freunde", soll: { erwachsene: 3, kinder: 0 } },
  { b: "reisende", du: "ich mit meinem Sohn, er ist 8", soll: { erwachsene: 1, kinder: 1, kinderAlter: [8] } },
  // --- Korrekturen der Gruppe ---
  { b: "korrektur", thema: "art", vor: E2, du: "meine freundin ist 17", soll: { erwachsene: 1, kinder: 1, kinderAlter: [17] },
    falsch: { kinder: 1, kinderAlter: [17] }, verboten: { erwachsene: 2 } },
  { b: "korrektur", thema: "art", vor: E2, du: "einer von uns ist erst 16", soll: { erwachsene: 1, kinder: 1, kinderAlter: [16] },
    falsch: { kinder: 1, kinderAlter: [16] }, verboten: { erwachsene: 2 } },
  { b: "korrektur", thema: "art", vor: E3, du: "sorry einer meiner freunde ist noch 17", soll: { erwachsene: 2, kinder: 1, kinderAlter: [17] },
    falsch: { kinder: 1, kinderAlter: [17] }, verboten: { erwachsene: 3 } },
  { b: "korrektur", thema: "art", vor: E2, du: "unser sohn kommt auch mit, er ist 5", soll: { erwachsene: 2, kinder: 1, kinderAlter: [5] } },
  { b: "korrektur", thema: "art", vor: E2, du: "doch zu dritt, mein bruder kommt mit", soll: { erwachsene: 3 } },
  // --- Kinderalter ---
  { b: "kinderAlter", vor: { erwachsene: 2, kinder: 2, personen: 4 }, du: "5 und 8", soll: { kinderAlter: [5, 8] } },
  { b: "kinderAlter", vor: { erwachsene: 2, kinder: 2, personen: 4 }, du: "zwei und vier", soll: { kinderAlter: [2, 4] } },
  { b: "kinderAlter", vor: { erwachsene: 2, kinder: 2, personen: 4 }, du: "der kleine ist 3 und die große 7", soll: { kinderAlter: [3, 7] } },
  { b: "kinderAlter", vor: { erwachsene: 2, kinder: 1, personen: 3 }, du: "sie ist 12", soll: { kinderAlter: [12] } },
  // --- Unterkunftsart ---
  { b: "art", du: "Hotel", soll: { typ: "hotel" } },
  { b: "art", du: "lieber eine Ferienwohnung", soll: { typ: "apartment" } },
  { b: "art", du: "beides", soll: { artEgal: true } },
  { b: "art", du: "Beides zeigen", soll: { artEgal: true } },
  { b: "art", du: "ist mir egal", soll: { artEgal: true } },
  { b: "art", du: "auch Ferienwohnungen", soll: { artEgal: true } },
  { b: "art", du: "ein Hotel auf Malle", soll: { typ: "hotel", zielId: "mallorca" } },
  { b: "art", du: "ich will gerne in ein Hotel auf Malle oder nach Asien", soll: { typ: "hotel", zieleAuswahl: ["krabi", "kyoto", "mallorca"] },
    falsch: { artEgal: true, zieleAuswahl: ["mallorca", "krabi"] }, verboten: { artEgal: true } },
  { b: "art", du: "ein hotel auf malle, auch gern asien", soll: { typ: "hotel", zieleAuswahl: ["krabi", "kyoto", "mallorca"] } },
  // --- Ziele ---
  { b: "ziel", du: "Mallorca", soll: { zielId: "mallorca" } },
  { b: "ziel", du: "nach Malle", soll: { zielId: "mallorca" } },
  { b: "ziel", du: "Kreta oder Mallorca", soll: { zieleAuswahl: ["kreta", "mallorca"] } },
  { b: "ziel", du: "nach Spanien", soll: { zieleAuswahl: ["barcelona", "mallorca", "teneriffa"] } },
  { b: "ziel", du: "irgendwo in Asien", soll: { zieleAuswahl: ["krabi", "kyoto"] } },
  { b: "ziel", du: "Skandinavien", soll: { zieleAuswahl: ["island", "lappland"] } },
  { b: "ziel", du: "ans Mittelmeer", soll: { zieleAuswahl: ["barcelona", "kreta", "mallorca", "sardinien"] } },
  { b: "ziel", du: "nach Thailand", soll: { zielId: "krabi" } },
  { b: "ziel", du: "nach Japan", soll: { zielId: "kyoto" } },
  { b: "ziel", du: "in die Alpen", soll: { zieleAuswahl: ["suedtirol", "tirol"] } },
  { b: "ziel", du: "Portugal", soll: { zieleAuswahl: ["algarve", "lissabon"] } },
  { b: "ziel", du: "nach NYC", soll: { zielId: "newyork" } },
  { b: "ziel", du: "Kapstadt", soll: { zielId: "kapstadt" } },
  { b: "ziel", du: "nach malle oder aufs spanische festland", soll: { zieleAuswahl: ["barcelona", "mallorca"] },
    falsch: { zieleAus: ["mallorca", "barcelona"] }, verboten: { zieleAus: ["mallorca"] } },
  { b: "ziel", du: "ich will nach mallorca", soll: { zielId: "mallorca" }, falsch: { ziel: "kreta" }, verboten: { zielId: "kreta" } },
  { b: "ziel", du: "ans Mittelmeer", soll: {}, falsch: { ziel: "mallorca" }, verboten: { zielId: "mallorca" }, nurFalsch: true },
  // --- Ausschluesse ---
  { b: "ausschluss", du: "nicht nach Mallorca", soll: { zieleAus: ["mallorca"] } },
  { b: "ausschluss", du: "bitte nicht nach Spanien", soll: { zieleAus: ["barcelona", "mallorca", "teneriffa"] } },
  { b: "ausschluss", du: "alles außer Kreta", soll: { zieleAus: ["kreta"] } },
  { b: "ausschluss", du: "Kreta lieber nicht", soll: { zieleAus: ["kreta"] } },
  { b: "ausschluss", thema: "ziel", vor: { zieleAuswahl: ["mallorca"] }, du: "Eher kalt", soll: { richtung: "kalt" },
    falsch: { richtung: "kalt", zieleAus: ["mallorca"] }, verboten: { zieleAus: ["mallorca"] } },
  // --- Flug ---
  { b: "flug", du: "mit Flug", soll: { flug: true } },
  { b: "flug", du: "ohne Flug", soll: { flug: false } },
  { b: "flug", du: "wir fahren mit dem Auto", soll: { flug: false } },
  { b: "flugAb", vor: { flug: true }, du: "Hamburg", soll: { flugAb: "Hamburg" } },
  { b: "flugAb", vor: { flug: true }, du: "von München aus", soll: { flugAb: "München" } },
  { b: "flugAb", vor: { flug: true }, du: "ab Düsseldorf", soll: { flugAb: "Düsseldorf" } },
  { b: "flugAb", vor: { flug: true }, du: "der nächste von Lüneburg", soll: {}, falsch: { flugAb: "Hamburg" }, verboten: { flugAb: "Hamburg" }, nurFalsch: true },
  // --- Verpflegung ---
  { b: "verpflegung", du: "Halbpension", soll: { verpflegung: "halb" } },
  { b: "verpflegung", du: "HP", soll: { verpflegung: "halb" } },
  { b: "verpflegung", du: "All Inclusive", soll: { verpflegung: "ai" } },
  { b: "verpflegung", du: "AI bitte", soll: { verpflegung: "ai" } },
  { b: "verpflegung", du: "nur Frühstück", soll: { verpflegung: "fruehstueck" } },
  { b: "verpflegung", du: "egal", soll: { verpflegungEgal: true } },
];

const sortiert = (x) => (Array.isArray(x) ? JSON.stringify([...x].map(String).sort()) : JSON.stringify(x ?? null));
const modellArgs = (soll) => {
  const a = { ...soll };
  if (a.personen != null) { a.personenGesamt = a.personen; delete a.personen; }
  if (a.zielId) { a.ziel = a.zielId; delete a.zielId; }
  return a;
};

const lauf = async (fall, modus) => {
  const thema = fall.thema || fall.b === "korrektur" ? fall.thema || "art" : null;
  const t = fall.thema || ({ korrektur: "art", ausschluss: "ziel" }[fall.b]) || fall.b;
  const p = JSON.parse(JSON.stringify(fall.vor || {}));
  const kern = { lauf: { profil: p, gespraech: [{ role: "assistant", content: "Frage" }, { role: "user", content: fall.du }], protokoll: [],
      annahmeOffen: [], gefragtWie: {}, verlauf: [], nachrichtArt: "antwort", runde: 1, zugSeit: 77, gefragt: t, zuletztGefragt: t, ...(fall.lauf || {}) },
    notieren(e, d) { this.lauf.protokoll.push({ ereignis: e, ...d }); },
    freigabe: () => "suchen", darf: () => false, logZeile() {}, sagen() {}, standAnzeigen() {}, sichern() {}, standKurz: () => "", antwortWerten() {},
    gespraechPush() {}, sagenUndMerken() {} };
  // 1. Der Kern liest selbst (wie in Kern.eingabeInnen)
  try { WK.antwortSelbstLesen(kern, t, fall.du); } catch { /* weiter */ }
  if (KN.regionenLesen) {
    const altL = KN.lauf, n = KN.notieren, s = KN.standAnzeigen, si = KN.sichern;
    KN.lauf = kern.lauf; KN.notieren = kern.notieren; KN.standAnzeigen = () => {}; KN.sichern = () => {};
    try { KN.regionenLesen(fall.du); } catch { /* weiter */ }
    KN.lauf = altL; KN.notieren = n; KN.standAnzeigen = s; KN.sichern = si;
  }
  // 2. Das Modell
  let args = { nachricht_art: "antwort", frage_beantwortet: "ja" };
  if (modus === "naiv" || modus === "beleg") Object.assign(args, fall.m || modellArgs(fall.soll));
  if (modus === "falsch") Object.assign(args, fall.falsch);
  if (modus === "beleg") {
    const felder = Object.keys(args).filter((k) => !["nachricht_art", "frage_beantwortet"].includes(k));
    args.belege = Object.fromEntries(felder.map((k) => [k, fall.du]));
  }
  try { await WK.werkzeuge.stand_merken.call(WK, args, kern); } catch (e) { return { p, fehler: e.message, kern }; }
  return { p, kern };
};

const vergleiche = (p, soll) => Object.entries(soll).filter(([k, v]) => sortiert(p[k]) !== sortiert(v)).map(([k, v]) => `${k}: soll ${sortiert(v)}, ist ${sortiert(p[k])}`);
const verletzt = (p, verboten) => Object.entries(verboten || {}).filter(([k, v]) => {
  if (Array.isArray(v)) return Array.isArray(p[k]) && v.some((x) => p[k].includes(x));
  return sortiert(p[k]) === sortiert(v);
}).map(([k, v]) => `${k} darf nicht ${sortiert(v)} sein, ist ${sortiert(p[k])}`);

(async () => {
  const bericht = {};
  const fehler = [];
  for (const fall of BANK) {
    const bb = (bericht[fall.b] ||= { faelle: 0, stumm: 0, naiv: 0, naivNachfrage: 0, beleg: 0, falschAbgewehrt: 0, falschFaelle: 0 });
    if (!fall.nurFalsch) {
      bb.faelle++;
      for (const modus of ["stumm", "naiv", "beleg"]) {
        const r = await lauf(fall, modus);
        const abw = r.fehler ? [`FEHLER ${r.fehler}`] : vergleiche(r.p, fall.soll);
        if (!abw.length) bb[modus]++;
        else {
          let nachfrage = null;
          if (modus === "naiv") {
            try { nachfrage = WK.bestaetigungRueckfrage(r.p, r.kern.lauf); } catch { nachfrage = null; }
            if (nachfrage) bb.naivNachfrage++;
          }
          if (modus !== "stumm" || alle) fehler.push({ b: fall.b, modus, du: fall.du, abw, nachfrage: nachfrage?.satz || null });
        }
      }
    }
    if (fall.falsch) {
      bb.falschFaelle++;
      const r = await lauf(fall, "falsch");
      const v = r.fehler ? [`FEHLER ${r.fehler}`] : verletzt(r.p, fall.verboten);
      if (!v.length) bb.falschAbgewehrt++;
      else fehler.push({ b: fall.b, modus: "falsch", du: fall.du, abw: v });
    }
  }
  console.log("\nSATZBANK - Treffer je Bereich (stumm = Kern allein, naiv = Modell ohne Beleg, beleg = Modell mit Beleg)\n");
  console.log("Bereich       Faelle  stumm  naiv  (+Nachfrage)  beleg  falsch abgewehrt");
  let summe = { faelle: 0, naiv: 0, beleg: 0, nf: 0, ff: 0, fa: 0, stumm: 0 };
  for (const [b, z] of Object.entries(bericht)) {
    console.log(`${b.padEnd(13)} ${String(z.faelle).padStart(6)} ${String(z.stumm).padStart(6)} ${String(z.naiv).padStart(5)} ${String("+" + z.naivNachfrage).padStart(13)} ${String(z.beleg).padStart(6)} ${z.falschFaelle ? `${z.falschAbgewehrt}/${z.falschFaelle}`.padStart(17) : "".padStart(17)}`);
    summe.faelle += z.faelle; summe.naiv += z.naiv; summe.beleg += z.beleg; summe.nf += z.naivNachfrage; summe.ff += z.falschFaelle; summe.fa += z.falschAbgewehrt; summe.stumm += z.stumm;
  }
  console.log(`${"GESAMT".padEnd(13)} ${String(summe.faelle).padStart(6)} ${String(summe.stumm).padStart(6)} ${String(summe.naiv).padStart(5)} ${String("+" + summe.nf).padStart(13)} ${String(summe.beleg).padStart(6)} ${`${summe.fa}/${summe.ff}`.padStart(17)}`);
  console.log("\nABWEICHUNGEN (naiv/beleg/falsch" + (alle ? "/stumm" : "") + "):");
  for (const f of fehler) console.log(`  [${f.b} | ${f.modus}] "${f.du}" -> ${f.abw.join("; ")}${f.nachfrage ? `  (Nachfrage: ${f.nachfrage})` : ""}`);
  const ok = fehler.filter((f) => f.modus !== "stumm").length === 0;
  process.exit(ok ? 0 : 1);
})();
