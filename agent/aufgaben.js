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

const Aufgaben = {
  alle() { return [AUFGABEN.familie, AUFGABEN.paar]; },
  nach(id) { return AUFGABEN[id] || null; },

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
    if (!liste.length) return null;
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
    };
  },

  /* Wie viel von der Aufgabe im Gespraech angekommen ist.
     ------------------------------------------------------------------
     Grober Abgleich: Fuer jede harte Vorgabe ein paar Schluesselwoerter,
     die im Chatverlauf der Person vorkommen muessten. Das ersetzt keine
     Inhaltsanalyse, gibt aber ein erstes Mass dafuer, ob jemand die
     Aufgabe uebergeben oder nur "Mallorca" gesagt hat. */
  uebergeben(aufgabe, verlauf) {
    const text = (verlauf || []).filter((n) => n.rolle === "user").map((n) => n.text).join(" ").toLowerCase();
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
