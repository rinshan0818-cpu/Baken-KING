#!/usr/bin/env python3
"""One-off, privacy-safe compatibility probe of one public JRA results page.

Never saves official page HTML, horse names, horse numbers or payout values.
A successful probe does NOT imply a licensed data feed or confirmed settlement.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
from collections import Counter
import re
from bs4 import BeautifulSoup
from jra_calendar_probe import read_one_public_page

RESULT_URL = (
    "https://www.jra.go.jp/JRADB/accessS.html?"
    "CNAME=pw01sde1005202604091120261025%2FF6"
)
PAYOUT_TYPES = {
    "win": ("単勝",), "place": ("複勝",),
    "quinella": ("馬連",), "wide": ("ワイド",),
    "exacta": ("馬単",), "trio": ("3連複", "三連複"),
    "trifecta": ("3連単", "三連単")
}


BET_TYPE_TOKENS = {
    "単勝": "win", "複勝": "place", "馬連": "quinella",
    "ワイド": "wide", "馬単": "exacta",
    "3連複": "trio", "三連複": "trio",
    "3連単": "trifecta", "三連単": "trifecta",
    "枠連": "skip_frame"
}
BET_SELECTION_SIZES = {
    "win": 1, "place": 1, "quinella": 2,
    "wide": 2, "exacta": 2, "trio": 3, "trifecta": 3
}


class PayoutParseError(ValueError):
    def __init__(self, message: str, entries: list[dict], html: str):
        super().__init__(message)
        counts = Counter(x["kind"] for x in entries)
        self.category_counts = {kind: counts[kind] for kind in BET_SELECTION_SIZES}
        text = BeautifulSoup(html, "html.parser").get_text("\n", strip=True)
        self.token_stats = {
            "priceTokenCount": len(re.findall(r"\d[\d,，]*\s*円", text)),
            "hyphenatedComboCount": len(re.findall(r"(?<!\d)\d{1,2}-\d{1,2}(?:-\d{1,2})?", text))
        }


def extract_payouts(html: str) -> list[dict]:
    """Private in-memory value extraction; public output remains counts only."""
    import unicodedata
    soup = BeautifulSoup(html, "html.parser")
    text = unicodedata.normalize("NFKC", soup.get_text(" ", strip=True))
    end = text.find("勝馬の紹介")
    if end == -1:
        end = len(text)
    start = text.rfind("払戻金", 0, end)
    if start == -1:
        raise ValueError("payout_section_missing")
    section = text[start + len("払戻金"):end]
    labels = sorted(BET_TYPE_TOKENS, key=len, reverse=True)
    label_pattern = re.compile("|".join(map(re.escape, labels)))
    matched = list(label_pattern.finditer(section))
    entries, seen = [], set()
    for index, found in enumerate(matched):
        kind = BET_TYPE_TOKENS[found.group(0)]
        if kind == "skip_frame":
            continue
        snippet = section[found.end():matched[index + 1].start() if index + 1 < len(matched) else len(section)]
        pairs = re.finditer(r"(?<!\d)(\d{1,2}(?:\s*[-－]\s*\d{1,2}){0,2})\s+([\d,，]+)\s*円", snippet)
        for pair in pairs:
            numbers = [int(x) for x in re.split(r"\s*[-－]\s*", pair.group(1))]
            if len(numbers) != BET_SELECTION_SIZES[kind] or len(set(numbers)) != len(numbers):
                continue
            if any(n < 1 or n > 18 for n in numbers):
                continue
            yen = int(pair.group(2).replace(",", "").replace("，", ""))
            if not 1 <= yen <= 100000000:
                raise ValueError("payout_amount_invalid")
            key = (kind, tuple(numbers))
            if key in seen:
                raise ValueError("duplicate_payout_entry")
            seen.add(key)
            entries.append({"kind": kind, "numbers": numbers, "yenPer100": yen})
    return entries


def inspect_results(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text("\n", strip=True).replace("\u3000", " ")
    if not re.search(r"2026\s*年\s*10\s*月\s*25\s*日", text):
        raise ValueError("result_date_mismatch")
    if not re.search(r"4\s*回\s*東京\s*9\s*日", text):
        raise ValueError("result_meeting_mismatch")
    if not re.search(r"11\s*レース", text):
        raise ValueError("result_race_mismatch")
    if "払戻金" not in text or "着順" not in text:
        raise ValueError("result_or_payout_missing")
    end = text.find("勝馬の紹介")
    payout_start = text.rfind("払戻金", 0, end if end >= 0 else len(text))
    if payout_start == -1:
        raise ValueError("payout_section_missing")
    section = text[payout_start:end if end >= 0 else len(text)]
    present = [bet for bet, alternatives in PAYOUT_TYPES.items()
               if any(label in section for label in alternatives)]
    if len(present) < 7:
        raise ValueError("seven_payout_types_missing")
    parsed_entries = extract_payouts(html)
    available = {entry["kind"] for entry in parsed_entries}
    if len(available) != 7:
        raise PayoutParseError("seven_payout_values_missing", parsed_entries, html)
    # This archived race is independently checkable against the JRA official
    # page: validate two known combinations without publishing their values.
    sample = {(entry["kind"], tuple(entry["numbers"])): entry["yenPer100"]
              for entry in parsed_entries}
    if sample.get(("quinella", (2, 4))) != 590 or sample.get(("trifecta", (4, 2, 5))) != 7670:
        raise PayoutParseError("reference_payout_mismatch", parsed_entries, html)
    tables = soup.find_all("table")
    results_tables = [table for table in tables
                      if "着順" in table.get_text(" ", strip=True)[:200]
                      and "馬" in table.get_text(" ", strip=True)[:200]]
    return {
        "resultTextPresent": True, "payoutSectionPresent": True,
        "payoutTypeCount": len(present),
        "parsedPayoutEntryCount": len(parsed_entries),
        "parsedPayoutTypeCount": len(available),
        "independentReferenceCheck": True,
        "htmlTableCount": len(tables),
        "resultTableCount": len(results_tables),
        "resultRowCount": sum(len(t.find_all("tr")) for t in results_tables),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--html-file", help="Offline fictional input")
    parser.add_argument("--live-once", action="store_true")
    parser.add_argument("--status-file", required=True)
    args = parser.parse_args()
    stage = "input"
    try:
        if bool(args.html_file) == bool(args.live_once):
            raise ValueError("choose_one_input_mode")
        if args.live_once:
            import os
            if os.environ.get("BAKEN_ALLOW_JRA_TEST") != "yes":
                raise ValueError("live_fetch_not_enabled")
            stage = "fetch"
            html = read_one_public_page(RESULT_URL)
        else:
            html = Path(args.html_file).read_text(encoding="utf-8")
        stage = "parse"
        counts = inspect_results(html)
        status = {"status": "ok", "stage": "completed", **counts}
        code = 0
    except (ValueError, OSError, UnicodeError) as error:
        reason = str(error) if isinstance(error, ValueError) else type(error).__name__
        if not re.fullmatch(r"[A-Za-z0-9_]{1,50}", reason):
            reason = "other_error"
        status = {"status": "failed", "stage": stage, "errorCode": reason}
        if isinstance(error, PayoutParseError):
            status["parsedCountsByType"] = error.category_counts
            status["safeTokenStats"] = error.token_stats
        code = 1
    status.update({
        "checkedAtUtc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "date": "2026-10-25", "venue": "東京", "raceNumber": 11,
        "phase": "historic-results-payouts-availability-only",
        "sourceDataPublished": False
    })
    out = Path(args.status_file)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("JRA result probe", status["status"], status.get("payoutTypeCount", 0), "types")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
