/* Annahme-Test (25.11.2026): Das Modell liest RICHTIG - nimmt der Kern es an?
 *
 *   node agent/annahme-test.cjs [--alle]
 *
 * Ben: "Wo liefert das Modell eigentlich richtige Ergebnisse, aber der Kern
 * nimmt die nicht richtig an." Jeder Satz laeuft in vier Lagen: auf die
 * passende Frage, auf eine andere Frage, ohne Frage, und als Nachtrag, wenn
 * schon ein anderer Wert steht. Das Modell meldet je mit und ohne
 * selbst_genannt. Gezaehlt wird, ob der Wert danach im Stand steht. */
const { laden } = require("./satzbank-daten.cjs");
const { WK, KN } = laden();
const vp = (...k) => Object.fromEntries(k.map((x) => [x, true]));
const VOLL = { monat: 10, naechte: 7, erwachsene: 2, kinder: 0, personen: 2, kinderAlter: [], typ: "hotel", artGenannt: true, zielId: "kreta", flug: true, flugAb: "Hamburg", flugKlasse: "economy", verpflegung: "halb", maxPreis: 200,
  vonPerson: vp("monat", "naechte", "erwachsene", "kinder", "typ", "zielId", "flug", "flugAb", "flugKlasse", "verpflegung", "maxPreis") };
const S = (t, felder, stand, leer, ...saetze) => ({ t, felder, stand, leer, saetze });
// Thema, Modellwerte, erwarteter Stand, Felder, die vorher leer sind, Saetze
const F = [
  S("zeit", { monat: 5 }, { monat: 5 }, ["monat"], "im Mai", "Mai wär top", "so im Wonnemonat Mai", "wenn die Maiglöckchen blühen, also Mai", "May please", "Mai passt uns am besten", "gegen Mai hin", "Muttertag rum"),
  S("zeit", { monat: 12 }, { monat: 12 }, ["monat"], "über Weihnachten", "in der Adventszeit", "Ende des Jahres, Dezember halt", "zwischen den Jahren", "kurz vor Silvester"),
  S("zeit", { monat: 8 }, { monat: 8 }, ["monat"], "Mitte August", "im Hochsommer, August", "in den Sommerferien, erste Augustwoche", "ab dem 10. August", "irgendwann im August rum"),
  S("dauer", { naechte: 7 }, { naechte: 7 }, ["naechte"], "eine Woche", "sieben Nächte", "ne Woche halt", "7 Tage", "so eine Woche rum", "wir haben eine Woche frei", "a week", "Samstag bis Samstag", "einmal sieben Übernachtungen"),
  S("dauer", { naechte: 10 }, { naechte: 10 }, ["naechte"], "zehn Tage", "10 N", "so um die zehn", "anderthalb Wochen, also zehn", "10 Übernachtungen wären gut", "sagen wir zehn", "zehn reichen uns"),
  S("dauer", { naechte: 3 }, { naechte: 3 }, ["naechte"], "ein langes Wochenende", "drei Nächte", "kurz, drei Tage", "Freitag bis Montag"),
  S("reisende", { erwachsene: 2, kinder: 0 }, { erwachsene: 2, kinder: 0 }, ["erwachsene", "kinder", "personen", "kinderAlter"], "ich und mein Mann", "wir beide", "zu zweit", "mein Schatz und ich", "mit meiner besten Freundin", "ein Pärchen", "me and my boyfriend", "Papa und ich, beide erwachsen", "ich + 1", "mein Kumpel Jonas und ich", "wir zwei Hübschen"),
  S("reisende", { erwachsene: 1, kinder: 0 }, { erwachsene: 1, kinder: 0 }, ["erwachsene", "kinder", "personen", "kinderAlter"], "nur ich", "allein", "ich reise solo", "keiner sonst, nur ich", "bin alleine unterwegs", "single"),
  S("reisende", { erwachsene: 2, kinder: 2, kinderAlter: [4, 7] }, { erwachsene: 2, kinder: 2, kinderAlter: [4, 7] }, ["erwachsene", "kinder", "personen", "kinderAlter"], "wir zwei und die Kids, 4 und 7", "meine Frau, ich und zwei Kinder (4 und 7 Jahre)", "Mama, Papa, Emma 4, Paul 7", "2 Erwachsene, 2 Kinder 4+7"),
  S("reisende", { erwachsene: 4, kinder: 0 }, { erwachsene: 4, kinder: 0 }, ["erwachsene", "kinder", "personen", "kinderAlter"], "zwei Paare", "vier Erwachsene", "wir sind vier Kumpels", "Mädelsurlaub zu viert, alle über 30"),
  S("art", { typ: "hotel" }, { typ: "hotel" }, ["typ", "artGenannt", "verpflegung"], "Hotel", "klassisch im Hotel", "ich mag Hotels", "lieber mit Rezeption, also Hotel", "Hotelzimmer reicht", "hotel natürlich"),
  S("art", { typ: "apartment" }, { typ: "apartment" }, ["typ", "artGenannt", "verpflegung"], "Ferienwohnung", "was mit eigener Küche", "ein Apartment", "Häuschen für uns allein", "ne Fewo", "eigene Bude wär schön", "Ferienhaus", "Airbnb-mäßig"),
  S("art", { artEgal: true }, { artEgal: true }, ["typ", "artGenannt", "verpflegung"], "egal", "beides", "ist mir wurscht", "zeig mir beides", "bin da offen", "kommt drauf an, beides"),
  S("ziel", { ziel: "mallorca" }, { zielId: "mallorca" }, ["zielId"], "Malle", "auf die Insel der Deutschen, Mallorca", "Mallorca wär toll", "Palma de Mallorca", "ab nach Malle", "Cala Ratjada auf Mallorca"),
  S("ziel", { ziel: "newyork" }, { zielId: "newyork" }, ["zielId"], "New York", "Big Apple", "NYC baby", "nach Manhattan", "in die Stadt, die niemals schläft", "in die USA nach New York"),
  S("ziel", { ziel: "krabi" }, { zielId: "krabi" }, ["zielId"], "Thailand", "Krabi", "nach Thailand an den Strand", "Railay Beach"),
  S("ziel", { zieleAuswahl: ["kreta", "sardinien"] }, { zieleAuswahl: ["kreta", "sardinien"] }, ["zielId"], "Kreta oder Sardinien", "Kreta, Sardinien, sowas", "entweder Kreta oder halt Sardinien", "zwischen Kreta und Sardinien schwanken wir"),
  S("ziel", { richtung: "warm" }, { richtung: "warm" }, ["zielId"], "warm", "Sonne satt", "irgendwo, wo es schön warm ist", "Hauptsache Sonne", "ins Warme", "wo man nicht friert", "T-Shirt-Wetter"),
  S("ziel", { richtung: "kalt" }, { richtung: "kalt" }, ["zielId"], "kalt", "eher kühl", "Schnee", "wo es frisch ist", "bloß keine Hitze, lieber kühl"),
  S("ziel", { zieleAus: ["mallorca"] }, { zieleAus: ["mallorca"] }, ["zielId"], "nicht Mallorca", "bloß kein Malle", "alles, nur nicht Mallorca", "Mallorca kann ich nicht mehr sehen", "Malle scheidet aus", "auf Mallorca hab ich keine Lust"),
  S("flug", { flug: true }, { flug: true }, ["flug", "flugAb", "flugKlasse"], "mit Flug", "ja, wir fliegen", "Flug brauchen wir", "klar, Flieger", "mit Flieger bitte", "bitte inklusive Anreise per Flugzeug"),
  S("flug", { flug: false }, { flug: false }, ["flug", "flugAb", "flugKlasse"], "ohne Flug", "wir fahren mit dem Auto", "Anreise machen wir selbst", "mit dem Zug", "nur das Zimmer", "Flug haben wir schon", "wir kommen mit dem Wohnmobil"),
  S("flugAb", { flugAb: "München" }, { flugAb: "München" }, ["flugAb", "flugKlasse"], "München", "ab MUC", "aus München", "von der bayerischen Landeshauptstadt", "Franz Josef Strauß", "Munich"),
  S("flugAb", { flugAb: "Köln" }, { flugAb: "Köln" }, ["flugAb", "flugKlasse"], "Köln/Bonn", "ab Kölle", "CGN", "Köln wär am nächsten"),
  S("flugKlasse", { flugKlasse: "business" }, { flugKlasse: "business" }, ["flugKlasse"], "Business", "richtig bequem, Business", "Business Class", "mal was gönnen, Business"),
  S("flugKlasse", { flugKlasse: "economy" }, { flugKlasse: "economy" }, ["flugKlasse"], "Economy", "die günstigste", "normal halt", "Holzklasse", "das Billigste", "Standard reicht"),
  S("verpflegung", { verpflegung: "halb" }, { verpflegung: "halb" }, ["verpflegung"], "Halbpension", "morgens und abends essen", "HP", "Frühstück und Abendessen", "zwei Mahlzeiten", "Frühstück plus Dinner"),
  S("verpflegung", { verpflegung: "ai" }, { verpflegung: "ai" }, ["verpflegung"], "All Inclusive", "alles inklusive", "AI", "wo ich nichts extra zahlen muss beim Essen und Trinken", "volles Programm mit Getränken", "Rundum-sorglos-Verpflegung"),
  S("verpflegung", { verpflegung: "fruehstueck" }, { verpflegung: "fruehstueck" }, ["verpflegung"], "nur Frühstück", "Frühstück reicht", "morgens was zu essen genügt", "B&B"),
  S("preis", { maxPreis: 150 }, { maxPreis: 150 }, ["maxPreis"], "150 pro Nacht", "bis 150", "maximal 150 Euro die Nacht", "hundertfünfzig", "nicht mehr als 150", "150 ist das Limit", "so 150 tacken"),
  S("preis", { budgetGesamt: 2000 }, { budgetGesamt: 2000 }, ["maxPreis"], "2000 insgesamt", "2000 Euro für alles", "unser Budget sind 2000 Euro gesamt", "zweitausend für die ganze Unterkunft", "2.000 € alles zusammen"),
  S("preis", { preisEgal: true }, { preisEgal: true }, ["maxPreis"], "egal", "Geld spielt keine Rolle", "da bin ich offen", "keine Grenze", "Preis ist zweitrangig", "ich gönn mir was, egal was es kostet"),
  S("kinderAlter", { kinderAlter: [3, 9] }, { kinderAlter: [3, 9] }, ["kinderAlter"], "3 und 9", "drei und neun", "die Kleine ist drei, der Große neun", "9 und 3 Jahre", "im Kindergarten (3) und in der Schule (9)"),
  S("anreise", { anreise: "2027-10-14" }, { anreise: "2027-10-14" }, ["anreise"], "am 14.", "14. Oktober", "der vierzehnte", "14.10.", "Donnerstag der 14.", "am 14ten", "14 okt"),
  S("ausstattung", { ausstattung: ["pool"] }, { ausstattung: ["pool"] }, ["ausstattung"], "Pool", "ein Schwimmbecken muss sein", "mit Pool", "wo man plantschen kann, Pool", "Swimmingpool"),
  S("ausstattung", { ausstattung: ["petsAllowed"] }, { ausstattung: ["petsAllowed"] }, ["ausstattung"], "Hund muss mit", "Haustiere erlaubt", "wir haben einen Labrador dabei", "unser Vierbeiner kommt mit"),
];
const text = (x) => JSON.stringify(Array.isArray(x) ? [...x].sort() : x ?? null);
async function lauf(frage, p, du, args) {
  const kern = { lauf: { profil: p, gespraech: [{ role: "assistant", content: "Möchtest du noch etwas wissen?" }, { role: "user", content: du }], protokoll: [], annahmeOffen: [], gefragtWie: {}, verlauf: [], nachrichtArt: "antwort", runde: 1, zugSeit: 77, gefragt: frage, zuletztGefragt: frage, gefragtVorher: frage, selbstGelesen: [], gesuchtMit: "x" },
    notieren(e, d) { this.lauf.protokoll.push({ ereignis: e, ...d }); }, freigabe: () => "suchen", darf: () => false, logZeile() {}, sagen() {}, standAnzeigen() {}, sichern() {}, standKurz: () => "", antwortWerten() {}, gespraechPush() {}, sagenUndMerken() {} };
  const L = (fn) => { try { fn(); } catch (e) { kern.fehler ||= e.message; } };
  const alt = [KN.notieren, KN.standAnzeigen, KN.sichern]; KN.lauf = kern.lauf; KN.notieren = kern.notieren; KN.standAnzeigen = () => {}; KN.sichern = () => {};
  L(() => KN.regionenLesen(du)); [KN.notieren, KN.standAnzeigen, KN.sichern] = alt;
  L(() => WK.chipAntwortLesen(kern, du)); L(() => WK.fahrplanChipLesen?.(kern, frage, du)); L(() => WK.antwortSelbstLesen(kern, frage, du)); kern.lauf.chipWirkung = null;
  try { await WK.werkzeuge.stand_merken.call(WK, JSON.parse(JSON.stringify(args)), kern); } catch (e) { kern.fehler ||= e.message; }
  let nach = null; L(() => { nach = WK.bestaetigungRueckfrage(p, kern.lauf)?.satz || null; });
  return { p, kern, nach };
}
(async () => {
  const z = {}, fehl = [], waechter = {};
  for (const f of F) for (const du of f.saetze) for (const lage of ["gefragt", "andere Frage", "ohne Frage", "Korrektur"]) for (const meldet of [true, false]) {
    if (lage === "andere Frage" && ["kinderAlter", "anreise"].includes(f.t)) continue;
    const p = JSON.parse(JSON.stringify(VOLL));
    // Korrektur: ein anderer Wert steht schon - ausser er ist zufaellig gleich
    if (lage !== "Korrektur" || ["kinderAlter", "anreise", "ausstattung"].includes(f.t)) for (const k of f.leer) { delete p[k]; delete p.vonPerson[k]; }
    if (f.t === "kinderAlter") Object.assign(p, { kinder: 2, personen: 4 });
    if (lage === "Korrektur" && Object.entries(f.stand).every(([k, v]) => text(p[k]) === text(v))) continue;
    // Kurzantworten ohne Thema sind ausserhalb ihrer Frage nicht eindeutig
    if (lage !== "gefragt" && du.split(/\s+/).length <= 2 && /^(egal|beides|allein|3 und 9|drei und neun|bis 150|da bin ich offen|das billigste|standard reicht|warm|kalt)$/i.test(du)) continue;
    if (lage !== "gefragt" && /^(sagen wir zehn|zehn reichen uns|so um die zehn|10 N|ist mir wurscht|bin da offen|kommt drauf an, beides|da bin ich offen|keine Grenze|egal|hundertfünfzig|150 ist das Limit|nicht mehr als 150|normal halt|die günstigste|das Billigste|zeig mir beides|ich \+ 1)$/i.test(du)) continue;
    const frage = lage === "gefragt" ? f.t : lage === "andere Frage" ? (f.t === "verpflegung" ? "flug" : "verpflegung") : null;
    const args = { nachricht_art: "antwort", frage_beantwortet: lage === "gefragt" ? "ja" : lage === "andere Frage" ? "nein_klaert_noch" : "keine_frage_offen", ...f.felder, ...(meldet ? { selbst_genannt: Object.keys(f.felder) } : {}) };
    const r = await lauf(frage, p, du, args);
    const ab = Object.entries(f.stand).filter(([k, v]) => text(r.p[k]) !== text(v));
    const name = `${lage}${meldet ? ", gemeldet" : ""}`; (z[name] ||= [0, 0, 0])[1]++;
    if (!ab.length && !r.kern.fehler) z[name][0]++;
    else {
      if (r.nach) z[name][2]++;
      const ev = r.kern.lauf.protokoll.filter((e) => /verworfen|ohne_grundlage|geraeumt|ueberschreibt_nicht|form_unbekannt/.test(e.ereignis)).map((e) => e.ereignis + (e.feld ? ":" + e.feld : "") + (e.grund ? "/" + e.grund : ""));
      for (const e of ev.length ? ev : ["(kein Vermerk)"]) (waechter[e] ||= []).push(`${f.t}: ${du} [${name}]`);
      fehl.push(`[${name}] ${f.t} "${du}" -> ${ab.map(([k]) => `${k}=${text(r.p[k])}`).join(", ")} ${ev.join(",")} ${r.nach ? "| fragt: " + r.nach : ""} ${r.kern.fehler || ""}`);
    }
  }
  let a = 0, b = 0; for (const [k, [x, n, fr]] of Object.entries(z)) { a += x; b += n; console.log(k.padEnd(24), `${x}/${n} angenommen${fr ? `, ${fr} davon mit Rueckfrage statt Annahme` : ""}`); }
  console.log(`GESAMT ${a}/${b} (${(100 * a / b).toFixed(1)} %)`);
  console.log("\nWelcher Waechter blockiert Richtiges:"); for (const [k, v] of Object.entries(waechter).sort((x, y) => y[1].length - x[1].length)) console.log(`  ${String(v.length).padStart(4)} ${k}  z.B. ${[...new Set(v.map((x) => x.replace(/ \[.*/, "")))].slice(0, 5).join(" | ")}`);
  if (process.argv.includes("--alle")) console.log("\n" + fehl.join("\n"));
})();
