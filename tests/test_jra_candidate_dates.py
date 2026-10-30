import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from jra_candidate_dates import JST, upcoming_weekend

class CandidateDateTests(unittest.TestCase):
    def test_friday(self):
        self.assertEqual(upcoming_weekend(datetime(2026,10,30,12,tzinfo=JST)),
                         ["2026-10-31","2026-11-01"])

    def test_saturday(self):
        self.assertEqual(upcoming_weekend(datetime(2026,10,31,12,tzinfo=JST)),
                         ["2026-10-31","2026-11-01"])

    def test_sunday(self):
        self.assertEqual(upcoming_weekend(datetime(2026,11,1,12,tzinfo=JST)),
                         ["2026-11-01"])

    def test_monday(self):
        self.assertEqual(upcoming_weekend(datetime(2026,11,2,12,tzinfo=JST)),
                         ["2026-11-07","2026-11-08"])

    def test_utc_crosses_jst_midnight(self):
        utc=timezone.utc
        self.assertEqual(upcoming_weekend(datetime(2026,10,30,16,tzinfo=utc)),
                         ["2026-10-31","2026-11-01"])

if __name__ == "__main__":
    unittest.main()
