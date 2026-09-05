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

  async suchen({ typ = null, ziel = "", von = "", bis = "", erwachsene = null, kinder = null } = {}) {
    if (!this.finde("#sbForm")) return this.fehlt("Die Suchmaske");

    const getan = [];

    // Zuerst die Art. Der Reiter baut die Maske neu auf, deshalb muss er vor
    // allen Feldern geklickt werden - sonst tippt der Agent in Felder, die
    // gleich darauf ersetzt werden.
    if (typ) {
      const reiter = this.finde(`.searchbox-tab[data-type="${typ}"]`);
      if (reiter && !reiter.classList.contains("active")) {
        await Zeiger.klicke(reiter, { hinweis: typ === "apartment" ? "Ferienwohnungen" : "Hotels" });
        await Zeiger.warte(260);
        getan.push(typ === "apartment" ? "Ferienwohnungen" : "Hotels");
      }
    }

    // Nach dem Reiterwechsel ist die alte Formularreferenz veraltet
    const form = this.finde("#sbForm");
    if (!form) return this.fehlt("Die Suchmaske");

    const feldZiel = this.finde("#sbDest");
    if (feldZiel && ziel) {
      await Zeiger.tippe(feldZiel, ziel, { hinweis: "Reiseziel" });
      getan.push(ziel);
    }

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

    if (erwachsene !== null || kinder !== null) {
      await this.belegungSetzen(erwachsene, kinder);
      getan.push(`${erwachsene ?? "?"} Erwachsene${kinder ? `, ${kinder} Kinder` : ""}`);
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
  async belegungSetzen(erwachsene, kinder) {
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
  async zurBuchung(id) {
    const knopf = this.finde("#bwBook, .bw-book, .booking-widget .btn-accent")
      || this.finde(`.js-book[data-id="${id}"]`);
    if (!knopf) return this.fehlt("Der Buchungsknopf");
    await Zeiger.klicke(knopf, { hinweis: "zur Buchung" });
    return { ok: true, text: "Buchungsstrecke geöffnet.", daten: { navigiert: true, id } };
  },

  // Die Buchungsstrecke hat zwei Schritte: erst die Gastdaten, dann die
  // Bestaetigung. Der Agent fuellt die Gastdaten NICHT aus - er wuerde sonst
  // Namen und Mailadresse erfinden. In einer Studie waere das gleich doppelt
  // falsch: es sind fremde Personendaten, und im Protokoll stuende eine
  // Eingabe, die die teilnehmende Person nie gemacht hat.
  async buchungAbschliessen() {
    // Schritt 2: Bestaetigungsknopf liegt vor
    let knopf = this.finde("#confirmBtn");

    if (!knopf) {
      // Schritt 1: Gastdaten. Nur weiter, wenn die Person sie ausgefuellt hat.
      const form = this.finde("#guestForm");
      if (!form) return this.fehlt("Die Buchungsstrecke");

      const name = this.finde("#gName")?.value.trim();
      const mail = this.finde("#gMail")?.value.trim();
      const zugestimmt = this.finde("#gTerms")?.checked;
      const fehlt = [];
      if (!name) fehlt.push("Name");
      if (!mail) fehlt.push("E-Mail");
      if (!zugestimmt) fehlt.push("die Bestätigung der Studienhinweise");
      if (fehlt.length) {
        const liste = fehlt.length < 2 ? fehlt[0]
          : `${fehlt.slice(0, -1).join(", ")} und ${fehlt[fehlt.length - 1]}`;
        return {
          ok: false,
          daten: { wartetAufDaten: true },
          text: `Für den letzten Schritt fehlen noch ${liste}. Die trage bitte selbst ein — deine Daten fülle ich nicht aus. Sag danach Bescheid, dann schließe ich ab.`,
        };
      }

      const weiter = form.querySelector('button[type="submit"]');
      if (!weiter) return this.fehlt("Der Weiter-Knopf");
      await Zeiger.klicke(weiter, { hinweis: "weiter zur Prüfung" });
      await Zeiger.warte(500);
      knopf = this.finde("#confirmBtn");
      if (!knopf) return this.fehlt("Der Bestätigungsknopf");
    }

    await Zeiger.klicke(knopf, { hinweis: "Buchung abschließen" });
    return { ok: true, text: "Buchung abgeschlossen — simuliert, es wurde nichts gebucht.", daten: { gebucht: true } };
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Werkzeuge };
