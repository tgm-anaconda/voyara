/* Altfehler-Lauf (24.11.2026) - die gemeldeten Fehler der letzten Wochen
   gegen den jetzigen Stand, im ganzen Agenten (Kern, Seite, Suche), ohne
   Modell. Das Drehbuch schickt dieselben Werte wie das Modell damals.
   Ben: "Was hatten wir schon so fuer Fehler? Die noch einmal an den
   aktuellen Stand schicken und gucken, ob das alles noch passt."

   Aufruf mit Playwright (browser_run_code_unsafe, filename). Kostet nichts.
   Gegenprobe: eine Pruefung, die am alten Stand nicht anschlaegt, misst
   nichts - BASIS auf einen Server mit der Sicherung stellen. */
async (page) => {
  const BASIS = "http://localhost:8777/";
  const ARM = "schublade";
  const V = (o) => ({ frage_beantwortet: "ja", ...o });
  const JULI = [{ du: "im Juli", stand: V({ monat: 7 }) }, { du: "flexibel", stand: V({}) }, { du: "10 Nächte", stand: V({ naechte: 10 }) }];
  const ZWEI = { du: "wir sind 2 erwachsene", stand: V({ erwachsene: 2, kinder: 0, personenGesamt: 2 }) };
  // [Name, Datum der Meldung, Gespraech, Pruefung(p, chat) -> Liste der Verstoesse]
  const SZENEN = {
    zwei_jungs_28_34: { am: "18.11.", s: [...JULI, { du: "ich und meine zwei jungs", stand: V({ personenGesamt: 3, erwachsene: 1, kinder: 2 }) }, { du: "28 und 34", stand: V({ kinderAlter: [28, 34] }) }, { du: "wir sind alle erwachsen", stand: V({ erwachsene: 3, kinder: 0, personenGesamt: 3 }) }],
      ok: (p, c) => [p.erwachsene === 3 && p.kinder === 0 || "Reisende falsch", !/acht Jahre/.test(c) || "nimmt 8 Jahre an", /keine Kinder|über 18|volljährig|erwachsen/i.test(c) || "fragt nicht nach"] },
    im_sommer: { am: "18.11.", s: [{ du: "im Sommer", stand: V({ monate: [6, 7, 8] }) }],
      ok: (p, c) => [!p.monat || "Monat selbst gewaehlt " + p.monat, !/ich nehme Ju/i.test(c) || "nimmt Juni", /Juni|Juli|August|Monat/.test(c) || "fragt nicht nach dem Monat"] },
    am_8ten: { am: "20.11.", s: [{ du: "im März", stand: V({ monat: 3 }) }, { du: "am 8ten", stand: V({}) }, { du: "zu 5", stand: V({ personenGesamt: 5 }) }],
      ok: (p, c) => [/-03-08$/.test(p.anreise || "") || "Anreise " + p.anreise, p.personen === 5 || "Personen " + p.personen, !p.naechte || "Naechte erfunden " + p.naechte] },
    tag_89: { am: "20.11.", s: [{ du: "im März", stand: V({ monat: 3 }) }, { du: "89", stand: V({ naechte: 89 }) }],
      ok: (p, c) => [!p.naechte || "89 als Naechte", /8\. oder den 9\./.test(c) || "fragt nicht 8. oder 9."] },
    monat_offen: { am: "17.11.", s: [{ du: "weiß ich ehrlich gesagt noch nicht so genau", stand: V({ frage_beantwortet: "nein", monat: 12 }) }],
      ok: (p, c) => [p.monat !== 12 || "Dezember uebernommen"] },
    tage_70: { am: "17.11.", s: [{ du: "Gerne in ungefähr 70 Tagen", stand: V({}) }],
      ok: (p, c) => [p.monat === 2 || "Monat " + p.monat] },
    lappland_dazu_19grad: { am: "17.11.", s: [{ du: "im Oktober", stand: V({ monat: 10 }) }, { du: "flexibel", stand: V({}) }, { du: "9", stand: V({ naechte: 9 }) }, ZWEI, { du: "Beides zeigen", stand: V({ artEgal: true }) }, { du: "Eher warm", stand: V({ richtung: "warm" }) }, { du: "ich würde gerne mit 19 Grad bleiben aber ich würde doch gerne Lappland noch mit dazu nehmen", stand: V({ zieleAuswahl: ["lappland"], mindestGrad: 19 }) }],
      ok: (p, c) => [(p.zieleAuswahl || []).includes("lappland") || "Lappland fehlt " + JSON.stringify(p.zieleAuswahl), (p.zieleAuswahl || []).length >= 4 || "warme Regionen weg " + JSON.stringify(p.zieleAuswahl), p.zielId !== "lappland" || "nur Lappland"] },
    malle_kapstadt_ergaenzen: { am: "20.11.", s: [...JULI, ZWEI, { du: "Beides zeigen", stand: V({ artEgal: true }) }, { du: "malle kappstadt ergänzen", stand: V({ zieleAuswahl: ["mallorca", "kapstadt"] }) }, { du: "Mit Flug", stand: V({ flug: true, zieleAuswahl: ["kapstadt"] }) }, { du: "Hamburg", stand: V({ flugAb: "Hamburg", zieleAuswahl: ["kapstadt"] }) }],
      ok: (p, c) => [["mallorca", "kapstadt"].every((z) => (p.zieleAuswahl || []).includes(z)) || "Auswahl " + JSON.stringify(p.zieleAuswahl) + "/" + p.zielId] },
    zwei_kleine: { am: "17.11.", s: [...JULI, { du: "ich meine frau und meine zwei kleinen", stand: V({ erwachsene: 2, kinder: 2, personenGesamt: 4, kinderAlter: [3, 5] }) }, { du: "ja die sind zwei und vier", stand: V({ kinderAlter: [2, 4] }) }],
      ok: (p, c) => [p.erwachsene === 2 && p.kinder === 2 || "Reisende", JSON.stringify(p.kinderAlter) === "[2,4]" || "Alter " + JSON.stringify(p.kinderAlter), /wie alt/i.test(c) || "Alter nicht gefragt"] },
    hotel_nach_malle: { am: "17.11.", s: [...JULI, ZWEI, { du: "hotel. wir wollen nach malle", stand: V({ typ: "hotel", ziel: "mallorca", selbst_genannt: ["ziel"] }) }],
      ok: (p, c) => [p.typ === "hotel" || "Art", (p.zielId === "mallorca" || (p.zieleAuswahl || []).includes("mallorca")) || "Ziel fehlt", !/Ziel im Kopf/.test(c.split("wir wollen nach malle")[1] || "") || "fragt Ziel nochmal"] },
    lueneburg: { am: "20.11.", s: [...JULI, ZWEI, { du: "Hotel", stand: V({ typ: "hotel" }) }, { du: "nach Mallorca", stand: V({ ziel: "mallorca" }) }, { du: "Mit Flug", stand: V({ flug: true }) }, { du: "Welcher ist der nächste zu mir. ich wohne in lüneburg", stand: { nachricht_art: "frage", frage_beantwortet: "nein_klaert_noch", flugAb: "Düsseldorf" }, text: "Aus allgemeinem Wissen, nicht von der Seite: Der nächste zu Lüneburg ist Hamburg. Soll ich Hamburg nehmen?" }, { du: "ja", stand: V({ flugAb: "Hamburg" }) }],
      ok: (p, c) => [p.flugAb === "Hamburg" || "Abflug " + p.flugAb, !/(ab|von|Abflug) Düsseldorf/.test(c) || "Kern schlaegt Düsseldorf vor"] },
    klasse_rueckfragen: { am: "17.11.", s: [...JULI, ZWEI, { du: "Hotel", stand: V({ typ: "hotel" }) }, { du: "nach Mallorca", stand: V({ ziel: "mallorca" }) }, { du: "Mit Flug", stand: V({ flug: true }) }, { du: "Hamburg", stand: V({ flugAb: "Hamburg" }) }, { du: "was ist der unterschied?", stand: { nachricht_art: "frage", frage_beantwortet: "nein" }, text: "Das erkläre ich gern." }, { du: "wie teuer sind die jeweils?", stand: { nachricht_art: "frage", frage_beantwortet: "nein" }, text: "Das schaue ich nach." }],
      ok: (p, c) => [!p.flugKlasse || "Klasse angenommen " + p.flugKlasse, !p.verpflegung || "Verpflegung angenommen"] },
    ich_und_mutter: { am: "09.11.", s: [...JULI, { du: "Ich und meine Mutter", stand: V({ erwachsene: 2, kinder: 0, personenGesamt: 2 }) }],
      ok: (p, c) => [p.erwachsene === 2 || "Erwachsene " + p.erwachsene, !(p.kinder > 0) || "Kind erfunden", !/Wie viele seid ihr/.test(c.split("meine Mutter")[1] || "") || "fragt nochmal"] },
    wann_zaehlt_kind: { am: "06.11.", s: [...JULI, { du: "3", stand: V({ personenGesamt: 3 }) }, { du: "wann zählt man als Kind?", stand: { nachricht_art: "frage", frage_beantwortet: "nein" }, text: "Als Kind zählt, wer unter 18 ist." }, { du: "dann sind wir doch 2 Erwachsene und 1 Kind", stand: V({ erwachsene: 2, kinder: 1, personenGesamt: 3 }) }],
      ok: (p, c) => [p.erwachsene === 2 && p.kinder === 1 || `Reisende ${p.erwachsene}/${p.kinder}`, !p.artEgal && !p.typ || "Art angenommen"] },
    lappland_wunsch_nicht_ausschluss: { am: "04.11.", s: [...JULI, ZWEI, { du: "Hotel", stand: V({ typ: "hotel" }) }, { du: "ich will unbedingt nach Lappland", stand: V({ zieleAus: ["lappland"] }) }],
      ok: (p, c) => [!(p.zieleAus || []).includes("lappland") || "ausgeschlossen", !/schließe ich aus|ausgeschlossen/i.test(c) || "sagt ausgeschlossen"] },
    eher_kalt_nicht_mallorca: { am: "22.11.", s: [...JULI, ZWEI, { du: "Hotel", stand: V({ typ: "hotel" }) }, { du: "malle wäre schön", stand: V({ ziel: "mallorca" }) }, { du: "Eher kalt", stand: V({ richtung: "kalt", zieleAus: ["mallorca"] }) }],
      ok: (p, c) => [!(p.zieleAus || []).length || "Ausschluss " + p.zieleAus, !/Nicht Mallorca/.test(c) || "Nicht Mallorca"] },
    personen_55: { am: "neu", s: [...JULI, { du: "55", stand: V({ personenGesamt: 55, erwachsene: 55 }) }],
      ok: (p, c) => [!(p.personen > 12) || "55 uebernommen", !p.personen || "gekappt auf " + p.personen, /richtig verstanden/.test(c.split("DU: 55")[1] || "") || "fragt nicht nach"] },
    einunddreissig_wie_gesagt: { am: "22.11.", s: [{ du: "Ende Oktober", stand: V({ monat: 10 }) }, { du: "31 wie gesagt", stand: V({}) }],
      ok: (p, c) => [/-10-31$/.test(p.anreise || "") || "Anreise " + p.anreise, !p.naechte || "Naechte " + p.naechte] },
    reformationstag_freundin_17: { am: "22.11.", s: [{ du: "am Reformationstag", stand: V({ monat: 10 }) }, { du: "9", stand: V({ naechte: 9 }) }, { du: "ich und eine freundin", stand: V({ erwachsene: 2, kinder: 0, personenGesamt: 2 }) }, { du: "meine freundin ist 17", stand: V({ kinder: 1, kinderAlter: [17] }) }],
      ok: (p, c) => [/-10-31$/.test(p.anreise || "") || "Anreise " + p.anreise, p.erwachsene === 1 && p.kinder === 1 && p.personen === 2 || `Reisende ${p.erwachsene}/${p.kinder}/${p.personen}`] },
    faq_hotels: { am: "18./20.11.", s: [...JULI, ZWEI, { du: "Wie viele Hotels bietet ihr an?", stand: { nachricht_art: "frage", frage_beantwortet: "nein", typ: "hotel" }, text: "Es gibt insgesamt mehrere hundert Hotels." }],
      ok: (p, c) => [p.typ !== "hotel" || "Art aus der Frage gelesen", !/Entschuldige, das habe ich nicht/.test(c) || "nicht verstanden"] },
    suedens_spanien: { am: "22.11.", s: [...JULI, ZWEI, { du: "Hotel", stand: V({ typ: "hotel" }) }, { du: "bitte nicht nach Spanien", stand: V({ ziel: "mallorca" }) }],
      ok: (p, c) => [(p.zieleAus || []).includes("mallorca") || "nicht ausgeschlossen", p.zielId !== "mallorca" || "Mallorca als Ziel"] },
    engstelle_region: { am: "19./22.11.", s: [{ du: "im Oktober", stand: V({ monat: 10 }) }, { du: "flexibel", stand: V({}) }, { du: "9", stand: V({ naechte: 9 }) }, ZWEI, { du: "ein Hotel auf Malle", stand: V({ typ: "hotel", ziel: "mallorca" }) }, { du: "Mit Flug", stand: V({ flug: true }) }, { du: "Hamburg", stand: V({ flugAb: "Hamburg" }) }, { du: "All Inclusive", stand: V({ verpflegung: "ai", verpflegungEgal: false }) }, { du: "180 euro pro nacht für uns beide", stand: V({ maxPreis: 180 }) }, { du: "Bei 180 € bleiben", stand: V({}) }, { du: "was für regionen empfiehlst du mir denn noch?", stand: { nachricht_art: "frage", frage_beantwortet: "nein_klaert_noch", ausweiten: "ziel" } }, { du: "Krabi dazu", stand: V({}) }],
      ok: (p, c) => [(p.zieleAuswahl || []).includes("krabi") && (p.zieleAuswahl || []).includes("mallorca") || "Auswahl " + JSON.stringify(p.zieleAuswahl) + " " + p.zielId, (p.zieleAuswahl || []).length < 8 || "alle Regionen geoeffnet"] },
    kleine_mit_ziffer: { am: "17.11.", s: [...JULI, { du: "ich, meine frau und 2 kleine", stand: V({ erwachsene: 2, kinder: 2, personenGesamt: 4, kinderAlter: [3, 5] }) }, { du: "2 und 4", stand: V({ kinderAlter: [2, 4] }) }],
      ok: (p, c) => [JSON.stringify(p.kinderAlter) === "[2,4]" || "Alter " + JSON.stringify(p.kinderAlter), /wie alt/i.test(c) || "Alter nicht gefragt"] },
    preis_70_flug: { am: "20.11.", s: [...JULI, ZWEI, { du: "Hotel", stand: V({ typ: "hotel" }) }, { du: "nach Mallorca", stand: V({ ziel: "mallorca" }) }, { du: "Nur die Unterkunft", stand: V({ flug: false }) }, { du: "Halbpension", stand: V({ verpflegung: "halb" }) }, { du: "40 euro", stand: V({ maxPreis: 40 }) }, { du: "Für alle zusammen", stand: V({ maxPreis: 40 }) }],
      ok: (p, c) => [!/undefined|NaN/.test(c) || "undefined", /40/.test(c) || "40 fehlt"] },
  };

  const initDrehbuch = () => {
    let S = null;
    try { S = JSON.parse(localStorage.getItem("__drehbuchSkript") || "null"); } catch { S = null; }
    if (!S) return;
    const id = () => "call_" + Math.random().toString(36).slice(2, 10);
    const ruf = (name, args) => ({ text: "", chips: [], tool_calls: [{ id: id(), type: "function", function: { name, arguments: JSON.stringify(args || {}) } }], verbrauch: null, dauer: null });
    window.__voyaraDrehbuch = {
      async agent(nachrichten, werkzeuge, stand, pflicht) {
        await new Promise((f) => setTimeout(f, 60));
        let iu = -1;
        for (let i = nachrichten.length - 1; i >= 0; i--) if (nachrichten[i].role === "user") { iu = i; break; }
        const du = iu >= 0 ? String(nachrichten[iu].content || "") : "";
        const schritt = S.find((x) => x.du === du) || {};
        const danach = nachrichten.slice(iu + 1);
        const gerufen = danach.filter((m) => m.role === "assistant" && m.tool_calls).flatMap((m) => m.tool_calls.map((t) => t.function.name));
        const standArgs = { nachricht_art: "antwort", frage_beantwortet: "ja", ...(schritt.stand || {}) };
        if (typeof pflicht === "string" && pflicht) return ruf(pflicht, pflicht === "stand_merken" ? standArgs : ((schritt.werkzeuge || {})[pflicht] || {}));
        if (!gerufen.includes("stand_merken")) return ruf("stand_merken", standArgs);
        for (const [name, args] of Object.entries(schritt.werkzeuge || {})) if (!gerufen.includes(name)) return ruf(name, args);
        let text = schritt.text || null;
        if (!text) {
          const lt = [...nachrichten].reverse().find((m) => m.role === "tool");
          let als = "";
          try { als = JSON.parse(lt?.content || "{}").alsNaechstes || ""; } catch { als = ""; }
          const m = String(als).match(/So wuerde der Chat sie stellen: "(.*?)" Du darfst/);
          text = m ? m[1] : "Alles klar.";
        }
        return { text, chips: [], tool_calls: [], verbrauch: null, dauer: null };
      },
      async text() { return { text: "", chips: [], verbrauch: null }; },
    };
  };

  const namen = Object.keys(SZENEN);
  const browser = page.context().browser();
  const aus = {};
  const einer = async (name) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pg = await ctx.newPage(); const fehler = [];
    pg.on("pageerror", (e) => fehler.push(e.message.slice(0, 120)));
    await ctx.addInitScript(initDrehbuch);
    const ruhe = async () => { let r = 0; for (let i = 0; i < 300; i++) { await pg.waitForTimeout(250); let s = false; try { s = await pg.evaluate(() => typeof Kern !== "undefined" && !Kern.laeuft && !Kern.lauf?.ausstehend && document.readyState === "complete"); } catch { s = false; } r = s ? r + 1 : 0; if (r >= 6) return true; } return false; };
    let haengt = false;
    try {
      await pg.goto(BASIS + "index.html?zugang=" + ARM);
      await pg.evaluate((s) => { sessionStorage.clear(); localStorage.clear(); localStorage.setItem("__drehbuchSkript", JSON.stringify(s)); }, SZENEN[name].s);
      await pg.goto(BASIS + "index.html?zugang=" + ARM + "&t=2"); await pg.waitForTimeout(1200);
      await pg.evaluate(() => document.querySelector(".einstieg")?.remove()); await ruhe();
      for (const schritt of SZENEN[name].s) {
        try { await pg.evaluate((t) => { Kern.eingabe(t); return true; }, schritt.du); } catch { /* Seitenwechsel */ }
        await pg.waitForTimeout(400); if (!(await ruhe())) haengt = true;
        try { await pg.evaluate(() => document.querySelector(".einstieg")?.remove()); } catch { /* egal */ }
      }
      const e = await pg.evaluate(() => ({ p: Kern.lauf.profil || {}, chat: (Kern.lauf.verlauf || []).filter((n) => n.rolle !== "schritte").map((n) => `${n.rolle === "user" ? "DU" : "AGENT"}: ${String(n.text || "").replace(/\s+/g, " ")}`) }));
      const c = e.chat.join("\n"), verstoss = SZENEN[name].ok(e.p, c).filter((x) => x !== true);
      const agent = e.chat.filter((x) => x.startsWith("AGENT")).map((x) => x.slice(7));
      for (const a of new Set(agent)) if (a.length > 25 && agent.filter((x) => x === a).length > 2) verstoss.push("dreimal dieselbe Nachricht: " + a.slice(0, 60));
      if (/undefined|\bNaN\b|\[object/.test(c)) verstoss.push("undefined im Chat");
      if (agent.some((x) => !x.trim())) verstoss.push("leere Nachricht");
      if (haengt) verstoss.push("haengt"); if (fehler.length) verstoss.push("Skriptfehler: " + fehler[0]);
      aus[name] = { am: SZENEN[name].am, verstoss, chat: e.chat };
    } catch (e) { aus[name] = { verstoss: ["Abbruch " + e.message.slice(0, 120)] }; }
    await ctx.close();
  };
  for (let i = 0; i < namen.length; i += 4) await Promise.all(namen.slice(i, i + 4).map(einer));
  const schlecht = namen.filter((n) => aus[n].verstoss.length);
  return JSON.stringify({ arm: ARM, gesamt: namen.length, gut: namen.length - schlecht.length, schlecht: schlecht.map((n) => ({ n, ...aus[n] })) }, null, 1);
}
