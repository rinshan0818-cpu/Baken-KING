import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from import_private_race import convert

def sample():
    return {"date":"2026-10-31","venue":"東京","raceNumber":1,
            "scheduledStartAt":"2026-10-31T10:00:00+09:00",
            "upstreamRaceId":"fixture-1",
            "horses":[{"number":1,"name":"テストA","frame":1},
                      {"number":2,"name":"テストB","frame":2}]}

class ImportTests(unittest.TestCase):
    def test_valid_card(self):
        data=convert({"races":[sample()]})
        self.assertEqual(data["raceCount"],1)
        self.assertEqual(data["races"][0]["horses"][0]["name"],"テストA")
    def test_reject_duplicate_races(self):
        with self.assertRaisesRegex(ValueError,"duplicate_race"):
            convert({"races":[sample(),sample()]})
    def test_reject_missing_list(self):
        with self.assertRaises(ValueError):
            convert({"entries":[]})
    def test_refunds_and_payouts(self):
        item=sample()
        item["result"]={"status":"official-final","finish":[1,2],
                        "payouts":[{"type":"exacta","numbers":[1,2],"yenPer100":900}],
                        "refunds":[{"type":"exacta","numbers":[2,1]}]}
        r=convert({"races":[item]})["races"][0]
        self.assertEqual(r["result"]["refunds"][0]["numbers"],[2,1])

if __name__=="__main__":
    unittest.main()
