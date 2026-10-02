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
    let abweichung = null;

    // Zuerst die Art. Der Reiter baut die Maske neu auf, deshalb muss er vor
    // allen Feldern geklickt werden - sonst tippt der Agent in Felder, die
    // gleich darauf ersetzt werden.
    if (typ) {
      const reiter = this.finde(`.searchbox-tab[data-type="${typ}"]`);
      if (reiter && !reiter.classList.contains("active")) {
        // Auf der Trefferliste sind die Reiter ausgeblendet - dort ging der
        // Klick ins Leere. Unsichtbar heisst: nicht klicken, sondern melden.
        if (!Zeiger.sichtbar(reiter)) return { ok: false, text: "Die Art lässt sich hier nicht umstellen.", daten: { brauchtStartseite: true } };
        const wort = { apartment: "Ferienwohnungen", hotel: "Hotels", unterkunft: "Unterkünfte" }[typ] || "Unterkünfte";
        await Zeiger.klicke(reiter, { hinweis: wort });
        await Zeiger.warte(260);
        getan.push({ apartment: "Ferienwohnungen", hotel: "Hotels", unterkunft: "Unterkünfte" }[typ] || "Unterkünfte");
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
        // Ein Auswahlfeld nimmt nur Werte an, die es kennt. Fehlt der
        // gewuenschte, wird der naechstliegende genommen und gemeldet -
        // vorher blieb das Feld stumm auf dem alten Wert stehen.
        const werte = [...feldNaechte.options].map((o) => +o.value);
        const ziel = werte.includes(+flex.naechte) ? +flex.naechte
          : werte.sort((a, b) => Math.abs(a - flex.naechte) - Math.abs(b - flex.naechte))[0];
        await Zeiger.setzeWert(feldNaechte, String(ziel), { hinweis: "Dauer" });
        getan.push(`${ziel} Nächte`);
        if (+ziel !== +flex.naechte) abweichung = `Die Maske kennt nur ${werte.sort((a, b) => a - b).join(", ")} Nächte - ich habe ${ziel} eingestellt.`;
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
    // Flug nur bei Hotels - im gemeinsamen Reiter gibt es ihn nicht
    if (flug && typ === "hotel") {
      const haken = this.finde("#sbWithFlight");
      if (haken && haken.checked !== !!flug.mit) {
        await Zeiger.klicke(haken, { hinweis: flug.mit ? "mit Flug" : "ohne Flug" });
        await Zeiger.warte(200);
        getan.push(flug.mit ? "mit Flug" : "ohne Flug");
      }
      if (flug.mit) {
        /* Der Abflughafen ist seit dem 30.09.2026 eine Mehrfachauswahl.
           --------------------------------------------------------------
           Aus dem Auswahlmenue wurde ein Knopf mit Haken dahinter - der
           Agent muss ihn also aufklappen und ankreuzen wie ein Mensch,
           statt einen Wert zu setzen. Mehrere Flughaefen kommen als
           "BER,FRA" an. */
        const soll = typeof Flug !== "undefined" ? Flug.abListe(flug.ab || "") : [];
        const pop = this.finde("#sbFlightPop");
        const jetzt = pop ? [...pop.querySelectorAll(".js-sb-ab:checked")].map((el) => el.value) : [];
        const gleich = soll.length === jetzt.length && soll.every((c) => jetzt.includes(c));
        if (pop && flug.ab !== undefined && !gleich) {
          const knopf = this.finde("#sbFlightFrom");
          if (knopf && pop.hidden) { await Zeiger.klicke(knopf, { hinweis: "Abflughäfen" }); await Zeiger.warte(180); }
          for (const el of [...pop.querySelectorAll(".js-sb-ab")]) {
            const gewollt = soll.includes(el.value);
            if (el.checked !== gewollt) {
              await Zeiger.klicke(el, { hinweis: el.parentElement?.textContent?.trim() || el.value });
              await Zeiger.warte(90);
            }
          }
          const fertig = this.finde("#sbFlightApply");
          if (fertig) { await Zeiger.klicke(fertig, { hinweis: "übernehmen" }); await Zeiger.warte(150); }
          getan.push(`ab ${soll.length ? Flug.abText(soll.join(",")) : "günstigstem Flughafen"}`);
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
      text: `Suche ausgeführt: ${getan.join(" · ") || "unverändert"}${abweichung ? ` (${abweichung})` : ""}`,
      daten: wechselt ? { navigiert: true } : this.zustand(),
    };
  },

  // Die Belegung liegt hinter einem Aufklapper. Der Agent oeffnet ihn sichtbar,
  // stellt ein und bestaetigt - alles ueber dieselben Knoepfe wie ein Mensch.
  async belegungSetzen(erwachsene, kinder, kinderAlter = null) {
    const ausloeser = this.finde("#sbGuests");
    if (!ausloeser) return false;

    /* Steht es schon so da, wird nichts angefasst.
       ----------------------------------------------------------------
       Der Agent klappte bei jeder Suche das Reisendenfeld auf und drueckte
       "uebernehmen", auch wenn sich an der Belegung nichts geaendert hatte.
       Fuer die Person sah es aus wie ein Zucken ohne Grund, und es lenkte
       von dem ab, was er wirklich tat. Die Werte stehen im Dokument, auch
       wenn der Aufklapper zu ist - man kann sie also lesen, ohne ihn zu
       oeffnen. */
    const zeilenJetzt = [...document.querySelectorAll("#sbRooms .stepper-row")];
    const wert = (i) => { const z = zeilenJetzt[i]; return z ? +z.querySelector(".stepper-value")?.textContent.trim() : null; };
    const alterJetzt = [...document.querySelectorAll("#sbRooms .js-age")].map((f) => +f.value);
    const passtSchon = zeilenJetzt.length
      && (erwachsene == null || wert(0) === +erwachsene)
      && (kinder == null || wert(1) === +kinder)
      && (!Array.isArray(kinderAlter) || !kinderAlter.length
        || kinderAlter.every((a, i) => alterJetzt[i] === +a));
    if (passtSchon) return true;

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
    /* Was die Spalte auf diesem Reiter nicht hergibt.
       ----------------------------------------------------------------
       Bis zum 29.09.2026 uebersprang diese Funktion still, was sie nicht
       fand, und meldete trotzdem Erfolg - im schlimmsten Fall sogar "die
       Auswahl stand schon". Das Modell hielt den Filter danach fuer
       gesetzt und redete ueber eine Liste, die es nicht gab. Jetzt steht
       am Ende, was nicht ging, im Text und in den Daten. */
    const nichtGesetzt = [];

    for (const stern of wunsch.sterne || []) {
      const el = this.finde(`.js-star[value="${stern}"]`, panel);
      if (!el) { nichtGesetzt.push(`${stern} Sterne`); continue; }
      if (!el.checked && await this.klickeFilterZeile(el, `${stern} Sterne`)) gesetzt.push(`${stern} Sterne`);
    }

    for (const kat of wunsch.kategorien || []) {
      const el = this.finde(`.js-cat[value="${kat}"]`, panel);
      if (el && !el.checked && await this.klickeFilterZeile(el, CATEGORY_LABELS?.[kat] || kat)) {
        gesetzt.push(CATEGORY_LABELS?.[kat] || kat);
      }
    }

    for (const a of wunsch.ausstattung || []) {
      const el = this.finde(`.js-amen[value="${a}"]`, panel);
      if (!el) { nichtGesetzt.push(AMENITY_LABELS?.[a] || a); continue; }
      if (!el.checked && await this.klickeFilterZeile(el, AMENITY_LABELS?.[a] || a)) {
        gesetzt.push(AMENITY_LABELS?.[a] || a);
      }
    }

    /* Mehrere Regionen auf einmal.
       ----------------------------------------------------------------
       Der Nutzer am 27.09.2026: Auf "ich moechte eine warme Region" sagte
       der Agent, alle warmen seien ausgewaehlt - links stand weiter
       "Alle Ziele". Er konnte es gar nicht: Das Feld liess nur eine
       Region zu. Jetzt sind es Haken, und "eher warm" ist eine Handlung,
       die man sieht.

       Ueberzaehlige Haken werden abgewaehlt. Ohne das bliebe nach einem
       Wechsel von "warm" zu "kalt" beides stehen, und die Liste zeigte
       Lappland neben Mallorca. */
    if (wunsch.ziele !== undefined) {
      const soll = new Set(wunsch.ziele || []);
      const namen = [];
      for (const el of [...panel.querySelectorAll(".js-ziel")]) {
        const gewollt = soll.has(el.value);
        if (el.checked === gewollt) continue;
        /* Gesperrt heisst: Die Region hat in diesem Monat keine Saison.
           Der Kern zaehlt sie ohnehin nicht mehr mit - hier wird nur
           gemeldet, dass der Haken nicht zu setzen war, damit das Modell
           nicht behauptet, die Region sei eingestellt. */
        if (el.disabled) {
          if (gewollt) nichtGesetzt.push(ZIEL_NACH_ID?.[el.value]?.name || el.value);
          continue;
        }
        const name = ZIEL_NACH_ID?.[el.value]?.name || el.value;
        if (await this.klickeFilterZeile(el, name) && gewollt) namen.push(name);
      }
      if (namen.length) gesetzt.push(namen.length > 3 ? `${namen.length} Regionen` : namen.join(", "));
    }

    for (const b of wunsch.verpflegung || []) {
      const el = this.finde(`.js-board[value="${b}"]`, panel);
      if (!el) { nichtGesetzt.push(BOARD_LABELS?.[b] || b); continue; }
      if (!el.checked && await this.klickeFilterZeile(el, BOARD_LABELS?.[b] || b)) {
        gesetzt.push(BOARD_LABELS?.[b] || b);
      }
    }

    // Nur reduzierte Haeuser. Der Schalter steht seit dem 27.09.2026 in
    // der Spalte; vorher gab es den Angebotsfilter nur ueber die Adresse,
    // und der Agent konnte den Wunsch deshalb nicht erfuellen.
    if (wunsch.nurAngebote) {
      const el = this.finde(".js-deals", panel);
      if (el && !el.checked && await this.klickeFilterZeile(el, "nur Angebote")) gesetzt.push("nur reduzierte Häuser");
    }

    // WLAN ohne Aufpreis: derselbe Weg wie der Angebotsschalter
    if (wunsch.wlanInklusive) {
      const el = this.finde(".js-wlan", panel);
      if (!el) nichtGesetzt.push("WLAN ohne Aufpreis");
      else if (!el.checked && await this.klickeFilterZeile(el, "WLAN ohne Aufpreis")) gesetzt.push("WLAN ohne Aufpreis");
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

    /* Der Preisregler wird gezogen, nicht geklickt.
       ----------------------------------------------------------------
       Der Rueckgabewert wird ausgewertet: `Zeiger.setzeWert` gibt false
       zurueck, wenn das Element nicht sichtbar ist, und bis zum
       29.09.2026 stand die Preisgrenze trotzdem im Bericht. Der Agent
       meldete "bis 220 €", waehrend der Regler auf 448 stand - gefunden
       von der Seitenpruefung. Bei den Haken war das nie moeglich, dort
       wurde der Rueckgabewert immer geprueft. */
    if (wunsch.maxPreis) {
      const regler = this.finde("#fPrice", panel);
      if (!regler) nichtGesetzt.push(`Preisgrenze ${wunsch.maxPreis} €`);
      else if (await Zeiger.setzeWert(regler, String(wunsch.maxPreis), { hinweis: "Preisgrenze" })
        && Number(regler.value) === Number(wunsch.maxPreis)) {
        gesetzt.push(`bis ${wunsch.maxPreis} €`);
      } else nichtGesetzt.push(`Preisgrenze ${wunsch.maxPreis} €`);
    }

    await Zeiger.warte(300);
    const treffer = document.querySelectorAll(".result-card").length;
    const rest = nichtGesetzt.length ? ` · nicht einstellbar auf dieser Liste: ${nichtGesetzt.join(", ")}` : "";
    return {
      ok: true,
      text: gesetzt.length
        ? `Filter gesetzt: ${gesetzt.join(", ")} · noch ${treffer} Treffer${rest}`
        : (nichtGesetzt.length
          ? `Nichts eingestellt: ${nichtGesetzt.join(", ")} gibt es auf dieser Liste nicht als Filter.`
          : "Es gab nichts zu filtern, die Auswahl stand schon."),
      daten: { ...this.zustand(), nichtGesetzt, abdruck: this.filterAbdruck() },
    };
  },

  /* Ein Fingerabdruck der Filterspalte.
     ------------------------------------------------------------------
     Gemeldet am 01.10.2026: Die Person war auf den Hotelreiter gewechselt
     - ein Seitenwechsel, der die Spalte zuruecksetzt - und bat den Agenten
     danach, die Filter wieder zu setzen. Er antwortete "Die Filter sind
     schon gesetzt und die Liste steht bereit". Aus seiner Sicht stimmte
     das: Er vergleicht seinen eigenen Stand mit dem, womit er zuletzt
     gefiltert hat, und der hatte sich nicht geaendert. Nur stand auf der
     Seite nichts mehr davon.

     Also wird nicht mehr der Stand mit sich selbst verglichen, sondern
     mit der Seite. Der Abdruck haelt fest, was die Spalte wirklich
     anzeigt: welcher Reiter, welche Haken, welcher Preisregler. Aendert
     er sich, ohne dass der Agent etwas getan hat, war jemand anderes dran. */
  filterAbdruck() {
    if (typeof document === "undefined") return null;
    if (this.seite() !== "results") return null;
    const haken = [...document.querySelectorAll("#filterPanel input:checked")]
      .map((e) => `${(e.className || "").split(" ")[0]}=${e.value}`).sort();
    const preis = document.getElementById("fPrice");
    const typ = typeof state !== "undefined" ? (state.typ ?? state.type ?? null) : null;
    return JSON.stringify([typ, haken, preis ? String(preis.value) : null]);
  },

  async sortieren(nach) {
    const auswahl = this.finde("#sortSelect");
    if (!auswahl) return this.fehlt("Die Sortierung");
    const option = [...auswahl.options].find((o) => o.value === nach);
    if (!option) return { ok: false, text: `Sortierung "${nach}" gibt es hier nicht.` };
    // Steht die Sortierung schon so, wird sie nicht noch einmal gesetzt -
    // sonst blinkt bei jeder Suche kurz eine Auswahl auf, die niemand
    // geaendert hat.
    if (auswahl.value === nach) return { ok: true, text: `Sortierung steht schon auf: ${option.textContent}`, daten: this.zustand() };

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
    const alle = [...document.querySelectorAll(".result-card")];
    const karten = alle.slice(0, anzahl);
    if (!karten.length) return { ok: true, text: "Keine Treffer zum Ansehen.", daten: { treffer: [] } };

    /* Gelesen werden die ersten Karten - durchlaufen wird die ganze Liste.
       ----------------------------------------------------------------
       Der Nutzer am 30.09.2026: "So hat er ja nicht alle gescannt, und
       wir wollen ja wirklich so tun, als wuerde der Agent alles
       scannen." Er hat recht, und es ist nicht nur Optik: Der Kern
       rechnet ohnehin ueber den ganzen Katalog (`imKatalog`), die
       gelesenen Karten sind nur die Stichprobe von der Seite. Die
       Bewegung zeigt jetzt, was er wirklich ueberblickt.

       Welche Karten in die Auswertung gehen, aendert sich dabei nicht -
       es bleiben dieselben ersten `anzahl`. Sonst waere mit einer
       Bewegung auch das Ergebnis der Erhebung verschoben. */
    const beiHalt = async (karte) => {
      await Zeiger.lies(karte, { dauer: 420, hinweis: "vergleiche" });
    };
    const r = await this.scrollDurch({
      elemente: alle, halte: karten, beiHalt, zaehlwort: "Häusern", tempoMs: 22,
    });
    // Dieselbe Selbstpruefung wie bei den Bewertungen: Steht die Seite still,
    // waehrend der Agent "vergleicht", steht das im Protokoll. Bei wenigen
    // Karten passt die Liste auf den Schirm - dann ist Stillstand richtig.
    if (!r.gescrollt && alle.length >= 8 && typeof Kern !== "undefined") {
      Kern.notieren?.("scroll_ohne_wirkung", { wo: "trefferliste", karten: alle.length });
    }
    const treffer = karten.map((k) => this.kartenDaten(k)).filter(Boolean);
    return { ok: true, text: `${treffer.length} Angebote verglichen.`, daten: { treffer, gescrollt: r.gescrollt } };
  },

  /* Einmal ganz durch, mit Halt unterwegs.
     ------------------------------------------------------------------
     Dieselbe Bewegung fuer die Trefferliste und fuer die Bewertungen,
     damit es nicht zwei Fassungen gibt, die auseinanderlaufen. Der
     Nutzer am 30.09.2026 zu beiden Stellen: "Er muss einfach einen ganz
     schnellen Durchlauf machen, die komplette Seite runterscrollen und
     dann wieder hoch", und unterwegs "zum Beispiel bei 30 von 100
     anhalten, den genauer scannen, weiterscrollen".

     Drei Dinge macht sie richtig, die vorher falsch waren:

       - Gemessen wird am ersten und letzten Element, nicht am Kasten
         darum. Der hatte im Moment der Messung die Hoehe 0, und damit
         war die Scrollstrecke null Pixel, waehrend der Zaehler lief.
         Gemessen wird so lange, bis die Seite wirklich steht.
       - Die Schrittweite ist 0,8 Fensterhoehen. Vorher waren es feste
         18 Spruenge, bei einer langen Liste also drei Bildschirme auf
         einmal - das sieht aus wie Ueberspringen, nicht wie Lesen.
       - Der Zaehler haengt an der Scrollposition, nicht an einem eigenen
         Takt. Am Ende steht deshalb genau die Zahl da, die es gibt.

     `halte` sind Elemente, an denen angehalten wird; `beiHalt` bekommt
     das Element und die laufende Nummer. Rueckgabe sagt, ob sich
     wirklich etwas bewegt hat. */
  async scrollDurch({ elemente, halte = [], beiHalt = null, zaehlwort = "", tempoMs = 24 }) {
    const mass = await this.strecke(elemente);
    if (!mass) {
      // Zu kurz zum Scrollen: dann nur die Haltepunkte ansehen
      for (let i = 0; i < halte.length && !Zeiger.abbruch; i++) {
        if (beiHalt) await beiHalt(halte[i], i + 1);
      }
      return { gescrollt: false, strecke: 0, gesamt: elemente.length };
    }
    const { von, bis } = mass;
    const gesamt = elemente.length;
    /* Die Oberkante jeder Karte, einmal gemessen.
       ------------------------------------------------------------------
       Daran haengt der Zaehler. Bis zum 02.10.2026 rechnete er mit dem
       Anteil der SCROLLSTRECKE: `Math.round(gesamt * anteil)`. Das ist
       eine Schaetzung, und man sieht sie - die Zahl sprang, bevor sich
       etwas bewegte, und bei verschieden hohen Karten passte sie nie.
       Der Nutzer: "Es muss ja wirklich pro Kachel, die er ueberfliegt,
       eine Zahl hochgehen. Das kann man doch bestimmt auch echt
       einbauen, ohne dass man es so schlecht faken muss."

       Jetzt zaehlt, was wirklich durch das Fenster gelaufen ist: Eine
       Karte zaehlt, sobald ihre Oberkante den unteren Rand erreicht hat.
       Die Zahl kann damit gar nicht mehr von der Bewegung abweichen. */
    const kanten = elemente.map((el) => window.scrollY + el.getBoundingClientRect().top);
    const gesehen = (bisY) => {
      const rand = bisY + window.innerHeight;
      let n = 0;
      for (const k of kanten) if (k <= rand) n++;
      return Math.min(gesamt, n);
    };
    /* Kleinere Schritte als bisher (0,8 Fensterhoehen): Bei 0,35 wirkt es
       wie Lesen statt wie Blaettern, und zwischen zwei Schritten aendert
       sich der Zaehler um wenige Karten statt um ein Dutzend. Die
       Gesamtdauer bleibt gleich, der Takt passt sich an. */
    const schritt = Math.max(140, Math.round(window.innerHeight * 0.35));
    /* Der Durchlauf soll ueberall gleich lang wirken, egal ob 100 oder
       253 Karten darunterliegen - sonst zieht sich eine lange Liste
       ueber sechs Sekunden hin und wirkt zaeh statt schnell. Angepeilt
       sind rund zweieinhalb Sekunden reines Scrollen; die Halte kommen
       dazu. Der Faktor `Zeiger.tempo` steckt in `warte` mit drin. */
    const schritteGesamt = Math.max(1, Math.ceil((bis - von) / schritt));
    const takt = Math.max(12, Math.min(tempoMs, Math.round((2500 * (Zeiger.tempo || 1)) / schritteGesamt)));
    const startY = window.scrollY;
    let weiteste = startY;
    let naechstes = 0;
    let y = von;
    window.scrollTo({ top: von, behavior: "auto" });
    await Zeiger.warte(120);
    while (y < bis && !Zeiger.abbruch) {
      y = Math.min(bis, y + schritt);
      // Liegt der naechste Haltepunkt in diesem Abschnitt, haelt er dort
      // an, statt an ihm vorbeizuziehen.
      while (naechstes < halte.length && !Zeiger.abbruch) {
        const el = halte[naechstes];
        const ziel = window.scrollY + el.getBoundingClientRect().top;
        if (ziel > y + window.innerHeight * 0.5) break;
        if (beiHalt) await beiHalt(el, naechstes + 1);
        naechstes += 1;
        y = Math.max(y, window.scrollY);
      }
      window.scrollTo({ top: y, behavior: "auto" });
      weiteste = Math.max(weiteste, window.scrollY);
      if (zaehlwort) Zeiger.beschrifte?.(`${Math.max(1, gesehen(y))} von ${gesamt} ${zaehlwort}`);
      await Zeiger.warte(takt);
    }
    // Was noch offen ist, weil die Strecke vorher zu Ende war
    while (naechstes < halte.length && !Zeiger.abbruch) {
      if (beiHalt) await beiHalt(halte[naechstes], naechstes + 1);
      naechstes += 1;
    }
    if (zaehlwort) {
      Zeiger.beschrifte?.(`${gesamt} von ${gesamt} ${zaehlwort}`);
      await Zeiger.warte(160);
    }
    const gescrollt = Math.abs(weiteste - startY) > 8;
    Zeiger.beschrifte?.("");
    window.scrollTo({ top: von, behavior: "auto" });
    await Zeiger.warte(180);
    return { gescrollt, strecke: bis - von, gesamt };
  },

  /* Die Strecke ueber eine Reihe von Elementen - gemessen an ihnen
     selbst, nicht am Kasten darum, und so lange wiederholt, bis die
     Seite steht. Gibt null zurueck, wenn es nichts zu scrollen gibt. */
  async strecke(elemente) {
    for (let versuch = 0; versuch < 8; versuch++) {
      if (elemente.length) {
        const oben = elemente[0].getBoundingClientRect();
        const unten = elemente[elemente.length - 1].getBoundingClientRect();
        const hoehe = (unten.bottom + window.scrollY) - (oben.top + window.scrollY);
        if (hoehe > window.innerHeight) {
          return {
            von: window.scrollY + oben.top - 120,
            bis: window.scrollY + unten.bottom - window.innerHeight + 80,
            hoehe,
          };
        }
      }
      await new Promise((f) => setTimeout(f, 60));
    }
    return null;
  },

  /* Einmal ganz durch die Liste.
     ------------------------------------------------------------------
     Der Nutzer am 27.09.2026: "Wenn er schon mal guckt, wie viele Hotels
     es gibt, dann sollte er auf jeden Fall einmal komplett runterscrollen
     - das macht er aktuell noch nicht."

     Das ist der Unterschied zwischen "ich habe 41 Haeuser gefunden" als
     Behauptung und als Beobachtung. Gescrollt wird schnell, mit einem
     Zaehler daneben: Niemand liest 41 Karten einzeln, und so tut der
     Agent auch nicht so. In die einzelnen Haeuser geht er hier noch
     nicht - das kommt spaeter, wenn die engere Auswahl steht. */
  async listeUeberfliegen() {
    const liste = this.finde("#resultList");
    if (!liste) return this.fehlt("Die Trefferliste");
    /* Nur, was wirklich buchbar in der Liste steht.
       ------------------------------------------------------------------
       Gemeldet am 02.10.2026: "Er zaehlt von 0 bis 205 Hotels hoch,
       obwohl er die Filter schon gesetzt hatte und am Ende nur 125
       rauskamen. Die Zahl darf dann halt auch nur maximal die Zahl sein,
       die auch buchbar sind. Und auch nur die Hotels darf man dann dort
       runterscrollen."

       Karten, die die Seite ausgeblendet hat (ausserhalb der Saison,
       weggefiltert), zaehlen nicht mehr mit und werden auch nicht mehr
       abgefahren. Eine Zahl, eine Quelle - dieselbe Regel wie bei den
       Regionenzahlen in der Filterspalte. */
    const sichtbar = (el) => !!el.offsetParent && !el.hidden && el.getBoundingClientRect().height > 0;
    const alleKarten = [...liste.querySelectorAll(".result-card")];
    const karten = alleKarten.filter(sichtbar);
    if (karten.length !== alleKarten.length && typeof Kern !== "undefined") {
      Kern.notieren?.("karten_ausgeblendet", { sichtbar: karten.length, gesamt: alleKarten.length });
    }
    if (!karten.length) return { ok: true, text: "Keine Treffer zum Durchsehen.", daten: { karten: 0, gescrollt: false } };

    /* Vier Halte, von oben nach unten, und er merkt sie sich.
       ----------------------------------------------------------------
       Der Nutzer am 02.10.2026 beschreibt den Ablauf, den er erwartet:
       "Dass er einfach wirklich von oben bis unten runtergeht und dann
       bei manchen Hotels stoppt" - und weiter, als besserer Vorschlag
       als der bisherige: "dass er quasi, waehrend er die Hotels
       durchgeht und immer stoppt, dass da dann steht: speichere Hotel
       fuer spaetere Ansicht. Dann kann er nachher auch zwischen den
       Product Detail Pages springen."

       Genau so: Beim Halt wird gemerkt, nicht geoeffnet. Erst nach dem
       Durchgang geht er die gemerkten Haeuser auf (haeuser_ansehen).
       Damit hat der Durchgang eine erkennbare Aufgabe, und der Wechsel
       zwischen Liste und Hausseite passiert nicht mehr mittendrin.

       Die Halte liegen jetzt auch im ersten Drittel: Der frueheste lag
       bei 30 Prozent, und davor lief die Liste ohne jeden Halt durch -
       das war der Teil, der wirr wirkte. */
    const anteile = karten.length >= 20 ? [0.12, 0.38, 0.64, 0.88]
      : karten.length >= 8 ? [0.15, 0.5, 0.85] : [];
    const halte = anteile.map((a) => karten[Math.round(a * (karten.length - 1))])
      .filter((el, i, liste) => el && liste.indexOf(el) === i);
    const gesehen = [];
    const beiHalt = async (el, nr) => {
      el.classList.add("agent-gelesen");
      const name = el.querySelector(".hotel-name")?.textContent?.trim() || "";
      await Zeiger.lies(el, { dauer: 520, hinweis: name ? `merkt sich ${name}` : "merkt sich dieses Haus" });
      if (name) gesehen.push(name);
      if (typeof Kern !== "undefined") Kern.notieren?.("haus_gemerkt", { name, nr });
    };

    const r = await this.scrollDurch({ elemente: karten, halte, beiHalt, zaehlwort: "Häusern", tempoMs: 22 });
    // Dieselbe Selbstpruefung wie bei den Bewertungen
    if (!r.gescrollt && karten.length > 6 && typeof Kern !== "undefined") {
      Kern.notieren?.("scroll_ohne_wirkung", { wo: "trefferliste_ueberflogen", karten: karten.length });
    }
    return {
      ok: true,
      text: `${karten.length} Häuser durchgesehen.`,
      daten: { karten: karten.length, gescrollt: r.gescrollt, angesehen: gesehen },
    };
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
  /* Bewertungen sichtbar durchgehen.
     ------------------------------------------------------------------
     Bis zum 23.09.2026 suchte diese Stelle "#reviewList". So heisst der
     Kasten auf der Hausseite nicht - er heisst ".review-list" und liegt
     in "#reviewPanel". Der Selektor griff also nie: Der Agent sagte,
     was die Gaeste loben und kritisieren, waehrend die Seite
     stillstand. Genau das ist der Punkt, an dem ein Werkzeug-Agent
     unglaubwuerdig wird - er behauptet Arbeit, die man nicht sieht.

     Jetzt faehrt er zuerst den Notenkasten an, geht dann einzelne
     Bewertungen durch (bevorzugt die, die den gefragten Aspekt
     erwaehnen) und laedt notfalls nach. Das dauert sechs bis zehn
     Sekunden. Die Bilanz zieht er weiter aus den Daten und nicht aus
     dem DOM - gelesen wird trotzdem, und zwar sichtbar. */
  async bewertungenLesen(id, { aspekt = "", anzahl = 4 } = {}) {
    const item = typeof getItemById === "function" ? getItemById(id) : null;
    if (!item) return { ok: false, text: `${id} kenne ich nicht.` };
    if (typeof aspektKurzfassung !== "function") return this.fehlt("Die Bewertungsauswertung");

    const gelesen = [];
    let durchgesehen = 0;
    let gescrollt = null;
    const panel = this.finde("#reviewPanel");
    if (panel) {
      const kopf = this.finde(".review-summary", panel);
      if (kopf) await Zeiger.lies(kopf, { dauer: 700, hinweis: `Gesamtnote` });

      /* Der schnelle Gang durch die Bewertungen.
         ----------------------------------------------------------------
         Zwei Rueckmeldungen des Nutzers, die zusammengehoeren. Erst:
         "Es waere cooler, wenn es aussieht, als wuerde er ganz schnell
         ganz viele Bewertungen scannen." Dann, am 27.09.2026: "Er
         scrollt nicht ansatzweise 200 Kommentare runter, es ist viel zu
         langsam, man nimmt selbst wahr, dass es gar nicht so viele
         sind."

         Er hat beide Male dasselbe gemeint. Der Zaehler lief bis 398,
         waehrend zehn Karten im Dokument standen - jeder, der hinsieht,
         merkt das. Die Loesung ist nicht, den Zaehler zu verstecken,
         sondern die Bewertungen wirklich zu laden: Der Agent klickt
         "Weitere Bewertungen laden", bis vierzig bis fuenfzig Stimmen da
         sind, und geht dann schnell durch. Der Zaehler zaehlt danach,
         was tatsaechlich unter dem Zeiger durchlaeuft.

         Die 398 bleiben trotzdem richtig - aber als das, was sie sind:
         eine Auswertung ueber alle Datensaetze, nicht ein Lesevorgang.
         Das steht im Ergebnissatz, nicht am Zeiger. */
      /* Erst aufstocken, dann durchrauschen.
         ----------------------------------------------------------------
         Zehnmal auf "mehr laden" zu klicken dauert laenger als das
         Scrollen danach und sieht nach nichts aus. Die Hausseite stellt
         dem Agenten deshalb einen eigenen Weg bereit: hundert Stimmen in
         einem Zug. Fuer die Person bleibt es bei zehn je Klick - der
         Unterschied ist gewollt und ist das, was er ihr voraushat. */
      const menge = Math.min(item.reviewCount || 0, 100);
      let geladen = panel.querySelectorAll(".review-item").length;
      if (typeof window.bewertungenAufstocken === "function" && menge > geladen) {
        Zeiger.beschrifte?.(`${menge} Bewertungen laden`);
        geladen = window.bewertungenAufstocken(menge) || geladen;
        await Zeiger.warte(260);
      }

      /* Ein Durchgang statt zwei.
         ----------------------------------------------------------------
         Bis zum 30.09.2026 lief das hier in zwei Etappen: erst ganz durch
         die Liste mit hochlaufendem Zaehler, dann zurueck nach oben, dann
         noch einmal hinunter zu den einzelnen Stimmen. Der Nutzer: "Das
         ist halt irgendwie komisch gemacht." Er hat recht - kein Mensch
         liest so. Die Bewegung selbst steht jetzt in `scrollDurch`, wo
         auch die Trefferliste sie holt. */
      // Bewertungen, die den gefragten Aspekt ueberhaupt erwaehnen. Die
      // Marker unter jeder Bewertung tragen das Label ("+ Essen"), danach
      // laesst sich filtern, ohne den Text zu durchsuchen.
      const suche = String(aspekt || "").toLowerCase();
      const auswahl = () => {
        const alle = [...panel.querySelectorAll(".review-item")];
        if (!suche) return alle;
        const treffer = alle.filter((el) => [...el.querySelectorAll(".aspekt-marker .marker")]
          .some((m) => m.textContent.toLowerCase().includes(suche)));
        return treffer.length ? treffer : alle;
      };

      let liste = auswahl();
      // Steht zu dem Aspekt auf der ersten Seite kaum etwas, wird
      // nachgeladen - so wuerde ein Mensch es auch machen.
      const mehr = this.finde("#mehrReviews", panel);
      if (suche && liste.length < 2 && mehr) {
        await Zeiger.klicke(mehr, { hinweis: "lädt weitere Bewertungen" });
        await Zeiger.warte(450);
        liste = auswahl();
      }

      /* Welche Stimmen er sich heraussucht - und wo.
         ----------------------------------------------------------------
         Zwei Anforderungen, die zusammengehen muessen. Der Nutzer am
         27.09.2026: "Das duerfen nicht die ersten vier sein." Und am
         30.09.2026: "Dann haelt er zum Beispiel bei 30 von 100 an, scannt
         den genauer, scrollt weiter, haelt bei 70 an, dann bei 90."

         Also legen drei Baender fest, WO angehalten wird, und der Inhalt
         entscheidet, WELCHE Stimme es innerhalb des Bandes wird: im
         ersten eine, die den Wunsch lobt, im zweiten eine mit Kritik.
         Lob allein liest sich wie Werbung. */
      const lobt = (el) => [...el.querySelectorAll(".aspekt-marker .marker.plus")]
        .some((m) => !suche || m.textContent.toLowerCase().includes(suche));
      const bemaengelt = (el) => el.querySelector(".aspekt-marker .marker.minus");
      const wieViele = Math.max(1, Math.min(anzahl, 5));
      const baender = wieViele === 1 ? [0.5]
        : Array.from({ length: wieViele }, (_, i) => 0.28 + (0.62 * i) / (wieViele - 1));
      const gewaehlt = [];
      const fenster = Math.max(2, Math.round(liste.length * 0.08));
      const suchen = (mitte, pred) => {
        for (let d = 0; d <= fenster; d++) {
          for (const j of [mitte - d, mitte + d]) {
            const el = liste[j];
            if (el && !gewaehlt.includes(el) && (!pred || pred(el))) return el;
          }
        }
        return null;
      };
      baender.forEach((anteil, i) => {
        const mitte = Math.min(liste.length - 1, Math.max(0, Math.round(anteil * (liste.length - 1))));
        const wunsch = i === 0 ? lobt : (i === 1 ? bemaengelt : null);
        const el = suchen(mitte, wunsch) || suchen(mitte, null);
        if (el) gewaehlt.push(el);
      });
      // In der Reihenfolge der Seite, nicht der Auswahl - sonst springt
      // der Zeiger hoch und runter
      const reihenfolge = liste.filter((el) => gewaehlt.includes(el));

      const lesen = async (el, nummer) => {
        /* Markiert, damit sichtbar ist, WELCHE Stimmen er sich angesehen
           hat - sonst bleibt eine Pause vor einer Textwand bedeutungslos.
           Nicht "agent-liest": Das ist die Hervorhebung des Zeigers, und
           die nimmt er am Ende jeder Bewegung selbst wieder weg. */
        el.classList.add("agent-gelesen");
        const autor = el.querySelector(".review-who strong")?.textContent?.trim() || "";
        const note = el.querySelector(".review-rating")?.textContent?.trim() || "";
        const titel = el.querySelector("h4")?.textContent?.trim() || "";
        const text = el.querySelector("p")?.textContent?.trim() || "";
        await Zeiger.lies(el, { dauer: 760, hinweis: `Bewertung ${nummer} von ${reihenfolge.length}${autor ? `: ${autor}` : ""}` });
        gelesen.push({ autor, note, titel, text });
      };

      /* Dieselbe Bewegung wie in der Trefferliste - eine Funktion, zwei
         Stellen. `scrollDurch` misst selbst nach, haelt an den gewaehlten
         Stimmen an und fuehrt den Zaehler mit der Scrollposition. */
      const alleKarten = [...panel.querySelectorAll(".review-item")];
      const lauf = await this.scrollDurch({
        elemente: alleKarten, halte: reihenfolge, beiHalt: lesen, zaehlwort: "Bewertungen", tempoMs: 24,
      });
      gescrollt = lauf.gescrollt;
      /* Der Schritt prueft sich selbst: Eine hochlaufende Zahl neben
         einer Seite, die stillsteht, behauptet Arbeit, die nicht
         stattfindet - zweimal gemeldet, beide Male still. */
      if (!gescrollt && alleKarten.length > 12 && typeof Kern !== "undefined") {
        Kern.notieren?.("scroll_ohne_wirkung", { wo: "bewertungen", id, karten: geladen });
      }

      /* Zwei Zahlen, zwei Bedeutungen - und beide muessen stimmen.
         ----------------------------------------------------------------
         `durchgesehen` ist, was tatsaechlich unter dem Zeiger durchlief.
         Die Bilanz weiter unten rechnet ueber alle Datensaetze des
         Hauses; das steht im Ergebnissatz und ist etwas anderes als
         Lesen. */
      durchgesehen = geladen;

      // Die Markierungen bleiben stehen, bis der Agent die Seite verlaesst:
      // Wer danach hinsieht, soll nachvollziehen koennen, worauf sich sein
      // Satz stuetzt. Beim naechsten Haus faengt es ohnehin von vorn an.
    }

    // Ohne Bewertungskasten auf der Seite (Trefferliste, Startseite) kommen
    // die Stimmen aus denselben Daten, aus denen die Seite sie baut. Ohne
    // sie erfand das Modell den Inhalt: Auf "was sagen die Gaeste konkret
    // zum Essen" kam "sie schaetzen Qualitaet und Vielfalt" - ein Satz, den
    // keine Bewertung hergibt. Jetzt steht echter Wortlaut im Ergebnis.
    if (!gelesen.length && typeof bewertungenFuer === "function") {
      const suche = String(aspekt || "").toLowerCase();
      const vorrat = bewertungenFuer(item, 0, 20);
      const passt = (r) => !suche || Object.keys(r.aspekte || {})
        .some((a) => ((typeof ASPEKT_NACH_ID !== "undefined" && ASPEKT_NACH_ID[a]?.label) || a).toLowerCase().includes(suche));
      for (const r of vorrat.filter(passt).slice(0, anzahl)) {
        gelesen.push({ autor: r.author, note: String(r.rating), titel: r.title, text: r.text });
      }
    }

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
        sichtbarGelesen: panel ? gelesen.length : 0, stimmen: gelesen,
        durchgesehen: durchgesehen || null, gescrollt,
      },
    };
  },

  /* Ein Haus wirklich ansehen - so, wie ein Mensch es taete.
     ------------------------------------------------------------------
     Der Agent hatte bis zum 23.09.2026 keinen Grund, eine Hausseite zu
     oeffnen, bevor er sie vorschlaegt: Alles, was er wissen muss, steht
     im Katalog. Fuer die teilnehmende Person ist genau das der
     Unterschied zwischen "er hat nachgesehen" und "er behauptet etwas".
     Dieser Schritt kostet Zeit und bringt technisch nichts - er ist der
     Gegenstand der Untersuchung.

     Der Reihe nach: Notenkasten, einzelne Bewertungen (bevorzugt die
     zum genannten Wunsch), das Zimmer, das zur Gruppe passt, und die
     gewuenschte Verpflegung. Zimmer und Verpflegung werden wirklich
     gesetzt, nicht nur betrachtet - sie gelten spaeter in der Kasse. */
  async hausPruefen(id, { aspekt = "", verpflegung = null, personenProZimmer = 0 } = {}) {
    let gewaehltesZimmer = null;
    const item = typeof getItemById === "function" ? getItemById(id) : null;
    if (!item) return { ok: false, text: `${id} kenne ich nicht.` };
    const schritte = [];

    const b = await this.bewertungenLesen(id, { aspekt, anzahl: 3 });
    if (b.daten?.durchgesehen) schritte.push(`${b.daten.durchgesehen.toLocaleString("de-DE")} Bewertungen durchgesehen`);
    else if (b.daten?.sichtbarGelesen) schritte.push(`${b.daten.sichtbarGelesen} Bewertungen gelesen`);

    // Zimmer: das erste, in das die Gruppe passt
    if (!Zeiger.abbruch) {
      const zeilen = [...document.querySelectorAll(".room-row")];
      const passend = zeilen.find((z) => !z.classList.contains("zu-klein")) || zeilen[0];
      if (passend) {
        gewaehltesZimmer = passend.querySelector("h4")?.textContent?.trim() || null;
        await Zeiger.lies(passend, { dauer: 700, hinweis: "Zimmer prüfen" });
        // "Zimmer Zimmer Standard" - die Zimmernamen tragen das Wort oft schon
        const roh = passend.querySelector("h4")?.textContent?.trim() || "";
        const zimmer = /^zimmer\b/i.test(roh) ? roh : `Zimmer ${roh}`.trim();
        const knopf = passend.querySelector(".js-room:not([disabled])");
        if (knopf && !passend.classList.contains("selected")) {
          await Zeiger.klicke(knopf, { hinweis: "Zimmer wählen" });
          schritte.push(`${zimmer} gewählt`);
        } else if (roh) {
          schritte.push(`${zimmer} passt`);
        }
      }
    }

    // Verpflegung, wenn eine gewuenscht ist
    if (!Zeiger.abbruch && verpflegung && typeof BOARD_LABELS !== "undefined") {
      const label = BOARD_LABELS[verpflegung];
      const chip = [...document.querySelectorAll(".js-board")].find((x) => x.textContent.trim().startsWith(label));
      if (chip && !chip.classList.contains("active")) {
        await Zeiger.klicke(chip, { hinweis: label });
        schritte.push(`${label} eingestellt`);
      } else if (!chip) {
        schritte.push(`${label} gibt es hier nicht`);
      }
    }

    return { ok: true, text: `${item.name}: ${schritte.join(", ") || "angesehen"}.`,
      daten: { id, name: item.name, schritte, zimmer: gewaehltesZimmer, durchgesehen: b.daten?.durchgesehen || null,
        stimmen: b.daten?.stimmen || [], bilanz: b.daten?.bilanz || [] } };
  },

  /* Kurz hineinschauen, ohne etwas anzufassen.
     ------------------------------------------------------------------
     Wunsch des Nutzers vom 27.09.2026: Der Agent soll waehrend der
     Suche "nicht nur scrollen innerhalb des Bereichs, sondern vielleicht
     auch mal in ein, zwei Hotels reingehen. Einfach nur kurz einmal die
     Seite angucken, dann wieder raus. Er muss ja noch nicht direkt die
     Bewertung ansehen, aber dass er sich anguckt, okay, gibt es
     ueberhaupt eine Halbpension und so."

     Das ist der Unterschied zwischen einer Aussage aus dem Katalog und
     einer, die jemand nachgesehen hat. Deshalb wird hier nichts
     geklickt und nichts gewaehlt: Zimmer und Verpflegung werden
     angefahren und gelesen, die Seite bleibt, wie sie war. Was der
     Agent hier sieht, darf er danach sagen - vor dem Rundgang hat er
     dazu nichts in der Hand. Bewertungen bleiben aussen vor; die sind
     Sache des Rundgangs und dauern zehnmal so lange. */
  async hausUeberfliegen(id) {
    const item = typeof getItemById === "function" ? getItemById(id) : null;
    if (!item) return { ok: false, text: `${id} kenne ich nicht.` };
    const schritte = [];

    const zimmerZeilen = [...document.querySelectorAll(".room-row")];
    if (zimmerZeilen.length && !Zeiger.abbruch) {
      await Zeiger.lies(zimmerZeilen[0], { dauer: 600, hinweis: "Zimmer ansehen" });
      const namen = zimmerZeilen.map((z) => z.querySelector("h4")?.textContent?.trim()).filter(Boolean);
      const zuKlein = zimmerZeilen.filter((z) => z.classList.contains("zu-klein")).length;
      schritte.push(namen.length === 1
        ? `${namen[0]}`
        : `${namen.length} Zimmerarten${zuKlein ? `, davon ${zuKlein} zu klein für die Gruppe` : ""}`);
    }

    const chips = [...document.querySelectorAll(".js-board")];
    if (chips.length && !Zeiger.abbruch) {
      await Zeiger.lies(chips[0].closest(".board-options") || chips[0], { dauer: 700, hinweis: "Verpflegung ansehen" });
      // Der Text des Knopfes traegt Bezeichnung und Aufpreis in zwei Zeilen
      const verpflegung = chips.map((c) => (c.textContent || "").trim().split("\n")[0].trim()).filter(Boolean);
      schritte.push(`Verpflegung: ${verpflegung.join(", ")}`);
    }

    return { ok: true, text: `${item.name}: ${schritte.join(" · ") || "angesehen"}.`,
      daten: { id, name: item.name, schritte,
        verpflegung: (item.boards || []).map((b) => b.key),
        zimmer: (item.rooms || []).map((r) => r.name) } };
  },

  /* Bewertungen mehrerer Treffer sichten, ohne die Liste zu verlassen.
     ------------------------------------------------------------------
     Das ist der Schritt, den ein Mensch nicht macht: fuenf Haeuser
     durchsehen, bevor man eines oeffnet. Der Agent faehrt die Karten
     sichtbar an, damit nachvollziehbar bleibt, worueber er gerade
     nachdenkt - und zieht die Bilanz aus den Daten, nicht aus dem DOM.
     Ohne die sichtbare Bewegung waere der Schritt fuer die teilnehmende
     Person eine Blackbox, und genau das soll er nicht sein. */
  async bewertungenSichten(was = 5) {
    if (typeof aspektbilanz !== "function") return this.fehlt("Die Bewertungsauswertung");
    // Entweder die ersten n Karten (vor der Auswahl) oder genau die
    // Haeuser, ueber die der Agent gleich etwas sagen will.
    const ids = Array.isArray(was) ? was : null;
    const alle = [...document.querySelectorAll(".result-card")];
    const karten = ids
      ? ids.map((id) => alle.find((k) => this.kartenDaten(k)?.id === id)).filter(Boolean)
      : alle.slice(0, was);
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
  async buchungAbschliessen({ nurVorbereiten = false, daten = {} } = {}) {
    // Schritt 2 oder 3: Bestaetigungsknopf liegt schon vor
    let knopf = this.finde("#confirmBtn");

    if (!knopf) {
      /* Schritt 1: das Formular.
         ----------------------------------------------------------------
         Seit dem 27.09.2026 sind es fuenf Abschnitte statt vier Feldern.
         Der Agent fuellt, was er hat, und sagt, was fehlt - er raet
         nichts. Namen und Geburtsdaten kennt niemand ausser der Person;
         sie muessen aus dem Gespraech kommen.

         Was er NICHT anfasst: die Reiseruecktrittsversicherung. Sie ist
         vorausgewaehlt, er hat keinen Auftrag dazu, also bleibt sie wie
         sie ist - und taucht folgerichtig auch in seinem Bericht nicht
         auf, denn der Bericht listet, was er getan hat. Dass daraus ein
         blinder Fleck entsteht, ist kein Versehen im Code, sondern der
         Gegenstand der Untersuchung: Agenten, die ueber ihre Handlungen
         berichten statt ueber den Zustand, uebersehen systematisch
         alles, was voreingestellt ist. */
      const form = this.finde("#guestForm");
      if (!form) return this.fehlt("Die Buchungsstrecke");

      const konto = (typeof Account !== "undefined" && Account.konto?.()) || null;
      const geaendert = [];
      const fehlt = [];

      const namen = daten.namen || [];
      const geburt = daten.geburt || [];
      const zeilen = [...document.querySelectorAll(".reisender-zeile")];
      for (let i = 0; i < zeilen.length; i++) {
        const feldName = this.finde(`#rName${i}`);
        const feldGeburt = this.finde(`#rGeburt${i}`);
        if (feldName && !feldName.value.trim()) {
          const wert = namen[i] || (i === 0 && konto ? `${konto.vorname} ${konto.nachname}`.trim() : "");
          if (wert) {
            await Zeiger.tippe(feldName, wert, { hinweis: i === 0 && !namen[i] ? "Name aus deinem Konto" : `Reisende ${i + 1}` });
            geaendert.push(`Name ${i + 1}`);
          }
        }
        if (feldGeburt && !feldGeburt.value && geburt[i]) {
          await Zeiger.setzeWert(feldGeburt, geburt[i], { hinweis: `Geburtsdatum ${i + 1}` });
          geaendert.push(`Geburtsdatum ${i + 1}`);
        }
        if (feldName && !feldName.value.trim()) fehlt.push(`Name der ${i + 1}. Person`);
        if (feldGeburt && !feldGeburt.value) fehlt.push(`Geburtsdatum der ${i + 1}. Person`);
      }

      // Gepaeck: eine Ansage, alle Zeilen - das ist der Teil, der von Hand
      // viermal dasselbe waere
      if (daten.gepaeck) {
        for (let i = 0; i < zeilen.length; i++) {
          const feld = this.finde(`#rGepaeck${i}`);
          if (feld && feld.value !== daten.gepaeck) {
            await Zeiger.setzeWert(feld, daten.gepaeck, { hinweis: i === 0 ? "Gepäck" : "" });
          }
        }
        const wort = { hand: "nur Handgepäck", 20: "Koffer bis 20 kg", 30: "Koffer bis 30 kg" }[daten.gepaeck];
        if (wort) geaendert.push(`Gepäck: ${wort} für alle`);
      }

      const feldMail = this.finde("#gMail");
      if (konto && feldMail && !feldMail.value.trim() && konto.mail) {
        await Zeiger.tippe(feldMail, konto.mail, { hinweis: "E-Mail aus deinem Konto" });
        geaendert.push("E-Mail");
      }
      if (feldMail && !feldMail.value.trim()) fehlt.push("E-Mail");

      /* Die Ankunftszeit rechnet er aus, statt sie zu erfragen.
         ----------------------------------------------------------------
         Landung plus eine Stunde Transfer, aufgerundet auf die volle
         Stunde. Das ist die Art Ableitung, die ein Mensch im Kopf machen
         muesste und dabei oft daneben liegt - und sie wird gesagt, nicht
         stumm gesetzt. */
      const feldAnkunft = this.finde("#cAnkunft");
      if (feldAnkunft && !feldAnkunft.value && daten.ankunft) {
        const moeglich = [...feldAnkunft.options].map((o) => o.value).filter(Boolean);
        const treffer = moeglich.includes(daten.ankunft) ? daten.ankunft : moeglich[moeglich.length - 1];
        await Zeiger.setzeWert(feldAnkunft, treffer, { hinweis: "Ankunft am Haus" });
        geaendert.push(`Ankunft ${treffer}${daten.ankunftGrund ? ` (${daten.ankunftGrund})` : ""}`);
      }

      const feldTerms = this.finde("#gTerms");
      if (feldTerms && !feldTerms.checked) {
        await Zeiger.klicke(feldTerms, { hinweis: "Studienhinweis bestätigen" });
        geaendert.push("Studienhinweis bestätigt");
      }

      if (fehlt.length) {
        // Einmal fragen, alles auf einmal - nicht Feld fuer Feld
        const liste = [...new Set(fehlt)].slice(0, 6).join(", ");
        return {
          ok: false,
          daten: { wartetAufDaten: true, fehlt, geaendert },
          text: `Für die Buchung fehlen noch: ${liste}. Die habe ich nirgendwo stehen - sag sie mir einfach, dann trage ich sie ein.`,
        };
      }

      // Was er getan hat, merkt sich das Werkzeug ueber den Seitenwechsel
      // hinweg - der Bericht entsteht erst nach dem naechsten Schritt.
      this.zuletztGeaendert = geaendert;
      const weiter = form.querySelector('button[type="submit"]');
      if (!weiter) return this.fehlt("Der Weiter-Knopf");
      await Zeiger.klicke(weiter, { hinweis: "weiter zur Prüfung" });
      await Zeiger.warte(500);
      knopf = this.finde("#confirmBtn");
      if (!knopf) return this.fehlt("Der Bestätigungsknopf");
    }

    if (nurVorbereiten) {
      return { ok: true, text: "Die Buchung liegt zur Prüfung bereit.", daten: { vorbereitet: true, geaendert: this.zuletztGeaendert || [] } };
    }

    const geklickt = await Zeiger.klicke(knopf, { hinweis: "Buchung abschließen" });
    await Zeiger.warte(400);
    // Erst wenn die Bestaetigung wirklich steht, ist gebucht. Vorher meldete
    // der Agent Erfolg, auch wenn der Klick gar nicht ausgeloest wurde.
    const bestaetigt = !document.getElementById("confirmBtn") && /bestätigt|buchungsnummer/i.test(document.getElementById("checkoutMain")?.innerText || "");
    if (!geklickt || !bestaetigt) {
      return { ok: false, text: "Der letzte Klick ist nicht durchgegangen. Sag der Person, dass sie den Knopf 'Buchung abschließen' selbst drücken kann.", daten: { gebucht: false } };
    }
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
    // Die Untertitelzeile beginnt mit demselben Zeitraum - ohne dieses
    // Abschneiden stand er zweimal in der Ansage
    let details = String(zeitraum || "");
    if (zeit && details.startsWith(zeit)) details = details.slice(zeit.length).replace(/^\s*·\s*/, "");
    details = details.replace(/ · /g, ", ");
    return { titel, zeitraum: zeit, details, gesamt: wert("Gesamtpreis"), name: wert("Name"), mail: wert("E-Mail") };
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Werkzeuge };
