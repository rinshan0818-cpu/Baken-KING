"""Discover JRA race-card URLs from official pages by following actual links.

Does not synthesize opaque CNAME tokens. Supply an official race-card index
or a race page with navigable links. Reports missing races explicitly.
Usage: python scripts/discover_jra_urls.py https://sp.jra.jp/... manifest.json
"""
import argparse
import json
import re
from urllib.parse import urljoin, urlparse, parse_qs
from urllib.request import Request, urlopen
from bs4 import BeautifulSoup

HOSTS = {"jra.jp", "sp.jra.jp", "app.jra.jp"}
VENUE_CODES = {"東京": "05", "京都": "08"}

def race_key(url, date):
    query = parse_qs(urlparse(url).query)
    token = query.get("CNAME", [""])[0]
    # JRA tokens vary by presentation; validate embedded meeting/venue/race/date.
    match = re.search(r"01(05|08)\d{4}(\d{2})(\d{8})", token)
    if not match or match.group(3) != date.replace("-", ""):
        return None
    venue = next((v for v, c in VENUE_CODES.items() if c == match.group(1)), None)
    race = int(match.group(2))
    if not venue or not 1 <= race <= 12:
        return None
    return date, venue, race

def discover(html, base_url, date):
    soup = BeautifulSoup(html, "html.parser")
    found = {}
    for a in soup.select("a[href]"):
        url = urljoin(base_url, a["href"])
        p = urlparse(url)
        if p.scheme != "https" or p.hostname not in HOSTS or "/JRADB/accessD.html" not in p.path:
            continue
        key = race_key(url, date)
        if key:
            found.setdefault(key, url)
    return [{"date": day, "venue": venue, "raceNumber": race, "url": url}
            for (day, venue, race), url in sorted(found.items())]

def main():
    p = argparse.ArgumentParser()
    p.add_argument("official_index_url")
    p.add_argument("output")
    p.add_argument("--date", default="2026-10-31")
    a = p.parse_args()
    parsed = urlparse(a.official_index_url)
    if parsed.scheme != "https" or parsed.hostname not in HOSTS:
        p.error("Only official JRA HTTPS URLs accepted")
    with urlopen(Request(a.official_index_url, headers={"User-Agent":"BakenKingCardImporter/1.0"}), timeout=15) as response:
        html = response.read(3_000_001)
        if len(html) > 3_000_000:
            raise ValueError("response_too_large")
        charset = response.headers.get_content_charset() or "utf-8"
    entries = discover(html.decode(charset, errors="replace"), a.official_index_url, a.date)
    with open(a.output, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)
        f.write("\n")
    missing = [(v, r) for v in VENUE_CODES for r in range(1,13)
               if not any(x["venue"] == v and x["raceNumber"] == r for x in entries)]
    print("Discovered", len(entries), "of 24; missing:", missing)
    if missing:
        raise SystemExit(2)

if __name__ == "__main__":
    main()
