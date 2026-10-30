"""Reusable offline JRA card parser for a specified race.

No network requests or public data persistence. A caller supplies HTML already
obtained through an authorized source. Publication-ended cards fail closed.
"""
from __future__ import annotations
from bs4 import BeautifulSoup
import re
from datetime import datetime

VENUES = ("札幌","函館","福島","新潟","東京","中山","中京","京都","阪神","小倉")

def parse_race_conditions(text: str) -> dict:
    """Extract JRA race restrictions and weight rules without guessing missing data."""
    compact = re.sub(r"\\s+", "", text).replace("［", "[").replace("］", "]").replace("（", "(").replace("）", ")")
    # Only the race header should be passed in; historical form can contain other race types.
    restrictions = []
    if re.search(r"\\(混合\\)|\\(混\\)", compact):
        restrictions.append("混合")
    if re.search(r"\\(牝\\)|牝馬限定", compact):
        restrictions.append("牝馬限定")
    if re.search(r"\\(牡・せん\\)|牡・せん限定", compact):
        restrictions.append("牡・せん限定")
    if re.search(r"\\[指定\\]", compact):
        restrictions.append("指定")
    if re.search(r"\\[特指\\]|\\[特別指定\\]", compact):
        restrictions.append("特別指定")
    if "若手騎手" in compact:
        restrictions.append("若手騎手")
    weights = [w for w in ("ハンデ", "別定", "定量", "馬齢") if w in compact]
    if len(weights) > 1:
        raise ValueError("ambiguous_weight_conditions")
    return {"restrictions": restrictions, "weightRule": weights[0] if weights else None,
            "isMixed": "混合" in restrictions,
            "isFemaleOnly": "牝馬限定" in restrictions,
            "isHandicap": weights == ["ハンデ"]}


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
    # Race conditions appear above the card; ignore past-performance tables.
    race_match = re.search(rf"(?<!\\d){race_number}\\s*(?:レース|R)", body)
    race_header = body[race_match.start():] if race_match else body
    header = race_header.split("出馬表", 1)[0][:900]
    conditions = parse_race_conditions(header)
    candidates = []
    for table in soup.find_all("table"):
        head = table.get_text(" ", strip=True)[:700]
        if "馬番" not in head or "馬名" not in head:
            continue
        numbers = []
        horse_names = []
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
                horse_names.append(next((a.get_text(" ", strip=True) for a in tr.find_all("a") if a.get_text(" ", strip=True)), ""))
        if len(numbers) >= 2:
            candidates.append((numbers, horse_names))
    if not candidates:
        raise ValueError("horse_number_table_missing")
    candidates.sort(key=lambda item: len(item[0]), reverse=True)
    best, names = candidates[0]
    if len(best) != len(set(best)) or len(best) > 18:
        raise ValueError("horse_number_duplicate_or_excess")
    if len(candidates) > 1 and len(candidates[1][0]) == len(best) and candidates[1][0] != best:
        raise ValueError("ambiguous_horse_number_tables")
    if sorted(best) != list(range(1, len(best) + 1)):
        raise ValueError("horse_numbers_not_contiguous")
    return {"date":day,"venue":venue,"raceNumber":race_number,
            "horseNumbers":best,
            "horseNames":names,
            "raceConditions":conditions,"horseNumberCount":len(best),
            "status":"parsed-not-authorized-for-publication"}
