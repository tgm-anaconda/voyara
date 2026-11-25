/* Modellbank (25.11.2026): 91 NEUE Saetze, vor dem Lauf mit Soll versehen.
   t = offene Frage, du = Nachricht, soll = muss dastehen, nie = darf nicht
   dastehen, zusatz = auch erlaubt. Werte als Funktion = Bedingung.
   Nichts davon stand vorher in einer Testbank. Gerade Nummern = Kontrolle:
   An ihnen wird nicht nachgebessert, sie zeigen, ob eine Reparatur allgemein
   traegt oder nur den einen Satz trifft. */
const j = (n) => (x) => x === n;
const hat = (...ids) => (x) => Array.isArray(x) && x.length === ids.length && ids.every((i) => x.includes(i));
const enthaelt = (...ids) => (x) => Array.isArray(x) && ids.every((i) => x.includes(i));
const leer = (x) => x == null || x === false || (Array.isArray(x) && !x.length);
const B = [];
const f = (k, t, du, soll = {}, o = {}) => B.push({ nr: B.length + 1, k, t, du, soll, ...o });
// A - viel in einem Satz
f("viel", "zeit", "Moin! Wir sind zu zweit, wollen im September für 10 Nächte nach Kreta, Hotel mit Halbpension", { monat: 9, naechte: 10, personen: 2, zielId: "kreta", typ: "hotel", verpflegung: "halb" });
f("viel", "zeit", "mein Freund und ich suchen im Mai ne Ferienwohnung an der Ostsee, 5 Nächte, ohne Flug", { monat: 5, naechte: 5, personen: 2, typ: "apartment", zielId: "ostsee", flug: false });
f("viel", "zeit", "Familie, 2 Erwachsene und 2 Kinder (4 und 9), im August zwei Wochen Mallorca", { monat: 8, naechte: 14, erwachsene: 2, kinder: 2, kinderAlter: hat(4, 9), zielId: "mallorca" });
f("viel", "zeit", "ich allein, im November, irgendwas warmes, max 100 euro die nacht", { monat: 11, erwachsene: 1, richtung: "warm", maxPreis: 100 });
f("viel", "zeit", "Städtetrip nach Wien Anfang Dezember, 3 Nächte, ich und meine Schwester, Hotel mit Frühstück", { monat: 12, naechte: 3, erwachsene: 2, zielId: "wien", typ: "hotel", verpflegung: "fruehstueck" });
f("viel", "zeit", "All inclusive, Teneriffa, Februar, 3 Erwachsene, von Köln aus", { monat: 2, erwachsene: 3, zielId: "teneriffa", verpflegung: "ai", flugAb: j("Köln") });
f("viel", "zeit", "2 Wochen Thailand im Januar mit Flug ab Frankfurt, wir sind ein Paar", { monat: 1, naechte: 14, erwachsene: 2, zielId: "krabi", flug: true, flugAb: "Frankfurt" });
f("viel", "zeit", "Im Juni mit meinen Eltern nach Südtirol, eine Woche, wir fahren mit dem Auto", { monat: 6, naechte: 7, erwachsene: 3, zielId: "suedtirol", flug: false });
// B - Korrekturen
f("korrektur", "art", "halt, doch lieber im Juni statt Juli", { monat: 6 }, { vor: { monat: 7, vonPerson: { monat: true } } });
f("korrektur", "flug", "ups, wir sind doch zu dritt, mein Bruder kommt noch mit", { erwachsene: 3 });
f("korrektur", "flug", "vergiss Kreta, lieber Sardinien", { zielId: "sardinien" }, { vor: { zielId: "kreta", vonPerson: { zielId: true } } });
f("korrektur", "verpflegung", "sorry meinte München nicht Hamburg als Abflughafen", { flugAb: "München" });
f("korrektur", "verpflegung", "mach aus den 7 nächten bitte 10", { naechte: 10 });
f("korrektur", "flug", "nee warte, doch ne Ferienwohnung", { typ: "apartment" });
f("korrektur", "preis", "ok ich geh auf 180 hoch", { maxPreis: 180 }, { vor: { maxPreis: 150, vonPerson: { maxPreis: true } } });
f("korrektur", "flug", "meine Tochter kommt doch nicht mit, also nur wir zwei Erwachsenen", { erwachsene: 2, kinder: 0 }, { vor: { erwachsene: 2, kinder: 1, personen: 3, kinderAlter: [6], vonPerson: { erwachsene: true, kinder: true } } });
f("korrektur", "flugAb", "eigentlich brauchen wir gar keinen Flug", { flug: false });
f("korrektur", "flug", "Kreta kann bleiben, aber nimm Algarve noch dazu", { zieleAuswahl: enthaelt("kreta", "algarve") }, { vor: { zielId: "kreta", vonPerson: { zielId: true } } });
// C - Ziele und Verneinung
f("ziel", "ziel", "nichts ist schöner als Kreta", { zielId: "kreta", zieleAus: leer });
f("ziel", "ziel", "bloß nicht wieder Mallorca, da waren wir letztes Jahr", { zieleAus: hat("mallorca"), zielId: leer });
f("ziel", "ziel", "irgendwo wo man Ski fahren kann", { richtung: (x) => ["ski", "kalt", "berge"].includes(x) }, { zusatz: ["ziel"] });
f("ziel", "ziel", "Hauptsache Sonne, aber nicht zu heiß", { richtung: "warm", zieleAus: leer });
f("ziel", "ziel", "Kreta oder Sardinien, je nachdem was günstiger ist", { zieleAuswahl: hat("kreta", "sardinien") });
f("ziel", "ziel", "warum eigentlich nicht Island", { zieleAus: leer, zielId: (x) => x === "island" || x == null });
f("ziel", "ziel", "Griechenland", { zielId: "kreta" });
f("ziel", "ziel", "überall hin, nur nicht in die Kälte", { zieleAus: leer, richtung: (x) => x === "warm" || x == null });
f("ziel", "ziel", "keine Ahnung, überrasch mich", {}, { nie: { zielId: 1 } });
f("ziel", "ziel", "ich würde am liebsten nach Dubai", { zielId: leer }, { nie: { zieleAuswahl: 1 } });
f("ziel", "ziel", "Kanaren wären ein Traum", { zielId: "teneriffa" });
f("ziel", "ziel", "Meine Frau will nach Lissabon, ich eher nach Marokko", { zieleAuswahl: hat("lissabon", "marrakesch") });
// D - Reisende
f("reisende", "reisende", "Oma, Opa, meine Frau, ich und der Kleine (3)", { erwachsene: 4, kinder: 1, kinderAlter: hat(3) });
f("reisende", "reisende", "nur icke", { erwachsene: 1, kinder: 0 });
f("reisende", "reisende", "wir sind ne Clique von 6 Leuten, alle so Mitte 20", { personen: 6, erwachsene: 6 });
f("reisende", "reisende", "2+1", { }, { nie: {}, zusatz: ["reisende"] });
f("reisende", "reisende", "zu viert, zwei davon sind Kinder", { erwachsene: 2, kinder: 2, kinderAlter: leer });
f("reisende", "reisende", "ich, mein Mann und unsere Zwillinge, die werden im Sommer 8", { erwachsene: 2, kinder: 2 }, { zusatz: ["reisende"] });
f("reisende", "reisende", "meine Mama (72) und ich (45)", { erwachsene: 2, kinder: 0, kinderAlter: leer });
f("reisende", "reisende", "ich bin 16 und reise mit meinem Vater", { erwachsene: 1, kinder: 1 });
f("reisende", "reisende", "mit der ganzen Familie", { erwachsene: leer, kinder: leer });
f("reisende", "reisende", "drei Mädels", { personen: 3 }, { nie: { kinderAlter: 1 }, zusatz: ["reisende"] });
f("reisende", "reisende", "mein Hund und ich", { erwachsene: 1, kinder: (x) => !x }, { zusatz: ["ausstattung"] });
f("reisende", "kinderAlter", "der große ist 11, die kleine grad 5 geworden", { kinderAlter: hat(11, 5) });
// E - Zeit
f("zeit", "zeit", "so Mitte April", { monat: 4 }, { zusatz: ["anreise"] });
f("zeit", "zeit", "in den Sommerferien NRW", { monat: (x) => x == null || [6, 7, 8].includes(x) }, { zusatz: ["zeit"] });
f("zeit", "zeit", "so bald wie möglich", { monat: (x) => x == null || x === 12 || x === 11 }, { zusatz: ["zeit"] });
f("zeit", "zeit", "übers verlängerte Wochenende an Himmelfahrt", { monat: 5 }, { zusatz: ["anreise", "dauer"] });
f("zeit", "zeit", "vom 12. bis 19. Juni", { monat: 6, von: "2027-06-12", bis: "2027-06-19", naechte: 7 });
f("zeit", "zeit", "Ende Februar oder Anfang März", { monat: (x) => x == null || x === 2 || x === 3 }, { zusatz: ["zeit"] });
f("zeit", "zeit", "im Herbst, wenn die Blätter fallen", { monat: leer });
f("zeit", "zeit", "egal wann, hauptsache günstig", { vonPerson: (x) => !x?.monat }, { zusatz: ["zeit"] });
f("zeit", "zeit", "irgendwann nächstes Jahr", { monat: leer });
f("zeit", "anreise", "am liebsten an einem Samstag", { anreise: (x) => x == null || true }, { zusatz: ["anreise"] });
f("zeit", "anreise", "der zwölfte", { anreise: "2027-10-12" });
f("zeit", "dauer", "anderthalb Wochen", { naechte: (x) => x === 10 || x === 11 });
f("zeit", "dauer", "von Freitag bis Sonntag", { naechte: 2 });
f("zeit", "dauer", "nicht länger als 5 Tage", { naechte: (x) => x === 5 || x === 4 });
// F - Rueckfragen und Nebensaechliches: nichts darf gespeichert werden
f("frage", "reisende", "bist du eigentlich ein echter Mensch?", {});
f("frage", "art", "was ist denn der Unterschied zwischen Hotel und Ferienwohnung bei euch?", { typ: leer, artEgal: leer });
f("frage", "ziel", "wie warm ist es auf Kreta im Oktober?", {}, { zusatz: ["ziel"], nie: { zieleAus: 1 } });
f("frage", "flug", "muss ich den Flug jetzt schon buchen?", { flug: leer });
f("frage", "verpflegung", "was ist bei All Inclusive alles dabei?", { verpflegung: leer });
f("frage", "preis", "was kostet das denn so ungefähr?", { maxPreis: leer, budgetGesamt: leer });
f("frage", "dauer", "warte kurz, mein Telefon klingelt", { naechte: leer });
f("frage", "reisende", "kann man bei euch auch stornieren?", { erwachsene: leer });
f("frage", "flugAb", "fliegt ihr auch ab Bremen?", { flugAb: leer });
f("frage", "ziel", "hab ich doch grad gesagt", { zielId: leer, zieleAuswahl: leer, zieleAus: leer });
// G - Preis
f("preis", "preis", "so um die 120 die Nacht", { maxPreis: 120 }, { zusatz: ["preis"] });
f("preis", "preis", "insgesamt nicht mehr als 1500 für die Unterkunft", { budgetGesamt: 1500, maxPreis: leer });
f("preis", "preis", "80 Euro pro Person und Nacht", { maxPreis: (x) => x === 160 || x === 80 || x == null });
f("preis", "preis", "Geld spielt keine Rolle", { preisEgal: true, maxPreis: leer });
f("preis", "preis", "möglichst billig halt", { maxPreis: leer, budgetGesamt: leer }, { zusatz: ["preis"] });
f("preis", "preis", "zwischen 100 und 150 euro", { maxPreis: 150 });
f("preis", "preis", "hundertzwanzig maximal", { maxPreis: 120 });
f("preis", "preis", "1.200 € für uns beide zusammen, alles in allem", { budgetGesamt: 1200, maxPreis: leer });
// H - Flug
f("flug", "flug", "wir kommen mit dem Zug", { flug: false });
f("flug", "flug", "klar, fliegen", { flug: true });
f("flug", "flugAb", "Berlin oder Hamburg, mir egal", { flugAbAuswahl: (x) => Array.isArray(x) && x.length === 2 });
f("flug", "flugAb", "Dresden", { flugAb: leer });
f("flug", "flugAb", "ich wohne bei Augsburg", { flugAb: (x) => x == null || x === "München" });
f("flug", "flugAb", "STUTTGART!!", { flugAb: "Stuttgart" });
f("flug", "flug", "nur wenns direkt geht, sonst nicht", { flug: (x) => x == null || x === true });
// I - Verpflegung, Ausstattung
f("wuensche", "verpflegung", "Frühstück reicht völlig", { verpflegung: "fruehstueck" });
f("wuensche", "verpflegung", "wir kochen selbst", { verpflegung: (x) => x === "ohne" || x == null }, { zusatz: ["verpflegung", "art"] });
f("wuensche", "verpflegung", "Hauptsache nicht All Inclusive", { verpflegung: (x) => x !== "ai" }, { zusatz: ["verpflegung"] });
f("wuensche", "verpflegung", "morgens und abends essen wär top", { verpflegung: "halb" });
f("wuensche", "art", "Hotel, aber bitte mit Pool und der Hund muss mit", { typ: "hotel", ausstattung: enthaelt("pool", "petsAllowed") });
// J - Tippfehler, Englisch, Kuerze
f("sprache", "ziel", "Teneriva", { zielId: "teneriffa" });
f("sprache", "zeit", "in Agust", { monat: 8 });
f("sprache", "reisende", "just me and my girlfriend", { erwachsene: 2, kinder: 0 });
f("sprache", "art", "fewo pls", { typ: "apartment" });
f("sprache", "verpflegung", "halbpansion", { verpflegung: "halb" });
module.exports = { B, leer };
