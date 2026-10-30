import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from normalize_private_race import normalize_race

def sample():
    return {"date":"2026-10-31","venue":"東京","raceNumber":1,
            "scheduledStartAt":"2026-10-31T10:00:00+09:00",
            "upstreamRaceId":"synthetic",
            "horses":[{"number":1,"name":"A","frame":1}],
            "raceConditions":{"weightRule":"ハンデ","restrictions":["牝馬限定"],
                              "ageCondition":"3歳以上","classCondition":"3勝クラス",
                              "grade":"リステッド","surface":"芝","distanceMeters":1600}}

class ConditionsTests(unittest.TestCase):
    def test_preserve_conditions_without_direction(self):
        result=normalize_race(sample())["raceConditions"]
        self.assertEqual(result["weightRule"],"ハンデ")
        self.assertEqual(result["ageCondition"],"3歳以上")
        self.assertEqual(result["distanceMeters"],1600)
        self.assertNotIn("direction",result)
    def test_invalid_distance_rejected(self):
        data=sample()
        data["raceConditions"]["distanceMeters"]=-1
        with self.assertRaises(ValueError):
            normalize_race(data)

if __name__=="__main__":
    unittest.main()
