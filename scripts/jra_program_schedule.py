"""Read JRA's public daily race-program pages to identify scheduled venues.

Program pages are provisional: never treat them as confirmed entry cards.
"""
import argparse
import json
import re
from datetime import date
from urllib.request import Request, urlopen
from bs4 import BeautifulSoup

VENUES = ("札幌","函館","福島","新潟","東京","中山","中京","京都","阪神","小倉")
BASE = "https://www.jra.go.jp/keiba/calendar{year}/{year}/{month:02d}/{month:02d}{day:02d}.html"

def extract_venues(html):
    text = BeautifulSoup(html, "html.parser").get_text(" ", strip=True)
    return [venue for venue in VENUES if re.search(r"\d+\s*回\s*" + venue + r"\s*\d+\s*日", text)]

def discover_day(day, opener=urlopen):
    d = date.fromisoformat(day)
    url = BASE.format(year=d.year, month=d.month, day=d.day)
    try:
        with opener(Request(url, headers={"User-Agent":"BakenKingCardImporter/1.0"}), timeout=15) as res:
            if not res.geturl().startswith("https://www.jra.go.jp/keiba/calendar"):
                raise ValueError("unexpected_redirect")
            raw = res.read(1_000_001)
            if len(raw) > 1_000_000:
                raise ValueError("response_too_large")
            charset = res.headers.get_content_charset() or "utf-8"
        venues = extract_venues(raw.decode(charset, errors="replace"))
        if not venues:
            raise ValueError("no_venues_on_program")
        return {"date":day,"venues":venues,"programUrl":url,"status":"provisional_program"}
    except Exception as exc:
        return {"date":day,"venues":[],"programUrl":url,"status":"unverified","error":str(exc)}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("dates", nargs="+")
    p.add_argument("--output")
    a=p.parse_args()
    result={"days":[discover_day(day) for day in a.dates]}
    output=json.dumps(result,ensure_ascii=False,indent=2)+"\n"
    if a.output:
        with open(a.output,"w",encoding="utf-8") as f:
            f.write(output)
    print(output)

if __name__=="__main__":
    main()
