"""Read-only discovery of dated race links from a small set of official JRA index pages.

No guessed CNAMEs. A dated link must be present in the fetched official HTML.
"""
import argparse
import json
from datetime import date, timedelta
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from bs4 import BeautifulSoup
from discover_jra_urls import HOSTS, race_key

INDEX_URLS = (
    "https://www.jra.go.jp/",
    "https://www.jra.go.jp/keiba/",
    "https://www.jra.go.jp/keiba/calendar/",
)

def inspect_index(url, day):
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in HOSTS:
        raise ValueError("unapproved_index")
    req = Request(url, headers={"User-Agent": "BakenKingCardImporter/1.0"})
    with urlopen(req, timeout=20) as response:
        final = urlparse(response.geturl())
        if final.scheme != "https" or final.hostname not in HOSTS:
            raise ValueError("unsafe_redirect")
        raw = response.read(3_000_001)
        if len(raw) > 3_000_000:
            raise ValueError("response_too_large")
        from fetch_jra_cards import decode_jra_html
        html, _ = decode_jra_html(raw, response.headers.get_content_charset())
    soup = BeautifulSoup(html, "html.parser")
    results = {}
    for a in soup.select("a[href]"):
        candidate = urljoin(url, a["href"])
        target = urlparse(candidate)
        if target.scheme != "https" or target.hostname not in HOSTS or target.path != "/JRADB/accessD.html":
            continue
        key = race_key(candidate, day)
        if key:
            results.setdefault(key, candidate)
    return results

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("output")
    parser.add_argument("--date", help="YYYY-MM-DD; defaults to upcoming Saturday in Japan")
    parser.add_argument("--days-ahead", type=int, default=0, help="Additional dates to scan after target, up to 3")
    parser.add_argument("--index-url", action="append", help="Optional additional official index")
    args = parser.parse_args()
    if args.date:
        target = date.fromisoformat(args.date)
    else:
        from datetime import datetime, timezone
        from zoneinfo import ZoneInfo
        today = datetime.now(timezone.utc).astimezone(ZoneInfo("Asia/Tokyo")).date()
        target = today + timedelta(days=(5 - today.weekday()) % 7)
    if not 0 <= args.days_ahead <= 3:
        parser.error("--days-ahead must be 0..3")
    reports, seeds_by_date = [], {}
    for offset in range(args.days_ahead + 1):
        day = (target + timedelta(days=offset)).isoformat()
        found, errors = {}, []
        for url in INDEX_URLS + tuple(args.index_url or []):
            try:
                for key, value in inspect_index(url, day).items():
                    found.setdefault(key, value)
            except Exception as exc:
                errors.append({"index": url, "errorType": type(exc).__name__})
        reports.append({"date": day, "indexesChecked": len(INDEX_URLS) + len(args.index_url or []),
                        "foundRaceLinks": len(found), "venues": sorted({k[1] for k in found}),
                        "status": "links_found" if found else "not_yet_discovered",
                        "errors": errors})
        seeds_by_date[day] = [found[key] for key in sorted(found)]
    report = {"dates": reports, "status": "links_found" if any(r["foundRaceLinks"] for r in reports)
              else "not_yet_discovered"}
    with open(args.output + ".seeds.json", "w", encoding="utf-8") as f:
        json.dump(seeds_by_date, f, ensure_ascii=False)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(json.dumps(report, ensure_ascii=False))
    # Absence is a legitimate state: never invent opaque race URL tokens.

if __name__ == "__main__":
    main()
