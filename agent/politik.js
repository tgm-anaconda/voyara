// Was der Agent tut - und zwar bei jeder teilnehmenden Person gleich.
//
// Warum das hier steht und nicht im Modell:
// Liesse man GPT frei entscheiden, bekaeme man bei zwanzig Teilnehmenden
// zwanzig unterschiedlich gute Agenten. Einer filtert klug, der naechste
// vergisst die Personenzahl. Die Studie wuerde dann die Streuung des Modells
// messen statt den Effekt des Agenten. Deshalb die Zweiteilung:
//
//   Das Modell versteht und formuliert.   -> spaeter api/agent.js
//   Diese Datei handelt.                  -> feste Schrittfolgen
//
// Solange die Modellanbindung fehlt, uebernimmt `absicht()` auch das
// Verstehen - schluesselwortbasiert. Diese Funktion wird spaeter ersetzt,
// die Schrittfolgen darunter bleiben unveraendert.

const Politik = {
  /* ==================================================================
     Verstehen (vorlaeufig ohne Modell)
     ================================================================== */

  MONATE: {
    januar: 1, februar: 2, "märz": 3, maerz: 3, april: 4, mai: 5, juni: 6,
    juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12,
  },

  absicht(text) {
    const t = text.toLowerCase();
    const a = {
      typ: /ferienwohnung|apartment|wohnung|ferienhaus/.test(t) ? "apartment" : "hotel",
      zielId: null,
      erwachsene: null,
      kinder: null,
      monat: null,
      budget: null,        // niedrig | hoch
      strandnah: /strand|meer|see|küste|kueste/.test(t),
      pool: /pool|schwimmbad/.test(t),
      familie: /famili|kind/.test(t),
      wellness: /wellness|spa|sauna/.test(t),
      guteBewertung: /gut bewertet|beste bewertung|bewertung/.test(t),
    };

    // Reiseziel ueber die Namen aus data/ziele.js
    if (typeof ZIELE !== "undefined") {
      for (const z of ZIELE) {
        if (t.includes(z.name.toLowerCase()) || t.includes(z.land.toLowerCase())) {
          a.zielId = z.id;
          break;
        }
      }
    }

    const personen = t.match(/(\d+)\s*(personen|erwachsene|leute)/);
    if (personen) a.erwachsene = Math.min(6, +personen[1]);
    else if (/zu zweit|für zwei|fuer zwei/.test(t)) a.erwachsene = 2;

    const kinder = t.match(/(\d+)\s*kind/);
    if (kinder) a.kinder = Math.min(4, +kinder[1]);

    for (const [name, nr] of Object.entries(this.MONATE)) {
      if (t.includes(name)) { a.monat = nr; break; }
    }

    if (/günstig|guenstig|billig|preiswert|wenig geld|sparen/.test(t)) a.budget = "niedrig";
    if (/luxus|gehoben|teuer|erstklassig|5 sterne|fünf sterne/.test(t)) a.budget = "hoch";

    return a;
  },

  /* ==================================================================
     Planen - die feste Schrittfolge
     ================================================================== */

  planen(text) {
    // Buchungswunsch auf einer Detailseite: kurze eigene Folge. Hier greift
    // danach die Autonomiestufe aus STELLSCHRAUBEN - der Punkt, an dem sich
    // "assistiert", "nachfrage" und "autonom" unterscheiden.
    if (/\b(buch|buchen|buchung|reservier)/i.test(text) && Werkzeuge.seite() === "stay") {
      const id = new URLSearchParams(location.search).get("id");
      return {
        ansage: "Ich gehe die Buchungsstrecke durch.",
        schritte: [{ werkzeug: "zurBuchung", status: "öffnet Buchung…", args: { id } }],
      };
    }

    const a = this.absicht(text);
    const schritte = [];

    // Ohne Reiseziel und ohne erkennbare Absicht kein Plan. Lieber nachfragen
    // als etwas Beliebiges tun.
    if (!a.zielId && !a.strandnah && !a.budget && a.erwachsene === null) {
      return { schritte: [] };
    }

    /* --- 1. Suchen --------------------------------------------------- */
    const ziel = a.zielId && typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[a.zielId] : null;
    const zeitraum = this.zeitraum(a.monat);
    schritte.push({
      werkzeug: "suchen",
      status: "sucht…",
      args: {
        ziel: ziel ? ziel.name : "",
        von: zeitraum.von,
        bis: zeitraum.bis,
        erwachsene: a.erwachsene,
        kinder: a.kinder,
      },
    });

    /* --- 2. Filtern -------------------------------------------------- */
    const filter = {};
    if (a.zielId) filter.zielId = a.zielId;
    if (a.strandnah) filter.maxStrand = 1;
    if (a.budget === "hoch") filter.sterne = [5];
    if (a.guteBewertung) filter.mindestbewertung = 4.5;
    const ausstattung = [];
    if (a.pool) ausstattung.push("pool");
    if (a.familie) ausstattung.push("familyFriendly");
    if (a.wellness) ausstattung.push("spa");
    if (ausstattung.length) filter.ausstattung = ausstattung;

    if (Object.keys(filter).length) {
      schritte.push({ werkzeug: "filterSetzen", status: "setzt Filter…", args: this.fehlerEinbauen(filter) });
    }

    /* --- 3. Sortieren ------------------------------------------------ */
    schritte.push({
      werkzeug: "sortieren",
      status: "sortiert…",
      args: { nach: a.budget === "niedrig" ? "preis-asc" : "rating" },
    });

    /* --- 4. Vergleichen ---------------------------------------------- */
    schritte.push({ werkzeug: "ergebnisseLesen", status: "vergleicht…", merken: "treffer", args: { anzahl: 5 } });

    /* --- 5. Bewertungen auswerten ------------------------------------
       Der Schritt, der den Agenten von einer Suchmaske unterscheidet.     */
    schritte.push({ werkzeug: "unterkunftOeffnen", status: "öffnet…", args: { id: "$bester" } });
    schritte.push({ werkzeug: "bewertungenLesen", status: "liest Bewertungen…", merken: "bewertungen", args: { id: "$bester" } });

    /* --- 6. Zusammenfassen ------------------------------------------- */
    schritte.push({ werkzeug: "antworten", status: "fasst zusammen…", args: { was: "empfehlung" } });

    return { ansage: this.ansage(a), schritte };
  },

  // Ein Zeitraum aus dem genannten Monat. Ohne Monatsangabe bleibt es beim
  // Standard der Suchmaske - der Agent erfindet keine Reisedaten.
  zeitraum(monat) {
    if (!monat) return { von: "", bis: "" };
    const heute = new Date();
    let jahr = heute.getFullYear();
    if (monat < heute.getMonth() + 1) jahr += 1;
    const iso = (d) => Reisedaten.alsIso(d);
    return {
      von: iso(new Date(jahr, monat - 1, 12)),
      bis: iso(new Date(jahr, monat - 1, 19)),
    };
  },

  ansage(a) {
    const teile = [];
    if (a.zielId && typeof ZIEL_NACH_ID !== "undefined") teile.push(ZIEL_NACH_ID[a.zielId]?.name);
    if (a.strandnah) teile.push("strandnah");
    if (a.budget === "niedrig") teile.push("günstig");
    if (a.budget === "hoch") teile.push("gehoben");
    if (a.pool) teile.push("mit Pool");
    if (a.erwachsene) teile.push(`${a.erwachsene} Personen`);
    return `Verstanden${teile.length ? `: ${teile.filter(Boolean).join(", ")}` : ""}. Ich schaue mich um.`;
  },

  /* ==================================================================
     Fehlerinjektion
     ================================================================== */

  // Fehler werden nicht dem Modell ueberlassen ("sei absichtlich schlecht"),
  // sondern hier gesetzt: kontrolliert, protokollierbar und reproduzierbar.
  // Solange STELLSCHRAUBEN.fehler auf "keine" steht, passiert nichts.
  fehlerEinbauen(filter) {
    if (typeof STELLSCHRAUBEN === "undefined" || STELLSCHRAUBEN.fehler === "keine") return filter;

    const verfaelscht = { ...filter };
    if (STELLSCHRAUBEN.fehler === "filter") {
      // Setzt 3 statt 5 Sterne - sichtbar in der Filterspalte, korrigierbar
      if (verfaelscht.sterne) verfaelscht.sterne = [3];
      else verfaelscht.mindestbewertung = 3.5;
    }
    if (STELLSCHRAUBEN.fehler === "kriterium") {
      // Uebergeht einen genannten Wunsch stillschweigend
      delete verfaelscht.ausstattung;
      delete verfaelscht.maxStrand;
    }
    return verfaelscht;
  },

  /* ==================================================================
     Formulieren
     ================================================================== */

  // Spaeter uebernimmt das Modell diese Saetze. Die Zahlen darin stammen so
  // oder so aus den Daten, nicht aus dem Modell - erfundene Prozentwerte
  // waeren in einer Studie fatal.
  formulieren(was, lauf) {
    if (was !== "empfehlung") return "Fertig.";

    const b = lauf.merker.bewertungen;
    if (!b) return "Ich habe dir das passendste Angebot geöffnet.";

    const knapp = typeof STELLSCHRAUBEN !== "undefined" && STELLSCHRAUBEN.begruendung === "knapp";
    const note = b.note.toFixed(1).replace(".", ",");
    if (knapp) return `Mein Vorschlag: ${b.name}, ${note} bei ${b.anzahl} Bewertungen.`;

    const spitze = (b.bilanz || [])[0];
    const teile = [`Mein Vorschlag ist ${b.name} mit ${note} aus ${b.anzahl} Bewertungen.`];

    if (spitze) {
      teile.push(`Am häufigsten geht es um ${spitze.aspekt}: ${spitze.erwaehnungen} Erwähnungen, davon ${Math.round(spitze.anteilPositiv * 100)} Prozent positiv.`);
    }
    if (b.kritisiert?.length) {
      const aufzaehlen = (l) => l.length < 2 ? (l[0] || "")
        : `${l.slice(0, -1).join(", ")} und ${l[l.length - 1]}`;
      teile.push(`Wo es Kritik gibt: ${aufzaehlen(b.kritisiert)}.`);
    }
    teile.push("Sag Bescheid, wenn ich weitersuchen oder zur Buchung gehen soll.");
    return teile.join(" ");
  },

  vorschlaege() {
    return ["Günstiges Hotel am Strand für 2 Personen", "Ferienwohnung in Tirol im Januar", "Gut bewertetes Hotel in Kyoto"];
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Politik };
