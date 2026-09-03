# Bildprüfung — verbindlich vor dem Einbau

**Regel: nach jeweils 10 geholten Bildern wird geprüft.** Nicht erst am Ende.
`stock-holen.py` erinnert automatisch daran.

```bash
node bilder/pruefen.mjs        # Kontaktbogen bauen
open bilder/pruefung.html      # durchsehen
```

## Der Maßstab: Gesamtvibe, nicht Perfektion

Es geht nicht darum, dass jedes Bild exakt der Bildregie entspricht. Es geht
darum, dass ein Listing **glaubwürdig nach Urlaub aussieht**. Ein Abendbild statt
Mittagslicht, ein etwas anderer Einrichtungsstil, ein Innenhof statt einer
Terrasse — alles unproblematisch.

Wenn ein Bild gut ist, aber nicht zum Hotelnamen oder Standort passt: **eher den
Namen oder Ort im Katalog anpassen als das Bild verwerfen.** Das geht schneller
und kostet keine Bildqualität.

## Nur diese vier Gründe rechtfertigen ein Aussortieren

| # | Ausschlussgrund | Warum |
|---|---|---|
| 1 | **Lesbare Marken- oder Hotelnamen** | Markenbekanntheit wirkt auf Vertrauen und wäre in der Auswertung nicht mehr vom Agenten-Effekt trennbar |
| 2 | **Erkennbare reale Gebäude** (bekannte Hotels, Wahrzeichen) | gleicher Grund |
| 3 | **Personen im Vordergrund** | Buchungsportale zeigen leere Räume; Personen wären ein Störfaktor |
| 4 | **Passt gar nicht zum Urlaub** | z. B. Vorstadt-Schlafzimmer, Büroflur, Winterlandschaft |

Bekannte öffentliche Wahrzeichen des Reiseziels selbst (etwa die Kathedrale von
Palma) sind **kein** Ausschlussgrund — sie sind kein Wettbewerbershotel und auf
echten Buchungsseiten üblich.

## Was ausdrücklich KEIN Ausschlussgrund ist

- Abend-, Nacht- oder Dämmerungsaufnahmen
- Anderer Einrichtungsstil als in der Bildregie beschrieben
- Anderer Bildausschnitt als geplant (Detail statt Übersicht)
- Leicht abweichende Region, solange es mediterran und nach Urlaub aussieht
- Zwei ähnliche Motive innerhalb eines Hotels

## Aussortieren und zurückholen

```bash
# dauerhaft sperren, mit Grund
node bilder/verwerfen.mjs hotels/h02-hotel-arenal-blau/2.png "Hotelname lesbar"

# doch wieder aufnehmen (lädt über die Pexels-ID neu)
python3 bilder/zurueckholen.py hotels/h02-hotel-arenal-blau/2.png
python3 bilder/zurueckholen.py --alle
```

`verwerfen.mjs` schreibt die Foto-ID in `verworfen.json`. Ohne diese Sperre
liefert Pexels beim nächsten Lauf dieselbe Aufnahme wieder — das war anfangs ein
echtes Problem.

## Bei den KI-Bildern

Gleiche vier Gründe. Schwerpunkt liegt hier auf Punkt 1: KI-Bilder erfinden gern
Schriftzüge auf Schildern und Fassaden. Reale Gebäude sind dafür kein Thema.

## Stand festhalten

Jeder Eintrag in `bilder/generiert/bildquellen.json` hat ein Feld `geprueft`.
`node bilder/pruefen.mjs --offen` zeigt nur die noch ungeprüften.
