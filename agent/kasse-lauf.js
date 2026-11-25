/* Kasse, Vergleich, Uebernahme (25.11.2026) - im Browser, ohne Modell.
   node agent/unsichtbar.cjs agent/kasse-lauf.js [arm] http://localhost:8777/ von bis
   Aus Bens Durchgang: nachsehen statt behaupten, zurueck an dieselbe Stelle,
   Flug aus dem Gespraech, Angebot beim Flugfenster, "such einen Flug fuer mich". */
async (page) => {
  const BASIS = "http://localhost:8777/";
  const ARM = "schublade";
  const Q = "adults=3&children=1&ages=17&rooms=1&from=2027-03-29&to=2027-04-16&nights=18";
  const LISTE = "results.html?type=hotel&q=Mallorca&flight=0&" + Q, KASSE = "checkout.html?id=h12&board=4&room=0&" + Q;
  const stand = (o) => ({ nachricht_art: "frage", frage_beantwortet: "nein", ...o });
  const DET = { werkzeuge: { haus_details: { id: "h19" } } };
  const FUELLEN = `rName0.value = "Alex Test"; rName0.dispatchEvent(new Event("input", { bubbles: true })); gMail.value = "a@b.de"; gMail.dispatchEvent(new Event("input", { bubbles: true })); gTerms.checked = true;`;
  const SZENEN = {
    vergleich_aus_der_kasse: { auf: KASSE, s: [{ tu: FUELLEN }, { du: "Worin unterscheiden sie sich?", stand: stand(), ...DET }],
      ok: (e) => [/checkout\.html\?id=h12/.test(e.url) || "nicht zurueck: " + e.url, JSON.stringify(e.besucht) === '["h19","h12"]' || "besucht " + JSON.stringify(e.besucht), e.name === "Alex Test" || "Eingabe weg: " + e.name, e.haken || "Haken weg",
        /Das sind die Unterschiede/.test(e.chat) || "kein Vergleich", /Strand: 150 m \(Hotel Migjorn Beach\), 7,5 km/.test(e.chat) || "Strand fehlt", /Essen: /.test(e.chat) && /Getränke/.test(e.chat) || "Wuensche fehlen", /Spa & Wellness: haben beide/.test(e.chat) || "Muss fehlt", /Preis für 18 Nächte mit All Inclusive: /.test(e.chat) || "Preis fehlt",
        !/Flug(preis)?:/.test(e.chat.split("Unterschiede")[1] || "") || "Flugpreis steht drin", e.gewaehlt === "h12" || "gewaehlt " + e.gewaehlt, !e.ereignisse.includes("selbst_geoeffnet:h19") || "gilt als selbst geoeffnet", e.umrandet >= 8 || "umrandet nur " + e.umrandet, e.mit && e.ab === "HAM" || "Flug " + e.mit + e.ab] },
    vergleich_schritt_2: { auf: KASSE, s: [{ tu: `for (const x of document.querySelectorAll("[data-r]")) { x.value = "A B"; x.dispatchEvent(new Event("input", { bubbles: true })); } cAnkunft.value = "15:00"; cAnkunft.dispatchEvent(new Event("change", { bubbles: true })); cFlugMit.click(); gTerms.checked = true; guestForm.requestSubmit();` }, { du: "Was ist der Unterschied?", stand: stand(), ...DET }],
      ok: (e) => [/checkout\.html\?id=h12/.test(e.url) || "nicht zurueck", e.schritt === 2 || "Schritt " + e.schritt, /Das sind die Unterschiede/.test(e.chat) || "kein Vergleich"] },
    vergleich_aus_der_liste: { auf: LISTE, s: [{ du: "Vergleich mir die beiden mal", stand: stand({ nachricht_art: "anweisung" }), ...DET }],
      ok: (e) => [/results\.html/.test(e.url) || "nicht zurueck: " + e.url, e.besucht.length === 2 || "besucht " + e.besucht, (e.chat.match(/Das sind die Unterschiede/g) || []).length === 1 || "nicht genau ein Vergleich"] },
    vergleich_mit_ansicht: { auf: LISTE, s: [{ tu: `Kern.vorschlaegeNochmal("test")` }, { du: "worin unterscheiden die sich", stand: stand(), ...DET }],
      ok: (e) => [e.ansicht || "Vorschlagsansicht nicht wieder offen", e.besucht.length === 2 || "besucht " + e.besucht] },
    vergleich_von_der_hausseite: { auf: "stay.html?id=h19&board=ai&" + Q, s: [{ du: "Wo ist der Unterschied zwischen den beiden?", stand: stand(), ...DET }],
      ok: (e) => [/stay\.html\?id=h19/.test(e.url) || "nicht zurueck: " + e.url, e.besucht.length === 2 || "besucht " + e.besucht, e.gewaehlt === "h19" || "gewaehlt " + e.gewaehlt] },
    gezielter_vergleich: { auf: KASSE, s: [{ du: "Was ist der Unterschied beim Strand?", stand: stand(), ...DET, text: "Migjorn liegt 150 m vom Strand, Refugi 7,5 km." }],
      ok: (e) => [e.besucht.length === 2 || "besucht " + e.besucht, !/Das sind die Unterschiede/.test(e.chat) || "fester Text trotz gezielter Frage", /150 m/.test(e.chat) || "keine Antwort", /checkout/.test(e.url) || "nicht zurueck", e.umrandet >= 2 && e.umrandet <= 4 || "umrandet " + e.umrandet] },
    einzelfrage: { auf: KASSE, s: [{ du: "Hat Hotel Migjorn Beach einen Pool?", stand: stand(), ...DET, text: "Ja, es hat einen Pool." }],
      ok: (e) => [JSON.stringify(e.besucht) === '["h19"]' || "besucht " + JSON.stringify(e.besucht), /hat einen Pool/.test(e.chat) || "keine Antwort", /checkout/.test(e.url) || "nicht zurueck", e.gewaehlt === "h12" || "gewaehlt " + e.gewaehlt, e.umrandet >= 1 && e.umrandet <= 2 || "umrandet " + e.umrandet] },
    flugfenster_offen: { auf: KASSE, s: [{ tu: `Kern.lauf.flugUebernahme = "x"; cFlugWahl.click()` }, { du: "Worin unterscheiden sie sich?", stand: stand(), ...DET, text: "Aus meinem Rundgang: eins liegt am Strand." }],
      ok: (e) => [e.flugfenster || "Flugfenster zu", e.besucht.length === 0 || "weggegangen", /Aus meinem Rundgang/.test(e.chat) || "keine Antwort"] },
    uebernahme_frage: { auf: KASSE, s: [{ tu: `cFlugWahl.click()` }],
      ok: (e) => [/Soll ich den Flug für dich heraussuchen/.test(e.chat) || "fragt nicht", JSON.stringify(e.chips) === '["Ja, übernimm das","Nein, ich mache das selbst"]' || "Chips " + e.chips, e.flugfenster || "Fenster zu", e.freigabe === "suchen" || "Freigabe " + e.freigabe] },
    uebernahme_nein: { auf: KASSE, s: [{ tu: `cFlugWahl.click()` }, { du: "Nein, ich mache das selbst" }, { tu: `Fluege.schliessen(); cFlugWahl.click()` }],
      ok: (e) => [/Sag einfach Bescheid/.test(e.chat) || "keine Antwort", (e.chat.match(/Soll ich den Flug für dich/g) || []).length === 1 || "fragt zweimal", e.freigabe === "suchen" || "Freigabe " + e.freigabe, e.flugfenster || "Fenster zu"] },
    uebernahme_ja: { auf: KASSE, s: [{ tu: `cFlugWahl.click()` }, { du: "Ja, übernimm das", stand: {}, werkzeuge: { buchung_vorbereiten: {} } }],
      ok: (e) => [e.freigabe === "vorbereiten" || "Freigabe " + e.freigabe, e.ereignisse.some((x) => /kasse_uebernommen/.test(x)) || "nicht uebernommen", e.ereignisse.some((x) => /flug_frage|mietwagen/.test(x)) || /Mietwagen|Tageszeit|Koffer|Umstieg|Klasse/.test(e.chat) || "macht nicht weiter", !e.ereignisse.some((x) => /abschluss_ja|gebucht/.test(x)) || "hat abgeschlossen"] },
    uebernahme_per_submit: { auf: KASSE, s: [{ tu: `for (const x of document.querySelectorAll("[data-r]")) { x.value = "A B"; x.dispatchEvent(new Event("input", { bubbles: true })); } cAnkunft.value = "15:00"; cAnkunft.dispatchEvent(new Event("change", { bubbles: true })); gTerms.checked = true; guestForm.requestSubmit();` }],
      ok: (e) => [/Soll ich den Flug für dich heraussuchen/.test(e.chat) || "fragt nicht", e.flugfenster || "Fenster zu"] },
    auftrag_flug: { auf: KASSE, s: [{ du: "such einen flug für mich", stand: {}, werkzeuge: { buchung_vorbereiten: {} } }],
      ok: (e) => [e.freigabe === "vorbereiten" || "Freigabe " + e.freigabe, e.ereignisse.some((x) => /kasse_uebernommen/.test(x)) || "nicht uebernommen", !/erst in der Kasse/.test(e.chat) || "vertroestet"] },
    auftrag_mach_du: { auf: KASSE, s: [{ du: "mach du das", stand: {}, werkzeuge: { buchung_vorbereiten: {} } }], ok: (e) => [e.ereignisse.some((x) => /kasse_uebernommen/.test(x)) || "nicht uebernommen"] },
    kein_auftrag: { auf: KASSE, s: [{ du: "ich suche mir den flug selbst", stand: stand(), text: "Gern." }, { du: "warum ist der Flug so teuer?", stand: stand(), text: "Weil." }, { du: "ich buche das jetzt nicht", stand: stand(), text: "Okay." }],
      ok: (e) => [e.freigabe === "suchen" || "Freigabe " + e.freigabe, !e.ereignisse.some((x) => /kasse_uebernommen/.test(x)) || "faelschlich uebernommen"] },
    flug_nein_im_gespraech: { auf: KASSE, vor: { flug: false, flugAb: null }, s: [], ok: (e) => [!e.mit || "Flug angehakt"] },
    kein_link_im_chat: { auf: LISTE, s: [{ tu: `Kern.vorschlaegeMerken()` }], ok: (e) => [!/Die Vorschläge ansehen/.test(e.seite) || "Link noch da", e.leiste || "Leiste fehlt"] },
    region_dazu: { auf: LISTE, vor: { anzahlVorschlaege: null, ausstattung: [], flug: false, flugAb: null, maxPreis: null, preisEgal: true, verpflegung: "fruehstueck" }, frisch: true, s: [{ du: "Nein, das war's", stand: stand({ nachricht_art: "antwort", frage_beantwortet: "ja" }) }, { du: "Lieber mehr vergleichen", stand: stand({ nachricht_art: "antwort", frage_beantwortet: "ja" }) }, { du: "Region dazunehmen", stand: stand({ nachricht_art: "antwort", frage_beantwortet: "ja" }) }, { tu: `[...document.querySelectorAll("#agentSuggestions .chip")].find((x) => / dazu$/.test(x.textContent)).click()` }], rundgang: true,
      ok: (e) => [/passt das/.test(e.chat) || "fragt nicht nach der Anzahl", /Möchtest du davon welche in deine Auswahl aufnehmen/.test(e.chat) || "keine Regionsfrage", e.profil.zieleAuswahl?.length === 2 && ["kreta", "algarve", "sardinien", "teneriffa", "krabi", "kapstadt", "barcelona", "lissabon", "ostsee"].includes(e.profil.zieleAuswahl[1]) || "Ziele " + JSON.stringify(e.profil.zieleAuswahl), !/markiere, was ich/.test(e.chat.split("dazu\nAGENT")[1] || "") || "Sammelfrage nach dem Klick", !e.ereignisse.slice(0, e.ereignisse.indexOf("region_vor_rundgang")).includes("rundgang_start") || "Rundgang vor der Regionsfrage", (e.chat.match(/passt das/g) || []).length === 2 || "zweite Anzahlfrage fehlt: " + (e.chat.match(/passt das/g) || []).length] },
    sechs_verlangt: { auf: LISTE, vor: { anzahlVorschlaege: 6, ausstattung: [], flug: false, flugAb: null, maxPreis: null, preisEgal: true, verpflegung: "fruehstueck" }, frisch: true, s: [{ du: "Nein, das war's", stand: stand({ nachricht_art: "antwort", frage_beantwortet: "ja" }) }, { tu: `[...document.querySelectorAll("#agentSuggestions .chip")].find((x) => /zeigen$/.test(x.textContent)).click()` }], rundgang: true,
      ok: (e) => [/Preislich passen gerade \d Hotels gut zusammen/.test(e.chat) || "sagt es nicht", e.profil.anzahlVorschlaege < 6 || "bleibt 6", e.vorlage === e.profil.anzahlVorschlaege || "vorgelegt " + e.vorlage + " statt " + e.profil.anzahlVorschlaege, e.spanne <= 0.106 || "Spanne " + e.spanne, e.partnerDrin || "Partner nicht dabei", !/liegen sie allerdings auseinander/.test(e.chat) || "sagt auseinander"] },
    seite_im_auftrag: { auf: KASSE, s: [{ tu: `window.__auftrag = Kern.standFuerModell()` }], pruef: `JSON.stringify(window.__auftrag || "")`, ok: (e) => [/IST im Buchungsformular von Refugi/.test(e.pruef) || "Seite fehlt im Auftrag"] },
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
      for (const schritt of sz.s) {
        if (schritt.tu) { try { await pg.evaluate((x) => { (0, eval)(x); return true; }, schritt.tu); } catch (e) { if (!/context|navig/i.test(e.message)) haengt = "Klick: " + e.message.slice(0, 90); } }
        else { try { await pg.evaluate((t) => { Kern.eingabe(t); return true; }, schritt.du); } catch { /* Seitenwechsel */ } }
        await pg.waitForTimeout(500); if (!(await ruhe())) haengt = true; await weg();
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
      e.pruef = pruef;
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
