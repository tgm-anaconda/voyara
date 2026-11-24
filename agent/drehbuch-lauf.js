/* Drehbuch-Lauf (22.11.2026) - der ganze Agent ohne Modell.
   ------------------------------------------------------------------
   Ben: "Teste den Kern einmal ohne das Modell - die klassischen Antworten
   des Modells und die klassischen Chats reproduzieren." Das Drehbuch
   ersetzt nur Modell.agent (Testweiche in modell.js), alles andere laeuft
   echt: Kern, Fahrplan, Zusammensetzen der Nachrichten, Suche, Seite.

   Aufruf mit Playwright (browser_run_code_unsafe, filename): Die Datei
   exportiert eine Funktion (page) => Ergebnis. Kostet nichts - es wird
   kein Modell gerufen. Die Antworten je Nachricht stehen unten in
   DREHBUECHER: `stand` sind die Argumente fuer stand_merken (so, wie das
   Modell sie in den echten Laeufen geschickt hat), `werkzeuge` weitere
   Aufrufe, `text` ein Text des Modells; ohne `text` nimmt das Drehbuch
   den Fragesatz, den der Kern vorschlaegt ("So wuerde der Chat sie
   stellen"), also ein folgsames Modell. */
async (page) => {
  const BASIS = (globalThis.__drehbuchBasis || "http://localhost:8777/");
  const DREHBUECHER = {
    reformationstag_wie_live: [
      { du: "hi fliegt ihr auch über feiertage?", stand: { nachricht_art: "frage", frage_beantwortet: "keine_frage_offen" },
        text: "Ja, es wird täglich geflogen, auch an Feiertagen wie Ostern, Pfingsten oder Weihnachten. Wann soll es denn ungefähr losgehen?" },
      { du: "ich würde gerne am reformationstag fliegen", stand: { frage_beantwortet: "ja", von: "2026-10-31", monat: 10 } },
      { du: "9", stand: { frage_beantwortet: "ja", naechte: 9 } },
      { du: "ich und eine freundin", stand: { frage_beantwortet: "ja", personenGesamt: 2, erwachsene: 2, kinder: 0 } },
      { du: "meine freundin ist 17", stand: { kinder: 1, kinderAlter: [17] } },
      { du: "ich will gerne in ein Hotel auf Malle oder nach Asien", stand: { artEgal: true, zieleAuswahl: ["mallorca", "krabi"] }, werkzeuge: { suchen: { ziel: "mallorca" } } },
      { du: "Mit Flug", stand: { frage_beantwortet: "ja", flug: true } },
      { du: "Ich wohne in Bullenhausen welcher ist da der nächste?", stand: { nachricht_art: "frage", frage_beantwortet: "keine_frage_offen" },
        text: "Aus allgemeinem Wissen, nicht von der Seite: Von Bullenhausen ist Hamburg der nächste Flughafen. Soll ich Hamburg als Abflughafen nehmen?" },
      { du: "ja gerne", stand: { frage_beantwortet: "ja", flugAb: "Hamburg" } },
      { du: "All Inclusive", stand: { frage_beantwortet: "ja", verpflegung: "ai", verpflegungEgal: false } },
      { du: "gerne 210 euro", stand: { frage_beantwortet: "ja" } },
      { du: "Für alle zusammen", stand: { frage_beantwortet: "ja", maxPreis: 210 } },
      { du: "Bis 330 €", stand: { maxPreis: 330 } },
    ],
    reformationstag_mit_belegen: [
      { du: "hi fliegt ihr auch über feiertage?", stand: { nachricht_art: "frage", frage_beantwortet: "keine_frage_offen" },
        text: "Ja, es wird täglich geflogen, auch an Feiertagen wie Ostern, Pfingsten oder Weihnachten. Wann soll es denn ungefähr losgehen?" },
      { du: "ich würde gerne am reformationstag fliegen", stand: { frage_beantwortet: "ja", monat: 10, anreise: "2027-10-31", belege: { monat: "am reformationstag", anreise: "am reformationstag" } } },
      { du: "9", stand: { frage_beantwortet: "ja", naechte: 9 } },
      { du: "ich und eine freundin", stand: { frage_beantwortet: "ja", personenGesamt: 2, erwachsene: 2, kinder: 0, belege: { personenGesamt: "ich und eine freundin", erwachsene: "ich und eine freundin", kinder: "ich und eine freundin" } } },
      { du: "meine freundin ist 17", stand: { erwachsene: 1, kinder: 1, kinderAlter: [17], belege: { erwachsene: "meine freundin ist 17", kinder: "meine freundin ist 17", kinderAlter: "meine freundin ist 17" } } },
      { du: "ich will gerne in ein Hotel auf Malle oder nach Asien", stand: { frage_beantwortet: "ja", typ: "hotel", zieleAuswahl: ["mallorca", "krabi", "kyoto"], belege: { typ: "in ein Hotel", zieleAuswahl: "auf Malle oder nach Asien" } } },
      { du: "Mit Flug", stand: { frage_beantwortet: "ja", flug: true } },
      { du: "Ich wohne in Bullenhausen welcher ist da der nächste?", stand: { nachricht_art: "frage", frage_beantwortet: "keine_frage_offen" },
        text: "Aus allgemeinem Wissen, nicht von der Seite: Von Bullenhausen ist Hamburg der nächste Flughafen. Soll ich Hamburg als Abflughafen nehmen?" },
      { du: "ja gerne", stand: { frage_beantwortet: "ja", flugAb: "Hamburg" } },
      { du: "All Inclusive", stand: { frage_beantwortet: "ja", verpflegung: "ai", verpflegungEgal: false } },
      { du: "gerne 210 euro", stand: { frage_beantwortet: "ja" } },
      { du: "Für alle zusammen", stand: { frage_beantwortet: "ja", maxPreis: 210 } },
      { du: "Bis 330 €", stand: { maxPreis: 330 } },
    ],
    ostern_malle_wie_live: [
      { du: "hi wie gehts?", stand: { nachricht_art: "sonstiges", frage_beantwortet: "keine_frage_offen" }, text: "Mir geht's gut, danke der Nachfrage. Wann möchtest du denn ungefähr verreisen?" },
      { du: "ich würde gerne über Ostern weg fliegen, geht das?", stand: { nachricht_art: "frage", frage_beantwortet: "ja" },
        text: "Ja, Flüge gibt es auch an Feiertagen wie Ostern. Weißt du schon einen genauen Anreisetag?" },
      { du: "Karfreitag, 26. März", stand: { frage_beantwortet: "ja", anreise: "2027-03-26" } },
      { du: "Ich will gerne 9 nächte nach malle oder aufs spanische festland", stand: { frage_beantwortet: "ja", naechte: 9, zieleAus: ["mallorca", "barcelona"] } },
      { du: "3", stand: { frage_beantwortet: "teilweise", personenGesamt: 3 } },
      { du: "ich und zwei freunde", stand: { frage_beantwortet: "ja", erwachsene: 3, kinder: 0 } },
      { du: "Beides zeigen", stand: { frage_beantwortet: "ja", artEgal: true } },
      { du: "Mit Flug", stand: { frage_beantwortet: "ja", flug: true } },
      { du: "Hamburg", stand: { frage_beantwortet: "ja", flugAb: "Hamburg" } },
      { du: "Halbpension", stand: { frage_beantwortet: "ja", verpflegung: "halb", verpflegungEgal: false } },
      { du: "Nur Hotels", stand: { frage_beantwortet: "ja", typ: "hotel", artEgal: false } },
      { du: "Feste Grenze", stand: { frage_beantwortet: "teilweise", preisEgal: false } },
      { du: "40 euro", stand: { frage_beantwortet: "ja" } },
      { du: "Für alle zusammen", stand: { frage_beantwortet: "ja", maxPreis: 40 } },
    ],
    // Bens Lauf vom 24.11.2026 mit genau den Werten, die das Modell geschickt hat
    ostern_hoffenheim_wie_live: [
      { du: "Hi wie gehts?", stand: { nachricht_art: "sonstiges", frage_beantwortet: "nein" }, text: "Hallo, mir geht es gut, danke der Nachfrage. Wann möchtest du denn ungefähr deine Reise starten?" },
      { du: "gerne einen tag nach ostern los fliegen", stand: { monatUeberlassen: false, frage_beantwortet: "ja" } },
      { du: "67", stand: { frage_beantwortet: "ja", naechte: 67 } },
      { du: "sorry ja ich habe mich vertippt ich meine 7", stand: { frage_beantwortet: "ja", naechte: 7 } },
      { du: "ich und meine zwei mädels", stand: { frage_beantwortet: "ja", personenGesamt: 3, erwachsene: 1, kinder: 2 } },
      { du: "19 und 17", stand: { frage_beantwortet: "ja", kinderAlter: [19, 17] } },
      { du: "Beides zeigen", stand: { frage_beantwortet: "ja", typ: "hotel", artEgal: true }, werkzeuge: { suchen: { ziel: "mallorca" } } },
      { du: "Eher kalt", stand: { frage_beantwortet: "ja", richtung: "kalt" } },
      { du: "lieber auf 6 grad gehen", stand: { frage_beantwortet: "ja", mindestGrad: 6 } },
      { du: "ich würde malle aber noch gerne dazunehmen", stand: { frage_beantwortet: "teilweise", zieleAuswahl: ["mallorca"] } },
      { du: "Mit Flug", stand: { frage_beantwortet: "ja", flug: true } },
      { du: "Gerne von meiner Heimat der nächste", stand: { frage_beantwortet: "nein_klaert_noch" }, text: "Ich verstehe, du möchtest vom nächstgelegenen Flughafen starten. Kannst du mir sagen, in welcher Stadt oder Region du ungefähr wohnst?" },
      { du: "Ich wohne in Hoffenheim", stand: { frage_beantwortet: "ja" }, text: "Aus allgemeinem Wissen, nicht von der Seite: Von Hoffenheim ist Frankfurt am nächsten. Soll ich Frankfurt als Abflughafen nehmen?" },
      { du: "lieber ab Düsseldorf", stand: { frage_beantwortet: "ja", flugAb: "Duesseldorf" } },
      { du: "Halbpension", stand: { frage_beantwortet: "ja", verpflegung: "ai" } },
      { du: "Nur Hotels", stand: { frage_beantwortet: "ja", typ: "hotel", artEgal: true } },
    ],
    region_vergleich: [
      { du: "im Oktober", stand: { frage_beantwortet: "ja", monat: 10 } },
      { du: "flexibel", stand: { frage_beantwortet: "ja" } },
      { du: "9", stand: { frage_beantwortet: "ja", naechte: 9 } },
      { du: "ich und eine freundin", stand: { frage_beantwortet: "ja", personenGesamt: 2, erwachsene: 2, kinder: 0 } },
      { du: "ein Hotel auf Malle", stand: { frage_beantwortet: "ja", typ: "hotel", ziel: "mallorca" } },
      { du: "Mit Flug", stand: { frage_beantwortet: "ja", flug: true } },
      { du: "Hamburg", stand: { frage_beantwortet: "ja", flugAb: "Hamburg" } },
      { du: "All Inclusive", stand: { frage_beantwortet: "ja", verpflegung: "ai", verpflegungEgal: false } },
      { du: "210 euro pro nacht für uns beide", stand: { frage_beantwortet: "ja", maxPreis: 210 } },
      { du: "Bei 210 € bleiben", stand: { frage_beantwortet: "ja" } },
      { du: "was für regionen empfiehlst du mir denn noch?", stand: { nachricht_art: "frage", frage_beantwortet: "nein_klaert_noch", ausweiten: "ziel" } },
      { du: "Krabi dazu", stand: { frage_beantwortet: "ja" } },
    ],
    kapstadt_9grad_wie_live: [
      { du: "Im März", stand: { frage_beantwortet: "ja", monat: 3 } },
      { du: "9 Nächte", stand: { frage_beantwortet: "ja", naechte: 9 } },
      { du: "wir sind 3 erwachsene", stand: { frage_beantwortet: "ja", erwachsene: 3, kinder: 0 } },
      { du: "Beides zeigen", stand: { frage_beantwortet: "ja", artEgal: true } },
      { du: "Eher kalt", stand: { frage_beantwortet: "ja", richtung: "kalt" } },
      { du: "ich würde gerne sogar auf 9 grad gehen aber trotzdem kappstadt ergänzen",
        stand: { frage_beantwortet: "ja", richtung: "kalt", zieleAuswahl: ["lappland", "island", "ostsee", "tirol", "newyork", "wien", "kapstadt"] },
        text: "Kapstadt habe ich ergänzt, das passt dann zu den kälteren Zielen. Soll ein Flug dazu, oder nur die Unterkunft?" },
      { du: "Mit Flug", stand: { frage_beantwortet: "ja", flug: true } },
    ],
  };
  const nur = globalThis.__drehbuchNur || Object.keys(DREHBUECHER).filter((n) => n !== "region_vergleich");
  const arm = globalThis.__drehbuchArm || "schublade";

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
  await page.context().addInitScript(initDrehbuch);

  const warteRuhe = async () => {
    let ruhig = 0;
    for (let i = 0; i < 400; i++) {
      await page.waitForTimeout(250);
      let still = false;
      try { still = await page.evaluate(() => typeof Kern !== "undefined" && !Kern.laeuft && !Kern.lauf?.ausstehend && document.readyState === "complete"); } catch { still = false; }
      ruhig = still ? ruhig + 1 : 0;
      if (ruhig >= 6) return true;
    }
    return false;
  };

  const ergebnisse = {};
  for (const name of nur) {
    const skript = DREHBUECHER[name];
    await page.goto(BASIS + "index.html?zugang=" + arm + "&t=" + Date.now());
    await page.evaluate((s) => { sessionStorage.clear(); localStorage.clear(); localStorage.setItem("__drehbuchSkript", JSON.stringify(s)); }, skript);
    await page.goto(BASIS + "index.html?zugang=" + arm + "&t2=" + Date.now());
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.querySelector(".einstieg")?.remove());
    await warteRuhe();
    for (const schritt of skript) {
      try { await page.evaluate((t) => { Kern.eingabe(t); return true; }, schritt.du); } catch { /* Seitenwechsel */ }
      await page.waitForTimeout(400);
      await warteRuhe();
      try { await page.evaluate(() => document.querySelector(".einstieg")?.remove()); } catch { /* egal */ }
    }
    ergebnisse[name] = await page.evaluate(() => ({
      chat: (Kern.lauf.verlauf || []).map((n) => `${n.rolle === "user" ? "DU" : "AGENT"}: ${String(n.text || "").replace(/\s+/g, " ")}`),
      profil: (({ monat, anreise, naechte, erwachsene, kinder, kinderAlter, personen, typ, artEgal, zielId, zieleAuswahl, zieleAus, flug, flugAb, verpflegung, maxPreis, richtung, mindestGrad }) =>
        ({ monat, anreise, naechte, erwachsene, kinder, kinderAlter, personen, typ, artEgal, zielId, zieleAuswahl, zieleAus, flug, flugAb, verpflegung, maxPreis, richtung, mindestGrad }))(Kern.lauf.profil || {}),
      ereignisse: (Kern.lauf.protokoll || []).map((e) => e.ereignis).filter((e) => /verworfen|beleg|nicht_verstanden|engstelle_rueckfrage|preis_warnung|region_nur_kern|ziel_|erwachsener_wird_kind|anreise_aus|budget_rueckfrage/.test(e)),
    }));
  }
  await page.evaluate(() => { try { localStorage.removeItem("__drehbuchSkript"); } catch { /* egal */ } });
  return ergebnisse;
}
