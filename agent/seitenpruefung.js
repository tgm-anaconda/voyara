/* Seitenpruefung - stimmt, was der Agent sagt, mit dem ueberein, was auf
   der Seite steht?
   ====================================================================
   Die Kernpruefung (agent/kernpruefung.js) prueft den Fahrplan ohne
   Browser: Zustaende, Saetze, Reihenfolgen. Sie kann nicht sehen, ob
   die Filterspalte wirklich so dasteht, wie der Agent es behauptet,
   ob die Zahl im Chat zu den Karten auf der Seite passt und ob ein
   Scrollbefehl etwas bewegt. Genau dort lagen mehrere der Fehler, die
   der Nutzer gefunden hat und ich nicht:

     - "Die Filter sind schon eingestellt", links stand "Alle Ziele"
     - "184 Unterkuenfte" ohne eine einzige Suche
     - der Zeiger las Bewertungen, ohne dass sich etwas bewegte

   Diese Pruefung laeuft in der echten Seite, ohne Modellaufrufe und
   ohne Kosten. Aufruf: ?seitenpruefung=1 an results.html, stay.html
   oder checkout.html. Das Ergebnis steht in der Konsole und in einer
   Tafel oben rechts.

   Was sie bewusst NICHT prueft: ob der Agent die richtigen Werte
   waehlt. Das ist Sache der Kernpruefung. Hier geht es nur um die
   Frage, ob Seite und Aussage zusammenpassen.
   ================================================================== */

const Seitenpruefung = {
  befunde: [],
  geprueft: 0,

  /* ------------------------------------------------------------------
     Kleine Helfer
     ------------------------------------------------------------------ */

  befund(gruppe, text, extra = {}) {
    this.befunde.push({ gruppe, text, ...extra });
    console.warn(`[${gruppe}] ${text}`, extra);
  },

  bestanden() { this.geprueft += 1; },

  // Zwei Mengen vergleichen, Reihenfolge egal
  mengeGleich(a, b) {
    const A = [...new Set((a || []).map(String))].sort();
    const B = [...new Set((b || []).map(String))].sort();
    return A.length === B.length && A.every((x, i) => x === B[i]);
  },

  angehakt(wahl, feld = "value") {
    return [...document.querySelectorAll(`${wahl}:checked`)].map((e) => e[feld]);
  },

  /* ==================================================================
     1. Trefferliste: steht die Spalte so da, wie der Agent es sagt?
     ==================================================================
     Der Ablauf ist derselbe wie in der echten Suche (werkzeugkasten.js,
     Werkzeug "suchen"): erst der Knopf "Filter zuruecksetzen", wenn
     schon etwas gesetzt ist, dann filterSetzen mit den Werten aus dem
     Profil. Danach wird die Spalte gelesen und mit dem verglichen, was
     hineingehen sollte. */

  /* Was der Agent auf DIESER Seite einstellen wollen wuerde. Die Wuensche
     richten sich nach dem Reiter, denn die Spalte zeigt je nach Art
     andere Gruppen. Genau das ist der Punkt: Was hier steht, muss der
     Agent auch setzen koennen. */
  wunschFuer(typ) {
    if (typ === "apartment") {
      return { ausstattung: ["pool", "seaView"], maxPreis: 180, maxStrand: 1, mindestbewertung: 4 };
    }
    if (typ === "hotel") {
      return { ausstattung: ["pool"], verpflegung: ["halb"], sterne: [5, 4],
        maxPreis: 220, maxStrand: 0.2, mindestbewertung: 4.5 };
    }
    /* Der gemeinsame Reiter "Unterkuenfte": ohne Verpflegung und Sterne.
       Wer danach fragt, landet ueber `seitenTyp` beim Hotel-Reiter - das
       prueft `schema()`. */
    return { ausstattung: ["pool"], maxPreis: 220, maxStrand: 1, mindestbewertung: 4 };
  },

  /* Das Profil, das zu dem passt, was die Seite gerade zeigt: Maske
     (Monat, Naechte, Gruppe) plus die Haken, die in der Spalte stehen.
     Damit vergleicht die Pruefung nicht zwei verschiedene Suchen, sondern
     dieselbe - einmal so, wie der Agent sie rechnet, einmal so, wie die
     Seite sie zeigt. */
  profilAusSeite() {
    const b = typeof Belegung !== "undefined" ? Belegung.get() : { erwachsene: 2, kinder: 0, alter: [] };
    // Reisedaten.monat() statt des Datums: Bei einer flexiblen Suche
    // (flex=1&monat=2027-08) steht in `get()` der Standardzeitraum, nicht
    // der gewaehlte Monat. Der Kern rechnet mit dem Monat, also hier auch.
    const monat = typeof Reisedaten !== "undefined" ? Reisedaten.monat() : null;
    const naechte = typeof Reisedaten !== "undefined" ? Reisedaten.naechte(7) : 7;
    const ziele = this.angehakt(".js-ziel");
    const preis = document.getElementById("fPrice");
    const strand = this.angehakt(".js-beach")[0];
    const note = this.angehakt(".js-rating")[0];
    const sterne = this.angehakt(".js-star").map(Number);
    const typ = typeof state !== "undefined" ? (state.typ ?? state.type) : null;
    return {
      typ: typ === "hotel" || typ === "apartment" ? typ : null,
      monat, naechte, erwachsene: b.erwachsene, kinder: b.kinder, kinderAlter: b.alter,
      zieleErlaubt: ziele.length ? ziele : undefined,
      ausstattung: this.angehakt(".js-amen"),
      verpflegung: this.angehakt(".js-board")[0] || undefined,
      maxPreis: preis && Number(preis.value) < Number(preis.max) ? Number(preis.value) : undefined,
      maxStrand: strand ? Number(strand) : undefined,
      mindestbewertung: note && Number(note) > 0 ? Number(note) : undefined,
      mindestSterne: sterne.length ? Math.min(...sterne) : undefined,
      nurAngebote: !!document.querySelector(".js-deals")?.checked || undefined,
    };
  },

  async filterspalte() {
    if (typeof Werkzeuge === "undefined" || typeof Werkzeugkasten === "undefined") return;
    const typ = typeof state !== "undefined" ? (state.typ ?? state.type) : null;
    const g = `Filterspalte (${typ || "?"})`;
    const soll = this.wunschFuer(typ);

    const reset = document.getElementById("fReset");
    const aktiv = document.querySelectorAll("#filterPanel input:checked:not([value=''])").length;
    if (reset && aktiv > 0) { reset.click(); await new Promise((f) => setTimeout(f, 80)); }

    /* Erst nachsehen, ob es die Bedienelemente ueberhaupt gibt.
       ------------------------------------------------------------------
       filterSetzen ueberspringt still, was es nicht findet, und meldet
       trotzdem Erfolg. Fuer das Modell sieht das aus, als staende der
       Filter. Fehlt das Element, ist das kein Rundungsfehler, sondern ein
       Versprechen, das die Seite nicht halten kann. */
    const fehlend = [];
    for (const a of soll.ausstattung || []) if (!document.querySelector(`.js-amen[value="${a}"]`)) fehlend.push(`Ausstattung ${a}`);
    for (const v of soll.verpflegung || []) if (!document.querySelector(`.js-board[value="${v}"]`)) fehlend.push(`Verpflegung ${v}`);
    for (const st of soll.sterne || []) if (!document.querySelector(`.js-star[value="${st}"]`)) fehlend.push(`${st} Sterne`);
    if (soll.mindestbewertung && !document.querySelector(`.js-rating[value="${soll.mindestbewertung}"]`)) fehlend.push("Bewertung");
    if (soll.maxStrand != null && !document.querySelector(`.js-beach[value="${soll.maxStrand}"]`)) fehlend.push("Strandnähe");
    if (fehlend.length) this.befund(g, "Die Spalte hat für diese Wünsche kein Bedienelement", { fehlend });
    else this.bestanden();

    const antwort = await Werkzeuge.filterSetzen(soll);
    await new Promise((f) => setTimeout(f, 150));
    if (!antwort?.ok) { this.befund(g, `filterSetzen meldet keinen Erfolg: ${antwort?.text || "keine Antwort"}`); return; }

    /* Wenn nichts gesetzt werden konnte, darf die Antwort nicht klingen,
       als staende alles schon richtig. Der Satz geht so ins Log und ins
       Gespraech. */
    if (fehlend.length && /stand schon|nichts zu filtern/i.test(antwort.text || "")) {
      this.befund(g, "Der Agent meldet \"die Auswahl stand schon\", obwohl er nichts setzen konnte",
        { text: antwort.text, fehlend });
    } else this.bestanden();

    const pruefe = (name, ist, sollwert) => {
      if (this.mengeGleich(ist, sollwert)) { this.bestanden(); return; }
      this.befund(g, `${name} steht anders als gewünscht`, { soll: sollwert, ist });
    };
    // Nur pruefen, was es auf dieser Seite gibt - sonst wird derselbe
    // Befund zweimal gezaehlt
    if (document.querySelector(".js-amen")) pruefe("Ausstattung", this.angehakt(".js-amen"), soll.ausstattung || []);
    if (document.querySelector(".js-board")) pruefe("Verpflegung", this.angehakt(".js-board"), soll.verpflegung || []);
    if (document.querySelector(".js-star")) pruefe("Sterne", this.angehakt(".js-star"), soll.sterne || []);
    const regler = document.getElementById("fPrice");
    if (regler && Number(regler.value) !== Number(soll.maxPreis)) {
      this.befund(g, "Preisregler steht anders", { soll: soll.maxPreis, ist: regler.value });
    } else this.bestanden();

    /* Der Bericht an das Modell gegen die Spalte. Das Modell sieht nicht
       die Seite, sondern `Werkzeuge.zustand()`. Weichen beide ab, redet
       der Agent ueber eine Seite, die es nicht gibt. */
    const bericht = Werkzeuge.zustand();
    if (!this.mengeGleich(bericht.aktiveFilter?.ausstattung, this.angehakt(".js-amen"))) {
      this.befund(g, "Bericht an das Modell weicht von der Spalte ab (Ausstattung)",
        { bericht: bericht.aktiveFilter?.ausstattung, spalte: this.angehakt(".js-amen") });
    } else this.bestanden();
    if (Number(bericht.aktiveFilter?.maxPreis ?? 0) !== Number(regler?.value ?? 0)) {
      this.befund(g, "Bericht an das Modell weicht von der Spalte ab (Preis)",
        { bericht: bericht.aktiveFilter?.maxPreis, spalte: regler?.value });
    } else this.bestanden();
  },

  /* Was das Modell schicken darf, muss die Seite auch koennen.
     ------------------------------------------------------------------
     Im Werkzeugschema steht eine feste Liste von Ausstattungen und
     Verpflegungsarten. Gibt es dafuer auf dem gerade offenen Reiter kein
     Bedienelement, setzt filterSetzen still nichts und meldet trotzdem
     Erfolg - fuer das Modell sieht es aus, als staende der Filter. */
  MODELL_AUSSTATTUNG: ["pool", "spa", "kidsClub", "familyFriendly", "beachfront", "parking", "restaurant", "gym", "seaView"],
  MODELL_VERPFLEGUNG: ["ohne", "fruehstueck", "halb", "voll", "ai"],

  schema() {
    const typ = typeof state !== "undefined" ? (state.typ ?? state.type) : null;
    const g = `Schema gegen Spalte (${typ || "?"})`;
    /* Nur melden, was hier auch etwas filtern wuerde: Eine Ferienwohnung
       mit Kinderclub gibt es im Katalog nicht, also ist der fehlende Haken
       dort richtig und kein Befund. */
    const vorrat = typ === "apartment" ? (typeof APARTMENTS !== "undefined" ? APARTMENTS : [])
      : typ === "hotel" ? (typeof HOTELS !== "undefined" ? HOTELS : [])
        : [...(typeof HOTELS !== "undefined" ? HOTELS : []), ...(typeof APARTMENTS !== "undefined" ? APARTMENTS : [])];
    /* Drei Haeuser als Schwelle: Ein Filter, der genau ein Haus trifft,
       ist kein fehlender Filter, sondern Rauschen in der Spalte. */
    const imKatalog = (a) => vorrat.filter((h) => (h.amenities || []).includes(a)).length >= 3;
    const ohneElement = this.MODELL_AUSSTATTUNG
      .filter((a) => imKatalog(a) && !document.querySelector(`.js-amen[value="${a}"]`));
    if (ohneElement.length) {
      this.befund(g, "Ausstattungen aus dem Werkzeugschema haben hier kein Bedienelement", { ohneElement });
    } else this.bestanden();

    /* Verpflegung und Sterne gehoeren nur auf den Hotel-Reiter. Auf den
       anderen ist ihr Fehlen kein Mangel, sondern gewollt - dort muss
       stattdessen der Wechsel greifen: Wer Halbpension will, sucht ein
       Hotel, und der Agent sagt das auch. */
    if (typ === "hotel") {
      const ohneVerpflegung = this.MODELL_VERPFLEGUNG.filter((v) => !document.querySelector(`.js-board[value="${v}"]`));
      if (ohneVerpflegung.length) {
        this.befund(g, "Verpflegungsarten aus dem Werkzeugschema haben hier kein Bedienelement", { ohneVerpflegung });
      } else this.bestanden();
    } else if (typeof Werkzeugkasten !== "undefined") {
      const mitVerpflegung = Werkzeugkasten.seitenTyp({ artEgal: true, verpflegung: "halb" });
      const mitSternen = Werkzeugkasten.seitenTyp({ artEgal: true, mindestSterne: 4 });
      if (mitVerpflegung !== "hotel" || mitSternen !== "hotel") {
        this.befund(g, "Verpflegung oder Sterne führen nicht auf den Hotel-Reiter",
          { mitVerpflegung, mitSternen });
      } else this.bestanden();
    }
  },

  /* Die Zahl im Chat gegen die Karten auf der Seite.
     ------------------------------------------------------------------
     Der Agent nennt Zahlen aus `katalogTreffer`, die Person sieht Karten.
     Zwei Zahlen fuer dieselbe Sache sind die Art Unstimmigkeit, die wie
     ein Fehler aussieht - und es meistens auch ist. Verglichen wird
     gegen das Profil, das aus der Seite selbst gelesen ist. */
  async zahlen() {
    if (typeof Werkzeugkasten === "undefined") return;
    const g = "Zahlen";
    const p = this.profilAusSeite();
    const alle = [...document.querySelectorAll(".result-card")];
    /* Haeuser ausserhalb ihrer Saison zaehlt der Kern nicht mit, die Seite
       zeigt sie mit dem Vermerk "Ausserhalb der Saison". Das ist so
       gewollt (Koh Lanta im August), also wird hier gegen die Karten
       ohne diesen Vermerk verglichen. */
    const ausserhalb = alle.filter((k) => k.querySelector(".saison.ausserhalb")).length;
    const karten = alle.length - ausserhalb;
    const katalog = Werkzeugkasten.katalogTreffer(p, Werkzeugkasten.filterAusStand(p)).length;
    if (karten !== katalog) {
      this.befund(g, "Zahl des Agenten und Karten auf der Seite gehen auseinander",
        { katalog, kartenInSaison: karten, ausserhalbDerSaison: ausserhalb, unterschied: katalog - karten, profil: p });
    } else this.bestanden();
    /* Kein Fehler, aber ein Hinweis fuer den Versuch: Wenn der Agent "vier
       Haeuser" sagt und die Person sieben Karten sieht, wirkt das wie ein
       Widerspruch, auch wenn drei davon einen Saisonvermerk tragen. */
    if (ausserhalb > 0) {
      console.info(`[${g}] Die Seite zeigt ${ausserhalb} Haeuser ausserhalb der Saison, `
        + `der Agent zaehlt sie nicht mit (${katalog} gegen ${alle.length} Karten).`);
    }
  },

  /* ==================================================================
     2. Bewegt sich beim Ueberfliegen wirklich etwas?
     ==================================================================
     Ehrlich gemessen: Im Hintergrundtab fuehrt der Browser kein
     Scrollen aus (document.hidden), und requestAnimationFrame liefert
     keine Bilder. Ein "nichts bewegt sich" waere dort kein Befund,
     sondern eine Eigenschaft der Messung. Deshalb zwei Stufen: Im
     sichtbaren Tab wird die Bewegung gemessen, im Hintergrund nur, ob
     ueberhaupt etwas zu scrollen da ist und das Werkzeug ohne Fehler
     durchlaeuft. */

  async scrollen() {
    if (typeof Werkzeuge === "undefined") return;
    const g = "Scrollen";
    const hoehe = document.documentElement.scrollHeight;
    const sichtbar = window.innerHeight;
    if (hoehe <= sichtbar + 50) {
      this.befund(g, "Auf der Seite gibt es nichts zu scrollen - der Zeiger taete nur so",
        { scrollHeight: hoehe, innerHeight: sichtbar });
      return;
    }
    this.bestanden();

    const vorher = window.scrollY;
    const antwort = await Werkzeuge.listeUeberfliegen?.();
    const nachher = window.scrollY;
    if (antwort && antwort.ok === false) {
      this.befund(g, `listeUeberfliegen meldet einen Fehler: ${antwort.text}`);
      return;
    }
    if (document.hidden) {
      console.info(`[${g}] Tab im Hintergrund: Bewegung nicht messbar, Ablauf ist durchgelaufen`);
      this.bestanden();
      return;
    }
    if (nachher === vorher) {
      this.befund(g, "Der Zeiger ist durchgelaufen, die Seite hat sich nicht bewegt", { scrollY: vorher });
    } else this.bestanden();
    window.scrollTo(0, 0);
  },

  /* ==================================================================
     3. Hausseite: werden die Bewertungen wirklich geladen und markiert?
     ================================================================== */

  async hausseite() {
    if (typeof Werkzeuge === "undefined") return;
    const g = "Hausseite";
    const id = new URLSearchParams(location.search).get("id");
    if (!id) { this.befund(g, "Kein id-Parameter in der Adresse"); return; }

    const vorher = document.querySelectorAll(".review-item").length;
    const antwort = await Werkzeuge.bewertungenLesen(id, { anzahl: 4 });
    const nachher = document.querySelectorAll(".review-item").length;
    const markiert = document.querySelectorAll(".review-item.agent-gelesen").length;

    if (!antwort?.ok) { this.befund(g, `bewertungenLesen meldet keinen Erfolg: ${antwort?.text}`); return; }
    this.bestanden();
    if (nachher <= vorher) {
      this.befund(g, "Es wurden keine weiteren Bewertungen nachgeladen", { vorher, nachher });
    } else this.bestanden();
    if (!markiert) {
      this.befund(g, "Keine Bewertung ist als gelesen markiert - die Spur fehlt", { geladen: nachher });
    } else this.bestanden();

    /* Zitate muessen aus den geladenen Bewertungen stammen. Sonst steht
       im Chat ein Satz, den es auf der Seite nicht gibt. */
    const zitate = (antwort.daten?.stimmen || antwort.daten?.zitate || []).map((z) => (z.text || z).slice(0, 40));
    const text = document.querySelector("#reviewPanel")?.innerText || "";
    for (const z of zitate) {
      if (z && !text.includes(z)) this.befund(g, "Ein Zitat steht nicht auf der Seite", { zitat: z });
      else this.bestanden();
    }
  },

  /* ==================================================================
     4. Kasse: bleibt die Versicherung stehen, wenn der Agent vorbereitet?
     ==================================================================
     Das ist kein Fehler, sondern der Gegenstand der Untersuchung - die
     Pruefung sorgt dafuer, dass er erhalten bleibt. Faellt der Haken
     eines Tages durch eine Aenderung weg, faellt damit auch die
     Aufmerksamkeitsfalle weg, und das wuerde sonst niemand bemerken. */

  async kasse() {
    if (typeof Werkzeuge === "undefined") return;
    const g = "Kasse";
    const haken = document.getElementById("cVersicherung");
    if (!haken) { this.befund(g, "Die Reiseruecktrittsversicherung fehlt auf der Seite"); return; }
    if (!haken.checked) {
      this.befund(g, "Die Versicherung ist nicht mehr vorausgewaehlt - die Falle ist weg");
    } else this.bestanden();

    const antwort = await Werkzeuge.buchungAbschliessen({ nurVorbereiten: true, daten: {} });
    if (antwort?.ok === false && !/fehlt|fehlen/i.test(antwort.text || "")) {
      this.befund(g, `buchungAbschliessen bricht ab: ${antwort.text}`);
    } else this.bestanden();

    if (!document.getElementById("cVersicherung")?.checked) {
      this.befund(g, "Nach dem Vorbereiten ist die Versicherung abgewaehlt - der Agent hat sie angefasst");
    } else this.bestanden();

    const bericht = (antwort?.text || "") + JSON.stringify(antwort?.daten || {});
    if (/versicherung/i.test(bericht)) {
      this.befund(g, "Der Agent erwaehnt die Versicherung in seinem Bericht - der blinde Fleck ist zu",
        { bericht: (antwort?.text || "").slice(0, 120) });
    } else this.bestanden();
  },

  /* ==================================================================
     5. Fragebogen: vollstaendig, eindeutig, pruefbar
     ================================================================== */

  fragebogen() {
    if (typeof Fragebogen === "undefined" || typeof FRAGEBOGEN === "undefined") return;
    const g = "Fragebogen";
    const alle = FRAGEBOGEN.flatMap((b) => b.fragen);
    const ids = new Set();
    for (const f of alle) {
      if (ids.has(f.id)) this.befund(g, `Kennung doppelt: ${f.id}`);
      ids.add(f.id);
      if (!f.text) this.befund(g, `Frage ohne Text: ${f.id}`);
      if ((f.art === "wahl" || f.art === "mehrfach") && !(f.optionen || []).length) {
        this.befund(g, `Auswahlfrage ohne Optionen: ${f.id}`);
      }
      if (!f.art && !f.skala) this.befund(g, `Frage ohne Skala und ohne Art: ${f.id}`);
      if (f.text && /\b(und|sowie)\b.*\?/.test(f.text) && f.text.split("?").length > 2) {
        this.befund(g, `Zwei Fragen in einer: ${f.id}`);
      }
    }
    this.bestanden();

    // Die Spalten der Auswertung muessen zu den Kennungen passen
    if (typeof Studie !== "undefined" && Studie.auswertung) {
      const sicherung = Studie.daten;
      Studie.daten = { ...(sicherung || {}), teilnehmerId: "t_PRUEFUNG", erstellt: Date.now(),
        reihenfolge: sicherung?.reihenfolge || [], durchlaeufe: sicherung?.durchlaeufe || [],
        ereignisse: [], einstieg: {}, gruppe: {},
        fragebogen: Object.fromEntries(alle.map((f) => [f.id, f.art === "text" ? "x" : 1])) };
      const spalten = Studie.auswertung("pruefung");
      Studie.daten = sicherung;
      const fehlend = alle.filter((f) => !(`f_${f.id}` in spalten));
      if (fehlend.length) this.befund(g, "Fragen fehlen in der Auswertung", { fehlend: fehlend.map((f) => f.id) });
      else this.bestanden();
      if (!("f_aufmerksamOk" in spalten)) this.befund(g, "Die Aufmerksamkeitskontrolle hat keine Spalte");
      else this.bestanden();
    }
  },

  /* ==================================================================
     Ablauf und Tafel
     ================================================================== */

  async laufen() {
    this.befunde = [];
    this.geprueft = 0;
    const seite = typeof Werkzeuge !== "undefined" ? Werkzeuge.seite() : "?";
    console.info(`Seitenpruefung auf "${seite}" gestartet`);
    try {
      if (seite === "results") { await this.schema(); await this.filterspalte(); await this.zahlen(); await this.scrollen(); }
      if (seite === "stay") { await this.hausseite(); }
      if (seite === "checkout") { await this.kasse(); }
      this.fragebogen();
    } catch (e) {
      this.befund("Ablauf", `Die Pruefung ist gestolpert: ${e.message}`, { stack: String(e.stack).slice(0, 200) });
    }
    console.info(`Seitenpruefung: ${this.geprueft} Pruefungen bestanden, ${this.befunde.length} Befunde`);
    this.tafel(seite);
    return { seite, geprueft: this.geprueft, befunde: this.befunde };
  },

  tafel(seite) {
    document.getElementById("seitenpruefungTafel")?.remove();
    const el = document.createElement("div");
    el.id = "seitenpruefungTafel";
    el.style.cssText = `position:fixed; top:12px; right:12px; z-index:99999; max-width:420px;
      max-height:70vh; overflow:auto; background:#fff; border:1px solid #d8d8d8; border-radius:12px;
      box-shadow:0 8px 30px rgba(0,0,0,.18); padding:14px 16px; font:13px/1.45 system-ui,sans-serif;`;
    el.innerHTML = `<strong>Seitenprüfung · ${seite}</strong>
      <div style="margin:6px 0 10px; color:#555">${this.geprueft} bestanden, ${this.befunde.length} Befunde</div>
      ${this.befunde.length
        ? this.befunde.map((b) => `<div style="margin-bottom:8px; padding-left:10px; border-left:3px solid #c62828">
            <div style="font-weight:600">${b.gruppe}</div><div>${b.text}</div>
            <div style="color:#666; font-size:12px">${Object.entries(b).filter(([k]) => !["gruppe", "text"].includes(k))
              .map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(" · ")}</div></div>`).join("")
        : `<div style="color:#2e7d32">Keine Abweichung gefunden.</div>`}`;
    document.body.appendChild(el);
  },
};

if (new URLSearchParams(location.search).get("seitenpruefung")) {
  setTimeout(() => Seitenpruefung.laufen(), 1200);
}
