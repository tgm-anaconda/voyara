// Datenannahme fuer die Studie.
//
// Die Seite schickt ihre Messdaten nicht selbst an Google, sondern
// hierher. Diese Funktion reicht sie an ein Apps Script weiter, das in
// ein Google Sheet schreibt. Zwei Gruende fuer den Umweg:
//
//   1. Die Adresse des Apps Script bleibt geheim. Staende sie im
//      Seitencode, koennte jeder beliebige Zeilen in die Tabelle
//      schreiben.
//   2. Wiederholung bei Fehlern passiert hier, mit Wartezeit dazwischen,
//      statt im Browser einer Person, die gerade weiterklickt.
//
// Die Adresse liegt in der Umgebungsvariable SHEETS_URL. Fehlt sie,
// antwortet die Funktion mit 503, und die Seite behaelt ihre Kopie im
// Browser - ein Ausfall hier kostet keine Sitzung.
//
// Es wird nichts gespeichert und nichts geloggt, was Personen betrifft.
// Die Verlosungsliste (art: "verlosung") wird ohne Teilnehmer-Nummer
// weitergereicht; die Studiendaten (art: "daten") ohne Mail.

export const config = { maxDuration: 20 };

const MAX_BYTES = 400_000;      // ein vollstaendiger Datensatz liegt bei 50-150 KB
const VERSUCHE = 3;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, fehler: "Nur POST." });

  const url = process.env.SHEETS_URL;
  if (!url) return res.status(503).json({ ok: false, fehler: "Keine Datenablage eingerichtet." });

  const koerper = req.body;
  if (!koerper || typeof koerper !== "object") return res.status(400).json({ ok: false, fehler: "Kein Inhalt." });
  if (!["daten", "verlosung"].includes(koerper.art)) return res.status(400).json({ ok: false, fehler: "Unbekannte Art." });

  // Trennung durchsetzen, nicht nur vereinbaren: Studiendaten ohne
  // Mail, Verlosung ohne Nummer - auch wenn der Browser beides schickt.
  let nutzlast;
  if (koerper.art === "verlosung") {
    const mail = String(koerper.mail || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return res.status(400).json({ ok: false, fehler: "Keine gueltige Adresse." });
    nutzlast = { art: "verlosung", mail, zeit: new Date().toISOString() };
  } else {
    const json = koerper.json && typeof koerper.json === "object" ? { ...koerper.json } : {};
    if (json.konto) json.konto = { vorhanden: true };
    nutzlast = {
      art: "daten",
      teilnehmerId: String(koerper.teilnehmerId || ""),
      punkt: String(koerper.punkt || ""),
      spalten: koerper.spalten && typeof koerper.spalten === "object" ? koerper.spalten : {},
      json: JSON.stringify(json),
    };
    if (!nutzlast.teilnehmerId) return res.status(400).json({ ok: false, fehler: "Keine Teilnehmer-Nummer." });
  }

  const text = JSON.stringify(nutzlast);
  if (text.length > MAX_BYTES) return res.status(413).json({ ok: false, fehler: "Zu gross." });

  let letzterStatus = 0;
  for (let i = 0; i < VERSUCHE; i++) {
    try {
      const antwort = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },   // Apps Script mag kein application/json (Preflight)
        body: text,
        redirect: "follow",                                          // Apps Script antwortet mit 302
      });
      letzterStatus = antwort.status;
      if (antwort.ok) {
        const ergebnis = await antwort.text();
        if (/"ok"\s*:\s*true/.test(ergebnis)) return res.status(200).json({ ok: true });
      }
    } catch { /* naechster Versuch */ }
    await new Promise((f) => setTimeout(f, 600 * (i + 1)));
  }
  return res.status(502).json({ ok: false, fehler: `Ablage nicht erreichbar (${letzterStatus}).` });
}
