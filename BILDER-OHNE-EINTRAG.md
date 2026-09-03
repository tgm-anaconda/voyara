# Bilder ohne Katalogeintrag

Stand 2026-08-31.

**71 Hotels** haben eine fertige KI-Außenansicht, existieren aber noch
nicht in `data/hotels.js`. Die Bilder liegen bereits am richtigen Ort — was fehlt,
ist der Katalogeintrag, der sie sichtbar macht.

## Projektwurzel

```
/Users/tom-gabrielmielicki/Desktop/Bachelor Arbeit/Website
```

Alle Pfade unten sind relativ dazu.

## Was jeweils schon da ist und was fehlt

| | |
|---|---|
| Vorhanden | `2.jpg` — die KI-Außenansicht |
| Fehlt als Bild | Position 1, 3, 4, 5 (Ort, Pool/Wellness/Lobby, Zimmer, Essen) |
| Fehlt im Code | der komplette Eintrag in `data/hotels.js` |

Die fehlenden Bilder kommen **nicht** aus KI, sondern aus dem Stockvorrat unter
`bilder/pool/<ziel>/<thema>/`. Zuordnen mit `node bilder/zuordnen.mjs <datei.json>`,
Format der Zuordnungsdatei:

```json
{ "h30": { "ordner": "hotels/h30-vale-dourado",
           "bilder": { "1": 34762303, "3": 10923534, "4": 33400871, "5": 38313075 } } }
```

Die Zahlen sind Pexels-IDs aus `bilder/pool/vorrat.json`.

## Danach

```bash
node bilder/einbauen.mjs      # verkleinert und schreibt data/bildpfade.js neu
```

Struktur eines Katalogeintrags baut `node bilder/objekte-bauen.mjs <spec.json>` —
Zimmerkategorien, Verpflegung, Ausstattung und Teilnoten entstehen daraus
automatisch. Von Hand kommen nur Name, Ort, Kurz- und Langbeschreibung, Highlights.

**Wichtig: Namen und Ordner sind eingefroren.** Eine Umbenennung würde das
bereits erzeugte Bild von seinem Haus trennen.

---


## Algarve, Portugal

| ID | Name | Kategorie | Sterne | Ordner |
|---|---|---|---|---|
| h30 | Vale Dourado | Luxushotel (5 Sterne) | 5 | `img/hotels/h30-vale-dourado/` |
| h31 | Casa das Amendoeiras | Boutique-Hotel | 4 | `img/hotels/h31-casa-das-amendoeiras/` |
| h32 | Praia Larga Resort | Familienresort | 4 | `img/hotels/h32-praia-larga-resort/` |
| h33 | Pensão Marisol | Günstig & einfach | 2 | `img/hotels/h33-pens-o-marisol/` |
| h34 | Miradouro Sagres | Strandhotel | 4 | `img/hotels/h34-miradouro-sagres/` |

## Barcelona, Spanien

| ID | Name | Kategorie | Sterne | Ordner |
|---|---|---|---|---|
| h44 | Eixample Gràcia | Stadthotel | 4 | `img/hotels/h44-eixample-gracia/` |
| h45 | Casa Ribera | Boutique-Hotel | 4 | `img/hotels/h45-casa-ribera/` |
| h46 | Gran Vía Palace | Luxushotel (5 Sterne) | 5 | `img/hotels/h46-gran-via-palace/` |
| h47 | Hostal Poblenou | Günstig & einfach | 2 | `img/hotels/h47-hostal-poblenou/` |
| h48 | Mar Bella Suites | Aparthotel | 3 | `img/hotels/h48-mar-bella-suites/` |

## Island

| ID | Name | Kategorie | Sterne | Ordner |
|---|---|---|---|---|
| h88 | Hverfjall Retreat | Boutique-Hotel | 4 | `img/hotels/h88-hverfjall-retreat/` |
| h89 | Reykjavík Harbour House | Stadthotel | 4 | `img/hotels/h89-reykjavik-harbour-house/` |
| h90 | Glacier View Lodge | Luxushotel (5 Sterne) | 5 | `img/hotels/h90-glacier-view-lodge/` |
| h91 | Guesthouse Vík | Günstig & einfach | 2 | `img/hotels/h91-guesthouse-vik/` |

## Kapstadt, Südafrika

| ID | Name | Kategorie | Sterne | Ordner |
|---|---|---|---|---|
| h80 | Table View Lodge | Stadthotel | 4 | `img/hotels/h80-table-view-lodge/` |
| h81 | Vineyard Estate Constantia | Luxushotel (5 Sterne) | 5 | `img/hotels/h81-vineyard-estate-constantia/` |
| h82 | Camps Bay Boutique | Boutique-Hotel | 4 | `img/hotels/h82-camps-bay-boutique/` |
| h83 | Hout Bay Beach | Strandhotel | 3 | `img/hotels/h83-hout-bay-beach/` |

## Krabi, Thailand

| ID | Name | Kategorie | Sterne | Ordner |
|---|---|---|---|---|
| h84 | Limestone Bay Resort | Strandhotel | 4 | `img/hotels/h84-limestone-bay-resort/` |
| h85 | Ao Nang Sands | Familienresort | 4 | `img/hotels/h85-ao-nang-sands/` |
| h86 | Villa Andaman | Luxushotel (5 Sterne) | 5 | `img/hotels/h86-villa-andaman/` |
| h87 | Railay Bungalows | Boutique-Hotel | 3 | `img/hotels/h87-railay-bungalows/` |

## Kreta, Griechenland

| ID | Name | Kategorie | Sterne | Ordner |
|---|---|---|---|---|
| h74 | Malia Family Village | Familienresort | 4 | `img/hotels/h74-malia-family-village/` |
| h75 | Pension Sfakia | Günstig & einfach | 2 | `img/hotels/h75-pension-sfakia/` |

## Kyoto, Japan

| ID | Name | Kategorie | Sterne | Ordner |
|---|---|---|---|---|
| h96 | Machiya Gion | Boutique-Hotel | 4 | `img/hotels/h96-machiya-gion/` |
| h97 | Ryokan Arashiyama | Finca & Landhaus | 4 | `img/hotels/h97-ryokan-arashiyama/` |
| h98 | Higashiyama Palace | Luxushotel (5 Sterne) | 5 | `img/hotels/h98-higashiyama-palace/` |
| h99 | Hotel Karasuma | Stadthotel | 3 | `img/hotels/h99-hotel-karasuma/` |

## Lappland, Finnland

| ID | Name | Kategorie | Sterne | Ordner |
|---|---|---|---|---|
| h66 | Aurora Camp Ivalo | Boutique-Hotel | 4 | `img/hotels/h66-aurora-camp-ivalo/` |
| h67 | Lodge Kittilä | Berghotel | 4 | `img/hotels/h67-lodge-kittilae/` |
| h68 | Arctic Glass Suites | Luxushotel (5 Sterne) | 5 | `img/hotels/h68-arctic-glass-suites/` |
| h69 | Rentierhof Saariselkä | Familienresort | 3 | `img/hotels/h69-rentierhof-saariselkae/` |

## Lissabon, Portugal

| ID | Name | Kategorie | Sterne | Ordner |
|---|---|---|---|---|
| h53 | Azulejo Alfama | Boutique-Hotel | 4 | `img/hotels/h53-azulejo-alfama/` |
| h54 | Miradouro Graça | Stadthotel | 4 | `img/hotels/h54-miradouro-graca/` |
| h55 | Palácio Estrela | Luxushotel (5 Sterne) | 5 | `img/hotels/h55-palacio-estrela/` |
| h56 | Baixa Studios | Aparthotel | 3 | `img/hotels/h56-baixa-studios/` |

## Mallorca, Spanien

| ID | Name | Kategorie | Sterne | Ordner |
|---|---|---|---|---|
| h100 | Serra Vell Refugi | Boutique-Hotel | 4 | `img/hotels/h100-serra-vell-refugi/` |

## Marrakesch, Marokko

| ID | Name | Kategorie | Sterne | Ordner |
|---|---|---|---|---|
| h76 | Riad Dar Zahra | Boutique-Hotel | 4 | `img/hotels/h76-riad-dar-zahra/` |
| h77 | Palais Menara | Luxushotel (5 Sterne) | 5 | `img/hotels/h77-palais-menara/` |
| h78 | Hotel Gueliz | Stadthotel | 4 | `img/hotels/h78-hotel-gueliz/` |
| h79 | Auberge Ourika | Günstig & einfach | 2 | `img/hotels/h79-auberge-ourika/` |

## New York, USA

| ID | Name | Kategorie | Sterne | Ordner |
|---|---|---|---|---|
| h92 | Chelsea Brownstone | Boutique-Hotel | 4 | `img/hotels/h92-chelsea-brownstone/` |
| h93 | Midtown Tower | Stadthotel | 4 | `img/hotels/h93-midtown-tower/` |
| h94 | The Gramercy Grand | Luxushotel (5 Sterne) | 5 | `img/hotels/h94-the-gramercy-grand/` |
| h95 | Brooklyn Loft Rooms | Günstig & einfach | 3 | `img/hotels/h95-brooklyn-loft-rooms/` |

## Ostsee, Deutschland

| ID | Name | Kategorie | Sterne | Ordner |
|---|---|---|---|---|
| h70 | Strandhotel Vitte | Strandhotel | 4 | `img/hotels/h70-strandhotel-vitte/` |
| h71 | Gutshaus Boddenblick | Boutique-Hotel | 4 | `img/hotels/h71-gutshaus-boddenblick/` |
| h72 | Familienhof Zingst | Familienresort | 3 | `img/hotels/h72-familienhof-zingst/` |
| h73 | Pension Seewind | Günstig & einfach | 2 | `img/hotels/h73-pension-seewind/` |

## Sardinien, Italien

| ID | Name | Kategorie | Sterne | Ordner |
|---|---|---|---|---|
| h35 | Punta Granito | Luxushotel (5 Sterne) | 5 | `img/hotels/h35-punta-granito/` |
| h36 | Stazzo Li Mari | Finca & Landhaus | 4 | `img/hotels/h36-stazzo-li-mari/` |
| h37 | Hotel Cala Bianca | Strandhotel | 4 | `img/hotels/h37-hotel-cala-bianca/` |
| h38 | Corte Nuraghe | Boutique-Hotel | 3 | `img/hotels/h38-corte-nuraghe/` |

## Südtirol, Italien

| ID | Name | Kategorie | Sterne | Ordner |
|---|---|---|---|---|
| h62 | Dolomiten Lodge | Berghotel | 4 | `img/hotels/h62-dolomiten-lodge/` |
| h63 | Weingut Ansitz Prantl | Finca & Landhaus | 4 | `img/hotels/h63-weingut-ansitz-prantl/` |
| h64 | Hotel Rosengarten | Luxushotel (5 Sterne) | 5 | `img/hotels/h64-hotel-rosengarten/` |
| h65 | Pension Obereggen | Boutique-Hotel | 3 | `img/hotels/h65-pension-obereggen/` |

## Teneriffa, Spanien

| ID | Name | Kategorie | Sterne | Ordner |
|---|---|---|---|---|
| h39 | Costa Volcán | Strandhotel | 4 | `img/hotels/h39-costa-volcan/` |
| h40 | Jardín del Teide | Luxushotel (5 Sterne) | 5 | `img/hotels/h40-jardin-del-teide/` |
| h41 | Aparthotel Los Silos | Aparthotel | 3 | `img/hotels/h41-aparthotel-los-silos/` |
| h42 | Finca La Caldera | Boutique-Hotel | 4 | `img/hotels/h42-finca-la-caldera/` |
| h43 | Playa Sur Family | Familienresort | 4 | `img/hotels/h43-playa-sur-family/` |

## Tirol, Österreich

| ID | Name | Kategorie | Sterne | Ordner |
|---|---|---|---|---|
| h57 | Bergblick Sölden | Berghotel | 4 | `img/hotels/h57-bergblick-soelden/` |
| h58 | Alpenhof Zillertal | Familienresort | 4 | `img/hotels/h58-alpenhof-zillertal/` |
| h59 | Chalet Hohe Munde | Luxushotel (5 Sterne) | 5 | `img/hotels/h59-chalet-hohe-munde/` |
| h60 | Gasthof Bergrast | Günstig & einfach | 2 | `img/hotels/h60-gasthof-bergrast/` |
| h61 | Waldquelle Spa | Boutique-Hotel | 4 | `img/hotels/h61-waldquelle-spa/` |

## Wien, Österreich

| ID | Name | Kategorie | Sterne | Ordner |
|---|---|---|---|---|
| h49 | Palais Lindengasse | Luxushotel (5 Sterne) | 5 | `img/hotels/h49-palais-lindengasse/` |
| h50 | Hotel Ringblick | Stadthotel | 4 | `img/hotels/h50-hotel-ringblick/` |
| h51 | Pension Josefstadt | Günstig & einfach | 2 | `img/hotels/h51-pension-josefstadt/` |
| h52 | Boutiquehotel Naschmarkt | Boutique-Hotel | 4 | `img/hotels/h52-boutiquehotel-naschmarkt/` |

---

## Reine Pfadliste

```
img/hotels/h30-vale-dourado/2.jpg
img/hotels/h31-casa-das-amendoeiras/2.jpg
img/hotels/h32-praia-larga-resort/2.jpg
img/hotels/h33-pens-o-marisol/2.jpg
img/hotels/h34-miradouro-sagres/2.jpg
img/hotels/h44-eixample-gracia/2.jpg
img/hotels/h45-casa-ribera/2.jpg
img/hotels/h46-gran-via-palace/2.jpg
img/hotels/h47-hostal-poblenou/2.jpg
img/hotels/h48-mar-bella-suites/2.jpg
img/hotels/h88-hverfjall-retreat/2.jpg
img/hotels/h89-reykjavik-harbour-house/2.jpg
img/hotels/h90-glacier-view-lodge/2.jpg
img/hotels/h91-guesthouse-vik/2.jpg
img/hotels/h80-table-view-lodge/2.jpg
img/hotels/h81-vineyard-estate-constantia/2.jpg
img/hotels/h82-camps-bay-boutique/2.jpg
img/hotels/h83-hout-bay-beach/2.jpg
img/hotels/h84-limestone-bay-resort/2.jpg
img/hotels/h85-ao-nang-sands/2.jpg
img/hotels/h86-villa-andaman/2.jpg
img/hotels/h87-railay-bungalows/2.jpg
img/hotels/h74-malia-family-village/2.jpg
img/hotels/h75-pension-sfakia/2.jpg
img/hotels/h96-machiya-gion/2.jpg
img/hotels/h97-ryokan-arashiyama/2.jpg
img/hotels/h98-higashiyama-palace/2.jpg
img/hotels/h99-hotel-karasuma/2.jpg
img/hotels/h66-aurora-camp-ivalo/2.jpg
img/hotels/h67-lodge-kittilae/2.jpg
img/hotels/h68-arctic-glass-suites/2.jpg
img/hotels/h69-rentierhof-saariselkae/2.jpg
img/hotels/h53-azulejo-alfama/2.jpg
img/hotels/h54-miradouro-graca/2.jpg
img/hotels/h55-palacio-estrela/2.jpg
img/hotels/h56-baixa-studios/2.jpg
img/hotels/h100-serra-vell-refugi/2.jpg
img/hotels/h76-riad-dar-zahra/2.jpg
img/hotels/h77-palais-menara/2.jpg
img/hotels/h78-hotel-gueliz/2.jpg
img/hotels/h79-auberge-ourika/2.jpg
img/hotels/h92-chelsea-brownstone/2.jpg
img/hotels/h93-midtown-tower/2.jpg
img/hotels/h94-the-gramercy-grand/2.jpg
img/hotels/h95-brooklyn-loft-rooms/2.jpg
img/hotels/h70-strandhotel-vitte/2.jpg
img/hotels/h71-gutshaus-boddenblick/2.jpg
img/hotels/h72-familienhof-zingst/2.jpg
img/hotels/h73-pension-seewind/2.jpg
img/hotels/h35-punta-granito/2.jpg
img/hotels/h36-stazzo-li-mari/2.jpg
img/hotels/h37-hotel-cala-bianca/2.jpg
img/hotels/h38-corte-nuraghe/2.jpg
img/hotels/h62-dolomiten-lodge/2.jpg
img/hotels/h63-weingut-ansitz-prantl/2.jpg
img/hotels/h64-hotel-rosengarten/2.jpg
img/hotels/h65-pension-obereggen/2.jpg
img/hotels/h39-costa-volcan/2.jpg
img/hotels/h40-jardin-del-teide/2.jpg
img/hotels/h41-aparthotel-los-silos/2.jpg
img/hotels/h42-finca-la-caldera/2.jpg
img/hotels/h43-playa-sur-family/2.jpg
img/hotels/h57-bergblick-soelden/2.jpg
img/hotels/h58-alpenhof-zillertal/2.jpg
img/hotels/h59-chalet-hohe-munde/2.jpg
img/hotels/h60-gasthof-bergrast/2.jpg
img/hotels/h61-waldquelle-spa/2.jpg
img/hotels/h49-palais-lindengasse/2.jpg
img/hotels/h50-hotel-ringblick/2.jpg
img/hotels/h51-pension-josefstadt/2.jpg
img/hotels/h52-boutiquehotel-naschmarkt/2.jpg
```
