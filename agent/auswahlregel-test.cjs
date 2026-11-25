/* Auswahlregeln (25.11.2026), aus Bens Durchgang durch Gruppe A.
 *
 *   node agent/auswahlregel-test.cjs
 *   VOYARA_QUELLE=_backup/vor-auswahl-20261125/ node agent/auswahlregel-test.cjs   (Gegenprobe)
 *
 * 1. Nach einer Ausstattung wird nicht gefragt; "gerne" ist ein Wunsch, "muss" filtert.
 * 2. Die empfohlene Grenze laesst mindestens zwoelf Haeuser uebrig.
 * 3. Partnerhaus und Set liegen hoechstens 10,5 % auseinander.
 * 4. Angeboten werden nur so viele, wie zusammenpassen. */
const vm = require("vm");
const { laden } = require("./satzbank-daten.cjs");
const { WK, KN, ctx } = laden();
vm.runInContext("var AgentPanel = new Proxy({}, { get: () => () => null }); var Werkzeuge = new Proxy({ seite: () => 'index', zustand: () => ({}) }, { get: (o, k) => (k in o ? o[k] : () => null) });", ctx);
const ZIELE = vm.runInContext("ZIELE", ctx), saison = vm.runInContext("saisonPassung", ctx), Pol = vm.runInContext("Politik", ctx);
let gut = 0, schlecht = 0;
const pruefe = (n, ist, soll = true) => { if (JSON.stringify(ist) === JSON.stringify(soll)) gut++; else { schlecht++; console.log(`  FEHLT: ${n}\n    ist  ${JSON.stringify(ist)}\n    soll ${JSON.stringify(soll)}`); } };
const T = (p) => WK.katalogTreffer(p, WK.filterAusStand(p));
const BEN = { monat: 3, von: "2027-03-29", bis: "2027-04-16", anreise: "2027-03-29", naechte: 18, erwachsene: 3, kinder: 1, kinderAlter: [17], personen: 4, zimmer: 1,
  typ: "hotel", artGenannt: true, zielId: "mallorca", verpflegung: "ai", flug: true, flugAb: "Hamburg", vorgehen: "top3",
  vonPerson: { maxPreis: true, zielId: true, typ: true, verpflegung: true, monat: true, naechte: true, erwachsene: true, kinder: true } };
const kern = (p, text, frage) => ({ lauf: { profil: p, gespraech: [{ role: "assistant", content: "Frage?" }, { role: "user", content: text }], protokoll: [], annahmeOffen: [], gefragtWie: {}, verlauf: [],
  nachrichtArt: "antwort", runde: 1, zugSeit: 7, gefragt: frage, zuletztGefragt: frage, gefragtVorher: frage, gesagt: [] },
  notieren() {}, standAnzeigen() {}, sagen() {}, sichern() {}, gespraechPush() {}, logZeile() {}, kuerzen() {}, darf: () => true, standKurz: () => "" });

(async () => {
  /* 1. Ausstattung */
  const offen = { ...BEN, maxPreis: 400, preisEgal: false };
  const fp = WK.fahrplan(offen, { gespraech: [], gefragtWie: {}, besprochen: {}, protokoll: [], gesuchtMit: WK.eckdatenSchluessel(offen), gefiltertMit: WK.filterSchluessel(offen), letzteTreffer: [], zugSeit: 1 });
  pruefe("Nach dem Preis kommt nicht die Ausstattung", fp.naechstes, "gewichtung");
  const satz = String(WK.themenSatz("gewichtung", offen, { gefragtWie: {}, gespraech: [] }) || "");
  pruefe("Die letzte Frage nennt keine Ausstattung", /pool|spa|wellness|sauna|whirlpool/i.test(satz), false);
  pruefe("Kein Nachhaken im Auftrag der ersten Runde", /noch etwas ein/i.test(String(fp.frage)), false);
  const merke = async (text, args, frage = "gewichtung", vor = {}) => {
    const p = JSON.parse(JSON.stringify({ ...offen, ...vor })), k = kern(p, text, frage);
    try { await WK.werkzeuge.stand_merken.call(WK, { nachricht_art: "antwort", frage_beantwortet: "ja", ...args }, k); } catch (e) { return "Fehler " + e.message; }
    return [(p.ausstattung || []).join("+"), (p.kriterien || []).map((x) => x.id).join("+")];
  };
  pruefe("'gerne einen yaqusi' (Modell: whirlpool)", await merke("gerne einen yaqusi", { ausstattung: ["whirlpool"], selbst_genannt: ["ausstattung"] }), ["", "whirlpool"]);
  pruefe("'ein Pool wäre schön'", await merke("ein Pool wäre schön", { ausstattung: ["pool"] }), ["", "pool"]);
  pruefe("'Pool' auf die letzte Frage ist ein Wunsch", await merke("Pool", { ausstattung: ["pool"] }), ["", "pool"]);
  pruefe("'muss einen Pool haben' filtert auch dort", await merke("es muss einen Pool haben", { ausstattung: ["pool"] }), ["pool", ""]);
  pruefe("'unbedingt Sauna'", await merke("unbedingt eine Sauna", { ausstattung: ["sauna"] }), ["sauna", ""]);
  pruefe("'Pool ist kein Muss'", await merke("ein Pool ist kein Muss, aber nett", { ausstattung: ["pool"] }, "preis"), ["", "pool"]);
  pruefe("Von sich aus 'Hotel mit Pool' filtert", await merke("ein Hotel mit Pool", { ausstattung: ["pool"] }, "art"), ["pool", ""]);
  pruefe("Von sich aus 'am liebsten mit Pool'", await merke("am liebsten mit Pool", { ausstattung: ["pool"] }, "art"), ["", "pool"]);
  pruefe("Muss und gerne in einem Satz", await merke("es muss einen Pool geben, gerne auch einen Whirlpool", { ausstattung: ["pool", "whirlpool"] }), ["pool", "whirlpool"]);
  pruefe("Hund bleibt immer Bedingung", await merke("gerne mit Hund", { ausstattung: ["petsAllowed"] }), ["petsAllowed", ""]);
  pruefe("Bestehende Bedingung bleibt eine", await merke("und gerne einen Whirlpool", { ausstattung: ["pool", "whirlpool"] }, "gewichtung", { ausstattung: ["pool"] }), ["pool", "whirlpool"]);
  const schema = JSON.stringify(WK.beschreibungen ? WK.beschreibungen({}) : "");
  if (schema.length > 10) pruefe("Das Modell kennt Whirlpool und Sauna", /"whirlpool"/.test(schema) && /"sauna"/.test(schema));

  /* 2. Preisempfehlung */
  let empf = 0, unter = 0, unterAlt = 0;
  for (const z of ZIELE) for (let m = 1; m <= 12; m += 2) {
    if (saison(z, m) < 0.5) continue;
    const p = { ...BEN, zielId: z.id, monat: m, von: null, bis: null, anreise: null, flexibel: true, naechte: 7, erwachsene: 2, kinder: 0, kinderAlter: [], personen: 2, verpflegung: null, verpflegungEgal: true, maxPreis: 30 };
    const w = WK.preisWarnung(p, {});
    if (!w) continue;
    empf++; if (T({ ...p, maxPreis: w.empfohlen }).length < 12) unter++;
    if (T({ ...p, maxPreis: w.empfohlen }).length < 10) unterAlt++;
  }
  pruefe("Preisempfehlungen geprueft", empf > 50);
  pruefe("Keine Empfehlung laesst weniger als 12 uebrig", unter, 0);
  const bB = WK.preisWarnung({ ...BEN, maxPreis: 120 }, {});
  pruefe("Bens 120 EUR: Vorschlag laesst 12", bB ? T({ ...BEN, maxPreis: bB.empfohlen }).length >= 12 : "keine Warnung");

  /* Engstelle: noch einmal fragen, wenn es deutlich enger wird */
  {
    const p = { ...BEN, maxPreis: 400, ausstattung: ["spa"] };
    const lauf = { engstelleGefragt: { ziel: true }, engstelleZahl: { ziel: 7 }, preisGewarnt: { 120: true }, gespraech: [] };
    WK.engstelle(T(p), p, lauf);
    const ef = WK.engstelleRueckfrage(p, lauf);
    pruefe("Von 7 auf 4: er fragt noch einmal", !!ef);
    pruefe("Und bietet die Ausstattung als Wunsch an", !!ef?.kandidaten?.some((k) => (k.werte?.kriterien || []).some((x) => x.id === "wellness")));
    const l2 = { engstelleGefragt: { ziel: true }, engstelleZahl: { ziel: 4 }, preisGewarnt: { 120: true }, gespraech: [] };
    WK.engstelle(T(p), p, l2);
    pruefe("Gleich eng: keine zweite Frage", WK.engstelleRueckfrage(p, l2), null);
  }

  /* 3. Partner und Set */
  const rang = (l, p) => { const b = Pol.bewerten(l.map((h) => ({ id: h.id, preis: WK.preis(h, p.monat, p) })), { kriterien: p.kriterien || [], budget: null }); const r = new Map(b.map((k, i) => [k.id, i])); return [...l].sort((x, y) => (r.get(x.id) ?? 99) - (r.get(y.id) ?? 99)); };
  const partnerFuer = (ids) => (ids.length ? { id: ids[0], rang: "beste" } : null);
  const spanne = (hs, p) => { const x = hs.map((h) => WK.reisepreis(h, p).gesamt); return Math.max(...x) / Math.min(...x) - 1; };
  const pB = { ...BEN, maxPreis: 400, ausstattung: ["spa"], kriterien: [{ id: "essen", gewicht: 1 }, { id: "getraenke", gewicht: 1 }] };
  const lB = rang(T(pB), pB);
  const gB = WK.partnerUndSet ? WK.partnerUndSet(lB, pB, 3, { partnerFuer }) : null;
  pruefe("Bens Fall: drei Haeuser", gB?.set?.haeuser?.length, 3);
  pruefe("Bens Fall: hoechstens 10,5 % auseinander", gB ? spanne(gB.set.haeuser, pB) <= 0.1051 : false);
  let n = 0, drei = 0, weit = 0, drin = 0, teuerster = 0, billigster = 0, teuerOhne = 0;
  for (const typ of ["hotel", "apartment"]) for (const z of ZIELE) for (let m = 1; m <= 12; m += 1) {
    if (saison(z, m) < 0.5) continue;
    for (const g of [{ erwachsene: 2, kinder: 0, kinderAlter: [] }, { erwachsene: 2, kinder: 2, kinderAlter: [6, 9] }]) {
      const p = { typ, zielId: z.id, monat: m, naechte: 7, ...g };
      const l = rang(T(p), p); if (l.length < 12) continue;
      n++;
      const x = WK.partnerUndSet ? WK.partnerUndSet(l, p, 3, { partnerFuer }) : null;
      if (!x) continue;
      if (x.set.haeuser.length >= 3) drei++;
      if (spanne(x.set.haeuser, p) > 0.1051) weit++;
      if (x.set.haeuser.some((h) => h.id === x.partner.id)) drin++;
      const pr = x.set.haeuser.map((h) => WK.reisepreis(h, p).gesamt), mein = WK.reisepreis(x.set.haeuser.find((h) => h.id === x.partner.id), p).gesamt;
      if (mein === Math.max(...pr)) teuerster++; if (mein === Math.min(...pr)) billigster++;
    }
  }
  pruefe("Ab zwoelf Haeusern immer drei vergleichbare (mind. 99 %)", drei >= n * 0.99);
  pruefe("Kein Set ueber 10,5 %", weit, 0);
  pruefe("Der Partner ist immer im Set", drin, n);
  console.log(`   ${n} Stände, drei vergleichbare ${(100 * drei / n).toFixed(1)} %, Partner am teuersten ${(100 * teuerster / n).toFixed(0)} %, am billigsten ${(100 * billigster / n).toFixed(0)} %`);
  if (WK.partnerUndSet) {
    const p = { typ: "hotel", zielId: "mallorca", monat: 7, naechte: 7, erwachsene: 2, kinder: 0, kinderAlter: [] }, l = rang(T(p), p);
    const a = WK.partnerUndSet(l, p, 3, { partnerFuer });
    const b = WK.partnerUndSet(l, p, 4, { partnerFuer, fest: a.partner.id });
    pruefe("Ein vorgelegtes Partnerhaus bleibt dasselbe", b?.partner?.id, a.partner.id);
    pruefe("Ohne Partnerhaus gibt es trotzdem ein Set", WK.partnerUndSet(l, p, 3, {})?.set?.haeuser?.length, 3);
    pruefe("Zwei unvergleichbare: nichts", WK.partnerUndSet([...l].sort((x, y) => WK.reisepreis(x, p).gesamt - WK.reisepreis(y, p).gesamt).filter((h, i, al) => i === 0 || i === al.length - 1), p, 3, { partnerFuer }), null);
  }

  /* 4. Anzahl */
  const frage = (prof, lauf, n) => { const k = Object.create(KN); k.lauf = { profil: { ...offen, vonPerson: {}, ...prof }, gespraech: [], protokoll: [], verlauf: [], ...lauf }; k.gesagt = []; k.sagen = (s) => k.gesagt.push(s); k.gespraechPush = () => {}; k.notieren = () => {}; k.sichern = () => {}; const r = KN.anzahlVorRundgang.call(k, k.lauf.profil, n); return { s: k.gesagt.join(" "), c: k.lauf.chips || [], w: k.lauf.chipWirkung || {}, halt: !!r }; };
  const a1 = frage({}, { vergleichbarMax: 3 }, 3);
  pruefe("Hoechstens drei: kein 'mehr vergleichen', sondern Region", [a1.c.includes("Region dazunehmen"), a1.c.includes("Lieber mehr vergleichen")], [true, false]);
  pruefe("Region dazunehmen startet den Regionsvergleich", !!a1.w["Region dazunehmen"]?._regionVergleich);
  const a2 = frage({}, { vergleichbarMax: 5 }, 3);
  pruefe("Mehr moeglich: wie bisher", a2.c, ["Ja, such sie raus", "Lieber mehr vergleichen"]);
  const a3 = frage({}, { vergleichbarMax: 4, anzahlMehrOffen: true }, 3);
  pruefe("Mehr gewuenscht, vier moeglich: nur 4 und Region", a3.c, ["4 vergleichen", "Region dazunehmen"]);
  const a4 = frage({ anzahlVorschlaege: 6 }, { vergleichbarMax: 4 }, 4);
  pruefe("Sechs verlangt, vier moeglich: sagt es", [/passen gerade 4 Hotels/.test(a4.s), a4.c, a4.halt], [true, ["Ja, 4 zeigen", "Region dazunehmen"], true]);
  pruefe("Und 'Ja' setzt vier", a4.w["Ja, 4 zeigen"], { anzahlVorschlaege: 4 });
  pruefe("Drei verlangt, vier moeglich: keine Frage", frage({ anzahlVorschlaege: 3 }, { vergleichbarMax: 4 }, 3).halt, false);
  pruefe("Ohne festes Ziel keine Region", frage({ zielId: null, zieleAuswahl: [] }, { vergleichbarMax: 3 }, 3).c, ["Ja, such sie raus"]);
  /* 5. Flug */
  const fl = async (text, args, frage = "flugAb", vor = {}) => {
    const p = JSON.parse(JSON.stringify({ ...BEN, flugAb: null, flugAbEgal: undefined, ...vor })), k = kern(p, text, frage);
    try { await WK.werkzeuge.stand_merken.call(WK, { nachricht_art: "antwort", frage_beantwortet: "ja", ...args }, k); } catch (e) { return "Fehler " + e.message; }
    return [p.flugAb || null, !!p.flugAbEgal, !!k.lauf.flugNaheOffen, k];
  };
  const nah = (r) => (Array.isArray(r) ? r.slice(0, 3) : r);
  pruefe("'gerne bei mir in der nähe' ist nicht egal", nah(await fl("gerne bei mir in der nähe", { flugAbEgal: true })), [null, false, true]);
  pruefe("'der in meiner Nähe' (Modell: Frankfurt)", nah(await fl("der in meiner Nähe", { flugAb: "Frankfurt" })), [null, false, true]);
  pruefe("mit Wohnort: das Modell nennt den Flughafen", nah(await fl("der bei mir in der nähe ist, wohne in bullenhausen", { flugAb: "Hamburg" })), [null, false, false]);
  pruefe("'Hamburg, der ist in der Nähe' gilt", nah(await fl("Hamburg, der ist in der nähe", { flugAb: "Hamburg" })), ["Hamburg", false, false]);
  pruefe("'egal' gilt weiter", nah(await fl("ist mir egal", { flugAbEgal: true, selbst_genannt: ["flugAbEgal"] }))[1], true);
  pruefe("Danach fragt er nach dem Wohnort", /wo wohnst du|wohnst du/i.test(String(WK.themenSatz("flugAb", BEN, { flugNaheOffen: true, gefragtWie: {} }))));
  const AB = vm.runInContext("typeof Absicherung !== 'undefined' ? Absicherung : null", ctx);
  if (AB) {
    const l = { profil: { ...BEN, flugAb: "Düsseldorf", flugAbEgal: true }, protokoll: [], gefragtWie: { flugAb: 2, flug: 1 }, herkunft: {}, sammelBestaetigt: {} };
    AB.herausnehmen({ lauf: l, notieren() {} }, [{ feld: "Flug", label: "Flug", wert: "ab Düsseldorf" }]);
    pruefe("Flugzeile abgewählt: der Flug bleibt, der Flughafen ist offen", [l.profil.flug, l.profil.flugAb ?? null, l.profil.flugAbEgal ?? null, l.flugKorrektur], [true, null, null, true]);
    pruefe("Und er sagt nicht 'nehme ich den Flug wieder raus'", (l.annahmeOffen || []).length, 0);
    const fpF = WK.fahrplan({ ...l.profil, kriterien: [{ id: "essen", gewicht: 1 }], maxPreis: 400, gewichtungEgal: true }, { ...l, gespraech: [], besprochen: {}, gesuchtMit: WK.eckdatenSchluessel(l.profil), wuenscheGenug: true });
    pruefe("Die naechste Frage ist der Flughafen, mit 'Ohne Flug'", [fpF.naechstes, /ohne flug/i.test(String(fpF.satz)), String(fpF.chips)], ["flugAb", true, "Ohne Flug"]);
    pruefe("Chip 'Ohne Flug' wirkt", WK.chipBedeutung ? WK.chipBedeutung("flugAb", "Ohne Flug", {})?.werte : { flug: false }, { flug: false });
    const l2 = { profil: { ...BEN, flug: false, flugAb: null }, protokoll: [], gefragtWie: {}, herkunft: {}, sammelBestaetigt: {} };
    AB.herausnehmen({ lauf: l2, notieren() {} }, [{ feld: "Flug", label: "Flug", wert: "ohne Flug" }]);
    pruefe("'ohne Flug' abgewählt: ganz offen", l2.profil.flug ?? null, null);
  }
  // Kasse: Flug und Flughafen aus dem Gespraech
  if (KN.flugInKasse) {
    const F = vm.runInContext("typeof Flug !== 'undefined' ? Flug : null", ctx);
    if (F) {
      ctx.__speicher = {}; const ss = { getItem: (k) => ctx.__speicher[k] ?? null, setItem: (k, v) => { ctx.__speicher[k] = String(v); } };
      const alt = [ctx.sessionStorage, vm.runInContext("Werkzeuge", ctx)]; ctx.sessionStorage = ss; ctx.window.sessionStorage = ss;
      vm.runInContext("var Werkzeuge = { seite: () => 'checkout' }", ctx);
      ctx.window.location = { search: "" };
      const k = Object.create(KN); k.lauf = { profil: { flug: true, flugAb: "Hamburg" } }; k.notieren = () => {}; k.sichern = () => {}; k.standAnzeigen = () => {}; k.laeuft = false;
      F.set({ mit: false, ab: "", flugId: null }); k.flugInKasse();
      pruefe("Kasse: Flug an, ab Hamburg", [F.get().mit, F.get().ab], [true, "HAM"]);
      F.set({ mit: false, flugId: null }); k.flugSelbst({ mit: false }); F.set({ mit: false, ab: "" }); k.flugInKasse();
      pruefe("Kasse: selbst abgewählt bleibt abgewählt", [F.get().mit, k.lauf.profil.flug], [false, false]);
      F.set({ mit: true }); k.flugSelbst({ mit: true }); F.set({ ab: "BER", flugId: null }); k.flugSelbst({ ab: "BER" }); F.set({ mit: false, ab: "" }); k.flugInKasse();
      pruefe("Kasse: selbst umgestellt auf Berlin bleibt Berlin", [F.get().mit, F.get().ab, k.lauf.profil.flugAb], [true, "BER", "Berlin"]);
      k.lauf.profil.flugAb = "München"; k.flugInKasse();
      pruefe("Neu im Gespräch gesagt: München", F.get().ab, "MUC");
      k.lauf.profil.flug = null; F.set({ mit: false, ab: "" }); k.flugInKasse();
      pruefe("Nie über Flug gesprochen: nichts verändert", F.get().mit, false);
    } else console.log("   (Flugmodul nicht geladen)");
  } else pruefe("Kasse übernimmt den Flug", false);
  console.log(`${gut} richtig, ${schlecht} falsch`);
  process.exitCode = schlecht ? 1 : 0;
})();
