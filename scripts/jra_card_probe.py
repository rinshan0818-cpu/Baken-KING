#!/usr/bin/env python3
"""JRA official *horse-number only* card probe for one known past race.

Fetches exactly one allowlisted JRA card URL when explicitly enabled; neither
the HTML, horse names nor horse numbers are saved to the public repository.
The only published result is a count and diagnostic status.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import re
from pathlib import Path
from urllib.error import HTTPError, URLError

from bs4 import BeautifulSoup
from jra_calendar_probe import read_one_public_page

# A historical JRA card whose 16 runners are known from official results.
PAST_CARD_URL = (
    "https://www.jra.go.jp/JRADB/accessD.html?"
    "CNAME=pw01dde1005202604091120261025%2F3A"
)
CARD_DATE = "2026-10-25"
CARD_VENUE = "東京"
CARD_NUMBER = 11


def parse_horse_numbers(html: str) -> list[int]:
    soup = BeautifulSoup(html, "html.parser")
    body = soup.get_text("\n", strip=True).replace("\u3000", " ")
    if not re.search(r"2026\s*年\s*10\s*月\s*25\s*日", body):
        raise ValueError("card_date_mismatch")
    if not re.search(r"4\s*回\s*東京\s*9\s*日", body):
        raise ValueError("card_meeting_mismatch")
    if not re.search(r"11\s*レース", body):
        raise ValueError("card_race_mismatch")

    candidates = []
    for table in soup.find_all("table"):
        beginning = table.get_text(" ", strip=True)[:700]
        if "馬番" not in beginning or "馬名" not in beginning:
            continue
        numbers = []
        for tr in table.find_all("tr"):
            cells = tr.find_all(["td", "th"], recursive=False)
            if len(cells) < 3:
                continue
            horse_number = cells[1].get_text(" ", strip=True)
            horse_number = re.sub(r"\s+", "", horse_number)
            if not re.fullmatch(r"\d{1,2}", horse_number):
                continue
            number = int(horse_number)
            if 1 <= number <= 18:
                numbers.append(number)
        if len(numbers) >= 2:
            candidates.append(numbers)

    if not candidates:
        raise ValueError("horse_number_table_missing")
    # Reject alternate/duplicate tabular views rather than guessing.
    candidates.sort(key=len, reverse=True)
    first = candidates[0]
    if len(first) != len(set(first)) or len(first) > 18:
        raise ValueError("horse_number_duplicate_or_excess")
    if len(candidates) > 1 and len(candidates[1]) == len(first) and candidates[1] != first:
        raise ValueError("ambiguous_horse_number_tables")
    return first


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--html-file", help="Offline fictional input")
    parser.add_argument("--live-once", action="store_true", help="Explicit one known past card only")
    parser.add_argument("--status-file", required=True)
    parser.add_argument("--min-horses", type=int, default=1)
    args = parser.parse_args()
    stage = "input"
    try:
        if bool(args.html_file) == bool(args.live_once):
            raise ValueError("choose_one_input_mode")
        if not 1 <= args.min_horses <= 18:
            raise ValueError("invalid_min_horses")
        if args.live_once:
            import os
            if os.environ.get("BAKEN_ALLOW_JRA_TEST") != "yes":
                raise ValueError("live_fetch_not_enabled")
            stage = "official_card_fetch"
            html = read_one_public_page(PAST_CARD_URL)
        else:
            html = Path(args.html_file).read_text(encoding="utf-8")
        stage = "horse_number_parse"
        numbers = parse_horse_numbers(html)
        if len(numbers) < args.min_horses:
            raise ValueError("insufficient_horse_numbers")
        stage = "completed"
        result = {
            "checkedAtUtc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "date": CARD_DATE, "venue": CARD_VENUE, "raceNumber": CARD_NUMBER,
            "phase": "past-card-horse-number-probe",
            "status": "ok", "horseNumberCount": len(numbers),
            "sourceDataPublished": False, "stage": stage,
        }
        exit_code = 0
    except (ValueError, HTTPError, URLError, UnicodeError, OSError) as error:
        reason = str(error) if isinstance(error, ValueError) else type(error).__name__
        if len(reason) > 50 or not re.fullmatch(r"[A-Za-z0-9_]+", reason):
            reason = "other_value_error"
        result = {
            "checkedAtUtc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "date": CARD_DATE, "venue": CARD_VENUE, "raceNumber": CARD_NUMBER,
            "phase": "past-card-horse-number-probe",
            "status": "failed", "errorCode": reason, "stage": stage,
            "sourceDataPublished": False,
        }
        exit_code = 1
    output = Path(args.status_file)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("JRA card number probe:", result["status"],
          result.get("horseNumberCount", 0), "horses")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
