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

const Werkzeugkasten = {
  /* ==================================================================
     Beschreibungen fuer das Modell
     ================================================================== */
  definitionen() {
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
          ziel: text("Region aus dem Katalog, als id: mallorca, kreta, algarve, sardinien, teneriffa, barcelona, wien, lissabon, tirol, suedtirol, lappland, ostsee, marrakesch, kapstadt, krabi, island, newyork, kyoto. Leer lassen, wenn offen."),
          monat: zahl("Reisemonat 1-12"),
          von: text("Anreise als YYYY-MM-DD, wenn feste Daten genannt sind"),
          bis: text("Abreise als YYYY-MM-DD"),
          flexibel: { type: "boolean", description: "true, wenn die Person im Monat flexibel ist" },
          naechte: zahl("Zahl der Naechte"),
          personenGesamt: zahl("Nur die Gesamtzahl, wenn die Person sie so nennt ('zu viert', 'vier Leute') - dann erwachsene und kinder leer lassen und nachfragen"),
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
          wuensche: { type: "array", items: { type: "string", enum: ["pool", "strandnah", "kinderclub", "familie", "wellness", "ruhe", "essen", "sauberkeit", "lage", "service", "preis", "bewertung"] }, description: "Was der Person wichtig ist" },
          verpflegung: { type: "string", enum: ["ohne", "fruehstueck", "halb", "voll", "ai"], description: "Gewuenschte Verpflegung" },
          flug: { type: "boolean", description: "true, wenn ein Flug dazu gewuenscht ist; false, wenn nur die Unterkunft" },
          flugAb: text("Abflughafen, wenn genannt"),
          flugKlasse: { type: "string", enum: ["economy", "premium", "business"], description: "Flugklasse, wenn genannt" },
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
        "Sucht Haeuser nach den gemerkten Angaben (Ziel, Zeit, Reisende, Art) und den genannten Filtern. Bei Freigabe ab 'suchen' bedient es sichtbar die Seite (Suchmaske, Filter, Sortierung), sonst sucht es im Katalog. Liefert bis zu acht Treffer mit Preis pro Nacht und Gaestenote. Ruf vorher stand_merken mit allem, was feststeht.",
        {
          ziel: text("Region-id (z.B. mallorca), falls sie feststeht und noch nicht gemerkt ist"),
          ausstattung: { type: "array", items: { type: "string", enum: ["pool", "spa", "kidsClub", "familyFriendly", "beachfront", "wifi", "parking", "restaurant", "gym", "seaView"] }, description: "Ausstattung, die das Haus haben muss. beachfront nur bei 'direkt am Strand'; 'nah am Strand' ist maxStrandMeter 500" },
          maxPreis: zahl("Hoechstpreis pro Nacht in Euro"),
          maxStrandMeter: zahl("Hoechstens so viele Meter zum Strand (nah am Strand = 500, direkt = 200)"),
          mindestbewertung: { type: "number", description: "Mindest-Gaestenote" },
          mindestSterne: zahl("Mindestens so viele Sterne"),
          sortierung: { type: "string", enum: ["passung", "preis", "bewertung"], description: "Reihenfolge der Treffer; passung = nach den Wuenschen" },
        }),
      f("haus_details",
        "Alles zu einem Haus aus dem Katalog: Preise je Verpflegung und Gesamtpreis fuer die gemerkte Reise, Zimmer, Entfernungen, Ausstattung, was in den Bewertungen gelobt und kritisiert wird. Fuer Nachfragen und Vergleiche.",
        { id: text("Haus-id aus einem Suchergebnis, z.B. h13") }, ["id"]),
      f("auswahl_vorlegen",
        "Zeigt der Person zwei bis drei Haeuser aus dem letzten Suchergebnis als Vorschlaege im Chat, mit festen Saetzen (Preis, Note, was gelobt und kritisiert wird). Danach fragst du nur noch in einem Satz, welches sie sich ansehen will.",
        {
          ids: { type: "array", items: { type: "string" }, description: "Zwei bis drei Haus-ids aus dem letzten Suchergebnis, das beste zuerst" },
        }, ["ids"]),
      f("haus_oeffnen",
        "Oeffnet die Seite eines Hauses (Freigabe ab 'suchen') und liest dort die Bewertungen. Nutze es, wenn die Person ein Haus genauer sehen will.",
        { id: text("Haus-id") }, ["id"]),
      f("zurueck_zur_liste",
        "Geht von einer Hausseite zurueck zur Trefferliste (Freigabe ab 'suchen').",
        {}),
      f("merken",
        "Setzt ein Haus auf den Merkzettel der Person (Freigabe ab 'suchen').",
        { id: text("Haus-id") }, ["id"]),
      f("buchung_vorbereiten",
        "Geht fuer ein Haus in die Buchungsstrecke, traegt die Gastdaten aus dem Konto ein und bleibt auf der Pruefseite stehen (Freigabe ab 'vorbereiten'). Liefert die Zusammenfassung, die die Person sieht.",
        {
          id: text("Haus-id"),
          verpflegung: { type: "string", enum: ["ohne", "fruehstueck", "halb", "voll", "ai"], description: "Gewuenschte Verpflegung, falls genannt" },
        }, ["id"]),
      f("buchung_abschliessen",
        "Schliesst die vorbereitete Buchung ab (Freigabe 'buchen', oder 'vorbereiten' nach klarem Ja der Person). Es wird nichts wirklich gebucht, die Seite ist ein Prototyp.",
        {}),
      f("freigabe_aendern",
        "Setzt die Freigabestufe, wenn die Person im Gespraech sagt, dass du mehr (oder weniger) darfst.",
        { stufe: { type: "string", enum: ["vorschlagen", "suchen", "vorbereiten", "buchen"] } }, ["stufe"]),
    ];
  },

  // Welche Stufe ein Werkzeug mindestens braucht
  BRAUCHT: {
    haus_oeffnen: "suchen", zurueck_zur_liste: "suchen", merken: "suchen",
    buchung_vorbereiten: "vorbereiten", buchung_abschliessen: "vorbereiten",
  },

  // Zeile im Agenten-Log, bevor das Werkzeug laeuft
  logText(name, a = {}) {
    const haus = (id) => (typeof getItemById === "function" ? getItemById(id)?.name : null) || id;
    switch (name) {
      case "stand_merken": return null;
      case "regionen_zaehlen": return "Zähle, in welchen Regionen es im Zeitraum etwas gibt";
      case "regionen_vergleichen": return `Vergleiche Regionen${a.aspekte?.length ? ` nach ${a.aspekte.join(", ")}` : ""}`;
      case "suchen": return "Suche nach den Angaben";
      case "haus_details": return `Sehe mir ${haus(a.id)} genauer an`;
      case "auswahl_vorlegen": return `Lege ${a.ids?.length || 0} Vorschläge vor`;
      case "haus_oeffnen": return `Öffne ${haus(a.id)}`;
      case "zurueck_zur_liste": return "Gehe zurück zur Trefferliste";
      case "merken": return `Setze ${haus(a.id)} auf den Merkzettel`;
      case "buchung_vorbereiten": return `Bereite die Buchung für ${haus(a.id)} vor`;
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
  async ausfuehren(name, args, kern, stufe = 1) {
    const a = args || {};
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
  katalog(profil) {
    if (profil?.typ === "apartment") return typeof APARTMENTS !== "undefined" ? APARTMENTS : [];
    return typeof HOTELS !== "undefined" ? HOTELS : [];
  },

  // Preis pro Nacht im Reisemonat (Saisonfaktor wie auf der Seite)
  preis(item, monat) {
    const ziel = typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[item.ziel] : null;
    if (!ziel || !monat || typeof saisonFaktor !== "function") return item.pricePerNight;
    return Math.round(item.pricePerNight * saisonFaktor(ziel, monat));
  },

  // Passt das Haus zur Gruppe (Zimmergroesse bzw. Hoechstbelegung)?
  passtGruppe(item, profil) {
    const personen = (profil.erwachsene || 0) + (profil.kinder || 0);
    if (!personen) return true;
    if (item.type === "apartment") return (item.maxGuests || 0) >= personen;
    if (!item.rooms?.length) return true;
    const zimmer = Math.max(1, profil.zimmer || 1);
    return Math.max(...item.rooms.map((r) => r.maxGuests || 0)) * zimmer >= personen;
  },

  kompakt(item, profil) {
    const monat = profil.monat || null;
    const kurz = typeof aspektKurzfassung === "function" ? aspektKurzfassung(item) : null;
    return {
      id: item.id, name: item.name, ort: item.location, region: item.region || null,
      art: item.type === "apartment" ? "Ferienwohnung" : (typeof CATEGORY_LABELS !== "undefined" ? CATEGORY_LABELS[item.category] : item.category) || "Hotel",
      sterne: item.stars ?? null,
      preisProNacht: this.preis(item, monat),
      note: item.rating, bewertungen: item.reviewCount,
      meterZumStrand: item.distanceToBeach != null ? Math.round(item.distanceToBeach * 1000) : null,
      ausstattung: (item.amenities || []).slice(0, 8),
      gelobt: kurz?.staerken?.slice(0, 2) || [],
      kritisiert: kurz?.schwaechen?.slice(0, 1) || [],
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
      const geaendert = [];
      const setze = (feld, wert) => { if (wert !== undefined && wert !== null && wert !== "") { if (p[feld] !== wert) geaendert.push(feld); p[feld] = wert; } };
      if (a.ziel !== undefined) {
        const id = String(a.ziel).toLowerCase().trim();
        if (!id) { p.zielId = null; }
        else if (typeof ZIEL_NACH_ID !== "undefined" && ZIEL_NACH_ID[id]) { setze("zielId", id); }
        else {
          const z = (typeof ZIELE !== "undefined" ? ZIELE : []).find((x) => x.name.toLowerCase() === id);
          if (z) setze("zielId", z.id);
        }
      }
      setze("monat", a.monat); setze("von", a.von); setze("bis", a.bis);
      if (a.flexibel !== undefined) setze("flexibel", !!a.flexibel);
      setze("naechte", a.naechte);
      if (a.von && a.bis && !a.naechte) {
        const n = Math.round((new Date(a.bis) - new Date(a.von)) / 86400000);
        if (n > 0 && n < 60) setze("naechte", n);
        if (!a.monat) setze("monat", new Date(a.von).getMonth() + 1);
      }
      setze("personen", a.personenGesamt);
      setze("erwachsene", a.erwachsene); setze("kinder", a.kinder);
      if (p.erwachsene != null && p.kinder != null) p.personen = p.erwachsene + p.kinder;
      if (Array.isArray(a.kinderAlter)) setze("kinderAlter", a.kinderAlter.slice(0, 6));
      if (a.typ) { setze("typ", a.typ); p.artGenannt = true; }
      setze("zimmer", a.zimmer);
      setze("maxPreis", a.maxPreis); setze("budgetGesamt", a.budgetGesamt);
      if (a.maxStrandMeter != null) setze("maxStrand", Math.round(a.maxStrandMeter) / 1000);
      setze("mindestbewertung", a.mindestbewertung); setze("mindestSterne", a.mindestSterne);
      if (Array.isArray(a.wuensche)) {
        const ids = a.wuensche.filter((w) => typeof Politik !== "undefined" && Politik.kriterium(w));
        p.kriterien = ids.map((id) => ({ id, gewicht: 1 }));
        geaendert.push("wuensche");
        for (const id of ids) {
          const k = Politik.kriterium(id);
          if (k?.filter?.maxStrand && p.maxStrand == null) p.maxStrand = k.filter.maxStrand;
        }
      }
      setze("verpflegung", a.verpflegung);
      if (a.flug !== undefined) setze("flug", !!a.flug);
      setze("flugAb", a.flugAb); setze("flugKlasse", a.flugKlasse);
      // Budget fuer die ganze Reise in einen Preis pro Nacht umrechnen,
      // wie auf der Seite gerechnet wird (Servicegebuehr 35 Euro)
      if (p.budgetGesamt && p.naechte && !a.maxPreis) {
        p.maxPreis = Math.floor((p.budgetGesamt - 35 * Math.max(1, p.zimmer || 1)) / (p.naechte * Math.max(1, p.zimmer || 1)));
      }
      kern.standAnzeigen();
      kern.notieren("stand", { felder: geaendert });
      return { ergebnis: { gemerkt: geaendert.length ? geaendert : "nichts Neues", stand: kern.standKurz() } };
    },

    async regionen_zaehlen(a, kern) {
      const p = kern.lauf.profil;
      await kern.denkpause(900, "sieht nach…");
      const bestand = Werkzeugkasten.katalog(p);
      const regionen = Werkzeugkasten.regionenInSaison(p.monat).map((z) => ({
        id: z.id, name: z.name, land: z.land, art: z.typ,
        haeuser: bestand.filter((h) => h.ziel === z.id && Werkzeugkasten.passtGruppe(h, p)).length,
        saison: p.monat ? (typeof saisonPassung === "function" && saisonPassung(z, p.monat) === 1 ? "Hauptsaison" : "Nebensaison") : null,
        kurz: z.kurz,
      })).filter((r) => r.haeuser > 0).sort((x, y) => y.haeuser - x.haeuser);
      const gesamt = regionen.reduce((n, r) => n + r.haeuser, 0);
      kern.notieren("vorabsuche", { regionen: regionen.map((r) => `${r.id}:${r.haeuser}`), gesamt, weg: "katalog" });
      return {
        ergebnis: { hinweis: "Haeuser, die im Zeitraum fuer die Gruppe buchbar sind - noch ohne Wuensche wie Pool oder Strand.", insgesamt: gesamt, regionen },
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

    /* Suchen: im Katalog (Stufe vorschlagen) oder sichtbar auf der Seite.
       Auf der Seite in drei Stufen: (1) Suchmaske einstellen und
       abschicken - laedt die Trefferliste; (2) Filter und Sortierung;
       Ergebnis lesen. */
    async suchen(a, kern, stufe) {
      const p = kern.lauf.profil;
      // Filter aus dem Aufruf in den Stand uebernehmen
      if (a.ziel && typeof ZIEL_NACH_ID !== "undefined" && ZIEL_NACH_ID[String(a.ziel).toLowerCase()]) p.zielId = String(a.ziel).toLowerCase();
      if (a.maxPreis) p.maxPreis = a.maxPreis;
      if (a.maxStrandMeter != null) p.maxStrand = Math.round(a.maxStrandMeter) / 1000;
      if (a.mindestbewertung) p.mindestbewertung = a.mindestbewertung;
      if (a.mindestSterne) p.mindestSterne = a.mindestSterne;
      if (Array.isArray(a.ausstattung)) p.ausstattung = a.ausstattung;
      if (a.sortierung) p.sortierung = a.sortierung;
      kern.standAnzeigen();

      const zeitraum = Werkzeugkasten.zeitraum(p);
      const filter = Werkzeugkasten.filterAusStand(p);
      const treffer = (liste) => liste.slice(0, 8).map((h) => Werkzeugkasten.kompakt(h, p));
      const sortiere = (liste) => {
        const nach = p.sortierung || "passung";
        if (nach === "preis") return liste.sort((x, y) => Werkzeugkasten.preis(x, p.monat) - Werkzeugkasten.preis(y, p.monat));
        if (nach === "bewertung") return liste.sort((x, y) => (y.rating || 0) - (x.rating || 0));
        const weich = { kriterien: p.kriterien || [], budget: p.budget || null };
        const bewertet = typeof Politik !== "undefined" ? Politik.bewerten(liste.map((h) => ({ id: h.id, preis: Werkzeugkasten.preis(h, p.monat) })), weich) : [];
        const rang = new Map(bewertet.map((k, i) => [k.id, i]));
        return liste.sort((x, y) => (rang.get(x.id) ?? 99) - (rang.get(y.id) ?? 99));
      };

      // Katalogsuche (immer als Grundlage, auch fuer die Sperre bei 0)
      const imKatalog = sortiere(Werkzeugkasten.katalogTreffer(p, filter));

      if (!kern.darf("suchen")) {
        kern.lauf.letzteTreffer = imKatalog.map((h) => h.id);
        kern.lauf.runde = (kern.lauf.runde || 0) + 1;
        kern.notieren("suche", { weg: "katalog", treffer: imKatalog.length, filter: Werkzeugkasten.filterText(p) });
        return {
          ergebnis: { weg: "Katalog, ohne die Seite zu bedienen", gesuchtMit: Werkzeugkasten.filterText(p), trefferGesamt: imKatalog.length, treffer: treffer(imKatalog),
            hinweis: imKatalog.length ? "Waehle zwei bis drei fuer auswahl_vorlegen." : "Nichts gefunden - lockere eine Vorgabe (Strand, Preis, Ausstattung) und such noch einmal, sag der Person, was du lockerst." },
          log: `Im Katalog gesucht (${Werkzeugkasten.filterText(p)}): ${imKatalog.length} Treffer`,
        };
      }

      // Seite bedienen
      const seite = Werkzeuge.seite();
      if (stufe === 1) {
        if (!Werkzeuge.hatSuchmaske()) {
          // Auf Detail- oder Buchungsseite: erst zur Startseite
          await Werkzeuge.zurStartseite();
          return { navigiert: true, stufe: 1 };
        }
        kern.sperreAn();
        const ziel = p.zielId && typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[p.zielId]?.name : "";
        const e = await Werkzeuge.suchen({ typ: p.typ || "hotel", ziel: ziel || "", von: zeitraum.von, bis: zeitraum.bis, erwachsene: p.erwachsene, kinder: p.kinder });
        if (!e.ok) { kern.sperreAus(); return { ergebnis: { fehler: e.text } }; }
        kern.logZeile(`Suchmaske gesetzt: ${[ziel, p.typ === "apartment" ? "Ferienwohnung" : "Hotel", zeitraum.von && `${zeitraum.von} bis ${zeitraum.bis}`, p.erwachsene != null && `${p.erwachsene} Erw.`, p.kinder ? `${p.kinder} Kinder` : null].filter(Boolean).join(", ")}`, "ergebnis");
        return { navigiert: true, stufe: 2 };
      }
      // Stufe 2: auf der Trefferliste
      if (seite !== "results") return { ergebnis: { fehler: "Die Trefferliste ist nicht offen." } };
      kern.sperreAn();
      const gesetzt = await Werkzeuge.filterSetzen({
        zielId: p.zielId || undefined,
        maxPreis: p.maxPreis || undefined,
        maxStrand: p.maxStrand != null ? ([0.2, 1, 5].find((s) => s >= p.maxStrand) ?? 5) : undefined,
        ausstattung: filter.ausstattung,
        mindestbewertung: p.mindestbewertung || undefined,
        sterne: p.mindestSterne ? [5, 4, 3].filter((s) => s >= p.mindestSterne) : undefined,
      });
      if (gesetzt.text) kern.logZeile(gesetzt.text, "ergebnis");
      const nach = p.sortierung === "preis" ? "preis-asc" : "rating";
      await Werkzeuge.sortieren(nach);
      const gelesen = await Werkzeuge.ergebnisseLesen(8);
      kern.sperreAus();
      const seitenIds = (gelesen.daten?.treffer || []).map((t) => t.id);
      // Reihenfolge nach Passung, aber nur Haeuser, die die Seite zeigt
      const liste = seitenIds.length
        ? sortiere(seitenIds.map((id) => getItemById(id)).filter(Boolean))
        : [];
      kern.lauf.letzteTreffer = liste.map((h) => h.id);
      kern.lauf.runde = (kern.lauf.runde || 0) + 1;
      const gesamt = Werkzeuge.zustand().trefferGesamt ?? liste.length;
      kern.notieren("suche", { weg: "seite", treffer: gesamt, filter: Werkzeugkasten.filterText(p) });
      return {
        ergebnis: { weg: "Seite bedient, Trefferliste steht", gesuchtMit: Werkzeugkasten.filterText(p), trefferGesamt: gesamt, treffer: treffer(liste),
          hinweis: liste.length ? "Waehle zwei bis drei fuer auswahl_vorlegen." : "Nichts gefunden - lockere eine Vorgabe (Strand, Preis, Ausstattung) und such noch einmal, sag der Person, was du lockerst." },
        log: `Trefferliste gelesen: ${gesamt} Treffer (${Werkzeugkasten.filterText(p)})`,
      };
    },

    async haus_details(a, kern) {
      const item = typeof getItemById === "function" ? getItemById(a.id) : null;
      if (!item) return { ergebnis: { fehler: `${a.id} kenne ich nicht.` } };
      const p = kern.lauf.profil;
      await kern.denkpause(700, "liest nach…");
      const k = Werkzeugkasten.kompakt(item, p);
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
            jeVerpflegung: (item.boards || []).map((b) => ({
            verpflegung: (typeof BOARD_LABELS !== "undefined" && BOARD_LABELS[b.key]) || b.key,
            proNachtUndZimmer: proNacht + zimmerAufpreis + (b.priceDelta || 0),
            ...(naechte ? { gesamtInklGebuehr: (proNacht + zimmerAufpreis + (b.priceDelta || 0)) * naechte * zimmer + gebuehr } : {}),
          })), weitereZimmer: (item.rooms || []).filter((r) => r !== passend).map((r) => ({ name: r.name, bisPersonen: r.maxGuests, aufpreisProNacht: r.priceDelta })) };
      const kurz = typeof aspektKurzfassung === "function" ? aspektKurzfassung(item) : null;
      kern.notieren("haus_genannt", { id: item.id, absicht: "details" });
      return {
        ergebnis: {
          ...k, beschreibung: item.shortDescription, highlights: (item.highlights || []).slice(0, 4),
          kmZumZentrum: item.distanceToCenter ?? null, kmZumFlughafen: item.distanceToAirport ?? null,
          preise: { hinweis: naechte ? `fuer ${naechte} Naechte, ${zimmer} Zimmer, ${personen || "?"} Personen - Preise nur so nennen, nicht rechnen` : "Naechte unbekannt, daher kein Gesamtpreis", ...preise },
          ...(p.budgetGesamt ? { budgetGesamt: p.budgetGesamt } : {}),
          bewertungen: kurz ? { anzahl: item.reviewCount, jeAspekt: (kurz.bilanz || []).slice(0, 6).map((x) => ({ aspekt: x.label, prozentPositiv: Math.round(x.anteilPositiv * 100), erwaehnungen: x.erwaehnungen })) } : null,
          haeltGemerkteVorgabenEin: typeof Politik !== "undefined" ? Politik.erfuellt(item, proNacht, p) : null,
        },
        log: `${item.name} nachgeschlagen`,
      };
    },

    async auswahl_vorlegen(a, kern) {
      const ids = (a.ids || []).filter((id) => typeof getItemById === "function" && getItemById(id)).slice(0, 3);
      if (!ids.length) return { ergebnis: { fehler: "Keine gueltigen Haus-ids." } };
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
      return {
        ergebnis: { geoeffnet: item.name, id: item.id, bewertungenAusgewertet: d.anzahl ?? item.reviewCount,
          gelobt: d.gelobt || [], kritisiert: d.kritisiert || [],
          jeAspekt: (d.bilanz || []).slice(0, 6).map((x) => ({ aspekt: x.aspekt || x.label, prozentPositiv: Math.round((x.anteilPositiv ?? 0) * 100), erwaehnungen: x.erwaehnungen })),
          hinweis: "Die Person sieht die Seite jetzt. Fass in zwei, drei Saetzen zusammen, was fuer sie wichtig ist, und frag, ob du vormerken, buchen (je nach Freigabe) oder zurueck sollst." },
        log: `${item.name} geöffnet, ${d.anzahl ?? item.reviewCount} Bewertungen gelesen`,
      };
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
      const item = typeof getItemById === "function" ? getItemById(a.id) : null;
      if (!item) return { ergebnis: { fehler: `${a.id} kenne ich nicht.` } };
      const seite = Werkzeuge.seite();
      const idHier = new URLSearchParams(location.search).get("id");
      kern.lauf.gewaehlt = a.id;
      if (a.verpflegung) kern.lauf.profil.verpflegung = a.verpflegung;
      if (stufe === 1) {
        kern.notieren("zur_buchung", { id: a.id });
        if (seite === "checkout" && idHier === a.id) return this.werkzeuge.buchung_vorbereiten.call(this, a, kern, 3);
        if (seite === "stay" && idHier === a.id) return this.werkzeuge.buchung_vorbereiten.call(this, a, kern, 2);
        kern.sperreAn();
        const e = await Werkzeuge.unterkunftOeffnen(a.id);
        if (!e.ok) { await Zeiger.warte(300); location.href = kern.linkZu(a.id, item.name).href; }
        return { navigiert: true, stufe: 2 };
      }
      if (stufe === 2) {
        if (seite !== "stay") return { ergebnis: { fehler: "Die Hausseite ist nicht offen." } };
        kern.sperreAn();
        const e = await Werkzeuge.zurBuchung(a.id, kern.lauf.profil.verpflegung || null);
        if (!e.ok) { kern.sperreAus(); return { ergebnis: { fehler: e.text } }; }
        return { navigiert: true, stufe: 3 };
      }
      // Stufe 3: Buchungsstrecke
      if (seite !== "checkout") return { ergebnis: { fehler: "Die Buchungsstrecke ist nicht offen." } };
      kern.sperreAn();
      const vor = await Werkzeuge.buchungAbschliessen({ nurVorbereiten: true });
      kern.sperreAus();
      if (vor.daten?.wartetAufDaten || !vor.ok) {
        return { ergebnis: { fehler: vor.text, hinweis: "Sag der Person, was fehlt; sie traegt es selbst ein." }, log: vor.text };
      }
      kern.notieren("buchung_vorbereitet", { id: a.id });
      const z = Werkzeuge.buchungsZusammenfassung();
      if (!kern.darf("buchen")) kern.notieren("gegenzeichnung_vorgelegt", { id: a.id });
      return {
        ergebnis: { vorbereitet: true, zusammenfassung: z,
          hinweis: kern.darf("buchen")
            ? "Du darfst abschliessen: Sag in einem Satz, was du buchst (Haus, Zeitraum, Gesamtpreis, Name), und ruf buchung_abschliessen im selben Zug."
            : "Leg der Person vor, was gebucht wuerde (Haus, Zeitraum, Gesamtpreis, Name), und frag, ob du abschliessen sollst. Erst nach einem klaren Ja buchung_abschliessen rufen." },
        log: `Buchung vorbereitet: ${z?.titel || item.name}, ${z?.gesamt || ""}`,
      };
    },

    async buchung_abschliessen(a, kern) {
      if (Werkzeuge.seite() !== "checkout") return { ergebnis: { fehler: "Es ist keine Buchung vorbereitet. Ruf erst buchung_vorbereiten." } };
      const autonom = kern.darf("buchen");
      if (autonom) {
        // Frist zum Widerruf: Die Person hat gerade gelesen, was gebucht wird
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
      return { ergebnis: { gebucht: !!e.daten?.gebucht, text: e.text, hinweis: "Sag in einem Satz, dass es erledigt ist. Es wurde nichts wirklich gebucht (Prototyp) - das steht auf der Seite, du musst es nicht betonen." }, log: e.text };
    },

    async freigabe_aendern(a, kern) {
      if (!FREIGABE_RANG.hasOwnProperty(a.stufe)) return { ergebnis: { fehler: "Unbekannte Stufe." } };
      kern.freigabeSetzen(a.stufe, "gespraech");
      const f = FREIGABE.find((x) => x.id === a.stufe);
      return { ergebnis: { freigabe: a.stufe, bedeutet: f?.lang } };
    },
  },

  /* ==================================================================
     Stand -> Suche
     ================================================================== */
  zeitraum(p) {
    if (p.von && p.bis) return { von: p.von, bis: p.bis };
    if (typeof Politik !== "undefined") return Politik.zeitraum(p.monat, p.naechte || 7);
    return { von: "", bis: "" };
  },

  filterAusStand(p) {
    const ausstattung = new Set(p.ausstattung || []);
    for (const { id } of p.kriterien || []) {
      const k = typeof Politik !== "undefined" ? Politik.kriterium(id) : null;
      if (k?.filter?.ausstattung) ausstattung.add(k.filter.ausstattung);
    }
    return { ausstattung: [...ausstattung] };
  },

  filterText(p) {
    const t = [];
    if (p.zielId && typeof ZIEL_NACH_ID !== "undefined") t.push(ZIEL_NACH_ID[p.zielId]?.name);
    if (p.typ === "apartment") t.push("Ferienwohnung");
    if (p.maxPreis) t.push(`bis ${p.maxPreis} €/Nacht`);
    if (p.maxStrand != null) t.push(`Strand bis ${p.maxStrand < 1 ? `${Math.round(p.maxStrand * 1000)} m` : `${p.maxStrand} km`}`);
    if (p.mindestbewertung) t.push(`Note ab ${String(p.mindestbewertung).replace(".", ",")}`);
    if (p.mindestSterne) t.push(`ab ${p.mindestSterne} Sterne`);
    const f = this.filterAusStand(p);
    if (f.ausstattung.length) t.push(f.ausstattung.map((x) => (typeof AMENITY_LABELS !== "undefined" && AMENITY_LABELS[x]) || x).join(", "));
    return t.filter(Boolean).join(", ") || "ohne Filter";
  },

  katalogTreffer(p, filter) {
    return this.katalog(p).filter((h) => {
      if (p.zielId && h.ziel !== p.zielId) return false;
      if (filter.ausstattung.some((x) => !(h.amenities || []).includes(x))) return false;
      if (!this.passtGruppe(h, p)) return false;
      const preis = this.preis(h, p.monat);
      if (p.maxPreis && preis > p.maxPreis) return false;
      if (p.maxStrand != null && (h.distanceToBeach ?? 99) > p.maxStrand) return false;
      if (p.mindestbewertung && (h.rating || 0) < p.mindestbewertung) return false;
      if (p.mindestSterne && (h.stars || 0) < p.mindestSterne) return false;
      return true;
    });
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Werkzeugkasten };
