#!/usr/bin/env python3
"""
Nimmt fertige Bilder aus der Browser-Seite entgegen und legt sie ab.

Warum: Der Browser im Claude-Fenster speichert Downloads nicht ins Dateisystem.
Der Umweg ueber das Werkzeugergebnis funktioniert, schiebt aber je Bild ein
halbes Megabyte durch den Kontext. Dieser Server nimmt das Bild direkt per
POST entgegen - die Seite meldet danach nur noch "ok".

  python3 bilder/empfang.py &
  POST http://127.0.0.1:8778/ablegen?ordner=hotels/h27-thalassa-bay
  Rumpf: Base64 des JPEG

Ordnernamen werden gegen den Roster geprueft, damit ueber den Parameter
nichts ausserhalb von bilder/generiert/ geschrieben werden kann.
"""
import base64, json, os, re, subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

HIER = os.path.dirname(os.path.abspath(__file__))
ZIEL = os.path.join(HIER, "generiert")

# Erlaubte Ordner einmal aus dem Roster einlesen
def erlaubte_ordner():
    aus = subprocess.run(
        ["node", "-e",
         "import('./hotel-roster.mjs').then(m=>{"
         "const s=t=>t.toLowerCase().replaceAll('ä','ae').replaceAll('ö','oe').replaceAll('ü','ue')"
         ".replaceAll('ß','ss').replaceAll('á','a').replaceAll('é','e').replaceAll('í','i')"
         ".replaceAll('ó','o').replaceAll('ú','u').replaceAll('à','a').replaceAll('è','e')"
         ".replaceAll('ò','o').replaceAll('ç','c').replaceAll('ñ','n')"
         ".replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');"
         "console.log(JSON.stringify(m.ROSTER.map(h=>'hotels/'+h.id+'-'+s(h.name))))})"],
        cwd=HIER, capture_output=True, text=True)
    liste = json.loads(aus.stdout.strip()) if aus.stdout.strip() else []
    # Die drei Kreta-Haeuser stehen nicht im Roster
    liste += ["hotels/h27-thalassa-bay", "hotels/h28-kastelli-chania", "hotels/h29-elounda-petra"]
    return set(liste)

ERLAUBT = erlaubte_ordner()
print(f"{len(ERLAUBT)} Zielordner freigegeben.")


class Empfang(BaseHTTPRequestHandler):
    def _kopf(self, code=200):
        self.send_response(code)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Type", "text/plain")
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()

    def do_POST(self):
        pfad = urlparse(self.path)
        ordner = (parse_qs(pfad.query).get("ordner") or [""])[0]
        if ordner not in ERLAUBT:
            self._kopf(400); self.wfile.write(b"unbekannter Ordner"); return

        laenge = int(self.headers.get("Content-Length", 0))
        b64 = self.rfile.read(laenge).decode("ascii", "ignore")
        b64 = re.sub(r"[^A-Za-z0-9+/=]", "", b64)
        try:
            roh = base64.b64decode(b64)
        except Exception:
            self._kopf(400); self.wfile.write(b"kein gueltiges Base64"); return
        if len(roh) < 20000:
            self._kopf(400); self.wfile.write(b"zu klein"); return

        ordner_voll = os.path.join(ZIEL, ordner)
        os.makedirs(ordner_voll, exist_ok=True)
        with open(os.path.join(ordner_voll, "2.jpg"), "wb") as fh:
            fh.write(roh)
        print(f"  {ordner}/2.jpg  {len(roh)//1024} KB")
        self._kopf(); self.wfile.write(b"ok")

    def log_message(self, *a):
        pass


HTTPServer(("127.0.0.1", 8778), Empfang).serve_forever()
