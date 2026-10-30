import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from race_card_adapter import normalize_source_cards, betting_snapshot, horse_options

def sample():
    return {"date":"2026-10-31","venue":"東京","raceNumber":11,
            "horses":[{"number":1,"name":"架空馬A"},{"number":2,"name":"架空馬B"}],
            "raceConditions":{"restrictions":["国際"],"weightRule":"ハンデ"}}

class SourceAdapterTests(unittest.TestCase):
    def test_provider_independent(self):
        for provider in ("jra","netkeiba","manual"):
            result=normalize_source_cards([sample()],provider,"2026-10-31",["東京"])
            self.assertEqual(result["races"][0]["horseCount"],2)
    def test_minimal_snapshot_does_not_retain_names(self):
        snapshot=betting_snapshot(sample(),[2])
        self.assertEqual(snapshot["selectedHorseNumbers"],[2])
        self.assertNotIn("horses",snapshot)
        self.assertNotIn("horseNames",snapshot)
        self.assertEqual(snapshot["raceConditions"]["weightRule"],"ハンデ")
    def test_ui_horse_options(self):
        race = sample()
        race["horses"].reverse()
        self.assertEqual(horse_options(race), [
            {"value": 1, "label": "1 架空馬A"},
            {"value": 2, "label": "2 架空馬B"},
        ])

    def test_ui_horse_options_reject_missing_number(self):
        race = sample()
        race["horses"][1]["number"] = 3
        with self.assertRaisesRegex(ValueError, "invalid_horse_number_sequence"):
            horse_options(race)

    def test_invalid_selection(self):
        with self.assertRaisesRegex(ValueError,"selection_not_in_race"):
            betting_snapshot(sample(),[3])

if __name__ == "__main__":
    unittest.main()
