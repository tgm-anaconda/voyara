# Anleitung: Bilder über den Browser erzeugen

30 Bilder über drei parallele ChatGPT-Tabs. Grundprinzip:
**parallel erzeugen, einzeln herunterladen und sofort umbenennen.**

## Vorbereitung (einmalig, 2 Minuten)

**1. Download-Ordner in Chrome umstellen** (empfohlen, aber nicht zwingend)

Chrome → Einstellungen → Downloads → Speicherort ändern auf:

```
/Users/tom-gabrielmielicki/Desktop/Bachelor Arbeit/Website/bilder/eingang
```

Dann liegen die ChatGPT-Bilder getrennt von allem anderen. Wenn du das nicht
umstellst, funktioniert es trotzdem — das Skript schaut auch in `~/Downloads`.
Dann solltest du den Download-Ordner aber vorher aufräumen.

**2. Drei ChatGPT-Tabs öffnen**, in jedem einen neuen leeren Chat.

**3. Start-Prompt in jeden der drei Chats schicken**

Den Text aus `START-PROMPT-CHATGPT.md` als allererste Nachricht in **jeden**
Chat einzeln. Chats teilen sich keine Anweisungen. ChatGPT antwortet mit
"Bereit" — danach kommen nur noch die Bild-Prompts.

Der Start-Prompt verhindert vor allem, dass ChatGPT nach vielen Bildern anfängt,
sich auf vorherige Motive zu beziehen und Variationen statt neuer Bilder zu
liefern.

## Eine Runde (drei Bilder)

**Schritt 1** — nächste drei Prompts anzeigen:

```bash
cd "/Users/tom-gabrielmielicki/Desktop/Bachelor Arbeit/Website" && node bilder/holen.mjs next 3
```

Du bekommst drei Blöcke, je mit `DATEI:` und `PROMPT:`.

**Schritt 2** — Prompt 1 in Tab 1 einfügen und abschicken, Prompt 2 in Tab 2,
Prompt 3 in Tab 3. Nur den Prompt-Text senden, sonst nichts.

**Schritt 3** — warten, bis alle drei Bilder fertig sind (je 30–60 Sekunden).

**Schritt 4** — jetzt **eins nach dem anderen**. Bild aus Tab 1 herunterladen,
dann sofort (Dateiname aus Schritt 1 einsetzen):

```bash
cd "/Users/tom-gabrielmielicki/Desktop/Bachelor Arbeit/Website" && node bilder/holen.mjs save hotels/h01-1.png
```

Danach Tab 2 herunterladen und speichern, dann Tab 3.

> **Wichtig:** Nach jedem einzelnen Download sofort speichern. Das Skript nimmt
> immer die zuletzt heruntergeladene Bilddatei. Lädst du drei auf einmal
> herunter, landen alle unter dem falschen Namen.

**Schritt 5** — zurück zu Schritt 1.

## Zwischendurch

```bash
node bilder/holen.mjs status     # wie viele fertig sind
node bilder/holen.mjs fehlend    # welche Dateien noch offen sind
```

Du kannst jederzeit aufhören und später weitermachen — das Skript merkt sich den
Stand daran, welche Dateien schon in `generiert/` liegen.

## Aufwand

Rund 35 Runden, grob 45–75 Minuten. Wenn eine Claude-Sitzung mit Chrome-Zugriff
das übernimmt: siehe `STEUERPROMPT-CLAUDE.md`.

## Wenn ein Bild nicht passt

Datei aus `generiert/` löschen — dann taucht der Prompt bei `next` wieder auf.
Wenn der Stil grundsätzlich nicht passt: `art-direction.js` anpassen und

```bash
node bilder/generate-prompts.mjs
```

neu laufen lassen.
