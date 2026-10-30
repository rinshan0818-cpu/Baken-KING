"""Bounded discovery of JRA race URLs from official starting pages.

Uses only actual hyperlinks (never guesses CNAME checksums). Run with:
 python scripts/crawl_jra_cards.py output.json https://sp.jra.jp/JRADB/accessD.html?CNAME=...
"""
import argparse
import json
import time
from collections import deque
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from bs4 import BeautifulSoup
from discover_jra_urls import HOSTS, discover, race_key

def crawl(seeds, day="2026-10-31", max_pages=75):
    queue = deque((url, 0) for url in seeds)
    visited, races, failures = set(), {}, []
    while queue and len(visited) < max_pages and len(races) < 36:
        url, depth = queue.popleft()
        if url in visited:
            continue
        p = urlparse(url)
        if p.scheme != "https" or p.hostname not in HOSTS or p.path != "/JRADB/accessD.html":
            continue
        visited.add(url)
        try:
            with urlopen(Request(url, headers={"User-Agent":"BakenKingCardImporter/1.0"}), timeout=15) as res:
                if urlparse(res.geturl()).hostname not in HOSTS:
                    raise ValueError("unsafe_redirect")
                raw = res.read(3_000_001)
                if len(raw) > 3_000_000:
                    raise ValueError("response_too_large")
                from fetch_jra_cards import decode_jra_html
                html, _ = decode_jra_html(raw, res.headers.get_content_charset())
            for entry in discover(html, url, day):
                key = entry["date"], entry["venue"], entry["raceNumber"]
                races.setdefault(key, entry)
            own = race_key(url, day)
            if own:
                races.setdefault(own, {"date":own[0],"venue":own[1],"raceNumber":own[2],"url":url})
            if depth < 2:
                soup = BeautifulSoup(html, "html.parser")
                for a in soup.select("a[href]"):
                    next_url = urljoin(url, a["href"])
                    next_p = urlparse(next_url)
                    if next_p.scheme == "https" and next_p.hostname in HOSTS and next_p.path == "/JRADB/accessD.html":
                        if race_key(next_url, day) or depth == 0:
                            queue.append((next_url, depth+1))
        except Exception as exc:
            failures.append({"url":url,"error":str(exc)})
        time.sleep(1.2)
    return [races[k] for k in sorted(races)], failures

def main():
    p = argparse.ArgumentParser()
    p.add_argument("output")
    p.add_argument("seeds", nargs="+")
    p.add_argument("--date", default="2026-10-31")
    a = p.parse_args()
    cards, errors = crawl(a.seeds, a.date)
    with open(a.output,"w",encoding="utf-8") as f:
        json.dump(cards,f,ensure_ascii=False,indent=2)
        f.write("\n")
    print(json.dumps({"discovered":len(cards),"venues":sorted(set(c["venue"] for c in cards)),"errors":errors},ensure_ascii=False))
    if not cards:
        raise SystemExit("No race cards discovered")

if __name__ == "__main__":
    main()
