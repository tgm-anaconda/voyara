// Erzeugt Gaestebewertungen in der Menge, die das Objekt ausweist.
//
// Ein Haus mit 1.284 Bewertungen soll auch 1.284 durchblaetterbare Bewertungen
// haben - sonst faellt beim Blaettern sofort auf, dass es ein Prototyp ist.
//
// WICHTIG fuer die Studie: Jede Bewertung nennt konkrete Aspekte und traegt
// diese maschinenlesbar im Feld `aspekte` mit ({ essen: 1, ausstattung: -1 }).
// Genau darauf setzt spaeter die Analysefunktion des Agenten auf - er soll
// sagen koennen "das Essen wird in 82 % der Erwaehnungen gelobt, die
// Sauberkeit nur in 61 %". Ohne diese Struktur muesste er freien Text
// interpretieren, und die Auswertung waere weder pruefbar noch reproduzierbar.
//
// Welcher Aspekt gelobt oder kritisiert wird, haengt an der Teilnote des
// Objekts: Ein Haus mit essen 3,9 bekommt deutlich mehr Essenskritik als eines
// mit 4,8. Dadurch stimmt die Auswertung mit den ausgewiesenen Teilnoten
// ueberein, statt ihr zu widersprechen.
//
// Alles laeuft ueber einen gesetzten Zufallsstartwert. Dieselbe Bewertung sieht
// nach dem Neuladen identisch aus, und es wird nur erzeugt, was gerade
// angezeigt wird.

/* ==================================================================
   Zufallszahlen mit festem Startwert (mulberry32)
   ================================================================== */
function zufallAus(startwert) {
  let a = startwert >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function textZuZahl(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const waehle = (rnd, liste) => liste[Math.floor(rnd() * liste.length)];

/* Ortsgebundene Saetze
   -------------------
   Der Katalog reicht von Lappland bis Krabi. Ein Satz wie "vom Haus bis zum
   Wasser sind es keine fuenf Minuten" passt an der Algarve und ist in Wien
   Unsinn. Ein Satz darf deshalb statt eines Strings auch ein Paar
   [text, bedingung] sein - `saetzeFuer` blendet aus, was zum Haus nicht passt.
   Faellt dadurch eine Liste leer, greift die ungefilterte Liste, damit nie
   ein Aspekt ohne Satz dasteht. */
const INSELZIELE = new Set(["mallorca", "kreta", "sardinien", "teneriffa"]);
const amMeer = (item) => (item.distanceToBeach ?? 99) <= 1.5;
const aufInsel = (item) => INSELZIELE.has(item.ziel);
const hatKlima = (item) => (item.amenities || []).includes("aircon");
// Ziele, an denen ein Pool nur drinnen liegen kann
const KALTE_ZIELE = new Set(["lappland", "island", "tirol", "suedtirol", "wien", "ostsee"]);
const draussenWarm = (item) => !KALTE_ZIELE.has(item.ziel);

function saetzeFuer(item, liste) {
  const passend = liste.filter((s) => typeof s === "string" || s[1](item));
  const genutzt = passend.length ? passend : liste;
  return genutzt.map((s) => (typeof s === "string" ? s : s[0]));
}

// Zieht aus einer Liste mit Gewichten
function waehleGewichtet(rnd, eintraege, gewicht) {
  const summe = eintraege.reduce((s, e) => s + gewicht(e), 0);
  if (summe <= 0) return eintraege[0];
  let w = rnd() * summe;
  for (const e of eintraege) { w -= gewicht(e); if (w <= 0) return e; }
  return eintraege[eintraege.length - 1];
}

/* ==================================================================
   Aspekte
   Jeder Aspekt kennt seine Teilnote im ratingBreakdown, eine Bedingung,
   wann er ueberhaupt vorkommt, und Saetze fuer Lob und Kritik.
   ================================================================== */
const ASPEKTE = [
  {
    id: "lage", label: "Lage", note: "lage", gewicht: 1.4,
    titelPlus: "Lage top", titelMinus: "Lage schwierig",
    plus: [
      "Die Lage war für uns der Hauptgrund und hat sich gelohnt: alles Wichtige zu Fuß erreichbar.",
      ["Vom Haus bis zum Wasser sind es keine fünf Minuten.", amMeer],
      "Ruhig gelegen und trotzdem nah am Ort.",
      ["Zum Strand mussten wir nicht einmal die Straße queren.", amMeer],
      "Restaurants und Supermarkt liegen praktisch vor der Tür.",
      ["Als Ausgangspunkt für Ausflüge über die Insel war die Lage ideal.", aufInsel],
    ],
    minus: [
      "Die Wege sind weiter, als es auf der Karte aussieht.",
      "Ohne Mietwagen kommt man von hier kaum weg.",
      "Bis zum Ortskern läuft man gut zwanzig Minuten, den Rückweg bergauf.",
      "Die Anfahrt über die schmale Straße war jedes Mal eine Geduldsprobe.",
      "Zum nächsten Supermarkt muss man fahren, das hatten wir anders erwartet.",
    ],
    detailPlus: [
      "Wir haben das Auto nach dem ersten Tag stehen lassen, weil man ohnehin überall zu Fuß hinkommt.",
      "Morgens waren wir vor dem Frühstück schon unten und wieder zurück.",
      ["Wer früh aufsteht, hat den Strandabschnitt vor dem Haus fast für sich.", amMeer],
      "Der Bus hält keine hundert Meter entfernt und fährt bis in den Abend.",
    ],
    detailMinus: [
      "Wir haben die Strecke am zweiten Tag gestoppt: zweiundzwanzig Minuten, nicht die zehn aus der Beschreibung.",
      "Mit Kinderwagen ist der Weg über das Kopfsteinpflaster nichts.",
      "Wir mussten für jede Kleinigkeit ins Auto steigen, das summiert sich über eine Woche.",
      "Die letzten dreihundert Meter gehen steil bergauf, das steht so nirgends.",
    ],
  },
  {
    id: "ausstattung", label: "Ausstattung", note: "ausstattung", gewicht: 1.5,
    titelPlus: "Schönes Zimmer", titelMinus: "Zimmer in die Jahre gekommen",
    plus: [
      "Das Zimmer war größer als erwartet und hell geschnitten.",
      "Betten und Matratzen waren wirklich bequem, wir haben gut geschlafen.",
      "Bad und Dusche machten einen frisch renovierten Eindruck.",
      "Die Einrichtung ist geschmackvoll und nicht das übliche Hotelinventar.",
      ["Klimaanlage, WLAN, genug Steckdosen und alles funktionierte.", hatKlima],
      "Der Balkon war groß genug, um dort zu frühstücken.",
    ],
    minus: [
      "Die Möbel haben ihre besten Jahre hinter sich.",
      "Das WLAN brach im Zimmer ständig ab, im Aufenthaltsraum ging es.",
      ["Die Klimaanlage kam gegen die Nachmittagshitze nicht an.", hatKlima],
      "Das Bad ist eng, zu zweit wird es morgens schwierig.",
      "Für den Preis hätten wir uns eine modernere Ausstattung gewünscht.",
    ],
    detailPlus: [
      "Zwei Sessel, ein Tisch, genug Ablage im Bad - man merkt, dass da jemand mitgedacht hat.",
      "Die Verdunklung war wirklich dicht, was nicht selbstverständlich ist.",
      "Steckdosen an beiden Betten und am Schreibtisch, darüber freut man sich mehr, als man denkt.",
      "Der Schrank hatte genug Platz für zwei Koffer, ausgepackt für eine Woche.",
    ],
    detailMinus: [
      "Die Rollos ließen sich nur halb schließen, ab sechs Uhr war es hell.",
      "Eine einzige Steckdose im ganzen Zimmer, und die hinter dem Bett.",
      "Der Wasserdruck in der Dusche brach zusammen, sobald nebenan jemand aufdrehte.",
      "Die Tür zum Nachbarzimmer war so undicht, dass man jedes Wort mithörte.",
    ],
  },
  {
    id: "sauberkeit", label: "Sauberkeit", note: "sauberkeit", gewicht: 1.3,
    titelPlus: "Blitzsauber", titelMinus: "Sauberkeit ausbaufähig",
    plus: [
      "Das Zimmer war bei der Ankunft blitzsauber.",
      "Täglich frische Handtücher, ohne dass man danach fragen musste.",
      "Auch die öffentlichen Bereiche waren durchgehend gepflegt.",
      "Man merkt, dass hier jeden Tag gründlich gearbeitet wird.",
      "Kein Staub, keine Haare, nichts zu beanstanden.",
    ],
    minus: [
      "In den Ecken und hinter dem Schrank lag deutlich Staub.",
      "Die Fugen im Bad hätten eine Grundreinigung vertragen.",
      "Beim Zimmerservice wurde eher oberflächlich durchgewischt.",
      "Die Gläser im Zimmer waren beim Einzug nicht sauber.",
      "Benutzte Handtücher blieben am Pool stundenlang liegen.",
    ],
    detailPlus: [
      "Wir haben nach vier Tagen einmal genauer hingesehen, auch unter dem Bett: nichts.",
      "Das Bad roch nach Reinigungsmittel, nicht nach Duftspray über etwas anderem.",
      "Selbst die Fugen in der Dusche waren hell, das sieht man in dieser Preisklasse selten.",
    ],
    detailMinus: [
      "Die Fernbedienung klebte, die haben wir am zweiten Tag selbst abgewischt.",
      "Unter dem Bett lagen noch Sachen von den Vorgängern, das sagt eigentlich alles.",
      "Wir haben zweimal um eine Reinigung gebeten, beim dritten Mal haben wir es selbst gemacht.",
    ],
  },
  {
    id: "service", label: "Service", note: "service", gewicht: 1.3,
    gilt: (item) => item.type !== "apartment",
    titelPlus: "Sehr freundliches Personal", titelMinus: "Service enttäuschend",
    plus: [
      "Das Personal war durchweg freundlich und hat sich um jedes Anliegen gekümmert.",
      "Ein Sonderwunsch beim Zimmer wurde ohne Diskussion erfüllt.",
      "An der Rezeption bekommt man richtig gute Tipps für die Umgebung.",
      "Der Check-in ging schnell, obwohl wir Stunden zu früh da waren.",
      "Man wird hier nicht wie eine Buchungsnummer behandelt.",
    ],
    minus: [
      "Beim Check-in standen wir über eine halbe Stunde an.",
      "Auf zwei Nachfragen kam überhaupt keine Antwort.",
      "Das Personal wirkte in der Hochsaison sichtlich überfordert.",
      "Eine zugesagte Rückmeldung kam nie.",
      "An der Rezeption war die Verständigung schwierig.",
    ],
    detailPlus: [
      "Als unser Flug Verspätung hatte, stand das Zimmer trotzdem bereit und jemand hatte etwas zu essen zurückgelegt.",
      "Ein Mitarbeiter hat für uns angerufen und einen Tisch besorgt, den wir selbst nicht bekommen hätten.",
      "Man wird beim zweiten Mal mit Namen begrüßt, das ist keine Schulung, das ist Haltung.",
    ],
    detailMinus: [
      "Auf die Bitte um einen späteren Check-out kam ein Nein, ohne dass jemand nachgesehen hätte.",
      "Wir haben dreimal nach der Rechnung gefragt und sie am Ende selbst zusammengerechnet.",
      "Als wir einen Fehler in der Abrechnung ansprachen, wurde es unangenehm.",
    ],
  },
  {
    id: "essen", label: "Essen", note: "essen", gewicht: 1.4,
    gilt: (item) => item.type !== "apartment",
    titelPlus: "Essen richtig gut", titelMinus: "Essen eintönig",
    plus: [
      "Das Frühstück war reichhaltig und wurde ständig nachgelegt.",
      "Beim Abendbuffet gab es jeden Tag etwas Neues.",
      "Die Küche arbeitet mit regionalen Zutaten, das schmeckt man deutlich.",
      "Auch vegetarisch gab es mehr als den üblichen Beilagensalat.",
      ["Der Fisch im Restaurant war ausgezeichnet.", amMeer],
    ],
    minus: [
      "Das Frühstück ist überschaubar, nach drei Tagen kennt man alles.",
      "Beim Abendessen wiederholte sich das Buffet stark.",
      "Zu Stoßzeiten war kaum ein freier Tisch zu bekommen.",
      "Das Essen kam mehrfach nur lauwarm auf den Tisch.",
      "Für vegetarische Gäste ist die Auswahl wirklich dünn.",
    ],
    detailPlus: [
      "Es gab drei Sorten Brot, die morgens frisch gebacken wurden, das riecht man schon im Flur.",
      "Wir haben abends zweimal à la carte gegessen und es war beide Male den Aufpreis wert.",
      "Auf eine Unverträglichkeit wurde ohne großes Aufheben eingegangen.",
    ],
    detailMinus: [
      "Ab neun Uhr war das Rührei aufgebraucht und wurde nicht mehr nachgelegt.",
      "Am dritten Abend kam derselbe Auflauf wie am ersten, nur anders benannt.",
      "Wir sind nach zwei Tagen abends in den Ort gegangen, das war günstiger und besser.",
    ],
  },
  {
    id: "preis", label: "Preis-Leistung", note: "preis", gewicht: 1.2,
    titelPlus: "Preis-Leistung stimmt", titelMinus: "Preis zu hoch",
    plus: [
      "Für das Gebotene ist der Preis mehr als fair.",
      "Preis und Leistung passen hier wirklich zusammen.",
      "Wir haben für mehr Geld schon deutlich schlechter gewohnt.",
      "Keine versteckten Zusatzkosten, das rechnen wir hoch an.",
    ],
    minus: [
      "Für diesen Preis erwartet man einfach etwas mehr.",
      "Die Getränkepreise an der Bar sind ambitioniert.",
      "Das Parken kostet extra, das war vorher nicht ersichtlich.",
      "Preis und Leistung stehen für uns nicht im Verhältnis.",
    ],
    detailPlus: [
      "Wir haben für die Woche gerechnet: mit Frühstück und Parken lagen wir unter dem, was das Nachbarhaus ohne beides nimmt.",
      "Der Preis in der Nebensaison ist für das Gebotene kaum zu schlagen.",
      "Wasser, Kaffee und Leihräder waren inklusive, das rechnet sich schnell.",
    ],
    detailMinus: [
      "Zum Zimmerpreis kamen Kurtaxe, Parken und ein Aufschlag für den Balkon, am Ende dreißig Prozent mehr.",
      "Zwei Wasser und ein Kaffee auf der Terrasse waren vierzehn Euro.",
      "Für denselben Preis bekommt man zwei Straßen weiter deutlich mehr.",
    ],
  },
  {
    id: "pool", label: "Pool & Anlage", gewicht: 1.1,
    gilt: (item) => (item.amenities || []).includes("pool"),
    titelPlus: "Toller Poolbereich", titelMinus: "Pool zu klein",
    plus: [
      "Der Poolbereich ist gepflegt und morgens fast leer.",
      "Genug Liegen, auch am Nachmittag.",
      "Das Wasser war angenehm temperiert, nicht eiskalt.",
      ["Die Anlage rund um den Pool ist schön begrünt und schattig.", draussenWarm],
    ],
    minus: [
      "Die Liegen am Pool sind ab acht Uhr mit Handtüchern belegt.",
      "Der Pool ist für die Größe des Hauses deutlich zu klein.",
      "Am Pool war es tagsüber sehr laut.",
      ["Der Poolbereich liegt ab drei Uhr komplett im Schatten.", draussenWarm],
    ],
  },
  {
    id: "ruhe", label: "Ruhe", gewicht: 1.1,
    titelPlus: "Angenehm ruhig", titelMinus: "Nachtruhe gestört",
    plus: [
      "Nachts war es angenehm ruhig, wir haben durchgeschlafen.",
      "Von der Straße hört man im Zimmer praktisch nichts.",
      "Trotz voller Anlage war es abends erstaunlich still.",
    ],
    minus: [
      "Die Wände sind hellhörig, man hört die Nachbarn deutlich.",
      "Von der Straße dröhnte es bis nach Mitternacht.",
      "Die Animation war bis spät abends im Zimmer zu hören.",
      "Morgens um sechs beginnt der Lieferverkehr vor dem Fenster.",
    ],
  },
  {
    id: "kueche", label: "Küche", gewicht: 1.3,
    // Nur Ferienwohnungen - in einem Hotel mit Kochnische ist die Kueche
    // kein Thema, ueber das Gaeste schreiben
    gilt: (item) => item.type === "apartment" && (item.amenities || []).includes("kitchen"),
    titelPlus: "Küche komplett ausgestattet", titelMinus: "Küche unvollständig",
    plus: [
      "Die Küche ist komplett ausgestattet, wir haben fast jeden Abend selbst gekocht.",
      "Sogar Gewürze, Öl und Kaffeefilter waren da.",
      "Spülmaschine und ein großer Kühlschrank machen den Unterschied.",
    ],
    minus: [
      "In der Küche fehlten scharfe Messer und ein vernünftiger Topf.",
      "Der Kühlschrank ist für vier Personen zu klein.",
      "Geschirr war knapp, wir mussten zwischendurch spülen.",
    ],
  },
  {
    id: "kommunikation", label: "Kommunikation", note: "kommunikation", gewicht: 1.2,
    gilt: (item) => item.type === "apartment",
    titelPlus: "Gastgeber sehr aufmerksam", titelMinus: "Kommunikation zäh",
    plus: [
      "Auf Nachrichten kam immer innerhalb einer Stunde eine Antwort.",
      "Wir haben vorab eine ausführliche Anfahrtsbeschreibung bekommen.",
      "Die Gastgeberin hat uns die besten Adressen im Ort aufgeschrieben.",
    ],
    minus: [
      "Auf unsere Fragen vor der Anreise kam tagelang nichts.",
      "Die Absprache zur Schlüsselübergabe war ziemlich chaotisch.",
    ],
  },
  {
    id: "checkin", label: "Check-in", note: "checkin", gewicht: 1.1,
    gilt: (item) => item.type === "apartment",
    titelPlus: "Check-in unkompliziert", titelMinus: "Check-in umständlich",
    plus: [
      "Die Schlüsselübergabe lief unkompliziert über eine Schlüsselbox.",
      "Der Check-in war auch spät abends problemlos möglich.",
      "Wir konnten sogar früher rein als vereinbart.",
    ],
    minus: [
      "Wir mussten fast eine Stunde auf den Schlüssel warten.",
      "Der Treffpunkt war schlecht beschrieben, wir sind zweimal vorbeigefahren.",
    ],
  },
];

const ASPEKT_NACH_ID = Object.fromEntries(ASPEKTE.map((a) => [a.id, a]));
// Kurzbezeichnungen fuer die Anzeige unter den einzelnen Bewertungen
const ASPEKT_LABELS = Object.fromEntries(ASPEKTE.map((a) => [a.id, a.label]));

// Welche Aspekte kommen bei diesem Objekt ueberhaupt vor?
function aspekteFuer(item) {
  return ASPEKTE.filter((a) => !a.gilt || a.gilt(item));
}

// Teilnote eines Aspekts. Aspekte ohne eigene Teilnote (Pool, Ruhe, Kueche)
// bekommen die Gesamtnote, leicht abgeschwaecht.
function teilnote(item, aspekt) {
  const b = item.ratingBreakdown || {};
  if (aspekt.note && b[aspekt.note] != null) return b[aspekt.note];
  return item.rating - 0.15;
}

// Wie wahrscheinlich wird dieser Aspekt kritisiert? Direkt aus der Teilnote.
// 4,9 -> rund 5 %, 4,0 -> rund 50 %, 3,5 -> rund 75 %.
function kritikNeigung(item, aspekt) {
  const n = teilnote(item, aspekt);
  return Math.max(0.04, Math.min(0.78, (4.95 - n) / 1.9));
}

/* ==================================================================
   Bausteine fuer Namen, Reiseart, Abschluss
   ================================================================== */
const VORNAMEN = [
  "Anna", "Michael", "Sabine", "Thomas", "Julia", "Stefan", "Nicole", "Andreas",
  "Katrin", "Markus", "Christina", "Daniel", "Petra", "Sebastian", "Melanie",
  "Christian", "Sandra", "Tobias", "Claudia", "Florian", "Susanne", "Matthias",
  "Nadine", "Alexander", "Franziska", "Jan", "Bianca", "Philipp", "Kerstin",
  "Dominik", "Verena", "Lukas", "Simone", "Fabian", "Miriam", "Patrick",
  "Jessica", "Benjamin", "Carolin", "Marcel", "Tanja", "Kevin", "Laura",
  "Oliver", "Steffi", "Jonas", "Heike", "Niklas", "Birgit", "Timo",
];
const NACHNAMEN = "ABCDEFGHKLMNOPRSTVWZ".split("");

// Avatarzuordnung nach Vorname.
//
// Die zwoelf Avatarfotos wechseln sich ab: ungerade Nummern zeigen Frauen,
// gerade Maenner (so wurden sie erzeugt). Ohne diese Zuordnung bekaeme
// "Wolfgang T." ein Frauenfoto - das faellt sofort auf.
const MAENNLICH = new Set([
  "michael", "thomas", "stefan", "andreas", "markus", "daniel", "sebastian",
  "christian", "tobias", "florian", "matthias", "alexander", "jan", "philipp",
  "dominik", "lukas", "fabian", "patrick", "benjamin", "marcel", "kevin",
  "oliver", "jonas", "niklas", "timo", "marc", "frank", "peter", "gerd",
  "dennis", "torsten", "holger", "ralf", "jens", "martin", "kai", "uwe",
  "sven", "ingo", "robert", "bernd", "lars", "klaus", "norbert", "wolfgang",
  "dirk", "georg", "rainer", "christoph", "jörg", "tim", "hendrik", "claus",
  "gregor", "steffen",
]);
const WEIBLICH = new Set([
  "anna", "sabine", "julia", "nicole", "katrin", "christina", "petra",
  "melanie", "sandra", "claudia", "susanne", "nadine", "franziska", "bianca",
  "kerstin", "verena", "simone", "miriam", "jessica", "carolin", "tanja",
  "laura", "steffi", "heike", "birgit", "renate", "bettina", "ulrike",
  "christiane", "almut", "doris", "katja", "nina", "elisabeth", "anke",
  "cornelia", "ilona", "regina", "silke", "beatrice", "andrea", "gudrun",
  "marlene", "britta", "lea", "silvia", "heidi", "alexandra", "ute", "nadja",
  "hanna", "sofia", "yvonne", "manuela", "ines",
  // Weibliche Namen auf -e und -n, die die Endungsregel nicht erwischt
  "beate", "frederike", "marion", "elke", "antje", "frauke", "imke",
  "wiebke", "birte", "hilde", "gerlinde", "sieglinde", "carmen",
  "doreen", "kathrin", "karin", "sigrid", "astrid", "ingrid",
]);

// Auffangnetz fuer Namen, die in keiner Liste stehen: deutsche weibliche
// Vornamen enden fast immer auf -a, -in, -ine, -ia oder -ith. Das -e bleibt
// bewusst aussen vor, weil es auch maennlich vorkommt (Uwe, Malte, Arne).
const WEIBLICHE_ENDUNG = /(a|in|ine|ia|ika|ith|id)$/;

// Liefert eine Avatarnummer 1 bis 12, passend zum Vornamen
function avatarNummer(autor, streuung) {
  const vorname = String(autor).trim().split(/\s+/)[0].toLowerCase();
  const sechs = streuung % 6;                       // 0 bis 5
  const maennlich = sechs * 2 + 2;                  // 2, 4, 6, 8, 10, 12
  const weiblich = sechs * 2 + 1;                   // 1, 3, 5, 7, 9, 11

  if (MAENNLICH.has(vorname)) return maennlich;
  if (WEIBLICH.has(vorname)) return weiblich;
  if (vorname === "familie") return (streuung % 12) + 1;
  return WEIBLICHE_ENDUNG.test(vorname) ? weiblich : maennlich;
}

const REISEART = [
  { t: "Paar", g: 34 }, { t: "Familie", g: 30 }, { t: "Freunde", g: 16 },
  { t: "Alleinreisend", g: 12 }, { t: "Geschäftsreise", g: 8 },
];

// Kurzer Schlusssatz. Traegt das Gesamturteil, ohne dass die Bewertung mit
// einer inhaltsleeren Floskel anfaengt.
// Leitet einen Kritikpunkt in einer sonst durchweg positiven Bewertung ein
const ABSCHWAECHUNG = [
  "Einzige Kleinigkeit: ", "Was man wissen sollte: ", "Nur am Rande: ",
  "Einziger kleiner Punkt: ", "Kleine Anmerkung: ",
];

const ABSCHLUSS = {
  top: ["Wir kommen wieder.", "Uneingeschränkte Empfehlung.", "Würden wir sofort wieder buchen.", "Hat rundum gepasst."],
  gut: ["Würden wir wieder buchen.", "Insgesamt ein guter Aufenthalt.", "Kleine Abstriche, unterm Strich aber gut.", "Empfehlenswert."],
  mittel: ["Unterm Strich durchwachsen.", "Für den Preis gerade noch in Ordnung.", "Beim nächsten Mal würden wir vergleichen.", "Erwartungen nur halb erfüllt."],
  schwach: ["Nochmal würden wir hier nicht buchen.", "Das war für uns zu wenig.", "Können wir so nicht empfehlen."],
};

/* ==================================================================
   Ausfuehrlichkeit
   ------------------------------------------------------------------
   Echte Portalbewertungen sind sehr unterschiedlich lang. Neben dem
   Aufsatz ueber sieben Naechte steht das dreiwoertige "Alles bestens."
   Erzeugt man dagegen jede Bewertung nach demselben Bauplan, faellt beim
   Blaettern sofort auf, dass sie aus einer Maschine kommen - und genau
   die ersten dreissig sind das, was eine teilnehmende Person auf der
   Detailseite ueberhaupt zu sehen bekommt.

   Deshalb zwei Mechanismen:
   1. Fuenf Stufen von "Stichwort" bis "sehr ausfuehrlich", die Aspektzahl,
      Kontextsatz, Detailsatz und Schlusssatz steuern.
   2. Fuer die ersten dreissig eine feste Mischung, die je Objekt anders
      gemischt wird. So ist die Varianz auf der ersten Seite garantiert
      und nicht dem Zufall ueberlassen, der auch dreimal "normal"
      hintereinander ziehen koennte.
   ================================================================== */
const STUFEN = {
  // aspektDelta: wie viele Aspekte zusaetzlich zur Grundzahl
  // kontext / detail / abschluss: Wahrscheinlichkeit fuer den jeweiligen Satz
  stichwort:    { aspektDelta: 0, kontext: 0,    detail: 0,    abschluss: 0 },
  knapp:        { aspektDelta: -1, kontext: 0.05, detail: 0,    abschluss: 0.2 },
  normal:       { aspektDelta: 0,  kontext: 0.25, detail: 0.2,  abschluss: 0.55 },
  ausfuehrlich: { aspektDelta: 1,  kontext: 0.8,  detail: 0.75, abschluss: 0.85 },
  sehrLang:     { aspektDelta: 2,  kontext: 1,    detail: 1,    abschluss: 1 },
};

// Mischung fuer die ersten dreissig. Etwa ein Achtel Stichwort, ein Viertel
// knapp, der Rest normal bis sehr lang - naeher an dem, was Portale zeigen,
// als eine Gleichverteilung.
const ERSTE_30 = [
  "sehrLang", "knapp", "normal", "stichwort", "ausfuehrlich", "knapp",
  "normal", "normal", "sehrLang", "stichwort", "knapp", "ausfuehrlich",
  "normal", "knapp", "normal", "stichwort", "ausfuehrlich", "normal",
  "knapp", "sehrLang", "normal", "stichwort", "knapp", "normal",
  "ausfuehrlich", "normal", "knapp", "normal", "ausfuehrlich", "normal",
];

// Gewichte ab Bewertung einunddreissig
const STUFEN_GEWICHT = [
  ["stichwort", 12], ["knapp", 26], ["normal", 34], ["ausfuehrlich", 20], ["sehrLang", 8],
];

// Je Objekt eine eigene Mischung der ersten dreissig - sonst haette jedes
// Haus dieselbe Abfolge, und wer zwei Detailseiten vergleicht, sieht es.
const mischungCache = {};
function mischungFuer(itemId) {
  if (mischungCache[itemId]) return mischungCache[itemId];
  const rnd = zufallAus(textZuZahl(itemId + ":mischung"));
  const a = ERSTE_30.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return (mischungCache[itemId] = a);
}

function stufeFuer(item, index, rnd) {
  if (index < ERSTE_30.length) return mischungFuer(item.id)[index];
  const summe = STUFEN_GEWICHT.reduce((s, e) => s + e[1], 0);
  let w = rnd() * summe;
  for (const [name, g] of STUFEN_GEWICHT) { w -= g; if (w <= 0) return name; }
  return "normal";
}

/* Kontextsatz am Anfang: wer war da, wie lange, wann.
   Traegt keine Wertung, macht die Bewertung aber sofort persoenlicher und
   laenger, ohne dass sich Aspektsaetze wiederholen muessen. */
const KONTEXT = {
  Paar: [
    "Wir waren zu zweit eine Woche dort.",
    "Fünf Nächte, spontan gebucht, weil kurzfristig etwas frei war.",
    "Das war unser zweiter Aufenthalt hier, deshalb der Vergleich.",
    "Wir hatten ein verlängertes Wochenende, mehr ging beruflich nicht.",
    "Zehn Tage, davon die Hälfte mit Regen, was den Blick auf ein Haus verändert.",
  ],
  Familie: [
    "Wir waren mit zwei Kindern da, sechs und neun Jahre alt.",
    "Eine Woche zu viert, mit einem Kleinkind, das noch Mittagsschlaf braucht.",
    "Wir reisen zum dritten Mal mit den Kindern in dieser Konstellation und haben Vergleichswerte.",
    "Zwei Familien, fünf Kinder, das ist für jedes Haus eine Belastungsprobe.",
    "Zehn Tage in den Sommerferien, also zur vollsten Zeit.",
  ],
  Freunde: [
    "Wir waren zu viert unterwegs, alle Ende zwanzig.",
    "Ein Kurztrip mit Freundinnen, drei Nächte.",
    "Wir waren eine Gruppe von sechs Leuten und hatten drei Zimmer.",
    "Fünf Tage mit zwei Freunden, hauptsächlich zum Wandern.",
  ],
  Alleinreisend: [
    "Vier Nächte, allein gebucht.",
    "Eine Woche, überwiegend zum Lesen und Laufen.",
    "Drei Nächte, kurzfristig gebucht.",
    "Zwei Nächte auf der Durchreise.",
  ],
  "Geschäftsreise": [
    "Zwei Nächte, dienstlich, entsprechend wenig Zeit für die Anlage.",
    "Drei Nächte während einer Messe, das Haus war entsprechend voll.",
    "Vier Nächte beruflich, hauptsächlich abends im Haus.",
  ],
};

/* Kurzurteile fuer die Stichwortstufe. Zwei bis fuenf Woerter, wie sie in
   jedem Portal massenhaft stehen. */
const KURZURTEIL = {
  top: ["Alles bestens.", "Rundum gut.", "Nichts zu meckern.", "Sehr zufrieden.", "Passt alles.", "Immer wieder gern.", "Top."],
  gut: ["Insgesamt gut.", "Hat gepasst.", "Solide.", "Ordentlich, kleine Abstriche.", "Kann man buchen."],
  mittel: ["Ging so.", "Durchwachsen.", "Mittelmaß.", "Weder gut noch schlecht."],
  schwach: ["Enttäuschend.", "Nicht nochmal.", "Zu wenig für den Preis.", "Leider nein."],
};

function tonlage(note) {
  if (note >= 5) return "top";
  if (note >= 4) return "gut";
  if (note >= 3) return "mittel";
  return "schwach";
}

function reiseart(rnd) {
  const summe = REISEART.reduce((s, r) => s + r.g, 0);
  let w = rnd() * summe;
  for (const r of REISEART) { w -= r.g; if (w <= 0) return r.t; }
  return "Paar";
}

// Datum der letzten 24 Monate, neuere Bewertungen haeufiger
function ziehDatum(rnd) {
  const tageZurueck = Math.floor(Math.pow(rnd(), 1.6) * 730);
  const d = new Date();
  d.setDate(d.getDate() - tageZurueck);
  return d.toISOString().slice(0, 10);
}

/* ==================================================================
   Notenverteilung
   Echte Portalbewertungen sind J-foermig: viele Bestnoten, wenige mittlere,
   ein kleiner harter Bodensatz. Stuetzprofile, dazwischen interpoliert.
   Reihenfolge je Profil: [5, 4, 3, 2, 1].
   ================================================================== */
const PROFILE = [
  { schnitt: 3.2, p: [24, 21, 21, 15, 19] },
  { schnitt: 3.8, p: [40, 26, 16, 9, 9] },
  { schnitt: 4.2, p: [55, 25, 11, 5, 4] },
  { schnitt: 4.6, p: [72, 20, 5, 2, 1] },
  { schnitt: 4.9, p: [93, 5, 1, 0.6, 0.4] },
];

function profilFuer(schnitt) {
  const s = Math.max(PROFILE[0].schnitt, Math.min(PROFILE[PROFILE.length - 1].schnitt, schnitt));
  let u = PROFILE[0], o = PROFILE[PROFILE.length - 1];
  for (let i = 0; i < PROFILE.length - 1; i++) {
    if (s >= PROFILE[i].schnitt && s <= PROFILE[i + 1].schnitt) { u = PROFILE[i]; o = PROFILE[i + 1]; break; }
  }
  const t = o.schnitt === u.schnitt ? 0 : (s - u.schnitt) / (o.schnitt - u.schnitt);
  const roh = u.p.map((v, i) => v + (o.p[i] - v) * t);
  const summe = roh.reduce((a, b) => a + b, 0);
  return roh.map((v) => v / summe);
}

function zieheNote(rnd, schnitt) {
  const p = profilFuer(schnitt);
  let w = rnd();
  for (let i = 0; i < 5; i++) { w -= p[i]; if (w <= 0) return 5 - i; }
  return 5;
}

/* ==================================================================
   Wie viele Aspekte werden gelobt, wie viele kritisiert?
   Haengt an der Gesamtnote. Auch eine Fuenf-Sterne-Bewertung darf einen
   Kritikpunkt haben - genau diese Mischung macht Bewertungen glaubwuerdig
   und fuer die Auswertung interessant.
   ================================================================== */
function aspektAnzahl(rnd, note) {
  const w = rnd();
  if (note === 5) return w < 0.72 ? { plus: 2, minus: 0 } : { plus: 2, minus: 1 };
  if (note === 4) return w < 0.20 ? { plus: 3, minus: 0 } : w < 0.75 ? { plus: 2, minus: 1 } : { plus: 1, minus: 2 };
  if (note === 3) return w < 0.55 ? { plus: 1, minus: 2 } : { plus: 1, minus: 1 };
  if (note === 2) return w < 0.60 ? { plus: 1, minus: 2 } : { plus: 0, minus: 2 };
  return w < 0.5 ? { plus: 0, minus: 2 } : { plus: 1, minus: 3 };
}

/* ==================================================================
   Eine einzelne Bewertung bauen
   ================================================================== */
function baueBewertung(item, index) {
  const rnd = zufallAus(textZuZahl(item.id + ":" + index));
  const note = zieheNote(rnd, item.rating);
  const ton = tonlage(note);
  const verfuegbar = aspekteFuer(item);
  const stufeName = stufeFuer(item, index, rnd);
  const stufe = STUFEN[stufeName];
  const anzahl = aspektAnzahl(rnd, note);

  const aspekte = {};
  const saetze = [];
  const gewaehlt = new Set();

  // Die Stufe verschiebt die Aspektzahl. Bei "knapp" faellt einer weg,
  // bei den langen Stufen kommen ein bis zwei dazu - deshalb steht dort
  // am Ende auch inhaltlich mehr, nicht nur mehr Text.
  const verschieben = (n, d) => Math.max(0, n + d);
  let plusZahl = anzahl.plus, minusZahl = anzahl.minus;
  if (stufe.aspektDelta < 0) {
    // Zuerst beim haeufigeren Teil kuerzen, damit die Tonlage stimmt
    if (plusZahl >= minusZahl) plusZahl = verschieben(plusZahl, -1);
    else minusZahl = verschieben(minusZahl, -1);
    if (plusZahl + minusZahl === 0) plusZahl = 1;
  } else if (stufe.aspektDelta > 0) {
    for (let k = 0; k < stufe.aspektDelta; k++) {
      // Zusaetzliche Aspekte folgen der Tonlage: gute Note, mehr Lob
      if (note >= 4 || (note === 3 && k === 0)) plusZahl++;
      else minusZahl++;
    }
  }

  // Stichwort: zwei bis fuenf Woerter, ein Aspekt nur im Titel
  if (stufeName === "stichwort") {
    const rest = verfuegbar.filter((a) => !gewaehlt.has(a.id));
    const gewicht = note >= 4
      ? (x) => (1 - kritikNeigung(item, x)) * x.gewicht
      : (x) => kritikNeigung(item, x) * x.gewicht;
    const a = rest.length ? waehleGewichtet(rnd, rest, gewicht) : null;
    if (a) aspekte[a.id] = note >= 4 ? 1 : -1;
    const author = `${waehle(rnd, VORNAMEN)} ${waehle(rnd, NACHNAMEN)}.`;
    return {
      author,
      date: ziehDatum(rnd),
      rating: note,
      travelType: reiseart(rnd),
      title: a ? (note >= 4 ? a.titelPlus : a.titelMinus) : "Aufenthalt",
      text: waehle(rnd, KURZURTEIL[ton]),
      aspekte,
      laenge: "stichwort",
      avatar: avatarNummer(author, textZuZahl(item.id + ":av:" + index)),
    };
  }

  // Kritik zuerst: schwache Teilnoten werden bevorzugt getroffen
  for (let i = 0; i < minusZahl; i++) {
    const rest = verfuegbar.filter((a) => !gewaehlt.has(a.id));
    if (!rest.length) break;
    const a = waehleGewichtet(rnd, rest, (x) => kritikNeigung(item, x) * x.gewicht);
    gewaehlt.add(a.id);
    aspekte[a.id] = -1;
    // Bei einer Fuenf-Sterne-Bewertung wird der Kritikpunkt als Randnotiz
    // eingeleitet - sonst steht ein harter Satz neben der Bestnote
    const einleitung = note === 5 ? waehle(rnd, ABSCHWAECHUNG) : "";
    saetze.push({ pos: rnd(), text: einleitung + waehle(rnd, saetzeFuer(item, a.minus)), aspekt: a, wertung: -1 });
  }

  // Lob: starke Teilnoten werden bevorzugt getroffen
  for (let i = 0; i < plusZahl; i++) {
    const rest = verfuegbar.filter((a) => !gewaehlt.has(a.id));
    if (!rest.length) break;
    const a = waehleGewichtet(rnd, rest, (x) => (1 - kritikNeigung(item, x)) * x.gewicht);
    gewaehlt.add(a.id);
    aspekte[a.id] = 1;
    saetze.push({ pos: rnd(), text: waehle(rnd, saetzeFuer(item, a.plus)), aspekt: a, wertung: 1 });
  }

  // Lob vor Kritik ist die haeufigste, aber nicht die einzige Reihenfolge.
  // Bei Bestnote ist sie zwingend: der Kritikpunkt wird dort mit "Einzige
  // Kleinigkeit:" eingeleitet, und das kann nicht der erste Satz sein.
  const lobZuerst = note === 5 ? true : rnd() < 0.7;
  saetze.sort((x, y) => (lobZuerst ? y.wertung - x.wertung : x.wertung - y.wertung) || x.pos - y.pos);

  // Detailsatz: die zweite, konkretere Ebene zu einem der genannten Aspekte.
  // Nur die ausfuehrlichen Stufen greifen darauf zu, und nur dort, wo der
  // Aspekt ueberhaupt Detailsaetze mitbringt.
  const teile = saetze.map((s) => s.text);
  if (stufe.detail > 0 && rnd() < stufe.detail) {
    const mitDetail = saetze.filter((s) =>
      (s.wertung === 1 ? s.aspekt.detailPlus : s.aspekt.detailMinus)?.length);
    if (mitDetail.length) {
      const s = mitDetail[Math.floor(rnd() * mitDetail.length)];
      const liste = s.wertung === 1 ? s.aspekt.detailPlus : s.aspekt.detailMinus;
      const satz = waehle(rnd, saetzeFuer(item, liste));
      // Direkt hinter den Satz, zu dem er gehoert
      teile.splice(saetze.indexOf(s) + 1, 0, satz);
    }
  }

  const reise = reiseart(rnd);
  const kontext = stufe.kontext > 0 && rnd() < stufe.kontext
    ? waehle(rnd, KONTEXT[reise] || KONTEXT.Paar) : "";
  const schluss = stufe.abschluss > 0 && rnd() < stufe.abschluss
    ? waehle(rnd, ABSCHLUSS[ton]) : "";

  const text = [kontext, ...teile, schluss].filter(Boolean).join(" ");
  const author = `${waehle(rnd, VORNAMEN)} ${waehle(rnd, NACHNAMEN)}.`;

  return {
    author,
    date: ziehDatum(rnd),
    rating: note,
    travelType: reise,
    title: baueTitel(saetze, note),
    text,
    aspekte,
    laenge: stufeName,
    avatar: avatarNummer(author, textZuZahl(item.id + ":av:" + index)),
  };
}

// Titel aus den Aspekten, nicht aus Floskeln
function baueTitel(saetze, note) {
  const lob = saetze.filter((s) => s.wertung === 1);
  const kritik = saetze.filter((s) => s.wertung === -1);
  // Bei Bestnote nur das Lob in die Ueberschrift - "Service enttaeuschend"
  // neben 5,0 waere ein Widerspruch
  if (note === 5 && lob.length) return lob[0].aspekt.titelPlus;
  // Umgekehrt bei ein bis zwei Sternen: dort waere "Schoenes Zimmer" als
  // Ueberschrift irrefuehrend, auch wenn das Zimmer gelobt wurde.
  if (note <= 2 && kritik.length) return kritik[0].aspekt.titelMinus;
  if (lob.length && kritik.length) {
    // Nicht kleinschreiben - "essen eintönig" waere falsch, Substantive
    // bleiben gross. Stattdessen mit "aber" verbinden.
    return `${lob[0].aspekt.titelPlus}, aber ${kritik[0].aspekt.titelMinus}`;
  }
  if (lob.length) return lob[0].aspekt.titelPlus;
  if (kritik.length) return kritik[0].aspekt.titelMinus;
  return "Aufenthalt";
}

/* ==================================================================
   Handgeschriebene Bewertungen einordnen
   Die vier bis fuenf Bewertungen aus den Datendateien haben keine
   Aspekt-Angabe. Damit sie in der Auswertung nicht fehlen, werden sie
   ueber Stichworte zugeordnet.
   ================================================================== */
const STICHWORTE = {
  lage: ["lage", "strand", "zentrum", "erreichbar", "fußläufig", "gehminuten", "weg zum", "zu fuß", "anfahrt", "autominuten"],
  ausstattung: ["zimmer", "bett", "bad", "balkon", "eingerichtet", "möbel", "wlan", "klimaanlage", "renoviert", "ausstattung", "suite"],
  sauberkeit: ["sauber", "staub", "reinigung", "gepflegt", "makellos", "hygiene"],
  service: ["personal", "service", "rezeption", "check-in", "freundlich", "mitarbeit", "gastgeber", "betreut"],
  essen: ["frühstück", "essen", "buffet", "küche", "restaurant", "abendessen", "menü", "halbpension"],
  preis: ["preis", "geld", "euro", "teuer", "günstig", "kostet", "leistung"],
  pool: ["pool", "liege", "wasser", "terrasse am", "schwimm"],
  ruhe: ["laut", "ruhig", "hellhörig", "hört man", "still", "lärm", "nachts"],
  kueche: ["kochen", "spülmaschine", "kühlschrank", "geschirr", "kochnische", "herd"],
  kommunikation: ["antwort", "nachricht", "kommunikation", "abgesprochen"],
  checkin: ["schlüssel", "check-in", "übergabe", "anreise war"],
};

// Positiv oder negativ? Grobe, aber ausreichende Heuristik ueber die Note
// und ein paar klare Negativwoerter im selben Satz.
const NEGATIVWOERTER = ["nicht", "leider", "zu klein", "zu wenig", "eng", "laut", "alt", "staub",
  "warten", "überfordert", "dünn", "wiederhol", "teuer", "fehlt", "kaum", "schwach", "hellhörig", "abstriche"];

// Nur am Wortanfang treffen. Ohne diese Pruefung zaehlte "Familienanlage" als
// Treffer fuer "lage" und "Kinderclub" als Treffer fuer "club".
function enthaeltWort(text, wort) {
  const i = text.indexOf(wort);
  if (i < 0) return false;
  const davor = i === 0 ? " " : text[i - 1];
  return !/[a-zäöüß]/.test(davor);
}

function aspekteAusText(review, item) {
  const text = `${review.title} ${review.text}`.toLowerCase();
  const treffer = {};
  // Nur Aspekte, die es beim Objekt ueberhaupt gibt. Sonst holt das Stichwort
  // "Kueche" in einer Ferienwohnung den Aspekt "Essen" herein, den es dort
  // gar nicht gibt, und der Agent rechnet mit einer Restaurantkritik, die
  // nie jemand geschrieben hat.
  const erlaubt = item ? new Set(aspekteFuer(item).map((a) => a.id)) : null;
  for (const [id, woerter] of Object.entries(STICHWORTE)) {
    if (erlaubt && !erlaubt.has(id)) continue;
    if (!woerter.some((w) => enthaeltWort(text, w))) continue;
    // Satz suchen, in dem das Stichwort steht, und dort auf Negativwoerter prüfen
    const satz = text.split(/[.!?]/).find((s) => woerter.some((w) => enthaeltWort(s, w))) || text;
    const negativ = NEGATIVWOERTER.some((w) => satz.includes(w));
    treffer[id] = negativ ? -1 : (review.rating >= 4 ? 1 : -1);
  }
  return treffer;
}

/* ==================================================================
   Oeffentliche Schnittstelle
   ================================================================== */

/**
 * Liefert Bewertungen eines Objekts.
 * @param {object} item  Hotel oder Ferienwohnung
 * @param {number} von   Startindex
 * @param {number} wie   Anzahl
 */
function bewertungenFuer(item, von = 0, wie = 10) {
  const gesamt = item.reviewCount;
  const echte = item.reviews || [];
  const liste = [];

  for (let i = von; i < Math.min(von + wie, gesamt); i++) {
    if (i < echte.length) {
      // Handgeschriebene stehen vorne und bekommen ihre Aspekte nachtraeglich
      const r = echte[i];
      liste.push({ ...r, aspekte: r.aspekte || aspekteAusText(r, item), avatar: avatarNummer(r.author, textZuZahl(item.id + ":av:" + i)) });
      continue;
    }
    liste.push(baueBewertung(item, i));
  }
  return liste;
}

// Verteilung der Gesamtnoten. Direkt aus dem Profil gerechnet, ergibt in der
// Summe exakt reviewCount.
function notenverteilung(item) {
  const gesamt = item.reviewCount;
  const p = profilFuer(item.rating);
  const roh = p.map((a) => a * gesamt);
  const anteil = {};
  const noten = [5, 4, 3, 2, 1];
  let vergeben = 0;
  noten.forEach((n, i) => { anteil[n] = Math.floor(roh[i]); vergeben += anteil[n]; });
  const rest = noten
    .map((n, i) => ({ n, r: roh[i] - Math.floor(roh[i]) }))
    .sort((a, b) => b.r - a.r);
  for (let i = 0; vergeben < gesamt; i++, vergeben++) anteil[rest[i % 5].n]++;
  return anteil;
}

/**
 * Aspektbilanz — was der Agent spaeter auswertet.
 *
 * Geht die Bewertungen durch und zaehlt je Aspekt, wie oft er gelobt und wie
 * oft er kritisiert wird. Liefert eine nach Erwaehnungen sortierte Liste.
 *
 * Bei mehreren tausend Bewertungen wird eine Stichprobe gezogen und
 * hochgerechnet; die Anteile sind dabei auf gut ein Prozent genau.
 *
 * @param {object} item
 * @param {number} stichprobe  hoechstens so viele Bewertungen ansehen
 */
function aspektbilanz(item, stichprobe = 800) {
  const gesamt = item.reviewCount;
  const wie = Math.min(gesamt, stichprobe);
  const bewertungen = bewertungenFuer(item, 0, wie);
  const faktor = gesamt / wie;

  const erlaubt = new Set(aspekteFuer(item).map((a) => a.id));
  const zaehler = {};
  for (const r of bewertungen) {
    for (const [id, wertung] of Object.entries(r.aspekte || {})) {
      if (!ASPEKT_NACH_ID[id] || !erlaubt.has(id)) continue;
      zaehler[id] = zaehler[id] || { positiv: 0, negativ: 0 };
      if (wertung > 0) zaehler[id].positiv++; else zaehler[id].negativ++;
    }
  }

  return Object.entries(zaehler)
    .map(([id, z]) => {
      const erwaehnungen = z.positiv + z.negativ;
      return {
        id,
        label: ASPEKT_NACH_ID[id].label,
        erwaehnungen: Math.round(erwaehnungen * faktor),
        positiv: Math.round(z.positiv * faktor),
        negativ: Math.round(z.negativ * faktor),
        anteilPositiv: erwaehnungen ? z.positiv / erwaehnungen : 0,
        teilnote: teilnote(item, ASPEKT_NACH_ID[id]),
      };
    })
    .sort((a, b) => b.erwaehnungen - a.erwaehnungen);
}

/**
 * Kurzfassung fuer den Agenten: was Gaeste loben, was sie bemaengeln.
 * Genau diese Funktion soll der Agent im Panel aufrufen koennen.
 */
function aspektKurzfassung(item) {
  const bilanz = aspektbilanz(item);
  const relevant = bilanz.filter((a) => a.erwaehnungen >= item.reviewCount * 0.04);
  if (!relevant.length) return { staerken: [], schwaechen: [], bilanz: [] };

  // Staerken und Schwaechen relativ zum Haus selbst, nicht an einer festen
  // Schwelle. Sonst haette ein durchweg gutes Haus nie eine Schwaeche und ein
  // schwaches Haus nie eine Staerke - beides waere fuer den Agenten nutzlos.
  const schnitt = relevant.reduce((s, a) => s + a.anteilPositiv, 0) / relevant.length;

  return {
    schnitt,
    staerken: relevant.filter((a) => a.anteilPositiv >= schnitt + 0.07).map((a) => a.label),
    schwaechen: relevant.filter((a) => a.anteilPositiv <= schnitt - 0.07).map((a) => a.label),
    bilanz: relevant,
  };
}
