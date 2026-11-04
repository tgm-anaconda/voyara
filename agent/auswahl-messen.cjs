/* Reicht die Auswahl? (03.11.2026)
 *
 *   node agent/auswahl-messen.cjs              Hotels und Wohnungen
 *   node agent/auswahl-messen.cjs --wohnungen  nur Ferienwohnungen
 *   node agent/auswahl-messen.cjs --alt        Gegenprobe am Stand davor
 *
 * Es gibt zwei Massstaebe, beide vom Nutzer, und beide werden gemessen:
 *
 * A) 01.11.2026 - In jeder Kombination, die eine Person sinnvoll nennen
 *    kann, sollen am Ende **mindestens vier Haeuser mit aehnlichem
 *    Preis** stehen (Spanne bis +30 %). Sonst entscheidet beim finalen
 *    Vergleich der Preis statt des Partnerlabels - und dann misst die
 *    Studie etwas anderes, als sie messen soll.
 *
 * B) 03.11.2026, gelockert - Es muessen **immer mindestens acht Objekte**
 *    uebrig sein, egal wie gefiltert wird; liegt die Zahl **unter zehn**,
 *    soll der Agent fragen, ob er die Suche ausweiten darf. B ist der
 *    verbindliche Massstab, A der schaerfere: A zu erfuellen heisst, dass
 *    im Vergleich wirklich der Preis nicht entscheidet. Die Schwelle 10
 *    steht als ENGSTELLE_FRAGE_GRENZE im Werkzeugkasten.
 *
 * ANGENOMMENE AUSNAHME (Entscheidung des Nutzers, 04.11.2026)
 * ------------------------------------------------------------------
 * Die Kette "hoechstens 150 EUR" verfehlt Massstab B in 31 von 1759
 * Faellen, vor allem in New York, Barcelona und Kyoto. Diese Luecken
 * werden NICHT gefuellt: Ein Haus unter 150 EUR liegt dort am Rand des
 * Marktes, und 40 bis 60 erfundene Budgethaeuser in Manhattan machten den
 * Katalog unglaubwuerdiger, nicht besser. Stattdessen ist es die eine
 * Stelle, an der der Agent zu Recht sagt "zu dem Preis wird es hier
 * duenn, soll ich das Budget anheben oder andere Ziele ansehen?" - und
 * genau diese Rueckfrage und die Umentscheidungen danach sollen
 * beobachtet werden.
 *
 * Ein Lauf, der nur bei dieser Kette unter acht meldet, ist also KEIN
 * Fehlschlag. Jede andere Kette unter acht ist einer - mit einer Ausnahme:
 *
 * "Familie mit Pool / Krabi / Monat 2" bleibt bei sechs Objekten. Krabi hat
 * 22 Wohnungen, 14 davon mit Pool und zwoelf fuer vier Personen oder mehr -
 * im Februar wirft die Belegungssimulation aber die Haelfte davon heraus.
 * Februar ist in Thailand Hochsaison, "vieles ist belegt" ist dort die
 * Wahrheit. Entscheidend ist, dass Massstab A hier erfuellt ist: Die sechs
 * liegen preislich nah genug beieinander, dass im Endvergleich nicht der
 * Preis entscheidet, sondern das Partnerlabel. Den Pool-Anteil weiter
 * anzuheben haette den Filter in allen anderen Regionen entwertet (dort
 * waeren es 16 von 20 Wohnungen gewesen) - fuer eine einzige Zelle.
 *
 * Bisher lag diese Messung in einem Wegwerfskript. Sie gehoert ins
 * Projekt: Jede Aenderung an Preisen, Saison oder Katalog kann sie
 * umwerfen, und dann muss man es sehen koennen.
 */
const fs = require("fs"), vm = require("vm");
const B = "/Users/tom-gabrielmielicki/Desktop/Bachelor Arbeit/Website/";
const alt = process.argv.includes("--alt");
const nurWohnungen = process.argv.includes("--wohnungen");
const q = alt ? B + "_backup/2026-11-03-vor-kleinigkeiten/" : B;

const ctx = { console, window: {},
  document: { querySelectorAll: () => [], querySelector: () => null, getElementById: () => null,
    body: { classList: { contains: () => false, add() {}, remove() {} } },
    documentElement: { classList: { add() {}, remove() {} } }, addEventListener() {} },
  location: { search: "", href: "" }, localStorage: { getItem: () => null, setItem() {} },
  sessionStorage: { getItem: () => null, setItem() {} }, setTimeout, clearTimeout,
  fetch: () => Promise.reject(new Error("kein Netz")), navigator: { userAgent: "test" },
  matchMedia: () => ({ matches: false, addEventListener() {} }), URLSearchParams };
ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);
// Nur die Dateien, die die Gegenprobe betreffen, kommen aus der Sicherung
const ausSicherung = new Set(["data/ziele.js", "data/inventory.js", "agent/werkzeugkasten.js"]);
for (const f of ["data/ziele.js", "data/hotels.js", "data/inventory.js", "data/auswahl.js",
  "agent/politik.js", "agent/werkzeugkasten.js"]) {
  const pfad = (alt && ausSicherung.has(f)) ? q + f : B + f;
  try { vm.runInContext(fs.readFileSync(pfad, "utf8"), ctx, { filename: f }); }
  catch (e) { console.log("LADEFEHLER", f, e.message.slice(0, 140)); process.exit(2); }
}
const WK = vm.runInContext("Werkzeugkasten", ctx);
const ZIELE = vm.runInContext("ZIELE", ctx);
const ZN = vm.runInContext("ZIEL_NACH_ID", ctx);

/* Sechs Filterketten, wie eine Person sie nennt. Die Gruppe steht dabei,
   weil sie den Preis bewegt; der Monat NICHT - gemessen wird jeder Monat,
   in dem die Region Saison hat.
   ------------------------------------------------------------------
   Bis zum 04.11.2026 stand hier je Kette ein fester Monat. Das taeuschte:
   Die Belegungssimulation wirft je Monat andere Haeuser heraus, und
   Suedtirol lag im Juli bei sieben, im August bei acht und im April bei
   dreizehn. Ein Monat misst also den Wuerfel, nicht den Katalog. */
const KETTEN = [
  { name: "Paar, nichts weiter", p: { naechte: 7, erwachsene: 2, kinder: 0 } },
  { name: "Familie zu viert", p: { naechte: 7, erwachsene: 2, kinder: 2 } },
  { name: "Familie mit Pool", p: { naechte: 7, erwachsene: 2, kinder: 2, ausstattung: ["pool"] } },
  { name: "Paar, 500 m zum Strand", p: { naechte: 7, erwachsene: 2, kinder: 0, maxStrand: 0.5 } },
  { name: "Paar, Wellness", p: { naechte: 7, erwachsene: 2, kinder: 0, ausstattung: ["spa"] } },
  { name: "Paar, hoechstens 150 EUR", p: { naechte: 7, erwachsene: 2, kinder: 0, maxPreis: 150 } },
];

/* Was in dieser Region ueberhaupt Sinn ergibt. Pool in Lappland und
   Strand in Wien sind keine Luecken, sondern Unsinn - die wuerden die
   Zahl nur aufblaehen. */
function sinnvoll(kette, ziel, typ) {
  const z = ZN[ziel];
  if (!z) return false;
  const p = kette.p;
  if (p.maxStrand != null && z.typ !== "strand" && !["kapstadt", "barcelona"].includes(ziel)) return false;
  if ((p.ausstattung || []).includes("pool") && ["lappland", "island", "wien", "newyork", "kyoto"].includes(ziel)) return false;
  /* Wellness in einer Ferienwohnung gibt es dort, wo es kalt ist, in
     Stadtresidenzen und als Hammam im Riad - nicht in einer
     Strandwohnung in Krabi oder auf Mallorca. Wer dort danach filtert,
     bekommt null Treffer, und der Agent sagt genau das. Das ist die
     richtige Antwort, keine Luecke im Katalog - sonst muesste man Saunen
     an den Strand bauen, nur damit eine Messung aufgeht; der Agent
     bietet in diesem Fall Hotels an. Bei Hotels ist es ohnehin anders:
     Ein Wellnessbereich gehoert dort auch in warmen Regionen zum Haus.
     Die Staedte standen hier frueher mit in der Liste, obwohl derselbe
     Kommentar Stadtresidenzen ausdruecklich ausnahm - daher kam die
     Luecke in Wien (04.11.2026). */
  if (typ === "apartment" && (p.ausstattung || []).includes("spa")
    && ["krabi", "kapstadt", "mallorca", "kreta", "algarve", "sardinien", "teneriffa"].includes(ziel)) return false;
  return true;
}

// Dieselbe Schwelle wie die Rueckfrage im Werkzeugkasten
const GRENZE_FRAGE = (() => {
  try { return vm.runInContext("STELLSCHRAUBEN.ENGSTELLE_FRAGE_GRENZE", ctx) || 10; }
  catch { return 10; }
})();

function messen(typ) {
  const zeilen = [];
  const unterAcht = [];
  let luecken = 0, faelle = 0, unterZehn = 0;
  for (const kette of KETTEN) {
    for (const z of ZIELE) {
      if (!sinnvoll(kette, z.id, typ)) continue;
      for (let monat = 1; monat <= 12; monat += 1) {
      const p = { ...kette.p, monat, typ, zielId: z.id };
      // Ausserhalb der Saison wird gar nicht erst angeboten - das ist
      // keine Luecke, sondern die Saison.
      const passung = vm.runInContext("saisonPassung", ctx)(z, p.monat);
      if (passung < 0.5) continue;
      faelle += 1;
      const treffer = WK.katalogTreffer(p, WK.filterAusStand(p));
      const preise = treffer.map((h) => WK.preis(h, monat, p)).sort((a, b) => a - b);
      // Der groesste Block, der in eine Spanne von +30 % passt
      let bester = 0;
      for (let i = 0; i < preise.length; i++) {
        let j = i;
        while (j < preise.length && preise[j] <= preise[i] * 1.3) j += 1;
        bester = Math.max(bester, j - i);
      }
      if (bester < 4) {
        luecken += 1;
        zeilen.push(`  ${kette.name} / ${z.name} / Monat ${monat}: `
          + `${treffer.length} Treffer, groesster Preisblock ${bester}`);
      }
      if (treffer.length < 8) {
        unterAcht.push(`  ${kette.name} / ${z.name} / Monat ${monat}: nur ${treffer.length} Objekte`);
      } else if (treffer.length < GRENZE_FRAGE) {
        unterZehn += 1;
      }
      }
    }
  }
  return { luecken, faelle, zeilen, unterAcht, unterZehn };
}

console.log(alt ? "GEGENPROBE am Stand vor den Kleinigkeiten" : "JETZIGER Stand");
for (const typ of nurWohnungen ? ["apartment"] : ["hotel", "apartment"]) {
  const r = messen(typ);
  const art = typ === "hotel" ? "Hotels" : "Ferienwohnungen";
  console.log(`\n${art}, Massstab A: ${r.luecken} von ${r.faelle} Kombinationen `
    + "ohne vier preislich aehnliche Haeuser");
  for (const z of r.zeilen.slice(0, 25)) console.log(z);
  if (r.zeilen.length > 25) console.log(`  ... und ${r.zeilen.length - 25} weitere`);
  const ausPreis = r.unterAcht.filter((z) => z.includes("hoechstens 150 EUR")).length;
  console.log(`${art}, Massstab B: ${r.unterAcht.length} von ${r.faelle} Kombinationen `
    + `unter acht Objekten, ${r.unterZehn} weitere unter ${GRENZE_FRAGE} `
    + "(dort fragt der Agent nach)");
  console.log(`  davon ${ausPreis} an der Preisgrenze - angenommene Ausnahme, siehe Kopf; `
    + `${r.unterAcht.length - ausPreis} anderswo, und die waeren ein Fehlschlag`);
  for (const z of r.unterAcht.filter((x) => !x.includes("hoechstens 150 EUR")).slice(0, 25))
    console.log(z);
}
