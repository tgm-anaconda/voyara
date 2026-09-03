# Weitere Bilder — Vorschlagsliste

Stand nach dem Einbau der ersten 103 Bilder. Sortiert nach Wirkung auf den
Realismus. Spalte „Weg" sagt, ob KI oder Stock sinnvoller ist.

---

## Hoch — deutlich spürbar

### 1. Header-Varianten mit Menschen (4 Bilder) · KI

Dein Wunsch: nicht nur Landschaft, sondern Urlaubsstimmung mit Menschen.
Vier Varianten, damit die Startseite bei jedem Aufruf etwas anders wirkt.

> **Entscheidung 15.08.2026: KI statt Stock.** Fertige Prompts stehen in
> [`KI-BILDER-NEUE-HOTELS.md`](KI-BILDER-NEUE-HOTELS.md), Block 2. Grund: Bei
> Stockfotos mit Menschen sind die Gesichter real und identifizierbar — in einem
> veröffentlichten Prototyp ist das die unangenehmere Variante.

| Datei | Motiv |
|---|---|
| `hero/hero-3.png` | Gruppe lachender Freunde am Strand bei Gegenlicht, von hinten oder halbnah, mediterran |
| `hero/hero-4.png` | Paar auf einer Terrasse mit Meerblick beim Frühstück, entspannt, warmes Morgenlicht |
| `hero/hero-5.png` | Familie am flachen Wasser, Kinder planschen, sonniger Nachmittag |
| `hero/hero-6.png` | Zwei Personen auf Wanderweg in Bergen mit Meerblick, Rückenansicht |

**Wichtig methodisch:** Personen im Header sind unproblematisch — der Header ist
Dekoration und für alle Teilnehmenden identisch, also über die Bedingungen
konstant. Personen in *Hotelbildern* bleiben ausgeschlossen, weil sie dort als
Gäste oder Personal gelesen werden und die Wahrnehmung des Angebots verändern.

Rückenansichten und Halbtotalen sind besser als Porträts: weniger
Identifizierbarkeit, weniger Ablenkung.

### 2. Zimmerkategorie-Bilder (36 Bilder) · Stock

**Die größte offene Lücke.** Jedes Hotel hat drei Zimmerkategorien
(z. B. Superior, Deluxe mit Balkon, Panorama-Suite), aber bei der Auswahl steht
kein Bild dabei. Echte Buchungsportale zeigen dort immer eines.

26 Hotels × 3 Kategorien = 78 Bilder (seit dem Katalogausbau), Ablage:
`hotels/<ordner>/zimmer-1.png` bis `zimmer-3.png`

Suchlogik kann die vorhandene Pipeline übernehmen — Kategorie „zimmer" plus der
Zimmername als Motiv (`Suite`, `Doppelzimmer mit Balkon`, `Familienzimmer`).

### 3. Kategorie-Kacheln (8 Bilder) · Stock

Auf der Startseite stehen bei „Wonach suchst du?" nur Icons. Mit Fotos wirkt der
Block deutlich hochwertiger — so wie die Regionskacheln jetzt schon.

`kategorien/strand.png`, `boutique.png`, `familie.png`, `finca.png`,
`stadt.png`, `luxus.png`, `budget.png`, `apart.png`

---

## Mittel — lohnt sich, ist aber kein Bruch

### 4. Mehr Galeriebilder je Unterkunft (36 Bilder) · Stock

Aktuell fünf je Hotel, vier je Wohnung. Echte Portale zeigen 15 bis 30. Drei
weitere je Hotel (`6.png` bis `8.png`) würden die Galerie glaubwürdiger machen,
ohne den Aufwand zu sprengen.

### 5. Bewertungs-Avatare (12 Bilder) · KI

Die Gästebewertungen zeigen nur den Anfangsbuchstaben im Kreis. Kleine
Porträtbilder wirken echter. **Hier bewusst KI statt Stock:** erfundene Gesichter
statt realer Personen, das vermeidet Persönlichkeitsrechte-Fragen bei
identifizierbaren Menschen in einem veröffentlichten Prototyp.

### 6. Agent-Avatar (1 Bild) · KI

Im Panel links steht ein Icon. Ein eigenes Bildzeichen für den Agenten würde ihm
mehr Charakter geben — bewusst abstrakt, nicht menschlich, damit keine
Erwartungshaltung an eine Person entsteht (relevant für die Studie).

---

## Niedrig — nur wenn Zeit bleibt

### 7. Kopfbilder für die Infoseiten (5 Bilder) · Stock
Studie, Team, Ablauf, Datenschutz, Kontakt — je ein ruhiges Motiv.

### 8. Buchungsbestätigung (1 Bild) · Stock
Etwas Feierliches auf der Bestätigungsseite, z. B. Sonnenuntergang am Meer.

### 9. Fluggesellschaften (10 Bilder) · Stock
Flugzeuge am Gate oder Kabineninnenraum. **Vorsicht:** Fluglinien-Bemalung ist
markenbehaftet — Innenraum- oder Detailaufnahmen wählen, keine Hecks mit Logo.

---

## Zusammenfassung

| Priorität | Bilder | davon KI | davon Stock |
|---|---|---|---|
| Hoch | 90 | 4 | 86 |
| Mittel | 49 | 13 | 36 |
| Niedrig | 16 | 0 | 16 |
| **Gesamt** | **155** | **17** | **138** |

Zahlen aktualisiert am 15.08.2026: Die Zimmerbilder sind mit dem Katalogausbau
von 36 auf 78 gewachsen, die Header sind von Stock auf KI gewechselt.

Der Löwenanteil geht über Pexels und läuft damit automatisiert. Nur die
Avatare und der Agent-Marker brauchen KI.

**Vorschlag:** Mit den 48 aus „Hoch" anfangen. Die vier Header-Bilder sind
schnell erledigt, die 36 Zimmerbilder schließen die auffälligste Lücke.
