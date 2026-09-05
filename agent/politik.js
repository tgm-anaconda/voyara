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

  /* ==================================================================
     Reisearten
     ------------------------------------------------------------------
     "Wir wollen mit den Kindern in die Berge" ist ein voellig normaler
     Reisewunsch - nur steht "Berge" in keinem Katalog. Vorher endete
     das in "Das habe ich noch nicht ganz", was den Agenten dumm
     aussehen laesst, obwohl die Seite genau dafuer Angebote hat.

     Deshalb eine Ebene zwischen Wunsch und Ziel: Wer eine Reiseart
     nennt, bekommt die passenden Ziele zur Wahl gestellt, statt einer
     Rueckfrage nach dem Ortsnamen.
     ================================================================== */

  THEMEN: [
    { id: "berge", label: "in die Berge", ziele: ["tirol", "suedtirol"],
      woerter: ["berge", "gebirge", "alpen", "bergurlaub", "wandern", "wanderurlaub", "gipfel", "almen"] },
    { id: "ski", label: "zum Skifahren", ziele: ["tirol", "suedtirol"],
      woerter: ["ski", "skifahren", "snowboard", "piste", "skiurlaub", "wintersport"] },
    { id: "norden", label: "in den hohen Norden", ziele: ["lappland", "island"],
      woerter: ["norden", "nordlicht", "polarlicht", "aurora", "skandinavien", "arktis", "schnee und eis"] },
    { id: "strand", label: "ans Meer", ziele: ["mallorca", "kreta", "algarve", "sardinien", "teneriffa", "krabi", "ostsee"],
      woerter: ["ans meer", "strandurlaub", "an den strand", "badeurlaub", "meer", "küste", "kueste", "insel"] },
    { id: "stadt", label: "in eine Stadt", ziele: ["barcelona", "wien", "lissabon", "newyork", "kyoto"],
      woerter: ["städtetrip", "staedtetrip", "städtereise", "staedtereise", "stadt", "city"] },
    { id: "wintersonne", label: "in die Wintersonne", ziele: ["teneriffa", "krabi", "marrakesch", "kapstadt"],
      woerter: ["wintersonne", "sonne im winter", "warm im winter", "der kälte entfliehen", "der kaelte entfliehen"] },
    { id: "fern", label: "in die Ferne", ziele: ["krabi", "kapstadt", "newyork", "kyoto"],
      woerter: ["fernreise", "weit weg", "fernost", "asien", "übersee", "uebersee"] },
  ],

  // Reiseart aus dem Text. Laengste Wortliste zuerst, damit "Wintersonne"
  // nicht vom allgemeineren "Sonne" geschlagen wird.
  themaAusText(text) {
    const t = " " + String(text).toLowerCase() + " ";
    let bestes = null;
    for (const th of this.THEMEN) {
      for (const w of th.woerter) {
        if (!t.includes(w)) continue;
        if (!bestes || w.length > bestes.laenge) bestes = { thema: th, laenge: w.length };
      }
    }
    if (!bestes) return null;
    // Nur Ziele, die es auch wirklich gibt
    const ziele = bestes.thema.ziele.filter((id) =>
      typeof ZIEL_NACH_ID === "undefined" || ZIEL_NACH_ID[id]);
    return ziele.length ? { ...bestes.thema, ziele } : null;
  },

  zielnamen(ids) {
    if (typeof ZIEL_NACH_ID === "undefined") return ids;
    return ids.map((id) => ZIEL_NACH_ID[id]?.name).filter(Boolean);
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

  /* Harte Vorgaben
     ------------------------------------------------------------------
     Was die Person ausdruecklich gesagt hat, ist keine Praeferenz,
     sondern eine Bedingung. Wer "hoechstens 300 Euro" sagt, will keinen
     Vorschlag fuer 320 - auch nicht, wenn der besser bewertet ist. Wer
     Mallorca sagt, will kein Angebot auf Kreta. Wer zu zweit reist,
     braucht kein Haus fuer sechs.

     Die Ergebnisseite filtert das bereits ueber Regler und Auswahl.
     Diese Pruefung liegt trotzdem noch einmal davor: Wuerde ein
     Bedienelement einmal nicht greifen, saehe man es hier - und der
     Agent schlaegt lieber nichts vor als etwas Falsches. */
  erfuellt(item, preis, profil) {
    if (profil.maxPreis && (preis ?? item.pricePerNight) > profil.maxPreis) return false;
    if (profil.zielId && item.ziel !== profil.zielId) return false;
    if (profil.maxStrand != null && (item.distanceToBeach ?? 99) > profil.maxStrand) return false;

    // Personenzahl: bei Wohnungen die Hoechstbelegung, bei Hotels das
    // groesste Zimmer.
    const personen = (profil.erwachsene || 0) + (profil.kinder || 0);
    if (personen > 0) {
      if (item.type === "apartment") {
        if ((item.maxGuests || 0) < personen) return false;
      } else if (item.rooms?.length) {
        if (Math.max(...item.rooms.map((r) => r.maxGuests || 0)) < personen) return false;
      }
    }
    return true;
  },

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
      // billigste Haus, und der Agent waere wieder eine Sortierung.
      // Die Obergrenze ist kein Ausschlag, sondern eine Bedingung: sie
      // wird weiter unten geprueft, nicht hier verrechnet.
      const preis = t.preis ?? item.pricePerNight;
      if (profil.budget === "niedrig") punkte += (160 - preis) / 90;

      return { ...t, item, punkte, belege, preis };
    }).filter(Boolean)
      // Was eine ausdrueckliche Vorgabe verletzt, faellt raus - egal wie
      // gut es sonst waere.
      .filter((k) => this.erfuellt(k.item, k.preis, profil));

    return bewertet.sort((a, b) => b.punkte - a.punkte);
  },

  /* ==================================================================
     Wie die Auswahl zustande kommt
     ------------------------------------------------------------------
     Zwei Verfahren, eine feste Schwelle dazwischen. Beide sind
     deterministisch: dieselbe Eingabe fuehrt bei jeder teilnehmenden
     Person zu derselben Auswahl. Das ist die Voraussetzung dafuer, dass
     sich die Laeufe ueberhaupt vergleichen lassen.

     PASSUNG - wenn die Person etwas ueber ihre Vorlieben gesagt hat.
     Dann wird streng danach ausgewaehlt: die drei bestbewerteten
     Treffer, wobei die genannten Kriterien schwerer wiegen als alles
     andere. Die Auswahl spiegelt genau das wider, was gesagt wurde.

     SPREIZUNG - wenn nur ein Ziel genannt wurde und sonst nichts.
     Dann waeren die drei bestbewerteten Haeuser einander sehr aehnlich
     (dreimal mittlere Preisklasse, dreimal dieselbe Art) - die Person
     erfuehre nichts ueber die Bandbreite und haette nichts, woran sie
     sich reiben kann. Stattdessen drei Haeuser, die sich moeglichst
     unterscheiden: in der Preisklasse, in der Art des Hauses und in der
     Lage. Aus der Reaktion darauf ergibt sich die Richtung, und der
     Agent sucht in der naechsten Runde gezielter.

     Der Agent sagt in beiden Faellen, welches Verfahren er benutzt hat.
     ================================================================== */

  // Wie viel hat die Person preisgegeben? Ab zwei Punkten wird nach
  // Passung ausgewaehlt, darunter gespreizt.
  SCHWELLE_PASSUNG: 2,

  informationswert(profil) {
    let punkte = 0;
    for (const k of profil.kriterien || []) punkte += Math.min(2, k.gewicht || 1);
    if (profil.maxPreis || profil.budget) punkte += 1;
    if (profil.kinder != null && profil.kinder > 0) punkte += 1;
    if (profil.maxStrand) punkte += 1;
    return punkte;
  },

  // Preisklasse innerhalb der aktuellen Trefferliste, nicht absolut:
  // "guenstig" heisst in Kyoto etwas anderes als an der Ostsee.
  preisklassen(bewertet) {
    const preise = bewertet.map((k) => k.preis).filter((p) => p != null).sort((a, b) => a - b);
    if (preise.length < 3) return () => "mittel";
    const unten = preise[Math.floor(preise.length / 3)];
    const oben = preise[Math.floor((preise.length * 2) / 3)];
    return (p) => (p <= unten ? "günstig" : p >= oben ? "gehoben" : "mittel");
  },

  // Wie verschieden sind zwei Haeuser? Preisklasse zaehlt am meisten -
  // sie ist der Unterschied, den man zuerst bemerkt.
  abstand(a, b, klasse) {
    let d = 0;
    if (klasse(a.preis) !== klasse(b.preis)) d += 2;
    if ((a.item.category || a.item.type) !== (b.item.category || b.item.type)) d += 1;
    if (a.item.region !== b.item.region) d += 1;
    return d;
  },

  auswaehlen(bewertet, profil, anzahl = 3) {
    const wert = this.informationswert(profil);
    if (wert >= this.SCHWELLE_PASSUNG || bewertet.length <= anzahl) {
      return { kandidaten: bewertet.slice(0, anzahl), strategie: "passung", informationswert: wert };
    }

    /* Spreizung in zwei Stufen.

       Zuerst die Preisklasse, und zwar als feste Vorgabe: aus jeder der
       drei Klassen das bestbewertete Haus. Der Preis ist der Unterschied,
       den man zuerst bemerkt, und eine Auswahl mit dreimal derselben
       Preisklasse hilft niemandem weiter.

       Bleibt ein Platz frei, weil eine Klasse leer ist, kommt das Haus
       hinein, das sich von den bereits gewaehlten am staerksten abhebt -
       nach Art und Gegend. Bei Gleichstand entscheidet die Bewertung, so
       bleibt das Ergebnis eindeutig und wiederholbar. */
    const klasse = this.preisklassen(bewertet);
    const gewaehlt = [];

    for (const stufe of ["günstig", "mittel", "gehoben"]) {
      if (gewaehlt.length >= anzahl) break;
      const treffer = bewertet.find((k) => klasse(k.preis) === stufe && !gewaehlt.includes(k));
      if (treffer) gewaehlt.push(treffer);
    }

    while (gewaehlt.length < anzahl) {
      const rest = bewertet.filter((k) => !gewaehlt.includes(k));
      if (!rest.length) break;
      let bester = rest[0], besterAbstand = -1;
      for (const k of rest) {
        const d = Math.min(...gewaehlt.map((g) => this.abstand(k, g, klasse)));
        if (d > besterAbstand) { besterAbstand = d; bester = k; }
      }
      gewaehlt.push(bester);
    }

    // Innerhalb der Auswahl nach Bewertung ordnen - die Reihenfolge im
    // Chat soll nicht vom Zufall der Preisklassen abhaengen.
    gewaehlt.sort((a, b) => b.punkte - a.punkte);

    return {
      kandidaten: gewaehlt,
      strategie: "spreizung",
      informationswert: wert,
      klassen: gewaehlt.map((k) => klasse(k.preis)),
    };
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

    // "Das nehme ich" auf einer geoeffneten Detailseite meint das Haus, das
    // gerade zu sehen ist. Wer einem Verweis aus dem Chat gefolgt ist, steht
    // genau dort - und muesste sonst den Namen abtippen.
    if (/\b(das|dies|die[sr]?e[sn]?|hier)\b/.test(t) && typeof Werkzeuge !== "undefined"
        && Werkzeuge.seite() === "stay") {
      const offen = new URLSearchParams(location.search).get("id");
      if (offen && kandidaten.some((k) => k.id === offen)) return offen;
    }

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

    // Hat die Person noch nichts ueber ihre Vorlieben gesagt, wird die
    // Auswahl gespreizt (siehe auswaehlen). Dafuer reichen die acht
    // bestbewerteten Haeuser nicht: die aehneln einander und liegen alle
    // im oberen Preisbereich. Also einmal umsortieren und das andere Ende
    // der Liste ansehen - so wuerde ein Mensch es auch machen.
    if (this.informationswert(profil) < this.SCHWELLE_PASSUNG) {
      schritte.push({ werkzeug: "sortieren", status: "sortiert anders…", args: { nach: "preis-asc" } });
      schritte.push({ werkzeug: "ergebnisseLesen", status: "sieht auch die günstigeren durch…", merken: "treffer2", args: { anzahl: 8 } });
    }

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

  /* ==================================================================
     Offenlegung der Entscheidungsgrundlage
     ------------------------------------------------------------------
     Waehrend der Agent arbeitet, meldet er nur knapp, was er gerade tut
     ("vergleicht Hotels"). Beim Ergebnis dagegen soll nachvollziehbar
     sein, WORAUF die Reihenfolge beruht: wie viele Haeuser verglichen
     wurden, was davon uebrig blieb, was schwerer gewogen hat und welche
     Zahl den Ausschlag gab.

     Fuer die Studie ist das zugleich eine mogliche Manipulationsgroesse:
     STELLSCHRAUBEN.begruendung steuert, wie viel der Agent ueber sein
     eigenes Handeln preisgibt. Alle Zahlen darin stammen aus den Daten,
     nicht aus dem Modell.
     ================================================================== */
  grundlage(kandidaten, profil, merker, auswahl) {
    const stufe = typeof STELLSCHRAUBEN !== "undefined" ? STELLSCHRAUBEN.begruendung : "ausfuehrlich";
    if (stufe === "knapp") return null;

    const teile = [];
    const gesehen = (merker?.treffer?.treffer || []).length;
    const gesichtet = (merker?.sichtung?.gesichtet || []).length;
    const zustand = typeof Werkzeuge !== "undefined" ? Werkzeuge.zustand() : {};
    const gesamt = zustand.trefferGesamt;

    // 1. Womit habe ich gearbeitet?
    const vorgaben = [];
    if (profil.maxPreis) vorgaben.push(`bis ${profil.maxPreis} €`);
    if (profil.maxStrand) vorgaben.push(`höchstens ${profil.maxStrand} km zum Strand`);
    for (const { id } of profil.kriterien || []) {
      const k = this.kriterium(id);
      if (k?.filter) vorgaben.push(k.label);
    }
    if (gesamt != null) {
      teile.push(vorgaben.length
        ? `Grundlage: Nach deinen Vorgaben (${this.aufzaehlen([...new Set(vorgaben)])}) bleiben ${gesamt} Häuser. Davon habe ich ${gesichtet || gesehen} im Detail durchgesehen.`
        : `Grundlage: ${gesamt} Häuser standen zur Auswahl, ${gesichtet || gesehen} habe ich im Detail durchgesehen.`);
    }

    // 2. Nach welchem Verfahren habe ich ausgewaehlt?
    const genannte = (profil.kriterien || []).map((x) => this.kriterium(x.id)?.label).filter(Boolean);
    if (auswahl?.strategie === "spreizung") {
      teile.push("Du hast mir noch keine Vorlieben genannt. Deshalb habe ich nicht drei ähnliche Häuser herausgesucht, sondern drei, die sich unterscheiden — in der Preisklasse, in der Art des Hauses und in der Lage. Sag mir, welche Richtung dir zusagt, dann suche ich gezielter.");
      return teile.join(" ");
    }
    teile.push(genannte.length
      ? `Für die Reihenfolge zählt bei mir zuerst, was du genannt hast — ${this.aufzaehlen(genannte)} —, danach Gesamtnote und Preis.`
      : "Für die Reihenfolge zählen Gesamtnote und Preis.");

    // 3. Was gab den Ausschlag?
    const erster = kandidaten[0];
    const beleg = (erster?.belege || []).slice().sort((a, b) => b.anteil - a.anteil)[0];
    if (erster && beleg) {
      const andere = kandidaten.slice(1)
        .map((k) => (k.belege || []).find((b) => b.kriterium === beleg.kriterium))
        .filter(Boolean);
      const bester = andere.every((b) => b.anteil <= beleg.anteil);
      teile.push(`${erster.item.name} steht vorn, weil ${Math.round(beleg.anteil * 100)} Prozent der ${beleg.erwaehnungen} Erwähnungen zu ${beleg.kriterium} positiv sind${bester && andere.length ? " — der höchste Wert der Auswahl" : ""}.`);
    } else if (erster) {
      teile.push(`${erster.item.name} steht vorn wegen der Gesamtnote von ${erster.item.rating.toFixed(1).replace(".", ",")} bei ${erster.item.reviewCount} Bewertungen.`);
    }

    // 4. Was ich NICHT geprueft habe - Ehrlichkeit ueber die Grenzen
    teile.push("Nicht geprüft habe ich Verfügbarkeit und Stornobedingungen — die stehen auf der Detailseite.");

    return teile.join(" ");
  },

  /* ==================================================================
     Fakten fuer das Modell
     ------------------------------------------------------------------
     Das Modell formuliert, es rechnet nicht. Deshalb bekommt es genau
     die Zahlen vorgelegt, die im Satz vorkommen duerfen - und nichts
     sonst. modell.js prueft die Antwort danach gegen diese Fakten:
     steht dort eine Zahl, die hier fehlt, wird der eigene Satz genommen.
     ================================================================== */

  faktenVorschlag(k, profil) {
    const stark = (k.belege || []).filter((b) => b.anteil >= 0.8).sort((a, b) => b.gewicht - a.gewicht)[0];
    const schwach = (k.belege || []).filter((b) => b.anteil < 0.7).sort((a, b) => a.anteil - b.anteil)[0];
    const kurz = typeof aspektKurzfassung === "function" ? aspektKurzfassung(k.item) : null;

    return {
      lage: "Stell dieses Haus vor. Es ist einer von mehreren Vorschlaegen, die du nacheinander nennst - halte dich also kurz.",
      name: k.item.name,
      ort: k.item.location,
      preisProNacht: k.preis,
      note: k.item.rating,
      anzahlBewertungen: k.item.reviewCount,
      genanntesKriterium: stark ? {
        thema: stark.kriterium,
        prozentPositiv: Math.round(stark.anteil * 100),
        erwaehnungen: stark.erwaehnungen,
      } : null,
      schwachesKriterium: schwach ? {
        thema: schwach.kriterium,
        prozentPositiv: Math.round(schwach.anteil * 100),
      } : null,
      gelobt: kurz?.staerken?.slice(0, 2) || [],
      kritisiert: kurz?.schwaechen?.slice(0, 1) || [],
    };
  },

  /* Was gibt es an einem Ziel? Zahlen aus dem Katalog, damit der Agent
     etwas Konkretes sagen kann statt einer Floskel. */
  zielFakten(id) {
    const ziel = typeof ZIEL_NACH_ID !== "undefined" ? ZIEL_NACH_ID[id] : null;
    if (!ziel) return null;
    const alle = [
      ...(typeof HOTELS !== "undefined" ? HOTELS : []),
      ...(typeof APARTMENTS !== "undefined" ? APARTMENTS : []),
    ].filter((o) => o.ziel === id);
    const preise = alle.map((o) => o.pricePerNight).filter(Boolean);
    const regionen = [...new Set(alle.map((o) => o.region).filter(Boolean))];
    return {
      name: ziel.name,
      land: ziel.land,
      beschreibung: ziel.kurz,
      unterkuenfte: alle.length,
      preisAb: preise.length ? Math.min(...preise) : null,
      preisBis: preise.length ? Math.max(...preise) : null,
      regionen: regionen.slice(0, 4),
    };
  },

  faktenZielwahl(text, thema) {
    return {
      lage: "Stell die passenden Ziele kurz gegenueber und frag, wohin es gehen soll.",
      wasDiePersonSchrieb: text,
      reiseart: thema.label,
      ziele: thema.ziele.map((id) => this.zielFakten(id)).filter(Boolean),
    };
  },

  faktenAnsage(profil, text) {
    const ziel = profil.zielId ? this.zielFakten(profil.zielId) : null;
    return {
      lage: "Bestaetige kurz den Wunsch und frag, ob du vorher ein paar Eckdaten durchgehen sollst oder direkt losziehen darfst.",
      wasDiePersonSchrieb: text,
      ziel: ziel ? { name: ziel.name, land: ziel.land } : null,
      unterkunftsart: profil.typ === "apartment" ? "Ferienwohnung" : "Hotel",
      reisemonat: profil.monat,
      erwachsene: profil.erwachsene,
      kinder: profil.kinder,
      hoechstpreisProNacht: profil.maxPreis || null,
      genannteWuensche: (profil.kriterien || []).map((x) => this.kriterium(x.id)?.label).filter(Boolean),
    };
  },

  // Bestaetigung der letzten Antwort und naechste Frage in einem Zug -
  // so wuerde es ein Mensch auch sagen, statt zwei Saetze nacheinander
  // abzusetzen.
  faktenVorfrage(frage, quittung, profil) {
    const ziel = profil.zielId ? this.zielFakten(profil.zielId) : null;
    return {
      lage: "Bestaetige knapp das Verstandene und stell die naechste Frage - beides in einem Zug.",
      wasDuVerstandenHast: quittung || null,
      naechsteFrage: frage.frage,
      worumEsGeht: frage.id,
      ziel: ziel ? { name: ziel.name, land: ziel.land, beschreibung: ziel.beschreibung } : null,
      bereitsBekannt: {
        unterkunftsart: profil.typ === "apartment" ? "Ferienwohnung" : "Hotel",
        reisemonat: profil.monat,
        erwachsene: profil.erwachsene,
        kinder: profil.kinder,
        hoechstpreisProNacht: profil.maxPreis || null,
        wuensche: (profil.kriterien || []).map((x) => this.kriterium(x.id)?.label).filter(Boolean),
      },
    };
  },

  /* Nachfrage zu einem einzelnen Vorschlag.
     ------------------------------------------------------------------
     Ausfuehrlicher als der Vorschlagssatz: alle Aspekte mit Zahlen, der
     Platz in der Auswahl, und was gegen das Haus spricht. Wer nachfragt,
     soll etwas bekommen, das die Muehe wert war - sonst misst die
     Nachfragequote nur, wie neugierig jemand ist, und nicht, ob die
     Begruendung trägt. */
  faktenWarum(kandidat, kandidaten, profil) {
    const k = kandidat;
    const platz = kandidaten.findIndex((x) => x.id === k.id) + 1;
    const bilanz = typeof aspektbilanz === "function" ? (aspektbilanz(k.item, 400) || []) : [];

    return {
      lage: "Die Person hat nachgefragt, warum du gerade dieses Haus vorschlaegst. Antworte ausfuehrlicher als vorher, nenne auch, was dagegen spricht, und wo es im Vergleich zu den anderen steht.",
      name: k.item.name,
      ort: k.item.location,
      preisProNacht: k.preis,
      note: k.item.rating,
      anzahlBewertungen: k.item.reviewCount,
      platzInDerAuswahl: platz,
      vonWievielen: kandidaten.length,
      genannteWuensche: (profil.kriterien || []).map((x) => this.kriterium(x.id)?.label).filter(Boolean),
      // Die vier meistdiskutierten Aspekte mit echten Zahlen
      wasGaesteSchreiben: bilanz.slice(0, 4).map((a) => ({
        thema: a.label,
        erwaehnungen: a.erwaehnungen,
        prozentPositiv: Math.round(a.anteilPositiv * 100),
      })),
      dagegen: bilanz.filter((a) => a.anteilPositiv < 0.72).slice(0, 2).map((a) => ({
        thema: a.label,
        prozentPositiv: Math.round(a.anteilPositiv * 100),
      })),
      andereZumVergleich: kandidaten.filter((x) => x.id !== k.id).map((x) => ({
        name: x.item.name, preisProNacht: x.preis, note: x.item.rating,
      })),
    };
  },

  // Rueckfall, wenn das Modell nicht antwortet
  warumSatz(kandidat, kandidaten, profil) {
    const k = kandidat;
    const platz = kandidaten.findIndex((x) => x.id === k.id) + 1;
    const bilanz = typeof aspektbilanz === "function" ? (aspektbilanz(k.item, 400) || []) : [];
    const teile = [`${k.item.name} steht bei mir auf Platz ${platz} von ${kandidaten.length}.`];

    const oben = bilanz.slice(0, 2);
    if (oben.length) {
      teile.push(`Am häufigsten geht es in den Bewertungen um ${this.aufzaehlen(oben.map((a) =>
        `${a.label} (${a.erwaehnungen} Erwähnungen, ${Math.round(a.anteilPositiv * 100)} Prozent positiv)`))}.`);
    }
    // Der Schwachpunkt darf nicht derselbe Aspekt sein, der eben schon mit
    // seiner Zahl dastand - sonst liest sich der Satz wie eine Wiederholung.
    const genannt = new Set(oben.map((a) => a.label));
    const schwach = bilanz.filter((a) => a.anteilPositiv < 0.72 && !genannt.has(a.label))[0];
    if (schwach) {
      teile.push(`Dagegen spricht ${schwach.label}: nur ${Math.round(schwach.anteilPositiv * 100)} Prozent der Erwähnungen sind positiv.`);
    }
    teile.push(`Zum Vergleich: ${this.aufzaehlen(kandidaten.filter((x) => x.id !== k.id)
      .map((x) => `${x.item.name} kostet ${x.preis} €`))}.`);
    return teile.join(" ");
  },

  faktenGrundlage(kandidaten, profil, merker, auswahl) {
    const zustand = typeof Werkzeuge !== "undefined" ? Werkzeuge.zustand() : {};
    const erster = kandidaten[0];
    const beleg = (erster?.belege || []).slice().sort((a, b) => b.anteil - a.anteil)[0];

    const vorgaben = [];
    if (profil.maxPreis) vorgaben.push(`höchstens ${profil.maxPreis} Euro pro Nacht`);
    if (profil.maxStrand) vorgaben.push(`höchstens ${profil.maxStrand} Kilometer zum Strand`);
    for (const { id } of profil.kriterien || []) {
      const k = this.kriterium(id);
      if (k?.filter) vorgaben.push(k.label);
    }

    if (auswahl?.strategie === "spreizung") {
      return {
        lage: "Erklaer, warum du bewusst unterschiedliche Haeuser vorgelegt hast statt der drei bestbewerteten, und bitte um eine Richtung.",
        grund: "Die Person hat ein Ziel genannt, aber keine Vorlieben - also gibt es nichts, wonach sich sinnvoll sortieren liesse.",
        wasDuGetanHast: "Drei Haeuser ausgesucht, die sich in Preisklasse, Art und Lage unterscheiden.",
        haeuserZurAuswahl: zustand.trefferGesamt ?? null,
        preisklassen: auswahl.klassen || [],
        haeuser: kandidaten.map((k) => ({
          name: k.item.name,
          preisProNacht: k.preis,
          art: k.item.category || k.item.type,
          gegend: k.item.region,
        })),
        nichtGeprueft: ["Verfügbarkeit", "Stornobedingungen"],
      };
    }

    return {
      lage: "Leg offen, worauf deine Reihenfolge beruht und wo deine Pruefung aufhoert.",
      haeuserNachVorgaben: zustand.trefferGesamt ?? null,
      imDetailGeprueft: (merker?.sichtung?.gesichtet || []).length || (merker?.treffer?.treffer || []).length,
      vorgaben: [...new Set(vorgaben)],
      genannteKriterien: (profil.kriterien || []).map((x) => this.kriterium(x.id)?.label).filter(Boolean),
      erstesHaus: erster ? erster.item.name : null,
      ausschlaggebend: beleg ? {
        thema: beleg.kriterium,
        prozentPositiv: Math.round(beleg.anteil * 100),
        erwaehnungen: beleg.erwaehnungen,
      } : null,
      nichtGeprueft: ["Verfügbarkeit", "Stornobedingungen"],
    };
  },

  vorschlaege() {
    return ["Günstiges Hotel am Strand für 2 Personen", "Ferienwohnung in Tirol im Januar", "Gut bewertetes Hotel in Kyoto"];
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = { Politik };
