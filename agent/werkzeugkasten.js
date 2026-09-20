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
          monat: zahl("Reisemonat 1-12. Ein Monat allein heisst: flexibel im Monat, ohne festes Datum."),
          von: text("Anreise als YYYY-MM-DD - nur, wenn die Person einen Tag nennt ('vom 12. bis 26.'). Aus 'im Oktober' wird kein Datum."),
          bis: text("Abreise als YYYY-MM-DD - nur bei genannten Tagen"),
          anreise: text("Anreisetag als YYYY-MM-DD, wenn die Person ihn fuer die Buchung nennt (bei flexibler Suche)"),
          zielOffen: { type: "boolean", description: "true, wenn die Person sagt, dass das Ziel noch offen ist oder sie sich beraten lassen will" },
          einstieg: { type: "string", enum: ["ueberblick", "eckdaten"], description: "Antwort auf die Einstiegsfrage: erst ein Ueberblick, was es gibt, oder erst die Eckdaten" },
          artEgal: { type: "boolean", description: "true, wenn die Person bei Hotel oder Ferienwohnung nicht festgelegt ist" },
          vorgehen: { type: "string", enum: ["top3", "selbst"], description: "top3 = du sollst drei Favoriten nennen; selbst = du stellst die Filter ein und die Person schaut selbst durch die Liste" },
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
          preisEgal: { type: "boolean", description: "true, wenn die Person sagt, dass der Preis keine Rolle spielt oder sie keinen Rahmen nennen will" },
          bewertungEgal: { type: "boolean", description: "true, wenn die Person sagt, dass Bewertung oder Sterne ihr egal sind" },
          strandEgal: { type: "boolean", description: "true, wenn die Person sagt, dass die Naehe zum Strand egal ist" },
          verpflegungEgal: { type: "boolean", description: "true, wenn Verpflegung egal ist" },
          ausstattungEgal: { type: "boolean", description: "true, wenn die Person auf die Frage nach ihren Wuenschen sagt, dass sie nichts Besonderes braucht" },
          wuensche: { type: "array", items: { type: "string", enum: ["pool", "strandnah", "kinderclub", "familie", "wellness", "ruhe", "essen", "sauberkeit", "lage", "service", "preis", "bewertung"] }, description: "Was der Person wichtig ist" },
          verpflegung: { type: "string", enum: ["ohne", "fruehstueck", "halb", "voll", "ai"], description: "Gewuenschte Verpflegung" },
          flug: { type: "boolean", description: "true, wenn ein Flug dazu gewuenscht ist; false, wenn nur die Unterkunft" },
          flugAb: text("Abflughafen, wenn genannt (Hamburg, Stuttgart, Düsseldorf, Hannover, München, Köln, Frankfurt, Berlin - was die Seite anbietet)"),
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
        "Sucht nach den gemerkten Angaben (Ziel, Zeit, Reisende, Art) und den genannten Filtern. Bei Freigabe ab 'suchen' bedient es sichtbar die Seite, sonst den Katalog. Du darfst es jederzeit rufen, auch frueh und ohne Ziel: Solange die Beratung nicht abgeschlossen ist, liefert es die Lage (wie viele Haeuser, wo, Preisspanne, was es gibt) statt einzelner Haeuser. Hat die Person 'top3' gewaehlt, legt es die drei passendsten Haeuser gleich im Chat vor.",
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
        "Geht fuer ein Haus in die Buchungsstrecke, traegt die Gastdaten aus dem Konto ein und bleibt auf der Pruefseite stehen (Freigabe ab 'vorbereiten'). Bei flexibler Suche braucht es den Anreisetag - frag die Person vorher danach. Liefert die Zusammenfassung, die die Person sieht.",
        {
          id: text("Haus-id"),
          verpflegung: { type: "string", enum: ["ohne", "fruehstueck", "halb", "voll", "ai"], description: "Gewuenschte Verpflegung, falls genannt" },
          anreise: text("Anreisetag als YYYY-MM-DD (Pflicht bei flexibler Suche; die Person nennt ihn)"),
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
      const geaendert = [];
      const setze = (feld, wert) => { if (wert !== undefined && wert !== null && wert !== "") { if (p[feld] !== wert) geaendert.push(feld); p[feld] = wert; } };
      const gesagt = (muster) => kern.lauf.gespraech.filter((n) => n.role === "user").slice(-3).some((n) => muster.test(String(n.content)));
      if (a.ziel !== undefined) {
        const id = String(a.ziel).toLowerCase().trim();
        if (!id) { p.zielId = null; }
        else if (typeof ZIEL_NACH_ID !== "undefined" && ZIEL_NACH_ID[id]) { setze("zielId", id); p.zielOffen = false; }
        else {
          const z = (typeof ZIELE !== "undefined" ? ZIELE : []).find((x) => x.name.toLowerCase() === id);
          if (z) { setze("zielId", z.id); p.zielOffen = false; }
        }
      }
      if (a.zielOffen !== undefined && !p.zielId) setze("zielOffen", !!a.zielOffen);
      if (a.einstieg) setze("einstieg", a.einstieg);
      setze("monat", a.monat);
      // Feste Daten nur, wenn die Person einen Tag genannt hat. Aus "im
      // Oktober" machte das Modell sonst einen Zeitraum - und die Maske
      // zeigte Daten, die nie jemand gesagt hat.
      if (a.von && a.bis) {
        if (gesagt(/\b\d{1,2}\.\s*(\d{1,2}\.|[a-zäöü]{3,})|\d{4}-\d{2}-\d{2}|\b(vom|ab|am)\s+\d{1,2}\b/i)) {
          setze("von", a.von); setze("bis", a.bis);
          const n = Math.round((new Date(a.bis) - new Date(a.von)) / 86400000);
          if (n > 0 && n < 60 && !a.naechte) setze("naechte", n);
          if (!a.monat) setze("monat", new Date(a.von).getMonth() + 1);
        } else {
          kern.notieren("datum_verworfen", { von: a.von, bis: a.bis });
          if (!a.monat) setze("monat", new Date(a.von).getMonth() + 1);
        }
      }
      // Ohne feste Daten wird flexibel im Monat gesucht - keine Entscheidung
      // des Modells, sondern die einzige Lesart von "im Oktober"
      p.flexibel = !(p.von && p.bis);
      setze("naechte", a.naechte);
      setze("personen", a.personenGesamt);
      setze("erwachsene", a.erwachsene); setze("kinder", a.kinder);
      if (Array.isArray(a.kinderAlter)) setze("kinderAlter", a.kinderAlter.filter((x) => Number.isInteger(x) && x >= 0 && x < 18).slice(0, 6));
      // Rechnen tut der Kern, nicht das Modell: "zu viert" und "2 Kinder"
      // ergibt 2 Erwachsene, ohne Nachfrage
      if (p.personen != null) {
        if (p.kinder != null && p.erwachsene == null) { p.erwachsene = Math.max(1, p.personen - p.kinder); geaendert.push("erwachsene"); }
        else if (p.erwachsene != null && p.kinder == null) { p.kinder = Math.max(0, p.personen - p.erwachsene); geaendert.push("kinder"); }
      }
      if (p.erwachsene != null && p.kinder != null) p.personen = p.erwachsene + p.kinder;
      if (p.kinder === 0) p.kinderAlter = [];
      if (p.kinder > 0 && (p.kinderAlter || []).length > p.kinder) p.kinderAlter = p.kinderAlter.slice(0, p.kinder);
      if (a.typ) { setze("typ", a.typ); p.artGenannt = true; p.artEgal = false; }
      if (a.artEgal !== undefined && !p.artGenannt) { setze("artEgal", !!a.artEgal); if (p.artEgal && !p.typ) p.typ = "hotel"; }
      setze("zimmer", a.zimmer);
      setze("maxPreis", a.maxPreis); setze("budgetGesamt", a.budgetGesamt);
      if (a.maxPreis || a.budgetGesamt) p.preisEgal = false;
      if (a.maxStrandMeter != null) setze("maxStrand", Math.round(a.maxStrandMeter) / 1000);
      setze("mindestbewertung", a.mindestbewertung); setze("mindestSterne", a.mindestSterne);
      setze("anreise", a.anreise);
      for (const f of ["preisEgal", "bewertungEgal", "strandEgal", "verpflegungEgal", "ausstattungEgal"]) if (a[f] !== undefined) setze(f, !!a[f]);
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
      if (a.flugAb && typeof Flug !== "undefined" && !Flug.code(a.flugAb)) { p.flugAb = null; geaendert.push("flugAb unbekannt"); }
      if ((a.flug !== undefined || a.flugAb || a.flugKlasse) && typeof Flug !== "undefined") {
        Flug.set({ mit: !!p.flug, ab: Flug.code(p.flugAb), klasse: p.flugKlasse || "economy" });
      }
      if (a.vorgehen) { setze("vorgehen", a.vorgehen); kern.notieren("vorgehen", { wahl: a.vorgehen, freigabe: kern.freigabe() }); }
      // Budget fuer die ganze Reise in einen Preis pro Nacht umrechnen,
      // wie auf der Seite gerechnet wird (Servicegebuehr 35 Euro)
      if (p.budgetGesamt && p.naechte && !a.maxPreis) {
        p.maxPreis = Math.floor((p.budgetGesamt - 35 * Math.max(1, p.zimmer || 1)) / (p.naechte * Math.max(1, p.zimmer || 1)));
      }
      kern.standAnzeigen();
      kern.notieren("stand", { felder: geaendert });
      const fp = Werkzeugkasten.fahrplan(p, kern.lauf);
      return { ergebnis: { gemerkt: geaendert.length ? geaendert : "nichts Neues", stand: kern.standKurz(), ...Werkzeugkasten.fahrplanFuerModell(fp, p) } };
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
      kern.lauf.ueberblickGezeigt = true;
      kern.notieren("vorabsuche", { regionen: regionen.map((r) => `${r.id}:${r.haeuser}`), gesamt, weg: "katalog" });
      return {
        ergebnis: { hinweis: "Haeuser, die im Zeitraum fuer die Gruppe buchbar sind - noch ohne Wuensche wie Pool oder Strand. Schildere die Lage in drei Saetzen (Regionen mit Zahlen, dein Wissen zu Klima und Art der Ziele darfst du dazunehmen), dann das naechste Thema.", insgesamt: gesamt, regionen,
          ...Werkzeugkasten.fahrplanFuerModell(Werkzeugkasten.fahrplan(p, kern.lauf), p) },
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
      // Filter aus dem Aufruf in den Stand uebernehmen
      if (a.ziel && typeof ZIEL_NACH_ID !== "undefined" && ZIEL_NACH_ID[String(a.ziel).toLowerCase()]) { p.zielId = String(a.ziel).toLowerCase(); p.zielOffen = false; }
      if (a.maxPreis) p.maxPreis = a.maxPreis;
      if (a.maxStrandMeter != null) p.maxStrand = Math.round(a.maxStrandMeter) / 1000;
      if (a.mindestbewertung) p.mindestbewertung = a.mindestbewertung;
      if (a.mindestSterne) p.mindestSterne = a.mindestSterne;
      if (Array.isArray(a.ausstattung)) p.ausstattung = a.ausstattung;
      if (a.sortierung) p.sortierung = a.sortierung;
      if (!p.typ) p.typ = "hotel";
      kern.standAnzeigen();

      const fp = Werkzeugkasten.fahrplan(p, kern.lauf);
      const fest = !!(p.von && p.bis);
      const flex = fest ? null : Werkzeugkasten.flexWahl(p);
      const zeitraum = Werkzeugkasten.zeitraum(p);
      const filter = Werkzeugkasten.filterAusStand(p);
      const darfEmpfehlen = fp.empfehlungBereit;
      const selbst = p.vorgehen === "selbst" && fp.fertig.preis && fp.fertig.wuensche;
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
      const zeitText = fest ? `${zeitraum.von} bis ${zeitraum.bis}` : (flex ? `flexibel im ${flex.monat}, ${flex.naechte} Naechte` : "Zeit noch offen");

      // Was das Modell zurueckbekommt
      const antwort = async (liste, weg, gesamt) => {
        const umfang = Werkzeugkasten.umfang(liste, p);
        const basis = { weg, gesuchtMit: Werkzeugkasten.filterText(p), zeitraum: zeitText, trefferGesamt: gesamt ?? liste.length, lage: umfang };
        kern.lauf.gesuchtMit = fp.schluessel;
        if (selbst) {
          kern.lauf.vorgehenFuer = fp.schluessel + p.vorgehen;
          kern.lauf.letzteTreffer = liste.map((h) => h.id);
          kern.notieren("selbst_gesucht", { treffer: liste.length, filter: Werkzeugkasten.filterText(p), freigabe: kern.freigabe() });
          return { ...basis, haeuser: "nicht noetig - die Person schaut selbst",
            hinweis: kern.darf("suchen")
              ? "Die Filter stehen auf der Seite. Sag der Person in einem Satz, dass die Liste jetzt so eingestellt ist und sie in Ruhe schauen kann; du bist da, wenn sie etwas wissen will. Keine Frage noetig."
              : "Du darfst die Seite nicht bedienen. Nenn der Person in einem Satz, welche Filter sie setzen kann (gesuchtMit), damit sie selbst schaut." };
        }
        if (!darfEmpfehlen) {
          return { ...basis, haeuser: "noch nicht - erst die Beratung",
            hinweis: fp.phase === "suche" || !fp.gesucht
              ? "Schildere die Lage in zwei, drei Saetzen: wie viele Haeuser, in welchen Regionen (mit Zahlen), Preisspanne pro Nacht - dein Wissen zu Klima und Art der Regionen darfst du dazunehmen. Dann das naechste Thema."
              : "Nenn, was sich an der Lage geaendert hat (Zahlen), dann das naechste Thema.",
            ...Werkzeugkasten.fahrplanFuerModell(Werkzeugkasten.fahrplan(p, kern.lauf), p) };
        }
        // Beratung abgeschlossen: die drei passendsten Haeuser gleich vorlegen
        kern.lauf.letzteTreffer = liste.map((h) => h.id);
        kern.lauf.vorgehenFuer = fp.schluessel + p.vorgehen;
        if (!liste.length) {
          return { ...basis, treffer: [], hinweis: "Nichts gefunden - lockere eine Vorgabe (Strand weiter, Preis hoeher, Ausstattung weglassen), sag der Person, was du lockerst, und such noch einmal." };
        }
        const vs = Werkzeugkasten.vorlageSchluessel(p);
        if (kern.lauf.vorlageFuer === vs && kern.lauf.letzteVorlage?.length) {
          return { ...basis, treffer: treffer(liste), hinweis: "Diese Haeuser hast du mit denselben Vorgaben schon vorgelegt. Nichts wiederholen - geh auf die Frage der Person ein." };
        }
        kern.lauf.vorlageFuer = vs;
        const v = await kern.auswahlVorlegen(liste.slice(0, 3).map((h) => h.id));
        return { ...basis, weitereTreffer: treffer(liste.slice(3)), ...(v.ergebnis || {}) };
      };

      // Katalogsuche (immer als Grundlage)
      const imKatalog = sortiere(Werkzeugkasten.katalogTreffer(p, filter));
      const logUmfang = () => `${imKatalog.length} Haeuser (${Werkzeugkasten.filterText(p)})`;

      if (!kern.darf("suchen") || !fp.suchbereit) {
        kern.lauf.runde = (kern.lauf.runde || 0) + 1;
        kern.notieren("suche", { weg: "katalog", treffer: imKatalog.length, filter: Werkzeugkasten.filterText(p), empfehlung: darfEmpfehlen, grund: fp.suchbereit ? "freigabe" : `fehlt ${fp.fehlt.join(",")}` });
        const e = await antwort(imKatalog, fp.suchbereit ? "Katalog, ohne die Seite zu bedienen" : `Katalog, grob - die Maske braucht noch: ${fp.fehlt.join(", ")}`);
        return { ergebnis: e, log: `Im Katalog gesucht: ${logUmfang()}` };
      }

      // Seite bedienen
      const zielName = p.zielId && typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[p.zielId]?.name : "";
      const passtJetzt = () => {
        if (Werkzeuge.seite() !== "results") return false;
        const q = new URLSearchParams(location.search);
        const alter = (p.kinderAlter || []).join(",");
        return (q.get("type") || "hotel") === (p.typ || "hotel")
          && (q.get("q") || "") === (zielName || "")
          && (fest ? (q.get("from") === zeitraum.von && q.get("to") === zeitraum.bis)
                   : (q.get("flex") === "1" && q.get("monat") === flex.monat && +q.get("nights") === +flex.naechte))
          && +(q.get("adults") || 2) === +p.erwachsene && +(q.get("children") || 0) === +p.kinder
          && (!p.kinder || (q.get("ages") || "") === alter)
          && (p.flug == null || (q.get("flight") || "0") === (p.flug ? "1" : "0"))
          && (!p.flug || !p.flugAb || (q.get("ab") || "") === (typeof Flug !== "undefined" ? Flug.code(p.flugAb) : ""));
      };
      const maskeText = () => [zielName, p.typ === "apartment" ? "Ferienwohnung" : "Hotel",
        fest ? `${zeitraum.von} bis ${zeitraum.bis}` : `${flex.monat}, ${flex.naechte} Nächte, Datum offen`,
        `${p.erwachsene} Erw.`, p.kinder ? `${p.kinder} ${p.kinder === 1 ? "Kind" : "Kinder"} (${(p.kinderAlter || []).join(", ")} J.)` : null,
        p.flug ? `mit Flug${p.flugAb ? ` ab ${p.flugAb}` : ""}` : null].filter(Boolean).join(", ");

      if (stufe === 1) {
        const seite = Werkzeuge.seite();
        // Die Art (Hotel oder Ferienwohnung) laesst sich nur auf der
        // Startseite umstellen - auf der Trefferliste sind die Reiter
        // ausgeblendet, und ein Klick darauf ging ins Leere (0/0)
        const artFalsch = seite === "results" && (new URLSearchParams(location.search).get("type") || "hotel") !== (p.typ || "hotel");
        if (!Werkzeuge.hatSuchmaske() || artFalsch) {
          await Werkzeuge.zurStartseite();
          return { navigiert: true, stufe: 1 };
        }
        // Steht die Maske schon so, wie sie sein soll, wird sie nicht noch
        // einmal ausgefuellt (sonst lief der Agent zweimal durch die Leiste)
        if (!passtJetzt()) {
          kern.sperreAn();
          const flug = p.flug != null ? { mit: !!p.flug, ab: typeof Flug !== "undefined" ? Flug.code(p.flugAb) : "", klasse: p.flugKlasse || "economy" } : null;
          if (flug && typeof Flug !== "undefined") Flug.set(flug);
          const e = await Werkzeuge.suchen({ typ: p.typ || "hotel", ziel: zielName || "", von: zeitraum.von, bis: zeitraum.bis,
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
      const gesetzt = await Werkzeuge.filterSetzen({
        zielId: p.zielId || undefined,
        maxPreis: p.maxPreis || undefined,
        maxStrand: p.maxStrand != null ? ([0.2, 1, 5].find((s) => s >= p.maxStrand) ?? 5) : undefined,
        ausstattung: filter.ausstattung,
        mindestbewertung: p.mindestbewertung || undefined,
        sterne: p.mindestSterne ? [5, 4, 3].filter((s) => s >= p.mindestSterne) : undefined,
      });
      if (gesetzt.text) kern.logZeile(gesetzt.text, "ergebnis");
      const nach = p.sortierung === "preis" ? "preis-asc" : (p.sortierung === "bewertung" ? "rating" : "preis-asc");
      await Werkzeuge.sortieren(nach);
      const gelesen = darfEmpfehlen ? await Werkzeuge.ergebnisseLesen(8) : { daten: { treffer: [] } };
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
      const offen = Werkzeugkasten.nochOffen(kern.lauf.profil, kern.lauf);
      if (offen.pflicht.length) {
        kern.notieren("vorlage_zu_frueh", { offen: offen.pflicht });
        return { ergebnis: { fehler: "noch nicht", nochZuBesprechen: offen.pflicht, hinweis: "Erst die Beratung zu Ende fuehren (Preis fest oder offen, Wuensche, Top 3 oder selbst schauen), dann vorlegen." } };
      }
      const ids = (a.ids || []).filter((id) => typeof getItemById === "function" && getItemById(id)).slice(0, 3);
      if (!ids.length) return { ergebnis: { fehler: "Keine gueltigen Haus-ids." } };
      kern.lauf.vorlageFuer = Werkzeugkasten.vorlageSchluessel(kern.lauf.profil);
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
      const flexibel = kern.lauf.profil.flexibel && !(kern.lauf.profil.von && kern.lauf.profil.bis);
      if (a.anreise) {
        // Bei flexibler Suche zaehlt nur der Tag - Monat und Jahr kommen aus
        // der Suche (das Modell setzte sonst das laufende Jahr ein)
        const fw = flexibel ? Werkzeugkasten.flexWahl(kern.lauf.profil) : null;
        const tag = parseInt(String(a.anreise).slice(-2), 10);
        kern.lauf.profil.anreise = fw && tag >= 1 && tag <= 31 ? `${fw.monat}-${String(tag).padStart(2, "0")}` : a.anreise;
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
          return { ergebnis: { fehler: "Kein Flugtag", gewuenscht: Flug.datumText(gewuenscht), verbindung, moeglicheAnreisetage: tage.slice(0, 8).map((d) => Flug.datumText(d)),
            hinweis: "Der gewuenschte Tag ist kein Flugtag. Sag der Person, wann die Verbindung fliegt, nenn zwei, drei moegliche Anreisetage und frag, welcher passt. Erst mit ihrem Tag buchung_vorbereiten mit anreise rufen." } };
        }
        if (!flexibel && !pf.anreise) pf.anreise = pf.von;
      }
      if (flexibel) {
        // Der Anreisetag muss von der Person kommen - das Modell hat ihn
        // sonst gern selbst gesetzt ("1. Oktober"). Geprueft wird, ob in
        // ihren letzten Nachrichten ueberhaupt ein Tag vorkommt.
        const tagGenannt = kern.lauf.gespraech.filter((n) => n.role === "user").slice(-4)
          .some((n) => /\b([1-9]|[12]\d|3[01])\.?\s*(oktober|november|dezember|januar|februar|märz|maerz|april|mai|juni|juli|august|september|\d{1,2}\.)|\b(am|ab dem|ab|vom)\s+([1-9]|[12]\d|3[01])\b|\d{4}-\d{2}-\d{2}/i.test(String(n.content)));
        if (!kern.lauf.profil.anreise || !tagGenannt) {
          kern.lauf.profil.anreise = null;
          const tage = flug && monatSchluessel && pf.naechte ? Flug.anreiseTage(flug, monatSchluessel, pf.naechte) : null;
          return { ergebnis: { fehler: "Anreisetag fehlt",
            ...(tage ? { verbindung: `${flug.airline} ab ${flug.from} fliegt ${Flug.tageText(flug, true)}`, moeglicheAnreisetage: tage.slice(0, 8).map((d) => Flug.datumText(d)) } : {}),
            hinweis: tage
              ? "Die Suche war flexibel im Monat. Frag die Person, an welchem der Flugtage sie anreisen will (nenn zwei, drei). Erst mit ihrem Tag buchung_vorbereiten mit anreise rufen - keinen Tag selbst waehlen."
              : "Die Suche war flexibel im Monat, und die Person hat noch keinen Tag genannt. Frag sie, an welchem Tag sie anreisen will (im Prototyp ist jeder Tag frei, der Preis im Monat gleich). Erst mit ihrem Tag buchung_vorbereiten mit anreise rufen - keinen Tag selbst waehlen." } };
        }
      }
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
        const e = await Werkzeuge.zurBuchung(a.id, kern.lauf.profil.verpflegung || null, kern.lauf.profil.anreise || null);
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
        // Ansage mit Frist zum Widerruf - fest formuliert, damit sie sicher
        // vor dem Klick steht und nennt, was gebucht wird
        const z = Werkzeuge.buchungsZusammenfassung();
        kern.sagen(z
          ? `Ich buche jetzt ${z.titel}, ${z.zeitraum}, ${z.gesamt} insgesamt, auf den Namen ${z.name}. Sag Stopp, wenn du das nicht willst.`
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
  THEMEN: {
    einstieg: { frage: "Ob sie erst einen Ueberblick moechte, was es ueberhaupt gibt, oder erst die Eckdaten klaeren will. Beides anbieten, nichts vorwegnehmen.", chips: "Erst ein Überblick | Erst die Eckdaten" },
    ziel: { frage: "Ob sie schon weiss, wohin es gehen soll, oder noch offen ist. 'Noch offen' ist eine gute Antwort (zielOffen true) - dann suchst du ueber alle Regionen.", chips: "Ich habe ein Ziel | Noch offen | Hauptsache warm" },
    zeit: { frage: "Wann es ungefaehr losgehen soll - ein Monat reicht. Feste Daten nur, wenn sie welche hat; nicht danach draengen. Ein Monat allein heisst flexibel im Monat.", chips: null },
    dauer: { frage: "Wie lange, ungefaehr ('eine Woche' = 7 Naechte, '10 Tage' = 10 Naechte).", chips: "Eine Woche | 10 Nächte | Zwei Wochen" },
    reisende: { frage: "Wer mitreist: Erwachsene und Kinder, bei Kindern gleich das Alter - in einer Frage.", chips: "Zu zweit | Familie mit Kindern | Allein" },
    kinderAlter: { frage: "Wie alt die Kinder sind (die Zahl der Kinder ist bekannt, nur das Alter fehlt).", chips: null },
    art: { frage: "Wie sie gern Urlaub macht: eher Hotel, eher Ferienwohnung, oder nicht festgelegt (artEgal true - dann faengst du bei Hotels an und sagst das spaeter beim Ueberblick).", chips: "Eher Hotel | Eher Ferienwohnung | Nicht festgelegt" },
    flug: { frage: "Ob ein Flug dazu soll oder nur die Unterkunft. Sag in einem Halbsatz dazu, dass mit Flug der Anreisetag von den Flugtagen der Verbindung abhaengt (nicht jede Verbindung fliegt taeglich).", chips: "Mit Flug | Nur die Unterkunft" },
    flugAb: { frage: "Von welchem Flughafen: Hamburg, Stuttgart, Duesseldorf, Hannover, Muenchen, Koeln, Frankfurt oder Berlin. Klasse nicht fragen - Economy ist gerechnet, sie kann es spaeter aendern.", chips: "Hamburg | Frankfurt | München | Düsseldorf" },
    preis: { frage: "Ob sie beim Preis schon eine feste Grenze hat (pro Nacht oder gesamt) oder erst mal sehen will, was es gibt. Nicht 'wie viel darf es kosten' fragen. Offen heisst preisEgal true - der Preis wird dann an den Haeusern entschieden. Nenn die Preisspanne aus der Lage dazu.", chips: "Feste Grenze | Erst mal schauen" },
    wuensche: { frage: "Was ihr am wichtigsten ist - offen, mit Beispielen aus der Lage (Strand, Pool, Kinderclub, gutes Essen, gute Bewertungen, Ruhe). Antworten werden Wuensche (wuensche); nur ausdrueckliche Grenzen ('mindestens 4,5', 'direkt am Strand') werden Filter. 'Nichts Besonderes' heisst ausstattungEgal true.", chips: "Strand | Pool | Gutes Essen | Gute Bewertungen" },
    vorgehen: { frage: "Ob du ihr deine drei Favoriten nennen sollst (vorgehen top3) oder die Filter einstellst und sie selbst durch die Liste schaut (vorgehen selbst). Beides gleichwertig anbieten.", chips: "Deine Top 3 | Filter einstellen, ich schaue selbst" },
  },

  // Schluessel der Eckdaten - aendert er sich, muss neu gesucht werden
  eckdatenSchluessel(p) {
    return JSON.stringify([p.zielId || null, p.monat || null, p.von || null, p.bis || null, p.naechte || null,
      p.erwachsene ?? null, p.kinder ?? null, p.kinderAlter || [], p.typ || "hotel", p.flug ?? null, p.flugAb || null, p.flugKlasse || null]);
  },

  // Schluessel der Vorgaben fuer eine Vorlage - gleiche Vorgaben, keine
  // zweite Vorlage derselben Haeuser
  vorlageSchluessel(p) {
    return this.eckdatenSchluessel(p) + JSON.stringify([p.maxPreis || null, p.maxStrand ?? null, p.mindestbewertung || null, p.mindestSterne || null,
      (p.kriterien || []).map((k) => k.id), p.ausstattung || [], p.verpflegung || null, p.sortierung || null]);
  },

  fahrplan(p, lauf = {}) {
    const b = lauf.besprochen || {};
    const kinderAlterOk = p.kinder == null || p.kinder === 0 || (p.kinderAlter || []).length >= p.kinder;
    const nichtsBekannt = !p.zielId && !p.zielOffen && !p.monat && !p.von && !p.naechte && p.erwachsene == null && p.personen == null && p.kinder == null && !p.artGenannt;
    const fertig = {
      einstieg: !!p.einstieg || !!b.einstieg || !nichtsBekannt,
      ziel: !!p.zielId || !!p.zielOffen,
      zeit: !!p.monat || !!(p.von && p.bis),
      dauer: !!p.naechte,
      reisende: p.erwachsene != null && p.kinder != null,
      kinderAlter: kinderAlterOk,
      art: !!p.artGenannt || !!p.artEgal,
      flug: p.flug != null || p.typ === "apartment",
      flugAb: !p.flug || !!p.flugAb || p.typ === "apartment",
      preis: !!(p.maxPreis || p.budgetGesamt || p.preisEgal || b.preis),
      wuensche: !!((p.kriterien || []).length || p.ausstattungEgal || b.wuensche),
      vorgehen: !!p.vorgehen,
    };
    const ECKDATEN = ["einstieg", "ziel", "zeit", "dauer", "reisende", "kinderAlter", "art", "flug", "flugAb"];
    const BERATUNG = ["preis", "wuensche", "vorgehen"];
    const suchbereit = fertig.zeit && fertig.dauer && fertig.reisende && fertig.kinderAlter;
    const eckdatenFertig = ECKDATEN.every((t) => fertig[t]);
    const schluessel = this.eckdatenSchluessel(p);
    const gesucht = lauf.gesuchtMit === schluessel;
    const ueberblickOffen = p.einstieg === "ueberblick" && !lauf.ueberblickGezeigt;
    let naechstes = ueberblickOffen ? null : (ECKDATEN.find((t) => !fertig[t]) || null);
    let phase = "eckdaten";
    if (ueberblickOffen) phase = "ueberblick";
    else if (!naechstes) {
      if (!gesucht) phase = "suche";
      else {
        naechstes = BERATUNG.find((t) => !fertig[t]) || null;
        phase = naechstes ? "beratung" : (p.vorgehen === "selbst" ? "selbst" : "vorschlaege");
      }
    }
    // Feinheit bei den Reisenden: was genau fehlt
    let frage = naechstes ? this.THEMEN[naechstes]?.frage : null;
    let chips = naechstes ? this.THEMEN[naechstes]?.chips : null;
    if (naechstes === "reisende") {
      if (p.erwachsene != null && p.kinder == null) { frage = "Ob Kinder mitreisen - und wenn ja, wie viele und wie alt."; chips = "Keine Kinder | Ein Kind | Zwei Kinder"; }
      else if (p.kinder != null && p.erwachsene == null) { frage = "Wie viele Erwachsene mitreisen."; chips = "Zwei Erwachsene | Ein Erwachsener"; }
    }
    return { fertig, naechstes, frage, chips, phase, suchbereit, eckdatenFertig, gesucht, schluessel, ueberblickOffen,
      empfehlungBereit: fertig.preis && fertig.wuensche && p.vorgehen === "top3",
      fehlt: ECKDATEN.filter((t) => !fertig[t]) };
  },

  // Welches Werkzeug der Kern erzwingt, wenn das Modell es nicht von
  // sich aus ruft: den Ueberblick, die erste Suche, die Suche nach der
  // Beratung. Null, wenn nichts ansteht.
  zwang(p, lauf = {}) {
    const fp = this.fahrplan(p, lauf);
    if (fp.ueberblickOffen) return "regionen_zaehlen";
    if (fp.eckdatenFertig && !fp.gesucht) return "suchen";
    if ((fp.phase === "vorschlaege" || fp.phase === "selbst") && lauf.vorgehenFuer !== fp.schluessel + p.vorgehen) return "suchen";
    return null;
  },

  // Der Fahrplan als Teil eines Werkzeugergebnisses (stand_merken, suchen)
  fahrplanFuerModell(fp, p) {
    if (fp.phase === "ueberblick") return { alsNaechstes: "Ruf regionen_zaehlen und schildere die Lage in drei Saetzen (Regionen mit Zahlen), dann frag das naechste Thema." };
    if (fp.naechstes) return { alsNaechstes: `Frag genau ein Thema: ${fp.naechstes}. ${fp.frage}`, ...(fp.chips ? { chipsBeispiel: fp.chips } : {}), nochOffen: fp.fehlt };
    if (fp.phase === "suche") return { alsNaechstes: "Alle Eckdaten sind da. Ruf suchen und schildere danach die Lage." };
    if (fp.phase === "selbst") return { alsNaechstes: "Die Person will selbst schauen. Ruf suchen (stellt die Filter), dann sag ihr, dass die Liste steht und du da bist." };
    return { alsNaechstes: "Beratung abgeschlossen. Ruf suchen - es legt die drei passendsten Haeuser gleich vor." };
  },

  // Rueckwaertskompatibel: Punkte, die vor einer Vorlage fehlen
  nochOffen(p, lauf = {}) {
    const fp = this.fahrplan(p, lauf);
    const pflicht = [];
    if (!fp.fertig.preis) pflicht.push("Preis (fest oder offen)");
    if (!fp.fertig.wuensche) pflicht.push("Wuensche");
    if (p.vorgehen !== "top3") pflicht.push("Vorgehen (Top 3 oder selbst schauen)");
    return { pflicht, soll: [] };
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
  flexWahl(p) {
    if (!p.monat) return null;
    const heute = new Date();
    let jahr = heute.getFullYear();
    if (p.monat < heute.getMonth() + 1) jahr += 1;
    return { monat: `${jahr}-${String(p.monat).padStart(2, "0")}`, naechte: p.naechte || 7, jahr };
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
