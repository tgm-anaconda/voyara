#!/usr/bin/env python3
"""
Holt die Stock-Bilder fuer den Voyara-Katalog von Pexels.

Anders als der urspruengliche Entwurf arbeitet dieses Skript nicht mit
generischen Hotelprofilen, sondern direkt gegen stock-bedarf.json: dort steht
fuer jedes benoetigte Bild der exakte Zieldateiname, die Kategorie und der Ort.

Innerhalb einer Unterkunft dient das erste Bild als Farbanker, die uebrigen
werden farblich daran ausgerichtet, damit ein Set zusammenpasst.

Nur Standardbibliothek, kein pip noetig.

  python3 bilder/stock-holen.py                 alles Offene holen
  python3 bilder/stock-holen.py --limit 10      nur die naechsten 10
  python3 bilder/stock-holen.py --nur regionen  nur einen Bereich
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
ZIEL = os.path.join(HERE, "generiert")

# Ohne eigenen User-Agent antwortet Cloudflare vor Pexels mit 403 (Fehler 1010).
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) voyara-stock/1.0"

# Farbabstimmung nur innerhalb der relevantesten Treffer, sonst gewinnt ein
# thematisch schwacher Treffer allein wegen der Farbe.
RELEVANZ_FENSTER = 25

# Nach so vielen Bildern erinnert das Skript an die Markenpruefung.
PRUEF_INTERVALL = 10


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
        sys.exit("Kein Pexels-Schluessel. Entweder bilder/.env anlegen mit\n"
                 "  PEXELS_API_KEY=dein_schluessel\n"
                 "oder  export PEXELS_API_KEY=...")
    return schluessel


def suche(schluessel, query, budget):
    params = urllib.parse.urlencode({
        "query": query, "per_page": 80, "page": 1, "orientation": "landscape",
    })
    req = urllib.request.Request(
        API + "?" + params, headers={"Authorization": schluessel, "User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            daten = json.loads(resp.read().decode())
            rest = resp.headers.get("x-ratelimit-remaining")
            if rest is not None:
                budget["rest"] = rest
            budget["anfragen"] += 1
            return daten.get("photos", [])
    except urllib.error.HTTPError as e:
        if e.code == 429:
            sys.exit("Pexels-Rate-Limit erreicht. Spaeter weitermachen, "
                     "bereits geladene Bilder bleiben erhalten.")
        print("  ! Suche '%s' fehlgeschlagen: HTTP %s" % (query, e.code))
        return []


def rgb(hexfarbe):
    h = (hexfarbe or "#808080").lstrip("#")
    try:
        return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    except (ValueError, IndexError):
        return 128, 128, 128


def farbabstand(a, b):
    ra, ga, ba = rgb(a)
    rb, gb, bb = rgb(b)
    return ((ra - rb) ** 2 + (ga - gb) ** 2 + (ba - bb) ** 2) ** 0.5


def passt(foto, muss, negativ, min_breite):
    """Themenfilter ueber den Alt-Text plus Mindestbreite."""
    if foto["width"] < min_breite:
        return False
    alt = (foto.get("alt") or "").lower()
    if not alt:
        return False
    if any(n in alt for n in negativ):
        return False
    if muss and not any(m in alt for m in muss):
        return False
    return True


def kandidaten(schluessel, queries, muss, negativ, min_breite, benutzt, budget, cache):
    schluessel_cache = tuple(queries)
    if schluessel_cache in cache:
        pool = cache[schluessel_cache]
    else:
        pool, gesehen = [], set()
        for q in queries:
            for f in suche(schluessel, q, budget):
                if f["id"] in gesehen:
                    continue
                gesehen.add(f["id"])
                pool.append(f)
            time.sleep(0.15)  # hoeflich gegenueber der API
        cache[schluessel_cache] = pool
    return [f for f in pool
            if f["id"] not in benutzt and passt(f, muss, negativ, min_breite)]


def herunterladen(url, ziel):
    os.makedirs(os.path.dirname(ziel), exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp, open(ziel, "wb") as fh:
        fh.write(resp.read())
    return os.path.getsize(ziel)


def gruppe_von(datei):
    """hotels/h03-2.png -> h03 ; regionen/es-trenc.png -> regionen"""
    ordner, name = datei.split("/", 1)
    if ordner in ("hotels", "wohnungen"):
        return name.split("-")[0]
    return ordner


STOPPWOERTER = {
    "with", "and", "the", "a", "an", "of", "in", "at", "on", "to", "for",
    "seen", "from", "into", "over", "under", "where", "appropriate", "no",
}


def motiv_query(motiv):
    """Macht aus der Bildregie eine kurze Suchanfrage.

    Der Motivtext ist die eigentliche Bildidee ("green inner courtyard with
    potted lemon trees"). Ohne ihn sucht das Skript nur nach der Kategorie und
    landet bei beliebigen Hotelbildern aus aller Welt — im ersten Testlauf kam
    so eine asiatische Lobby als Palmaer Innenhof heraus.
    """
    worte = [w.strip(",.") for w in motiv.lower().split()]
    worte = [w for w in worte if w and w not in STOPPWOERTER]
    return " ".join(worte[:5])


def queries_fuer(eintrag, cfg):
    kat = eintrag["kategorie"]
    ort = eintrag.get("ort", "")
    ordner = eintrag["file"].split("/")[0]

    if ordner == "mietwagen":
        # Kategorie steckt im Motiv-Text: "Seat Ibiza, Kleinwagen, rental car exterior"
        teile = [t.strip() for t in eintrag["motiv"].split(",")]
        klasse = teile[1] if len(teile) > 1 else "Kleinwagen"
        return cfg["mietwagen"].get(klasse, cfg["mietwagen"]["Kleinwagen"]), [], 1200

    # Regionen und Startseite: reine Ortsaufnahmen, hier gibt es kein Einzelmotiv
    if ordner in ("regionen", "hero"):
        q = cfg["orte"].get(ort) or cfg["orte"]["Mallorca"]
        return q, [], cfg["kategorien"]["aussen"]["min_breite"]

    # Aussenaufnahmen einer Unterkunft haben sehr wohl ein Motiv
    # ("Pergola-Tisch unter Weinreben"). Frueher fiel das unter den Tisch und es
    # kam irgendein Mallorca-Landschaftsbild — daher zuerst nach dem Motiv suchen.
    if kat == "aussen":
        eigen = motiv_query(eintrag["motiv"])
        ortsbegriffe = cfg["orte"].get(ort) or cfg["orte"]["Mallorca"]
        queries = [eigen, eigen + " mediterranean", eigen + " spain"] + ortsbegriffe
        return queries, [], cfg["kategorien"]["aussen"]["min_breite"]

    # Zuerst nach dem konkreten Motiv suchen, dann mit dem Stilhinweis des
    # Hauses, zuletzt die Kategorie als Auffangnetz
    k = cfg["kategorien"][kat]
    eigen = motiv_query(eintrag["motiv"])
    stil = eintrag.get("stil", "")
    queries = [eigen]
    if stil:
        queries.append(stil + " " + eigen)
        queries.append(stil + " hotel " + kat_englisch(kat))
    queries.append(eigen + " mediterranean")
    queries += k["queries"]
    return queries, k["muss"], k["min_breite"]


def kat_englisch(kat):
    return {"zimmer": "bedroom", "bad": "bathroom", "pool": "pool",
            "lobby": "interior", "aussen": "exterior"}.get(kat, kat)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="hoechstens so viele Bilder")
    ap.add_argument("--nur", help="nur dieser Ordner (hotels, wohnungen, mietwagen, regionen, hero)")
    ap.add_argument("--size", default="large2x",
                    choices=("original", "large2x", "large", "medium", "landscape"))
    args = ap.parse_args()

    schluessel = lade_schluessel()
    with open(os.path.join(HERE, "suchbegriffe.json")) as fh:
        cfg = json.load(fh)
    with open(os.path.join(HERE, "stock-bedarf.json")) as fh:
        bedarf = json.load(fh)

    negativ = cfg["negativ"]

    offen = [e for e in bedarf if not os.path.exists(os.path.join(ZIEL, e["file"]))]
    if args.nur:
        offen = [e for e in offen if e["file"].startswith(args.nur + "/")]
    if args.limit:
        offen = offen[:args.limit]

    if not offen:
        print("Nichts offen. Alle Stock-Bilder liegen bereits vor.")
        return

    print("%d Bilder zu holen.\n" % len(offen))

    # Manifest fortschreiben, damit Quellen und Pruefstand erhalten bleiben
    manifest_pfad = os.path.join(ZIEL, "bildquellen.json")
    manifest = []
    if os.path.exists(manifest_pfad):
        with open(manifest_pfad) as fh:
            manifest = json.load(fh)

    # Aussortierte Fotos dauerhaft sperren. Ohne diese Liste liefert Pexels
    # dieselbe Aufnahme beim naechsten Lauf wieder, weil sie nach dem Loeschen
    # nicht mehr im Manifest steht.
    verworfen_pfad = os.path.join(HERE, "verworfen.json")
    verworfen = []
    if os.path.exists(verworfen_pfad):
        with open(verworfen_pfad) as fh:
            verworfen = json.load(fh)

    benutzt = {m["pexels_id"] for m in manifest} | {v["pexels_id"] for v in verworfen}
    if verworfen:
        print("%d Fotos sind dauerhaft gesperrt (frueher aussortiert).\n" % len(verworfen))

    budget = {"anfragen": 0, "rest": "?"}
    cache = {}
    anker_farbe = {}
    fertig = 0

    for eintrag in offen:
        gruppe = gruppe_von(eintrag["file"])
        queries, muss, min_breite = queries_fuer(eintrag, cfg)
        pool = kandidaten(schluessel, queries, muss, negativ, min_breite,
                          benutzt, budget, cache)
        if not pool:
            print("  ! Kein passender Treffer fuer %s" % eintrag["file"])
            continue

        # Erstes Bild einer Unterkunft setzt die Farbe, der Rest richtet sich danach
        if gruppe in anker_farbe:
            foto = min(pool[:RELEVANZ_FENSTER],
                       key=lambda p: farbabstand(p["avg_color"], anker_farbe[gruppe]))
        else:
            foto = pool[0]
            if gruppe.startswith(("h", "a")) and len(gruppe) == 3:
                anker_farbe[gruppe] = foto["avg_color"]

        ziel = os.path.join(ZIEL, eintrag["file"])
        try:
            groesse = herunterladen(foto["src"][args.size], ziel)
        except Exception as e:
            print("  ! Download fehlgeschlagen (%s): %s" % (eintrag["file"], e))
            continue

        benutzt.add(foto["id"])
        fertig += 1
        print("  [%d/%d] %-26s %5dx%-5d %6.1f KB  %s"
              % (fertig, len(offen), eintrag["file"], foto["width"], foto["height"],
                 groesse / 1024, foto["photographer"]))

        manifest.append({
            "datei": eintrag["file"],
            "kategorie": eintrag["kategorie"],
            "ort": eintrag.get("ort", ""),
            "motiv": eintrag["motiv"],
            "pexels_id": foto["id"],
            "pexels_url": foto["url"],
            "fotograf": foto["photographer"],
            "fotograf_url": foto["photographer_url"],
            "avg_color": foto["avg_color"],
            "alt": foto.get("alt", ""),
            "geprueft": False,
        })

        os.makedirs(ZIEL, exist_ok=True)
        with open(manifest_pfad, "w") as fh:
            json.dump(manifest, fh, indent=2, ensure_ascii=False)

        if fertig % PRUEF_INTERVALL == 0:
            print("\n  ---- %d Bilder geladen. Jetzt pruefen: ----" % fertig)
            print("  node bilder/pruefen.mjs        Kontaktbogen oeffnen")
            print("  Auf Markennamen, erkennbare Gebaeude und Personen achten.\n")

    print("\nFertig: %d Bilder. API-Anfragen in diesem Lauf: %d, Monatsrest: %s"
          % (fertig, budget["anfragen"], budget["rest"]))
    print("Quellen: bilder/generiert/bildquellen.json")
    print("\nJETZT PRUEFEN:  node bilder/pruefen.mjs")


if __name__ == "__main__":
    main()
