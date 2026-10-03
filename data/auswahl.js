/* ==================================================================
   Eine Auswahlregel für Seite und Agent.
   ------------------------------------------------------------------
   Gemeldet am 02.10.2026, und es war der schwerste Befund des Tages:
   "Es wird gesagt, ja, das sind 33 Hotels buchbar, die Filter sind
   gesetzt. Dann gucke ich rechts, zähle die Hotels und da sind 60
   Hotels vorgeschlagen. Das kann doch nicht sein."

   Er hatte recht, und die Ursache war keine Schlamperei an einer
   Stelle, sondern Absicht an zwei Stellen: `matches()` in results.js
   entschied für die Liste, `katalogTreffer()` im Werkzeugkasten
   entschied für den Agenten. Zwei Funktionen, zwei Vorstellungen davon,
   was buchbar heißt. Nachgemessen am Stand aus seinem Testlauf
   (Oktober, 4 Personen, All Inclusive, 8.000 € gesamt, Flug ab München,
   Anreise 13.10.):

     Agent sagte                     22 Häuser
     Seite zeigte                    34 Häuser   (Flugtag-Regel fehlte)
     Seite ohne Verpflegungsfilter   91 Häuser   (Filter nicht klickbar)

   Die Seite kannte die Flugtag-Regel gar nicht - ein Haus, zu dem am
   Anreisetag kein Flug geht, stand dort trotzdem. Und jede Vorgabe, die
   der Agent zählt, aber nicht in die Filterspalte klicken kann,
   verschwand spurlos.

   Deshalb steht die Regel jetzt genau einmal: hier. `Auswahl.pruefe`
   geht die Bedingungen in einer festen Reihenfolge durch und gibt die
   erste zurück, an der ein Haus scheitert. Beide Seiten bauen ihre
   Vorgaben und fragen dieselbe Funktion. Weicht die Zahl des Agenten
   von der Zahl der Karten ab, ist das ein Fehler und kein Erklärsatz -
   die Seitenprüfung sieht danach.

   Die Vorgaben haben die Form des Agentenstands (monat, naechte,
   erwachsene, kinder, zimmer, flug, verpflegung ...), weil `Politik`
   diese Form schon liest. Die Seite baut sie aus Belegung, Reisedaten
   und Flug zusammen; der Agent gibt seinen Stand fast unverändert
   weiter.
   ================================================================== */
const Auswahl = {
  /* Die Reihenfolge ist die Reihenfolge der Begründung: Was zuerst
     scheitert, wird genannt. Grob nach außen und innen sortiert - erst
     Ort und Zeit, dann die Gruppe, dann Geld, dann Wünsche. */
  FELDER: ["art", "suchtext", "monat", "ziel", "saison", "gruppe", "dauer", "flug", "flugtag",
    "preis", "gesamt", "strand", "bewertung", "sterne", "kategorie", "ausstattung",
    "verpflegung", "angebote", "wlan", "schlafzimmer"],

  // Passt die Reisegruppe hinein? Bis zum 02.10.2026 stand diese Rechnung
  // zweimal da - als `Werkzeugkasten.passtGruppe` und als `Belegung.passt`.
  passtGruppe(h, v) {
    const personen = (v.erwachsene || 0) + (v.kinder || 0) || v.personen || 0;
    if (!personen) return true;
    if (h.type === "apartment") return (h.maxGuests || 0) >= personen;
    if (!(h.rooms || []).length) return true;
    const zimmer = Math.max(1, v.zimmer || 1);
    return Math.max(...h.rooms.map((r) => r.maxGuests || 0)) * zimmer >= personen;
  },

  /* Was die ganze Reise kostet - eine Rechnung für Karte, Regler, Agent
     und Kasse. Vorher rechnete die Seite ohne Zimmer- und
     Verpflegungsaufschlag, der Agent mit; auf derselben Karte standen
     dadurch zwei Summen. */
  reisepreis(h, v) {
    if (!h || !v) return null;
    const nacht = typeof preisImMonat === "function" ? preisImMonat(h, v.monat || null) : null;
    if (nacht == null) return null;
    // Eine Rechnung fuer alle Seiten (aufenthaltKosten in data/ziele.js)
    const unterkunft = typeof aufenthaltKosten === "function"
      ? aufenthaltKosten(h, v.monat || null, v, v.naechte || 7).gesamt
      : nacht * (v.naechte || 7);
    if (unterkunft == null) return null;
    const personen = (v.erwachsene || 0) + (v.kinder || 0) || v.personen || 0;
    /* Der Flugteil darf die Rechnung nicht zum Absturz bringen: `paket`
       liest die Adresse und den Speicher der Seite. Fällt er aus, ist der
       Preis die Unterkunft, und `mitFlug` sagt, dass die Zahl
       unvollständig ist - statt sie als ganze auszugeben. */
    let paket = null;
    if (v.flug && h.type !== "apartment" && typeof Flug !== "undefined") {
      try { paket = Flug.paket(h, personen || 1, v.flugKlasse || null); } catch { paket = null; }
    }
    return { unterkunft, flug: paket ? paket.gesamt : 0,
      gesamt: unterkunft + (paket ? paket.gesamt : 0), mitFlug: !!paket };
  },

  /* Die Prüfung. Gibt den Namen der ersten Bedingung zurück, an der das
     Haus scheitert, oder null, wenn es passt. `ausser` lässt genau eine
     Bedingung aus - dafür stehen die Zahlen neben den Filtern in der
     Spalte ("Mallorca 14"), die unter allen anderen Filtern zählen. */
  pruefe(h, v, ausser = null) {
    if (!h) return "art";
    const aus = (feld) => ausser === feld;

    /* Hotel oder Wohnung. "unterkunft" ist der gemeinsame Reiter und
       lässt beides durch. */
    if (!aus("art") && v.typ && v.typ !== "unterkunft" && h.type !== v.typ) return "art";

    if (!aus("suchtext") && v.suchtext) {
      const z = typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[h.ziel] : null;
      const text = `${h.name} ${h.location} ${h.region || ""} ${z ? `${z.name} ${z.land}` : ""}`.toLowerCase();
      if (!text.includes(String(v.suchtext).trim().toLowerCase())) return "suchtext";
    }

    // Im Monat überhaupt frei
    if (!aus("monat") && v.monat && typeof freiImMonat === "function"
      && !freiImMonat(h, v.monat)) return "monat";

    if (!aus("ziel") && (v.zielIds || []).length && !v.zielIds.includes(h.ziel)) return "ziel";

    /* Außerhalb der Saison heißt: nicht im Angebot - ohne Ausnahme, auch
       wenn die Person die Region selbst genannt hat. Eine Regel an beiden
       Orten ist mehr wert als eine Hintertür. */
    if (!aus("saison") && v.monat && typeof saisonPassung === "function"
      && typeof ZIEL_NACH_ID !== "undefined" && ZIEL_NACH_ID[h.ziel]
      && saisonPassung(ZIEL_NACH_ID[h.ziel], v.monat) < 0.5) return "saison";

    if (!aus("gruppe") && !this.passtGruppe(h, v)) return "gruppe";

    // Der Mindestaufenthalt stand lange nur als Text auf der Hausseite
    if (!aus("dauer") && v.naechte && h.minNights && v.naechte < h.minNights) return "dauer";

    /* Fester Anreisetag mit Flug: nur, was an dem Tag erreichbar ist -
       Hin- und Rückflug. Eine Empfehlung, die man nicht buchen kann, ist
       keine. Diese Regel fehlte auf der Seite und war am 02.10.2026 die
       größte Einzelabweichung zwischen Chat und Liste. */
    if (!aus("flugtag") && v.flug && v.flugAnreise && h.type !== "apartment"
      && typeof Flug !== "undefined") {
      const f = Flug.wahl(h.ziel);
      if (!f || Flug.passtTag(f, v.flugAnreise, v.naechte || 7) === false) return "flugtag";
    }

    /* Mit Flug nur, wohin ab dem gewaehlten Flughafen etwas fliegt.
       Gemeldet am 03.10.2026: "ab Zuerich" - und Haeuser auf Kreta. */
    if (!aus("flug") && v.flug && h.type !== "apartment" && typeof Flug !== "undefined"
      && !Flug.optionen(h.ziel).length) return "flug";

    /* Der Nachtpreis fuer DIESE Gruppe: passendes Zimmer, Zahl der
       Zimmer, gewuenschte Verpflegung pro Person (03.10.2026). */
    const nacht = typeof nachtpreisGruppe === "function" ? nachtpreisGruppe(h, v.monat || null, v)
      : (typeof preisImMonat === "function" ? preisImMonat(h, v.monat || null) : null);
    if (!aus("preis") && v.maxPreis != null && nacht != null && nacht > v.maxPreis) return "preis";
    if (!aus("gesamt") && v.budgetGesamt != null) {
      const r = this.reisepreis(h, v);
      if (r && r.gesamt > v.budgetGesamt) return "gesamt";
    }

    // Binnenziele haben distanceToBeach null - sie erfüllen keinen Strandfilter
    if (!aus("strand") && v.maxStrand != null
      && (h.distanceToBeach == null || h.distanceToBeach > v.maxStrand)) return "strand";
    if (!aus("bewertung") && v.mindestbewertung && (h.rating || 0) < v.mindestbewertung) return "bewertung";

    /* Sterne, Unterkunftsart und Verpflegung kennt nur ein Hotel,
       Schlafzimmer nur eine Wohnung. Im gemeinsamen Reiter dürfen sie die
       andere Hälfte nicht herauswerfen, ohne dass jemand das wollte. */
    if (h.type !== "apartment") {
      if (!aus("sterne")) {
        if (v.mindestSterne && (h.stars || 0) < v.mindestSterne) return "sterne";
        if ((v.sterne || []).length && !v.sterne.map(String).includes(String(h.stars))) return "sterne";
      }
      if (!aus("kategorie") && (v.kategorien || []).length
        && !v.kategorien.includes(h.category)) return "kategorie";
      if (!aus("verpflegung") && (v.verpflegung || []).length) {
        const keys = (h.boards || []).map((b) => b.key);
        if (!v.verpflegung.some((k) => keys.includes(k))) return "verpflegung";
      }
    } else if (!aus("schlafzimmer") && v.mindestSchlafzimmer
      && (h.bedrooms || 0) < v.mindestSchlafzimmer) return "schlafzimmer";

    if (!aus("ausstattung") && (v.ausstattung || []).some((a) => !(h.amenities || []).includes(a))) return "ausstattung";
    // Reduziert heißt: es steht ein alter Preis daran
    if (!aus("angebote") && v.nurAngebote && !h.oldPrice) return "angebote";
    if (!aus("wlan") && v.wlanInklusive && typeof wlanGebuehr === "function"
      && wlanGebuehr(h) > 0) return "wlan";
    return null;
  },

  passt(h, v, ausser = null) { return this.pruefe(h, v, ausser) === null; },

  treffer(liste, v, ausser = null) {
    return (liste || []).filter((h) => this.pruefe(h, v, ausser) === null);
  },

  /* Wie viele an welcher Bedingung scheitern. Daraus wird der Satz
     "46 sind für 4 Personen zu klein" - und die Summe muss aufgehen:
     Treffer plus alle Gründe ergibt die Ausgangsmenge. */
  gruende(liste, v) {
    const zaehler = {};
    let passend = 0;
    for (const h of liste || []) {
      const g = this.pruefe(h, v);
      if (g === null) passend++;
      else zaehler[g] = (zaehler[g] || 0) + 1;
    }
    return { passend, zaehler, gesamt: (liste || []).length };
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Auswahl };
