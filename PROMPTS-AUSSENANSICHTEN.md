# Außenansichten — was noch zu erzeugen ist

Stand 2026-08-31.

**0 Bilder offen** · 74 bereits erledigt und hier nicht mehr aufgeführt.

Diese Datei wird neu erzeugt mit `node bilder/prompts-offen.mjs`. Was fertig ist,
verschwindet daraus — es steht also immer nur drin, was noch fehlt.

## Ablage

Jedes Bild als **`2.png`** in den Ordner, der über dem Prompt steht, unterhalb von
`Bachelor Arbeit/Website/bilder/generiert/`. Ordner notfalls anlegen.

Beispiel: Das erste Bild kommt nach

```
Bachelor Arbeit/Website/bilder/generiert/hotels/.../2.png
```

## Zwei Regeln

**1. Ein Chat pro Ziel.** Ein Bildmodell nimmt die vorherigen Bilder desselben
Chats als Kontext und zieht Details mit, die nicht im Prompt stehen: gleiche
Fassadenfarbe, gleiche Tageszeit, gleiche Perspektive. Bei allen Zielen in einem
Chat sähen am Ende alle Häuser gleich aus.

**2. Nur den Prompt schicken.** Keine Zusätze wie „wie eben, aber in Blau" —
genau darüber wandern die Details mit.

## Übersicht

| Ziel | offen |
|---|---|
| **Gesamt** | **0** |
---

## Wenn du fertig bist

Sag mir Bescheid, dann baue ich sie ein. Oder selbst:

```bash
node bilder/einbauen.mjs
```
