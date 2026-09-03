// Bildregie je Objekt. Pro Eintrag ein kurzer visueller Charakter ("DNA")
// plus die konkreten Motive der Galerie. Daraus baut generate-prompts.mjs
// die fertigen Prompts. Nur hier pflegen, nicht in der prompts.json.

// Einheitlicher Stil-Suffix fuer ALLE Bilder — sorgt dafuer, dass der Katalog
// wie aus einer Hand wirkt und nicht wie zusammengesucht.
export const STYLE =
  "Professional travel photography, natural daylight, realistic colours, soft shadows, " +
  "shot on full-frame camera, shallow depth of field where appropriate, " +
  "no people in the foreground, no text, no logos, no watermarks, no borders, " +
  "landscape orientation 3:2";

export const NEGATIVE =
  "Avoid: collage, split screen, multiple panels, picture frames, text overlays, " +
  "brand logos, cartoon or illustration look, oversaturated HDR, fisheye distortion";

// --- Hotels: 5 Motive je Haus -------------------------------------------
export const HOTEL_ART = {
  h01: {
    ki: [2, 4],
    dna: "small restored townhouse hotel in Palma old town, warm sandstone, citrus trees, calm and intimate",
    shots: [
      "green inner courtyard with potted lemon trees, stone floor, breakfast tables in dappled shade",
      "narrow old-town façade with wooden shutters and a discreet entrance",
      "simple bright guest room with white linen, wooden floor, tall shuttered window",
      "rooftop terrace at golden hour overlooking terracotta roofs of Palma",
      "breakfast table close-up with coffee, pastries and fresh oranges in morning light",
    ],
  },
  h02: {
    ki: [1, 4],
    dna: "large four-star beachfront hotel on Playa de Palma, bright blue and white, family holiday feeling",
    shots: [
      "wide beachfront view with the hotel pool area in front of turquoise sea",
      "large outdoor pool with sun loungers and palm trees at midday",
      "double room with balcony and open sea view, light blue tones",
      "long sandy beach with gentle waves seen from the hotel promenade",
      "poolside bar terrace in the late afternoon with warm light",
    ],
  },
  h03: {
    ki: [1, 2],
    dna: "restored rural finca between almond fields, rough natural stone, herbs, deep calm",
    shots: [
      "traditional stone finca surrounded by almond trees under a wide sky",
      "small natural pool bordered by dry stone walls and lavender",
      "rustic bedroom with exposed stone wall, linen bedding, wooden beams",
      "pergola dinner table set under vines in warm evening light",
      "herb and vegetable garden with terracotta pots in soft morning sun",
    ],
  },
  h04: {
    ki: [2, 5],
    dna: "simple family-run guesthouse right at Port de Sóller bay, honest and unpretentious",
    shots: [
      "harbour promenade of Sóller with fishing boats and mountains behind",
      "modest guesthouse façade with small balconies facing the bay",
      "plain clean double room with a small balcony and harbour view",
      "vintage wooden tram passing along the seafront promenade",
      "calm bay at sunset with boats at anchor and mountain silhouettes",
    ],
  },
  h05: {
    ki: [1, 2],
    dna: "five-star palace hotel in Palma old town, marble, high ceilings, understated luxury",
    shots: [
      "rooftop infinity pool at dusk with the illuminated cathedral in the distance",
      "grand 19th-century palace façade with tall arched windows",
      "elegant deluxe room with marble bathroom visible, warm neutral tones",
      "inner courtyard with orange trees, marble columns and lounge seating",
      "spa area with a quiet stone hammam pool and soft indirect lighting",
    ],
  },
  h06: {
    ki: [2, 4],
    dna: "small sustainable bungalow lodge behind the untouched Es Trenc dunes, pine trees, natural materials",
    shots: [
      "wide untouched natural beach with dunes and pine trees, no buildings",
      "wooden bungalow among pines with a private terrace and hammock",
      "simple natural-material bedroom with linen curtains and outdoor shower visible",
      "small pool surrounded by pine trees and wooden decking",
      "breakfast with regional produce on a wooden terrace table in morning light",
    ],
  },
  h07: {
    ki: [1, 4],
    dna: "practical renovated city hotel in Palma old town, functional and clean, urban",
    shots: [
      "narrow old-town street with the hotel entrance and hanging plants",
      "compact modern room in neutral tones facing a quiet courtyard",
      "small lobby with reception desk, warm wood and green plants",
      "old-town rooftops of Palma seen from an upper window",
      "cathedral of Palma seen from a nearby square in afternoon light",
    ],
  },
  h08: {
    ki: [1, 2],
    dna: "large family resort at Cala d'Or, several pools, lively but tidy, holiday club feeling",
    shots: [
      "large resort pool landscape with water slides and sun loungers",
      "sheltered bay of Cala d'Or with calm turquoise shallow water",
      "spacious family room with two sleeping areas and a large balcony",
      "swim-up suite terrace with direct pool access and loungers",
      "resort buffet restaurant terrace in the evening with warm lighting",
    ],
  },
  h09: {
    ki: [2, 4],
    dna: "ten-room luxury villa above Deià in the Tramuntana mountains, dramatic views, refined and quiet",
    shots: [
      "panoramic view over terraced mountain slopes down to the Mediterranean at sunset",
      "stone villa perched on a hillside above the village of Deià",
      "refined room with a private terrace and open sea view, natural materials",
      "small infinity pool on a terrace overlooking the mountains",
      "fine dining table set outdoors with mountain backdrop at blue hour",
    ],
  },
  h10: {
    ki: [1, 3],
    dna: "practical apartment hotel near Alcúdia beach, bright and functional, self-catering",
    shots: [
      "apartment building with balconies and a garden pool area",
      "apartment living area with kitchenette, dining table and balcony door",
      "wide sandy beach of Alcúdia with shallow calm water",
      "communal pool with sun loungers surrounded by low hedges",
      "balcony breakfast with a view over pine trees toward the sea",
    ],
  },
  h11: {
    ki: [2, 4],
    dna: "three-star family hotel at Can Picafort, straightforward, close to the long bay",
    shots: [
      "long sandy bay of Alcúdia with a beach promenade and palm trees",
      "hotel pool with a separate children's pool and sun terrace",
      "simple double room with balcony and side sea view",
      "beachfront promenade in the early evening with warm light",
      "hotel terrace restaurant with buffet setup in the evening",
    ],
  },
  h12: {
    ki: [1, 4],
    dna: "former mountain refuge turned hiking hotel in the Tramuntana, rugged stone, sauna, hearty",
    shots: [
      "stone mountain lodge surrounded by pine forest and rocky peaks",
      "hiking trail with dry stone walls leading into the Tramuntana mountains",
      "cosy room with wooden furniture and a large window facing the mountains",
      "natural stone pool with mountain panorama in soft afternoon light",
      "rustic dinner table with hearty regional food and wine after a hike",
    ],
  },
  h13: {
    ki: [2],
    dna: "large four-star beach hotel on the promenade of a Mediterranean bay, white and sand tones, busy family holiday feeling",
    shots: [
      "wide sandy bay with a long palm-lined promenade and turquoise shallow water at midday",
      "large white four-star beachfront hotel seen from the promenade, balconies facing the sea",
      "big outdoor pool with a separate shallow children's area, sun loungers and parasols",
      "family room with a separate sleeping alcove, light wood, balcony door open to the sun",
      "hotel terrace restaurant in the late afternoon with sea in the background",
    ],
  },
  h14: {
    ki: [2],
    dna: "eleven-room sandstone townhouse hotel at a village market square, honest, rural, warm ochre stone",
    shots: [
      "sunlit Mediterranean village square in Spain with honey-coloured sandstone houses, palm trees and a church tower",
      "small sandstone hotel façade with green shutters directly on the village square",
      "narrow inner courtyard with a fig tree, stone floor and two small breakfast tables",
      "simple bright guest room with wooden beams, white linen and a window to the square",
      "rooftop terrace with terracotta tiles overlooking village roofs at golden hour",
    ],
  },
  h15: {
    ki: [2],
    dna: "five-star adults-only cliff hotel above a natural harbour, cool white architecture, yachts, refined calm",
    shots: [
      "natural harbour bay with sailing yachts seen from a hillside at golden hour",
      "modern white five-star hotel built into a cliff above a harbour, terraces facing the water",
      "infinity pool on a terrace appearing to merge with the harbour water below",
      "deluxe room in warm neutral tones with a private terrace overlooking the sea",
      "spa area with an indoor seawater pool, stone walls and soft indirect light",
    ],
  },
  h16: {
    ki: [2],
    dna: "large family resort behind an old pine belt at a shallow bay, green, shaded, lively but not loud",
    shots: [
      "calm turquoise Mediterranean bay with umbrella pine trees growing right at the sandy shore, Spain",
      "four-star family resort building behind a belt of pine trees, low and wide",
      "resort pool with two water slides and children playing area, palm trees around",
      "family suite with two separate bedrooms, bunk bed and a balcony to the garden",
      "buffet restaurant interior with bright daylight and long serving counters",
    ],
  },
  h17: {
    ki: [2],
    dna: "working wine estate with nine guest rooms, vines and almond trees, earthy stone and iron, deep rural calm",
    shots: [
      "rows of vines in warm afternoon light with almond trees and a stone wall",
      "old stone wine estate with a converted farm wing housing guest rooms",
      "swimming pool converted from an old stone irrigation basin, surrounded by vines",
      "rustic guest room with rough stone walls, iron bed frame and linen bedding",
      "wine cellar with oak barrels and a tasting table, warm low light",
    ],
  },
  h18: {
    ki: [2],
    dna: "plain two-star guesthouse two streets behind a beach promenade, functional, clean, no frills",
    shots: [
      "narrow sunny street in a Spanish seaside resort with white apartment blocks, palm trees and blue sky",
      "modest two-star guesthouse façade with small windows and a simple entrance",
      "small functional double room with white walls, a bed and an air conditioning unit",
      "simple breakfast room with plain tables and bright morning light",
      "small rooftop terrace with plastic chairs and a view over neighbouring roofs",
    ],
  },
  h19: {
    ki: [2],
    dna: "quiet four-star beach hotel in the calm south, salt flats and pine, pale blue and sand, unhurried",
    shots: [
      "small quiet sandy beach with pine trees and very clear shallow water in the south",
      "low four-star hotel building near a small southern harbour, white with blue shutters",
      "long narrow swimming pool between tall palm trees and sun loungers",
      "double room with a balcony facing the sea, pale blue and white tones",
      "fishing harbour with small boats and a boat departing towards an island",
    ],
  },
  h20: {
    ki: [2],
    dna: "three-star apartment complex in four low buildings around a garden, practical, green, self-catering",
    shots: [
      "garden courtyard with a swimming pool surrounded by low apartment buildings",
      "three-star aparthotel building, two storeys, with balconies and a garden path",
      "studio apartment with a kitchenette, dining corner and balcony door",
      "two-bedroom holiday apartment living area with sofa and dining table",
      "wide sandy beach with shallow water a few minutes from the complex",
    ],
  },
  h21: {
    ki: [2],
    dna: "17th-century city palace turned five-star hotel, sandstone arcades, restrained luxury, old town",
    shots: [
      "arcaded inner courtyard of an old city palace with stone columns and a wide staircase",
      "sandstone city palace portal with a discreet five-star hotel entrance in an old-town lane",
      "small rooftop pool with a bar and a view over old-town roofs at dusk",
      "elegant hotel room with high ceilings, tall windows and a marble bathroom",
      "old-town lane with sandstone houses and warm evening light",
    ],
  },
  h22: {
    ki: [2],
    dna: "fourteen-room mountain village hotel, natural stone, linen and wood, terraced valley view",
    shots: [
      "mountain village with terraced fields and stone houses seen from above in warm light",
      "small stone hotel at the upper edge of a mountain village with a terrace",
      "hotel terrace with a wide view down a green valley towards distant sea",
      "quiet guest room with a natural stone wall, linen bedding and a wooden floor",
      "hiking path starting at the edge of a mountain village between dry stone walls",
    ],
  },
  h23: {
    ki: [2],
    dna: "very large all-inclusive family club resort, water park, bright and busy, entertainment stage",
    shots: [
      "large resort pool landscape with several pools and many sun loungers",
      "big four-star club resort building complex seen across the pool area",
      "water park with four slides and a splash area for children",
      "family suite with two bedrooms and a balcony overlooking the pool",
      "resort garden with tall palm trees, loungers and warm lighting in the early evening",
    ],
  },
  h24: {
    ki: [2],
    dna: "ten-room hotel above a working fishing harbour in a narrow inlet, white walls, blue boats",
    shots: [
      "narrow rocky inlet with a small fishing harbour and blue wooden boats",
      "small white hotel standing above a fishing harbour entrance with balconies",
      "simple guest room with a balcony overlooking moored fishing boats",
      "rock bathing platforms with steps into clear deep water",
      "small harbour restaurant terrace at golden hour with boats below",
    ],
  },
  h25: {
    ki: [2],
    dna: "converted country estate at the edge of a hill village, thick walls, olive groves, unpolished and warm",
    shots: [
      "olive groves on gentle hills with a hill village and church tower in the distance",
      "converted stone country estate with a cobbled inner courtyard and arched entrance",
      "swimming pool in a former kitchen garden with stone walls and fruit trees",
      "guest room with thick whitewashed walls, a wooden bed and a small window",
      "cobbled courtyard with a long wooden table set for breakfast in morning shade",
    ],
  },
  h26: {
    ki: [2],
    dna: "terraced white resort above a small cove, pine trees, stepped levels, calm holiday feeling",
    shots: [
      "small turquoise cove framed by rocks and pine trees seen from above",
      "white terraced resort building stepping down a slope above a cove",
      "two swimming pools on stepped terraces with sun loungers and pines",
      "double room with a balcony facing a cove between pine trees",
      "terrace bar on the top level with a wide view over the bay in the evening",
    ],
  },
};

// --- Ferienwohnungen: 4 Motive je Objekt --------------------------------
export const APARTMENT_ART = {
  a01: {
    ki: [2],
    dna: "bright two-bedroom flat in a restored Palma old-town building, tasteful and personal",
    shots: [
      "open living and dining area with tall windows and wooden floor",
      "small balcony overlooking a quiet narrow old-town lane",
      "fully equipped kitchen with dining table and morning light",
      "bedroom with white linen and shuttered window",
    ],
  },
  a02: {
    ki: [1],
    dna: "spacious seaview apartment at Playa de Palma, large terrace, family friendly",
    shots: [
      "large terrace with outdoor dining table and open sea view",
      "living room opening onto the terrace, bright and airy",
      "communal pool area of the apartment complex with palms",
      "bedroom with balcony access and soft morning light",
    ],
  },
  a03: {
    ki: [1],
    dna: "small separate studio on a working finca estate, figs and olive trees, total quiet",
    shots: [
      "studio entrance with private terrace under fig trees",
      "compact interior with kitchenette and rustic stone wall",
      "shared finca pool surrounded by dry stone walls and lavender",
      "view over almond and olive fields at golden hour",
    ],
  },
  a04: {
    ki: [2],
    dna: "open loft above Port de Sóller harbour, huge windows, designer touch",
    shots: [
      "open loft living space with a large window front over the bay",
      "harbour of Port de Sóller seen from above with boats at anchor",
      "modern open kitchen with island and warm wood",
      "bedroom with mountain and sea view through wide windows",
    ],
  },
  a05: {
    ki: [1],
    dna: "whole terraced house with private garden near Alcúdia, practical family holiday home",
    shots: [
      "private garden with barbecue, dining table and lounge chairs",
      "open living and dining room with access to the garden",
      "kitchen with dining area, bright and practical",
      "quiet residential street with the house entrance and greenery",
    ],
  },
  a06: {
    ki: [1],
    dna: "compact studio on the rocks above a small swimming cove at Cala d'Or",
    shots: [
      "terrace with sea view directly above a small rocky cove",
      "compact studio interior with kitchenette and bright textiles",
      "small swimming cove with clear turquoise water and rocks",
      "evening view from the terrace over the water at sunset",
    ],
  },
  a07: {
    ki: [],
    dna: "detached holiday house with its own pool behind a sandstone wall, private and generous",
    shots: [
      "private swimming pool in a walled garden with a fig tree and sun loungers",
      "large open plan living and dining room with a long wooden table",
      "bright double bedroom with white linen and shutters half closed",
      "covered outdoor dining terrace next to the pool in evening light",
    ],
  },
  a08: {
    ki: [],
    dna: "first-floor flat on a seafront promenade, simple and bright, balcony to the bay",
    shots: [
      "balcony with two chairs looking over a calm bay and a sandy beach",
      "living room with dining table and a large window facing the sea",
      "small practical kitchen with a window and morning light",
      "bedroom with two single beds, white walls and a light wooden floor",
    ],
  },
  a09: {
    ki: [],
    dna: "large holiday villa for eight guests, pool, barbecue and roof terrace, generous and modern",
    shots: [
      "villa garden with a swimming pool, sun loungers and a built-in barbecue",
      "spacious living and dining area with a long table for eight people",
      "roof terrace with lounge seating and a view over a bay at sunset",
      "large bedroom with a double bed and a door to a private balcony",
    ],
  },
  a10: {
    ki: [],
    dna: "compact old-town studio flat, one room, quiet courtyard windows, practical",
    shots: [
      "small studio apartment with a bed, kitchenette and a desk by the window",
      "kitchenette with a small worktop, kettle and open shelves",
      "quiet green inner courtyard of an old town building seen from a window",
      "compact modern bathroom with a walk-in shower and white tiles",
    ],
  },
  a11: {
    ki: [],
    dna: "ground-floor flat with its own terrace and garden access near salt flats, easy and unfussy",
    shots: [
      "ground-floor terrace with garden furniture opening onto a shared green garden",
      "open living and kitchen area with a dining table and terrace door",
      "bedroom with a double bed, light curtains and warm afternoon light",
      "cycle path running along salt flats with reeds and water at golden hour",
    ],
  },
  a12: {
    ki: [],
    dna: "flat in an old rubble-stone house in a mountain valley, orange groves, handmade and warm",
    shots: [
      "kitchen and dining room with a window looking over orange groves",
      "living room with old wooden beams, a sofa and bookshelves",
      "bedroom with a wrought iron bed and a stone wall",
      "narrow lane in a Spanish mountain village with rubble-stone houses, green shutters and potted plants, empty street",
    ],
  },
  a13: {
    ki: [],
    dna: "spacious upper-floor flat in an older harbour house, generous kitchen, covered veranda, lived-in and warm",
    shots: [
      "bright bedroom with light walls, framed artwork and a wide doorway",
      "covered veranda with a wooden armchair, tiled floor and wrought iron railing",
      "large open kitchen with a white island, bar stools and hanging lamps",
      "spacious bedroom with an ornate iron bed, wooden floor and large windows to a garden",
    ],
  },
  a14: {
    ki: [],
    dna: "two-storey terraced holiday house with a small garden and shared pool, family-worn and practical",
    shots: [
      "small private garden with a table, chairs and a parasol next to a terraced house",
      "empty open plan kitchen and dining area of a holiday house with a large wooden table and bright daylight",
      "children's bedroom with two single beds and simple wooden furniture",
      "empty swimming pool of a small Spanish holiday complex with sun loungers and palm trees, no swimmers",
    ],
  },
};

// --- Mietwagen: 1 Motiv je Fahrzeug -------------------------------------
export const CAR_ART = {
  c01: "compact white city hatchback parked at a Mediterranean airport rental lot, palm trees, bright daylight, three-quarter front view",
  c02: "small silver hatchback with automatic transmission, parked on a sunny coastal road with sea in the background, three-quarter front view",
  c03: "compact estate car in dark grey loaded for a holiday, parked near a Mediterranean harbour, three-quarter front view",
  c04: "blue compact crossover SUV parked on a rural road, side view, bright daylight",
  c05: "small retro convertible with the roof down, parked by a coastal promenade with palm trees, three-quarter front view",
  c06: "seven-seat family van in silver parked in front of a holiday apartment building, sliding door open, three-quarter front view",
  c07: "modern white electric sedan at a charging station near a Mediterranean coastline, three-quarter front view",
  c08: "basic small economy car in white, parked in a simple rental parking area, plain and functional, three-quarter front view",
  c09: "dark red compact hatchback driving along a city street, sharp side view with motion-blurred background",
  c10: "orange compact SUV parked on gravel in front of a white rustic building, three-quarter front view",
  c11: "dark green small premium hatchback parked on an urban street, sharp side profile",
  c12: "blue and black small city car photographed from behind on an open road",
  c13: "modern white compact hatchback car parked alone on a sunny street in Spain, clean side view, no other cars in the frame",
};

// --- Regionen: 1 Motiv je Region ----------------------------------------
export const REGION_ART = {
  "Palma de Mallorca": "aerial view of Palma old town with the gothic cathedral and the bay in warm afternoon light",
  "Playa de Palma": "long wide sandy beach with a palm-lined promenade and turquoise water",
  "Landesinneres": "rolling inland countryside with almond groves, stone walls and a distant village church tower",
  "Port de Sóller": "horseshoe-shaped harbour bay framed by mountains, fishing boats and a lighthouse",
  "Es Trenc": "untouched dune beach with fine white sand, pine trees and clear shallow water",
  "Cala d'Or": "small sheltered cove with white boats, rocky edges and calm turquoise water",
  "Serra de Tramuntana": "dramatic mountain range with terraced slopes and a winding road at sunset",
  "Alcúdia": "long shallow bay with calm water, pine trees and mountains on the horizon",
  "Can Picafort": "sandy family beach with a promenade, low dunes and gentle waves",
  "Cala Millor": "wide gently curving sandy bay with a long promenade and shallow turquoise water",
  "Santanyí": "sandstone village square with market stalls, plane trees and honey-coloured houses",
  "Port d'Andratx": "natural harbour surrounded by hills with sailing yachts and white houses",
  "Port de Pollença": "calm shallow bay with old pine trees at the shore and mountains behind",
  "Colònia de Sant Jordi": "quiet southern coastline with salt flats, dunes and very clear shallow water",
  "Artà": "hill village with a stone stairway leading up to a fortified church, olive groves around",
};

// --- Startseite ---------------------------------------------------------
export const HERO_ART = {
  "hero-1": "wide cinematic view of a Mediterranean coastline on Mallorca at golden hour, turquoise sea, cliffs and pine trees, calm and inviting",
  "hero-2": "aerial view of a curved bay with boats and clear water, warm late afternoon light",
};
