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
// Haeuser, die sich ausdruecklich an Familien richten. Ohne diese
// Bedingung stuenden Saetze ueber Kinderbecken auch bei Adults-only.
const fuerFamilien = (item) => (item.amenities || []).includes("kidsClub")
  || (item.amenities || []).includes("familyFriendly");

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
      ["Hochstuhl und Reisebett standen ohne Nachfrage im Zimmer.", fuerFamilien],
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
      /* Saetze, die etwas Praktisches sagen - dazugekommen am 27.09.2026.
         Aus ihnen zieht die Bewertungsuebersicht ihre Stichpunkte, und
         die kann nur so konkret werden wie das, was Gaeste schreiben. */
      ["Für die Kinder gibt es einen flachen, abgetrennten Bereich - das hat uns die Woche gerettet.", fuerFamilien],
      ["Unsere Kinder waren morgens als Erste im Wasser und mittags kaum herauszubekommen.", fuerFamilien],
    ],
    minus: [
      "Die Liegen am Pool sind ab acht Uhr mit Handtüchern belegt.",
      ["Ein eigenes Becken für kleinere Kinder fehlt, für Anfänger ist es überall zu tief.", fuerFamilien],
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
  /* Themen, nach denen Leute wirklich fragen.
     ==================================================================
     Der Nutzer am 02.10.2026: "Zum Beispiel koennte ich mir vorstellen,
     dass die Personen dann sagen, ja, mir ist wichtig, dass das Hotel
     Rutschen hat und mir ist wichtig, dass es nah am Strand ist und mir
     ist wichtig, dass die echten Alkohol haben. Und aktuell wuerdest du
     darauf keine Antwort haben koennen."

     Stimmt: Es gab elf Aspekte, und keiner davon deckte Rutschen,
     Getraenke, Wellness, Parken, Strand oder Betreuung ab. Der Agent
     konnte diese Fragen also nur mit der Gesamtnote beantworten, und das
     ist keine Antwort.

     Jeder neue Aspekt haengt an einem Merkmal, das im Katalog wirklich
     steht (Pool, Kinderclub, Spa, Parkplatz, Strandentfernung, All
     Inclusive). Nur dann sind die Stimmen ein Befund und keine
     Erfindung: Ueber Rutschen schreibt nur, wer in einem Haus mit Pool
     und Familienausstattung war. Die Verteilung von Lob und Kritik
     folgt wie bei allen anderen der Teilnote des Hauses. */
  {
    id: "wasserspass", label: "Rutschen & Wasserspaß", gewicht: 1.1,
    gilt: (item) => (item.amenities || []).includes("pool")
      && ((item.amenities || []).includes("familyFriendly") || (item.amenities || []).includes("kidsClub")),
    titelPlus: "Rutschen top", titelMinus: "Wenig für Wasserratten",
    plus: [
      "Es gibt zwei Rutschen, die großen Kinder waren den halben Tag dort.",
      "Die Rutsche ist auch für Kleinere machbar, es steht jemand am Becken.",
      "Neben dem Hauptbecken gibt es einen kleinen Wasserspielplatz mit Fontänen.",
      "Die Rutschen laufen durchgehend, nicht nur zu bestimmten Zeiten.",
    ],
    minus: [
      "Eine Rutsche für das ganze Haus, entsprechend lang war die Schlange.",
      "Die Rutsche war an drei von sieben Tagen gesperrt.",
      "Für Wasserspaß ist das hier der falsche Ort, es gibt nur das eine Becken.",
      "Ab einer Körpergröße unter 1,20 m darf man nicht rutschen, das stand vorher nirgends.",
    ],
    detailPlus: [
      "Unsere beiden sind morgens hin und mittags kaum herauszubekommen gewesen, allein wegen der Rutschen.",
      "Es gibt eine Breitrutsche, da können zwei nebeneinander, das haben sie geliebt.",
    ],
    detailMinus: [
      "Die Rutsche öffnet erst um elf und schließt um siebzehn Uhr, mitten in der Siesta also zu.",
      "Wir hatten mit mehr gerechnet, am Ende war es eine kurze Rutsche ins Hauptbecken.",
    ],
  },
  {
    id: "getraenke", label: "Getränke & Bar", gewicht: 1.2,
    // Nur wo All Inclusive ueberhaupt buchbar ist - sonst ist die Frage
    // nach dem, was im Preis steckt, gegenstandslos
    gilt: (item) => (item.boards || []).some((b) => b.key === "ai" || b.key === "voll"),
    titelPlus: "Getränke ohne Abstriche", titelMinus: "Bei den Getränken geknausert",
    plus: [
      "Bei All Inclusive waren auch Markenspirituosen dabei, nicht nur das Hauseigene.",
      "Wein und Bier gab es den ganzen Tag, ohne dass jemand schief geschaut hat.",
      "Cocktails waren inklusive und wurden frisch gemixt, nicht aus dem Automaten.",
      "Auch alkoholfrei war die Auswahl ordentlich, frisch gepresster Saft am Morgen.",
    ],
    minus: [
      "Im All Inclusive sind nur lokale Spirituosen drin, alles andere kostet extra.",
      "Die Getränke kamen aus dem Automaten, Wein wie Saft.",
      "Ab zehn Uhr abends ist die Bar zu, das war uns zu früh.",
      "Importierte Getränke werden extra abgerechnet, das stand im Kleingedruckten.",
    ],
    detailPlus: [
      "Wir haben nachgefragt: Gin, Rum und Whisky waren Marken, die man kennt, und zwar ohne Aufpreis.",
      "An der Poolbar musste man nicht anstehen, es kam jemand herum.",
    ],
    detailMinus: [
      "Für einen Gin Tonic mit ordentlichem Gin wurden acht Euro extra fällig, trotz All Inclusive.",
      "Das Bier kam aus dem Zapfhahn im Selbstbedienungsbereich und war meist warm.",
    ],
  },
  {
    id: "strand", label: "Strand", gewicht: 1.3,
    // Nur Haeuser, die wirklich am Wasser liegen (bis 1,5 km)
    gilt: (item) => (item.distanceToBeach ?? 99) <= 1.5,
    titelPlus: "Strand direkt vor der Tür", titelMinus: "Strand enttäuschend",
    plus: [
      "Der Strand ist in fünf Minuten zu Fuß erreicht, Handtücher bekommt man im Haus.",
      "Feiner Sand, flach ins Wasser, für Kinder genau richtig.",
      "Der Strandabschnitt vor dem Haus war selbst mittags nie überfüllt.",
      "Liegen und Schirme am Strand waren im Preis enthalten.",
    ],
    minus: [
      "Bis zum Strand sind es laut Beschreibung fünf Minuten, wir haben zwölf gebraucht.",
      "Der Strand ist steinig, Badeschuhe sind Pflicht.",
      "Liegen am Strand kosten extra, und zwar pro Tag und Person.",
      "Der Zugang zum Wasser geht über eine steile Treppe, mit Gepäck oder Kindern mühsam.",
    ],
    detailPlus: [
      "Wir waren jeden Morgen vor dem Frühstück unten, um die Zeit hat man den Strand fast für sich.",
      "Das Wasser fällt sehr flach ab, unsere Dreijährige konnte zwanzig Meter weit stehen.",
    ],
    detailMinus: [
      "Bei Westwind lag Seegras am Ufer, das wurde in der Woche einmal geräumt.",
      "Der Weg zum Strand führt über die Küstenstraße, ohne Ampel, das war uns mit Kind zu unsicher.",
    ],
  },
  {
    id: "betreuung", label: "Kinderbetreuung", gewicht: 1.2,
    gilt: (item) => (item.amenities || []).includes("kidsClub"),
    titelPlus: "Kinderclub richtig gut", titelMinus: "Betreuung nur auf dem Papier",
    plus: [
      "Der Kinderclub hat feste Zeiten und das Team ist deutschsprachig.",
      "Unsere Tochter wollte jeden Tag hin, das sagt mehr als jede Beschreibung.",
      "Es gab ein eigenes Abendprogramm, so hatten wir zweimal in Ruhe essen können.",
      "Die Betreuung nimmt schon ab drei Jahren, das ist selten.",
    ],
    minus: [
      "Der Kinderclub öffnet nur zwei Stunden am Vormittag.",
      "Betreut wurde ab vier Jahren, unsere Kleine war damit außen vor.",
      "Das Programm bestand im Wesentlichen aus Malen am Tisch.",
      "In der Nebensaison fand der Kinderclub gar nicht statt, obwohl er beworben war.",
    ],
    detailPlus: [
      "Morgens Basteln, nachmittags Pool, abends Kino - und immer dieselben zwei Betreuerinnen, das schafft Vertrauen.",
      "Beim Abholen gab es jedes Mal eine kurze Rückmeldung, was gemacht wurde.",
    ],
    detailMinus: [
      "Wir haben am zweiten Tag aufgehört, die Kinder hinzubringen, weil niemand sich zuständig fühlte.",
      "Der Club war mit fünfzehn Kindern und einer Betreuerin klar überfüllt.",
    ],
  },
  {
    id: "wellness", label: "Wellness & Spa", gewicht: 1.1,
    gilt: (item) => (item.amenities || []).includes("spa"),
    titelPlus: "Spa lohnt sich", titelMinus: "Spa nicht der Rede wert",
    plus: [
      "Sauna und Dampfbad waren sauber und selten voll.",
      "Die Massage war ihr Geld wert, Termine bekam man am Vortag.",
      "Der Ruhebereich ist wirklich ruhig, kein Durchgangsverkehr.",
      "Bademantel und Slipper lagen im Zimmer bereit.",
    ],
    minus: [
      "Der Spa-Bereich kostet extra, das war aus der Beschreibung nicht ersichtlich.",
      "Zwei Liegen im Ruheraum für ein Haus dieser Größe sind zu wenig.",
      "Die Sauna war an zwei Tagen wegen Wartung geschlossen.",
      "Massagetermine waren für die ganze Woche ausgebucht.",
    ],
  },
  {
    id: "parken", label: "Parken", gewicht: 1.0,
    gilt: (item) => (item.amenities || []).includes("parking"),
    titelPlus: "Parken unkompliziert", titelMinus: "Parkplatzsuche nervig",
    plus: [
      "Der Parkplatz am Haus ist kostenlos und es war immer etwas frei.",
      "Die Tiefgarage ist breit genug, auch für einen Kombi mit Dachbox.",
      "Parken war im Zimmerpreis enthalten, das spart in der Stadt einiges.",
    ],
    minus: [
      "Der Parkplatz kostet achtzehn Euro am Tag, das kam oben drauf.",
      "Ab dem frühen Abend war der Parkplatz voll, dann hieß es Straße suchen.",
      "Die Einfahrt zur Garage ist so eng, dass wir zweimal rangieren mussten.",
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
      "Die Küche ist erkennbar neu, alles funktioniert und nichts wackelt.",
      "Ein kleiner Supermarkt liegt zwei Straßen weiter, das macht das Selbstkochen leicht.",
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
  /* Feste Zusatzthemen ("Wunsch-Stimmen").
     ==================================================================
     Entscheidung des Nutzers vom 03.10.2026: Wer nach etwas Bestimmtem
     fragt (Hund, Fitnessraum, WLAN, Ausfluege), soll eine Antwort aus den
     Bewertungen bekommen. Zwei Wege standen zur Wahl - Stimmen erst bei
     der Frage erzeugen oder eine feste, groessere Themenliste. Gewaehlt
     ist die feste Liste: weniger, das schiefgehen kann, und jede Stimme
     steht schon da, bevor jemand fragt - dieselbe fuer jede Person.

     Wie bei den Themen vom 02.10.: Jedes haengt an einem Merkmal, das im
     Katalog steht. Saetze mit einer Bedingung stehen nur, wo sie stimmen
     (WLAN kostenlos nur ohne Gebuehr, kurzer Transfer nur bei kurzem Weg).
     Jede Liste hat mindestens einen Satz ohne Bedingung, weil saetzeFuer
     sonst auf die ganze Liste zurueckfaellt. Das Gewicht ist niedriger
     als bei den Grundthemen: Gaeste schreiben ueber Zimmer und Essen
     oefter als ueber den Fitnessraum. */
  {
    id: "haustiere", label: "Haustiere", gewicht: 0.7,
    gilt: (item) => (item.amenities || []).includes("petsAllowed"),
    titelPlus: "Mit Hund willkommen", titelMinus: "Mit Hund nur geduldet",
    plus: [
      "Unser Hund war hier wirklich willkommen, es gab sogar einen Napf im Zimmer.",
      "Mit Hund unkompliziert, das Personal kannte ihn nach einem Tag beim Namen.",
      ["Für Spaziergänge mit dem Hund ist der Strand am frühen Morgen ideal.", amMeer],
      "Die Gebühr für den Hund war fair und vorher klar angegeben.",
    ],
    minus: [
      "Mit Hund durften wir nicht in den Frühstücksraum, das war vorher nicht klar.",
      "Für den Hund wird pro Nacht eine Gebühr fällig, die sich über die Woche läppert.",
      "Das Zimmer für Gäste mit Hund lag ganz hinten neben dem Lieferhof.",
    ],
  },
  {
    id: "fitness", label: "Fitnessraum", gewicht: 0.6,
    gilt: (item) => (item.amenities || []).includes("gym"),
    titelPlus: "Fitnessraum gut ausgestattet", titelMinus: "Fitnessraum eher Abstellkammer",
    plus: [
      "Der Fitnessraum hat Laufbänder, Hanteln und ist rund um die Uhr offen.",
      "Morgens um sieben hatte ich den Fitnessraum fast für mich allein.",
      "Die Geräte im Fitnessraum sind neu und gepflegt.",
    ],
    minus: [
      "Der Fitnessraum ist winzig, zwei Geräte und ein Ventilator.",
      "Im Fitnessraum war ein Laufband die ganze Woche defekt.",
      "Der Fitnessraum ist erst ab neun Uhr geöffnet, für Frühsportler zu spät.",
    ],
  },
  {
    id: "wlan", label: "WLAN", gewicht: 0.7,
    gilt: (item) => (item.amenities || []).includes("wifi"),
    titelPlus: "WLAN stabil", titelMinus: "WLAN schwach",
    plus: [
      "Das WLAN war stabil genug für Videotelefonate.",
      "Auch auf dem Zimmer hatten wir durchgehend gutes WLAN.",
      [ "WLAN ist kostenlos und man muss sich nicht jeden Tag neu anmelden.", (item) => typeof wlanGebuehr !== "function" || wlanGebuehr(item) === 0 ],
    ],
    minus: [
      "Das WLAN ging nur in der Lobby richtig, im Zimmer kaum.",
      "Abends brach das WLAN regelmäßig ein, wenn alle online waren.",
      [ "Für das WLAN wird pro Tag extra berechnet, das finde ich nicht mehr zeitgemäß.", (item) => typeof wlanGebuehr === "function" && wlanGebuehr(item) > 0 ],
    ],
  },
  {
    id: "fahrrad", label: "Fahrradverleih", gewicht: 0.6,
    gilt: (item) => (item.amenities || []).includes("bikeRental"),
    titelPlus: "Mit dem Rad unterwegs", titelMinus: "Leihräder enttäuschend",
    plus: [
      "Wir haben uns Räder am Haus geliehen und die Gegend erkundet, sehr zu empfehlen.",
      "Die Leihräder sind in gutem Zustand, Helme gab es dazu.",
      "Mit den Rädern vom Haus waren wir in einer Viertelstunde im nächsten Ort.",
    ],
    minus: [
      "Die Leihräder waren alt, bei einem sprang ständig die Kette ab.",
      "Es gibt nur wenige Räder, am Wochenende waren alle weg.",
      "Kindersitze für die Räder gab es nicht.",
    ],
  },
  {
    id: "aussicht", label: "Meerblick", gewicht: 0.8,
    gilt: (item) => (item.amenities || []).includes("seaView"),
    titelPlus: "Blick zum Verlieben", titelMinus: "Meerblick nur seitlich",
    plus: [
      "Der Blick aufs Meer vom Balkon ist unbezahlbar.",
      "Zum Sonnenuntergang saßen wir jeden Abend auf dem Balkon und haben aufs Wasser geschaut.",
      "Schon beim Aufwachen das Meer zu sehen, macht den Urlaub.",
    ],
    minus: [
      "Unser Zimmer mit Meerblick hatte den Blick nur schräg über den Parkplatz.",
      "Meerblick haben nur die oberen Etagen, unten sieht man auf die Hecke.",
      "Für den Aufpreis für Meerblick war die Sicht zu eingeschränkt.",
    ],
  },
  {
    id: "klima", label: "Klimaanlage", gewicht: 0.7,
    gilt: (item) => (item.amenities || []).includes("aircon") && draussenWarm(item),
    titelPlus: "Angenehm kühl", titelMinus: "Klimaanlage schwach",
    plus: [
      "Die Klimaanlage ist leise und kühlt das Zimmer schnell herunter.",
      "Auch an heißen Tagen konnten wir dank Klimaanlage gut schlafen.",
      "Die Klimaanlage lässt sich im Zimmer selbst regeln, das ist nicht überall so.",
    ],
    minus: [
      "Die Klimaanlage war laut und hat nachts gerattert.",
      "Die Klimaanlage schafft es mittags kaum gegen die Hitze.",
      "Die Klimaanlage läuft zentral, im Zimmer kann man sie kaum verstellen.",
    ],
  },
  {
    id: "terrasse", label: "Terrasse & Balkon", gewicht: 0.6,
    gilt: (item) => (item.amenities || []).includes("terrace"),
    titelPlus: "Schöne Terrasse", titelMinus: "Terrasse ohne Schatten",
    plus: [
      "Auf der Terrasse haben wir jeden Abend noch etwas getrunken, sehr gemütlich.",
      "Die Terrasse ist groß genug, dass man sich nicht auf den Füßen steht.",
      "Frühstück auf der Terrasse war jeden Morgen ein Höhepunkt.",
    ],
    minus: [
      "Auf der Terrasse gibt es kaum Schatten, mittags war es dort nicht auszuhalten.",
      "Die Terrassenmöbel sind in die Jahre gekommen.",
      "Die Terrasse ist ab dem späten Nachmittag voll, man findet kaum einen Platz.",
    ],
  },
  {
    id: "erwachsene", label: "Nur Erwachsene", gewicht: 0.8,
    gilt: (item) => (item.amenities || []).includes("adultsOnly"),
    titelPlus: "Herrlich ruhig ohne Trubel", titelMinus: "Erwachsenenhotel, aber laut",
    plus: [
      "Ein Haus nur für Erwachsene, und das merkt man: ruhig, entspannt, kein Geschrei am Pool.",
      "Genau richtig für eine Auszeit zu zweit.",
      "Viele Paare, angenehm ruhige Stimmung den ganzen Tag.",
    ],
    minus: [
      "Trotz nur Erwachsene war es am Pool durch Junggesellengruppen ziemlich laut.",
      "Für ein Erwachsenenhotel war abends erstaunlich wenig los, eher etwas steif.",
    ],
  },
  {
    id: "spielplatz", label: "Spielplatz", gewicht: 0.7,
    gilt: (item) => (item.amenities || []).includes("familyFriendly") || (item.amenities || []).includes("kidsClub"),
    titelPlus: "Toller Spielplatz", titelMinus: "Spielplatz in die Jahre gekommen",
    plus: [
      "Der Spielplatz liegt im Schatten und man sieht ihn von den Liegen aus.",
      "Klettergerüst, Schaukeln und ein Sandkasten, die Kinder waren dort jeden Tag.",
      "Der Spielplatz ist eingezäunt, so konnten wir entspannt danebensitzen.",
    ],
    minus: [
      "Der Spielplatz ist klein und liegt in der prallen Sonne.",
      "Am Spielplatz waren einige Geräte abgesperrt.",
      "Für ältere Kinder gibt es auf dem Spielplatz kaum etwas.",
    ],
  },
  {
    id: "umgebung", label: "Ausflüge & Umgebung", gewicht: 0.8,
    titelPlus: "Viel zu entdecken", titelMinus: "Drumherum wenig los",
    plus: [
      "Von hier aus haben wir mehrere Ausflüge gemacht, die Rezeption hatte gute Tipps.",
      "In der Umgebung gibt es einiges zu sehen, wir hätten noch eine Woche gebraucht.",
      ["Die Altstadt ist zu Fuß erreichbar, abends sind wir oft noch durch die Gassen gelaufen.", (item) => (item.distanceToCenter ?? 99) <= 1.5],
      ["Mit dem Mietwagen sind die schönsten Orte der Insel gut zu erreichen.", aufInsel],
    ],
    minus: [
      "Ohne eigenes Auto ist man für Ausflüge auf teure Touren angewiesen.",
      "Direkt in der Umgebung gibt es wenig zu sehen, für Ausflüge muss man weiter fahren.",
      ["Abends ist im Ort nicht viel los, man bleibt eher im Hotel.", (item) => (item.distanceToCenter ?? 0) > 2],
    ],
  },
  {
    id: "transfer", label: "Anreise vom Flughafen", gewicht: 0.6,
    gilt: (item) => item.distanceToAirport != null,
    titelPlus: "Schnell angekommen", titelMinus: "Transfer zieht sich",
    plus: [
      "Die Anreise vom Flughafen war unkompliziert.",
      ["Vom Flughafen waren wir in einer knappen halben Stunde da.", (item) => item.distanceToAirport <= 25],
      "Die Wegbeschreibung vom Haus war genau, wir haben sofort hingefunden.",
    ],
    minus: [
      "Ein Shuttle vom Flughafen gibt es nicht, man muss selbst organisieren.",
      ["Vom Flughafen zieht sich die Fahrt, mit Kindern war das nach dem Flug anstrengend.", (item) => item.distanceToAirport >= 45],
      "Die Zufahrt ist schlecht ausgeschildert, wir sind einmal vorbeigefahren.",
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
  // Aspekte ohne eigene Teilnote (Kueche, Ruhe, Pool) bekommen den Schnitt
  // der ausgewiesenen Teilnoten. Ein pauschaler Abzug haette sie systematisch
  // ans Ende gestellt - bei Ferienwohnungen stand dann bei jedem Objekt
  // "Kritik gibt es bei Kueche", was kein Datenbefund war, sondern ein
  // Artefakt der Ersatzrechnung.
  const werte = Object.values(b).filter((x) => typeof x === "number");
  return werte.length ? werte.reduce((a, c) => a + c, 0) / werte.length : item.rating;
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
  /* Stichwoerter fuer die Aspekte, die am 02.10.2026 dazugekommen sind.
     Danach durchsucht `bewertungenSuchen` den Text, wenn jemand nach
     Rutschen, echtem Alkohol oder dem Strand fragt. */
  wasserspass: ["rutsch", "wasserspielplatz", "fontän", "breitrutsche", "wasserspaß", "wasserspass"],
  /* Kurze Woerter mit Wortgrenze. "gin" ohne sie trifft "beginnt" und
     "ging" - zu "Alkohol" stand dann ein Satz ueber den Lieferverkehr. */
  getraenke: ["getränk", "\\bbar\\b", "cocktail", "alkohol", "spirituos", "\\bwein",
    "\\bbier", "\\bgin\\b", "all inclusive", "zapfhahn", "\\bsaft"],
  strand: ["strand", "sand", "meer", "ufer", "badeschuh", "seegras", "liegen am strand"],
  betreuung: ["kinderclub", "kids club", "betreu", "animation", "kinderprogramm", "abendprogramm"],
  wellness: ["wellness", "\\bspa\\b", "sauna", "massage", "dampfbad", "ruhebereich", "ruheraum"],
  parken: ["park", "garage", "stellplatz", "einfahrt"],
  /* Feste Zusatzthemen vom 03.10.2026 (siehe ASPEKTE) */
  haustiere: ["hund", "haustier", "katze", "napf", "vierbeiner"],
  fitness: ["fitness", "laufband", "hantel", "\\bgym\\b", "trainingsraum"],
  wlan: ["wlan", "wifi", "internet"],
  fahrrad: ["fahrrad", "\\bräder", "\\brad\\b", "leihr"],
  aussicht: ["meerblick", "blick aufs meer", "aufs wasser", "\\bsicht\\b"],
  klima: ["klimaanlage", "\\bklima"],
  terrasse: ["terrasse", "balkon"],
  erwachsene: ["nur für erwachsene", "nur erwachsene", "erwachsenenhotel", "ohne kinder", "adults only"],
  spielplatz: ["spielplatz", "schaukel", "klettergerüst", "sandkasten"],
  umgebung: ["ausflug", "ausflüge", "umgebung", "sehenswürdig", "altstadt", "\\btour", "entdecken"],
  transfer: ["flughafen", "transfer", "shuttle", "anreise vom"],
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
/* Die erste Seite soll zeigen, was die Zusammenfassung behauptet.
   ------------------------------------------------------------------
   Vorher waren es einfach die ersten zehn Bewertungen. Bei 66 Prozent
   Zustimmung zur Sauberkeit standen darin dann zufaellig zwei Lob und
   keine Kritik - die Person las das Gegenteil dessen, was der Agent
   sagte, und hielt ihn fuer erfunden. Jetzt wird die erste Seite so
   gewaehlt, dass jede Schwaeche des Hauses mindestens einmal kritisch
   und jede Staerke mindestens einmal positiv vorkommt. Der Rest bleibt
   in der urspruenglichen Reihenfolge, und ab Seite zwei aendert sich
   nichts. */
function ersteSeiteMischen(item, liste, wie) {
  const kurz = typeof aspektKurzfassung === "function" ? aspektKurzfassung(item) : null;
  if (!kurz || (!kurz.schwaechen.length && !kurz.staerken.length)) return liste;
  const labelZuId = {};
  for (const a of kurz.bilanz || []) labelZuId[a.label] = a.id;
  const gesucht = [
    ...kurz.schwaechen.map((l) => ({ id: labelZuId[l], richtung: -1 })),
    ...kurz.staerken.map((l) => ({ id: labelZuId[l], richtung: 1 })),
  ].filter((x) => x.id);
  const hat = (r, id, richtung) => Object.entries(r.aspekte || {}).some(([k, w]) => k === id && Math.sign(w) === richtung);
  const raus = liste.slice();
  for (const { id, richtung } of gesucht) {
    if (raus.some((r) => hat(r, id, richtung))) continue;
    // Im groesseren Vorrat nach einer passenden Stimme suchen und die
    // letzte Bewertung der Seite ersetzen
    for (let i = wie; i < Math.min(item.reviewCount, 200); i++) {
      const kandidat = baueBewertung(item, i);
      if (hat(kandidat, id, richtung)) { raus[raus.length - 1] = kandidat; break; }
    }
  }
  return raus;
}

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
  return von === 0 && wie <= 20 ? ersteSeiteMischen(item, liste, wie) : liste;
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
// Eine Stichprobe fuer alle: Karten und Agent rechneten mit 400, der
// Rundgang mit 800 - im Testlauf vom 03.10.2026 stand "Lage 9,4" im Chat
// und "Lage 9,7" auf der Karte desselben Hauses.
const ASPEKTBILANZ_SPEICHER = new Map();
function aspektbilanz(item, stichprobe = 800) {
  // Zwischengespeichert: Dieselbe Rechnung lief beim Bewerten vieler
  // Haeuser immer wieder. Die Teilnoten stehen im Schluessel - werden sie
  // angepasst, wird neu gerechnet.
  const schluessel = `${item.id}|${stichprobe}|${item.reviewCount}|${JSON.stringify(item.ratingBreakdown || {})}`;
  // Im Vergleichsset gelten die konstruierten Teilnoten (data/teilnoten.js)
  const setzen = (b) => (typeof Teilnoten !== "undefined" ? Teilnoten.anwenden(item, b) : b.slice());
  if (ASPEKTBILANZ_SPEICHER.has(schluessel)) return setzen(ASPEKTBILANZ_SPEICHER.get(schluessel));
  const raus = aspektbilanzRechnen(item, stichprobe);
  ASPEKTBILANZ_SPEICHER.set(schluessel, raus);
  return setzen(raus);
}
function aspektbilanzRechnen(item, stichprobe) {
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
    // Staerke und Schwaeche muessen auch fuer sich stehen: Ein Aspekt mit
    // 80 Prozent Zustimmung ist keine Kritik, nur weil das Haus sonst bei
    // 88 liegt - in den Bewertungstexten findet die Person dann nichts
    // Negatives und der Satz wirkt erfunden.
    staerken: relevant.filter((a) => a.anteilPositiv >= schnitt + 0.07 && a.anteilPositiv >= 0.75).map((a) => a.label),
    schwaechen: relevant.filter((a) => a.anteilPositiv <= schnitt - 0.07 && a.anteilPositiv < 0.72).map((a) => a.label),
    bilanz: relevant,
  };
}

/* ==================================================================
   Was nur in den Bewertungen steht
   ------------------------------------------------------------------
   Wunsch des Nutzers vom 27.09.2026: eine Stichpunktliste mit Dingen,
   "die man jetzt nicht auf der Product Detail Page sehen kann, sondern
   die quasi nur in den Bewertungen stecken" - fuer den Strand ist ein
   Auto noetig, der Pool ist gut fuer Kinder, ein Supermarkt ist in der
   Naehe.

   Das ist genau die Arbeit, die ein Mensch nicht macht: hundert Texte
   lesen und daraus drei brauchbare Saetze ziehen. Und es ist eine der
   wenigen Stellen, an denen ein Agent etwas liefert, das die Seite
   selbst nicht hergibt.

   Gezaehlt wird ueber die tatsaechlichen Texte dieses Hauses - kein
   Muster, kein Stichpunkt. Steht der Satz nirgends, erscheint der
   Hinweis nicht. Deshalb steht neben jedem, wie oft er vorkam: Die
   Zahl ist nachpruefbar, indem man die Bewertungen aufmacht.
   ================================================================== */
const HINWEISE = [
  // Lage und Wege
  { id: "auto", art: "minus", text: "Ohne Auto kommt man kaum weg", muster: /ohne mietwagen|ins auto steigen|f[üu]r jede kleinigkeit/i },
  { id: "zufuss", art: "plus", text: "Alles Wichtige zu Fuß erreichbar", muster: /zu fu[ßs] erreichbar|[üu]berall zu fu[ßs] hinkommt/i },
  { id: "supermarkt_nah", art: "plus", text: "Supermarkt und Restaurants in Laufweite", muster: /supermarkt liegen praktisch vor der t[üu]r|supermarkt liegt zwei stra[ßs]en/i },
  { id: "supermarkt_fahren", art: "minus", text: "Zum Supermarkt muss man fahren", muster: /n[äa]chsten supermarkt muss man fahren/i },
  { id: "strand_nah", art: "plus", text: "Strand in wenigen Minuten", muster: /bis zum wasser sind es keine|nicht einmal die stra[ßs]e queren/i },
  { id: "bus", art: "plus", text: "Bushaltestelle fast vor der Tür", muster: /bus h[äa]lt keine hundert meter/i },
  { id: "bergauf", art: "minus", text: "Der Rückweg geht bergauf", muster: /r[üu]ckweg bergauf|steil bergauf/i },
  { id: "kinderwagen", art: "minus", text: "Mit Kinderwagen beschwerlich", muster: /kinderwagen/i },

  // Zimmer und Ausstattung
  { id: "klima_gut", art: "plus", text: "Klimaanlage und WLAN funktionieren", muster: /klimaanlage, wlan, genug steckdosen/i },
  { id: "klima_schwach", art: "minus", text: "Klimaanlage kommt gegen die Hitze nicht an", muster: /klimaanlage kam gegen/i },
  { id: "wlan", art: "minus", text: "WLAN bricht im Zimmer ab", muster: /wlan brach/i },
  { id: "balkon", art: "plus", text: "Balkon groß genug zum Frühstücken", muster: /balkon war gro[ßs] genug/i },
  { id: "dunkel", art: "plus", text: "Verdunkelung schließt dicht", muster: /verdunklung war wirklich dicht/i },
  { id: "hell", art: "minus", text: "Rollos schließen nicht ganz, früh wird es hell", muster: /rollos lie[ßs]en sich nur halb/i },
  { id: "steckdosen", art: "minus", text: "Wenige Steckdosen im Zimmer", muster: /einzige steckdose/i },
  { id: "bad_eng", art: "minus", text: "Bad eng für zwei Personen", muster: /bad ist eng/i },
  { id: "wasserdruck", art: "minus", text: "Wasserdruck in der Dusche schwankt", muster: /wasserdruck/i },
  { id: "moebel", art: "minus", text: "Möbel in die Jahre gekommen", muster: /m[öo]bel haben ihre besten jahre/i },
  { id: "familienzimmer", art: "plus", text: "Hochstuhl und Reisebett ohne Nachfrage", muster: /hochstuhl und reisebett/i },

  // Küche (Ferienwohnungen)
  { id: "kueche_gut", art: "plus", text: "Küche vollständig ausgestattet", muster: /k[üu]che ist komplett ausgestattet|gew[üu]rze, [öo]l und kaffeefilter|sp[üu]lmaschine und ein gro[ßs]er k[üu]hlschrank|k[üu]che ist erkennbar neu/i },
  { id: "kueche_knapp", art: "minus", text: "Küche nur knapp ausgestattet", muster: /fehlten scharfe messer|k[üu]hlschrank ist f[üu]r vier personen zu klein|geschirr war knapp/i },

  // Pool
  { id: "pool_gut", art: "plus", text: "Pool gepflegt, morgens ruhig", muster: /poolbereich ist gepflegt|genug liegen, auch am nachmittag/i },
  { id: "pool_kinder", art: "plus", text: "Eigener flacher Bereich für Kinder", muster: /flachen, abgetrennten bereich|kinder waren morgens als erste im wasser/i },
  { id: "pool_kinder_fehlt", art: "minus", text: "Kein eigenes Becken für kleine Kinder", muster: /eigenes becken f[üu]r kleinere kinder fehlt/i },
  { id: "liegen", art: "minus", text: "Liegen früh mit Handtüchern belegt", muster: /ab acht uhr mit handt[üu]chern/i },
  { id: "pool_klein", art: "minus", text: "Pool klein für die Größe des Hauses", muster: /pool ist f[üu]r die gr[öo][ßs]e/i },
  { id: "pool_schatten", art: "minus", text: "Pool liegt ab nachmittags im Schatten", muster: /ab drei uhr komplett im schatten/i },

  // Essen
  { id: "vegi_gut", art: "plus", text: "Vegetarisch gut abgedeckt", muster: /vegetarisch gab es mehr/i },
  { id: "vegi_duenn", art: "minus", text: "Vegetarisch dünne Auswahl", muster: /vegetarische g[äa]ste ist die auswahl/i },
  { id: "unvertraeglich", art: "plus", text: "Unverträglichkeiten sind kein Problem", muster: /unvertr[äa]glichkeit wurde ohne/i },
  { id: "brot", art: "plus", text: "Brot wird morgens frisch gebacken", muster: /drei sorten brot/i },
  { id: "fruehstueck_leer", art: "minus", text: "Frühstück früh leergeräumt", muster: /r[üu]hrei aufgebraucht/i },
  { id: "stosszeit", art: "minus", text: "Zu Stoßzeiten kaum ein freier Tisch", muster: /sto[ßs]zeiten war kaum ein freier tisch/i },

  // Geld
  { id: "parken", art: "minus", text: "Parken kostet extra", muster: /parken kostet extra|kurtaxe, parken/i },
  { id: "keine_extras", art: "plus", text: "Keine versteckten Zusatzkosten", muster: /keine versteckten zusatzkosten/i },
  { id: "inklusive", art: "plus", text: "Wasser, Kaffee und Leihräder inklusive", muster: /leihr[äa]der waren inklusive/i },
  { id: "getraenke", art: "minus", text: "Getränkepreise an der Bar hoch", muster: /getr[äa]nkepreise an der bar|zwei wasser und ein kaffee/i },

  // Ruhe
  { id: "hellhoerig", art: "minus", text: "Hellhörige Wände", muster: /w[äa]nde sind hellh[öo]rig|jedes wort mith[öo]rte/i },
  { id: "lieferverkehr", art: "minus", text: "Morgens Lieferverkehr vor dem Fenster", muster: /lieferverkehr vor dem fenster/i },
  { id: "animation", art: "minus", text: "Animation bis spät abends hörbar", muster: /animation war bis sp[äa]t/i },
  { id: "strasse_leise", art: "plus", text: "Von der Straße hört man nichts", muster: /stra[ßs]e h[öo]rt man im zimmer praktisch nichts/i },

  // Ankunft
  { id: "schluesselbox", art: "plus", text: "Schlüsselbox, Ankunft jederzeit möglich", muster: /schl[üu]sselbox/i },
  { id: "spaet", art: "plus", text: "Später Check-in möglich", muster: /check-in war auch sp[äa]t abends/i },
  { id: "warten", art: "minus", text: "Wartezeit beim Check-in", muster: /halbe stunde an|stunde auf den schl[üu]ssel/i },
  { id: "tipps", art: "plus", text: "Gute Tipps an der Rezeption", muster: /rezeption bekommt man richtig gute tipps|besten adressen im ort/i },
];

/* Das Bild eines Hauses aus seinen Bewertungen.
   ------------------------------------------------------------------
   Teilnoten, praktische Hinweise und echte Stimmen - alles aus
   denselben Texten, die auf der Hausseite stehen. Die Stichprobe von
   zweihundert reicht: Sie enthaelt rund hundertfuenfundsiebzig
   verschiedene Texte, und seltener als einmal in zweihundert muss ein
   Hinweis nicht auftauchen. */
function bewertungsbild(item, { stichprobe = 200, wunschIds = [] } = {}) {
  if (!item) return null;
  const roh = bewertungenFuer(item, 0, Math.min(item.reviewCount || 0, stichprobe));
  if (!roh.length) return null;
  const faktor = (item.reviewCount || roh.length) / roh.length;

  const hinweise = HINWEISE
    .map((h) => {
      const n = roh.filter((r) => h.muster.test(r.text)).length;
      return { id: h.id, art: h.art, text: h.text, anteil: n / roh.length, erwaehnungen: Math.round(n * faktor) };
    })
    .filter((h) => h.anteil > 0)
    .sort((a, b) => b.anteil - a.anteil);
  /* Gleich viele Hinweise fuer jedes Haus (04.10.2026, Entscheidung des
     Nutzers): drei Lob, zwei Kritik. Zuerst die, die oft genug vorkommen
     (zwei Prozent - einmal unter zweihundert ist Zufall); reicht das
     nicht, ruecken seltenere nach, die trotzdem wirklich in den Texten
     stehen. Leer aufgefuellt wird nichts. */
  const nehmen = (art, n) => {
    const oft = hinweise.filter((h) => h.art === art && h.anteil >= 0.02);
    const selten = hinweise.filter((h) => h.art === art && h.anteil < 0.02);
    return [...oft, ...selten].slice(0, n);
  };

  /* Immer beides: Lob und Kritik.
     ----------------------------------------------------------------
     Fuenf positive Stichpunkte lesen sich wie Werbung, und in einer
     Gegenueberstellung dreier Haeuser wuerde das die Kennzeichnung
     ueberlagern, um die es in der Erhebung geht. Also drei plus, zwei
     minus - und wenn eine Seite nichts hergibt, faellt sie eben kuerzer
     aus, statt aufgefuellt zu werden. */
  const gemischt = [...nehmen("plus", 3), ...nehmen("minus", 2)];

  const kurz = aspektKurzfassung(item);
  const bilanz = (kurz.bilanz || []).slice();
  // Was die Person genannt hat, steht vorn
  bilanz.sort((a, b) => (wunschIds.includes(b.id) ? 1 : 0) - (wunschIds.includes(a.id) ? 1 : 0)
    || b.erwaehnungen - a.erwaehnungen);

  // Stimmen im Wortlaut: zwei zustimmende, eine kritische
  const langGenug = (r) => r.text && r.text.length > 60;
  const lob = roh.filter((r) => r.rating >= 5 && langGenug(r)).slice(0, 2);
  const kritik = roh.filter((r) => r.rating <= 3 && langGenug(r)).slice(0, 1);
  const stimmen = [...lob, ...kritik].map((r) => ({
    autor: r.author, note: r.rating, titel: r.title, text: r.text,
    art: r.rating >= 5 ? "plus" : "minus",
  }));

  return {
    id: item.id, name: item.name, note: item.rating, anzahl: item.reviewCount,
    grundlage: roh.length,
    staerken: kurz.staerken || [], schwaechen: kurz.schwaechen || [],
    bilanz, hinweise: gemischt, stimmen,
  };
}

/* Bewertungen nach einem Stichwort durchsuchen.
   ==================================================================
   Der Nutzer am 02.10.2026: "Es kann nicht einfach so sein, dass es
   ganz viele Kommentare unter den Hotels gibt. Und das Modell sucht
   dann einfach mit einem Suchbegriff unter diesen Haeusern nach den
   Begriffen, die die Person nennt und bleibt dann da stehen."

   Genau das macht diese Funktion: Sie geht die Bewertungen eines Hauses
   durch, sammelt die, die den Begriff enthalten, und sagt, wie sie sich
   verteilen. Die Tendenz kommt nicht aus dem Text, sondern aus den
   Aspektmarkern, die jede Bewertung ohnehin traegt - damit ist sie
   nachpruefbar und nicht geraten.

   Zurueck kommt, was der Agent sagen darf: wie viele von wie vielen,
   wie viele davon lobend, und bis zu drei echte Stimmen. Findet sich
   nichts, steht das da - "dazu steht in den Bewertungen nichts" ist
   eine richtige Antwort und besser als eine aus der Gesamtnote
   abgeleitete. */
function bewertungenSuchen(item, begriff, max = 120) {
  const wort = String(begriff || "").trim().toLowerCase();
  if (!item || wort.length < 3) return null;

  /* Erst nachsehen, ob der Begriff zu einem Aspekt gehoert - dann wird
     mit dessen Stichwortliste gesucht statt nur mit dem einen Wort.
     "Alkohol" findet so auch "Spirituosen" und "Cocktail". */
  /* Erst der genaue Name des Aspekts, dann die Stichwoerter.
     ----------------------------------------------------------------
     In einem Durchgang gewann sonst der erste Treffer: "Strand" landete
     beim Aspekt Lage, weil dessen Stichwortliste das Wort enthaelt - und
     der eigene Strand-Aspekt kam nie zum Zug. */
  const eintraege = Object.entries(STICHWORTE || {});
  /* Unter mehreren Treffern gewinnt die kuerzeste Liste - sie ist die
     genaueste. "Klimaanlage" steht auch bei Ausstattung (mit Zimmer,
     Bett, Bad ...); gesucht werden soll aber im Thema Klimaanlage,
     sonst zaehlen Stimmen ueber das Bett mit (03.10.2026). */
  const kandidaten = eintraege.filter(([, worte]) => worte.some((w) => {
    const rein = String(w).replace(/\\b/g, "");
    return rein.length >= 3 && (wort.includes(rein) || rein.includes(wort));
  }));
  const ausAspekt = eintraege.find(([id]) => id === wort)
    || kandidaten.sort((x, y) => x[1].length - y[1].length)[0];
  const muster = ausAspekt
    ? new RegExp(ausAspekt[1].join("|"), "i")
    : new RegExp(wort.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const aspektId = ausAspekt ? ausAspekt[0] : null;
  const label = aspektId ? (ASPEKT_LABELS[aspektId] || null) : null;

  const menge = Math.min(item.reviewCount || 0, max);
  const liste = bewertungenFuer(item, 0, menge);
  const treffer = liste.filter((r) => muster.test(`${r.title || ""} ${r.text || ""}`));
  let positiv = 0, negativ = 0;
  for (const r of treffer) {
    const w = aspektId ? (r.aspekte || {})[aspektId] : null;
    if (w > 0) positiv += 1;
    else if (w < 0) negativ += 1;
    else if ((r.rating || 0) >= 4) positiv += 1;
    else negativ += 1;
  }
  // Je eine lobende und eine kritische Stimme zuerst - eine Auswahl, die
  // nur Lob zeigt, waere keine Auskunft, sondern Werbung
  const lob = treffer.filter((r) => (r.rating || 0) >= 4);
  const kritik = treffer.filter((r) => (r.rating || 0) < 4);
  /* Zitiert wird der Satz, in dem der Begriff steht.
     ----------------------------------------------------------------
     Eine Bewertung hat bis zu fuenf Saetze ueber verschiedene Dinge. Wer
     nach Rutschen fragt und einen Absatz ueber den Schrank bekommt, hat
     keine Antwort - auch wenn das Wort irgendwo darin vorkommt. */
  const satzMitBegriff = (text) => {
    const saetze = String(text || "").split(/(?<=[.!?])\s+/);
    return saetze.find((x) => muster.test(x)) || saetze[0] || "";
  };
  /* Nur Stimmen, bei denen wirklich ein Satz passt.
     ----------------------------------------------------------------
     Traf der Begriff nur im Titel, stand vorher der erste Satz der
     Bewertung da - zu "Alkohol" also "Morgens um sechs beginnt der
     Lieferverkehr". Ein Zitat, das nicht zur Frage gehoert, ist
     schlechter als keines. */
  const mitSatz = (r) => {
    const satz = satzMitBegriff(r.text);
    return muster.test(satz) ? satz : null;
  };
  const stimmen = [lob[0], kritik[0], lob[1], kritik[1], lob[2]].filter(Boolean)
    .map((r) => ({ r, satz: mitSatz(r) })).filter((x) => x.satz).slice(0, 3)
    .map(({ r, satz }) => ({ autor: r.author, note: r.rating, titel: r.title,
      text: satz, ganz: r.text,
      tendenz: (r.rating || 0) >= 4 ? "lobend" : "kritisch" }));

  return {
    begriff: wort, aspekt: aspektId, label,
    durchgesehen: liste.length, erwaehnungen: treffer.length,
    lobend: positiv, kritisch: negativ,
    anteilPositiv: treffer.length ? Math.round((positiv / treffer.length) * 100) / 100 : null,
    stimmen,
  };
}
