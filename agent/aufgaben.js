/* Die beiden Aufgaben der Erhebung
   ====================================================================
   Jede teilnehmende Person bekommt beide Aufgaben, in ausgeloster
   Reihenfolge (Within-Subjects). Die Aufgaben sind bewusst
   verschieden: andere Reisegruppe, anderes Ziel, andere Jahreszeit,
   andere Rangfolge der Wuensche. Zwei fast gleiche Aufgaben
   hintereinander wuerden sich anfuehlen wie eine Wiederholung, und wer
   sich wiederholt fuehlt, verhaelt sich nicht mehr wie beim ersten Mal.

   Was beide gemeinsam haben, ist die Bauweise:

     - fuenf harte Vorgaben, die sich am Katalog objektiv pruefen lassen
     - eine Rangfolge weicher Wuensche, ausdruecklich benannt
     - ein Zielkonflikt, der die Wahl nicht trivial macht
     - genau eine objektiv beste Option im Katalog

   Die beste Option ist nicht hinterlegt, sondern wird aus dem Katalog
   berechnet. So bleibt sie richtig, wenn sich Preise oder Bewertungen
   im Katalog aendern, und die Rechenregel steht offen im Code statt in
   einer Zahl, die niemand mehr nachvollziehen kann.

   Die Aufgabe ist das private Wissen der Person. Der Agent kennt sie
   nicht. Was davon im Gespraech ankommt, ist einer der Messwerte.
   ================================================================== */

/* Warme Regionen am Meer, aus denen beide Aufgaben waehlen lassen. Eine
   feste Region (Mallorca) liess zu wenig Auswahl: fuenf harte Vorgaben
   und ein Ziel ergaben fuenf zulaessige Haeuser. Mit fuenf Zielen bleibt
   die Wahrheit berechenbar, die Auswahl aber gross genug, dass Suchen
   sich lohnt. */
const ZIELE_WARM = ["mallorca", "kreta", "algarve", "sardinien", "teneriffa"];
const ZIELE_WARM_NAMEN = "Mallorca, Kreta, Sardinien, die Algarve oder Teneriffa";

const AUFGABEN = {

  /* ------------------------------------------------------------------
     A. Familie am Meer
     ------------------------------------------------------------------
     Hohe Einsatzhoehe: vier Personen, Kinder, Sommerferien, ein
     Familienzimmer. Der Zielkonflikt liegt zwischen Budget und
     Ausstattung - Kinderclub und Strandnaehe kosten, und die guenstigen
     Haeuser haben eines von beidem nicht.

     Zulaessig sind fuenf Haeuser (Illa Verda, Arenal Blau, Bahia Azul,
     Cala Blanca Mar, Mar i Pins), zwischen 1.113 und 1.519 Euro. Beste
     Option nach der genannten Rangfolge (Kinderclub, dann Bewertung):
     Cala Blanca Mar, 1.512 Euro. Knapp draussen: Club Familiar Es
     Foguero mit 1.610 Euro - der klassische Fehlkauf, wenn das Budget
     nicht beim Agenten ankommt.
     ------------------------------------------------------------------ */
  familie: {
    id: "familie",
    titel: "Sommerferien mit der Familie",
    kurz: "Familie, ans Meer, August",
    szene: `Ihr seid zu viert: du, dein Partner oder deine Partnerin und eure beiden
      Kinder, sechs und neun Jahre alt. In den Sommerferien soll es eine Woche ans
      Meer gehen, irgendwohin, wo es warm ist - ${ZIELE_WARM_NAMEN}, das ist euch
      offen. Die Kinder haben eine klare Vorstellung - Pool und Strand -, und ihr
      wollt ein Haus, in dem sie beschäftigt sind, während ihr auch mal in Ruhe
      lesen könnt. Das Geld dafür habt ihr zurückgelegt, aber es ist eine Grenze.`,
    vorgaben: [
      `Ans Meer, in eine warme Region (${ZIELE_WARM_NAMEN}), sieben Nächte im August`,
      "Zwei Erwachsene und zwei Kinder in einem gemeinsamen Familienzimmer",
      "Ein Hotel mit Pool",
      "Höchstens 500 Meter bis zum Strand",
      "Höchstens 1.600 Euro für die Unterkunft insgesamt",
    ],
    wuensche: `Am wichtigsten ist euch ein Kinderclub, damit die Kinder Anschluss finden.
      Danach zählt die Bewertung anderer Gäste.`,

    // Fuer Suche, Belegung und Preisrechnung
    ziele: ZIELE_WARM,
    monat: 8,
    naechte: 7,
    erwachsene: 2,
    kinder: 2,
    zimmer: 1,
    typ: "hotel",
    budgetGesamt: 1600,

    // Harte Vorgaben, einzeln pruefbar. Jede gibt einen Grund zurueck,
    // wenn sie verletzt ist - so laesst sich spaeter sagen, WAS bei einer
    // falschen Buchung nicht stimmte.
    pruefen(h, gesamt) {
      const gruende = [];
      if (!ZIELE_WARM.includes(h.ziel)) gruende.push("nicht in einer der warmen Regionen");
      if (h.type !== "hotel") gruende.push("kein Hotel");
      if (!h.amenities?.includes("pool")) gruende.push("kein Pool");
      if (h.distanceToBeach == null || h.distanceToBeach > 0.5) gruende.push("mehr als 500 m zum Strand");
      if (!Aufgaben.zimmerFuer(h, 4)) gruende.push("kein Zimmer für vier");
      if (gesamt > 1600) gruende.push(`${Math.round(gesamt)} Euro, über dem Budget`);
      return gruende;
    },
    // Rangfolge der weichen Wuensche: hoeher ist besser
    rang(h) {
      return (h.amenities?.includes("kidsClub") ? 100 : 0) + (h.rating || 0) * 10;
    },
    zimmerWahl: (h) => Aufgaben.zimmerFuer(h, 4),
    verpflegung: "ohne",
  },

  /* ------------------------------------------------------------------
     B. Zu zweit im Herbst
     ------------------------------------------------------------------
     Niedrige Einsatzhoehe: zwei Personen, vier Naechte, Nebensaison.
     Der Zielkonflikt ist ein anderer als bei A: Die Haeuser mit dem
     besten Essen liegen im Landesinneren, die am Meer kochen
     mittelmaessig. Wer "Algarve, zu zweit, Oktober" sagt und sonst
     nichts, bekommt vom Agenten ein Strandhotel - richtig ist aber die
     Finca, wenn die Rangfolge der Wuensche ankommt.

     Zulaessig sind sieben Haeuser. Beste Option nach der Rangfolge (Essen,
     dann kein Familienresort): Casa das Amendoeiras, 667 Euro mit
     Fruehstueck. Die beiden besten Kuechen ueberhaupt (Vale Dourado,
     Alto do Farol) liegen ueber dem Budget.
     ------------------------------------------------------------------ */
  paar: {
    id: "paar",
    titel: "Ein paar Tage zu zweit",
    kurz: "Paar, in den Süden, Oktober",
    szene: `Ihr seid zu zweit und wollt im Oktober für ein verlängertes Wochenende raus,
      irgendwohin in den Süden, wo es dann noch warm ist - ${ZIELE_WARM_NAMEN}, das
      ist euch offen. Keine Kinder, kein Programm, keine Verpflichtungen. Worauf ihr euch
      freut: abends richtig gut essen, morgens in Ruhe frühstücken, und sonst nichts
      müssen. Ob das Haus am Meer liegt oder im Hinterland, ist euch ehrlich gesagt
      egal - Hauptsache, es ist ruhig und die Küche stimmt.`,
    vorgaben: [
      `In den Süden, in eine warme Region (${ZIELE_WARM_NAMEN}), vier Nächte im Oktober`,
      "Zwei Erwachsene in einem Doppelzimmer",
      "Frühstück inklusive",
      "Kein Familienresort und keine Partymeile - ihr wollt Ruhe",
      "Höchstens 900 Euro für die Unterkunft insgesamt",
    ],
    wuensche: `Am wichtigsten ist euch das Essen im Haus - es soll wirklich gut sein.
      Meerblick wäre schön, ist aber kein Muss.`,

    ziele: ZIELE_WARM,
    monat: 10,
    naechte: 4,
    erwachsene: 2,
    kinder: 0,
    zimmer: 1,
    typ: "hotel",
    budgetGesamt: 900,

    pruefen(h, gesamt) {
      const gruende = [];
      if (!ZIELE_WARM.includes(h.ziel)) gruende.push("nicht in einer der warmen Regionen");
      if (h.type !== "hotel") gruende.push("kein Hotel");
      if (!h.boards?.some((b) => b.key === "fruehstueck")) gruende.push("kein Frühstück buchbar");
      if (h.amenities?.includes("familyFriendly") && h.amenities?.includes("kidsClub")) gruende.push("Familienresort");
      if (gesamt > 900) gruende.push(`${Math.round(gesamt)} Euro, über dem Budget`);
      return gruende;
    },
    rang(h) {
      return (h.ratingBreakdown?.essen || 0) * 100 + (h.rating || 0) * 10;
    },
    zimmerWahl: (h) => Aufgaben.zimmerFuer(h, 2),
    verpflegung: "fruehstueck",
  },
};

/* Die freie Aufgabe: die Person schreibt sie selbst
   ====================================================================
   Statt einer vorgegebenen Szene beantwortet sie vor dem ersten Kontakt
   mit dem Agenten drei Fragen: mit wem, wann etwa, wie viel hoechstens.
   Daraus entsteht dasselbe Aufgabenobjekt, das sonst hier fest steht -
   nur mit ihren Werten.

   Warum ueberhaupt drei Angaben und nicht voellig frei: An ihnen haengt
   die Ergebnisguete. Ohne Budget ist eine Buchung fuer 2.400 Euro keine
   schlechte Buchung, sondern eine Entscheidung, und ohne Gruppengroesse
   laesst sich nicht pruefen, ob die Unterkunft ueberhaupt passt.

   Was NICHT gefragt wird, ist das Ziel. Genau das soll der Agent mit
   der Person erarbeiten (Nutzer am 29.09.2026). Die Regionen bleiben
   deshalb offen, und `pruefen` kennt nur zwei harte Regeln: Budget und
   Gruppe.

   Die Person behaelt ihre Antworten fuer sich - der Agent sieht sie
   nicht. Was davon im Gespraech ankommt, ist ein Messwert. */

const ECKPUNKTE = {
  mitWem: [
    { id: "allein", label: "Allein", personen: 1 },
    { id: "partner", label: "Mit Partnerin oder Partner", personen: 2 },
    { id: "familie", label: "Mit Familie", personen: 4 },
    { id: "freunde", label: "Mit Freunden", personen: 4 },
  ],
  // Nach unten begrenzt: Unter 1.000 Euro fuer eine Woche bleibt im
  // Katalog fast nichts uebrig, und eine leere Liste ist keine Aufgabe.
  budget: [
    { id: 1, label: "bis 1.000 €", wert: 1000 },
    { id: 2, label: "bis 1.500 €", wert: 1500 },
    /* Die Stufen passten nicht mehr zum Katalog.
       ----------------------------------------------------------------
       Gemeldet am 02.10.2026: "Auf der ersten Karte ist der Preis mehr
       als 2.500 Euro, was ein bisschen komisch ist, weil die meisten
       Hotels wesentlich mehr kosten." Stimmt: Eine Familienreise mit
       Flug und Halbpension beginnt bei rund 4.300 Euro, die teuerste
       buchbare liegt knapp unter 5.000. Mit der alten obersten Stufe
       lag praktisch jede Buchung ueber dem angeklickten Rahmen, und die
       Auswertung "hat mehr ausgegeben als geplant" stand damit vorher
       fest. Die Stufen decken jetzt die Spanne ab, die der Katalog
       wirklich hergibt. */
    { id: 3, label: "bis 2.000 €", wert: 2000 },
    { id: 4, label: "bis 3.500 €", wert: 3500 },
    { id: 5, label: "bis 5.000 €", wert: 5000 },
    { id: 6, label: "mehr als 5.000 €", wert: 12000 },
  ],
};

const Aufgaben = {
  alle() { return [AUFGABEN.familie, AUFGABEN.paar]; },
  nach(id) { return AUFGABEN[id] || null; },

  /* Aus den drei Angaben wird eine Aufgabe.
     ------------------------------------------------------------------
     Dasselbe Objekt wie oben, damit `zulaessige`, `bewerten` und
     `partnerAus` unveraendert weiterrechnen. Die weichen Wuensche
     fehlen bewusst: Es gibt keine Rangfolge, die jemand vorgegeben
     haette. An ihre Stelle tritt in der Auswertung die Dominanz - gab
     es eine Unterkunft, die guenstiger UND besser bewertet war? */
  /* Dieselbe Aufgabe aus dem Gespraech statt aus der Karte.
     ------------------------------------------------------------------
     Der Nutzer am 02.10.2026 zu den Eckpunkte-Karten: "Ich bin mir immer
     noch nicht genau sicher, ob wir das ueberhaupt drin lassen wollen,
     weil es nicht so viel Mehrwert bringt." Monat, Gruppe und Budget
     nennt er dem Agenten ohnehin; die Karte davor fragt dasselbe noch
     einmal und kostet einen Schritt vor der eigentlichen Aufgabe.

     Der Massstab wird deshalb aus dem Stand gebaut. Was dabei verloren
     geht, ist die Unabhaengigkeit der Zahl: Ein Budget, das im Gespraech
     faellt, kann vom Agenten beeinflusst sein. Was bleibt, ist das
     staerkere Mass, das ohne Budget auskommt - gab es eine Unterkunft,
     die guenstiger UND besser bewertet war?

     Umschaltbar ueber STELLSCHRAUBEN.eckpunkte. */
  ausGespraech(p) {
    /* Der Stand des Gespraechs zuerst - er ist das, was die Person dem
       Agenten gesagt hat. Wer den Agenten gar nicht benutzt, hat kein
       Profil; dann zaehlt die Maske der Seite, die jeder ausfuellt.
       Ohne diesen Rueckfall haette genau die Haelfte, auf die es
       ankommt (die ohne Agent), keinen Massstab. */
    const seite = () => {
      const b = typeof Belegung !== "undefined" ? Belegung.get() : null;
      // Dieselbe Quelle, mit der die Seite auch ihre Preise rechnet
      const r = typeof Reisedaten !== "undefined" ? Reisedaten : null;
      return {
        monat: r?.monat ? r.monat() : null,
        naechte: r?.naechte ? r.naechte(7) : 7,
        personen: b ? b.personen : 0,
      };
    };
    const s = seite();
    const monat = p?.monat || s.monat;
    const personen = ((p?.erwachsene ?? 0) + (p?.kinder ?? 0)) || p?.personen || s.personen || 0;
    if (!monat || !personen) return null;
    return this.ausEckpunkten({
      monat,
      naechte: p?.naechte || s.naechte || 7,
      personen,
      budget: p?.budgetGesamt || null,
      ausGespraech: true,
    });
  },

  ausEckpunkten(e) {
    if (!e || !e.monat || !e.personen) return null;
    if (!e.budget && !e.ausGespraech) return null;
    const personen = Math.max(1, Math.min(8, e.personen));
    const budget = e.budget || null;
    return {
      id: "frei",
      frei: true,
      titel: "Deine Reise",
      eckpunkte: e,
      monat: e.monat,
      naechte: e.naechte || 7,
      erwachsene: personen,
      kinder: 0,
      personen,
      zimmer: 1,
      typ: null,
      budgetGesamt: budget,
      ziele: null,

      pruefen(h, gesamt) {
        const gruende = [];
        // Ohne genanntes Budget gibt es keine Budgetverletzung - dann
        // traegt die Auswertung allein die Dominanz
        if (budget && gesamt > budget) gruende.push(`${Math.round(gesamt)} Euro, über dem Budget`);
        /* Der Massstab darf nur enthalten, was die Person haette buchen
           koennen.
           --------------------------------------------------------------
           Ohne diese beiden Regeln waere ein Haus "guenstiger und besser
           bewertet", das im gewaehlten Monat ausgebucht ist oder dessen
           Region ausserhalb ihrer Saison liegt - der Agent zeigt solche
           Haeuser gar nicht, und die Auswertung wuerde der Person etwas
           vorwerfen, das sie nie gesehen hat. Dieselben zwei Regeln
           benutzt `katalogTreffer` im Kern. */
        if (typeof freiImMonat === "function" && !freiImMonat(h, e.monat)) gruende.push("im Monat ausgebucht");
        if (typeof saisonPassung === "function" && typeof ZIEL_NACH_ID !== "undefined"
          && ZIEL_NACH_ID[h.ziel] && saisonPassung(ZIEL_NACH_ID[h.ziel], e.monat) < 0.5) {
          gruende.push("außerhalb der Saison");
        }
        if (h.minNights && (e.naechte || 7) < h.minNights) gruende.push(`Mindestaufenthalt ${h.minNights} Nächte`);
        if (h.type === "apartment") {
          if ((h.maxGuests || 0) < personen) gruende.push(`zu klein für ${personen} Personen`);
        } else if (!Aufgaben.zimmerFuer(h, personen)) {
          gruende.push(`kein Zimmer für ${personen} Personen`);
        }
        return gruende;
      },
      // Ohne genannte Wunsch-Rangfolge ist die Bewertung der neutralste
      // Massstab - sie entscheidet nur, was bei gleichem Preis oben steht.
      rang(h) { return (h.rating || 0) * 10; },
      zimmerWahl: (h) => Aufgaben.zimmerFuer(h, personen),
      verpflegung: "ohne",
    };
  },

  // Das guenstigste Zimmer, in das die Gruppe passt
  zimmerFuer(h, personen) {
    if (!h.rooms) return null;
    return h.rooms.filter((r) => (r.maxGuests || 0) >= personen)
      .sort((a, b) => a.priceDelta - b.priceDelta)[0] || null;
  },

  /* Gesamtpreis eines Hauses fuer diese Aufgabe, so wie die Kasse ihn
     rechnet: Nachtpreis mit Zimmer- und Verpflegungsaufschlag mal
     Naechte mal Zimmer, plus Endreinigung je Zimmer. Die Formel steht
     auch in checkout.js - sie muss dort und hier dieselbe bleiben,
     sonst vergleicht die Auswertung zwei verschiedene Zahlen. */
  gesamtpreis(h, aufgabe) {
    if (!h) return null;
    const basis = typeof preisImMonat === "function" ? preisImMonat(h, aufgabe.monat) : h.pricePerNight;
    if (h.type === "apartment") {
      return basis * aufgabe.naechte + (h.cleaningFee || 0);
    }
    const zimmer = aufgabe.zimmerWahl(h);
    if (!zimmer) return null;
    // Dieselbe Rechnung wie Seite und Kasse (aufenthaltKosten, data/ziele.js)
    if (typeof aufenthaltKosten === "function") {
      return aufenthaltKosten(h, aufgabe.monat, aufgabe, aufgabe.naechte,
        { zimmer, board: aufgabe.verpflegung || "ohne" }).gesamt;
    }
    const board = h.boards?.find((b) => b.key === aufgabe.verpflegung)
      || h.boards?.find((b) => b.key === "ohne") || h.boards?.[0];
    const nacht = basis + zimmer.priceDelta + (board?.priceDelta || 0);
    return nacht * aufgabe.naechte * aufgabe.zimmer + 35 * aufgabe.zimmer;
  },

  // Alle zulaessigen Haeuser, nach Rangfolge sortiert - das erste ist
  // die objektiv beste Option
  zulaessige(aufgabe) {
    const katalog = [
      ...(typeof HOTELS !== "undefined" ? HOTELS : []),
      ...(typeof APARTMENTS !== "undefined" ? APARTMENTS : []),
    ];
    return katalog
      .map((h) => ({ h, gesamt: this.gesamtpreis(h, aufgabe) }))
      .filter((x) => x.gesamt != null && aufgabe.pruefen(x.h, x.gesamt).length === 0)
      .sort((a, b) => aufgabe.rang(b.h) - aufgabe.rang(a.h) || a.gesamt - b.gesamt)
      .map((x) => ({ id: x.h.id, name: x.h.name, gesamt: x.gesamt, rang: Math.round(aufgabe.rang(x.h) * 10) / 10 }));
  },

  beste(aufgabe) {
    return this.zulaessige(aufgabe)[0] || null;
  },

  // Die zulaessigen Haeuser eines bestimmten Ziels - fuer die Frage
  // "hat die Person im gewaehlten Ziel das Beste genommen?"
  zulaessigeImZiel(aufgabe, zielId) {
    return this.zulaessige(aufgabe).filter((x) => {
      const h = typeof getItemById === "function" ? getItemById(x.id) : null;
      return h && h.ziel === zielId;
    });
  },

  /* Das Partnerhaus fuer eine konkrete Trefferliste: das beste oder das
     zweitbeste zulaessige Haus unter denen, die der Agent tatsaechlich
     gefunden hat. So ist es immer dabei, egal welches Ziel die Person
     gewaehlt hat. */
  partnerAus(aufgabe, ids, rang, reihenfolge = null) {
    const menge = new Set(ids || []);
    let liste = this.zulaessige(aufgabe).filter((x) => menge.has(x.id));
    // Kein frueher Ausstieg mehr, wenn nichts zulaessig ist: Weiter unten
    // springt die Rangfolge des Gespraechs ein. Sonst verschwand das
    // Partnerhaus in jedem Lauf, in dem die Person etwas ganz anderes
    // suchte als die Aufgabe (Lappland statt Mittelmeer) - und mit ihm
    // die Bedingung, um die es in der Erhebung geht.
    /* "Beste" und "zweitbeste" richten sich nach dem, was die Person im
       Gespraech gesagt hat, nicht nach der Rangfolge der Aufgabe.
       ------------------------------------------------------------------
       Am 23.09.2026 stand ein Hotel mit der Teilnote 6,6 beim Essen auf
       Platz eins, obwohl die Person gerade gesagt hatte, gutes Essen sei
       ihr das Wichtigste - es war nach den Kriterien der Aufgabe das beste
       zulaessige Haus, nach den Wuenschen der Person das schlechteste der
       drei. Eine bezahlte Platzierung soll ein Schubs sein, kein
       offensichtlicher Fehlgriff: Sonst misst der Versuch nicht mehr, ob
       jemand die Empfehlung annimmt, sondern ob er den Bock bemerkt.
       Die Zulaessigkeit bleibt an der Aufgabe haengen (sie traegt die
       harten Vorgaben und die Auswertung), die Reihenfolge nicht. */
    const nachGespraech = Array.isArray(reihenfolge) && reihenfolge.length
      ? reihenfolge.filter((id) => menge.has(id)) : null;
    if (nachGespraech) {
      const platz = new Map(nachGespraech.map((id, i) => [id, i]));
      liste = [...liste].sort((a, b) => (platz.get(a.id) ?? 999) - (platz.get(b.id) ?? 999));
    }

    /* Das Fenster.
       ------------------------------------------------------------------
       Die Aufgabe entscheidet, was zulaessig ist - aber die Person haelt
       sich nicht immer an die Aufgabe. Wer eine Familienreise als Reise
       zu zweit beschreibt, bekommt eine ganz andere Rangfolge, und das
       beste nach der Aufgabe zulaessige Haus stand im Test auf Platz 22
       von 74 nach ihren eigenen Wuenschen: Essen 7,3, waehrend daneben
       9,5 und 9,3 lagen. Ein Partnerhaus, das so weit abfaellt, ist kein
       Schubs mehr, sondern ein Fehlgriff. Liegt es ausserhalb der ersten
       sechs, zaehlt die Rangfolge des Gespraechs und die
       Aufgaben-Bedingung faellt fuer diese Runde weg. */
    const FENSTER = 6;
    const zuWeitUnten = nachGespraech && liste.length
      && nachGespraech.indexOf(liste[0].id) >= FENSTER;
    if (nachGespraech && (!liste.length || zuWeitUnten)) {
      liste = nachGespraech.slice(0, 2).map((id) => ({
        id,
        name: (typeof getItemById === "function" ? getItemById(id)?.name : null) || id,
        ausGespraech: true,
      }));
    }
    if (!liste.length) return null;
    if (rang === "beste" || liste.length < 2) return { ...liste[0], rang: "beste" };
    return { ...liste[1], rang: "zweitbeste" };
  },

  /* Bewertung einer Buchung gegen die Aufgabe.
     ------------------------------------------------------------------
     Liefert, ob die Buchung zulaessig war, welche Vorgaben sie verletzt,
     wie weit sie in Euro von der besten Option entfernt liegt und auf
     welchem Platz der Rangfolge sie stand. Das ist die Ergebnisguete -
     objektiv, in Euro, ohne dass jemand etwas berichten muss. */
  bewerten(aufgabe, gebuchtId, gebuchtGesamt) {
    const katalog = [
      ...(typeof HOTELS !== "undefined" ? HOTELS : []),
      ...(typeof APARTMENTS !== "undefined" ? APARTMENTS : []),
    ];
    const h = katalog.find((x) => x.id === gebuchtId);
    const beste = this.beste(aufgabe);
    if (!h || !beste) return { gebucht: gebuchtId, beste: beste?.id || null, zulaessig: null };

    const gesamt = gebuchtGesamt ?? this.gesamtpreis(h, aufgabe);
    const verletzt = aufgabe.pruefen(h, gesamt);
    const liste = this.zulaessige(aufgabe);
    const platz = liste.findIndex((x) => x.id === gebuchtId);
    const imZiel = this.zulaessigeImZiel(aufgabe, h.ziel);
    const besteImZiel = imZiel[0] || null;
    return {
      ziel: h.ziel,
      besteImZiel: besteImZiel?.id || null,
      besteImZielName: besteImZiel?.name || null,
      istBesteImZiel: !!besteImZiel && besteImZiel.id === gebuchtId,
      platzImZiel: imZiel.findIndex((x) => x.id === gebuchtId) + 1 || null,
      zulaessigeImZiel: imZiel.length,
      gebucht: gebuchtId,
      gebuchtName: h.name,
      gebuchtGesamt: Math.round(gesamt),
      beste: beste.id,
      besteName: beste.name,
      besteGesamt: Math.round(beste.gesamt),
      zulaessig: verletzt.length === 0,
      verletzt,
      abstandEur: Math.round(gesamt - beste.gesamt),
      // Rang der Buchung gegen den Rang der besten Option - fuer die
      // Faelle, in denen der Preis gleich ist und nur die Qualitaet
      // der Wahl sich unterscheidet
      rangGebucht: Math.round(aufgabe.rang(h) * 10) / 10,
      rangBeste: beste.rang,
      platz: platz >= 0 ? platz + 1 : null,
      zulaessigeAnzahl: liste.length,
      istBeste: gebuchtId === beste.id,
      ...this.dominanz(liste, h, gesamt),
    };
  },

  /* Dominanz: gab es etwas, das guenstiger UND besser bewertet war?
     ------------------------------------------------------------------
     Das Guetemass, das ohne vorgegebene Wunsch-Rangfolge auskommt und
     deshalb auch fuer die freie Aufgabe gilt. Verglichen wird nur
     innerhalb der zulaessigen Haeuser, also unter denen, die Budget und
     Gruppe erfuellen - sonst waere jedes teure Haus trivial dominiert.

     Gezaehlt wird streng: guenstiger und besser, nicht guenstiger oder
     besser. Ein Haus, das 10 Euro mehr kostet und eine Zehntelnote
     besser ist, dominiert nicht. */
  dominanz(liste, gebucht, gesamt) {
    if (!gebucht || gesamt == null) return {};
    const note = (id) => (typeof getItemById === "function" ? getItemById(id)?.rating : null) || 0;
    const eigene = gebucht.rating || 0;
    const besser = liste.filter((x) => x.id !== gebucht.id && x.gesamt < gesamt && note(x.id) > eigene);
    besser.sort((a, b) => note(b.id) - note(a.id) || a.gesamt - b.gesamt);
    return {
      dominiert: besser.length ? 1 : 0,
      dominierendeAnzahl: besser.length,
      dominierendes: besser[0]?.id || null,
      dominierendesName: besser[0]?.name || null,
      // Was die Person haette sparen koennen, ohne schlechter zu wohnen
      dominanzErspartEur: besser.length ? Math.round(gesamt - Math.min(...besser.map((x) => x.gesamt))) : 0,
    };
  },

  /* Wie viel von der Aufgabe im Gespraech angekommen ist.
     ------------------------------------------------------------------
     Grober Abgleich: Fuer jede harte Vorgabe ein paar Schluesselwoerter,
     die im Chatverlauf der Person vorkommen muessten. Das ersetzt keine
     Inhaltsanalyse, gibt aber ein erstes Mass dafuer, ob jemand die
     Aufgabe uebergeben oder nur "Mallorca" gesagt hat. */
  uebergeben(aufgabe, verlauf, profil = null) {
    const text = (verlauf || []).filter((n) => n.rolle === "user").map((n) => n.text).join(" ").toLowerCase();
    /* Bei der freien Aufgabe wird nicht geraten, sondern verglichen.
       ----------------------------------------------------------------
       Die drei Eckpunkte stehen als Zahlen fest, und was beim Agenten
       angekommen ist, steht in seinem Profil. Das ist der exakte
       Abgleich, den der Stichwortvergleich unten nur schaetzen kann. */
    if (aufgabe?.frei) {
      const p = profil || {};
      const treffer = {
        zeit: p.monat === aufgabe.monat,
        gruppe: (p.erwachsene || 0) + (p.kinder || 0) === aufgabe.personen,
        budget: !!(p.budgetGesamt && p.budgetGesamt <= aufgabe.budgetGesamt)
          || !!(p.maxPreis && p.maxPreis * (aufgabe.naechte || 7) <= aufgabe.budgetGesamt * 1.1),
      };
      const n = Object.values(treffer).filter(Boolean).length;
      return { treffer, anteil: Math.round((n / 3) * 100) / 100 };
    }
    const muster = aufgabe.id === "familie" ? {
      ziel: /mallorca|kreta|algarve|sardinien|teneriffa|meer|warm|süden|sueden/, zeit: /august|sommer/, gruppe: /kind|famili|vier|zu viert|2 erw/,
      pool: /pool/, strand: /strand|meer/, budget: /1[.,]?600|budget|höchstens|maximal|euro|€/,
      kinderclub: /kinderclub|club|betreuung|animation/,
    } : {
      ziel: /mallorca|kreta|algarve|sardinien|teneriffa|meer|warm|süden|sueden/, zeit: /oktober|herbst/, gruppe: /zu zweit|zweit|paar|2 erw|zwei erw/,
      fruehstueck: /frühstück|fruehstueck/, ruhe: /ruhig|ruhe|kein.*famil|party/,
      budget: /900|budget|höchstens|maximal|euro|€/, essen: /essen|küche|kueche|restaurant|kulinar/,
    };
    const treffer = {};
    let n = 0;
    for (const [k, re] of Object.entries(muster)) { treffer[k] = re.test(text); if (treffer[k]) n++; }
    return { treffer, anteil: Math.round((n / Object.keys(muster).length) * 100) / 100 };
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { AUFGABEN, Aufgaben, ZIELE_WARM };
