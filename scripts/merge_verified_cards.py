"""Merge verified parsed race cards into the existing catalog, preserving other races.

Usage: python scripts/merge_verified_cards.py data/race-catalog-2026-10-31.json parsed.json output.json
Never fill missing numbers from row order or overwrite a verified card silently.
"""
import argparse
import json
from pathlib import Path
from jra_card_normalizer import normalize_cards

def merge_catalog(catalog, parsed_cards):
    normalized = normalize_cards(parsed_cards)["races"]
    result = json.loads(json.dumps(catalog, ensure_ascii=False))
    entries = {(r["date"], r["venue"], r["raceNumber"]): r for r in result["races"]}
    for card in normalized:
        key = card["date"], card["venue"], card["raceNumber"]
        if key not in entries:
            raise ValueError("race_not_in_catalog:" + repr(key))
        entry = entries[key]
        if entry.get("numbersConfirmed"):
            existing = [(h["number"], h["name"]) for h in entry.get("horses", [])]
            incoming = [(h["number"], h["name"]) for h in card["horses"]]
            if existing != incoming:
                raise ValueError("confirmed_card_conflict:" + repr(key))
        entry["horses"] = [
            {"number": h["number"], "name": h["name"], "frame": None, "scratched": h.get("scratched", False)}
            for h in card["horses"]
        ]
        entry["numbersConfirmed"] = True
        entry["horsesLoaded"] = True
        entry["status"] = "numbers_confirmed"
        entry["raceConditions"] = card["raceConditions"]
        entry["metadataStatus"] = "parsed_verified"
    return result

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("catalog", type=Path)
    parser.add_argument("parsed_cards", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
    cards = json.loads(args.parsed_cards.read_text(encoding="utf-8"))
    if isinstance(cards, dict):
        cards = cards["races"]
    result = merge_catalog(catalog, cards)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("merged", len(cards), "cards")

if __name__ == "__main__":
    main()
