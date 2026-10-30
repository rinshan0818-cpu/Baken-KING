"""Convert authorized local JRA HTML files into a validated race-card bundle.

Expected filenames: 東京_01.html ... 東京_12.html, 京都_01.html ... 京都_12.html.
Never fetches JRA or writes source HTML to a public repository.
"""
import argparse
import json
from pathlib import Path
from jra_card_parser import parse_card
from jra_card_normalizer import normalize_cards

def import_directory(directory, day, venues):
    parsed, failures = [], []
    for venue in venues:
        for race in range(1, 13):
            path = directory / f"{venue}_{race:02d}.html"
            if not path.is_file():
                failures.append({"venue": venue, "raceNumber": race, "error": "html_missing"})
                continue
            try:
                parsed.append(parse_card(path.read_text(encoding="utf-8"), day, venue, race))
            except (ValueError, UnicodeError) as exc:
                failures.append({"venue": venue, "raceNumber": race, "error": str(exc)})
    bundle = normalize_cards(parsed, day, venues)
    bundle["complete"] = len(failures) == 0 and bundle["raceCount"] == len(venues) * 12
    return bundle, failures

def main():
    p = argparse.ArgumentParser()
    p.add_argument("directory", type=Path)
    p.add_argument("output", type=Path)
    p.add_argument("--date", default="2026-10-31")
    p.add_argument("--venues", nargs="+", default=["東京", "京都"])
    a = p.parse_args()
    bundle, failures = import_directory(a.directory, a.date, a.venues)
    report = {"date": a.date, "expectedRaceCount": len(a.venues)*12,
              "parsedRaceCount": bundle["raceCount"], "complete": bundle["complete"],
              "failures": failures}
    report_path = a.output.with_suffix(".report.json")
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    if not bundle["complete"]:
        print("INCOMPLETE: see", report_path)
        raise SystemExit(1)
    a.output.write_text(json.dumps(bundle, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print("VALIDATED:", bundle["raceCount"], "races", a.output)

if __name__ == "__main__":
    main()
