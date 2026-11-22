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
const { laden, BANK } = require("./satzbank-daten.cjs");
const { WK, KN } = laden();
const alle = process.argv.includes("--alle");

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
  if (modus === "echt") Object.assign(args, fall.echt);
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
    if (fall.echt) {
      bb.echtFaelle = (bb.echtFaelle || 0) + 1;
      const r = await lauf(fall, "echt");
      const abw = r.fehler ? [`FEHLER ${r.fehler}`] : [...vergleiche(r.p, fall.soll), ...verletzt(r.p, fall.verboten)];
      if (!abw.length) bb.echtGut = (bb.echtGut || 0) + 1;
      else fehler.push({ b: fall.b, modus: "echt", du: fall.du, abw });
      continue;
    }
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
  const echt = Object.values(bericht).reduce((x, z) => [x[0] + (z.echtGut || 0), x[1] + (z.echtFaelle || 0)], [0, 0]);
  if (echt[1]) console.log(`echte Modellantworten richtig verarbeitet: ${echt[0]}/${echt[1]}`);
  console.log(`${"GESAMT".padEnd(13)} ${String(summe.faelle).padStart(6)} ${String(summe.stumm).padStart(6)} ${String(summe.naiv).padStart(5)} ${String("+" + summe.nf).padStart(13)} ${String(summe.beleg).padStart(6)} ${`${summe.fa}/${summe.ff}`.padStart(17)}`);
  console.log("\nABWEICHUNGEN (naiv/beleg/falsch" + (alle ? "/stumm" : "") + "):");
  for (const f of fehler) console.log(`  [${f.b} | ${f.modus}] "${f.du}" -> ${f.abw.join("; ")}${f.nachfrage ? `  (Nachfrage: ${f.nachfrage})` : ""}`);
  const ok = fehler.filter((f) => f.modus !== "stumm").length === 0;
  process.exit(ok ? 0 : 1);
})();
