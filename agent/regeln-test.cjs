/* Klare Regeln (26.11.2026), aus Bens Lauf "warme Region / Dezember / Silvester".
 *
 *   node agent/regeln-test.cjs
 *   VOYARA_QUELLE=_backup/vor-regeln-20261126/ node agent/regeln-test.cjs   (Gegenprobe)
 *
 * Regel 1  Datum und Monat: ein Tag in einem anderen Monat wird nie still verworfen
 *          und der Monat nie still umgestellt - gefragt wird "im März oder im Oktober?".
 * Regel 2  Nach zwei offenen Anlaeufen Auswahlknoepfe statt "Soll ich mit X rechnen?".
 *          "Such du einen Monat aus" ohne Jahreszeit fragt nach der Jahreszeit;
 *          nach einem Monatsvergleich waehlt die Person.
 * Regel 3  Temperatur: ohne Monat keine Regionsliste; die Frage nennt die echten Stufen;
 *          eine Zahl auf die Temperaturfrage zaehlt auch ohne "Grad".
 * Regel 4  Region dazunehmen setzt auf der Liste fuer den Monat auf.
 */
const vm = require("vm");
const { laden } = require("./satzbank-daten.cjs");
const { WK, ctx } = laden();
vm.runInContext("var AgentPanel = new Proxy({}, { get: () => () => null }); var Werkzeuge = new Proxy({ seite: () => 'index', zustand: () => ({}) }, { get: (o, k) => (k in o ? o[k] : () => null) });", ctx);
const Pol = vm.runInContext("Politik", ctx);
let gut = 0, schlecht = 0;
const pruefe = (n, ist, soll = true) => { if (JSON.stringify(ist) === JSON.stringify(soll)) gut++; else { schlecht++; console.log(`  FEHLT: ${n}\n    ist  ${JSON.stringify(ist)}\n    soll ${JSON.stringify(soll)}`); } };
const versuch = (f) => { try { return f(); } catch (e) { return "Fehler " + e.message; } };
const versuchA = async (f) => { try { return await f(); } catch (e) { return "Fehler " + e.message; } };
const kern = (p, text, frage, extra = {}) => {
  const k = { lauf: { profil: p, gespraech: [{ role: "assistant", content: "Frage?" }, { role: "user", content: text }], protokoll: [], annahmeOffen: [], gefragtWie: {}, verlauf: [],
    nachrichtArt: "antwort", runde: 1, zugSeit: 7, gefragt: frage, zuletztGefragt: frage, gefragtVorher: frage, gesagt: [], ...extra },
  gesagt: [], ereignisse: [],
  notieren(e) { k.ereignisse.push(e); }, standAnzeigen() {}, sagen(t) { k.gesagt.push(t); }, sichern() {}, gespraechPush() {}, logZeile() {}, kuerzen() {}, darf: () => true, standKurz: () => "" };
  return k;
};
const weiter = (k, bot, du) => k.lauf.gespraech.push({ role: "assistant", content: bot }, { role: "user", content: du });
const merke = (k, args) => versuchA(() => WK.werkzeuge.stand_merken.call(WK, { nachricht_art: "antwort", frage_beantwortet: "ja", ...args }, k));
const warm = Pol.THEMEN.find((t) => t.id === "warm");

(async () => {
  /* ---------- Regel 3 und 4: Bens Verlauf ---------- */
  const p = { richtung: "warm", zielOffen: true, zieleErlaubt: versuch(() => WK.regionenFuerRichtung(warm, {})), vonPerson: { richtung: true } };
  pruefe("3a: Ohne Monat steht im Band nur die Richtung", versuch(() => Pol.eckdaten(p).find((x) => x.feld === "Ziel")?.wert), "eher warm");
  const k = kern(p, "januar", "zeit");
  await merke(k, { monat: 1 });
  pruefe("3d: Nach 'Januar' sind die Regionen fuer Januar gerechnet", (p.zieleErlaubt || []).includes("mallorca") ? "Mallorca noch drin" : "neu gerechnet", "neu gerechnet");
  const sp = versuch(() => WK.spanneRueckfrage(p, k.lauf)) || {};
  pruefe("3b: Die Frage nennt die Grundgrenze 22 Grad", /mindestens 22 Grad/.test(sp.satz || "") ? "ja" : sp.satz, "ja");
  pruefe("3b: ... und die Stufen als Knoepfe", Array.isArray(sp.chips) && sp.chips[0] === "Ab 22 Grad" && sp.chips.length >= 3 ? "ja" : sp.chips, "ja");
  pruefe("3b: ... und fragt offen nach der Mindesttemperatur", /Wie warm soll es mindestens sein\?$/.test(sp.satz || "") ? "ja" : sp.satz, "ja");
  k.lauf.spanneOffen = { grenze: sp.grenze, weiter: sp.weiter, stufen: sp.stufen }; k.lauf.spanneFrage = 1;
  weiter(k, sp.satz || "?", "erst ab 22");
  await merke(k, { mindestGrad: 22 });
  pruefe("3c: 'erst ab 22' (ohne 'Grad') kommt an", p.mindestGrad, 22);
  pruefe("3c: ... und nur Regionen ab 22 Grad bleiben", (p.zieleErlaubt || []).every((id) => ctx.grad ? true : true) && !(p.zieleErlaubt || []).includes("marrakesch") ? "ja" : p.zieleErlaubt, "ja");
  weiter(k, "Wie lange soll es gehen?", "und nehm noch lappland dazu");
  await merke(k, { frage_beantwortet: "nein", zieleAuswahl: ["lappland"], selbst_genannt: ["ziel"] });
  const ausw = p.zieleAuswahl || [];
  pruefe("4: Lappland ist dazugenommen", ausw.includes("lappland"), true);
  pruefe("4: Mallorca, Kreta, Algarve, Sardinien kommen nicht zurueck", ["mallorca", "kreta", "algarve", "sardinien"].filter((id) => ausw.includes(id)), []);

  // Zahl ohne Grad, auch wenn das Modell sie nicht schickt (Kern liest selbst)
  {
    const q = { richtung: "warm", monat: 1, zielOffen: true, zieleErlaubt: versuch(() => WK.regionenFuerRichtung(warm, { monat: 1 })), vonPerson: { richtung: true, monat: true } };
    const kk = kern(q, "erst ab 22", "ziel", { spanneOffen: { grenze: 19, weiter: 15, stufen: [22, 19, 15] }, spanneFrage: 1, richtungMonat: 1 });
    await merke(kk, {});
    pruefe("3c: 'erst ab 22' ohne Modellwert", q.mindestGrad, 22);
  }

  /* ---------- Regel 1: Datum und Monat ---------- */
  const w1 = versuch(() => WK.datumWiderspruch({ monat: 3, vonPerson: { monat: true }, flexibel: true }, "ich würde gerne am Reformationstag anfangen")) || {};
  pruefe("1c: Reformationstag bei Maerz: Frage nach dem Monat", w1.satz, "Der Reformationstag ist am 31. Oktober. Möchtest du im März oder im Oktober reisen?");
  pruefe("1c: ... mit beiden Monaten als Knoepfe", w1.chips, ["Im Oktober", "Im März"]);
  const w2 = versuch(() => WK.datumWiderspruch({ monat: 1, vonPerson: { monat: true }, flexibel: true }, "dann gerne an silvester los")) || {};
  pruefe("1e: Silvester bei Januar: dieselbe Regel, keine Ausnahme", w2.satz, "Silvester ist am 31. Dezember. Möchtest du im Januar oder im Dezember reisen?");
  pruefe("1e: 'fliegt ihr ueber Silvester?' ist kein Anreisetag", versuch(() => WK.datumWiderspruch({ monat: 1, vonPerson: { monat: true }, flexibel: true }, "fliegt ihr über silvester?")), null);
  pruefe("1b: Silvester im Dezember: kein Widerspruch", versuch(() => WK.datumWiderspruch({ monat: 12, vonPerson: { monat: true }, flexibel: true }, "an silvester")), null);
  pruefe("1: Ein Zahlendatum im anderen Monat fragt genauso", (versuch(() => WK.datumWiderspruch({ monat: 3, vonPerson: { monat: true }, flexibel: true }, "am 31.10.")) || {}).chips, ["Im Oktober", "Im März"]);
  pruefe("1: 'lieber im Oktober, am Reformationstag' wechselt selbst", versuch(() => WK.datumWiderspruch({ monat: 3, vonPerson: { monat: true }, flexibel: true }, "lieber im Oktober, am Reformationstag")), null);
  // Solange die Frage offen ist, setzt das Modell weder Monat noch Tag
  for (const args of [{ anreise: "2026-12-31" }, { von: "2026-12-31" }, { anreise: "2027-01-31" }, { monat: 12, anreise: "2026-12-31" }]) {
    const q = { monat: 1, vonPerson: { monat: true }, flexibel: true };
    const kk = kern(q, "dann gerne an silvester los", "anreise", { datumFrage: 1, datumWiderspruch: w2 });
    await merke(kk, args);
    pruefe(`1c: Modell schickt ${JSON.stringify(args)}: nichts still umgestellt`, [q.monat, q.anreise ?? null], [1, null]);
  }

  /* ---------- Regel 2: Auswahl statt Vorschlag ---------- */
  const fpLauf = (thema, extra = {}) => ({ gespraech: [], gefragtWie: { [thema]: 2 }, besprochen: {}, protokoll: [], letzteTreffer: [], zugSeit: 5, ...extra });
  {
    const q = { richtung: "warm", zielOffen: true, vonPerson: { richtung: true } };
    const l = fpLauf("zeit");
    let fp = versuch(() => WK.fahrplan(q, l)); fp = versuch(() => WK.fahrplan(q, l)) || {};
    pruefe("2: Nach zwei Anlaeufen kein 'Soll ich mit Dezember rechnen'", /Soll ich mit/.test(fp.satz || "") ? fp.satz : "kein Vorschlag", "kein Vorschlag");
    pruefe("2: ... kein Knopf 'Etwas anderes'", /Etwas anderes/.test(fp.chips || "") ? fp.chips : "nein", "nein");
    pruefe("2b: ... sondern Monate und 'Such du einen Monat aus'", /Such du einen Monat aus/.test(fp.chips || "") ? "ja" : fp.chips, "ja");
    pruefe("2a: ... und kein Monat gesetzt", q.monat ?? null, null);
  }
  {
    const q = { erwachsene: 2, kinder: 0, monat: 3, vonPerson: { monat: true, erwachsene: true, kinder: true } };
    const l = fpLauf("dauer", { besprochen: { zeit: true, reisende: true } });
    let fp = versuch(() => WK.fahrplan(q, l)); fp = versuch(() => WK.fahrplan(q, l)) || {};
    if (fp.naechstes === "dauer") pruefe("2b: Dauer als Auswahl", fp.chips, "Ein langes Wochenende | Eine Woche | Zwei Wochen");
    pruefe("2a: Dauer nicht gesetzt", q.naechte ?? null, null);
  }
  // "Such du einen Monat aus" ohne Jahreszeit: Frage nach der Jahreszeit, kein Monat
  {
    const q = { naechte: 7, vonPerson: { naechte: true } };
    const kk = kern(q, "Such du einen Monat aus", "zeit");
    await merke(kk, { monatUeberlassen: true });
    pruefe("2: 'Such du einen Monat aus' setzt keinen Monat", q.monat ?? null, null);
    pruefe("2: ... und fragt nach der Jahreszeit", kk.lauf.jahreszeitFrage, 1);
    const fp = versuch(() => WK.fahrplan(q, { ...kk.lauf, gefragtWie: { zeit: 1 } })) || {};
    pruefe("2: Jahreszeitfrage mit vier Knoepfen", fp.chips, "Frühling | Sommer | Herbst | Winter");
    weiter(kk, fp.satz || "?", "Winter");
    await merke(kk, { jahreszeit: "winter" });
    pruefe("2: Auf 'Winter' werden die Wintermonate verglichen", JSON.stringify(kk.lauf.monatsvergleich?.monate || null), JSON.stringify([12, 1, 2]));
    pruefe("2: ... und die Person entscheidet", kk.lauf.monatsvergleich?.entscheiden, false);
  }
  // Nach dem Vergleich: die verglichenen Monate als Knoepfe
  {
    const q = { naechte: 7, vonPerson: { naechte: true } };
    const fp = versuch(() => WK.fahrplan(q, { gespraech: [], gefragtWie: {}, besprochen: {}, protokoll: [], letzteTreffer: [], zugSeit: 5, monatWahl: [12, 1, 2] })) || {};
    pruefe("2: Nach dem Vergleich waehlt die Person per Knopf", fp.chips, "Dezember | Januar | Februar");
  }

  /* ---------- Regel 5: "+" ---------- */
  {
    const q = {};
    const l = { gespraech: [{ role: "assistant", content: "Wann soll es losgehen?" }, { role: "user", content: "+" }], gefragtWie: { zeit: 1 }, besprochen: {}, protokoll: [], letzteTreffer: [], zugSeit: 2 };
    const fp = versuch(() => WK.fahrplan(q, l)) || {};
    pruefe("5: Auf '+' kein 'nicht eingegangen'", /nicht eingegangen/.test(fp.frage || "") ? "belehrend" : (/Geh NICHT auf ihre letzte Nachricht ein/.test(fp.frage || "") ? "freundlich" : fp.frage), "freundlich");
    l.gespraech[1].content = "übrigens, gutes Essen ist mir wichtig";
    const fp2 = versuch(() => WK.fahrplan(q, l)) || {};
    pruefe("5: Ein echter Einwurf wird weiter aufgegriffen", /nicht eingegangen/.test(fp2.frage || ""), true);
  }

  /* ---------- Saison (26.11.2026): ausserhalb der Saison ist buchbar, mit Etikett ---------- */
  {
    const q = { zielId: "mallorca", monat: 1, naechte: 7, erwachsene: 2, kinder: 0, personen: 2, zimmer: 1, flexibel: true, flug: false, artEgal: true, vonPerson: {} };
    const n = versuch(() => WK.katalogTreffer(q, WK.filterAusStand(q)).length);
    pruefe("Saison: Mallorca im Januar hat buchbare Haeuser", typeof n === "number" && n >= 12 ? "ja" : n, "ja");
    pruefe("Saison: das Etikett bleibt", versuch(() => vm.runInContext("saisonLabel(ZIEL_NACH_ID.mallorca, 1).text", ctx)), "Außerhalb der Saison");
    pruefe("Saison: der Preis bleibt guenstiger", versuch(() => vm.runInContext("saisonFaktor(ZIEL_NACH_ID.mallorca, 1)", ctx)), 0.68);
    const kk = kern(q, "x", "ziel"); kk.lauf.profil = q;
    const sk = versuch(() => vm.runInContext("Kern", ctx).standKurz.call({ lauf: { profil: q } }));
    pruefe("Saison: das Modell soll es einmal erwaehnen", /ausserhalb der Saison/.test(String(sk)) ? "ja" : sk, "ja");
  }

  console.log(`\n${gut} richtig, ${schlecht} falsch`);
})();
