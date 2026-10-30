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
    seeds_by_date = json.loads(Path(str(report_path) + ".seeds.json").read_text(encoding="utf-8"))
    daily = []
    for date_report in report["dates"]:
        day = date_report["date"]
        seeds = seeds_by_date.get(day, [])
        summary = {"date": day, "seedCount": len(seeds),
                   "discovered": 0, "parsed": 0, "failures": [],
                   "status": "no_official_seed" if not seeds else "pending"}
        if seeds:
            entries, crawl_errors = crawl(seeds[:3], day=day, max_pages=45)
            entries = [e for e in entries if e["date"] == day]
            summary["discovered"] = len(entries)
            summary["venues"] = sorted({e["venue"] for e in entries})
            if entries:
                cards, failures, _ = fetch_cards(entries)
                summary["parsed"] = cards["raceCount"]
                summary["failures"] = [
                    {"venue": f["venue"], "raceNumber": f["raceNumber"],
                     "error": f["error"][:120]} for f in failures
                ]
            summary["crawlErrorCount"] = len(crawl_errors)
            summary["pendingPublication"] = sum(
                1 for failure in summary["failures"]
                if failure["error"] == "horse_number_table_missing"
            )
            summary["status"] = (
                "complete" if entries and not summary["failures"] and not crawl_errors
                else "awaiting_card_publication"
                if summary["failures"] and summary["pendingPublication"] == len(summary["failures"]) and not crawl_errors
                else "partial"
            )
        daily.append(summary)
    summary = {"dates": daily, "discovered": sum(d["discovered"] for d in daily),
               "parsed": sum(d["parsed"] for d in daily),
               "venues": sorted({v for d in daily for v in d.get("venues", [])})}
    Path("upcoming-card-validation.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False))

if __name__ == "__main__":
    main()
