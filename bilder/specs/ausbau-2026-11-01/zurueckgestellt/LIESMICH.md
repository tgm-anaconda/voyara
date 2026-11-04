# Zurückgestellt am 01.11.2026 - nicht einbauen

Vier neue Ziele (Nordsee, Lofoten, Cornwall, Bretagne) mit 50 Häusern und
32 Ferienwohnungen. Entscheidung des Nutzers: **die Zahl der Regionen bleibt
bei 18.** Begründung: Wer gezielt nach einer Region sucht, braucht dort Tiefe.
Mehr Regionen verteilen den Katalog breiter, statt die einzelne Region
belastbar zu machen.

Die Dateien bleiben liegen, weil die Texte und die Bildzuordnung fertig sind
und sich jederzeit wieder aktivieren lassen. Dazu müsste man sie eine Ebene
höher schieben und `vorrat-ausbau-winter.mjs` erneut laufen lassen.

**Was damit offen bleibt:** Diese vier waren die einzige Antwort auf die
Kombination "eher kalt" plus "Strand in der Nähe". Unter den 18 bestehenden
Regionen ist nur die Ostsee kalt UND küstennah, und ihre Saison endet im
Oktober. Im Dezember bleibt bei dieser Kombination deshalb weiterhin fast
nichts übrig. Dafür gibt es zwei Wege ohne neue Region:

1. Die Saison der Ostsee auf das ganze Jahr ausweiten. Winterurlaub an der
   Ostsee gibt es tatsächlich, die Bäderarchitektur-Orte haben im Dezember
   offen. Das ist eine Änderung an `monate` in `data/ziele.js`.
2. Island küstennah machen. Die Häuser dort haben fast alle
   `distanceToBeach: null`, obwohl Island schwarze Sandstrände hat.

Beides steht noch nicht fest.
