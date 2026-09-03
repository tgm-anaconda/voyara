# Bilder für Voyara

**103 Bilder insgesamt, davon nur 30 per KI.** Der Rest kommt aus der
Pexels-Pipeline (kostenlos, automatisiert).

| Weg | Anzahl | Was |
|---|---|---|
| **KI** (ChatGPT) | **30** | Außenansichten und ortsgebundene Ansichten — dort, wo das Gebäude selbst oder ein erkennbarer Ort zu sehen ist |
| **Stock** (Pexels) | **73** | Innenräume, Pools, Bäder, Mietwagen, Regionen, Startseite — alles, wo die Geografie nicht sichtbar ist |

**Warum diese Aufteilung:** Bei den Stockfotos ist im Testlauf das Empress Hotel
(Victoria, Kanada) mit lesbarem Schriftzug als Außenansicht aufgetaucht. Genau
diese Bilder — Gebäude und erkennbare Orte — kommen deshalb aus der KI. Innenräume
verraten den Ort nicht und sind als echte Fotos sogar glaubwürdiger.

**Zuwachs je weiterem Objekt:** ein zusätzliches Hotel kostet 2 KI-Bilder,
eine zusätzliche Ferienwohnung 1 KI-Bild. Der Rest läuft automatisch mit.

## Dateien hier

| Datei | Zweck |
|---|---|
| **`ANLEITUNG.md`** | **Hier anfangen** — Schritt für Schritt, was zu tun ist |
| `START-PROMPT-CHATGPT.md` | Grundregeln, einmal pro Chat als erste Nachricht |
| `STEUERPROMPT-CLAUDE.md` | Text zum Einfügen in eine Claude-Sitzung mit Chrome-Zugriff |
| `holen.mjs` | Helfer: nennt den nächsten Prompt, benennt Downloads um |
| `prompts.json` | die 30 KI-Prompts für ChatGPT (`file` + `prompt`) |
| `prompts.md` | dieselbe Liste als Tabelle zum Nachlesen |
| `stock-bedarf.json` | die 73 Bilder, die über Pexels beschafft werden |
| `art-direction.js` | Bildregie je Objekt — hier ändern, wenn Motive anders sollen |
| `generate-prompts.mjs` | baut aus der Bildregie die Prompt-Liste neu |
| `generate-images.mjs` | Alternative über die OpenAI-API statt Browser |
| `eingang/` | Ablage für frische Downloads (Chrome hierhin einstellen) |
| `generiert/` | fertige, korrekt benannte Bilder |

**Wer bekommt welchen Text?**

- ChatGPT bekommt zuerst den **Start-Prompt** (einmal pro Chat), danach die
  **Bild-Prompts** — einzeln, ausgegeben von `holen.mjs next`
- Claude (mit Chrome-Zugriff) bekommt den **Steuerprompt** aus `STEUERPROMPT-CLAUDE.md`

Prompts neu bauen (nach Änderungen an der Bildregie):

```bash
node bilder/generate-prompts.mjs
```

## Stock-Bilder holen (Pexels)

```bash
python3 bilder/stock-holen.py --limit 10   # erste zehn
node bilder/pruefen.mjs                    # PFLICHT: durchsehen
python3 bilder/stock-holen.py              # Rest
```

Nach je 10 Bildern erinnert das Skript an die Prüfung. **Die ist verbindlich** —
Kriterien und Begründung in `PRUEFUNG.md`. Aussortieren heißt: Datei aus
`generiert/` löschen und `stock-holen.py` erneut laufen lassen.

## Weg A — über den Browser (gewählt)

Drei ChatGPT-Tabs erzeugen parallel, heruntergeladen und umbenannt wird einzeln.
Vollständiger Ablauf in `ANLEITUNG.md`. Kurzfassung:

```bash
node bilder/holen.mjs next 3          # nächste drei Prompts anzeigen
# → in drei Tabs einfügen, abschicken, warten
# → Bild aus Tab 1 herunterladen, dann sofort:
node bilder/holen.mjs save hotels/h01-1.png
# → dasselbe für Tab 2 und Tab 3, dann von vorn

node bilder/holen.mjs status          # Fortschritt
node bilder/holen.mjs fehlend         # was noch offen ist
```

`save` nimmt immer die zuletzt heruntergeladene Bilddatei aus `~/Downloads` und
legt sie unter dem Zielnamen ab. Deshalb nach **jedem** Download sofort speichern.
Dateien, die älter als zehn Minuten sind, lehnt das Skript ab — als Schutz gegen
Verwechslungen.

## Weg B — über die API

```bash
export OPENAI_API_KEY="sk-..."
node bilder/generate-images.mjs --limit 3   # Testlauf mit 3 Bildern
node bilder/generate-images.mjs             # kompletter Durchlauf
```

Kein Browser, keine Klicks, robuster bei großen Mengen. Liegt bereit, falls der
Browser-Weg zu mühsam wird.

## Warum keine Vierer-Collagen

Die Überlegung war, pro Anfrage ein großes Bild mit vier Motiven zu erzeugen und
die vier Kacheln anschließend herauszuschneiden. Davon rate ich ab:

1. **Die Bildgenerierung liefert kein 4K.** Die Modelle geben maximal rund
   1024–1536 Pixel Kantenlänge aus. Ein Viererraster daraus ergibt Kacheln von
   etwa 512–768 Pixeln.
2. **Hochskalieren erzeugt keine Details.** Aus einer 768-Pixel-Kachel wird durch
   Vergrößern kein echtes 4K-Bild, sondern ein weichgezeichnetes 768-Pixel-Bild in
   großem Rahmen.
3. **Raster-Anfragen sind unzuverlässig.** Sichtbare Trennlinien, Rahmen,
   unterschiedliche Bildstile innerhalb eines Rasters und stilistisches Überlaufen
   zwischen den Kacheln treten häufig auf.

**Was tatsächlich gebraucht wird:** Die größte Darstellung auf der Seite ist das
Galeriebild mit rund 600 × 300 Pixeln, auf hochauflösenden Displays also etwa
1200 × 600. Ein einzeln erzeugtes Bild mit 1536 × 1024 liegt darüber und ist damit
mehr als ausreichend. 4K-Material wäre für eine Website ohnehin nur unnötiger
Ballast bei den Ladezeiten.

Ein Bild pro Anfrage ist hier also nicht nur einfacher, sondern liefert auch das
bessere Ergebnis.

## Einbau in die Website

Die Bilder werden erst eingebunden, wenn sie vorliegen. Dann ersetzen sie die
aktuellen SVG-Platzhalter aus `data/scenes.js`. Die Dateinamen in `prompts.json`
sind bereits so gewählt, dass sie zu den Objekt-IDs im Katalog passen
(`h01` … `h12`, `a01` … `a06`, `c01` … `c08`).
