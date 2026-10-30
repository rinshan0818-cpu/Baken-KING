"""Expand official dated seed links into same-day cards and validate privately."""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from crawl_jra_cards import crawl
from fetch_jra_cards import fetch_cards

def main():
    report_path = Path(sys.argv[1])
    report = json.loads(report_path.read_text(encoding="utf-8"))
    seeds = json.loads(Path(str(report_path) + ".seeds.json").read_text(encoding="utf-8"))
    summary = {"date": report["date"], "seedCount": len(seeds),
               "discovered": 0, "parsed": 0, "failures": [],
               "status": "no_official_seed" if not seeds else "pending"}
    if seeds:
        # Bounded crawl of verified official links; no CNAME guessing.
        entries, crawl_errors = crawl(seeds[:3], day=report["date"], max_pages=45)
        entries = [e for e in entries if e["date"] == report["date"]]
        summary["discovered"] = len(entries)
        summary["venues"] = sorted({e["venue"] for e in entries})
        if entries:
            cards, failures, diagnostics = fetch_cards(entries)
            summary["parsed"] = cards["raceCount"]
            summary["failures"] = [
                {"venue": f["venue"], "raceNumber": f["raceNumber"],
                 "error": f["error"][:120]} for f in failures
            ]
        summary["crawlErrorCount"] = len(crawl_errors)
        summary["status"] = "complete" if entries and not summary["failures"] and not crawl_errors else "partial"
    Path("upcoming-card-validation.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False))

if __name__ == "__main__":
    main()
