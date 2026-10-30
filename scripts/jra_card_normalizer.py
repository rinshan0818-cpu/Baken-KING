"""Validate and normalize parsed JRA race cards for application import.

No network access. No publication of JRA-sourced data. Input is an authorized
local JSON array of parser results; output is a canonical, validated JSON file.
"""
import argparse
import json
from pathlib import Path

def normalize_cards(cards, expected_date=None, expected_venues=None):
    if not isinstance(cards, list):
        raise ValueError("cards_must_be_list")
    output = []
    seen = set()
    for card in cards:
        day = card["date"]
        venue = card["venue"]
        race = card["raceNumber"]
        if expected_date and day != expected_date:
            raise ValueError("date_mismatch")
        if expected_venues and venue not in expected_venues:
            raise ValueError("venue_mismatch")
        if not isinstance(race, int) or not 1 <= race <= 12:
            raise ValueError("invalid_race_number")
        key = (day, venue, race)
        if key in seen:
            raise ValueError("duplicate_race")
        seen.add(key)
        horses = card.get("horses")
        if not isinstance(horses, list) or not horses:
            raise ValueError("horses_missing")
        numbers = [h.get("number") for h in horses]
        names = [h.get("name") for h in horses]
        if any(type(n) is not int for n in numbers):
            raise ValueError("invalid_horse_number")
        if sorted(numbers) != list(range(1, len(numbers) + 1)) or len(numbers) > 18:
            raise ValueError("invalid_horse_number_sequence")
        if any(not isinstance(n, str) or not n.strip() for n in names):
            raise ValueError("horse_name_missing")
        if len(set(names)) != len(names):
            raise ValueError("duplicate_horse_name")
        if any(h.get("scratched", False) not in (True, False) for h in horses):
            raise ValueError("invalid_scratched_flag")
        conditions = card.get("raceConditions")
        if not isinstance(conditions, dict):
            raise ValueError("conditions_missing")
        rule = conditions.get("weightRule")
        if rule not in (None, "ハンデ", "別定", "定量", "馬齢"):
            raise ValueError("invalid_weight_rule")
        restrictions = conditions.get("restrictions", [])
        if not isinstance(restrictions, list) or any(not isinstance(x, str) for x in restrictions):
            raise ValueError("invalid_restrictions")
        output.append({
            "date": day, "venue": venue, "raceNumber": race,
            "horses": sorted(({"number": h["number"], "name": h["name"].strip(), "scratched": h.get("scratched", False) is True} for h in horses), key=lambda h: h["number"]),
            "horseCount": len(horses),
            "raceConditions": {"restrictions": restrictions, "weightRule": rule,
                "isMixed": "混合" in restrictions,
                "isFemaleOnly": "牝馬限定" in restrictions,
                "isHandicap": rule == "ハンデ"}
        })
    return {"schemaVersion": 1, "races": sorted(output, key=lambda r: (r["date"], r["venue"], r["raceNumber"])),
            "raceCount": len(output)}

def main():
    p = argparse.ArgumentParser()
    p.add_argument("input", type=Path, help="Local JSON array of parsed race cards")
    p.add_argument("output", type=Path, help="Normalized JSON output")
    p.add_argument("--date", help="Require a particular YYYY-MM-DD date")
    p.add_argument("--venues", nargs="+", help="Allowed venue names")
    p.add_argument("--require-complete", action="store_true", help="Require all 12 races per venue")
    a = p.parse_args()
    data = normalize_cards(json.loads(a.input.read_text(encoding="utf-8")), a.date, a.venues)
    if a.require_complete:
        if not a.venues or not a.date:
            p.error("--require-complete requires --date and --venues")
        expected = {(a.date, venue, race) for venue in a.venues for race in range(1, 13)}
        found = {(r["date"], r["venue"], r["raceNumber"]) for r in data["races"]}
        if found != expected:
            raise ValueError("incomplete_cards:" + repr(sorted(expected - found)))
    a.output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("validated", data["raceCount"], "races")

if __name__ == "__main__":
    main()
