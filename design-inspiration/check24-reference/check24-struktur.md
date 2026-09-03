# CHECK24 Urlaub (urlaub.check24.de) — Struktur- und Funktionsanalyse

Erhoben am 12.08.2026 durch Live-Besuch der Seite. Ziel: funktionale Vollständigkeit für unseren
Prototyp "Voyara" ableiten — **nicht** das CHECK24-Design 1:1 übernehmen (das gilt explizit als
veraltet), sondern die Funktionsbreite und Informationsarchitektur als Vorbild nutzen und modern
neu gestalten. Referenz für die Umsetzung: [[../../../../Uni/20 Agentic Commerce BA/Agentic Commerce - Technische Umsetzung]].

## 0. Nachtrag (12.08.2026, zweiter Besuch): hotel.check24.de

Auf der Hotel-Unterseite (nicht der Pauschalreise-Startseite) zusätzlich beobachtet:

- **"KI-Suche nutzen"-Toggle direkt neben dem Such-Button** (An/Aus-Schalter). Sehr direkt relevant
  für unser Thema: CHECK24 bietet selbst schon einen KI-gestützten Such-Modus als Opt-in an, ohne
  dass genau erkennbar ist, was sich dahinter ändert (kein Blick in den aktivierten Zustand möglich).
  → Idee für Voyara: unser gesamter Ansatz (KI-Agent statt nur KI-Suche) ist noch einen Schritt
  weiter als das, was der Marktführer aktuell anbietet — guter Beleg für die Aktualität des Themas.
- **Auszeichnungs-Badges konkret sichtbar**: "ntv – Deutschlands beste Online-Portale 2026" (Siegel),
  "DKB App Award 2025 – 1. Platz Hotel-Preisvergleich". Bestätigt: es sind formelle,
  drittvergebene Auszeichnungen (nicht selbst behauptet) — für Voyara als fiktive Studienseite
  entsprechend NICHT nachahmen (siehe Abschnitt 13).
- **Veranstalter-/Partner-Karussell konkret sichtbar**: Booking.com, Hotels.com, Expedia, HRS, TUI,
  hotelopia, DERTOUR, AurumTours — horizontal scrollbar mit Pfeil-Buttons, Link "alle Anbieter".
- **Zielort-Autocomplete**: zeigt Pin-Icon je Vorschlag, unterscheidet "Region" vs. "Stadt auf ...",
  Treffer optisch fett hervorgehoben im eingegebenen Teilstring (z.B. "**Palma de** Mallorca" bei
  Eingabe "Mallorca").

**Grenze dieser Recherche (ehrlich benannt):** Die Ergebnisseite (Hotelliste nach Suche) und eine
Hotel-Detailseite (Galerie, Zimmerauswahl, einzelne Bewertungen) liessen sich in dieser Sitzung
trotz mehrerer Versuche nicht öffnen (Interaktion mit der Live-Seite hat nicht wie erwartet
funktioniert). Für diese beiden Seiten wird beim Bauen auf etabliertes, branchenweit sehr
einheitliches Muster zurückgegriffen (Bildergalerie, sticky Buchungswidget mit Preis/Zeitraum/Gäste,
Ausstattungs-Icons, Bewertungsverteilung + Einzelbewertungen, ähnliche Hotels) statt auf einen
konkreten CHECK24-Screenshot.

## 1. Kopfbereich (Header)

**Obere Zeile (Utility Bar):**
- Logo (links)
- Globale Suchleiste "Suchen oder fragen" (Freitextsuche über die ganze Plattform, nicht nur Reisen)
- Mitteilungen (Glocke)
- Merkzettel (Herz-Icon, entspricht Wishlist/Favoriten)
- Chat (Support-Chat-Zugang)
- Anmelden (Login/Konto)

**Hauptnavigation (zweite Zeile, mit Icons):**
Reise · Hotel · Flug + Hotel · Mietwagen · Flüge · Ferienwohnung · Kreuzfahrt · Städtereise ·
Weitere Reisevergleiche

→ Für Voyara: Wir brauchen nicht alle Kategorien (kein Mietwagen/Kreuzfahrt nötig), aber das
Prinzip einer klaren Kategorie-Navigation mit Icon + Label ist sinnvoll auch für uns (z.B. Hotel /
Pauschalreise als zwei Reiter, passend zum Studienszenario).

## 2. Hero-Bereich

- Großes Hintergrundbild (Strand/Urlaubsmotiv)
- Headline: "Urlaub buchen bei Deutschlands größtem Reiseportal"
- Subline: "Über 30% aller Angebote gibt es nur bei uns!"
- Trust-Badges rechts im Bild eingeblendet: "Bis zu 60% Last Minute Rabatt", Siegel
  "Deutschlands größtes Reiseangebot", Siegel "Nirgendwo Günstiger Garantie"
- Werbe-Overlay/Popup: Cashback-Kampagne (750€ Reise-Cashback), erscheint als Modal beim Laden

→ Für Voyara: Hero mit Headline + Subline + 1-2 Trust-Badges übernehmen, KEIN aufdringliches
Popup-Modal (schlechte UX, für Studienteilnehmer störend und würde die eigentliche Erhebung stören).

## 3. Suchformular (zentrales Element, direkt im Hero)

**Tabs oberhalb des Formulars:** Pauschalreisen · Hotel · Flug + Hotel · Ferienwohnung
(wechselt die Felder des Formulars je nach Reiseart)

**Felder (Pauschalreise-Tab):**
1. *Reiseziel / Hotel* — Freitext mit Autocomplete ("Wohin?")
2. *Flug ab* — Abflughafen/-ort ("Von wo?")
3. *Reisezeitraum* — zwei Datumsfelder: Anreise / Abreise (Datepicker)
4. *Reisedauer* — Dropdown mit sehr granularen Optionen: "Exakt", Wochen-Pakete (1/2/3 Wochen),
   Tages-Spannen (2-5, 5-8, 9-12 Tage), sowie einzelne Tage von 2 bis 56 Tagen
5. *Reisende & Zimmer* — kombinierter Picker, zeigt z.B. "2 Erw., 0 Kinder (1 Zi.)" als
   Kurzfassung. Beim Öffnen (Standard-Muster bei Reiseportalen, nicht mehr im Detail einsehbar
   wegen Cookie-Popup, aber allgemein bekannter UX-Standard):
   - Pro Zimmer: Stepper für Erwachsene (+/-), Stepper für Kinder (+/-)
   - Pro Kind: zusätzliches Alters-Dropdown (0-17 Jahre), da Kinderpreise altersabhängig sind
   - "+ Zimmer hinzufügen" Link für Mehrfachbuchungen
   - "Übernehmen"-Button schließt den Picker
6. *Suchen*-Button (auffällig, rechts, in Signalfarbe)

→ **Für Voyara direkt relevant**: Reisezeitraum + Reisende/Zimmer-Picker (Erwachsene/Kinder) ist
genau das, was der Nutzer für unser Szenario explizit wollte. Reisedauer-Dropdown mit derart vielen
Einzeltagen ist für uns übertrieben — 1-2 Wochen-Presets plus "eigener Zeitraum per Datumsfeld"
reicht für unseren Studienkontext.

## 4. Cashback-/Vorteils-Banner (nach dem Hero)

Wiederholt die Cashback-Kampagne als eingebettetes Banner (nicht nur Popup), plus separater
Abschnitt "Belohnen Sie sich mit exklusiven Vorteilen" (Treuepunkte-/Level-System "Smily Level").

→ Für Voyara: nicht relevant (kein echtes Cashback-/Punktesystem nötig, keine Kaufanreize für eine
Studie), auslassen.

## 5. "Urlaubsregionen entdecken"

Visueller Grid-Bereich mit anklickbaren Reiseregionen/Destinationen (Bild-Kacheln), führt zu
gefilterten Ergebnissen für die jeweilige Region.

→ Für Voyara: passendes Pendant wäre eine kleine Kachel-Reihe mit 4-6 Mallorca-Regionen
(Palma, Playa de Palma, Soller, Cala d'Or, Es Trenc, Landesinneres) als Schnellzugriff/Filter.

## 6. "Jetzt unsere Top Hotels entdecken"

Kuratierte Hotel-Karten-Reihe (Karussell oder Grid) mit Untertitel "Diese Hotels haben unsere
Kunden besonders überzeugt" — Social-Proof-Sektion.

## 7. "Aktuelle Deals im August 2026"

Zeitlich/saisonal getaggte Angebote, ähnliches Kartenformat wie oben.

## 8. "Beliebte Hotels"

Weitere kuratierte Auswahl, vermutlich nach Buchungshäufigkeit sortiert.

→ Fuer Voyara: Abschnitte 6-8 lassen sich sinnvoll zu EINEM Abschnitt "Empfehlenswerte Hotels"
buendeln (kuratierte Auswahl aus unserem 8-Hotel-Katalog), muss nicht dreifach wiederholt werden —
bei CHECK24 macht das wegen des riesigen Katalogs Sinn, bei uns mit wenigen Demo-Hotels nicht.

## 9. "Inspiration für Ihren nächsten Urlaub aus unserem Reiseblog"

Redaktioneller Content-Bereich (Blogartikel-Vorschau-Karten).

→ Für Voyara: nicht studienrelevant, auslassen oder nur als optischer Platzhalter unten im Footer
erwähnen, kein echter Blog nötig.

## 10. "Ihre Vorteile bei CHECK24" (USP-Sektion)

Drei Icon+Text-Blöcke nebeneinander:
1. **Kostenlose Stornierung** — "Viele Angebote bis 24h vor Anreise kostenlos stornieren oder
   umbuchen."
2. **Nirgendwo Günstiger Garantie** — Bestpreis-Garantie, mit "Mehr Infos"-Link
3. **Rund um die Uhr für Sie da** — 24/7-Support, mit "Chat starten"-Link

→ Für Voyara: gute, leicht übertragbare Struktur — 3 Vorteile passend zum Agentic-Commerce-Kontext
formulieren (z.B. "KI-gestützte Suche", "Transparente Preise", "Jederzeit selbst nachschauen" —
Letzteres passt sogar inhaltlich zur Studienidee des frei durchklickbaren Katalogs).

## 11. "Alle Top Reiseveranstalter im Vergleich"

Logo-Grid der teilnehmenden Veranstalter/Partner (Vertrauenssignal durch Markenbekanntheit).

→ Für Voyara: als fiktive Partner-Logo-Reihe umsetzbar (erfundene Marken, um die
"viele-Anbieter-Vergleich"-Optik zu erzeugen), rein dekorativ/atmosphärisch.

## 12. "Häufige Fragen zur Pauschalreisebuchung" (FAQ)

Akkordeon mit 6 sichtbaren Fragen + "weitere Fragen"-Link:
- Wie finde ich die günstigsten Pauschalreisen bei CHECK24?
- Wann sollte ich meine Urlaubsreise buchen?
- Welche Urlaubsziele sind besonders günstig?
- Wo finde ich die besten Last-Minute-Angebote bei CHECK24?
- Welches sind die besten Reiseziele für das ganze Jahr?
- Was sind die Vorteile einer Pauschalreise mit CHECK24?

→ Für Voyara: FAQ-Akkordeon 1:1 übernehmbares Muster, Fragen inhaltlich anpassen (z.B. "Wie
funktioniert der KI-Reiseagent?", "Kann ich die Auswahl des Agenten ändern?", "Ist meine Buchung
verbindlich?" — passend zum Studienkontext, ggf. auch Fragen, die im Debriefing ohnehin beantwortet
werden, hier schon anteasern).

## 13. "CHECK24 Reise ist Testsieger" (Auszeichnungen)

Prominent platzierte Awards-/Siegel-Sektion mit Link "alle Auszeichnungen".

→ Für Voyara: fiktive, klar als Studien-Fiktion erkennbare "Auszeichnung" möglich (z.B. ein
generisches Gütesiegel-Icon), aber Vorsicht: echte Testsieger-Siegel/Marken nicht nachahmen (
Verwechslungsgefahr mit echten Gütesiegeln), lieber neutral/abstrakt gestalten.

## 14. Bewertungs-Zusammenfassung

Große Zahl (5.0/5), Anzahl Bewertungen (59.298 letzte 12 Monate, 288.580 gesamt), Link
"alle Bewertungen". Wichtig: CHECK24 betont, dass nur Kunden nach abgeschlossener Buchung bewerten
dürfen (Echtheits-Signal, siehe auch Abschnitt 15).

→ Für Voyara: Bewertungs-Kennzahl als Vertrauens-Baustein übernehmen (z.B. fiktiv "4.8/5,
2.340 Bewertungen"), passt auch gut als zusätzliches Vertrauenssignal in den Autonomiegrad-Kontext
der Studie (zeigt, wie generisches Social Proof neben dem KI-Agenten wirkt).

## 15. Trust-/Über-uns-Sektion ("Deutschlands größtes Vergleichsportal")

Vier Säulen mit Icon + Kurztext:
1. **Transparent** — Überblick über Preise/Leistungen vieler Anbieter über eigene Vergleichsrechner
2. **Kostenlos** — Service für Kunden kostenlos, Finanzierung über Provisionen der Anbieter
3. **Vertrauenswürdig** — Bewertungen nur nach echtem Abschluss möglich
4. **Erfahren** — Seit 1999, über 15 Mio. Kunden geholfen

→ Für Voyara: **methodisch besonders interessant** — Punkt "Vertrauenswürdig" und die
Provisions-Transparenz aus Punkt "Kostenlos" korrespondieren direkt mit unserer Forschungsidee K
(Provisions-Transparenz/Interessenkonflikt-Offenlegung, siehe
[[../../../../Uni/20 Agentic Commerce BA/Agentic Commerce - Studiendesign-Ideen]]) — könnte als
Vorbild dienen, WIE man Provisions-Transparenz glaubwürdig kommuniziert, falls diese Idee später
verfolgt wird.

## 16. Footer

**Vier Spalten mit Themenlinks:**
- *Über CHECK24*: Karriere, Presse, Unternehmen, CHECK24 Österreich, CHECK24 Spanien
- *Unsere Partner*: Partnerprogramm, Profi werden, Affiliate werden, Werkstattpartner werden,
  Unterkunft anmelden
- *Unser Engagement*: Nachhaltigkeit, CHECK24 hilft Kindern, CHECK24 hilft der Natur
- *Unser Service für Sie*: Hilfe und Kontakt, CHECK24 App, CHECK24 Gutscheine, CHECK24 Smily Punkte

**Rechtliche Fußzeile:** © Jahr, Firmenname/Rechtsform, AGB, Datenschutz, Impressum,
Statusinformation, Service-Code

→ Für Voyara: Footer-Struktur (mehrspaltig + rechtliche Fußzeile) 1:1 sinnvoll übernehmbar, Inhalte
auf unseren fiktiven Studienkontext anpassen (z.B. "Über das Studienprojekt", "Kontakt zum
Forschungsteam", "Datenschutz/Einwilligung", Impressum-Pflichtangaben für die Studie, KEIN
Partnerprogramm/Affiliate-Bereich, da nicht real).

## Priorisierung für die Umsetzung (Empfehlung)

**Hoch (direkt studienrelevant, als nächstes umsetzen):**
- Suchformular mit Zeitraum + Reisende/Zimmer-Picker (Abschnitt 3)
- Hero mit Headline/Subline (Abschnitt 2, ohne Popup)
- USP-Sektion (Abschnitt 10)
- FAQ-Akkordeon (Abschnitt 12)
- Footer (Abschnitt 16)
- Bewertungs-Zusammenfassung (Abschnitt 14)

**Mittel (erhöht Realismus/Vollständigkeit, aber nicht studienkritisch):**
- Regionen-Kacheln (Abschnitt 5)
- Empfehlenswerte-Hotels-Sektion, gebündelt (Abschnitte 6-8)
- Partner-Logo-Reihe, fiktiv (Abschnitt 11)
- Trust-Säulen (Abschnitt 15)

**Niedrig/auslassen:**
- Cashback-/Punkte-System (Abschnitt 4) — kein echtes Geschäftsmodell nötig
- Reiseblog (Abschnitt 9) — kein redaktioneller Content nötig
- Echte Testsieger-Siegel (Abschnitt 13) — rechtlich/ethisch heikel, wenn zu echt nachgeahmt
