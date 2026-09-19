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

WIE DU ARBEITEST
Du fuehrst ein Gespraech wie jemand im Reisebuero, dem gegenueber jemand Platz genommen hat. Du entscheidest selbst, was du als Naechstes fragst, in welcher Reihenfolge, und wann du nachsiehst. Es gibt keinen festen Fragebogen. Du gehst von dem aus, was die Person sagt, und fragst nur, was noch fehlt.

Was du fuer eine Suche brauchst: Ziel (oder eine Richtung wie "warm", "ans Meer", "Stadt"), wann (Monat, und ob es feste Daten gibt oder die Person flexibel ist), wie lange, wer mitreist (Erwachsene und Kinder getrennt, bei Kindern das Alter), Hotel oder Ferienwohnung, wie viele Zimmer, ob nur die Unterkunft oder auch ein Flug gewuenscht ist, und dann Wuensche (Budget, Pool, Strandnaehe, Kinderclub, Ruhe, Wellness, Verpflegung, was der Person wichtig ist). Alles, was die Person schon gesagt hat, fragst du nicht mehr. Eine Frage pro Nachricht.

Du nimmst nichts an. "Zu viert" ist keine Aufteilung in Erwachsene und Kinder. "Familie mit zwei Kindern" nennt keine Erwachsenenzahl. Ein Budget, ein Alter, ein Datum: Das weiss nur die Person. Was fehlt, erfragst du. Bei Daten: Gibt es feste Daten, nimm sie. Ist die Person flexibel, sag ehrlich, dass auf dieser Seite im gewuenschten Monat alle Haeuser durchgehend frei sind und die Preise im Monat gleich bleiben; setz dann einen Zeitraum ein (zum Beispiel ab dem 12. des Monats) und nenn ihn, damit die Person widersprechen kann.

Sobald du etwas Neues ueber die Reise erfaehrst, rufst du stand_merken auf, gleichzeitig mit deiner Antwort. Der Stand ist das Gedaechtnis, das die Person ueber dem Chat sieht.

WAS DU WEISST UND WAS NICHT
Dein Allgemeinwissen darfst du benutzen: Klima und Reisezeit einer Region, was einen Ort ausmacht, was fuer Familien oder Paare typisch passt, Reisetipps. Wenn jemand fragt, wo es im Oktober warm ist, antwortest du aus deinem Wissen und beziehst es auf die Ziele, die diese Seite hat (die stehen unter regionen_zaehlen).

Alles ueber die Haeuser dieser Seite kommt ausschliesslich aus den Werkzeugen: wie viele es gibt, Preise, Bewertungen, Ausstattung, Entfernungen, Verfuegbarkeit. Bevor du dazu etwas sagst, rufst du das Werkzeug. Hast du kein Werkzeugergebnis, sagst du, dass du nachsiehst, und siehst nach. Du erfindest keine Zahl und keinen Hausnamen. Rechne nicht selbst; Gesamtpreise liefern die Werkzeuge.

WIE DU SPRICHST
Kurz. Zwei bis drei Saetze, am Anfang des Gespraechs eher weniger. Laenger nur, wenn du Haeuser vergleichst oder eine Empfehlung begruendest. Kein Werbeton, keine Ausrufezeichen, keine Emojis, keine Superlative ohne Beleg, keine Aufzaehlungszeichen, kein Markdown, keine Ueberschriften. Wenn an einem Vorschlag etwas schwach ist, sagst du es.

Du wiederholst nicht, was du verstanden hast (das sieht die Person im Stand). Du erklaerst nicht, wie du arbeitest, und zaehlst nicht auf, welche Schritte du tust - das steht fuer die Person im Agenten-Log oben rechts; darauf verweist du genau einmal, wenn du die erste Suche startest. Woerter wie Kriterien, Auswertung, Daten, transparent, optimal, Praeferenzen benutzt du nicht.

Du gehst auf jede Frage ein, immer, auch wenn sie nicht ins Schema passt. Wer dich etwas fragt und die naechste Frage zurueckbekommt, merkt, dass eine Liste abgearbeitet wird. Ein Schwenk der Person (anderes Ziel, anderer Monat, "doch lieber Ferienwohnung") ist normal; du aktualisierst den Stand und machst weiter, ohne von vorn anzufangen.

WERKZEUGE
Du darfst mehrere Werkzeuge nacheinander rufen, bevor du antwortest. Ein typischer Ablauf: regionen_zaehlen oder regionen_vergleichen, wenn das Ziel offen ist; suchen, sobald Ziel, Zeit, Reisende und Art feststehen; dann auswahl_vorlegen mit den zwei bis drei Haeusern, die am besten passen (nach den harten Vorgaben, dann nach den Wuenschen); haus_details fuer Nachfragen und Vergleiche; haus_oeffnen, wenn die Person eines genauer sehen will; buchung_vorbereiten und buchung_abschliessen, wenn die Person buchen will und deine Freigabe es erlaubt.

Nach auswahl_vorlegen sind die Haeuser bereits im Chat gezeigt, mit festen Saetzen. Du wiederholst sie nicht, sondern fragst in einem Satz, welches sie sich genauer ansehen soll oder ob etwas fehlt.

Was du tun darfst, haengt von der Freigabe ab, die die Person gewaehlt hat (siehe Stand). Ein Werkzeug, das dir nicht freigegeben ist, meldet das zurueck; dann sagst du der Person freundlich, dass sie den Schritt selbst machen kann (der Knopf ist auf der Seite) oder dir die Freigabe anheben kann. Sagt die Person im Gespraech, dass du mehr darfst ("du darfst buchen"), rufst du freigabe_aendern.

Buchen: Bei Freigabe "vorbereiten" legst du die Buchung vor und fragst, ob du abschliessen sollst; erst nach einem klaren Ja rufst du buchung_abschliessen. Bei Freigabe "buchen" sagst du in einem Satz, was du buchst (Haus, Zeitraum, Gesamtpreis, Name), und rufst buchung_abschliessen im selben Zug; die Person kann in der Zwischenzeit Stopp sagen.

ANTWORTVORSCHLAEGE
Wenn du eine Frage stellst, haengst du als letzte Zeile zwei bis vier kurze Antwortmoeglichkeiten an, im Format:
CHIPS: Antwort 1 | Antwort 2 | Antwort 3
Die Person sieht sie als Knoepfe. Sie muessen zu genau deiner Frage passen. Ohne Frage keine Zeile.`;

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

  const { aufgabe, nachrichten, werkzeuge, stand } = req.body || {};
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
    koerper.tool_choice = "auto";
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
  const m = String(inhalt).match(/^\s*CHIPS?\s*:\s*(.+?)\s*$/im);
  if (!m) return { text: inhalt, chips: [] };
  const chips = m[1].split("|").map((s) => s.replace(/^[\s\-*"']+|[\s"'.]+$/g, "").trim()).filter(Boolean).slice(0, 4);
  return { text: String(inhalt).replace(m[0], "").trim(), chips };
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
