/* Modellbank Durchlauf 2 (25.11.2026): Saetze mit Bezug. 46 neue Saetze, dazu
   je zwei bis vier Nachrichten davor (h: abwechselnd Agent, Person). */
const hat = (...ids) => (x) => Array.isArray(x) && x.length === ids.length && ids.every((i) => x.includes(i));
const enthaelt = (...ids) => (x) => Array.isArray(x) && ids.every((i) => x.includes(i));
const leer = (x) => x == null || x === false || (Array.isArray(x) && !x.length);
const B = [];
const f = (t, h, du, soll = {}, o = {}) => B.push({ k: "bezug", t, h, du, soll, ...o });
const FL = "Von welchem Flughafen soll es losgehen? Hamburg, Hannover oder Berlin liegen nahe.";
// Verweis auf eine Aufzaehlung
f("flugAb", [FL], "den ersten", { flugAb: "Hamburg" });
f("flugAb", [FL], "das letzte von denen", { flugAb: "Berlin" });
f("flugAb", [FL], "die ersten beiden gehen", { flugAbAuswahl: (x) => leer(x) || x.length === 2, flugAb: (x) => leer(x) || /Hamburg/.test(x) });
f("verpflegung", ["All Inclusive, Halbpension oder nur Frühstück?"], "das mittlere", { verpflegung: "halb" });
f("verpflegung", ["All Inclusive, Halbpension oder nur Frühstück?"], "ersteres", { verpflegung: "ai" });
f("ziel", ["Passend wären Kreta, Sardinien und die Algarve. Welche davon?"], "die ersten zwei", { zieleAuswahl: hat("kreta", "sardinien") });
f("ziel", ["Passend wären Kreta, Sardinien und die Algarve. Welche davon?"], "alle drei", { zieleAuswahl: hat("kreta", "sardinien", "algarve") });
f("ziel", ["Passend wären Kreta, Sardinien und die Algarve. Welche davon?"], "die letzte nicht", { zieleAus: (x) => leer(x) || hat("algarve")(x), zielId: leer });
f("art", ["Soll es ein Hotel werden oder eine Ferienwohnung?"], "letzteres", { typ: "apartment" });
f("anreise", ["Passt euch der 1., der 8. oder der 15. Oktober?"], "der mittlere", { anreise: "2027-10-08" });
// Verweis auf frueher Gesagtes
f("dauer", ["Wie lange soll die Reise werden?", "so wie letztes Jahr, da waren wir 9 Nächte", "Also 9 Nächte?"], "genau", { naechte: 9 });
f("preis", ["Wie viel darf es pro Nacht kosten?", "vielleicht 130", "Soll ich bis 130 € suchen?"], "ja, aber 20 mehr gehen auch", { maxPreis: 150 });
f("ziel", ["Wohin soll es gehen?", "Kreta oder Wien", "Welches von beiden lieber?"], "doch das andere, also Wien", { zielId: "wien" });
f("ziel", ["Wohin soll es gehen?", "Kreta oder Wien", "Wien ist im Oktober schon kühl, Kreta noch warm."], "dann das Warme", { zieleAuswahl: hat("kreta") }, { zusatz: ["ziel"] });   // einzelne Auswahl = festes Ziel
f("flug", ["Soll ein Flug dazu?", "muss ich mal überlegen", "Kein Problem. Soll ich den Flug erst mal mitsuchen?"], "ja mach mal", { flug: true });
f("reisende", ["Wer reist mit?", "ich, meine Frau und die Kinder", "Wie viele Kinder sind es?"], "zwei", { kinder: 2, erwachsene: 2 });
f("reisende", ["Wer reist mit?", "wir sind zu viert", "Sind Kinder dabei?"], "ja, zwei davon", { kinder: 2, erwachsene: 2 }, { vor: { personen: 4 } });
f("reisende", ["Wer reist mit?", "wir sind zu viert", "Sind Kinder dabei?"], "nee", { kinder: 0, erwachsene: 4 }, { vor: { personen: 4 } });
f("kinderAlter", ["Wie alt sind die Kinder?", "der Große ist 10", "Und das zweite Kind?"], "zwei Jahre jünger", { kinderAlter: (x) => leer(x) || hat(10, 8)(x) || hat(8)(x) });
f("zeit", ["Wann soll es losgehen?", "im Mai", "Im Mai ist Kreta schon sehr gefragt."], "dann einen Monat später", { monat: 6 }, { vor: { monat: 5, vonPerson: { monat: true } } });
// Zuruecknehmen und Wiederholen
f("flug", ["Ich habe 10 Nächte notiert. Soll ein Flug dazu?"], "Stopp, 10 stimmt nicht, 8", { naechte: 8 }, { vor: { naechte: 10 } });
f("verpflegung", ["Ich habe Hamburg als Abflug. Welche Verpflegung?"], "nein, vorhin sagte ich doch Hannover", { flugAb: "Hannover" });
f("preis", ["Kreta merke ich mir. Hast du beim Preis eine Grenze?"], "Kreta war nur ein Beispiel", { maxPreis: leer, zielId: (x) => x !== "mallorca" }, { zusatz: ["ziel"] });
f("flug", ["Ihr seid also 2 Erwachsene. Soll ein Flug dazu?"], "nein, 3", { erwachsene: (x) => x === 3 || x === 2, flug: leer }, { zusatz: ["reisende"] });
f("flug", ["Ich suche dann Hotels. Soll ein Flug dazu?"], "Hotels hab ich nie gesagt", { flug: leer, typ: (x) => x !== "apartment" }, { zusatz: ["art"] });
f("preis", ["Bis 150 € pro Nacht, richtig?"], "pro Person!", { maxPreis: (x) => x == null || x === 150 || x === 300 });
f("dauer", ["Wie lange soll die Reise werden?", "eine Woche", "Eine Woche merke ich mir. Passt das?"], "lieber doppelt so lang", { naechte: 14 }, { vor: { naechte: 7 } });
f("verpflegung", ["Welche Verpflegung?", "Halbpension", "Halbpension merke ich mir."], "nimm das wieder raus", { verpflegung: leer }, { vor: { verpflegung: "halb" } });
f("ziel", ["Wohin?", "nicht Mallorca", "Mallorca lasse ich weg."], "ach doch, Mallorca kann rein", { zieleAus: leer }, { vor: { zieleAus: ["mallorca"] } });
f("ziel", ["Ich habe Kreta und Sardinien.", "und Teneriffa", "Teneriffa kommt dazu."], "nur noch die letzte", { zielId: "teneriffa" }, { vor: { zieleAuswahl: ["kreta", "sardinien", "teneriffa"] } });
// Reaktionen auf den Agenten
f("flugAb", ["Von Bremen fliegen wir nicht. Hamburg wäre am nächsten, passt das?"], "na gut", { flugAb: "Hamburg" });
f("flugAb", ["Von Bremen fliegen wir nicht. Hamburg wäre am nächsten, passt das?"], "zu weit, dann fahren wir", { flug: false });
f("zeit", ["Im Mai sind es 24 Grad, im Juni 27. Was ist dir lieber?"], "die 27", { monat: 6 });
f("zeit", ["Im Mai sind es 24 Grad, im Juni 27. Was ist dir lieber?"], "das kühlere", { monat: 5 });
f("preis", ["Die meisten Hotels liegen zwischen 120 und 180 €. Hast du eine Grenze?"], "die untere", { maxPreis: (x) => x === 120 || x == null });
f("art", ["Hotels gibt es 25, Ferienwohnungen 12. Was soll es sein?"], "wo mehr Auswahl ist", { typ: "hotel" });
f("dauer", ["Ab 10 Nächten gibt es mehr freie Häuser. Wie lange wollt ihr?"], "dann nehmen wir das", { naechte: 10 });
f("anreise", ["Der 3. ist ausgebucht, der 4. ist frei. Passt das?"], "ja dann halt den", { anreise: "2027-10-04" });
f("ziel", ["Island hat im Oktober 5 Grad, Kreta 24. Was passt besser?"], "5 sind mir zu wenig", { zielId: (x) => x !== "island", zieleAus: (x) => leer(x) || hat("island")(x) }, { zusatz: ["ziel"] });
f("reisende", ["Wer reist mit?", "dieselben wie immer", "Wer ist das denn?"], "na meine Frau und ich", { erwachsene: 2, kinder: 0 });
f("flug", ["Soll ein Flug dazu, oder nur die Unterkunft?"], "ersteres", { flug: true });
f("flug", ["Soll ein Flug dazu, oder nur die Unterkunft?"], "letzteres reicht", { flug: false });
f("verpflegung", ["Halbpension kostet 26 € pro Person und Tag mehr, Frühstück ist drin."], "dann das, was drin ist", { verpflegung: "fruehstueck" });
f("preis", ["Soll ich eine Grenze setzen?", "ja", "Wie hoch?"], "wie eben beim Hotel in Wien, 140", { maxPreis: 140 }, { zusatz: [] });
f("zeit", ["Wann soll es losgehen?", "im Sommer", "Juni, Juli oder August?"], "der letzte davon", { monat: 8 });
f("zeit", ["Wann soll es losgehen?", "im Sommer", "Juni, Juli oder August?"], "nicht der heißeste", { monat: (x) => x == null || x === 6 || x === 8 });
module.exports = { B, leer };
