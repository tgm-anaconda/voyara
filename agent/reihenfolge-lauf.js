/* Reihenfolge-Lauf (26.11.2026) - Ben: "wenn man die Reihenfolge, die der
   Agent in seinen Fragen durchfuehrt, ein bisschen durcheinander bringt".
   Elf Angaben in zufaelliger Reihenfolge, einzeln oder zu zweit/dritt in
   einer Nachricht. Das Drehbuch spielt ein Modell, das immer richtig
   versteht. Geprueft: alles steht am Ende im Stand, keine Frage zu etwas
   schon Gesagtem, kein Verwerfen, keine Sackgasse.
   Aufruf: node agent/unsichtbar.cjs agent/reihenfolge-lauf.js <arm> <basis> <von> <bis> */
async (page) => {
  const BASIS = "http://localhost:8777/";
  const ARM = "schublade";
  const FAKTEN = {
    zeit: ["im Januar", { monat: 1 }],
    dauer: ["9 Nächte", { naechte: 9 }],
    reisende: ["wir sind 2 Erwachsene und unsere Tochter, sie ist 6", { erwachsene: 2, kinder: 1, personenGesamt: 3, kinderAlter: [6] }],
    anreise: ["Anreise am 10. Januar", { monat: 1, anreise: "2027-01-10" }],
    art: ["eine Ferienwohnung", { typ: "apartment" }],
    flug: ["mit Flug ab Hamburg", { flug: true, flugAb: "Hamburg" }],
    preis: ["höchstens 250 pro Nacht", { maxPreis: 250 }],
    verpflegung: ["Verpflegung ist egal", { verpflegungEgal: true }],
  };
  const ZIEL_A = { ziel: ["eher warm, mindestens 22 Grad", { richtung: "warm", mindestGrad: 22 }] };
  const ZIEL_B = { ziel: ["gerne nach Teneriffa", { ziel: "teneriffa" }] };
  // Zufall mit festem Startwert: jeder Lauf ist wiederholbar
  let saat = 20261126;
  const zufall = () => { saat = (saat * 1103515245 + 12345) % 2147483648; return saat / 2147483648; };
  const SZENEN = {};
  for (let n = 0; n < 48; n++) {
    const fakten = { ...FAKTEN, ...(n % 2 ? ZIEL_B : ZIEL_A) };
    const themen = Object.keys(fakten).sort(() => zufall() - 0.5);
    const s = [];
    for (let i = 0; i < themen.length;) {
      const k = zufall() < 0.55 ? 1 : zufall() < 0.7 ? 2 : 3;
      const teil = themen.slice(i, i + k); i += k;
      s.push({ du: teil.map((t) => fakten[t][0]).join(", "), themen: teil,
        stand: Object.assign({ selbst_genannt: teil }, ...teil.map((t) => fakten[t][1])) });
    }
    SZENEN[`r${String(n).padStart(2, "0")}_${n % 2 ? "teneriffa" : "warm"}`] = { am: "26.11.", s, ziel: n % 2 ? "teneriffa" : "warm" };
  }
  // Eine berechtigte Rueckfrage ("fuer euch alle oder pro Person?") ist kein Fehler
  const PRUEF = (p, ziel, __proPersonGefragt) => [
    p.monat === 1 || "Monat " + p.monat, p.naechte === 9 || "Naechte " + p.naechte,
    (p.erwachsene === 2 && p.kinder === 1) || `Reisende ${p.erwachsene}/${p.kinder}`, JSON.stringify(p.kinderAlter) === "[6]" || "Alter " + JSON.stringify(p.kinderAlter),
    /-01-10$/.test(p.anreise || "") || "Anreise " + p.anreise, p.typ === "apartment" || "Art " + p.typ,
    (p.flug === true && p.flugAb === "Hamburg") || `Flug ${p.flug}/${p.flugAb}`, p.maxPreis === 250 || (p.maxPreis == null && __proPersonGefragt) || "Preis " + p.maxPreis,
    (p.verpflegungEgal === true || !p.verpflegung) || "Verpflegung " + p.verpflegung,
    ziel === "warm" ? ((p.richtung === "warm" && p.mindestGrad === 22) || `Richtung ${p.richtung}/${p.mindestGrad}`)
      : (p.zielId === "teneriffa" || (p.zieleAuswahl || []).includes("teneriffa") || "Ziel " + p.zielId),
  ];
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
        const offen = (typeof Kern !== "undefined" && (Kern.lauf.gefragtVorher || Kern.lauf.gefragt)) || null;
        const passt = (schritt.themen || []).includes(offen) || (offen === "kinderAlter" && (schritt.themen || []).includes("reisende")) || (offen === "flugAb" && (schritt.themen || []).includes("flug"));
        const standArgs = { nachricht_art: "antwort", frage_beantwortet: passt ? "ja" : "nein", ...(schritt.stand || {}) };
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
      const gesagt = new Set(), doppelt = [];
      for (const schritt of SZENEN[name].s) {
        try { await pg.evaluate((t) => { Kern.eingabe(t); return true; }, schritt.du); } catch { /* Seitenwechsel */ }
        await pg.waitForTimeout(400); if (!(await ruhe())) haengt = true;
        try { await pg.evaluate(() => document.querySelector(".einstieg")?.remove()); } catch { /* egal */ }
        schritt.themen.forEach((t) => gesagt.add(t));
        if (schritt.themen.includes("reisende")) gesagt.add("kinderAlter");
        if (schritt.themen.includes("flug")) gesagt.add("flugAb");
        const nun = await pg.evaluate(() => ({ g: Kern.lauf.gefragt || null, letzte: [...(Kern.lauf.verlauf || [])].reverse().find((n) => n.rolle !== "user" && n.rolle !== "schritte")?.text || "" })).catch(() => ({}));
        if (nun.g === "preis" && /alle zusammen oder pro Person\?/.test(String(nun.letzte))) continue;
        if (nun.g && gesagt.has(nun.g)) doppelt.push(`fragt ${nun.g} nach "${schritt.du.slice(0, 40)}": ${String(nun.letzte).replace(/\s+/g, " ").slice(0, 90)}`);
      }
      const e = await pg.evaluate(() => ({ p: Kern.lauf.profil || {}, chat: (Kern.lauf.verlauf || []).filter((n) => n.rolle !== "schritte" && n.rolle !== "sammel").map((n) => `${n.rolle === "user" ? "DU" : "AGENT"}: ${String(n.text || "").replace(/\s+/g, " ")}`) }));
      const c = e.chat.join("\n"), verstoss = PRUEF(e.p, SZENEN[name].ziel, /alle zusammen oder pro Person\?/.test(e.chat.join("\n"))).filter((x) => x !== true);
      verstoss.push(...doppelt);
      const weg = await pg.evaluate(() => (Kern.lauf.protokoll || []).filter((x) => /verworfen|abgelehnt|abgewiesen|nicht_ueberschrieben|anderer_monat|wartet/.test(x.ereignis || "")).map((x) => x.ereignis + (x.feld ? ":" + x.feld : "") + (x.felder ? ":" + x.felder : ""))).catch(() => []);
      if (weg.length) verstoss.push("verworfen: " + [...new Set(weg)].join(", "));
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
