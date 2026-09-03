#!/usr/bin/env python3
"""
Schreibt ein per Browser geholtes Bild an seinen Platz.

Der Browser im Claude-Fenster speichert Downloads nicht ins Dateisystem.
Stattdessen wird das Bild in der Seite als JPEG kodiert und ueber das
Werkzeugergebnis geholt - zu gross fuer die Antwort, deshalb landet es
automatisch in einer Datei. Die wird hier ausgelesen.

  python3 bilder/bild-ablegen.py <ergebnisdatei> <ordner>
  z. B.  ... hotels/h27-thalassa-bay
"""
import base64, json, os, re, sys

if len(sys.argv) < 3:
    sys.exit(__doc__)

quelle, ordner = sys.argv[1], sys.argv[2]
hier = os.path.dirname(os.path.abspath(__file__))

daten = json.load(open(quelle))
text = "".join(t["text"] for t in daten if t.get("type") == "text")
treffer = re.match(r'\s*"([A-Za-z0-9+/=]+)"', text)
if not treffer:
    sys.exit("Keine Base64-Nutzlast in der Datei gefunden.")

ziel_ordner = os.path.join(hier, "generiert", ordner)
os.makedirs(ziel_ordner, exist_ok=True)
ziel = os.path.join(ziel_ordner, "2.jpg")
roh = base64.b64decode(treffer.group(1))
open(ziel, "wb").write(roh)
print(f"{ordner}/2.jpg  {len(roh)//1024} KB")
