# Katalogausbau Winter, 01.11.2026 - vorbereitet, NICHT eingebaut

293 neue Häuser (h219 bis h511) und 42 neue Ferienwohnungen (a161 bis a202),
alle in den **bestehenden 18 Regionen**. Jede Region hat danach mindestens
28 Häuser. Nichts davon ist in `data/hotels.js`
oder `data/inventory.js` eingetragen, nichts ist nach `bilder/generiert/`
kopiert, `data/bildpfade.js` ist unverändert.

Vier zusätzliche Regionen waren vorbereitet und sind am 01.11.2026
**zurückgestellt** worden, sie liegen in `zurueckgestellt/` mit eigener
Begründung. Entscheidung: Die Zahl der Regionen bleibt bei 18, dafür wird
jede einzelne tiefer.

## Warum diese Verteilung

Gemeldet war: zu wenig Orte, im Winter lassen sich Vorgaben nicht einhalten.
Die Gesamtzahl im Winter war nicht das Problem (Januar 127 buchbare Häuser
gegen 135 im Juli). Entscheidend ist, **wie viele Häuser je Region eine
Filterkette überleben** - und ob daraus noch ein preislich vergleichbarer
Dreier wird. Ohne Vergleichbarkeit entscheidet am Ende der Preis und nicht
das, was die Studie messen will.

Die Zielmarke stammt vom Nutzer: **mindestens vier Häuser mit ähnlichem
Preis** in jeder Kombination, damit das Partnerlabel entscheidet und nicht
der Preis. Gemessen über sechs übliche Filterketten mal 18 Regionen,
Kombinationen ohne Sinn (Strand in Wien, Pool in Lappland) herausgerechnet,
Preisspanne bis +30 %:

| | Fälle ohne vier preislich ähnliche Häuser |
|---|---|
| Bestand heute | 46 von 82 |
| mit diesem Ausbau | **0 von 82** |

Die Häuser sind nicht beliebig gewählt: Zu jeder Lücke wurde zuerst das
Preisband der vorhandenen Treffer berechnet und dann ein Haus geschrieben,
dessen Grundpreis in dieses Band fällt. Dabei ist zu beachten, dass der
Gruppenpreis über dem Grundpreis liegt - bei Budgethäusern um 20 Euro für
zwei Personen mit Frühstück. Ein Haus mit 132 Euro Grundpreis fiel deshalb
aus der 150-Euro-Grenze heraus und musste auf 124 korrigiert werden.

Der alte, globale Engpass bleibt davon unberührt:

| Fall | vorher | nachher |
|---|---|---|
| Oktober, bis 18 Grad, Strand bis 1 km | 5 Regionen, 8 Häuser (alle Ostsee) | 9 Regionen, 70 Häuser |
| Dezember, bis 18 Grad, Strand bis 1 km | 8 Regionen, 1 Haus | 10 Regionen, 30 Häuser |
| Kalte Regionen in Saison, Mai | 1 | 4 |
| Buchbare Häuser im Winter (Nov bis Mrz, Mittel) | 124 | 284 |
| Buchbare Häuser im Sommer (Jun bis Sep, Mittel) | 135 | 311 |

Winter und Sommer liegen danach im gleichen Verhältnis wie vorher, nur auf
doppeltem Niveau. Hotels gesamt 218 auf 454, Ziele 18 auf 22.

## Was hier liegt

| Datei | Inhalt |
|---|---|
| `neue-ziele.js` | die 4 neuen Ziele (Nordsee, Lofoten, Cornwall, Bretagne) als Block für `data/ziele.js` |
| `h219-h231-nordsee.json` … `h450-h454-sardinien.json` | 22 Hotel-Spezifikationen, je Ziel eine, im Format von `bilder/objekte-bauen.mjs` |
| `a161-a176-…json` … `a229-a234-kyoto.json` | 6 Wohnungs-Spezifikationen, gleiches Format |
| `block-hotels-h219-h454.js` | Katalogblock, 236 Einträge, fertig für `data/hotels.js` |
| `block-wohnungen-a161-a234.js` | Katalogblock, 74 Einträge, fertig für `data/inventory.js` |
| `bildplan.json` | welches Vorratsbild auf welche Position welchen Objekts geht |
| `pruefung.html` | Kontaktbogen aller geplanten Bilder, Titelbild grün umrandet |

Verteilung der neuen Häuser: nordsee 13, lofoten 13, cornwall 12, bretagne 12,
ostsee 14, tirol 13, suedtirol 14, lappland 14, island 14, wien 14, newyork 14,
kyoto 14, barcelona 12, lissabon 12, teneriffa 8, marrakesch 8, kapstadt 8,
krabi 8, mallorca 4, kreta 5, algarve 5, sardinien 5.

Verteilung der neuen Wohnungen: nordsee 8, lofoten 8, cornwall 8, bretagne 8
(diese vier hatten keine einzige), dazu barcelona, wien, lissabon, marrakesch,
kapstadt, newyork und kyoto je 6 - die lagen bei fünf und damit am dünnsten.
Danach hat jede Region mindestens 11 Wohnungen.

## Bilder

Alle aus dem Pexels-Vorrat, keine KI-Bilder. Der Vorrat wurde dafür von 3383
auf 5319 Einträge aufgefüllt (`bilder/ernte-plan.json` um 28 Kombinationen für
die vier neuen Ziele erweitert).

1550 Bilder, je Objekt fünf. Häuser: Position 1 der Ort (Titelbild), 2 und 3
Pool, Wellness, Lobby oder Umgebung, 4 das Zimmer, 5 das Essen. Wohnungen:
1 der Ort, 2 der Wohnraum, 3 die Küche, 4 das Zimmer, 5 die Umgebung, mit
Ersatzthemen wie in `auto-zuordnen-katalog.mjs`. Keine Datei ist zweimal
vergeben, alle 310 Objekte haben ein eigenes Titelbild aus dem Thema "ort".

Die Häuser greifen im Plan vor den Wohnungen zu, weil sie auf Position 1
zwingend "ort" brauchen und Wohnungen dort auch mit "umgebung" auskämen.

Wie bei den Häusern vom 02.10.2026 gibt es keine KI-Außenansicht, das
Titelbild bleibt also Position 1.

**Noch nicht geprüft:** Die 1550 Bilder sind nach Maß und Alt-Text gefiltert,
aber nicht angesehen. Das ist nach `bilder/PRUEFUNG.md` verbindlich und geht über
`pruefung.html`.

## Einbau, wenn es so bleiben soll

```bash
# 1. Bilder aus dem Vorrat kopieren und buchen
node bilder/vorrat-ausbau-winter.mjs --tun
```

Dann von Hand:

2. `neue-ziele.js` als Block in `data/ziele.js` hinter `kyoto` einfügen
   (ohne `const ZIELE_NEU = [` und den Export).
3. `block-hotels-h219-h454.js` in `data/hotels.js` vor der schließenden
   Klammer von `HOTELS` einfügen, `block-wohnungen-a161-a234.js` ebenso in
   `data/inventory.js` vor der schließenden Klammer von `APARTMENTS`.
4. In `bilder/einbauen.mjs` die Konstante `OHNE_AUSSENANSICHT` von 34 auf 270
   Einträge erweitern (h185 bis h454), damit das Titelbild Position 1 bleibt.
5. `node bilder/einbauen.mjs` - verkleinert, legt unter `img/` ab und schreibt
   `data/bildpfade.js` neu.
6. Versionsnummer `?v=` in den sieben HTML-Dateien erhöhen.
7. Prüfen: `node bilder/stand.mjs`, dann die Seitenprüfung im Browser.

Bereits erledigt: `bilder/objekte-bauen.mjs` kennt die vier neuen Ziele in
`KALTE_ZIELE` und `OHNE_POOL`, deshalb haben die neuen Häuser dort keine
Klimaanlage und keinen Außenpool.

## Was noch offen ist

- **Das Verhältnis Hotels zu Wohnungen** verschiebt sich trotzdem: heute
  218 zu 160, nach dem Ausbau 454 zu 234. Wer "beides zeigen" sagt, sieht
  anteilig mehr Hotels als heute. Gleichstand bräuchte rund 100 Wohnungen mehr.
- **Mietwagen und Flüge** für die vier neuen Ziele fehlen ebenfalls. Flüge sind
  nötig, sobald jemand mit Flug sucht, Mietwagen fallen laut Besprechung vom
  30.10. ohnehin aus der Studie.
- **Regionsbilder** gibt es nur für die Mallorca-Teilregionen, die anderen Ziele
  laufen schon jetzt ohne. Kein neuer Mangel, aber bei 22 Zielen sichtbarer.
- **Backup** der betroffenen Dateien liegt in
  `_backup/2026-11-01-vor-katalogausbau-winter/`.
