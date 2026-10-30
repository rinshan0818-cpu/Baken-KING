import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from jra_card_parser import parse_race_conditions

class HeaderConditionTests(unittest.TestCase):
    def test_handicap_female_turf(self):
        r=parse_race_conditions("3歳以上 3勝クラス (牝) ハンデ 芝1600m")
        self.assertEqual(r["weightRule"],"ハンデ")
        self.assertIn("牝馬限定",r["restrictions"])
        self.assertEqual(r["ageCondition"],"3歳以上")
        self.assertEqual(r["classCondition"],"3勝クラス")
        self.assertEqual(r["surface"],"芝")
        self.assertEqual(r["distanceMeters"],1600)
        self.assertNotIn("direction",r)
    def test_grade_and_dirt(self):
        r=parse_race_conditions("4歳以上 オープン GⅢ 別定 ダート1800ｍ")
        self.assertEqual(r["grade"],"GⅢ")
        self.assertEqual(r["weightRule"],"別定")
        self.assertEqual(r["surface"],"ダート")
    def test_no_guessed_values(self):
        r=parse_race_conditions("2歳 新馬 馬齢")
        self.assertNotIn("distanceMeters",r)
        self.assertNotIn("grade",r)

if __name__=="__main__":
    unittest.main()
