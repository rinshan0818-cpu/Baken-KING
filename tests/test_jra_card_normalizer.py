import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from jra_card_normalizer import normalize_cards

def sample(race=1):
    return {"date":"2026-10-31","venue":"東京","raceNumber":race,
            "horses":[{"number":2,"name":"架空馬B"},{"number":1,"name":"架空馬A"}],
            "raceConditions":{"restrictions":["混合"],"weightRule":"ハンデ"}}

class NormalizerTests(unittest.TestCase):
    def test_normalize_and_sort(self):
        result=normalize_cards([sample(2),sample(1)],"2026-10-31",["東京","京都"])
        self.assertEqual(result["raceCount"],2)
        self.assertEqual(result["races"][0]["horses"][0]["name"],"架空馬A")
        self.assertTrue(result["races"][0]["raceConditions"]["isHandicap"])
    def test_duplicate_race(self):
        with self.assertRaisesRegex(ValueError,"duplicate_race"):
            normalize_cards([sample(),sample()])
    def test_number_gap(self):
        card=sample()
        card["horses"][1]["number"]=3
        with self.assertRaisesRegex(ValueError,"invalid_horse_number_sequence"):
            normalize_cards([card])
    def test_missing_name(self):
        card=sample()
        card["horses"][0]["name"]=""
        with self.assertRaisesRegex(ValueError,"horse_name_missing"):
            normalize_cards([card])
    def test_date_mismatch(self):
        with self.assertRaisesRegex(ValueError,"date_mismatch"):
            normalize_cards([sample()],"2026-11-01")
if __name__=="__main__":
    unittest.main()
