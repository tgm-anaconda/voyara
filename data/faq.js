/* Das FAQ - Grundwissen, auf das der Agent zugreifen kann.
   ==================================================================
   Der Nutzer am 02.10.2026: "Sollte es noch eine FAQ-Seite auf der
   Website geben, wo der Bot sich bei jeder moeglichen Frage bedienen
   kann? Das wuerde ich auf jeden Fall noch einbauen. Wo es wirklich
   unendlich viele Fragen gibt, wo der Bot dann entsprechend auch
   darauf antworten kann, dass er quasi ein grundlegendes Wissen in
   allen Bereichen bekommt. Was er nicht dauerhaft abrufen muss, denn
   sonst waere es ja auch zu komplex. Aber dass er sich dann mit einer
   Suche in diesem FAQ bedienen kann."

   Der zweite Grund ist der fuer die Erhebung wichtigere: Ohne FAQ
   beantwortet das Modell solche Fragen aus sich selbst, also aus
   Weltwissen ueber Reiseportale im Allgemeinen. Dann unterscheidet
   sich die Antwort zwischen zwei Teilnehmenden, ohne dass es jemand
   steuert oder auch nur sieht. Mit FAQ ist jede Antwort auf einen
   Eintrag zurueckfuehrbar, und was nicht darin steht, bleibt
   unbeantwortet - und wird als `faq_ohne_treffer` protokolliert.

   Jeder Eintrag traegt Stichworte. Danach sucht `faqSuchen`; die
   Themen gruppieren nur die Seite.
   ================================================================== */
const FAQ_THEMEN = [
  { id: "buchung", label: "Buchung und Bezahlung" },
  { id: "aendern", label: "Ändern und Stornieren" },
  { id: "unterkunft", label: "In der Unterkunft" },
  { id: "flug", label: "Flüge" },
  { id: "reisende", label: "Reisende, Kinder, Haustiere" },
  { id: "preise", label: "Preise und Gebühren" },
  { id: "seite", label: "Die Seite und der Assistent" },
  { id: "daten", label: "Daten und Sicherheit" },
];

const FAQ = [
  /* ---------- Buchung und Bezahlung ---------- */
  { id: "f-buchung-ablauf", thema: "buchung", frage: "Wie läuft eine Buchung ab?",
    antwort: "Unterkunft aussuchen, Zeitraum und Reisende prüfen, Zimmer und Verpflegung wählen, Daten eingeben und bestätigen. Danach bekommst du eine Bestätigung per E-Mail. Zwischen Auswahl und Bestätigung kannst du jederzeit zurück.",
    stichworte: ["buchen", "buchung", "ablauf", "wie funktioniert", "reservieren", "bestellen"] },
  { id: "f-buchung-bestaetigung", thema: "buchung", frage: "Wann bekomme ich die Buchungsbestätigung?",
    antwort: "Sofort nach dem Abschluss per E-Mail, meist innerhalb weniger Minuten. Kommt nach einer Stunde nichts an, sieh im Spam-Ordner nach.",
    stichworte: ["bestätigung", "bestaetigung", "email", "mail", "voucher", "beleg"] },
  { id: "f-buchung-zahlung", thema: "buchung", frage: "Welche Zahlungsarten gibt es?",
    antwort: "Kreditkarte (Visa, Mastercard, American Express), PayPal, SEPA-Lastschrift und Sofortüberweisung. Bei vielen Häusern kannst du auch erst vor Ort bezahlen.",
    stichworte: ["zahlen", "zahlung", "bezahlen", "kreditkarte", "paypal", "lastschrift", "rechnung", "überweisung"] },
  { id: "f-buchung-anzahlung", thema: "buchung", frage: "Muss ich alles sofort bezahlen?",
    antwort: "Bei den meisten Häusern wird eine Anzahlung von 20 Prozent fällig, der Rest 14 Tage vor Anreise. Steht an der Unterkunft „Zahlung vor Ort“, zahlst du erst im Hotel.",
    stichworte: ["anzahlung", "sofort", "raten", "teilzahlung", "vorkasse"] },
  { id: "f-buchung-ohne-konto", thema: "buchung", frage: "Brauche ich ein Kundenkonto?",
    antwort: "Nein. Du kannst ohne Konto buchen, es reicht eine E-Mail-Adresse für die Bestätigung.",
    stichworte: ["konto", "anmelden", "registrieren", "account", "login"] },
  { id: "f-buchung-mehrere-zimmer", thema: "buchung", frage: "Kann ich mehrere Zimmer auf einmal buchen?",
    antwort: "Ja. Stell die Zimmerzahl in der Suche ein, dann rechnet die Seite den Preis für alle Zimmer zusammen. Die Zimmer liegen nicht automatisch nebeneinander - das kannst du im Bemerkungsfeld anfragen.",
    stichworte: ["mehrere zimmer", "zwei zimmer", "gruppe", "nebeneinander"] },
  { id: "f-buchung-gutschein", thema: "buchung", frage: "Kann ich einen Gutschein einlösen?",
    antwort: "Ja, im letzten Schritt vor dem Bestätigen gibt es ein Feld für Gutschein- und Aktionscodes. Pro Buchung lässt sich ein Code einlösen.",
    stichworte: ["gutschein", "code", "rabattcode", "aktionscode", "promo"] },

  /* ---------- Ändern und Stornieren ---------- */
  { id: "f-storno-frist", thema: "aendern", frage: "Bis wann kann ich kostenlos stornieren?",
    antwort: "Bei den meisten Unterkünften bis 24 Stunden vor Anreise kostenlos. Die Frist steht auf jeder Unterkunftsseite unter dem Preis. Bei Angeboten mit dem Hinweis „nicht erstattbar“ ist keine Stornierung möglich.",
    stichworte: ["stornieren", "storno", "absagen", "kündigen", "zurücktreten", "kostenlos"] },
  { id: "f-storno-wie", thema: "aendern", frage: "Wie storniere ich?",
    antwort: "Über den Link in der Buchungsbestätigung oder telefonisch unter der Nummer im Impressum. Die Stornierung wird dir noch einmal per E-Mail bestätigt.",
    stichworte: ["stornieren wie", "stornierung", "rückgängig"] },
  { id: "f-storno-geld", thema: "aendern", frage: "Wann bekomme ich mein Geld zurück?",
    antwort: "Innerhalb von 14 Tagen auf dem Weg, mit dem du bezahlt hast. Bei Kreditkarten kann es je nach Bank zwei bis drei Tage länger dauern.",
    stichworte: ["erstattung", "rückerstattung", "geld zurück", "refund"] },
  { id: "f-aendern-datum", thema: "aendern", frage: "Kann ich das Reisedatum nachträglich ändern?",
    antwort: "Ja, solange die Stornofrist läuft und die Unterkunft im neuen Zeitraum frei ist. Preisunterschiede werden verrechnet. Bei Pauschalreisen mit Flug kann eine Umbuchungsgebühr der Airline anfallen.",
    stichworte: ["umbuchen", "datum ändern", "verschieben", "anderer termin", "umbuchung"] },
  { id: "f-aendern-name", thema: "aendern", frage: "Kann ich den Namen eines Reisenden ändern?",
    antwort: "Bei der Unterkunft ja, bis zur Anreise. Bei Flügen verlangen die meisten Airlines dafür eine Gebühr, bei manchen Tarifen geht es gar nicht.",
    stichworte: ["name ändern", "namensänderung", "anderer reisender", "umschreiben"] },

  /* ---------- In der Unterkunft ---------- */
  { id: "f-checkin", thema: "unterkunft", frage: "Wann kann ich einchecken?",
    antwort: "In der Regel ab 15 Uhr, Check-out bis 11 Uhr. Die genauen Zeiten stehen auf der Seite der Unterkunft. Früher anreisen geht meist nach Absprache, das Gepäck kannst du fast überall vorher abgeben.",
    stichworte: ["check-in", "checkin", "einchecken", "ankunft", "check-out", "auschecken", "uhrzeit"] },
  { id: "f-spaet", thema: "unterkunft", frage: "Was ist, wenn ich spät nachts ankomme?",
    antwort: "Sag es im Bemerkungsfeld der Buchung. Die meisten Häuser haben eine Rezeption rund um die Uhr; wo das nicht so ist, gibt es eine Schlüsselbox.",
    stichworte: ["spät", "nachts", "später check-in", "verspätung", "abends"] },
  { id: "f-verpflegung", thema: "unterkunft", frage: "Was bedeuten Frühstück, Halbpension und All Inclusive?",
    antwort: "Frühstück heißt eine Mahlzeit, Halbpension Frühstück und Abendessen, Vollpension dazu das Mittagessen. All Inclusive umfasst alle Mahlzeiten und die meisten Getränke; was genau dazugehört, steht beim jeweiligen Haus.",
    stichworte: ["verpflegung", "halbpension", "vollpension", "all inclusive", "frühstück", "mahlzeiten", "essen inklusive"] },
  { id: "f-unvertraeglichkeit", thema: "unterkunft", frage: "Wird auf Allergien und Unverträglichkeiten Rücksicht genommen?",
    antwort: "Trag sie ins Bemerkungsfeld der Buchung ein, dann geben wir sie weiter. Die meisten Häuser mit Buffet haben glutenfreie und laktosefreie Alternativen; eine Garantie können wir nicht geben.",
    stichworte: ["allergie", "unverträglich", "glutenfrei", "laktose", "vegan", "vegetarisch", "diät"] },
  { id: "f-wlan", thema: "unterkunft", frage: "Ist WLAN inklusive?",
    antwort: "In fast allen Häusern ja. Wo es etwas kostet, steht es auf der Unterkunftsseite, und du kannst in der Suche links nach „WLAN ohne Aufpreis“ filtern.",
    stichworte: ["wlan", "wifi", "internet", "netz"] },
  { id: "f-parken", thema: "unterkunft", frage: "Gibt es Parkplätze?",
    antwort: "Viele Häuser haben eigene Parkplätze, teils kostenlos, teils gegen Gebühr. Du erkennst es am Merkmal „Parkplatz“ auf der Unterkunftsseite; den Preis nennt das Haus dort.",
    stichworte: ["parken", "parkplatz", "garage", "auto abstellen", "stellplatz"] },
  { id: "f-handtuecher", thema: "unterkunft", frage: "Sind Handtücher und Bettwäsche dabei?",
    antwort: "In Hotels immer. In Ferienwohnungen meistens, manchmal gegen eine Pauschale - das steht in der Beschreibung der Wohnung.",
    stichworte: ["handtuch", "handtücher", "bettwäsche", "wäsche", "bettzeug"] },
  { id: "f-endreinigung", thema: "unterkunft", frage: "Was ist die Endreinigung?",
    antwort: "Eine einmalige Gebühr bei Ferienwohnungen für die Reinigung nach der Abreise. Sie steht im Preis auf der Trefferkarte schon mit drin und wird in der Kasse noch einmal einzeln ausgewiesen.",
    stichworte: ["endreinigung", "reinigung", "putzen", "säubern"] },
  { id: "f-kurtaxe", thema: "unterkunft", frage: "Kommt vor Ort noch eine Kurtaxe dazu?",
    antwort: "In vielen Regionen ja. Sie wird vom Haus direkt erhoben und liegt je nach Ort zwischen einem und fünf Euro pro Person und Nacht. In unseren Preisen ist sie nicht enthalten.",
    stichworte: ["kurtaxe", "ortstaxe", "citytax", "touristensteuer", "vor ort zahlen"] },
  { id: "f-barrierefrei", thema: "unterkunft", frage: "Gibt es barrierefreie Zimmer?",
    antwort: "Einzelne Häuser haben barrierefreie Zimmer. Frag sie über das Bemerkungsfeld an - wir klären das vor der Bestätigung mit dem Haus.",
    stichworte: ["barrierefrei", "rollstuhl", "behindert", "aufzug", "stufenlos"] },

  /* ---------- Flüge ---------- */
  { id: "f-flug-dazu", thema: "flug", frage: "Kann ich den Flug mitbuchen?",
    antwort: "Ja, zu Hotels. Setz in der Suche den Haken „Flug dazu“ und wähl deinen Abflughafen; der Preis auf der Karte enthält den Flug dann schon. Zu Ferienwohnungen bieten wir keine Flüge an.",
    stichworte: ["flug buchen", "flug dazu", "mit flug", "pauschalreise", "paket"] },
  { id: "f-flughaefen", thema: "flug", frage: "Von welchen Flughäfen geht es los?",
    antwort: "Von Hamburg, Berlin, Hannover, Düsseldorf, Köln, Frankfurt, Stuttgart und München. Du kannst auch mehrere auswählen, dann suchen wir über alle.",
    stichworte: ["flughafen", "abflughafen", "abflug", "von wo", "startflughafen"] },
  { id: "f-flug-wahl", thema: "flug", frage: "Wie wähle ich eine bestimmte Verbindung?",
    antwort: "Auf der Unterkunftsseite steht unter „Flug dazu“ die vorgeschlagene Verbindung. Über „Andere Verbindung“ öffnet sich die Übersicht mit allen Flügen zu diesem Ziel - mit Zeiten, Stopps, Gepäck und Preis.",
    stichworte: ["verbindung wählen", "anderer flug", "flug ändern", "welcher flug", "flugauswahl"] },
  { id: "f-gepaeck", thema: "flug", frage: "Wie viel Gepäck ist dabei?",
    antwort: "Das steht bei jeder Verbindung in der Flugübersicht: von „nur kleines Handgepäck“ bis „23 kg inklusive“. Zusätzliches Gepäck buchst du direkt bei der Airline.",
    stichworte: ["gepäck", "koffer", "handgepäck", "kilo", "aufgabegepäck"] },
  { id: "f-flugtage", thema: "flug", frage: "Warum kann ich nicht an jedem Tag anreisen?",
    antwort: "Weil nicht jede Verbindung täglich fliegt. Wenn du einen Flug dazubuchst, zeigen wir nur Anreisetage, an denen es hin und nach deiner Aufenthaltsdauer auch zurückgeht.",
    stichworte: ["flugtag", "anreisetag", "nicht jeder tag", "wochentag", "warum kein datum"] },
  { id: "f-klasse", thema: "flug", frage: "Was kostet Premium Economy oder Business?",
    antwort: "Premium Economy liegt etwa beim Anderthalbfachen des Economy-Preises, Business beim Zweieinhalbfachen. Die Klasse stellst du auf der Unterkunftsseite unter „Flug dazu“ ein.",
    stichworte: ["klasse", "business", "premium economy", "economy", "sitzklasse"] },
  { id: "f-flug-verspaetung", thema: "flug", frage: "Was ist, wenn mein Flug ausfällt?",
    antwort: "Melde dich bei der Airline und bei uns. Bei einer zusammen gebuchten Reise kümmern wir uns um die Umbuchung der Unterkunft; die Entschädigung für den Flug läuft über die Airline.",
    stichworte: ["flug ausgefallen", "verspätung", "annulliert", "gestrichen", "entschädigung"] },

  /* ---------- Reisende, Kinder, Haustiere ---------- */
  { id: "f-kinder-preis", thema: "reisende", frage: "Zahlen Kinder den vollen Preis?",
    antwort: "Das hängt am Haus und am Alter. Gib das Alter in der Suche an, dann rechnen wir mit den Konditionen des jeweiligen Hauses. Kleinkinder im Elternbett sind meist frei.",
    stichworte: ["kinder", "kind", "kinderpreis", "baby", "kleinkind", "alter"] },
  { id: "f-kinderbett", thema: "reisende", frage: "Gibt es Kinderbetten und Hochstühle?",
    antwort: "In familienfreundlichen Häusern fast immer, oft kostenlos. Frag sie über das Bemerkungsfeld an, damit sie bei der Ankunft bereitstehen.",
    stichworte: ["kinderbett", "reisebett", "hochstuhl", "babybett"] },
  { id: "f-kinderclub", thema: "reisende", frage: "Was ist ein Kinderclub?",
    antwort: "Eine betreute Gruppe für Kinder, meist vormittags und nachmittags, mit Spiel- und Bastelprogramm. Welche Altersgruppen und Zeiten gelten, steht beim jeweiligen Haus und in den Gästebewertungen.",
    stichworte: ["kinderclub", "kinderbetreuung", "animation", "betreuung", "kids club"] },
  { id: "f-haustiere", thema: "reisende", frage: "Darf ich mein Haustier mitnehmen?",
    antwort: "In Häusern mit dem Merkmal „Haustiere erlaubt“ ja, meist gegen eine Gebühr pro Nacht. Gib es bei der Buchung an - unangemeldete Tiere können abgewiesen werden.",
    stichworte: ["haustier", "hund", "katze", "tier mitnehmen"] },
  { id: "f-adults-only", thema: "reisende", frage: "Was heißt Adults only?",
    antwort: "Das Haus nimmt nur Gäste ab 16 oder 18 Jahren auf. Die genaue Grenze steht auf der Unterkunftsseite.",
    stichworte: ["adults only", "erwachsene", "ohne kinder", "kinderfrei"] },
  { id: "f-alleinreisend", thema: "reisende", frage: "Zahle ich allein mehr?",
    antwort: "Bei manchen Häusern gibt es einen Einzelzimmerzuschlag, weil das Zimmer sonst zu zweit belegt wäre. Er ist im angezeigten Preis schon enthalten.",
    stichworte: ["allein", "einzelzimmer", "single", "alleinreisend", "zuschlag"] },

  /* ---------- Preise und Gebühren ---------- */
  { id: "f-preis-enthalten", thema: "preise", frage: "Was ist im angezeigten Preis enthalten?",
    antwort: "Die Übernachtung für die gewählten Zimmer und Nächte, die gewählte Verpflegung und die Servicegebühr. Bei Ferienwohnungen die Endreinigung, mit „Flug dazu“ auch der Flug für alle Reisenden. Nicht enthalten sind Kurtaxe und alles, was du vor Ort dazubuchst.",
    stichworte: ["preis enthalten", "inklusive", "gesamtpreis", "was kostet", "endpreis"] },
  { id: "f-servicegebuehr", thema: "preise", frage: "Was ist die Servicegebühr?",
    antwort: "Eine einmalige Gebühr von 35 Euro pro Zimmer für Buchung und Service. Sie steht in der Kasse einzeln ausgewiesen.",
    stichworte: ["servicegebühr", "gebühr", "buchungsgebühr", "aufschlag"] },
  { id: "f-preis-saison", thema: "preise", frage: "Warum ändert sich der Preis je nach Monat?",
    antwort: "Weil Unterkünfte in der Hauptsaison mehr kosten als in der Nebensaison. Auf jeder Karte steht, ob dein Zeitraum in der Haupt- oder Nebensaison liegt.",
    stichworte: ["saison", "hauptsaison", "nebensaison", "preis unterschiedlich", "teurer"] },
  { id: "f-bestpreis", thema: "preise", frage: "Bekomme ich den besten Preis?",
    antwort: "Wir zeigen den Preis, den das Haus uns für deinen Zeitraum gibt. Ein reduzierter Preis ist mit „Angebot“ gekennzeichnet, und links lässt sich nach reduzierten Häusern filtern.",
    stichworte: ["bestpreis", "günstiger", "angebot", "rabatt", "reduziert", "billiger"] },
  { id: "f-versicherung", thema: "preise", frage: "Brauche ich eine Reiserücktrittsversicherung?",
    antwort: "Nötig ist sie nicht. Sie lohnt sich, wenn du weit im Voraus buchst oder die Stornofrist knapp ist. In der Kasse kannst du sie dazunehmen oder abwählen.",
    stichworte: ["versicherung", "reiserücktritt", "rücktrittsversicherung", "absicherung"] },

  /* ---------- Die Seite und der Assistent ---------- */
  { id: "f-assistent", thema: "seite", frage: "Was kann der Reise-Assistent?",
    antwort: "Er sucht mit dir zusammen: stellt die Suche ein, setzt Filter, sieht sich Häuser und Bewertungen an und legt dir eine Auswahl vor. Wie weit er gehen darf, stellst du oben im Chat ein - vom reinen Suchen bis zum Buchen.",
    stichworte: ["assistent", "agent", "bot", "was kannst du", "hilfe", "chat"] },
  { id: "f-freigabe", thema: "seite", frage: "Was bedeuten die Freigabestufen?",
    antwort: "„Suchen“ heißt, er sucht und zeigt, entscheidet aber nichts. „Buchung vorbereiten“ heißt, er füllt alles aus und legt es dir zur Bestätigung vor. „Buchen“ heißt, er schließt selbst ab. Du kannst die Stufe jederzeit ändern.",
    stichworte: ["freigabe", "stufe", "erlaubnis", "darf er", "berechtigung"] },
  { id: "f-partner", thema: "seite", frage: "Was ist ein Partnerhaus?",
    antwort: "Ein Haus, für dessen Buchung Voyara eine Provision vom Betreiber bekommt. Preis, Bewertungen und Verfügbarkeit sind davon unberührt - sie stammen aus denselben Daten wie bei allen anderen Häusern.",
    stichworte: ["partner", "partnerhaus", "provision", "werbung", "bezahlt", "gesponsert"] },
  { id: "f-merkzettel", thema: "seite", frage: "Wie funktioniert der Merkzettel?",
    antwort: "Über das Herz auf jeder Karte legst du Häuser auf den Merkzettel und vergleichst sie später in Ruhe. Er bleibt erhalten, solange du den Browser nicht schließt.",
    stichworte: ["merkzettel", "merken", "favoriten", "herz", "vormerken", "wunschliste"] },
  { id: "f-filter", thema: "seite", frage: "Wie filtere ich die Trefferliste?",
    antwort: "Links neben der Liste stehen die Filter: Region, Preis pro Nacht, Gesamtpreis, Bewertung, Sterne, Ausstattung, Verpflegung und Strandnähe. Die Zahl neben jedem Filter sagt, wie viele Häuser danach übrig blieben.",
    stichworte: ["filter", "filtern", "eingrenzen", "sortieren", "suche verfeinern"] },
  { id: "f-mietwagen", thema: "seite", frage: "Kann ich auch einen Mietwagen buchen?",
    antwort: "Ja, über den Reiter „Mietwagen“ in der Suche. Mietwagen werden getrennt von der Unterkunft gebucht.",
    stichworte: ["mietwagen", "auto", "wagen mieten", "leihwagen"] },
  { id: "f-kontakt", thema: "seite", frage: "Wie erreiche ich den Kundenservice?",
    antwort: "Telefonisch montags bis samstags von 8 bis 20 Uhr und per E-Mail; beides steht im Impressum. Bei einer laufenden Reise sind wir rund um die Uhr erreichbar.",
    stichworte: ["kontakt", "service", "telefon", "anrufen", "hotline", "erreichen", "beschwerde"] },

  /* ---------- Daten und Sicherheit ---------- */
  { id: "f-daten", thema: "daten", frage: "Was passiert mit meinen Daten?",
    antwort: "Wir geben an die Unterkunft nur weiter, was sie für die Buchung braucht: Namen, Zeitraum und deine Anmerkungen. Zahlungsdaten bleiben beim Zahlungsdienstleister.",
    stichworte: ["daten", "datenschutz", "dsgvo", "privatsphäre", "weitergabe"] },
  { id: "f-daten-loeschen", thema: "daten", frage: "Kann ich meine Daten löschen lassen?",
    antwort: "Ja, per E-Mail an die Adresse im Impressum. Buchungsunterlagen müssen wir aus steuerlichen Gründen zehn Jahre aufbewahren.",
    stichworte: ["löschen", "daten löschen", "auskunft", "widerruf"] },
  { id: "f-sicher", thema: "daten", frage: "Ist die Zahlung sicher?",
    antwort: "Die Verbindung ist verschlüsselt, und die Zahlung läuft über einen zertifizierten Dienstleister. Kreditkartennummern sehen und speichern wir nicht.",
    stichworte: ["sicher", "sicherheit", "verschlüsselt", "betrug", "seriös"] },
];

/* Im FAQ nachschlagen.
   ------------------------------------------------------------------
   Gesucht wird in Stichworten, Frage und Antwort. Ein Treffer im
   Stichwort zaehlt am meisten, dann die Frage, dann die Antwort -
   sonst gewinnt ein langer Antworttext gegen die passende Frage.

   Zurueck kommen hoechstens drei Eintraege. Mehr waere keine Antwort,
   sondern eine Liste, und das Modell wuerde daraus einen Vortrag
   machen. */
function faqSuchen(frage, wieViele = 3) {
  const text = String(frage || "").toLowerCase().trim();
  if (text.length < 3) return [];
  // Woerter ab vier Zeichen, ohne die haeufigsten Fuellwoerter
  const STOPP = new Set(["eine", "einen", "einem", "eines", "oder", "aber", "auch", "noch",
    "dass", "wenn", "wie", "was", "wer", "wo", "warum", "kann", "muss", "soll", "darf",
    "ist", "sind", "habe", "haben", "wird", "werden", "mein", "meine", "meinem", "ich",
    "mir", "mich", "das", "der", "die", "den", "dem", "des", "und", "für", "fuer", "mit",
    "von", "bei", "auf", "zum", "zur", "nicht", "man", "sich", "eigentlich", "denn"]);
  const woerter = text.split(/[^a-zäöüß0-9]+/i).filter((w) => w.length >= 4 && !STOPP.has(w));
  if (!woerter.length) return [];

  const treffer = [];
  for (const e of FAQ) {
    let punkte = 0;
    for (const w of woerter) {
      if ((e.stichworte || []).some((s) => s.includes(w) || w.includes(s))) punkte += 3;
      else if (e.frage.toLowerCase().includes(w)) punkte += 2;
      else if (e.antwort.toLowerCase().includes(w)) punkte += 1;
    }
    if (punkte > 0) treffer.push({ ...e, punkte });
  }
  /* Eine einzelne schwache Uebereinstimmung ist kein Treffer: Das Wort
     "Zimmer" steht in jeder zweiten Antwort. Erst ab drei Punkten, also
     einem echten Stichworttreffer oder mehreren schwachen, gilt es. */
  return treffer.filter((t) => t.punkte >= 3)
    .sort((a, b) => b.punkte - a.punkte).slice(0, wieViele);
}

if (typeof module !== "undefined" && module.exports) module.exports = { FAQ, FAQ_THEMEN, faqSuchen };
