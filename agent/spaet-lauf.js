/* Spaete Aenderungen und Seitenwissen (26.11.2026) - im Browser, ohne Modell.
   node agent/unsichtbar.cjs agent/spaet-lauf.js [arm] http://localhost:8777/ von bis
   Ben: "wenn man gesagt hat, ich moechte doch lieber mit einer Person weniger
   reisen, dass er dann alle Fragen nochmal gestellt hat. Er muesste nur ein
   kleines Detail in den Filtern aendern und trotzdem ein Hotel buchen koennen."
   Und: Er muss wissen, auf welcher Seite man ist, und selbst gemachte Schritte
   uebernehmen ("buch mir das" aus der Kasse). */
async (page) => {
  const BASIS = "http://localhost:8777/";
  const ARM = "schublade";
  const Q = "adults=3&children=1&ages=17&rooms=1&from=2027-03-29&to=2027-04-16&nights=18";
  const LISTE = "results.html?type=hotel&q=Mallorca&flight=0&" + Q, KASSE = "checkout.html?id=h12&board=4&room=0&" + Q;
  const stand = (o) => ({ nachricht_art: "frage", frage_beantwortet: "nein", ...o });
  const DET = { werkzeuge: { haus_details: { id: "h19" } } };
  const FUELLEN = `rName0.value = "Alex Test"; rName0.dispatchEvent(new Event("input", { bubbles: true })); gMail.value = "a@b.de"; gMail.dispatchEvent(new Event("input", { bubbles: true })); gTerms.checked = true;`;
  const CHIP = { tu: `[...document.querySelectorAll("#agentSuggestions .chip")][0]?.click()`, warte: true };
  const A = (o) => ({ nachricht_art: "antwort", frage_beantwortet: "nein", ...o });
  const KERNFRAGEN = ["zeit", "dauer", "reisende", "kinderAlter", "art", "ziel", "flug", "flugAb", "flugKlasse", "verpflegung", "preis", "gewichtung", "ausstattung", "vorgehen", "anzahl"];
  const NEU_GEFRAGT = (e, erlaubt = []) => {
    const f = (e.gefragtNach || []).filter((t) => KERNFRAGEN.includes(t) && !erlaubt.includes(t));
    const nach = e.chat.split("\n").slice(e.chatVorher || 0).join("\n");
    const satz = /Wann soll es|In welchem Monat|Wie lange soll|Wer reist mit|Hotel, eine Ferienwohnung|Soll ein Flug|Von welchem Flughafen|Verpflegung|feste Grenze/.exec(nach);
    return [!f.length || "fragt erneut: " + [...new Set(f)].join(","), !satz || "Fragesatz erneut: " + satz[0]];
  };
  const FRAGT_KLAR = (e) => /So wie ich dich verstehe: .*Soll ich die Buchung für .* so umstellen\?/.test(e.chat) || "keine klare Rueckfrage vor dem Umstellen";
  const BUCH = { du: "dann buch mir das jetzt bitte", stand: A({ nachricht_art: "anweisung" }), werkzeuge: { buchung_vorbereiten: { id: "h12" } } };
  const BUCH_OHNE = { du: "dann buch mir das jetzt bitte", stand: A({ nachricht_art: "anweisung" }) };
  const SZENEN = {
    // --- Test 3: spaete Aenderungen ---
    kasse_eine_person_weniger: { auf: KASSE, s: [{ du: "wir sind doch nur zu dritt, mein Sohn kommt nicht mit", stand: A({ erwachsene: 3, kinder: 0, personenGesamt: 3 }) }, { du: "Ja, umstellen", stand: A({}) }],
      ok: (e) => [FRAGT_KLAR(e), e.profil.erwachsene === 3 && e.profil.kinder === 0 || `Reisende ${e.profil.erwachsene}/${e.profil.kinder}`, ...NEU_GEFRAGT(e),
        /children=0|kinder=0/.test(e.url) || e.kassePers === 3 || "Kasse nicht angepasst: " + e.url + " / " + e.kassePers] },
    kasse_eine_person_weniger_dann_buchen: { auf: KASSE, s: [{ du: "wir sind doch nur zu dritt, mein Sohn kommt nicht mit", stand: A({ erwachsene: 3, kinder: 0, personenGesamt: 3 }) }, BUCH_OHNE],
      ok: (e) => [FRAGT_KLAR(e), ...NEU_GEFRAGT(e), /checkout\.html/.test(e.url) || "nicht in der Kasse: " + e.url, e.kassePers === 3 || "Kasse Personen " + e.kassePers, e.gewaehlt === "h12" || "Haus gewechselt: " + e.gewaehlt] },
    kasse_kuerzer: { auf: KASSE, s: [{ du: "doch nur 14 Nächte", stand: A({ naechte: 14 }) }, { du: "Ja, umstellen", stand: A({}) }],
      ok: (e) => [FRAGT_KLAR(e), e.profil.naechte === 14 || "Naechte " + e.profil.naechte, ...NEU_GEFRAGT(e), /to=2027-04-12/.test(e.url) || e.kasseNaechte === 14 || "Kasse Daten: " + e.url] },
    kasse_ohne_flug: { auf: KASSE, s: [{ du: "doch ohne Flug bitte", stand: A({ flug: false }) }, { du: "Ja, umstellen", stand: A({}) }], pruef: `JSON.stringify({ f: Flug.get(), p: Kern.lauf.profil.flug, kasse: Kern.lauf.flugKasse, url: location.search })`,
      ok: (e) => [FRAGT_KLAR(e), e.profil.flug === false || "Flug " + e.profil.flug, ...NEU_GEFRAGT(e), !e.mit || "Flug in der Kasse noch angehakt"] },
    haus_ohne_flug: { auf: "stay.html?id=h12&board=ai&" + Q, s: [{ du: "doch ohne Flug", stand: A({ flug: false }) }, BUCH_OHNE],
      ok: (e) => [FRAGT_KLAR(e), e.profil.flug === false || "Flug " + e.profil.flug, ...NEU_GEFRAGT(e), /checkout\.html\?id=h12/.test(e.url) || "nicht zur Buchung: " + e.url, !e.mit || "Flug angehakt"] },
    liste_april: { auf: LISTE, s: [{ du: "doch lieber im April", stand: A({ monat: 4 }) }],
      ok: (e) => [e.profil.monat === 4 || "Monat " + e.profil.monat, ...NEU_GEFRAGT(e, ["anreise"]), /from=2027-04|monat=4|2027-04/.test(e.url) || /April/.test(e.chat.split("\n").slice(e.chatVorher).join(" ")) || "Liste nicht umgestellt: " + e.url] },
    liste_halbpension: { auf: LISTE, s: [{ du: "doch lieber Halbpension statt All Inclusive", stand: A({ verpflegung: "halb" }) }],
      ok: (e) => [e.profil.verpflegung === "halb" || "Verpflegung " + e.profil.verpflegung, ...NEU_GEFRAGT(e)] },
    liste_teurer: { auf: LISTE, s: [{ du: "wir können auch bis 500 pro Nacht gehen", stand: A({ maxPreis: 500 }) }],
      ok: (e) => [e.profil.maxPreis === 500 || "Preis " + e.profil.maxPreis, ...NEU_GEFRAGT(e)] },
    liste_andere_region: { auf: LISTE, s: [{ du: "doch lieber Kreta statt Mallorca", stand: A({ ziel: "kreta" }) }],
      ok: (e) => [e.profil.zielId === "kreta" || (e.profil.zieleAuswahl || []).includes("kreta") || "Ziel " + e.profil.zielId, ...NEU_GEFRAGT(e)] },
    haus_doch_ferienwohnung: { auf: "stay.html?id=h12&board=ai&" + Q, s: [{ du: "eigentlich lieber eine Ferienwohnung", stand: A({ typ: "apartment" }) }],
      ok: (e) => [e.profil.typ === "apartment" || "Art " + e.profil.typ, ...NEU_GEFRAGT(e)] },
    // --- Test 4: Seitenwissen und selbst gemachte Schritte ---
    selbst_in_kasse_buch: { auf: "checkout.html?id=h19&board=4&room=0&" + Q, frisch: true, s: [{ tu: FUELLEN }, BUCH_OHNE],
      ok: (e) => [/checkout\.html\?id=h19/.test(e.url) || "nicht mehr in der Kasse von h19: " + e.url, e.gewaehlt === "h19" || "gewaehlt " + e.gewaehlt, e.name === "Alex Test" || "Eingabe weg: " + e.name, ...NEU_GEFRAGT(e, ["anreise"])] },
    selbst_in_kasse_buch_mit_werkzeug: { auf: "checkout.html?id=h19&board=4&room=0&" + Q, frisch: true, s: [{ du: "buch mir das bitte", stand: A({ nachricht_art: "anweisung" }), werkzeuge: { buchung_vorbereiten: { id: "h19" } } }],
      ok: (e) => [/checkout\.html\?id=h19/.test(e.url) || "Kasse " + e.url, e.gewaehlt === "h19" || "gewaehlt " + e.gewaehlt, ...NEU_GEFRAGT(e, ["anreise"])] },
    selbst_auf_hausseite_buch: { auf: "stay.html?id=h19&board=ai&" + Q, frisch: true, s: [BUCH_OHNE, CHIP],
      ok: (e) => [/checkout\.html\?id=h19/.test(e.url) || "nicht zur Buchung von h19: " + e.url, ...NEU_GEFRAGT(e, ["anreise"])] },
    seite_im_stand_haus: { auf: "stay.html?id=h19&board=ai&" + Q, frisch: true, s: [{ tu: `window.__auftrag = Kern.standFuerModell()` }], pruef: `JSON.stringify(window.__auftrag || "")`,
      ok: (e) => [/h19|Refugi/.test(e.pruef || "") || "Hausseite nicht im Auftrag"] },
    seite_im_stand_kasse_selbst: { auf: "checkout.html?id=h19&board=4&room=0&" + Q, frisch: true, s: [{ tu: `window.__auftrag = Kern.standFuerModell()` }], pruef: `JSON.stringify(window.__auftrag || "")`,
      ok: (e) => [/Kasse|Buchung|checkout/i.test(e.pruef || "") && /h19|Refugi/.test(e.pruef || "") || "Kasse/Haus nicht im Auftrag"] },
    kasse_zurueck_zur_liste: { auf: KASSE, s: [{ du: "zeig mir nochmal die anderen Hotels", stand: A({ nachricht_art: "anweisung" }), werkzeuge: { zurueck_zur_liste: {} } }],
      ok: (e) => [/results\.html/.test(e.url) || "nicht zur Liste: " + e.url, ...NEU_GEFRAGT(e)] },
    kasse_was_kostet: { auf: KASSE, s: [{ du: "was kostet das jetzt insgesamt?", stand: A({ nachricht_art: "frage" }), text: "Insgesamt kostet es den Betrag aus der Kasse." }],
      ok: (e) => [/checkout/.test(e.url) || "Kasse verlassen", ...NEU_GEFRAGT(e)] },
    kasse_anderes_zimmer: { auf: KASSE, s: [{ du: "nimm lieber ein anderes Zimmer", stand: A({ nachricht_art: "anweisung" }), werkzeuge: { buchung_vorbereiten: { id: "h12" } } }],
      ok: (e) => [/checkout\.html\?id=h12/.test(e.url) || "Kasse " + e.url, ...NEU_GEFRAGT(e), /Zimmer/.test(e.chat.split("\n").slice(e.chatVorher).join(" ")) || "keine Zimmerauswahl"] },
  };
  const initDrehbuch = () => {
    let S = null;
    try { S = JSON.parse(localStorage.getItem("__drehbuchSkript") || "null"); } catch { S = null; }
    // Mitschreiben: welche Hausseiten, was umrandet wurde
    document.addEventListener("DOMContentLoaded", () => {
      try {
        const q = new URLSearchParams(location.search), b = JSON.parse(sessionStorage.getItem("__besucht") || "[]");
        if (/stay\.html/.test(location.pathname) && sessionStorage.getItem("__zaehlen")) { b.push(q.get("id")); sessionStorage.setItem("__besucht", JSON.stringify(b)); }
        new MutationObserver((l) => { for (const m of l) if (m.target.classList?.contains("agent-liest") && !(m.oldValue || "").includes("agent-liest")) sessionStorage.setItem("__umrandet", String(+(sessionStorage.getItem("__umrandet") || 0) + 1)); })
          .observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"], attributeOldValue: true });
      } catch { /* egal */ }
    });
    if (!S) return;
    const id = () => "call_" + Math.random().toString(36).slice(2, 10);
    const ruf = (name, args) => ({ text: "", chips: [], tool_calls: [{ id: id(), type: "function", function: { name, arguments: JSON.stringify(args || {}) } }], verbrauch: null, dauer: null });
    window.__voyaraDrehbuch = {
      async agent(nachrichten, werkzeuge, st, pflicht) {
        await new Promise((f) => setTimeout(f, 60));
        let iu = -1;
        for (let i = nachrichten.length - 1; i >= 0; i--) if (nachrichten[i].role === "user") { iu = i; break; }
        const du = iu >= 0 ? String(nachrichten[iu].content || "") : "";
        const schritt = S.find((x) => x.du === du) || {};
        const gerufen = nachrichten.slice(iu + 1).filter((m) => m.role === "assistant" && m.tool_calls).flatMap((m) => m.tool_calls.map((t) => t.function.name));
        const standArgs = { nachricht_art: "antwort", frage_beantwortet: "ja", ...(schritt.stand || {}) };
        if (typeof pflicht === "string" && pflicht) return ruf(pflicht, pflicht === "stand_merken" ? standArgs : ((schritt.werkzeuge || {})[pflicht] || {}));
        if (!gerufen.includes("stand_merken")) return ruf("stand_merken", standArgs);
        for (const [name, args] of Object.entries(schritt.werkzeuge || {})) if (!gerufen.includes(name)) return ruf(name, args);
        return { text: schritt.text || "Alles klar.", chips: [], tool_calls: [], verbrauch: null, dauer: null };
      },
      async nachlesen() { return null; },
      async text() { return { text: "", chips: [], verbrauch: null }; },
    };
  };
  const namen = Object.keys(SZENEN);
  const browser = page.context().browser();
  const aus = {};
  const einer = async (name) => {
    const sz = SZENEN[name];
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pg = await ctx.newPage(); const fehler = [];
    pg.on("pageerror", (e) => fehler.push(e.message.slice(0, 120)));
    await ctx.addInitScript(initDrehbuch);
    const weg = () => pg.evaluate(() => { document.querySelector(".einstieg")?.remove(); document.body.classList.remove("startschirm-offen"); }).catch(() => {});
    const ruhe = async () => { let r = 0; for (let i = 0; i < (sz.rundgang ? 900 : 300); i++) { await pg.waitForTimeout(250); let s = false; try { s = await pg.evaluate(() => typeof Kern !== "undefined" && !Kern.laeuft && !Kern.lauf?.ausstehend && document.readyState === "complete"); } catch { s = false; } r = s ? r + 1 : 0; if (r >= 7) return true; } return false; };
    let haengt = false, pruef = null;
    try {
      await pg.goto(BASIS + "index.html?zugang=" + ARM);
      await pg.evaluate((s) => { sessionStorage.clear(); localStorage.clear(); localStorage.setItem("__drehbuchSkript", JSON.stringify(s)); }, sz.s);
      await pg.goto(BASIS + "index.html?zugang=" + ARM + "&t=2"); await pg.waitForTimeout(1200); await weg(); await ruhe();
      await pg.evaluate((vor) => {
        const l = Kern.lauf;
        Object.assign(l.profil ||= {}, { zielId: "mallorca", monat: 3, von: "2027-03-29", bis: "2027-04-16", anreise: "2027-03-29", naechte: 18, erwachsene: 3, kinder: 1, kinderAlter: [17], personen: 4, zimmer: 1,
          typ: "hotel", artGenannt: true, verpflegung: "ai", maxPreis: 400, ausstattung: ["spa"], kriterien: [{ id: "essen", gewicht: 1 }, { id: "getraenke", gewicht: 1 }], beratung: "auswahl", vorgehen: "top3", gewichtungEgal: true,
          flug: true, flugAb: "Hamburg", anzahlVorschlaege: 2, vonPerson: { zielId: true, monat: true, naechte: true, erwachsene: true, kinder: true, typ: true, verpflegung: true, maxPreis: true, flug: true, flugAb: true }, ...vor });
        const p = l.profil, fp = Werkzeugkasten.fahrplan(p, l);
        l.letzteVorlage = ["h12", "h19"]; l.kartenReihenfolge = ["h19", "h12"]; l.partnerId = "h12"; l.gewaehlt = "h12"; l.vorlagen = 1;
        if (vor.__frisch) { l.letzteVorlage = []; l.kartenReihenfolge = null; l.partnerId = null; l.gewaehlt = null; l.vorlagen = 0; delete p.__frisch; }
        l.gesuchtMit = Werkzeugkasten.eckdatenSchluessel(p); l.gefiltertMit = Werkzeugkasten.filterSchluessel(p); l.vorgehenFuer = fp.schluessel + p.vorgehen; l.vorlageFuer = Werkzeugkasten.vorlageSchluessel(p);
        l.sammelBestaetigt = Object.fromEntries(Absicherung.punkte(p, l).map((x) => [x.feld, x.wert])); l.wuenscheGenug = true; l.mietwagenGefragt = true; l.preisGezaehlt = "maxPreis:400"; if (vor.__frisch) { l.vorgehenFuer = null; l.vorlageFuer = null; }
        l.gespraech.push({ role: "user", content: "hi" }, { role: "assistant", content: "Ich habe dir zwei Hotels zusammengestellt." });
        Kern.sichern();
      }, { ...(sz.vor || {}), ...(sz.frisch ? { __frisch: true } : {}) });
      await pg.goto(BASIS + sz.auf); await pg.waitForTimeout(1300); await weg(); await ruhe();
      await pg.evaluate(() => { sessionStorage.setItem("__zaehlen", "1"); sessionStorage.setItem("__umrandet", "0"); });
      const chatVorher = await pg.evaluate(() => (Kern.lauf.verlauf || []).filter((n) => n.rolle !== "schritte").length).catch(() => 0);
      const gefragtNach = [];
      for (const schritt of sz.s) {
        if (schritt.tu) { try { await pg.evaluate((x) => { (0, eval)(x); return true; }, schritt.tu); } catch (e) { if (!/context|navig/i.test(e.message)) haengt = "Klick: " + e.message.slice(0, 90); } }
        else { try { await pg.evaluate((t) => { Kern.eingabe(t); return true; }, schritt.du); } catch { /* Seitenwechsel */ } }
        await pg.waitForTimeout(500); if (!(await ruhe())) haengt = true; await weg();
        const g = await pg.evaluate(() => Kern.lauf.gefragt || null).catch(() => null); if (g) gefragtNach.push(g);
      }
      if (sz.pruef) pruef = await pg.evaluate((x) => (0, eval)(x), sz.pruef);
      await pg.waitForTimeout(400);
      const e = await pg.evaluate(() => ({ url: location.pathname + location.search, besucht: JSON.parse(sessionStorage.getItem("__besucht") || "[]"), umrandet: +(sessionStorage.getItem("__umrandet") || 0),
        name: document.getElementById("rName0")?.value || null, haken: !!document.getElementById("gTerms")?.checked, schritt: typeof Kasse !== "undefined" ? Kasse.stand()?.schritt : null,
        profil: Kern.lauf.profil, vorlage: (Kern.lauf.letzteVorlage || []).length, partnerDrin: (Kern.lauf.letzteVorlage || []).includes(Kern.lauf.partnerId),
        spanne: (() => { const x = (Kern.lauf.letzteVorlage || []).map((i) => Werkzeugkasten.reisepreis(getItemById(i), Kern.lauf.profil)?.gesamt).filter(Boolean); return x.length ? Math.max(...x) / Math.min(...x) - 1 : null; })(),
        mit: !!document.getElementById("cFlugMit")?.checked, ab: document.getElementById("cFlugAb")?.value || null, gewaehlt: Kern.lauf.gewaehlt, freigabe: Kern.freigabe(), chips: Kern.lauf.chips || [],
        ansicht: typeof Vorschlaege !== "undefined" && !!Vorschlaege.offen, flugfenster: typeof Fluege !== "undefined" && !!Fluege.offen, leiste: document.getElementById("agentAuswahlLeiste")?.hidden === false,
        seite: document.body.innerText, ereignisse: (Kern.lauf.protokoll || []).map((x) => x.ereignis + (x.id ? ":" + x.id : "")),
        chat: (Kern.lauf.verlauf || []).filter((n) => n.rolle !== "schritte").map((n) => `${n.rolle === "user" ? "DU" : "AGENT"}: ${String(n.text || "")}`).join("\n") }));
      e.pruef = pruef; e.gefragtNach = gefragtNach; e.chatVorher = chatVorher;
      try { const k = await pg.evaluate(() => (typeof Kasse !== "undefined" && Kasse.stand) ? Kasse.stand() : null); e.kassePers = k && k.belegung ? (+(k.belegung.erwachsene ?? k.belegung.adults ?? 0)) + (+(k.belegung.kinder ?? k.belegung.children ?? 0)) : null; e.kasseNaechte = k ? (k.naechte ?? k.nights ?? null) : null; } catch { /* egal */ }
      const verstoss = sz.ok(e).filter((x) => x !== true);
      if (/undefined|\bNaN\b|\[object/.test(e.chat)) verstoss.push("undefined im Chat");
      if (haengt) verstoss.push("haengt " + (haengt === true ? "" : haengt)); if (fehler.length) verstoss.push("Skriptfehler: " + fehler[0]);
      aus[name] = { verstoss, chat: e.chat, ereignisse: e.ereignisse.slice(-25) };
    } catch (e) { aus[name] = { verstoss: ["Abbruch " + e.message.slice(0, 160)] }; }
    await ctx.close();
  };
  for (let i = 0; i < namen.length; i += 4) await Promise.all(namen.slice(i, i + 4).map(einer));
  const schlecht = namen.filter((n) => aus[n].verstoss.length);
  return JSON.stringify({ arm: ARM, gesamt: namen.length, gut: namen.length - schlecht.length, schlecht: schlecht.map((n) => ({ n, ...aus[n] }))}, null, 1);
}
