/* Vier neue Ziele fuer den Katalogausbau vom 01.11.2026 - NOCH NICHT EINGEBAUT.
 *
 * Warum diese vier und nicht vier beliebige:
 * Der Engpass im Winter ist nicht die Gesamtzahl der Haeuser, sondern eine
 * einzige Kombination. Wer "eher kalt" und "Strand in der Naehe" sagt, landet
 * im ganzen Katalog bei genau einem Ziel - der Ostsee, und die hat Oktober als
 * letzten Saisonmonat. Im Dezember bleibt bei kalt plus Strand nichts uebrig.
 * Deshalb sind alle vier neuen Ziele kuestennah UND kalt, und eines (Lofoten)
 * traegt den Winter.
 *
 * Einbau: diesen Block in data/ziele.js hinter kyoto einfuegen. Vorher in
 * bilder/objekte-bauen.mjs die ids zu KALTE_ZIELE und OHNE_POOL ergaenzen,
 * sonst bekommen die Haeuser Klimaanlage und Aussenpool.
 */

const ZIELE_NEU = [
  {
    id: "nordsee", name: "Nordsee", land: "Deutschland", typ: "strand",
    flughafen: "GWT", flughafenName: "Sylt-Westerland",
    monate: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    temp: [3, 3, 5, 9, 14, 17, 19, 19, 16, 12, 7, 4],
    kurz: "Wattenmeer, Dünen und Reetdächer — im Winter Thalasso statt Strandkorb.",
  },
  {
    id: "lofoten", name: "Lofoten", land: "Norwegen", typ: "strand",
    flughafen: "EVE", flughafenName: "Harstad-Narvik Evenes",
    monate: [1, 2, 3, 6, 7, 8, 9, 10, 11, 12],
    temp: [1, 1, 2, 5, 9, 12, 14, 14, 11, 7, 4, 2],
    kurz: "Weiße Strände unter Felswänden, Nordlichter im Winter, Mitternachtssonne im Juni.",
    winterziel: true,
  },
  {
    id: "cornwall", name: "Cornwall", land: "England", typ: "strand",
    flughafen: "NQY", flughafenName: "Newquay",
    monate: [4, 5, 6, 7, 8, 9, 10],
    temp: [8, 8, 9, 11, 14, 17, 19, 19, 17, 14, 11, 9],
    kurz: "Klippenpfade, Buchten und Fischerhäfen am mildesten Zipfel Englands.",
  },
  {
    id: "bretagne", name: "Bretagne", land: "Frankreich", typ: "strand",
    flughafen: "BES", flughafenName: "Brest Bretagne",
    monate: [4, 5, 6, 7, 8, 9, 10],
    temp: [8, 8, 10, 12, 15, 18, 20, 20, 18, 15, 11, 9],
    kurz: "Granitküste, Leuchttürme und Austernbänke zwischen Kanal und Atlantik.",
  },
];

if (typeof module !== "undefined" && module.exports) module.exports = { ZIELE_NEU };
