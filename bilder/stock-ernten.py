#!/usr/bin/env python3
"""
Erntet Stockbilder in einen Vorrat, statt sie einzeln zu bestellen.

Warum umgedreht?
----------------
Der alte Weg (stock-holen.py) ging vom fertigen Katalog aus: Erst stand fest,
dass Hotel h14 ein Bild "Sandsteinfassade am Dorfplatz" braucht, dann wurde
danach gesucht. Das kostet viele Anfragen und liefert oft trotzdem etwas
anderes, weil Pexels nun einmal hat, was es hat.

Dieses Skript geht den umgekehrten Weg: Es holt breit, was zu einem Ziel und
einem Thema passt, legt alles in einen Vorrat und laesst die Zuordnung offen.
Erst danach werden die Bilder zu Haeusern gebuendelt und der Katalogtext dazu
geschrieben. Eine Suchanfrage liefert bis zu 80 Fotos - der Vorrat fuellt sich
also mit einem Bruchteil der Anfragen.

  python3 bilder/stock-ernten.py                     alles aus dem Plan
  python3 bilder/stock-ernten.py --ziel kreta        nur ein Ziel
  python3 bilder/stock-ernten.py --thema zimmer      nur ein Thema
  python3 bilder/stock-ernten.py --je 12             hoechstens 12 je Kombination
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.pexels.com/v1/search"
HERE = os.path.dirname(os.path.abspath(__file__))
POOL = os.path.join(HERE, "pool")
PLAN = os.path.join(HERE, "ernte-plan.json")
MANIFEST = os.path.join(POOL, "vorrat.json")
VERWORFEN = os.path.join(HERE, "verworfen.json")

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) voyara-stock/1.0"
MIN_BREITE = 1600


def lade_schluessel():
    for pfad in (os.path.join(HERE, ".env"), os.path.join(HERE, "..", ".env")):
        try:
            with open(pfad) as fh:
                for zeile in fh:
                    if zeile.startswith("PEXELS_API_KEY="):
                        return zeile.split("=", 1)[1].strip()
        except FileNotFoundError:
            continue
    schluessel = os.environ.get("PEXELS_API_KEY")
    if not schluessel:
        sys.exit("Kein Pexels-Schluessel in bilder/.env")
    return schluessel


def suche(schluessel, query, seite, budget):
    """Eine Suchseite mit bis zu 80 Treffern."""
    url = API + "?" + urllib.parse.urlencode({
        "query": query, "per_page": 80, "page": seite, "orientation": "landscape",
    })
    req = urllib.request.Request(url, headers={"Authorization": schluessel, "User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as antwort:
            budget["anfragen"] += 1
            rest = antwort.headers.get("X-Ratelimit-Remaining")
            if rest is not None:
                budget["rest"] = rest
            return json.loads(antwort.read().decode())["photos"]
    except urllib.error.HTTPError as fehler:
        if fehler.code == 429:
            raise SystemExit("\nPexels-Rate-Limit erreicht. Spaeter weitermachen, "
                             "der Vorrat bleibt erhalten.")
        print(f"    HTTP {fehler.code} bei '{query}'")
        return []
    except Exception as fehler:                      # noqa: BLE001
        print(f"    Fehler bei '{query}': {fehler}")
        return []


def passt(foto, negativ):
    """Grobfilter ueber Alt-Text und Groesse. Die Feinpruefung macht das Auge."""
    if foto["width"] < MIN_BREITE:
        return False
    alt = (foto.get("alt") or "").lower()
    if not alt:
        return False
    return not any(n in alt for n in negativ)


def hole(foto, ziel_pfad):
    quelle = foto["src"].get("large2x") or foto["src"]["large"]
    req = urllib.request.Request(quelle, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as antwort:
        daten = antwort.read()
    os.makedirs(os.path.dirname(ziel_pfad), exist_ok=True)
    with open(ziel_pfad, "wb") as fh:
        fh.write(daten)
    return len(daten)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ziel", help="nur dieses Ziel (z. B. kreta)")
    ap.add_argument("--thema", help="nur dieses Thema (z. B. zimmer)")
    ap.add_argument("--je", type=int, default=10, help="hoechstens so viele je Kombination")
    ap.add_argument("--seiten", type=int, default=2, help="so viele Suchseiten durchgehen")
    args = ap.parse_args()

    schluessel = lade_schluessel()
    with open(PLAN) as fh:
        plan = json.load(fh)
    with open(os.path.join(HERE, "suchbegriffe.json")) as fh:
        negativ = json.load(fh)["negativ"]

    eintraege = plan["eintraege"]
    if args.ziel:
        eintraege = [e for e in eintraege if e["ziel"] == args.ziel]
    if args.thema:
        eintraege = [e for e in eintraege if e["thema"] == args.thema]
    if not eintraege:
        sys.exit("Nichts im Plan, das dazu passt.")

    vorrat = []
    if os.path.exists(MANIFEST):
        with open(MANIFEST) as fh:
            vorrat = json.load(fh)

    gesperrt = set()
    if os.path.exists(VERWORFEN):
        with open(VERWORFEN) as fh:
            gesperrt = {v["pexels_id"] for v in json.load(fh)}

    benutzt = {v["pexels_id"] for v in vorrat} | gesperrt
    budget = {"anfragen": 0, "rest": "?"}
    neu_gesamt = 0

    print(f"{len(eintraege)} Kombinationen aus Ziel und Thema, "
          f"hoechstens {args.je} Bilder je Kombination.\n")

    for eintrag in eintraege:
        ziel, thema = eintrag["ziel"], eintrag["thema"]
        ordner = os.path.join(POOL, ziel, thema)
        vorhanden = len(os.listdir(ordner)) if os.path.isdir(ordner) else 0
        fehlend = args.je - vorhanden
        if fehlend <= 0:
            print(f"  {ziel}/{thema}: {vorhanden} schon da, uebersprungen")
            continue

        geholt = 0
        for query in eintrag["queries"]:
            if geholt >= fehlend:
                break
            for seite in range(1, args.seiten + 1):
                if geholt >= fehlend:
                    break
                for foto in suche(schluessel, query, seite, budget):
                    if geholt >= fehlend:
                        break
                    if foto["id"] in benutzt or not passt(foto, negativ):
                        continue
                    pfad = os.path.join(ordner, f"{foto['id']}.jpg")
                    try:
                        groesse = hole(foto, pfad)
                    except Exception as fehler:       # noqa: BLE001
                        print(f"    Download fehlgeschlagen: {fehler}")
                        continue
                    benutzt.add(foto["id"])
                    vorrat.append({
                        "datei": f"{ziel}/{thema}/{foto['id']}.jpg",
                        "ziel": ziel, "thema": thema, "query": query,
                        "pexels_id": foto["id"], "pexels_url": foto["url"],
                        "fotograf": foto["photographer"],
                        "fotograf_url": foto["photographer_url"],
                        "avg_color": foto.get("avg_color"),
                        "alt": foto.get("alt", ""),
                        "breite": foto["width"], "hoehe": foto["height"],
                        "geprueft": False, "verwendet": None,
                    })
                    geholt += 1
                    neu_gesamt += 1
                    print(f"  {ziel}/{thema}  {foto['id']}  "
                          f"{foto['width']}x{foto['height']}  {groesse // 1024} KB  "
                          f"{(foto.get('alt') or '')[:52]}")
                    time.sleep(0.1)

        if geholt < fehlend:
            print(f"    nur {geholt} von {fehlend} gefunden fuer {ziel}/{thema}")

        os.makedirs(POOL, exist_ok=True)
        with open(MANIFEST, "w") as fh:
            json.dump(vorrat, fh, indent=2, ensure_ascii=False)

    print(f"\nFertig: {neu_gesamt} neue Bilder im Vorrat, {len(vorrat)} insgesamt.")
    print(f"API-Anfragen in diesem Lauf: {budget['anfragen']}, Stundenrest: {budget['rest']}")
    print("\nJETZT PRUEFEN:  node bilder/vorrat-pruefen.mjs")


if __name__ == "__main__":
    main()
