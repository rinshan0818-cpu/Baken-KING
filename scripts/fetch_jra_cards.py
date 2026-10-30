"""Fetch explicitly supplied JRA race-card URLs and parse them into validated JSON.

Only run where access and use are permitted. No login/captcha bypass, no
guessing opaque JRA URL tokens. Failed cards are reported and never invented.
Usage:
 python scripts/fetch_jra_cards.py urls.json parsed.json
Manifest: [{"date":"2026-10-31","venue":"東京","raceNumber":1,"url":"https://sp.jra.jp/JRADB/accessD.html?CNAME=..."}]
"""
import argparse
import json
import re
import time
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from jra_card_parser import parse_card
from jra_card_normalizer import normalize_cards

def fetch_cards(manifest, delay=1.5):
    cards, errors, diagnostics = [], [], []
    if not isinstance(manifest, list) or len(manifest) > 24:
        raise ValueError("manifest_must_be_list_of_at_most_24")
    seen = set()
    for item in manifest:
        key = (item["date"], item["venue"], item["raceNumber"])
        if key in seen:
            raise ValueError("duplicate_manifest_race")
        seen.add(key)
        url = item["url"]
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.hostname not in ("jra.jp", "sp.jra.jp", "app.jra.jp"):
            raise ValueError("unapproved_host")
        try:
            req = Request(url, headers={"User-Agent": "BakenKingCardImporter/1.0 (personal research)"})
            with urlopen(req, timeout=15) as response:
                if response.geturl().split("/")[2] not in ("jra.jp", "sp.jra.jp", "app.jra.jp"):
                    raise ValueError("redirected_to_unapproved_host")
                html = response.read(3_000_001)
                if len(html) > 3_000_000:
                    raise ValueError("response_too_large")
                declared_charset = response.headers.get_content_charset()
            # JRA's JRADB pages commonly use Shift_JIS/Windows-31J without an
            # HTTP charset. Inspect HTML's own declaration before falling back.
            head = html[:8192]
            meta = re.search(rb"<meta[^>]+charset\\s*=\\s*[^a-zA-Z0-9]*([a-zA-Z0-9_-]+)", head, re.I)
            charset = declared_charset or (meta.group(1).decode("ascii") if meta else None)
            if charset:
                if charset.lower().replace("_", "-") in ("shift-jis", "shift_jis", "sjis", "windows-31j", "x-sjis"):
                    charset = "cp932"
                decoded = html.decode(charset, errors="strict")
            else:
                try:
                    decoded = html.decode("utf-8", errors="strict")
                    charset = "utf-8"
                except UnicodeDecodeError:
                    decoded = html.decode("cp932", errors="strict")
                    charset = "cp932"
            try:
                cards.append(parse_card(decoded, *key))
            except ValueError as exc:
                if str(exc).startswith("horse_numbers_not_contiguous"):
                    from bs4 import BeautifulSoup
                    page = BeautifulSoup(decoded, "html.parser")
                    rows = []
                    for tr in page.select("tr"):
                        cells = tr.find_all(["td", "th"], recursive=False)
                        if not cells:
                            continue
                        labels = [c.get_text(" ", strip=True)[:65] for c in cells]
                        # Record candidate rows around the missing horse number.
                        if any(re.search(r"(?<!\\d)13(?!\\d)|取消|除外|出走取消", x) for x in labels):
                            rows.append({"class":tr.get("class", []),
                                         "cells":labels[:15],
                                         "images":[{"alt":im.get("alt", ""),
                                                    "src":im.get("src", "")[-75:]}
                                                   for im in tr.find_all("img")[:8]]})
                    diagnostics.append({"date":key[0],"venue":key[1],
                                        "raceNumber":key[2],
                                        "issue":"horse_numbers_not_contiguous",
                                        "matchingRows":rows[:35]})
                if str(exc) == "card_date_mismatch":
                    from bs4 import BeautifulSoup
                    from hashlib import sha256
                    page = BeautifulSoup(decoded, "html.parser")
                    title = page.title.get_text(" ", strip=True) if page.title else ""
                    visible = page.get_text(" ", strip=True)
                    diagnostics.append({"date":key[0],"venue":key[1],"raceNumber":key[2],
                                        "title":title[:120], "htmlBytes":len(html),
                                        "htmlSha256":sha256(html).hexdigest(),
                                        "visibleTextSample":visible[:350],
                                        "charset":charset})
                raise
        except Exception as exc:
            errors.append({"date":key[0],"venue":key[1],"raceNumber":key[2],"error":str(exc)})
        time.sleep(delay)
    return normalize_cards(cards) if cards else {"schemaVersion":1,"races":[],"raceCount":0}, errors, diagnostics

def main():
    p = argparse.ArgumentParser()
    p.add_argument("manifest", type=Path)
    p.add_argument("output", type=Path)
    p.add_argument("--require-complete", action="store_true")
    p.add_argument("--errors-output", type=Path, help="Write per-race failure diagnostics")
    a = p.parse_args()
    manifest = json.loads(a.manifest.read_text(encoding="utf-8"))
    data, errors, diagnostics = fetch_cards(manifest)
    if errors:
        print(json.dumps({"failures":errors}, ensure_ascii=False, indent=2))
    if a.errors_output:
        a.errors_output.write_text(json.dumps({"failures":errors,"succeeded":data["raceCount"],"requested":len(manifest),"pageDiagnostics":diagnostics}, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    if a.require_complete and (errors or data["raceCount"] != len(manifest)):
        raise SystemExit("Incomplete fetch: output not written")
    a.output.write_text(json.dumps(data, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print("Fetched and validated", data["raceCount"], "of", len(manifest))

if __name__ == "__main__":
    main()
