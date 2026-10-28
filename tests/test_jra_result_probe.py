"""Fictional HTML test for one-off historical JRA result availability check."""
import importlib.util
from pathlib import Path
import sys
import unittest

root = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(root))
spec = importlib.util.spec_from_file_location("jra_result_probe", root / "jra_result_probe.py")
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


def fixture():
    return """<html><body>
    <h1>2026年10月25日 4回東京9日 11レース</h1>
    <table><tr><th>着順</th><th>馬番</th><th>馬名</th></tr>
    <tr><td>1</td><td>4</td><td>架空A</td></tr></table>
    <h2>払戻金</h2><p>単勝 4 100円</p><p>複勝 4 100円</p>
    <p>馬連 2-4 100円</p><p>ワイド 2-4 100円</p>
    <p>馬単 4-2 100円</p><p>3連複 2-4-5 100円</p>
    <p>3連単 4-2-5 100円</p><h2>勝馬の紹介</h2></body></html>"""


class ResultProbeTests(unittest.TestCase):
    def test_synthetic_seven_payout_categories(self):
        result = probe.inspect_results(fixture())
        self.assertEqual(result["payoutTypeCount"], 7)
        self.assertEqual(result["resultTableCount"], 1)

    def test_wrong_date(self):
        with self.assertRaisesRegex(ValueError, "date_mismatch"):
            probe.inspect_results(fixture().replace("2026年10月25日", "2026年10月24日"))

    def test_missing_one_bet_type(self):
        with self.assertRaisesRegex(ValueError, "seven_payout_types"):
            probe.inspect_results(fixture().replace("3連単", "その他"))


if __name__ == "__main__":
    unittest.main()
