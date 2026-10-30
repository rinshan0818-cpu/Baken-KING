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

def horse_options(race):
    """UI-ready horse options. Never guess names or renumber entries."""
    horses = race.get("horses")
    if not isinstance(horses, list) or not horses:
        raise ValueError("horses_missing")
    options = []
    for horse in horses:
        number = horse.get("number")
        name = horse.get("name")
        if type(number) is not int or not 1 <= number <= 18:
            raise ValueError("invalid_horse_number")
        if not isinstance(name, str) or not name.strip():
            raise ValueError("invalid_horse_name")
        options.append({"value": number, "label": f"{number} {name.strip()}"})
    options.sort(key=lambda option: option["value"])
    if [item["value"] for item in options] != list(range(1, len(options) + 1)):
        raise ValueError("invalid_horse_number_sequence")
    if len({item["label"].split(" ", 1)[1] for item in options}) != len(options):
        raise ValueError("duplicate_horse_name")
    return options
