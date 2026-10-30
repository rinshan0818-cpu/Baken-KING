"""Import a ZIP of 24 locally saved JRA race-card HTML files.

Expected filenames: 東京_01.html ... 東京_12.html, 京都_01.html ... 京都_12.html.
No network requests and no source HTML is committed or published.
"""
import argparse
import json
from pathlib import Path
from zipfile import ZipFile, BadZipFile
from jra_card_parser import parse_card
from jra_card_import import decode_jra_html
from jra_card_normalizer import normalize_cards

def import_zip(path, day, venues):
    parsed, failures = [], []
    with ZipFile(path) as archive:
        files = {}
        for info in archive.infolist():
            if info.is_dir():
                continue
            name = Path(info.filename).name
            if name in files:
                raise ValueError("duplicate_filename_in_zip:" + name)
            files[name] = info
        for venue in venues:
            for race in range(1, 13):
                name = f"{venue}_{race:02d}.html"
                info = files.get(name)
                if info is None:
                    failures.append({"venue": venue, "raceNumber": race, "error": "html_missing"})
                    continue
                if info.file_size > 5_000_000:
                    failures.append({"venue": venue, "raceNumber": race, "error": "html_too_large"})
                    continue
                try:
                    html = decode_jra_html(archive.read(info))
                    parsed.append(parse_card(html, day, venue, race))
                except (ValueError, UnicodeError, BadZipFile) as exc:
                    failures.append({"venue": venue, "raceNumber": race, "error": str(exc)})
    bundle = normalize_cards(parsed, day, venues)
    bundle["complete"] = not failures and bundle["raceCount"] == len(venues) * 12
    return bundle, failures

def main():
    p = argparse.ArgumentParser()
    p.add_argument("zip_path", type=Path)
    p.add_argument("output", type=Path)
    p.add_argument("--date", default="2026-10-31")
    p.add_argument("--venues", nargs="+", default=["東京", "京都"])
    a = p.parse_args()
    bundle, failures = import_zip(a.zip_path, a.date, a.venues)
    report_path = a.output.with_suffix(".report.json")
    report_path.write_text(json.dumps({
        "date": a.date, "expectedRaceCount": len(a.venues)*12,
        "parsedRaceCount": bundle["raceCount"], "complete": bundle["complete"],
        "failures": failures}, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    if not bundle["complete"]:
        print("INCOMPLETE: see", report_path)
        raise SystemExit(1)
    a.output.write_text(json.dumps(bundle, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print("VALIDATED:", bundle["raceCount"], "races")

if __name__ == "__main__":
    main()
