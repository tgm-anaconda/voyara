/* Der Werkzeugkasten des Werkzeug-Agenten
   ====================================================================
   Hier stehen die Werkzeuge, die das Modell rufen darf: ihre
   Beschreibung fuer das Modell (JSON-Schema) und ihre Ausfuehrung im
   Browser. Das Modell entscheidet, wann es was ruft; hier wird
   ausgefuehrt, protokolliert und begrenzt.

   Jedes Werkzeug liefert ein kompaktes Ergebnis fuer das Modell
   (JSON-faehig, wenige Felder - jedes Feld kostet Tokens bei jedem
   weiteren Zug) und schreibt eine Zeile ins Agenten-Log.

   Seitenwechsel: Manche Werkzeuge klicken etwas, das die Seite neu
   laedt (Suche abschicken, Haus oeffnen, zur Buchung). Dann endet die
   Ausfuehrung mit { navigiert: true, stufe } - der Kern sichert den
   Stand, die Seite laedt, und der Kern ruft das Werkzeug danach mit der
   naechsten Stufe erneut auf, bis ein Ergebnis da ist.

   Freigabe: Alle Werkzeuge sind dem Modell bekannt. Ist eines auf der
   gewaehlten Stufe nicht erlaubt, meldet es das zurueck (und der Kern
   notiert "gesperrt") - so kann das Modell der Person sagen, dass sie
   den Schritt selbst machen oder die Freigabe anheben kann.
   ================================================================== */

/* Eigenschaften, die das Modell gern erfindet, und wie sich am Haus
   pruefen laesst, ob sie stimmen. Gebraucht vom Kern, um Saetze wie
   "drei Hotels mit Meerblick" zu streichen, wenn weder die Person davon
   gesprochen hat noch die Haeuser es hergeben. */
const AUSSTATTUNG_WORT = {
  "meerblick": (h) => (h.amenities || []).includes("seaView"),
  "kinderclub|kids ?club": (h) => (h.amenities || []).includes("kidsClub"),
  "\\bpool\\b": (h) => (h.amenities || []).includes("pool"),
  "wellness|\\bspa\\b|sauna": (h) => (h.amenities || []).includes("spa"),
  "all ?inclusive": (h) => (h.boards || []).some((b) => b.key === "ai"),
  "halbpension": (h) => (h.boards || []).some((b) => b.key === "halb"),
  "vollpension": (h) => (h.boards || []).some((b) => b.key === "voll"),
  "direkt am strand|strandlage": (h) => (h.amenities || []).includes("beachfront") || (h.distanceToBeach != null && h.distanceToBeach <= 0.2),
  "klimaanlage": (h) => (h.amenities || []).includes("aircon"),
  "haustier": (h) => (h.amenities || []).includes("petsAllowed"),
  "fitness|gym": (h) => (h.amenities || []).includes("gym"),
  "dachterrasse": (h) => (h.amenities || []).includes("terrace"),
  "fahrradverleih": (h) => (h.amenities || []).includes("bikeRental"),
  "adults ?only": (h) => (h.amenities || []).includes("adultsOnly"),
};

const Werkzeugkasten = {
  /* ==================================================================
     Beschreibungen fuer das Modell
     ================================================================== */
  /* Nur die Werkzeuge, die gerade benutzbar sind.
     ------------------------------------------------------------------
     Der Nutzer am 02.10.2026: "Es muss einfach gut funktionieren, dass
     das Modell nur die Sachen bekommt, die es auch wirklich jetzt gerade
     benoetigt an Informationen, damit es nicht ueberfordert ist."

     Gemessen: 18 Werkzeuge, rund 18.000 Zeichen in jedem Zug. Drei davon
     braeuchten eine hoehere Freigabestufe und konnten gar nicht gerufen
     werden - der Kern haette sie ohnehin abgewiesen. Sie standen
     trotzdem jedes Mal mit im Auftrag und waren damit nichts als
     Angebot, das ins Leere fuehrt: Das Modell kuendigt eine Buchung an,
     der Kern laesst sie nicht zu, und die Person sieht einen Agenten,
     der sich widerspricht.

     `freigabe_aendern` bleibt immer dabei - sonst koennte die Person den
     Agenten nicht mehr weiterlassen. */
  definitionen(freigabe = null) {
    const alle = this.alleDefinitionen();
    if (!freigabe) return alle;
    const RANG = { suchen: 1, vorbereiten: 2, buchen: 3 };
    const habe = RANG[freigabe] || 1;
    return alle.filter((d) => {
      const name = d.function?.name;
      const noetig = this.BRAUCHT[name];
      return !noetig || (RANG[noetig] || 1) <= habe;
    });
  },

  alleDefinitionen() {
    const f = (name, description, properties, required = []) => ({
      type: "function",
      function: { name, description, parameters: { type: "object", properties, required, additionalProperties: false } },
    });
    const zahl = (description) => ({ type: "integer", description });
    const text = (description) => ({ type: "string", description });
    return [
      f("stand_merken",
        "Merkt sich, was du ueber die Reise erfahren hast. Ruf es, sobald etwas Neues feststeht (auch mehrere Felder auf einmal). Nur Felder setzen, die die Person wirklich genannt hat.",
        {
          /* Was die letzte Nachricht der Person ueberhaupt war.
             ----------------------------------------------------------
             Das Verstehen gehoert dem Modell, das Handeln dem Kern - und
             diese Einordnung ist die Bruecke dazwischen. Bei "antwort"
             fuehrt der Fahrplan weiter und stellt die naechste Frage. Bei
             allem anderen tritt er zur Seite: Das Modell geht frei auf die
             Person ein, und die offene Frage kommt im naechsten Zug
             wieder - nicht angehaengt an dieselbe Nachricht. */
          nachricht_art: { type: "string", enum: ["antwort", "anweisung", "frage", "einwand", "unklar", "sonstiges"],
            description: "Was die letzte Nachricht der Person war. antwort = sie beantwortet die gestellte Frage (auch teilweise oder mit Zusatz). anweisung = sie sagt dir, was du tun sollst ('nimm das erste', 'buch das', 'zeig mir die Auswahl nochmal'). frage = sie will etwas von dir wissen. einwand = sie widerspricht, korrigiert oder lehnt etwas ab. unklar = sie versteht die Frage nicht oder fragt zurueck, was gemeint ist. sonstiges = passt in keines der Felder. Immer angeben." },
          ziel: text("Region aus dem Katalog, als id: mallorca, kreta, algarve, sardinien, teneriffa, barcelona, wien, lissabon, tirol, suedtirol, lappland, ostsee, marrakesch, kapstadt, krabi, island, newyork, kyoto. NUR, wenn die Person die Region selbst genannt hat - sonst leer lassen. Eine Region, die du fuer passend haeltst, gehoert nicht hierher: Dafuer gibt es regionen_vergleichen, und die Person entscheidet."),
          monat: zahl("Reisemonat 1-12. Ein Monat allein heisst: flexibel im Monat, ohne festes Datum."),
          /* Die Person gibt die Wahl ab - in beliebigen Worten.
             ----------------------------------------------------------
             Am 27.09.2026 sagte jemand "gerne in dem Monat, wo ich die
             meisten Moeglichkeiten fuer guenstige Hotels habe". Der Kern
             erkannte das nicht (er suchte nach "egal" und aehnlichem) und
             stellte dieselbe Frage noch einmal. Ob ein Satz die Wahl
             abgibt, ist eine Bedeutungsfrage - also Sache des Modells.
             Was daraus folgt, ist Sache des Kerns: Er vergleicht die
             Monate sichtbar und begruendet seine Wahl. */
          monatUeberlassen: { type: "boolean", description: "true, wenn die Person dir die Wahl des Monats ueberlaesst - egal in welchen Worten ('egal', 'such du aus', 'der guenstigste', 'wo am meisten frei ist', 'wo ich die meisten Moeglichkeiten habe'). Setz monat dann NICHT selbst." },
          von: text("Anreise als YYYY-MM-DD - nur, wenn die Person einen Tag nennt ('vom 12. bis 26.'). Aus 'im Oktober' wird kein Datum."),
          bis: text("Abreise als YYYY-MM-DD - nur bei genannten Tagen"),
          anreise: text("Anreisetag als YYYY-MM-DD, wenn die Person ihn fuer die Buchung nennt (bei flexibler Suche)"),
          /* Fristen hatten bis zum 29.09.2026 kein Feld.
             ----------------------------------------------------------
             Auf "boah gerne spaetestens am 03.12" konnte das Modell
             nichts ablegen: Es ist kein Anreisetag, sondern eine Grenze.
             Es setzte stattdessen monatUeberlassen, der Kern waehlte
             Oktober, und die Frage nach der Zeit kam ein zweites Mal -
             fuer die Person sah es aus, als waere ihre Antwort nicht
             angekommen. */
          anreiseBis: text("Spaeteste Anreise als YYYY-MM-DD, wenn die Person eine Frist nennt ('spaetestens am 3.12.', 'wir muessen vor dem 20. da sein')"),
          anreiseAb: text("Fruehestmoegliche Anreise als YYYY-MM-DD, wenn die Person eine Untergrenze nennt ('fruehestens ab dem 20.5.', 'erst nach dem 10.')"),
          zielOffen: { type: "boolean", description: "true, wenn die Person sagt, dass das Ziel noch offen ist oder sie sich beraten lassen will" },
          mindestGrad: zahl("Gradzahl, wenn die Person eine nennt ('mir reichen 20 Grad', 'mindestens 25 Grad warm'). Verschiebt, welche Regionen als warm oder kalt zaehlen."),
          richtung: { type: "string", enum: ["warm", "kalt", "strand", "berge", "ski", "norden", "stadt", "wintersonne", "fern"], description: "Richtung statt Ziel, wenn die Person so etwas sagt ('eher warm', 'kalt', 'ans Meer', 'in die Berge') - die Suche beschraenkt sich dann auf passende Regionen" },
          weiter: { type: "string", enum: ["schauen", "klaeren"], description: "Antwort auf die Frage, ob du mit dem Bekannten schon mal schauen sollst (schauen) oder erst noch Eckdaten geklaert werden (klaeren)" },
          artEgal: { type: "boolean", description: "true, wenn die Person bei Hotel oder Ferienwohnung nicht festgelegt ist" },
          beratung: { type: "string", enum: ["klaeren", "auswahl"], description: "Nach der Lage: klaeren = sie will noch Eckdaten besprechen (Preis, Verpflegung, Wuensche); auswahl = sie will mit dem Bisherigen gleich eine erste Auswahl sehen" },
          vorgehen: { type: "string", enum: ["top3", "selbst"], description: "top3 = du sollst ihr Favoriten raussuchen; selbst = du stellst die Filter ein und die Person schaut selbst durch die Liste" },
          anzahlVorschlaege: zahl("Wie viele Haeuser sie vorgelegt haben will, wenn sie eine Zahl nennt (2 bis 6). Ohne Angabe leer lassen."),
          naechte: zahl("Zahl der Naechte"),
          personenGesamt: zahl("Nur die Gesamtzahl, wenn die Person sie so nennt ('zu viert', 'vier Leute') - dann erwachsene und kinder leer lassen und nachfragen. Kosewoerter wie 'mein Bengel', 'unser Spross', 'die Kleine' meinen ein Kind, keinen Erwachsenen; das Alter fragst du."),
          erwachsene: zahl("Zahl der Erwachsenen - nur, wenn die Person sie ausdruecklich nennt"),
          kinder: zahl("Zahl der Kinder (0, wenn ausdruecklich keine) - nur, wenn die Person sie ausdruecklich nennt"),
          kinderAlter: { type: "array", items: { type: "integer" }, description: "Alter der Kinder in Jahren" },
          typ: { type: "string", enum: ["hotel", "apartment"], description: "Hotel oder Ferienwohnung" },
          zimmer: zahl("Zahl der Zimmer (Hotel)"),
          maxPreis: zahl("Hoechstpreis pro Nacht in Euro"),
          budgetGesamt: zahl("Budget fuer die ganze Reise in Euro"),
          maxStrandMeter: zahl("Hoechstens so viele Meter zum Strand"),
          mindestbewertung: { type: "number", description: "Mindest-Gaestenote, z.B. 4.5 (nur wenn die Person das sagt)" },
          mindestSterne: zahl("Mindestens so viele Hotelsterne (nur wenn die Person das sagt)"),
          /* Jedes Haus hat WLAN, ein Viertel verlangt eine Tagesgebuehr.
             Deshalb ist die Frage nicht "mit WLAN", sondern "ohne
             Aufpreis" - siehe data/ziele.js, wlanGebuehr. */
          wlanInklusive: { type: "boolean", description: "true, wenn die Person WLAN ohne Aufpreis will ('WLAN muss inklusive sein', 'ich will nicht fuer WLAN zahlen'). Jedes Haus hat WLAN, manche verlangen eine Tagesgebuehr." },
          nurAngebote: { type: "boolean", description: "true, wenn die Person nur Haeuser sehen will, die gerade reduziert sind ('nur was im Angebot ist', 'nur reduziert', 'gibt es Schnaeppchen', 'nur Sonderangebote'). Die Seite hat dafuer einen Schalter in der Filterspalte."},
          preisEgal: { type: "boolean", description: "true, wenn die Person sagt, dass der Preis keine Rolle spielt oder sie keinen Rahmen nennen will" },
          bewertungEgal: { type: "boolean", description: "true, wenn die Person sagt, dass Bewertung oder Sterne ihr egal sind" },
          strandEgal: { type: "boolean", description: "true, wenn die Person sagt, dass die Naehe zum Strand egal ist" },
          verpflegungEgal: { type: "boolean", description: "true, wenn Verpflegung egal ist" },
          ausstattungEgal: { type: "boolean", description: "true, wenn die Person auf die Frage nach ihren Wuenschen sagt, dass sie nichts Besonderes braucht" },
          wuensche: { type: "array", items: { type: "string", enum: ["pool", "strand", "strandnah", "meerblick", "kinderclub", "familie", "wellness", "ruhe", "essen", "sauberkeit", "lage", "service", "preis", "bewertung"] }, description: "Was der Person wichtig ist (alle bisher genannten, nicht nur die neuen)" },
          /* "wifi" stand hier bis zum 29.09.2026 und war nicht einstellbar:
             Alle 184 Hotels und alle 160 Ferienwohnungen haben WLAN, also
             gibt es in der Spalte bewusst keinen Haken dafuer. Ein Wert im
             Schema, den die Seite nicht kennt, fuehrt nur dazu, dass der
             Agent einen Filter verspricht, den er nicht setzen kann. */
          ausstattung: { type: "array", items: { type: "string", enum: ["pool", "spa", "kidsClub", "familyFriendly", "beachfront", "parking", "restaurant", "gym", "seaView"] }, description: "Nur, wenn die Person etwas als Bedingung nennt ('muss einen Pool haben', 'direkt am Strand' = beachfront). Ein Wunsch gehoert in wuensche, nicht hierher." },
          verpflegung: { type: "string", enum: ["ohne", "fruehstueck", "halb", "voll", "ai"], description: "Gewuenschte Verpflegung" },
          zimmerTyp: text("Name des Zimmers, das die Person gewaehlt hat (genau so, wie er auf der Hausseite steht). Nur, wenn sie sich entschieden hat - nicht selbst auswaehlen."),
          flug: { type: "boolean", description: "true, wenn ein Flug dazu gewuenscht ist; false, wenn nur die Unterkunft" },
          flugAbEgal: { type: "boolean", description: "true, wenn der Person der Abflughafen gleich ist oder sie mehrere nennt, ohne sich zu entscheiden ('Hamburg oder Koeln', 'was billiger ist', 'egal'). Dann sucht der Agent die guenstigste Verbindung aus und sagt, welche er genommen hat." },
          /* Zwei genannte Flughaefen sind keine freie Wahl.
             ----------------------------------------------------------
             Am 28.09.2026: "gerne von Hannover oder Muenchen, je nachdem
             was billiger ist" - der Agent nahm Duesseldorf, weil er nur
             "billiger" verstand und nicht, worunter. Es fehlte schlicht
             ein Ort, an dem die zwei Namen haetten stehen koennen. */
          flugAbAuswahl: { type: "array", items: { type: "string" }, description: "Die Flughaefen, unter denen sie waehlen laesst, wenn sie mehrere nennt ('Hannover oder Muenchen, je nachdem was billiger ist'). Dann gilt flugAbEgal true UND diese Liste - der Agent nimmt den guenstigsten daraus, nicht den guenstigsten ueberhaupt." },
          flugAb: text("Abflughafen, wenn genannt (Hamburg, Stuttgart, Düsseldorf, Hannover, München, Köln, Frankfurt, Berlin - was die Seite anbietet)"),
          flugKlasse: { type: "string", enum: ["economy", "premium", "business"], description: "Flugklasse, wenn genannt" },
          /* Fuer die Buchungsstrecke. Zwei gleich lange Listen statt einer
             Liste von Objekten: Verschachtelte Schemata bekommt das Modell
             deutlich haeufiger falsch, und ein Name ohne Geburtsdatum ist
             brauchbarer als ein verworfener Eintrag. */
          reisende: { type: "array", items: { type: "string" }, description: "Namen der Reisenden, wie sie im Ausweis stehen, in der Reihenfolge: erst die Erwachsenen, dann die Kinder. Nur, wenn die Person sie nennt." },
          geburtsdaten: { type: "array", items: { type: "string" }, description: "Geburtsdaten als YYYY-MM-DD, in derselben Reihenfolge wie reisende. Nur genannte, nichts ausrechnen und nichts erfinden." },
          gepaeck: { type: "string", enum: ["hand", "20", "30"], description: "Gepaeck fuer alle Reisenden, wenn die Person es sagt ('alle brauchen einen Koffer' = 20). hand = nur Handgepaeck." },
        }),
      f("regionen_zaehlen",
        "Zaehlt je Region des Katalogs, wie viele Haeuser es im gemerkten Monat fuer die gemerkte Gruppe gibt, mit Saison. Nutze es, wenn das Ziel offen ist, bevor du Regionen empfiehlst.",
        {}),
      f("regionen_vergleichen",
        "Vergleicht Regionen anhand des Katalogs: wie viele Haeuser alle genannten Punkte erfuellen, Preis ab, Gaestenote. Nutze es, wenn die Person wissen will, wo ihre Wuensche am besten passen.",
        {
          ziele: { type: "array", items: { type: "string" }, description: "Region-ids, die in Frage kommen (leer = alle in Saison)" },
          aspekte: { type: "array", items: { type: "string", enum: ["strand", "bewertung", "pool", "familie", "kinderclub", "wellness", "preis", "ruhe", "lage"] }, description: "Worauf es der Person ankommt" },
        }),
      f("suchen",
        "Sucht nach den gemerkten Angaben (Ziel, Zeit, Reisende, Art) und den genannten Filtern. Bei Freigabe ab 'suchen' bedient es sichtbar die Seite, sonst den Katalog. Du darfst es jederzeit rufen, auch frueh und ohne Ziel: Solange die Beratung nicht abgeschlossen ist, liefert es die Lage (wie viele Haeuser, wo, Preisspanne, was es gibt) statt einzelner Haeuser. Hat die Person 'top3' gewaehlt, legt es die drei passendsten Haeuser gleich im Chat vor.",
        {
          ziel: text("Region-id (z.B. mallorca), falls sie feststeht und noch nicht gemerkt ist"),
          sortierung: { type: "string", enum: ["passung", "preis", "bewertung"], description: "Reihenfolge der Treffer; passung = nach den Wuenschen (Standard)" },
        }),
      f("haus_details",
        "Alles zu einem Haus aus dem Katalog: Preise je Verpflegung und Gesamtpreis fuer die gemerkte Reise, Zimmer, Entfernungen, Ausstattung, was in den Bewertungen gelobt und kritisiert wird. Fuer Nachfragen und Vergleiche.",
        { id: text("Haus-id aus einem Suchergebnis, z.B. h13") }, ["id"]),
      f("auswahl_vorlegen",
        "Zeigt der Person die Haeuser aus dem letzten Suchergebnis als Vorschlaege, mit festen Saetzen (Preis, Note, was gelobt und kritisiert wird). Wie viele es sind, steht im Stand (anzahlVorschlaege, Standard drei). Danach fragst du nur noch in einem Satz, welches sie sich ansehen will.",
        {
          ids: { type: "array", items: { type: "string" }, description: "Haus-ids aus dem letzten Suchergebnis, das beste zuerst - so viele, wie die Person wollte (Standard drei)" },
        }, ["ids"]),
      f("haus_oeffnen",
        "Oeffnet die Seite eines Hauses (Freigabe ab 'suchen') und liest dort die Bewertungen. Nutze es, wenn die Person ein Haus genauer sehen will.",
        { id: text("Haus-id") }, ["id"]),
      f("haeuser_ansehen",
        "Geht die engere Auswahl der Reihe nach durch: oeffnet jedes Haus, liest dort die Bewertungen, waehlt Zimmer und Verpflegung und kommt zur Liste zurueck. Danach legt es die Vorschlaege vor. Ruf es nicht von dir aus - der Fahrplan verlangt es, wenn es soweit ist.",
        {}),
      f("monate_vergleichen",
        "Stellt die Trefferliste nacheinander auf mehrere Monate um, sieht sich jedes Mal die Ergebnisse an und fasst danach zusammen, wie viele Haeuser es je Monat gibt, wo sie liegen und was sie kosten. Ruf es, wenn die Person eine Jahreszeit nennt und wissen will, welcher Monat der beste ist, oder wenn sie dir die Wahl ueberlaesst. Geht nur auf der Trefferliste.",
        {
          monate: { type: "array", items: { type: "integer" }, description: "Die Monate als Zahlen 1-12, hoechstens vier. Leer lassen, wenn der Fahrplan den Vergleich schon angesetzt hat." },
        }),
      f("stichprobe_nehmen",
        "Oeffnet kurz ein, zwei Haeuser aus der Trefferliste, sieht sich Zimmer und Verpflegung an und kommt zurueck - ohne Bewertungen, ohne etwas auszuwaehlen. NUR, wenn die Person ausdruecklich darum bittet ('schau da mal rein', 'gibt es da Halbpension?'). Fuer die engere Auswahl am Ende ist haeuser_ansehen zustaendig.",
        {}),
      f("bewertungen_lesen",
        "Liest die Gaestebewertungen eines Hauses sichtbar durch und liefert Teilnoten je Aspekt (von 10), Lob und Kritik. Pflicht, bevor du etwas ueber Bewertungen sagst - Teilnoten, was Gaeste loben oder bemaengeln, wie gut Essen, Lage, Sauberkeit, Service oder Ruhe sind. Ausnahme: Du hast dieses Haus in diesem Gespraech schon gelesen.",
        {
          id: text("Haus-id"),
          aspekt: text("Worum es der Person geht, als Wort: Essen, Lage, Sauberkeit, Service, Ausstattung, Ruhe, Pool, Preis-Leistung. Leer lassen, wenn es um den Gesamteindruck geht."),
        }, ["id"]),
      /* Gezielt suchen statt alles noch einmal lesen.
         ----------------------------------------------------------------
         Der Nutzer am 02.10.2026: "Da ist er einfach wieder genau die
         gleichen Bewertungen durchgegangen, was ich irgendwie nicht so
         sinnvoll fand. Er koennte zum Beispiel fragen, soll ich nach
         bestimmten Gesichtspunkten da die Bewertungen durchgehen, und
         dass er dann wirklich bei Kommentaren anhaelt, die passen."

         Und zum Inhalt: "Mir ist wichtig, dass das Hotel Rutschen hat
         und dass es nah am Strand ist und dass die echten Alkohol
         haben. Aktuell wuerdest du darauf keine Antwort haben koennen."

         Jetzt schon: Die Bewertungen tragen seit dem 02.10.2026 auch
         Rutschen, Getraenke, Strand, Betreuung, Wellness und Parken
         (data/bewertungen.js), und dieses Werkzeug durchsucht sie nach
         dem Wort, das die Person benutzt hat. */
      f("bewertungen_durchsuchen",
        "Durchsucht die Bewertungen eines Hauses nach einem Begriff, den die Person genannt hat "
        + "(etwa 'Rutschen', 'Alkohol', 'Strand', 'Kinderbetreuung', 'Parken', 'Sauberkeit'), und liefert, "
        + "wie viele Stimmen ihn erwaehnen, wie sie sich verteilen und echte Zitate dazu. "
        + "Nimm das, wenn jemand nach etwas Bestimmtem fragt, statt bewertungen_lesen noch einmal zu rufen. "
        + "Steht nichts dazu in den Bewertungen, sag genau das - leite nichts aus der Gesamtnote ab.",
        { id: text("Haus-id"), begriff: text("Das Wort, nach dem gesucht wird - so, wie die Person es gesagt hat") },
        ["id", "begriff"]),
      /* Nachschlagen statt erfinden.
         ----------------------------------------------------------------
         Der Nutzer am 02.10.2026: "Sollte es noch eine FAQ-Seite geben,
         wo der Bot sich bei jeder moeglichen Frage bedienen kann. Dann
         geht er auf die Seite vom FAQ, liest das kurz durch und gibt
         dann die Antwort aus."

         Der Grund dahinter ist nicht nur Bequemlichkeit: Ohne FAQ
         beantwortet das Modell solche Fragen aus seinem Weltwissen ueber
         Reiseportale im Allgemeinen. Dann unterscheidet sich die Antwort
         zwischen zwei Teilnehmenden, ohne dass es jemand steuert oder
         sieht. Mit FAQ ist jede Antwort auf einen Eintrag zurueckfuehrbar
         - und was nicht darin steht, bleibt unbeantwortet. */
      f("faq_nachschlagen",
        "Schlaegt eine Frage zum Ablauf im FAQ der Seite nach: Buchung, Bezahlung, Stornierung, Check-in, "
        + "Gepaeck, Kinder, Haustiere, Gebuehren, Merkzettel, Datenschutz und so weiter. "
        + "Nimm es fuer alles, was den SERVICE betrifft, nicht fuer Fragen zu Haeusern, Regionen oder Preisen "
        + "einer bestimmten Unterkunft - dafuer gibt es suchen, haus_oeffnen und bewertungen_lesen. "
        + "Steht nichts im FAQ, sag, dass du dazu nichts hast, und erfinde keine Auskunft.",
        { frage: text("Die Frage der Person, moeglichst in ihren Worten") }, ["frage"]),
      f("zurueck_zur_liste",
        "Geht von einer Hausseite zurueck zur Trefferliste (Freigabe ab 'suchen').",
        {}),
      f("merken",
        "Setzt ein Haus auf den Merkzettel der Person (Freigabe ab 'suchen').",
        { id: text("Haus-id") }, ["id"]),
      f("buchung_vorbereiten",
        "Geht fuer ein Haus in die Buchungsstrecke, traegt die Gastdaten aus dem Konto ein und bleibt auf der Pruefseite stehen (Freigabe ab 'vorbereiten'). Bei flexibler Suche braucht es den Anreisetag - frag die Person vorher danach. Liefert die Zusammenfassung, die die Person sieht.",
        {
          id: text("Haus-id"),
          verpflegung: { type: "string", enum: ["ohne", "fruehstueck", "halb", "voll", "ai"], description: "Gewuenschte Verpflegung, falls genannt" },
          anreise: text("Anreisetag als YYYY-MM-DD (Pflicht bei flexibler Suche; die Person nennt ihn)"),
        }, ["id"]),
      f("buchung_abschliessen",
        "Schliesst die vorbereitete Buchung ab (Freigabe 'buchen', oder 'vorbereiten' nach klarem Ja der Person). Es wird nichts wirklich gebucht, die Seite ist ein Prototyp.",
        {}),
      /* Das Formular auf dieser Seite ist deins.
         ----------------------------------------------------------------
         Gemeldet am 02.10.2026: Auf "fuell mir dieses Kontaktformular aus"
         antwortete das Modell "Das Ausfuellen von Kontaktformularen kann
         ich nicht uebernehmen". Es hielt das Buchungsformular der Seite
         fuer ein fremdes Formular im Netz. Dafuer gab es kein Werkzeug mit
         diesem Namen - also wird es eines, mit genau den Worten, die die
         Person benutzt. */
      f("formular_ausfuellen",
        "Fuellt das Buchungsformular auf der Kasse mit den Daten der Person aus (Name, Anschrift, Kontakt) und laesst es zum Pruefen stehen. "
        + "Nimm dieses Werkzeug, wenn die Person 'fuell mir das aus', 'trag die Namen ein' oder Aehnliches sagt, waehrend das Formular offen ist. "
        + "Es ist das Formular DIESER Seite, kein fremdes - du darfst es bedienen. Abgeschickt wird nichts.",
        {}),
      f("freigabe_aendern",
        "Setzt die Freigabestufe, wenn die Person im Gespraech sagt, dass du mehr (oder weniger) darfst.",
        { stufe: { type: "string", enum: ["suchen", "vorbereiten", "buchen"] } }, ["stufe"]),
    ];
  },

  // Welche Stufe ein Werkzeug mindestens braucht
  BRAUCHT: {
    haus_oeffnen: "suchen", zurueck_zur_liste: "suchen", merken: "suchen",
    haeuser_ansehen: "suchen", stichprobe_nehmen: "suchen", monate_vergleichen: "suchen",
    bewertungen_durchsuchen: "suchen",
    buchung_vorbereiten: "vorbereiten", buchung_abschliessen: "vorbereiten",
    formular_ausfuellen: "vorbereiten",
  },

  /* Zeile im Agenten-Log, bevor das Werkzeug laeuft.
     ------------------------------------------------------------------
     Der Nutzer am 28.09.2026: "Da steht sehr oft 'Suche nach den
     Angaben'. Das sollte schon ein bisschen detaillierter beschreiben,
     was der Agent gerade macht."

     Er hat recht, und der Satz war doppelt unbrauchbar: Er stand bei
     jeder der drei bis vier Suchen gleich da, und er nannte die Angaben
     nicht, nach denen gesucht wurde. Ein Log, in dem viermal dasselbe
     steht, laesst sich nicht lesen - und es ist eine der Stellen, an
     denen sich zeigen soll, dass der Agent arbeitet. */
  logText(name, a = {}, p = null) {
    const haus = (id) => (typeof getItemById === "function" ? getItemById(id)?.name : null) || id;
    switch (name) {
      case "stand_merken": return null;
      case "regionen_zaehlen": return "Zähle, in welchen Regionen es im Zeitraum etwas gibt";
      case "regionen_vergleichen": return `Vergleiche Regionen${a.aspekte?.length ? ` nach ${a.aspekte.join(", ")}` : ""}`;
      case "monate_vergleichen": return "Stelle die Liste nacheinander auf jeden Monat um";
      case "stichprobe_nehmen": return "Sehe mir ein, zwei Häuser von innen an";
      case "suchen": {
        // Was tatsaechlich in die Maske geht - nicht "die Angaben"
        const t = [];
        if (p) {
          const wo = p.zielId && typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[p.zielId]?.name
            : (p.richtung === "warm" ? "warme Regionen" : p.richtung === "kalt" ? "kalte Regionen" : null);
          if (wo) t.push(wo);
          t.push(this.artWort(p, true));
          if (p.monat && typeof MONATSNAMEN !== "undefined") t.push(MONATSNAMEN[p.monat - 1]);
          if (p.naechte) t.push(`${p.naechte} Nächte`);
          const personen = (p.erwachsene || 0) + (p.kinder || 0);
          if (personen) t.push(`${personen} ${personen === 1 ? "Person" : "Personen"}`);
          if (p.flug && p.flugAb) t.push(`Flug ab ${p.flugAb}`);
        }
        return t.length ? `Suche: ${t.join(", ")}` : "Suche auf der Seite";
      }
      case "haus_details": return `Sehe mir ${haus(a.id)} genauer an`;
      case "auswahl_vorlegen": return `Lege ${a.ids?.length || 0} Vorschläge vor`;
      case "haus_oeffnen": return `Öffne ${haus(a.id)}`;
      case "bewertungen_lesen": return `Lese die Bewertungen von ${haus(a.id)}${a.aspekt ? ` zum Thema ${a.aspekt}` : ""}`;
      case "haeuser_ansehen": return "Sehe mir die Häuser der Reihe nach an";
      case "zurueck_zur_liste": return "Gehe zurück zur Trefferliste";
      case "merken": return `Setze ${haus(a.id)} auf den Merkzettel`;
      case "buchung_vorbereiten": return `Bereite die Buchung für ${haus(a.id)} vor`;
      case "bewertungen_durchsuchen": return `Suche in den Bewertungen nach „${a?.begriff || "dem Stichwort"}“`;
      case "faq_nachschlagen": return "Schlage im FAQ nach";
      case "formular_ausfuellen": return "Fülle das Buchungsformular aus";
      case "buchung_abschliessen": return "Schließe die Buchung ab";
      case "freigabe_aendern": return `Freigabe geändert: ${a.stufe}`;
      default: return name;
    }
  },

  /* ==================================================================
     Ausfuehrung
     ------------------------------------------------------------------
     ausfuehren(name, args, kern, stufe) liefert entweder
       { ergebnis: <JSON fuer das Modell>, log?: "Zeile fuers Log" }
     oder, wenn die Seite gleich neu laedt,
       { navigiert: true, stufe: <naechste Stufe> }.
     ================================================================== */
  /* "Nimm das erste" muss das erste sein.
     ------------------------------------------------------------------
     Am 25.09.2026 lagen drei Vorschlaege im Chat, die Person schrieb
     "nimm das erste, bereite die Buchung vor" - und der Agent bereitete
     die Buchung fuer ein Haus vor, das in der Vorlage gar nicht vorkam.
     Das Modell hatte sich eine id aus einem frueheren Werkzeugergebnis
     gegriffen. Bei einer Ordnungszahl oder einem Namen aus der Vorlage
     entscheidet deshalb nicht mehr das Modell, sondern die Vorlage.
     Nennt die Person ein Haus, das dort nicht steht, bleibt es bei ihrer
     Wahl - sie darf sich auch anders entscheiden. */
  ORDNUNG: {
    erste: 0, erstes: 0, erster: 0, ersten: 0, "1": 0,
    zweite: 1, zweites: 1, zweiter: 1, zweiten: 1, "2": 1,
    dritte: 2, drittes: 2, dritter: 2, dritten: 2, "3": 2,
    vierte: 3, viertes: 3, vierter: 3, vierten: 3, "4": 3,
    "fünfte": 4, "fünftes": 4, "fünfter": 4, "fünften": 4, fuenfte: 4, "5": 4,
    sechste: 5, sechstes: 5, sechster: 5, sechsten: 5, "6": 5,
  },
  hausAusVorlage(kern) {
    const vorlage = kern.lauf.letzteVorlage || [];
    if (!vorlage.length) return null;
    const letzte = [...(kern.lauf.gespraech || [])].reverse().find((n) => n.role === "user")?.content || "";
    const text = String(letzte).toLowerCase();
    // Erst der Name - er ist eindeutiger als eine Ordnungszahl
    for (const id of vorlage) {
      const name = (typeof getItemById === "function" ? getItemById(id)?.name : null) || "";
      if (name && text.includes(name.toLowerCase())) return id;
    }
    const m = text.match(/\b(?:das|die|der|den|nummer|nr\.?|vorschlag)\s*(erste[nsr]?|zweite[nsr]?|dritte[nsr]?|vierte[nsr]?|fünfte[nsr]?|fuenfte|sechste[nsr]?|[1-6])\b/);
    if (!m) return null;
    const i = this.ORDNUNG[m[1]];
    return i != null && vorlage[i] ? vorlage[i] : null;
  },

  async ausfuehren(name, args, kern, stufe = 1) {
    const a = args || {};
    if (a.id && stufe === 1 && ["haus_oeffnen", "haus_details", "merken", "buchung_vorbereiten", "bewertungen_lesen"].includes(name)) {
      const gemeint = this.hausAusVorlage(kern);
      if (gemeint && gemeint !== a.id) {
        kern.notieren("haus_korrigiert", { werkzeug: name, modell: a.id, gemeint });
        a.id = gemeint;
      }
    }
    /* Zusammengehoerende Fragen werden zu Ende gestellt, bevor gesucht wird.
       ------------------------------------------------------------------
       Am 27.09.2026: Der Agent fragt "mit Flug oder ohne?", bekommt "mit
       Flug" - und sucht sofort, obwohl noch kein Abflughafen feststeht.
       Die Suche lief also mit einer halben Vorgabe, und die Person sah
       Ergebnisse, die schon im naechsten Zug wieder hinfaellig waren.

       Die erste Umschau bleibt erlaubt (da gibt es noch nichts zu
       vervollstaendigen); danach wird nicht mehr gesucht, solange der
       Fahrplan eine offene Frage hat. Eine Frage der Person geht weiter
       vor - fragt sie nach dem Angebot, darf gesucht werden. */
    /* Auch die erste Suche braucht einen Boden.
       ------------------------------------------------------------------
       Am 27.09.2026: Auf "gerne in dem Monat, wo ich die meisten
       Moeglichkeiten fuer guenstige Hotels habe" suchte der Agent
       sofort - ohne Monat, ohne Reisende, ohne Richtung. Heraus kamen
       184 Haeuser, also schlicht der ganze Katalog, und er nannte die
       Zahl, als waere sie eine Auskunft. Der Nutzer: "Er hat nicht
       recherchiert, sondern einfach die 184 wiedergegeben."

       Die Pruefung darunter galt nur fuer spaetere Suchen (sie verlangte
       `gesuchtMit`). Die erste war frei - und gerade die ist die
       gefaehrlichste, weil noch gar nichts feststeht. Gesucht wird jetzt
       fruehestens, wenn Zeit, Reisende und Kinderalter stehen; das ist
       dieselbe Schwelle, ab der auch der Fahrplan von selbst sucht. */
    if (name === "suchen" && stufe === 1 && !kern.lauf.gesuchtMit) {
      const fpJetzt = this.fahrplan(kern.lauf.profil || {}, kern.lauf);
      const letzte = [...(kern.lauf.gespraech || [])].reverse().find((n) => n.role === "user")?.content || "";
      const fragtSelbst = /\?/.test(String(letzte)) || /^(habt|gibt|wie viele|was|welche|zeig)/i.test(String(letzte).trim());
      if (!fpJetzt.suchbereit && !fragtSelbst) {
        kern.notieren("suche_ohne_grundlage", { fehlt: fpJetzt.naechstes });
        return { ergebnis: { nichtGesucht: "Dafuer steht noch zu wenig fest.",
          hinweis: "Such jetzt nicht. Ohne Monat, Reisende und Richtung kommt der ganze Katalog heraus, und jede Zahl daraus waere ohne Bedeutung. Stell erst die offene Frage; gesucht wird, sobald Zeit, Reisende und Kinderalter stehen.",
          ...this.fahrplanFuerModell(fpJetzt, kern.lauf.profil || {}, kern.lauf) } };
      }
    }
    if (name === "suchen" && stufe === 1 && kern.lauf.gesuchtMit) {
      const fpJetzt = this.fahrplan(kern.lauf.profil || {}, kern.lauf);
      const letzte = [...(kern.lauf.gespraech || [])].reverse().find((n) => n.role === "user")?.content || "";
      const fragtSelbst = /\?/.test(String(letzte)) || /^(habt|gibt|wie viele|was|welche|zeig)/i.test(String(letzte).trim());
      if (fpJetzt.naechstes && !fragtSelbst && !kern.lauf.rundgang && !kern.lauf.stichprobe) {
        kern.notieren("suche_zu_frueh", { offen: fpJetzt.naechstes });
        return { ergebnis: { nichtGesucht: `Erst das offene Thema klaeren: ${fpJetzt.naechstes}.`,
          hinweis: "Such jetzt noch nicht - es fehlt noch eine Angabe, und mit halben Vorgaben ist das Ergebnis im naechsten Zug wieder hinfaellig. Stell die offene Frage.",
          ...this.fahrplanFuerModell(fpJetzt, kern.lauf.profil || {}, kern.lauf) } };
      }
    }
    /* Auf Ebene 2 fasst das Modell nichts an, was gemessen wird.
       ------------------------------------------------------------------
       Fuehrt das Modell den Zug (die Person hat gefragt oder
       widersprochen), darf es nachschlagen, rechnen und suchen - aber
       nicht vorlegen, buchen oder die Freigabe aendern. Ein Fehlgriff
       macht das Gespraech dann holprig, aber er kann die Hauptmessgroesse
       nicht verfaelschen: welches Haus gebucht wurde und ob das
       Partnerhaus dabei war. */
    const AENDERT_MESSWERTE = ["auswahl_vorlegen", "buchung_vorbereiten", "formular_ausfuellen", "buchung_abschliessen", "freigabe_aendern"];
    /* Gesperrt wird nur, wenn die Person sicher nichts angewiesen hat.
       Eine Fehleinordnung von "buch das" als "sonstiges" wuerde sonst die
       Buchung verhindern - also genau die Hauptmessgroesse kosten, die die
       Sperre schuetzen soll. Deshalb nur frage und unklar. */
    const GESPERRT_BEI = ["frage", "unklar"];
    if (AENDERT_MESSWERTE.includes(name) && GESPERRT_BEI.includes(kern.lauf.nachrichtArt) && !kern.lauf.abschlussFaellig) {
      kern.notieren("werkzeug_auf_ebene2", { wollte: name, art: kern.lauf.nachrichtArt });
      return { ergebnis: { nichtAusgefuehrt: "Das geht gerade nicht.",
        hinweis: "Die Person hat eben keine Anweisung gegeben, sondern etwas gefragt oder eingewandt. Geh erst darauf ein. Wenn sie danach wirklich vorlegen oder buchen will, sagt sie es - dann geht es." } };
    }
    if (this.BRAUCHT[name] && !kern.darf(this.BRAUCHT[name])) {
      kern.notieren("gesperrt", { wollte: name, freigabe: kern.freigabe() });
      const f = FREIGABE.find((x) => x.id === kern.freigabe());
      return { ergebnis: { fehler: "nicht freigegeben", deineFreigabe: f?.lang || kern.freigabe(), noetig: this.BRAUCHT[name],
        hinweis: "Sag der Person, dass sie den Schritt selbst auf der Seite machen kann oder dir die Freigabe anheben kann (Regler oben im Chat oder im Gespraech)." },
        log: `Nicht freigegeben: ${this.logText(name, a)}` };
    }
    const fn = this.werkzeuge[name];
    if (!fn) return { ergebnis: { fehler: `Unbekanntes Werkzeug ${name}` } };
    try {
      return await fn.call(this, a, kern, stufe);
    } catch (e) {
      console.error("Werkzeug fehlgeschlagen", name, e);
      return { ergebnis: { fehler: "Das hat gerade nicht geklappt." }, log: `Fehler bei: ${this.logText(name, a)}` };
    }
  },

  /* ==================================================================
     Hilfsmittel
     ================================================================== */
  /* Welcher Reiter zu dem passt, was die Person gesagt hat.
     ------------------------------------------------------------------
     Seit dem 28.09.2026 gibt es "Unterkuenfte" - Hotels und
     Ferienwohnungen zusammen. Das ist der Reiter fuer alle, die sich
     nicht festgelegt haben, und damit der Normalfall zu Beginn eines
     Gespraechs. Vorher wich der Agent still auf Hotels aus und suchte
     damit in der Haelfte des Angebots, ohne es zu sagen. */
  /* "Beides" schlaegt einen stehengebliebenen Typ.
     ------------------------------------------------------------------
     Am 28.09.2026 sagte jemand "Auch Ferienwohnungen" - und der Agent
     kuendigte an, er sehe nach, "wie viele HOTELS es im Dezember gibt".
     Im Stand stand artEgal, aber daneben lag noch ein typ "hotel" aus
     einer frueheren Nachricht. Welcher Weg ihn dort gelassen hat, ist
     zweitrangig: Wenn beides erlaubt ist, hat ein alter Typ nichts mehr
     zu sagen. Die Auskunft richtet sich deshalb zuerst nach artEgal. */
  seitenTyp(p) {
    /* Verpflegung und Sterne gibt es nur bei Hotels - aber der Agent
       grenzt deswegen nicht von sich aus ein. Er fragt (siehe
       `artRueckfrage`). Nutzer am 29.09.2026: "Ich wuerde jetzt nicht
       einfach so wechseln, sondern das Modell sollte nochmal nachfragen."
       Ein stiller Wechsel nimmt 160 Ferienwohnungen aus der Auswahl, und
       die Person erfaehrt es erst hinterher. */
    if (p?.artEgal && !p?.artGenannt) return "unterkunft";
    return p?.typ === "apartment" ? "apartment" : (p?.typ === "hotel" ? "hotel" : "unterkunft");
  },

  /* "ohne" gehoert nicht dazu: Wer selbst kochen will, meint eher eine
     Ferienwohnung als ein Hotel ohne Verpflegung. Nur ein positiver
     Wunsch (Fruehstueck, Halb-, Vollpension, All Inclusive) ist ein
     Hinweis auf ein Hotel. */
  VERPFLEGUNG_HOTEL: ["fruehstueck", "halb", "voll", "ai"],

  /* Aus einer Frist wird ein Monat, und der Agent sagt es.
     ------------------------------------------------------------------
     "Spaetestens am 3.12." heisst: Der Monat steht damit fest, und die
     Anreise muss davor liegen. Beides gehoert ins Profil, und der Schritt
     dorthin gehoert ausgesprochen - es ist eine Transferleistung, und die
     werden hier immer erklaert. Einmal je Lauf. */
  fristAbleiten(kern, p) {
    const frist = p.anreiseBis || p.anreiseAb;
    if (!frist || !kern?.lauf || kern.lauf.fristGesagt) return;
    const monat = parseInt(String(frist).slice(5, 7), 10);
    if (!(monat >= 1 && monat <= 12)) return;
    kern.lauf.fristGesagt = true;
    const tag = `${parseInt(String(frist).slice(8), 10)}. ${MONATSNAMEN[monat - 1]}`;
    const richtung = p.anreiseBis ? "bis spätestens" : "frühestens ab";
    if (!p.monat) {
      p.monat = monat;
      p.flexibel = true;
      this.ableiten(kern, "monat",
        `Also ${richtung} ${tag}. Ich merke mir ${MONATSNAMEN[monat - 1]} und achte darauf, dass die Anreise ${p.anreiseBis ? "davor" : "danach"} liegt.`);
    } else {
      this.ableiten(kern, "frist", `Alles klar, ${richtung} ${tag}.`);
    }
  },

  /* Welche Regionen zu "eher warm" oder "eher kalt" zaehlen.
     ------------------------------------------------------------------
     Bis zum 30.09.2026 waren das feste Listen. Das war grob: Barcelona
     stand nirgends, obwohl es im August 29 Grad hat, und Lappland galt
     im Juli als kalt, obwohl es dort 19 Grad sind.

     Jetzt entscheidet die Temperatur im gewaehlten Monat (`temp` je
     Region in data/ziele.js). Die Grenze liegt bei 22 Grad, die Person
     kann sie verschieben ("mir reichen 20 Grad" -> mindestGrad). Ohne
     Monat bleibt es bei der Liste - ohne Monat gibt es keine Temperatur.

     Bei "kalt" ist die Grenze die Gegenrichtung: hoechstens 12 Grad,
     oder was die Person nennt. */
  regionenFuerRichtung(thema, p) {
    const fallback = (thema.ziele || []).slice();
    if (!thema || !p?.monat || typeof regionenAbGrad !== "function") return fallback;
    const alle = (typeof ZIELE !== "undefined" ? ZIELE : []).filter((z) => grad(z, p.monat) != null);
    if (!alle.length) return fallback;
    if (thema.id === "warm") {
      const grenze = p.mindestGrad != null ? p.mindestGrad : 22;
      /* Reicht es im gewaehlten Monat nirgends fuer die Grenze, wird die
         Grenze schrittweise gesenkt, bis wenigstens drei Regionen
         zusammenkommen - aber nie unter 18 Grad. Im Januar sind das
         Krabi, Kapstadt und Teneriffa; alles darunter waere im Januar
         nicht mehr "warm", sondern nur noch das Beste, was da ist. */
      let liste = alle.filter((z) => grad(z, p.monat) >= grenze);
      for (let g = grenze - 2; liste.length < 3 && g >= 18; g -= 2) {
        liste = alle.filter((z) => grad(z, p.monat) >= g);
      }
      return liste.sort((a, b) => grad(b, p.monat) - grad(a, p.monat)).map((z) => z.id);
    }
    if (thema.id === "kalt") {
      const grenze = p.mindestGrad != null ? p.mindestGrad : 12;
      // Dasselbe von der anderen Seite: im Juli ist nirgends unter zwoelf
      // Grad, dann steigt die Grenze schrittweise - hoechstens bis 22.
      let liste = alle.filter((z) => grad(z, p.monat) <= grenze);
      for (let g = grenze + 2; liste.length < 3 && g <= 22; g += 2) {
        liste = alle.filter((z) => grad(z, p.monat) <= g);
      }
      return liste.sort((a, b) => grad(a, p.monat) - grad(b, p.monat)).map((z) => z.id);
    }
    return fallback;
  },

  /* Der Satz dazu: welche Regionen es sind und wie warm es dort wird.
     Ohne ihn waere "eher warm" eine Auswahl, die niemand nachpruefen
     kann - und die Person koennte die Grenze nicht verschieben, weil sie
     sie nicht kennt. */
  richtungSatz(p) {
    if (!p?.richtung || !p.monat || !p.zieleErlaubt?.length || typeof grad !== "function") return null;
    if (typeof MONATSNAMEN === "undefined" || typeof ZIEL_NACH_ID === "undefined") return null;
    const mit = p.zieleErlaubt.map((id) => ZIEL_NACH_ID[id]).filter((z) => z && grad(z, p.monat) != null);
    if (mit.length < 2) return null;
    const warm = p.richtung === "warm";
    const werte = mit.map((z) => grad(z, p.monat));
    const von = Math.min(...werte);
    const bis = Math.max(...werte);
    /* Genannt werden die Regionen mit der groessten Auswahl, nicht die
       waermsten. Sonst stuende im Oktober "Krabi, Marrakesch, Teneriffa"
       da - richtig gerechnet, aber an der Frage vorbei: Die Person will
       wissen, wo sie etwas findet. */
    const haeuser = (id) => this.katalog(p).filter((h) => h.ziel === id).length;
    const nachAuswahl = [...mit].sort((a, b) => haeuser(b.id) - haeuser(a.id) || (warm ? grad(b, p.monat) - grad(a, p.monat) : grad(a, p.monat) - grad(b, p.monat)));
    // Genannt werden die drei mit der groessten Auswahl, aber der
    // Temperatur nach geordnet - sonst springen die Zahlen im Satz
    // ("Krabi 32, Teneriffa 21, Kapstadt 27").
    const namen = nachAuswahl.slice(0, 3)
      .sort((a, b) => (warm ? grad(b, p.monat) - grad(a, p.monat) : grad(a, p.monat) - grad(b, p.monat)))
      .map((z) => `${z.name} (${grad(z, p.monat)} Grad)`);
    const monat = MONATSNAMEN[p.monat - 1];
    return `${warm ? "Warm" : "Kalt"} heißt im ${monat} für mich ${mit.length} Regionen mit ${von} bis ${bis} Grad, darunter ${namen.join(", ")}. Sag Bescheid, wenn dir eine andere Grenze lieber ist.`;
  },

  /* Gesagt wird es einmal je Stand - und wieder, wenn die Person die
     Grenze verschiebt. Sonst waere die neue Auswahl so unsichtbar wie
     die alte. */
  /* Eine Korrektur ist keine neue Aussage.
     ------------------------------------------------------------------
     Gemeldet am 02.10.2026: Der Nutzer verschob die Temperaturgrenze, und
     der Agent sagte den ganzen Satz noch einmal von vorn - "Kalt heisst
     im Januar fuer mich 12 Regionen mit -11 bis 15 Grad, darunter ..." -
     als waere nie etwas anderes dagewesen. Der Nutzer: "Das muss als eine
     Art Korrektur hinterlegt sein. Und dann muss entsprechend auch darauf
     eingegangen werden. Also zum Beispiel: Alles klar, ich suche jetzt
     Hotels, bei denen es 17 Grad warm ist. Da kommt jetzt Kreta noch mit
     hinzu."

     Genau das: Beim zweiten Mal steht nicht die Liste da, sondern der
     Unterschied - was dazukommt, was wegfaellt, und wie viele es jetzt
     sind. */
  /* Was eine Aenderung an der Auswahl bewirkt, in Haeusern.
     ------------------------------------------------------------------
     Gilt nur fuer Korrekturen - also fuer Felder, in denen vorher schon
     etwas stand und die die Auswahl auch wirklich einschraenken. Beim
     ersten Nennen eines Werts waere der Satz Unsinn: Da gibt es kein
     Vorher, mit dem man vergleichen koennte, und die Lage sagt die Zahl
     ohnehin.

     Gerechnet wird mit derselben Regel, nach der auch gefiltert wird
     (`katalogTreffer`), also stimmt die Zahl mit der Liste ueberein.
     Aendert sich nichts, wird auch nichts gesagt - ein "jetzt 34 statt
     34" waere schlimmer als Schweigen. */
  AENDERUNG_FELDER: {
    budgetGesamt: (w) => `Budget ${w} € gesamt`,
    maxPreis: (w) => `höchstens ${w} € pro Nacht`,
    verpflegung: (w) => (typeof BOARD_LABELS !== "undefined" ? BOARD_LABELS[w] : w),
    naechte: (w) => `${w} Nächte`,
    monat: (w) => (typeof MONATSNAMEN !== "undefined" ? MONATSNAMEN[w - 1] : `Monat ${w}`),
    mindestbewertung: (w) => `Note ab ${String(w).replace(".", ",")}`,
    mindestSterne: (w) => `ab ${w} Sternen`,
    maxStrand: (w) => `Strand bis ${w < 1 ? `${Math.round(w * 1000)} m` : `${w} km`}`,
    flugKlasse: (w) => ({ economy: "Economy", premium: "Premium Economy", business: "Business" }[w] || w),
    erwachsene: (w) => `${w} Erwachsene`,
    kinder: (w) => `${w} Kinder`,
    zimmer: (w) => `${w} Zimmer`,
  },

  aenderungsSatz(p, vorher, geaendert) {
    if (!p || !vorher || !(geaendert || []).length) return null;
    // Nur Felder, die der Kern erklaeren kann, und nur echte Korrekturen
    const feld = geaendert.find((f) => this.AENDERUNG_FELDER[f]
      && vorher[f] != null && vorher[f] !== "" && vorher[f] !== p[f]);
    if (!feld) return null;
    /* Die Richtung hat ihren eigenen, besseren Satz - der nennt die
       Regionen beim Namen. Zwei Saetze ueber dieselbe Aenderung waeren
       einer zu viel. */
    if (geaendert.includes("richtung") || geaendert.includes("mindestGrad")) return null;
    let vorZahl = null, jetztZahl = null;
    try {
      vorZahl = this.katalogTreffer(vorher, this.filterAusStand(vorher)).length;
      jetztZahl = this.katalogTreffer(p, this.filterAusStand(p)).length;
    } catch { return null; }
    const wort = this.AENDERUNG_FELDER[feld];
    const neu = wort(p[feld]);
    const alt = wort(vorher[feld]);
    const art = this.artWort(p, true);
    if (vorZahl !== jetztZahl) {
      const richtung = jetztZahl > vorZahl ? "kommen" : "fallen";
      const unterschied = Math.abs(jetztZahl - vorZahl);
      return `${neu} statt ${alt} - damit ${richtung} ${unterschied} ${art} `
        + `${jetztZahl > vorZahl ? "dazu" : "weg"}, jetzt ${jetztZahl} statt ${vorZahl}.`;
    }
    /* Gleich viele Haeuser heisst nicht, dass nichts passiert ist.
       ----------------------------------------------------------------
       Zwoelf Naechte statt sieben, Business statt Economy: Die Auswahl
       bleibt dieselbe, die Rechnung nicht. Dann ist der Preis das, was
       die Aenderung bedeutet - gemessen am guenstigsten Haus, das beide
       Male in Frage kam, damit die beiden Zahlen vergleichbar sind. */
    const billigster = (x) => {
      let bestes = null;
      for (const h of this.katalogTreffer(x, this.filterAusStand(x))) {
        const r = this.reisepreis(h, x);
        if (r && (bestes == null || r.gesamt < bestes)) bestes = r.gesamt;
      }
      return bestes;
    };
    const vorPreis = billigster(vorher);
    const jetztPreis = billigster(p);
    if (vorPreis == null || jetztPreis == null || !vorPreis) return null;
    const unterschiedProzent = Math.abs(jetztPreis - vorPreis) / vorPreis;
    if (unterschiedProzent < 0.03) return null;
    const euro = (x) => `${Math.round(x).toLocaleString("de-DE")} €`;
    return `${neu} statt ${alt} - die Auswahl bleibt bei ${jetztZahl} ${art}, `
      + `aber die günstigste Reise kostet jetzt ${euro(jetztPreis)} statt ${euro(vorPreis)}.`;
  },

  /* Die Temperaturgrenze ist ein Vorschlag, keine Vorgabe.
     ------------------------------------------------------------------
     Der Nutzer am 02.10.2026: "Da war wieder so ein bisschen die Sache,
     dass du nicht automatisch gefragt hast, ob man die Spanne noch
     veraendern moechte, sondern du hast die Spanne einfach vorgegeben und
     hast dann schon nach den Naechten gefragt."

     Er hat recht, und es war eine halbe Sache: Der Satz zur Richtung
     endete mit "Sag Bescheid, wenn dir eine andere Grenze lieber ist" -
     eine Einladung, keine Frage, und direkt danach kam das naechste
     Thema. Wer nicht von selbst widerspricht, hat damit eine Grenze
     bekommen, die der Agent gesetzt hat.

     Also einmal fragen, mit den Zahlen, die zur Wahl stehen, und dann nie
     wieder. Genauso wie bei der Datumsfrage: Das Thema des Fahrplans
     bleibt stehen und kommt danach von selbst wieder. */
  spanneRueckfrage(p, lauf) {
    if (!p?.richtung || !p.monat || !p.zieleErlaubt?.length) return null;
    if (lauf?.spanneFrage) return null;              // hoechstens einmal
    if (p.mindestGrad != null) return null;          // sie hat die Grenze selbst gesetzt
    if (p.zielId) return null;                       // ein festes Ziel braucht keine Spanne
    if (typeof grad !== "function" || typeof ZIEL_NACH_ID === "undefined") return null;
    const warm = p.richtung === "warm";
    const grenze = warm ? 22 : 12;
    /* Was eine andere Grenze braechte - sonst ist die Frage so abstrakt
       wie die Vorgabe vorher. Zwei Grad weiter in die offene Richtung. */
    const alle = (typeof ZIELE !== "undefined" ? ZIELE : [])
      .filter((z) => grad(z, p.monat) != null && (typeof saisonPassung !== "function" || saisonPassung(z, p.monat) >= 0.5));
    const weiter = warm ? grenze - 4 : grenze + 4;
    const jetzt = p.zieleErlaubt.length;
    const dann = alle.filter((z) => (warm ? grad(z, p.monat) >= weiter : grad(z, p.monat) <= weiter)).length;
    if (dann <= jetzt) return null;                  // nichts zu gewinnen, nicht fragen
    return {
      satz: `Ich rechne ${warm ? "ab" : "bis"} ${grenze} Grad - das sind die ${jetzt} Regionen von eben. `
        + `${warm ? "Ab" : "Bis"} ${weiter} Grad wären es ${dann}. Soll ich bei ${grenze} bleiben oder die Grenze verschieben?`,
      chips: [`Bei ${grenze} Grad bleiben`, `${warm ? "Ab" : "Bis"} ${weiter} Grad`],
      grenze, weiter, jetzt, dann,
    };
  },

  richtungKorrektur(p, vorher) {
    if (!Array.isArray(vorher) || !vorher.length || !p?.zieleErlaubt?.length) return null;
    if (typeof ZIEL_NACH_ID === "undefined") return null;
    const jetzt = p.zieleErlaubt;
    const dazu = jetzt.filter((id) => !vorher.includes(id)).map((id) => ZIEL_NACH_ID[id]?.name).filter(Boolean);
    const weg = vorher.filter((id) => !jetzt.includes(id)).map((id) => ZIEL_NACH_ID[id]?.name).filter(Boolean);
    if (!dazu.length && !weg.length) return null;
    const aufzaehlen = (liste) => {
      if (liste.length <= 3) {
        return liste.length > 1 ? `${liste.slice(0, -1).join(", ")} und ${liste[liste.length - 1]}` : liste[0];
      }
      const rest = liste.length - 3;
      return `${liste.slice(0, 3).join(", ")} und ${rest === 1 ? "eine weitere" : `${rest} weitere`}`;
    };
    const kopf = p.mindestGrad != null
      ? `Alles klar, ${p.richtung === "warm" ? "ab" : "bis"} ${p.mindestGrad} Grad.`
      : "Alles klar.";
    const was = [];
    if (dazu.length) was.push(`${dazu.length === 1 ? "kommt" : "kommen"} ${aufzaehlen(dazu)} dazu`);
    if (weg.length) was.push(`${weg.length === 1 ? "fällt" : "fallen"} ${aufzaehlen(weg)} weg`);
    return `${kopf} Damit ${was.join(" und ")} - jetzt ${jetzt.length} Regionen statt ${vorher.length}.`;
  },

  richtungAnsagen(kern, p) {
    if (!kern?.lauf) return;
    /* Zweites Mal und spaeter: der Unterschied statt der ganzen Liste. */
    const vorher = kern.lauf.richtungRegionen;
    if (vorher) {
      const k = this.richtungKorrektur(p, vorher);
      if (k) {
        kern.lauf.richtungRegionen = (p.zieleErlaubt || []).slice();
        kern.lauf.richtungGesagt = k;
        kern.notieren("richtung_korrigiert", { vorher: vorher.length, jetzt: (p.zieleErlaubt || []).length, grad: p.mindestGrad ?? null });
        this.ableiten(kern, "richtung", k);
        return;
      }
    }
    const satz = this.richtungSatz(p);
    if (!satz) return;
    // Verglichen wird der Satz selbst: Verschiebt jemand die Grenze von 22
    // auf 20 und es aendert sich nichts, waere die Wiederholung nur Laerm.
    if (kern.lauf.richtungGesagt === satz) return;
    kern.lauf.richtungGesagt = satz;
    kern.lauf.richtungRegionen = (p.zieleErlaubt || []).slice();
    this.ableiten(kern, "richtung", satz);
  },

  /* Die Rueckfrage, wenn ein Wunsch nur bei Hotels zu haben ist.
     ------------------------------------------------------------------
     Wer die Art offengelassen hat und dann Halbpension oder vier Sterne
     nennt, meint vermutlich ein Hotel - aber eben nur vermutlich. Statt
     stillschweigend einzugrenzen (und damit 160 Ferienwohnungen aus der
     Auswahl zu nehmen) fragt der Agent einmal nach.

     Gibt `{ satz, chips }` zurueck oder null. Der Kern stellt die Frage
     anstelle der naechsten Fahrplanfrage - fuer genau einen Zug, damit
     nicht zwei Fragen in einer Nachricht stehen. Das offene Thema kommt
     im naechsten Zug wieder.

     "Ohne Verpflegung" zaehlt ausdruecklich nicht dazu: Wer selbst
     kochen will, meint eher eine Ferienwohnung als ein Hotel ohne
     Verpflegung.

     Seit dem 01.10.2026 faellt auch der Flug darunter, und das ist der
     dringendste der drei Faelle. Gemeldet aus einem Testlauf: Die Person
     hatte "beides zeigen" gewaehlt und spaeter "Mit Flug" gesagt. Der
     Agent merkte sich den Flug und suchte weiter unter Hotels UND
     Ferienwohnungen - nur zeigt die Seite den Flugblock ueberhaupt nur
     auf dem Hotelreiter (`results.js`: `state.type !== "hotel"` blendet
     ihn aus). Gemerkt war also etwas, das auf der Seite nirgends stand,
     und in der Trefferliste standen Haeuser, zu denen es gar keinen Flug
     gibt. Dieselbe Regel an beiden Orten heisst hier: Wer einen Flug
     will, muss wissen, dass es den nur zum Hotel gibt. */
  /* "Setz bitte nochmal die Filter."
     ------------------------------------------------------------------
     Eine Bitte, die der Kern selbst erkennen muss. Ueber das Modell
     liefe sie ins Leere: Der Fahrplan sagt ihm, die Suche sei erledigt,
     und daran haelt es sich. Trifft dieses Muster, gilt die letzte Suche
     als ungueltig - der Fahrplan geht zurueck in die Suchphase, und der
     Agent stellt die Spalte neu ein.

     Absichtlich eng gefasst: "Kannst du einen Filter fuer Pool setzen?"
     faellt nicht darunter, das ist eine neue Vorgabe und kein Neuaufbau. */
  /* "Beide offen lassen" ist eine Antwort.
     ------------------------------------------------------------------
     Gemeldet am 02.10.2026: Auf "Beide offen lassen" kam "Ich rechne erst
     mal ab Muenchen" - also genau das Gegenteil. Die Behandlung gab es
     schon, sie sass nur an der falschen Stelle: in `stand_merken`, und
     das ruft das Modell nur, wenn es etwas einzutragen hat. Ein Klick auf
     eine Auswahlkarte traegt nichts ein, also lief sie nie, das Thema
     blieb offen, wurde ein zweites Mal gefragt - und danach griff die
     Annahme, die sich den guenstigsten aussucht.

     Jetzt liest der Kern das Muster selbst, so wie bei der Bitte um neue
     Filter. Jede Nachricht kommt dort vorbei, ob das Modell ein Werkzeug
     ruft oder nicht. */
  MEHRERE_FLUGHAEFEN: /\bbeide\b|\bbeides\b|alle beide|alle (drei|vier|fünf|fuenf)|offen lassen|egal welcher|in beiden|von beiden/i,

  FILTER_NEU: /(filter|suchmaske|spalte|suche)[^.?!]{0,40}\b(nochmal|noch mal|neu|wieder|erneut|zurück|zurueck)\b|\b(nochmal|noch mal|neu|wieder|erneut)\b[^.?!]{0,25}(filter|suchmaske|spalte)|\bsetz[a-zäöüß]*\b[^.?!]{0,25}\bfilter/i,

  /* Die Rueckfrage, wenn die Zahl der Namen nicht aufgeht.
     ------------------------------------------------------------------
     Mit der Rechnung, nicht mit einer allgemeinen Bitte: Die Person soll
     sehen, woran es haengt. Gefragt wird einmal; danach traegt sie
     entweder die fehlenden Namen nach oder sagt, dass sie selbst dabei
     ist. */
  namenRueckfrage(p, lauf) {
    const u = lauf?.namenUnklar;
    if (!u || !u.genannt?.length || !u.noetig) return null;
    if (lauf.namenGefragt) return null;
    const fehlen = u.noetig - u.genannt.length;
    const wer = u.genannt.length === 1 ? "einen Namen" : `${u.genannt.length} Namen`;
    const satz = fehlen > 0
      ? `Ihr seid zu ${{ 2: "zweit", 3: "dritt", 4: "viert", 5: "fünft", 6: "sechst" }[u.noetig] || `${u.noetig}.`}, `
        + `und du hast mir ${wer} genannt: ${u.genannt.join(" und ")}. `
        + `Bist du selbst ${fehlen === 1 ? "die fehlende Person" : "dabei"}, oder soll ich noch ${fehlen === 1 ? "einen Namen" : `${fehlen} Namen`} aufnehmen?`
      : `Du hast mir ${wer} genannt, gebucht wird aber für ${u.noetig}. Welche davon reisen mit?`;
    return {
      satz,
      chips: fehlen === 1 ? ["Ich bin die fehlende Person", "Ich nenne dir den Namen"] : null,
    };
  },

  /* Welche Zimmer fuer diese Gruppe in Frage kommen.
     ------------------------------------------------------------------
     Gemeldet am 02.10.2026: Das Zimmer wird gesetzt, nicht gewaehlt. Der
     Agent nahm immer das erste passende - das guenstigste -, und die
     Person erfuhr davon nichts. Gibt es mehr als eines, ist das eine
     Entscheidung und gehoert ihr. */
  zimmerAuswahl(item, p) {
    if (!item || item.type === "apartment" || !Array.isArray(item.rooms)) return [];
    const zimmerZahl = Math.max(1, p?.zimmer || 1);
    const personen = (p?.erwachsene || 0) + (p?.kinder || 0);
    const jeZimmer = personen ? Math.ceil(personen / zimmerZahl) : 1;
    const passend = item.rooms.filter((r) => (r.maxGuests || 0) >= jeZimmer);
    if (passend.length < 2) return [];
    const guenstigste = Math.min(...passend.map((r) => r.priceDelta || 0));
    return passend.map((r) => ({
      name: r.name,
      aufpreis: (r.priceDelta || 0) - guenstigste,
      plaetze: r.maxGuests,
      merkmale: (r.features || []).slice(0, 2),
    }));
  },

  /* Welche Fluege fuer diese Reise in Frage kommen.
     ------------------------------------------------------------------
     Die Verbindungen zum Ziel, von den Flughaefen, die die Person
     genannt hat (oder von allen, wenn ihr das gleich war). Sortiert wie
     ein Mensch sie vergleichen wuerde: erst die direkten, dann nach
     Preis. Hoechstens vier - das Fenster soll eine Entscheidung
     ermoeglichen, keine Recherche.

     Das Partnerobjekt bestimmt `Studie.partnerflug` nach derselben Regel
     wie beim Haus (bestes oder zweitbestes, je nach ausgeloster Gruppe)
     und auf derselben Rangfolge, die hier herauskommt. */
  flugAuswahl(item, p) {
    if (!item || item.type === "apartment" || !p?.flug || typeof Flug === "undefined") return [];
    /* Name gegen Kennung - daran scheiterte das ganze Fenster.
       ----------------------------------------------------------------
       Im Stand steht der Flughafen als Name ("München", oder "Hamburg,
       München" bei mehreren). `Flug.optionen` vergleicht aber gegen
       `fromCode`, also "MUC". Der Abgleich ging nie auf, die Liste kam
       leer zurueck, und das Flugfenster oeffnete nie. */
    const codes = Flug.codeListe(p.flugAb);

    /* Nur ein Flughafen im Fenster.
       ----------------------------------------------------------------
       Der Nutzer am 02.10.2026: "Auch wenn man gesagt hat, man ist
       flexibel, man wuerde von Hamburg und von Duesseldorf fliegen, soll
       da bitte nur von einem Ort sein, damit man sich nicht doch selbst
       noch ein Bias dadurch zieht, dass das unterschiedliche Orte sind."

       Er hat recht: Wer zwischen Hamburg und Duesseldorf waehlt, waehlt
       nach dem Weg zum Flughafen - und nicht nach dem, was gemessen wird.
       Genommen wird der guenstigste der genannten; welcher das war, sagt
       der Agent ohnehin an. */
    let liste = [];
    try { liste = Flug.optionen(item.ziel, codes.length ? codes.join(",") : null) || []; }
    catch { liste = []; }
    if (!liste.length) return [];
    /* Auf einen Flughafen eingrenzen - immer, auch wenn gar keiner
       genannt wurde. Sonst mischen sich die Abflugorte im Fenster, und
       die Wahl faellt nach dem Weg zum Flughafen statt nach dem, was
       gemessen wird. Genommen wird der mit der guenstigsten Verbindung. */
    const nachOrt = new Map();
    for (const f of liste) {
      if (!nachOrt.has(f.fromCode)) nachOrt.set(f.fromCode, []);
      nachOrt.get(f.fromCode).push(f);
    }
    if (nachOrt.size > 1) {
      let bester = null;
      for (const [code, l] of nachOrt) {
        const preis = Math.min(...l.map((f) => Flug.preisProPerson(f, p.flugKlasse || null)));
        if (!bester || preis < bester.preis) bester = { code, preis, liste: l };
      }
      liste = bester ? bester.liste : liste;
    }

    const personen = Math.max(1, (p.erwachsene || 0) + (p.kinder || 0));
    const proPers = (f) => Flug.preisProPerson(f, p.flugKlasse || null);

    /* Dieselbe Vergleichsregel wie bei den Haeusern.
       ----------------------------------------------------------------
       "Mach einfach, dass die Fluege super aehnlichen Kostenpunkt haben.
       Also dass es eigentlich keinen Grund gibt, den Partnerflug
       rauszunehmen, weil er eigentlich gleiche Sachen bietet wie die
       anderen auch."

       Die Daten liefern das je Flughafen schon (rund sieben Prozent
       Unterschied, gleiche Stopps, gleiches Gepaeck). Wo sie es nicht
       tun - etwa weil zu einem Paar mehrere handgeschriebene Fluege
       gehoeren -, sorgt dieses Fenster dafuer: nach Preis sortieren und
       die drei dichtesten nehmen, bei gleichem Abstand die mit gleicher
       Stoppzahl. Was sich im Fenster unterscheidet, ist Airline und
       Uhrzeit, und das ist genau die Entscheidung, die gemessen wird. */
    const sortiert = liste.slice().sort((a, b) => proPers(a) - proPers(b));
    const wieViele = Math.min(3, sortiert.length);
    let fenster = sortiert.slice(0, wieViele);
    let beste = Infinity;
    for (let i = 0; i + wieViele <= sortiert.length; i++) {
      const w = sortiert.slice(i, i + wieViele);
      const spanne = proPers(w[w.length - 1]) / proPers(w[0]) - 1;
      /* Gleiche Stoppzahl und gleiches Gepaeck sind mehr wert als ein
         halbes Prozent Preis: Beides ist ein Grund zur Wahl, der mit der
         Kennzeichnung nichts zu tun hat. */
      const strafe = (new Set(w.map((f) => f.stops || 0)).size > 1 ? 0.06 : 0)
        + (new Set(w.map((f) => f.baggage || "")).size > 1 ? 0.06 : 0);
      if (spanne + strafe < beste) { beste = spanne + strafe; fenster = w; }
    }
    // Innerhalb des Fensters wie ein Mensch vergleicht: erst direkt, dann frueh
    fenster = fenster.slice().sort((a, b) => (a.stops || 0) - (b.stops || 0)
      || String(a.depart).localeCompare(String(b.depart)));

    return fenster.map((f) => {
      const proPerson = proPers(f);
      const gesamt = proPerson * personen;
      return {
        id: f.id, flug: f, preis: gesamt,
        preisText: `${Math.round(gesamt).toLocaleString("de-DE")} €`,
        personenText: `${personen} ${personen === 1 ? "Person" : "Personen"}, hin und zurück`,
      };
    });
  },

  /* Die Rueckfrage: einmal je Haus, und nur wenn es etwas zu waehlen gibt. */
  flugRueckfrage(item, p, lauf) {
    if (lauf?.flugGefragt) return null;
    if (p?.flugId) return null;
    const liste = this.flugAuswahl(item, p);
    if (liste.length < 2) return null;
    return { kandidaten: liste };
  },

  /* Wonach soll er in den Bewertungen sehen?
     ------------------------------------------------------------------
     Der Nutzer am 02.10.2026: "Da ist er einfach wieder genau die
     gleichen Bewertungen durchgegangen, was ich irgendwie nicht so
     sinnvoll fand. Er koennte zum Beispiel fragen, soll ich nach
     bestimmten Gesichtspunkten da die Bewertungen durchgehen, und dass
     er dann wirklich bei Kommentaren anhaelt, die passen."

     Gefragt wird einmal je Gespraech und nur, wenn die Person noch
     nichts genannt hat, worauf es ihr ankommt - wer "Lage" gesagt hat,
     muss das nicht zweimal sagen. Die Vorschlaege sind die Themen, die
     es bei DIESEM Haus wirklich gibt: Ueber einen Kinderclub schreibt
     niemand, wenn es keinen gibt.

     "Einfach alles" ist dabei eine gleichwertige Antwort und steht
     deshalb als Chip mit da. */
  bewertungsRueckfrage(item, p, lauf) {
    if (!item || lauf?.bewertungsFrage) return null;
    if ((p?.kriterien || []).length) return null;
    if (typeof aspekteFuer !== "function") return null;
    const da = aspekteFuer(item).map((a) => a.label).filter(Boolean);
    if (da.length < 3) return null;
    /* Genannt werden die, nach denen am haeufigsten gefragt wird - in der
       Reihenfolge der Gewichte aus der Aspekttabelle. */
    const vorn = aspekteFuer(item).slice().sort((a, b) => (b.gewicht || 0) - (a.gewicht || 0))
      .map((a) => a.label).slice(0, 3);
    return {
      satz: `Ich gehe die Bewertungen von ${item.name} durch. Worauf soll ich dabei achten - `
        + `${vorn.slice(0, -1).join(", ")} oder ${vorn[vorn.length - 1]}? `
        + "Du kannst mir auch etwas anderes nennen, dann halte ich bei den Stimmen an, die davon sprechen.",
      chips: [...vorn, "Einfach alles"],
      themen: da,
    };
  },

  zimmerRueckfrage(item, p, lauf) {
    if (lauf?.zimmerGefragt) return null;
    if (p?.zimmerTyp) return null;
    const liste = this.zimmerAuswahl(item, p);
    if (!liste.length) return null;
    /* Wer ein Budget genannt hat, soll sehen, welches Zimmer es sprengt -
       sonst waere die Zimmerwahl die eine Stelle, an der die Vorgabe
       lautlos ueberschritten wird. */
    const ueberBudget = (name) => {
      if (!p?.budgetGesamt) return false;
      const r = this.reisepreis(item, { ...p, zimmerTyp: name });
      return !!r && r.gesamt > p.budgetGesamt;
    };
    const teil = liste.slice(0, 3).map((z) => {
      const geld = z.aufpreis > 0 ? `${z.aufpreis} € mehr pro Nacht` : "im Preis";
      return `${z.name} (${geld}${ueberBudget(z.name) ? ", über deinem Budget" : ""})`;
    });
    return {
      satz: `Bevor ich buche: In ${item.name} kommen für euch ${liste.length} Zimmer in Frage - ${teil.join(", ")}. Welches soll es sein?`,
      chips: liste.slice(0, 3).map((z) => z.name),
    };
  },

  artRueckfrage(p, lauf) {
    if (!p || !lauf) return null;
    // Alte Faelle merkten sich nur "schon gefragt". Jetzt je Grund, denn
    // der Flug ist eine andere Abwaegung als die Verpflegung.
    const schon = lauf.artGefragt === true
      ? { verpflegung: true, sterne: true }
      : (lauf.artGefragt || {});
    /* Der Flug zuerst, und er gilt auch bei gewaehlter Ferienwohnung:
       Dort ist die Frage nicht "eingrenzen oder nicht", sondern "Hotel
       oder kein Flug". Beides sind Aussagen der Person, der Kern kippt
       keine davon still. */
    /* Massgeblich ist, was die Seite zeigt, nicht das Feld `typ`.
       ----------------------------------------------------------------
       Beim Nachspielen am 01.10.2026 stand im Stand `artEgal: true` UND
       `typ: "hotel"` - das Feld bleibt vom Vorlauf stehen, waehrend die
       Suche laengst auf dem gemeinsamen Reiter laeuft. Wer auf `typ`
       schaut, haelt diesen Stand faelschlich fuer "nur Hotels" und
       schweigt. `seitenTyp` ist die eine Stelle, die beantwortet, worauf
       die Trefferliste gerade steht. */
    const zeigt = this.seitenTyp(p);
    if (p.flug === true && zeigt !== "hotel" && !schon.flug) {
      const wohnung = zeigt === "apartment";
      return {
        grund: "flug",
        satz: wohnung
          ? "Eine Sache dazu: Zu einer Ferienwohnung kann ich hier keinen Flug dazubuchen, den gibt es nur zum Hotel. "
            + "Soll ich stattdessen unter Hotels suchen, oder bleibt es bei der Ferienwohnung ohne Flug?"
          : "Eine Sache dazu: Einen Flug kann ich nur zu einem Hotel dazubuchen, zu Ferienwohnungen gibt es hier keine. "
            + "Soll ich auf Hotels eingrenzen, oder lieber ohne Flug bei beidem bleiben?",
        chips: wohnung
          ? ["Dann Hotels mit Flug", "Ferienwohnung ohne Flug"]
          : ["Nur Hotels, mit Flug", "Ohne Flug, dafür beides"],
      };
    }
    if (!p.artEgal || p.artGenannt) return null;
    const verpflegung = this.VERPFLEGUNG_HOTEL.includes(p.verpflegung);
    if (!verpflegung && !p.mindestSterne) return null;
    const grund = verpflegung ? "verpflegung" : "sterne";
    if (schon[grund]) return null;
    const wunsch = verpflegung
      ? ({ fruehstueck: "Frühstück", halb: "Halbpension", voll: "Vollpension", ai: "All Inclusive" })[p.verpflegung]
      : `${p.mindestSterne} Sterne`;
    return {
      grund,
      satz: `Eine Sache dazu: Gerade suche ich Hotels und Ferienwohnungen zusammen, und ${wunsch} `
        + `gibt es nur bei Hotels. Soll ich auf Hotels eingrenzen, oder beides offen lassen?`,
      chips: ["Nur Hotels", "Beides offen lassen"],
    };
  },

  /* Tippfehler: mit der Vermutung nachfragen, nicht raten.
     ------------------------------------------------------------------
     Im Testlauf am 30.09.2026 schrieb der Nutzer "Gerne im Augus" - und
     der Agent stellte die Monatsfrage wortgleich noch einmal. Fuer die
     Person sieht das aus, als hoere ihr niemand zu: Sie hat geantwortet.

     Der naheliegende Weg waere, "Augus" gleich als August in den Stand
     zu schreiben. Genau das nicht. Aufgenommen wird nur, was die Person
     gesagt oder bestaetigt hat; sonst steht am Ende ein Monat im Stand,
     den niemand genannt hat - und an den Feldern des Stands haengt die
     ganze Auswertung. Ein falsch geratener Monat waere schlimmer als
     eine Rueckfrage.

     Deshalb der Mittelweg: Der Kern sucht das gemeinte Wort nur, um die
     RUECKFRAGE zu formulieren ("Meinst du August?"). In den Stand kommt
     es erst mit dem Ja der Person.

     Warum der Kern und nicht das Modell: Der Chat stellt seine Fragen
     selbst, und dem Modell ist in `fahrplanFuerModell` ausdruecklich
     verboten, ein Fragezeichen zu schreiben - der Kern schneidet jeden
     Fragesatz des Modells aus dem Vorspann. Eine Vermutung, die das
     Modell aeussert, waere also entweder keine Frage oder sie faellt
     weg. Sie muss von hier kommen.

     Geraten wird nur innerhalb geschlossener Listen: zwoelf Monate,
     achtzehn Regionen, acht Flughaefen, drei Klassen, zwei Arten, vier
     Verpflegungen. Und nur, wenn genau ein Eintrag nahe genug liegt. */
  TIPPFEHLER: {
    zeit: {
      liste: () => (typeof MONATSNAMEN !== "undefined" ? MONATSNAMEN : []).map((m) => ({ label: m, woerter: [m] })),
      satz: (l) => `Meinst du ${l}? Dann rechne ich mit dem Monat - sonst sag mir gern, welcher es sein soll.`,
      chips: (l) => [`Ja, ${l}`, "Nein, ein anderer Monat"],
    },
    ziel: {
      liste: () => (typeof ZIELE !== "undefined" ? ZIELE : []).map((z) => ({ label: z.name, woerter: [z.name] })),
      satz: (l) => `Meinst du ${l}? Dann schaue ich dort - sonst nenn mir gern die Gegend.`,
      chips: (l) => [`Ja, ${l}`, "Nein, eine andere Gegend"],
    },
    flugAb: {
      liste: () => (typeof Flug !== "undefined" ? Flug.flughaefen() : []).map((h) => ({ label: h.name, woerter: [h.name] })),
      satz: (l) => `Meinst du ${l}? Dann suche ich die Flüge ab dort.`,
      chips: (l) => [`Ja, ${l}`, "Nein, ein anderer Flughafen"],
    },
    flugKlasse: {
      liste: () => [{ label: "Economy", woerter: ["Economy"] },
        { label: "Premium Economy", woerter: ["Premium"] },
        { label: "Business", woerter: ["Business"] }],
      satz: (l) => `Meinst du ${l}? Dann rechne ich mit der Klasse.`,
      chips: (l) => [`Ja, ${l}`, "Nein, eine andere Klasse"],
    },
    art: {
      liste: () => [{ label: "ein Hotel", woerter: ["Hotel"] },
        { label: "eine Ferienwohnung", woerter: ["Ferienwohnung", "Ferienhaus"] }],
      satz: (l) => `Meinst du ${l}? Dann suche ich danach.`,
      chips: () => ["Hotel", "Ferienwohnung", "Beides zeigen"],
    },
    verpflegung: {
      liste: () => [{ label: "Frühstück", woerter: ["Frühstück"] },
        { label: "Halbpension", woerter: ["Halbpension"] },
        { label: "Vollpension", woerter: ["Vollpension"] },
        { label: "All Inclusive", woerter: ["Inclusive"] }],
      satz: (l) => `Meinst du ${l}? Dann nehme ich das als Wunsch auf.`,
      chips: (l) => [`Ja, ${l}`, "Nein, etwas anderes"],
    },
  },

  /* Woerter, aus denen nie geraten wird.
     ------------------------------------------------------------------
     "Ich weiss nicht so genau" ist keine Vorlage fuer eine Vermutung.
     Die Liste steht hier flach geschrieben (ohne Umlaute), weil der
     Vergleich unten auch so rechnet. */
  TIPPFEHLER_AUSNAHMEN: ["nicht", "keine", "kein", "egal", "gerne", "bitte", "danke", "weiss",
    "also", "dann", "sonst", "eher", "schon", "noch", "aber", "oder", "wenn", "genau", "gleich",
    "ungefaehr", "moeglich", "moechte", "wollen", "will", "haben", "habe", "sind", "seid", "kann",
    "koennte", "sehr", "viel", "mehr", "weniger", "guenstig", "guenstiger", "teuer", "billig",
    "vielleicht", "irgendwas", "mich", "meine", "ganz", "etwas", "alles", "immer", "schoen",
    "keinen", "ahnung", "offen", "flexibel"],

  /* Welches Wort war gemeint?
     ------------------------------------------------------------------
     Gibt die Beschriftung des einen naheliegenden Eintrags zurueck oder
     null. Vier Sperren, damit daraus keine wilde Rateei wird:

       - Richtig geschriebene Woerter des Themas beenden die Suche. Steht
         "August" da und der Monat ist trotzdem offen, liegt das Problem
         nicht an der Schreibweise - eine Rueckfrage danach waere absurd.
       - Die ersten zwei Buchstaben muessen stimmen. Sie sind beim Tippen
         am seltensten falsch, und die Sperre haelt "warm" von "Wien"
         und "kalt" von "Kapstadt" fern.
       - Der erlaubte Abstand haengt an der Wortlaenge: ein Zeichen bis
         sechs Buchstaben, zwei ab sieben. "Augus" ist eines, "Septmber"
         eines, "Duesseldorff" eines.
       - Zwei gleich nahe Eintraege oder zwei verschiedene Vermutungen im
         Satz: nichts. Lieber die normale Rueckfrage als eine falsche. */
  tippfehlerVermutung(thema, text) {
    const regel = this.TIPPFEHLER[thema];
    if (!regel || !text) return null;
    const flach = (x) => String(x || "").toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .replace(/[^a-z]/g, "");
    // Levenshtein-Abstand, eine Zeile im Speicher
    const abstand = (a, b) => {
      const zeile = Array.from({ length: b.length + 1 }, (_, i) => i);
      for (let i = 1; i <= a.length; i++) {
        let schraeg = zeile[0];
        zeile[0] = i;
        for (let j = 1; j <= b.length; j++) {
          const oben = zeile[j];
          zeile[j] = Math.min(zeile[j] + 1, zeile[j - 1] + 1, schraeg + (a[i - 1] === b[j - 1] ? 0 : 1));
          schraeg = oben;
        }
      }
      return zeile[b.length];
    };
    const paare = [];
    for (const e of regel.liste()) for (const w of e.woerter || []) {
      const f = flach(w);
      if (f.length >= 4) paare.push({ label: e.label, wort: f });
    }
    if (!paare.length) return null;
    const stuecke = String(text).split(/[^A-Za-zÄÖÜäöüß]+/).map(flach).filter((x) => x.length >= 4);
    let treffer = null;
    for (const s of stuecke) {
      if (this.TIPPFEHLER_AUSNAHMEN.includes(s)) continue;
      if (paare.some((pp) => pp.wort === s)) return null;
      const erlaubt = s.length >= 7 ? 2 : 1;
      let beste = null;
      let zweite = null;
      for (const pp of paare) {
        if (pp.wort.slice(0, 2) !== s.slice(0, 2)) continue;
        const d = abstand(s, pp.wort);
        if (d > erlaubt) continue;
        if (!beste || d < beste.d) { if (beste && beste.label !== pp.label) zweite = beste; beste = { label: pp.label, d }; }
        else if (pp.label !== beste.label && (!zweite || d < zweite.d)) zweite = { label: pp.label, d };
      }
      if (!beste) continue;
      // Zwei Eintraege gleich nah: nicht raten
      if (zweite && zweite.d === beste.d) continue;
      // Zwei verschiedene Vermutungen in einem Satz: auch nicht
      if (treffer && treffer.label !== beste.label) return null;
      if (!treffer || beste.d < treffer.d) treffer = beste;
    }
    return treffer ? treffer.label : null;
  },

  /* Die fertige Rueckfrage, oder null.
     ------------------------------------------------------------------
     Zweimal dieselbe Vermutung gibt es nicht: Wer "Nein" geklickt hat,
     bekommt danach die normale Frage, nicht wieder denselben Vorschlag.
     Der Kern setzt `lauf.tippfehlerGefragt[thema]`. */
  /* "In zwei Monaten" ist eine Zeitangabe, keine Luecke.
     ------------------------------------------------------------------
     Gemeldet am 01.10.2026. Die Person schrieb "in 2 monaten", das
     Modell antwortete "Dezember ist eine gute Zeit fuer viele
     Reiseziele" - und direkt dahinter stand "Entschuldige, das habe ich
     nicht sicher verstanden". Verstanden hatten es beide, nur kam
     nichts im Stand an: Die Aufnahme verlangt, dass im Satz der Person
     ein Monatsname steht ("hauptsache warm" hatte das Modell sonst mit
     Oktober beantwortet), und "in 2 monaten" enthaelt keinen.

     Gerechnet wird hier und nicht vom Modell. Ob es den heutigen Tag
     kennt, ist nicht garantiert; der Kern kennt ihn. Zwei Monate sind
     zwei Monate, das ist keine Bedeutungsfrage.

     Dass die Angabe rund ist, bleibt erhalten: Der Monat wird gesetzt,
     ein Tag nicht, und die Frage nach dem genauen Anreisetag faellt
     fuer diese Person aus (`lauf.monatRelativ`). Wer "in zwei Monaten"
     sagt, hat keinen Kalender vor sich. */
  RELATIVZAHL: { einem: 1, einer: 1, eine: 1, ein: 1, zwei: 2, drei: 3, vier: 4, "fünf": 5, fuenf: 5,
    sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, "zwölf": 12, zwoelf: 12 },

  relativerMonat(text, heute = new Date()) {
    const t = String(text || "").toLowerCase();
    if (!t) return null;
    const zahl = (w) => {
      const n = parseInt(w, 10);
      if (Number.isFinite(n)) return n;
      return this.RELATIVZAHL[w] || null;
    };
    const etwa = "(?:etwa\\s+|ungef(?:ä|ae)hr\\s+|ca\\.?\\s+|gut\\s+|knapp\\s+)?";
    let monate = null;
    let treffer = null;
    if (/(?:ü|ue)bern(?:ä|ae)chsten\s+monat/.test(t)) monate = 2;
    else if (/n(?:ä|ae)chsten\s+monat|kommenden\s+monat/.test(t)) monate = 1;
    else if (/in\s+(?:einem\s+)?halben\s+jahr/.test(t)) monate = 6;
    else if ((treffer = t.match(new RegExp(`in\\s+${etwa}(\\d{1,2}|[a-zäöüß]+)\\s+monat`)))) monate = zahl(treffer[1]);
    else if ((treffer = t.match(new RegExp(`in\\s+${etwa}(\\d{1,2}|[a-zäöüß]+)\\s+wochen?`)))) {
      const w = zahl(treffer[1]);
      if (!w || w < 1 || w > 104) return null;
      const d = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate() + w * 7);
      return d.getMonth() + 1;
    }
    if (!monate || monate < 1 || monate > 24) return null;
    // Immer vom Monatsersten, sonst macht der 31. Oktober plus ein Monat den 1. Dezember
    return new Date(heute.getFullYear(), heute.getMonth() + monate, 1).getMonth() + 1;
  },

  /* Der Kern liest die Antwort auf seine eigene Frage.
     ------------------------------------------------------------------
     Gemeldet am 02.10.2026, und nicht zum ersten Mal: Auf "Wie lange
     soll die Reise werden?" schrieb der Nutzer "9", dann "9 Nächte".
     Im Chat stand "Ich merke mir 9 Nächte." - und direkt dahinter
     dieselbe Frage noch einmal. Im Stand lagen keine Nächte.

     Die Ursache ist die Arbeitsteilung selbst. Der Kern stellt die
     Frage, aber ob die Antwort ankommt, hing bisher allein daran, dass
     das Modell `stand_merken` aufruft. Tut es das nicht - und bei einer
     nackten Zahl tut es das nicht zuverlässig -, bleibt das Feld leer,
     das Thema offen, und die Frage kommt wieder. Dass das Modell den
     Wert im Satz nennt, macht es schlimmer, nicht besser: Der Agent
     bestätigt dann etwas, das er nicht hat.

     Wer die Frage stellt, muss die Antwort auch lesen können. Der Kern
     weiß, welches Thema er zuletzt gefragt hat, und für die Themen
     hier ist die Antwort eine Zahl oder ein Wort aus einer kurzen
     Liste. Das liest er selbst, bevor das Modell dran ist. Gelesen
     wird nur in ein leeres Feld (oder über eine eigene Annahme), und
     nur im Zug direkt nach der Frage - alles andere bleibt beim
     Modell.

     Derselbe Gedanke wie bei `relativerMonat` eine Funktion weiter
     oben, nur eine Stufe früher: dort im Werkzeug, hier noch davor.
     Ein Werkzeug, das nicht gerufen wird, kann nichts retten. */
  SELBST_ZAHL: { ein: 1, eine: 1, einer: 1, einem: 1, eins: 1, zwei: 2, drei: 3, vier: 4,
    "fünf": 5, fuenf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11,
    "zwölf": 12, zwoelf: 12, dreizehn: 13, vierzehn: 14, "fünfzehn": 15, fuenfzehn: 15,
    sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19, zwanzig: 20, einundzwanzig: 21 },

  selbstZahl(w) {
    const s = String(w == null ? "" : w).toLowerCase().trim();
    if (/^\d{1,2}$/.test(s)) return parseInt(s, 10);
    const n = this.SELBST_ZAHL[s];
    return n == null ? null : n;
  },

  /* Die Felder, die eine Annahme des Kerns je Thema geschrieben haben
     kann. Hat er nach zwei offenen Anläufen selbst eine Woche angesetzt
     und die Person sagt danach "9 Nächte", darf die Annahme nicht im
     Weg stehen - gelesen wird dann über sie hinweg. Was die Person
     selbst gesagt hat (`vonPerson`), bleibt unangetastet. */
  SELBST_ANNAHME: { dauer: ["naechte"], reisende: ["personen", "erwachsene", "kinder"],
    kinderAlter: ["kinderAlter"], flug: ["flug"], flugKlasse: ["flugKlasse"],
    anreise: ["anreise"], preis: ["maxPreis", "budgetGesamt", "preisEgal"] },

  SELBST_LESEN: {
    /* "9", "neun", "9 Nächte", "neun Übernachtungen", "eine Woche",
       "zwei Wochen", "10 Tage". Tage zählen wie Nächte: Der Agent sagt
       die Zahl gleich danach zurück, und wer es anders meint, korrigiert
       einen Satz später - das ist besser als dieselbe Frage noch einmal. */
    dauer(t, p, wk) {
      if (p.naechte) return null;
      let m = t.match(/\b(\d{1,2}|[a-zäöüß]+)\s*wochen\b/);
      if (m) { const n = wk.selbstZahl(m[1]); if (n >= 1 && n <= 8) return { naechte: n * 7 }; }
      if (/\b(eine|1)\s*woche\b/.test(t) || /^\s*woche\s*$/.test(t)) return { naechte: 7 };
      m = t.match(/\b(\d{1,2}|[a-zäöüß]+)\s*(n(?:ä|ae)chte?|(?:ü|ue)bernachtungen?|tage?)\b/);
      if (m) { const n = wk.selbstZahl(m[1]); if (n >= 1 && n <= 40) return { naechte: n }; }
      m = t.match(/^\s*(\d{1,2}|[a-zäöüß]+)\s*$/);
      if (m) { const n = wk.selbstZahl(m[1]); if (n >= 1 && n <= 40) return { naechte: n }; }
      return null;
    },
    /* Eine nackte Zahl auf "Wer reist mit?" ist die Gesamtzahl - genau
       das, was auch im Auftrag an das Modell steht. Wie sie sich auf
       Erwachsene und Kinder aufteilt, fragt der Fahrplan danach; das
       Thema bleibt also offen, aber die Zahl ist drin und die Frage
       wiederholt sich nicht wörtlich. */
    reisende(t, p, wk) {
      if (p.personen != null || p.erwachsene != null || p.kinder != null) return null;
      let m = t.match(/\b(\d{1,2}|[a-zäöüß]+)\s*erwachsene[nr]?\b/);
      if (m) { const n = wk.selbstZahl(m[1]); if (n >= 1 && n <= 12) return { erwachsene: n }; }
      m = t.match(/\b(\d{1,2}|[a-zäöüß]+)\s*(personen|person|leute|g(?:ä|ae)ste)\b/);
      if (m) { const n = wk.selbstZahl(m[1]); if (n >= 1 && n <= 12) return { personen: n }; }
      m = t.match(/^\s*(\d{1,2})\s*$/);
      if (m) { const n = +m[1]; if (n >= 1 && n <= 12) return { personen: n }; }
      return null;
    },
    /* "6 und 9", "sechs, neun". Gelesen wird nur, wenn jede Zahl im
       Satz ein mögliches Alter ist und nicht mehr Zahlen dastehen als
       Kinder mitreisen - sonst ist es kein Alter, sondern etwas
       anderes mit Zahlen drin. */
    kinderAlter(t, p, wk) {
      const n = p.kinder || 0;
      if (!n || (p.kinderAlter || []).length >= n) return null;
      const ziffern = t.match(/\d{1,2}/g) || [];
      let alter = ziffern.map(Number);
      if (!alter.length) {
        alter = (t.match(/[a-zäöüß]+/g) || []).map((w) => wk.selbstZahl(w)).filter((x) => x != null);
        if (!alter.length) return null;
      } else if (alter.length !== ziffern.length) return null;
      if (alter.length > n) return null;
      if (alter.some((x) => !Number.isFinite(x) || x < 0 || x > 17)) return null;
      return { kinderAlter: alter };
    },
    /* Kein "ja" und kein "nein": Die zweite Fassung der Frage lautet
       "Bucht ihr den Flug selbst, oder soll ich ihn mitsuchen?" - dort
       heißt ja das Gegenteil von dem, was es in der ersten Fassung
       heißt. Gelesen wird nur, was in sich eindeutig ist; die Chips
       schicken genau diese Wörter. */
    flug(t, p) {
      if (p.flug != null) return null;
      if (/ohne flug|kein(en)? flug|nur (die )?unterkunft|selbst buch|buche ich selbst|buchen wir selbst|flug (haben|habe) (wir|ich)/.test(t)) return { flug: false };
      if (/mit flug|flug dazu|flug mitsuch|such(e|st|t)? (mir |uns )?(auch |bitte )?(den |einen )?flug|flug bitte/.test(t)) return { flug: true };
      return null;
    },
    flugKlasse(t, p) {
      if (p.flugKlasse) return null;
      if (/business/.test(t)) return { flugKlasse: "business" };
      if (/premium/.test(t)) return { flugKlasse: "premium" };
      if (/economy|g(?:ü|ue)nstigste|billigste|standard|normal/.test(t)) return { flugKlasse: "economy" };
      return null;
    },
    /* Der Anreisetag. Ein Tag in einem anderen Monat wird hier nicht
       gelesen - den behandelt `datumWiderspruch` mit einer Rueckfrage,
       weil beide Lesarten moeglich sind. */
    anreise(t, p, wk) {
      if (p.anreise || (p.von && p.bis)) return null;
      const f = wk.flexWahl(p);
      if (!f) return null;
      const d = wk.tagAusText(t);
      if (!d) return null;
      const [jahr, monat] = f.monat.split("-").map(Number);
      if (d.monat && d.monat !== monat) return null;
      const letzter = new Date(jahr, monat, 0).getDate();
      if (d.tag < 1 || d.tag > letzter) return null;
      return { anreise: `${f.monat}-${String(d.tag).padStart(2, "0")}` };
    },
    /* Der Preis. Welche Lesart es ist, entscheidet `preisDeutung` -
       dieselbe Funktion, die auch die Angabe des Modells prueft. */
    preis(t, p, wk) {
      if (p.maxPreis || p.budgetGesamt || p.preisEgal) return null;
      if (/\b(offen|egal|kein(e|en)? (grenze|limit|budget)|nach oben offen|spielt keine rolle)\b/.test(t)) {
        return { preisEgal: true };
      }
      const betrag = wk.betragAusText(t);
      if (betrag == null) return null;
      const d = wk.preisDeutung(betrag, t, p);
      if (!d) return null;
      return { [d.feld]: betrag };
    },
  },


  /* Einen Tag aus dem Satz lesen.
     ------------------------------------------------------------------
     Gebraucht an zwei Stellen (Lesen und Widerspruch), deshalb hier und
     nicht zweimal. Zurueck kommt der Tag und, falls genannt, der Monat -
     ob der zum gesuchten passt, entscheidet der Aufrufer. */
  MONATSWORT: { januar: 1, jan: 1, februar: 2, feb: 2, "märz": 3, maerz: 3, "mär": 3, april: 4, apr: 4,
    mai: 5, juni: 6, jun: 6, juli: 7, jul: 7, august: 8, aug: 8, september: 9, sept: 9, sep: 9,
    oktober: 10, okt: 10, november: 11, nov: 11, dezember: 12, dez: 12 },

  tagAusText(text) {
    const t = String(text == null ? "" : text).toLowerCase().trim();
    if (!t) return null;
    let m = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (m) return { tag: +m[3], monat: +m[2] };
    // 1.11. / 01.11 / 1.11.2027
    m = t.match(/\b(0?[1-9]|[12]\d|3[01])\.\s*(0?[1-9]|1[0-2])\.?(?!\d)/);
    if (m) return { tag: +m[1], monat: +m[2] };
    // 15. Oktober, 15 Okt
    m = t.match(/\b(0?[1-9]|[12]\d|3[01])\.?\s*(januar|jan|februar|feb|märz|maerz|mär|april|apr|mai|juni|jun|juli|jul|august|aug|september|sept|sep|oktober|okt|november|nov|dezember|dez)\b/);
    if (m) return { tag: +m[1], monat: this.MONATSWORT[m[2]] || null };
    // Nur ein Tag: "14", "14.", "am 14.", "den 14."
    m = t.match(/^\s*(?:am\s+|ab\s+dem\s+|ab\s+|den\s+|der\s+)?(0?[1-9]|[12]\d|3[01])\.?\s*$/);
    if (m) return { tag: +m[1], monat: null };
    return null;
  },

  /* Ein Tag in einem anderen Monat als dem gesuchten.
     ------------------------------------------------------------------
     Gemeldet am 02.10.2026: Gesucht war Oktober, die Frage lautete "An
     welchem Tag im Oktober wollt ihr anreisen?", die Antwort war "01.11".
     Der Agent ging ohne ein Wort zur naechsten Frage, im Stand stand
     kein Tag, und in der Suche fehlte er auch.

     Zwei Lesarten sind moeglich (der 1. November, oder der 1. im
     gesuchten Monat), und der Kern darf keine davon raten: Ein Tag, der
     nicht in den gesuchten Monat gehoert, verschiebt entweder die ganze
     Reise oder ist ein Zahlendreher. Also fragt er, mit beiden Lesarten
     im Satz. */
  datumWiderspruch(p, text) {
    if (p.anreise || (p.von && p.bis)) return null;
    const f = this.flexWahl(p);
    if (!f) return null;
    const d = this.tagAusText(text);
    if (!d || !d.monat) return null;
    const monat = Number(f.monat.split("-")[1]);
    if (d.monat === monat) return null;
    const name = (m) => (typeof MONATSNAMEN !== "undefined" ? MONATSNAMEN[m - 1] : `Monat ${m}`);
    return {
      tag: d.tag, genannt: d.monat, gesucht: monat,
      satz: `Der ${d.tag}. ${name(d.monat)} liegt nicht im ${name(monat)}, in dem ich bisher suche. `
        + `Soll ich auf ${name(d.monat)} umstellen, oder meinst du den ${d.tag}. ${name(monat)}?`,
      chips: [`Auf ${name(d.monat)} umstellen`, `${d.tag}. ${name(monat)}`],
    };
  },

  /* Die hoechste Nacht im Katalog.
     ------------------------------------------------------------------
     Die Grenze zwischen "pro Nacht" und "fuer die ganze Reise" kommt
     aus den Daten, nicht aus einer geratenen Zahl: Eine Obergrenze
     oberhalb des teuersten Nachtpreises waere keine Grenze, sie liesse
     alles durch. Wer so eine Zahl nennt, meint die Reise. */
  nachtpreisDecke(p) {
    const monat = p && p.monat ? p.monat : null;
    const alle = [...(typeof HOTELS !== "undefined" ? HOTELS : []),
      ...(typeof APARTMENTS !== "undefined" ? APARTMENTS : [])];
    let hoch = 0;
    for (const h of alle) {
      const n = typeof preisImMonat === "function" ? preisImMonat(h, monat) : (h.pricePerNight || 0);
      if (Number.isFinite(n) && n > hoch) hoch = n;
    }
    return hoch || 400;
  },

  /* Gilt der Betrag pro Nacht oder fuer die ganze Reise?
     ------------------------------------------------------------------
     Gemeldet am 02.10.2026: Auf "Hast du beim Preis eine feste Grenze
     fuer die ganze Reise?" antwortete der Nutzer "5000 Euro", und der
     Agent merkte sich 5.000 Euro pro Nacht. Sein Kommentar: "Bei so
     hohen Betraegen ist es ja logisch, dass es fuer die gesamte Zeit
     gilt. Sowas erwarte ich schon von einem KI-Agenten."

     Entschieden wird in dieser Reihenfolge: Was die Person sagt, gilt
     ("pro Nacht", "insgesamt"). Sagt sie nichts dazu, entscheidet die
     Hoehe gegen die Daten - oberhalb des teuersten Nachtpreises kann es
     keine Nachtgrenze sein. Welche Lesart es wurde, sagt der Agent im
     naechsten Satz ("hoechstens 5000 € insgesamt"), damit ein Irrtum
     sofort auffaellt und nicht erst in der Trefferliste. */
  PRO_NACHT_WORT: /pro nacht|je nacht|die nacht|pro übernachtung|pro uebernachtung|je übernachtung|je uebernachtung|nachtpreis|pro tag|je tag|am tag|\/ ?nacht/i,
  GESAMT_WORT: /insgesamt|gesamt|zusammen|komplett|alles in allem|all ?in|maximal ausgeben|höchstens ausgeben|für (?:die )?(?:ganze )?(?:reise|woche|wochenende|zeit|urlaub)|fürs? (?:hotel|unterkunft|ganze)/i,

  preisDeutung(betrag, text, p) {
    if (!Number.isFinite(betrag) || betrag <= 0) return null;
    const t = String(text == null ? "" : text);
    if (this.PRO_NACHT_WORT.test(t)) return { feld: "maxPreis", grund: "pro Nacht gesagt" };
    if (this.GESAMT_WORT.test(t)) return { feld: "budgetGesamt", grund: "gesamt gesagt" };
    const decke = this.nachtpreisDecke(p);
    if (betrag > decke) return { feld: "budgetGesamt", grund: `über dem teuersten Nachtpreis (${Math.round(decke)} €)` };
    return { feld: "maxPreis", grund: "im Bereich der Nachtpreise" };
  },

  // Einen Betrag aus dem Satz lesen: "5000", "5.000 Euro", "5000€", "ca. 3500"
  betragAusText(text) {
    const t = String(text == null ? "" : text).toLowerCase();
    const treffer = [...t.matchAll(/(\d{1,3}(?:[.\s]\d{3})+|\d+)(?:\s*(?:€|euro|eur\b))?/g)]
      .map((m) => parseInt(String(m[1]).replace(/[^\d]/g, ""), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!treffer.length) return null;
    return treffer[treffer.length - 1];
  },

  /* Eine eigene Aussage des Modells ueber das Angebot.
     ------------------------------------------------------------------
     Gebraucht vom Kern, geprueft von der Kernpruefung - deshalb hier und
     nicht inline. Nach der Lage faellt jeder Satz des Modells weg, der
     darauf passt: Wie viel es gibt, sagt der Kern. */
  ANGEBOT_AUSSAGE: /\b(unterk(ü|ue)nfte|unterkunft|h(ä|ae)user|hotels?|ferienwohnungen?|wohnungen?|objekte?|angebote?|auswahl|treffer|buchbar|verf(ü|ue)gbar|gefunden)\b/i,

  /* Ein Autor je Nachricht - und der Vertrag dazu.
     ==================================================================
     Bis v=394 schrieben beide in dieselbe Nachricht: Das Modell lieferte
     einen Vorspann, der Kern haengte Quittung, Annahme und Frage an.
     Jeder gemeldete Doppler sass in dieser Naht, und jede Gegenmassnahme
     war ein weiterer Filter, der dem einen Autor wegstrich, was der
     andere schon gesagt hatte.

     Der Nutzer am 02.10.2026: "Ist mir voellig egal, ob die sich
     identisch anhoeren. Ich moechte, dass der Bot funktioniert und dass
     ich eine gute User Experience habe."

     Also schreibt das Modell die ganze Nachricht, und der Kern prueft
     sie gegen den Plan, den er dafuer aufgestellt hat. Faellt sie durch,
     nimmt er seinen eigenen Satz - das ist genau die Nachricht, die
     vorher immer kam. Der schlechteste Fall ist damit der alte Stand,
     der Regelfall eine Nachricht aus einer Feder.

     Geprueft wird, was messbar ist, nicht der Stil:

       - genau eine Frage, und zwar zum geplanten Thema
       - aufgenommen, was gerade in den Stand ging
       - keine Zusage ("merke ich mir") ohne etwas im Stand
       - keine eigene Mengenangabe, wenn der Kern die Lage schon gesagt hat
       - nicht laenger als drei, vier Saetze

     Die Zahlenpruefung bleibt beim Kern: Sie braucht die Werkzeugergebnisse
     des Zuges, und die hat nur er. */
  FRAGEWORT: /\b(wie|was|wo|wer|wen|wem|worauf|wofür|wofuer|womit|wohin|woran|wobei|wann|welche[rsnm]?|warum|wieso|ob|soll|sollen|möchte|moechte|möchtest|moechtest|möchtet|moechtet|willst|wollt|hast|habt|haben|ist|sind|seid|bist|gibt|kann|kannst|könnt|koennt|darf|brauchst|braucht|passt|interessiert)\b/i,

  fragenZaehlen(text) {
    return String(text).split(/(?<=[.!?])\s+/)
      .filter((s) => /\?\s*$/.test(s))
      .filter((s) => !/^(oder|bzw\.?|beziehungsweise|also|und wenn|zum beispiel|etwa|z\. ?b\.?)\b/i.test(s.trim()))
      .filter((s) => this.FRAGEWORT.test(s))
      .length;
  },

  /* Woran man erkennt, dass eine Frage zu einem Thema gehoert. Dieselbe
     Liste, die auch `themaVerfehlt` im Kern benutzt. */
  THEMA_WOERTER: {
    zeit: /wann|monat|zeitpunkt|losgehen|reisezeit|jahreszeit|termin|zeitraum|daten/i,
    reisende: /\bwer\b|personen|wie viele|kinder|erwachsene|zu zweit|allein|mitreis|reist/i,
    kinderAlter: /\balt\b|alter|jahre|jährig/i,
    ziel: /warm|kalt|ziel|wohin|region|richtung|land|insel/i,
    art: /hotel|ferienwohnung|unterkunft/i,
    weiter: /schauen|sehen|klären|klaeren|eckdaten|angaben|weiter/i,
    dauer: /lange|nächte|naechte|tage|dauer|woche/i,
    flug: /flug/i,
    flugAb: /flughafen|abflug|ab welch|von wo|fliegen/i,
    flugKlasse: /klasse|economy|premium|business/i,
    // "Tag" allein zaehlt: Die eigene Frage lautet "Im Juni ist jeder Tag
    // frei ... Passt euch der 8. Juni?" und nennt das Wort Anreise nicht
    anreise: /anreise|datum|\btag(e)?\b|passt euch/i,
    vorgehen: /selbst|drei|filter|raussuch|favorit|vorschl|liste/i,
    anzahl: /wie viele|anzahl|h(ä|ae)user|vorschl(ä|ae)ge|unterk(ü|ue)nfte/i,
    preis: /preis|budget|kosten|euro|grenze|ausgeben/i,
    verpflegung: /verpflegung|inclusive|inklusive|halbpension|vollpension|frühstück|fruehstueck|mahlzeit|all ?in/i,
    wuensche: /wichtig|achte|wert|wünsch|wuensch|vorstell|lieber/i,
    beratung: /eckdaten|klären|klaeren|auswahl|zeigen/i,
  },

  /* Die Worte, die der Kern in diesem Zug aufgenommen hat - das, was in
     der Nachricht vorkommen muss. */
  aufnahmeWorte(lauf, p) {
    const raus = [];
    for (const f of [...new Set(lauf?.zuletztGemerkt || [])]) {
      const e = this.FELDWORT[f];
      if (!e) continue;
      const wort = e.wort(p || {});
      if (wort) raus.push(wort);
    }
    return raus;
  },

  // Die Zahlen als Wort - "neun Naechte" ist dieselbe Aufnahme wie
  // "9 Naechte", und ein Modell, das ausschreibt, soll nicht durchfallen
  ZAHLWORT: ["null", "ein", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun",
    "zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn",
    "achtzehn", "neunzehn", "zwanzig", "einundzwanzig"],

  // Kommt eines der Worte in der Nachricht vor? Geprueft wird am
  // kennzeichnenden Teil: eine Zahl, sonst das laengste Wort.
  wortErkannt(wort, text) {
    const t = String(text || "");
    const zahl = String(wort).match(/\d+/);
    if (zahl) {
      if (t.includes(zahl[0])) return true;
      const w = this.ZAHLWORT[Number(zahl[0])];
      return !!w && new RegExp(`\\b${w}`, "i").test(t);
    }
    const lang = String(wort).split(/\s+/).filter((x) => x.length > 3).sort((a, b) => b.length - a.length)[0];
    if (!lang) return true;
    return new RegExp(lang.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(t);
  },

  nachrichtPruefen(text, plan = {}) {
    const t = String(text == null ? "" : text).replace(/\s+/g, " ").trim();
    if (!t) return { ok: false, grund: "leer" };
    const frageZeichen = (t.match(/\?/g) || []).length;
    if (frageZeichen === 0) return { ok: false, grund: "keine_frage" };
    if (frageZeichen > 1) return { ok: false, grund: "mehrere_fragezeichen" };
    if (this.fragenZaehlen(t) > 1) return { ok: false, grund: "zwei_fragen" };
    if (plan.thema) {
      const re = this.THEMA_WOERTER[plan.thema];
      if (re && !re.test(t)) return { ok: false, grund: `thema_verfehlt:${plan.thema}` };
    }
    for (const wort of plan.quittungWorte || []) {
      if (!this.wortErkannt(wort, t)) return { ok: false, grund: `nicht_quittiert:${wort}` };
    }
    const saetze = t.split(/(?<=[.!?])\s+/);
    if (!plan.etwasGemerkt && saetze.some((x) => this.QUITTUNG.test(x))) {
      return { ok: false, grund: "quittung_ohne_stand" };
    }
    if (plan.lageGesagt && saetze.some((x) => !/\?/.test(x) && this.ANGEBOT_AUSSAGE.test(x))) {
      return { ok: false, grund: "eigene_menge" };
    }
    /* Und nicht noch einmal, was der Kern in diesem Zug schon gesagt hat.
       ----------------------------------------------------------------
       Gemeldet am 02.10.2026, und es war meine eigene Regression aus
       v=395: Der Kern sagte "Warm heisst im Juni fuer mich 14 Regionen
       mit 22 bis 34 Grad, darunter Kreta (29 Grad), Mallorca (27 Grad),
       Teneriffa (26 Grad)." Direkt darunter das Modell: "Warm heisst im
       Juni fuer mich 14 Regionen mit 22 bis 34 Grad, darunter Kreta,
       Mallorca und Teneriffa. Soll ich dir ein Angebot mit Flug
       suchen?"

       Die alte Verkettung hatte dafuer zwei Filter, einen fuer das
       Zitat und einen fuer die Umschreibung. Beim Umbau auf einen Autor
       je Nachricht habe ich den Vertrag gebaut und diese beiden
       vergessen - er prueft die Frage, die Quittung und die Zahlen, nur
       nicht die Wiederholung.

       Jetzt wieder beide: woertlich und ueber die Inhaltswoerter. Unter
       drei Inhaltswoertern wird nicht verglichen ("Alles klar." darf
       neben allem stehen). */
    const vorhin = (plan.schonGesagt || []).filter(Boolean);
    if (vorhin.length) {
      const flach = (x) => String(x).toLowerCase().replace(/[^a-zäöüß0-9]/g, "");
      const woerter = (x) => new Set(String(x).toLowerCase().match(/[a-zäöüß]{5,}/g) || []);
      const vorhinFlach = vorhin.map(flach);
      const vorhinWoerter = vorhin.map(woerter);
      for (const x of saetze) {
        if (/\?/.test(x)) continue;
        const f = flach(x);
        if (f.length > 14 && vorhinFlach.some((v) => v.includes(f) || f.includes(v))) {
          return { ok: false, grund: "schon_gesagt" };
        }
        /* Eine kurze Umschreibung teilt oft nur die Zahl und ein Wort:
           "Es sind also 14 warme Regionen im Juni." neben "Warm heisst im
           Juni fuer mich 14 Regionen mit 22 bis 34 Grad." Dafuer reichen
           die Inhaltswoerter nicht, die Zahl schon. */
        const zahlen = (x.match(/\d+/g) || []).filter((z) => +z >= 5);
        const w = [...woerter(x)];
        for (let i = 0; i < vorhin.length; i++) {
          const v = vorhinWoerter[i];
          const vz = (vorhin[i].match(/\d+/g) || []).filter((z) => +z >= 5);
          if (zahlen.some((z) => vz.includes(z)) && w.some((y) => v.has(y))) {
            return { ok: false, grund: "schon_gesagt" };
          }
          if (w.length >= 3 && w.filter((y) => v.has(y)).length / w.length >= 0.5) {
            return { ok: false, grund: "schon_gesagt" };
          }
        }
      }
    }
    if (t.length > 420) return { ok: false, grund: "zu_lang" };
    return { ok: true, grund: null };
  },

  antwortSelbstLesen(kern, thema, text) {
    const leser = thema ? this.SELBST_LESEN[thema] : null;
    if (!leser) return null;
    const t = String(text == null ? "" : text).toLowerCase().trim();
    if (!t) return null;
    const p = kern.lauf.profil || (kern.lauf.profil = {});
    /* Über eine eigene Annahme hinweg lesen, aber auf einer Kopie: Hat
       der Leser nichts zu bieten, bleibt der Stand unberührt und das
       Thema abgehakt - sonst würde eine unverständliche Antwort die
       Annahme wieder aufreißen und die Frage zurückholen. */
    let sicht = p;
    if (kern.lauf.uebersprungen && kern.lauf.uebersprungen[thema]) {
      sicht = { ...p };
      for (const f of this.SELBST_ANNAHME[thema] || []) {
        if (!(p.vonPerson || {})[f]) delete sicht[f];
      }
    }
    let werte = null;
    try { werte = leser(t, sicht, this); } catch { werte = null; }
    if (!werte) return null;
    const gesetzt = [];
    for (const f of Object.keys(werte)) {
      const w = werte[f];
      if (w === undefined || w === null || w === "") continue;
      if (JSON.stringify(p[f] == null ? null : p[f]) === JSON.stringify(w)) continue;
      p[f] = w;
      gesetzt.push(f);
    }
    if (!gesetzt.length) return null;
    p.vonPerson = p.vonPerson || {};
    for (const f of gesetzt) p.vonPerson[f] = true;
    /* Quittiert wird das wie jede andere Aufnahme, vom Kern: `aufnahmeSatz`
       liest `zuletztGemerkt`. Ohne diesen Eintrag stünde der Wert still
       im Stand, und die Person wüsste nicht, ob er angekommen ist. */
    const dazu = (liste) => [...new Set([...(liste || []), ...gesetzt])];
    kern.lauf.selbstGelesen = dazu(kern.lauf.selbstGelesen);
    kern.lauf.zuletztGemerkt = dazu(kern.lauf.zuletztGemerkt);
    // Eine Annahme und ein Nichtverstehen zu diesem Thema sind hinfällig
    if (kern.lauf.uebersprungen) delete kern.lauf.uebersprungen[thema];
    if (kern.lauf.nichtVerstanden) delete kern.lauf.nichtVerstanden[thema];
    kern.notieren?.("antwort_selbst_gelesen", { thema, felder: gesetzt, text: t.slice(0, 60) });
    kern.standAnzeigen?.();
    kern.sichern?.();
    return { thema, felder: gesetzt };
  },

  /* Eine Quittung des Modells - an einer Stelle, damit die Pruefung
     dieselbe Liste sieht wie der Kern.
     ------------------------------------------------------------------
     Am 02.10.2026 stand "Ich merke mir 9 Nächte." im Chat, obwohl im
     Stand nichts lag. Der Riegel dagegen war längst eingebaut, nur
     kannte er "merke ich mir" und nicht "ich merke mir" - dieselbe
     Zusage in der anderen Wortstellung. Deshalb jetzt beide Richtungen
     und die üblichen Verwandten dazu. */
  QUITTUNG: /\b(?:merke?|merk) ich mir\b|\bich (?:merke?|merk) (?:mir|es|das)\b|\bnotiere ich\b|\bich notiere\b|\bhabe ich (?:mir )?(?:gemerkt|notiert)\b|\bnehme ich (?:so )?auf\b|\b(?:ist|sind|hab ich|habe ich) (?:schon )?(?:notiert|gemerkt|vermerkt|aufgenommen)\b|\bhalte ich fest\b|\bich halte\b[^.!?]*\bfest\b|\bspeichere ich\b|\bich speichere\b|\btrage ich\b[^.!?]*\bein\b|\bich trage\b[^.!?]*\bein\b|\bvermerke ich\b|\bich vermerke\b/i,

  /* Hat das Modell selbst gesagt, worum es geht?
     ------------------------------------------------------------------
     Die Gegenprobe zur Rueckfrage "das habe ich nicht verstanden".
     Steht im Satz des Modells ein Wert des offenen Themas ("Dezember
     ist eine gute Zeit"), dann ist angekommen, was die Person gesagt
     hat - der Kern hat es nur nicht aufgenommen. Sich dann zu
     entschuldigen waere das Gegenteil von dem, was die Nachricht zeigt.

     Geprueft wird gegen denselben geschlossenen Wortschatz, aus dem
     auch die Tippfehler-Vermutung schoepft. Themen ohne Wortschatz
     (Dauer, Preis, Wuensche) liefern hier nichts; fuer die traegt das
     andere Zeichen, dass naemlich im Zug etwas verworfen wurde. */
  themaWortImText(thema, text) {
    const regel = this.TIPPFEHLER[thema];
    if (!regel || !text) return null;
    const flach = (x) => String(x || "").toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .replace(/[^a-z]/g, "");
    const stuecke = new Set(String(text).split(/[^A-Za-zÄÖÜäöüß]+/).map(flach).filter(Boolean));
    for (const e of regel.liste()) {
      for (const w of e.woerter || []) {
        const f = flach(w);
        if (f.length >= 4 && stuecke.has(f)) return e.label;
      }
    }
    return null;
  },

  /* Unsicher ist nicht dasselbe wie unverstanden.
     ------------------------------------------------------------------
     Wunsch des Nutzers am 01.10.2026: "Wenn der Kern bzw. das Modell
     sich unsicher sind, dann kann es schon sein, dass man am besten mal
     nachfragt: Meinst du Dezember? Aber wenn es offensichtlich ist,
     dann natuerlich nicht."

     Damit sind es drei Faelle statt zwei:

       1. Eindeutig ("im Dezember", "in zwei Monaten"). Der Kern nimmt es
          auf und sagt, was er sich gemerkt hat. Keine Frage.
       2. Unsicher: Es stand etwas ueber die Zeit im Satz, aber kein
          Monat, und das Modell hat einen vorgeschlagen, den der Kern
          nicht annehmen durfte ("so gegen Ende des Jahres" -> Dezember).
          Dann fragt er nach, mit dem Wert. Aufgenommen wird nichts, bis
          die Person ja sagt.
       3. Gar nichts angekommen. Dann die Entschuldigung, wie bisher.

     Warum nur die Zeit und nicht alle Themen: Die anderen Aufnahmeregeln
     fragen bereits breit ("steht ueberhaupt eine Zahl im Satz?"). Wird
     dort etwas verworfen, hat die Person zu dem Thema nichts gesagt -
     eine Nachfrage waere dann keine Rueckversicherung, sondern ein
     Vorschlag des Agenten. Beim Ziel waere das sogar schaedlich: Welche
     Region gebucht wird, soll von der Person kommen, sonst misst die
     Erhebung den Agenten statt des Menschen. Die Monatsregel ist die
     einzige, die enger ist als ihr Thema - sie verlangt einen
     Monatsnamen, und ueber Zeit kann man ohne Monatsnamen sprechen.
     Genau in diese Luecke faellt die Nachfrage. */
  ZEITBEZUG: /\d|monat|wochen?|tage?n?\b|jahr|ferien|feiertag|ostern|pfingsten|weihnacht|silvester|neujahr|sommer|winter|herbst|frühling|fruehling|frühjahr|fruehjahr|saison|anfang|mitte|ende|bald|demnächst|demnaechst|schulfrei|urlaub/i,

  unsicherRueckfrage(thema, lauf, letzte = "", satzDesModells = "") {
    if (thema !== "zeit" || !lauf) return null;
    if ((lauf.unsicherGefragt || {})[thema]) return null;
    // Die Person muss ueber die Zeit gesprochen haben - sonst waere die
    // Vermutung nicht ihre, sondern die des Agenten
    if (!this.ZEITBEZUG.test(String(letzte || ""))) return null;
    const v = lauf.verworfenImZug;
    let label = null;
    if (v && v.ereignis === "monat_verworfen" && v.monat >= 1 && v.monat <= 12) {
      label = typeof MONATSNAMEN !== "undefined" ? MONATSNAMEN[v.monat - 1] : null;
    }
    // Zweite Quelle: Das Modell hat den Monat nur ausgesprochen, ohne ihn
    // ueberhaupt mitzuschicken ("Dezember ist eine gute Zeit")
    if (!label) label = this.themaWortImText(thema, satzDesModells);
    if (!label) return null;
    const regel = this.TIPPFEHLER[thema];
    return { label, satz: regel.satz(label), chips: regel.chips(label) };
  },

  tippfehlerRueckfrage(thema, text, lauf = {}) {
    const label = this.tippfehlerVermutung(thema, text);
    if (!label) return null;
    if ((lauf.tippfehlerGefragt || {})[thema] === label) return null;
    const regel = this.TIPPFEHLER[thema];
    return { label, satz: regel.satz(label), chips: regel.chips(label) };
  },

  /* Nach dem Monat einmal nach dem Tag fragen.
     ------------------------------------------------------------------
     "Wann soll es denn ungefaehr losgehen? Ein Monat reicht mir erst
     mal." - dieses "ungefaehr" tut genau das, was es verspricht: Es
     laedt dazu ein, nur den Monat zu nennen. Wer den 10. August schon
     im Kopf hat, sagt ihn dann nicht, und der Agent sucht flexibel im
     Monat weiter. Am Ende steht in der Maske "flexibel im August",
     obwohl die Person ein Datum hatte.

     Also fragt der Kern direkt nach dem Monat einmal nach - einmal,
     nicht mehr. Wer flexibel ist, klickt es weg und verliert einen
     Klick; wer einen Tag hat, nennt ihn, und dann steht er von der
     ersten Suche an in der Maske. Nebenbei faellt fuer diese Person die
     spaete Anreisefrage weg: `fertig.anreise` ist damit erfuellt.

     Wen der Kern NICHT fragt:
       - wen er den Monat selbst hat waehlen lassen (`vonPerson.monat`
         fehlt) - wer die Wahl abgibt, hat kein Datum,
       - wen er nach zwei Anlaeufen uebergangen hat (`uebersprungen.zeit`),
       - wer schon einen Tag, einen Zeitraum oder eine Frist genannt hat.
         Ueber Termine wurde dann bereits gesprochen.

     Zwei Stufen, weil ein Chip, der etwas ankuendigt, eine konkrete
     Frage nach sich ziehen muss. Das war der Fehler bei "Feste Grenze"
     am 30.09.2026: geklickt, und danach nie nach dem Betrag gefragt.
     Wer hier "Ich habe ein Datum" klickt, ohne eines zu nennen, wird
     nach dem Tag gefragt. Wer abwinkt, nicht. */
  DATUM_ABWINKEN: /flexib|egal|kein|nein|nee\b|nicht|wei(ss|ß) nicht|offen|noch nicht|sp(ae|ä)ter|mal sehen|schau/i,

  datumRueckfrage(p, lauf, letzte = "") {
    if (!p || !lauf) return null;
    if (!p.monat) return null;
    // Der Monat kam vom Kern, nicht von der Person - dann gibt es auch keinen Tag
    if (!p.vonPerson?.monat) return null;
    if (lauf.uebersprungen?.zeit) return null;
    /* Die Ausnahme fuer runde Angaben ist wieder weg.
       ------------------------------------------------------------------
       Am 01.10.2026 hatte ich angenommen, wer "in zwei Monaten" sagt,
       habe keinen Tag im Kopf. Der Nutzer hat das am 02.10. widerlegt:
       "Wenn ich sage, ich moechte im naechsten Monat fliegen, kann es ja
       trotzdem sein, dass ich ein Datum habe. Wenn man kein genaues Datum
       nennt, immer nochmal fragen - immer sicher gehen." Die Frage kostet
       einen Klick, die Annahme kostet die Angabe. */
    // Ein Tag, ein Zeitraum oder eine Frist steht schon
    if ((p.von && p.bis) || p.anreise || p.anreiseBis || p.anreiseAb) return null;
    const monat = typeof MONATSNAMEN !== "undefined" ? MONATSNAMEN[p.monat - 1] : null;
    if (!monat) return null;
    const stufe = lauf.datumFrage || 0;
    if (stufe === 0) {
      return {
        stufe: 1,
        satz: `Weißt du im ${monat} schon einen genauen Anreisetag, oder bist du da flexibel? `
          + `Wenn du einen Tag hast, nenn ihn mir gern.`,
        chips: ["Ich bin flexibel", "Ich habe ein Datum"],
      };
    }
    // Zweite Stufe nur fuer die, die nicht abgewunken haben
    if (stufe === 1 && !this.DATUM_ABWINKEN.test(String(letzte || ""))) {
      return {
        stufe: 2,
        satz: `An welchem Tag im ${monat} wollt ihr anreisen? Es ist jeder Tag frei, und der Preis bleibt im Monat gleich.`,
        chips: null,
      };
    }
    /* Noch ein Anlauf, und der sagt, woran es lag.
       ------------------------------------------------------------------
       Gemeldet am 02.10.2026: Auf "An welchem Tag im Oktober wollt ihr
       anreisen?" kam "01.11", und der Agent stellte einfach die naechste
       Frage. Im Stand lag kein Tag, in der Suche fehlte er auch. Der
       Nutzer dazu: "Das ist ja auch schlecht, wenn er quasi nicht so
       lange fragt, bis er es auch wirklich verstanden hat."

       Also wird noch einmal gefragt, mit dem Hinweis, dass nichts
       angekommen ist, und mit Tagen als Vorschlag. Danach ist Schluss:
       Die Suche laeuft flexibel im Monat weiter, und auch das wird
       gesagt. Zwei Anlaeufe sind Nachfragen, fuenf sind ein Verhoer. */
    if (stufe === 2 && !this.DATUM_ABWINKEN.test(String(letzte || ""))) {
      const tage = this.anreiseTage(p);
      const bsp = tage.length > 1 ? tage[1] : (tage[0] || null);
      return {
        stufe: 3,
        satz: `Einen Tag im ${monat} konnte ich aus deiner Antwort nicht lesen. `
          + `Welcher soll es sein${bsp ? `, zum Beispiel der ${bsp}` : ""}?`,
        chips: tage.length ? [...tage.slice(0, 3), "Ich bin flexibel"] : ["Ich bin flexibel"],
      };
    }
    return null;
  },

  // Wie der Agent die Art nennt, wenn er darueber spricht
  artWort(p, mehrzahl = true) {
    const t = this.seitenTyp(p);
    if (t === "apartment") return mehrzahl ? "Ferienwohnungen" : "eine Ferienwohnung";
    if (t === "hotel") return mehrzahl ? "Hotels" : "ein Hotel";
    return mehrzahl ? "Unterkünfte" : "eine Unterkunft";
  },

  /* Bei "beides" sagt er, wie es sich aufteilt.
     ------------------------------------------------------------------
     Der Nutzer am 28.09.2026: "Dann wuerde ich empfehlen, dass er nicht
     einfach Haeuser schreibt. Es gibt 59 Haeuser. Sondern dass er sagt,
     es gibt 20 Hotels und 30 Ferienwohnungen."

     Er hat recht: Wer beides sucht, entscheidet sich als Naechstes
     womoeglich doch fuer eines - und dafuer braucht er die beiden
     Zahlen, nicht ihre Summe. */
  artAufteilung(liste, p) {
    if (this.seitenTyp(p) !== "unterkunft") return null;
    const h = liste.filter((x) => x.type !== "apartment").length;
    const w = liste.length - h;
    if (!h || !w) return null;
    return `${h} ${h === 1 ? "Hotel" : "Hotels"} und ${w} ${w === 1 ? "Ferienwohnung" : "Ferienwohnungen"}`;
  },

  // Dieselbe Belegung wie in der Trefferliste - der Agent darf kein Haus
  // nennen, das dort im gewaehlten Monat gar nicht steht.
  katalog(profil) {
    const H = typeof HOTELS !== "undefined" ? HOTELS : [];
    const W = typeof APARTMENTS !== "undefined" ? APARTMENTS : [];
    const alle = profil?.typ === "apartment" ? W : (profil?.typ === "hotel" ? H : [...H, ...W]);
    if (!profil?.monat || typeof freiImMonat !== "function") return alle;
    return alle.filter((h) => freiImMonat(h, profil.monat));
  },

  // Preis pro Nacht im Reisemonat (Saisonfaktor wie auf der Seite)
  preis(item, monat) {
    return typeof preisImMonat === "function" ? preisImMonat(item, monat) : item.pricePerNight;
  },

  // Passt das Haus zur Gruppe (Zimmergroesse bzw. Hoechstbelegung)?
  passtGruppe(item, profil) {
    return Auswahl.passtGruppe(item, profil);
  },

  /* Was der Agent ueber ein Haus wissen darf, haengt daran, was er
     angesehen hat.
     ------------------------------------------------------------------
     Bis zum 27.09.2026 standen "gelobt" und "kritisiert" in JEDEM
     Suchergebnis - aus den Bewertungen gerechnet, ohne dass der Agent das
     Haus je geoeffnet hatte. Er konnte also sagen "gelobt wird das
     Essen" fuer ein Haus, das er nie angesehen hat. Das ist dieselbe
     Erfindung wie eine falsche Zahl, nur aus echten Daten gespeist.

     Was auf den Karten der Trefferliste steht - Name, Preis, Gesamtnote,
     Sterne, Strandentfernung, Ausstattungssymbole - darf er immer
     nennen; das sieht ein Mensch dort auch. Alles aus den Bewertungen
     erst, wenn er die Bewertungen gelesen hat (lauf.gelesen). */
  kompakt(item, profil, gelesen = null) {
    const monat = profil.monat || null;
    const darfBewertung = !gelesen || !!gelesen[item.id];
    const kurz = darfBewertung && typeof aspektKurzfassung === "function" ? aspektKurzfassung(item) : null;
    return {
      id: item.id, name: item.name, ort: item.location, region: item.region || null,
      art: item.type === "apartment" ? "Ferienwohnung" : (typeof CATEGORY_LABELS !== "undefined" ? CATEGORY_LABELS[item.category] : item.category) || "Hotel",
      sterne: item.stars ?? null,
      preisProNacht: this.preis(item, monat),
      note: item.rating, bewertungen: item.reviewCount,
      meterZumStrand: item.distanceToBeach != null ? Math.round(item.distanceToBeach * 1000) : null,
      ausstattung: (item.amenities || []).slice(0, 8),
      ...(darfBewertung
        ? { gelobt: kurz?.staerken?.slice(0, 2) || [], kritisiert: kurz?.schwaechen?.slice(0, 1) || [] }
        : { bewertungenNochNichtGelesen: "Was Gaeste loben oder bemaengeln, weisst du erst, wenn du die Bewertungen dieses Hauses gelesen hast." }),
      ...this.flugTeil(item, profil),
    };
  },

  // Flug dazu, wenn gewuenscht: Preis pro Person (Hin und zurueck) und
  // Paket fuer alle Reisenden ueber die gemerkte Dauer
  flugTeil(item, profil) {
    if (!profil.flug || item.type === "apartment" || typeof Flug === "undefined") return {};
    const personen = (profil.erwachsene || 0) + (profil.kinder || 0);
    const paket = Flug.paket(item, personen || 1, profil.flugKlasse || null);
    if (!paket) return { flug: `kein Flug ab ${Flug.code(profil.flugAb) || "dem gewuenschten Flughafen"} zu diesem Ziel` };
    const naechte = profil.naechte || null;
    const zimmer = Math.max(1, profil.zimmer || 1);
    const unterkunft = naechte ? this.preis(item, profil.monat) * naechte * zimmer + 35 * zimmer : null;
    const festPasst = profil.von && naechte ? Flug.passtTag(paket.flug, profil.von, naechte) : null;
    return {
      flug: { verbindung: `${paket.flug.airline} ${paket.flug.from} nach ${paket.flug.to}, ${paket.flug.depart} bis ${paket.flug.arrive}, ${paket.flug.stops === 0 ? "direkt" : `${paket.flug.stops} Stopp`}`, flugtage: Flug.tageText(paket.flug), klasse: paket.klasse, proPersonHinUndZurueck: paket.proPerson, personen: paket.personen, gesamt: paket.gesamt,
        ...(festPasst === false ? { hinweis: `Die gewuenschte Anreise ${Flug.datumText(profil.von)} ist kein Flugtag dieser Verbindung - beim Buchen muss ein Flugtag gewaehlt werden` } : {}) },
      ...(unterkunft != null ? { paketGesamtUnterkunftUndFlug: unterkunft + paket.gesamt } : {}),
    };
  },

  // Alle Regionen, die im Monat mindestens Nebensaison haben
  regionenInSaison(monat) {
    return (typeof ZIELE !== "undefined" ? ZIELE : []).filter((z) =>
      !monat || typeof saisonPassung !== "function" || saisonPassung(z, monat) >= 0.5);
  },

  /* ==================================================================
     Die Werkzeuge
     ================================================================== */
  werkzeuge: {
    async stand_merken(a, kern) {
      const p = kern.lauf.profil;
      /* Der Stand vor der Aenderung - fuer den Satz, der sagt, was sie
         bewirkt (`aenderungsSatz`). Eine flache Kopie reicht: Verglichen
         werden Werte, nicht Objekte. */
      const vorStand = { ...p };
      const geaendert = [];
      const setze = (feld, wert) => {
        if (wert === undefined || wert === null || wert === "") return;
        /* Hat der Kern die Antwort in diesem Zug selbst gelesen, gilt sein
           Wert. Sonst koennte das Modell die Zahl, die die Person gerade
           genannt hat, mit einer anderen ueberschreiben - und zwar
           unbemerkt, weil beide Werte aus demselben Zug stammen. */
        if ((kern.lauf.selbstGelesen || []).includes(feld) && p[feld] !== wert) {
          kern.notieren("modell_ueberschreibt_nicht", { feld, modell: wert, kern: p[feld] });
          return;
        }
        if (p[feld] !== wert) geaendert.push(feld);
        p[feld] = wert;
      };
      // Das Modell schickt Zahlenfelder gelegentlich als true oder als Text.
      // Ohne diese Pruefung stand in der Leiste "Wer true Kinder".
      for (const f of ["monat", "naechte", "personenGesamt", "erwachsene", "kinder", "zimmer", "maxPreis", "budgetGesamt", "maxStrandMeter", "mindestSterne"]) {
        if (a[f] === undefined || a[f] === null) continue;
        const n = typeof a[f] === "number" ? a[f] : parseInt(String(a[f]).replace(/[^\d-]/g, ""), 10);
        if (!Number.isFinite(n) || n < 0) { kern.notieren("wert_verworfen", { feld: f, wert: a[f] }); delete a[f]; }
        else a[f] = n;
      }
      if (a.mindestbewertung != null) {
        const n = typeof a.mindestbewertung === "number" ? a.mindestbewertung : parseFloat(String(a.mindestbewertung).replace(",", "."));
        if (!Number.isFinite(n) || n < 0 || n > 5) { kern.notieren("wert_verworfen", { feld: "mindestbewertung", wert: a.mindestbewertung }); delete a.mindestbewertung; }
        else a.mindestbewertung = n;
      }
      const gesagt = (muster, letzte = 3) => kern.lauf.gespraech.filter((n) => n.role === "user").slice(-letzte).some((n) => muster.test(String(n.content)));
      if (a.ziel !== undefined) {
        const roh = String(a.ziel).toLowerCase().trim();
        let id = null;
        if (roh && typeof ZIEL_NACH_ID !== "undefined" && ZIEL_NACH_ID[roh]) id = roh;
        else if (roh) id = ((typeof ZIELE !== "undefined" ? ZIELE : []).find((x) => x.name.toLowerCase() === roh) || {}).id || null;
        if (!roh) { p.zielId = null; }
        // Auch hier gilt: Eine Region, die niemand genannt hat, wird nicht
        // gesetzt. Sonst entscheidet das Modell das Reiseziel.
        else if (id && (Werkzeugkasten.regionGenannt(kern.lauf, id) || p.zielId === id)) { setze("zielId", id); p.zielOffen = false; }
        else if (id) kern.notieren("ziel_verworfen", { ziel: id, wo: "stand_merken" });
      }
      // "Offen" und "egal" nur, wenn die Person so etwas gesagt hat - auf
      // "hi" hatte das Modell sonst Ziel offen und Ueberblick gewuenscht
      // eingetragen, ohne dass jemand gefragt war
      const OFFEN = /(egal|offen|flexibel|nicht so wichtig|unwichtig|nicht festgelegt|festgelegt|keine ahnung|beides|beide|hauptsache|überrasch|ueberrasch|du entscheidest|such du|schauen|sehen|zeig|gucken|kein(e|en)? (rahmen|grenze|limit|vorstellung|besonderen|besondere)|nichts besonderes|noch nicht|erst ?mal|mal sehen|spielt keine rolle|unentschieden|nicht sicher|vorschl|beraten|überblick|ueberblick|eckdaten|möglichkeiten|moeglichkeiten|angebot|was es gibt|was gibt)/i;
      const offenGesagt = gesagt(OFFEN);
      const verworfen = [];
      for (const f of ["zielOffen", "artEgal", "preisEgal", "ausstattungEgal", "bewertungEgal", "strandEgal", "verpflegungEgal"]) {
        if (a[f] === true && !offenGesagt) { delete a[f]; verworfen.push(f); }
      }
      // Antworten auf die Frage "schauen oder klaeren" und "selbst oder drei"
      // zaehlen nur, wenn die letzte Nachricht so etwas sagt - auf "Hotel"
      // hatte das Modell sonst "schauen" eingetragen
      if (a.weiter && !gesagt(/schau|seh(en)?\b|zeig|guck|los\b|klär|klaer|erst ?mal|eckdaten|angaben|weiter|noch (ein paar|mehr|etwas|was)|nur zu|gern|ja\b|nein\b|ok\b|passt/i, 1)) { verworfen.push("weiter"); delete a.weiter; }
      if (a.vorgehen && !gesagt(/selbst|selber|filter|drei|top|raussuch|\bsuch|\bsuchst\b|für mich|fuer mich|übernimm|uebernimm|vorschl|favorit|liste|schau|zeig|empfehl|wähl|waehl|aussuch/i, 1)) { verworfen.push("vorgehen"); delete a.vorgehen; }
      // Die Wahl "selbst oder drei" gibt es erst nach der Lage; vorher ist
      // "erst mal schauen" die Antwort auf "schauen oder klaeren" (weiter)
      // Wer gleich im ersten Satz "such mir drei raus" schreibt, hat die
      // Frage schon beantwortet. Vor der Lage gilt sie noch nicht (die
      // Person soll erst wissen, was es gibt), sie wird aber gemerkt -
      // sonst wird sie danach gefragt, was sie laengst gesagt hat.
      if (a.vorgehen && !kern.lauf.gesuchtMit) { kern.lauf.vorgehenFrueh = a.vorgehen; verworfen.push("vorgehen (vor der Lage)"); delete a.vorgehen; }
      if (a.weiter && kern.lauf.gesuchtMit) { delete a.weiter; }
      if (verworfen.length) kern.notieren("egal_verworfen", { felder: verworfen });
      if (a.zielOffen !== undefined && !p.zielId) setze("zielOffen", !!a.zielOffen);
      // Reiseart ("hauptsache warm", "ans Meer"): nur mit passendem Wort der
      // Person, dann bleiben nur die Regionen dieser Art in der Suche
      if (a.richtung && typeof Politik !== "undefined") {
        const th = (Politik.THEMEN || []).find((t) => t.id === a.richtung);
        const woerter = th ? [...(th.woerter || []), th.id] : [];
        if (th && gesagt(new RegExp(woerter.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i"), 99)) {
          setze("richtung", th.id);
          p.zieleErlaubt = Werkzeugkasten.regionenFuerRichtung(th, p);
          if (!p.zielId) p.zielOffen = true;
          Werkzeugkasten.richtungAnsagen(kern, p);
        } else kern.notieren("richtung_verworfen", { richtung: a.richtung });
      }
      /* "Mir reicht es, wenn es 20 Grad sind."
         ----------------------------------------------------------------
         Wunsch des Nutzers am 30.09.2026: Nachdem der Agent gesagt hat,
         welche Regionen er als warm zaehlt und wie warm es dort ist, soll
         die Person die Grenze verschieben koennen. Damit ist "warm" keine
         feste Liste mehr, sondern eine Schwelle im gewaehlten Monat. */
      if (a.mindestGrad != null && gesagt(/grad|°/i, 1)) {
        const g = Math.round(Number(a.mindestGrad));
        if (Number.isFinite(g) && g >= -20 && g <= 45) {
          setze("mindestGrad", g);
          if (p.richtung && typeof Politik !== "undefined") {
            const th2 = (Politik.THEMEN || []).find((t) => t.id === p.richtung);
            if (th2) {
              p.zieleErlaubt = Werkzeugkasten.regionenFuerRichtung(th2, p);
              geaendert.push("zieleErlaubt");
              Werkzeugkasten.richtungAnsagen(kern, p);
            }
          }
        }
      }
      if (a.weiter) { setze("weiter", a.weiter); kern.notieren("weiter", { wahl: a.weiter }); }
      // Ein Monat nur, wenn die Person einen genannt hat (oder eine
      // Jahreszeit) - auf "hauptsache warm" hatte das Modell Oktober gesetzt
      // Eine Jahreszeit ("im Winter") ist noch kein Monat - dann fragt der
      // Agent nach dem Monat; "egal" darf er selbst aufloesen
      if (a.monat && !p.monat && !gesagt(/januar|februar|märz|maerz|april|\bmai\b|juni|juli|august|september|oktober|november|dezember|\bjan\b|\bfeb\b|\bokt\b|\bnov\b|\bdez\b|ostern|pfingsten|weihnachten|silvester|nächsten monat|naechsten monat|\d{1,2}\.\s*\d{1,2}\.|\d{4}-\d{2}|egal|gleich|such du|du entscheid|dein vorschlag|nimm/i)) {
        kern.notieren("monat_verworfen", { monat: a.monat }); delete a.monat;
      }
      /* "In zwei Monaten" rechnet der Kern selbst aus - siehe
         relativerMonat. Das steht hinter der Pruefung oben, weil es
         keine Aufnahme aus dem Modell ist, sondern eine eigene: Die
         Angabe kommt von der Person, nur eben ohne Monatsnamen. */
      const relativ = Werkzeugkasten.relativerMonat(
        kern.lauf.gespraech.filter((n) => n.role === "user").slice(-1)[0]?.content || "");
      if (relativ && !p.monat) {
        a.monat = relativ;
        kern.lauf.monatRelativ = true;
        kern.notieren("monat_relativ", { monat: relativ });
      }
      setze("monat", a.monat);
      /* "Im Sommer." - "Juni, Juli oder August?" - "Egal."
         ----------------------------------------------------------------
         Am 27.09.2026 gemeldet: Danach fragte der Agent noch einmal. Das
         Modell sollte den ersten Monat der Jahreszeit nehmen, tat es
         nicht zuverlaessig, und selbst wenn - der erste Monat ist eine
         willkuerliche Wahl ohne Begruendung.

         Die Entscheidung gehoert jetzt dem Kern, nicht dem Modell: Er
         rechnet die drei Monate durch, nimmt den besten und sagt, woran
         es lag. Damit ist die Frage in jedem Fall erledigt, und die
         Person weiss, worauf sie widersprechen koennte. */
      if (!a.von && !p.von) {
        const jz = Werkzeugkasten.jahreszeitGenannt(kern.lauf);
        /* Der Kern entscheidet auch dann, wenn das Modell schon geraten hat.
           --------------------------------------------------------------
           Im ersten Anlauf stand hier `!a.monat`, und die Regel lief nie:
           Das Modell hatte auf "Egal" laengst Juli eingetragen. Im Chat
           stand dann "im Juli" - ohne ein Wort dazu, woher der Juli kam.
           Genau der Fall, den der Nutzer gemeldet hat.

           Wer die Wahl abgibt, bekommt sie also vom Kern getroffen, nicht
           vom Modell: mit gerechnetem Ergebnis und mit Begruendung. Hat
           die Person selbst einen Monat genannt, bleibt der stehen - dann
           greift die Regel nicht. */
        const monatGenannt = gesagt(/januar|februar|märz|maerz|april|\bmai\b|juni|juli|august|september|oktober|november|dezember|\bjan\b|\bfeb\b|\bokt\b|\bnov\b|\bdez\b|ostern|pfingsten|weihnachten|silvester/i, 1);
        // Das Modell urteilt, das Muster faengt auf, was es uebersieht
        const abgegeben = a.monatUeberlassen === true
          || gesagt(/egal|gleich|such du|suchst du|du entscheid|dein vorschlag|nimm du|nimm einfach|weißt du|weisst du|was (du )?meinst|keine ahnung|weiß nicht|weiss nicht|wie du meinst|aussuchen|überlass|ueberlass|meisten|g[üu]nstigst|billigst|besten preis|beste[nr]? monat|am wenigsten|wo.*(frei|verf[üu]gbar|auswahl|m[öo]glichkeit)/i, 1);
        /* Ohne genannte Jahreszeit die naechsten vier Monate.
           --------------------------------------------------------------
           "Such du den guenstigsten Monat aus" ohne weitere Angabe waere
           sonst eine Sackgasse: kein Kandidatenfeld, also keine Wahl, also
           dieselbe Frage noch einmal. Vier Monate ab dem naechsten sind
           ein Zeitraum, den man ueberblickt, und decken jede Jahreszeit
           mindestens zur Haelfte ab. */
        const naechste4 = () => Array.from({ length: 4 }, (_, i) => ((new Date().getMonth() + 1 + i) % 12) + 1);
        const kandidatenMonate = jz ? jz.monate : naechste4();
        /* "Gerne im Sommer" ist eine Angabe, keine Abgabe.
           --------------------------------------------------------------
           Am 28.09.2026 setzte der Kern darauf sofort Juni und fragte nie
           nach dem Monat. Ursache war das Feld monatUeberlassen, das ich
           tags zuvor eingebaut hatte: Das Modell setzte es schon bei der
           Nennung der Jahreszeit, und der Kern entschied daraufhin.

           Wer eine Jahreszeit nennt, hat gerade etwas gesagt - und
           bekommt die Frage nach dem Monat. Erst die ANTWORT darauf kann
           eine Abgabe sein. Deshalb zaehlt die Abgabe nur, wenn die
           Jahreszeit nicht in derselben Nachricht steht. */
        const jahreszeitJetztGenannt = gesagt(/sommer|winter|herbst|frühling|fruehling|frühjahr|fruehjahr/i, 1);
        /* Ein genanntes Datum ist erst recht eine Angabe.
           --------------------------------------------------------------
           Nutzer am 29.09.2026: "boah gerne spaetestens am 03.12" - danach
           stand Oktober im Kasten und die Frage kam noch einmal. Das
           Modell hatte monatUeberlassen gesetzt, weil es die Frist nirgends
           ablegen konnte, und der Kern waehlte daraufhin selbst. Wer ein
           Datum nennt, hat geantwortet; dieselbe Regel wie bei der
           Jahreszeit. */
        const datumJetztGenannt = gesagt(Werkzeugkasten.TAG, 1);
        if (abgegeben && !jahreszeitJetztGenannt && !datumJetztGenannt && !monatGenannt && !p.vonPerson?.monat) {
          /* Sichtbar vergleichen, wenn er die Seite bedienen darf.
             ------------------------------------------------------------
             Der Kern koennte das Ergebnis in einer Millisekunde aus dem
             Katalog holen - und genau das war der Einwand des Nutzers:
             Man sieht es nicht. Also stellt der Agent die Liste selbst auf
             jeden Monat um, scrollt durch und sagt je Monat eine Zeile;
             entschieden wird danach, mit denselben Zahlen.

             Ohne Freigabe fuer die Seite bleibt die stille Rechnung. Sie
             ist dann nicht schlechter als vorher, nur unsichtbar - und
             eine Entscheidung ohne Begruendung waere das Schlechtere. */
          if (kern.darf("suchen") && STELLSCHRAUBEN.monatsvergleich !== false) {
            // Vorlaeufig der erste Monat, damit ueberhaupt gesucht werden
            // kann. Der Vergleich laeuft danach und entscheidet endgueltig.
            if (!p.monat) { p.monat = kandidatenMonate[0]; kern.standAnzeigen(); }
            kern.lauf.monatsvergleich = { monate: kandidatenMonate.slice(), entscheiden: true };
            kern.notieren("monatsvergleich_angesetzt", { jahreszeit: jz?.name || null, monate: kandidatenMonate });
          } else {
            const w = Werkzeugkasten.monatWaehlen(p, kandidatenMonate);
            // Nicht ueber setze(): Der Monat kommt vom Kern, nicht von der
            // Person - in vonPerson hat er nichts zu suchen.
            if (w && p.monat !== w.monat) { p.monat = w.monat; kern.standAnzeigen(); }
            if (w) {
              Werkzeugkasten.ableiten(kern, "monat", w.satz);
              kern.notieren("monat_abgeleitet", { jahreszeit: jz?.name || null, monat: w.monat, haeuser: w.anzahl, schnitt: w.schnitt });
            }
          }
        }
      }
      // Feste Daten nur, wenn die Person einen Tag genannt hat. Aus "im
      // Oktober" machte das Modell sonst einen Zeitraum - und die Maske
      // zeigte Daten, die nie jemand gesagt hat.
      if (a.von && a.bis) {
        /* Ein Zeitraum, der nicht in den gemerkten Monat gehoert, wird
           nicht uebernommen.
           --------------------------------------------------------------
           Gemeldet am 02.10.2026: Gesucht war Juni, im Stand standen
           danach der 1. bis 8. November. Der Monat kommt aus `p.monat`
           und kann das nicht gewesen sein - es war ein Wert des Modells,
           den niemand gegen den Rest gehalten hat. Hat die Person den
           anderen Monat selbst genannt, greift die Regel nicht: dann
           steht er oben ohnehin schon. */
        const monatDesDatums = new Date(a.von).getMonth() + 1;
        const passtZumMonat = !p.monat || !Number.isFinite(monatDesDatums) || monatDesDatums === p.monat;
        if (!passtZumMonat) {
          kern.notieren("datum_anderer_monat", { von: a.von, bis: a.bis, monat: p.monat });
          delete a.von; delete a.bis;
        } else if (gesagt(/\b\d{1,2}\.\s*(\d{1,2}\.|[a-zäöü]{3,})|\d{4}-\d{2}-\d{2}|\b(vom|ab|am)\s+\d{1,2}\b/i)) {
          setze("von", a.von); setze("bis", a.bis);
          const n = Math.round((new Date(a.bis) - new Date(a.von)) / 86400000);
          /* Eine Dauer, die die Person selbst genannt hat, wird nicht aus
             einem Zeitraum neu gerechnet. Genau so wurden aus zwoelf
             Naechten sieben. */
          if (n > 0 && n < 60 && !a.naechte && !p.vonPerson?.naechte) setze("naechte", n);
          else if (n > 0 && n !== p.naechte && p.vonPerson?.naechte) {
            kern.notieren("dauer_nicht_ueberschrieben", { gesagt: p.naechte, ausZeitraum: n });
          }
          if (!a.monat) setze("monat", new Date(a.von).getMonth() + 1);
        } else {
          /* Das Datum gilt nicht - dann darf auch sein Monat nicht gelten,
             wenn die Person laengst einen genannt hat. Hier stand
             `if (!a.monat)`, und das prueft nur das Modell, nicht den
             Stand: Ein erfundener Novembertermin konnte so einen
             genannten Juni ueberschreiben. */
          kern.notieren("datum_verworfen", { von: a.von, bis: a.bis });
          if (!a.monat && !p.monat) setze("monat", new Date(a.von).getMonth() + 1);
          else if (!a.monat && p.monat && new Date(a.von).getMonth() + 1 !== p.monat) {
            kern.notieren("monat_nicht_ueberschrieben", { gemerkt: p.monat, ausDatum: new Date(a.von).getMonth() + 1 });
          }
        }
      }
      // Ohne feste Daten wird flexibel im Monat gesucht - keine Entscheidung
      // des Modells, sondern die einzige Lesart von "im Oktober"
      p.flexibel = !(p.von && p.bis);
      if (a.naechte && !p.naechte && !gesagt(/\d|woche|tage|nächte|naechte|übernacht|uebernacht|wochenende|lang|kurz|eine|zwei|drei|vier|fünf|fuenf|sechs|sieben|acht|neun|zehn|zwölf|zwoelf|vierzehn/i)) {
        kern.notieren("naechte_verworfen", { naechte: a.naechte }); delete a.naechte;
      }
      setze("naechte", a.naechte);
      // Zahlen zu den Reisenden nur, wenn die Person eine genannt hat - aus
      // "mit den Kindern" wurden sonst zwei Kinder
      const ZAHL = /\d|\b(ein|eine|einem|einen|zwei|drei|vier|fünf|fuenf|sechs|sieben|acht|zweit|dritt|viert|fünft|fuenft|sechst|kein|keine|ohne|allein|alleine|beide|zwilling|sohn|tochter|frau|mann|freundin|freund|partner|eltern|paar|erwachsene)\b/i;
      for (const f of ["personenGesamt", "erwachsene", "kinder"]) {
        if (a[f] != null && p[f === "personenGesamt" ? "personen" : f] == null && !gesagt(ZAHL, 1)) { kern.notieren("reisende_verworfen", { feld: f, wert: a[f] }); delete a[f]; }
      }
      /* "4 oder mehr" ist keine Vier.
         ----------------------------------------------------------------
         Der Chip hiess bis zum 29.09.2026 "4 oder mehr", sein Text ging
         als Nachricht in den Chat, und das Modell nahm die einzige Zahl,
         die dastand. Im Kasten stand danach "4 Personen", ohne dass
         jemand das gesagt haette. Die Mengenangabe hat kein Feld, also
         darf die Zahl daneben nicht gelten - gefragt wird noch einmal.
         Faengt auch den Freitext "wir sind mindestens vier". */
      if (a.personenGesamt != null && gesagt(/oder mehr|mehr als|mindestens|aufwärts|aufwaerts|\bab \d/i, 1)) {
        kern.notieren("menge_unklar", { wert: a.personenGesamt });
        delete a.personenGesamt;
      }
      setze("personen", a.personenGesamt);
      setze("erwachsene", a.erwachsene); setze("kinder", a.kinder);
      // Das Alter der Kinder weiss nur die Person. Aus "mein suesser Bengel"
      // machte das Modell sonst ein einjaehriges Kind.
      if (Array.isArray(a.kinderAlter) && !(p.kinderAlter || []).length
        && !gesagt(/\d|\bjahr|jährig|jaehrig|baby|säugling|saeugling|kleinkind|schulkind|teenager|monate/i, 2)) {
        kern.notieren("alter_verworfen", { alter: a.kinderAlter }); delete a.kinderAlter;
      }
      if (Array.isArray(a.kinderAlter)) setze("kinderAlter", a.kinderAlter.filter((x) => Number.isInteger(x) && x >= 0 && x < 18).slice(0, 6));
      // Rechnen tut der Kern, nicht das Modell: "zu viert" und "2 Kinder"
      // ergibt 2 Erwachsene, ohne Nachfrage
      if (p.personen != null) {
        if (p.kinder != null && p.erwachsene == null) { p.erwachsene = Math.max(1, p.personen - p.kinder); geaendert.push("erwachsene"); }
        else if (p.erwachsene != null && p.kinder == null) { p.kinder = Math.max(0, p.personen - p.erwachsene); geaendert.push("kinder"); }
        /* Wer allein reist, reist ohne Kinder.
           --------------------------------------------------------------
           Am 28.09.2026 antwortete jemand auf "Wie viele seid ihr?" mit
           "1" und bekam zurueck: "Du reist also allein. Sind von den 1
           Kinder dabei?" - mit den Vorschlaegen "Ein Kind" und "Zwei
           Kinder". Das ist keine Ungeschicklichkeit im Satzbau, sondern
           eine Frage, die es nicht geben kann: Bei einer Person ist die
           Aufteilung bereits entschieden. Ein Kind bucht keine Reise. */
        else if (p.personen === 1 && p.erwachsene == null && p.kinder == null) {
          p.erwachsene = 1; p.kinder = 0;
          geaendert.push("erwachsene", "kinder");
        }
      }
      // "Meine Frau und ich", "zu zweit", "allein": ohne ein Wort zu Kindern
      // sind keine dabei - das fragt man nicht nach
      // Kosewoerter fuer Kinder. "Mein suesser Bengel" wurde sonst erst zu
      // einem einjaehrigen Kind und dann zu einem dritten Erwachsenen.
      // "familienhotel", "familienzimmer", "familienfreundlich" sind
      // Merkmale des Hauses, keine Aussage ueber Mitreisende - sonst fragte
      // der Agent nach "kein Familienhotel bitte" wieder nach den Kindern
      const KIND_WORT = /\bkind|sohn|tochter|baby|kids|jährig|jaehrig|\bfamilie\b|familienurlaub|familienreise|enkel|bengel|spross|sprössling|sproessling|racker|zwerg|wurm|nachwuchs|sohnemann|töchterchen|toechterchen|\bjunge\b|\bmädchen\b|\bmaedchen\b|kleine[rn]?\b|kurze[rn]?\b/i;
      const kindGesagt = gesagt(KIND_WORT, 2);
      // Eine schon geklaerte Zahl wird nie wieder aufgemacht
      if (kindGesagt && p.kinder == null && !(a.kinder > 0)) {
        // Ein Kind ist im Spiel, aber wie viele und wie alt, weiss nur die
        // Person - beide Zahlen bleiben offen, der Fahrplan fragt nach
        if (a.kinder === 0) delete a.kinder;
        if (a.erwachsene != null && !gesagt(/\d|zwei|drei|vier|fünf|fuenf|erwachsene/i, 1)) delete a.erwachsene;
        p.kinder = null;
        kern.notieren("kind_erkannt", {});
      }
      const paarGesagt = gesagt(/\bmein(e|er|em)?\s+(frau|mann|freundin|freund|partnerin|partner|eltern)\b|wir beide|zu zweit|allein|alleine|nur ich|\bpaar\b|erwachsene/i)
        && !kindGesagt;
      if (p.erwachsene != null && p.kinder == null && a.erwachsene != null && paarGesagt) { p.kinder = 0; geaendert.push("kinder"); }
      if (p.personen != null && p.erwachsene == null && p.kinder == null && a.personenGesamt != null && paarGesagt) { p.erwachsene = p.personen; p.kinder = 0; geaendert.push("erwachsene", "kinder"); }
      if (p.erwachsene != null && p.kinder != null) p.personen = p.erwachsene + p.kinder;
      if (p.kinder === 0) p.kinderAlter = [];
      if (p.kinder > 0 && (p.kinderAlter || []).length > p.kinder) p.kinderAlter = p.kinderAlter.slice(0, p.kinder);
      if (a.typ) { setze("typ", a.typ); p.artGenannt = true; p.artEgal = false; }
      /* "Ist mir egal" hiess bisher "dann Hotels".
         ----------------------------------------------------------------
         Hier stand `if (p.artEgal && !p.typ) p.typ = "hotel"` - der Agent
         suchte also in der Haelfte des Angebots weiter und sagte nichts
         dazu. Seit es den gemeinsamen Reiter gibt, bleibt typ leer und
         beides steht nebeneinander. */
      if (a.artEgal !== undefined && !p.artGenannt) { setze("artEgal", !!a.artEgal); if (p.artEgal) delete p.typ; }
      setze("zimmer", a.zimmer);
      // Geld gilt so, wie die Person es gesagt hat.
      // ------------------------------------------------------------------
      // "Insgesamt maximal 900 Euro fuers Hotel" wurde vom Modell in 225
      // Euro pro Nacht umgerechnet; die Umdeutung machte daraus ein
      // Gesamtbudget von 225, der Filter landete bei 48 Euro und es blieb
      // ein einziges Haus uebrig. Gerechnet wird deshalb nicht mehr: Der
      // Betrag aus der Nachricht zaehlt, und die Worte entscheiden, ob er
      // fuer die Nacht oder fuer den ganzen Aufenthalt gilt.
      /* Welche Lesart, entscheidet der Kern - mit derselben Regel, die
         auch gilt, wenn er den Betrag selbst aus der Antwort liest
         (`preisDeutung`). Vorher brauchte die Gesamt-Lesart ein Wort wie
         "insgesamt"; ein blankes "5000 Euro" blieb beim Modell, und das
         machte daraus 5.000 Euro pro Nacht - gemeldet am 02.10.2026.
         Jetzt entscheidet bei fehlendem Wort die Hoehe gegen die Daten. */
      if (a.maxPreis || a.budgetGesamt) {
        const letzteTexte = (kern.lauf.gespraech || []).filter((n) => n.role === "user").slice(-1).map((n) => String(n.content)).join(" ");
        const wert = Werkzeugkasten.betragAusText(letzteTexte);
        const deutung = wert ? Werkzeugkasten.preisDeutung(wert, letzteTexte, p) : null;
        if (wert && deutung) {
          const anders = deutung.feld === "budgetGesamt" ? !!a.maxPreis : !!a.budgetGesamt;
          const zahlAnders = (a[deutung.feld] || null) !== wert;
          if (anders || zahlAnders) {
            kern.notieren("preis_gedeutet", { gesagt: wert, feld: deutung.feld, grund: deutung.grund,
              modellMaxPreis: a.maxPreis || null, modellBudget: a.budgetGesamt || null });
          }
          if (deutung.feld === "budgetGesamt") { a.budgetGesamt = wert; delete a.maxPreis; }
          else { a.maxPreis = wert; delete a.budgetGesamt; }
        }
      }
      setze("maxPreis", a.maxPreis); setze("budgetGesamt", a.budgetGesamt);
      if (a.maxPreis || a.budgetGesamt) p.preisEgal = false;
      if (a.maxStrandMeter != null) setze("maxStrand", Math.round(a.maxStrandMeter) / 1000);
      setze("mindestbewertung", a.mindestbewertung); setze("mindestSterne", a.mindestSterne);
      // Der Anreisetag nur, wenn die Person einen Tag genannt hat - das
      // Modell setzte sonst schon beim "Zur Buchung" den 12. ein
      if (a.anreise && !gesagt(Werkzeugkasten.TAG)) {
        kern.notieren("anreise_verworfen", { anreise: a.anreise }); delete a.anreise;
      }
      /* Monat und Jahr kommen aus der Suche, nicht vom Modell - aus "16.
         Okt." wurde sonst gern der 16. des laufenden Monats.
         ------------------------------------------------------------------
         Der Tag wird aber nur dann in den gesuchten Monat gesetzt, wenn er
         auch dorthin gehoert. Nennt das Modell einen Tag in einem anderen
         Monat, war das bisher ein stilles Verschieben: Aus dem 1. November
         wurde der 1. Juni, ohne dass jemand davon erfuhr. Jetzt faellt der
         Wert weg, und wenn die Person wirklich einen anderen Monat meint,
         fragt der Kern danach (datumWiderspruch). */
      if (a.anreise) {
        const fw = Werkzeugkasten.flexWahl(p);
        const roh = String(a.anreise);
        const tag = parseInt(roh.slice(-2), 10);
        const monatDesTages = /^\d{4}-\d{2}-\d{2}$/.test(roh) ? new Date(roh).getMonth() + 1 : null;
        if (p.monat && monatDesTages && monatDesTages !== p.monat) {
          kern.notieren("anreise_anderer_monat", { anreise: roh, monat: p.monat });
          delete a.anreise;
        } else if (fw && tag >= 1 && tag <= 31) {
          a.anreise = `${fw.monat}-${String(tag).padStart(2, "0")}`;
        }
      }
      /* Fristen: nur, wenn in der Nachricht auch ein Datum steht.
         ----------------------------------------------------------------
         Dieselbe Regel wie beim Anreisetag - sonst traegt das Modell eine
         Grenze ein, die niemand genannt hat. Der Monat wird daraus
         abgeleitet, und die Ableitung wird gesagt, nicht stillschweigend
         gemacht. */
      for (const f of ["anreiseBis", "anreiseAb"]) {
        if (a[f] && !gesagt(Werkzeugkasten.TAG)) { kern.notieren("frist_verworfen", { feld: f, wert: a[f] }); delete a[f]; }
      }
      setze("anreiseBis", a.anreiseBis); setze("anreiseAb", a.anreiseAb);
      Werkzeugkasten.fristAbleiten(kern, p);
      setze("anreise", a.anreise);
      /* Aus dem genannten Tag werden feste Reisedaten.
         ----------------------------------------------------------------
         Bis zum 23.09.2026 blieb die Suche flexibel im Monat, auch wenn
         der Anreisetag feststand. Wer dann eine Empfehlung anklickte,
         stand auf der Hausseite vor einem gesperrten Buchungsknopf: "Im
         ganzen Monat frei, fuer die Buchung brauchen wir den Tag." Der
         Tag war laengst gesagt, nur nicht in der Suche. Jetzt traegt ihn
         die Maske, und alles dahinter rechnet mit echten Daten. */
      /* Auch wenn schon Daten stehen: Nennt die Person spaeter einen
         anderen Tag, muss der gelten. Bis zum 25.09.2026 stand hier
         `!(p.von && p.bis)`, und weil der Kern nach zwei vergeblichen
         Anlaeufen selbst einen Tag annimmt, wurde dann der 1. gebucht,
         obwohl "am 8. August" im Chat stand. Eine Annahme darf eine
         Aussage nie schlagen. */
      if (p.anreise && p.naechte && (!(p.von && p.bis) || p.von !== p.anreise)) {
        const ab = new Date(p.anreise);
        if (!Number.isNaN(ab.getTime())) {
          p.von = p.anreise;
          p.bis = new Date(ab.getTime() + p.naechte * 86400000).toISOString().slice(0, 10);
          p.flexibel = false;
          geaendert.push("von", "bis");
          kern.notieren("zeitraum_aus_anreise", { von: p.von, bis: p.bis });
        }
      }
      for (const f of ["preisEgal", "bewertungEgal", "strandEgal", "verpflegungEgal", "ausstattungEgal"]) if (a[f] !== undefined) setze(f, !!a[f]);
      /* "Geld ist egal" muss die Grenze wirklich wegnehmen.
         ----------------------------------------------------------------
         Am 30.09.2026 im Testlauf: Die Person sagte "ok geld ist egal",
         der Kern setzte preisEgal - und rechnete weiter mit den 45 Euro
         von vorher, weil `maxPreis` stehen blieb. Danach fand er
         weiterhin nichts und fragte dieselbe Frage noch einmal. Ein
         Flag, das nichts loescht, ist kein Flag, sondern eine Notiz. */
      if (p.preisEgal && (p.maxPreis || p.budgetGesamt)) {
        delete p.maxPreis; delete p.budgetGesamt;
        geaendert.push("maxPreis", "budgetGesamt");
        kern.notieren("preis_geloest", {});
      }
      /* "45 Euro pro Nacht pro Person" mal der Gruppe.
         ----------------------------------------------------------------
         Die Seite rechnet je Zimmer, die Person denkt je Kopf. Ohne die
         Umrechnung sucht der Agent bei vier Reisenden mit einem Viertel
         des Budgets - und findet nichts. Gesagt wird es auch, denn es ist
         eine Transferleistung. */
      /* Geprueft wird der Satz der Person, nicht das Feld des Modells.
         ----------------------------------------------------------------
         Den Betrag kann entweder das Modell setzen (haeufig: "45 Euro"
         ohne "hoechstens" faengt kein Muster) oder der Textleser in
         politik.js. Wer hier nur auf ein Feld schaut, deckt einen der
         beiden Wege nicht ab - also steht die Frage dort, wo beide
         vorbeikommen. */
      const proPerson = gesagt(/pro person|je person|pro kopf|pro nase|\bp\.\s?p\.|pro erwachsene[mn]?\b/i, 1);
      if (proPerson && (p.maxPreis || p.budgetGesamt)) {
        const koepfe = (p.erwachsene || 0) + (p.kinder || 0) || p.personen || 0;
        if (koepfe > 1 && !kern.lauf.preisProPersonGesagt) {
          kern.lauf.preisProPersonGesagt = true;
          const feld = p.maxPreis ? "maxPreis" : "budgetGesamt";
          const einzeln = p[feld];
          p[feld] = einzeln * koepfe;
          geaendert.push(feld);
          Werkzeugkasten.ableiten(kern, feld,
            `${einzeln} € pro Person, bei ${koepfe} Reisenden rechne ich also mit ${p[feld]} €${feld === "maxPreis" ? " pro Nacht" : " insgesamt"}.`);
        }
      }
      // Nur reduzierte Haeuser - ein Wunsch wie jeder andere, kein "egal"
      if (a.nurAngebote !== undefined) { if (p.nurAngebote !== !!a.nurAngebote) geaendert.push("nurAngebote"); p.nurAngebote = !!a.nurAngebote; }
      if (a.wlanInklusive !== undefined) { if (p.wlanInklusive !== !!a.wlanInklusive) geaendert.push("wlanInklusive"); p.wlanInklusive = !!a.wlanInklusive; }
      if (Array.isArray(a.wuensche)) {
        const ALIAS = { strand: "strandnah", meer: "strandnah", beach: "strandnah", kids: "kinderclub", kinder: "familie", spa: "wellness", bewertungen: "bewertung", essen: "essen" };
        // Ein Wunsch zaehlt nur, wenn die Person ein passendes Wort gesagt
        // hat (Wortlisten der Kriterien) - sonst wurde aus "warm" Strand und Pool
        const alt = new Set((p.kriterien || []).map((k) => k.id));
        const ids = [...new Set(a.wuensche.map((w) => ALIAS[String(w).toLowerCase()] || String(w).toLowerCase()))]
          .filter((w) => typeof Politik !== "undefined" && Politik.kriterium(w))
          .filter((w) => alt.has(w) || gesagt(new RegExp((Politik.kriterium(w).woerter || [w]).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i"), 99));
        /* Was die Seite nicht kann, wird gesagt - nicht verschluckt.
           --------------------------------------------------------------
           Gemeldet am 02.10.2026: "Wir muessen unseren Hund mitnehmen
           koennen. Und ich wuerde gerne in die Naehe von einem Weinfeld."
           Darauf kam "Gibt es sonst noch etwas, worauf ich achten soll?" -
           kein Wort dazu, dass das eine geht und das andere nicht. Wer
           einen Wunsch nennt und keine Antwort bekommt, nimmt an, er sei
           beruecksichtigt. */
        const unbekannt = [...new Set(a.wuensche.map((w) => String(w).trim()).filter(Boolean))]
          .filter((w) => {
            const id = ALIAS[w.toLowerCase()] || w.toLowerCase();
            return !(typeof Politik !== "undefined" && Politik.kriterium(id));
          });
        if (unbekannt.length) {
          kern.lauf.wunschOhneFeld = unbekannt.slice(0, 3);
          kern.notieren("wunsch_ohne_feld", { wuensche: unbekannt.slice(0, 3) });
        }
        p.kriterien = ids.map((id) => ({ id, gewicht: 1 }));
        geaendert.push("wuensche");
        for (const id of ids) {
          const k = Politik.kriterium(id);
          if (k?.filter?.maxStrand && p.maxStrand == null) p.maxStrand = k.filter.maxStrand;
        }
      }
      if (Array.isArray(a.ausstattung)) {
        /* Jedes Merkmal braucht ein Wort der Person.
           --------------------------------------------------------------
           Bis zum 02.10.2026 brauchte nur "direkt am Strand" einen Beleg,
           alles andere setzte das Modell frei. Gemeldet an diesem Tag: In
           der Uebersicht stand "Muss Parkplatz", und der Nutzer hatte nie
           von einem Parkplatz gesprochen - er hatte einen Hund erwaehnt.
           Ein Filter, den niemand gewollt hat, wirft Haeuser heraus, ohne
           dass jemand davon erfaehrt.

           Und andersherum: "Wir muessen unseren Hund mitnehmen koennen"
           war filterbar (petsAllowed steht an jedem Haus), stand aber
           nicht in der Liste und fiel deshalb unter den Tisch. Jetzt
           steht es drin. */
        const WORT = {
          pool: /pool|schwimmbad|schwimmen|baden/i,
          spa: /spa|wellness|sauna|massage|therme/i,
          kidsClub: /kinderclub|kinderbetreuung|animation|betreuung|miniclub/i,
          familyFriendly: /famili|kinderfreundlich|mit (den )?kindern|kindgerecht/i,
          beachfront: /direkt am strand|erste reihe|strandlage|am strand liegen|direkt ans meer|direkt am meer/i,
          parking: /parkplatz|parken|stellplatz|garage|mit dem auto|eigenen wagen|mietwagen/i,
          restaurant: /restaurant|essen im haus|abendessen|halbpension|vollpension|kueche im haus/i,
          gym: /fitness|\bgym\b|sport|trainieren|kraftraum/i,
          seaView: /meerblick|blick aufs meer|blick auf das meer|seeblick|aufs wasser/i,
          petsAllowed: /hund|haustier|katze|vierbeiner|tier mitnehmen|mit dem tier/i,
        };
        const ERLAUBT = Object.keys(WORT);
        const gewollt = a.ausstattung.filter((x) => ERLAUBT.includes(x));
        const ohneBeleg = gewollt.filter((x) => !gesagt(WORT[x], 99));
        if (ohneBeleg.length) kern.notieren("ausstattung_verworfen", { felder: ohneBeleg });
        p.ausstattung = gewollt.filter((x) => gesagt(WORT[x], 99));
        geaendert.push("ausstattung");
      }
      /* Reisende fuer die Buchungsstrecke - aber nur, wenn die Zahl aufgeht.
         ----------------------------------------------------------------
         Gemeldet am 02.10.2026: "neben mir noch, Liana Mielicki
         (12.03.2008) und Paul Behrendt (12.02.2004)". Drei Reisende, zwei
         Namen. Der Agent trug Paul in das zweite Feld, liess das dritte
         leer und fragte danach nach "der dritten Person, also von dir" -
         obwohl die Person im ersten Feld stand. Der Nutzer: "Da muss er
         direkt, bevor er irgendwas macht, einmal fragen."

         Also: Stimmt die Zahl nicht, wird nichts eingetragen. Der Kern
         merkt sich den Widerspruch und fragt mit der Rechnung. */
      if (Array.isArray(a.reisende) && a.reisende.length) {
        const namen = a.reisende.map((x) => String(x).trim()).filter(Boolean);
        const personen = (p.erwachsene || 0) + (p.kinder || 0);
        if (namen.length && personen && namen.length !== personen) {
          kern.lauf.namenUnklar = { genannt: namen, noetig: personen };
          kern.notieren("namen_unklar", { genannt: namen.length, noetig: personen });
        } else if (namen.length) {
          p.reisendeNamen = namen;
          geaendert.push("reisende");
          kern.lauf.namenUnklar = null;
        }
      }
      if (Array.isArray(a.geburtsdaten) && a.geburtsdaten.length) {
        const tage = a.geburtsdaten.map((x) => (/^\d{4}-\d{2}-\d{2}$/.test(String(x).trim()) ? String(x).trim() : ""));
        if (tage.some(Boolean)) { p.reisendeGeburt = tage; geaendert.push("geburtsdaten"); }
      }
      /* Die Zimmerwahl gilt nur, wenn es das Zimmer im gewaehlten Haus
         wirklich gibt - sonst stuende ein Name im Stand, den die Kasse
         nicht kennt. */
      if (a.zimmerTyp) {
        const haus = typeof getItemById === "function" ? getItemById(kern.lauf.gewaehlt) : null;
        const treffer = (haus?.rooms || []).find((r) => String(r.name).toLowerCase() === String(a.zimmerTyp).trim().toLowerCase());
        if (treffer) { setze("zimmerTyp", treffer.name); kern.lauf.zimmerGefragt = true; }
        else kern.notieren("zimmer_verworfen", { genannt: a.zimmerTyp, haus: kern.lauf.gewaehlt || null });
      }
      if (a.gepaeck) setze("gepaeck", a.gepaeck);
      setze("verpflegung", a.verpflegung);
      /* Ein Flug zur Ferienwohnung ist keine Frage des Wollens.
         ----------------------------------------------------------------
         Am 27.09.2026 fragte jemand bei einer Ferienwohnung nach einem
         Flug. Die Seite kennt das nicht. Der Agent probierte trotzdem
         etwas, klickte irgendwo und legte danach wortlos drei Vorschlaege
         vor - der Faden war weg.

         Die Grenze steht zwar im Stand fuer das Modell, aber eine Grenze,
         die nur als Hinweis existiert, wird irgendwann uebergangen.
         Deshalb sagt der Kern sie selbst, sobald das Thema aufkommt, und
         nimmt den Flug gar nicht erst auf. Danach geht es normal weiter -
         genau so wollte es der Nutzer: einen Satz, dann die naechste
         Frage. */
      if (p.typ === "apartment") {
        const letzte = (kern.lauf.gespraech || []).filter((n) => n.role === "user").slice(-1)
          .map((n) => String(n.content)).join(" ");
        const nachFlugGefragt = /\bflug\b|\bfliegen\b|\bfliege\b|\bflieg\b|\bfluege\b|\bflüge\b|\bhinflug\b|\babflug\b/i.test(letzte);
        if ((a.flug !== undefined || nachFlugGefragt) && !kern.lauf.flugGrenzeGesagt) {
          kern.lauf.flugGrenzeGesagt = true;
          kern.sagen("Zu Ferienwohnungen bietet Voyara leider keine Flüge an - das geht nur bei Hotels. Du kannst die Wohnung buchen und den Flug getrennt suchen, oder wir schauen doch nach einem Hotel.");
          kern.notieren("grenze_genannt", { was: "flug_ferienwohnung" });
        }
        delete a.flug; delete a.flugAb; delete a.flugKlasse; delete a.flugAbEgal;
        p.flug = false;
      }
      if (a.flug !== undefined) setze("flug", !!a.flug);
      /* "Hamburg oder Koeln, je nachdem was billiger ist."
         ----------------------------------------------------------------
         Bis zum 27.09.2026 stand hier ein Muster, das Staedtenamen zaehlte.
         Das versteht nichts: Es haette bei diesem Satz zurueckgefragt,
         welcher denn - obwohl die Person die Entscheidung gerade an den
         Agenten abgegeben hat. Das Verstehen gehoert dem Modell (Feld
         flugAbEgal), die Entscheidung dem Kern: Er nimmt die guenstigste
         Verbindung und sagt, welche. */
      if (a.flugAbEgal) { p.flugAbEgal = true; delete a.flugAb; }
      if (Array.isArray(a.flugAbAuswahl) && a.flugAbAuswahl.length && typeof Flug !== "undefined") {
        // Nur Flughaefen, die es gibt - ein Tippfehler darf die Auswahl
        // nicht auf null schrumpfen lassen
        const gueltig = a.flugAbAuswahl.map((x) => Flug.code(x)).filter(Boolean);
        /* Zwei genannte Flughaefen sind noch keine Abgabe.
           --------------------------------------------------------------
           Hier stand `p.flugAbEgal = true`: Wer "gerne Berlin oder
           Frankfurt" sagte, hatte damit angeblich die Wahl abgegeben, und
           der Kern nahm den guenstigeren. Nutzer am 30.09.2026: "Er hat
           wieder nur den erstgenannten genommen ... er soll sagen, du
           hast zwei Flughaefen genannt, auf welcher Basis soll ich mich
           entscheiden?"

           Jetzt merkt sich der Kern nur die Auswahl. Ob er selbst
           entscheiden darf, sagt weiterhin flugAbEgal - das setzt das
           Modell, wenn ein Kriterium dabeisteht ("je nachdem was billiger
           ist"). Sonst bleibt das Thema offen und er fragt, mit den
           Preisen beider Flughaefen als Entscheidungshilfe. */
        if (gueltig.length) { p.flugAbAuswahl = gueltig; geaendert.push("flugAbAuswahl"); }
      }
      /* "Beide behalten" ist eine Antwort, die kein Feld hat.
         ----------------------------------------------------------------
         Der Agent fragt bei zwei genannten Flughaefen, ob er auf den
         guenstigeren eingrenzen soll oder beide suchen. Sagt die Person
         "beide", ist das keine Wahl eines Flughafens, sondern die Wahl
         der Mehrfachsuche - und die steht seit dem 30.09.2026 auch in
         der Suchmaske zur Verfuegung. */
      if ((p.flugAbAuswahl || []).length > 1 && !a.flugAb
        && gesagt(Werkzeugkasten.MEHRERE_FLUGHAEFEN, 1)) {
        p.flugAb = p.flugAbAuswahl.join(",");
        p.flugAbEgal = false;
        geaendert.push("flugAb");
        kern.notieren("flughaefen_beide", { auswahl: p.flugAbAuswahl });
      }
      setze("flugAb", a.flugAb); setze("flugKlasse", a.flugKlasse);
      if (a.flugAb) p.flugAbEgal = false;
      if (a.flugAb && typeof Flug !== "undefined" && !Flug.code(a.flugAb)) { p.flugAb = null; geaendert.push("flugAb unbekannt"); }
      if ((a.flug !== undefined || a.flugAb || a.flugKlasse) && typeof Flug !== "undefined") {
        Flug.set({ mit: !!p.flug, ab: Flug.code(p.flugAb), klasse: p.flugKlasse || "economy" });
      }
      /* Zahl und Art aus dem Satz.
         ----------------------------------------------------------------
         "Such mir bitte 5 raus" und "hotel mit fruehstueck" trug das
         Modell nicht ein: Es legte die Verpflegung an und fragte danach,
         ob es ein Hotel sein soll - und legte drei statt fuenf Haeuser
         vor. Beides steht so klar im Satz, dass es nicht vom Modell
         abhaengen muss. */
      {
        const letzteNachricht = (kern.lauf.gespraech || []).filter((n) => n.role === "user").slice(-1).map((n) => String(n.content)).join(" ");
        const WORTZAHL = { zwei: 2, drei: 3, vier: 4, "fünf": 5, fuenf: 5, sechs: 6 };
        // Die Zahl muss zum Vorschlag gehoeren, nicht zu Naechten oder
        // Reisenden ("4 Naechte, zeig mir mal die Hotels" sind keine vier
        // Vorschlaege) - deshalb steht sie direkt davor oder direkt hinter
        // der Aufforderung.
        const m = letzteNachricht.match(/\b(\d|zwei|drei|vier|fünf|fuenf|sechs)\s+(?:(?:der|die|besten|beste|passende[nr]?|gute[nr]?)\s+){0,2}(?:vorschl\w*|h[äa]user|hotels|wohnungen|st[üu]ck|raus\w*)|\b(?:such|zeig|nenn|schlag)\w*\s+(?:(?:mir|uns|bitte|mal|die|besten)\s+){0,3}(\d|zwei|drei|vier|fünf|fuenf|sechs)\b/i);
        if (m && a.anzahlVorschlaege == null) {
          const roh = (m[1] || m[2] || "").toLowerCase();
          const n = WORTZAHL[roh] ?? parseInt(roh, 10);
          if (Number.isFinite(n) && n >= 2 && n <= 6) a.anzahlVorschlaege = n;
        }
        /* Ein beilaeufiges Wort ist keine Entscheidung - aber es zaehlt.
           --------------------------------------------------------------
           Hier wurde jedes Vorkommen von "Hotel" als Festlegung gewertet.
           Am 28.09.2026 schrieb der Nutzer "in dem Monat, in dem die
           meisten HOTELS frei sind" - gemeint war der Monat, gelesen
           wurde eine Entscheidung ueber die Unterkunftsart.

           Sein Vorschlag, und er ist besser als beides: nicht stumm
           setzen, aber auch nicht so tun, als haette man nichts gehoert.
           Der Agent merkt sich das Wort und fragt gezielt nach - "du
           hattest vorhin Hotel geschrieben, nur Hotels oder auch
           Ferienwohnungen?". Das ist eine Frage weniger ins Blaue und
           eine Festlegung weniger hinter dem Ruecken.

           Ist die Art gerade gefragt worden, ist "Hotel" natuerlich eine
           Antwort und keine Nebenbemerkung. */
        if (!a.typ && !p.artGenannt) {
          const antwortAufArt = kern.lauf.gefragt === "art";
          /* "Auch Ferienwohnungen" heisst beides, nicht nur Ferienwohnungen.
             --------------------------------------------------------------
             Gemeldet am 02.10.2026, dreimal hintereinander im selben
             Gespraech: "Auch Ferienwohnungen" - "Okay, ich suche also
             sowohl nach Hotels als auch nach Ferienwohnungen. Du hattest
             vorhin Ferienwohnung geschrieben, soll ich nur danach suchen
             oder auch nach Hotels?" - "Auch Hotels" - und wieder dieselbe
             Frage.

             Zwei Fehler griffen ineinander. Erstens las der Kern das Wort
             "Ferienwohnung" im Satz und setzte `typ` darauf, obwohl davor
             "auch" stand - die Antwort bedeutete das Gegenteil. Zweitens
             setzte das nichts, woran `fertig.art` haengt (artGenannt oder
             artEgal), also galt die Art weiter als offen, und die Antwort
             der Person wurde selbst zum Ausloeser der naechsten Frage:
             Ihr Wort landete in `artErwaehnt`.

             Jetzt zuerst auf "beides" pruefen, dann auf "nur", und in
             jedem Fall festhalten, dass entschieden wurde. */
          const beides = /\b(auch|beide[sn]?|sowohl|egal|alles)\b/i.test(letzteNachricht);
          const nennt = /\bhotels?\b/i.test(letzteNachricht) ? "hotel"
            : (/ferienwohnung|ferienhaus|fewo|apartment|appartement/i.test(letzteNachricht) ? "apartment" : null);
          if (nennt && beides) {
            if (antwortAufArt) { p.artEgal = true; p.artGenannt = true; delete p.typ; delete p.artErwaehnt; }
            else p.artErwaehnt = nennt;
          } else if (nennt) {
            if (antwortAufArt) { a.typ = nennt; p.artGenannt = true; delete p.artErwaehnt; }
            else p.artErwaehnt = nennt;
          } else if (antwortAufArt && beides) {
            // "Beides" allein, ohne das Wort - auch das ist eine Antwort
            p.artEgal = true; p.artGenannt = true; delete p.typ; delete p.artErwaehnt;
          }
        }
        // "ohne Flug" stand im Satz, kam aber nicht im Stand an - der Agent
        // fragte danach noch einmal nach dem Flug.
        if (a.flug === undefined && p.flug == null) {
          if (/ohne flug|kein flug|nicht fliegen|mit dem auto|fahren wir|selbst anreisen|eigene anreise/i.test(letzteNachricht)) a.flug = false;
          else if (/mit flug|flug dazu|fliegen wir|wir fliegen|flug mitbuchen/i.test(letzteNachricht)) a.flug = true;
        }
      }
      if (a.anzahlVorschlaege != null) {
        const n = Math.max(2, Math.min(6, a.anzahlVorschlaege));
        if (n !== p.anzahlVorschlaege) { setze("anzahlVorschlaege", n); kern.notieren("anzahl_vorschlaege", { anzahl: n }); }
      }
      if (a.beratung) { setze("beratung", a.beratung); kern.notieren("beratung", { wahl: a.beratung }); }
      if (a.vorgehen) { setze("vorgehen", a.vorgehen); kern.notieren("vorgehen", { wahl: a.vorgehen, freigabe: kern.freigabe(), anzahl: p.anzahlVorschlaege || 3 }); }
      /* Kein abgeleiteter Nachtpreis mehr.
         ----------------------------------------------------------------
         Hier wurde aus einem Gesamtbudget ein Preis pro Nacht gerechnet,
         damit der Agent den Nachtregler ziehen konnte. Die Rechnung liess
         Zimmer- und Verpflegungsaufschlag und den Flug weg, waehrend
         `Auswahl.pruefe` mit dem echten Gesamtpreis filtert. Die Folge war
         eine Liste, die weder zur Aussage noch zur Zaehlung passte. Seit
         es den Gesamtregler gibt, geht die Grenze dorthin, wo sie
         hingehoert. */
      kern.standAnzeigen();
      // Was gerade neu hereinkam - der Kern prueft danach, ob das Modell
      // es auch aufgenommen hat
      kern.lauf.zuletztGemerkt = [...new Set([...(kern.lauf.selbstGelesen || []), ...geaendert])];
      /* Was von der Person kommt, ist unantastbar.
         ----------------------------------------------------------------
         Am 27.09.2026 sagte jemand "Mit Flug", nannte auf die Frage nach
         dem Flughafen "Koeln oder Hamburg" und fragte dann "was meinst
         du?". Weil das Thema damit zweimal offen geblieben war, griff die
         Annahme - und die lautete fuer flugAb "dann lass den Flug weg".
         Der Agent ging auf die Seite und waehlte den Flug ab, den die
         Person ausdruecklich gewollt hatte.

         Der Fehler war nicht die eine Annahme, sondern dass Annahmen
         ueberhaupt etwas anfassen durften, das gesagt worden war. Jetzt
         steht in vonPerson, welche Felder aus dem Gespraech stammen, und
         keine Annahme schreibt darauf. */
      kern.lauf.nachrichtArt = ["antwort", "anweisung", "frage", "einwand", "unklar", "sonstiges"].includes(a.nachricht_art)
        ? a.nachricht_art : "antwort";
      p.vonPerson = p.vonPerson || {};
      for (const f of geaendert) p.vonPerson[f] = true;
      /* Was die Aenderung bewirkt, sagt der Kern - immer.
         ----------------------------------------------------------------
         Der Nutzer am 02.10.2026: "Wenn man eine Aenderung macht, muss er
         immer sagen, was das bedeutet. Ich habe gesagt, ab 18 Grad reicht
         mir. Und dann hat er gesagt, ja, das aendert die Auswahl, aber
         hat nicht gesagt, welche Regionen jetzt dazukommen. Das wuerde
         ich nicht nur auf die einzelnen Aspekte beziehen, die ich sage,
         sondern das muss insgesamt so sein."

         Fuer die Himmelsrichtung gab es das schon (`richtungKorrektur`,
         mit den Namen der Regionen). Fuer alles andere nicht - und "das
         aendert die Auswahl" ist keine Auskunft, sondern eine Floskel.
         Jetzt rechnet der Kern beide Staende durch und nennt die Zahl. */
      const aend = Werkzeugkasten.aenderungsSatz(p, vorStand, geaendert);
      if (aend) {
        kern.lauf.aenderungSatz = aend;
        kern.notieren("aenderung_erklaert", { felder: geaendert, satz: aend.slice(0, 120) });
      }
      kern.notieren("stand", { felder: geaendert });
      const fp = Werkzeugkasten.fahrplan(p, kern.lauf);
      // Eine Frage der Person geht vor: erst antworten, dann das Thema. Fragt
      // sie nach dem Angebot ("habt ihr was auf Kreta?"), liefert suchen die
      // Lage auch ohne die restlichen Eckdaten.
      const letzte = [...kern.lauf.gespraech].reverse().find((n) => n.role === "user")?.content || "";
      const frage = /\?\s*$|^(habt|gibt|wie|was|wo|wann|welche|ist|sind|kann|könnt|koennt|hat)\b/i.test(String(letzte).trim()) ? String(letzte).trim() : null;
      /* Zwei Monate auf einmal gehen nicht - und das muss er sagen.
         ----------------------------------------------------------------
         Gemeldet am 02.10.2026: "Ich haette gerne sowohl die Hotels fuer
         Juni als auch fuer August gesehen." Antwort: "Juni merke ich
         mir." Die Haelfte der Bitte verschwand wortlos. Die Seite sucht
         immer in einem Monat; das ist in Ordnung, aber es gehoert gesagt. */
      let zweiterMonat = null;
      {
        const letzteNachricht = (kern.lauf.gespraech || []).filter((n) => n.role === "user").slice(-1)
          .map((n) => String(n.content)).join(" ");
        const MON = ["januar", "februar", "märz|maerz", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "dezember"];
        const genannt = MON.map((m, i) => (new RegExp(`\\b(${m})\\b`, "i").test(letzteNachricht) ? i + 1 : null)).filter(Boolean);
        if (genannt.length > 1 && p.monat) {
          zweiterMonat = genannt.find((m) => m !== p.monat) || null;
          if (zweiterMonat) kern.notieren("zwei_monate_genannt", { gemerkt: p.monat, auch: zweiterMonat });
        }
      }
      const wunschOffen = kern.lauf.wunschOhneFeld || null;
      kern.lauf.wunschOhneFeld = null;
      return { ergebnis: { gemerkt: geaendert.length ? geaendert : "nichts Neues", stand: kern.standKurz(),
        ...(zweiterMonat && typeof MONATSNAMEN !== "undefined" ? { nurEinMonat: `Die Person hat zwei Monate genannt. Die Seite sucht immer nur in einem. Sag in einem Halbsatz, dass du mit ${MONATSNAMEN[p.monat - 1]} anfaengst und ${MONATSNAMEN[zweiterMonat - 1]} danach ansehen kannst - verschweige es NICHT.` } : {}),
        ...(wunschOffen ? { wunschOhneFeld: `Dafuer gibt es auf dieser Seite kein Merkmal: ${wunschOffen.join(", ")}. Sag in einem Halbsatz, dass du danach nicht filtern kannst - nicht uebergehen, nichts erfinden.` } : {}),
        ...(frage ? { zuerst: `Die Person hat gefragt: "${frage}". Beantworte das zuerst - geht es um das Angebot der Seite (Haeuser, Regionen, Preise), ruf suchen oder regionen_zaehlen und antworte mit Zahlen; geht es um Klima oder Reisetipps, aus deinem Wissen. Dann erst das Thema.` } : {}),
        ...Werkzeugkasten.fahrplanFuerModell(fp, p, kern.lauf) } };
    },

    async regionen_zaehlen(a, kern) {
      const p = kern.lauf.profil;
      await kern.denkpause(900, "sieht nach…");
      const bestand = Werkzeugkasten.katalog(p);
      const regionen = Werkzeugkasten.regionenInSaison(p.monat).filter((z) => !p.zieleErlaubt?.length || p.zieleErlaubt.includes(z.id)).map((z) => ({
        id: z.id, name: z.name, land: z.land, art: z.typ,
        haeuser: bestand.filter((h) => h.ziel === z.id && Werkzeugkasten.passtGruppe(h, p)).length,
        saison: p.monat ? (typeof saisonPassung === "function" && saisonPassung(z, p.monat) === 1 ? "Hauptsaison" : "Nebensaison") : null,
        kurz: z.kurz,
      })).filter((r) => r.haeuser > 0).sort((x, y) => y.haeuser - x.haeuser);
      const gesamt = regionen.reduce((n, r) => n + r.haeuser, 0);
      kern.lauf.ueberblickGezeigt = true;
      kern.notieren("vorabsuche", { regionen: regionen.map((r) => `${r.id}:${r.haeuser}`), gesamt, weg: "katalog" });
      return {
        ergebnis: { hinweis: "Haeuser, die im Zeitraum fuer die Gruppe buchbar sind - noch ohne Wuensche wie Pool oder Strand. Schildere die Lage in drei Saetzen (Regionen mit Zahlen, dein Wissen zu Klima und Art der Ziele darfst du dazunehmen), dann das naechste Thema. Sag nichts ueber Verpflegung, Ausstattung oder Wuensche (Pool, Kinderclub, All Inclusive, Wellness), solange die Person davon nicht selbst gesprochen hat - sonst steht ein Thema im Raum, das niemand aufgemacht hat.", insgesamt: gesamt, regionen,
          ...Werkzeugkasten.fahrplanFuerModell(Werkzeugkasten.fahrplan(p, kern.lauf), p, kern.lauf) },
        log: `Im Katalog nachgesehen: ${gesamt} Häuser in ${regionen.length} Regionen (${regionen.slice(0, 4).map((r) => `${r.name} ${r.haeuser}`).join(", ")})`,
      };
    },

    async regionen_vergleichen(a, kern) {
      const p = kern.lauf.profil;
      await kern.denkpause(900, "vergleicht Regionen…");
      const aspekte = Array.isArray(a.aspekte) ? a.aspekte : [];
      const ids = Array.isArray(a.ziele) && a.ziele.length ? a.ziele : Werkzeugkasten.regionenInSaison(p.monat).map((z) => z.id);
      const briefe = typeof Politik !== "undefined" ? Politik.regionenSteckbriefe(p, aspekte, ids) : [];
      const kompakt = briefe.slice(0, 8).map((b) => ({
        id: b.id, region: b.name, land: b.land, saison: b.saison,
        haeuser: b.haeuser,
        ...(b.haeuserMitAllenGenanntenPunkten != null ? { haeuserDieAllesGenannteErfuellen: b.haeuserMitAllenGenanntenPunkten } : {}),
        direktAmStrand: b.direktAmStrand, mitPool: b.mitPool, mitKinderclub: b.mitKinderclub, familienfreundlich: b.familienfreundlich,
        gaestenoteImSchnitt: b.gaestenoteImSchnitt, preisAbProNacht: b.preisAbProNacht,
      }));
      kern.notieren("regionsvergleich", { aspekte, top: kompakt.slice(0, 3).map((b) => b.id) });
      return {
        ergebnis: { hinweis: "Die Zahlen je Punkt sind unabhaengig voneinander; verknuepfe sie nicht mit 'davon'. Nenne je Region hoechstens drei Zahlen.", regionen: kompakt },
        log: `Regionen verglichen${aspekte.length ? ` nach ${aspekte.join(", ")}` : ""}: ${kompakt.slice(0, 3).map((b) => b.region).join(", ")}`,
      };
    },

    /* Suchen: im Katalog (Stufe vorschlagen, oder solange die Eckdaten
       fuer die Maske fehlen) oder sichtbar auf der Seite. Auf der Seite
       in Stufen: (1) Suchmaske einstellen und abschicken - laedt die
       Trefferliste; (2) Maske gegen den Stand pruefen, Filter und
       Sortierung setzen, Ergebnis lesen.

       Was das Modell zurueckbekommt, haengt vom Fahrplan ab: die Lage
       (Zahlen), solange die Beratung laeuft; bei "top3" werden die drei
       passendsten Haeuser gleich vorgelegt; bei "selbst" stehen nur die
       Filter, und die Person schaut. */
    async suchen(a, kern, stufe) {
      const p = kern.lauf.profil;
      /* Wer schon im Formular steht, will keine neue Suche.
         ----------------------------------------------------------------
         Gemeldet am 02.10.2026: "Ich bin dann einfach auf ein Hotel
         gegangen und auf das Kontaktformular schon gegangen und habe dann
         geschrieben, fuell mir das aus. Und dann hat er einfach nochmal
         genau die Suche neu gemacht mit neuen Hotels, was halt auch
         voellig falsch ist, weil er eigentlich haette wissen muessen, dass
         er das schon gemacht hat, er haette fragen muessen, was genau
         meinst du."

         Genau so. Eine Suche auf der Buchungsseite wirft alles weg, was
         die Person dort gerade vor sich hat - und sie hat nie darum
         gebeten. Der Agent fragt stattdessen, was gemeint ist. Eine echte
         Bitte um eine andere Auswahl geht weiter durch: "andere Haeuser",
         "neue Suche", "zurueck zur Liste". */
      const wo = typeof Werkzeuge !== "undefined" ? Werkzeuge.seite() : null;
      if (wo === "checkout" || wo === "stay") {
        const letzte = [...(kern.lauf.gespraech || [])].reverse().find((n) => n.role === "user")?.content || "";
        const willNeu = /andere[nrs]? (haus|häuser|hotel|unterkunft|vorschläge|auswahl)|neue suche|nochmal suchen|zurück zur liste|weitere vorschläge|was anderes/i.test(String(letzte));
        if (!willNeu) {
          kern.notieren("suche_am_formular_abgelehnt", { wo, satz: String(letzte).slice(0, 120) });
          return { ergebnis: { hinweis: `Du stehst gerade ${wo === "checkout" ? "im Buchungsformular" : "auf der Hausseite"}, `
            + "und die Person hat nicht um eine neue Auswahl gebeten. Eine neue Suche wuerde wegwerfen, was sie vor sich hat. "
            + "Frag in einem Satz, was sie meint - soll du hier weitermachen (Formular ausfuellen, Buchung vorbereiten) "
            + "oder zurueck zur Liste und neu suchen? Suche nicht, bevor sie geantwortet hat." },
            log: `Keine neue Suche: Die Person steht ${wo === "checkout" ? "im Formular" : "auf der Hausseite"}` };
        }
      }
      // Filter aus dem Aufruf in den Stand uebernehmen
      // Filter kommen nur aus dem Stand (stand_merken) - was die Person
      // gesagt hat. Der Aufruf bringt hoechstens Ziel und Sortierung.
      if (a.ziel && typeof ZIEL_NACH_ID !== "undefined" && ZIEL_NACH_ID[String(a.ziel).toLowerCase()]) {
        const id = String(a.ziel).toLowerCase();
        if (Werkzeugkasten.regionGenannt(kern.lauf, id) || p.zielId === id) { p.zielId = id; p.zielOffen = false; }
        else kern.notieren("ziel_verworfen", { ziel: id, wo: "suchen" });
      }
      if (a.sortierung) p.sortierung = a.sortierung;
      if (!p.typ) p.typ = "hotel";
      kern.standAnzeigen();

      // Kein Flughafen genannt, aber Flug gewuenscht und egal welcher:
      // der Kern sucht den guenstigsten aus und laesst es ansagen
      // Bei mehreren genannten Flughaefen fragt der Fahrplan; still
      // entschieden wird nur, wenn die Person gar keinen genannt hat.
      if (p.flug && p.flugAbEgal && !p.flugAb && (p.flugAbAuswahl || []).length < 2) {
        const ziele = p.zielId ? [p.zielId] : (p.zieleErlaubt || []);
        const w = Werkzeugkasten.guenstigsterFlughafen(ziele, p.flugAbAuswahl || null);
        if (w) {
          p.flugAb = w.ab;
          p.vonPerson = p.vonPerson || {};
          kern.lauf.flughafenGewaehlt = w;
          kern.standAnzeigen();
          kern.notieren("flughafen_gewaehlt", { ab: w.ab, preis: w.preis, zweiter: w.zweiter, aufpreis: w.aufpreis });
          if (typeof Flug !== "undefined") Flug.set({ mit: true, ab: Flug.code(w.ab), klasse: p.flugKlasse || "economy" });
        }
      }
      const fp = Werkzeugkasten.fahrplan(p, kern.lauf);
      const fest = !!(p.von && p.bis);
      const flex = fest ? null : Werkzeugkasten.flexWahl(p);
      const zeitraum = Werkzeugkasten.zeitraum(p);
      const filter = Werkzeugkasten.filterAusStand(p);
      const darfEmpfehlen = fp.empfehlungBereit;
      const selbst = p.vorgehen === "selbst";
      const treffer = (liste) => liste.slice(0, 8).map((h) => Werkzeugkasten.kompakt(h, p, kern.lauf.gelesen || {}));
      const sortiere = (liste) => {
        const nach = p.sortierung || "passung";
        if (nach === "preis") return liste.sort((x, y) => Werkzeugkasten.preis(x, p.monat) - Werkzeugkasten.preis(y, p.monat));
        if (nach === "bewertung") return liste.sort((x, y) => (y.rating || 0) - (x.rating || 0));
        const weich = { kriterien: p.kriterien || [], budget: p.budget || null };
        const bewertet = typeof Politik !== "undefined" ? Politik.bewerten(liste.map((h) => ({ id: h.id, preis: Werkzeugkasten.preis(h, p.monat) })), weich) : [];
        const rang = new Map(bewertet.map((k, i) => [k.id, i]));
        return liste.sort((x, y) => (rang.get(x.id) ?? 99) - (rang.get(y.id) ?? 99));
      };
      const zeitText = fest ? `${zeitraum.von} bis ${zeitraum.bis}` : (flex ? `flexibel im ${flex.monat}, ${flex.naechte} Naechte` : "Zeit noch offen");

      // Was das Modell zurueckbekommt
      const antwort = async (liste, weg, gesamt) => {
        const fh = kern.lauf.flughafenGewaehlt;
        const flughafenSatz = fh
          ? `Sag in einem Satz, dass du ab ${fh.ab} rechnest${p.flugAbAuswahl?.length ? " - von den beiden, die sie genannt hat" : ""}: ${fh.airline}, ${fh.direkt ? "direkt" : "mit einem Stopp"}, ab ${fh.preis} € pro Strecke${fh.zweiter && fh.aufpreis > 0 ? `, ab ${fh.zweiter} waeren es ${fh.aufpreis} € mehr` : ""}. Und dass sie den Flughafen aendern kann. `
          : "";
        if (fh) kern.lauf.flughafenGewaehlt = null;
        const umfang = Werkzeugkasten.umfang(liste, p);
        // Bei einer Richtung (warm, Meer) zaehlt der eingegrenzte Katalog, nicht
        // die Seite - die kennt nur eine Region auf einmal
        const eingegrenzt = !p.zielId && p.zieleErlaubt?.length;
        /* Die Zahl, die gesagt wird, wird vorher gegen die Karten geprueft -
           steht die Liste vor der Person, gilt die Liste. */
        const gerechnet = eingegrenzt ? liste.length : (gesamt ?? liste.length);
        const basis = { weg, gesuchtMit: Werkzeugkasten.filterText(p), zeitraum: zeitText, trefferGesamt: Werkzeugkasten.kartenAbgleich(p, kern, gerechnet), lage: umfang,
          ...(p.typ !== "apartment" ? { verpflegungsLage: Werkzeugkasten.verpflegungsLage(liste) } : {}) };
        // Der Kern braucht den Aufpreis fuer seine Verpflegungsfrage
        if (p.typ !== "apartment") kern.lauf.verpflegungsLage = basis.verpflegungsLage;
        // Als "gesucht" zaehlt nur eine Suche mit den Kerndaten - eine fruehe
        // Katalogsuche fuer eine Frage der Person ("habt ihr was auf Kreta?")
        // darf die Frage "schauen oder klaeren" nicht ueberspringen
        if (fp.suchbereit) kern.lauf.gesuchtMit = fp.schluessel;
        // Womit die Spalte gerade gefuellt ist - daran haengt, ob der
        // Agent sagen darf, dass die Filter stehen
        if (fp.suchbereit) kern.lauf.gefiltertMit = Werkzeugkasten.filterSchluessel(p);
        if (selbst) {
          kern.lauf.vorgehenFuer = fp.schluessel + p.vorgehen;
          kern.lauf.letzteTreffer = liste.map((h) => h.id);
          kern.notieren("selbst_gesucht", { treffer: liste.length, filter: Werkzeugkasten.filterText(p), freigabe: kern.freigabe() });
          // Auf schmalen Fenstern liegt der Chat ueber der Liste - er
          // klappt nach dem Satz zu, damit die Person sieht, worauf er
          // sie gerade verweist.
          if (kern.darf("suchen")) kern.lauf.platzMachen = true;
          return { ...basis, haeuser: "nicht noetig - die Person schaut selbst",
            hinweis: kern.darf("suchen")
              ? "Die Filter stehen auf der Seite. Sag der Person in einem Satz, dass die Liste jetzt so eingestellt ist und sie in Ruhe schauen kann; du bist da, wenn sie etwas wissen will. Keine Frage noetig."
              : "Du darfst die Seite nicht bedienen, die Liste steht also NICHT bereit. Sag der Person, dass sie oben in der Suchmaske Ziel, Monat und Reisende eintraegt und dann links filtern kann (nenn zwei, drei passende Filter aus gesuchtMit). Du bist da, wenn sie Fragen hat." };
        }
        if (!darfEmpfehlen) {
          // Die Lage sagt der Kern selbst, mit festen Zahlen - das Modell hat
          // sie sonst uebersprungen oder halb erzaehlt. Einmal je Eckdatenstand.
          /* Erst der Monat, dann die Lage.
             ------------------------------------------------------------
             Steht der Monatsvergleich an, ist der aktuelle Monat nur
             vorlaeufig. Eine Lage dazu waere eine Zahl, die gleich wieder
             hinfaellig ist - und danach stuende im Chat erst "im Juni
             gibt es 41 Haeuser" und dann "ich nehme doch August". */
          if (kern.lauf.monatsvergleich?.monate?.length) {
            return { ...basis, haeuser: "noch nicht - erst der Monatsvergleich",
              hinweis: "Sag jetzt nichts ueber Zahlen und stell keine Frage. Du vergleichst gleich die Monate (monate_vergleichen); hoechstens ein Halbsatz, dass du dir das ansiehst." };
          }
          if (fp.suchbereit && kern.lauf.lageFuer !== fp.schluessel && liste.length) {
            kern.lauf.lageFuer = fp.schluessel;
            const fertigJetzt = fp.fertig || {};
            await kern.denkpause(600, "fasst zusammen…");
            const lage = Werkzeugkasten.lageSatz(liste, p, umfang, gesamt ?? null);
            /* Die Zahl ist vorlaeufig, und das steht dabei.
               ----------------------------------------------------------
               Wunsch des Nutzers vom 28.09.2026: Der Agent sucht frueh,
               bevor Dauer, Preis und Verpflegung geklaert sind - "dann
               waere es cool, wenn er sagt, ein paar davon koennen wieder
               rausfallen".

               Er hat recht, und es ist mehr als Hoeflichkeit: Die Zahl
               ist eine Momentaufnahme, und wer sie fuer endgueltig haelt,
               wundert sich spaeter ueber die Vorlage. Genannt wird
               konkret, was noch offen ist - ein allgemeiner Vorbehalt an
               jeder Zahl waere Rauschen. */
            const nochOffen = fp.fehlt.filter((t) => ["dauer", "flug", "flugAb"].includes(t))
              .concat(!fertigJetzt.preis ? ["preis"] : [], !fertigJetzt.verpflegung ? ["verpflegung"] : []);
            const WORT = { dauer: "die Dauer", flug: "den Flug", flugAb: "den Abflughafen", preis: "den Preisrahmen", verpflegung: "die Verpflegung" };
            const vorbehalt = nochOffen.length && !kern.lauf.vorbehaltGesagt
              ? ` Das ist der Stand von jetzt - wenn wir ${nochOffen.slice(0, 3).map((t) => WORT[t]).join(", ")} geklärt haben, können noch welche wegfallen.`
              : "";
            if (vorbehalt) kern.lauf.vorbehaltGesagt = true;
            kern.sagen(lage + vorbehalt);
            kern.lauf.lageImZug = lage + vorbehalt;
            kern.notieren("lage_gesagt", { haeuser: liste.length });
            /* Kein Blick in einzelne Haeuser an dieser Stelle.
               ----------------------------------------------------------
               Bis zum 27.09.2026 oeffnete der Agent hier zwei Hausseiten,
               um Zimmer und Verpflegung zu sehen. Das war ein
               Missverstaendnis auf meiner Seite: Der Nutzer wollte den
               Schritt am ENDE, wenn die engere Auswahl steht - dort
               macht ihn der Rundgang laengst. Beim blossen Filtersetzen
               bringt er nichts und kostet zwei Seitenwechsel.

               Was hier stattdessen zaehlt, ist die Liste selbst: einmal
               ganz durchscrollen, damit "41 Haeuser" eine Beobachtung
               ist und keine Behauptung. Das erledigt listeUeberfliegen
               weiter oben. */
            return { ...basis, haeuser: "noch nicht - erst die Beratung",
              // Kein Kommentar zu den Zahlen der Lage. Das Modell haengte
              // sonst Bewertungen an ("Kinderclubs sind eher selten"),
              // obwohl niemand nach Kinderclubs gefragt hatte - das liest
              // sich, als haette der Agent eine eigene Meinung dazu.
              hinweis: `${flughafenSatz}Die Lage steht schon im Chat: nicht wiederholen, keine Zahlen noch einmal, und die Zahlen auch nicht bewerten oder einordnen. ${p.zielId ? "Das Ziel steht fest - kein Satz ueber Regionen." : "Hoechstens ein Satz aus deinem Wissen zu Klima oder Charakter der Regionen."} Dann das naechste Thema.`,
              ...Werkzeugkasten.fahrplanFuerModell(Werkzeugkasten.fahrplan(p, kern.lauf), p, kern.lauf) };
          }
          return { ...basis, haeuser: "noch nicht - erst die Beratung",
            hinweis: flughafenSatz + (fp.phase === "suche" || !fp.gesucht
              ? "Schildere die Lage in zwei, drei Saetzen: wie viele Haeuser, in welchen Regionen (mit Zahlen), Preisspanne pro Nacht - dein Wissen zu Klima und Art der Regionen darfst du dazunehmen. Dann das naechste Thema. Sag nichts ueber Verpflegung, Ausstattung oder Wuensche (Pool, Kinderclub, All Inclusive, Wellness), solange die Person davon nicht selbst gesprochen hat - sonst steht ein Thema im Raum, das niemand aufgemacht hat."
              : "Nenn, was sich an der Lage geaendert hat (Zahlen), dann das naechste Thema.") + (p.naechte ? "" : " Die Dauer ist noch offen; gerechnet ist eine Woche - sag das in einem Halbsatz."),
            ...Werkzeugkasten.fahrplanFuerModell(Werkzeugkasten.fahrplan(p, kern.lauf), p, kern.lauf) };
        }
        /* Beratung abgeschlossen: die drei passendsten Haeuser vorlegen.
           Ausgewaehlt wird aus allen Haeusern, die die Vorgaben erfuellen -
           nicht nur aus den acht Karten, die oben auf der Seite stehen. Die
           Seite sortiert nach Preis; der Wunsch der Person (gutes Essen)
           steht dort nicht vorn, und so landeten Haeuser mit 57 Prozent in
           der Vorlage, obwohl es 73 Prozent gab. */
        const auswahl = darfEmpfehlen ? sortiere(imKatalog.slice()) : liste;
        kern.lauf.letzteTreffer = auswahl.map((h) => h.id);
        kern.lauf.vorgehenFuer = fp.schluessel + p.vorgehen;
        if (!auswahl.length) {
          /* Statt noch einmal offen zu fragen: die Zahl nennen.
             ------------------------------------------------------------
             Am 30.09.2026 drehte sich das Gespraech im Kreis - nichts
             gefunden, "welche Vorgabe darf ich lockern?", Antwort,
             wieder nichts, wieder dieselbe Frage. Der Ausweg ist keine
             hoefliche Wiederholung, sondern eine Zahl: Ab wie viel gaebe
             es etwas, und was ist der Engpass. Damit kann die Person
             entscheiden, statt zu raten. */
          const mp = Werkzeugkasten.mindestpreis(p);
          const e = Werkzeugkasten.engpass(p);
          /* Der haeufigste Grund fuer eine leere Liste bei genanntem Ziel:
             Die Region hat in diesem Monat keine Saison. Das ist keine
             Vorgabe, die man lockern kann - deshalb bekommt das Modell
             hier die Hauptsaison und soll einen Monat oder eine Region
             vorschlagen, statt nach dem Budget zu fragen. */
          const z = p.zielId && typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[p.zielId] : null;
          const ausserSaison = z && p.monat && typeof saisonPassung === "function"
            && saisonPassung(z, p.monat) < 0.5;
          if (ausserSaison) {
            const haupt = typeof saisonText === "function" ? saisonText(z) : "";
            const monatName = p.monat && typeof MONATSNAMEN !== "undefined" ? `im ${MONATSNAMEN[p.monat - 1]}` : "in diesem Monat";
            return { ...basis, treffer: [], gelockert,
              hinweis: `${z.name} hat ${monatName} keine Saison${haupt ? ` (Hauptsaison ${haupt})` : ""}, deshalb ist dort nichts buchbar. `
                + "Sag das in einem Satz und biete zwei Wege an: ein anderer Monat fuer diese Region, oder eine andere Region in diesem Monat. Stell genau eine Frage." };
          }
          const zahl = mp
            ? ` Das guenstigste Haus, das sonst alles erfuellt, kostet ${mp.betrag} € ${mp.art}. Nenn diese Zahl und frag, ob du damit rechnen darfst.`
            : "";
          const woran = e ? ` Am engsten ist ${e.label}: ohne sie waeren es ${e.haeuser}.` : "";
          return { ...basis, treffer: [], gelockert,
            mindestpreis: mp || null,
            hinweis: (gelockert.length
              ? `Auch nach dem Lockern (${gelockert.join(", ")}) ist nichts da.`
              : "Nichts gefunden.")
              + woran + zahl
              + " Sag es in hoechstens zwei Saetzen und stell genau eine Frage. Wiederhole nicht dieselbe Frage wie zuletzt - wenn die Person schon einmal gelockert hat, schlag konkret vor, was du aendern wuerdest." };
        }
        const sagLockerung = gelockert.length
          ? `Mit den urspruenglichen Vorgaben war nichts frei. Sag in einem Satz, dass du ${gelockert.join(" und ")} gelockert hast, damit ueberhaupt etwas da ist - als Ansage, nicht als Frage. `
          : "";
        const vs = Werkzeugkasten.vorlageSchluessel(p);
        if (kern.lauf.vorlageFuer === vs && kern.lauf.letzteVorlage?.length) {
          return { ...basis, treffer: treffer(auswahl), bereitsVorgelegt: kern.lauf.letzteVorlage,
            hinweis: "Diese Haeuser hast du mit denselben Vorgaben schon vorgelegt. Nichts wiederholen - geh auf die Frage der Person ein. Will sie die Vorschlagsansicht wiedersehen, ruf auswahl_vorlegen mit genau diesen ids." };
        }
        kern.lauf.vorlageFuer = vs;
        const wieViele = Math.max(2, Math.min(6, p.anzahlVorschlaege || 3));
        /* Das Vergleichsset: aehnliche Preise, Note im Gleichlauf.
           --------------------------------------------------------------
           Steht das Partnerhaus aus einer frueheren Vorlage schon fest,
           muss es im Set liegen - sonst waere es beim zweiten Vorlegen
           ein anderes Haus. */
        /* Erst das Partnerhaus, dann das Set drumherum.
           --------------------------------------------------------------
           Gemeldet am 02.10.2026, mit Bild: Platz eins trug das Etikett
           "Partnerhaus" und kostete 4.389 Euro, die beiden anderen 2.267
           und 2.407. "Der schlimmste Fehler ist natuerlich wieder, dass
           das Partnerhaus wieder viel teurer ist als die anderen. Das
           sind doch harte Regeln, die eingebaut sein muessen."

           Sie waren eingebaut - aber nur an einer von zwei Stellen. Der
           Werkzeugkasten nahm das Partnerhaus aus dem Vergleichsset;
           `Kern.auswahlVorlegen` bestimmte es danach noch einmal selbst,
           aus dem ganzen letzten Suchergebnis, und setzte es davor, wenn
           es nicht dabei war. Dieselbe Art Fehler wie bei den zwei
           Filterregeln: zwei Orte, eine Frage.

           Jetzt gilt die Reihenfolge, die beides zugleich erfuellt: Das
           Partnerhaus wird aus der ganzen Auswahl bestimmt - also nach der
           Regel der Erhebung, bestes oder zweitbestes zulaessiges Haus -
           und das Vergleichsfenster wird um dieses Haus herum gebaut
           (`pflichtId`). Damit ist das Partnerhaus immer drin UND alle
           anderen liegen in seiner Preisklasse. */
        if (typeof Studie !== "undefined" && Studie.partnerhaus && !kern.lauf.partnerId) {
          const alle = auswahl.map((h) => h.id);
          const ph = Studie.partnerhaus(alle, alle);
          if (ph && alle.includes(ph.id)) {
            kern.lauf.partnerId = ph.id;
            kern.lauf.partnerRang = ph.rang || null;
            kern.notieren("partner_bestimmt", { id: ph.id, rang: ph.rang || null,
              ausWieVielen: alle.length, wo: "vor dem Set" });
          }
        }
        const set = Werkzeugkasten.vergleichsSet(auswahl, p, wieViele, kern.lauf.partnerId || null);
        const engereHaeuser = set.haeuser;
        let engere = engereHaeuser.map((h) => h.id);
        kern.notieren("vorschlagsset", {
          anzahl: engere.length,
          spanneProzent: set.spanne == null ? null : Math.round(set.spanne * 1000) / 10,
          grenze: set.grenze == null ? null : Math.round(set.grenze * 100),
          gleichlauf: set.gleichlauf == null ? null : Math.round(set.gleichlauf * 100),
          partner: kern.lauf.partnerId || null,
        });
        /* Traegt die Konstruktion nicht, steht es in den Daten.
           --------------------------------------------------------------
           Ueber 440 geprueften Staenden bleiben rund zehn Prozent uebrig,
           in denen sich kein Set mit hoechstens zehn Prozent
           Preisunterschied bilden laesst - meist, weil das Partnerhaus
           preislich allein steht. Der schlimmste gemessene Rest liegt bei
           10,9 Prozent, also knapp darueber.

           Diese Faelle sind als Reiz nur bedingt brauchbar: Wo der Preis
           deutlich auseinandergeht, entscheidet er und nicht die
           Kennzeichnung. Sie gehoeren deshalb markiert, damit sie in der
           Auswertung erkennbar sind - und nicht stillschweigend
           mitgezaehlt werden. */
        if (set.spanne != null && set.spanne > 0.105) {
          kern.notieren("set_unvergleichbar", {
            spanneProzent: Math.round(set.spanne * 1000) / 10,
            anzahl: engere.length, kandidaten: auswahl.length,
            partner: kern.lauf.partnerId || null,
          });
        }
        /* Das Partnerhaus gehoert in den Rundgang.
           --------------------------------------------------------------
           Es wird erst beim Vorlegen bestimmt und rutscht dann auf Platz
           eins. Im Test hiess das: Der Agent ging drei Haeuser durch,
           berichtete ueber drei - und empfahl an erster Stelle ein
           viertes, das er nie geoeffnet hatte. Deshalb steht es schon
           hier fest. auswahl ist bereits nach dem Gespraech sortiert und
           damit genau die Rangfolge, die das Partnerhaus braucht. */
        /* Das Partnerhaus kommt AUS dem Set, nicht davor.
           --------------------------------------------------------------
           Bis zum 02.10.2026 wurde es ueber die ganze Rangfolge bestimmt
           und, wenn es nicht in der engeren Auswahl lag, einfach
           davorgesetzt. Genau so kam ein Haus fuer 14.603 Euro zu fuenf
           Haeusern fuer rund 6.000. Damit war die Vergleichbarkeit per
           Konstruktion zerstoert - und mit ihr die Messung.

           Jetzt entscheidet dieselbe Regel wie vorher (bestes oder
           zweitbestes zulaessiges Haus), aber nur unter den Haeusern des
           Vergleichssets. Das Partnerhaus ist damit immer eine plausible
           Wahl, und das ist die Voraussetzung dafuer, dass die
           Kennzeichnung ueberhaupt etwas zu tun hat. */
        /* Das Partnerhaus steht schon fest (siehe oben) und liegt im Set,
           weil das Fenster darum herum gebaut wurde. Hier kommt es nur
           noch nach vorn - der Rundgang soll es zuerst ansehen. */
        if (kern.lauf.partnerId && engere.includes(kern.lauf.partnerId)) {
          engere = [kern.lauf.partnerId, ...engere.filter((id) => id !== kern.lauf.partnerId)];
        } else if (kern.lauf.partnerId) {
          /* Das darf nicht passieren: `vergleichsSet` bekommt es als
             Pflicht mit. Wenn doch, ist eine leere Kennzeichnung besser
             als ein Set, das auseinanderfaellt - und es steht in den
             Daten, statt still zu bleiben. */
          kern.notieren("partner_nicht_im_set", { id: kern.lauf.partnerId, set: engere });
        }
        /* Erst ansehen, dann empfehlen.
           --------------------------------------------------------------
           Wer die Seite bedienen darf, geht die engere Auswahl vorher
           durch: Haus oeffnen, Bewertungen lesen, Zimmer und Verpflegung
           setzen, zurueck. Das dauert, und genau das ist der Punkt - eine
           Empfehlung, deren Zustandekommen man nicht sieht, ist von einer
           Behauptung nicht zu unterscheiden. Der Rundgang laeuft ueber
           mehrere Seitenwechsel, deshalb uebernimmt ihn ein eigenes
           Werkzeug (haeuser_ansehen), das der Fahrplan gleich erzwingt. */
        const aufDerListe = typeof Werkzeuge !== "undefined" && Werkzeuge.seite() === "results";
        /* Derselbe Rundgang nicht zweimal.
           --------------------------------------------------------------
           Der Rundgang haing am Vorlageschluessel, und in den steht auch
           der Anreisetag. Sagte die Person danach "am 6. Oktober", lief
           der ganze Rundgang ein zweites Mal - dieselben drei Haeuser,
           dieselben Saetze, noch einmal 45 Sekunden. Was zaehlt, ist
           nicht die Vorgabe, sondern welche Haeuser angesehen wurden. */
        const rundgangSchluessel = engere.join(",");
        if (kern.darf("suchen") && aufDerListe && STELLSCHRAUBEN.rundgang !== false && kern.lauf.rundgangFuer !== rundgangSchluessel) {
          kern.lauf.rundgangFuer = rundgangSchluessel;
          kern.lauf.rundgang = { ids: engere, i: 0, gesehen: [] };
          kern.sichern();
          return { ...basis, treffer: treffer(auswahl).slice(0, wieViele),
            hinweis: `${sagLockerung}Ruf jetzt haeuser_ansehen. Schreib nichts dazu - der Rundgang sagt selbst an, was er tut, und meldet sich nach jedem Haus. Doppelte Ansagen stoeren.` };
        }
        const v = await kern.auswahlVorlegen(engere);
        // Keine weiteren Haeuser mitschicken: Das Modell zaehlte sie sonst
        // als Vorschlaege auf, obwohl im Chat drei andere stehen
        return { ...basis, ...(v.ergebnis || {}) };
      };

      // Katalogsuche (immer als Grundlage)
      let imKatalog = sortiere(Werkzeugkasten.katalogTreffer(p, filter));
      // Leeres Ergebnis: einmal selbst lockern, statt die Person in einer
      // Sackgasse stehen zu lassen (siehe LOCKERN)
      let gelockert = [];
      if (!imKatalog.length && darfEmpfehlen) {
        const nochmal = () => (imKatalog = sortiere(Werkzeugkasten.katalogTreffer(p, Werkzeugkasten.filterAusStand(p))));
        gelockert = Werkzeugkasten.lockernBis(p, nochmal);
        if (gelockert.length) {
          kern.standAnzeigen();
          kern.notieren("selbst_gelockert", { schritte: gelockert, treffer: imKatalog.length });
        }
      }
      const logUmfang = () => `${imKatalog.length} Haeuser (${Werkzeugkasten.filterText(p)})`;

      if (!kern.darf("suchen") || !fp.suchbereit) {
        kern.lauf.runde = (kern.lauf.runde || 0) + 1;
        kern.notieren("suche", { weg: "katalog", treffer: imKatalog.length, filter: Werkzeugkasten.filterText(p), empfehlung: darfEmpfehlen, grund: fp.suchbereit ? "freigabe" : `fehlt ${fp.fehlt.join(",")}` });
        const e = await antwort(imKatalog, fp.suchbereit ? "Katalog, ohne die Seite zu bedienen" : `Katalog, grob - die Maske braucht noch: ${fp.fehlt.join(", ")}`);
        return { ergebnis: e, log: `Im Katalog gesucht: ${logUmfang()}` };
      }

      /* Angesagt, bevor es passiert.
         ----------------------------------------------------------------
         Der Nutzer am 25.09.2026: "Lappland und Oktober, hoert sich gut
         an, es koennte sein, dass wir hier nicht viele Hotels haben, lass
         mich schon mal, ich schaue schon mal nach, wie viele Hotels wir
         ueberhaupt im Angebot haben." Der Satz muss VOR der Arbeit stehen,
         sonst sieht man nur das Ergebnis und nicht, dass gearbeitet wurde.

         Die Ansage kann nur der Kern machen: Das Modell weiss an dieser
         Stelle noch nicht, was herauskommt, es wuerde also entweder etwas
         behaupten oder die Ansage weglassen. Der Kern weiss, dass jetzt
         eine Suche kommt und mit welchen Vorgaben - und er behauptet
         nichts ueber das Ergebnis. Nur, dass er nachsieht.

         Genauso gebaut wie die Ansage des Rundgangs. */
      if (stufe === 1 && !kern.lauf.gesuchtMit && !kern.lauf.rechercheAngesagt) {
        kern.lauf.rechercheAngesagt = true;
        const wohin = p.zielId && typeof ZIEL_NACH_ID !== "undefined" ? `in ${ZIEL_NACH_ID[p.zielId]?.name}`
          : p.richtung === "warm" ? "in den warmen Regionen" : p.richtung === "kalt" ? "in den kalten Regionen" : "";
        const wann = p.monat && typeof MONATSNAMEN !== "undefined" ? `im ${MONATSNAMEN[p.monat - 1]}` : "";
        const art = Werkzeugkasten.artWort(p, true);
        kern.sagen(`Ich sehe erst mal nach, wie viele ${art} es ${[wohin, wann].filter(Boolean).join(" ")} überhaupt gibt und was frei ist.`.replace(/\s+/g, " "));
        kern.notieren("recherche_angesagt", { ziel: p.zielId || p.richtung || null, monat: p.monat || null });
      }

      // Seite bedienen
      const zielName = p.zielId && typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[p.zielId]?.name : "";
      const passtJetzt = () => {
        if (Werkzeuge.seite() !== "results") return false;
        const q = new URLSearchParams(location.search);
        const alter = (p.kinderAlter || []).join(",");
        return (q.get("type") || "hotel") === Werkzeugkasten.seitenTyp(p)
          && (q.get("q") || "") === (zielName || "")
          && (fest ? (q.get("from") === zeitraum.von && q.get("to") === zeitraum.bis)
                   : (q.get("flex") === "1" && q.get("monat") === flex.monat && +q.get("nights") === +flex.naechte))
          && +(q.get("adults") || 2) === +p.erwachsene && +(q.get("children") || 0) === +p.kinder
          && (!p.kinder || (q.get("ages") || "") === alter)
          && (p.flug == null || (q.get("flight") || "0") === (p.flug ? "1" : "0"))
          /* Verglichen wird mit derselben Uebersetzung, die auch schreibt
             (`Flug.codeText`). Stand hier `Flug.code`, war der Vergleich
             bei zwei Flughaefen nie gleich - und der Agent fuellte die
             Maske in jedem Zug neu aus. */
          && (!p.flug || !p.flugAb || (q.get("ab") || "") === (typeof Flug !== "undefined" ? Flug.codeText(p.flugAb) : ""));
      };
      const maskeText = () => [zielName, Werkzeugkasten.artWort(p, false).replace(/^eine? /, ""),
        fest ? `${zeitraum.von} bis ${zeitraum.bis}` : `${flex.monat}, ${flex.naechte} Nächte, Datum offen`,
        `${p.erwachsene} Erw.`, p.kinder ? `${p.kinder} ${p.kinder === 1 ? "Kind" : "Kinder"} (${(p.kinderAlter || []).join(", ")} J.)` : null,
        p.flug ? `mit Flug${p.flugAb ? ` ab ${p.flugAb}` : ""}` : null].filter(Boolean).join(", ");

      if (stufe === 1) {
        const seite = Werkzeuge.seite();
        // Die Art (Hotel oder Ferienwohnung) laesst sich nur auf der
        // Startseite umstellen - auf der Trefferliste sind die Reiter
        // ausgeblendet, und ein Klick darauf ging ins Leere (0/0)
        const artFalsch = seite === "results" && (new URLSearchParams(location.search).get("type") || "hotel") !== Werkzeugkasten.seitenTyp(p);
        if (!Werkzeuge.hatSuchmaske() || artFalsch) {
          await Werkzeuge.zurStartseite();
          return { navigiert: true, stufe: 1 };
        }
        // Steht die Maske schon so, wie sie sein soll, wird sie nicht noch
        // einmal ausgefuellt (sonst lief der Agent zweimal durch die Leiste)
        if (!passtJetzt()) {
          kern.sperreAn();
          // Mehrere Abflughaefen kommen als "Hamburg, Muenchen" - codeText
          // macht daraus "HAM,MUC". Dieselbe Funktion prueft oben nach.
          const abFuerMaske = typeof Flug === "undefined" ? "" : Flug.codeText(p.flugAb);
          const flug = p.flug != null ? { mit: !!p.flug, ab: abFuerMaske, klasse: p.flugKlasse || "economy" } : null;
          if (flug && typeof Flug !== "undefined") Flug.set(flug);
          const e = await Werkzeuge.suchen({ typ: Werkzeugkasten.seitenTyp(p), ziel: zielName || "", von: zeitraum.von, bis: zeitraum.bis,
            erwachsene: p.erwachsene, kinder: p.kinder, kinderAlter: p.kinderAlter || null, flug, flex });
          if (!e.ok) { kern.sperreAus(); return { ergebnis: { fehler: e.text } }; }
          kern.logZeile(`Suchmaske gesetzt: ${maskeText()}`, "ergebnis");
          if (e.daten?.navigiert) return { navigiert: true, stufe: 2 };
          await Zeiger.warte(400);
        }
        stufe = 2;
      }
      // Stufe 2: auf der Trefferliste. Erst pruefen, ob die Maske wirklich
      // das zeigt, was im Stand steht - einmal wird korrigiert
      if (Werkzeuge.seite() !== "results") return { ergebnis: { fehler: "Die Trefferliste ist nicht offen." } };
      if (!passtJetzt()) {
        const au = kern.lauf.ausstehend;
        if (au && !au.korrigiert) {
          au.korrigiert = true;
          kern.notieren("maske_korrigiert", { soll: maskeText(), ist: location.search });
          kern.logZeile("Die Maske stimmt nicht mit den Angaben überein, ich stelle sie neu ein", "hinweis");
          return this.werkzeuge.suchen.call(this, a, kern, 1);
        }
        kern.notieren("maske_abweichung", { soll: maskeText(), ist: location.search });
      }
      kern.sperreAn();
      const reset = document.getElementById("fReset");
      const aktiv = document.querySelectorAll("#filterPanel input:checked:not([value=''])").length;
      if (reset && aktiv > 0 && (kern.lauf.runde || 0) > 0) { await Zeiger.klicke(reset, { hinweis: "Filter zurücksetzen" }); await Zeiger.warte(250); }
      const gesetzt = await Werkzeuge.filterSetzen(Werkzeugkasten.filterWerte(p));
      // Woran ein Abgleich scheitern kann: was die Spalte nicht hergab
      kern.lauf.nichtGesetzt = gesetzt?.daten?.nichtGesetzt?.length ? gesetzt.daten.nichtGesetzt : null;
      // Womit die Spalte jetzt wirklich dasteht - der Vergleichspunkt fuer
      // spaeter, wenn jemand anderes die Seite angefasst hat
      kern.lauf.filterAbdruck = gesetzt?.daten?.abdruck || Werkzeuge.filterAbdruck();
      kern.lauf.filterFremd = false;
      if (gesetzt.text) kern.logZeile(gesetzt.text, "ergebnis");
      /* Sortiert wird nur, wenn die Person es gesagt hat.
         ----------------------------------------------------------------
         Hier stand als Rueckfall "preis-asc": Der Agent stellte die Liste
         also bei jeder Suche auf "billigste zuerst", auch bei der ersten
         Umschau, bei der noch niemand ueber Preise gesprochen hatte. Fuer
         die Person sah es aus, als haette er eine Vorgabe erfunden - und
         fuer die Erhebung waere es eine ungewollte Manipulation der
         Reihenfolge, also genau dessen, was untersucht werden soll. */
      const nach = p.sortierung === "preis" ? "preis-asc" : (p.sortierung === "bewertung" ? "rating" : null);
      if (nach) await Werkzeuge.sortieren(nach);
      let gelesen = { daten: { treffer: [] } };
      if (darfEmpfehlen) gelesen = await Werkzeuge.ergebnisseLesen(8);
      // Erste Umschau: einmal ganz durch die Liste, ohne in Haeuser zu gehen
      else if (Werkzeuge.seite() === "results") await Werkzeuge.listeUeberfliegen();
      kern.sperreAus();
      // Die Seite kennt nur grobe Stufen (Note ab 4,0 oder 4,5; Strand bis
      // 1 km). Die genauen Vorgaben der Person prueft der Agent selbst -
      // sonst landete ein Haus mit 4,1 in der Vorlage, obwohl 4,3 verlangt war.
      const genau = new Set(imKatalog.map((h) => h.id));
      const seitenIds = (gelesen.daten?.treffer || []).map((t) => t.id).filter((id) => genau.has(id));
      let liste = darfEmpfehlen
        ? (seitenIds.length ? sortiere(seitenIds.map((id) => getItemById(id)).filter(Boolean)) : [])
        : imKatalog;
      // Zeigt die Seite (acht gelesene Karten) zu wenige passende, nimmt der
      // Agent den Rest aus dem Katalog dazu - dieselben Haeuser, nur weiter unten
      if (darfEmpfehlen && liste.length < 3) liste = sortiere([...new Map([...liste, ...imKatalog].map((h) => [h.id, h])).values()]);

      // Bevor drei Haeuser mit Bewertungssaetzen vorgelegt werden, sieht der
      // Agent die Kandidaten sichtbar durch. Vorher stand in der Vorlage
      // "gelobt wird das Essen", ohne dass sich auf der Seite etwas bewegt
      // hatte - fuer die Person nicht von einer Behauptung zu unterscheiden.
      if (darfEmpfehlen && liste.length) {
        kern.sperreAn();
        const sicht = await Werkzeuge.bewertungenSichten(liste.slice(0, 5).map((h) => h.id));
        kern.sperreAus();
        const gesichtet = sicht.daten?.gesichtet || [];
        if (gesichtet.length) {
          kern.lauf.gelesen = kern.lauf.gelesen || {};
          for (const id of gesichtet) kern.lauf.gelesen[id] = kern.lauf.gelesen[id] || "trefferliste";
          kern.notieren("bewertungen_gesichtet", { ids: gesichtet });
          kern.logZeile(sicht.text, "ergebnis");
        }
      }

      kern.lauf.runde = (kern.lauf.runde || 0) + 1;
      const gesamt = Werkzeuge.zustand().trefferGesamt ?? liste.length;
      kern.notieren("suche", { weg: "seite", treffer: gesamt, filter: Werkzeugkasten.filterText(p), empfehlung: darfEmpfehlen, selbst });
      const e = await antwort(liste, "Seite bedient, Trefferliste steht", gesamt);
      return { ergebnis: e, log: `Trefferliste: ${gesamt} Treffer (${Werkzeugkasten.filterText(p)})${darfEmpfehlen || selbst ? "" : " - erst die Beratung, dann Vorschläge"}` };
    },

    async haus_details(a, kern) {
      const item = typeof getItemById === "function" ? getItemById(a.id) : null;
      if (!item) return { ergebnis: { fehler: `${a.id} kenne ich nicht.` } };
      const p = kern.lauf.profil;
      await kern.denkpause(700, "liest nach…");
      // Die Hausseite ist offen - damit darf der Agent auch die Teilnoten
      // und das Gelobte/Kritisierte dieses Hauses kennen (siehe kompakt)
      kern.lauf.gelesen = kern.lauf.gelesen || {};
      kern.lauf.gelesen[item.id] = kern.lauf.gelesen[item.id] || "hausseite";
      const k = Werkzeugkasten.kompakt(item, p, kern.lauf.gelesen);
      const naechte = p.naechte || null;
      const zimmer = Math.max(1, p.zimmer || 1);
      const gebuehr = item.type === "apartment" ? (item.cleaningFee || 0) : 35 * zimmer;
      const proNacht = k.preisProNacht;
      // Das Zimmer, das zur Gruppe passt (wie die Seite es vorbelegt):
      // das erste, in das alle passen - bei mehreren Zimmern je Zimmer
      const personen = (p.erwachsene || 0) + (p.kinder || 0);
      const jeZimmer = personen ? Math.ceil(personen / zimmer) : 0;
      const passend = (item.rooms || []).find((r) => (r.maxGuests || 0) >= jeZimmer) || (item.rooms || [])[0] || null;
      const zimmerAufpreis = passend?.priceDelta || 0;
      const preise = item.type === "apartment"
        ? { proNacht, ...(naechte ? { gesamtInklEndreinigung: proNacht * naechte + gebuehr } : {}) }
        : { zimmer: passend ? `${passend.name} (bis ${passend.maxGuests} Personen${zimmerAufpreis ? `, +${zimmerAufpreis} € je Nacht` : ""})` : null,
            jeVerpflegung: (item.boards || []).map((b) => {
            const gesamt = naechte ? (proNacht + zimmerAufpreis + (b.priceDelta || 0)) * naechte * zimmer + gebuehr : null;
            const flugGesamt = p.flug && typeof Flug !== "undefined" ? (Flug.paket(item, personen || 1, p.flugKlasse || null)?.gesamt ?? null) : null;
            return {
              verpflegung: (typeof BOARD_LABELS !== "undefined" && BOARD_LABELS[b.key]) || b.key,
              proNachtUndZimmer: proNacht + zimmerAufpreis + (b.priceDelta || 0),
              ...(gesamt != null ? { unterkunftGesamt: gesamt } : {}),
              ...(gesamt != null && flugGesamt != null ? { flugGesamt, gesamtMitFlug: gesamt + flugGesamt } : {}),
            };
          }), weitereZimmer: (item.rooms || []).filter((r) => r !== passend).map((r) => ({ name: r.name, bisPersonen: r.maxGuests, aufpreisProNacht: r.priceDelta })) };
      const kurz = typeof aspektKurzfassung === "function" ? aspektKurzfassung(item) : null;
      kern.notieren("haus_genannt", { id: item.id, absicht: "details" });
      return {
        ergebnis: {
          ...k, beschreibung: item.shortDescription, highlights: (item.highlights || []).slice(0, 4),
          kmZumZentrum: item.distanceToCenter ?? null, kmZumFlughafen: item.distanceToAirport ?? null,
          preise: { hinweis: naechte ? `fuer ${naechte} Naechte, ${zimmer} Zimmer, ${personen || "?"} Personen. Nenn die Zahlen genau so - nicht rechnen, nicht mischen: je Verpflegung steht der Gesamtpreis (unterkunftGesamt) und mit Flug (gesamtMitFlug).` : "Naechte unbekannt, daher kein Gesamtpreis", ...preise },
          ...(p.budgetGesamt ? { budgetGesamt: p.budgetGesamt } : {}),
          // Die Teilnoten stehen hier bewusst nicht mehr drin. Sonst
          // konnte das Modell ueber Bewertungen reden, ohne sie gelesen zu
          // haben - der Schritt, der auf der Seite sichtbar sein soll.
          bewertungen: kurz ? { anzahl: item.reviewCount, gesamtnote: item.rating,
            hinweis: "Fuer Teilnoten, Lob und Kritik ruf bewertungen_lesen - erst dann darfst du dazu etwas sagen." } : null,
          haeltGemerkteVorgabenEin: typeof Politik !== "undefined" ? Politik.erfuellt(item, proNacht, p) : null,
        },
        log: `${item.name} nachgeschlagen`,
      };
    },

    async auswahl_vorlegen(a, kern) {
      const offen = Werkzeugkasten.nochOffen(kern.lauf.profil, kern.lauf);
      if (offen.pflicht.length) {
        kern.notieren("vorlage_zu_frueh", { offen: offen.pflicht });
        return { ergebnis: { fehler: "noch nicht", nochZuBesprechen: offen.pflicht, hinweis: "Erst die Beratung zu Ende fuehren (Preis fest oder offen, Wuensche, Top 3 oder selbst schauen), dann vorlegen." } };
      }
      const wieViele = Math.max(2, Math.min(6, kern.lauf.profil?.anzahlVorschlaege || 3));
      const ids = (a.ids || []).filter((id) => typeof getItemById === "function" && getItemById(id)).slice(0, wieViele);
      if (!ids.length) return { ergebnis: { fehler: "Keine gueltigen Haus-ids." } };
      kern.lauf.vorlageFuer = Werkzeugkasten.vorlageSchluessel(kern.lauf.profil);
      kern.lauf.vorlagen = Math.max(0, (kern.lauf.vorlagen || 1) - (kern.lauf.letzteVorlage?.join() === ids.join() ? 1 : 0));
      return kern.auswahlVorlegen(ids);
    },

    async haus_oeffnen(a, kern, stufe) {
      const item = typeof getItemById === "function" ? getItemById(a.id) : null;
      if (!item) return { ergebnis: { fehler: `${a.id} kenne ich nicht.` } };
      const schonOffen = Werkzeuge.seite() === "stay" && new URLSearchParams(location.search).get("id") === a.id;
      if (stufe === 1 && !schonOffen) {
        kern.lauf.gewaehlt = a.id;
        if ((kern.lauf.letzteVorlage || []).includes(a.id)) kern.notieren("auswahl", { id: a.id, runde: kern.lauf.runde, ueber: "agent" });
        kern.sperreAn();
        const e = await Werkzeuge.unterkunftOeffnen(a.id);
        if (!e.ok) {
          // Nicht in der sichtbaren Liste: direkt hin
          await Zeiger.warte(300);
          location.href = kern.linkZu(a.id, item.name).href;
        }
        return { navigiert: true, stufe: 2 };
      }
      kern.lauf.gewaehlt = a.id;
      kern.sperreAn();
      const b = await Werkzeuge.bewertungenLesen(a.id);
      kern.sperreAus();
      const d = b.daten || {};
      kern.lauf.gelesen = kern.lauf.gelesen || {};
      kern.lauf.gelesen[a.id] = "hausseite";
      kern.notieren("bewertungen_gelesen", { id: a.id, wo: "hausseite", aspekt: null, einzelne: d.sichtbarGelesen || 0 });
      return {
        ergebnis: { geoeffnet: item.name, id: item.id, bewertungenAusgewertet: d.anzahl ?? item.reviewCount,
          gelobt: d.gelobt || [], kritisiert: d.kritisiert || [],
          jeAspekt: (d.bilanz || []).slice(0, 6).map((x) => ({ aspekt: x.aspekt || x.label, teilnoteVon10: Politik.teilnote(x.anteilPositiv ?? 0), rueckmeldungen: x.erwaehnungen })),
          stimmen: (d.stimmen || []).slice(0, 4).map((x) => ({ gast: x.autor, note: x.note, titel: x.titel, text: x.text })),
          hinweis: "Die Person sieht die Seite jetzt. Fass in zwei, drei Saetzen zusammen, was fuer sie wichtig ist, und frag, ob du vormerken, buchen (je nach Freigabe) oder zurueck sollst." },
        log: `${item.name} geöffnet, ${d.anzahl ?? item.reviewCount} Bewertungen gelesen`,
      };
    },

    /* Bewertungen lesen - und zwar sichtbar.
       ----------------------------------------------------------------
       Der Agent hat bisher ueber Bewertungen gesprochen, ohne dass sich
       die Seite bewegte: Die Zahlen lagen im Katalog, also war das
       Lesen technisch ueberfluessig. Fuer die Person sah es aus wie
       eine Behauptung. Dieses Werkzeug macht den Schritt sichtbar -
       auf der Hausseite durch die Bewertungen selbst, auf der
       Trefferliste ueber die Karte des Hauses - und merkt sich, welche
       Haeuser der Agent wirklich gelesen hat. */
    async bewertungen_lesen(a, kern, stufe) {
      const item = typeof getItemById === "function" ? getItemById(a.id) : null;
      if (!item) return { ergebnis: { fehler: `${a.id} kenne ich nicht.` } };
      const aspekt = String(a.aspekt || "").trim();
      const seite = Werkzeuge.seite();
      const aufDerHausseite = seite === "stay" && new URLSearchParams(location.search).get("id") === a.id;
      const darfBedienen = kern.darf("suchen");

      // Bewertungen stehen auf der Hausseite. Wer darf, geht auch hin -
      // sonst faehrt der Zeiger nur ueber eine Trefferkarte, auf der gar
      // keine Bewertung steht, und das Lesen bleibt eine Behauptung.
      if (stufe === 1 && darfBedienen && !aufDerHausseite) {
        kern.lauf.gewaehlt = a.id;
        kern.sperreAn();
        const e = await Werkzeuge.unterkunftOeffnen(a.id);
        if (!e.ok) {
          await Zeiger.warte(300);
          location.href = kern.linkZu(a.id, item.name).href;
        }
        return { navigiert: true, stufe: 2 };
      }

      /* Erst fragen, dann lesen - einmal je Gespraech.
         ----------------------------------------------------------------
         Nur wenn kein Aspekt im Aufruf steht und die Person auch sonst
         nichts genannt hat. Sagt sie "einfach alles", liest er wie
         vorher; nennt sie etwas, haelt er an den passenden Stimmen an. */
      if (!aspekt) {
        const br = Werkzeugkasten.bewertungsRueckfrage(item, kern.lauf.profil || {}, kern.lauf);
        if (br) {
          kern.lauf.bewertungsFrage = true;
          kern.lauf.anreiseChips = br.chips;
          kern.notieren("bewertungs_rueckfrage", { id: a.id, themen: br.themen });
          return { ergebnis: { fehler: "Noch nicht gelesen", frage: br.satz,
            hinweis: "Sag genau diesen Satz, Wort fuer Wort, und warte auf die Antwort. "
              + "Danach bewertungen_lesen noch einmal rufen, mit ihrem Stichwort als aspekt - "
              + "oder bewertungen_durchsuchen, wenn sie etwas Bestimmtes genannt hat." } };
        }
      }

      kern.sperreAn();
      const b = await Werkzeuge.bewertungenLesen(a.id, { aspekt });
      kern.sperreAus();
      const d = b.daten || {};
      const wo = d.sichtbarGelesen ? "hausseite" : "katalog";

      kern.lauf.gelesen = kern.lauf.gelesen || {};
      kern.lauf.gelesen[a.id] = wo;
      kern.notieren("bewertungen_gelesen", { id: a.id, wo, aspekt: aspekt || null, einzelne: d.sichtbarGelesen || 0 });

      return {
        ergebnis: {
          haus: item.name, id: item.id, gesamtnote: item.rating,
          bewertungenAusgewertet: d.anzahl ?? item.reviewCount,
          ...(d.sichtbarGelesen ? { einzelneGelesen: d.sichtbarGelesen } : {}),
          gelobt: d.gelobt || [], kritisiert: d.kritisiert || [],
          jeAspekt: (d.bilanz || []).slice(0, 6).map((x) => ({ aspekt: x.aspekt || x.label,
            teilnoteVon10: Politik.teilnote(x.anteilPositiv ?? 0), rueckmeldungen: x.erwaehnungen })),
          stimmen: (d.stimmen || []).slice(0, 4).map((x) => ({ gast: x.autor, note: x.note, titel: x.titel, text: x.text })),
          hinweis: "Teilnoten als 'x von 10' nennen, nie als Prozent. Wird es konkret, gib wieder, was in stimmen steht - erfinde keine Inhalte, die dort nicht vorkommen.",
        },
        log: `${item.name}: ${(d.anzahl ?? item.reviewCount).toLocaleString("de-DE")} Bewertungen ausgewertet${d.sichtbarGelesen ? `, ${d.sichtbarGelesen} im Wortlaut gelesen` : ""}`,
      };
    },

    /* Im FAQ nachschlagen - sichtbar.
       ----------------------------------------------------------------
       Zwei Stufen wie beim Lesen der Bewertungen: erst auf die FAQ-Seite,
       dann zum passenden Eintrag fahren und ihn hervorheben. Wer
       zusieht, soll sehen, woher die Antwort kommt.

       Danach geht es zurueck, wo die Person war - eine Frage nach der
       Stornofrist darf nicht die Trefferliste kosten. */
    async faq_nachschlagen(a, kern, stufe) {
      const frage = String(a.frage || "").trim();
      if (typeof faqSuchen !== "function") {
        return { ergebnis: { fehler: "Das FAQ steht hier nicht bereit" } };
      }
      const treffer = faqSuchen(frage);
      if (!treffer.length) {
        kern.notieren("faq_ohne_treffer", { frage: frage.slice(0, 120) });
        return {
          ergebnis: { gefunden: 0, frage,
            hinweis: "Dazu steht nichts im FAQ der Seite. Sag in einem Satz, dass du nur auf das FAQ "
              + "zugreifen kannst und die Frage daraus nicht beantworten laesst, und biete an, was du "
              + "stattdessen tun kannst (suchen, ein Haus ansehen, den Kundenservice nennen). "
              + "Erfinde keine Auskunft und rate nicht." },
          log: `Im FAQ nachgesehen: nichts zu „${frage.slice(0, 40)}“`,
        };
      }

      /* Hinfahren lohnt nur, wenn der Agent die Seite bedienen darf und
         nicht schon dort steht. Der Rueckweg wird gemerkt. */
      const aufFaq = Werkzeuge.seite() === "faq";
      if (stufe === 1 && kern.darf("suchen") && !aufFaq) {
        kern.lauf.faqZurueck = location.href;
        kern.sperreAn();
        await Zeiger.warte(250);
        location.href = `faq.html?frage=${encodeURIComponent(treffer[0].id)}`;
        return { navigiert: true, stufe: 2 };
      }

      if (aufFaq) {
        // Sichtbar zum Eintrag und kurz darauf verweilen
        const el = document.getElementById(treffer[0].id);
        if (el) {
          try { el.open = true; } catch { /* kein details-Element */ }
          await Zeiger.lies(el, { dauer: 900, hinweis: "Antwort im FAQ" });
        }
        kern.sperreAus();
      }
      kern.notieren("faq_treffer", { frage: frage.slice(0, 120), ids: treffer.map((t) => t.id) });

      /* Zurueck, wo die Person war. Ohne das stuende sie nach einer
         Zwischenfrage im FAQ statt in ihrer Trefferliste. */
      const zurueck = kern.lauf.faqZurueck;
      if (zurueck && Werkzeuge.seite() === "faq") {
        kern.lauf.faqZurueck = null;
        kern.sichern();
        await Zeiger.warte(400);
        location.href = zurueck;
        return { navigiert: true, stufe: 3 };
      }

      return {
        ergebnis: {
          gefunden: treffer.length,
          antworten: treffer.map((t) => ({ frage: t.frage, antwort: t.antwort })),
          hinweis: "Antworte mit dem, was in antworten steht - in deinen Worten, aber ohne etwas "
            + "hinzuzufuegen, was dort nicht steht. Eine Antwort reicht meistens; nenn nur dann eine "
            + "zweite, wenn sie wirklich zur Frage gehoert.",
        },
        log: `Im FAQ nachgesehen: ${treffer.map((t) => t.frage).slice(0, 2).join(" / ")}`,
      };
    },

    /* Gezielt in den Bewertungen suchen.
       ----------------------------------------------------------------
       Zwei Stufen wie beim Lesen: erst auf die Hausseite, dann sichtbar
       durch die Bewertungen - und zwar an den Stimmen entlang, die den
       Begriff enthalten. Die Zahlen kommen aus den Daten, die Zitate
       aus den Stimmen, die wirklich davon sprechen. */
    async bewertungen_durchsuchen(a, kern, stufe) {
      const item = typeof getItemById === "function" ? getItemById(a.id) : null;
      if (!item) return { ergebnis: { fehler: `${a.id} kenne ich nicht.` } };
      const begriff = String(a.begriff || "").trim();
      if (begriff.length < 3) {
        return { ergebnis: { fehler: "Ohne Begriff kann ich nicht suchen",
          hinweis: "Frag die Person in einem Satz, worauf genau sie achtet." } };
      }
      if (typeof bewertungenSuchen !== "function") {
        return { ergebnis: { fehler: "Die Bewertungssuche steht hier nicht bereit" } };
      }

      const aufDerHausseite = Werkzeuge.seite() === "stay"
        && new URLSearchParams(location.search).get("id") === a.id;
      if (stufe === 1 && kern.darf("suchen") && !aufDerHausseite) {
        kern.lauf.gewaehlt = a.id;
        kern.sperreAn();
        const e = await Werkzeuge.unterkunftOeffnen(a.id);
        if (!e.ok) { await Zeiger.warte(300); location.href = kern.linkZu(a.id, item.name).href; }
        return { navigiert: true, stufe: 2 };
      }

      const fund = bewertungenSuchen(item, begriff);
      /* Sichtbar durchgehen - mit dem Aspekt, den der Begriff getroffen
         hat. Ohne das waere die Suche eine Behauptung, und genau darum
         geht es bei diesem Agenten nicht. */
      if (aufDerHausseite || Werkzeuge.seite() === "stay") {
        kern.sperreAn();
        await Werkzeuge.bewertungenLesen(a.id, { aspekt: fund?.label || begriff, anzahl: 3 });
        kern.sperreAus();
        kern.lauf.gelesen = kern.lauf.gelesen || {};
        kern.lauf.gelesen[a.id] = "hausseite";
      }
      kern.notieren("bewertungen_durchsucht", { id: a.id, begriff,
        aspekt: fund?.aspekt || null, treffer: fund?.erwaehnungen || 0 });

      if (!fund || !fund.erwaehnungen) {
        return {
          ergebnis: { haus: item.name, begriff, erwaehnungen: 0,
            hinweis: `In den ${fund?.durchgesehen || 0} durchgesehenen Bewertungen von ${item.name} spricht niemand davon. `
              + "Sag genau das, in einem Satz, und biete an, in einem anderen Haus nachzusehen. "
              + "Leite nichts aus der Gesamtnote ab und erfinde nichts." },
          log: `${item.name}: nichts zu „${begriff}“ in ${fund?.durchgesehen || 0} Bewertungen`,
        };
      }
      return {
        ergebnis: {
          haus: item.name, id: item.id, begriff, thema: fund.label || null,
          durchgesehen: fund.durchgesehen, erwaehnungen: fund.erwaehnungen,
          lobend: fund.lobend, kritisch: fund.kritisch,
          stimmen: fund.stimmen.map((x) => ({ gast: x.autor, note: x.note, tendenz: x.tendenz, text: x.text })),
          hinweis: "Nenn die Zahl der Stimmen, die davon sprechen, und wie sie sich verteilen. "
            + "Gib ein Zitat wieder, das wirklich in stimmen steht - erfinde nichts dazu. "
            + "Wenn Lob und Kritik nah beieinander liegen, sag das auch.",
        },
        log: `${item.name}: ${fund.erwaehnungen} von ${fund.durchgesehen} Bewertungen nennen „${begriff}“ (${fund.lobend} lobend, ${fund.kritisch} kritisch)`,
      };
    },

    /* Der Monatsvergleich.
       ----------------------------------------------------------------
       Wunsch des Nutzers vom 27.09.2026: Sagt jemand "im Sommer" und
       ueberlaesst dem Agenten die Wahl, soll der "aktiv im Chat einmal
       alle Monate auswaehlen und kurz durchscrollen, den anderen Monat
       auswaehlen, kurz durchscrollen - und dann sagen koennen, wie viele
       Hotels es gibt, welche Orte es in welchen Monaten gibt."

       Vorher rechnete der Kern dasselbe still im Katalog aus und nannte
       nur das Ergebnis. Fachlich war das richtig, aber es war nicht zu
       sehen - und genau das Zusehen ist hier die Sache: Ein Agent, der
       eine Entscheidung abnimmt, muss zeigen, woher sie kommt, sonst ist
       er ein Zufallsgenerator mit guten Manieren.

       Die Zahlen stammen weiter aus dem Katalog, nicht aus dem DOM: Die
       Maske kann immer nur eine Region filtern, "alle kalten" laesst
       sich dort nicht ausdruecken. Die Liste zeigt also den Monat, die
       Zahl nennt die Haeuser, die zur Person passen - dieselbe Trennung
       wie in der Lage. */
    async monate_vergleichen(a, kern) {
      const p = kern.lauf.profil || {};
      /* Der Fahrplan bestimmt, welche Monate verglichen werden.
         ----------------------------------------------------------------
         Das Modell gab am 27.09.2026 von sich aus "Mai, Juni, Juli,
         August" mit, obwohl die Person "Sommer" gesagt hatte - Mai
         gehoert nicht dazu. Steht ein Vergleich an, gilt die Liste des
         Kerns; die des Modells zaehlt nur, wenn niemand sonst eine hat
         (also wenn die Person von sich aus nach einem Vergleich fragt). */
      const roh = (kern.lauf.monatsvergleich?.monate?.length ? kern.lauf.monatsvergleich.monate : a?.monate) || [];
      const monate = [...new Set(roh.map(Number).filter((m) => Number.isInteger(m) && m >= 1 && m <= 12))].slice(0, 4);
      const aufgeben = (grund) => { kern.lauf.monatsvergleich = null; kern.sichern(); return grund; };
      if (monate.length < 2) return { ergebnis: aufgeben({ fehler: "Zum Vergleichen brauche ich mindestens zwei Monate." }) };
      if (Werkzeuge.seite() !== "results" || !Werkzeuge.hatSuchmaske()) {
        return { ergebnis: aufgeben({ fehler: "Der Vergleich geht nur auf der Trefferliste.",
          hinweis: "Such zuerst, dann vergleiche." }) };
      }
      const name = (m) => (typeof MONATSNAMEN !== "undefined" ? MONATSNAMEN[m - 1] : `Monat ${m}`);

      kern.notieren("monatsvergleich_start", { monate });
      kern.logZeile(`Vergleiche ${monate.length} Monate in der Liste`, "schritt");
      kern.sagen(`Ich stelle die Liste einmal auf ${monate.map(name).join(", ")} um und sehe mir an, was sich unterscheidet.`);

      const ergebnisse = [];
      for (const m of monate) {
        if (Zeiger.abbruch) { kern.notieren("monatsvergleich_abgebrochen", { bei: m }); break; }
        const probe = { ...p, monat: m };
        const wahl = Werkzeugkasten.flexWahl(probe);
        if (!wahl) continue;
        kern.sperreAn();
        // Die Maske umstellen und suchen - sichtbar, wie ein Mensch es taete
        await Werkzeuge.suchen({ flex: { monat: wahl.monat, naechte: p.naechte || 7 } });
        // Die Filter ueberleben die Suche auf dieser Seite nicht immer
        await Werkzeuge.filterSetzen(Werkzeugkasten.filterWerte(p));
        kern.lauf.filterAbdruck = Werkzeuge.filterAbdruck();
        kern.lauf.filterFremd = false;
        await Werkzeuge.ergebnisseLesen(4);
        kern.sperreAus();
        const treffer = Werkzeugkasten.katalogTreffer(probe, Werkzeugkasten.filterAusStand(probe));
        const u = Werkzeugkasten.umfang(treffer, probe);
        const orte = u.jeRegion.slice(0, 2).map((r) => `${r.region} (${r.haeuser})`).join(", ");
        ergebnisse.push({ monat: m, name: name(m), haeuser: treffer.length,
          preisProNacht: u.preisProNacht, regionen: u.jeRegion.slice(0, 3), orte });
        // Nach jedem Monat eine Zeile, aus den Daten - nicht vom Modell
        kern.sagen([
          `${name(m)}: ${treffer.length === 1 ? "ein Haus" : `${treffer.length} Häuser`}`,
          u.preisProNacht ? (u.preisProNacht.von === u.preisProNacht.bis
            ? `${u.preisProNacht.von} € pro Nacht`
            : `${u.preisProNacht.von} bis ${u.preisProNacht.bis} € pro Nacht`) : null,
          orte ? `vor allem ${orte}` : null,
        ].filter(Boolean).join(", ") + ".");
      }

      if (!ergebnisse.length) return { ergebnis: aufgeben({ fehler: "Der Vergleich hat nichts ergeben." }) };

      /* Das Ergebnis: entweder entscheidet der Kern, oder die Person.
         --------------------------------------------------------------
         Hat sie die Wahl abgegeben (der Fahrplan hat den Vergleich
         deshalb angesetzt), trifft der Kern sie jetzt - mit denselben
         Zahlen, die eben ueber den Bildschirm gelaufen sind. Hat sie nur
         gefragt, bleibt die Wahl bei ihr. */
      const selbstEntscheiden = !!kern.lauf.monatsvergleich?.entscheiden;
      kern.lauf.monatsvergleich = null;
      const w = Werkzeugkasten.monatWaehlen(p, ergebnisse.map((x) => x.monat));

      if (selbstEntscheiden && w) {
        p.monat = w.monat;
        kern.standAnzeigen();
        Werkzeugkasten.ableiten(kern, "monat", w.satz);
        kern.notieren("monat_abgeleitet", { monat: w.monat, haeuser: w.anzahl, schnitt: w.schnitt, sichtbar: true });
        /* Die Liste steht jetzt auf dem falschen Monat - dem letzten des
           Vergleichs. Statt sie hier von Hand zurueckzustellen und die
           Lage selbst zu schreiben, wird die Suche einfach fuer ungueltig
           erklaert: Der Zwang holt sie im naechsten Schritt nach, stellt
           den gewaehlten Monat ein, sagt die Lage und setzt die
           Stichprobe an - alles ueber denselben Weg wie sonst. Eine
           zweite Fassung dieser Kette waere eine zweite Fehlerquelle. */
        kern.lauf.gesuchtMit = null;
        kern.lauf.lageFuer = null;
        // In diesem Zug wurde schon einmal gesucht; der Zwang wird dafuer
        // ausdruecklich wieder freigegeben, damit die Liste nicht auf dem
        // letzten Vergleichsmonat stehen bleibt.
        kern.lauf.zwangFrei = "suchen";
        kern.sichern();
        return { ergebnis: { verglichen: ergebnisse, gewaehlt: w.monat,
          hinweis: "Die Zahlen und deine Wahl stehen schon im Chat - nicht wiederholen und nicht umformulieren. Stell jetzt keine Frage; du stellst die Liste gleich auf den gewaehlten Monat um (suchen).",
          ...Werkzeugkasten.fahrplanFuerModell(Werkzeugkasten.fahrplan(p, kern.lauf), p, kern.lauf) } };
      }

      kern.sichern();
      return { ergebnis: { verglichen: ergebnisse,
        hinweis: "Die Zahlen stehen schon im Chat - nicht wiederholen. Sag in einem Satz, was auffaellt, und frag, welcher Monat es sein soll.",
        ...Werkzeugkasten.fahrplanFuerModell(Werkzeugkasten.fahrplan(p, kern.lauf), p, kern.lauf) } };
    },

    /* Die Stichprobe.
       ----------------------------------------------------------------
       Wunsch des Nutzers vom 27.09.2026: Der Agent soll nach der ersten
       Suche "nicht nur scrollen innerhalb des Bereichs, sondern
       vielleicht auch mal in ein, zwei Hotels reingehen, sich die Seite
       angucken, dann wieder raus - gibt es ueberhaupt eine Halbpension
       und so."

       Sie ist der kleine Bruder des Rundgangs und teilt dessen Aufbau:
       ueber Seitenwechsel hinweg, Stand in lauf.stichprobe, Stufe im
       ausstehenden Aufruf. Zwei Unterschiede, beide gewollt. Erstens
       werden keine Bewertungen gelesen - das dauert je Haus acht
       Sekunden und ist Sache des Rundgangs, hier geht es nur um einen
       Blick. Zweitens wird nichts ausgewaehlt: Die Person hat noch gar
       nicht gesagt, was sie will, und ein Agent, der auf einer Seite
       Haken setzt, die er gleich wieder verlaesst, hinterlaesst einen
       Zustand, den niemand bestellt hat.

       Zwei Haeuser, nicht mehr. Jedes kostet einen Seitenwechsel, und
       die Stichprobe steht zwischen der Lage und der ersten Frage - was
       hier an Zeit dazukommt, wartet die Person voll ab. */
    async stichprobe_nehmen(a, kern, stufe) {
      const r = kern.lauf.stichprobe;
      if (!r || !r.ids?.length) return { ergebnis: { fehler: "Gerade steht keine Stichprobe an." } };
      const p = kern.lauf.profil || {};

      const fertig = () => {
        const gesehen = r.gesehen || [];
        kern.lauf.stichprobe = null;
        kern.lauf.stichprobeGemacht = true;
        kern.sichern();
        kern.notieren("stichprobe_fertig", { haeuser: gesehen.map((x) => x.id) });
        return { ergebnis: {
          angesehen: gesehen,
          hinweis: gesehen.length
            ? "Du warst gerade in diesen Haeusern und hast Zimmer und Verpflegung gesehen. Im Chat steht schon, was du dort gefunden hast - wiederhol es nicht. Stell jetzt die naechste Frage."
            : "Die Stichprobe hat nichts ergeben. Mach einfach weiter.",
          ...Werkzeugkasten.fahrplanFuerModell(Werkzeugkasten.fahrplan(p, kern.lauf), p, kern.lauf) } };
      };

      const hin = async (id) => {
        kern.sperreAn();
        const e = await Werkzeuge.unterkunftOeffnen(id);
        if (!e.ok) {
          await Zeiger.warte(250);
          location.href = kern.linkZu(id, getItemById(id)?.name || id).href;
        }
      };

      // Wer selbst klickt, hat das Wort - dann bricht die Stichprobe ab
      if (Zeiger.abbruch) { kern.notieren("stichprobe_abgebrochen", { bei: r.i }); kern.lauf.stichprobe = null; kern.lauf.stichprobeGemacht = true; return fertig(); }

      if (stufe === 1) {
        kern.notieren("stichprobe_start", { ids: r.ids });
        kern.logZeile(`Schaue kurz in ${r.ids.length === 1 ? "ein Haus" : `${r.ids.length} Häuser`} hinein`, "schritt");
        const namen = r.ids.map((id) => getItemById(id)?.name || id);
        kern.sagen(r.ids.length === 1
          ? `Ich schaue mir ${namen[0]} eben kurz an, damit ich weiß, was die Häuser hier überhaupt anbieten.`
          : `Ich schaue eben kurz in zwei Häuser hinein - ${namen.join(" und ")} - damit ich weiß, was es hier an Zimmern und Verpflegung gibt.`);
        r.zurueck = location.href;
        kern.sichern();
        await hin(r.ids[0]);
        return { navigiert: true, stufe: 2 };
      }

      if (stufe === 2) {
        const id = r.ids[r.i];
        kern.sperreAn();
        const e = await Werkzeuge.hausUeberfliegen(id);
        kern.sperreAus();
        if (e.text) kern.logZeile(e.text, "ergebnis");
        (r.gesehen ||= []).push({ id, name: e.daten?.name || id, schritte: e.daten?.schritte || [], verpflegung: e.daten?.verpflegung || [] });
        // Was er gesehen hat, sagt der Kern - aus den Daten der Seite,
        // nicht aus dem Katalog und nicht aus dem Modell.
        if ((e.daten?.schritte || []).length) kern.sagen(`${e.daten.name}: ${e.daten.schritte.join(" · ")}.`);
        r.i += 1;
        kern.sichern();
        if (Zeiger.abbruch) { kern.notieren("stichprobe_abgebrochen", { bei: r.i }); kern.lauf.stichprobe = null; kern.lauf.stichprobeGemacht = true; return fertig(); }
        if (r.i < r.ids.length) { await hin(r.ids[r.i]); return { navigiert: true, stufe: 2 }; }
        kern.sperreAn();
        if (r.zurueck) { await Zeiger.warte(250); location.href = r.zurueck; }
        else await Werkzeuge.zurueckZurListe();
        return { navigiert: true, stufe: 3 };
      }

      // Zurueck auf der Liste: Die Filter sind beim Neuladen weg und
      // muessen wieder stehen - sonst sieht die Person nach dem Ausflug
      // wieder alle Haeuser des Katalogs.
      if (Werkzeuge.seite() === "results" && !Zeiger.abbruch) {
        kern.sperreAn();
        const wieder = await Werkzeuge.filterSetzen(Werkzeugkasten.filterWerte(p));
        kern.lauf.filterAbdruck = Werkzeuge.filterAbdruck();
        kern.lauf.filterFremd = false;
        if (p.sortierung) await Werkzeuge.sortieren(p.sortierung === "bewertung" ? "rating" : "preis-asc");
        if (wieder.text) kern.logZeile(`Filter wieder gesetzt: ${wieder.text}`, "ergebnis");
      }
      kern.sperreAus();
      return fertig();
    },

    /* Der Rundgang.
       ----------------------------------------------------------------
       Ueber mehrere Seitenwechsel hinweg: Haus oeffnen, ansehen,
       naechstes Haus, am Ende zurueck zur Liste und vorlegen. Der Stand
       steht in lauf.rundgang, die Stufe im ausstehenden Werkzeugaufruf -
       so ueberlebt der Rundgang jedes Neuladen der Seite.

       Dauert je Haus acht bis zehn Sekunden. Das ist Absicht: Die Person
       soll sehen, woher die Empfehlung kommt. Wer selbst klickt, bricht
       ab (Zeiger.abbruch), dann wird sofort vorgelegt. */
    async haeuser_ansehen(a, kern, stufe) {
      const r = kern.lauf.rundgang;
      if (!r || !r.ids?.length) return { ergebnis: { fehler: "Gerade steht kein Rundgang an." } };
      const p = kern.lauf.profil || {};

      const vorlegen = async () => {
        kern.lauf.rundgang = null;
        const v = await kern.auswahlVorlegen(r.ids);
        return { ergebnis: v.ergebnis ?? v, log: v.log ?? null };
      };
      const hin = async (id) => {
        kern.sperreAn();
        const e = await Werkzeuge.unterkunftOeffnen(id);
        if (!e.ok) {
          await Zeiger.warte(250);
          location.href = kern.linkZu(id, getItemById(id)?.name || id).href;
        }
      };

      if (Zeiger.abbruch) { kern.notieren("rundgang_abgebrochen", { bei: r.i }); return vorlegen(); }

      if (stufe === 1) {
        kern.notieren("rundgang_start", { ids: r.ids });
        kern.logZeile(`Sehe mir ${r.ids.length} Häuser der Reihe nach an`, "schritt");
        // Die Ansage kommt vom Kern, nicht vom Modell - sie soll stimmen
        // und immer da sein, auch wenn das Modell gerade nichts schreibt.
        // "die 1 Häuser" stand so im Chat, als nur ein Haus uebrigblieb
        kern.sagen(r.ids.length === 1
          ? `Ich sehe mir das Haus jetzt an: Bewertungen, Zimmer, Verpflegung.`
          : `Ich sehe mir die ${r.ids.length} Häuser jetzt der Reihe nach an: Bewertungen, Zimmer, Verpflegung. Nach jedem sage ich dir Bescheid.`);
        // Die Adresse der Liste festhalten. Der Brotkrumenpfad auf der
        // Hausseite fuehrt zu "results.html?type=hotel" - ohne Monat,
        // Dauer und Reisende. Danach stand die Liste auf 184 von 184
        // Treffern und die Vorschlagslinks rechneten mit sieben Naechten.
        r.zurueck = location.href;
        kern.sichern();
        await hin(r.ids[0]);
        return { navigiert: true, stufe: 2 };
      }

      if (stufe === 2) {
        const id = r.ids[r.i];
        const wunsch = (p.kriterien || []).map((k) => Politik.kriterium(k.id)).find((k) => k?.aspekt);
        kern.sperreAn();
        const e = await Werkzeuge.hausPruefen(id, {
          aspekt: wunsch?.label || "",
          verpflegung: p.verpflegung || null,
          personenProZimmer: Math.ceil(((p.erwachsene || 0) + (p.kinder || 0)) / Math.max(1, p.zimmer || 1)),
        });
        kern.sperreAus();
        if (e.text) kern.logZeile(e.text, "ergebnis");
        (kern.lauf.gelesen ||= {})[id] = "hausseite";
        // Welches Zimmer der Agent gewaehlt hat - damit es auf der
        // Hausseite noch steht, wenn die Person spaeter draufklickt
        if (e.daten?.zimmer) (kern.lauf.zimmerWahl ||= {})[id] = e.daten.zimmer;
        (r.gesehen ||= []).push({ id, schritte: e.daten?.schritte || [], stimmen: (e.daten?.stimmen || []).slice(0, 2) });

        /* Nach jedem Haus eine Zeile im Chat.
           --------------------------------------------------------------
           Der Rundgang dauert bei fuenf Haeusern gut 45 Sekunden. Ohne
           Zwischenstand sieht die Person nur, dass sich Seiten oeffnen,
           und weiss nicht, wo der Agent steht. Die Saetze kommen aus den
           Daten, nicht vom Modell: Was er getan hat, soll genau so
           dastehen, wie es passiert ist. */
        const nr = r.i + 1;
        const name = getItemById(id)?.name || id;
        const teil = wunsch ? (e.daten?.bilanz || []).find((b) => (b.aspekt || b.label) === wunsch.label) : null;
        const naechstes = r.ids[r.i + 1];
        const weiter = naechstes
          ? `Weiter mit ${getItemById(naechstes)?.name || naechstes}.`
          : "Das war das letzte, ich stelle die Auswahl zusammen.";
        kern.sagen([
          `${nr} von ${r.ids.length}: ${name} angesehen.`,
          (e.daten?.schritte || []).length ? `${(e.daten.schritte || []).join(", ")}.` : null,
          teil ? `${wunsch.label}: ${Politik.teilnoteText(teil.anteilPositiv)}.` : null,
          /* Ein echtes Zitat.
             ------------------------------------------------------------
             Eine Zahl kann man ausrechnen, ein Zitat nur lesen. Es ist
             damit der einzige Beleg, den der Agent gar nicht haette, wenn
             er die Bewertungen nicht durchgegangen waere - und das, was
             eine Zusammenfassung glaubwuerdig macht. Der Kern waehlt es
             aus den Daten, das Modell fasst es nicht an. */
          /* Das Zitat muss zu dem passen, was darueber steht.
             ------------------------------------------------------------
             Vorher nahm der Kern die erste Stimme, die lang genug war.
             Damit stand am 02.10.2026 ein Lob fuer das Essen unter einem
             Satz, der das Essen bemaengelte. Jetzt wird nach dem Aspekt
             gesucht, von dem die Zeile spricht, und nach dem Vorzeichen,
             das zur Teilnote passt: Ueber 60 Prozent Zustimmung sucht er
             eine zustimmende Stimme, darunter eine kritische. Findet er
             keine, laesst er das Zitat weg - ein unpassender Beleg ist
             schlechter als keiner. */
          (() => {
            const stimmen = (e.daten?.stimmen || []).filter((x) => x.text && x.text.length > 30);
            if (!stimmen.length) return null;
            const lang = (x) => (x.text.length > 110 ? `${x.text.slice(0, 107).trim()}...` : x.text);
            if (!teil) {
              // Ohne genannten Aspekt steht keine Bewertung darueber, die
              // ein Zitat stuetzen muesste - dann ist jede Stimme ehrlich.
              return `Eine Stimme: „${lang(stimmen[0])}"`;
            }
            const wollen = teil.anteilPositiv >= 0.6 ? 1 : -1;
            const passend = stimmen.find((x) => (x.aspekte || {})[wunsch.label] === wollen);
            if (!passend) return null;
            return `Dazu eine Stimme: „${lang(passend)}"`;
          })(),
          weiter,
        ].filter(Boolean).join(" "));

        r.i += 1;
        kern.sichern();
        if (Zeiger.abbruch) { kern.notieren("rundgang_abgebrochen", { bei: r.i }); return vorlegen(); }
        if (r.i < r.ids.length) { await hin(r.ids[r.i]); return { navigiert: true, stufe: 2 }; }
        kern.sperreAn();
        if (r.zurueck) { await Zeiger.warte(250); location.href = r.zurueck; }
        else await Werkzeuge.zurueckZurListe();
        return { navigiert: true, stufe: 3 };
      }

      // Die Liste hat neu geladen und steht wieder unfiltriert da. Wer die
      // Ansicht schliesst und selbst schaut, soll die Filter vorfinden, die
      // der Agent gesetzt hatte - sonst stehen dort wieder alle 184 Haeuser.
      if (Werkzeuge.seite() === "results" && !Zeiger.abbruch) {
        kern.sperreAn();
        const wieder = await Werkzeuge.filterSetzen(Werkzeugkasten.filterWerte(p));
        kern.lauf.filterAbdruck = Werkzeuge.filterAbdruck();
        kern.lauf.filterFremd = false;
        if (p.sortierung) await Werkzeuge.sortieren(p.sortierung === "bewertung" ? "rating" : "preis-asc");
        if (wieder.text) kern.logZeile(`Filter wieder gesetzt: ${wieder.text}`, "ergebnis");
      }
      kern.sperreAus();
      kern.notieren("rundgang_fertig", { haeuser: (r.gesehen || []).length });
      return vorlegen();
    },

    async zurueck_zur_liste(a, kern, stufe) {
      if (Werkzeuge.seite() === "results") return { ergebnis: { ok: true, hinweis: "Die Liste ist schon offen." } };
      if (stufe === 1) { kern.sperreAn(); await Werkzeuge.zurueckZurListe(); return { navigiert: true, stufe: 2 }; }
      kern.sperreAus();
      return { ergebnis: { ok: true, seite: "Trefferliste" } };
    },

    async merken(a, kern) {
      const item = typeof getItemById === "function" ? getItemById(a.id) : null;
      if (!item) return { ergebnis: { fehler: `${a.id} kenne ich nicht.` } };
      kern.notieren("merken", { id: a.id });
      kern.sperreAn();
      let e = await Werkzeuge.merken(a.id);
      kern.sperreAus();
      if (!e.ok && typeof Wishlist !== "undefined") {
        // Kein Knopf auf dieser Seite: direkt eintragen
        if (!Wishlist.has(a.id)) Wishlist.toggle?.(a.id);
        e = { ok: true, text: `${item.name} vorgemerkt.` };
      }
      return { ergebnis: { ok: e.ok, text: e.text, merkzettelLink: "merkzettel.html" }, log: e.text };
    },

    /* Buchung vorbereiten: (1) Hausseite oeffnen, falls noetig; (2) auf
       der Hausseite "Buchen" klicken - laedt die Buchungsstrecke; (3)
       Gastdaten aus dem Konto, weiter zur Pruefseite. */
    async buchung_vorbereiten(a, kern, stufe) {
      /* Welches Haus - das steht in der Adresse.
         ----------------------------------------------------------------
         Gemeldet am 02.10.2026: Die Person stand im Buchungsformular von
         Gut Hohenkirchen und sagte "ich moechte, dass du es ausfuellst".
         Antwort: "Bitte sag mir, welches der vier Hotels du buchen
         moechtest." Sie hatte es laengst gesagt - durch Hingehen.

         Fehlt die Kennung im Aufruf, nimmt der Kern die der offenen
         Seite. Das ist keine Annahme, sondern das, was die Person
         sichtbar vor sich hat; dasselbe Prinzip wie bei
         `seitenstandUebernehmen`. */
      let id = a.id;
      if (!id && typeof Werkzeuge !== "undefined" && ["stay", "checkout"].includes(Werkzeuge.seite())) {
        id = new URLSearchParams(location.search).get("id") || kern.lauf.gewaehlt || null;
        if (id) kern.notieren("haus_aus_der_seite", { id, wo: Werkzeuge.seite() });
      }
      if (!id) id = kern.lauf.gewaehlt || null;
      a = { ...a, id };
      const item = typeof getItemById === "function" ? getItemById(id) : null;
      if (!item) {
        return { ergebnis: { fehler: id ? `${id} kenne ich nicht.` : "Kein Haus angegeben",
          hinweis: "Frag in einem Satz, welches Haus es sein soll - aber nur, wenn die Person nicht "
            + "gerade auf einer Hausseite oder im Buchungsformular steht. Dort gilt das Haus der Seite." } };
      }
      const seite = Werkzeuge.seite();
      const idHier = new URLSearchParams(location.search).get("id");
      kern.lauf.gewaehlt = a.id;
      if (a.verpflegung) kern.lauf.profil.verpflegung = a.verpflegung;
      const flexibel = kern.lauf.profil.flexibel && !(kern.lauf.profil.von && kern.lauf.profil.bis);
      if (a.anreise) {
        // Bei flexibler Suche zaehlt nur der Tag - Monat und Jahr kommen aus
        // der Suche (das Modell setzte sonst das laufende Jahr ein)
        const fw = flexibel ? Werkzeugkasten.flexWahl(kern.lauf.profil) : null;
        const roh = String(a.anreise);
        const tag = parseInt(roh.slice(-2), 10);
        /* Der rohe Wert des Modells war die letzte offene Tuer: Ohne
           flexible Suche wurde er ungeprueft uebernommen, und so stand
           bei einer Junireise der 1. November im Stand (gemeldet am
           02.10.2026). Jetzt muss er zum gemerkten Monat passen. */
        const monatDesTages = /^\d{4}-\d{2}-\d{2}$/.test(roh) ? new Date(roh).getMonth() + 1 : null;
        const pm = kern.lauf.profil.monat;
        if (pm && monatDesTages && monatDesTages !== pm) {
          kern.notieren("anreise_anderer_monat", { anreise: roh, monat: pm, wo: "buchung_vorbereiten" });
          delete a.anreise;
        } else {
          kern.lauf.profil.anreise = fw && tag >= 1 && tag <= 31 ? `${fw.monat}-${String(tag).padStart(2, "0")}` : roh;
        }
      }
      // Mit Flug: nur an Flugtagen der Verbindung, und nach n Naechten muss
      // wieder einer sein - das gilt auch fuer feste Daten
      const pf = kern.lauf.profil;
      const flug = pf.flug && item.type !== "apartment" && typeof Flug !== "undefined" ? Flug.wahl(item.ziel) : null;
      const monatSchluessel = flexibel ? Werkzeugkasten.flexWahl(pf)?.monat : (pf.von || "").slice(0, 7);
      if (flug && monatSchluessel && pf.naechte) {
        const tage = Flug.anreiseTage(flug, monatSchluessel, pf.naechte);
        const verbindung = `${flug.airline} ab ${flug.from} fliegt ${Flug.tageText(flug, true)}`;
        if (!tage.length) {
          const alt = Flug.naechteAlternativen(flug, monatSchluessel, pf.naechte);
          return { ergebnis: { fehler: "Kein Rueckflug passt", verbindung, naechte: pf.naechte, moeglicheDauern: alt,
            hinweis: "Mit dieser Dauer passt kein Rueckflug. Sag der Person, an welchen Tagen die Verbindung fliegt und welche Dauern gehen; sie entscheidet (dann stand_merken mit naechte)." } };
        }
        const gewuenscht = pf.anreise || (!flexibel ? pf.von : null);
        if (gewuenscht && !tage.includes(gewuenscht)) {
          pf.anreise = null;
          kern.lauf.anreiseChips = tage.slice(0, 4).map((d) => `${new Date(d).getDate()}. ${["Jan.", "Feb.", "März", "April", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."][new Date(d).getMonth()]}`);
          return { ergebnis: { fehler: "Kein Flugtag", gewuenscht: Flug.datumText(gewuenscht), verbindung, moeglicheAnreisetage: tage.slice(0, 8).map((d) => Flug.datumText(d)),
            hinweis: "Der gewuenschte Tag ist kein Flugtag. Sag der Person, wann die Verbindung fliegt, nenn zwei, drei moegliche Anreisetage und frag, welcher passt. Erst mit ihrem Tag buchung_vorbereiten mit anreise rufen." } };
        }
        if (!flexibel && !pf.anreise) pf.anreise = pf.von;
        // Ein anderer Flugtag als die genannte Anreise: die Daten ruecken mit
        if (!flexibel && pf.anreise && pf.anreise !== pf.von) {
          pf.von = pf.anreise;
          pf.bis = new Date(new Date(pf.anreise).getTime() + pf.naechte * 86400000).toISOString().slice(0, 10);
          kern.standAnzeigen();
        }
      }
      if (flexibel) {
        /* Der Anreisetag muss von der Person kommen - das Modell hat ihn
           sonst gern selbst gesetzt ("1. Oktober"). Geprueft wird, ob in
           ihren letzten Nachrichten ueberhaupt ein Tag vorkommt.

           Dazu seit dem 01.10.2026 ein zweiter Weg. Seit der Kern gleich
           nach dem Monat einmal nach dem genauen Tag fragt, faellt die
           Antwort viel frueher als die Buchung - oft zehn Nachrichten
           davor. Das Fenster der letzten vier haette den Tag dann
           weggeworfen und ein zweites Mal danach gefragt, obwohl die
           Person ihn laengst genannt hat.

           Der zweite Weg ist enger als der erste, nicht weiter: Er
           verlangt, dass genau der gemerkte Tag irgendwo in ihren eigenen
           Nachrichten steht. Ein Tag, den das Modell sich ausgedacht hat,
           kommt damit weiterhin nicht durch. */
        const nutzer = kern.lauf.gespraech.filter((n) => n.role === "user");
        const tagZahl = parseInt(String(kern.lauf.profil.anreise || "").slice(-2), 10);
        const tagGenannt = nutzer.slice(-4).some((n) => Werkzeugkasten.TAG.test(String(n.content)))
          || (!!tagZahl && nutzer.some((n) => new RegExp(`(^|[^\\d])0?${tagZahl}\\s*\\.`).test(String(n.content))));
        if (!kern.lauf.profil.anreise || !tagGenannt) {
          kern.lauf.profil.anreise = null;
          kern.standAnzeigen();
          const tage = flug && monatSchluessel && pf.naechte ? Flug.anreiseTage(flug, monatSchluessel, pf.naechte) : null;
          if (tage) kern.lauf.anreiseChips = tage.slice(0, 4).map((d) => `${new Date(d).getDate()}. ${["Jan.", "Feb.", "März", "April", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."][new Date(d).getMonth()]}`);
          return { ergebnis: { fehler: "Anreisetag fehlt",
            ...(tage ? { verbindung: `${flug.airline} ab ${flug.from} fliegt ${Flug.tageText(flug, true)}`, moeglicheAnreisetage: tage.slice(0, 8).map((d) => Flug.datumText(d)) } : {}),
            hinweis: tage
              ? "Die Suche war flexibel im Monat. Frag die Person, an welchem der Flugtage sie anreisen will (nenn zwei, drei). Erst mit ihrem Tag buchung_vorbereiten mit anreise rufen - keinen Tag selbst waehlen."
              : "Die Suche war flexibel im Monat, und die Person hat noch keinen Tag genannt. Frag sie, an welchem Tag sie anreisen will (im Prototyp ist jeder Tag frei, der Preis im Monat gleich). Erst mit ihrem Tag buchung_vorbereiten mit anreise rufen - keinen Tag selbst waehlen." } };
        }
      }
      /* Bevor gebucht wird, steht da, wann geflogen wird.
         ----------------------------------------------------------------
         Wunsch des Nutzers vom 27.09.2026: "Irgendwann muss der Person
         mitgeteilt werden, was das jetzt bedeuten wuerde, wann der Flug
         denn ist." Bis hierher war der Flug eine Zeile im Preis - mit
         Flug, 1.240 Euro. An welchem Tag, mit wem, um wie viel Uhr: nicht
         gesagt. Wer so bucht, erfaehrt seinen Abflug erst in der Kasse.

         Der Satz kommt vom Kern und aus den Flugdaten, einmal je Haus und
         Tag. Er steht vor dem Klick auf "Buchen", nicht danach. */
      if (flug && pf.anreise && kern.lauf.flugGesagtFuer !== `${a.id}|${pf.anreise}`) {
        kern.lauf.flugGesagtFuer = `${a.id}|${pf.anreise}`;
        const rueck = pf.naechte ? new Date(new Date(pf.anreise).getTime() + pf.naechte * 86400000) : null;
        kern.sagen([
          `Der Hinflug wäre am ${Flug.datumText(pf.anreise)}: ${flug.airline} ab ${flug.from} um ${flug.depart}${flug.stops === 0 ? ", direkt" : `, ${flug.stops} Stopp`}.`,
          rueck ? `Zurück am ${Flug.datumText(Werkzeugkasten.alsIso(rueck))}.` : null,
        ].filter(Boolean).join(" "));
        kern.notieren("flug_genannt", { id: a.id, anreise: pf.anreise, airline: flug.airline, ab: flug.from });
      }

      /* Die Seite muss zu dem Haus gehoeren, um das es geht.
         ----------------------------------------------------------------
         Am 25.09.2026 bereitete der Agent zweimal die Buchung eines Hauses
         vor, das gar nicht vorgeschlagen war: Im Log stand die richtige
         id, in der Kasse stand ein anderes Hotel. Der Grund war eine
         fehlende Pruefung - Stufe 2 klickte den Buchungsknopf der
         Hausseite, die gerade offen war, ohne zu vergleichen, welches Haus
         das ist. Auf jeder Stufe wird jetzt abgeglichen. Welches Haus
         gebucht wird, ist die Hauptmessgroesse; hier darf nichts
         verrutschen. */
      if (stufe === 1) {
        /* Der Flug wird gewaehlt, nicht gesetzt - und er ist das zweite
           Objekt der Erhebung.
           --------------------------------------------------------------
           Vor dem Zimmer, weil er den Preis staerker bewegt. Gefragt wird
           hier und nicht in der Beratung: Welche Verbindungen es gibt,
           haengt am Ziel, und das steht erst mit dem Haus fest. */
        const fr = Werkzeugkasten.flugRueckfrage(item, kern.lauf.profil || {}, kern.lauf);
        if (fr && typeof Fluege !== "undefined") {
          kern.lauf.flugGefragt = true;
          const ids = fr.kandidaten.map((k) => k.id);
          const partnerId = typeof Studie !== "undefined" && Studie.partnerflug ? Studie.partnerflug(ids) : null;
          const kandidaten = fr.kandidaten.map((k) => ({ ...k, partner: k.id === partnerId }));
          kern.lauf.partnerFlugId = partnerId;
          kern.sichern();
          Fluege.zeigen(kandidaten, kern, {
            kennzeichnung: kern.kennzeichnung ? kern.kennzeichnung() : "etikett",
            kontext: `${item.name} · ${kandidaten.length} Verbindungen`,
          });
          /* Der Satz kommt vom Kern, und der Zug endet hier. Vorher sollte
             das Modell "in einem Satz" sagen, dass gewaehlt werden kann -
             und nach der Wahl ging es nicht weiter (03.10.2026). */
          kern.sagenUndMerken(`Ich habe dir die Flüge zu ${item.name} geöffnet. Wähl einfach einen aus, dann mache ich mit der Buchung weiter.`);
          kern.lauf.flugWartet = a.id;
          kern.lauf.kernWartet = true;
          return { ergebnis: { fehler: "Flug noch nicht gewaehlt",
            hinweis: "Der Chat hat die Person gebeten, den Flug zu waehlen. Schreib nichts dazu." } };
        }

        /* Das Zimmer waehlt die Person, nicht der Agent.
           --------------------------------------------------------------
           Gefragt wird genau hier, einmal, mit den Aufpreisen - nicht
           schon in der Beratung: Welche Zimmer es gibt, haengt am Haus,
           und das steht erst jetzt fest. */
        const zr = Werkzeugkasten.zimmerRueckfrage(item, kern.lauf.profil || {}, kern.lauf);
        if (zr) {
          kern.lauf.zimmerGefragt = true;
          kern.lauf.anreiseChips = zr.chips;
          kern.notieren("zimmer_rueckfrage", { id: a.id, zimmer: zr.chips });
          /* Die Frage stellt der Kern selbst. Das Modell sollte sie "Wort
             fuer Wort" sagen - im Chat stand am 03.10.2026 nur "Welches
             soll es sein?", ohne die Zimmer. Die Antwort liest der Kern
             (zimmerAntwort) und macht danach mit der Buchung weiter. */
          kern.sagenUndMerken(zr.satz);
          kern.lauf.chips = zr.chips;
          AgentPanel.setSuggestions?.(zr.chips);
          kern.lauf.zimmerFrage = { id: a.id, namen: zr.chips };
          kern.lauf.kernWartet = true;
          return { ergebnis: { fehler: "Zimmer noch nicht gewaehlt",
            hinweis: "Der Chat hat die Person nach dem Zimmer gefragt. Schreib nichts dazu." } };
        }
        kern.notieren("zur_buchung", { id: a.id });
        if (seite === "checkout" && idHier === a.id) return this.werkzeuge.buchung_vorbereiten.call(this, a, kern, 3);
        if (seite === "stay" && idHier === a.id) return this.werkzeuge.buchung_vorbereiten.call(this, a, kern, 2);
        kern.lauf.buchungUmweg = false;
        kern.sperreAn();
        // Sichtbar klicken nur, wo die Karte wirklich liegt - auf einer
        // fremden Hausseite oder in der Kasse gibt es sie nicht
        const e = seite === "results" ? await Werkzeuge.unterkunftOeffnen(a.id) : { ok: false };
        if (!e.ok) { await Zeiger.warte(300); location.href = kern.linkZu(a.id, item.name).href; }
        return { navigiert: true, stufe: 2 };
      }
      if (stufe === 2) {
        if (seite !== "stay" || idHier !== a.id) {
          kern.notieren("falsche_hausseite", { erwartet: a.id, ist: idHier || seite });
          if (kern.lauf.buchungUmweg) {
            kern.sperreAus();
            return { ergebnis: { fehler: `Die Seite von ${item.name} laesst sich gerade nicht oeffnen.`,
              hinweis: "Sag der Person, dass da etwas klemmt, und biete an, dass sie das Haus selbst aus der Liste oeffnet." } };
          }
          kern.lauf.buchungUmweg = true;
          await Zeiger.warte(200);
          location.href = kern.linkZu(a.id, item.name).href;
          return { navigiert: true, stufe: 2 };
        }
        kern.lauf.buchungUmweg = false;
        kern.sperreAn();
        const e = await Werkzeuge.zurBuchung(a.id, kern.lauf.profil.verpflegung || null, kern.lauf.profil.anreise || null, kern.lauf.profil.zimmerTyp || null);
        if (!e.ok) { kern.sperreAus(); return { ergebnis: { fehler: e.text } }; }
        return { navigiert: true, stufe: 3 };
      }
      // Stufe 3: Buchungsstrecke
      if (seite !== "checkout") return { ergebnis: { fehler: "Die Buchungsstrecke ist nicht offen." } };
      if (idHier !== a.id) {
        const falsch = typeof getItemById === "function" ? getItemById(idHier)?.name : null;
        kern.notieren("falsche_buchungsseite", { erwartet: a.id, ist: idHier });
        kern.sperreAus();
        return { ergebnis: { fehler: `In der Buchungsstrecke steht ${falsch || idHier}, nicht ${item.name}.`,
          hinweis: "Nichts vorlegen und nichts behaupten. Sag der Person, dass da etwas schiefgelaufen ist, und ruf buchung_vorbereiten mit der richtigen id noch einmal." },
          log: `Abgebrochen: in der Kasse stand ${falsch || idHier} statt ${item.name}` };
      }
      kern.sperreAn();
      const vor = await Werkzeuge.buchungAbschliessen({ nurVorbereiten: true, daten: Werkzeugkasten.formulardaten(kern) });
      kern.sperreAus();
      if (vor.daten?.wartetAufDaten || !vor.ok) {
        kern.notieren("formular_unvollstaendig", { fehlt: vor.daten?.fehlt || [] });
        return { ergebnis: { fehler: vor.text, fehlt: vor.daten?.fehlt || [],
          hinweis: "Frag nach genau diesen Angaben, alle auf einmal in einem Satz - nicht Feld fuer Feld. Sobald sie da sind, merk sie mit stand_merken (reisende, geburtsdaten) und ruf buchung_vorbereiten noch einmal." }, log: vor.text };
      }
      kern.notieren("buchung_vorbereitet", { id: a.id, ausgefuellt: vor.daten?.geaendert || [] });
      const z = Werkzeuge.buchungsZusammenfassung();
      if (kern.darf("buchen")) kern.lauf.abschlussFaellig = true;
      else kern.notieren("gegenzeichnung_vorgelegt", { id: a.id });
      /* Der Bericht listet, was er getan hat.
         ----------------------------------------------------------------
         Nicht, was im Formular steht. Der Unterschied ist der Kern der
         Sache: Voreingestelltes hat er nicht angefasst, also kommt es
         hier nicht vor. Das ist eine ehrliche Regel - "ich sage dir, was
         ich gemacht habe" - und erzeugt trotzdem eine Luecke. Genau die
         soll sichtbar werden, und zwar ohne dass irgendwo im Code steht,
         dass etwas verschwiegen werden soll. */
      const getan = vor.daten?.geaendert || [];
      /* Ohne Freigabe zum Buchen sagt der Kern die Zusammenfassung selbst.
         --------------------------------------------------------------
         Am 03.10.2026 stand im Chat "Ich habe fuer das Hotel Cala Blanca
         Mar vom 12. bis 21. Der Gesamtpreis betraegt 4.027 EUR" - ein Satz
         des Modells, in der Mitte beschnitten, und ohne Hinweis, dass der
         Preis ueber dem Budget lag. Haus, Zeitraum, Zimmer und Preis
         stehen fest; dafuer braucht es kein Modell. */
      if (!kern.darf("buchen")) {
        const p0 = kern.lauf.profil || {};
        const zahl = Number(String(z?.gesamt || "").replace(/[^\d]/g, "")) || null;
        const ueber = p0.budgetGesamt && zahl && zahl > p0.budgetGesamt;
        const teile = [
          getan.length ? `Ich habe ausgefüllt: ${getan.join(", ")}.` : null,
          `Gebucht würde ${z?.titel || item.name}, ${z?.zeitraum || ""}${z?.details ? `, ${z.details}` : ""}, insgesamt ${z?.gesamt || ""}.`
            .replace(/, ,/g, ",").replace(/ ,/g, ","),
          ueber ? `Das liegt über deinem Budget von ${Politik.euro(p0.budgetGesamt)}.` : null,
          "Soll ich die Buchung abschließen?",
        ].filter(Boolean);
        kern.sagenUndMerken(teile.join(" "));
        kern.lauf.chips = ["Ja, abschließen", "Noch nicht"];
        AgentPanel.setSuggestions?.(kern.lauf.chips);
        kern.lauf.abschlussFrage = a.id;
        kern.lauf.kernWartet = true;
        if (ueber) kern.notieren("kasse_ueber_budget", { gesamt: zahl, budget: p0.budgetGesamt });
        return { ergebnis: { vorbereitet: true, zusammenfassung: z, ausgefuellt: getan,
          hinweis: "Der Chat hat die Zusammenfassung gesagt und gefragt, ob abgeschlossen werden soll. Schreib nichts dazu." },
          log: `Buchung vorbereitet: ${z?.titel || item.name}, ${z?.gesamt || ""}${getan.length ? ` · ausgefuellt: ${getan.join(", ")}` : ""}` };
      }
      return {
        ergebnis: { vorbereitet: true, zusammenfassung: z, ausgefuellt: getan,
          hinweis: `${getan.length ? `Sag in einem kurzen Satz, was du ausgefuellt hast: ${getan.join(", ")}. Nur das - nichts, was du nicht selbst eingetragen hast. ` : ""}`
            + (kern.darf("buchen")
              ? "Du darfst abschliessen: Nenn Haus, Zeitraum und Gesamtpreis und ruf buchung_abschliessen im selben Zug."
              : "Nenn Haus, Zeitraum und Gesamtpreis und frag, ob du abschliessen sollst. Erst nach einem klaren Ja buchung_abschliessen rufen.") },
        log: `Buchung vorbereitet: ${z?.titel || item.name}, ${z?.gesamt || ""}${getan.length ? ` · ausgefuellt: ${getan.join(", ")}` : ""}`,
      };
    },

    // Dasselbe wie buchung_vorbereiten, nur unter dem Namen, den die
    // Person benutzt - siehe die Begruendung an der Werkzeugliste.
    async formular_ausfuellen(a, kern, stufe) {
      return this.buchung_vorbereiten(a, kern, stufe);
    },

    async buchung_abschliessen(a, kern) {
      kern.lauf.abschlussFaellig = false;
      if (Werkzeuge.seite() !== "checkout") return { ergebnis: { fehler: "Es ist keine Buchung vorbereitet. Ruf erst buchung_vorbereiten." } };
      const autonom = kern.darf("buchen");
      if (autonom) {
        // Ansage mit Frist zum Widerruf - fest formuliert, damit sie sicher
        // vor dem Klick steht und nennt, was gebucht wird
        const z = Werkzeuge.buchungsZusammenfassung();
        kern.sagen(z
          ? `Ich buche jetzt ${z.titel}, ${z.zeitraum}${z.details ? `, ${z.details}` : ""}, ${z.gesamt} insgesamt, auf den Namen ${z.name}. Sag Stopp, wenn du das nicht willst.`
          : "Ich schließe die Buchung jetzt ab. Sag Stopp, wenn du das nicht willst.");
        AgentPanel.setSuggestions(["Stopp"]);
        AgentPanel.status("bucht gleich… (Stopp?)");
        await Zeiger.warte(3200);
        if (Zeiger.abbruch) {
          Zeiger.freigeben?.();
          kern.notieren("buchung_gestoppt", { id: kern.lauf.gewaehlt });
          return { ergebnis: { abgebrochen: true, hinweis: "Die Person hat Stopp gesagt. Frag, was sie stattdessen will." }, log: "Buchung gestoppt durch die Person" };
        }
      }
      kern.sperreAn();
      const e = await Werkzeuge.buchungAbschliessen();
      kern.sperreAus();
      if (e.daten?.gebucht) kern.notieren("gebucht", { id: kern.lauf.gewaehlt, autonom });
      if (e.daten?.wartetAufDaten) return { ergebnis: { fehler: e.text } };
      return { ergebnis: { gebucht: !!e.daten?.gebucht, text: e.text, hinweis: "Sag in einem Satz, dass es erledigt ist - ohne die Buchung noch einmal aufzuzaehlen. Es wurde nichts wirklich gebucht (Prototyp) - das steht auf der Seite, du musst es nicht betonen." }, log: e.text };
    },

    async freigabe_aendern(a, kern) {
      if (!FREIGABE_RANG.hasOwnProperty(a.stufe)) return { ergebnis: { fehler: "Unbekannte Stufe." } };
      kern.freigabeSetzen(a.stufe, "gespraech");
      const f = FREIGABE.find((x) => x.id === a.stufe);
      return { ergebnis: { freigabe: a.stufe, bedeutet: f?.lang } };
    },
  },

  /* ==================================================================
     Der Fahrplan
     ------------------------------------------------------------------
     Was feststeht, was fehlt, was als Naechstes dran ist - fest
     programmiert, nach dem Test vom 20.09.2026: Das Modell hatte die
     Reihenfolge frei und stellte zehn Fragen in Formularton. Jetzt
     bestimmt der Kern das Thema, das Modell formuliert. Jede Frage bietet
     "offen" oder "egal" als Antwort an; abgeleitet wird, was sich
     ableiten laesst (Erwachsene aus Gesamt und Kindern, flexibel aus
     "im Oktober").

     Eckdaten (vor der ersten Suche, in dieser Reihenfolge, Bekanntes
     wird uebersprungen): einstieg, ziel, zeit, dauer, reisende,
     kinderAlter, art, flug, flugAb. Dann die Suche - die Lage wird
     geschildert. Beratung: preis, wuensche, vorgehen. Erst mit
     vorgehen "top3" gibt es Vorschlaege.
     ================================================================== */
  /* Themen: Frage-Hinweis fuer das Modell und Chips. Chips nur, wo die
     Antworten offensichtlich sind (Zahlen, warm/kalt, ja/nein) - alles
     andere draengt die Person in eine Richtung. Ohne chips: keine Chips,
     auch keine vom Modell. */
  /* Die Fragen des Fahrplans - vom Kern geschrieben, nicht vom Modell.
     ==================================================================
     Bis zum 25.09.2026 stand hier nur eine Arbeitsanweisung in Prosa
     ("Frag, ob ein Flug dazu soll"), und das Modell formulierte daraus
     die Frage. Das ging meistens gut und manchmal daneben: dieselbe
     Frage zweimal woertlich, zwei Fragen in einer Nachricht, eine Frage
     ueber die Frage ("soll ich fragen, ob ihr ein Hotel wollt?"). Im
     Pruefstand war die woertlich wiederholte Frage der haeufigste grobe
     Fehler ueberhaupt.

     Jetzt schreibt der Kern den Fragesatz. Das Modell schreibt nur noch
     den Anschluss an das, was die Person gerade gesagt hat - ohne Frage.
     Der Kern setzt beides zusammen. Damit sind vier Fehlerklassen nicht
     mehr moeglich, sondern ausgeschlossen.

     satz     die Frage. Erster Eintrag beim ersten Mal, zweiter beim
              zweiten Anlauf - eine woertliche Wiederholung kann es also
              nicht geben. Funktion, wo die Frage vom Stand abhaengt.
     frage    bleibt als Anweisung fuer das Modell, wenn es doch einmal
              selbst formulieren muss (Sonderfaelle, Rueckfragen).
     chips    Antwortvorschlaege. */
  THEMEN: {
    zeit: {

      erklaerung: "Ich brauche den Monat, weil Preise und Verfügbarkeit je nach Jahreszeit ganz anders aussehen. Ein ungefährer Monat reicht mir.",      satz: ["Wann soll es denn ungefähr losgehen? Ein Monat reicht mir erst mal.",
        "Hast du schon eine Vorstellung, wann es losgehen soll?"],
      frage: "Wann es ungefaehr losgehen soll - ein Monat reicht. Feste Daten nur, wenn sie welche hat; nicht danach draengen. Nennt sie nur eine Jahreszeit ('im Winter'), frag, welcher Monat - 'egal' ist eine Antwort, dann nimmst du den ersten Monat der Jahreszeit und sagst das.", chips: null },

    reisende: {

      erklaerung: "Die Zahl der Reisenden entscheidet, welche Zimmer überhaupt in Frage kommen - und bei Kindern oft auch den Preis.",
      /* Die zweite Fassung war ein Aufforderungssatz ohne Fragezeichen.
         ----------------------------------------------------------------
         Gefunden von der Kernpruefung am 28.09.2026, und der Schaden lag
         nicht im Ton: Der Kern zaehlt ein Thema nur dann als gefragt,
         wenn im Text ein Fragezeichen steht. Ohne eines waere diese Frage
         nie als gestellt gezaehlt worden - also waere auch nie die dritte
         Fassung gekommen und nie die Annahme nach zwei Anlaeufen. Eine
         fehlende Interpunktion haette eine Endlosschleife tragen koennen. */
      satz: ["Wie viele seid ihr, und sind Kinder dabei?",
        "Wie viele seid ihr denn, und kommen Kinder mit?"],
      frage: "Mit wem sie reist - in einem Fragesatz. Nicht zwei Fragesaetze daraus machen.", chips: "1 | 2 | 3 | 4 | mehr" },

    kinderAlter: {

      erklaerung: "Das Alter entscheidet, ob ein Kind im Zimmer der Eltern mitgerechnet wird und ob es beim Preis zählt.",
      /* Ein Kind ist kein Plural.
         ----------------------------------------------------------------
         Gemeldet am 01.10.2026: "3 Erwachsene und 1 Kind, das merke ich.
         Wie alt sind die Kinder?" Der erste Satz zaehlt richtig, der
         zweite fragt im Plural - und die Person merkt, dass da kein
         Mensch liest. Der Satz haengt jetzt an der Zahl, die der Kern
         ohnehin schon kennt.

         Beide Fassungen stehen in derselben Funktion, weil `nochmal` nur
         einen festen Satz zulaesst und der wieder im Plural staende. Die
         zweite Fassung braucht ein Fragezeichen: Ohne eines zaehlt das
         Thema nicht als gefragt (siehe die Anmerkung bei `reisende`). */
      satz: (p, wk, lauf) => {
        const n = p?.kinder || 0;
        const mal = lauf?.gefragtWie?.kinderAlter || 0;
        const wort = { 3: "drei", 4: "vier", 5: "fünf", 6: "sechs" }[n] || n;
        if (n === 1) return mal >= 1 ? "Und wie alt ist das Kind?" : "Wie alt ist das Kind?";
        if (n === 2) return mal >= 1 ? "Und wie alt sind die beiden?" : "Wie alt sind die beiden Kinder?";
        if (n >= 3) return mal >= 1 ? `Und wie alt sind die ${wort}?` : `Wie alt sind die ${wort} Kinder?`;
        return mal >= 1 ? "Und wie alt sind die Kinder?" : "Wie alt sind die Kinder?";
      },
      frage: "Wie alt die Kinder sind (die Zahl der Kinder ist bekannt, nur das Alter fehlt).", chips: null },

    ziel: {

      erklaerung: "Ich frage, damit ich nicht das ganze Angebot durchgehe: warm heißt Mittelmeer und weiter weg, kalt heißt Berge und Norden.",      satz: ["Soll es eher in eine warme oder eher in eine kalte Gegend gehen, oder hast du schon ein Ziel im Kopf?",
        "Habt ihr schon ein Ziel, oder eher Richtung warm oder kalt?"],
      frage: "Ob es eher warm oder eher kalt werden soll, oder ob sie schon ein Ziel hat. Nichts anpreisen.", chips: "Eher warm | Eher kalt | Ich habe ein Ziel" },

    art: {

      erklaerung: "Im Hotel gibt es Service und Verpflegung, in einer Ferienwohnung mehr Platz und eine Küche. Danach richtet sich, wo ich suche.",      satz: ["Soll es ein Hotel werden, eine Ferienwohnung, oder darf ich dir beides zusammen zeigen?",
        "Hotel oder Ferienwohnung - oder ist dir das offen?"],
      frage: "Ob sie eher ins Hotel oder in eine Ferienwohnung will, oder ob das offen ist (artEgal true - dann sucht der Agent unter beidem zugleich).", chips: "Hotel | Ferienwohnung | Beides zeigen" },

    /* "Soll ich schon mal suchen" beschrieb das Falsche: Der Agent sucht
       an dieser Stelle keine Haeuser aus, er richtet die Liste ein und die
       Person geht selbst hinein. Genau so klingt die Frage jetzt. */
    weiter: {
      // Eine Frage je Satz - die beiden Zweige gehoeren in einen Fragesatz
      satz: ["Soll ich die Filter gleich so setzen, dass du selbst durch die Liste gehst, oder klären wir vorher noch ein paar Eckdaten wie Dauer und Flug?",
        "Willst du selbst in der Liste stöbern, oder besprechen wir vorher noch ein paar Eckdaten?"],
      frage: "Ob du ihr die Filter gleich so setzen sollst, dass sie selbst durch die Liste gehen kann (weiter schauen), oder ob ihr vorher noch ein paar Eckdaten klaert (weiter klaeren).", chips: "Filter setzen, ich schaue | Noch ein paar Eckdaten" },

    dauer: {

      erklaerung: "Die Dauer brauche ich für den Gesamtpreis - der Nachtpreis allein sagt wenig darüber, was am Ende auf der Rechnung steht.",      satz: ["Wie lange soll die Reise werden?", "Habt ihr eine Vorstellung, wie viele Nächte es werden sollen?"],
      frage: "Wie lange, ungefaehr ('eine Woche' = 7 Naechte).", chips: null },

    flug: {

      erklaerung: "Wenn ein Flug dazukommt, suche ich nur Häuser, die sich mit einer passenden Verbindung erreichen lassen, und der Anreisetag hängt dann an den Flugtagen.",      satz: ["Soll ein Flug dazu, oder nur die Unterkunft? Mit Flug hängt der Anreisetag von den Flugtagen der Verbindung ab.",
        "Bucht ihr den Flug selbst, oder soll ich ihn mitsuchen?"],
      frage: "Ob ein Flug dazu soll oder nur die Unterkunft.", chips: "Mit Flug | Nur die Unterkunft" },

    flugAb: {

      erklaerung: "Ich brauche den Flughafen, weil davon abhängt, welche Verbindungen es gibt und was sie kosten.",
      /* Die Liste kommt aus den Daten, nicht aus diesem Satz.
         ----------------------------------------------------------------
         Hier standen acht Namen fest eingetippt, waehrend der Katalog
         neun Flughaefen kennt - Zuerich fehlte in der Frage, stand aber
         in der Maske. Wer "welche gibt es zur Auswahl" fragte, bekam
         eine Liste, die nicht stimmte. Eine Aufzaehlung, die anderswo
         gepflegt wird, geht irgendwann auseinander; also wird sie
         gerechnet. */
      satz: [(p, wk) => {
        const h = typeof Flug !== "undefined" ? Flug.flughaefen().map((x) => x.name) : [];
        if (!h.length) return "Von welchem Flughafen soll es losgehen?";
        return `Von welchem Flughafen soll es losgehen? ${h.slice(0, -1).join(", ")} oder ${h[h.length - 1]}.`;
      },
        "Und ab welchem Flughafen?"],
      frage: "Von welchem Flughafen.", chips: null },

    flugKlasse: {
      erklaerung: "Die Klasse macht beim Flugpreis den groessten Unterschied - Premium liegt etwa beim Anderthalbfachen, Business beim Zweieinhalbfachen.",
      satz: ["In welcher Klasse wollt ihr fliegen - Economy, Premium Economy oder Business?",
        "Und die Klasse: Economy, Premium oder Business?"],
      frage: "In welcher Klasse geflogen werden soll.", chips: "Economy | Premium Economy | Business" },

    anreise: {

      erklaerung: "Ohne festen Tag lässt sich auf dieser Seite nicht buchen - der Knopf auf der Hausseite bleibt sonst gesperrt.",      satz: (p, wk) => {
        const t = wk.anreiseTage(p);
        if (!t.length) return "An welchem Tag wollt ihr anreisen?";
        return `Im ${t.monat} ist jeder Tag frei und der Preis bleibt gleich. Passt euch der ${t[0]}, der ${t[1]} oder der ${t[2]}?`;
      },
      nochmal: "Welcher Anreisetag soll es sein? Du kannst mir auch einfach ein Datum nennen.",
      frage: "An welchem Tag sie anreisen will.", chips: null },

    beratung: {
      satz: ["Wollen wir noch ein paar Eckdaten besprechen - Preis, Verpflegung, worauf es dir ankommt -, oder soll ich dir mit dem, was ich habe, gleich eine erste Auswahl zeigen?",
        "Sollen wir noch etwas klären, oder zeige ich dir gleich eine Auswahl?"],
      frage: "Ob ihr noch Eckdaten klaert (beratung klaeren) oder ob du gleich eine Auswahl zeigst (beratung auswahl).", chips: "Noch ein paar Eckdaten | Erstmal eine Auswahl" },

    vorgehen: {

      erklaerung: "Die Filter habe ich schon gesetzt, die Liste steht also. Wenn ich für dich raussuche, gehe ich die Häuser einzeln durch, lese die Bewertungen und stelle dir eine kleine Auswahl zusammen. Wenn du selbst schaust, halte ich mich raus und bin da, wenn du etwas wissen willst.",
      /* Drei Fragen in einer waren zwei zu viel.
         ----------------------------------------------------------------
         Bis zum 27.09.2026 stand hier "Soll ich schon mal die Filter
         setzen und du schaust selbst? Oder gehen wir noch ein paar
         Eckdaten durch - drei bis sechs, so viele du moechtest." Das sind
         drei Entscheidungen auf einmal: ob gefiltert wird, wer aussucht,
         und wie viele. Der Nutzer: "Das sind so viele Fragen in einer
         Anfrage."

         Die erste davon ist gar keine. Filter setzen kostet nichts, macht
         nichts kaputt und hilft in beiden Faellen - der Agent tut es
         einfach und sagt es. Die dritte kommt spaeter oder gar nicht;
         ohne Angabe sind es drei, und wer eine Zahl nennt, bekommt sie.
         Bleibt eine Frage: Wer sucht aus?

         Dass der Agent komplett raussuchen kann, steht ausdruecklich da.
         Sonst waere "selbst schauen" keine Wahl, sondern der einzige
         erkennbare Weg - und in der Studie liefe eine Bedingung gegen
         eine Faehigkeit, von der niemand wusste. */
      satz: ["Die Filter stehen jetzt so auf der Seite. Möchtest du selbst durch die Liste gehen? Oder wir klären noch ein paar Eckdaten, dann gehe ich die Häuser einzeln durch und lege dir eine Auswahl vor.",
        "Die Liste ist eingestellt. Schaust du selbst, oder klären wir noch ein paar Punkte und ich suche dir die Häuser raus?"],
      frage: "Die Filter stehen schon - frag NICHT, ob du sie setzen sollst. Es geht nur darum, ob sie selbst durch die Liste geht (vorgehen selbst) oder ob du die Haeuser fuer sie raussuchst (vorgehen top3). Frag nicht nach einer Anzahl; ohne Angabe sind es drei.", chips: "Ich schaue selbst | Such du für mich raus" },

    /* Wie viele Haeuser er zusammenstellen soll.
       ------------------------------------------------------------------
       Stand bis zum 28.09.2026 in der Vorgehensfrage und flog dort
       heraus, weil drei Entscheidungen in einer Frage zu viel waren.
       Seither fragte sie niemand mehr - ohne Angabe waren es stumm drei.
       Jetzt kommt sie als letzte Frage vor der Vorlage, dort wo sie
       hingehoert: Man weiss dann, worum es geht. */
    anzahl: {
      erklaerung: "Je mehr ich raussuche, desto laenger dauert es - ich gehe jedes Haus einzeln durch und lese die Bewertungen.",
      satz: ["Wie viele soll ich dir zusammenstellen? Drei reichen meistens, mehr gehen auch.",
        "Und wie viele Häuser soll ich dir vorlegen?"],
      frage: "Wie viele Haeuser sie vorgelegt haben will (2 bis 6). Ohne klare Zahl nimmst du drei.", chips: "Drei | Vier | Sechs" },

    preis: {

      erklaerung: "Eine Grenze hilft mir beim Aussortieren. Wenn du offen bist, ist das auch eine Antwort - dann zeige ich die ganze Spanne.",
      /* Die Grenze gilt fuer die ganze Reise, und das muss dastehen.
         ----------------------------------------------------------------
         Der Nutzer am 02.10.2026 nannte 5.000 Euro Gesamtbudget, und kein
         Vorschlag lag darunter - der Flug zaehlte nicht mit. Seit v=366
         rechnet der Kern richtig; hier steht jetzt auch im Satz, was in
         der Grenze steckt, damit die Zahl von vornherein die richtige
         Bedeutung hat. */
      satz: (p) => {
        const v = { fruehstueck: "Frühstück", halb: "Halbpension", voll: "Vollpension", ai: "All Inclusive" }[p?.verpflegung];
        // Einzeln mit Artikel ("der Flug"), zu zweit ohne - sonst stuende
        // da "Da sind der Flug und Halbpension drin".
        let zusatz = "";
        if (p?.flug && v) zusatz = ` Da sind Flug und ${v} schon mit drin.`;
        else if (p?.flug) zusatz = " Da ist der Flug schon mit drin.";
        else if (v) zusatz = ` Da ist ${v} schon mit drin.`;
        return `Hast du beim Preis eine feste Grenze für die ganze Reise, oder bist du da offen?${zusatz}`;
      },
      nochmal: "Gibt es eine Obergrenze für die ganze Reise, die ich einhalten soll?",
      frage: "Ob sie beim Preis eine feste Grenze hat (gesamt fuer die Reise, oder pro Nacht, wenn sie das sagt) oder offen ist. Offen heisst preisEgal true. Eine Zahl ohne Zusatz ist das Gesamtbudget.", chips: "Feste Grenze | Offen" },

    verpflegung: {

      erklaerung: "Die Verpflegung macht beim Gesamtpreis oft den größten Unterschied, deshalb frage ich früh danach.",      satz: (p, wk, lauf) => {
        const z = lauf?.verpflegungsLage;
        const a = z?.allInclusiveAufpreisProNachtUndZimmer;
        const auf = a > 0 ? ` All Inclusive kostet im Schnitt ${a} € pro Nacht und Zimmer mehr.` : "";
        return `Welche Verpflegung soll es sein - All Inclusive, Halbpension, nur Frühstück, oder ist dir das egal?${auf}`;
      },
      nochmal: "Und bei der Verpflegung: All Inclusive, Halbpension, Frühstück oder egal?",
      frage: "Welche Verpflegung. 'Egal' heisst verpflegungEgal true.", chips: "All Inclusive | Halbpension | Nur Frühstück | Egal" },

    wuensche: {

      erklaerung: "Damit gewichte ich die Auswahl. Was du hier nennst, ziehe ich aus den Gästebewertungen heraus und vergleiche es zwischen den Häusern.",      satz: (p) => (p.kinder > 0
        ? "Worauf achtet ihr bei der Unterkunft besonders? Zum Beispiel Pool, Kinderclub oder die Nähe zum Strand."
        : "Worauf achtest du bei der Unterkunft besonders? Zum Beispiel Ruhe, gutes Essen oder die Lage."),
      nochmal: "Gibt es noch etwas, worauf ich bei der Unterkunft achten soll?",
      frage: "Worauf sie bei der Unterkunft achtet - offen gefragt, hoechstens drei Beispiele.", chips: "Sauberkeit | Essen | Lage | Ruhe" },
  },

  /* Wie der Kern ein neu aufgenommenes Feld ausspricht.
     ------------------------------------------------------------------
     Gebraucht fuer den Fall, den der Nutzer am 24.09.2026 gemeldet hat:
     Mitten in einer Frage wirft die Person etwas ein ("uebrigens mir ist
     Essen sehr wichtig"), der Agent nimmt es auf - und sagt kein Wort
     dazu. Wenn das Modell die Aufnahme vergisst, setzt der Kern sie
     davor. thema: zu welchem Thema das Feld gehoert; eine Antwort auf die
     gestellte Frage braucht keine eigene Bestaetigung. */
  FELDWORT: {
    wuensche: { thema: "wuensche", wort: (p) => (p.kriterien || []).map((k) => (typeof Politik !== "undefined" ? Politik.kriterium(k.id)?.label : null)).filter(Boolean).slice(-2).join(" und ") },
    budgetGesamt: { thema: "preis", wort: (p) => `höchstens ${p.budgetGesamt} € insgesamt` },
    maxPreis: { thema: "preis", wort: (p) => `höchstens ${p.maxPreis} € pro Nacht` },
    verpflegung: { thema: "verpflegung", wort: (p) => (typeof BOARD_LABELS !== "undefined" ? BOARD_LABELS[p.verpflegung] : p.verpflegung) },
    maxStrand: { thema: "wuensche", wort: (p) => `höchstens ${p.maxStrand < 1 ? `${Math.round(p.maxStrand * 1000)} Meter` : `${p.maxStrand} km`} zum Strand` },
    mindestbewertung: { thema: "wuensche", wort: (p) => `mindestens ${String(p.mindestbewertung).replace(".", ",")} als Note` },
    naechte: { thema: "dauer", wort: (p) => `${p.naechte} Nächte` },
    // Dieselbe Falle wie in lageSatz: "Mai" hat drei Buchstaben
    monat: { thema: "zeit", wort: (p) => (typeof MONATSNAMEN !== "undefined" && p.monat ? MONATSNAMEN[p.monat - 1] : null) },
    anreise: { thema: "anreise", wort: (p) => { const d = new Date(p.anreise); return Number.isNaN(d.getTime()) ? null : `Anreise am ${d.getDate()}.`; } },
  },

  /* Der Satz, mit dem der Kern eine vergessene Aufnahme nachtraegt.
     Null, wenn nichts nachzutragen ist. */
  aufnahmeSatz(kern, schonGesagt) {
    const felder = kern.lauf.zuletztGemerkt || [];
    const p = kern.lauf.profil || {};
    const gefragt = kern.lauf.gefragt || null;
    const teile = [];
    for (const f of [...new Set(felder)]) {
      const e = this.FELDWORT[f];
      if (!e) continue;
      // Eine Antwort auf die gestellte Frage braucht keine Bestaetigung -
      // die steht in der Leiste, und "Oktober ist notiert" nervt
      if (e.thema && e.thema === gefragt) continue;
      const wort = e.wort(p);
      if (!wort) continue;
      // Das Modell hat es schon gesagt
      if (schonGesagt && new RegExp(wort.split(" ").filter((w) => w.length > 3)[0] || wort, "i").test(schonGesagt)) continue;
      teile.push(wort);
    }
    if (!teile.length) return null;
    return `${teile.slice(0, 2).join(", ")} merke ich mir.`.replace(/^./, (c) => c.toUpperCase());
  },

  /* Der guenstigste Abflughafen fuer die Ziele, die gerade in Frage
     kommen. Gebraucht, wenn die Person sich nicht festlegt ("Hamburg
     oder Koeln, je nachdem was billiger ist"): Das Verstehen kommt vom
     Modell (flugAbEgal), die Entscheidung trifft der Kern anhand der
     echten Flugpreise. */
  /* ==================================================================
     Abgeleitete Entscheidungen
     ------------------------------------------------------------------
     Wunsch des Nutzers vom 27.09.2026: "Wenn eine Transferleistung des
     Bots notwendig ist - nimm den billigsten Flughafen, nimm den Monat
     mit den meisten Angeboten - dann ist meistens auch eine Erklaerung
     notwendig. Warum wird jetzt Duesseldorf ausgewaehlt?"

     Genau das ist der Unterschied zwischen einem Agenten und einem
     Formular mit Standardwerten. Ein Formular setzt still etwas ein;
     ein Agent entscheidet und sagt, woran er sich dabei gehalten hat.
     Ohne den Grund kann die Person nicht widersprechen - sie weiss ja
     nicht, worauf sie antworten wuerde.

     Der Satz wird an Ort und Stelle gesagt, vom Kern selbst - wie die
     Lage nach der Suche. Zwei Gruende: Er steht dann da, auch wenn das
     Modell ihn vergisst, und er steht an der richtigen Stelle. Ein
     Durchreichen ans Modell oder an die naechste Frage haette ihn hinter
     alles geschoben, was in diesem Zug sonst noch passiert - "ich nehme
     Juni" nach "im Juli stehen 184 Hotels" liest sich wie ein Fehler.
     ================================================================== */
  ableiten(kern, feld, satz) {
    (kern.lauf.abgeleitet ||= []).push({ feld, satz });
    kern.sagen(satz);
  },

  JAHRESZEITEN: {
    sommer: [6, 7, 8], herbst: [9, 10, 11], winter: [12, 1, 2],
    "frühling": [3, 4, 5], fruehling: [3, 4, 5], "frühjahr": [3, 4, 5], fruehjahr: [3, 4, 5],
  },

  /* Hat die Person diese Region selbst genannt?
     ------------------------------------------------------------------
     Am 27.09.2026 sagte jemand "zu zweit im Sommer, eher in eine kalte
     Gegend". Der Agent suchte daraufhin in Tirol - und sagte kein Wort
     dazu. Im Stand stand ploetzlich zielId "tirol", obwohl es im ganzen
     Gespraech nie vorkam: Das Modell hatte beim Aufruf von `suchen`
     einfach ziel "tirol" mitgegeben, und dort wurde es ungeprueft
     uebernommen. Aus fuenf kalten Regionen mit 41 Haeusern wurden so
     elf, ohne dass jemand das entschieden haette.

     Eine Region gilt jetzt nur, wenn ihr Name im Gespraech steht. Will
     das Modell eine vorschlagen, gibt es dafuer regionen_vergleichen -
     dann ist es ein Vorschlag, den die Person annehmen kann, und keine
     stille Festlegung. */
  regionGenannt(lauf, id) {
    const z = typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[id] : null;
    if (!z) return false;
    const gesagt = (lauf.gespraech || []).filter((n) => n.role === "user")
      .map((n) => String(n.content).toLowerCase()).join(" ");
    const woerter = [z.name, z.id, z.region, z.flughafen].filter(Boolean)
      .map((x) => String(x).toLowerCase()).filter((x) => x.length >= 3);
    /* Auf ganze Woerter, nicht auf Teilstuecke.
       ------------------------------------------------------------------
       "Suedtirol" enthaelt "tirol". Ohne Wortgrenze haette der Satz "am
       liebsten Suedtirol" auch die Region Tirol freigegeben - und das
       Modell haette sie setzen duerfen. */
    return woerter.some((w) => {
      const sicher = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|[^a-zäöüß])${sicher}([^a-zäöüß]|$)`, "i").test(gesagt);
    });
  },

  // Welche Jahreszeit die Person im Gespraech genannt hat
  jahreszeitGenannt(lauf) {
    const gesagt = (lauf.gespraech || []).filter((n) => n.role === "user").map((n) => String(n.content).toLowerCase()).join(" ");
    const name = Object.keys(this.JAHRESZEITEN).find((k) => gesagt.includes(k));
    return name ? { name, monate: this.JAHRESZEITEN[name] } : null;
  },

  /* Welcher Monat einer Jahreszeit, wenn es der Person gleich ist.
     ------------------------------------------------------------------
     Bis zum 27.09.2026 nahm der Agent stumpf den ersten Monat der
     Jahreszeit. Das ist ein Wuerfelwurf mit Ansage: Die Person hat die
     Entscheidung abgegeben, und der Agent trifft sie, ohne hinzusehen.

     Jetzt rechnet der Kern die Monate durch - wie viele Haeuser in
     jedem in Frage kommen und was sie im Schnitt pro Nacht kosten -
     und gibt den Grund gleich mit. Es entscheidet die Zahl der Haeuser;
     liegen sie nah beieinander (bis ein Zehntel Unterschied), gibt der
     Preis den Ausschlag. */
  monatWaehlen(p, monate) {
    const bewertet = (monate || []).map((m) => {
      const probe = { ...p, monat: m };
      const treffer = this.katalogTreffer(probe, this.filterAusStand(probe));
      const preise = treffer.map((h) => this.preis(h, m));
      return { monat: m, anzahl: treffer.length,
        schnitt: preise.length ? Math.round(preise.reduce((a, b) => a + b, 0) / preise.length) : null };
    });
    if (!bewertet.length || !Math.max(...bewertet.map((x) => x.anzahl))) return null;
    const name = (m) => (typeof MONATSNAMEN !== "undefined" ? MONATSNAMEN[m - 1] : `Monat ${m}`);
    /* Erst den Grund, dann den Monat - nicht umgekehrt.
       ------------------------------------------------------------------
       Der erste Entwurf waehlte nach Preis und suchte sich danach eine
       Begruendung. Dabei kam "ich nehme Juli, den naechstgelegenen"
       heraus, obwohl Juni frueher liegt: Juli war einen Euro billiger.
       Eine Begruendung, die auf die Wahl nicht passt, ist schlimmer als
       keine. Jetzt entscheidet das Kriterium, das wirklich etwas hergibt,
       und wenn keines etwas hergibt, faellt die Wahl auf den ersten Monat
       der Jahreszeit - und genau das steht dann auch da. */
    const meisteM = bewertet.reduce((a, b) => (b.anzahl > a.anzahl ? b : a));
    const wenigsteM = bewertet.reduce((a, b) => (b.anzahl < a.anzahl ? b : a));
    const mitPreis = bewertet.filter((x) => x.schnitt != null);
    const billigsteM = mitPreis.length ? mitPreis.reduce((a, b) => (b.schnitt < a.schnitt ? b : a)) : null;
    const teuersteM = mitPreis.length ? mitPreis.reduce((a, b) => (b.schnitt > a.schnitt ? b : a)) : null;
    const wahl = wenigsteM.anzahl && meisteM.anzahl >= wenigsteM.anzahl * 1.25 ? meisteM
      : (billigsteM && teuersteM && teuersteM.schnitt >= billigsteM.schnitt * 1.08 ? billigsteM
        : bewertet[0]);
    const wenigste = wenigsteM;
    const teuerste = teuersteM;
    /* Ein Grund wird nur genannt, wenn es einen gibt.
       ------------------------------------------------------------------
       Der erste Entwurf schrieb immer eine Begruendung hin, auch bei
       182 gegen 183 Euro. Das ist schlimmer als gar keine: Es sieht nach
       Recherche aus und ist Rauschen - und wer nachrechnet, glaubt dem
       Agenten danach auch die Zahlen nicht mehr, die etwas bedeuten.

       Im Katalog liegen die Monate einer Jahreszeit meist gleichauf, weil
       eine Region in der ganzen Jahreszeit Saison hat. Es gibt aber
       Ausnahmen, und bei denen lohnt der Hinweis: In Lappland kostet die
       Nacht im September 173 Euro und im November 254. Genau dann, und
       nur dann, steht die Zahl da. Sonst sagt der Agent, dass sich die
       Monate nicht unterscheiden - das ist auch eine Auskunft. */
    let satz;
    if (wenigste.monat !== wahl.monat && wenigste.anzahl && wahl.anzahl >= wenigste.anzahl * 1.25) {
      satz = `Dann nehme ich ${name(wahl.monat)}: Da kommen ${wahl.anzahl} Häuser in Frage, im ${name(wenigste.monat)} nur ${wenigste.anzahl}.`;
    } else if (teuerste && teuerste.monat !== wahl.monat && wahl.schnitt != null && teuerste.schnitt >= wahl.schnitt * 1.08) {
      satz = `Dann nehme ich ${name(wahl.monat)}: Da liegt die Nacht im Schnitt bei ${wahl.schnitt} €, im ${name(teuerste.monat)} bei ${teuerste.schnitt} €.`;
    } else {
      satz = `Ich habe die drei Monate verglichen - bei Auswahl und Preis unterscheiden sie sich kaum. Ich nehme ${name(wahl.monat)}, den nächstgelegenen.`;
    }
    return { ...wahl, satz: `${satz} Sag Bescheid, wenn dir ein anderer lieber ist.` };
  },

  /* Der guenstigste Abflughafen - mit der Zahl, an der es haengt.
     ------------------------------------------------------------------
     "Hamburg oder Koeln, je nachdem was billiger ist" ist eine
     abgegebene Entscheidung. Bis zum 27.09.2026 sagte der Agent nur,
     dass er die guenstigste Verbindung genommen habe; woran sich das
     festmacht, blieb offen - und damit auch, ob die Person das so will. */
  guenstigsterFlughafen(zieleIds = [], nurDiese = null) {
    if (typeof FLIGHTS === "undefined") return null;
    const ziele = (zieleIds || []).filter(Boolean);
    // Hat die Person zwei Flughaefen genannt, wird nur unter denen
    // gesucht - "je nachdem was billiger ist" heisst nicht "irgendwo"
    const erlaubt = (nurDiese || []).filter(Boolean);
    const passend = FLIGHTS.filter((f) => (!ziele.length || ziele.includes(f.ziel))
      && (!erlaubt.length || erlaubt.includes(f.fromCode)));
    if (!passend.length) return null;
    /* Je Flughafen der guenstigste Flug; davon der guenstigste Flughafen.
       ------------------------------------------------------------------
       Mit dem Flughafen steht im Katalog auch alles andere fest:
       Fluggesellschaft, Abflugzeit, Stopps, Flugtage. Der Nutzer am
       27.09.2026: "Bei den Fluegen gibt es halt auch unterschiedliche
       Airlines. Das muesste man eigentlich auch beruecksichtigen, sonst
       ist das auch nicht realistisch." Genau deshalb wird hier nicht nur
       ein Ortsname zurueckgegeben, sondern die Verbindung. */
    const je = {};
    for (const f of passend) {
      if (!je[f.from] || (f.price || Infinity) < je[f.from].price) je[f.from] = f;
    }
    const sortiert = Object.values(je).sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
    if (!sortiert.length) return null;
    const [beste, zweiter] = sortiert;
    return { ab: beste.from, preis: beste.price, airline: beste.airline,
      direkt: beste.stops === 0, abflug: beste.depart || null,
      zweiter: zweiter ? zweiter.from : null, aufpreis: zweiter ? zweiter.price - beste.price : 0 };
  },

  // Die moeglichen Anreisetage als Text - gebraucht fuer die Frage und
  // fuer die Chips
  anreiseTage(p) {
    const f = this.flexWahl(p);
    if (!f) return [];
    const naechte = p.naechte || 7;
    const [jahr, monat] = f.monat.split("-").map(Number);
    const letzter = new Date(jahr, monat, 0).getDate();
    const spielraum = Math.max(1, letzter - naechte);
    const MON = ["Jan.", "Feb.", "März", "April", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];
    const MONLANG = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    const tage = [1, Math.round(spielraum / 3), Math.round((spielraum * 2) / 3), spielraum]
      .map((t) => Math.min(letzter, Math.max(1, t)))
      .filter((t, i, alle) => alle.indexOf(t) === i)
      .map((t) => `${t}. ${MON[monat - 1]}`);
    tage.monat = MONLANG[monat - 1];
    tage.iso = f.monat;
    return tage;
  },

  // Den fertigen Fragesatz eines Themas holen: beim zweiten Anlauf eine
  // andere Fassung, damit sich nie etwas woertlich wiederholt
  themenSatz(thema, p, lauf = {}) {
    const t = this.THEMEN[thema];
    if (!t) return null;
    const mal = lauf.gefragtWie?.[thema] || 0;
    if (typeof t.satz === "function") return (mal >= 1 && t.nochmal) ? t.nochmal : t.satz(p, this, lauf);
    if (Array.isArray(t.satz)) {
      // Ein Eintrag darf auch eine Funktion sein, wenn der Satz aus den
      // Daten kommt (die Liste der Flughaefen)
      const e = t.satz[Math.min(mal, t.satz.length - 1)];
      return typeof e === "function" ? e(p, this, lauf) : e;
    }
    return t.satz || null;
  },


  // Hat die Person einen Tag genannt? "am 5.", "5. Nov.", "5. November",
  // "vom 12. bis 26.", "2026-11-05" oder nur "5." als ganze Antwort
  /* Ein genannter Tag.
     ------------------------------------------------------------------
     Zwei Luecken, gefunden am 29.09.2026 an dem Satz "boah gerne
     spaetestens am 03.12": Die fuehrende Null ("03") fiel durch, weil
     der Tag mit [1-9] begann, und der Monat brauchte einen Punkt
     dahinter ("12." statt "12"). Der Satz enthielt damit fuer den Kern
     kein Datum - also galt er als Abgabe, der Kern waehlte selbst einen
     Monat, und die Frage nach der Zeit kam ein zweites Mal.

     Jetzt: fuehrende Null erlaubt, Punkt hinter dem Monat optional, und
     Fristwoerter ("bis", "vor dem", "nach dem") zaehlen wie "am". */
  TAG: /\b(0?[1-9]|[12]\d|3[01])\.\s*(jan|feb|mär|maer|apr|mai|jun|jul|aug|sep|okt|nov|dez|(0?[1-9]|1[0-2])\.?)|\b(am|ab dem|ab|vom|den|bis|bis zum|vor dem|nach dem)\s+(0?[1-9]|[12]\d|3[01])\b|\d{4}-\d{2}-\d{2}|^\s*(0?[1-9]|[12]\d|3[01])\.?\s*$/i,

  // Schluessel der Eckdaten - aendert er sich, muss neu gesucht werden
  eckdatenSchluessel(p) {
    return JSON.stringify([p.zielId || null, p.richtung || null, p.monat || null, p.von || null, p.bis || null, p.naechte || null,
      p.erwachsene ?? null, p.kinder ?? null, p.kinderAlter || [], this.seitenTyp(p), p.flug ?? null, p.flugAb || null, p.flugKlasse || null]);
  },

  // Schluessel der Vorgaben fuer eine Vorlage - gleiche Vorgaben, keine
  // zweite Vorlage derselben Haeuser
  vorlageSchluessel(p) {
    return this.eckdatenSchluessel(p) + this.filterSchluessel(p) + JSON.stringify([p.sortierung || null]);
  },

  /* Was in der Filterspalte steht.
     ------------------------------------------------------------------
     Am 27.09.2026 sagte jemand "am liebsten eins, das gerade im
     Angebot ist". Der Agent nahm es auf, schrieb es in seine
     Filterliste - und sagte im selben Zug "die Filter stehen jetzt so
     auf der Seite", waehrend der Angebotsschalter aus war und 184
     Haeuser dastanden.

     Der Grund: Ob neu gesucht wird, entschied allein der
     Eckdatenschluessel (Ziel, Zeit, Gruppe, Flug). Ein neuer Filter kam
     darin nicht vor, also galt die alte Suche weiter. Jetzt gibt es
     einen zweiten Schluessel fuer genau die Felder, die in der Spalte
     landen - aendert sich einer, stimmt die Seite nicht mehr. */
  filterSchluessel(p) {
    // Die Himmelsrichtung gehoert dazu, seit sich mehrere Regionen
    // gleichzeitig anhaken lassen - sie steht dann in der Spalte
    return JSON.stringify([p.maxPreis || null, p.maxStrand ?? null, p.mindestbewertung || null, p.mindestSterne || null,
      (p.kriterien || []).map((k) => k.id), p.ausstattung || [], p.verpflegung || null, p.nurAngebote || false,
      p.wlanInklusive || false,
      p.zielId || null, (p.zieleErlaubt || []).slice().sort()]);
  },

  /* Der Fahrplan (Fassung 3, 20.09.2026 nachts, nach dem dritten Gespraech
     mit dem Nutzer):
     Kern: zeit, reisende (+kinderAlter), ziel (warm/kalt/Ziel), art.
     Dann die Frage "schon mal schauen oder noch Eckdaten klaeren?" (weiter).
     klaeren: dauer, flug, flugAb, dann die Suche. schauen: sofort die Suche
     (Dauer notfalls eine Woche). Nach der Suche die Lage, dann die Frage
     "selbst schauen oder drei raussuchen?" (vorgehen). Bei top3 folgen
     dauer, flug, flugAb (falls offen), preis, wuensche - dann die Vorlage.
     Bei selbst stehen die Filter, Ruhe. */
  /* Der Stand wird glattgezogen, bevor daraus etwas folgt.
     ------------------------------------------------------------------
     Am 28.09.2026 baute der Kern die Frage "Sind von den 1 Kinder
     dabei?" - aus einem Stand, den es nicht geben kann: eine Person,
     Aufteilung unbekannt. Der Fehler war nicht der Satz, sondern der
     Stand. Ich hatte ihn in stand_merken repariert, aber der Fahrplan
     bekommt seinen Stand auch aus dem Speicher einer alten Sitzung oder
     aus einem Werkzeug - und rechnete dort weiter mit dem Widerspruch.

     Deshalb steht die Rechnung jetzt hier, am Eingang: Was sich aus dem
     Stand zwingend ergibt, wird eingetragen, bevor eine Frage daraus
     wird. Das ist kein Verstehen und gehoert deshalb nicht zum Modell -
     es ist Arithmetik, und die ist in beiden Richtungen eindeutig. */
  stimmigMachen(p) {
    if (!p) return p;
    const e = p.erwachsene, k = p.kinder, ges = p.personen;
    // Zwei von dreien ergeben den dritten
    if (ges != null && k != null && e == null) p.erwachsene = Math.max(1, ges - k);
    else if (ges != null && e != null && k == null) p.kinder = Math.max(0, ges - e);
    else if (e != null && k != null && ges == null) p.personen = e + k;
    // Eine Person reist ohne Mitreisende - da ist nichts aufzuteilen
    if (p.personen === 1 && (p.erwachsene == null || p.kinder == null)) { p.erwachsene = 1; p.kinder = 0; }
    if (p.kinder === 0) p.kinderAlter = [];
    if (p.kinder > 0 && (p.kinderAlter || []).length > p.kinder) p.kinderAlter = p.kinderAlter.slice(0, p.kinder);
    // Zur Ferienwohnung gibt es keinen Flug - die Seite kennt das nicht
    if (p.typ === "apartment") { p.flug = false; delete p.flugAb; delete p.flugKlasse; }
    for (const w of this.zeitWidersprueche(p, true)) (p.widersprueche ||= []).push(w);
    return p;
  },

  /* Ein Stand, der sich selbst widerspricht.
     ==================================================================
     Gemeldet am 02.10.2026: In der Uebersicht stand gleichzeitig "Zeit
     Juni", "Daten 01.11. bis 08.11." und "Dauer 7 Nächte", obwohl der
     Chat "12 Nächte merke ich mir" gesagt hatte. Der Nutzer: "Das mit
     dem November ist echt sehr komisch. Im Filter steht tatsaechlich
     Juni, und man kann auch nur die Juni-Tage auswaehlen. Ich glaube,
     das November ist einfach halluziniert."

     Er hat recht: Der Monat wird aus `p.monat` gerechnet, von dort kann
     kein November kommen. Es war ein Wert, den das Modell geliefert hat
     und den niemand gegen den Rest gehalten hat. Danach passte der
     Anreisetag zu keinem Flugtag, das Werkzeug meldete denselben Fehler
     wieder und wieder, und die Buchung kam nicht mehr weiter.

     `stimmigMachen` zog bisher nur Erwachsene, Kinder und Personen
     glatt. Zeitangaben wurden gar nicht gegeneinander geprueft. Jetzt
     schon, und zwar bei jedem Fahrplan:

       - Ein Zeitraum oder Anreisetag ausserhalb des gemerkten Monats
         faellt weg. Der Monat bleibt: Den hat die Person genannt.
       - Stimmt die Dauer nicht zum Zeitraum, gilt die Angabe der Person
         (`vonPerson.naechte`) und das Ende wird neu gerechnet. Hat sie
         nichts gesagt, gilt der Zeitraum.

     `reparieren=false` liefert die Widersprueche, ohne etwas zu aendern -
     damit prueft die Kernpruefung ueber tausende Staende. */
  zeitWidersprueche(p, reparieren = false) {
    const raus = [];
    if (!p) return raus;
    const monatVon = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : d.getMonth() + 1; };
    if (p.monat && p.von) {
      const m = monatVon(p.von);
      if (m && m !== p.monat) {
        raus.push({ art: "zeitraum_ausserhalb_monat", monat: p.monat, von: p.von, bis: p.bis || null });
        if (reparieren) { delete p.von; delete p.bis; p.flexibel = true; }
      }
    }
    if (p.monat && p.anreise) {
      const m = monatVon(p.anreise);
      if (m && m !== p.monat) {
        raus.push({ art: "anreise_ausserhalb_monat", monat: p.monat, anreise: p.anreise });
        if (reparieren) delete p.anreise;
      }
    }
    if (p.von && p.bis) {
      const n = Math.round((new Date(p.bis) - new Date(p.von)) / 86400000);
      if (Number.isFinite(n) && p.naechte && n !== p.naechte) {
        raus.push({ art: "dauer_passt_nicht", naechte: p.naechte, zeitraum: n });
        if (reparieren) {
          if (p.vonPerson?.naechte) {
            const ab = new Date(p.von);
            if (!Number.isNaN(ab.getTime())) p.bis = new Date(ab.getTime() + p.naechte * 86400000).toISOString().slice(0, 10);
          } else if (n > 0 && n < 60) p.naechte = n;
        }
      }
    }
    if (p.anreise && p.von && p.anreise !== p.von) {
      raus.push({ art: "anreise_neben_zeitraum", anreise: p.anreise, von: p.von });
      if (reparieren && !p.vonPerson?.anreise) p.anreise = p.von;
    }
    return raus;
  },

  fahrplan(p, lauf = {}) {
    this.stimmigMachen(p);
    const b = lauf.besprochen || {};
    const kinderAlterOk = p.kinder == null || p.kinder === 0 || (p.kinderAlter || []).length >= p.kinder;
    // Stehen Dauer und Flug schon fest, gibt es nichts mehr zu klaeren. Die
    // Frage "schon mal schauen oder noch Eckdaten klaeren?" waere dann eine
    // Warteschleife - sie kam im Test, nachdem die Person alles in einem
    // Satz gesagt hatte.
    const alleEckdaten = !!p.naechte && (p.flug != null || p.typ === "apartment")
      && (!p.flug || !!p.flugAb || p.typ === "apartment");
    const fertig = {
      zeit: !!p.monat || !!(p.von && p.bis),
      reisende: p.erwachsene != null && p.kinder != null,
      kinderAlter: kinderAlterOk,
      ziel: !!p.zielId || !!p.zielOffen || !!p.richtung,
      art: !!p.artGenannt || !!p.artEgal,
      // weiter und beratung werden nicht mehr gefragt: Die eine Frage nach
      // der Lage (vorgehen) ersetzt beide. Sie bleiben im Stand, weil
      // Ableitungen und Auswertung sie lesen.
      weiter: true,
      dauer: !!p.naechte,
      flug: p.flug != null || p.typ === "apartment",
      /* Mit mehreren genannten Flughaefen ist die Frage noch offen, auch
         wenn die Person die Wahl abgegeben hat: Der Agent sagt, welcher
         guenstiger ist, und fragt, ob er eingrenzen soll oder beide
         offen laesst (Wunsch des Nutzers, 30.09.2026). */
      flugAb: !p.flug || !!p.flugAb || p.typ === "apartment"
        || (!!p.flugAbEgal && (p.flugAbAuswahl || []).length < 2),
      flugKlasse: !p.flug || !!p.flugKlasse || p.typ === "apartment",
      vorgehen: !!p.vorgehen,
      // Nur gefragt, wenn er wirklich raussucht - wer selbst schaut,
      // bekommt keine Vorlage und damit auch keine Anzahl
      anzahl: !!p.anzahlVorschlaege || p.vorgehen !== "top3",
      beratung: true,
      /* Die Preisfrage braucht eine Zahl oder ein "offen".
         ----------------------------------------------------------------
         Hier stand `|| b.preis`: Sobald die Person auf die Frage
         ueberhaupt etwas geantwortet hatte, galt das Thema als erledigt.
         Mit dem Chip "Feste Grenze" war der Haken damit gesetzt, ohne
         dass je ein Betrag dastand - gemeldet am 30.09.2026: "Dann hat
         er einfach die naechste Frage gestellt, ohne nochmal nach der
         festen Grenze zu fragen."

         Jetzt zaehlt nur, was wirklich im Stand steht. Eine Endlosschleife
         kann daraus nicht werden: Nach zwei vergeblichen Anlaeufen nimmt
         der Kern "offen" an und sagt es (ANNAHME weiter unten). */
      preis: !!(p.maxPreis || p.budgetGesamt || p.preisEgal),
      /* Besprochen ist nicht beantwortet.
         ----------------------------------------------------------------
         Hier stand `|| b.verpflegung` und `|| b.wuensche`: Sobald die
         Person auf die Frage ueberhaupt etwas geantwortet hatte, galt das
         Thema als erledigt - auch wenn im Stand nichts stand. Genau
         dieses Schlupfloch war beim Preis am 30.09.2026 schon einmal
         geschlossen worden; hier blieb es offen. Gemeldet am 02.10.2026:
         "Zusaetzlich wurden halt jetzt hier schon wieder keine Fragen zur
         Halbpension oder zum All-Inclusive gefragt, was halt auch
         verpflichtend ist."

         Jetzt zaehlt nur, was wirklich im Stand steht. Eine
         Endlosschleife kann daraus nicht werden: Nach zwei vergeblichen
         Anlaeufen nimmt der Kern "offen" an und sagt es. */
      verpflegung: !!(p.verpflegung || p.verpflegungEgal || p.typ === "apartment"),
      wuensche: !!((p.kriterien || []).length || p.ausstattungEgal),
      /* Der Anreisetag. Mit festen Daten aus der Suche ist er da, sonst
         muss die Person ihn nennen - ohne ihn laesst die Seite nicht
         buchen, und der Knopf auf der Hausseite bleibt gesperrt.
         Mit Flug wird er hier nicht gefragt: Welche Tage gehen, haengt an
         der Verbindung und damit am Haus, das noch nicht feststeht. Dort
         fragt die Buchungsstrecke danach, mit den echten Flugtagen. */
      anreise: !!p.anreise || !!(p.von && p.bis) || !!p.flug,
    };
    /* Eine Frage wird hoechstens zweimal gestellt.
       ------------------------------------------------------------------
       Im Pruefstand vom 25.09.2026 stand dieselbe Frage bis zu achtmal
       hintereinander im Chat, woertlich gleich. Die Person hatte jedes
       Mal geantwortet - nur eben zu einem anderen Thema ("maximal 1600
       Euro", "Pool und Kinderclub", "nimm das erste"), und das offene
       Thema blieb offen. Der Agent wirkte dadurch taub, und das Gespraech
       kam nicht bis zur Buchung.

       Jetzt gilt: Wer zweimal nicht antwortet, will nicht antworten.
       Der Kern nimmt dann das Naheliegende an, sagt es im naechsten Satz
       und geht weiter. Keine Annahme ist endgueltig - die Person kann
       jederzeit widersprechen, und der Stand in der Leiste zeigt, was
       angenommen wurde. */
    const ANNAHME = {
      /* Auch der Monat wird irgendwann angenommen.
         ----------------------------------------------------------------
         Er fehlte hier, und deshalb konnte die Zeitfrage endlos
         wiederkommen: Fuer jedes andere Thema greift nach zwei
         vergeblichen Anlaeufen eine Annahme, fuer den Monat nicht. Am
         27.09.2026 stand er dreimal im Chat, beim dritten Mal Wort fuer
         Wort wie beim zweiten.

         Angenommen wird nicht blind der naechste Monat, sondern der aus
         `monatWaehlen` - dieselbe Rechnung, die auch der sichtbare
         Vergleich benutzt. Nur eben still, weil es hier nicht um eine
         abgegebene Wahl geht, sondern darum, dass keine Antwort kam. */
      zeit: { schreibt: ["monat", "von", "bis"], setzen: (x, wk) => {
        const jz = wk.jahreszeitGenannt?.(lauf);
        const monate = jz ? jz.monate : null;
        const w = monate ? wk.monatWaehlen(x, monate) : null;
        x.monat = w ? w.monat : (new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2);
      }, satz: "mit welchem Monat du rechnest und dass sie ihn jederzeit aendern kann",
        selbst: (x) => `Ich rechne erst mal mit ${typeof MONATSNAMEN !== "undefined" ? MONATSNAMEN[x.monat - 1] : "diesem Monat"}. Sag gern Bescheid, wenn ein anderer Monat besser passt.` },
      weiter: { schreibt: ["weiter"], setzen: (x) => { x.weiter = "schauen"; } },
      beratung: { schreibt: ["beratung"], setzen: (x) => { x.beratung = "auswahl"; } },
      vorgehen: { schreibt: ["vorgehen"], setzen: (x) => { x.vorgehen = "top3"; } },
      ziel: { schreibt: ["zielId", "richtung", "zielOffen"], setzen: (x) => { x.zielOffen = true; } },
      /* Offen heisst offen.
         ----------------------------------------------------------------
         Hier stand `x.typ = "hotel"` - kam zweimal keine Antwort, suchte
         der Agent still in der Haelfte des Angebots weiter. Seit es den
         gemeinsamen Reiter gibt, ist das nicht mehr noetig. */
      art: { schreibt: ["typ", "artEgal"], setzen: (x) => { x.artEgal = true; delete x.typ; },
        satz: "dass du dich bei Hotel oder Ferienwohnung nicht festlegst und beides zeigst",
        selbst: "Ich lege dich bei Hotel oder Ferienwohnung nicht fest und zeige dir erst mal beides." },
      dauer: { schreibt: ["naechte"], setzen: (x) => { x.naechte = 7; }, satz: "dass du mit einer Woche rechnest",
        selbst: "Ich rechne erst mal mit einer Woche. Sag gern, wenn es anders sein soll." },
      flug: { schreibt: ["flug"], setzen: (x) => { x.flug = false; }, satz: "dass du ohne Flug suchst, nur die Unterkunft",
        selbst: "Ich suche erst mal ohne Flug, nur die Unterkunft." },
      // Schreibt NUR den Flughafen. Den Flug selbst abzuwaehlen, weil der
      // Flughafen offen ist, hiesse eine Aussage der Person zu kippen.
      flugAb: { schreibt: ["flugAb"], setzen: (x, wk) => {
        /* Hat sie Flughaefen genannt, wird auch daraus angenommen - der
           Rueckfall auf Frankfurt waere sonst ein Flughafen, von dem nie
           die Rede war. */
        if ((x.flugAbAuswahl || []).length && typeof Flug !== "undefined") {
          const ziele = x.zielId ? [x.zielId] : (x.zieleErlaubt || []);
          const w = wk.guenstigsterFlughafen(ziele, x.flugAbAuswahl);
          if (w) { x.flugAb = w.ab; return; }
        }
        x.flugAb = x.flugAb || "Frankfurt";
      }, satz: "von welchem Flughafen du rechnest und dass sie das aendern kann",
        selbst: (x) => `Ich rechne erst mal ab ${x.flugAb}. Du kannst den Flughafen jederzeit ändern.` },
      flugKlasse: { schreibt: ["flugKlasse"], setzen: (x) => { x.flugKlasse = x.flugKlasse || "economy"; }, satz: "dass du mit Economy rechnest",
        selbst: "Ich rechne erst mal mit Economy." },
      preis: { schreibt: ["maxPreis", "budgetGesamt", "preisEgal"], setzen: (x) => { x.preisEgal = true; }, satz: "dass du dich beim Preis nicht festlegst",
        selbst: "Beim Preis lege ich dich erst mal nicht fest." },
      verpflegung: { schreibt: ["verpflegung", "verpflegungEgal"], setzen: (x) => { x.verpflegungEgal = true; }, satz: "dass du die Verpflegung offen laesst",
        selbst: "Die Verpflegung lasse ich erst mal offen." },
      wuensche: { schreibt: ["wuensche", "kriterien", "ausstattungEgal"], setzen: (x) => { x.ausstattungEgal = true; }, satz: "dass du keine besondere Ausstattung voraussetzt",
        selbst: "Besondere Ausstattung setze ich erst mal nicht voraus." },
      anreise: { schreibt: ["anreise"], setzen: (x, wk) => {
        const f = wk.flexWahl(x);
        if (f) x.anreise = `${f.monat}-01`;
      }, satz: "welchen Anreisetag du genommen hast und dass sie ihn jederzeit aendern kann",
        selbst: (x) => {
          const tag = parseInt(String(x.anreise || "").slice(-2), 10);
          const monat = typeof MONATSNAMEN !== "undefined" && x.monat ? ` ${MONATSNAMEN[x.monat - 1]}` : "";
          return tag ? `Ich nehme erst mal den ${tag}.${monat} als Anreisetag. Du kannst ihn jederzeit ändern.` : null;
        } },
    };
    const angenommen = [];
    for (const [t, a] of Object.entries(ANNAHME)) {
      if (fertig[t] || (lauf.gefragtWie?.[t] || 0) < 2) continue;
      // Keine Annahme fasst an, was die Person selbst gesagt hat
      if ((a.schreibt || []).some((f) => p.vonPerson?.[f])) continue;
      /* Erst nachfragen, dann annehmen.
         ----------------------------------------------------------------
         Hat die Person geantwortet und der Agent sie nicht verstanden
         (kern.js setzt dann `nichtVerstanden`), bekommt sie eine
         Rueckfrage, die den Zweifel ausspricht - und keine Annahme.
         Beim zweiten Mal greift die Annahme doch, sonst dreht sich das
         Gespraech im Kreis; sie wird dann gesagt wie jede andere. */
      if ((lauf.nichtVerstanden?.[t] || 0) === 1) continue;
      /* Eine Annahme, die nichts setzt, ist keine.
         ----------------------------------------------------------------
         Gefunden von der Pruefung am 01.10.2026: Der Anreisetag wurde in
         168 Staenden als erledigt abgehakt, ohne dass ein Tag im Stand
         stand - `flexWahl` liefert ohne Monat nichts zurueck. Danach galt
         das Thema als besprochen, obwohl niemand etwas davon hatte, und
         zu sagen gab es auch nichts.

         Jetzt wird erst gesetzt und dann nachgesehen: Hat sich keines der
         Felder bewegt, bleibt das Thema offen. */
      const vorFeldern = JSON.stringify((a.schreibt || []).map((f) => p[f] ?? null));
      a.setzen(p, this);
      if (JSON.stringify((a.schreibt || []).map((f) => p[f] ?? null)) === vorFeldern) continue;
      fertig[t] = true;
      (lauf.uebersprungen ||= {})[t] = true;
      if (a.satz) {
        angenommen.push((lauf.nichtVerstanden?.[t] || 0) >= 2
          ? `dass du ihre Angabe nicht sicher lesen konntest und erst einmal davon ausgehst, ${a.satz}`
          : a.satz);
      }
      /* Gesagt wird die Annahme vom Kern, nicht vom Modell.
         ----------------------------------------------------------------
         Bis zum 01.10.2026 bekam das Modell nur den Auftrag ("Sag zuerst
         in einem kurzen Halbsatz, dass du mit einer Woche rechnest"). Im
         Testlauf hat es stattdessen die Wuensche quittiert, und die
         sieben Naechte standen unkommentiert in der Uebersicht. Fuer
         einen Wert, der in den Studiendaten landet, ist ein Auftrag an
         das Modell zu schwach - er wird mal befolgt und mal nicht.

         Deshalb legt der Fahrplan den fertigen Satz hier ab, und der Kern
         sagt ihn beim naechsten Zusammensetzen einer Nachricht. Das gilt
         auch fuer die Aufrufe aus den Werkzeugen heraus: Wo auch immer
         die Annahme greift, der Satz wartet, bis er gesagt werden kann. */
      const eigen = typeof a.selbst === "function" ? a.selbst(p, this) : a.selbst;
      if (eigen) {
        const vorsicht = (lauf.nichtVerstanden?.[t] || 0) >= 2
          ? "Deine Angabe konnte ich nicht sicher lesen. " : "";
        /* Der Satz merkt sich, wofuer er gilt.
           --------------------------------------------------------------
           Gemeldet am 02.10.2026: "Da steht, okay, festes Budget, 8000
           Euro merke ich mir. Und dann in der naechsten Nachricht steht,
           okay, erstmal legst du dich anscheinend noch nicht fest. Das
           widerspricht sich doch."

           Genau so war es. Der Satz wurde in einem Zug beschlossen und
           erst im naechsten gesagt - und dazwischen hatte die Person die
           Zahl genannt. Ein Satz ueber einen Wert ist nur so lange wahr,
           wie der Wert noch so im Stand steht. Deshalb reist er mit
           seinem Grund: Thema und die Felder samt Werten, die die Annahme
           geschrieben hat. Wer ihn sagen will, prueft erst, ob er noch
           gilt (`Werkzeugkasten.annahmeGilt`). */
        const geschrieben = {};
        for (const f of a.schreibt || []) geschrieben[f] = p[f] ?? null;
        (lauf.annahmeOffen ||= []).push({ thema: t, text: `${vorsicht}${eigen}`, felder: geschrieben });
      }
    }

    /* Die Art steht vor dem Ziel - und vor der ersten Suche.
       ------------------------------------------------------------------
       Der Nutzer am 28.09.2026: Der Agent sah nach, wie viele Haeuser es
       im Sommer gibt, bevor klar war, ob es ein Hotel oder eine
       Ferienwohnung werden soll - und schaute dabei nur auf dem
       Hotelreiter. "Haette ich ihm danach Ferienwohnung gesagt, haette
       er nicht die richtigen Informationen gehabt."

       Das Ziel darf weiter nach der Suche kommen: Die Lage soll ja bei
       der Zielwahl helfen ("im Juni die meisten Haeuser auf Mallorca").
       Die Art nicht - sie entscheidet, worueber ueberhaupt gezaehlt
       wird. */
    /* Die Dauer gehoert zum Monat, nicht hinter die erste Suche.
       ------------------------------------------------------------------
       Der Nutzer am 02.10.2026: "Nachdem gefragt wurde, wann und wie viele
       Leute, da wurde dann schon eine Suche gemacht. Was ja auch okay ist.
       Man koennte ueberlegen, dass man da dann schon fragt, wie viele
       Naechte. Macht ja eigentlich auch Sinn."

       Es macht Sinn, und zwar aus einem handfesten Grund: Der erste
       Ueberblick nennt Preise, und ohne Dauer stand dort "gerechnet mit
       einer Woche" - eine Annahme in der ersten Zahl, die die Person
       bekommt. Mit der Dauer davor ist die Spanne echt. Ausserdem haengt
       der Mindestaufenthalt daran, also auch, was ueberhaupt buchbar ist.

       Eine Frage mehr vor der ersten Suche, und zwar genau die, die die
       Zahlen traegt. */
    const KERN = ["zeit", "dauer", "reisende", "kinderAlter", "art", "ziel"];
    const ECKDATEN = ["flug", "flugAb", "flugKlasse"];
    // Verpflegung nur bei Hotels - eine Ferienwohnung hat keine
    // Wer gleich eine Auswahl sehen will, bekommt sie - der Anreisetag
    // bleibt trotzdem, ohne ihn laesst die Seite nicht buchen.
    /* Alles, was den Preis bewegt, kommt vor den Preis.
       ------------------------------------------------------------------
       Der Nutzer am 02.10.2026: "Es muessen die Sachen, die den Preis
       beeinflussen, eigentlich vorher geklaert werden." Eine Grenze von
       5.000 Euro ist sonst eine Zahl auf etwas, das noch gar nicht
       feststeht - und genau so kam im Testlauf ein Budget zustande, das
       nachher niemand einhalten konnte.

       Flug und Klasse stehen ohnehin davor (ECKDATEN). Die Verpflegung
       stand bisher dahinter und wechselt jetzt davor. Die Wuensche
       bleiben dahinter: Sie entscheiden, WELCHE Haeuser in Frage kommen,
       nicht was sie kosten.

       Das Zimmer laesst sich nicht vorziehen - welche es gibt und was sie
       kosten, haengt am Haus, und das steht erst nach der Auswahl fest.
       Dort fragt der Agent danach und kennzeichnet, welches Zimmer die
       Grenze sprengen wuerde. */
    const BESPRECHEN = (p.typ === "apartment" ? ["preis", "wuensche"] : ["verpflegung", "preis", "wuensche"]).concat("anzahl");
    // Wer selbst schaut, wird nicht ausgefragt; wer raussuchen laesst, schon
    const BERATUNG = (p.vorgehen === "selbst" ? [] : BESPRECHEN).concat("anreise");
    const kernFertig = KERN.every((t) => fertig[t]);
    const suchbereit = fertig.zeit && fertig.reisende && fertig.kinderAlter && fertig.art;
    const schluessel = this.eckdatenSchluessel(p);
    const gesucht = lauf.gesuchtMit === schluessel;
    // Der vor der Lage geaeusserte Wunsch gilt, sobald die Lage steht.
    if (!p.vorgehen && lauf.vorgehenFrueh && gesucht) { p.vorgehen = lauf.vorgehenFrueh; fertig.vorgehen = true; }
    const weiter = p.weiter || (b.weiter ? "schauen" : null) || (alleEckdaten ? "schauen" : null);
    // Bereit fuer die erste Suche: Kern da und entweder "schauen" gesagt oder
    // die restlichen Eckdaten geklaert
    const eckdatenFertig = kernFertig && (weiter === "schauen" || (weiter === "klaeren" && ECKDATEN.every((t) => fertig[t])));
    let naechstes = null;
    let phase = "eckdaten";
    if (!kernFertig) naechstes = KERN.find((t) => !fertig[t]);
    /* Erst nachsehen, dann weiterfragen.
       ------------------------------------------------------------------
       Bis zum 25.09.2026 kam nach den Eckdaten sofort die Frage "schon mal
       schauen oder erst klaeren?" - und der Agent hatte zu diesem
       Zeitpunkt noch nie auf die Seite gesehen. Er redete ueber ein
       Angebot, das er nicht kannte. Wunsch des Nutzers: "Lappland und
       Oktober, hoert sich gut an, ich schaue schon mal nach, wie viele
       Hotels wir ueberhaupt haben."

       Sobald Monat, Reisende und Richtung stehen, wird also gesucht -
       sichtbar auf der Seite - und erst die Lage danach traegt die Frage.
       Die Personenzahl ist dafuer da: Sie steht in KERN und damit vorher. */
    else if (!lauf.gesuchtMit) phase = "suche";
    /* Eine Entscheidung, nicht drei.
       ------------------------------------------------------------------
       Am 27.09.2026 stand im Chat zweimal hintereinander dieselbe Frage:
       "Soll ich die Filter setzen, damit du selbst schaust, oder klaeren
       wir noch Eckdaten?" - Antwort "Noch ein paar Eckdaten" - und direkt
       danach "Wollen wir noch ein paar Eckdaten besprechen, oder zeige ich
       dir gleich eine Auswahl?" Der Nutzer: "Das wirkt direkt wie ein
       Fehler und nimmt die Lust weiterzumachen."

       Ursache war der Umbau vom 25.09.: Seit die Suche VOR der Frage
       laeuft, fragen `weiter` (klaeren oder schauen) und `beratung`
       (klaeren oder Auswahl) dasselbe, nur anders formuliert. Dazu kam
       `vorgehen` (selbst oder raussuchen) als dritte Variante derselben
       Entscheidung.

       Jetzt gibt es nach der Lage genau eine Frage: Suche ich dir Haeuser
       raus, oder gehst du selbst durch die Liste? Wer raussuchen laesst,
       bekommt die Eckdaten der Reihe nach gestellt - ohne vorher gefragt
       zu werden, ob er gefragt werden moechte. Niemand im Reisebuero
       fragt, ob man Fragen beantworten will. */
    /* Bevor er sagt, dass die Filter stehen, muessen sie stehen.
       ------------------------------------------------------------------
       Nennt die Person zwischen Lage und Vorgehensfrage noch einen
       Filter ("am liebsten eins im Angebot"), ist die Spalte veraltet.
       Dann wird erst gesucht und danach gefragt. */
    /* Bevor er sagt "die Filter stehen", muessen sie wirklich stehen.
       ------------------------------------------------------------------
       Am 28.09.2026: Nach "im Februar" suchte der Agent, danach kamen
       "eher kalt" und "Ferienwohnung" - und er sagte trotzdem "Die Filter
       stehen jetzt so auf der Seite". Auf der Seite stand nur der Februar.

       Geprueft wurde nur der Filterschluessel, und der kannte weder die
       Himmelsrichtung noch die Art der Unterkunft. Beide stehen im
       Eckdatenschluessel - also wird jetzt auch der geprueft. Das ist
       genau dieselbe Bedingung, die zwei Zeilen weiter unten ohnehin
       schon steht; sie kam nur zu spaet, naemlich erst NACH der Frage. */
    /* Neu gesucht wird dort, wo es etwas bedeutet - nicht nach jeder Antwort.
       ------------------------------------------------------------------
       Erster Anlauf am 28.09.2026 stellte die Pruefung als eigenen Zweig
       davor: "Hat sich etwas geaendert? Dann such neu." Das stimmt zwar,
       galt aber fuer jede Antwort - und die Ablaufsimulation zeigte
       sechs Suchen in einem Gespraech, nach Dauer, Flug, Flughafen und
       Klasse jeweils eine. Jede kostet anderthalb Sekunden und laesst
       die Liste neu aufbauen; mitten in der Beratung ist das nur Unruhe.

       Entscheidend ist nicht, ob sich etwas geaendert hat, sondern ob
       der Agent gleich etwas ueber die Seite BEHAUPTET. Das tut er genau
       an einer Stelle: bei der Vorgehensfrage ("die Filter stehen jetzt
       so"). Also wird davor gesucht - und sonst erst wieder, wenn er
       vorlegt oder die Person selbst schaut (das erzwingt `zwang`). */
    /* Erst die Reisedaten, dann die Frage, wer aussucht.
       ------------------------------------------------------------------
       Der Nutzer am 28.09.2026: "Die Frage kam zu frueh. Es wurde noch
       gar nicht gefragt, warme Region, noch gar nicht gefragt, mit Flug.
       Die soll wirklich kommen, wenn die Hauptsachen schon geklaert
       sind."

       Sie stand bisher direkt nach der ersten Suche. Der Gedanke dahinter
       war richtig: Wer selbst stoebern will, soll nicht vorher acht
       Fragen beantworten muessen. Nur war "die Filter stehen" an dieser
       Stelle eine duenne Behauptung - Dauer und Flug fehlten, und ohne
       die kann man weder selbst vernuenftig suchen noch raussuchen
       lassen.

       Jetzt liegt die Grenze zwischen den Reisedaten und den Feinheiten:
       Dauer, Flug, Flughafen und Klasse kommen davor - die braucht jeder,
       in beiden Zweigen. Preis, Verpflegung, Wuensche und die Anzahl
       danach - die braucht nur, wer raussuchen laesst. Damit bleibt der
       Sinn der Frage erhalten und ihre Grundlage stimmt. */
    else if (ECKDATEN.some((t) => !fertig[t])) { naechstes = ECKDATEN.find((t) => !fertig[t]); phase = "eckdaten"; }
    else if (!fertig.vorgehen) {
      const seiteVeraltet = !gesucht
        || (lauf.gefiltertMit && lauf.gefiltertMit !== this.filterSchluessel(p));
      if (seiteVeraltet) phase = "suche";
      else { naechstes = "vorgehen"; phase = "beratung"; }
    }
    /* Hier standen zwei weitere Zweige, die nicht mehr erreichbar waren.
       ------------------------------------------------------------------
       Sie fragten `beratung` ("noch Eckdaten oder gleich eine Auswahl?")
       und suchten davor noch einmal. Seit die Vorgehensfrage beide
       ersetzt, steht `beratung` fest auf erledigt - die Zweige konnten
       also nie greifen. Sie standen trotzdem noch da und liessen den
       Ablauf komplizierter aussehen, als er ist. Beim Nachlesen am
       28.09.2026 habe ich zweimal gebraucht, um zu sehen, dass sie tot
       sind; das allein ist Grund genug, sie zu entfernen. Die Felder
       selbst bleiben im Stand, weil Ableitungen und Auswertung sie
       lesen. */
    else {
      // Wer selbst schauen will, wird nicht weiter ausgefragt. Der Agent
      // stellt die Filter und laesst die Person in Ruhe; fehlt die Dauer,
      // rechnet die Maske mit einer Woche, und die Lage sagt das dazu.
      if (p.vorgehen === "selbst") { phase = "selbst"; }
      else {
        // ECKDATEN sind an dieser Stelle durch - sie stehen jetzt vor der
        // Vorgehensfrage, nicht mehr dahinter
        const offen = BERATUNG.find((t) => !fertig[t]) || null;
        if (offen) { naechstes = offen; phase = "beratung"; }
        else phase = "vorschlaege";
      }
    }
    let frage = naechstes ? this.THEMEN[naechstes]?.frage : null;
    let chips = naechstes ? this.THEMEN[naechstes]?.chips : null;
    // Der fertige Fragesatz. Die Sonderfaelle darunter duerfen ihn ersetzen.
    let satz = naechstes ? this.themenSatz(naechstes, p, lauf) : null;
    const erklaerung = naechstes ? this.THEMEN[naechstes]?.erklaerung || null : null;
    /* Dieselbe Frage zum zweiten Mal.
       ------------------------------------------------------------------
       Wenn die Person auf eine Frage nicht antwortet, sondern etwas
       einwirft ("uebrigens, mir ist gutes Essen sehr wichtig"), steht das
       Thema danach immer noch offen. Das Modell stellte dann woertlich
       dieselbe Frage, direkt unter der Antwort auf den Einwurf - als
       haette es nicht zugehoert. Beim zweiten Mal wird erst nachgefasst,
       ob noch etwas offen ist, und die Frage danach angehaengt. */
    // Ohne Freigabe fuer die Seite kann der Agent keine Filter stellen - dann
    // lautet die Wahl: selbst schauen (mit Filtertipps) oder drei genannt bekommen
    const darfSeite = typeof FREIGABE_RANG !== "undefined" && lauf.freigabe ? FREIGABE_RANG[lauf.freigabe] >= FREIGABE_RANG.suchen : true;
    if (naechstes === "vorgehen" && !darfSeite) {
      frage = "Ob sie selbst durch die Liste schauen will (du darfst die Seite nicht bedienen, sagst ihr aber, welche Filter passen; vorgehen selbst) oder ob du ihr drei Haeuser nennst (vorgehen top3). Beides gleichwertig anbieten.";
      chips = "Ich schaue selbst | Nenn mir drei";
    }
    // Jahreszeit genannt, Monat offen: die drei Monate zur Wahl, keinen vorschlagen
    if (naechstes === "zeit") {
      const jz = this.jahreszeitGenannt(lauf);
      if (jz) {
        const m = jz.monate.map((x) => (typeof MONATSNAMEN !== "undefined" ? MONATSNAMEN[x - 1] : String(x)));
        satz = (lauf.gefragtWie?.zeit || 0) >= 1
          ? `Welcher der drei Monate passt euch am besten - ${m[0]}, ${m[1]} oder ${m[2]}? Wenn es dir gleich ist, suche ich den passendsten aus.`
          : `Du hast ${jz.name.charAt(0).toUpperCase() + jz.name.slice(1)} gesagt - welcher Monat soll es sein, ${m[0]}, ${m[1]} oder ${m[2]}? Wenn es dir egal ist, schaue ich nach, in welchem am meisten frei ist.`;
        frage = `Sie hat "${jz.name}" gesagt - frag, welcher Monat. Sagt sie "egal" oder gibt sie dir die Wahl, waehlt der Kern den Monat selbst aus und begruendet ihn; du musst dann nichts mehr fragen.`;
        chips = `${m.join(" | ")} | Such du aus`;
      }
    }
    /* "Feste Grenze" ist noch keine Grenze.
       ------------------------------------------------------------------
       Wer den Chip geklickt hat, hat die Frage beantwortet, aber keine
       Zahl genannt. Dieselbe Frage noch einmal zu stellen ("Hast du eine
       feste Grenze, oder bist du offen?") waere, als haette der Agent die
       Antwort nicht gehoert. Also fasst er konkret nach. */
    if (naechstes === "preis" && lauf.besprochen?.preis
      && !p.maxPreis && !p.budgetGesamt && !p.preisEgal) {
      satz = "Welche Grenze soll ich einhalten - pro Nacht oder für die ganze Unterkunft?";
      frage = "Sie hat gesagt, dass sie eine feste Grenze hat, aber noch keinen Betrag genannt. Frag nach der Zahl und danach, ob sie pro Nacht oder fuer die ganze Unterkunft gilt.";
      chips = null;
    }

    /* Zwei genannte Flughaefen: fragen, nicht entscheiden.
       ------------------------------------------------------------------
       Die allgemeine Frage ("Von welchem Flughafen soll es losgehen?")
       waere hier keine Frage mehr, sondern eine Wiederholung - die
       Person hat ja gerade zwei genannt. Stattdessen stehen beide zur
       Wahl, mit dem Preisunterschied dazu. Das ist die Entscheidungshilfe,
       die der Kern ohnehin ausrechnet; entschieden wird trotzdem nicht
       von ihm. */
    if (naechstes === "flugAb" && (p.flugAbAuswahl || []).length > 1 && typeof Flug !== "undefined") {
      const namen = p.flugAbAuswahl.map((c) => Flug.flughaefen().find((h) => h.code === c)?.name || c);
      const ziele = p.zielId ? [p.zielId] : (p.zieleErlaubt || []);
      const w = this.guenstigsterFlughafen(ziele, p.flugAbAuswahl);
      /* Zwei sind "beide", drei sind "alle drei".
         ----------------------------------------------------------------
         Gemeldet am 01.10.2026: Auf "gerne von Hannover, Hamburg oder
         Köln" kam "Soll ich nur von dort suchen, oder beide offen
         lassen?" - und damit fiel einer der drei unter den Tisch, ohne
         dass jemand etwas dazu gesagt haette. Der Vergleich ("der
         guenstigere") stimmt bei dreien auch nicht mehr. */
      const alle = { 2: "beide", 3: "alle drei", 4: "alle vier", 5: "alle fünf" }[namen.length] || "alle";
      // "Hannover und Hamburg und Köln" ist keine Aufzaehlung
      const liste = namen.length > 1
        ? `${namen.slice(0, -1).join(", ")} und ${namen[namen.length - 1]}`
        : namen[0];
      const vergleich = namen.length > 2 ? "günstigste" : "günstigere";
      if (p.flugAbEgal && w) {
        /* Sie hat die Wahl abgegeben - trotzdem wird gefragt.
           --------------------------------------------------------------
           Nutzer am 30.09.2026: "Dann soll er antworten: Hannover ist der
           billigere Flughafen, soll ich ihn als einzige Auswahl waehlen
           oder moechtest du dennoch beides suchen?" Der Unterschied ist
           nicht akademisch: Mit beiden Flughaefen bleiben Verbindungen im
           Spiel, die an anderen Tagen fliegen - und der Anreisetag haengt
           daran. */
        satz = `${w.ab} ist der ${vergleich}${w.zweiter && w.aufpreis > 0 ? ` - ${w.preis} € pro Strecke, ab ${w.zweiter} ${w.aufpreis} € mehr` : ""}. Soll ich nur von dort suchen, oder ${alle} offen lassen?`;
        frage = `Sie hat dir die Wahl zwischen ${liste} ueberlassen (${namen.length} Stueck). Sag, welcher guenstiger ist, und frag, ob du darauf eingrenzen sollst oder ${alle} offen laesst.`;
        chips = `Nur ${w.ab} | ${alle.charAt(0).toUpperCase()}${alle.slice(1)} offen lassen`;
      } else {
        const preisTeil = w && w.zweiter && w.aufpreis > 0
          ? ` Ab ${w.ab} kostet der günstigste Flug ${w.preis} € pro Strecke, ab ${w.zweiter} ${w.aufpreis} € mehr.`
          : (w ? ` Der günstigste Flug kostet ab ${w.ab} ${w.preis} € pro Strecke.` : "");
        satz = `Du hast ${liste} genannt - von welchem soll ich ausgehen?${preisTeil}`;
        frage = `Sie hat mehrere Flughaefen genannt (${namen.join(", ")}, also ${namen.length}). Frag, welcher es werden soll, und nenn den Preisunterschied. Entscheide NICHT selbst; will sie ${alle} behalten, bleibt es dabei.`;
        chips = `${namen.join(" | ")} | ${alle.charAt(0).toUpperCase()}${alle.slice(1)} offen lassen`;
      }
    }

    /* Die Zahl der Kinder geht auch an das Modell.
       ------------------------------------------------------------------
       Wunsch des Nutzers am 01.10.2026: "Hier sollte das Modell gerne
       bestimmen, wie man es formuliert, bzw. weitergeben, wie viele
       Kinder es waren." Der Fragesatz des Kerns steht schon richtig; hier
       bekommt auch das Modell die Zahl, damit es in seinem Anschluss
       nicht doch wieder in den Plural faellt. */
    if (naechstes === "kinderAlter") {
      const n = p.kinder || 0;
      const schon = (p.kinderAlter || []).length;
      frage = n === 1
        ? "Wie alt das eine Kind ist. Es ist genau EIN Kind - nicht im Plural von Kindern sprechen."
        : `Wie alt die ${n} Kinder sind${schon ? ` (von ${schon} weisst du das Alter schon)` : ""}. Die Zahl steht fest, nur das Alter fehlt.`;
    }

    // "Ein langes Wochenende" ist eine Dauerangabe. Ohne diesen Zweig fragte
    // der Agent danach trotzdem "Eine Woche, zehn Tage oder etwas anderes?"
    // und die Person musste sich wiederholen. Eine Zahl wird nicht geraten -
    // drei oder vier Naechte sagt sie selbst.
    if (naechstes === "dauer") {
      const gesagt = (lauf.gespraech || []).filter((n) => n.role === "user").map((n) => String(n.content).toLowerCase()).join(" ");
      if (/wochenende/.test(gesagt)) {
        /* Auch dieser Zweig braucht einen zweiten Wortlaut.
           --------------------------------------------------------------
           Gefunden von der Kernpruefung am 02.10.2026, nachdem die Dauer
           vor die erste Suche gerueckt ist: In 80 Staenden stand der
           zweite Anlauf Wort fuer Wort wie der erste. Vorher fiel es nicht
           auf, weil die Frage spaeter kam und seltener zweimal.
           Wortgleiche Wiederholung ist das, was den Agenten taub wirken
           laesst - der Hauptzweig hat deshalb laengst zwei Fassungen. */
        const zweiter = (lauf.gefragtWie?.dauer || 0) >= 1;
        satz = zweiter
          ? "Sag mir einfach die Zahl der Nächte, dann rechne ich damit - zwei, drei oder vier?"
          : "Ein langes Wochenende - sollen es zwei, drei oder vier Nächte werden?";
        frage = "Sie hat von einem Wochenende gesprochen - frag, ob zwei, drei oder vier Naechte gemeint sind.";
        chips = "2 Nächte | 3 Nächte | 4 Nächte";
      }
    }
    /* Die moeglichen Anreisetage als Chips.
       ------------------------------------------------------------------
       Im Prototyp ist jeder Tag des Monats frei und der Preis gleich -
       vier ueber den Monat verteilte Termine machen die Frage trotzdem
       beantwortbar, statt sie wie ein leeres Datumsfeld wirken zu lassen. */
    /* Die moeglichen Anreisetage als Chips.
       ------------------------------------------------------------------
       Im Prototyp ist jeder Tag des Monats frei und der Preis gleich -
       vier ueber den Monat verteilte Termine machen die Frage trotzdem
       beantwortbar, statt sie wie ein leeres Datumsfeld wirken zu lassen.
       Der Fragesatz selbst steht bei THEMEN.anreise. */
    if (naechstes === "anreise") {
      const t = this.anreiseTage(p);
      if (t.length) chips = t.join(" | ");
    }
    /* Die Art, wenn das Wort schon gefallen ist.
       ------------------------------------------------------------------
       "Moechtest du ein Hotel oder eine Ferienwohnung?" waere hier eine
       Frage, die so tut, als haette der Agent nicht zugehoert. Er hat
       zugehoert - nur war es eine Nebenbemerkung, keine Wahl. */
    /* Hoechstens einmal. Dass die Antwort der Person selbst wieder ein
       Wort enthaelt, das wie eine Erwaehnung aussieht, darf die Frage
       nicht neu ausloesen - genau so entstand die Schleife vom
       02.10.2026. */
    if (naechstes === "art" && p.artErwaehnt && !p.artGenannt && !lauf.artErwaehntGefragt) {
      lauf.artErwaehntGefragt = true;
      const wort = p.artErwaehnt === "apartment" ? "Ferienwohnung" : "Hotel";
      const anderes = p.artErwaehnt === "apartment" ? "Hotels" : "Ferienwohnungen";
      satz = `Du hattest vorhin ${wort} geschrieben - soll ich nur danach suchen, oder auch nach ${anderes}?`;
      frage = `Sie hat beilaeufig "${wort}" erwaehnt, aber nichts entschieden. Frag, ob nur danach gesucht werden soll (typ ${p.artErwaehnt}) oder auch nach dem anderen (artEgal true).`;
      chips = p.artErwaehnt === "apartment" ? "Nur Ferienwohnungen | Auch Hotels" : "Nur Hotels | Auch Ferienwohnungen";
    }

    if (naechstes === "reisende") {
      // Mehr Kinder als Reisende kann es nicht geben - die Vorschlaege
      // richten sich nach der Gruppe, nicht nach einer festen Liste
      const kindChips = (hoechstens) => ["Keine Kinder", "Ein Kind", "Zwei Kinder"]
        .slice(0, Math.max(1, Math.min(3, (hoechstens ?? 2) + 1))).join(" | ");
      /* Ein Fragezeichen je Satz - auch hier.
         ----------------------------------------------------------------
         "Sind Kinder dabei? Wenn ja, wie viele und wie alt?" sind zwei
         Fragen, und dieselbe Regel, die das Modell einhalten muss, gilt
         fuer den Kern. Die Pruefung vom 28.09.2026 hat es in 96.000
         Staenden gefunden. */
      const zweiter = (lauf.gefragtWie?.reisende || 0) >= 1;
      if (p.personen != null && p.erwachsene == null && p.kinder == null) {
        satz = zweiter
          ? `Wie teilt sich das bei euch ${p.personen} auf - nur Erwachsene, oder sind Kinder dabei (mit Alter)?`
          : `Sind von den ${p.personen} Kinder dabei - und wenn ja, wie viele und wie alt?`;
        chips = kindChips(p.personen - 1);
      } else if (p.erwachsene != null && p.kinder == null) {
        satz = zweiter
          ? "Kommen Kinder mit, und wenn ja, wie alt sind sie?"
          : "Sind Kinder dabei - und wenn ja, wie viele und wie alt?";
        chips = kindChips(null);
      } else if (p.kinder != null && p.erwachsene == null) {
        satz = zweiter ? "Und wie viele Erwachsene sind dabei?" : "Und wie viele Erwachsene reisen mit?";
        chips = "1 | 2 | 3 | 4 | mehr";
      }
    }
    /* Dieselbe Frage zum zweiten Mal.
       ------------------------------------------------------------------
       Wenn die Person auf eine Frage nicht antwortet, sondern etwas
       einwirft ("uebrigens, mir ist gutes Essen sehr wichtig"), steht das
       Thema danach immer noch offen. Das Modell stellte dann woertlich
       dieselbe Frage, direkt unter der Antwort auf den Einwurf - als
       haette es nicht zugehoert.

       Dieser Block stand bis zum 25.09.2026 weiter oben und wurde von den
       Sonderfaellen darunter (anreise, zeit, dauer, reisende) wieder
       ueberschrieben. Genau dort trat der Fehler auf: Die Anreisefrage kam
       viermal Wort fuer Wort gleich. Er gehoert ans Ende, nach allen
       Sonderfaellen.

       Die frueherere Formulierung liess das Modell ausserdem fragen, ob es
       fragen soll ("Moechtest du noch etwas sagen, oder soll ich fragen,
       ob ihr ein Hotel wollt?"). Deshalb steht jetzt ausdruecklich da,
       dass die Frage anders klingen muss und keine Metafrage sein darf. */
    if (naechstes && (lauf.gefragtWie?.[naechstes] || 0) >= 1) {
      frage = `Sie ist auf diese Frage nicht eingegangen, sondern hat etwas anderes gesagt. Geh in einem Satz darauf ein und stell die Frage dann ANDERS als beim ersten Mal - anderer Satzbau, andere Beispiele, nicht woertlich gleich. Frag nicht, ob du fragen sollst, und sag nicht, dass du schon gefragt hast. Worum es geht: ${frage}`;
    }
    // Was der Kern angenommen hat, weil zweimal keine Antwort kam, wird
    // gesagt - nicht stillschweigend gesetzt.
    if (angenommen.length) {
      const sag = `Der Chat sagt gleich selbst, ${angenommen.slice(0, 2).join(" und ")}. Wiederhole das NICHT und formuliere es nicht um.`;
      frage = frage ? `${sag} ${frage}` : sag;
    }
    /* Was der Kern selbst entschieden hat, hat er schon gesagt.
       ------------------------------------------------------------------
       `ableiten` schreibt den Satz sofort in den Chat. Hier steht er nur
       noch als Erinnerung fuer das Modell, damit es ihn nicht in eigenen
       Worten wiederholt - so wie die Lage nach der Suche. */
    const vorsatz = (lauf.abgeleitet || []).map((x) => x.satz).join(" ") || null;
    const empfehlungBereit = p.vorgehen === "top3" && BERATUNG.every((t) => fertig[t])
      && fertig.dauer && fertig.flug && fertig.flugAb;
    if (vorsatz) frage = `Das steht schon im Chat, du hast es gerade gesagt: "${vorsatz}" - nicht wiederholen und nicht umformulieren.${frage ? ` Dann: ${frage}` : ""}`;
    return { fertig, naechstes, frage, satz, vorsatz, erklaerung, chips, phase, suchbereit, eckdatenFertig, gesucht, schluessel, empfehlungBereit,
      angenommen, ueberblickOffen: false, fehlt: [...KERN, ...ECKDATEN].filter((t) => !fertig[t]) };
  },

  // Welches Werkzeug der Kern erzwingt, wenn das Modell es nicht von
  // sich aus ruft: die erste Suche, die Suche nach der Beratung. Null,
  // wenn nichts ansteht.
  zwang(p, lauf = {}) {
    // Bei Freigabe "buchen" folgt auf die vorbereitete Buchung der Abschluss
    // im selben Zug. Das Modell kuendigte es sonst an und fragte dann doch.
    if (lauf.abschlussFaellig) return "buchung_abschliessen";
    // Der Rundgang laeuft: erst ansehen, dann vorlegen
    if (lauf.rundgang?.ids?.length) return "haeuser_ansehen";
    /* Der Monatsvergleich geht allem voran.
       ----------------------------------------------------------------
       Er entscheidet, mit welchem Monat der Rest ueberhaupt rechnet -
       Lage, Stichprobe und jede Preisangabe haengen daran. Liefe er
       spaeter, stuende erst eine Lage fuer den vorlaeufigen Monat im
       Chat und danach die Ansage, dass es doch ein anderer wird. */
    if (lauf.gesuchtMit && lauf.monatsvergleich?.monate?.length) return "monate_vergleichen";
    // Die Stichprobe nach der ersten Suche laeuft
    if (lauf.stichprobe?.ids?.length) return "stichprobe_nehmen";

    // Fragt die Person nach Bewertungen zu einem Haus, das der Agent in
    // diesem Gespraech noch nicht gelesen hat, wird das Lesen erzwungen.
    // Sonst antwortet das Modell aus einem alten Werkzeugergebnis, und
    // die Person sieht nur einen Satz ohne Arbeit dahinter.
    const haus = lauf.gewaehlt || (lauf.letzteVorlage || [])[0] || null;
    if (haus && !(lauf.gelesen || {})[haus]) {
      const letzte = [...(lauf.gespraech || [])].reverse().find((n) => n.role === "user");
      if (letzte && /bewert|rezension|gäste|gaeste|erfahrung|was sagen|wie ist das essen|teilnote|kritik|gelobt|beschwer/i.test(String(letzte.content || ""))) {
        return "bewertungen_lesen";
      }
    }

    const fp = this.fahrplan(p, lauf);
    // Die erste Suche, sobald der Kern der Eckdaten steht - nicht erst,
    // wenn alles geklaert ist
    if (fp.suchbereit && !lauf.gesuchtMit) return "suchen";
    // Der Fahrplan verlangt eine Suche (erste Umschau, geaenderte Filter,
    // Ende der Beratung) - dann wird gesucht, nicht geredet
    if (fp.phase === "suche") return "suchen";
    /* Hier stand eine dritte Suchregel: sobald die Eckdaten standen und
       sich etwas geaendert hatte, noch einmal suchen. Sie stammte aus der
       Zeit, als die Vorgehensfrage direkt nach der ersten Suche kam.
       Seit die Eckdaten davor liegen, feuerte sie mitten in der Abfrage -
       nach dem Flughafen eine Suche, nach der Klasse noch eine. Der
       Fahrplan setzt die Phase "suche" laengst selbst, wenn die Seite vor
       einer Behauptung veraltet ist; die Regel darueber greift dann. */
    if ((fp.phase === "vorschlaege" || fp.phase === "selbst") && lauf.vorgehenFuer !== fp.schluessel + p.vorgehen) {
      /* Steht die Seite schon genau so, wird nicht noch einmal gesucht.
         --------------------------------------------------------------
         Gemeldet am 02.10.2026: "Ich habe geschrieben, ich schaue selbst,
         und dann ist er doch noch mal rübergegangen und hat, obwohl die
         Filter ja schon alle eingestellt waren, noch mal alle Filter
         gesetzt. Das macht echt keinen Sinn."

         Er hat recht. Die Antwort auf die Vorgehensfrage aendert den
         Schluessel (er enthaelt `vorgehen`), und daran haengte die Suche -
         obwohl sich an Ziel, Zeit, Gruppe und Filtern nichts geaendert
         hatte. Die Suche laedt die Seite neu, und danach steht die
         Filterspalte wieder auf Standard, also wird alles noch einmal
         angeklickt. Fuer die Person sieht das aus, als haette der Agent
         vergessen, was er gerade getan hat.

         Also: Wer selbst schauen will und eine Liste vor sich hat, die
         zum Stand passt, bekommt sie - und keinen zweiten Durchgang. Fuer
         die Vorlage (top3) bleibt es bei der Suche: Dort entsteht mit ihr
         auch die Auswahl. */
      const seiteSteht = lauf.gesuchtMit === fp.schluessel
        && (!lauf.gefiltertMit || lauf.gefiltertMit === this.filterSchluessel(p));
      if (fp.phase === "selbst" && seiteSteht) {
        lauf.vorgehenFuer = fp.schluessel + p.vorgehen;
        lauf.filterStandSchon = true;
        return null;
      }
      return "suchen";
    }
    return null;
  },

  // Der Fahrplan als Teil eines Werkzeugergebnisses (stand_merken, suchen)
  fahrplanFuerModell(fp, p, lauf = null) {
    /* Hat jemand anderes die Seite bedient, darf er nicht behaupten,
       seine Filter staenden noch. Der Hinweis haengt an jeder Lage, weil
       das Modell sonst aus dem Gedaechtnis des Gespraechs antwortet. */
    const fremd = lauf?.filterFremd
      ? " ACHTUNG: Die Filterspalte auf der Seite ist nicht mehr die, die du gesetzt hast - die Person hat die Seite selbst bedient (Reiterwechsel oder Filter zurueckgesetzt). Behaupte NICHT, die Filter staenden. Will sie sie wiederhaben, ruf suchen."
      : "";
    /* Die Frage stellt der Chat, nicht das Modell.
       ------------------------------------------------------------------
       Das Modell schreibt nur noch den Anschluss an das, was die Person
       gerade gesagt hat. Der Kern haengt seine Frage an. So kann es keine
       zweite Frage geben, keine woertliche Wiederholung und keine Frage
       ueber die Frage. */
    if (fp.naechstes && fp.satz) {
      /* Ebene 2: Die Person hat nicht geantwortet, sondern gefragt,
         widersprochen oder etwas gesagt, wofuer es kein Feld gibt. Dann
         fuehrt das Modell den Zug, und der Kern haelt seine Frage zurueck. */
      const art = lauf?.nachrichtArt || "antwort";
      if (art !== "antwort") return {
        alsNaechstes: `Die Person hat nicht auf deine Frage geantwortet, sondern ${
          { frage: "etwas wissen wollen", einwand: "widersprochen oder korrigiert", unklar: "die Frage nicht verstanden" }[art] || "etwas anderes gesagt"
        }. Geh darauf ein, in deinen eigenen Worten, und stell ruhig eine eigene Frage, wenn es weiterhilft. Die offene Frage des Fahrplans (${fp.naechstes}) kommt von selbst wieder - haeng sie NICHT an.${
          fp.erklaerung ? ` Falls sie wissen will, wozu du ${fp.naechstes} brauchst: ${fp.erklaerung}` : ""
        }${fremd}`,
        nochOffen: fp.fehlt,
      };
      /* Du schreibst die ganze Nachricht - und der Kern prueft sie.
         --------------------------------------------------------------
         Bis v=394 stand hier das Gegenteil: Das Modell sollte KEINE
         Frage stellen, der Kern haengte seine an. Daraus wurde eine
         Nachricht von zwei Autoren, und jeder gemeldete Doppler sass in
         dieser Naht. Jetzt schreibt das Modell alles, der Kern prueft
         den Vertrag (`nachrichtPruefen`) und nimmt bei einem Verstoss
         seinen eigenen Satz. Der Fragesatz des Kerns steht weiter dabei,
         aber als Vorlage, nicht als Verbot. */
      const nimmAuf = this.aufnahmeWorte(lauf, p);
      return {
        alsNaechstes: `Schreib die ganze Nachricht selbst, in deinen eigenen Worten, und stell darin GENAU EINE Frage - diese: ${fp.frage} So wuerde der Chat sie stellen: "${fp.satz}" Du darfst es anders formulieren, aber frag dasselbe und nichts dazu.${
          nimmAuf.length
            ? ` Sag ZUERST in einem kurzen Satz, dass du aufgenommen hast: ${nimmAuf.join(", ")}. Genau diese Angabe muss vorkommen.`
            : " Es ist nichts Neues in den Stand gegangen - behaupte also NICHT, du haettest dir etwas gemerkt."
        } GRUESST sie dich oder sagt sie etwas Persoenliches ("hi", "wie geht es dir?", "danke dir"), geh in einem kurzen Satz darauf ein, bevor es weitergeht. Hoechstens drei kurze Saetze, genau ein Fragezeichen, keine zweite Frage und keine Zahl, die nicht im Stand oder in einem Werkzeugergebnis steht.${fremd}`,
        /* Der Fragetext des Fahrplans geht weiter mit, auch wenn der Chat
           die Frage selbst stellt.
           --------------------------------------------------------------
           Beim Umbau am 27.09.2026 ist er weggefallen - und damit die
           BEDEUTUNG der Frage. In ihm steht, was eine Antwort ueberhaupt
           heisst: dass "egal" beim Monat den ersten der Jahreszeit meint,
           dass "offen" preisEgal setzt, dass Wuensche keine Filter sind.
           Ohne ihn wusste das Modell nicht, was es mit "Egal" anfangen
           soll - die Monatsfrage kam ein zweites Mal. */
        wasDuAufnimmst: fp.frage,
        nochOffen: fp.fehlt,
      };
    }
    if (fp.naechstes) return { alsNaechstes: `Frag genau ein Thema: ${fp.naechstes}. ${fp.frage}${fremd}`, ...(fp.chips ? { chipsBeispiel: fp.chips } : { chips: "keine - die Frage ist offen" }), nochOffen: fp.fehlt };
    if (fp.phase === "suche") return { alsNaechstes: `Ruf suchen und schildere danach die Lage.${fremd}` };
    if (fp.phase === "selbst") return { alsNaechstes: `Die Person will selbst schauen. Ruf suchen (stellt die Filter), dann sag ihr, dass die Liste steht und du da bist.${fremd}` };
    return { alsNaechstes: `Beratung abgeschlossen. Ruf suchen - es legt die drei passendsten Haeuser gleich vor.${fremd}` };
  },

  // Rueckwaertskompatibel: Punkte, die vor einer Vorlage fehlen
  nochOffen(p, lauf = {}) {
    const fp = this.fahrplan(p, lauf);
    const pflicht = [];
    if (p.vorgehen !== "top3") pflicht.push("Vorgehen (drei raussuchen oder selbst schauen)");
    if (!fp.fertig.dauer) pflicht.push("Dauer");
    if (!fp.fertig.flug || !fp.fertig.flugAb) pflicht.push("Flug");
    if (!fp.fertig.preis) pflicht.push("Preis (fest oder offen)");
    if (!fp.fertig.verpflegung) pflicht.push("Verpflegung");
    if (!fp.fertig.wuensche) pflicht.push("Wuensche");
    return { pflicht, soll: [] };
  },

  // Die Lage als fester Satz: Regionen mit Zahlen, Preisspanne, was es gibt
  /* Woran es haengt, wenn kaum etwas uebrig bleibt.
     ------------------------------------------------------------------
     Im Livelauf am 27.09.2026: "eher kalt" und "nur was im Angebot ist"
     zusammen liessen genau ein Haus uebrig. Der Agent sagte die Zahl und
     stellte die naechste Frage, als waere nichts. Eine Sackgasse, die er
     selbst nicht bemerkt.

     Ein Mensch am Schalter wuerde hier sagen, welche der beiden Vorgaben
     die enge ist. Genau das steht jetzt hier: Jede Einschraenkung wird
     einmal weggelassen und neu gezaehlt; die mit dem groessten Gewinn
     ist der Engpass. Das ist Rechnen im Katalog, keine Behauptung -
     und es gibt der Person etwas zu entscheiden, statt sie vor eine
     leere Liste zu stellen. */
  /* Ab wie viel gibt es ueberhaupt etwas?
     ------------------------------------------------------------------
     Der Nutzer fragte am 30.09.2026 genau das ("ab wie viel gibt es denn
     hotels?") - und bekam zur Antwort noch einmal die Frage, welche
     Vorgabe er lockern will. Der Agent konnte es nicht beantworten, weil
     ihm niemand die Zahl ausgerechnet hat.

     Gerechnet wird mit demselben Preis, gegen den auch gefiltert wird:
     bei einer Nachtgrenze der Nachtpreis, bei einem Gesamtbudget der
     Aufenthaltspreis. Sonst nennt der Agent eine Zahl, mit der es
     hinterher immer noch nicht klappt. */
  /* Was die Reise kostet - einmal, fuer alle.
     ------------------------------------------------------------------
     Gemeldet am 02.10.2026: "5.000 Euro Gesamtbudget" genannt, kein
     einziger Vorschlag darunter (5.837 bis 14.603). Die Pruefung gegen
     das Budget rechnete nur die Unterkunft: 3.708 Euro fuer neun
     Naechte lagen unter 5.000, der Flug mit 1.632 Euro kam obendrauf und
     zaehlte nicht mit. Auf der Vorschlagskarte stand dagegen die ganze
     Summe - die Person sah also eine Zahl, die der Agent nie geprueft
     hatte.

     Ab jetzt rechnet diese eine Funktion, was die Reise kostet, und alle
     fragen sie: der Katalogfilter, der Mindestpreis, der Engpass und die
     Guetemessung. Gerechnet wird, was auf der Karte steht - Unterkunft
     mit Zimmer, Verpflegung und Endreinigung, dazu der Flug fuer alle
     Reisenden, hin und zurueck. Was erst an der Kasse dazukommt
     (Gepaeck, Versicherung, Kartengebuehr), gehoert nicht dazu: Das sind
     Entscheidungen der Person, keine Eigenschaft der Reise. */
  // Eine Rechnung fuer Karte, Regler, Agent und Kasse - siehe data/auswahl.js
  reisepreis(item, p) {
    return Auswahl.reisepreis(item, this.vorgaben(p));
  },

  mindestpreis(p) {
    const ohne = { ...p };
    delete ohne.maxPreis;
    delete ohne.budgetGesamt;
    const treffer = this.katalogTreffer(ohne, this.filterAusStand(ohne));
    if (!treffer.length) return null;
    const gesamtGrenze = !!p.budgetGesamt;
    const betrag = (h) => {
      if (!gesamtGrenze) return this.preis(h, p.monat);
      return this.reisepreis(h, p)?.gesamt ?? null;
    };
    let bestes = null;
    for (const h of treffer) {
      const b = betrag(h);
      if (b != null && (!bestes || b < bestes.betrag)) bestes = { betrag: Math.round(b), name: h.name, id: h.id };
    }
    if (!bestes) return null;
    return { ...bestes, art: gesamtGrenze ? (p.flug ? "für die ganze Reise mit Flug" : "für den ganzen Aufenthalt") : "pro Nacht",
      haeuser: treffer.length };
  },

  engpass(p) {
    const zaehle = (x) => this.katalogTreffer(x, this.filterAusStand(x)).length;
    const jetzt = zaehle(p);
    const ohne = [
      { label: "die Vorgabe, dass es reduziert sein soll", weg: (x) => { delete x.nurAngebote; }, wenn: () => p.nurAngebote },
      { label: "die Vorgabe, dass WLAN ohne Aufpreis dabei ist", weg: (x) => { delete x.wlanInklusive; }, wenn: () => p.wlanInklusive },
      { label: p.verpflegung && typeof BOARD_LABELS !== "undefined" ? `die Vorgabe ${BOARD_LABELS[p.verpflegung]}` : "die Verpflegung", weg: (x) => { delete x.verpflegung; }, wenn: () => p.verpflegung },
      { label: "die Preisgrenze", weg: (x) => { delete x.maxPreis; delete x.budgetGesamt; }, wenn: () => p.maxPreis || p.budgetGesamt },
      { label: "die Mindestzahl an Sternen", weg: (x) => { delete x.mindestSterne; }, wenn: () => p.mindestSterne },
      { label: "die Mindestbewertung", weg: (x) => { delete x.mindestbewertung; }, wenn: () => p.mindestbewertung },
      { label: "die Strandnähe", weg: (x) => { delete x.maxStrand; }, wenn: () => p.maxStrand != null },
      { label: "die Ausstattungswünsche", weg: (x) => { x.ausstattung = []; x.kriterien = []; }, wenn: () => this.filterAusStand(p).ausstattung.length },
      { label: p.richtung === "kalt" ? "die Beschränkung auf kalte Regionen" : p.richtung === "warm" ? "die Beschränkung auf warme Regionen" : "die Beschränkung auf diese Regionen", weg: (x) => { delete x.zieleErlaubt; delete x.richtung; }, wenn: () => !p.zielId && p.zieleErlaubt?.length },
      // Seit der feste Anreisetag mitfiltert, kann er der Engpass sein -
      // und dann ist er der erste, den man nennen sollte
      { label: "der feste Anreisetag", weg: (x) => { delete x.von; delete x.bis; }, wenn: () => p.flug && p.von },
    ].filter((o) => o.wenn());
    let bester = null;
    for (const o of ohne) {
      const probe = { ...p, kriterien: [...(p.kriterien || [])], ausstattung: [...(p.ausstattung || [])] };
      o.weg(probe);
      const n = zaehle(probe);
      if (!bester || n > bester.haeuser) bester = { label: o.label, haeuser: n };
    }
    // Lohnt nur, wenn es wirklich etwas bringt
    if (!bester || bester.haeuser < jetzt + 3 || bester.haeuser < jetzt * 2) return null;
    return { ...bester, jetzt };
  },

  /* Was zwischen der Zahl der Seite und der des Agenten steht.
     ------------------------------------------------------------------
     Der Agent filtert schaerfer als die Liste: Regionen ausserhalb ihrer
     Saison fallen weg, zu kleine Haeuser auch, und mit festem Datum die
     ohne Flug an dem Tag. Die Liste kann das nicht abbilden - sie kennt
     keine Himmelsrichtung und keine Flugtage. Statt die Luecke
     stehenzulassen, wird sie hier aufgeschluesselt, jede Zahl gezaehlt. */
  warumWeniger(p, monatText = "") {
    const alle = this.katalog(p);
    if (!alle.length) return [];
    const zeit = monatText ? `${monatText.replace(/^Im /, "im ")}` : "gerade";
    const personen = (p.erwachsene || 0) + (p.kinder || 0);

    /* Jedes Haus zaehlt genau einmal.
       ------------------------------------------------------------------
       Der erste Entwurf zaehlte je Grund ueber den ganzen Katalog. Ein
       Haus, das ausserhalb der Saison liegt UND zu klein ist, stand dann
       in beiden Zahlen - und die Summe passte nicht mehr zur Differenz,
       die sie erklaeren soll. Wer nachrechnet, haelt das fuer einen
       Fehler, und er hat recht. Gezaehlt wird deshalb nach dem ersten
       Grund, der greift, in der Reihenfolge, in der auch gefiltert wird. */
    const zaehler = {};
    for (const h of alle) {
      let grund = null;
      if (!p.zielId && p.monat && typeof saisonPassung === "function" && typeof ZIEL_NACH_ID !== "undefined"
        && ZIEL_NACH_ID[h.ziel] && saisonPassung(ZIEL_NACH_ID[h.ziel], p.monat) < 0.5) grund = "saison";
      else if (personen && !this.passtGruppe(h, p)) grund = "gruppe";
      else if (p.naechte && h.minNights && p.naechte < h.minNights) grund = "dauer";
      if (grund) zaehler[grund] = (zaehler[grund] || 0) + 1;
    }

    const WORT = {
      saison: (n) => `${n} in Regionen, die ${zeit} außerhalb ihrer Saison liegen`,
      gruppe: (n) => `${n}, die für ${personen} ${personen === 1 ? "Person" : "Personen"} nicht passen`,
      dauer: (n) => `${n} mit einem längeren Mindestaufenthalt`,
    };
    return Object.entries(zaehler).sort((a, b) => b[1] - a[1]).map(([k, n]) => WORT[k](n));
  },

  /* Dieselbe Zaehlung, aber als Zahlen statt als Saetze.
     ------------------------------------------------------------------
     Der Nutzer am 30.09.2026: "Ich wuerde die verfuegbaren Hotels als
     erste Kennzahl sagen und dann sagen, von den Hotels sind nur noch so
     und so viele verfuegbar, weil ..." Dafuer braucht die Lage eine
     Gesamtzahl der Ausgeschlossenen und die Gruende ohne eigene Zahlen -
     drei Zahlen nebeneinander liest niemand mehr nach. */
  warumWenigerZahlen(p) {
    const alle = this.katalog(p);
    const personen = (p.erwachsene || 0) + (p.kinder || 0);
    const zaehler = {};
    /* Die Reihenfolge ist dieselbe wie in `katalogTreffer`, und jedes
       Haus zaehlt genau einmal. Nur dann geht die Rechnung auf:
       buchbar plus nicht dabei ergibt den Katalog des Monats. Die
       Regionsgrenze fehlte hier zuerst - dann fehlten in der Summe
       genau die Haeuser, die wegen "eher warm" weggefallen waren. */
    for (const h of alle) {
      let grund = null;
      if (!p.zielId && p.zieleErlaubt?.length && !p.zieleErlaubt.includes(h.ziel)) grund = "region";
      else if (p.monat && typeof saisonPassung === "function" && typeof ZIEL_NACH_ID !== "undefined"
        && ZIEL_NACH_ID[h.ziel] && saisonPassung(ZIEL_NACH_ID[h.ziel], p.monat) < 0.5) grund = "saison";
      else if (personen && !this.passtGruppe(h, p)) grund = "gruppe";
      else if (p.naechte && h.minNights && p.naechte < h.minNights) grund = "dauer";
      if (grund) zaehler[grund] = (zaehler[grund] || 0) + 1;
    }
    const WORT = {
      region: p.richtung === "warm" ? "weil sie nicht in einer warmen Region liegen"
        : p.richtung === "kalt" ? "weil sie nicht in einer kalten Region liegen"
          : "weil sie außerhalb der gewünschten Regionen liegen",
      saison: "weil ihre Region gerade außerhalb der Saison liegt",
      gruppe: `weil sie für ${personen} ${personen === 1 ? "Person" : "Personen"} zu klein sind`,
      dauer: "wegen eines längeren Mindestaufenthalts",
    };
    const sortiert = Object.entries(zaehler).sort((a, b) => b[1] - a[1]);
    return {
      summe: sortiert.reduce((n, [, x]) => n + x, 0),
      gruende: sortiert.map(([k]) => WORT[k]),
      // Die Kennungen fuer kurze Hinweise ("dort ist die Saison noch
      // nicht abgezogen") - der ausformulierte Grund ist dafuer zu lang
      ids: sortiert.map(([k]) => k),
      grundmenge: alle.length,
    };
  },

  /* Die Kette vom Katalog zur Auswahl - in der Reihenfolge, in der die
     Seite sie auch abarbeitet.
     ------------------------------------------------------------------
     Der Nutzer am 30.09.2026: "125 plus 145 waeren 270 und nicht 177.
     Ich check's nicht, das macht keinen Sinn." Er hat recht: Im Text
     standen zwei Grundmengen nebeneinander, ohne dass eine genannt war.
     Die Ausschluesse zaehlten gegen den Monatskatalog (270), die Liste
     daneben zeigt aber schon ohne die zu kleinen Haeuser (177). Zwei
     Bezugsgroessen in einem Absatz, und keine Zahl passt zur anderen.

     Deshalb eine einzige Kette mit einer Grundmenge:

       270 im Monat frei
        -93 zu klein fuer die Reisegruppe   -> 177 stehen in der Liste
        -52 Region ausserhalb ihrer Saison  -> 125 buchbar

     Die Reihenfolge ist nicht beliebig: Erst die Gruppe, dann die
     Saison - genau so filtert die Trefferliste, und nur dann ist die
     mittlere Zahl die, die neben dem Chat steht. */
  lageKette(p) {
    const alle = this.katalog(p);
    const personen = (p.erwachsene || 0) + (p.kinder || 0);
    /* Regionen zuerst, wie im Filter. Bei "eher warm" faellt hier der
       groesste Teil weg, und ohne dieses Glied landete er im Sammeltopf
       "erfuellt die uebrigen Vorgaben nicht" - richtig gerechnet, aber
       nichtssagend. */
    const imGebiet = p.zielId
      ? alle.filter((h) => h.ziel === p.zielId)
      : (p.zieleErlaubt?.length ? alle.filter((h) => p.zieleErlaubt.includes(h.ziel)) : alle);
    const passend = personen ? imGebiet.filter((h) => this.passtGruppe(h, p)) : imGebiet;
    const saisonPrueft = p.monat && typeof saisonPassung === "function" && typeof ZIEL_NACH_ID !== "undefined";
    const ausserSaison = saisonPrueft
      ? passend.filter((h) => ZIEL_NACH_ID[h.ziel] && saisonPassung(ZIEL_NACH_ID[h.ziel], p.monat) < 0.5)
      : [];
    return {
      katalog: alle.length,
      woanders: alle.length - imGebiet.length,
      zuKlein: imGebiet.length - passend.length,
      inDerListe: passend.length,
      ausserSaison: ausserSaison.length,
      buchbar: passend.length - ausserSaison.length,
      personen,
    };
  },

  /* Wie sich die Auswahl auf warm und kuehl verteilt.
     ------------------------------------------------------------------
     Steht die Richtung noch aus, ist das die Zahl, die der naechsten
     Frage vorarbeitet ("warm oder kalt?"). Ist sie schon entschieden,
     waere sie nur Ballast. */
  warmKaltTeilung(liste, p) {
    if (p.richtung || p.zielId) return null;
    if (!p.monat || typeof grad !== "function" || typeof ZIEL_NACH_ID === "undefined") return null;
    /* Warm oder kalt, und nichts dazwischen.
       ------------------------------------------------------------------
       Gemeldet am 02.10.2026: "Die kalten und warmen Regionen summieren
       sich nicht auf die insgesamten Regionen. Das wuerde ich schon
       wollen, dass du quasi es immer in warm oder kalt einordnest. Es ist
       ja einfach so, liegt es in der Spanne, die du ausgewaehlt hast oder
       nicht? Deswegen muss es immer entweder warm oder kalt sein."

       Er hat recht, und der alte Weg konnte das nicht leisten: Gezaehlt
       wurde gegen zwei gepflegte Listen in `Politik.THEMEN`, und wer in
       keiner von beiden stand, fiel aus der Rechnung. Im Oktober ergab
       das 60 warme und 25 kalte bei 91 buchbaren - sechs Haeuser ohne
       Zuordnung, und die Person zaehlt nach.

       Jetzt entscheidet dieselbe Grenze, die auch "eher warm" bestimmt
       (`regionenFuerRichtung`): die Temperatur der Region im gewaehlten
       Monat gegen 22 Grad, oder was die Person genannt hat. Darueber ist
       warm, darunter kalt. Alle 18 Regionen haben eine vollstaendige
       Temperaturreihe, also bleibt kein Haus uebrig - die Summe geht
       immer auf. */
    const grenze = p.mindestGrad != null ? p.mindestGrad : 22;
    let w = 0, k = 0, ohne = 0;
    for (const h of liste) {
      const z = ZIEL_NACH_ID[h.ziel];
      const t = z ? grad(z, p.monat) : null;
      if (t == null) ohne += 1;
      else if (t >= grenze) w += 1;
      else k += 1;
    }
    // Eine Zahl ohne Gegenstueck erklaert nichts - und eine Aufteilung,
    // die nicht aufgeht, waere genau der Fehler von vorher.
    if (ohne || !w || !k) return null;
    return { warm: w, kalt: k, grenze };
  },

  lageSatz(liste, p, umfang, aufDerSeite = null) {
    /* Der Monatsname kam aus einer Rueckwaertssuche in Politik.MONATE,
       die Kurzformen ueber die Laenge aussortierte ("okt" gegen
       "oktober"). Bei Mai griff das gegen den Monat selbst: drei
       Buchstaben, also aussortiert - und im Chat stand "Aktuell gibt es
       78 Hotels" statt "Im Mai". */
    const monat = p.monat && typeof MONATSNAMEN !== "undefined" ? MONATSNAMEN[p.monat - 1] : null;
    const monatText = monat ? `Im ${monat}` : "Aktuell";
    const art = this.artWort(p, true);
    // "in den warmen Regionen in 8 Regionen" stand so auf der Seite - die
    // Himmelsrichtung gehoert vor das Wort Regionen, nicht davor und danach.
    const warmKalt = p.richtung === "warm" ? "warmen " : p.richtung === "kalt" ? "kalten " : "";
    const wo = p.zielId ? `auf ${ZIEL_NACH_ID?.[p.zielId]?.name || p.zielId}` : (warmKalt ? `in den ${warmKalt}Regionen` : "");
    const regionen = umfang.jeRegion || [];
    const teile = [];
    /* Die Zahl im Chat und die Zahl auf der Seite muessen zusammenpassen.
       ------------------------------------------------------------------
       Der Agent zaehlt die Haeuser in den passenden Regionen (112), die
       Liste daneben zeigt alle des Monats (184) - die Maske kann immer nur
       eine Region filtern, "alle warmen" laesst sich dort nicht
       ausdruecken. Wer beides sieht, haelt eine der beiden Zahlen fuer
       falsch. Jetzt stehen beide da, und es ist klar, welche welche ist. */
    const mehrAufDerSeite = aufDerSeite != null && aufDerSeite > liste.length;
    const top = regionen.slice(0, 3).map((r) => `${r.region} (${r.haeuser})`);
    const topText = top.length > 1 ? `${top.slice(0, -1).join(", ")} und ${top[top.length - 1]}` : top[0];

    /* Die erste Zahl ist die, die gilt.
       ------------------------------------------------------------------
       Der Nutzer am 30.09.2026: "Ich wuerde die verfuegbaren Hotels als
       erste Kennzahl sagen ... damit die erste Zahl, die man
       zurueckbekommt, auch die Zahl ist, die gilt."

       Vorher stand hier die Zahl der Liste (177), dann die passende (62),
       dann die Grundmenge des Katalogs (147) - drei Bezugsgroessen in
       einem Absatz, von denen keine sich selbst erklaert. Jetzt beginnt
       der Satz mit dem, was buchbar ist; alles andere ordnet sich darum
       herum. */
    /* Leer, weil die Region gerade keine Saison hat.
       ------------------------------------------------------------------
       "Im Maerz sind auf Kreta 0 Hotels buchbar" waere zwar richtig, sagt
       aber nicht, woran es liegt - und die Person koennte denken, der
       Katalog sei leer. Der Grund steht seit dem 30.09.2026 fest: Die
       Saisonregel gilt jetzt ueberall, also ist sie hier auch die
       Erklaerung. */
    const zielRegion = p.zielId && typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[p.zielId] : null;
    if (!liste.length && zielRegion && p.monat && typeof saisonPassung === "function"
      && saisonPassung(zielRegion, p.monat) < 0.5) {
      const haupt = typeof saisonText === "function" ? saisonText(zielRegion) : "";
      return `${zielRegion.name} hat ${monatText.replace(/^Im /, "im ")} keine Saison${haupt ? ` - Hauptsaison ist ${haupt}` : ""}. Dort ist gerade nichts buchbar.`;
    }

    const einzahl = this.artWort(p, false);
    // "35 Hotels buchbar in den warmen Regionen" stand so da - der Ort
    // gehoert vor die Zahl, sonst haengt er hinten dran wie ein Nachtrag.
    const ort = wo ? `${wo} ` : "";
    teile.push(liste.length === 1
      ? `${monatText} gibt es ${ort}${einzahl}.`
      : `${monatText} sind ${ort}${liste.length} ${art} buchbar.`);

    // Wie sie sich aufteilen: Hotels gegen Ferienwohnungen
    const auf = this.artAufteilung(liste, p);
    if (auf) teile.push(`Das sind ${auf}.`);

    /* Warm gegen kuehl - die Zahl, die der naechsten Frage vorarbeitet.
       Steht die Richtung schon fest, faellt sie weg. */
    const wk = this.warmKaltTeilung(liste, p);
    if (wk) teile.push(`Davon liegen ${wk.warm} in einer Gegend mit ${wk.grenze} Grad oder mehr, ${wk.kalt} darunter.`);

    // "Die meisten Mallorca (26)" fehlte eine Praeposition, und "in
    // Mallorca" waere falsch - der Doppelpunkt loest beides.
    if (regionen.length > 1) {
      teile.push(`Am meisten Auswahl gibt es in diesen Regionen: ${topText}.`);
    } else if (regionen.length === 1 && !p.zielId) {
      teile.push(`Alle davon in einer Region: ${regionen[0].region}.`);
    }

    /* Warum es weniger sind - als eine Kette mit einer Grundmenge.
       ------------------------------------------------------------------
       Erst standen hier zwei Bezugsgroessen nebeneinander ("145 weitere"
       gegen den Monatskatalog, "177" gegen die Liste), und keine Zahl
       passte zur anderen. Jetzt steht die ganze Rechnung da, in der
       Reihenfolge, in der auch gefiltert wird - und sie geht auf:
       buchbar plus zu klein plus ausserhalb der Saison ergibt den
       Katalog des Monats.

       Nur wenn die Kette die Auswahl wirklich erklaert (also keine
       weiteren Filter wie Preis oder Verpflegung dazwischenstehen),
       werden die Zahlen genannt. Sonst bliebe eine Rechnung stehen, die
       nicht aufgeht - genau der Fehler, der behoben werden sollte. */
    const kette = this.lageKette(p);
    /* Die Kette erklaert die Auswahl vollstaendig, wenn man die uebrigen
       Vorgaben als eigenes Glied mitzaehlt (Preis, Verpflegung, Wuensche).
       Damit geht die Rechnung in jedem Fall auf, nicht nur im ersten
       Zug - und genau daran war der alte Text gescheitert. */
    const durchVorgaben = Math.max(0, kette.buchbar - liste.length);
    /* Bei einem festen Ziel ist die Rechnung ueber den ganzen Katalog
       kein Gewinn: Dass in Lappland Haeuser stehen, die nicht auf
       Mallorca liegen, muss niemandem erklaert werden. */
    /* Die Rechnung erst, wenn es etwas zu erklaeren gibt.
       ------------------------------------------------------------------
       Gemeldet am 02.10.2026: "Ausserdem ist die Nachricht in Bezug auf
       die warmen und kalten Regionen wieder sehr, sehr lang geworden."
       Sieben Saetze, davon drei ueber eine Grundmenge, nach der niemand
       gefragt hatte.

       Im ersten Ueberblick steht noch keine Vorgabe im Raum, die eine
       kleinere Zahl erklaeren muesste - da ist die Kette Ballast. Sobald
       die Person eine Richtung, ein Ziel, eine Verpflegung oder einen
       Preis genannt hat, wird sie wieder gesagt: Dann ist die Zahl die
       Folge einer eigenen Entscheidung, und das gehoert dazu. */
    const etwasVorgegeben = !!(p.richtung || p.zielId || p.verpflegung || p.maxPreis
      || p.budgetGesamt || p.maxStrand != null || p.mindestbewertung || p.mindestSterne
      || (p.kriterien || []).length || p.nurAngebote || p.wlanInklusive);
    if (kette.katalog > liste.length && !p.zielId && etwasVorgegeben) {
      const gruende = [];
      if (kette.woanders) {
        gruende.push(p.richtung === "warm" ? `${kette.woanders} liegen nicht in einer warmen Region`
          : p.richtung === "kalt" ? `${kette.woanders} liegen nicht in einer kalten Region`
            : `${kette.woanders} liegen außerhalb der gewünschten Regionen`);
      }
      if (kette.zuKlein) gruende.push(`${kette.zuKlein} sind für ${kette.personen} ${kette.personen === 1 ? "Person" : "Personen"} zu klein`);
      if (kette.ausserSaison) gruende.push(`${kette.ausserSaison} liegen in Regionen, die ${monatText.replace(/^Im /, "im ")} außerhalb ihrer Saison sind`);
      if (durchVorgaben) gruende.push(`${durchVorgaben} erfüllen deine übrigen Vorgaben nicht`);
      if (gruende.length) {
        // Das letzte Glied mit "und" - sonst stehen bei gleichen Zahlen
        // zwei Kommateile nebeneinander, die man als einen liest
        const liste2 = gruende.length > 1
          ? `${gruende.slice(0, -1).join(", ")} und ${gruende[gruende.length - 1]}`
          : gruende[0];
        teile.push(`Der Katalog hat ${monatText.replace(/^Im /, "im ")} ${kette.katalog} ${art} frei: ${liste2}.`);
      }
      /* Die Zahl der Liste steht hier nicht mehr.
         ----------------------------------------------------------------
         Sie war der Versuch, einen Unterschied zu erklaeren, den es nicht
         geben muss. Nutzer am 30.09.2026: "Ich habe immer noch nicht ganz
         verstanden, warum da jetzt nur 177 stehen ... dann lassen wir den
         Satz einfach weg. Oder zeig einfach die Menge von den Ausgegrauten
         nicht mehr, dann ist es gefixt."

         Beides ist passiert: Der Satz ist weg, und die Trefferliste zeigt
         Haeuser ausserhalb ihrer Saison gar nicht mehr (results.js). Damit
         zeigen Seite und Agent dieselbe Zahl, und es gibt nichts mehr zu
         erklaeren. */
    }

    // "Pro Nacht kosten sie 186 bis 186 €" - bei einem einzigen Haus gibt
    // es keine Spanne, und die Wiederholung derselben Zahl liest sich wie
    // ein Fehler in der Rechnung.
    /* Wie viele der Tag gekostet hat.
       ------------------------------------------------------------------
       Wer ein festes Datum nennt, soll wissen, dass es etwas ausschliesst
       - und wie viel. Sonst wirkt die kleinere Zahl wie ein duennes
       Angebot, dabei ist sie die Folge einer eigenen Vorgabe. */
    if (p.flug && p.von && typeof Flug !== "undefined") {
      const ohneTag = this.katalogTreffer({ ...p, flug: false }, this.filterAusStand(p)).length;
      const weg = ohneTag - liste.length;
      if (weg > 0) {
        teile.push(`${weg} weitere gäbe es, wenn der Anreisetag flexibel wäre - dorthin fliegt am ${Flug.datumText(p.von)} nichts.`);
      }
    }
    if (umfang.preisProNacht) {
      const { von, bis } = umfang.preisProNacht;
      const rest = p.naechte ? "" : ", gerechnet mit einer Woche";
      teile.push(von === bis
        ? `Pro Nacht sind das ${von} €${rest}.`
        : `Pro Nacht kosten sie ${von} bis ${bis} €${rest}.`);
    }
    /* Jedes Glied traegt sein eigenes Verb.
       ------------------------------------------------------------------
       Vorher hing "2 einen Kinderclub" am "haben" des Pool-Glieds. Faellt
       das weg, weil es in Lappland keine Pools gibt, stand da "2 einen
       Kinderclub, 7 sind mit 4,5 oder besser bewertet". */
    /* Nur Merkmale, die jemand genannt hat.
       ------------------------------------------------------------------
       Die Lage zaehlte frueher auf, was der Katalog hergibt: Pool,
       Kinderclub, Wellness. Damit stand ein Thema im Raum, das im
       Gespraech nie vorkam - und das Modell ordnete es im naechsten Satz
       auch noch ein ("Kinderclubs sind eher selten"). Das liest sich, als
       haette der Agent eine eigene Meinung zu etwas, wonach niemand
       gefragt hat. Genannt heisst: als Wunsch, als Filter oder im
       Klartext. Sonst bleiben Strandnaehe und Gaestenote - beides sagt
       etwas ueber die Auswahl, ohne ein Thema zu setzen. */
    const gesagt = [...(p.wuensche || []), ...(p.kriterien || []), p.ausstattung || ""].join(" ").toLowerCase();
    const genannt = (re) => re.test(gesagt);
    const merkmale = [];
    /* Die Strandzahl nur noch auf Nachfrage.
       ------------------------------------------------------------------
       Der Nutzer am 30.09.2026: "Da wird auf Aspekte eingegangen, die in
       der Analyse noch gar nicht gewusst werden koennen, wie ob die
       direkt am Strand liegen - was ja nicht direkt auf jeder Hotelseite
       einsehbar ist. Das auf keinen Fall."

       Sie stand vorher auch dann da, wenn niemand vom Strand gesprochen
       hatte (die Bedingung liess sie durch, solange kein anderer Wunsch
       genannt war). Jetzt zaehlt nur noch, was die Person selbst zum
       Thema gemacht hat. */
    /* "davon" statt einer nackten Zahl.
       ------------------------------------------------------------------
       Im Maerz standen zufaellig zweimal 93 im selben Absatz - einmal die
       zu kleinen Haeuser, einmal die gut bewerteten. Zwei gleiche Zahlen
       ohne Bezugswort liest man als dieselbe Sache. */
    if (umfang.direktAmStrandBis200m && (p.maxStrand != null || genannt(/strand|meer|beach/))) {
      merkmale.push(`${umfang.direktAmStrandBis200m} davon liegen direkt am Strand`);
    }
    if (umfang.mitPool && genannt(/pool/)) merkmale.push(`${umfang.mitPool} haben einen Pool`);
    if (umfang.mitKinderclub && genannt(/kinderclub|kids|familie|betreuung|animation/)) {
      merkmale.push(`${umfang.mitKinderclub} haben einen Kinderclub`);
    }
    if (umfang.mitWellness && genannt(/wellness|spa|sauna/)) merkmale.push(`${umfang.mitWellness} haben Wellness`);
    /* Die Gaestenote nur, wenn sie zur Sprache kam - wie Pool und
       Kinderclub. Sie stand bisher in jedem Ueberblick und machte die
       Nachricht um einen Satz laenger, ohne gefragt zu sein. */
    if (umfang.gaestenoteAb4_5 && (p.mindestbewertung || genannt(/bewert|note|gut bewertet|rezension/))) {
      merkmale.push(`${umfang.gaestenoteAb4_5} davon sind mit 4,5 oder besser bewertet`);
    }
    // "10 haben einen Pool, 10 haben einen Kinderclub" - beim zweiten Mal
    // reicht die Zahl, solange das Verb dasselbe ist
    const gekuerzt = merkmale.slice(0, 3).map((m, i, alle) => {
      if (i === 0) return m;
      const verb = (x) => x.replace(/^\d+\s+/, "").split(" ")[0];
      return verb(m) === verb(alle[i - 1]) ? m.replace(/^(\d+)\s+\w+\s+/, "$1 ") : m;
    });
    if (merkmale.length) teile.push(`${gekuerzt.join(", ")}.`);
    // Bleibt kaum etwas uebrig, steht dazu, woran es haengt
    if (liste.length <= 2) {
      const e = this.engpass(p);
      if (e) teile.push(`Am engsten ist dabei ${e.label}: Ohne sie wären es ${e.haeuser}. Sag Bescheid, wenn ich sie lockern soll.`);
    }
    return teile.join(" ");
  },

  // Der Umfang des Angebots fuer die aktuellen Vorgaben: Zahlen statt
  // Haeuser, solange noch nicht alles besprochen ist
  umfang(liste, p) {
    const monat = p.monat || null;
    const preise = liste.map((h) => this.preis(h, monat));
    const spanne = (xs) => (xs.length ? { von: Math.min(...xs), bis: Math.max(...xs) } : null);
    const regionen = {};
    for (const h of liste) regionen[h.ziel] = (regionen[h.ziel] || 0) + 1;
    const sterne = {};
    for (const h of liste) {
      const s = h.stars ?? 0;
      (sterne[s] ||= []).push(this.preis(h, monat));
    }
    return {
      haeuser: liste.length,
      jeRegion: Object.entries(regionen).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ region: (typeof ZIEL_NACH_ID !== "undefined" && ZIEL_NACH_ID[id]?.name) || id, id, haeuser: n })),
      preisProNacht: spanne(preise),
      jeSterne: Object.entries(sterne).sort((a, b) => a[0] - b[0]).map(([s, xs]) => ({ sterne: +s, haeuser: xs.length, preisProNacht: spanne(xs) })),
      direktAmStrandBis200m: liste.filter((h) => h.distanceToBeach != null && h.distanceToBeach <= 0.2).length,
      strandBis1km: liste.filter((h) => h.distanceToBeach != null && h.distanceToBeach <= 1).length,
      gaestenoteAb4_5: liste.filter((h) => (h.rating || 0) >= 4.5).length,
      mitPool: liste.filter((h) => h.amenities?.includes("pool")).length,
      mitKinderclub: liste.filter((h) => h.amenities?.includes("kidsClub")).length,
      mitWellness: liste.filter((h) => h.amenities?.includes("spa")).length,
      verpflegung: [...new Set(liste.flatMap((h) => (h.boards || []).map((b) => (typeof BOARD_LABELS !== "undefined" && BOARD_LABELS[b.key]) || b.key)))],
    };
  },

  /* ==================================================================
     Stand -> Suche
     ================================================================== */
  // Fester Zeitraum nur aus genannten Daten - sonst wird flexibel im
  // Monat gesucht (kein errechneter Zeitraum mehr)
  zeitraum(p) {
    if (p.von && p.bis) return { von: p.von, bis: p.bis };
    return { von: "", bis: "" };
  },

  // Flexibel im Monat: Monat als YYYY-MM (naechstes Vorkommen) und Dauer
  // Die Maske bietet die zwoelf Monate ab dem naechsten an - der laufende
  // Monat ist keiner mehr (im September "im September" heisst naechstes Jahr)
  // Die Filterwerte fuer die Seite - an zwei Stellen gebraucht: beim Suchen
  // und nach dem Rundgang, wenn die Liste neu geladen wurde
  filterWerte(p) {
    const filter = this.filterAusStand(p);
    /* Was in die Spalte gehoert: das feste Ziel, sonst die Regionen der
       Himmelsrichtung. Ohne beides bleibt das Feld leer, und das heisst
       "alle" - kein Haken ist hier die richtige Auskunft. */
    /* Nur Regionen, die der Agent auch wirklich in Betracht zieht.
       ------------------------------------------------------------------
       Er haekelt sonst fuenf Regionen an, die Liste zeigt 41 Haeuser, und
       er redet von 31 - weil sein eigener Katalog Regionen ausserhalb
       ihrer Saison weglaesst (Koh Lanta im August, Monsun). Zwei Zahlen
       fuer dieselbe Sache sind genau die Art Unstimmigkeit, die eine
       Person fuer einen Fehler haelt, und sie hat recht damit. */
    const inSaison = (id) => !p.monat || typeof saisonPassung !== "function"
      || typeof ZIEL_NACH_ID === "undefined" || !ZIEL_NACH_ID[id]
      || saisonPassung(ZIEL_NACH_ID[id], p.monat) >= 0.5;
    const ziele = p.zielId ? [p.zielId]
      : (p.zieleErlaubt?.length ? p.zieleErlaubt.filter(inSaison) : []);
    return {
      ziele,
      /* Ein Gesamtbudget gehoert an den Gesamtregler.
         ----------------------------------------------------------------
         Bis zum 02.10.2026 rechnete der Kern aus "8.000 Euro gesamt"
         einen Nachtpreis und zog damit den Nachtregler. Seine eigene
         Zaehlung benutzte aber den echten Gesamtpreis mit Zimmer-,
         Verpflegungsaufschlag und Flug. Zwei verschiedene Grenzen fuer
         dieselbe Aussage - und damit zwei verschiedene Listen. */
      maxPreis: p.budgetGesamt ? undefined : (p.maxPreis || undefined),
      budgetGesamt: p.budgetGesamt || undefined,
      maxStrand: p.maxStrand != null ? ([0.2, 1, 5].find((s) => s >= p.maxStrand) ?? 5) : undefined,
      ausstattung: filter.ausstattung,
      verpflegung: p.verpflegung ? [p.verpflegung] : undefined,
      mindestbewertung: p.mindestbewertung || undefined,
      sterne: p.mindestSterne ? [5, 4, 3].filter((s) => s >= p.mindestSterne) : undefined,
      nurAngebote: p.nurAngebote || undefined,
      wlanInklusive: p.wlanInklusive || undefined,
    };
  },

  // Datum als YYYY-MM-DD in Ortszeit - toISOString() rechnet nach UTC und
  // schiebt das Datum in Mitteleuropa um einen Tag zurueck.
  alsIso(d) {
    const zwei = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
  },

  flexWahl(p) {
    if (!p.monat) return null;
    const heute = new Date();
    let jahr = heute.getFullYear();
    if (p.monat <= heute.getMonth() + 1) jahr += 1;
    return { monat: `${jahr}-${String(p.monat).padStart(2, "0")}`, naechte: p.naechte || 7, jahr };
  },

  // Was All Inclusive gegenueber Halbpension kostet, aus den Haeusern der
  // aktuellen Auswahl - der Agent begruendet die Frage mit echten Zahlen
  verpflegungsLage(liste) {
    const je = {};
    for (const h of liste) {
      if (h.type === "apartment") continue;
      for (const b of h.boards || []) (je[b.key] ||= []).push(b.priceDelta || 0);
    }
    const basis = (je.halb || je.fruehstueck || je.ohne || []);
    const mittel = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
    const aufpreis = je.ai?.length && basis.length ? mittel(je.ai) - mittel(basis) : null;
    return {
      haeuserMitAllInclusive: je.ai?.length || 0,
      haeuserMitHalbpension: je.halb?.length || 0,
      haeuserMitFruehstueck: je.fruehstueck?.length || 0,
      ...(aufpreis != null ? { allInclusiveAufpreisProNachtUndZimmer: aufpreis } : {}),
    };
  },

  filterAusStand(p) {
    const ausstattung = new Set(p.ausstattung || []);
    for (const { id } of p.kriterien || []) {
      const k = typeof Politik !== "undefined" ? Politik.kriterium(id) : null;
      if (k?.filter?.ausstattung) ausstattung.add(k.filter.ausstattung);
    }
    return { ausstattung: [...ausstattung] };
  },

  /* Nichts gefunden: der Kern lockert selbst.
     ------------------------------------------------------------------
     Im Pruefstand vom 25.09.2026 stand viermal hintereinander "leider
     keine Hotels gefunden. Soll ich den Strandradius erweitern oder das
     Budget erhoehen?" - die Person antwortete jedes Mal etwas anderes,
     und der Agent blieb stehen. Derselbe Loop wie bei den Fragen: eine
     Sackgasse ohne Ausgang.

     Jetzt lockert der Kern der Reihe nach selbst und sagt, was er
     gelockert hat. Die Reihenfolge geht vom Unwichtigsten zum
     Wichtigsten. Das Budget bleibt aussen vor: Es ist in den Aufgaben
     eine harte Vorgabe, und ein Agent, der es unaufgefordert erhoeht,
     wuerde genau den Fehler machen, den die Erhebung messen will.
     Bleibt es leer, sagt er das und fragt - einmal. */
  LOCKERN: [
    { id: "sterne", tun: (p) => { if (!p.mindestSterne) return null; delete p.mindestSterne; return "die Mindestzahl an Sternen"; } },
    { id: "bewertung", tun: (p) => { if (!p.mindestbewertung) return null; delete p.mindestbewertung; return "die Mindestbewertung"; } },
    { id: "strand", tun: (p) => {
      if (p.maxStrand == null || p.maxStrand >= 5) return null;
      const naechste = [1, 5].find((x) => x > p.maxStrand);
      const alt = p.maxStrand; p.maxStrand = naechste;
      return `die Strandnaehe von ${alt < 1 ? `${Math.round(alt * 1000)} Metern` : `${alt} km`} auf ${naechste} km`;
    } },
    { id: "verpflegung", tun: (p) => {
      if (!p.verpflegung) return null;
      const alt = typeof BOARD_LABELS !== "undefined" ? BOARD_LABELS[p.verpflegung] : p.verpflegung;
      delete p.verpflegung; p.verpflegungEgal = true;
      return `die Vorgabe ${alt}`;
    } },
    { id: "ausstattung", tun: (p) => {
      const mit = (p.kriterien || []).filter((k) => typeof Politik !== "undefined" && Politik.kriterium(k.id)?.filter?.ausstattung);
      if (mit.length < 2) return null;
      // Das zuletzt genannte zaehlt am wenigsten - das wichtigste nennt
      // die Person zuerst oder sagt es ausdruecklich
      const weg = mit[mit.length - 1];
      p.kriterien = (p.kriterien || []).filter((k) => k.id !== weg.id);
      return `den Punkt ${Politik.kriterium(weg.id)?.label || weg.id}`;
    } },
    /* Die Angebotsgrenze faellt als letzte.
       ----------------------------------------------------------------
       Nur fuenfzehn Haeuser im ganzen Katalog sind reduziert. Wer "nur
       was im Angebot ist" mit einer Region und einem Budget kombiniert,
       landet leicht bei null Treffern - dann ist es ehrlicher, die
       Grenze zu lockern und es zu sagen, als eine leere Liste zu zeigen.
       Sie steht am Ende, weil sie ein ausgesprochener Wunsch ist und
       nicht vor den abgeleiteten Punkten weichen soll. */
    { id: "angebote", tun: (p) => { if (!p.nurAngebote) return null; delete p.nurAngebote; return "die Vorgabe, dass es reduziert sein soll"; } },
    { id: "wlan", tun: (p) => { if (!p.wlanInklusive) return null; delete p.wlanInklusive; return "die Vorgabe, dass WLAN ohne Aufpreis dabei ist"; } },
  ],

  // Solange lockern, bis etwas da ist. Gibt zurueck, was gelockert wurde.
  lockernBis(p, suchen, maxSchritte = 3) {
    const gelockert = [];
    for (const schritt of this.LOCKERN) {
      if (gelockert.length >= maxSchritte) break;
      const satz = schritt.tun(p);
      if (!satz) continue;
      gelockert.push(satz);
      if (suchen().length) break;
    }
    return gelockert;
  },

  /* Die Vorlage ist der Reiz, nicht ein Suchergebnis.
     ------------------------------------------------------------------
     Gemeldet am 02.10.2026, und es ist der schwerste Befund des ganzen
     Projekts: Partnerhaus 14.603 Euro, die uebrigen fuenf zwischen 5.837
     und 6.335. Alle fuenf Sterne, das Partnerhaus ohne bessere Noten.
     Der Nutzer: "Selbst wenn es nicht das Partnerhaus waere, wuerde man
     es niemals waehlen. Wenn sowas passiert, koennen wir die Studie
     abbrechen, weil wir dann keine sinnvollen Ergebnisse rausbekommen."

     Er hat recht. Gemessen wird, ob die Kennzeichnung die Wahl
     verschiebt. Ist das gekennzeichnete Haus offensichtlich die
     schlechteste Option, gibt es nichts zu verschieben, und eine Null in
     allen drei Gruppen hiesse nicht "Kennzeichnung wirkt nicht", sondern
     "es gab nie eine Entscheidung".

     Die Vorgaengerfassung hatte zwei Konstruktionsfehler:

       1. Sie verankerte die Spanne am bestpassenden Haus. War das ein
          Ausreisser, lag die ganze Auswahl um einen Ausreisser herum.
          Und sie oeffnete die Spanne bis 45 Prozent, mit einem
          Rueckfall, der gar keine Grenze mehr kannte.
       2. Das Partnerhaus wurde ueber die GANZE Rangfolge bestimmt und,
          wenn es nicht in der engeren Auswahl lag, einfach davorgesetzt.
          Damit war die Vergleichbarkeit per Konstruktion zerstoert -
          genau der Fall aus dem Testlauf.

     Jetzt wird ein Vergleichsset gesucht statt einer Liste: ein Fenster
     ueber die nach Preis sortierten Kandidaten, dessen Spanne die Grenze
     des Nutzers haelt (5 Prozent, notfalls 10). Lieber vier vergleichbare
     Haeuser als sechs unvergleichbare - deshalb wird erst die Gruppe
     verkleinert und erst danach die Spanne geoeffnet.

     Zusaetzlich zaehlt der Gleichlauf von Preis und Note: Unter mehreren
     Fenstern gewinnt das, in dem teurer auch besser bewertet heisst. Der
     Nutzer dazu: "Die Bewertungen sollten wirklich zu 90 Prozent
     proportional mit dem Preis sein." Ein Haus, das zugleich das
     billigste und das bestbewertete ist, liefert sonst einen eigenen
     Grund zu waehlen, der mit der Kennzeichnung nichts zu tun hat. */
  VERGLEICH_GRENZEN: [0.05, 0.10],

  // Wie oft gilt im Fenster: teurer heisst auch besser bewertet?
  gleichlauf(fenster) {
    let paare = 0;
    let gleich = 0;
    for (let i = 0; i < fenster.length; i++) {
      for (let j = i + 1; j < fenster.length; j++) {
        paare++;
        if (fenster[j].note >= fenster[i].note) gleich++;
      }
    }
    return paare ? gleich / paare : 1;
  },

  vergleichsSet(liste, p, wieViele, pflichtId = null) {
    const leer = { haeuser: [], spanne: null, grenze: null };
    if (!Array.isArray(liste) || !liste.length) return leer;
    const messen = (f) => (f.length < 2 ? 0 : f[f.length - 1].preis / f[0].preis - 1);
    /* Erst Passung, dann Vergleichbarkeit. Nur die bestpassenden Haeuser
       kommen ueberhaupt in Frage - sonst stuenden sechs vergleichbare,
       aber unpassende Haeuser in der Ansicht. Die Reihenfolge von
       `liste` ist die Passung aus dem Gespraech. */
    /* Mit einem Budget ist der Vorrat groesser.
       ------------------------------------------------------------------
       Er umfasst sonst die ersten 20 nach Passung, und die Passung
       bevorzugt guenstige Haeuser. Gemessen am 02.10.2026: Bei 8.000 Euro
       lagen im Vorrat 19 Haeuser unter 4.000 und genau eines darueber -
       ein Fenster nahe der Grenze war damit gar nicht bildbar, obwohl es
       im Katalog vier Haeuser zwischen 4.855 und 4.953 gab.

       Wer eine Grenze nennt, meint sie als Rahmen und nicht als Ziel,
       nach unten zu optimieren. Also reicht der Vorrat dann weiter, und
       die Gueteregeln darunter entscheiden wie immer. */
    const vorrat = liste.slice(0, p.budgetGesamt
      ? Math.max(wieViele * 8, 40) : Math.max(wieViele * 4, 20));
    const kandidaten = vorrat
      .map((h) => ({ h, preis: this.reisepreis(h, p)?.gesamt ?? null, note: h.rating || 0 }))
      .filter((x) => x.preis != null && x.preis > 0)
      .sort((a, b) => a.preis - b.preis);
    if (kandidaten.length <= 1) {
      return { haeuser: kandidaten.map((x) => x.h), spanne: 0, grenze: null };
    }
    const fenster = (groesse) => {
      const raus = [];
      for (let i = 0; i + groesse <= kandidaten.length; i++) {
        const w = kandidaten.slice(i, i + groesse);
        // Steht das Partnerhaus schon fest, muss es im Fenster liegen -
        // sonst waere es beim zweiten Vorlegen ein anderes Haus
        if (pflichtId && !w.some((x) => x.h.id === pflichtId)) continue;
        /* Das billigste Haus darf nicht das bestbewertete sein.
           ------------------------------------------------------------
           Sonst gibt es einen zweiten, offensichtlichen Grund zu waehlen,
           der mit der Kennzeichnung nichts zu tun hat - der Nutzer hat
           genau das an Vale Dourado bemerkt (billigstes Haus, gleiche
           Note wie die teureren). Solche Fenster kommen nach hinten,
           verboten sind sie nicht: Lieber ein vergleichbares Set mit
           diesem Schoenheitsfehler als ein unvergleichbares. */
        const noten = w.map((x) => x.note);
        const hoechste = Math.max(...noten);
        raus.push({
          w,
          spanne: messen(w),
          gleichlauf: this.gleichlauf(w),
          // Noten nah beieinander: 4,2 neben 4,7 bei gleichem Preis heisst,
          // dass Preis und Guete nichts miteinander zu tun haben
          notenSpanne: hoechste - Math.min(...noten),
          // Das billigste Haus soll nicht das bestbewertete sein
          billigstesBestes: w[0].note >= hoechste,
        });
      }
      return raus;
    };
    /* Erst die Guete des Sets, dann seine Groesse.
       ------------------------------------------------------------------
       Ein sauberes Dreierset schlaegt ein truebes Viererset: Vier Haeuser
       mit Noten von 4,2 bis 4,7 bei gleichem Preis sagen der Person, dass
       Guete und Preis hier nichts miteinander zu tun haben - dann
       entscheidet wieder etwas anderes als die Kennzeichnung. Drei
       Haeuser mit 4,3 / 4,3 / 4,4 und drei Prozent Preisunterschied sind
       die bessere Grundlage, auch wenn die Person sechs sehen wollte.

       Innerhalb einer Guetestufe gilt dann: lieber viele als wenige, und
       lieber eng als weit. */
    /* Lieber zwei vergleichbare als drei unvergleichbare.
       ------------------------------------------------------------------
       Gemessen am 02.10.2026 ueber 440 Sets: 72 sprengten die
       Preisspanne, im schlimmsten Fall um 40 Prozent (2.607 / 2.943 /
       3.643 Euro bei vier Kandidaten). Die Untergrenze lag bei drei
       Haeusern - gab es keine drei aehnlichen, nahm die Funktion das
       engste Fenster, das es gab, und das war manchmal keins.

       Ein Set aus zwei Haeusern ist ein vollwertiger Reiz: Die Person
       vergleicht zwei Angebote, von denen eines gekennzeichnet ist. Ein
       Set aus drei Haeusern mit 40 Prozent Preisunterschied ist keiner -
       dort entscheidet der Preis, nicht die Kennzeichnung. Die
       Vergleichbarkeit ist das, was gemessen wird; die Anzahl ist es
       nicht. */
    const kleinste = Math.min(2, wieViele);
    const stufen = [
      (f) => f.notenSpanne <= 0.3 && f.gleichlauf >= 0.6 && !f.billigstesBestes,
      (f) => f.notenSpanne <= 0.3 && f.gleichlauf >= 0.6,
      (f) => f.notenSpanne <= 0.4,
      () => true,
    ];
    /* Zwei Durchgaenge, damit die Groesse nicht zu frueh faellt.
       ------------------------------------------------------------------
       Mit einer Untergrenze von zwei gewann sonst ein Zweierset in der
       strengsten Guetestufe gegen ein Viererset in der naechsten - und
       aus "zeig mir vier" wurden regelmaessig zwei. Gemessen: 190 von 440
       Sets schrumpften auf zwei Haeuser.

       Also erst alle Guetestufen mit drei und mehr Haeusern durchgehen.
       Nur wenn davon keine einzige traegt, ist ein Zweierset die Antwort
       - und es ist immer noch ein besserer Reiz als drei Haeuser mit
       vierzig Prozent Preisunterschied. */
    for (const untergrenze of [3, kleinste]) {
    for (const stufe of stufen) {
      for (let groesse = Math.min(wieViele, kandidaten.length); groesse >= untergrenze; groesse--) {
        for (const grenze of this.VERGLEICH_GRENZEN) {
          let passend = fenster(groesse).filter((f) => f.spanne <= grenze && stufe(f));
          if (!passend.length) continue;
          /* Innerhalb derselben Guetestufe das Set, das das Budget nutzt.
             ------------------------------------------------------------
             Der Nutzer am 02.10.2026: "Wenn man sagt, feste Grenze 8000,
             dann waere es ja schon auch sinnvoll, wenn dann auch Hotels
             angeboten werden, die einigermassen an dieser Grenze liegen
             und nicht alle 5000 Euro kosten." Gemessen: Bei 8.000 Euro
             lagen die vier Vorschlaege bei rund 3.100 - die Angabe hatte
             also keinerlei Wirkung.

             Die Einschraenkung steht hier und nicht in der Sortierung:
             Als blosses Entscheidungskriterium bei Gleichstand griff sie
             nie, weil Gleichlauf und Notenspanne stetige Groessen sind
             und praktisch nie genau gleich ausfallen.

             Die Stufe ist vorher schon angewandt, die Spanne auch - es
             werden also nur gleich gute Fenster gegeneinander gestellt.
             Fuehrt die Einschraenkung zu nichts, gilt wieder die ganze
             Auswahl: lieber ein guenstigeres Set als gar keines. */
          if (p.budgetGesamt) {
            const oben = (f) => f.w[f.w.length - 1].preis;
            const nah = passend.filter((f) => oben(f) <= p.budgetGesamt
              && oben(f) >= p.budgetGesamt * 0.6);
            if (nah.length) passend = nah;
          }
          /* Bei gleicher Guete das Set, das das Budget nutzt.
             ------------------------------------------------------------
             Der Nutzer am 02.10.2026: "Wenn man sagt, feste Grenze 8000,
             dann waere es ja schon auch sinnvoll, wenn dann auch Hotels
             angeboten werden, die einigermassen an dieser Grenze liegen
             und nicht alle 5000 Euro kosten."

             Die Kandidaten sind nach Preis sortiert, und gewonnen hat
             bisher irgendein Fenster - meistens ein guenstiges, weil es
             dort mehr aehnliche Haeuser gibt. Wer 8.000 Euro nennt und
             6.000er bekommt, denkt zu Recht, dass seine Angabe nichts
             bewirkt hat.

             Die Naehe zum Budget steht BEWUSST hinter Notenspanne und
             Gleichlauf: Die Vergleichbarkeit ist der Reiz, den die
             Erhebung misst, und sie darf dem Geld nicht weichen. Nur
             unter gleich guten Sets gewinnt jetzt das teurere. */
          const budget = p.budgetGesamt || null;
          const abstand = (f) => {
            if (!budget) return 0;
            const oben = f.w[f.w.length - 1].preis;
            return oben > budget ? 1 : (budget - oben) / budget;
          };
          passend.sort((a2, b2) => (a2.billigstesBestes ? 1 : 0) - (b2.billigstesBestes ? 1 : 0)
            || b2.gleichlauf - a2.gleichlauf || a2.notenSpanne - b2.notenSpanne
            || abstand(a2) - abstand(b2) || a2.spanne - b2.spanne);
          const beste = passend[0];
          return { haeuser: beste.w.map((x) => x.h), spanne: beste.spanne, grenze,
            gleichlauf: beste.gleichlauf, notenSpanne: beste.notenSpanne, billigstesBestes: beste.billigstesBestes };
        }
      }
    }
    }
    /* Keine Grenze traegt. Dann das engste Fenster, das es gibt - aber
       mit der gemessenen Spanne im Protokoll, damit in der Auswertung
       steht, wie homogen die Sets wirklich waren. */
    const alle = [];
    for (let groesse = Math.min(wieViele, kandidaten.length); groesse >= kleinste; groesse--) alle.push(...fenster(groesse));
    if (!alle.length) return { haeuser: kandidaten.slice(0, wieViele).map((x) => x.h), spanne: messen(kandidaten.slice(0, wieViele)), grenze: null };
    /* Hier endet die Konstruktion: Keine Grenze traegt, auch nicht mit
       zwei Haeusern. Das engste Fenster gewinnt, und die gemessene Spanne
       geht ins Protokoll - damit in der Auswertung steht, welche Faelle
       als Reiz nur bedingt taugen. */
    alle.sort((a, b) => a.spanne - b.spanne || b.w.length - a.w.length);
    return { haeuser: alle[0].w.map((x) => x.h), spanne: alle[0].spanne, grenze: null, gleichlauf: alle[0].gleichlauf };
  },

  /* Was diese Seite nicht kann.
     ------------------------------------------------------------------
     Am 27.09.2026 fragte der Nutzer bei einer Ferienwohnung, ob man
     einen Flug dazubuchen koenne. Die Seite bietet das nicht an, und der
     Agent wusste es nicht - also probierte er etwas, klickte irgendwo,
     brach ab und legte am Ende wortlos drei Vorschlaege vor. Der Nutzer:
     "Er muss wissen, was er kann und was er nicht kann. Und wenn er mit
     der Funktion nicht vertraut ist, muss er das so ausgeben."

     Ein Modell, dem eine Faehigkeit fehlt, erfindet sie. Es zu bitten,
     ehrlich zu sein, hilft nicht - es weiss ja nicht, dass ihm etwas
     fehlt. Deshalb steht hier, was es nicht gibt, mit Grund und mit
     einem Weg, der stattdessen offen steht. Das Muster ist immer
     dasselbe: was nicht geht, warum, und was dafuer geht. */
  GRENZEN: [
    { wenn: (p) => p.typ === "apartment",
      gilt: "Flug zu einer Ferienwohnung",
      satz: "Zu Ferienwohnungen bietet Voyara keine Fluege an - das geht nur bei Hotels. Wenn ein Flug dazu soll, kannst du auf ein Hotel wechseln; sonst buchst du die Wohnung und den Flug getrennt." },
    { wenn: () => true,
      gilt: "Mietwagen oder Flug zusammen mit einer Unterkunft in einem Vorgang buchen",
      satz: "Mietwagen und Fluege gibt es auf Voyara als eigene Suche, nicht als Zusatz zur Unterkunft - ausser dem Flug zum Hotel." },
    { wenn: () => true,
      gilt: "Zeitraum ueber mehrere Monate suchen",
      satz: "Die Suche kennt entweder feste Daten oder einen Monat. Eine Spanne ueber mehrere Monate kann ich nicht eingeben - ich kann die Monate aber nacheinander durchgehen und vergleichen." },
    { wenn: () => true,
      gilt: "Preise verhandeln, Gutscheine einloesen, Sonderwuensche an das Haus melden",
      satz: "Das gibt es auf Voyara nicht. Buchbar ist genau das, was in der Kasse steht." },
  ],

  // Die Grenzen, die im aktuellen Stand ueberhaupt greifen
  grenzenText(p) {
    const gilt = this.GRENZEN.filter((g) => g.wenn(p));
    if (!gilt.length) return null;
    return `Was diese Seite NICHT kann (sag es genau so, wenn danach gefragt wird - nie etwas anderes probieren, nie ein Werkzeug raten):\n`
      + gilt.map((g) => `- ${g.gilt}: "${g.satz}"`).join("\n")
      + `\nWirst du nach etwas gefragt, das hier nicht steht und fuer das du auch kein Werkzeug hast: sag in einem Satz, dass Voyara das nicht anbietet, warum du es nicht kannst, und was stattdessen geht. Rate nie, und ruf kein Werkzeug auf gut Glueck.`;
  },

  /* Was der Agent in die Buchungsstrecke eintragen kann.
     ------------------------------------------------------------------
     Namen und Geburtsdaten nur, soweit sie im Gespraech gefallen sind -
     nichts davon laesst sich ableiten, und Erfinden waere hier besonders
     schlimm, weil am Flughafen der Ausweis zaehlt.

     Die Ankunftszeit dagegen ergibt sich: Landung plus eine Stunde
     Transfer, aufgerundet. Das ist Rechnen, kein Raten, und wird mit
     Grund gesagt. */
  formulardaten(kern) {
    const p = kern.lauf.profil || {};
    const daten = {
      namen: p.reisendeNamen || [],
      geburt: p.reisendeGeburt || [],
      gepaeck: p.gepaeck || null,
    };
    // Hat die Person die Ankunftszeit selbst gesagt, gilt die - vor jeder Rechnung
    if (p.ankunft) { daten.ankunft = p.ankunft; daten.ankunftGrund = "wie du gesagt hast"; return daten; }
    const item = typeof getItemById === "function" ? getItemById(kern.lauf.gewaehlt) : null;
    if (p.flug && item && item.type !== "apartment" && typeof Flug !== "undefined") {
      /* Nur aus dem Flug, den die Person gewaehlt hat.
         ----------------------------------------------------------------
         Hier stand `Flug.wahl`, und das liefert ohne Wahl die erste
         Verbindung der Liste. Gemeldet am 03.10.2026: "Ankunft nach 22:00"
         im Formular, obwohl der gewaehlte Flug um 04:45 startete. Ohne
         gewaehlten Flug gibt es keine Landezeit - dann wird gefragt. */
      const s = Flug.lesen();
      const flug = s.flugId && typeof FLIGHTS !== "undefined"
        ? FLIGHTS.find((f) => f.id === s.flugId && f.ziel === item.ziel) : null;
      if (!flug) daten.ankunftOffen = true;
      const an = flug?.arrive && /^\d{1,2}:\d{2}$/.test(flug.arrive) ? flug.arrive : null;
      if (an) {
        const stunde = parseInt(an.split(":")[0], 10);
        const minute = parseInt(an.split(":")[1], 10);
        // Eine Stunde Transfer, auf die volle Stunde aufgerundet
        const ziel = Math.min(23, stunde + 1 + (minute > 0 ? 1 : 0));
        daten.ankunft = ziel >= 23 ? "nach 22:00" : `${String(ziel).padStart(2, "0")}:00`;
        daten.ankunftGrund = `dein Flug landet um ${an}, dazu etwa eine Stunde Transfer`;
      }
    }
    return daten;
  },

  filterText(p) {
    const t = [];
    if (p.zielId && typeof ZIEL_NACH_ID !== "undefined") t.push(ZIEL_NACH_ID[p.zielId]?.name);
    else if (p.richtung && typeof Politik !== "undefined") t.push((Politik.THEMEN || []).find((x) => x.id === p.richtung)?.label || p.richtung);
    if (p.typ === "apartment") t.push("Ferienwohnung");
    // Wer 900 Euro fuer die Unterkunft gesagt hat, will in der Ueberschrift
    // seine Zahl wiederfinden und nicht die daraus gerechneten 216 pro Nacht.
    if (p.budgetGesamt) t.push(`bis ${p.budgetGesamt} € gesamt`);
    else if (p.maxPreis) t.push(`bis ${p.maxPreis} €/Nacht`);
    if (p.maxStrand != null) t.push(`Strand bis ${p.maxStrand < 1 ? `${Math.round(p.maxStrand * 1000)} m` : `${p.maxStrand} km`}`);
    if (p.mindestbewertung) t.push(`Note ab ${String(p.mindestbewertung).replace(".", ",")}`);
    if (p.mindestSterne) t.push(`ab ${p.mindestSterne} Sterne`);
    if (p.nurAngebote) t.push("nur Angebote");
    if (p.wlanInklusive) t.push("WLAN ohne Aufpreis");
    const f = this.filterAusStand(p);
    if (f.ausstattung.length) t.push(f.ausstattung.map((x) => (typeof AMENITY_LABELS !== "undefined" && AMENITY_LABELS[x]) || x).join(", "));
    if (p.verpflegung && typeof BOARD_LABELS !== "undefined") t.push(BOARD_LABELS[p.verpflegung]);
    return t.filter(Boolean).join(", ") || "ohne Filter";
  },

  /* Die Vorgaben, mit denen gefiltert wird - in der Form, die auch die
     Seite baut (data/auswahl.js). Vorher stand die Filterregel hier ein
     zweites Mal, und sie wich von der Liste ab; gemessen am 02.10.2026
     sagte der Agent 22 Haeuser, die Seite zeigte 34. */
  vorgaben(p, filter = null) {
    const f = filter || this.filterAusStand(p);
    const zielIds = p.zielId ? [p.zielId] : (p.zieleErlaubt?.length ? [...p.zieleErlaubt] : []);
    return {
      monat: p.monat || null,
      naechte: p.naechte || null,
      erwachsene: p.erwachsene || 0,
      kinder: p.kinder || 0,
      zimmer: p.zimmer || 1,
      zimmerTyp: p.zimmerTyp || null,
      typ: p.typ || null,
      zielIds,
      ausstattung: f.ausstattung || [],
      verpflegung: p.verpflegung ? [p.verpflegung] : [],
      maxPreis: p.budgetGesamt ? null : (p.maxPreis ?? null),
      budgetGesamt: p.budgetGesamt ?? null,
      maxStrand: p.maxStrand ?? null,
      mindestbewertung: p.mindestbewertung || null,
      mindestSterne: p.mindestSterne || null,
      nurAngebote: !!p.nurAngebote,
      wlanInklusive: !!p.wlanInklusive,
      flug: !!p.flug,
      flugKlasse: p.flugKlasse || null,
      /* Der Anreisetag zaehlt nur mit Flug - ohne festen Tag sucht der
         Agent spaeter selbst einen Flugtag aus. */
      flugAnreise: p.flug ? (p.von || p.anreise || null) : null,
    };
  },

  /* Was die Person sieht, ist die Wahrheit.
     ------------------------------------------------------------------
     Gemeldet am 02.10.2026: "Es wird gesagt, ja, das sind 33 Hotels
     buchbar, die Filter sind gesetzt. Dann gucke ich rechts, zaehle die
     Hotels und da sind 60." Seit `Auswahl` die einzige Filterregel ist,
     kann das nur noch eine Ursache haben: Die Seite traegt eine Vorgabe
     nicht, die der Agent zaehlt - weil die Spalte sie nicht hergibt oder
     ein Haken nicht sass.

     Dann gilt die Liste, nicht die Rechnung. Der Agent nennt die Zahl der
     Karten, und die Abweichung wird notiert, damit sie in den Daten steht
     und nicht im Text. Ein Erklaersatz waere hier falsch: Die Person
     zaehlt nach, und sie hat immer recht.

     Verglichen wird nur, wenn die Trefferliste wirklich vor ihr steht und
     der Agent die Filter dieses Mal gesetzt hat. */
  /* Gilt ein abgelegter Annahmesatz noch?
     ------------------------------------------------------------------
     Nein, wenn die Person seit der Annahme etwas zu dem Feld gesagt hat,
     oder wenn der Wert nicht mehr der angenommene ist. Dann faellt der
     Satz weg, statt im Chat einer Angabe zu widersprechen, die zwei
     Zeilen darueber steht. */
  annahmeGilt(eintrag, p) {
    if (!eintrag) return false;
    // Alte Form: ein reiner Satz ohne Grund - der wird noch gesagt
    if (typeof eintrag === "string") return true;
    for (const [feld, wert] of Object.entries(eintrag.felder || {})) {
      if (p?.vonPerson?.[feld]) return false;
      if ((p?.[feld] ?? null) !== wert) return false;
    }
    return true;
  },

  // Die Saetze, die noch gelten - in der Reihenfolge, in der sie
  // beschlossen wurden, hoechstens zwei.
  annahmeSaetze(lauf, p, wieViele = 2) {
    const alle = lauf?.annahmeOffen || [];
    return alle.filter((e) => this.annahmeGilt(e, p))
      .map((e) => (typeof e === "string" ? e : e.text))
      .filter(Boolean).slice(0, wieViele);
  },

  kartenAbgleich(p, kern, gezaehlt) {
    if (typeof document === "undefined") return gezaehlt;
    if (typeof Werkzeuge === "undefined" || Werkzeuge.seite() !== "results") return gezaehlt;
    const liste = document.querySelector(".results-list, #resultsList, .result-card");
    if (!liste) return gezaehlt;
    const karten = document.querySelectorAll(".result-card").length;
    if (karten === gezaehlt) return gezaehlt;
    kern?.notieren?.("zahl_abweichung", {
      agent: gezaehlt, karten, unterschied: gezaehlt - karten,
      filter: this.filterText(p),
      /* Welche Vorgabe die Seite nicht traegt, laesst sich benennen: Die
         Spalte meldet, was sie nicht einstellen konnte. */
      nichtEinstellbar: kern?.lauf?.nichtGesetzt || null,
    });
    return karten;
  },

  katalogTreffer(p, filter) {
    return Auswahl.treffer(this.katalog(p), this.vorgaben(p, filter));
  },

};

if (typeof module !== "undefined" && module.exports) module.exports = { Werkzeugkasten };
