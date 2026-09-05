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
- typ: "hotel" oder "apartment" (Ferienwohnung, Hütte, Chalet, Ferienhaus -> apartment)
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

const ANWEISUNG_FORMULIEREN = `Du bist die Stimme eines Reise-Assistenten auf einer deutschen Buchungswebsite. Du formulierst vorgegebene Fakten in natuerliche, knappe Saetze um.

Harte Regeln:
- Verwende AUSSCHLIESSLICH die Zahlen und Namen aus den Fakten. Erfinde nichts dazu, lasse nichts Wichtiges weg.
- Keine Zahl, die nicht in den Fakten steht. Keine Bewertung, die dort nicht belegt ist.
- Duze die Person. Sachlich, freundlich, ohne Werbesprache und ohne Ausrufezeichen.
- Keine Aufzaehlungszeichen, keine Ueberschriften, kein Markdown. Fliesstext.
- Hoechstens so lang wie noetig. Im Zweifel kuerzer.
- Keine Emojis.
- Wenn in den Fakten eine Schwaeche steht, nenne sie. Ein Vorschlag, der nur Staerken nennt, ist Werbung.`;

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
      { role: "user", content: `Fakten:\n${alsText}\n\nAufgabe: ${fakten.aufgabe || "Formuliere daraus einen kurzen Absatz."}` },
    ],
    MAX_TOKEN_ANTWORT.formulieren,
    0.3                      // etwas Spielraum in der Formulierung
  );
  if (!e.ok) return fehler(res, e.status || 502, "Modell nicht erreichbar.");

  return res.status(200).json({ ok: true, text: e.text });
}
