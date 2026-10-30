import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from normalize_private_race import normalize_race,payout_for_ticket

class PrivateRaceTests(unittest.TestCase):
    def sample(self):
        return {"date":"2026-10-31","venue":"東京","raceNumber":1,
          "scheduledStartAt":"2026-10-31T10:00:00+09:00","upstreamRaceId":"sample",
          "horses":[{"number":1,"name":"架空A","frame":1},{"number":2,"name":"架空B","frame":2}],
          "result":{"status":"official-final","finish":[1,2],
                    "payouts":[{"type":"quinella","numbers":[2,1],"yenPer100":850},
                               {"type":"exacta","numbers":[1,2],"yenPer100":1250}]}}
    def test_normalization(self):
        race=normalize_race(self.sample())
        self.assertEqual(race["result"]["payouts"][0]["numbers"],[1,2])
        self.assertEqual(race["source"]["kind"],"user-provided")
    def test_unordered_and_ordered(self):
        r=normalize_race(self.sample())["result"]
        self.assertEqual(payout_for_ticket({"type":"quinella","numbers":[1,2],"stakeYen":500},r),4250)
        self.assertEqual(payout_for_ticket({"type":"exacta","numbers":[2,1],"stakeYen":500},r),0)
        self.assertEqual(payout_for_ticket({"type":"exacta","numbers":[1,2],"stakeYen":500},r),6250)
    def test_unfinalized_does_not_settle(self):
        self.assertIsNone(payout_for_ticket({"type":"win","numbers":[1],"stakeYen":100},None))
    def test_invalid_time_rejected(self):
        d=self.sample();d["scheduledStartAt"]="2026-10-31T10:00:00+00:00"
        with self.assertRaises(ValueError):normalize_race(d)
    def test_malformed_payout_rejected(self):
        d=self.sample();d["result"]["payouts"][0]["numbers"]=[[1],2]
        with self.assertRaises(ValueError):normalize_race(d)
    def test_duplicate_non_bracket_payout_rejected(self):
        d=self.sample();d["result"]["payouts"][0]["numbers"]=[1,1]
        with self.assertRaises(ValueError):normalize_race(d)
    def test_same_frame_bracket_allowed(self):
        d=self.sample();d["result"]["payouts"]=[{"type":"bracket","numbers":[1,1],"yenPer100":120}]
        self.assertEqual(normalize_race(d)["result"]["payouts"][0]["numbers"],[1,1])
    def test_invalid_ticket_rejected(self):
        with self.assertRaises(ValueError):
            payout_for_ticket({"type":"win","numbers":[1],"stakeYen":150},self.sample()["result"])

if __name__=="__main__":
    unittest.main()
