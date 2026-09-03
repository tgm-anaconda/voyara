# KI-Bilder für Voyara

Stand 15.08.2026. Alle Bilder, die **nicht** über Pexels laufen, sondern in
ChatGPT erzeugt werden müssen. Vier Blöcke, insgesamt 31 Bilder.

| Block | Bilder | Wofür |
|---|---|---|
| 1. Hotel-Außenansichten | 14 | je eine pro neuem Hotel |
| 2. Header mit Menschen | 4 | Startseite |
| 3. Bewertungs-Avatare | 12 | Gästebewertungen |
| 4. Agenten-Zeichen | 1 | Panel links |

---

## Wichtig: jeden Block in einem eigenen Chat erzeugen

**Nicht alles in einem Chat durchlaufen lassen.** Ein Bildmodell nimmt die
vorherigen Bilder desselben Chats als Kontext. Nach ein paar Aufträgen zieht
es Details mit, die gar nicht im Prompt stehen: dieselbe Fassadenfarbe, dieselbe
Perspektive, dieselbe Tageszeit. Am Ende sehen alle Häuser aus wie Varianten
desselben Gebäudes.

Beim Wechsel zwischen den Blöcken ist es noch heikler:

- Die Hotel-Prompts sagen ausdrücklich **no people in the foreground**.
- Die Header-Prompts brauchen **genau das Gegenteil**: Menschen als Motiv.

Läuft beides im selben Chat, kommen die Header oft menschenleer zurück oder
die Hotelbilder bekommen plötzlich Gäste ins Bild. Deshalb:

1. **Pro Block ein frischer Chat.** Vier Blöcke, vier Chats.
2. **Innerhalb eines Blocks nach etwa fünf Bildern ebenfalls neu anfangen.**
   Faustregel: Sobald ein Bild dem vorherigen auffällig ähnelt, neuen Chat öffnen.
3. **Immer nur den Prompt schicken**, ohne Zusätze wie „mach das gleiche wie
   eben, aber ..." — genau darüber wandern die Details mit.

Die Blöcke lassen sich parallel in mehreren Chats abarbeiten, das spart Zeit.

---

## Block 1 — Außenansichten der 14 neuen Hotels

Warum KI und nicht Pexels: Auf diesen Bildern ist das Gebäude selbst das Motiv.
Stockfotos zeigen dort reale Hotels mit erkennbaren Marken, und Markenbekanntheit
wirkt auf Vertrauen — in einer Studie zu Vertrauen in KI-Agenten ließe sich das
hinterher nicht mehr vom Agenten-Effekt trennen.

Ablage: jeweils als `2.png` im angegebenen Ordner unter `bilder/generiert/`.

### 1.1 `hotels/h13-hotel-cala-blanca-mar/2.png`

```
large white four-star beachfront hotel seen from the promenade, balconies facing the sea. Setting: large four-star beach hotel on the promenade of a Mediterranean bay, white and sand tones, busy family holiday feeling, on Mallorca, Spain. Professional travel photography, natural daylight, realistic colours, soft shadows, shot on full-frame camera, shallow depth of field where appropriate, no people in the foreground, no text, no logos, no watermarks, no borders, landscape orientation 3:2. Avoid: collage, split screen, multiple panels, picture frames, text overlays, brand logos, cartoon or illustration look, oversaturated HDR, fisheye distortion.
```

### 1.2 `hotels/h14-fonda-sa-pla-a/2.png`

```
small sandstone hotel façade with green shutters directly on the village square. Setting: eleven-room sandstone townhouse hotel at a village market square, honest, rural, warm ochre stone, on Mallorca, Spain. Professional travel photography, natural daylight, realistic colours, soft shadows, shot on full-frame camera, shallow depth of field where appropriate, no people in the foreground, no text, no logos, no watermarks, no borders, landscape orientation 3:2. Avoid: collage, split screen, multiple panels, picture frames, text overlays, brand logos, cartoon or illustration look, oversaturated HDR, fisheye distortion.
```

### 1.3 `hotels/h15-nauta-port-d-andratx/2.png`

```
modern white five-star hotel built into a cliff above a harbour, terraces facing the water. Setting: five-star adults-only cliff hotel above a natural harbour, cool white architecture, yachts, refined calm, on Mallorca, Spain. Professional travel photography, natural daylight, realistic colours, soft shadows, shot on full-frame camera, shallow depth of field where appropriate, no people in the foreground, no text, no logos, no watermarks, no borders, landscape orientation 3:2. Avoid: collage, split screen, multiple panels, picture frames, text overlays, brand logos, cartoon or illustration look, oversaturated HDR, fisheye distortion.
```

### 1.4 `hotels/h16-hotel-mar-i-pins/2.png`

```
four-star family resort building behind a belt of pine trees, low and wide. Setting: large family resort behind an old pine belt at a shallow bay, green, shaded, lively but not loud, on Mallorca, Spain. Professional travel photography, natural daylight, realistic colours, soft shadows, shot on full-frame camera, shallow depth of field where appropriate, no people in the foreground, no text, no logos, no watermarks, no borders, landscape orientation 3:2. Avoid: collage, split screen, multiple panels, picture frames, text overlays, brand logos, cartoon or illustration look, oversaturated HDR, fisheye distortion.
```

### 1.5 `hotels/h17-agroturisme-son-bardi/2.png`

```
old stone wine estate with a converted farm wing housing guest rooms. Setting: working wine estate with nine guest rooms, vines and almond trees, earthy stone and iron, deep rural calm, on Mallorca, Spain. Professional travel photography, natural daylight, realistic colours, soft shadows, shot on full-frame camera, shallow depth of field where appropriate, no people in the foreground, no text, no logos, no watermarks, no borders, landscape orientation 3:2. Avoid: collage, split screen, multiple panels, picture frames, text overlays, brand logos, cartoon or illustration look, oversaturated HDR, fisheye distortion.
```

### 1.6 `hotels/h18-hostal-bella-vista/2.png`

```
modest two-star guesthouse façade with small windows and a simple entrance. Setting: plain two-star guesthouse two streets behind a beach promenade, functional, clean, no frills, on Mallorca, Spain. Professional travel photography, natural daylight, realistic colours, soft shadows, shot on full-frame camera, shallow depth of field where appropriate, no people in the foreground, no text, no logos, no watermarks, no borders, landscape orientation 3:2. Avoid: collage, split screen, multiple panels, picture frames, text overlays, brand logos, cartoon or illustration look, oversaturated HDR, fisheye distortion.
```

### 1.7 `hotels/h19-hotel-migjorn-beach/2.png`

```
low four-star hotel building near a small southern harbour, white with blue shutters. Setting: quiet four-star beach hotel in the calm south, salt flats and pine, pale blue and sand, unhurried, on Mallorca, Spain. Professional travel photography, natural daylight, realistic colours, soft shadows, shot on full-frame camera, shallow depth of field where appropriate, no people in the foreground, no text, no logos, no watermarks, no borders, landscape orientation 3:2. Avoid: collage, split screen, multiple panels, picture frames, text overlays, brand logos, cartoon or illustration look, oversaturated HDR, fisheye distortion.
```

### 1.8 `hotels/h20-aparthotel-illa-verda/2.png`

```
three-star aparthotel building, two storeys, with balconies and a garden path. Setting: three-star apartment complex in four low buildings around a garden, practical, green, self-catering, on Mallorca, Spain. Professional travel photography, natural daylight, realistic colours, soft shadows, shot on full-frame camera, shallow depth of field where appropriate, no people in the foreground, no text, no logos, no watermarks, no borders, landscape orientation 3:2. Avoid: collage, split screen, multiple panels, picture frames, text overlays, brand logos, cartoon or illustration look, oversaturated HDR, fisheye distortion.
```

### 1.9 `hotels/h21-palau-de-sant-miquel/2.png`

```
sandstone city palace portal with a discreet five-star hotel entrance in an old-town lane. Setting: 17th-century city palace turned five-star hotel, sandstone arcades, restrained luxury, old town, on Mallorca, Spain. Professional travel photography, natural daylight, realistic colours, soft shadows, shot on full-frame camera, shallow depth of field where appropriate, no people in the foreground, no text, no logos, no watermarks, no borders, landscape orientation 3:2. Avoid: collage, split screen, multiple panels, picture frames, text overlays, brand logos, cartoon or illustration look, oversaturated HDR, fisheye distortion.
```

### 1.10 `hotels/h22-hotel-sa-talaia/2.png`

```
small stone hotel at the upper edge of a mountain village with a terrace. Setting: fourteen-room mountain village hotel, natural stone, linen and wood, terraced valley view, on Mallorca, Spain. Professional travel photography, natural daylight, realistic colours, soft shadows, shot on full-frame camera, shallow depth of field where appropriate, no people in the foreground, no text, no logos, no watermarks, no borders, landscape orientation 3:2. Avoid: collage, split screen, multiple panels, picture frames, text overlays, brand logos, cartoon or illustration look, oversaturated HDR, fisheye distortion.
```

### 1.11 `hotels/h23-club-familiar-es-foguero/2.png`

```
big four-star club resort building complex seen across the pool area. Setting: very large all-inclusive family club resort, water park, bright and busy, entertainment stage, on Mallorca, Spain. Professional travel photography, natural daylight, realistic colours, soft shadows, shot on full-frame camera, shallow depth of field where appropriate, no people in the foreground, no text, no logos, no watermarks, no borders, landscape orientation 3:2. Avoid: collage, split screen, multiple panels, picture frames, text overlays, brand logos, cartoon or illustration look, oversaturated HDR, fisheye distortion.
```

### 1.12 `hotels/h24-petit-hotel-cala-figuera/2.png`

```
small white hotel standing above a fishing harbour entrance with balconies. Setting: ten-room hotel above a working fishing harbour in a narrow inlet, white walls, blue boats, on Mallorca, Spain. Professional travel photography, natural daylight, realistic colours, soft shadows, shot on full-frame camera, shallow depth of field where appropriate, no people in the foreground, no text, no logos, no watermarks, no borders, landscape orientation 3:2. Avoid: collage, split screen, multiple panels, picture frames, text overlays, brand logos, cartoon or illustration look, oversaturated HDR, fisheye distortion.
```

### 1.13 `hotels/h25-hotel-torrent-d-art/2.png`

```
converted stone country estate with a cobbled inner courtyard and arched entrance. Setting: converted country estate at the edge of a hill village, thick walls, olive groves, unpolished and warm, on Mallorca, Spain. Professional travel photography, natural daylight, realistic colours, soft shadows, shot on full-frame camera, shallow depth of field where appropriate, no people in the foreground, no text, no logos, no watermarks, no borders, landscape orientation 3:2. Avoid: collage, split screen, multiple panels, picture frames, text overlays, brand logos, cartoon or illustration look, oversaturated HDR, fisheye distortion.
```

### 1.14 `hotels/h26-sunrise-beach-resort/2.png`

```
white terraced resort building stepping down a slope above a cove. Setting: terraced white resort above a small cove, pine trees, stepped levels, calm holiday feeling, on Mallorca, Spain. Professional travel photography, natural daylight, realistic colours, soft shadows, shot on full-frame camera, shallow depth of field where appropriate, no people in the foreground, no text, no logos, no watermarks, no borders, landscape orientation 3:2. Avoid: collage, split screen, multiple panels, picture frames, text overlays, brand logos, cartoon or illustration look, oversaturated HDR, fisheye distortion.
```

---

## Block 2 — Header mit Menschen (4 Bilder)

**Eigener Chat.** Hier sind Menschen erwünscht, in Block 1 verboten.

Methodisch unbedenklich: Der Header ist Dekoration und für alle Teilnehmenden
identisch, also über die Bedingungen konstant. Menschen in *Hotelbildern* bleiben
ausgeschlossen — dort werden sie als Gäste oder Personal gelesen und verändern die
Wahrnehmung des Angebots.

Rückenansichten und Halbtotalen statt Porträts: weniger Identifizierbarkeit,
weniger Ablenkung vom eigentlichen Inhalt.

Ablage: `bilder/generiert/hero/`. Die Dateien werden beim nächsten
`node bilder/einbauen.mjs` automatisch eingelesen.

### 2.1 `hero/hero-3.png`

```
A group of four laughing friends walking along the water line of a Mediterranean sandy beach in the late afternoon, seen from behind against the low sun, turquoise sea and palm trees at the edge of the frame. Professional travel photography, natural daylight, warm and inviting mood, realistic colours, soft shadows, shot on full-frame camera, people seen from behind or in a wide mid-shot so that no face is clearly identifiable, no text, no logos, no watermarks, no borders, wide landscape orientation 16:9. Avoid: collage, split screen, multiple panels, picture frames, text overlays, brand logos, cartoon or illustration look, oversaturated HDR, fisheye distortion, close-up portraits, recognisable faces.
```

### 2.2 `hero/hero-4.png`

```
A couple having a relaxed breakfast on a terrace high above a Mediterranean bay in warm morning light, seen from the side at a distance, coffee and fruit on the table, sea and pine trees in the background. Professional travel photography, natural daylight, warm and inviting mood, realistic colours, soft shadows, shot on full-frame camera, people seen from behind or in a wide mid-shot so that no face is clearly identifiable, no text, no logos, no watermarks, no borders, wide landscape orientation 16:9. Avoid: collage, split screen, multiple panels, picture frames, text overlays, brand logos, cartoon or illustration look, oversaturated HDR, fisheye distortion, close-up portraits, recognisable faces.
```

### 2.3 `hero/hero-5.png`

```
A family with two small children playing in very shallow turquoise water on a wide sandy beach on a sunny afternoon, seen from a distance, calm bay and low hills behind. Professional travel photography, natural daylight, warm and inviting mood, realistic colours, soft shadows, shot on full-frame camera, people seen from behind or in a wide mid-shot so that no face is clearly identifiable, no text, no logos, no watermarks, no borders, wide landscape orientation 16:9. Avoid: collage, split screen, multiple panels, picture frames, text overlays, brand logos, cartoon or illustration look, oversaturated HDR, fisheye distortion, close-up portraits, recognisable faces.
```

### 2.4 `hero/hero-6.png`

```
Two hikers with small backpacks on a stone mountain path above a Mediterranean coastline, seen from behind, terraced slopes and open sea in the background, late morning light. Professional travel photography, natural daylight, warm and inviting mood, realistic colours, soft shadows, shot on full-frame camera, people seen from behind or in a wide mid-shot so that no face is clearly identifiable, no text, no logos, no watermarks, no borders, wide landscape orientation 16:9. Avoid: collage, split screen, multiple panels, picture frames, text overlays, brand logos, cartoon or illustration look, oversaturated HDR, fisheye distortion, close-up portraits, recognisable faces.
```

**Noch zu entscheiden:** Die Startseite zeigt aktuell fest `hero-1`. Mit vier
weiteren Varianten könnte sie zufällig wechseln — dann sieht aber jede
Teilnehmerin und jeder Teilnehmer ein anderes Bild. Für die Studie ist ein fest
gewähltes Header-Bild sauberer, weil es eine Störgröße weniger ist. Sag Bescheid,
was dir lieber ist, dann baue ich es entsprechend ein.

---

## Block 3 — Bewertungs-Avatare (12 Bilder)

**Eigener Chat.** Bewusst KI statt Stock: erfundene Gesichter statt realer
Personen. Bei einem veröffentlichten Prototyp erspart das die Frage nach
Persönlichkeitsrechten an identifizierbaren Menschen.

Ablage: `bilder/generiert/avatare/`.

**Vorher lesen:** Die Bewertungen sind seit dem Generator nicht mehr eine
Handvoll, sondern Tausende. Zwölf Gesichter wiederholen sich dann alle zehn
Einträge — beim Blättern fällt auf, dass dieselbe Person unter drei Namen
schreibt. Zwei saubere Wege:

- **Bei den Buchstabenkreisen bleiben.** Booking und Google machen das genauso,
  es wirkt nicht billig und kostet null Aufwand. Das wäre meine Empfehlung.
- **Mindestens 24 bis 30 Avatare erzeugen** und je Bewertung fest zuordnen.
  Dann fällt die Wiederholung erst spät auf.

Die zwölf Prompts unten sind der Einstieg, falls du dich für Gesichter
entscheidest — dann am besten gleich auf 24 verdoppeln.

### 3.1 `avatare/1.png`

```
Photorealistic head-and-shoulders portrait of an entirely fictional person, neutral softly blurred light background, natural daylight, friendly relaxed expression, casual holiday clothing, centred, square 1:1 crop, no text, no logos, no watermarks. Subject: woman in her late twenties, shoulder-length dark blonde hair. Avoid: resemblance to any real or well-known person, cartoon or illustration look, heavy retouching, studio glamour lighting, brand logos on clothing, text overlays.
```

### 3.2 `avatare/2.png`

```
Photorealistic head-and-shoulders portrait of an entirely fictional person, neutral softly blurred light background, natural daylight, friendly relaxed expression, casual holiday clothing, centred, square 1:1 crop, no text, no logos, no watermarks. Subject: man in his mid thirties, short brown hair, light stubble. Avoid: resemblance to any real or well-known person, cartoon or illustration look, heavy retouching, studio glamour lighting, brand logos on clothing, text overlays.
```

### 3.3 `avatare/3.png`

```
Photorealistic head-and-shoulders portrait of an entirely fictional person, neutral softly blurred light background, natural daylight, friendly relaxed expression, casual holiday clothing, centred, square 1:1 crop, no text, no logos, no watermarks. Subject: woman in her fifties, grey bobbed hair, glasses. Avoid: resemblance to any real or well-known person, cartoon or illustration look, heavy retouching, studio glamour lighting, brand logos on clothing, text overlays.
```

### 3.4 `avatare/4.png`

```
Photorealistic head-and-shoulders portrait of an entirely fictional person, neutral softly blurred light background, natural daylight, friendly relaxed expression, casual holiday clothing, centred, square 1:1 crop, no text, no logos, no watermarks. Subject: man in his sixties, thinning grey hair, weathered friendly face. Avoid: resemblance to any real or well-known person, cartoon or illustration look, heavy retouching, studio glamour lighting, brand logos on clothing, text overlays.
```

### 3.5 `avatare/5.png`

```
Photorealistic head-and-shoulders portrait of an entirely fictional person, neutral softly blurred light background, natural daylight, friendly relaxed expression, casual holiday clothing, centred, square 1:1 crop, no text, no logos, no watermarks. Subject: woman in her early twenties, long curly black hair. Avoid: resemblance to any real or well-known person, cartoon or illustration look, heavy retouching, studio glamour lighting, brand logos on clothing, text overlays.
```

### 3.6 `avatare/6.png`

```
Photorealistic head-and-shoulders portrait of an entirely fictional person, neutral softly blurred light background, natural daylight, friendly relaxed expression, casual holiday clothing, centred, square 1:1 crop, no text, no logos, no watermarks. Subject: man in his forties, dark skin, shaved head, warm smile. Avoid: resemblance to any real or well-known person, cartoon or illustration look, heavy retouching, studio glamour lighting, brand logos on clothing, text overlays.
```

### 3.7 `avatare/7.png`

```
Photorealistic head-and-shoulders portrait of an entirely fictional person, neutral softly blurred light background, natural daylight, friendly relaxed expression, casual holiday clothing, centred, square 1:1 crop, no text, no logos, no watermarks. Subject: woman in her thirties, red hair tied back, freckles. Avoid: resemblance to any real or well-known person, cartoon or illustration look, heavy retouching, studio glamour lighting, brand logos on clothing, text overlays.
```

### 3.8 `avatare/8.png`

```
Photorealistic head-and-shoulders portrait of an entirely fictional person, neutral softly blurred light background, natural daylight, friendly relaxed expression, casual holiday clothing, centred, square 1:1 crop, no text, no logos, no watermarks. Subject: man in his late twenties, glasses, tousled dark hair. Avoid: resemblance to any real or well-known person, cartoon or illustration look, heavy retouching, studio glamour lighting, brand logos on clothing, text overlays.
```

### 3.9 `avatare/9.png`

```
Photorealistic head-and-shoulders portrait of an entirely fictional person, neutral softly blurred light background, natural daylight, friendly relaxed expression, casual holiday clothing, centred, square 1:1 crop, no text, no logos, no watermarks. Subject: woman in her forties, dark skin, braided hair. Avoid: resemblance to any real or well-known person, cartoon or illustration look, heavy retouching, studio glamour lighting, brand logos on clothing, text overlays.
```

### 3.10 `avatare/10.png`

```
Photorealistic head-and-shoulders portrait of an entirely fictional person, neutral softly blurred light background, natural daylight, friendly relaxed expression, casual holiday clothing, centred, square 1:1 crop, no text, no logos, no watermarks. Subject: man in his fifties, full beard, checked shirt. Avoid: resemblance to any real or well-known person, cartoon or illustration look, heavy retouching, studio glamour lighting, brand logos on clothing, text overlays.
```

### 3.11 `avatare/11.png`

```
Photorealistic head-and-shoulders portrait of an entirely fictional person, neutral softly blurred light background, natural daylight, friendly relaxed expression, casual holiday clothing, centred, square 1:1 crop, no text, no logos, no watermarks. Subject: woman in her sixties, short white hair, laughing. Avoid: resemblance to any real or well-known person, cartoon or illustration look, heavy retouching, studio glamour lighting, brand logos on clothing, text overlays.
```

### 3.12 `avatare/12.png`

```
Photorealistic head-and-shoulders portrait of an entirely fictional person, neutral softly blurred light background, natural daylight, friendly relaxed expression, casual holiday clothing, centred, square 1:1 crop, no text, no logos, no watermarks. Subject: man in his early twenties, light brown hair, hoodie. Avoid: resemblance to any real or well-known person, cartoon or illustration look, heavy retouching, studio glamour lighting, brand logos on clothing, text overlays.
```

---

## Block 4 — Zeichen für den Agenten (1 Bild)

**Eigener Chat.** Im Panel links steht bisher ein Icon aus dem Zeichensatz.

Bewusst abstrakt, **nicht menschlich und kein Gesicht**: Sobald der Agent ein
Gesicht bekommt, entsteht eine Erwartungshaltung an eine Person, und
Anthropomorphismus ist in dieser Studie keine gewollte Variable.

Ablage: `bilder/generiert/agent/`.

### 4.1 `agent/marke.png`

```
Abstract geometric app icon for a travel assistant: a simple four-pointed spark or compass rose made of two overlapping soft shapes, deep green and warm teal on a plain background, flat modern vector look, centred, square 1:1, no face, no eyes, no human or animal features, no text, no letters, no logos
```

---

## Danach

```bash
node bilder/einbauen.mjs
```

Verkleinert alles auf 1600 px, wandelt nach JPEG und schreibt
`data/bildpfade.js` neu. Avatare und Agenten-Zeichen brauchen zusätzlich eine
kleine Anpassung im Code — sag Bescheid, wenn die Bilder da sind.
