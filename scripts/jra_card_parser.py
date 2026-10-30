"""Reusable offline JRA card parser for a specified race.

No network requests or public data persistence. A caller supplies HTML already
obtained through an authorized source. Publication-ended cards fail closed.
"""
from __future__ import annotations
from bs4 import BeautifulSoup
import re
from datetime import datetime

VENUES = ("札幌","函館","福島","新潟","東京","中山","中京","京都","阪神","小倉")

def parse_card(html: str, day: str, venue: str, race_number: int) -> dict:
    dt = datetime.strptime(day, "%Y-%m-%d")
    if venue not in VENUES or not 1 <= race_number <= 12:
        raise ValueError("invalid_race")
    soup = BeautifulSoup(html, "html.parser")
    body = soup.get_text("\n", strip=True).replace("\u3000", " ")
    if "出馬表の掲載は終了" in body:
        raise ValueError("card_publication_ended")
    if not re.search(rf"{dt.year}\s*年\s*{dt.month}\s*月\s*{dt.day}\s*日", body):
        raise ValueError("card_date_mismatch")
    if not re.search(rf"\d{{1,2}}\s*回\s*{re.escape(venue)}\s*\d{{1,2}}\s*日", body):
        raise ValueError("card_meeting_mismatch")
    if not re.search(rf"(?<!\d){race_number}\s*レース", body):
        raise ValueError("card_race_mismatch")
    candidates = []
    for table in soup.find_all("table"):
        head = table.get_text(" ", strip=True)[:700]
        if "馬番" not in head or "馬名" not in head:
            continue
        numbers = []
        # JRA layouts may contain rowspans in the frame-number column.
        # Select the horse-number cell by class/header where possible,
        # otherwise accept the numeric cell immediately before the horse name.
        for tr in table.find_all("tr"):
            cells = tr.find_all(["td", "th"], recursive=False)
            if len(cells) < 2 or any(c.name == "th" for c in cells):
                continue
            labels = [re.sub(r"\\s+", "", c.get_text(" ", strip=True)) for c in cells]
            possible = []
            for i, raw in enumerate(labels[:-1]):
                if not re.fullmatch(r"\\d{1,2}", raw) or not 1 <= int(raw) <= 18:
                    continue
                following = labels[i + 1]
                if following and not re.fullmatch(r"\\d{1,2}", following):
                    possible.append(int(raw))
            if possible:
                numbers.append(possible[-1])
        if len(numbers) >= 2:
            candidates.append(numbers)
    if not candidates:
        raise ValueError("horse_number_table_missing")
    candidates.sort(key=len, reverse=True)
    best = candidates[0]
    if len(best) != len(set(best)) or len(best) > 18:
        raise ValueError("horse_number_duplicate_or_excess")
    if len(candidates) > 1 and len(candidates[1]) == len(best) and candidates[1] != best:
        raise ValueError("ambiguous_horse_number_tables")
    return {"date":day,"venue":venue,"raceNumber":race_number,
            "horseNumbers":best,"horseNumberCount":len(best),
            "status":"parsed-not-authorized-for-publication"}
