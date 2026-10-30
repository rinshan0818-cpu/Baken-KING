"""Validate an explicitly authorized race-card feed before any public deployment.

This tool never downloads, copies, or publishes JRA data. It only validates
a user-provided local feed and its documented redistribution permission.
"""
import argparse
import json
from datetime import date, datetime
from pathlib import Path

def validate(feed, provenance):
    if provenance.get("redistributionAuthorized") is not True:
        raise ValueError("Redistribution authorization must be explicitly confirmed")
    if not provenance.get("sourceName") or not provenance.get("permissionReference"):
        raise ValueError("Source name and permission reference are required")
    if provenance.get("sourceName", "").strip().lower() == "jra" and not provenance.get("jraRedistributionPermissionConfirmed"):
        raise ValueError("JRA-derived content requires separately confirmed redistribution permission")
    races = feed.get("races")
    if not isinstance(races, list) or not races or len(races) > 108:
        raise ValueError("Invalid race list")
    keys = set()
    for race in races:
        day = date.fromisoformat(race["date"])
        if not isinstance(race.get("venue"), str) or not race["venue"].strip():
            raise ValueError("Invalid venue")
        number = race.get("raceNumber")
        if type(number) is not int or not 1 <= number <= 12:
            raise ValueError("Invalid race number")
        key = (day.isoformat(), race["venue"], number)
        if key in keys:
            raise ValueError("Duplicate race")
        keys.add(key)
        horses = race.get("horses")
        if not isinstance(horses, list) or not 1 <= len(horses) <= 18:
            raise ValueError("Invalid horses")
        numbers = [h.get("number") for h in horses]
        if any(type(n) is not int or not 1 <= n <= 18 for n in numbers) or len(set(numbers)) != len(numbers):
            raise ValueError("Invalid horse numbers")
        if any(not isinstance(h.get("name"), str) or not h["name"].strip() for h in horses):
            raise ValueError("Invalid horse names")
        missing = race.get("unavailableHorseNumbers", [])
        if not isinstance(missing, list) or any(type(n) is not int for n in missing):
            raise ValueError("Invalid unavailable numbers")
        if sorted(numbers + missing) != list(range(1, len(numbers) + len(missing) + 1)):
            raise ValueError("Horse number sequence incomplete")
        start = race.get("scheduledStartAt")
        if start is not None:
            parsed = datetime.fromisoformat(start)
            if parsed.utcoffset() is None or parsed.utcoffset().total_seconds() != 32400 or parsed.date() != day:
                raise ValueError("Invalid JST start time")
    return len(races)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("feed", type=Path)
    parser.add_argument("provenance", type=Path)
    args = parser.parse_args()
    count = validate(json.loads(args.feed.read_text(encoding="utf-8")),
                     json.loads(args.provenance.read_text(encoding="utf-8")))
    print(f"Authorized feed validation passed: {count} races; no publication performed")

if __name__ == "__main__":
    main()
