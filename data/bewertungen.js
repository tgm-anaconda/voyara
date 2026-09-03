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
  const anzahl = aspektAnzahl(rnd, note);

  const aspekte = {};
  const saetze = [];
  const gewaehlt = new Set();

  // Kritik zuerst: schwache Teilnoten werden bevorzugt getroffen
  for (let i = 0; i < anzahl.minus; i++) {
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
  for (let i = 0; i < anzahl.plus; i++) {
    const rest = verfuegbar.filter((a) => !gewaehlt.has(a.id));
    if (!rest.length) break;
    const a = waehleGewichtet(rnd, rest, (x) => (1 - kritikNeigung(item, x)) * x.gewicht);
    gewaehlt.add(a.id);
    aspekte[a.id] = 1;
    saetze.push({ pos: rnd(), text: waehle(rnd, saetzeFuer(item, a.plus)), aspekt: a, wertung: 1 });
  }

  // Lob vor Kritik ist die haeufigste, aber nicht die einzige Reihenfolge
  const lobZuerst = rnd() < 0.7;
  saetze.sort((x, y) => (lobZuerst ? y.wertung - x.wertung : x.wertung - y.wertung) || x.pos - y.pos);

  const text = saetze.map((s) => s.text).join(" ")
    + (rnd() < 0.55 ? " " + waehle(rnd, ABSCHLUSS[ton]) : "");

  const author = `${waehle(rnd, VORNAMEN)} ${waehle(rnd, NACHNAMEN)}.`;

  return {
    author,
    date: ziehDatum(rnd),
    rating: note,
    travelType: reiseart(rnd),
    title: baueTitel(saetze, note),
    text,
    aspekte,
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

function aspekteAusText(review) {
  const text = `${review.title} ${review.text}`.toLowerCase();
  const treffer = {};
  for (const [id, woerter] of Object.entries(STICHWORTE)) {
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
      liste.push({ ...r, aspekte: r.aspekte || aspekteAusText(r), avatar: avatarNummer(r.author, textZuZahl(item.id + ":av:" + i)) });
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
