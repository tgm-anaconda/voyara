# Voyara Agent - Umsetzungskonzept

Stand: 31.08.2026. Grundlage für den Aufbau des simulierten KI-Kaufagenten.

---

## 1. Was gebaut wird

Ein Agent, der im linken Panel sitzt, auf natürliche Sprache reagiert und die
Website danach **selbst bedient**: sucht, filtert, sortiert, Unterkünfte öffnet,
Bewertungen auswertet, vormerkt und bis zur Buchung führt. Sichtbar über einen
eigenen Mauszeiger, der über den Bildschirm fährt, Elemente anfährt und klickt.

Angebunden wird GPT-4o-mini. Das Verhalten ist aber nicht dem Modell überlassen,
sondern in weiten Teilen vorbestimmt (siehe Abschnitt 8) - das ist für eine
Studie keine Einschränkung, sondern die Voraussetzung dafür, dass die Ergebnisse
etwas bedeuten.

---

## 2. Die zentrale Entscheidung: durch die Oberfläche, nicht daran vorbei

Es gäbe einen kurzen Weg: Der Agent ruft `state.stars.add(5)` auf und rendert
neu. Das wäre in einer Stunde gebaut und **sieht falsch aus**. Der Filter würde
umspringen, ohne dass jemand ihn angefasst hat.

Der Weg, den wir gehen: **Jede Aktion des Agenten endet auf einem echten
DOM-Element.** Der Agent bewegt den Zeiger zur Checkbox "5 Sterne", hält kurz,
klickt - und der bestehende Click-Handler in `results.js` macht den Rest. Der
Agent hat keinen Sonderzugang zum Zustand.

Das kostet mehr Arbeit und bringt drei Dinge:

1. **Es sieht echt aus**, weil es echt ist. Jede Zustandsänderung hat einen
   sichtbaren Auslöser.
2. **Kein zweiter Codepfad.** Was der Agent kann, kann der Mensch auch, und
   umgekehrt. Keine Divergenz zwischen "Agent-Logik" und "UI-Logik".
3. **Der Vergleich in der Studie wird sauber.** Kontrollgruppe und Agentengruppe
   lösen dieselbe Aufgabe über dieselben Bedienelemente.

Konsequenz: Wenn der Agent etwas tun soll, wofür es kein Bedienelement gibt,
muss erst das Bedienelement gebaut werden. Kein Sonderweg.

---

## 3. Architektur

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│                                                              │
│  agent/kern.js        Ablaufsteuerung, überlebt Seitenwechsel│
│  agent/politik.js     Vorbestimmtes Verhalten + Fehler       │
│  agent/werkzeuge.js   Aktionen -> DOM-Elemente               │
│  agent/zeiger.js      Mauszeiger, Bewegung, Klick, Tippen    │
│  agent/protokoll.js   Ereignisprotokoll                      │
│  agent/studie.js      Teilnehmer-ID, Bedingung, Seed         │
│                                                              │
│  components.js        AgentPanel (Anzeige) - vorhanden       │
└───────────────────────┬─────────────────────────────────────┘
                        │  POST /api/agent   (nur Text, keine Schlüssel)
┌───────────────────────▼─────────────────────────────────────┐
│  Vercel Serverless                                           │
│  api/agent.js   Systemprompt + Werkzeugschema + OpenAI-Aufruf│
│  api/log.js     Nimmt Ereignisprotokolle entgegen            │
└──────────────────────────────────────────────────────────────┘
```

Sechs neue Dateien im Browser, zwei auf dem Server. Kein Framework, kein
Build-Schritt - passt zum bestehenden Aufbau.

---

## 4. Schicht: Der Zeiger (`agent/zeiger.js`)

Das ist die Schicht, die über "wirkt echt" oder "wirkt billig" entscheidet.

### Aufbau

Ein `<div id="agentZeiger">` direkt im `<body>`, `position: fixed`,
`pointer-events: none`, `z-index` über allem. Darin ein SVG-Pfeil plus ein
kleines Label ("Agent"), damit nie Zweifel besteht, wer hier klickt.

### Bewegung

Lineare Bewegung von A nach B liest sich sofort als Maschine. Was echt wirkt:

- **Bézier statt Gerade.** Ein Kontrollpunkt seitlich versetzt, Stärke abhängig
  von der Distanz. Der Zeiger fährt eine leichte Kurve.
- **Beschleunigen und Abbremsen** über `easeInOutCubic`.
- **Dauer distanzabhängig**, nicht konstant: `160 ms + Distanz * 0.35 ms`,
  gedeckelt bei etwa 900 ms. Kurze Wege schnell, lange Wege spürbar.
- **Leichtes Überschwingen** bei langen Wegen: 4 bis 8 Pixel über das Ziel
  hinaus, dann zurück. Das ist der Effekt, der am meisten ausmacht.
- **Kein Pixelraster.** Subpixel über `transform: translate3d`.

### Vor dem Klick

1. **Ziel in den Blick holen.** Liegt das Element außerhalb des Viewports,
   erst `scrollIntoView({behavior:"smooth", block:"center"})`, warten bis der
   Scroll steht, dann erst den Zeiger bewegen. Ein Agent, der auf ein Element
   klickt, das man nicht sieht, zerstört die Illusion sofort.
2. **Zielpunkt streuen.** Nicht exakt die Mitte, sondern Mitte plus/minus 15 %
   der Elementgröße. Millimetergenaue Treffer wirken maschinell.
3. **Hover halten.** Klasse `agent-hover` auf das Element, 120 bis 250 ms
   Pause. Menschen klicken nicht im selben Moment, in dem der Zeiger ankommt.
4. **Klick zeigen.** Kurzes Zusammenziehen des Zeigers plus ein auslaufender
   Ring an der Klickposition.
5. **Echtes Ereignis auslösen:** `pointerdown`, `mousedown`, `mouseup`,
   `click` in dieser Reihenfolge, mit korrekten Koordinaten. Kein
   `element.click()` als Abkürzung, sonst laufen Handler, die auf
   `pointerdown` hören, ins Leere.

### Tippen

Zeichen für Zeichen mit gestreuter Verzögerung (55 bis 110 ms), nach jedem
Zeichen ein `input`-Ereignis, am Ende `change`. Bei Datumsfeldern kein Tippen,
sondern Wert setzen plus `change` - Datumseingaben sind im Browser ohnehin
kein Zeichen-für-Zeichen-Vorgang.

### Denkpause

Solange auf das Modell gewartet wird: Statuszeile auf "denkt nach", der Zeiger
bekommt einen leisen Puls und driftet minimal (2 bis 3 Pixel, langsam). Ein
vollkommen stillstehender Zeiger wirkt eingefroren.

### Ein Geschwindigkeitsregler

Alle Zeiten hängen an einer Konstante `TEMPO` (Standard 1.0). Für Pilottests
lässt sich damit die gesamte Choreografie beschleunigen, ohne 40 Zahlen
anzufassen. **Das Tempo ist eine Studienvariable**: zu schnell wirkt unheimlich,
zu langsam wirkt inkompetent. Im Pilot festlegen und danach einfrieren.

---

## 5. Schicht: Die Werkzeuge (`agent/werkzeuge.js`)

Das Modell bekommt keine DOM-Befehle, sondern eine kleine, geprüfte Liste
fachlicher Werkzeuge. Jedes davon löst sich intern in Zeigerbewegungen auf.

| Werkzeug | Wirkung auf der Seite |
|---|---|
| `suchen` | Reiseziel tippen, Daten setzen, Belegung wählen, "Suchen" klicken |
| `filter_setzen` | Checkboxen und Regler in der linken Filterspalte klicken |
| `sortieren` | Auswahlfeld "Sortieren" bedienen |
| `ergebnisse_lesen` | Scrollt die Liste durch, liefert die Treffer als Daten |
| `unterkunft_oeffnen` | "Details ansehen" klicken, Seitenwechsel |
| `bewertungen_lesen` | Auf der Detailseite zu den Bewertungen scrollen, Aspektbilanz lesen |
| `merken` | Herz-Symbol klicken |
| `zur_buchung` | Buchungsknopf klicken |
| `antworten` | Nur Text ins Panel, keine Seitenaktion |

### `bewertungen_lesen` ist das Herzstück

Hier zahlt sich die Arbeit an `data/bewertungen.js` aus. Das Werkzeug ruft
`aspektKurzfassung(item)` auf und liefert dem Modell:

```json
{
  "name": "Vale Dourado",
  "note": 4.8,
  "anzahl": 614,
  "gelobt": ["Essen", "Lage"],
  "kritisiert": ["Preis-Leistung"],
  "bilanz": [
    { "aspekt": "Essen", "erwaehnungen": 212, "anteilPositiv": 0.89 },
    { "aspekt": "Preis-Leistung", "erwaehnungen": 143, "anteilPositiv": 0.52 }
  ]
}
```

Damit kann der Agent Sätze sagen, die ein Mensch nur nach langem Lesen sagen
könnte: "Von 614 Bewertungen loben 89 Prozent das Essen, beim Preis sind aber
nur gut die Hälfte zufrieden." **Das ist der sichtbare Mehrwert des Agenten**
und damit der Kern dessen, was die Studie misst. Ohne dieses Werkzeug ist der
Agent nur eine schnellere Suchmaske.

### Was das Modell über die Seite erfährt

Nicht das DOM. Ein kompakter Zustandsbericht, bei jedem Zug neu:

```json
{
  "seite": "results",
  "typ": "hotel",
  "reisezeitraum": { "von": "2026-10-12", "bis": "2026-10-19" },
  "belegung": { "erwachsene": 2, "kinder": 0 },
  "aktiveFilter": { "sterne": [4,5], "maxPreis": 200 },
  "trefferGesamt": 12,
  "treffer": [
    { "id": "h30", "name": "Vale Dourado", "preis": 268, "note": 4.8,
      "sterne": 5, "ort": "Carvoeiro", "strand": 0.3 }
  ]
}
```

Nur die ersten acht bis zehn Treffer. Will das Modell mehr wissen, muss es
erst filtern oder sortieren - genau wie ein Mensch. Hält die Anfragen klein
und das Verhalten plausibel.

---

## 6. Schicht: Seitenwechsel überleben (`agent/kern.js`)

**Das ist das größte technische Problem.** Die Seite ist mehrseitig, jeder
Wechsel lädt alles neu, das Panel wird neu aufgebaut. Ein Agent, der beim Öffnen
eines Hotels sein Gedächtnis verliert, ist unbrauchbar.

Lösung: Der gesamte Lauf liegt in `sessionStorage`:

```js
{
  laufId: "r_8f3a",
  teilnehmer: "p_214",
  bedingung: "agent_hoch",
  status: "laufend",           // leer | laufend | wartet_auf_nutzer | fertig
  auftrag: "Hotel am Strand für 2 Personen im Oktober",
  verlauf: [ /* Nachrichten und Werkzeugaufrufe */ ],
  offeneSchritte: [ /* was nach dem Seitenwechsel noch kommt */ ],
  zeigerPosition: { x: 840, y: 460 }
}
```

Ablauf beim Laden jeder Seite:

1. `AgentPanel.mount()` liest `sessionStorage`.
2. Verlauf wird in die Nachrichtenliste zurückgeschrieben, damit das Gespräch
   nicht abreißt.
3. Der Zeiger erscheint **an genau der Position, an der er vor dem Wechsel
   war**, nicht in der Bildschirmmitte. Ohne das springt er bei jedem
   Seitenwechsel und der Eindruck ist zerstört.
4. Steht `status: "laufend"`, läuft die Schleife weiter - ohne dass der Nutzer
   noch einmal etwas eingeben muss.

Zusätzlich: Der Ladevorgang selbst dauert. Damit dort keine Lücke entsteht,
bekommt die Statuszeile schon vor der Navigation den Text "öffne Vale Dourado",
und dieser Text steht nach dem Laden noch da. Der Bruch wird überbrückt.

---

## 7. Schicht: Die Modellanbindung (`api/agent.js`)

### Der Schlüssel darf nie in den Browser

Ein OpenAI-Schlüssel in einer statischen Seite ist innerhalb von Sekunden
auslesbar. Deshalb eine Serverless-Funktion auf Vercel:

```
Browser  ──POST /api/agent──►  Vercel Function  ──►  OpenAI
         ◄──Werkzeugaufruf──   (Schlüssel als
                                Umgebungsvariable)
```

Der Browser schickt nur Gesprächsverlauf und Seitenzustand. Systemprompt und
Werkzeugschema liegen **auf dem Server**. Das ist nicht nur eine Frage der
Sicherheit: Läge der Systemprompt im Browser, könnten Teilnehmende ihn lesen
oder verändern, und der Lauf wäre für die Auswertung wertlos.

### Absicherung

- Höchstens 12 Werkzeugaufrufe je Auftrag, danach Abbruch mit fester Meldung.
- `temperature: 0.2` - über alle Teilnehmenden möglichst gleiches Verhalten.
- `max_tokens` gedeckelt.
- Einfache Ratenbegrenzung je Teilnehmer-ID.
- Jede vom Modell genannte Objekt-ID wird **serverseitig gegen den Katalog
  geprüft**. Erfundene IDs werden nicht durchgereicht.

### Wenn das Modell ausfällt

Netzfehler, Zeitüberschreitung, Kontingent erschöpft: Eine Studiensitzung darf
daran nicht sterben. Fällt die Anbindung aus, übernimmt ein hinterlegtes
Skript den Auftrag (Abschnitt 8) und der Lauf wird als `modell_ausfall`
protokolliert. Für die Teilnehmenden ändert sich nichts Sichtbares.

---

## 8. Schicht: Vorbestimmtes Verhalten (`agent/politik.js`)

Der Punkt, der über die Verwertbarkeit der ganzen Arbeit entscheidet.

### Das Problem

Lässt man GPT-4o-mini frei entscheiden, macht es bei zwanzig Teilnehmenden
zwanzig unterschiedlich gute Läufe. Einer bekommt einen Agenten, der klug
filtert und gut begründet, der nächste einen, der die Personenzahl vergisst.
Am Ende misst die Studie die Streuung des Modells, nicht den Effekt des
Agenten. **Das wäre ein Konstruktvaliditätsproblem, das man in der Verteidigung
nicht mehr geradebiegt.**

### Die Lösung: Zweiteilung

- **Das Modell versteht und formuliert.** Freitext zu Absicht, und die Antworten
  im Panel in natürlicher Sprache.
- **Eine feste Politik handelt.** Aus der erkannten Absicht ergibt sich eine
  festgelegte Schrittfolge.

Beispiel. Eingabe: *"Ich will was Günstiges am Strand für zwei Personen im
Oktober."*

Das Modell liefert nur:
```json
{ "typ": "hotel", "strandnah": true, "budget": "niedrig",
  "erwachsene": 2, "monat": 10 }
```

Die Politik führt dann immer dieselbe Folge aus:
```
suchen(typ, monat, belegung)
  -> filter_setzen(maxStrand: 1)
  -> sortieren(preis-asc)
  -> ergebnisse_lesen(5)
  -> bewertungen_lesen(bester Treffer)
  -> unterkunft_oeffnen(bester Treffer)
  -> antworten(vom Modell formuliert)
```

Jede teilnehmende Person sieht dieselbe Art von Vorgehen. Nur die Formulierung
unterscheidet sich - und die ist für die Messung unkritisch.

Für jede Aufgabenart der Studie wird eine solche Folge hinterlegt. Das sind
überschaubar viele, weil die Studienaufgaben ohnehin feststehen.

---

## 9. Fehlerinjektion

Wenn gemessen werden soll, wie Menschen auf einen fehlerhaften Agenten
reagieren, müssen die Fehler kontrolliert sein.

**Nicht** das Modell "absichtlich schlecht" prompten - das ist nicht steuerbar
und nicht reproduzierbar. Stattdessen greift die Politik-Schicht ein:

| Fehlerart | Umsetzung |
|---|---|
| Falscher Filter | Setzt 3 statt 5 Sterne, sichtbar in der Filterspalte |
| Kriterium übergangen | Wählt ein Haus ohne Pool, obwohl Pool gewünscht war |
| Falsche Behauptung | Nennt im Text einen Preis, der von der Karte abweicht |
| Übereifer | Merkt etwas vor, das nicht verlangt war |

Eigenschaften, die alle vier haben müssen:

- **Deterministisch** über einen Seed aus der Teilnehmer-ID. Person 214 bekommt
  reproduzierbar denselben Fehler an derselben Stelle.
- **Protokolliert** mit Zeitpunkt und Art.
- **Korrigierbar.** Sagt jemand "Nein, ich wollte 5 Sterne", muss der Agent das
  einsehen und beheben. Die Reaktion darauf ist wahrscheinlich eine der
  interessantesten Messgrößen.
- **Sichtbar, nicht verborgen.** Ein Fehler, den niemand bemerken kann, erzeugt
  keine Daten.

---

## 10. Protokollierung (`agent/protokoll.js`)

Jedes Ereignis mit Zeitstempel, Lauf-ID und Bedingung:

- Nutzereingaben und Zeit bis zur ersten Eingabe
- Antwortzeit des Modells, Tokenverbrauch
- Jeder Werkzeugaufruf mit Argumenten und Ergebnis
- Jede Zeigeraktion mit Ziel
- **Eigene Klicks der teilnehmenden Person** (übernimmt sie? wann? nach welchem
  Agentenschritt?)
- Injizierte Fehler und ob sie bemerkt wurden
- Ergebnis: gebucht, abgebrochen, Zeit bis zur Entscheidung

Ablage: Zwei Wege, die sich ergänzen.

1. **Lokal** in `localStorage`, am Ende als kompakter Code ausgegeben, den die
   Person in den Fragebogen kopiert. Funktioniert immer, auch ohne Netz.
2. **Server** über `POST /api/log` in einen Speicher (Vercel KV oder Upstash,
   beide mit ausreichendem Gratiskontingent). Sicherer gegen Datenverlust.

Empfehlung: beides. Der Fragebogen-Code ist die Rückfallebene, wenn der
Serverspeicher klemmt. Eine verlorene Sitzung ist bei einer Stichprobe von
vielleicht 60 Personen ein spürbarer Verlust.

---

## 11. Übernahme durch die teilnehmende Person

Das Panel verspricht bereits: "Du kannst jederzeit selbst weiterklicken."
Wenn dabei aber gleichzeitig der Agent klickt, entsteht Chaos.

Lösung: **weiche Sperre.** Während einer Agentenaktion liegt eine unsichtbare
Fläche über dem Inhalt. Ein Klick darauf löst nicht den Klick aus, sondern
hält den Agenten an ("Agent angehalten. Du hast übernommen."). Danach ist die
Seite frei, der Agent wartet.

Vorteile: keine widersprüchlichen Zustände, und der Übernahmezeitpunkt ist eine
saubere Messgröße - vermutlich eine der aussagekräftigsten der ganzen Studie.

---

## 12. Grenze: Darf der Agent buchen?

**Entschieden am 31.08.2026:** Es wird beides gebaut, und der Autonomiegrad
wird ein Schalter, keine feste Eigenschaft.

Die Grundversion verhält sich so: Der Agent führt bis zur Buchungsseite und
**fragt dort nach** - "Soll ich die Buchung abschließen oder möchtest du das
selbst machen?". Die Person entscheidet im Einzelfall.

Darunter liegt eine Konstante `AUTONOMIE` mit drei Stufen:

| Stufe | Verhalten |
|---|---|
| `assistiert` | Agent hält vor dem Buchungsknopf an, Mensch klickt |
| `nachfrage` | Agent fragt und handelt nach Antwort (Standard) |
| `autonom` | Agent bucht selbst, mit Ankündigung und Widerspruchsfenster |

Damit ist die spätere Variation zwischen Gruppen eine Zeile Code, und beim
Vorführen lassen sich alle drei Stufen nacheinander zeigen. Welche Stufe im
Experiment tatsächlich variiert wird, entscheidet sich später gemeinsam mit
dem Betreuer.

Unverändert gilt: keine Zahlungsdaten, sichtbarer Hinweis auf die simulierte
Buchung. Beides ist in `checkout.js` bereits so umgesetzt.

### Was das für den Aufbau heißt

Ziel der jetzigen Ausbaustufe ist eine **vorführbare Grundversion**, an der die
Bandbreite des Möglichen sichtbar wird. Alles, was später eine experimentelle
Variable werden könnte, wird deshalb als benannte Konstante an einer Stelle
gebündelt und nicht im Code verstreut:

```js
const STELLSCHRAUBEN = {
  autonomie: "nachfrage",     // assistiert | nachfrage | autonom
  tempo: 1.0,                 // Geschwindigkeit des Zeigers
  fehler: "keine",            // keine | filter | kriterium | behauptung
  begruendung: "ausfuehrlich",// knapp | ausfuehrlich
  initiative: "abwartend",    // abwartend | vorschlagend
};
```

Diese Tabelle ist gleichzeitig die Vorlage für das Gespräch mit dem Betreuer:
Sie zeigt auf einen Blick, was sich variieren ließe.

## 13. Reihenfolge des Aufbaus

Jeder Schritt ist für sich lauffähig und vorführbar.

| # | Schritt | Ergebnis | Stand |
|---|---|---|---|
| 1 | `zeiger.js` | Zeiger fährt, klickt, tippt sichtbar | **fertig** |
| 2 | `werkzeuge.js` | Neun Werkzeuge auf echten Bedienelementen | **fertig** |
| 3 | `kern.js` mit `sessionStorage` | Überlebt Seitenwechsel | **fertig** |
| 4 | `politik.js` | Verhalten reproduzierbar, Fehlerinjektion vorbereitet | **fertig** |
| 5 | `bewertungen_lesen` | Aspektbilanz im Panel | **fertig** |
| 6 | `api/agent.js` + Modellanbindung | Reagiert auf freien Text statt Schlüsselwörtern | offen |
| 7 | `protokoll.js` + `api/log.js` | Daten fließen | offen |
| 8 | Fehlerinjektion scharf schalten | Zweite Bedingung steht | offen |
| 9 | Studien-Zuweisung, Tempo einfrieren | Pilotreif | offen |

Die Schritte 1 bis 5 stehen. Der Agent ist damit **ohne Modellanbindung
vorführbar** - kein Token verbraucht, kein Schlüssel nötig. Das ist der
richtige Zeitpunkt, das Zeigergefühl an zwei, drei Leuten zu prüfen und die
Stellschrauben mit dem Betreuer durchzugehen, bevor darauf aufgebaut wird.

Was der Agent heute kann, in einem Durchlauf: Suchmaske ausfüllen (Ziel tippen,
Datum, Reisegruppe über die Stepper), Filter in der linken Spalte klicken,
sortieren, die Trefferliste durchgehen, das passendste Haus öffnen, dessen
Bewertungen auswerten und das Ergebnis begründen. Dazwischen zwei
Seitenwechsel, die er ohne Gedächtnisverlust übersteht.

---

## 14. Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Zeiger wirkt mechanisch | Bézier, Überschwingen, gestreute Zielpunkte, Hover-Pause |
| Bruch beim Seitenwechsel | Zeigerposition und Status in `sessionStorage`, Statustext überbrückt das Laden |
| Modell erfindet Objekt-IDs | Prüfung gegen den Katalog auf Server und im Browser |
| Modellstreuung verfälscht die Messung | Politik-Schicht, `temperature: 0.2` |
| Ausfall der Anbindung mitten im Test | Skript-Rückfallebene, Lauf wird markiert |
| Kosten | 4o-mini ist günstig; Zugdeckelung und kompakter Seitenzustand |
| Datenverlust | Zwei Ablagewege |

---

## 15. Entscheidungen und offene Punkte

**Entschieden:**

1. **Autonomiegrad** - alle drei Stufen werden gebaut, Standard ist `nachfrage`
   (Abschnitt 12). Die Variation im Experiment wird später festgelegt.
2. **Ablage der Protokolle** - beides: Server über `/api/log` und
   Fragebogen-Code als Rückfallebene (Abschnitt 10).
3. **Politik-Schicht** - wird gebaut wie in Abschnitt 8 beschrieben.
4. **Reihenfolge** - Zeiger zuerst (Schritte 1 bis 3), damit die Grundversion
   ohne Modellanbindung vorführbar ist.

**Offen, bewusst später:**

- Welche Stellschraube im Experiment tatsächlich variiert wird - Entscheidung
  gemeinsam mit dem Betreuer, auf Grundlage der vorgeführten Grundversion.
- Tempo des Zeigers: im Pilot festlegen und danach einfrieren.
- Stichprobengröße und daraus folgend, ob eine oder zwei Variablen variiert
  werden können.

---

## 16. Transparenz als mögliche Manipulationsgröße

Nachtrag aus der Erprobung. Der Agent legt seit v=80 beim Ergebnis offen,
worauf seine Reihenfolge beruht - und zwar getrennt von dem, was er während
der Arbeit meldet.

**Zwei Ebenen, bewusst verschieden ausführlich:**

| wann | was der Agent sagt |
|---|---|
| während der Arbeit | knapp und allgemein: "sucht…", "setzt Filter…", "vergleicht…" |
| beim Ergebnis | die Herleitung: wie viele Häuser blieben, was schwerer wog, welche Zahl den Ausschlag gab, und was er *nicht* geprüft hat |

Beispiel für die zweite Ebene, alle Zahlen aus den Daten:

> Grundlage: Nach deinen Vorgaben (bis 180 €) bleiben 8 Häuser. Davon habe ich
> 5 im Detail durchgesehen. Für die Reihenfolge zählt bei mir zuerst, was du
> genannt hast - Sauberkeit -, danach Gesamtnote und Preis. Baan Suan Retreat
> steht vorn, weil 94 Prozent der 93 Erwähnungen zu Sauberkeit positiv sind -
> der höchste Wert der Auswahl. Nicht geprüft habe ich Verfügbarkeit und
> Stornobedingungen - die stehen auf der Detailseite.

Der letzte Satz ist Absicht: Ein Agent, der nur seine Stärken nennt, ist nicht
transparent, sondern wirbt. Die Grenze mitzunennen gehört dazu.

**Als Variable:** `STELLSCHRAUBEN.begruendung` steuert, wie viel der Agent über
sein eigenes Handeln preisgibt.

- `knapp` - nur der Vorschlag, keine Herleitung
- `ausfuehrlich` - Vorschlag mit Zahlen und offengelegter Grundlage

Zuweisbar über die Adresse (`?begruendung=knapp`), haltbar über die Sitzung.
Damit lässt sich prüfen, ob Nachvollziehbarkeit das Vertrauen und die
Übernahmebereitschaft verändert - unabhängig von der Autonomiestufe, die an
einer anderen Stelle greift.

**Noch offen:** ob eine dritte Stufe sinnvoll ist, die die Herleitung auch
*während* der Arbeit ausspielt statt nur am Ende. Auf dem Handy spricht der
Platz dagegen, am Rechner wäre es möglich. Das wäre dann eher eine Frage des
Zeitpunkts als des Umfangs - und damit eine eigene Variable.

---

## 17. Wie die Auswahl zustande kommt

Für die Vergleichbarkeit zwischen Teilnehmenden braucht die Auswahl ein
festes Verfahren. Es gibt zwei, und eine feste Schwelle dazwischen. Beide
sind deterministisch: dieselbe Eingabe führt bei jeder Person zur selben
Auswahl.

### Harte Vorgaben gehen vor

Zuerst die Unterscheidung, die über allem steht: Was die Person
ausdrücklich sagt, ist keine Präferenz, sondern eine **Bedingung**.

| Angabe | wirkt als |
|---|---|
| Reiseziel ("nach Mallorca") | Ausschluss |
| Preisobergrenze ("höchstens 300 €") | Ausschluss |
| Personenzahl ("für zwei") | Ausschluss |
| Entfernung zum Strand ("höchstens 1 km") | Ausschluss |
| Sauberkeit, Ruhe, Essen, Service … | Gewicht in der Reihenfolge |

Wer 300 Euro als Grenze nennt, bekommt keinen Vorschlag für 320 - auch
nicht, wenn der besser bewertet wäre. Vorher war der Preis nur ein
Punktabzug im Ranking; ein teureres Haus konnte also trotzdem oben landen.
Das ist jetzt ein Ausschluss.

Die Ergebnisseite filtert das bereits über Regler und Auswahlfelder.
`Politik.erfuellt()` prüft es davor noch einmal - würde ein Bedienelement
einmal nicht greifen, fiele es hier auf. Bleibt danach nichts übrig,
schlägt der Agent **nichts** vor, sondern sagt, welche Grenze im Weg steht
und bittet darum, eine davon zu lockern. Ein Haus vorzuschlagen, das eine
genannte Grenze reißt, wäre kein Vorschlag, sondern ein Übergehen.

Die Spreizung arbeitet immer **innerhalb** dieser Bedingungen. Bei
"Mallorca, höchstens 120 €" kamen 89, 96 und 102 Euro heraus - gespreizt,
aber sämtlich unter der Grenze.

### Die Schwelle

`Politik.informationswert(profil)` zählt, wie viel die Person preisgegeben hat:

| Angabe | Punkte |
|---|---|
| jedes genannte Kriterium | 1 (betont: 2) |
| Preisobergrenze oder Budgethinweis | 1 |
| Kinder in der Reisegruppe | 1 |
| Entfernungswunsch zum Strand | 1 |

Ab **2 Punkten** wird nach Passung ausgewählt, darunter gespreizt.

### Passung

Die drei bestbewerteten Treffer, wobei die genannten Kriterien schwerer
wiegen als Gesamtnote und Preis. Die Auswahl spiegelt genau das wider, was
gesagt wurde - der Rückbezug steht danach namentlich in der Begründung
("Sauberkeit hattest du genannt: 86 Prozent der 240 Erwähnungen positiv").

### Spreizung

Wer nur ein Ziel nennt, bekäme sonst dreimal dasselbe: die drei
bestbewerteten Häuser einer Liste ähneln einander in Preis, Art und Lage.
Die Person erführe nichts über die Bandbreite und hätte nichts, woran sie
sich reiben kann.

Stattdessen zwei Stufen:

1. **Preisklasse als feste Vorgabe.** Aus jeder der drei Klassen (günstig,
   mittel, gehoben) das bestbewertete Haus. Die Klassen werden aus der
   aktuellen Trefferliste gebildet, nicht absolut - "günstig" heißt in
   Kyoto etwas anderes als an der Ostsee.
2. **Rest nach Abstand.** Bleibt ein Platz frei, weil eine Klasse leer ist,
   kommt das Haus hinein, das sich von den bereits gewählten am stärksten
   unterscheidet (Art des Hauses, Gegend). Bei Gleichstand entscheidet die
   Bewertung.

Damit die Spreizung überhaupt möglich ist, sieht der Agent bei dünnem
Profil **zweimal** in die Liste: einmal nach Bewertung sortiert, einmal
nach Preis aufsteigend. Ohne den zweiten Durchgang kennt er nur das obere
Ende und kann nicht spreizen. Das ist sichtbares Verhalten auf der Seite -
er sortiert um und liest erneut, so wie ein Mensch weiterscrollen würde.

### Der Agent sagt, welches Verfahren er benutzt

Bei Spreizung:

> Du hast mir noch keine Vorlieben genannt. Deshalb habe ich nicht drei
> ähnliche Häuser herausgesucht, sondern drei, die sich unterscheiden - in
> der Preisklasse, in der Art des Hauses und in der Lage. Sag mir, welche
> Richtung dir zusagt, dann suche ich gezielter.

Das ist zugleich die Einladung zur nächsten Runde: Die Reaktion darauf
erhöht den Informationswert, und der zweite Durchgang läuft dann nach
Passung. Für die Auswertung ist beides interessant - ob jemand die
Einladung annimmt, und wie viele Runden bis zur Entscheidung nötig sind.

### Im Protokoll

Jeder Shortlist-Eintrag hält `strategie` und `informationswert` fest. Damit
lässt sich später trennen: Wer hat dem Agenten von Anfang an etwas gegeben,
wer hat ihn erst suchen lassen und dann nachgeschärft - und macht das einen
Unterschied für Vertrauen und Zufriedenheit.
