// Die Werkzeuge des Agenten.
//
// Jedes Werkzeug loest sich in echte Bedienelemente auf: Der Agent setzt keinen
// Zustand, er klickt Checkboxen, tippt in Felder und betaetigt Knoepfe. Was
// hier nicht als Bedienelement existiert, kann der Agent nicht - genau wie ein
// Mensch. Das haelt Agenten- und Nutzerpfad identisch und macht den Vergleich
// in der Studie sauber.
//
// Rueckgabe jedes Werkzeugs: { ok, text, daten? }
//   ok    - hat es geklappt
//   text  - eine Zeile fuer das Panel ("Filter gesetzt: 5 Sterne")
//   daten - was der Agent dabei erfahren hat, geht spaeter ans Modell

const Werkzeuge = {
  /* ==================================================================
     Wo bin ich gerade?
     ================================================================== */

  seite() {
    const p = location.pathname.split("/").pop() || "index.html";
    return p.replace(".html", "") || "index";
  },

  // Kompakter Bericht ueber die Seite. Geht spaeter als Kontext an das Modell -
  // bewusst nicht das DOM, sondern nur, was ein Mensch auf einen Blick saehe.
  zustand() {
    const bericht = { seite: this.seite() };

    if (typeof Reisedaten !== "undefined") bericht.reisezeitraum = Reisedaten.get();
    if (typeof Belegung !== "undefined") bericht.belegung = Belegung.get();

    if (this.seite() === "results" && typeof state !== "undefined") {
      bericht.typ = state.typ ?? state.type;
      bericht.ziel = state.ziel || null;
      bericht.aktiveFilter = {
        sterne: [...state.stars],
        kategorien: [...state.categories],
        ausstattung: [...state.amenities],
        maxPreis: state.priceMax,
        mindestbewertung: state.minRating || null,
        maxStrand: state.maxBeach,
        sortierung: state.sort,
      };
      const karten = [...document.querySelectorAll(".result-card")];
      bericht.trefferGesamt = karten.length;
      // Nur die ersten acht. Will der Agent mehr wissen, muss er erst filtern
      // oder sortieren - wie ein Mensch auch.
      bericht.treffer = karten.slice(0, 8).map((k) => this.kartenDaten(k)).filter(Boolean);
    }

    if (this.seite() === "stay") {
      const id = new URLSearchParams(location.search).get("id");
      const item = typeof getItemById === "function" ? getItemById(id) : null;
      if (item) bericht.unterkunft = { id: item.id, name: item.name, preis: item.pricePerNight, note: item.rating };
    }

    return bericht;
  },

  kartenDaten(karte) {
    const link = karte.querySelector('a[href*="id="]');
    if (!link) return null;
    const id = new URL(link.href, location.origin).searchParams.get("id");
    const item = typeof getItemById === "function" ? getItemById(id) : null;
    if (!item) return null;
    return {
      id: item.id,
      name: item.name,
      ort: item.location,
      preis: typeof saisonpreis === "function" ? saisonpreis(item) : item.pricePerNight,
      note: item.rating,
      bewertungen: item.reviewCount,
      sterne: item.stars ?? null,
      strand: item.distanceToBeach,
    };
  },

  /* ==================================================================
     Hilfsmittel
     ================================================================== */

  // Ein Bedienelement suchen. Fehlt es, meldet das Werkzeug ehrlich Misserfolg,
  // statt still nichts zu tun - sonst behauptet der Agent Dinge, die er nicht
  // getan hat.
  finde(selektor, wurzel = document) {
    return wurzel.querySelector(selektor);
  },

  fehlt(was) {
    return { ok: false, text: `${was} ist auf dieser Seite nicht verfügbar.` };
  },

  // Filterzeilen liegen als <input> in einem <label>. Geklickt wird das input
  // (dort haengt der change-Handler), angefahren wird die sichtbare Zeile.
  async klickeFilterZeile(input, hinweis) {
    if (!input) return false;
    const zeile = input.closest("label") || input;
    await Zeiger.insBlickfeld(zeile);
    const ziel = Zeiger.zielpunkt(zeile);
    await Zeiger.bewegeZu(ziel.x, ziel.y);
    if (Zeiger.abbruch) return false;

    zeile.classList.add("agent-hover");
    Zeiger.beschrifte(hinweis);
    await Zeiger.warte(Zeiger.streu(190, 60));
    Zeiger.klickringZeigen();
    Zeiger.echterKlick(input, ziel.x, ziel.y);
    await Zeiger.warte(140);
    zeile.classList.remove("agent-hover");
    Zeiger.beschrifte("");
    return true;
  },

  /* ==================================================================
     Suchen
     ================================================================== */

  async suchen({ typ = null, ziel = "", von = "", bis = "", erwachsene = null, kinder = null, kinderAlter = null, flug = null, flex = null } = {}) {
    if (!this.finde("#sbForm")) return this.fehlt("Die Suchmaske");

    const getan = [];

    // Zuerst die Art. Der Reiter baut die Maske neu auf, deshalb muss er vor
    // allen Feldern geklickt werden - sonst tippt der Agent in Felder, die
    // gleich darauf ersetzt werden.
    if (typ) {
      const reiter = this.finde(`.searchbox-tab[data-type="${typ}"]`);
      if (reiter && !reiter.classList.contains("active")) {
        // Auf der Trefferliste sind die Reiter ausgeblendet - dort ging der
        // Klick ins Leere. Unsichtbar heisst: nicht klicken, sondern melden.
        if (!Zeiger.sichtbar(reiter)) return { ok: false, text: "Die Art lässt sich hier nicht umstellen.", daten: { brauchtStartseite: true } };
        await Zeiger.klicke(reiter, { hinweis: typ === "apartment" ? "Ferienwohnungen" : "Hotels" });
        await Zeiger.warte(260);
        getan.push(typ === "apartment" ? "Ferienwohnungen" : "Hotels");
      }
    }

    // Der Schalter "feste Daten / flexibel" baut die Maske ebenfalls neu
    // auf - und loeschte damit das Reiseziel, wenn es schon eingetippt war.
    // Deshalb kommt er vor dem Ziel.
    const modus = this.finde(`input[name="sbDateMode"][value="${flex ? "flex" : "fest"}"]`);
    if (modus && !modus.checked) {
      await Zeiger.klicke(modus, { hinweis: flex ? "flexibel im Monat" : "feste Daten" });
      await Zeiger.warte(250);
    }

    // Nach Reiter- oder Moduswechsel ist die alte Formularreferenz veraltet
    const form = this.finde("#sbForm");
    if (!form) return this.fehlt("Die Suchmaske");

    const feldZiel = this.finde("#sbDest");
    if (feldZiel && ziel && feldZiel.value !== ziel) {
      await Zeiger.tippe(feldZiel, ziel, { hinweis: "Reiseziel" });
      getan.push(ziel);
    }

    // Zeitraum: flexibel im Monat (Monat, Dauer) oder feste Daten
    if (flex) {
      const feldMonat = this.finde("#sbMonat");
      if (feldMonat && flex.monat && feldMonat.value !== flex.monat) {
        await Zeiger.setzeWert(feldMonat, flex.monat, { hinweis: "Reisemonat" });
        getan.push(`im ${feldMonat.options[feldMonat.selectedIndex]?.textContent || flex.monat}`);
      }
      const feldNaechte = this.finde("#sbNaechte");
      if (feldNaechte && flex.naechte && +feldNaechte.value !== +flex.naechte) {
        await Zeiger.setzeWert(feldNaechte, String(flex.naechte), { hinweis: "Dauer" });
        getan.push(`${flex.naechte} Nächte`);
      }
    } else {
      const feldVon = this.finde("#sbFrom");
      if (feldVon && von) {
        await Zeiger.setzeWert(feldVon, von, { hinweis: "Anreise" });
        getan.push(`ab ${von}`);
      }
      const feldBis = this.finde("#sbTo");
      if (feldBis && bis) {
        await Zeiger.setzeWert(feldBis, bis, { hinweis: "Abreise" });
        getan.push(`bis ${bis}`);
      }
    }

    if (erwachsene !== null || kinder !== null) {
      await this.belegungSetzen(erwachsene, kinder, kinderAlter);
      getan.push(`${erwachsene ?? "?"} Erwachsene${kinder ? `, ${kinder} Kinder${kinderAlter?.length ? ` (${kinderAlter.join(", ")} J.)` : ""}` : ""}`);
    }

    // Flug dazu: Haken und Leiste (Abflughafen, Klasse), nur bei Hotels
    if (flug && (typ || "hotel") === "hotel") {
      const haken = this.finde("#sbWithFlight");
      if (haken && haken.checked !== !!flug.mit) {
        await Zeiger.klicke(haken, { hinweis: flug.mit ? "mit Flug" : "ohne Flug" });
        await Zeiger.warte(200);
        getan.push(flug.mit ? "mit Flug" : "ohne Flug");
      }
      if (flug.mit) {
        const feldAb = this.finde("#sbFlightFrom");
        if (feldAb && flug.ab !== undefined && feldAb.value !== (flug.ab || "")) {
          await Zeiger.setzeWert(feldAb, flug.ab || "", { hinweis: "Abflughafen" });
          getan.push(`ab ${flug.ab || "günstigstem Flughafen"}`);
        }
        const feldKlasse = this.finde("#sbFlightClass");
        if (feldKlasse && flug.klasse && feldKlasse.value !== flug.klasse) {
          await Zeiger.setzeWert(feldKlasse, flug.klasse, { hinweis: "Klasse" });
          getan.push(flug.klasse);
        }
      }
    }

    // Auf der Ergebnisseite bleibt die Suche auf der Seite, ueberall sonst
    // fuehrt sie zu einem Seitenwechsel. Der Kern muss das wissen, um seinen
    // Stand vorher zu sichern.
    const wechselt = this.seite() !== "results";

    const aktuellesForm = this.finde("#sbForm") || form;
    const knopf = aktuellesForm.querySelector('button[type="submit"], .btn-accent');
    if (knopf) await Zeiger.klicke(knopf, { hinweis: "suchen" });
    else aktuellesForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await Zeiger.warte(400);
    return {
      ok: true,
      text: `Suche ausgeführt: ${getan.join(" · ") || "unverändert"}`,
      daten: wechselt ? { navigiert: true } : this.zustand(),
    };
  },

  // Die Belegung liegt hinter einem Aufklapper. Der Agent oeffnet ihn sichtbar,
  // stellt ein und bestaetigt - alles ueber dieselben Knoepfe wie ein Mensch.
  async belegungSetzen(erwachsene, kinder, kinderAlter = null) {
    const ausloeser = this.finde("#sbGuests");
    if (!ausloeser) return false;
    await Zeiger.klicke(ausloeser, { hinweis: "Reisende" });
    await Zeiger.warte(220);

    // Die Stepper heissen a+/a- fuer Erwachsene und c+/c- fuer Kinder,
    // jeweils je Zimmer. Der Agent klickt sie einzeln hoch oder runter.
    const stellen = async (kuerzel, reihe, sollwert) => {
      if (sollwert === null || sollwert === undefined) return;
      for (let schutz = 0; schutz < 10; schutz++) {
        const zeilen = [...document.querySelectorAll("#sbRooms .stepper-row")];
        const zeile = zeilen[reihe];
        if (!zeile) return;
        const ist = +zeile.querySelector(".stepper-value").textContent.trim();
        if (ist === sollwert) return;
        const knopf = zeile.querySelector(`.js-step[data-act="${kuerzel}${ist < sollwert ? "+" : "-"}"]`);
        if (!knopf || knopf.disabled) return;
        await Zeiger.klicke(knopf);
        await Zeiger.warte(120);
      }
    };

    await stellen("a", 0, erwachsene);   // erste Zeile: Erwachsene
    await stellen("c", 1, kinder);       // zweite Zeile: Kinder

    // Alter der Kinder, sichtbar in den Auswahlfeldern
    if (Array.isArray(kinderAlter) && kinderAlter.length) {
      const felder = [...document.querySelectorAll("#sbRooms .js-age")];
      for (const [i, alter] of kinderAlter.entries()) {
        const feld = felder[i];
        if (feld && +feld.value !== +alter) await Zeiger.setzeWert(feld, String(alter), { hinweis: `Kind ${i + 1}: ${alter} Jahre` });
      }
    }

    const uebernehmen = this.finde("#sbApply");
    if (uebernehmen) await Zeiger.klicke(uebernehmen, { hinweis: "übernehmen" });
    return true;
  },

  /* ==================================================================
     Filtern und sortieren
     ================================================================== */

  async filterSetzen(wunsch = {}) {
    if (this.seite() !== "results") return this.fehlt("Die Filterspalte");
    const panel = this.finde("#filterPanel");
    if (!panel) return this.fehlt("Die Filterspalte");

    const gesetzt = [];

    for (const stern of wunsch.sterne || []) {
      const el = this.finde(`.js-star[value="${stern}"]`, panel);
      if (el && !el.checked && await this.klickeFilterZeile(el, `${stern} Sterne`)) gesetzt.push(`${stern} Sterne`);
    }

    for (const kat of wunsch.kategorien || []) {
      const el = this.finde(`.js-cat[value="${kat}"]`, panel);
      if (el && !el.checked && await this.klickeFilterZeile(el, CATEGORY_LABELS?.[kat] || kat)) {
        gesetzt.push(CATEGORY_LABELS?.[kat] || kat);
      }
    }

    for (const a of wunsch.ausstattung || []) {
      const el = this.finde(`.js-amen[value="${a}"]`, panel);
      if (el && !el.checked && await this.klickeFilterZeile(el, AMENITY_LABELS?.[a] || a)) {
        gesetzt.push(AMENITY_LABELS?.[a] || a);
      }
    }

    if (wunsch.zielId !== undefined) {
      const el = this.finde(`.js-ziel[value="${wunsch.zielId}"]`, panel);
      if (el && !el.checked && await this.klickeFilterZeile(el, "Reiseziel")) {
        gesetzt.push(ZIEL_NACH_ID?.[wunsch.zielId]?.name || "Reiseziel");
      }
    }

    if (wunsch.mindestbewertung) {
      const el = this.finde(`.js-rating[value="${wunsch.mindestbewertung}"]`, panel);
      if (el && !el.checked && await this.klickeFilterZeile(el, "Bewertung")) {
        gesetzt.push(`Bewertung ab ${String(wunsch.mindestbewertung).replace(".", ",")}`);
      }
    }

    if (wunsch.maxStrand !== undefined && wunsch.maxStrand !== null) {
      const el = this.finde(`.js-beach[value="${wunsch.maxStrand}"]`, panel);
      if (el && !el.checked && await this.klickeFilterZeile(el, "Strandnähe")) {
        gesetzt.push(el.closest("label")?.querySelector("span")?.textContent.trim() || "strandnah");
      }
    }

    // Der Preisregler wird gezogen, nicht geklickt
    if (wunsch.maxPreis) {
      const regler = this.finde("#fPrice", panel);
      if (regler) {
        await Zeiger.setzeWert(regler, String(wunsch.maxPreis), { hinweis: "Preisgrenze" });
        gesetzt.push(`bis ${wunsch.maxPreis} €`);
      }
    }

    await Zeiger.warte(300);
    const treffer = document.querySelectorAll(".result-card").length;
    return {
      ok: true,
      text: gesetzt.length
        ? `Filter gesetzt: ${gesetzt.join(", ")} · noch ${treffer} Treffer`
        : "Es gab nichts zu filtern, die Auswahl stand schon.",
      daten: this.zustand(),
    };
  },

  async sortieren(nach) {
    const auswahl = this.finde("#sortSelect");
    if (!auswahl) return this.fehlt("Die Sortierung");
    const option = [...auswahl.options].find((o) => o.value === nach);
    if (!option) return { ok: false, text: `Sortierung "${nach}" gibt es hier nicht.` };

    await Zeiger.setzeWert(auswahl, nach, { hinweis: "sortieren" });
    await Zeiger.warte(300);
    return { ok: true, text: `Sortiert nach: ${option.textContent}`, daten: this.zustand() };
  },

  /* ==================================================================
     Ergebnisse ansehen
     ================================================================== */

  // Der Agent scrollt die Liste durch, statt sie stumm auszulesen. Ohne diese
  // Geste wirken seine Aussagen, als kaemen sie aus dem Nichts.
  async ergebnisseLesen(anzahl = 5) {
    const karten = [...document.querySelectorAll(".result-card")].slice(0, anzahl);
    if (!karten.length) return { ok: true, text: "Keine Treffer zum Ansehen.", daten: { treffer: [] } };

    for (const karte of karten) {
      if (Zeiger.abbruch) break;
      await Zeiger.lies(karte, { dauer: 420, hinweis: "vergleiche" });
    }
    const treffer = karten.map((k) => this.kartenDaten(k)).filter(Boolean);
    return { ok: true, text: `${treffer.length} Angebote verglichen.`, daten: { treffer } };
  },

  async unterkunftOeffnen(id) {
    const knopf = this.finde(`a.btn-primary[href*="id=${id}"]`)
      || this.finde(`a.hotel-name[href*="id=${id}"]`);
    if (!knopf) return { ok: false, text: `${id} ist in der Liste gerade nicht sichtbar.` };

    const item = typeof getItemById === "function" ? getItemById(id) : null;
    const name = item?.name || id;
    await Zeiger.klicke(knopf, { hinweis: `öffne ${name}` });
    // Danach folgt ein Seitenwechsel. Der Kern speichert vorher seinen Stand.
    // Kein Text: der Kern hat den Schritt bereits angesagt, sonst stuende
    // "Ich oeffne X" und "Oeffne X" direkt untereinander.
    return { ok: true, daten: { navigiert: true, id } };
  },

  /* ==================================================================
     Bewertungen - der eigentliche Mehrwert
     ================================================================== */

  // Hier zahlt sich data/bewertungen.js aus: Der Agent kann sagen, was ein
  // Mensch erst nach langem Lesen saehe. Ohne dieses Werkzeug ist der Agent
  // nur eine schnellere Suchmaske.
  async bewertungenLesen(id) {
    const item = typeof getItemById === "function" ? getItemById(id) : null;
    if (!item) return { ok: false, text: `${id} kenne ich nicht.` };
    if (typeof aspektKurzfassung !== "function") return this.fehlt("Die Bewertungsauswertung");

    const bereich = this.finde("#reviewList")?.closest("section, .card")
      || this.finde("#reviewList")
      || this.finde(".reviews, [data-bereich='bewertungen']");
    if (bereich) await Zeiger.lies(bereich, { dauer: 1400, hinweis: "lese Bewertungen" });

    const k = aspektKurzfassung(item);
    const bilanz = (k.bilanz || []).map((a) => ({
      aspekt: a.label,
      erwaehnungen: a.erwaehnungen,
      anteilPositiv: Math.round(a.anteilPositiv * 100) / 100,
    }));

    // "Lage und Sauberkeit und Service" liest sich falsch - das letzte Glied
    // bekommt "und", die davor Kommas.
    const aufzaehlen = (liste) => liste.length < 2
      ? (liste[0] || "")
      : `${liste.slice(0, -1).join(", ")} und ${liste[liste.length - 1]}`;

    // "Gelobt wird Sauberkeit und Lage" waere falsch - bei mehreren Gliedern
    // steht das Verb im Plural.
    const verb = k.staerken.length > 1 ? "werden" : "wird";
    const satz = k.staerken.length
      ? `Gelobt ${verb} vor allem ${aufzaehlen(k.staerken)}${k.schwaechen.length ? `, kritisiert ${aufzaehlen(k.schwaechen)}` : ""}.`
      : "Die Bewertungen fallen über alle Punkte hinweg gleichmäßig aus.";

    return {
      ok: true,
      text: `${item.reviewCount} Bewertungen ausgewertet. ${satz}`,
      daten: {
        id: item.id, name: item.name, note: item.rating, anzahl: item.reviewCount,
        gelobt: k.staerken, kritisiert: k.schwaechen, bilanz,
      },
    };
  },

  /* Bewertungen mehrerer Treffer sichten, ohne die Liste zu verlassen.
     ------------------------------------------------------------------
     Das ist der Schritt, den ein Mensch nicht macht: fuenf Haeuser
     durchsehen, bevor man eines oeffnet. Der Agent faehrt die Karten
     sichtbar an, damit nachvollziehbar bleibt, worueber er gerade
     nachdenkt - und zieht die Bilanz aus den Daten, nicht aus dem DOM.
     Ohne die sichtbare Bewegung waere der Schritt fuer die teilnehmende
     Person eine Blackbox, und genau das soll er nicht sein. */
  async bewertungenSichten(anzahl = 5) {
    if (typeof aspektbilanz !== "function") return this.fehlt("Die Bewertungsauswertung");
    const karten = [...document.querySelectorAll(".result-card")].slice(0, anzahl);
    if (!karten.length) return { ok: true, text: "Nichts zu sichten.", daten: { gesichtet: [] } };

    const gesichtet = [];
    for (const karte of karten) {
      if (Zeiger.abbruch) break;
      const daten = this.kartenDaten(karte);
      if (!daten) continue;
      const item = typeof getItemById === "function" ? getItemById(daten.id) : null;
      if (!item) continue;
      await Zeiger.lies(karte, { dauer: 620, hinweis: `${item.name}: Bewertungen` });
      gesichtet.push(daten.id);
    }
    // "Haeuser" passt nicht auf Ferienwohnungen
    const wohnungen = gesichtet.some((id) =>
      (typeof getItemById === "function" ? getItemById(id)?.type : null) === "apartment");
    const wort = wohnungen
      ? (gesichtet.length === 1 ? "Wohnung" : "Wohnungen")
      : (gesichtet.length === 1 ? "Haus" : "Häuser");
    return {
      ok: true,
      text: `${gesichtet.length} ${wort} im Detail durchgesehen, insgesamt ${gesichtet
        .map((id) => (typeof getItemById === "function" ? getItemById(id)?.reviewCount : 0) || 0)
        .reduce((a, b) => a + b, 0)
        .toLocaleString("de-DE")} Bewertungen.`,
      daten: { gesichtet },
    };
  },

  // Hat diese Seite ueberhaupt eine Suchmaske? Auf der Detail-, Buchungs-
  // und Merkzettelseite gibt es keine.
  // Regionen mit Trefferzahl aus der Filterspalte - fuer die Etappe
  // "wo gibt es in dem Zeitraum etwas", bevor das Ziel feststeht.
  zieleZaehlen() {
    if (this.seite() !== "results") return { ok: false, text: "Keine Trefferliste offen.", daten: { regionen: [] } };
    const regionen = [...document.querySelectorAll(".js-ziel")].map((el) => {
      const zeile = el.closest("label");
      const name = (zeile?.querySelector("span")?.textContent || "").replace(/·.*$/, "").trim();
      const anzahl = parseInt(zeile?.querySelector(".count")?.textContent || "0", 10) || 0;
      const saison = /Saison/.test(zeile?.textContent || "");
      return { id: el.value, name, anzahl, saison };
    }).filter((r) => r.id);
    return { ok: true, text: `${regionen.length} Regionen gezählt.`, daten: { regionen } };
  },

  hatSuchmaske() {
    return !!this.finde("#sbForm");
  },

  // Auf die Startseite wechseln, weil die Suche hier nicht moeglich ist.
  // Sichtbar ueber das Logo geklickt, nicht per location.href - der Weg soll
  // nachvollziehbar bleiben.
  async zurStartseite() {
    // Frueher klickte der Zeiger dafuer auf das Logo oben links - fuer die
    // Person sah das aus wie ein Klick ins Leere. Der Seitenwechsel
    // passiert jetzt direkt; im Log steht er trotzdem.
    await Zeiger.warte(400);
    location.href = "index.html";
    return { ok: true, daten: { navigiert: true } };
  },

  // Zurueck aus einer Detailseite in die Trefferliste. Wird gebraucht, wenn
  // jemand nach dem Ansehen eines Vorschlags doch einen anderen will.
  async zurueckZurListe() {
    const knopf = this.finde(".breadcrumb a[href*='results']") || this.finde("a[href*='results.html']");
    if (knopf) {
      await Zeiger.klicke(knopf, { hinweis: "zurück zur Liste" });
      return { ok: true, text: "Zurück zur Trefferliste.", daten: { navigiert: true } };
    }
    history.back();
    return { ok: true, text: "Zurück zur Trefferliste.", daten: { navigiert: true } };
  },

  /* ==================================================================
     Merken und buchen
     ================================================================== */

  async merken(id) {
    const knopf = this.finde(`[data-wish="${id}"]`) || this.finde("#detailWish");
    if (!knopf) return { ok: false, text: "Kein Merken-Knopf auf dieser Seite." };
    if (typeof Wishlist !== "undefined" && Wishlist.has(id)) {
      return { ok: true, text: "Steht schon auf dem Merkzettel." };
    }
    const item = typeof getItemById === "function" ? getItemById(id) : null;
    await Zeiger.klicke(knopf, { hinweis: "merken" });
    return { ok: true, text: `${item?.name || id} vorgemerkt.` };
  },

  // Fuehrt bis zur Buchungsseite. Ob der Agent dort auch abschliesst, regelt
  // die Autonomiestufe in agent/kern.js - nicht dieses Werkzeug.
  async zurBuchung(id, verpflegung = null, anreise = null) {
    // Flexibel gesucht: erst den Anreisetag eintragen, sonst gibt es
    // keinen Buchungsknopf
    const feldAnreise = this.finde("#bwAnreise");
    if (feldAnreise) {
      if (!anreise && !feldAnreise.value) return { ok: false, text: "Der Anreisetag fehlt noch.", daten: { anreiseFehlt: true } };
      if (anreise && feldAnreise.value !== anreise) {
        await Zeiger.setzeWert(feldAnreise, anreise, { hinweis: "Anreise" });
        await Zeiger.warte(300);
        // Ein Auswahlfeld (Flugtage) nimmt nur seine Optionen an
        const jetzt = this.finde("#bwAnreise");
        if (jetzt && jetzt.value !== anreise) return { ok: false, text: `Der ${anreise} ist hier kein möglicher Anreisetag.`, daten: { anreiseFehlt: true } };
      }
    }
    // Verpflegung einstellen, wenn eine gewuenscht war. Sichtbar, wie
    // jeder andere Schritt - und wenn das Haus sie nicht anbietet, wird
    // das gesagt statt still uebergangen.
    let hinweis = "";
    if (verpflegung && typeof BOARD_LABELS !== "undefined") {
      const label = BOARD_LABELS[verpflegung];
      const chip = [...document.querySelectorAll(".js-board")].find((b) => b.textContent.trim().startsWith(label));
      if (chip) {
        if (!chip.classList.contains("active")) await Zeiger.klicke(chip, { hinweis: label });
      } else {
        hinweis = ` ${label} gibt es hier nicht - ich habe die Standardverpflegung gelassen.`;
      }
    }
    const knopf = this.finde("#bwBook, .bw-book, .booking-widget .btn-accent")
      || this.finde(`.js-book[data-id="${id}"]`);
    if (!knopf) return this.fehlt("Der Buchungsknopf");
    await Zeiger.klicke(knopf, { hinweis: "zur Buchung" });
    return { ok: true, text: "Buchungsstrecke geöffnet." + hinweis, daten: { navigiert: true, id } };
  },

  // Die Buchungsstrecke hat drei Schritte: Gastdaten, Pruefen, Bestaetigung.
  //
  // Die Gastdaten kommen aus dem Voyara-Konto der Person - so, wie ein
  // echter Kaufagent mit dem hinterlegten Profil arbeitet. Erfinden darf
  // der Agent nichts: Gibt es kein Konto und sind die Felder leer, nennt
  // er, was fehlt, und wartet. Erfundene Personendaten waeren in einer
  // Studie doppelt falsch - fremde Daten, und im Protokoll stuende eine
  // Eingabe, die die Person nie gemacht hat.
  //
  // Bis wohin er geht, regelt die Freigabestufe in agent/kern.js:
  // "vorbereiten" endet vor dem letzten Klick mit einer Zusammenfassung,
  // "buchen" schliesst ab.
  async buchungAbschliessen({ nurVorbereiten = false } = {}) {
    // Schritt 2 oder 3: Bestaetigungsknopf liegt schon vor
    let knopf = this.finde("#confirmBtn");

    if (!knopf) {
      // Schritt 1: Gastdaten
      const form = this.finde("#guestForm");
      if (!form) return this.fehlt("Die Buchungsstrecke");

      const konto = (typeof Account !== "undefined" && Account.konto?.()) || null;
      const feldName = this.finde("#gName");
      const feldMail = this.finde("#gMail");
      const feldTerms = this.finde("#gTerms");

      // Leere Felder aus dem Konto fuellen - sichtbar, damit die Person
      // sieht, welche Daten der Agent benutzt
      if (konto && feldName && !feldName.value.trim()) {
        await Zeiger.tippe(feldName, `${konto.vorname} ${konto.nachname}`, { hinweis: "Name aus deinem Konto" });
      }
      if (konto && feldMail && !feldMail.value.trim()) {
        await Zeiger.tippe(feldMail, konto.mail, { hinweis: "E-Mail aus deinem Konto" });
      }
      if (feldTerms && !feldTerms.checked) {
        await Zeiger.klicke(feldTerms, { hinweis: "Studienhinweis bestätigen" });
      }

      const name = feldName?.value.trim();
      const mail = feldMail?.value.trim();
      const fehlt = [];
      if (!name) fehlt.push("Name");
      if (!mail) fehlt.push("E-Mail");
      if (fehlt.length) {
        const liste = fehlt.join(" und ");
        return {
          ok: false,
          daten: { wartetAufDaten: true },
          text: `Für den letzten Schritt fehlt noch ${liste}. Ich habe kein Konto, aus dem ich das nehmen könnte - trag es bitte selbst ein und sag dann Bescheid.`,
        };
      }

      const weiter = form.querySelector('button[type="submit"]');
      if (!weiter) return this.fehlt("Der Weiter-Knopf");
      await Zeiger.klicke(weiter, { hinweis: "weiter zur Prüfung" });
      await Zeiger.warte(500);
      knopf = this.finde("#confirmBtn");
      if (!knopf) return this.fehlt("Der Bestätigungsknopf");
    }

    if (nurVorbereiten) {
      return { ok: true, text: "Die Buchung liegt zur Prüfung bereit.", daten: { vorbereitet: true } };
    }

    await Zeiger.klicke(knopf, { hinweis: "Buchung abschließen" });
    return { ok: true, text: "Buchung abgeschlossen — simuliert, es wurde nichts gebucht.", daten: { gebucht: true } };
  },

  // Was auf der Pruefseite steht, fuer die Gegenzeichnung im Chat. Liest
  // die Seite, statt selbst zu rechnen - der Agent soll vorlegen, was die
  // Person auch sieht.
  buchungsZusammenfassung() {
    const block = this.finde("#checkoutMain");
    if (!block) return null;
    const titel = block.querySelector(".review-block h3")?.textContent.trim();
    const zeitraum = block.querySelector(".review-block p")?.textContent.trim();
    const kv = [...block.querySelectorAll(".kv")].map((k) => [k.querySelector("span")?.textContent.trim(), k.querySelector("strong")?.textContent.trim()]);
    const wert = (label) => kv.find(([l]) => l === label)?.[1] || null;
    if (!titel) return null;
    // Zeitraum aus der Adresse (from/to), nicht aus der Untertitelzeile -
    // dort stehen Zimmer, Verpflegung und Flug
    const zeit = typeof Reisedaten !== "undefined" && Reisedaten.text() ? Reisedaten.text() : zeitraum;
    const details = String(zeitraum || "").replace(`${zeit} · `, "").replace(/ · /g, ", ");
    return { titel, zeitraum: zeit, details, gesamt: wert("Gesamtpreis"), name: wert("Name"), mail: wert("E-Mail") };
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Werkzeuge };
