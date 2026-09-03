# Steuerprompt für eine Claude-Sitzung mit Chrome-Zugriff

Diesen Text komplett in eine Claude-Sitzung einfügen, die Zugriff auf deinen
Chrome hat (dort musst du bei ChatGPT angemeldet sein).

Das ist **nicht** der Prompt für ChatGPT — die 30 KI-Prompts für ChatGPT
stehen in `prompts.json` und werden vom Skript einzeln ausgegeben.

---

```
Du erzeugst 30 Bilder über die ChatGPT-Weboberfläche in Chrome und speicherst
sie unter vorgegebenen Dateinamen ab. Arbeite strikt nach diesem Ablauf.

PROJEKTORDNER
/Users/tom-gabrielmielicki/Desktop/Bachelor Arbeit/Website

VORBEREITUNG
Öffne drei ChatGPT-Tabs mit je einem neuen leeren Chat. Nummeriere sie 1, 2, 3.
Schicke den kompletten Text aus bilder/START-PROMPT-CHATGPT.md (nur den Block
zwischen den ```-Zeilen) als allererste Nachricht in JEDEN der drei Chats
einzeln. Warte je auf die Antwort "Bereit". Erst danach mit dem Ablauf beginnen.

Wenn du später einen neuen Chat öffnen musst: dort ebenfalls zuerst den
Start-Prompt schicken.

ABLAUF — wiederholen, bis nichts mehr offen ist:

1. Führe aus:  node bilder/holen.mjs next 3
   Du bekommst bis zu drei Einträge, je mit DATEI und PROMPT.

2. Sende den ersten PROMPT in Tab 1, den zweiten in Tab 2, den dritten in Tab 3.
   Sende ausschließlich den Prompt-Text — keine Nummer, kein Dateiname, keine
   Begrüßung.

3. Warte, bis in allen drei Tabs ein fertiges Bild steht.

4. Gehe die Tabs nacheinander durch. Für jeden Tab:
   a) Lade das Bild herunter (Download-Schaltfläche am Bild).
   b) Führe sofort aus:  node bilder/holen.mjs save <DATEI aus Schritt 1>
   c) Erst danach den nächsten Tab bearbeiten.

REGELN
- Ein Prompt, ein Bild. Niemals mehrere Motive, Varianten, Collagen oder Raster
  in einer Nachricht anfordern.
- Prompts nicht umformulieren, nicht kürzen, nichts ergänzen.
- Keine Nachbesserungen ("heller", "nochmal anders"). Weiter zum nächsten.
- Nach jedem Download sofort speichern, bevor der nächste Download startet.
  Sonst greift das Skript zur falschen Datei.
- Nutze zum Prüfen des Seitenzustands javascript_tool statt Screenshots.
  Screenshots nur, wenn es ohne nicht geht — das spart erheblich Tokens.
- Wenn ein Bild abgelehnt wird oder ein Tab hängt: Eintrag notieren, überspringen,
  neuen Chat öffnen, weitermachen. Nicht endlos wiederholen.

BERICHTE
Melde nur alle zehn Bilder eine einzige Zeile mit dem Stand aus
"node bilder/holen.mjs status". Keine Bildbeschreibungen, keine
Zwischenberichte, keine Zusammenfassungen einzelner Runden.

ABSCHLUSS
Am Ende: Anzahl gespeicherter Dateien und Liste der übersprungenen Einträge.
```
