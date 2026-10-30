import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_race_import import audit

class AuditTests(unittest.TestCase):
    def test_existing_parser_export_has_missing_fields(self):
        data={"races":[{"date":"2026-10-31","venue":"東京","raceNumber":1,
                        "horses":[{"number":1,"name":"A"}]}]}
        row=audit(data)["races"][0]
        self.assertFalse(row["ready"])
        self.assertIn("horses.frame",row["missingFields"])
        self.assertIn("scheduledStartAt",row["missingFields"])
    def test_complete_card_ready(self):
        data={"races":[{"date":"2026-10-31","venue":"東京","raceNumber":1,
                        "scheduledStartAt":"2026-10-31T10:00:00+09:00",
                        "upstreamRaceId":"synthetic",
                        "horses":[{"number":1,"name":"A","frame":1}]}]}
        self.assertEqual(audit(data)["readyCount"],1)

if __name__=="__main__":
    unittest.main()
