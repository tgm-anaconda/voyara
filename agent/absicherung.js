/* Absicherung (25.11.2026): Rueckfrage mit Ja/Nein und Sammelfrage
   ==================================================================
   Ben: "Das Modell versteht, der Kern fragt zurueck." Zwei Stufen:
     1. Zweifelt der Kern an einem wichtigen Wert, speichert er ihn nicht,
        sondern fragt mit "Ja" / "Nein: ..." (Werkzeugkasten.
        bestaetigungRueckfrage). Ein reines Ja liest der Kern, alles andere
        das Modell - mit dem Wissen, welcher Wert gerade verneint wurde.
     2. Vor den Vorschlaegen einmal gesammelt: Bitte markiere, was ich
        richtig verstanden habe. Nicht Markiertes nimmt der Kern heraus,
        danach fragt der Fahrplan das Thema ganz normal neu.
   Die Person ist die einzige Instanz, die weiss, ob etwas WAHR ist. Die
   Liste kommt aus derselben Quelle wie die Leiste "Verstanden"
   (Politik.eckdaten) - was dort steht, steht auch hier. */
const Absicherung = {
  // Zeile in der Leiste -> Aufschrift, Thema im Fahrplan, Felder im Stand
  ZEILEN: {
    Ziel: { label: "Ziel", thema: "ziel", felder: ["zielId", "zieleAuswahl", "richtung", "zielOffen", "zieleErlaubt", "zieleDazu", "mindestGrad", "zielVorgemerkt"], frage: true },
    Nicht: { label: "Nicht", thema: null, felder: ["zieleAus"] },
    Art: { label: "Unterkunft", thema: "art", felder: ["typ", "artEgal", "artGenannt", "artErwaehnt"], frage: true },
    Zeit: { label: "Zeit", thema: "zeit", felder: ["monat", "monate", "von", "bis", "anreise", "monatAusVergleich", "jahreszeit", "flexibel", "anreiseBis", "anreiseAb"], frage: true },
    Wer: { label: "Reisende", thema: "reisende", felder: ["erwachsene", "kinder", "personen", "kinderAlter"], auch: ["kinderAlter"], frage: true },
    Zimmer: { label: "Zimmer", thema: "zimmer", felder: ["zimmer"], frage: true },
    Daten: { label: "Reisetage", thema: "anreise", felder: ["von", "bis", "anreise"] },
    Anreise: { label: "Anreise", thema: "anreise", felder: ["anreise", "von", "bis", "anreiseBis", "anreiseAb"] },
    Dauer: { label: "Dauer", thema: "dauer", felder: ["naechte", "von", "bis"], frage: true },
    Strand: { label: "Strand", thema: null, felder: ["maxStrand", "strandEgal"] },
    Sterne: { label: "Sterne", thema: null, felder: ["mindestSterne"] },
    Note: { label: "Note", thema: null, felder: ["mindestbewertung"] },
    Bewertung: { label: "Bewertung", thema: null, felder: ["bewertungEgal"] },
    Essen: { label: "Verpflegung", thema: "verpflegung", felder: ["verpflegung", "verpflegungEgal"], frage: true },
    Budget: { label: "Preis", thema: "preis", felder: ["budgetGesamt", "maxPreis", "preisEgal", "preisProPerson"], frage: true },
    Bis: { label: "Preis", thema: "preis", felder: ["maxPreis", "budgetGesamt", "preisEgal", "preisProPerson"], frage: true },
    Preis: { label: "Preis", thema: "preis", felder: ["preisEgal", "budget", "maxPreis", "budgetGesamt"], frage: true },
    Muss: { label: "Muss", thema: null, felder: ["ausstattung"], liste: true },
    Wichtig: { label: "Wichtig", thema: null, felder: ["kriterien", "wuensche"], liste: true },
    Flug: { label: "Flug", thema: "flug", felder: ["flug", "flugAb", "flugAbAuswahl", "flugAbEgal"], auch: ["flugAb"], frage: true },
  },
  REIHE: ["Ziel", "Nicht", "Wer", "Zeit", "Anreise", "Daten", "Dauer", "Art", "Zimmer", "Flug", "Essen", "Budget", "Bis", "Preis", "Strand", "Sterne", "Note", "Bewertung", "Muss", "Wichtig"],

  // Die Zeilen der Sammelfrage; gleiche Zeilen (Muss, Wichtig) werden eine
  punkte(p, lauf = {}) {
    const roh = typeof Politik !== "undefined" ? Politik.eckdaten(p || {}) : [];
    const je = {};
    for (const e of roh) {
      const z = this.ZEILEN[e.feld];
      if (!z || /^(flexibel|alle Regionen|egal|offen)$/.test(e.wert)) continue;      // nichts Festes, nichts zu bestaetigen
      (je[e.feld] ||= { feld: e.feld, label: z.label, werte: [] }).werte.push(e.wert);
    }
    const h = lauf.herkunft || {};
    const LANG = { Wer: () => this.reisendeText(p), Bis: () => `bis ${p.maxPreis} € pro Nacht`, Budget: () => `${p.budgetGesamt} € für die Unterkunft`,
      Flug: () => (p.flug ? (p.flugAb ? `ab ${p.flugAb}` : "ja") : "ohne Flug"), Anreise: () => this.tagText(p) };
    return Object.values(je)
      .map((x) => ({ ...x, wert: (LANG[x.feld] && LANG[x.feld]()) || x.werte.join(", "), sicher: h[x.feld] !== "modell" }))
      .sort((a, b) => (a.sicher === b.sicher ? this.REIHE.indexOf(a.feld) - this.REIHE.indexOf(b.feld) : a.sicher ? 1 : -1))
      .map(({ feld, label, wert, sicher }) => ({ feld, label, wert, sicher }));
  },
  reisendeText(p) {
    const t = [];
    if (p.erwachsene) t.push(`${p.erwachsene} ${p.erwachsene === 1 ? "Erwachsener" : "Erwachsene"}`);
    if (p.kinder) t.push(`${p.kinder} ${p.kinder === 1 ? "Kind" : "Kinder"}${(p.kinderAlter || []).length ? ` (${p.kinderAlter.join(", ")})` : ""}`);
    return t.join(", ") || (p.personen ? `${p.personen} Personen` : "");
  },
  tagText(p) {
    const d = String(p.anreise || "").match(/-(\d{2})-(\d{2})$/);
    return d ? `${+d[2]}. ${typeof MONATSNAMEN !== "undefined" ? MONATSNAMEN[+d[1] - 1] : d[1]}` : "";
  },

  /* Woher eine Angabe stammt: "modell" = aus freiem Text gedeutet (steht in
     der Liste oben), sonst Chip, woertlich oder vom Kern gerechnet. Gerufen
     am Ende von stand_merken. */
  herkunftVermerken(kern, vorher) {
    if (typeof Politik === "undefined") return;
    const als = (p) => { const o = {}; for (const e of Politik.eckdaten(p || {})) (o[e.feld] ||= []).push(e.wert); return o; };
    const a = als(vorher), b = als(kern.lauf.profil), h = (kern.lauf.herkunft ||= {});
    // Vom Kern gelesen oder von Kern und Modell gleich gelesen
    const gelesen = [...(kern.lauf.selbstGelesen || []), ...(kern.lauf.gleichGelesen || [])];
    kern.lauf.gleichGelesen = null;
    for (const f of Object.keys(b)) {
      if (JSON.stringify(a[f]) === JSON.stringify(b[f])) continue;
      const z = this.ZEILEN[f];
      // Die Reisetage rechnet der Kern aus Anreise und Dauer - die stehen einzeln da
      h[f] = f === "Daten" || kern.lauf.chipFest || (z && z.felder.some((x) => gelesen.includes(x))) ? "sicher" : "modell";
    }
  },

  /* Der Halt vor den Vorschlaegen. Vor der Suche, damit die Seite nicht
     zweimal durchlaufen wird. Beim zweiten Mal nur, was sich geaendert hat
     und nicht eindeutig war. */
  sammelHalt(kern, p) {
    if (!kern?.lauf || typeof AgentPanel === "undefined" || !AgentPanel.sammelZeigen) return null;
    if (typeof STELLSCHRAUBEN !== "undefined" && STELLSCHRAUBEN.sammelfrage === false) return null;
    const l = kern.lauf, best = (l.sammelBestaetigt ||= {});
    const erste = !l.sammelGefragt;
    const offen = this.punkte(p, l).filter((x) => best[x.feld] !== x.wert && (erste || !x.sicher));
    if (!offen.length || (l.sammelGefragt || 0) >= 3) return null;
    l.sammelGefragt = (l.sammelGefragt || 0) + 1;
    l.sammelOffen = { punkte: offen, zug: l.zugSeit || null };
    const satz = erste ? "Bevor ich die Häuser heraussuche, kurz zur Sicherheit: Bitte markiere, was ich richtig verstanden habe."
      : `Das hat sich geändert. ${offen.length === 1 ? "Stimmt es" : "Bitte markiere, was"} ${offen.length === 1 ? "so?" : "ich jetzt richtig verstanden habe."}`;
    kern.sagen(satz);
    kern.gespraechPush({ role: "assistant", content: `${satz} ${offen.map((x) => `${x.label}: ${x.wert}`).join("; ")}` });
    const eintrag = { rolle: "sammel", punkte: offen, zeit: Date.now() };
    l.verlauf.push(eintrag);
    AgentPanel.sammelZeigen(eintrag, { offen: true });
    l.chips = []; l.chipWirkung = null; l.chipThema = null;
    AgentPanel.setSuggestions([]);
    l.vorgehenFuer = null;      // sonst erzwingt nach der Antwort niemand die Suche
    l.kernWartet = true;
    kern.notieren("sammel_gezeigt", { punkte: offen.map((x) => x.feld), unsicher: offen.filter((x) => !x.sicher).map((x) => x.feld) });
    kern.sichern();
    return { ergebnis: { nichtVorgelegt: true, grund: "wartet auf die Bestaetigung der Angaben",
      hinweis: "Der Chat hat die Person gebeten zu markieren, was richtig verstanden ist. Ruf KEIN Werkzeug und schreib nichts dazu." } };
  },

  /* Der Klick auf "Weiter". markiert = Liste der richtigen Zeilen. */
  sammelAntwort(markiert) {
    const kern = typeof Kern !== "undefined" ? Kern : null, o = kern?.lauf?.sammelOffen;
    if (!o || kern.laeuft || kern.lauf.ausstehend) return;
    const falsch = o.punkte.filter((x) => !markiert.includes(x.feld));
    if (falsch.length === o.punkte.length && o.punkte.length > 1 && !o.nachgefragt) {
      o.nachgefragt = true;
      const satz = "Du hast nichts markiert. Stimmt wirklich nichts davon?";
      kern.sagen(satz);
      kern.gespraechPush({ role: "assistant", content: satz });
      kern.lauf.chips = ["Doch, alles richtig", "Nein, nichts stimmt"];
      AgentPanel.setSuggestions(kern.lauf.chips);
      kern.notieren("sammel_nichts_markiert", {});
      kern.sichern();
      return;
    }
    kern.eingabe(falsch.length ? `${falsch.length === o.punkte.length ? "Das stimmt nicht" : "Alles richtig, außer"}: ${falsch.map((x) => x.label).join(", ")}` : "Alles richtig");
  },

  /* Am Anfang jeder Nachricht. Liest nur die eigenen Wortlaute und ein
     reines Ja - alles andere gehoert dem Modell. */
  nachrichtLesen(kern, t) {
    const l = kern.lauf;
    l.neinWert = null; l.gesperrt = null;
    const roh = String(t || "").trim();
    // 1. Rueckfrage mit Ja / Nein
    const r = l.jaNeinOffen;
    l.jaNeinOffen = null;
    if (r) {
      if (Werkzeugkasten.abschlussJa(roh)) {
        kern.notieren("rueckfrage_ja", { felder: Object.keys(r.werte) });
        Werkzeugkasten.chipMerken(kern, r.thema, r.werte, null, roh);      // gilt wie ein Chip: das Modell ueberstimmt es nicht
        Werkzeugkasten.werteUebernehmen(kern, r.thema, r.werte, roh, "rueckfrage_bestaetigt");
      } else {
        if (/^\s*(nein|ne+|nee|nö+|falsch|stimmt nicht)\b/i.test(roh)) {
          l.neinWert = { werte: r.werte, satz: r.satz };
          (l.neinZahl ||= {})[r.thema] = (l.neinZahl[r.thema] || 0) + 1;
        }
        kern.notieren("rueckfrage_kein_ja", { felder: Object.keys(r.werte), nein: !!l.neinWert });
      }
    }
    // 2. Sammelfrage
    const o = l.sammelOffen;
    if (!o) return;
    const schliessen = (falsch) => {
      const best = (l.sammelBestaetigt ||= {});
      for (const x of o.punkte) if (!falsch.includes(x)) { best[x.feld] = x.wert; (l.herkunft ||= {})[x.feld] = "bestaetigt"; }
      const e = [...(l.verlauf || [])].reverse().find((n) => n.rolle === "sammel" && !n.fertig);
      if (e) { e.fertig = true; e.markiert = o.punkte.filter((x) => !falsch.includes(x)).map((x) => x.feld); }
      l.sammelOffen = null;
      if (typeof AgentPanel !== "undefined") AgentPanel.sammelFertig?.(e);
      kern.notieren("sammel_antwort", { richtig: o.punkte.length - falsch.length, falsch: falsch.map((x) => x.feld), unsicherFalsch: falsch.filter((x) => !x.sicher).map((x) => x.feld) });
    };
    const alles = /^(alles richtig|doch, alles richtig)$/i.test(roh) || Werkzeugkasten.abschlussJa(roh);
    const m = roh.match(/^(alles richtig, außer|das stimmt nicht): (.+)$/i);
    if (alles) { schliessen([]); l.vorgehenFuer = null; }
    else if (m || /^nein, nichts stimmt$/i.test(roh)) {
      const namen = m ? m[2].split(",").map((x) => x.trim().toLowerCase()) : null;
      const falsch = o.punkte.filter((x) => !namen || namen.includes(x.label.toLowerCase()));
      schliessen(falsch);
      this.herausnehmen(kern, falsch);
    } else {
      /* Getippt statt geklickt ("der Preis stimmt nicht, eher 200"): liest
         das Modell. Die Liste ist damit erledigt; was sich aendert, wird
         vor den Vorschlaegen noch einmal gezeigt. */
      schliessen([]);
      l.vorgehenFuer = null;
    }
  },

  // Angaben loeschen und ihr Thema wieder oeffnen
  herausnehmen(kern, zeilen) {
    const l = kern.lauf, p = l.profil || (l.profil = {}), gesperrt = new Set();
    for (const x of zeilen) {
      const z = this.ZEILEN[x.feld];
      if (!z) continue;
      for (const f of z.felder) { delete p[f]; if (p.vonPerson) delete p.vonPerson[f]; gesperrt.add(f); }
      for (const t of [z.thema, ...(z.auch || [])].filter(Boolean)) {
        for (const merker of ["besprochen", "gefragtWie", "uebersprungen", "nichtVerstanden", "ohneAntwort", "tippfehlerGefragt", "unsicherGefragt"]) if (l[merker] && typeof l[merker] === "object") delete l[merker][t];
      }
      if (x.feld === "Anreise" || x.feld === "Daten" || x.feld === "Zeit") { l.datumFrage = null; if (x.feld === "Zeit") p.flexibel = undefined; }
      if (z.thema === "preis") { l.preisGewarnt = {}; l.preisGesagt = null; }
      if (z.thema === "flug") l.flughafenGewaehlt = null;
      delete (l.herkunft || {})[x.feld]; delete (l.sammelBestaetigt || {})[x.feld];
    }
    l.gesperrt = { felder: [...gesperrt] };
    // Erst fragen, dann suchen: Steht eine Frage aus, gilt der Stand als gesucht
    const neu = zeilen.flatMap((x) => { const z = this.ZEILEN[x.feld]; return z?.frage ? [z.thema, ...(z.auch || [])] : []; });
    l.sammelNeu = [...new Set([...(l.sammelNeu || []), ...neu])];
    l.gesuchtMit = neu.length && typeof Werkzeugkasten !== "undefined" ? Werkzeugkasten.eckdatenSchluessel(p) : null;
    l.gefiltertMit = null; l.vorgehenFuer = null; l.gefragt = null; l.zuletztGefragt = null;
    const nenn = zeilen.map((x) => (x.feld === "Nicht" ? `den Ausschluss von ${x.wert}` : x.feld === "Wer" ? "die Reisenden" : x.feld === "Zeit" ? x.wert : x.feld === "Flug" ? "den Flug" : x.feld === "Anreise" || x.feld === "Daten" ? "den Anreisetag" : x.wert));
    if (nenn.length) (l.annahmeOffen ||= []).push({ thema: null, eigenesTun: true, felder: {}, text: `Dann nehme ich ${nenn.length > 1 ? `${nenn.slice(0, -1).join(", ")} und ${nenn[nenn.length - 1]}` : nenn[0]} wieder raus.` });
    kern.notieren("sammel_herausgenommen", { felder: [...gesperrt] });
    kern.standAnzeigen?.();
  },

  /* Was das Modell in DIESEM Zug nicht wieder eintragen darf: eben
     Herausgenommenes und eben Verneintes. Gerufen am Anfang von stand_merken. */
  ARGUMENT: { zielId: ["ziel"], personen: ["personenGesamt"], maxStrand: ["maxStrandMeter"], kriterien: ["wuensche"], artGenannt: ["typ"] },
  sperreAnwenden(a, kern) {
    const l = kern.lauf;
    for (const f of l.gesperrt?.felder || []) for (const k of [f, ...(this.ARGUMENT[f] || [])]) if (k in a) { kern.notieren("gesperrt_abgewiesen", { feld: k }); delete a[k]; }
    if (l.neinWert) {
      const du = String([...(l.gespraech || [])].reverse().find((n) => n.role === "user")?.content || "").toLowerCase();
      for (const [f, w] of Object.entries(l.neinWert.werte)) for (const k of [f, ...(this.ARGUMENT[f] || [])]) {
        if (a[k] == null || JSON.stringify(a[k]) !== JSON.stringify(w)) continue;
        // Nennt die Person genau diesen Wert doch ("nein, warte, ja Köln"), gilt er
        if (typeof w === "string" && du.includes(w.toLowerCase())) continue;
        kern.notieren("verneint_abgewiesen", { feld: k, wert: w }); delete a[k];
      }
    }
  },

  // Zeile fuer den Auftrag ans Modell
  fuerModell(l) {
    if (l.neinWert) return `Die Person hat eben verneint: "${l.neinWert.satz}" - dieser Wert ist FALSCH, trag ihn nicht wieder ein. Lies aus ihrer Nachricht, was stattdessen gilt; nennt sie nichts, frag nach.`;
    if (l.gesperrt) return "Die Person hat eben markiert, was falsch verstanden war. Der Kern hat diese Angaben herausgenommen und fragt sie neu. Trag dazu nichts ein.";
    return "";
  },
};
if (typeof module !== "undefined" && module.exports) module.exports = { Absicherung };
