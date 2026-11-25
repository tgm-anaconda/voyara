/* Modellbank Durchlauf 1 (25.11.2026): spaetere Phasen. 80 neue Saetze.
   Stufe eines falschen Werts: drastisch (Ziel, Zeit, Reisende, Preis, Flug,
   ungewollte Buchung) oder leicht (alles andere). */
const hat = (...ids) => (x) => Array.isArray(x) && x.length === ids.length && ids.every((i) => x.includes(i));
const enthaelt = (...ids) => (x) => Array.isArray(x) && ids.every((i) => x.includes(i));
const leer = (x) => x == null || x === false || (Array.isArray(x) && !x.length);
const B = [];
const f = (t, du, soll = {}, o = {}) => B.push({ k: t, t, du, soll, ...o });
// Preiswarnung: 90 EUR, Vorschlag 140
f("warnung", "dann halt bis 140", { maxPreis: 140 });
f("warnung", "110 wären noch drin, mehr nicht", { maxPreis: 110 });
f("warnung", "nee, 90 ist meine Schmerzgrenze", { maxPreis: 90 });
f("warnung", "puh, das ist mir zu teuer", { maxPreis: 90 });
f("warnung", "warum ist das so teuer bei euch?", { maxPreis: 90 });
f("warnung", "egal, dann ohne Limit", { preisEgal: true }, { zusatz: ["preis"] });
f("warnung", "ok mach das", { maxPreis: 140 }, { zusatz: ["preis"] });
f("warnung", "dann lieber nur Frühstück statt Halbpension", { verpflegung: "fruehstueck", maxPreis: 90 });
f("warnung", "was wäre denn mit Kreta?", { maxPreis: 90, zielId: "mallorca" }, { nie: { zieleAus: 1 } });
f("warnung", "keine Ahnung, was empfiehlst du?", { maxPreis: (x) => x === 90 || x === 140 });
// Engstelle: All Inclusive, 120 EUR, Mallorca - nur wenige Hotels
f("engstelle", "dann nehm ich auch Halbpension", { verpflegung: "halb", maxPreis: 120 });
f("engstelle", "ich könnte auch 160 zahlen", { maxPreis: 160 });
f("engstelle", "andere Region wäre ok", { maxPreis: 120 }, { zusatz: ["ziel"] });
f("engstelle", "nein, Mallorca muss es sein", { zielId: "mallorca", zieleAus: leer });
f("engstelle", "Kreta könnte man auch mal anschauen", { zieleAus: leer, maxPreis: 120 }, { zusatz: ["ziel"] });
f("engstelle", "lass alles so wie es ist", { zielId: "mallorca", maxPreis: 120, verpflegung: "ai" });
f("engstelle", "im Juni vielleicht eher?", { maxPreis: 120, zielId: "mallorca" }, { zusatz: ["zeit"] });
f("engstelle", "zwei Hotels reichen mir", { zielId: "mallorca", maxPreis: 120 }, { zusatz: ["anzahl"] });
f("engstelle", "und wenn wir eine Ferienwohnung nehmen?", { maxPreis: 120, zielId: "mallorca" }, { zusatz: ["art", "verpflegung"] });
f("engstelle", "Verpflegung ist mir dann egal", { verpflegung: leer, maxPreis: 120, zielId: "mallorca" });
// Grad-Frage: warm heisst ab 22, weiter bis 19
f("grad", "19 ist auch ok", { mindestGrad: 19 });
f("grad", "bleib bei 22", { mindestGrad: (x) => x === 22 || x == null, richtung: "warm" });
f("grad", "mindestens 25 bitte", { mindestGrad: 25 });
f("grad", "18 Grad fänd ich auch noch angenehm", { mindestGrad: 18 });
f("grad", "nimm Island noch dazu", { zieleAuswahl: enthaelt("island") }, { zusatz: ["ziel"] });
f("grad", "Kreta klingt super, nur das", { zielId: "kreta" }, { zusatz: ["ziel"] });
f("grad", "egal", { zieleAus: leer, richtung: "warm" }, { zusatz: ["ziel"] });
f("grad", "doch lieber kalt", { richtung: "kalt" }, { zusatz: ["ziel"] });
f("grad", "wie warm ist das Meer denn da?", { richtung: "warm", zieleAus: leer });
f("grad", "Krabi ist mir zu weit", { zielId: leer, zieleAus: (x) => leer(x) || (x.length === 1 && x[0] === "krabi") }, { zusatz: ["ziel"] });
// Anzahl der Vorschlaege
f("anzahl", "drei passt", { anzahlVorschlaege: (x) => x === 3 || x == null });
f("anzahl", "lieber ein paar mehr", { anzahlVorschlaege: (x) => x == null || x > 3 });
f("anzahl", "fünf", { anzahlVorschlaege: 5 });
f("anzahl", "zeig mir einfach das beste", {}, { zusatz: ["anzahl"] });
f("anzahl", "ich will selber gucken", { vorgehen: "selbst" });
f("anzahl", "zehn", { anzahlVorschlaege: (x) => x == null || x <= 6, naechte: 7, maxPreis: 180 });
f("anzahl", "wir sind zu zweit, reicht da ein Zimmer?", { erwachsene: 2, anzahlVorschlaege: leer });
f("anzahl", "ja, leg los", {});
// Muss-Ausstattung
f("ausstattung", "ein Pool wäre schon wichtig", { ausstattung: enthaelt("pool") });
f("ausstattung", "Parkplatz brauchen wir unbedingt", { ausstattung: enthaelt("parking") });
f("ausstattung", "nö", { ausstattung: leer });
f("ausstattung", "Hauptsache sauber", { ausstattung: leer });
f("ausstattung", "wir bringen unseren Dackel mit", { ausstattung: enthaelt("petsAllowed") });
f("ausstattung", "kein Pool nötig, aber Fitnessraum", { ausstattung: hat("gym") });
f("ausstattung", "direkt am Wasser", { ausstattung: (x) => leer(x) || x.includes("beachfront") || x.includes("seaView") }, { zusatz: ["strand"] });
f("ausstattung", "was habt ihr denn so alles?", { ausstattung: leer });
f("ausstattung", "Whirlpool auf dem Zimmer", { ausstattung: (x) => leer(x) || !x.includes("pool") });
f("ausstattung", "ich hab keine Wünsche mehr, such los", { ausstattung: leer });
// Schwerpunkte
f("gewichtung", "gutes Essen und Ruhe", {}, { zusatz: ["ausstattung"] });
f("gewichtung", "ist mir alles gleich wichtig", {});
f("gewichtung", "hauptsache kein Partyhotel", { zieleAus: leer });
f("gewichtung", "der Preis entscheidet", { maxPreis: 180 });
f("gewichtung", "nein danke, weiter", {});
f("gewichtung", "Nähe zum Flughafen wär mir wichtig", { flugAb: "Hamburg" });
// Drei Haeuser liegen vor
f("vorlage", "das zweite gefällt mir", {});
f("vorlage", "habt ihr was Günstigeres?", { maxPreis: (x) => x === 180 || (x < 180 && x >= 60) });
f("vorlage", "welches hat die besseren Bewertungen?", {});
f("vorlage", "keins davon", { zieleAus: leer, zielId: "mallorca" });
f("vorlage", "zeig mir noch drei andere", {}, { zusatz: ["anzahl"] });
f("vorlage", "doch lieber eine Woche später", { naechte: 7, zielId: "mallorca" }, { zusatz: ["zeit", "anreise"] });
f("vorlage", "ist das Frühstück beim ersten inklusive?", { verpflegung: "halb" });
f("vorlage", "ich nehm das mit dem Meerblick", {}, { zusatz: ["ausstattung"] });
f("vorlage", "können wir auch 10 Nächte?", { naechte: (x) => x === 7 || x === 10 });
f("vorlage", "wie weit ist es vom dritten zum Strand?", {});
f("vorlage", "meine Schwester will jetzt auch mit", { erwachsene: (x) => x === 3 || x === 2 }, { zusatz: ["reisende"] });
f("vorlage", "bucht das erste", {});
f("vorlage", "Mallorca ist mir doch zu voll, was anderes", { zielId: (x) => x !== "kreta" }, { zusatz: ["ziel"] });
f("vorlage", "warum empfiehlst du gerade das?", {});
// Flugwahl
f("flugwahl", "lieber morgens", {});
f("flugwahl", "nur Direktflug", {});
f("flugwahl", "geht auch ab Hannover?", { flugAb: (x) => x === "Hamburg" || x === "Hannover" });
f("flugwahl", "Business wär mir zu teuer", { flugKlasse: "economy" });
f("flugwahl", "der erste passt", {});
f("flugwahl", "ohne Koffer bitte", {});
f("flugwahl", "wir fahren doch lieber mit dem Auto", { flug: false });
// Kasse
f("kasse", "was ist wenn ich krank werde?", {});
f("kasse", "moment, ich muss noch meine Frau fragen", { erwachsene: 2 });
f("kasse", "Versicherung brauch ich nicht", {});
f("kasse", "nee, doch noch nicht", {});
f("kasse", "ist das jetzt schon gebucht?", {});
f("kasse", "ändere bitte auf 5 Nächte", { naechte: 5 });
module.exports = { B, leer };
