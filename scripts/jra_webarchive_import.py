"""Extract the HTML main resource from an iPhone Safari .webarchive file.

Local files only. The source archive and its images are not uploaded or published.
"""
import argparse
import plistlib
from pathlib import Path
from jra_card_parser import parse_card

def parse_webarchive(path, day, venue, race):
    with open(path, "rb") as f:
        archive = plistlib.load(f)
    main = archive.get("WebMainResource", {})
    if main.get("WebResourceMIMEType") != "text/html":
        raise ValueError("webarchive_main_resource_not_html")
    data = main.get("WebResourceData")
    if not isinstance(data, bytes) or not data:
        raise ValueError("webarchive_html_missing")
    if len(data) > 5_000_000:
        raise ValueError("webarchive_html_too_large")
    encoding = main.get("WebResourceTextEncodingName") or "utf-8"
    if encoding.lower() not in ("utf-8", "shift_jis", "shift-jis", "cp932", "euc-jp", "euc_jp"):
        raise ValueError("webarchive_unsupported_encoding")
    return parse_card(data.decode(encoding), day, venue, race)

def main():
    p = argparse.ArgumentParser()
    p.add_argument("file", type=Path)
    p.add_argument("--date", default="2026-10-31")
    p.add_argument("--venue", default="東京")
    p.add_argument("--race", type=int, default=1)
    a = p.parse_args()
    result = parse_webarchive(a.file, a.date, a.venue, a.race)
    print(f"{result['date']} {result['venue']}{result['raceNumber']}R: {len(result['horses'])} horses")
    for horse in result["horses"]:
        print(f"{horse['number']:2d} {horse['name']}")
    print("conditions:", result["raceConditions"])

if __name__ == "__main__":
    main()
