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
    """Parse only the race header; never infer missing weight conditions."""
    compact = re.sub(r"\s+", "", text).translate(str.maketrans("（）［］", "()[]"))
    restrictions = []
    if "(混合)" in compact or "(混)" in compact:
        restrictions.append("混合")
    if "(牝)" in compact or "牝馬限定" in compact or re.search(r"(?<![一-龥])牝(?=\[指定\]|\(指定\)|\[特指\]|\(特指\)|馬齢|定量)", compact):
        restrictions.append("牝馬限定")
    if "(牡・せん)" in compact or "牡・せん限定" in compact:
        restrictions.append("牡・せん限定")
    if "[指定]" in compact or "(指定)" in compact:
        restrictions.append("指定")
    if any(tag in compact for tag in ("[特指]", "(特指)", "[特別指定]", "(特別指定)")):
        restrictions.append("特別指定")
    if "(国際)" in compact:
        restrictions.append("国際")
    if "若手騎手" in compact:
        restrictions.append("若手騎手")
    weights = [w for w in ("ハンデ", "別定", "定量", "馬齢") if w in compact]
    if len(weights) > 1:
        raise ValueError("ambiguous_weight_conditions")
    age_match = re.search(r"(?<!\d)([234])歳以上", compact)
    if not age_match:
        age_match = re.search(r"(?<!\d)([23])歳(?!以上)", compact)
    age_condition = age_match.group(0) if age_match else None
    class_match = re.search(r"(?:未勝利|新馬|[123]勝クラス|オープン)", compact)
    class_condition = class_match.group(0) if class_match else None
    grade_match = re.search(r"(?:G[ⅠⅡⅢ]|G[123]|リステッド|\(L\))", compact)
    grade = grade_match.group(0) if grade_match else None
    surface_match = re.search(r"(芝|ダート|障害)\s*(\d{3,4})\s*(?:m|ｍ|メートル)", compact)
    official_course = re.search(r"コース[:：]([\d,，]{3,6})(?:メートル|m|ｍ)\((芝|ダート|障害)(?:・[^)]*)?\)", compact)
    if official_course:
        surface = official_course.group(2)
        distance = int(official_course.group(1).replace(",","").replace("，",""))
    else:
        surface = surface_match.group(1) if surface_match else None
        distance = int(surface_match.group(2)) if surface_match else None
    return {"restrictions": restrictions, "weightRule": weights[0] if weights else None,
            "isMixed": "混合" in restrictions,
            "isFemaleOnly": "牝馬限定" in restrictions,
            "isHandicap": weights == ["ハンデ"],
            **({"ageCondition":age_condition} if age_condition else {}),
            **({"classCondition":class_condition} if class_condition else {}),
            **({"grade":grade} if grade else {}),
            **({"surface":surface,"distanceMeters":distance} if surface else {})}

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
    if not re.search(rf"(?<!\d){race_number}\s*(?:レース|R)(?!\d)", body):
        raise ValueError("card_race_mismatch")
    # The navigation contains 1R..12R before the actual race heading.
    # Anchor the heading to the meeting line, not to the first 1R link.
    meeting = re.search(rf"\d{{1,2}}\s*回\s*{re.escape(venue)}\s*\d{{1,2}}\s*日", body)
    if meeting is None:
        raise ValueError("card_meeting_mismatch")
    current = body[meeting.end():]
    race_match = re.search(rf"(?<!\d){race_number}\s*(?:レース|R)(?!\d)", current)
    if race_match is None:
        raise ValueError("card_race_mismatch")
    # JRA puts 発走時刻 before the race-number heading; keep both in scope.
    header = current[:race_match.end() + 450].split("本賞金", 1)[0].split("詳細出馬表", 1)[0][:700]
    conditions = parse_race_conditions(header)
    start_match = re.search(r"発走時刻[:：]\s*(\d{1,2})時(\d{2})分", header)
    scheduled_start = None
    if start_match:
        hour, minute = map(int, start_match.groups())
        if not (0 <= hour <= 23 and 0 <= minute <= 59):
            raise ValueError("invalid_start_time")
        scheduled_start = f"{day}T{hour:02d}:{minute:02d}:00+09:00"
    candidates = []
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        header_index = None
        number_col = name_col = frame_col = None
        for row_index, tr in enumerate(rows[:12]):
            cells = tr.find_all(["th", "td"], recursive=False)
            labels = [re.sub(r"\s+", "", c.get_text(" ", strip=True)) for c in cells]
            num = next((i for i, label in enumerate(labels) if label == "馬番"), None)
            name = next((i for i, label in enumerate(labels) if label.startswith("馬名")), None)
            if num is not None and name is not None and num != name:
                header_index, number_col, name_col = row_index, num, name
                frame_col = next((i for i, label in enumerate(labels) if label in ("枠番", "枠")), None)
                break
        if header_index is None:
            continue
        numbers, horse_names, cancelled_names, frames = [], [], [], {}
        # Expand rowspans so a shared frame-number cell cannot shift the horse-number column.
        pending = {}
        for tr in rows[header_index + 1:]:
            # Expanded past-performance rows are not horses and must not
            # consume rowspans belonging to the visible horse rows.
            if "tr_kako" in tr.get("class", []):
                continue
            cells = tr.find_all(["td", "th"], recursive=False)
            if not cells:
                continue
            expanded = []
            position = 0
            def fill_pending():
                nonlocal position
                while position in pending:
                    cell, remaining = pending[position]
                    expanded.append(cell)
                    if remaining <= 1:
                        del pending[position]
                    else:
                        pending[position] = (cell, remaining - 1)
                    position += 1
            fill_pending()
            for cell in cells:
                fill_pending()
                colspan = int(cell.get("colspan", 1))
                rowspan = int(cell.get("rowspan", 1))
                for _ in range(colspan):
                    expanded.append(cell)
                    if rowspan > 1:
                        pending[position] = (cell, rowspan - 1)
                    position += 1
            fill_pending()
            if len(expanded) <= max(number_col, name_col):
                continue
            raw_number = re.sub(r"\s+", "", expanded[number_col].get_text(" ", strip=True))
            # A cancellation can be shown in a different column. Never interpret
            # the status cell as a horse number or infer numbers from row order.
            status_text = " ".join(cell.get_text(" ", strip=True) for cell in cells)
            is_cancelled = bool(re.search(r"出走取消|競走除外|(?<!\S)取消(?!\S)", status_text))
            if not re.fullmatch(r"\d{1,2}", raw_number):
                image = expanded[number_col].find("img")
                alt = image.get("alt", "").strip() if image else ""
                match = re.fullmatch(r"(?:馬番)?\s*(\d{1,2})\s*(?:番)?", alt)
                if match is None:
                    continue
                raw_number = match.group(1)
            number = int(raw_number)
            if not 1 <= number <= 18:
                continue
            name_cell = expanded[name_col]
            name_span = name_cell.select_one(".bamei")
            link = name_span or name_cell.find("a")
            if link and link.get_text(" ", strip=True):
                horse_name = link.get_text(" ", strip=True).strip()
            else:
                horse_name = next((x.strip() for x in name_cell.stripped_strings), "")
            if not horse_name:
                continue
            if frame_col is not None and len(expanded) > frame_col and number is not None:
                frame_text = re.sub(r"\s+", "", expanded[frame_col].get_text(" ", strip=True))
                if not re.fullmatch(r"[1-8]", frame_text):
                    image = expanded[frame_col].find("img")
                    alt = image.get("alt", "") if image else ""
                    frame_match = re.fullmatch(r"枠(?:番)?\s*([1-8])\s*(?:枠)?(?:白|黒|赤|青|黄|緑|橙|桃)?", alt.strip())
                    if frame_match:
                        frame_text = frame_match.group(1)
                if re.fullmatch(r"[1-8]", frame_text):
                    frames[number] = int(frame_text)
            numbers.append(number)
            horse_names.append(horse_name)
            if is_cancelled:
                cancelled_names.append(horse_name)
        if len(numbers) >= 2:
            candidates.append((numbers, horse_names, cancelled_names, frames))
    if not candidates:
        raise ValueError("horse_number_table_missing")
    candidates.sort(key=lambda item: len(item[0]), reverse=True)
    best, names, cancelled, frames = candidates[0]
    if len(best) != len(set(best)) or len(best) > 18:
        raise ValueError("horse_number_duplicate_or_excess")
    if len(candidates) > 1 and len(candidates[1][0]) == len(best) and candidates[1][0] != best:
        raise ValueError("ambiguous_horse_number_tables")
    missing = sorted(set(range(1, max(best) + 1)) - set(best))
    if missing:
        raise ValueError("horse_numbers_not_contiguous:" + repr(sorted(best)))
    if not all(names) or len(set(names)) != len(names):
        raise ValueError("horse_names_missing_or_duplicate")
    horses = [{"number": number, "name": name, **({"frame": frames[number]} if number in frames else {}), **({"scratched": True} if name in cancelled else {})} for number, name in sorted(zip(best, names))]
    return {"date":day,"venue":venue,"raceNumber":race_number,
            "horseNumbers":best,
            "horseNames":[horse["name"] for horse in horses],
            "horses":horses,
            "raceConditions":conditions,"horseNumberCount":len(best),
            **({"scheduledStartAt":scheduled_start} if scheduled_start else {}),
            "status":"parsed-not-authorized-for-publication"}
