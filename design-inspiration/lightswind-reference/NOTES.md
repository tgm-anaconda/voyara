# Lightswind UI — Inspirationsquellen

Original-Quellcode von https://lightswind.com / https://github.com/codewithMUHILAN/Lightswind-UI-Library
(React + Tailwind + Framer Motion, MIT-Lizenz). Hier nur als Referenz gespeichert, nicht direkt im
Projekt verwendet — unser Prototyp ist aktuell Vanilla HTML/CSS/JS.

## Was aus welcher Datei übernommen werden soll (Muster, nicht Code)

- **gradient-button.tsx**: verlaufender Farbverlauf hinter dem Button (verschwommen, animiertes
  `background-position`), Glow-Blur-Schicht unter dem Button
- **glowing-cards.tsx**: mausfolgender radialer Glow-Overlay auf Karten (CSS-Variablen `--x`/`--y`,
  per `mousemove` gesetzt, `mask: radial-gradient(...)`)
- **border-beam.tsx**: rotierender Farbverlauf entlang des Kartenrands (`offset-path`-Technik,
  in Vanilla CSS über `@property` + `animation` auf `offset-distance` nachbaubar)
- **interactive-gradient-card.tsx / card.tsx**: Abstände, Radius- und Schatten-Konventionen für
  Karten-Komponenten
- **badge.tsx / shine-button.tsx**: kleinere UI-Bausteine (Badges, Shine-Hover-Effekt)

## Entscheidung

Diese Muster werden manuell in Vanilla CSS/JS nachgebaut (siehe `style.css`/`script.js` im
Website-Ordner), nicht per React-Migration direkt übernommen — Details siehe Chat-Verlauf.
