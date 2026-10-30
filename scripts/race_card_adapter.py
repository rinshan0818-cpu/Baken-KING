"""Source-independent race-card import and minimal betting-history snapshot.

Use only with data the user is permitted to access. No web requests.
Do not publish third-party race cards in the public repository.
"""
from jra_card_normalizer import normalize_cards

def normalize_source_cards(cards, source, date=None, venues=None):
    if source not in ("jra", "netkeiba", "manual"):
        raise ValueError("unsupported_source")
    result = normalize_cards(cards, date, venues)
    result["source"] = source
    result["retention"] = "temporary-race-card"
    return result

def betting_snapshot(race, selected_numbers):
    """Keep only the chosen horse numbers and race conditions, not the full card."""
    numbers = set(selected_numbers)
    if not numbers or any(type(n) is not int for n in numbers):
        raise ValueError("invalid_selection")
    by_number = {h["number"]: h["name"] for h in race["horses"]}
    if not numbers.issubset(by_number):
        raise ValueError("selection_not_in_race")
    return {
        "date": race["date"], "venue": race["venue"],
        "raceNumber": race["raceNumber"],
        "selectedHorseNumbers": sorted(numbers),
        "raceConditions": race["raceConditions"],
    }
