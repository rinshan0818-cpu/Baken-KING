#!/usr/bin/env python3
"""One-shot JRA *program schedule* probe; never fetches entries, payouts or odds.

The public GitHub repository receives only success/failure and aggregate counts.
The response HTML and all race rows remain in ephemeral runner memory.
This independent parser is not an official JRA API.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import re
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser

from bs4 import BeautifulSoup

COURSES = ("札幌", "函館", "福島", "新潟", "東京", "中山", "中京", "京都", "阪神", "小倉")
COURSE_RE = "|".join(COURSES)
HEADING = re.compile(rf"(?<![0-9])\d{{1,2}}\s*回\s*({COURSE_RE})\s*\d{{1,2}}\s*日")
RACE_ROW = re.compile(r"(?m)^\s*(\d{1,2})\s*レース\s*$")
START_TIME = re.compile(r"(?<!\d)(\d{1,2})\s*時\s*(\d{1,2})\s*分")
USER_AGENT = "Baken-KING/0.1 (personal noncommercial one-time schedule compatibility check)"
MAX_HTML_BYTES = 1_000_000


def jra_calendar_url(day: str) -> str:
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", day):
        raise ValueError("invalid_date_format")
    dt = datetime.strptime(day, "%Y-%m-%d")
    return f"https://jra.jp/keiba/calendar{dt.year}/{dt.year}/{dt.month:02d}/{dt.day:02d}{dt.day:02d}.html"


def parse_program(html: str, day: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text("\n", strip=True).replace("\u3000", " ")
    text = re.sub(r"\r\n?", "\n", text)
    dt = datetime.strptime(day, "%Y-%m-%d")
    if not re.search(rf"{dt.year}\s*年\s*{dt.month}\s*月\s*{dt.day}\s*日", text):
        raise ValueError("calendar_date_mismatch")
    heads = list(HEADING.finditer(text))
    if not heads:
        raise ValueError("meeting_headers_missing")
    races = []
    used = set()
    for index, head in enumerate(heads):
        course = head.group(1)
        end = heads[index + 1].start() if index + 1 < len(heads) else len(text)
        block = text[head.end():end]
        rows = list(RACE_ROW.finditer(block))
        if not rows:
            raise ValueError("race_rows_missing")
        for i, row in enumerate(rows):
            no = int(row.group(1))
            if not 1 <= no <= 12 or (course, no) in used:
                raise ValueError("duplicate_or_invalid_race")
            used.add((course, no))
            row_end = rows[i + 1].start() if i + 1 < len(rows) else len(block)
            raw = block[row.end():row_end]
            match = START_TIME.search(raw)
            if not match:
                raise ValueError("race_time_missing")
            hour, minute = int(match.group(1)), int(match.group(2))
            if hour > 23 or minute > 59:
                raise ValueError("invalid_race_time")
            name = " ".join(raw[:match.start()].split())
            if not name or len(name) > 240:
                raise ValueError("race_description_missing")
            races.append({
                "date": day,
                "venue": course,
                "raceNumber": no,
                "programDescription": name,
                "scheduledStartAt": f"{day}T{hour:02d}:{minute:02d}:00+09:00",
                "phase": "program-unconfirmed",
                "cardAvailable": False,
                "purchaseAllowed": False,
            })
    if len(races) > 36:
        raise ValueError("too_many_races")
    return races


def read_one_public_page(url: str) -> str:
    # Check robots for this user agent, and do not bypass a refusal or error.
    robots_url = "https://jra.jp/robots.txt"
    robots = RobotFileParser()
    robots.set_url(robots_url)
    robots.read()
    if not robots.can_fetch(USER_AGENT, url):
        raise ValueError("robots_disallow_or_unavailable")
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html"})
    with urlopen(request, timeout=20) as response:
        if response.status != 200:
            raise ValueError("http_error")
        content = response.read(MAX_HTML_BYTES + 1)
        if len(content) > MAX_HTML_BYTES:
            raise ValueError("response_too_large")
        content_type = response.headers.get("Content-Type", "").lower()
        if "html" not in content_type:
            raise ValueError("unexpected_content_type")
        # Japanese JRA pages normally declare utf-8 in their HTML.
        encoding = response.headers.get_content_charset() or "utf-8"
        return content.decode(encoding, errors="strict")


def summarize(races: list[dict], day: str, url: str) -> dict:
    counts = {}
    for race in races:
        counts[race["venue"]] = counts.get(race["venue"], 0) + 1
    return {
        "checkedAtUtc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "date": day,
        "url": url,
        "phase": "program-only-not-official-final-card",
        "status": "ok",
        "venueRaceCounts": counts,
        "totalRaces": len(races),
        "sourceDataPublished": False,
    }


def run() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--date", required=True, help="YYYY-MM-DD, one official program day")
    parser.add_argument("--html-file", help="Use a local fictional HTML file (offline tests)")
    parser.add_argument("--live-once", action="store_true",
                        help="Explicitly make one live calendar-page request after robots check")
    parser.add_argument("--min-races", type=int, default=1)
    parser.add_argument("--status-file", required=True,
                        help="Output only public-safe counts/status JSON")
    args = parser.parse_args()
    status_path = Path(args.status_file)
    status_path.parent.mkdir(parents=True, exist_ok=True)
    url = "not-fetched"
    try:
        if bool(args.html_file) == bool(args.live_once):
            raise ValueError("choose_one_input_mode")
        if args.min_races < 1 or args.min_races > 36:
            raise ValueError("invalid_min_races")
        url = jra_calendar_url(args.date)
        if args.live_once:
            import os
            if os.environ.get("BAKEN_ALLOW_JRA_TEST") != "yes":
                raise ValueError("live_fetch_not_enabled")
            html = read_one_public_page(url)
        else:
            html = Path(args.html_file).read_text(encoding="utf-8")
        races = parse_program(html, args.date)
        if len(races) < args.min_races:
            raise ValueError("insufficient_race_rows")
        status = summarize(races, args.date, url)
        code = 0
    except (ValueError, HTTPError, URLError, UnicodeError, OSError) as exc:
        # NEVER include HTTP body, race data, cookies or raw exception paths.
        reason = str(exc) if isinstance(exc, ValueError) else type(exc).__name__
        if len(reason) > 50 or not re.fullmatch(r"[A-Za-z0-9_]+", reason):
            reason = "invalid_source"
        status = {
            "checkedAtUtc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "date": args.date, "url": url, "phase": "program-only",
            "status": "failed", "errorCode": reason,
            "sourceDataPublished": False,
        }
        code = 1
    status_path.write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"JRA schedule probe: {status['status']} ({status.get('totalRaces', 0)} races)")
    return code


if __name__ == "__main__":
    raise SystemExit(run())
