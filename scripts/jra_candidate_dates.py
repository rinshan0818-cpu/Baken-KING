"""Resolve the next JRA weekend dates using Japan Standard Time.

This only selects candidate dates. It does NOT assert that racing is scheduled;
holiday/weekday fixtures must come from verified JRA source data.
"""
from datetime import datetime, timedelta, timezone
import argparse
import json

JST = timezone(timedelta(hours=9))

def upcoming_weekend(now=None):
    today = (now or datetime.now(JST)).astimezone(JST).date()
    saturday = today + timedelta(days=(5 - today.weekday()) % 7)
    sunday = saturday + timedelta(days=1)
    if today.weekday() == 6:
        return [today.isoformat()]
    return [saturday.isoformat(), sunday.isoformat()]

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--output", help="Write candidate dates to a JSON file")
    a = p.parse_args()
    dates = upcoming_weekend()
    result = {"candidateDates": dates, "verifiedJraSchedule": False}
    if a.output:
        with open(a.output, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
            f.write("\n")
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
