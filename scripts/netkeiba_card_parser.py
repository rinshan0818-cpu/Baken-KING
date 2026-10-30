"""Parse a user-provided netkeiba race-card HTML file, without network access.

Only import content you are entitled to use. The HTML is never uploaded.
"""
import argparse
import json
import re
from pathlib import Path
from bs4 import BeautifulSoup

def parse_netkeiba_card(html, day, venue, race_number):
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", day):
        raise ValueError("invalid_date")
    if not isinstance(race_number, int) or not 1 <= race_number <= 12:
        raise ValueError("invalid_race_number")
    soup = BeautifulSoup(html, "html.parser")
    rows = soup.select("tr.HorseList, tr[class~=HorseList], tr[class~=HorseList]")
    if not rows:
        rows = soup.select("table.Shutuba_Table tbody tr")
    horses = []
    for row in rows:
        number = row.select_one(".Umaban, td[class~=Umaban]")
        name = row.select_one(".HorseName a, .HorseName")
        if number is None or name is None:
            continue
        num_text = number.get_text(" ", strip=True)
        if not re.fullmatch(r"\d{1,2}", num_text):
            raise ValueError("ambiguous_horse_number")
        horse_name = name.get_text(" ", strip=True)
        if not horse_name:
            raise ValueError("empty_horse_name")
        horses.append({"number": int(num_text), "name": horse_name})
    if not horses:
        raise ValueError("no_horses_found")
    numbers = [h["number"] for h in horses]
    if len(numbers) != len(set(numbers)) or sorted(numbers) != list(range(1, len(numbers) + 1)):
        raise ValueError("invalid_horse_numbers")
    header = " ".join(e.get_text(" ", strip=True) for e in soup.select(
        ".RaceData01, .RaceData02, .RaceName, .RaceData, .RaceList_Item02"
    ))
    weight_rule = next((s for s in ("ハンデ", "別定", "定量", "馬齢") if s in header), None)
    restrictions = [s for s in ("混合", "牝馬限定", "国際", "特指", "指定") if s in header]
    if "牝" in header and "牝馬限定" not in restrictions:
        restrictions.append("牝馬限定")
    return {
        "date": day, "venue": venue, "raceNumber": race_number,
        "horses": sorted(horses, key=lambda h: h["number"]),
        "raceConditions": {"weightRule": weight_rule, "restrictions": restrictions},
    }

def main():
    p = argparse.ArgumentParser()
    p.add_argument("html", type=Path)
    p.add_argument("--date", required=True)
    p.add_argument("--venue", required=True)
    p.add_argument("--race", type=int, required=True)
    p.add_argument("--output", type=Path)
    a = p.parse_args()
    raw = a.html.read_bytes()
    for encoding in ("utf-8-sig", "cp932", "euc_jp"):
        try:
            html = raw.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ValueError("unknown_encoding")
    result = parse_netkeiba_card(html, a.date, a.venue, a.race)
    output = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if a.output:
        a.output.write_text(output, encoding="utf-8")
    else:
        print(output)

if __name__ == "__main__":
    main()
