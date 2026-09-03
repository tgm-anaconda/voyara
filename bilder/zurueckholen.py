#!/usr/bin/env python3
"""
Holt aussortierte Bilder zurueck.

Die Dateien sind geloescht, aber in verworfen.json steht die Pexels-ID —
darueber laesst sich dasselbe Foto erneut laden.

  python3 bilder/zurueckholen.py --alle
  python3 bilder/zurueckholen.py hotels/h02-hotel-arenal-blau/2.png
  python3 bilder/zurueckholen.py --ausser marke    alle ausser mit "marke" im Grund
"""

import json
import os
import sys
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ZIEL = os.path.join(HERE, "generiert")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) voyara-stock/1.0"


def lade_schluessel():
    with open(os.path.join(HERE, ".env")) as fh:
        for zeile in fh:
            if zeile.startswith("PEXELS_API_KEY="):
                return zeile.split("=", 1)[1].strip()
    sys.exit("Kein Pexels-Schluessel in bilder/.env")


def foto_holen(schluessel, pexels_id):
    req = urllib.request.Request(
        "https://api.pexels.com/v1/photos/%s" % pexels_id,
        headers={"Authorization": schluessel, "User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def herunterladen(url, ziel):
    os.makedirs(os.path.dirname(ziel), exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp, open(ziel, "wb") as fh:
        fh.write(resp.read())
    return os.path.getsize(ziel)


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)

    schluessel = lade_schluessel()
    vpfad = os.path.join(HERE, "verworfen.json")
    verworfen = json.load(open(vpfad))

    mpfad = os.path.join(ZIEL, "bildquellen.json")
    manifest = json.load(open(mpfad)) if os.path.exists(mpfad) else []
    schon_da = {m["datei"] for m in manifest}

    if args[0] == "--alle":
        auswahl = list(verworfen)
    elif args[0] == "--ausser":
        stichwort = args[1].lower() if len(args) > 1 else ""
        auswahl = [v for v in verworfen if stichwort not in v.get("grund", "").lower()]
    else:
        auswahl = [v for v in verworfen if v["datei"] in args]

    # Nur je Zieldatei das erste Vorkommen, sonst ueberschreiben sich mehrere
    # Fehlversuche derselben Position gegenseitig
    gesehen, gefiltert = set(), []
    for v in auswahl:
        if v["datei"] in gesehen or v["datei"] in schon_da:
            continue
        gesehen.add(v["datei"])
        gefiltert.append(v)
    auswahl = gefiltert

    if not auswahl:
        sys.exit("Nichts zum Zurueckholen gefunden.")

    print("%d Bilder werden zurueckgeholt.\n" % len(auswahl))
    zurueck = 0

    for v in auswahl:
        try:
            foto = foto_holen(schluessel, v["pexels_id"])
        except urllib.error.HTTPError as e:
            print("  ! %s: HTTP %s" % (v["datei"], e.code))
            continue

        ziel = os.path.join(ZIEL, v["datei"])
        try:
            groesse = herunterladen(foto["src"]["large2x"], ziel)
        except Exception as e:
            print("  ! Download %s: %s" % (v["datei"], e))
            continue

        manifest.append({
            "datei": v["datei"],
            "kategorie": v.get("kategorie", ""),
            "ort": "",
            "motiv": "",
            "pexels_id": foto["id"],
            "pexels_url": foto["url"],
            "fotograf": foto["photographer"],
            "fotograf_url": foto["photographer_url"],
            "avg_color": foto.get("avg_color", ""),
            "alt": foto.get("alt", ""),
            "geprueft": True,
        })
        verworfen = [x for x in verworfen if x["pexels_id"] != v["pexels_id"]]
        zurueck += 1
        print("  %-42s %6.1f KB  %s" % (v["datei"], groesse / 1024, foto["photographer"]))

    json.dump(manifest, open(mpfad, "w"), indent=2, ensure_ascii=False)
    json.dump(verworfen, open(vpfad, "w"), indent=2, ensure_ascii=False)

    print("\n%d zurueckgeholt. Noch gesperrt: %d" % (zurueck, len(verworfen)))


if __name__ == "__main__":
    main()
