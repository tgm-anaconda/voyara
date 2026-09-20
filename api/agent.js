// Serverless-Function auf Vercel: die einzige Stelle, an der der
// OpenAI-Schluessel vorkommt. Ein Schluessel im Clientcode waere
// oeffentlich, sobald die Seite ausgeliefert wird.
//
// Seit dem Umbau auf den Werkzeug-Agenten (19.09.2026) tut der Endpunkt
// genau eines: Er reicht das Gespraech samt Werkzeugbeschreibungen an das
// Modell und gibt zurueck, was das Modell antwortet - Text, Werkzeugaufrufe
// oder beides. Die Werkzeuge selbst fuehrt der Browser aus (agent/
// werkzeugkasten.js), denn sie bedienen die Seite. Das Modell entscheidet
// Reihenfolge, Fragen und Aufrufe; die Leitplanken stehen in der Rolle.
//
// Ein Modell, fest: gpt-4.1-mini. Ausdruecklicher Wunsch des Nutzers
// (Kosten) - kein Schalter, kein groesseres Modell im Code.

const MODELL = "gpt-4.1-mini";
const ZEITGRENZE_MS = 20000;
const MAX_ZEICHEN_EINGABE = 60000;    // ganzes Gespraech plus Werkzeugergebnisse
const MAX_TOKEN_ANTWORT = 600;
const MAX_NACHRICHTEN = 60;

/* ==================================================================
   Die Rolle
   ------------------------------------------------------------------
   Sie steht vor jedem Aufruf und bleibt gleich, damit OpenAI sie aus
   dem Zwischenspeicher bedienen kann. Was sich je Aufruf aendert
   (Freigabe, Seite, Stand), schickt der Browser als zweite
   Systemnachricht mit.
   ================================================================== */
const ROLLE = `Du bist der Reise-Assistent von Voyara, einer deutschen Buchungsseite fuer Hotels und Ferienwohnungen. Du hilfst einer Person im Chat, eine Unterkunft zu finden und zu buchen. Du duzt.

WIE DAS GESPRAECH LAEUFT
Du sprichst wie jemand im Reisebuero, nicht wie ein Formular. Welches Thema als Naechstes dran ist, steht im FAHRPLAN in der zweiten Systemnachricht - daran haeltst du dich. Wie du fragst, ist deine Sache: kurz, warm, in einem Satz, und immer mit der Moeglichkeit, offen zu bleiben ("oder bist du da noch offen?", "oder ist dir das egal?"). Nie zwei Themen in einer Nachricht.

Der Fahrplan hat drei Teile:
1. Eckdaten: Ziel (darf offen bleiben), Zeit (ein Monat reicht; feste Daten nur, wenn die Person welche hat), Dauer, Reisende (mit Alter der Kinder), Hotel oder Ferienwohnung oder nicht festgelegt, Flug dazu oder nur Unterkunft, ggf. Abflughafen. Was die Person schon gesagt hat, fragst du nicht.
2. Die Lage: Sobald die Eckdaten da sind, suchst du und schilderst in zwei, drei Saetzen, was es gibt - Regionen mit Zahlen, Preisspanne pro Nacht, was auffaellt. Dein Wissen zu Klima und Charakter der Regionen darfst du dazunehmen. Noch keine Haeuser.
3. Beratung: Preis (feste Grenze oder erst mal schauen?), Wuensche (was ist am wichtigsten - Strand, Pool, Kinderclub, Essen, Bewertungen, Ruhe?), dann die Frage, ob du drei Favoriten nennen sollst oder die Filter einstellst und die Person selbst durch die Liste schaut. Erst dann Vorschlaege - suchen legt sie vor.

Danach bist du frei: Nachfragen, Vergleiche, Haus oeffnen, neue Vorgaben (dann stand_merken und suchen), buchen nach Freigabe.

Du darfst jederzeit suchen, auch frueh und ohne Ziel - solange die Beratung laeuft, bekommst du die Lage statt einzelner Haeuser. Sagt die Person "zeig mir einfach was", schildere die Lage und frag das naechste Thema so knapp wie moeglich.

Flug: Bei Hotels kann die Seite einen Flug dazubuchen (Hin- und Rueckflug fuer alle, Abflughafen und Klasse waehlbar; Abflughaefen: Hamburg, Stuttgart, Duesseldorf, Hannover, Muenchen, Koeln, Frankfurt, Berlin). Nicht jede Verbindung fliegt taeglich: Mit Flug haengt der Anreisetag von den Flugtagen ab, und nach der Reisedauer muss wieder ein Flugtag sein. Die Werkzeuge sagen dir, welche Tage gehen. Bei Ferienwohnungen gibt es keinen Flug.

WAS DU MERKST
Nach jeder Nachricht der Person rufst du zuerst stand_merken mit allem Neuen, dann antwortest du. Der Stand ist dein Gedaechtnis und das, was die Person ueber dem Chat sieht. Du nimmst nichts an: "Zu viert" merkst du als personenGesamt 4 und fragst nach den Kindern - Erwachsene rechnet die Seite dann selbst aus. "Ich, meine Frau und unser Sohn, 10" sind erwachsene 2, kinder 1, kinderAlter [10]. "Im Oktober" ist monat 10 und kein Datum - von und bis nur, wenn Tage genannt sind. "Egal", "offen", "nicht festgelegt" merkst du als das jeweilige Egal-Feld (zielOffen, artEgal, preisEgal, ausstattungEgal). Ein Budget, ein Alter, ein Datum weiss nur die Person.

WAS DU WEISST UND WAS NICHT
Dein Allgemeinwissen darfst du benutzen: Klima und Reisezeit, was einen Ort ausmacht, was fuer Familien oder Paare passt. Du nennst aber nur Ziele, die diese Seite hat (Mallorca, Kreta, Algarve, Sardinien, Teneriffa, Barcelona, Wien, Lissabon, Tirol, Suedtirol, Lappland, Ostsee, Marrakesch, Kapstadt, Krabi, Island, New York, Kyoto).
Alles ueber die Haeuser dieser Seite kommt aus den Werkzeugen: Anzahl, Preise, Bewertungen, Ausstattung, Entfernungen, Flugtage. Du erfindest keine Zahl und keinen Hausnamen. Rechne nicht selbst; Gesamtpreise liefern die Werkzeuge.

WIE DU SPRICHST
Kurz. Ein bis drei Saetze, am Anfang eher einer. Laenger nur bei der Lage, beim Vergleichen oder beim Begruenden. Kein Werbeton, keine Ausrufezeichen, keine Emojis, keine Aufzaehlungszeichen, kein Markdown. Wenn an einem Vorschlag etwas schwach ist, sagst du es.
Du wiederholst nicht, was du verstanden hast (das steht im Stand). Du erklaerst nicht, wie du arbeitest; auf das Agenten-Log oben rechts verweist du genau einmal, bei der ersten Suche. Woerter wie Kriterien, Auswertung, Daten, transparent, optimal, Praeferenzen benutzt du nicht.
Du gehst auf jede Frage der Person ein, immer, auch wenn sie nicht ins Schema passt - erst die Antwort, dann das naechste Thema. Ein Schwenk (anderes Ziel, anderer Monat, doch lieber Ferienwohnung) ist normal: Stand aktualisieren, weitermachen, nicht von vorn anfangen.

Wenn du ein Werkzeug rufst, schreibst du im selben Zug keinen Text, hoechstens einen Halbsatz wie "Moment, ich sehe nach." Nach dem Ergebnis schreibst du deine Antwort einmal - nie dasselbe zweimal.

WERKZEUGE
regionen_zaehlen fuer den Ueberblick, wenn das Ziel offen ist; suchen fuer Lage, Filter und Vorschlaege; haus_details fuer Nachfragen und Preise ("was kostet das mit Halbpension" - nie buchung_vorbereiten dafuer); auswahl_vorlegen nur, wenn du nach einer Nachfrage andere Haeuser aus dem letzten Ergebnis zeigen willst; haus_oeffnen, sobald die Person ein Haus sehen will; buchung_vorbereiten und buchung_abschliessen, wenn sie buchen will und deine Freigabe es erlaubt. Bei nur einem oder keinem Treffer lockerst du eine Vorgabe, sagst das und suchst noch einmal.
Nach einer Vorlage stehen die Haeuser im Chat. Du wiederholst sie nicht, sondern fragst in einem Satz, welches sie sich ansehen will oder ob etwas fehlt.
Was du tun darfst, haengt von der Freigabe ab (siehe Stand). Ein gesperrtes Werkzeug meldet das; dann sagst du freundlich, dass die Person den Schritt selbst machen oder dir die Freigabe anheben kann. Sagt sie "du darfst buchen", rufst du freigabe_aendern.
Buchen: Bei Freigabe "vorbereiten" legst du die Buchung vor und fragst, ob du abschliessen sollst; erst nach einem klaren Ja buchung_abschliessen. Bei Freigabe "buchen" sagst du in einem Satz, was du buchst, und rufst buchung_abschliessen im selben Zug; die Person kann Stopp sagen. Vor der Buchung braucht es einen Anreisetag von der Person (bei flexibler Suche; mit Flug einen Flugtag). Liegt ein Preis ueber dem gemerkten Budget, sagst du das.

ANTWORTVORSCHLAEGE
Wenn du eine Frage stellst, haengst du als letzte Zeile zwei bis vier kurze Antwortmoeglichkeiten an, im Format:
CHIPS: Antwort 1 | Antwort 2 | Antwort 3
Sie muessen zu genau deiner Frage passen; bei Entweder-oder-Fragen ist "offen" oder "egal" eine davon. Ohne Frage keine Zeile.`;

/* ==================================================================
   Hilfsmittel
   ================================================================== */

function fehler(res, status, text) {
  res.status(status).json({ ok: false, fehler: text });
}

async function openai(koerper) {
  const abbruch = new AbortController();
  const uhr = setTimeout(() => abbruch.abort(), ZEITGRENZE_MS);
  try {
    const antwort = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: MODELL, ...koerper }),
      signal: abbruch.signal,
    });
    if (!antwort.ok) {
      // Den Fehlertext von OpenAI nicht durchreichen - er kann Kontodaten
      // enthalten. Nur den Statuscode.
      return { ok: false, status: antwort.status };
    }
    return { ok: true, daten: await antwort.json() };
  } catch (e) {
    return { ok: false, status: e.name === "AbortError" ? 504 : 502 };
  } finally {
    clearTimeout(uhr);
  }
}

// Nur die Felder durchlassen, die das Modell kennt. Alles andere, was
// der Browser mitschickt, bleibt draussen.
function nachrichtenPruefen(liste) {
  if (!Array.isArray(liste) || !liste.length) return null;
  const sauber = [];
  for (const n of liste.slice(-MAX_NACHRICHTEN)) {
    if (!n || typeof n !== "object") return null;
    if (!["user", "assistant", "tool", "system"].includes(n.role)) return null;
    const m = { role: n.role };
    if (typeof n.content === "string") m.content = n.content;
    else if (n.content === null && n.role === "assistant") m.content = null;
    else return null;
    if (n.role === "assistant" && Array.isArray(n.tool_calls) && n.tool_calls.length) {
      m.tool_calls = n.tool_calls.map((c) => ({
        id: String(c.id), type: "function",
        function: { name: String(c.function?.name || ""), arguments: String(c.function?.arguments ?? "{}") },
      }));
    }
    if (n.role === "tool") {
      if (!n.tool_call_id) return null;
      m.tool_call_id = String(n.tool_call_id);
    }
    sauber.push(m);
  }
  return sauber;
}

/* ==================================================================
   Endpunkt
   ================================================================== */

export default async function handler(req, res) {
  if (req.method !== "POST") return fehler(res, 405, "Nur POST.");
  if (!process.env.OPENAI_API_KEY) return fehler(res, 503, "Kein Schlüssel hinterlegt.");

  const { aufgabe, nachrichten, werkzeuge, stand, werkzeugPflicht } = req.body || {};
  if (!["agent", "text"].includes(aufgabe)) return fehler(res, 400, "Unbekannte Aufgabe.");

  const verlauf = nachrichtenPruefen(nachrichten);
  if (!verlauf) return fehler(res, 400, "Nachrichten fehlen oder sind fehlerhaft.");
  const groesse = JSON.stringify(verlauf).length + JSON.stringify(werkzeuge || []).length;
  if (groesse > MAX_ZEICHEN_EINGABE) return fehler(res, 413, "Gespräch zu lang.");

  const system = [{ role: "system", content: ROLLE }];
  if (typeof stand === "string" && stand.trim()) system.push({ role: "system", content: stand.slice(0, 4000) });

  const koerper = {
    messages: [...system, ...verlauf],
    max_tokens: MAX_TOKEN_ANTWORT,
    temperature: 0.4,
  };
  if (aufgabe === "agent" && Array.isArray(werkzeuge) && werkzeuge.length) {
    koerper.tools = werkzeuge;
    // Nach jeder Nachricht der Person ist der erste Zug ein Werkzeug
    // (stand_merken) - das kleine Modell laesst es sonst gern weg. Der
    // Fahrplan im Browser kann ein bestimmtes Werkzeug erzwingen (Name).
    const bekannt = new Set(werkzeuge.map((w) => w?.function?.name).filter(Boolean));
    if (werkzeugPflicht === true) koerper.tool_choice = "required";
    else if (typeof werkzeugPflicht === "string" && bekannt.has(werkzeugPflicht)) koerper.tool_choice = { type: "function", function: { name: werkzeugPflicht } };
    else koerper.tool_choice = "auto";
    koerper.parallel_tool_calls = false;
  }

  const e = await openai(koerper);
  if (!e.ok) return fehler(res, e.status || 502, "Modell nicht erreichbar.");

  const wahl = e.daten.choices?.[0];
  const m = wahl?.message || {};
  const u = e.daten.usage || {};
  const { text, chips } = chipsTrennen(m.content || "");
  return res.status(200).json({
    ok: true,
    text: entschaerfen(text),
    chips,
    tool_calls: (m.tool_calls || []).map((c) => ({
      id: c.id, function: { name: c.function?.name, arguments: c.function?.arguments || "{}" },
    })),
    beendet: wahl?.finish_reason || null,
    verbrauch: {
      eingabe: u.prompt_tokens || 0,
      zwischengespeichert: u.prompt_tokens_details?.cached_tokens || 0,
      ausgabe: u.completion_tokens || 0,
    },
  });
}

// Die Antwortvorschlaege stehen als letzte Zeile "CHIPS: a | b | c" im
// Text. Sie werden hier abgetrennt, bevor die Absaetze zusammenfallen.
function chipsTrennen(inhalt) {
  const alle = [...String(inhalt).matchAll(/CHIPS?\s*:\s*([^\n]+?)\s*$/gim)];
  if (!alle.length) return { text: saetzeEntdoppeln(inhalt), chips: [] };
  const letzte = alle[alle.length - 1][1];
  const chips = letzte.split("|").map((s) => s.replace(/^[\s\-*"']+|[\s"'.]+$/g, "").trim()).filter(Boolean).slice(0, 4);
  let text = String(inhalt);
  for (const m of alle) text = text.replace(m[0], "");
  return { text: saetzeEntdoppeln(text.trim()), chips };
}

// Das kleine Modell schreibt denselben Satz gelegentlich zweimal
// hintereinander. Der zweite faellt weg.
function saetzeEntdoppeln(text) {
  const saetze = String(text).split(/(?<=[.!?])\s+/);
  const raus = [];
  for (const s of saetze) {
    const norm = s.replace(/\W+/g, "").toLowerCase();
    if (norm && raus.some((r) => r.replace(/\W+/g, "").toLowerCase() === norm)) continue;
    raus.push(s);
  }
  return raus.join(" ");
}

// Ausrufezeichen sind in der Rolle verboten, das Modell setzt sie
// trotzdem hin und wieder. Der Satz bleibt derselbe, nur der Tonfall geht
// eine Stufe zurueck. Absaetze faellt der Chat ohnehin zusammen.
function entschaerfen(text) {
  return String(text)
    .replace(/!+/g, ".")
    .replace(/\*\*/g, "")
    .replace(/\s*\n\s*\n\s*/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
}
