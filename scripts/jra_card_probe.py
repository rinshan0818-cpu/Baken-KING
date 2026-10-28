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
    if "出馬表の掲載は終了" in body:
        raise ValueError("card_publication_ended")

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


def structure_counts(html: str) -> dict:
    # Only HTML structural statistics. Never expose horse names or the numbers.
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table")
    rows = soup.find_all("tr")
    potential = 0
    by_column = [0, 0, 0, 0, 0, 0]
    for table in tables:
        text = table.get_text(" ", strip=True)[:700]
        if "馬番" in text and "馬名" in text:
            potential += 1
    for row in rows:
        cells = row.find_all(["td", "th"], recursive=False)
        for i, cell in enumerate(cells[:len(by_column)]):
            value = re.sub(r"\s+", "", cell.get_text(" ", strip=True))
            if re.fullmatch(r"\d{1,2}", value) and 1 <= int(value) <= 18:
                by_column[i] += 1
    image_count = len(soup.find_all("img", alt=re.compile("枠")))
    from collections import Counter
    tags = Counter(tag.name for tag in soup.find_all(True))
    candidates = Counter()
    for node in soup.find_all(string=True):
        value = re.sub(r"\s+", "", str(node))
        if not re.fullmatch(r"\d{1,2}", value):
            continue
        if not 1 <= int(value) <= 18:
            continue
        parent = node.parent
        if parent is None:
            continue
        classes = [str(x) for x in parent.get("class", [])]
        # CSS token names only: do not expose horse numbers or text.
        marker = parent.name + "." + ".".join(classes[:2])
        candidates[marker[:64]] += 1
    return {
        "tableCount": len(tables), "tableRowCount": len(rows),
        "tablesWithCardHeaders": potential,
        "numericCellsByPosition": by_column,
        "frameImageCount": image_count,
        "tagCounts": {tag: tags[tag] for tag in
            ("div", "span", "li", "p", "dl", "dt", "dd", "a", "ul", "script", "iframe", "font")},
        "numericTextParentCounts": dict(candidates.most_common(10)),
        "isNoScriptPage": bool(soup.find("noscript")),
    }


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
        if stage == "horse_number_parse":
            result["structureCounts"] = structure_counts(html)
        exit_code = 1
    output = Path(args.status_file)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("JRA card number probe:", result["status"],
          result.get("horseNumberCount", 0), "horses")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
