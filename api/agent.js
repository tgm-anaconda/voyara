// Serverless-Function auf Vercel: die einzige Stelle, an der der
// OpenAI-Schluessel vorkommt.
//
// Warum ueberhaupt ein eigener Endpunkt und nicht der Aufruf aus dem Browser:
// Ein Schluessel im Clientcode ist oeffentlich, sobald die Seite ausgeliefert
// wird - jede teilnehmende Person koennte ihn aus dem Quelltext lesen. Er
// bleibt deshalb hier, in `process.env.OPENAI_API_KEY`, und verlaesst den
// Server nie.
//
// Der Endpunkt kann genau zwei Dinge, und beide sind eng gefuehrt:
//
//   verstehen   Freier Text -> strukturierte Absicht (JSON).
//               Ersetzt die Schluesselwort-Erkennung in politik.js.
//
//   formulieren Unsere Fakten -> deutsche Saetze.
//               Das Modell bekommt die Zahlen vorgelegt und darf keine
//               eigenen erfinden. In einer Studie waeren erfundene
//               Prozentwerte fatal.
//
// Was das Modell NICHT darf: entscheiden. Welche Unterkunft vorgeschlagen
// wird, welche Filter gesetzt werden, wann gebucht wird - das steht in
// agent/politik.js und ist fuer jede teilnehmende Person gleich. Liesse man
// GPT frei entscheiden, maesse die Studie die Streuung des Modells statt den
// Effekt des Agenten.

const MODELL = "gpt-4o-mini";
const ZEITGRENZE_MS = 12000;

// Kostenbremse. Ein Lauf braucht ueblicherweise unter zehn Aufrufe; die
// Grenzen greifen nur, wenn etwas im Kreis laeuft.
const MAX_ZEICHEN_EINGABE = 6000;
const MAX_TOKEN_ANTWORT = { verstehen: 300, formulieren: 400 };

/* ==================================================================
   Systemanweisungen
   ================================================================== */

const ANWEISUNG_VERSTEHEN = `Du wandelst deutsche Reisewuensche in JSON um. Antworte AUSSCHLIESSLICH mit einem JSON-Objekt, ohne Fliesstext und ohne Markdown.

Felder:
- typ: "hotel" oder "apartment". Nur "apartment", wenn ausdruecklich Ferienwohnung, Hütte, Chalet, Ferienhaus, Appartement oder Selbstversorgung genannt wird. Im Zweifel "hotel".
- ziel: der genannte Ort als Wort, exakt wie im Text, sonst null
- monat: Zahl 1-12 oder null
- erwachsene: Zahl oder null
- kinder: Zahl oder null
- maxPreis: Zahl in Euro pro Nacht oder null
- budget: "niedrig", "hoch" oder null
- kriterien: Liste aus diesen Werten, nur was wirklich gewuenscht ist:
  sauberkeit, ruhe, essen, lage, service, preis, pool, wellness, familie, strandnah, bewertung
- betont: true, wenn ein Wunsch ausdruecklich hervorgehoben wird ("sehr wichtig", "lege Wert auf", "unbedingt"), sonst false

Regeln:
- Verneinungen ergeben KEIN Kriterium ("kein Pool noetig" -> pool nicht aufnehmen).
- Rate nichts. Was nicht dasteht, ist null oder fehlt in der Liste.
- "zu zweit" = 2 Erwachsene, "Familie" ohne Zahl = 2 Erwachsene und 2 Kinder.`;

const ANWEISUNG_FORMULIEREN = `Du bist der Reise-Assistent von Voyara, einer deutschen Buchungsseite. Du hilfst jemandem, eine Unterkunft zu finden.

WIE DU SPRICHST
Du redest wie ein Mensch, der sich mit Reisen auskennt und gerade Zeit hat. Du duzt.

Wenn jemand etwas Persoenliches erwaehnt - Kinder, ein besonderer Anlass, eine lange Anreise, ein Wunsch nach Ruhe -, nimmst du das in einem halben Satz auf, bevor du zur Sache kommst. Nicht schmeicheln, nicht loben, nur zeigen, dass du zugehoert hast. Wer dagegen nur "Hotel in Wien" schreibt, bekommt keine Einleitung, sondern eine Antwort.

Du bist konkret. Statt "sehr gut bewertet" die Zahl. Statt "schoene Auswahl" das, was es dort tatsaechlich gibt. Wenn du zwei Orte gegeneinanderstellst, nenne, was sie unterscheidet - nicht, was sie gemeinsam haben.

Du uebertreibst nicht. Kein Werbeton, keine Ausrufezeichen, keine Emojis, keine Superlative ohne Beleg. Und du schmueckst nicht aus: Aus "Dolomiten" wird nicht "beeindruckende Dolomiten", aus einer Kueche keine "einzigartige Kueche". Wertende Adjektive, die nicht in den Fakten stehen, gehoeren nicht in deine Antwort - sie klingen nach Prospekt und sind das Erste, woran man Text aus einer Maschine erkennt. Wenn an einem Vorschlag etwas schwach ist, sagst du es. Ein Vorschlag, der nur Staerken nennt, ist Werbung und keine Beratung.

Du bestaetigst knapp. Wenn du zurueckmeldest, was du verstanden hast, reichen zwei, drei Woerter: "Februar, notiert." oder "Bis 180 Euro, gut." Wiederhole nicht den ganzen Auftrag in einem Satz und beginne nicht mit "Ich habe verstanden, dass ..." - schon gar nicht mehrmals hintereinander. Diese Wendung ist das deutlichste Zeichen eines Bots.

Du fasst dich kurz. Zwei bis vier Saetze reichen fast immer, oft weniger. Fliesstext, keine Aufzaehlungszeichen, keine Ueberschriften, kein Markdown.

WAS DU NIE TUST
Die Situationsbeschreibung wiedergeben. Sie ist eine Regieanweisung fuer dich, kein Inhalt fuer die Antwort. Sag nie, was die Person NICHT geschrieben hat ("du hast keinen Ort genannt") - frag einfach.

Alle Fakten aufzaehlen, die du bekommst. Du bekommst mehr, als in eine Antwort gehoert. Waehle aus. Zahlen nur dort, wo sie bei der Entscheidung helfen - eine Preisspanne sagt etwas, vier Preisspannen hintereinander sind eine Tabelle.

Zahlen erfinden. Nur die Zahlen aus den mitgelieferten Fakten duerfen vorkommen. Keine Schaetzungen, nichts aus deinem Weltwissen ueber echte Orte, keine Angaben zu Verfuegbarkeit oder Preisen, die dir niemand gegeben hat.

Du bekommst gleich die Situation und ein JSON mit den Fakten. Schreib die Antwort, die an dieser Stelle des Gespraechs passt.`;

/* ==================================================================
   Hilfsmittel
   ================================================================== */

function fehler(res, status, text) {
  res.status(status).json({ ok: false, fehler: text });
}

async function openai(nachrichten, maxToken, temperatur) {
  const abbruch = new AbortController();
  const uhr = setTimeout(() => abbruch.abort(), ZEITGRENZE_MS);
  try {
    const antwort = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODELL,
        messages: nachrichten,
        max_tokens: maxToken,
        temperature: temperatur,
      }),
      signal: abbruch.signal,
    });

    if (!antwort.ok) {
      // Den Fehlertext von OpenAI NICHT durchreichen - er kann Kontodaten
      // enthalten. Nur den Statuscode, der reicht zur Fehlersuche.
      return { ok: false, status: antwort.status };
    }
    const daten = await antwort.json();
    return { ok: true, text: daten.choices?.[0]?.message?.content?.trim() || "" };
  } catch (e) {
    return { ok: false, status: e.name === "AbortError" ? 504 : 502 };
  } finally {
    clearTimeout(uhr);
  }
}

/* ==================================================================
   Endpunkt
   ================================================================== */

export default async function handler(req, res) {
  if (req.method !== "POST") return fehler(res, 405, "Nur POST.");
  if (!process.env.OPENAI_API_KEY) return fehler(res, 503, "Kein Schlüssel hinterlegt.");

  const { aufgabe, text, fakten } = req.body || {};

  if (aufgabe !== "verstehen" && aufgabe !== "formulieren") {
    return fehler(res, 400, "Unbekannte Aufgabe.");
  }

  /* --- Verstehen ---------------------------------------------------- */
  if (aufgabe === "verstehen") {
    if (typeof text !== "string" || !text.trim()) return fehler(res, 400, "Kein Text.");
    if (text.length > MAX_ZEICHEN_EINGABE) return fehler(res, 413, "Text zu lang.");

    const e = await openai(
      [
        { role: "system", content: ANWEISUNG_VERSTEHEN },
        { role: "user", content: text.slice(0, MAX_ZEICHEN_EINGABE) },
      ],
      MAX_TOKEN_ANTWORT.verstehen,
      0                      // keine Kreativitaet beim Verstehen
    );
    if (!e.ok) return fehler(res, e.status || 502, "Modell nicht erreichbar.");

    // Das Modell soll JSON liefern. Tut es das nicht, ist der Aufruf
    // gescheitert - dann greift im Browser die Schluesselwort-Erkennung.
    try {
      const roh = e.text.replace(/^```(?:json)?|```$/g, "").trim();
      return res.status(200).json({ ok: true, absicht: JSON.parse(roh) });
    } catch {
      return fehler(res, 502, "Antwort war kein JSON.");
    }
  }

  /* --- Formulieren -------------------------------------------------- */
  if (!fakten || typeof fakten !== "object") return fehler(res, 400, "Keine Fakten.");
  const alsText = JSON.stringify(fakten);
  if (alsText.length > MAX_ZEICHEN_EINGABE) return fehler(res, 413, "Zu viele Fakten.");

  const e = await openai(
    [
      { role: "system", content: ANWEISUNG_FORMULIEREN },
      { role: "user", content: `Situation: ${fakten.lage || "Du antwortest der Person."}\n\nFakten:\n${alsText}` },
    ],
    MAX_TOKEN_ANTWORT.formulieren,
    0.3                      // etwas Spielraum in der Formulierung
  );
  if (!e.ok) return fehler(res, e.status || 502, "Modell nicht erreichbar.");

  return res.status(200).json({ ok: true, text: e.text });
}
