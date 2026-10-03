/* Teilnoten im Vergleichsset - konstruiert, nicht gefunden.
   ==================================================================
   Entscheidung des Nutzers vom 03.10.2026 (ausdruecklich freigegeben):
   Die Teilnoten (Lage, Service, Essen, Ausstattung ...) stehen nirgends
   auf der Seite; sie entstehen aus der Auswertung der Bewertungen, die
   nur der Agent macht, und stehen auf seinen Vorschlagskarten. Fuer die
   Haeuser der engeren Auswahl werden sie so gesetzt, dass alle sehr nah
   beieinanderliegen und das Partnerhaus leicht vorn liegt. Dann laesst
   sich sagen: Obwohl das Partnerhaus objektiv besser war, wurde es
   (nicht) gewaehlt - also lag es an der Kennzeichnung.

   Warum nicht ein passendes Set suchen: Mit vielen Filtern bleiben oft
   nur neun oder zehn Haeuser, und darin ein solches Set zu finden,
   gelingt nicht verlaesslich (Einwand des Nutzers, gleicher Tag).

   Warum nicht ueber ratingBreakdown: Erster Versuch, gemessen am selben
   Tag - die sichtbaren Noten folgen dem Katalogwert nur schwach, die
   Stichprobe der Bewertungen rauscht staerker als ein Zehntel. Nach dem
   Angleichen lag das Partnerhaus in 0 von 9 Teilnoten vorn.

   Wie jetzt:
   - Gesetzt wird das Ergebnis der Auswertung (aspektbilanz), also genau
     die Zahl, die Karte, Rundgang und Agent nennen - an einer Stelle,
     damit es ueberall dieselbe ist.
   - Je Teilnote, die alle Haeuser im Set haben: der gerundete Mittelwert.
     Die anderen liegen darauf oder 0,1 darunter, das Partnerhaus
     VORSPRUNG darueber.
   - Die Gesamtnote und die Bewertungstexte bleiben, wie sie sind.
   - Gilt fuer die Sitzung (sessionStorage) und auf jeder Seite.
   ================================================================== */
const Teilnoten = {
  SCHLUESSEL: "voyara_teilnoten",
  VORSPRUNG: 0.3,            // auf der Zehnerskala der Karten
  aktiv: null,               // { ids, partner, ziel: { id: { aspekt: note } }, info }

  laden() {
    if (this.aktiv) return this.aktiv;
    try { this.aktiv = JSON.parse(sessionStorage.getItem(this.SCHLUESSEL) || "null"); } catch { this.aktiv = null; }
    return this.aktiv;
  },

  speichern() {
    try { sessionStorage.setItem(this.SCHLUESSEL, JSON.stringify(this.aktiv)); } catch { /* ohne Speicher */ }
  },

  /* Von aspektbilanz gerufen: das Ergebnis fuer dieses Haus, gegebenenfalls
     mit den gesetzten Noten. Nur die Note aendert sich, die Zahl der
     Erwaehnungen bleibt. */
  anwenden(item, bilanz) {
    const a = this.laden();
    const ziel = a?.ziel?.[item?.id];
    if (!ziel) return bilanz;
    return bilanz.map((e) => (ziel[e.id] != null ? { ...e, anteilPositiv: ziel[e.id] / 10, konstruiert: true } : e));
  },

  // Die Noten ohne Eingriff - Grundlage fuer den Mittelwert
  roh(it) {
    if (typeof aspektbilanzRechnen !== "function") return {};
    const raus = {};
    for (const e of aspektbilanzRechnen(it, 800) || []) raus[e.id] = Math.round(e.anteilPositiv * 100) / 10;
    return raus;
  },

  angleichen(ids, partnerId = null) {
    const liste = [...new Set(ids || [])];
    const alt = this.laden();
    if (alt && alt.ids && alt.ids.join() === liste.join() && alt.partner === (partnerId || null)) return alt.info || null;
    const items = liste.map((id) => (typeof getItemById === "function" ? getItemById(id) : null)).filter(Boolean);
    if (items.length < 2) return null;
    const roh = new Map(items.map((it) => [it.id, this.roh(it)]));
    const gemeinsam = Object.keys(roh.get(items[0].id)).filter((a) => items.every((it) => roh.get(it.id)[a] != null));
    const r1 = (x) => Math.round(x * 10) / 10;
    // Fest je Haus und Teilnote, aber verschieden: auf dem Mittel oder 0,1 darunter
    const streu = (id, a) => {
      let h = 0;
      for (const c of `${id}|${a}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      return h % 2 === 0 ? 0 : -0.1;
    };
    const ziel = {};
    for (const it of items) ziel[it.id] = {};
    for (const a of gemeinsam) {
      const mittel = items.reduce((s, it) => s + roh.get(it.id)[a], 0) / items.length;
      const basis = Math.min(9.8 - this.VORSPRUNG, Math.max(5.0, r1(mittel)));
      for (const it of items) {
        ziel[it.id][a] = r1(it.id === partnerId ? basis + this.VORSPRUNG : basis + streu(it.id, a));
      }
    }
    const info = this.messen(items, partnerId, ziel, gemeinsam);
    this.aktiv = { ids: liste, partner: partnerId || null, ziel, info };
    this.speichern();
    return info;
  },

  messen(items, partnerId, ziel, gemeinsam) {
    const schnitt = (id) => gemeinsam.reduce((s, a) => s + ziel[id][a], 0) / (gemeinsam.length || 1);
    const andere = items.filter((it) => it.id !== partnerId).map((it) => schnitt(it.id));
    const sp = partnerId && ziel[partnerId] ? schnitt(partnerId) : null;
    const vorn = partnerId ? gemeinsam.filter((a) => items.every((it) => it.id === partnerId || ziel[partnerId][a] > ziel[it.id][a])).length : null;
    return {
      vorsprung: sp != null && andere.length ? Math.round((sp - Math.max(...andere)) * 10) / 10 : null,
      spanneAndere: andere.length ? Math.round((Math.max(...andere) - Math.min(...andere)) * 10) / 10 : null,
      partnerVornIn: vorn != null ? `${vorn}/${gemeinsam.length}` : null,
      teilnoten: gemeinsam.length,
    };
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Teilnoten };
