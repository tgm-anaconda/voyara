// Was der Agent tut - und zwar bei jeder teilnehmenden Person gleich.
//
// Warum das hier steht und nicht im Modell:
// Liesse man GPT frei entscheiden, bekaeme man bei zwanzig Teilnehmenden
// zwanzig unterschiedlich gute Agenten. Einer filtert klug, der naechste
// vergisst die Personenzahl. Die Studie wuerde dann die Streuung des Modells
// messen statt den Effekt des Agenten. Deshalb die Zweiteilung:
//
//   Das Modell versteht und formuliert.   -> spaeter api/agent.js
//   Diese Datei entscheidet.              -> feste Regeln
//
// Solange die Modellanbindung fehlt, uebernimmt `absicht()` auch das
// Verstehen - schluesselwortbasiert. Diese Funktion wird spaeter ersetzt,
// die Regeln darunter bleiben unveraendert.

const Politik = {
  /* ==================================================================
     Verstehen (vorlaeufig ohne Modell)
     ================================================================== */

  MONATE: {
    januar: 1, februar: 2, "märz": 3, maerz: 3, april: 4, mai: 5, juni: 6,
    juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12,
  },

  absicht(text) {
    const t = text.toLowerCase();
    const a = {
      typ: /ferienwohnung|apartment|wohnung|ferienhaus|hütte|huette|chalet/.test(t) ? "apartment" : "hotel",
      zielId: null,
      erwachsene: null,
      kinder: null,
      monat: null,
      budget: null,        // niedrig | hoch
      kriterien: this.kriterienAusText(text),
    };

    // Reiseziel ueber die Namen aus data/ziele.js. Laengster Name zuerst:
    // "Suedtirol" enthaelt "Tirol", und in der Katalogreihenfolge gewaenne
    // sonst das kuerzere Ziel.
    if (typeof ZIELE !== "undefined") {
      const nachLaenge = [...ZIELE].sort((x, y) => y.name.length - x.name.length);
      for (const z of nachLaenge) {
        if (t.includes(z.name.toLowerCase())) { a.zielId = z.id; break; }
      }
      if (!a.zielId) {
        for (const z of nachLaenge) {
          if (t.includes(z.land.toLowerCase())) { a.zielId = z.id; break; }
        }
      }
    }

    const personen = t.match(/(\d+)\s*(personen|erwachsene|leute)/);
    if (personen) a.erwachsene = Math.min(6, +personen[1]);
    else if (/zu zweit|für zwei|fuer zwei/.test(t)) a.erwachsene = 2;
    else if (/zu viert|für vier|fuer vier/.test(t)) a.erwachsene = 4;

    const kinder = t.match(/(\d+)\s*kind/);
    if (kinder) a.kinder = Math.min(4, +kinder[1]);

    for (const [name, nr] of Object.entries(this.MONATE)) {
      if (t.includes(name)) { a.monat = nr; break; }
    }

    if (/günstig|guenstig|billig|preiswert|wenig geld|sparen|schmales budget/.test(t)) a.budget = "niedrig";
    if (/luxus|gehoben|erstklassig|5 sterne|fünf sterne|fuenf sterne/.test(t)) a.budget = "hoch";

    const summe = t.match(/(?:max(?:imal)?|bis(?: zu)?|unter|höchstens|hoechstens)\s*(\d{2,4})\s*(?:€|euro)?/);
    if (summe) a.maxPreis = +summe[1];

    return a;
  },

  /* ==================================================================
     Eigene Kriterien der teilnehmenden Person
     ------------------------------------------------------------------
     Der Punkt, an dem sich ein Agent von einer Suchmaske unterscheidet:
     "Sauberkeit ist mir sehr wichtig" ist kein Filter, den die Seite
     kennt. Er laesst sich aber gegen die Aspektbilanz aus
     data/bewertungen.js rechnen - und genau das soll der Agent tun.

     Jedes Kriterium weiss, ob es sich als harter Filter niederschlaegt
     (`filter`) oder nur als Gewicht in der Reihenfolge (`aspekt`).
     ================================================================== */

  KRITERIEN: [
    { id: "sauberkeit", label: "Sauberkeit", aspekt: "sauberkeit", note: "sauberkeit",
      woerter: ["sauber", "sauberkeit", "hygiene", "gepflegt", "schmutz", "dreck"] },
    { id: "ruhe", label: "Ruhe", aspekt: "ruhe",
      woerter: ["ruhig", "ruhe", "leise", "still", "nicht laut", "keine party", "erholung"] },
    { id: "essen", label: "Essen", aspekt: "essen", note: "essen",
      woerter: ["essen", "küche", "kueche", "frühstück", "fruehstueck", "buffet", "kulinar", "restaurant"] },
    { id: "lage", label: "Lage", aspekt: "lage", note: "lage",
      woerter: ["lage", "zentral", "kurze wege", "fußläufig", "fusslaeufig", "erreichbar", "mittendrin"] },
    { id: "service", label: "Service", aspekt: "service", note: "service",
      woerter: ["service", "personal", "freundlich", "betreuung", "gastgeber"] },
    { id: "preis", label: "Preis-Leistung", aspekt: "preis", note: "preis",
      woerter: ["preis", "preis-leistung", "günstig", "guenstig", "billig", "sparen", "budget"] },
    { id: "pool", label: "Pool", aspekt: "pool", filter: { ausstattung: "pool" },
      woerter: ["pool", "schwimmbad", "schwimmen", "planschen"] },
    { id: "wellness", label: "Wellness", filter: { ausstattung: "spa" },
      woerter: ["wellness", "spa", "sauna", "therme", "massage", "hot pot", "dampfbad"] },
    { id: "familie", label: "Familienfreundlichkeit", filter: { ausstattung: "familyFriendly" },
      woerter: ["famili", "kinderfreundlich", "mit kindern", "kinderbetreuung", "kinderclub"] },
    { id: "strandnah", label: "Strandnähe", filter: { maxStrand: 1 },
      woerter: ["strand", "am meer", "meernah", "ans wasser", "direkt am wasser", "küste", "kueste"] },
    { id: "bewertung", label: "gute Bewertungen", filter: { mindestbewertung: 4.5 },
      woerter: ["gut bewertet", "beste bewertung", "hohe bewertung", "top bewertet"] },
  ],

  // Erkennt genannte Kriterien und wie stark sie betont wurden. "sehr wichtig"
  // wiegt schwerer als eine beilaeufige Erwaehnung - sonst waere jede Nennung
  // gleich viel wert und die Reihenfolge kaum zu beeinflussen.
  kriterienAusText(text) {
    const t = " " + text.toLowerCase() + " ";
    const betont = /(sehr wichtig|besonders wichtig|am wichtigsten|lege .{0,12}wert|absolut|unbedingt|muss)/.test(t);
    const gefunden = [];
    for (const k of this.KRITERIEN) {
      if (!k.woerter.some((w) => t.includes(w))) continue;
      // Verneinungen aussortieren: "kein Pool noetig" ist kein Wunsch
      const stelle = t.indexOf(k.woerter.find((w) => t.includes(w)));
      const umfeld = t.slice(Math.max(0, stelle - 26), stelle);
      if (/(kein|keine|ohne|nicht|egal|brauch(en|e) (wir |ich )?nicht)\s*$/.test(umfeld)) continue;
      gefunden.push({ id: k.id, gewicht: betont ? 2 : 1 });
    }
    return gefunden;
  },

  kriterium(id) {
    return this.KRITERIEN.find((k) => k.id === id) || null;
  },

  // Kriterien in Filter uebersetzen, soweit die Seite sie kennt
  filterAusKriterien(kriterien) {
    const filter = { ausstattung: [] };
    for (const { id } of kriterien) {
      const k = this.kriterium(id);
      if (!k?.filter) continue;
      if (k.filter.ausstattung) filter.ausstattung.push(k.filter.ausstattung);
      if (k.filter.maxStrand) filter.maxStrand = k.filter.maxStrand;
      if (k.filter.mindestbewertung) filter.mindestbewertung = k.filter.mindestbewertung;
    }
    if (!filter.ausstattung.length) delete filter.ausstattung;
    return filter;
  },

  /* ==================================================================
     Kandidaten bewerten
     ------------------------------------------------------------------
     Die Reihenfolge der Trefferliste kennt nur Preis und Gesamtnote.
     Der Agent rechnet zusaetzlich die genannten Kriterien gegen die
     Aspektbilanz - das ist sein eigentlicher Beitrag.
     ================================================================== */

  bewerten(treffer, profil) {
    const kriterien = profil.kriterien || [];
    const bewertet = treffer.map((t) => {
      const item = typeof getItemById === "function" ? getItemById(t.id) : null;
      if (!item) return null;

      let punkte = (item.rating - 4) * 2;          // Grundlage: Gesamtnote
      const belege = [];

      for (const { id, gewicht } of kriterien) {
        const k = this.kriterium(id);
        if (!k) continue;

        // Aspektbilanz: was steht in den Bewertungen dazu?
        if (k.aspekt && typeof aspektbilanz === "function") {
          const eintrag = (aspektbilanz(item, 400) || []).find((a) => a.id === k.aspekt);
          if (eintrag && eintrag.erwaehnungen >= 12) {
            punkte += (eintrag.anteilPositiv - 0.75) * 8 * gewicht;
            belege.push({
              kriterium: k.label,
              anteil: eintrag.anteilPositiv,
              erwaehnungen: eintrag.erwaehnungen,
              gewicht,
            });
            continue;
          }
        }
        // Kein Aspekt oder zu duenne Datenlage: Teilnote, sonst Ausstattung
        if (k.note && item.ratingBreakdown?.[k.note] != null) {
          punkte += (item.ratingBreakdown[k.note] - 4.3) * 2 * gewicht;
        } else if (k.filter?.ausstattung && (item.amenities || []).includes(k.filter.ausstattung)) {
          punkte += 1.2 * gewicht;
        }
      }

      // Preis zaehlt mit, aber nur als Ausschlag - sonst gewinnt immer das
      // billigste Haus, und der Agent waere wieder eine Sortierung
      const preis = t.preis ?? item.pricePerNight;
      if (profil.maxPreis) punkte += preis <= profil.maxPreis ? 0.6 : -2.5;
      if (profil.budget === "niedrig") punkte += (160 - preis) / 90;

      return { ...t, item, punkte, belege, preis };
    }).filter(Boolean);

    return bewertet.sort((a, b) => b.punkte - a.punkte);
  },

  /* Ein Satz je Vorschlag: was spricht dafuer, wo hakt es.
     Die Zahlen kommen aus den Daten, nicht aus dem Modell - erfundene
     Prozentwerte waeren in einer Studie fatal. */
  vorschlagssatz(k, profil) {
    const teile = [];
    const note = k.item.rating.toFixed(1).replace(".", ",");
    teile.push(`${k.item.name} in ${k.item.location}, ${k.preis} € pro Nacht, ${note} aus ${k.item.reviewCount} Bewertungen.`);

    // Das genannte Kriterium zuerst - sonst haette die Nachfrage keinen Effekt
    const stark = k.belege.filter((b) => b.anteil >= 0.8).sort((a, b) => b.gewicht - a.gewicht)[0];
    const schwach = k.belege.filter((b) => b.anteil < 0.7).sort((a, b) => a.anteil - b.anteil)[0];

    if (stark) {
      teile.push(`${stark.kriterium} hattest du genannt: ${Math.round(stark.anteil * 100)} Prozent der ${stark.erwaehnungen} Erwähnungen sind positiv.`);
    }

    // Jeder Vorschlag braucht mindestens einen Grund, warum er ueberhaupt
    // vorgeschlagen wird. Stand hier nur Kritik, las sich die Empfehlung wie
    // eine Warnung.
    const kurz = typeof aspektKurzfassung === "function" ? aspektKurzfassung(k.item) : null;
    if (!stark) {
      if (kurz?.staerken?.length) {
        const s = kurz.staerken.slice(0, 2);
        teile.push(`Gelobt ${s.length > 1 ? "werden" : "wird"} vor allem ${this.aufzaehlen(s)}.`);
      } else {
        // Auch ohne ausgewiesene Staerke gibt es den bestbewerteten Aspekt
        const beste = (kurz?.bilanz || []).slice().sort((a, b) => b.anteilPositiv - a.anteilPositiv)[0];
        if (beste) teile.push(`Am besten weg kommt ${beste.label}: ${Math.round(beste.anteilPositiv * 100)} Prozent positiv.`);
      }
    }

    if (schwach) {
      teile.push(`Beim Thema ${schwach.kriterium} ist es dünner: nur ${Math.round(schwach.anteil * 100)} Prozent positiv.`);
    } else if (kurz?.schwaechen?.length) {
      teile.push(`Kritik gibt es bei ${kurz.schwaechen[0]}.`);
    }
    return teile.join(" ");
  },

  aufzaehlen(liste) {
    if (!liste || !liste.length) return "";
    if (liste.length === 1) return liste[0];
    return `${liste.slice(0, -1).join(", ")} und ${liste[liste.length - 1]}`;
  },

  /* ==================================================================
     Nachschaerfen
     ------------------------------------------------------------------
     "Etwas ruhiger" oder "guenstiger" soll die Liste veraendern, ohne
     dass das Gespraech von vorn beginnt.
     ================================================================== */

  nachschaerfung(text, profil) {
    const t = text.toLowerCase();
    const neu = { ...profil, kriterien: [...(profil.kriterien || [])] };
    const gemacht = [];

    if (/günstiger|guenstiger|billiger|zu teuer|weniger kosten/.test(t)) {
      neu.maxPreis = Math.round((neu.letzterPreisschnitt || 200) * 0.8);
      neu.budget = "niedrig";
      gemacht.push(`höchstens ${neu.maxPreis} €`);
    }
    if (/teurer|gehobener|mehr komfort|lieber besser/.test(t)) {
      neu.budget = "hoch";
      delete neu.maxPreis;
      gemacht.push("eine Stufe gehobener");
    }
    if (/näher am strand|naeher am strand|dichter ans meer|direkt am meer/.test(t)) {
      neu.maxStrand = 0.5;
      gemacht.push("höchstens 500 Meter zum Strand");
    }

    // Genannte Kriterien uebernehmen oder verstaerken
    for (const { id, gewicht } of this.kriterienAusText(text)) {
      const vorhanden = neu.kriterien.find((k) => k.id === id);
      if (vorhanden) vorhanden.gewicht = Math.min(3, vorhanden.gewicht + gewicht);
      else neu.kriterien.push({ id, gewicht: gewicht + 1 });
      gemacht.push(this.kriterium(id)?.label || id);
    }

    return { profil: neu, gemacht: [...new Set(gemacht)] };
  },

  // Erkennt, ob sich eine Antwort auf einen Vorschlag der Shortlist bezieht
  auswahlAusText(text, kandidaten) {
    const t = text.toLowerCase().trim();
    const zahl = t.match(/^(?:die |der |das |nummer |nr\.? ?)?(1|2|3|eins|zwei|drei|erste|zweite|dritte)\b/);
    if (zahl) {
      const karte = { "1": 0, eins: 0, erste: 0, "2": 1, zwei: 1, zweite: 1, "3": 2, drei: 2, dritte: 2 };
      const i = karte[zahl[1]];
      if (kandidaten[i]) return kandidaten[i].id;
    }
    for (const k of kandidaten) {
      const name = (k.item?.name || k.name || "").toLowerCase();
      if (name && t.includes(name.split(" ")[0].toLowerCase()) && name.split(" ")[0].length > 3) return k.id;
    }
    return null;
  },

  /* ==================================================================
     Vorfragen
     ------------------------------------------------------------------
     Einzeln gestellt, nicht als Formular. Eine Frage faellt aus, wenn
     die Antwort schon im Auftrag stand - sonst fragt der Agent nach
     Dingen, die gerade gesagt wurden, und wirkt begriffsstutzig.
     ================================================================== */

  VORFRAGEN: [
    {
      id: "zeitraum",
      frage: "Wann soll es losgehen? Ein Monat reicht mir.",
      chips: ["Im Juni", "Im September", "Im Januar", "Ist noch offen"],
      ueberspringen: (p) => p.monat != null,
      auswerten(text, p) {
        const t = text.toLowerCase();
        for (const [name, nr] of Object.entries(Politik.MONATE)) if (t.includes(name)) { p.monat = nr; return `${name.charAt(0).toUpperCase() + name.slice(1)}, notiert.`; }
        return "Gut, dann lasse ich den Zeitraum so stehen.";
      },
    },
    {
      id: "gruppe",
      frage: "Wer reist mit?",
      chips: ["Zu zweit", "Familie mit zwei Kindern", "Allein", "Zu viert"],
      ueberspringen: (p) => p.erwachsene != null,
      auswerten(text, p) {
        const t = text.toLowerCase();
        const erw = t.match(/(\d+)\s*(erwachsen|person|leute)/);
        const kin = t.match(/(\d+)\s*kind/);
        if (erw) p.erwachsene = Math.min(6, +erw[1]);
        else if (/allein|solo|nur ich/.test(t)) p.erwachsene = 1;
        else if (/zu zweit|paar|zwei/.test(t)) p.erwachsene = 2;
        else if (/zu viert|vier/.test(t)) p.erwachsene = 4;
        else if (/famili/.test(t)) p.erwachsene = 2;
        if (kin) p.kinder = Math.min(4, +kin[1]);
        else if (/famili|kinder/.test(t) && p.kinder == null) p.kinder = 2;
        if (/famili|kind/.test(t) && !(p.kriterien || []).some((k) => k.id === "familie")) {
          (p.kriterien ||= []).push({ id: "familie", gewicht: 1 });
        }
        const wer = [p.erwachsene ? `${p.erwachsene} Erwachsene` : null, p.kinder ? `${p.kinder} Kinder` : null].filter(Boolean);
        return wer.length ? `${Politik.aufzaehlen(wer)}, notiert.` : "Alles klar.";
      },
    },
    {
      id: "budget",
      frage: "Gibt es eine Obergrenze pro Nacht?",
      chips: ["Bis 120 €", "Bis 180 €", "Bis 300 €", "Spielt keine Rolle"],
      ueberspringen: (p) => p.maxPreis != null,
      auswerten(text, p) {
        const t = text.toLowerCase();
        const zahl = t.match(/(\d{2,4})/);
        if (zahl && !/keine rolle|egal|offen/.test(t)) { p.maxPreis = +zahl[1]; return `Höchstens ${p.maxPreis} € pro Nacht.`; }
        if (/günstig|guenstig|billig|wenig/.test(t)) { p.budget = "niedrig"; return "Ich halte den Preis im Blick."; }
        return "Gut, dann ist der Preis nicht das erste Kriterium.";
      },
    },
    {
      id: "eigenes",
      // Die offene Frage. Sie ist der Grund fuer die ganze Vorfragenrunde:
      // hier bringt die teilnehmende Person etwas ein, das kein Filter der
      // Seite abbildet.
      frage: "Und worauf soll ich besonders achten? Schreib ruhig frei, was dir wichtig ist.",
      chips: ["Sauberkeit ist mir wichtig", "Möglichst ruhig", "Gutes Essen", "Nichts Bestimmtes"],
      ueberspringen: () => false,
      auswerten(text, p) {
        const gefunden = Politik.kriterienAusText(text);
        if (!gefunden.length) return "Verstanden, dann gehe ich nach Bewertung und Preis.";
        for (const g of gefunden) {
          const da = (p.kriterien ||= []).find((k) => k.id === g.id);
          if (da) da.gewicht = Math.min(3, da.gewicht + g.gewicht);
          else p.kriterien.push({ ...g, gewicht: g.gewicht + 1 });
        }
        const namen = gefunden.map((g) => Politik.kriterium(g.id)?.label).filter(Boolean);
        return `${Politik.aufzaehlen(namen)} — darauf achte ich beim Vergleich besonders.`;
      },
    },
  ],

  naechsteVorfrage(profil, erledigt) {
    return this.VORFRAGEN.find((f) => !erledigt.includes(f.id) && !f.ueberspringen(profil)) || null;
  },

  /* ==================================================================
     Suchen und filtern - die Schrittfolge bis zur Shortlist
     ================================================================== */

  suchschritte(profil) {
    const schritte = [];
    const ziel = profil.zielId && typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[profil.zielId] : null;
    const zeitraum = this.zeitraum(profil.monat);

    schritte.push({
      werkzeug: "suchen",
      status: "stellt die Suche ein…",
      args: {
        typ: profil.typ || "hotel",
        ziel: ziel ? ziel.name : "",
        von: zeitraum.von,
        bis: zeitraum.bis,
        erwachsene: profil.erwachsene,
        kinder: profil.kinder,
      },
    });

    const filter = this.filterAusKriterien(profil.kriterien || []);
    if (profil.zielId) filter.zielId = profil.zielId;
    if (profil.maxPreis) filter.maxPreis = profil.maxPreis;
    if (profil.maxStrand) filter.maxStrand = profil.maxStrand;
    if (profil.budget === "hoch") filter.sterne = [5];
    if (Object.keys(filter).length) {
      schritte.push({ werkzeug: "filterSetzen", status: "setzt Filter…", args: this.fehlerEinbauen(filter) });
    }

    schritte.push({
      werkzeug: "sortieren",
      status: "sortiert…",
      args: { nach: profil.budget === "niedrig" || profil.maxPreis ? "preis-asc" : "rating" },
    });

    schritte.push({ werkzeug: "ergebnisseLesen", status: "sieht die Liste durch…", merken: "treffer", args: { anzahl: 8 } });
    schritte.push({ werkzeug: "bewertungenSichten", status: "liest Bewertungen…", merken: "sichtung", args: { anzahl: 5 } });
    schritte.push({ werkzeug: "shortlist", status: "stellt eine Auswahl zusammen…" });

    return schritte;
  },

  // Ein Zeitraum aus dem genannten Monat. Ohne Monatsangabe bleibt es beim
  // Standard der Suchmaske - der Agent erfindet keine Reisedaten.
  zeitraum(monat) {
    if (!monat) return { von: "", bis: "" };
    const heute = new Date();
    let jahr = heute.getFullYear();
    if (monat < heute.getMonth() + 1) jahr += 1;
    const iso = (d) => Reisedaten.alsIso(d);
    return {
      von: iso(new Date(jahr, monat - 1, 12)),
      bis: iso(new Date(jahr, monat - 1, 19)),
    };
  },

  ansage(profil) {
    const teile = [];
    if (profil.typ === "apartment") teile.push("Ferienwohnung");
    if (profil.zielId && typeof ZIEL_NACH_ID !== "undefined") teile.push(ZIEL_NACH_ID[profil.zielId]?.name);
    if (profil.maxPreis) teile.push(`bis ${profil.maxPreis} €`);
    else if (profil.budget === "niedrig") teile.push("günstig");
    else if (profil.budget === "hoch") teile.push("gehoben");
    if (profil.erwachsene) teile.push(`${profil.erwachsene} Erwachsene${profil.kinder ? ` und ${profil.kinder} Kinder` : ""}`);
    // Die Kriterien behalten ihre Grossschreibung - "sauberkeit, wellness"
    // waere in einem deutschen Satz schlicht falsch. Das Preiskriterium
    // faellt weg, wenn das Budget schon dasselbe sagt ("guenstig,
    // Preis-Leistung" waere doppelt).
    for (const { id } of profil.kriterien || []) {
      if (id === "preis" && (profil.budget === "niedrig" || profil.maxPreis)) continue;
      const l = this.kriterium(id)?.label;
      if (l) teile.push(l);
    }
    return teile.filter(Boolean).join(", ");
  },

  /* ==================================================================
     Fehlerinjektion
     ================================================================== */

  // Fehler werden nicht dem Modell ueberlassen ("sei absichtlich schlecht"),
  // sondern hier gesetzt: kontrolliert, protokollierbar und reproduzierbar.
  // Solange STELLSCHRAUBEN.fehler auf "keine" steht, passiert nichts.
  fehlerEinbauen(filter) {
    if (typeof STELLSCHRAUBEN === "undefined" || STELLSCHRAUBEN.fehler === "keine") return filter;

    const verfaelscht = { ...filter };
    if (STELLSCHRAUBEN.fehler === "filter") {
      if (verfaelscht.sterne) verfaelscht.sterne = [3];
      else verfaelscht.mindestbewertung = 3.5;
    }
    if (STELLSCHRAUBEN.fehler === "kriterium") {
      // Uebergeht einen genannten Wunsch stillschweigend
      delete verfaelscht.ausstattung;
      delete verfaelscht.maxStrand;
    }
    return verfaelscht;
  },

  /* ==================================================================
     Formulieren
     ================================================================== */

  // Spaeter uebernimmt das Modell diese Saetze. Die Zahlen darin stammen so
  // oder so aus den Daten.
  empfehlung(kandidat, profil) {
    const knapp = typeof STELLSCHRAUBEN !== "undefined" && STELLSCHRAUBEN.begruendung === "knapp";
    if (knapp) return `${kandidat.item.name}, ${kandidat.preis} € pro Nacht.`;
    return this.vorschlagssatz(kandidat, profil);
  },

  vorschlaege() {
    return ["Günstiges Hotel am Strand für 2 Personen", "Ferienwohnung in Tirol im Januar", "Gut bewertetes Hotel in Kyoto"];
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Politik };
