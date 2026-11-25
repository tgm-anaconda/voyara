/* Sammelfrage-Lauf (25.11.2026) - ganze Gespraeche bis zur Sammelfrage, ohne
   Modell. Aufruf: node agent/unsichtbar.cjs agent/sammel-lauf.js [arm]
   Schritte: du = Nachricht, stand = was das Modell meldet, tu = Klick. */
async (page) => {
  const BASIS = "http://localhost:8777/";
  const ARM = "schublade";
  const V = (o) => ({ frage_beantwortet: "ja", ...o });
  const ALLES = (anders = {}) => [{ du: "im Juli", stand: V({ monat: 7 }) }, { du: "flexibel", stand: V({}) }, { du: "10 Nächte", stand: V({ naechte: 10 }) },
    { du: anders.wer || "wir sind 2 erwachsene", stand: V(anders.werStand || { erwachsene: 2, kinder: 0, personenGesamt: 2 }) }, { du: "Hotel", stand: V({ typ: "hotel" }) }, { du: "nach Mallorca", stand: V({ ziel: "mallorca" }) },
    { du: "Nur die Unterkunft", stand: V({ flug: false }) }, { du: "Halbpension", stand: V({ verpflegung: "halb" }) }, { du: "bis 220 euro pro nacht", stand: V({ maxPreis: 220 }) }, { du: "Für alle zusammen", stand: V({ maxPreis: 220 }) },
    { du: "Nein, nichts davon", stand: V({ ausstattungEgal: true }) }, { du: "am 7. Juli", stand: V({ anreise: "2027-07-07" }) }, { du: "ist mir alles gleich wichtig", stand: V({}) }];
  const hak = (nicht) => `(() => { document.querySelectorAll("#agentMessages .sammel:not(.fertig) input").forEach((k) => { if (!${JSON.stringify(nicht)}.includes(k.value)) k.click(); }); document.querySelector("#agentMessages .sammel:not(.fertig) button").click(); })()`;
  const WEITER = `document.querySelector("#agentMessages .sammel:not(.fertig) button").click()`;
  const NACHLADEN = "location.reload()";
  const SZENEN = {
    alles_richtig: { s: [...ALLES(), { tu: hak([]), du: "Alles richtig", stand: V({}) }],
      ok: (p, c, l) => [/markiere, was ich richtig/.test(c) || "keine Sammelfrage", l.sammelBestaetigt?.Ziel === "Mallorca" || "nicht bestaetigt", (c.match(/markiere, was ich/g) || []).length === 1 || "mehrfach gefragt", /passt das, oder möchtest du mehr vergleichen|nur \d+ Hotels|bleiben/.test(c.split("Alles richtig")[1] || "") || "geht nicht weiter", p.zielId === "mallorca" && p.maxPreis === 220 || "Stand veraendert"] },
    ziel_falsch: { s: [...ALLES(), { tu: hak(["Ziel"]), du: "Alles richtig, außer: Ziel", stand: V({ ziel: "mallorca" }) }, { du: "nach Kreta", stand: V({ ziel: "kreta" }) }],
      ok: (p, c) => [/Mallorca wieder raus/.test(c) || "sagt es nicht", /warme oder|Ziel im Kopf|Wohin/i.test(c.split("wieder raus")[1] || "") || "fragt nicht neu", p.zielId === "kreta" || "Ziel " + p.zielId, p.maxPreis === 220 && p.naechte === 10 && p.erwachsene === 2 || "anderes verloren"] },
    reisende_falsch: { s: [...ALLES({ wer: "ich und meine zwei mädels", werStand: { erwachsene: 1, kinder: 0, personenGesamt: 3 } }), { tu: hak(["Wer"]), du: "Alles richtig, außer: Reisende", stand: V({ erwachsene: 3 }) }, { du: "3 Erwachsene", stand: V({ erwachsene: 3, kinder: 0 }) }],
      ok: (p, c) => [/Reisenden wieder raus/.test(c) || "sagt es nicht", p.erwachsene === 3 && p.kinder === 0 || `Reisende ${p.erwachsene}/${p.kinder}`, p.zielId === "mallorca" || "Ziel verloren"] },
    zwei_falsch: { s: [...ALLES(), { tu: hak(["Essen", "Dauer"]), du: "Alles richtig, außer: Dauer, Verpflegung", stand: V({}) }, { du: "7 Nächte", stand: V({ naechte: 7 }) }, { du: "All Inclusive", stand: V({ verpflegung: "ai" }) }],
      ok: (p, c) => [p.naechte === 7 || "Naechte " + p.naechte, p.verpflegung === "ai" || "Essen " + p.verpflegung, p.zielId === "mallorca" || "Ziel verloren"] },
    nichts_markiert: { s: [...ALLES(), { tu: WEITER, du: null }, { du: "Doch, alles richtig", stand: V({}) }],
      ok: (p, c, l) => [/Stimmt wirklich nichts davon/.test(c) || "fragt nicht nach", p.zielId === "mallorca" && p.maxPreis === 220 || "Stand geloescht", !l.sammelOffen || "bleibt offen"] },
    getippt_ja: { s: [...ALLES(), { du: "ja passt", stand: V({}) }], ok: (p, c, l) => [!l.sammelOffen || "bleibt offen", p.zielId === "mallorca" || "Ziel weg", (c.match(/markiere, was ich/g) || []).length === 1 || "mehrfach gefragt"] },
    getippt_korrektur: { s: [...ALLES(), { du: "der Preis stimmt nicht, eher 180 pro Nacht", stand: V({ maxPreis: 180, selbst_genannt: ["maxPreis"] }) }], ok: (p, c, l) => [p.maxPreis === 180 || "Preis " + p.maxPreis, p.zielId === "mallorca" || "Ziel weg"] },
    nachladen: { s: [...ALLES(), { tu: NACHLADEN, du: null }, { tu: hak([]), du: "Alles richtig", stand: V({}) }], ok: (p, c, l) => [l.sammelBestaetigt?.Ziel === "Mallorca" || "nach Neuladen nicht klickbar", p.zielId === "mallorca" || "Ziel weg"] },
    nur_gefragt_kreta: { s: [{ du: "im Juli", stand: V({ monat: 7 }) }, { du: "flexibel", stand: V({}) }, { du: "10 Nächte", stand: V({ naechte: 10 }) }, { du: "wir sind 2 erwachsene", stand: V({ erwachsene: 2, kinder: 0, personenGesamt: 2 }) }, { du: "Hotel", stand: V({ typ: "hotel" }) }, { du: "was wäre denn mit Kreta?", stand: V({ ziel: "kreta" }), werkzeuge: { suchen: { ziel: "kreta" } } }, { du: "Ja", stand: V({}) }],
      ok: (p, c) => [/richtig verstanden: Du möchtest nach Kreta/.test(c) || "fragt nicht nach", p.zielId === "kreta" || "nach Ja: " + p.zielId] },
    nur_gefragt_nein: { s: [{ du: "im Juli", stand: V({ monat: 7 }) }, { du: "flexibel", stand: V({}) }, { du: "10 Nächte", stand: V({ naechte: 10 }) }, { du: "wir sind 2 erwachsene", stand: V({ erwachsene: 2, kinder: 0, personenGesamt: 2 }) }, { du: "Hotel", stand: V({ typ: "hotel" }) }, { du: "was wäre denn mit Kreta?", stand: V({ ziel: "kreta" }), werkzeuge: { suchen: { ziel: "kreta" } } }, { du: "Nein: lieber Sardinien", stand: V({ ziel: "sardinien" }) }],
      ok: (p, c) => [p.zielId === "sardinien" || "Ziel " + p.zielId] },
    zwei_lesungen_verschieden: { s: [{ du: "im Juli", stand: V({ monat: 7 }) }, { du: "flexibel", stand: V({}) }, { du: "10 Nächte", stand: V({ naechte: 10 }) }, { du: "meine kleinen Süßen sind ja gar nicht mehr 17 und 19, sondern mittlerweile 23 und 25", stand: V({ erwachsene: 2, kinder: 2, kinderAlter: [17, 19] }), zweit: { erwachsene: 2, kinder: 0, unklar: false } }, { du: "Ja", stand: V({ erwachsene: 4 }) }],
      ok: (p, c) => [/Ihr seid 2 Erwachsene und keine Kinder/.test(c) || "fragt nicht nach", p.erwachsene === 2 && p.kinder === 0 || `Reisende ${p.erwachsene}/${p.kinder}`] },
    zwei_lesungen_unklar: { s: [{ du: "im Juli", stand: V({ monat: 7 }) }, { du: "flexibel", stand: V({}) }, { du: "10 Nächte", stand: V({ naechte: 10 }) }, { du: "mit unserer Bande", stand: V({ erwachsene: 2, kinder: 2 }), zweit: { erwachsene: null, kinder: null, unklar: true } }, { du: "2 Erwachsene und 1 Kind, sie ist 6", stand: V({ erwachsene: 2, kinder: 1, kinderAlter: [6] }), zweit: { erwachsene: 2, kinder: 1, unklar: false } }],
      ok: (p, c) => [p.erwachsene === 2 && p.kinder === 1 || `Reisende ${p.erwachsene}/${p.kinder}`, /[Ww]ie viele|[Ww]er reist|insgesamt/.test(c.split("Bande")[1] || "") || "fragt nicht neu"] },
    zwei_lesungen_gleich: { s: [{ du: "im Juli", stand: V({ monat: 7 }) }, { du: "flexibel", stand: V({}) }, { du: "10 Nächte", stand: V({ naechte: 10 }) }, { du: "ich und meine Mutter", stand: V({ erwachsene: 2, kinder: 0 }), zweit: { erwachsene: 2, kinder: 0, unklar: false } }],
      ok: (p, c) => [p.erwachsene === 2 && p.kinder === 0 || "Reisende", !/richtig verstanden/.test(c) || "fragt unnoetig"] },
    zweite_haengt: { s: [{ du: "im Juli", stand: V({ monat: 7 }) }, { du: "flexibel", stand: V({}) }, { du: "10 Nächte", stand: V({ naechte: 10 }) }, { du: "ich und meine Mutter", stand: V({ erwachsene: 2, kinder: 0 }), zweit: "haengt" }],
      ok: (p) => [p.erwachsene === 2 && p.kinder === 0 || "Reisende"] },
    dauer_verschieden: { s: [{ du: "im Juli", stand: V({ monat: 7 }) }, { du: "flexibel", stand: V({}) }, { du: "zwei Wochen, minus die zwei Tage für die Anreise", stand: V({ naechte: 14 }), zweit: { naechte: 12, unklar: false } }, { du: "Ja", stand: V({ naechte: 14 }) }],
      ok: (p, c) => [/richtig verstanden: 12 Nächte/.test(c) || "fragt nicht nach", p.naechte === 12 || "Naechte " + p.naechte] },
    dauer_ersatz: { s: [{ du: "im Juli", stand: V({ monat: 7 }) }, { du: "flexibel", stand: V({}) }, { du: "Montag bis Freitag derselben Woche ungefähr, denke ich", stand: { frage_beantwortet: "nein" }, zweit: { naechte: 4, unklar: false } }],
      ok: (p, c) => [p.naechte === 4 || "Naechte " + p.naechte, !/Wie lange/.test(c.split("derselben Woche")[1] || "") || "fragt noch einmal"] },
    zeit_verschieden_nein: { s: [{ du: "wie immer im Juni, nein, diesmal im September", stand: V({ monat: 6 }), zweit: { monat: 9, unklar: false } }, { du: "Nein: Oktober", stand: V({ monat: 10 }), zweit: { monat: 10, unklar: false } }],
      ok: (p, c) => [/richtig verstanden: September/.test(c) || "fragt nicht nach", p.monat === 10 || "Monat " + p.monat] },
    preis_verschieden: { s: [...ALLES().slice(0, 8), { du: "pack auf 160 noch einen Zwanziger drauf", stand: V({ maxPreis: 20 }), zweit: { betrag: 180, fuer: "nacht" } }, { du: "Ja", stand: V({}) }],
      ok: (p, c) => [/180/.test(c) || "fragt nicht nach", p.maxPreis === 180 || "Preis " + p.maxPreis] },
    unklar_nur_einmal: { s: [{ du: "irgendwann zwischen Mai und Juli", stand: V({ monat: 5 }), zweit: { monat: null, unklar: true } }, { du: "na dann irgendwie Mai rum, schätze ich", stand: V({ monat: 5 }), zweit: { monat: null, unklar: true } }],
      ok: (p, c) => [p.monat === 5 || "Monat " + p.monat + " - Schleife"] },
    ort_mit_fragezeichen: { s: [...ALLES().slice(0, 5), { du: "habt ihr auch was in Kapstadt?", stand: V({ ziel: "kapstadt" }) }, { du: "Nein: Sardinien", stand: V({ ziel: "sardinien" }) }],
      ok: (p, c) => [/Du möchtest nach Kapstadt/.test(c) || "fragt nicht nach", p.zielId === "sardinien" || "Ziel " + p.zielId] },
    ort_mit_anhaengsel: { s: [...ALLES().slice(0, 5), { du: "wir wollen nach Kreta, geht das?", stand: V({ ziel: "kreta" }) }], ok: (p, c) => [p.zielId === "kreta" || "Ziel " + p.zielId] },
    nein_prefill: { s: [{ du: "im Juli", stand: V({ monat: 7 }) }, { du: "flexibel", stand: V({}) }, { du: "10 Nächte", stand: V({ naechte: 10 }) }, { du: "wir sind 2 erwachsene", stand: V({ erwachsene: 2, kinder: 0, personenGesamt: 2 }) }, { du: "Hotel", stand: V({ typ: "hotel" }) }, { du: "in die Stadt, die niemals schläft", stand: { frage_beantwortet: "nein_klaert_noch", ziel: "newyork" } },
        { tu: `[...document.querySelectorAll("#agentSuggestions .chip")].find((x) => /^Nein/.test(x.textContent)).click()`, du: null, pruef: `document.getElementById("agentInput").value` }, { du: "Nein: Barcelona", stand: V({ ziel: "barcelona" }) }],
      ok: (p, c, l, w) => [/richtig verstanden: Du möchtest nach New York/.test(c) || "fragt nicht nach", w.includes("Nein: ") || "Feld: " + JSON.stringify(w), p.zielId === "barcelona" || "Ziel " + p.zielId, !/DU: Nein: \.\.\./.test(c) || "Chip wurde abgeschickt"] },
    nein_modell_bleibt_stur: { s: [{ du: "im Juli", stand: V({ monat: 7 }) }, { du: "flexibel", stand: V({}) }, { du: "10 Nächte", stand: V({ naechte: 10 }) }, { du: "wir sind 2 erwachsene", stand: V({ erwachsene: 2, kinder: 0, personenGesamt: 2 }) }, { du: "Hotel", stand: V({ typ: "hotel" }) }, { du: "in die Stadt, die niemals schläft", stand: { frage_beantwortet: "nein_klaert_noch", ziel: "newyork" } }, { du: "Nein: nicht die", stand: V({ ziel: "newyork" }) }],
      ok: (p, c) => [p.zielId !== "newyork" || "verneinter Wert kam zurueck", (c.match(/Du möchtest nach New York/g) || []).length === 1 || "fragt dasselbe nochmal"] },
    ja_getippt: { s: [{ du: "im Juli", stand: V({ monat: 7 }) }, { du: "flexibel", stand: V({}) }, { du: "10 Nächte", stand: V({ naechte: 10 }) }, { du: "wir sind 2 erwachsene", stand: V({ erwachsene: 2, kinder: 0, personenGesamt: 2 }) }, { du: "Hotel", stand: V({ typ: "hotel" }) }, { du: "in die Stadt, die niemals schläft", stand: { frage_beantwortet: "nein_klaert_noch", ziel: "newyork" } }, { du: "ja genau", stand: V({ ziel: "wien" }) }],
      ok: (p) => [p.zielId === "newyork" || "Ziel " + p.zielId] },
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
      async nachlesen(k) { const s = S.find((x) => x.du === k.antwort); if (s?.zweit === "haengt") return new Promise(() => {}); return s?.zweit || null; },
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
    let haengt = false; const werte = [];
    try {
      await pg.goto(BASIS + "index.html?zugang=" + ARM);
      await pg.evaluate((s) => { sessionStorage.clear(); localStorage.clear(); localStorage.setItem("__drehbuchSkript", JSON.stringify(s)); }, SZENEN[name].s);
      await pg.goto(BASIS + "index.html?zugang=" + ARM + "&t=2"); await pg.waitForTimeout(1200);
      await pg.evaluate(() => document.querySelector(".einstieg")?.remove()); await ruhe();
      for (const schritt of SZENEN[name].s) {
        if (schritt.tu) { try { await pg.evaluate((x) => { (0, eval)(x); return true; }, schritt.tu); } catch (e) { if (/null|undefined/.test(e.message)) haengt = "Klick: " + e.message.slice(0, 60); } }
        else { try { await pg.evaluate((t) => { Kern.eingabe(t); return true; }, schritt.du); } catch { /* Seitenwechsel */ } }
        if (schritt.pruef) { await pg.waitForTimeout(300); werte.push(await pg.evaluate((x) => (0, eval)(x), schritt.pruef)); }
        await pg.waitForTimeout(400); if (!(await ruhe()) && schritt.du !== null) haengt = true;
        try { await pg.evaluate(() => document.querySelector(".einstieg")?.remove()); } catch { /* egal */ }
      }
      const e = await pg.evaluate(() => ({ p: Kern.lauf.profil || {}, l: { sammelBestaetigt: Kern.lauf.sammelBestaetigt, sammelOffen: Kern.lauf.sammelOffen, herkunft: Kern.lauf.herkunft }, chat: (Kern.lauf.verlauf || []).filter((n) => !["schritte", "sammel"].includes(n.rolle)).map((n) => `${n.rolle === "user" ? "DU" : "AGENT"}: ${String(n.text || "").replace(/\s+/g, " ")}`) }));
      const c = e.chat.join("\n"), verstoss = SZENEN[name].ok(e.p, c, e.l, werte).filter((x) => x !== true);
      const agent = e.chat.filter((x) => x.startsWith("AGENT")).map((x) => x.slice(7));
      for (const a of new Set(agent)) if (a.length > 25 && agent.filter((x) => x === a).length > 2) verstoss.push("dreimal dieselbe Nachricht: " + a.slice(0, 60));
      if (/undefined|\bNaN\b|\[object/.test(c)) verstoss.push("undefined im Chat");
      if (agent.some((x) => !x.trim())) verstoss.push("leere Nachricht");
      if (haengt) verstoss.push("haengt " + (haengt === true ? "" : haengt)); if (fehler.length) verstoss.push("Skriptfehler: " + fehler[0]);
      aus[name] = { am: SZENEN[name].am || '', verstoss, chat: e.chat };
    } catch (e) { aus[name] = { verstoss: ["Abbruch " + e.message.slice(0, 120)] }; }
    await ctx.close();
  };
  for (let i = 0; i < namen.length; i += 4) await Promise.all(namen.slice(i, i + 4).map(einer));
  const schlecht = namen.filter((n) => aus[n].verstoss.length);
  return JSON.stringify({ arm: ARM, gesamt: namen.length, gut: namen.length - schlecht.length, schlecht: schlecht.map((n) => ({ n, ...aus[n] })) }, null, 1);
}
