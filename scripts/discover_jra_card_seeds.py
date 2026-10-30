"""Conservative discovery of *linked* JRA entry-card seeds.

Only URLs explicitly present as hyperlinks on supplied official pages are
considered. No guessed CNAME values, no card redistribution or publication.
"""
import argparse
import json
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from bs4 import BeautifulSoup

HOSTS = {"jra.jp", "sp.jra.jp", "app.jra.jp"}

def extract_seeds(html, base_url):
    found = set()
    for anchor in BeautifulSoup(html, "html.parser").select("a[href]"):
        url = urljoin(base_url, anchor["href"])
        p = urlparse(url)
        if p.scheme == "https" and p.hostname in HOSTS and p.path == "/JRADB/accessD.html" and "CNAME=" in p.query.upper():
            found.add(url)
    return sorted(found)

def inspect(url, opener=urlopen):
    p = urlparse(url)
    if p.scheme != "https" or p.hostname not in {"www.jra.go.jp", *HOSTS}:
        raise ValueError("invalid_official_source")
    with opener(Request(url, headers={"User-Agent": "BakenKingCardImporter/1.0"}), timeout=15) as res:
        final = urlparse(res.geturl())
        if final.scheme != "https" or final.hostname not in {"www.jra.go.jp", *HOSTS}:
            raise ValueError("unsafe_redirect")
        raw = res.read(1_000_001)
        if len(raw) > 1_000_000:
            raise ValueError("response_too_large")
        html = raw.decode(res.headers.get_content_charset() or "utf-8", errors="replace")
        return extract_seeds(html, res.geturl())

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--schedule", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    days = json.load(open(args.schedule, encoding="utf-8"))["days"]
    result = {"status": "discovery_only_not_verified", "days": []}
    for day in days:
        entry = {"date": day["date"], "programUrl": day["programUrl"], "seedUrls": [], "status": "no_confirmed_seed"}
        if day["status"] == "provisional_program":
            try:
                entry["seedUrls"] = inspect(day["programUrl"])
                if entry["seedUrls"]:
                    entry["status"] = "candidate_links_found_unverified"
            except Exception as exc:
                entry["status"] = "source_error"
                entry["error"] = str(exc)
        result["days"].append(entry)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
