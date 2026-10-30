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
from urllib.parse import urlparse, parse_qs
from urllib.request import Request, urlopen
from urllib.error import URLError
import ssl
import socket
from jra_card_parser import parse_card
from jra_card_normalizer import normalize_cards

def decode_jra_html(raw, declared_charset=None):
    """Decode JRA HTML strictly, using HTTP or HTML-declared charset."""
    head = raw[:8192]
    meta = re.search(rb"<meta[^>]+charset\s*=\s*[^a-zA-Z0-9]*([a-zA-Z0-9_-]+)", head, re.I)
    charset = declared_charset or (meta.group(1).decode("ascii") if meta else None)
    if charset:
        if charset.lower().replace("_", "-") in ("shift-jis", "sjis", "windows-31j", "x-sjis"):
            charset = "cp932"
        return raw.decode(charset, errors="strict"), charset
    try:
        return raw.decode("utf-8", errors="strict"), "utf-8"
    except UnicodeDecodeError:
        return raw.decode("cp932", errors="strict"), "cp932"

def fetch_cards(manifest, delay=1.5):
    cards, errors, diagnostics = [], [], []
    if not isinstance(manifest, list) or len(manifest) > 36:
        raise ValueError("manifest_must_be_list_of_at_most_36")
    seen = set()
    for item in manifest:
        key = (item["date"], item["venue"], item["raceNumber"])
        if key in seen:
            raise ValueError("duplicate_manifest_race")
        seen.add(key)
        url = item["url"]
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.hostname not in ("jra.jp", "www.jra.go.jp", "sp.jra.jp", "app.jra.jp"):
            raise ValueError("unapproved_host")
        try:
            req = Request(url, headers={"User-Agent": "BakenKingCardImporter/1.0 (personal research)"})
            for attempt in range(3):
                try:
                    with urlopen(req, timeout=20) as response:
                        final_url = urlparse(response.geturl())
                        if final_url.scheme != "https" or final_url.hostname not in ("jra.jp", "www.jra.go.jp", "sp.jra.jp", "app.jra.jp"):
                            raise ValueError("redirected_to_unapproved_host:" + (final_url.hostname or "unknown"))
                        html = response.read(3_000_001)
                        if len(html) > 3_000_000:
                            raise ValueError("response_too_large")
                        declared_charset = response.headers.get_content_charset()
                    break
                except (TimeoutError, socket.timeout, ssl.SSLError, URLError) as exc:
                    if attempt == 2:
                        raise
                    time.sleep(2 * (attempt + 1))
            decoded, charset = decode_jra_html(html, declared_charset)
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
                        if any(re.search(r"(?<!\d)13(?!\d)|取消|除外|出走取消", x) for x in labels):
                            rows.append({"class":tr.get("class", []),
                                         "cells":labels[:15],
                                         "images":[{"alt":im.get("alt", ""),
                                                    "src":im.get("src", "")[-75:]}
                                                   for im in tr.find_all("img")[:8]]})
                    diagnostics.append({"date":key[0],"venue":key[1],
                                        "raceNumber":key[2],
                                        "issue":"horse_numbers_not_contiguous",
                                        "matchingRows":rows[:35]})
                if str(exc).startswith("horse_numbers_not_contiguous"):
                    from bs4 import BeautifulSoup
                    page = BeautifulSoup(decoded, "html.parser")
                    cancelled_row_structure = []
                    for tr in page.find_all("tr"):
                        cells = tr.find_all(["td", "th"], recursive=False)
                        if not cells:
                            continue
                        texts = [cell.get_text(" ", strip=True) for cell in cells]
                        if any(t.strip() == "取消" for t in texts[:3]):
                            cancelled_row_structure.append({
                                "rowAttributes": {k: str(v)[:90] for k, v in tr.attrs.items() if k in ("id", "class", "data-umaban", "data-horse-number")},
                                "firstCellAttributes": [
                                    {k: str(v)[:90] for k, v in cell.attrs.items() if k in ("id", "class", "data-umaban", "data-horse-number", "title")}
                                    for cell in cells[:3]
                                ],
                                "firstCellImageAlts": [
                                    [im.get("alt", "")[:50] for im in cell.find_all("img")[:3]]
                                    for cell in cells[:3]
                                ],
                                "numberColumnText": texts[1][:20] if len(texts) > 1 else "",
                            })
                    diagnostics.append({
                        "date": key[0], "venue": key[1], "raceNumber": key[2],
                        "issue": "cancelled_horse_number_hidden",
                        "cancelledRowStructure": cancelled_row_structure[:4],
                    })
                if str(exc) == "horse_number_table_missing":
                    from bs4 import BeautifulSoup
                    from hashlib import sha256
                    page = BeautifulSoup(decoded, "html.parser")
                    visible = page.get_text(" ", strip=True)
                    table_headers = []
                    for table in page.find_all("table")[:12]:
                        headings = [th.get_text(" ", strip=True)[:35] for th in table.find_all("th")[:18]]
                        if headings:
                            table_headers.append(headings)
                    diagnostics.append({
                        "date": key[0], "venue": key[1], "raceNumber": key[2],
                        "issue": "horse_number_table_missing",
                        "requestedUrlPath": parsed.path,
                        "requestedCnamePrefix": parse_qs(parsed.query).get("CNAME", [""])[0][:10],
                        "finalHost": final_url.hostname, "finalPath": final_url.path,
                        "htmlBytes": len(html), "htmlSha256": sha256(html).hexdigest(),
                        "title": page.title.get_text(" ", strip=True)[:100] if page.title else "",
                        "visibleTextSample": visible[:180],
                        "tableHeaders": table_headers[:8],
                        "tableCount": len(page.find_all("table")),
                        "firstTableRows": [
                            {
                                "cellTags": [cell.name for cell in tr.find_all(["th", "td"], recursive=False)[:10]],
                                "cellCount": len(tr.find_all(["th", "td"], recursive=False)),
                                "rowClass": tr.get("class", [])[:4],
                                "spans": [{"colspan": cell.get("colspan"), "rowspan": cell.get("rowspan")}
                                          for cell in tr.find_all(["th", "td"], recursive=False)[:10]],
                                "numberCandidates": [
                                    cell.get_text(" ", strip=True)[:12]
                                    for cell in tr.find_all(["th", "td"], recursive=False)[:4]
                                    if cell.get_text(" ", strip=True).isdigit()
                                ],
                            }
                            for tr in (page.find("table").find_all("tr")[:6] if page.find("table") else [])
                        ],
                    })
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
