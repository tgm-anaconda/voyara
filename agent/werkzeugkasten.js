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
          preisEgal: { type: "boolean", description: "true, wenn die Person sagt, dass der Preis keine Rolle spielt oder sie keinen Rahmen nennen will" },
          bewertungEgal: { type: "boolean", description: "true, wenn die Person sagt, dass Bewertung oder Sterne ihr egal sind" },
          strandEgal: { type: "boolean", description: "true, wenn die Person sagt, dass die Naehe zum Strand egal ist" },
          verpflegungEgal: { type: "boolean", description: "true, wenn Verpflegung egal ist" },
          ausstattungEgal: { type: "boolean", description: "true, wenn die Person auf die Frage nach ihren Wuenschen sagt, dass sie nichts Besonderes braucht" },
          wuensche: { type: "array", items: { type: "string", enum: ["pool", "strand", "strandnah", "meerblick", "kinderclub", "familie", "wellness", "ruhe", "essen", "sauberkeit", "lage", "service", "preis", "bewertung"] }, description: "Was der Person wichtig ist (alle bisher genannten, nicht nur die neuen)" },
          ausstattung: { type: "array", items: { type: "string", enum: ["pool", "spa", "kidsClub", "familyFriendly", "beachfront", "wifi", "parking", "restaurant", "gym", "seaView"] }, description: "Nur, wenn die Person etwas als Bedingung nennt ('muss einen Pool haben', 'direkt am Strand' = beachfront). Ein Wunsch gehoert in wuensche, nicht hierher." },
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
      f("bewertungen_lesen",
        "Liest die Gaestebewertungen eines Hauses sichtbar durch und liefert Teilnoten je Aspekt (von 10), Lob und Kritik. Pflicht, bevor du etwas ueber Bewertungen sagst - Teilnoten, was Gaeste loben oder bemaengeln, wie gut Essen, Lage, Sauberkeit, Service oder Ruhe sind. Ausnahme: Du hast dieses Haus in diesem Gespraech schon gelesen.",
        {
          id: text("Haus-id"),
          aspekt: text("Worum es der Person geht, als Wort: Essen, Lage, Sauberkeit, Service, Ausstattung, Ruhe, Pool, Preis-Leistung. Leer lassen, wenn es um den Gesamteindruck geht."),
        }, ["id"]),
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
        { stufe: { type: "string", enum: ["suchen", "vorbereiten", "buchen"] } }, ["stufe"]),
    ];
  },

  // Welche Stufe ein Werkzeug mindestens braucht
  BRAUCHT: {
    haus_oeffnen: "suchen", zurueck_zur_liste: "suchen", merken: "suchen",
    haeuser_ansehen: "suchen",
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
      case "bewertungen_lesen": return `Lese die Bewertungen von ${haus(a.id)}${a.aspekt ? ` zum Thema ${a.aspekt}` : ""}`;
      case "haeuser_ansehen": return "Sehe mir die Häuser der Reihe nach an";
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
    return typeof preisImMonat === "function" ? preisImMonat(item, monat) : item.pricePerNight;
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
        const id = String(a.ziel).toLowerCase().trim();
        if (!id) { p.zielId = null; }
        else if (typeof ZIEL_NACH_ID !== "undefined" && ZIEL_NACH_ID[id]) { setze("zielId", id); p.zielOffen = false; }
        else {
          const z = (typeof ZIELE !== "undefined" ? ZIELE : []).find((x) => x.name.toLowerCase() === id);
          if (z) { setze("zielId", z.id); p.zielOffen = false; }
        }
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
      if (a.vorgehen && !gesagt(/selbst|selber|filter|drei|top|raussuch|such mir|vorschl|favorit|liste|schau|zeig|empfehl|wähl|waehl|aussuch/i, 1)) { verworfen.push("vorgehen"); delete a.vorgehen; }
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
          setze("richtung", th.id); p.zieleErlaubt = th.ziele.slice(); if (!p.zielId) p.zielOffen = true;
        } else kern.notieren("richtung_verworfen", { richtung: a.richtung });
      }
      if (a.weiter) { setze("weiter", a.weiter); kern.notieren("weiter", { wahl: a.weiter }); }
      // Ein Monat nur, wenn die Person einen genannt hat (oder eine
      // Jahreszeit) - auf "hauptsache warm" hatte das Modell Oktober gesetzt
      // Eine Jahreszeit ("im Winter") ist noch kein Monat - dann fragt der
      // Agent nach dem Monat; "egal" darf er selbst aufloesen
      if (a.monat && !p.monat && !gesagt(/januar|februar|märz|maerz|april|\bmai\b|juni|juli|august|september|oktober|november|dezember|\bjan\b|\bfeb\b|\bokt\b|\bnov\b|\bdez\b|ostern|pfingsten|weihnachten|silvester|nächsten monat|naechsten monat|\d{1,2}\.\s*\d{1,2}\.|\d{4}-\d{2}|egal|gleich|such du|du entscheid|dein vorschlag|nimm/i)) {
        kern.notieren("monat_verworfen", { monat: a.monat }); delete a.monat;
      }
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
      if (a.artEgal !== undefined && !p.artGenannt) { setze("artEgal", !!a.artEgal); if (p.artEgal && !p.typ) p.typ = "hotel"; }
      setze("zimmer", a.zimmer);
      // Geld gilt so, wie die Person es gesagt hat.
      // ------------------------------------------------------------------
      // "Insgesamt maximal 900 Euro fuers Hotel" wurde vom Modell in 225
      // Euro pro Nacht umgerechnet; die Umdeutung machte daraus ein
      // Gesamtbudget von 225, der Filter landete bei 48 Euro und es blieb
      // ein einziges Haus uebrig. Gerechnet wird deshalb nicht mehr: Der
      // Betrag aus der Nachricht zaehlt, und die Worte entscheiden, ob er
      // fuer die Nacht oder fuer den ganzen Aufenthalt gilt.
      const GESAMT_WORT = /insgesamt|gesamt|zusammen|komplett|alles in allem|maximal ausgeben|für(s| das| die)?\s*(hotel|unterkunft|reise|woche|wochenende)/i;
      if (a.maxPreis || a.budgetGesamt) {
        const letzteTexte = (kern.lauf.gespraech || []).filter((n) => n.role === "user").slice(-1).map((n) => String(n.content)).join(" ");
        const genannt = (letzteTexte.match(/(\d{1,3}(?:[.\s]\d{3})+|\d+)\s*(?:€|euro|eur\b)/gi) || [])
          .map((x) => parseInt(x.replace(/[^\d]/g, ""), 10)).filter((n) => n > 0);
        const wert = genannt.length ? genannt[genannt.length - 1] : null;
        const proNachtGesagt = /pro nacht|je nacht|die nacht|nachtpreis|pro übernachtung|pro uebernachtung/i.test(letzteTexte);
        if (wert && GESAMT_WORT.test(letzteTexte) && !proNachtGesagt) {
          if (a.budgetGesamt !== wert || a.maxPreis) kern.notieren("budget_umgedeutet", { gesagt: wert, modell: a.budgetGesamt || a.maxPreis });
          a.budgetGesamt = wert; delete a.maxPreis;
        } else if (wert && a.maxPreis && a.maxPreis !== wert && !a.budgetGesamt) {
          // Das Modell hat gerechnet, wo nichts zu rechnen war
          kern.notieren("preis_korrigiert", { gesagt: wert, modell: a.maxPreis });
          a.maxPreis = wert;
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
      // Monat und Jahr kommen aus der Suche, nicht vom Modell - aus "16. Okt."
      // wurde sonst gern der 16. des laufenden Monats.
      if (a.anreise) {
        const fw = Werkzeugkasten.flexWahl(p);
        const tag = parseInt(String(a.anreise).slice(-2), 10);
        if (fw && tag >= 1 && tag <= 31) a.anreise = `${fw.monat}-${String(tag).padStart(2, "0")}`;
      }
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
      if (Array.isArray(a.wuensche)) {
        const ALIAS = { strand: "strandnah", meer: "strandnah", beach: "strandnah", kids: "kinderclub", kinder: "familie", spa: "wellness", bewertungen: "bewertung", essen: "essen" };
        // Ein Wunsch zaehlt nur, wenn die Person ein passendes Wort gesagt
        // hat (Wortlisten der Kriterien) - sonst wurde aus "warm" Strand und Pool
        const alt = new Set((p.kriterien || []).map((k) => k.id));
        const ids = [...new Set(a.wuensche.map((w) => ALIAS[String(w).toLowerCase()] || String(w).toLowerCase()))]
          .filter((w) => typeof Politik !== "undefined" && Politik.kriterium(w))
          .filter((w) => alt.has(w) || gesagt(new RegExp((Politik.kriterium(w).woerter || [w]).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i"), 99));
        p.kriterien = ids.map((id) => ({ id, gewicht: 1 }));
        geaendert.push("wuensche");
        for (const id of ids) {
          const k = Politik.kriterium(id);
          if (k?.filter?.maxStrand && p.maxStrand == null) p.maxStrand = k.filter.maxStrand;
        }
      }
      if (Array.isArray(a.ausstattung)) {
        const ERLAUBT = ["pool", "spa", "kidsClub", "familyFriendly", "beachfront", "wifi", "parking", "restaurant", "gym", "seaView"];
        // "Nicht weit zum Strand" ist nicht "direkt am Strand" - die
        // schaerfere Bedingung braucht ein klares Wort der Person
        p.ausstattung = a.ausstattung.filter((x) => ERLAUBT.includes(x))
          .filter((x) => x !== "beachfront" || gesagt(/direkt am strand|erste reihe|strandlage|am strand liegen|direkt ans meer|direkt am meer/i, 99));
        geaendert.push("ausstattung");
      }
      setze("verpflegung", a.verpflegung);
      if (a.flug !== undefined) setze("flug", !!a.flug);
      setze("flugAb", a.flugAb); setze("flugKlasse", a.flugKlasse);
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
        if (!a.typ && !p.artGenannt) {
          if (/\bhotels?\b/i.test(letzteNachricht)) a.typ = "hotel";
          else if (/ferienwohnung|ferienhaus|fewo|apartment|appartement/i.test(letzteNachricht)) a.typ = "apartment";
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
      // Budget fuer die ganze Reise in einen Preis pro Nacht umrechnen,
      // wie auf der Seite gerechnet wird (Servicegebuehr 35 Euro)
      if (p.budgetGesamt && p.naechte && !a.maxPreis) {
        p.maxPreis = Math.floor((p.budgetGesamt - 35 * Math.max(1, p.zimmer || 1)) / (p.naechte * Math.max(1, p.zimmer || 1)));
      }
      kern.standAnzeigen();
      kern.notieren("stand", { felder: geaendert });
      const fp = Werkzeugkasten.fahrplan(p, kern.lauf);
      // Eine Frage der Person geht vor: erst antworten, dann das Thema. Fragt
      // sie nach dem Angebot ("habt ihr was auf Kreta?"), liefert suchen die
      // Lage auch ohne die restlichen Eckdaten.
      const letzte = [...kern.lauf.gespraech].reverse().find((n) => n.role === "user")?.content || "";
      const frage = /\?\s*$|^(habt|gibt|wie|was|wo|wann|welche|ist|sind|kann|könnt|koennt|hat)\b/i.test(String(letzte).trim()) ? String(letzte).trim() : null;
      return { ergebnis: { gemerkt: geaendert.length ? geaendert : "nichts Neues", stand: kern.standKurz(),
        ...(frage ? { zuerst: `Die Person hat gefragt: "${frage}". Beantworte das zuerst - geht es um das Angebot der Seite (Haeuser, Regionen, Preise), ruf suchen oder regionen_zaehlen und antworte mit Zahlen; geht es um Klima oder Reisetipps, aus deinem Wissen. Dann erst das Thema.` } : {}),
        ...Werkzeugkasten.fahrplanFuerModell(fp, p) } };
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
      // Filter kommen nur aus dem Stand (stand_merken) - was die Person
      // gesagt hat. Der Aufruf bringt hoechstens Ziel und Sortierung.
      if (a.ziel && typeof ZIEL_NACH_ID !== "undefined" && ZIEL_NACH_ID[String(a.ziel).toLowerCase()]) { p.zielId = String(a.ziel).toLowerCase(); p.zielOffen = false; }
      if (a.sortierung) p.sortierung = a.sortierung;
      if (!p.typ) p.typ = "hotel";
      kern.standAnzeigen();

      const fp = Werkzeugkasten.fahrplan(p, kern.lauf);
      const fest = !!(p.von && p.bis);
      const flex = fest ? null : Werkzeugkasten.flexWahl(p);
      const zeitraum = Werkzeugkasten.zeitraum(p);
      const filter = Werkzeugkasten.filterAusStand(p);
      const darfEmpfehlen = fp.empfehlungBereit;
      const selbst = p.vorgehen === "selbst";
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
        // Bei einer Richtung (warm, Meer) zaehlt der eingegrenzte Katalog, nicht
        // die Seite - die kennt nur eine Region auf einmal
        const eingegrenzt = !p.zielId && p.zieleErlaubt?.length;
        const basis = { weg, gesuchtMit: Werkzeugkasten.filterText(p), zeitraum: zeitText, trefferGesamt: eingegrenzt ? liste.length : (gesamt ?? liste.length), lage: umfang,
          ...(p.typ !== "apartment" ? { verpflegungsLage: Werkzeugkasten.verpflegungsLage(liste) } : {}) };
        // Als "gesucht" zaehlt nur eine Suche mit den Kerndaten - eine fruehe
        // Katalogsuche fuer eine Frage der Person ("habt ihr was auf Kreta?")
        // darf die Frage "schauen oder klaeren" nicht ueberspringen
        if (fp.suchbereit) kern.lauf.gesuchtMit = fp.schluessel;
        if (selbst) {
          kern.lauf.vorgehenFuer = fp.schluessel + p.vorgehen;
          kern.lauf.letzteTreffer = liste.map((h) => h.id);
          kern.notieren("selbst_gesucht", { treffer: liste.length, filter: Werkzeugkasten.filterText(p), freigabe: kern.freigabe() });
          return { ...basis, haeuser: "nicht noetig - die Person schaut selbst",
            hinweis: kern.darf("suchen")
              ? "Die Filter stehen auf der Seite. Sag der Person in einem Satz, dass die Liste jetzt so eingestellt ist und sie in Ruhe schauen kann; du bist da, wenn sie etwas wissen will. Keine Frage noetig."
              : "Du darfst die Seite nicht bedienen, die Liste steht also NICHT bereit. Sag der Person, dass sie oben in der Suchmaske Ziel, Monat und Reisende eintraegt und dann links filtern kann (nenn zwei, drei passende Filter aus gesuchtMit). Du bist da, wenn sie Fragen hat." };
        }
        if (!darfEmpfehlen) {
          // Die Lage sagt der Kern selbst, mit festen Zahlen - das Modell hat
          // sie sonst uebersprungen oder halb erzaehlt. Einmal je Eckdatenstand.
          if (fp.suchbereit && kern.lauf.lageFuer !== fp.schluessel && liste.length) {
            kern.lauf.lageFuer = fp.schluessel;
            await kern.denkpause(600, "fasst zusammen…");
            const lage = Werkzeugkasten.lageSatz(liste, p, umfang, gesamt ?? null);
            kern.sagen(lage);
            kern.lauf.lageImZug = lage;
            kern.notieren("lage_gesagt", { haeuser: liste.length });
            return { ...basis, haeuser: "noch nicht - erst die Beratung",
              // Kein Kommentar zu den Zahlen der Lage. Das Modell haengte
              // sonst Bewertungen an ("Kinderclubs sind eher selten"),
              // obwohl niemand nach Kinderclubs gefragt hatte - das liest
              // sich, als haette der Agent eine eigene Meinung dazu.
              hinweis: `Die Lage steht schon im Chat: nicht wiederholen, keine Zahlen noch einmal, und die Zahlen auch nicht bewerten oder einordnen. ${p.zielId ? "Das Ziel steht fest - kein Satz ueber Regionen." : "Hoechstens ein Satz aus deinem Wissen zu Klima oder Charakter der Regionen."} Dann das naechste Thema.`,
              ...Werkzeugkasten.fahrplanFuerModell(Werkzeugkasten.fahrplan(p, kern.lauf), p) };
          }
          return { ...basis, haeuser: "noch nicht - erst die Beratung",
            hinweis: (fp.phase === "suche" || !fp.gesucht
              ? "Schildere die Lage in zwei, drei Saetzen: wie viele Haeuser, in welchen Regionen (mit Zahlen), Preisspanne pro Nacht - dein Wissen zu Klima und Art der Regionen darfst du dazunehmen. Dann das naechste Thema. Sag nichts ueber Verpflegung, Ausstattung oder Wuensche (Pool, Kinderclub, All Inclusive, Wellness), solange die Person davon nicht selbst gesprochen hat - sonst steht ein Thema im Raum, das niemand aufgemacht hat."
              : "Nenn, was sich an der Lage geaendert hat (Zahlen), dann das naechste Thema.") + (p.naechte ? "" : " Die Dauer ist noch offen; gerechnet ist eine Woche - sag das in einem Halbsatz."),
            ...Werkzeugkasten.fahrplanFuerModell(Werkzeugkasten.fahrplan(p, kern.lauf), p) };
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
          return { ...basis, treffer: [], gelockert,
            hinweis: gelockert.length
              ? `Auch nach dem Lockern (${gelockert.join(", ")}) ist nichts da. Sag das in einem Satz, nenn den Preis als den Punkt, an dem es haengt, und frag, ob das Budget hoeher darf. Frag genau einmal, nicht noch einmal dasselbe.`
              : "Nichts gefunden. Sag der Person in einem Satz, woran es haengt, und frag, welche Vorgabe weicher werden darf. Frag genau einmal." };
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
        let engere = auswahl.slice(0, wieViele).map((h) => h.id);
        /* Das Partnerhaus gehoert in den Rundgang.
           --------------------------------------------------------------
           Es wird erst beim Vorlegen bestimmt und rutscht dann auf Platz
           eins. Im Test hiess das: Der Agent ging drei Haeuser durch,
           berichtete ueber drei - und empfahl an erster Stelle ein
           viertes, das er nie geoeffnet hatte. Deshalb steht es schon
           hier fest. auswahl ist bereits nach dem Gespraech sortiert und
           damit genau die Rangfolge, die das Partnerhaus braucht. */
        if (typeof Studie !== "undefined" && Studie.partnerhaus) {
          const rang = auswahl.map((h) => h.id);
          // Steht es schon fest, bleibt es dasselbe Haus - sonst faellt es
          // beim zweiten Vorlegen aus dem Rundgang und aus der Ansicht.
          const ph = kern.lauf.partnerId && rang.includes(kern.lauf.partnerId)
            ? { id: kern.lauf.partnerId } : (kern.lauf.partnerId ? null : Studie.partnerhaus(rang, rang));
          if (ph && !engere.includes(ph.id)) engere = [ph.id, ...engere.slice(0, wieViele - 1)];
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
      const gesetzt = await Werkzeuge.filterSetzen(Werkzeugkasten.filterWerte(p));
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
        await Werkzeuge.sortieren(p.sortierung === "bewertung" ? "rating" : "preis-asc");
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
        // Der Anreisetag muss von der Person kommen - das Modell hat ihn
        // sonst gern selbst gesetzt ("1. Oktober"). Geprueft wird, ob in
        // ihren letzten Nachrichten ueberhaupt ein Tag vorkommt.
        const tagGenannt = kern.lauf.gespraech.filter((n) => n.role === "user").slice(-4)
          .some((n) => Werkzeugkasten.TAG.test(String(n.content)));
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
        const e = await Werkzeuge.zurBuchung(a.id, kern.lauf.profil.verpflegung || null, kern.lauf.profil.anreise || null);
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
      const vor = await Werkzeuge.buchungAbschliessen({ nurVorbereiten: true });
      kern.sperreAus();
      if (vor.daten?.wartetAufDaten || !vor.ok) {
        return { ergebnis: { fehler: vor.text, hinweis: "Sag der Person, was fehlt; sie traegt es selbst ein." }, log: vor.text };
      }
      kern.notieren("buchung_vorbereitet", { id: a.id });
      const z = Werkzeuge.buchungsZusammenfassung();
      if (kern.darf("buchen")) kern.lauf.abschlussFaellig = true;
      else kern.notieren("gegenzeichnung_vorgelegt", { id: a.id });
      return {
        ergebnis: { vorbereitet: true, zusammenfassung: z,
          hinweis: kern.darf("buchen")
            ? "Du darfst abschliessen: Sag in einem Satz, was du buchst (Haus, Zeitraum, Gesamtpreis, Name), und ruf buchung_abschliessen im selben Zug."
            : "Leg der Person vor, was gebucht wuerde (Haus, Zeitraum, Gesamtpreis, Name), und frag, ob du abschliessen sollst. Erst nach einem klaren Ja buchung_abschliessen rufen." },
        log: `Buchung vorbereitet: ${z?.titel || item.name}, ${z?.gesamt || ""}`,
      };
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
  THEMEN: {
    zeit: { frage: "Wann es ungefaehr losgehen soll - ein Monat reicht. Feste Daten nur, wenn sie welche hat; nicht danach draengen. Nennt sie nur eine Jahreszeit ('im Winter'), frag, welcher Monat - 'egal' ist eine Antwort, dann nimmst du den ersten Monat der Jahreszeit und sagst das.", chips: null },
    reisende: { frage: "Mit wem sie reist - in einem Fragesatz, etwa 'Wie viele seid ihr, und sind Kinder dabei?' (bei Kindern gleich das Alter mit aufnehmen). Nicht zwei Fragesaetze daraus machen.", chips: "1 | 2 | 3 | 4 oder mehr" },
    kinderAlter: { frage: "Wie alt die Kinder sind (die Zahl der Kinder ist bekannt, nur das Alter fehlt).", chips: null },
    ziel: { frage: "Ob es eher in eine warme oder eher in eine kalte Region gehen soll, oder ob sie schon ein Ziel hat. Nichts anpreisen.", chips: "Eher warm | Eher kalt | Ich habe ein Ziel" },
    art: { frage: "Ob sie eher ins Hotel oder in eine Ferienwohnung will, oder ob das noch offen ist (artEgal true - dann faengst du bei Hotels an).", chips: "Hotel | Ferienwohnung | Noch offen" },
    weiter: { frage: "Ob du mit dem, was ihr bisher habt, schon mal schauen sollst, was es gibt (weiter schauen), oder ob ihr erst noch ein paar Eckdaten klaert, etwa Dauer und Flug (weiter klaeren).", chips: "Erst mal schauen | Noch ein paar Eckdaten" },
    dauer: { frage: "Wie lange, ungefaehr ('eine Woche' = 7 Naechte, '10 Tage' = 10 Naechte).", chips: null },
    flug: { frage: "Ob ein Flug dazu soll oder nur die Unterkunft. Sag in einem Halbsatz dazu, dass mit Flug der Anreisetag von den Flugtagen der Verbindung abhaengt.", chips: "Mit Flug | Nur die Unterkunft" },
    flugAb: { frage: "Von welchem Flughafen: Hamburg, Stuttgart, Duesseldorf, Hannover, Muenchen, Koeln, Frankfurt oder Berlin. Klasse nicht fragen - Economy ist gerechnet, sie kann es spaeter aendern.", chips: null },
    anreise: { frage: "An welchem Tag sie anreisen will. Der Monat und die Dauer stehen fest, der Tag fehlt - nenn zwei, drei moegliche Termine aus den Chips und frag, welcher passt. Keinen selbst aussuchen.", chips: null },
    beratung: { frage: "Ob ihr noch ein paar Eckdaten klaert - Preis, Verpflegung, worauf es ihr ankommt (beratung klaeren) - oder ob du ihr mit dem, was du hast, gleich eine erste Auswahl zeigst (beratung auswahl). Beides gleichwertig anbieten.", chips: "Noch ein paar Eckdaten | Erstmal eine Auswahl" },
    vorgehen: { frage: "Ob du die Filter so einstellst und sie selbst durch die Liste schaut (vorgehen selbst), oder ob du ihr Haeuser zur Auswahl raussuchst (vorgehen top3) - und wenn ja, wie viele; drei sind ueblich, zwei bis sechs gehen. Beides gleichwertig anbieten, die Zahl im selben Satz.", chips: "Ich schaue selbst | Such mir drei raus | Lieber fünf" },
    preis: { frage: "Ob sie beim Preis schon eine feste Grenze hat (pro Nacht oder gesamt) oder offen ist. Nicht 'wie viel darf es kosten' fragen. Offen heisst preisEgal true. Die Preisspanne aus der Lage darfst du nennen.", chips: "Feste Grenze | Offen" },
    verpflegung: { frage: "Welche Verpflegung es sein soll: All Inclusive oder Halbpension (oder nur Fruehstueck, oder egal). Nenn dazu, was All Inclusive im Schnitt mehr kostet und wie viele Haeuser es anbieten - die Zahlen stehen in verpflegungsLage. 'Egal' heisst verpflegungEgal true.", chips: "All Inclusive | Halbpension | Nur Frühstück | Egal" },
    wuensche: { frage: "Worauf sie bei der Unterkunft besonders achtet - offen gefragt, mit hoechstens drei Beispielen, die zur Person passen (Paar: Ruhe, Essen, Lage; Familie: Pool, Kinderclub, Strand). Keine Liste aller Moeglichkeiten. Antworten werden Wuensche (wuensche); nur ausdrueckliche Grenzen ('mindestens 4,5', 'direkt am Strand') werden Filter. 'Nichts Besonderes' heisst ausstattungEgal true.", chips: "Sauberkeit | Essen | Lage | Ruhe" },
  },

  // Hat die Person einen Tag genannt? "am 5.", "5. Nov.", "5. November",
  // "vom 12. bis 26.", "2026-11-05" oder nur "5." als ganze Antwort
  TAG: /\b([1-9]|[12]\d|3[01])\.\s*(jan|feb|mär|maer|apr|mai|jun|jul|aug|sep|okt|nov|dez|\d{1,2}\.)|\b(am|ab dem|ab|vom|den)\s+([1-9]|[12]\d|3[01])\b|\d{4}-\d{2}-\d{2}|^\s*([1-9]|[12]\d|3[01])\.?\s*$/i,

  // Schluessel der Eckdaten - aendert er sich, muss neu gesucht werden
  eckdatenSchluessel(p) {
    return JSON.stringify([p.zielId || null, p.richtung || null, p.monat || null, p.von || null, p.bis || null, p.naechte || null,
      p.erwachsene ?? null, p.kinder ?? null, p.kinderAlter || [], p.typ || "hotel", p.flug ?? null, p.flugAb || null, p.flugKlasse || null]);
  },

  // Schluessel der Vorgaben fuer eine Vorlage - gleiche Vorgaben, keine
  // zweite Vorlage derselben Haeuser
  vorlageSchluessel(p) {
    return this.eckdatenSchluessel(p) + JSON.stringify([p.maxPreis || null, p.maxStrand ?? null, p.mindestbewertung || null, p.mindestSterne || null,
      (p.kriterien || []).map((k) => k.id), p.ausstattung || [], p.verpflegung || null, p.sortierung || null]);
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
  fahrplan(p, lauf = {}) {
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
      weiter: !!p.weiter || !!b.weiter || alleEckdaten,
      dauer: !!p.naechte,
      flug: p.flug != null || p.typ === "apartment",
      flugAb: !p.flug || !!p.flugAb || p.typ === "apartment",
      vorgehen: !!p.vorgehen,
      beratung: !!p.beratung || !!b.beratung,
      preis: !!(p.maxPreis || p.budgetGesamt || p.preisEgal || b.preis),
      verpflegung: !!(p.verpflegung || p.verpflegungEgal || b.verpflegung || p.typ === "apartment"),
      wuensche: !!((p.kriterien || []).length || p.ausstattungEgal || b.wuensche),
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
      weiter: { setzen: (x) => { x.weiter = "schauen"; } },
      beratung: { setzen: (x) => { x.beratung = "auswahl"; } },
      vorgehen: { setzen: (x) => { x.vorgehen = "top3"; } },
      ziel: { setzen: (x) => { x.zielOffen = true; } },
      art: { setzen: (x) => { x.typ = x.typ || "hotel"; x.artGenannt = true; }, satz: "dass du bei den Hotels schaust" },
      dauer: { setzen: (x) => { x.naechte = 7; }, satz: "dass du mit einer Woche rechnest" },
      flug: { setzen: (x) => { x.flug = false; }, satz: "dass du ohne Flug suchst, nur die Unterkunft" },
      flugAb: { setzen: (x) => { x.flug = false; }, satz: "dass du den Flug weglaesst" },
      preis: { setzen: (x) => { x.preisEgal = true; }, satz: "dass du dich beim Preis nicht festlegst" },
      verpflegung: { setzen: (x) => { x.verpflegungEgal = true; }, satz: "dass du die Verpflegung offen laesst" },
      wuensche: { setzen: (x) => { x.ausstattungEgal = true; }, satz: "dass du keine besondere Ausstattung voraussetzt" },
      anreise: { setzen: (x, wk) => {
        const f = wk.flexWahl(x);
        if (f) x.anreise = `${f.monat}-01`;
      }, satz: "welchen Anreisetag du genommen hast und dass sie ihn jederzeit aendern kann" },
    };
    const angenommen = [];
    for (const [t, a] of Object.entries(ANNAHME)) {
      if (fertig[t] || (lauf.gefragtWie?.[t] || 0) < 2) continue;
      a.setzen(p, this);
      fertig[t] = true;
      (lauf.uebersprungen ||= {})[t] = true;
      if (a.satz) angenommen.push(a.satz);
    }

    const KERN = ["zeit", "reisende", "kinderAlter", "ziel", "art"];
    const ECKDATEN = ["dauer", "flug", "flugAb"];
    // Verpflegung nur bei Hotels - eine Ferienwohnung hat keine
    // Wer gleich eine Auswahl sehen will, bekommt sie - der Anreisetag
    // bleibt trotzdem, ohne ihn laesst die Seite nicht buchen.
    const BESPRECHEN = p.typ === "apartment" ? ["preis", "wuensche"] : ["preis", "verpflegung", "wuensche"];
    const BERATUNG = (p.beratung === "auswahl" ? [] : BESPRECHEN).concat("anreise");
    const kernFertig = KERN.every((t) => fertig[t]);
    const suchbereit = fertig.zeit && fertig.reisende && fertig.kinderAlter;
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
    else if (!lauf.gesuchtMit && !fertig.weiter) naechstes = "weiter";
    else if (!lauf.gesuchtMit && weiter === "klaeren" && !ECKDATEN.every((t) => fertig[t])) naechstes = ECKDATEN.find((t) => !fertig[t]);
    // Vor der Wahl des Vorgehens wird bei geaenderten Eckdaten neu gesucht
    // (die Lage soll stimmen); danach erst wieder zur Vorlage bzw. Liste -
    // sonst liefe mitten in der Beratung nach jeder Antwort die Maske
    else if (!gesucht && !fertig.beratung) phase = "suche";
    /* Nach der Lage kommt nicht die Frage nach dem Vorgehen.
       ------------------------------------------------------------------
       Bis zum 25.09.2026 stand dort "selbst schauen oder soll ich dir drei
       raussuchen?" - und danach fragte der Agent doch noch Preis,
       Verpflegung und Wuensche ab. Die Person hatte also ueber das
       Vorgehen zu entscheiden, bevor klar war, worum es geht. Jetzt steht
       dort die passende Frage: noch ein paar Eckdaten klaeren oder gleich
       eine erste Auswahl sehen. Wie ausgewaehlt wird (selbst oder durch
       den Agenten), kommt zum Schluss, wenn alles besprochen ist. */
    else if (!fertig.beratung) { naechstes = "beratung"; phase = "beratung"; }
    else {
      const offen = [...ECKDATEN, ...BERATUNG].find((t) => !fertig[t]) || null;
      if (offen) { naechstes = offen; phase = "beratung"; }
      else if (!fertig.vorgehen) { naechstes = "vorgehen"; phase = "beratung"; }
      else if (p.vorgehen === "selbst") phase = "selbst";
      else phase = "vorschlaege";
    }
    let frage = naechstes ? this.THEMEN[naechstes]?.frage : null;
    let chips = naechstes ? this.THEMEN[naechstes]?.chips : null;
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
      const gesagt = (lauf.gespraech || []).filter((n) => n.role === "user").map((n) => String(n.content).toLowerCase()).join(" ");
      const JAHRESZEIT = { sommer: "Juni | Juli | August", herbst: "September | Oktober | November", winter: "Dezember | Januar | Februar", "frühling": "März | April | Mai", fruehling: "März | April | Mai", "frühjahr": "März | April | Mai" };
      const jz = Object.keys(JAHRESZEIT).find((k) => gesagt.includes(k));
      if (jz) { frage = `Sie hat "${jz}" gesagt - frag, welcher Monat: ${JAHRESZEIT[jz].replace(/ \| /g, ", ")}? Keinen davon vorschlagen oder als "richtig?" unterstellen; "egal" ist eine Antwort (dann nimmst du den ersten und sagst das).`; chips = `${JAHRESZEIT[jz]} | Egal`; }
    }
    // "Ein langes Wochenende" ist eine Dauerangabe. Ohne diesen Zweig fragte
    // der Agent danach trotzdem "Eine Woche, zehn Tage oder etwas anderes?"
    // und die Person musste sich wiederholen. Eine Zahl wird nicht geraten -
    // drei oder vier Naechte sagt sie selbst.
    if (naechstes === "dauer") {
      const gesagt = (lauf.gespraech || []).filter((n) => n.role === "user").map((n) => String(n.content).toLowerCase()).join(" ");
      if (/wochenende/.test(gesagt)) {
        frage = "Sie hat von einem Wochenende gesprochen - frag, ob zwei, drei oder vier Naechte gemeint sind. Nicht allgemein nach der Dauer fragen, das hat sie schon gesagt.";
        chips = "2 Nächte | 3 Nächte | 4 Nächte";
      }
    }
    /* Die moeglichen Anreisetage als Chips.
       ------------------------------------------------------------------
       Im Prototyp ist jeder Tag des Monats frei und der Preis gleich -
       vier ueber den Monat verteilte Termine machen die Frage trotzdem
       beantwortbar, statt sie wie ein leeres Datumsfeld wirken zu lassen. */
    if (naechstes === "anreise") {
      const f = this.flexWahl(p);
      const naechte = p.naechte || 7;
      if (f) {
        const [jahr, monat] = f.monat.split("-").map(Number);
        const letzter = new Date(jahr, monat, 0).getDate();
        const spielraum = Math.max(1, letzter - naechte);
        const tage = [1, Math.round(spielraum / 3), Math.round((spielraum * 2) / 3), spielraum]
          .map((t) => Math.min(letzter, Math.max(1, t)))
          .filter((t, i, alle) => alle.indexOf(t) === i)
          .map((t) => `${f.monat}-${String(t).padStart(2, "0")}`);
        const MON = ["Jan.", "Feb.", "März", "April", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];
        const text = (d) => { const x = new Date(d); return `${x.getDate()}. ${MON[x.getMonth()]}`; };
        frage = `An welchem Tag sie anreisen will. Sag ihr, dass im ${MON[monat - 1].replace(".", "")} jeder Tag frei ist und der Preis gleich bleibt, nenn ${tage.slice(0, 3).map(text).join(", ")} als Beispiele und frag, welcher Tag passt. Keinen selbst aussuchen.`;
        chips = tage.map(text).join(" | ");
      }
    }
    if (naechstes === "reisende") {
      if (p.personen != null && p.erwachsene == null && p.kinder == null) { frage = `Wie viele der ${p.personen} Kinder sind, und wie alt - 'keine' ist eine Antwort. Erwachsene nicht fragen, das rechnet die Seite.`; chips = "Keine Kinder | Ein Kind | Zwei Kinder"; }
      else if (p.erwachsene != null && p.kinder == null) { frage = "Ob Kinder mitreisen - und wenn ja, wie viele und wie alt."; chips = "Keine Kinder | Ein Kind | Zwei Kinder"; }
      else if (p.kinder != null && p.erwachsene == null) { frage = "Wie viele Erwachsene mitreisen."; chips = "1 | 2 | 3 | 4 oder mehr"; }
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
      const sag = `Sag zuerst in einem kurzen Halbsatz, ${angenommen.slice(0, 2).join(" und ")}. Das ist eine Annahme, keine Ansage: Sie kann jederzeit widersprechen.`;
      frage = frage ? `${sag} Dann: ${frage}` : sag;
    }
    const empfehlungBereit = p.vorgehen === "top3" && BERATUNG.every((t) => fertig[t])
      && fertig.dauer && fertig.flug && fertig.flugAb;
    return { fertig, naechstes, frage, chips, phase, suchbereit, eckdatenFertig, gesucht, schluessel, empfehlungBereit,
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
    if (fp.eckdatenFertig && !fp.gesucht && !p.vorgehen) return "suchen";
    if ((fp.phase === "vorschlaege" || fp.phase === "selbst") && lauf.vorgehenFuer !== fp.schluessel + p.vorgehen) return "suchen";
    return null;
  },

  // Der Fahrplan als Teil eines Werkzeugergebnisses (stand_merken, suchen)
  fahrplanFuerModell(fp, p) {
    if (fp.naechstes) return { alsNaechstes: `Frag genau ein Thema: ${fp.naechstes}. ${fp.frage}`, ...(fp.chips ? { chipsBeispiel: fp.chips } : { chips: "keine - die Frage ist offen" }), nochOffen: fp.fehlt };
    if (fp.phase === "suche") return { alsNaechstes: "Ruf suchen und schildere danach die Lage." };
    if (fp.phase === "selbst") return { alsNaechstes: "Die Person will selbst schauen. Ruf suchen (stellt die Filter), dann sag ihr, dass die Liste steht und du da bist." };
    return { alsNaechstes: "Beratung abgeschlossen. Ruf suchen - es legt die drei passendsten Haeuser gleich vor." };
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
  lageSatz(liste, p, umfang, aufDerSeite = null) {
    const monat = p.monat ? Object.keys(Politik.MONATE).find((m) => Politik.MONATE[m] === p.monat && m.length > 3) : null;
    const monatText = monat ? `Im ${monat.charAt(0).toUpperCase() + monat.slice(1)}` : "Aktuell";
    const art = p.typ === "apartment" ? "Ferienwohnungen" : "Hotels";
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
    if (mehrAufDerSeite) {
      teile.push(`${monatText} stehen ${aufDerSeite} ${art} in der Liste.`);
      teile.push(regionen.length <= 1
        ? `${liste.length} davon passen zu euch${wo ? ` ${wo}` : ""}.`
        : `${liste.length} davon liegen in ${regionen.length} ${warmKalt}Regionen, die meisten ${topText}.`);
    } else if (p.zielId || regionen.length <= 1) {
      teile.push(`${monatText} gibt es ${liste.length} ${art} ${wo}`.trim() + ".");
    } else {
      teile.push(`${monatText} gibt es ${liste.length} ${art} in ${regionen.length} ${warmKalt}Regionen, die meisten ${topText}.`);
    }
    if (umfang.preisProNacht) teile.push(`Pro Nacht kosten sie ${umfang.preisProNacht.von} bis ${umfang.preisProNacht.bis} €${p.naechte ? "" : ", gerechnet mit einer Woche"}.`);
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
    const strandGenannt = p.maxStrand != null || genannt(/strand|meer|beach/);
    if (umfang.direktAmStrandBis200m && (strandGenannt || !genannt(/pool|kinderclub|familie|wellness/))) {
      merkmale.push(`${umfang.direktAmStrandBis200m} liegen direkt am Strand`);
    }
    if (umfang.mitPool && genannt(/pool/)) merkmale.push(`${umfang.mitPool} haben einen Pool`);
    if (umfang.mitKinderclub && genannt(/kinderclub|kids|familie|betreuung|animation/)) {
      merkmale.push(`${umfang.mitKinderclub} haben einen Kinderclub`);
    }
    if (umfang.mitWellness && genannt(/wellness|spa|sauna/)) merkmale.push(`${umfang.mitWellness} haben Wellness`);
    if (umfang.gaestenoteAb4_5) merkmale.push(`${umfang.gaestenoteAb4_5} sind mit 4,5 oder besser bewertet`);
    // "10 haben einen Pool, 10 haben einen Kinderclub" - beim zweiten Mal
    // reicht die Zahl, solange das Verb dasselbe ist
    const gekuerzt = merkmale.slice(0, 3).map((m, i, alle) => {
      if (i === 0) return m;
      const verb = (x) => x.replace(/^\d+\s+/, "").split(" ")[0];
      return verb(m) === verb(alle[i - 1]) ? m.replace(/^(\d+)\s+\w+\s+/, "$1 ") : m;
    });
    if (merkmale.length) teile.push(`${gekuerzt.join(", ")}.`);
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
    return {
      zielId: p.zielId || undefined,
      maxPreis: p.maxPreis || undefined,
      maxStrand: p.maxStrand != null ? ([0.2, 1, 5].find((s) => s >= p.maxStrand) ?? 5) : undefined,
      ausstattung: filter.ausstattung,
      verpflegung: p.verpflegung ? [p.verpflegung] : undefined,
      mindestbewertung: p.mindestbewertung || undefined,
      sterne: p.mindestSterne ? [5, 4, 3].filter((s) => s >= p.mindestSterne) : undefined,
    };
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
    const f = this.filterAusStand(p);
    if (f.ausstattung.length) t.push(f.ausstattung.map((x) => (typeof AMENITY_LABELS !== "undefined" && AMENITY_LABELS[x]) || x).join(", "));
    if (p.verpflegung && typeof BOARD_LABELS !== "undefined") t.push(BOARD_LABELS[p.verpflegung]);
    return t.filter(Boolean).join(", ") || "ohne Filter";
  },

  katalogTreffer(p, filter) {
    return this.katalog(p).filter((h) => {
      if (p.zielId && h.ziel !== p.zielId) return false;
      if (!p.zielId && p.zieleErlaubt?.length && !p.zieleErlaubt.includes(h.ziel)) return false;
      // Regionen ausserhalb ihrer Saison fallen weg. Im Test lag "Lanta
      // Family Bay" auf Platz drei der Vorschlaege - Koh Lanta hat im
      // August Monsun, die Liste schrieb "Ausserhalb der Saison" an die
      // Karte, der Agent sagte nichts dazu. Wer die Region selbst nennt,
      // bekommt sie weiter.
      if (!p.zielId && p.monat && typeof saisonPassung === "function"
        && typeof ZIEL_NACH_ID !== "undefined" && ZIEL_NACH_ID[h.ziel]
        && saisonPassung(ZIEL_NACH_ID[h.ziel], p.monat) < 0.5) return false;
      if (filter.ausstattung.some((x) => !(h.amenities || []).includes(x))) return false;
      if (!this.passtGruppe(h, p)) return false;
      const preis = this.preis(h, p.monat);
      // Ein Gesamtbudget gilt fuer den ganzen Aufenthalt, wie die Kasse ihn
      // rechnet (Zimmer fuer die Gruppe, Verpflegung, Gebuehr) - sonst lag
      // ein Vorschlag mit 1.512 Euro im "Budget bis 1.500"
      if (p.budgetGesamt && p.naechte && typeof Politik !== "undefined" && Politik.aufenthaltspreis(h, p, preis).gesamt > p.budgetGesamt) return false;
      if (!p.budgetGesamt && p.maxPreis && preis > p.maxPreis) return false;
      if (p.maxStrand != null && (h.distanceToBeach ?? 99) > p.maxStrand) return false;
      if (p.mindestbewertung && (h.rating || 0) < p.mindestbewertung) return false;
      if (p.mindestSterne && (h.stars || 0) < p.mindestSterne) return false;
      if (p.verpflegung && h.type !== "apartment" && !(h.boards || []).some((b) => b.key === p.verpflegung)) return false;
      return true;
    });
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Werkzeugkasten };
