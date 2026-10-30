"""Offline refund regression tests. No third-party access or published race data."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from normalize_private_race import normalize_race,payout_for_ticket

def fixture():
    return {"date":"2026-10-31","venue":"東京","raceNumber":1,
            "scheduledStartAt":"2026-10-31T10:00:00+09:00",
            "upstreamRaceId":"synthetic",
            "horses":[{"number":1,"name":"A","frame":1},
                      {"number":2,"name":"B","frame":2}],
            "result":{"status":"official-final","finish":[1,2],
                      "payouts":[{"type":"exacta","numbers":[1,2],"yenPer100":1250}],
                      "refunds":[{"type":"exacta","numbers":[2,1]}]}}

class RefundTests(unittest.TestCase):
    def test_refund_returns_stake(self):
        result=normalize_race(fixture())["result"]
        self.assertEqual(payout_for_ticket({"type":"exacta","numbers":[2,1],"stakeYen":300},result),300)
        self.assertEqual(payout_for_ticket({"type":"exacta","numbers":[1,2],"stakeYen":300},result),3750)
    def test_conflict_rejected(self):
        data=fixture()
        data["result"]["refunds"]=[{"type":"exacta","numbers":[1,2]}]
        result=normalize_race(data)["result"]
        with self.assertRaisesRegex(ValueError,"conflicting_payout_and_refund"):
            payout_for_ticket({"type":"exacta","numbers":[1,2],"stakeYen":100},result)
    def test_bad_refund_rejected(self):
        data=fixture()
        data["result"]["refunds"]=[{"type":"trifecta","numbers":[1,1,2]}]
        with self.assertRaises(ValueError):
            normalize_race(data)

if __name__=="__main__":
    unittest.main()
