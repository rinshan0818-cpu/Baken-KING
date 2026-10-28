"""Synthetic-only tests for official JRA historical horse-number table parsing."""
import importlib.util
from pathlib import Path
import sys
import unittest

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))
MODULE = SCRIPTS / "jra_card_probe.py"
spec = importlib.util.spec_from_file_location("jra_card_probe", MODULE)
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


def fake_card(count=16):
    header = "<h1>2026年10月25日（日曜）4回東京9日 11レース</h1>"
    rows = ["<tr><th>枠</th><th>馬番</th><th>馬名</th><th>性齢</th></tr>"]
    for n in range(1, count + 1):
        rows.append(f"<tr><td><img alt='枠'></td><td>{n}</td><td>架空の馬{n}</td><td>牡4</td></tr>")
    return "<html><body>" + header + "<table>" + "".join(rows) + "</table></body></html>"


class CardProbeTest(unittest.TestCase):
    def test_historical_synthetic_runner_numbers(self):
        numbers = probe.parse_horse_numbers(fake_card())
        self.assertEqual(numbers, list(range(1, 17)))

    def test_wrong_race_date_stops(self):
        with self.assertRaisesRegex(ValueError, "date_mismatch"):
            probe.parse_horse_numbers(fake_card().replace("2026年10月25日", "2026年10月24日"))

    def test_duplicate_horse_number_stops(self):
        html = fake_card(count=3).replace("<td>3</td>", "<td>2</td>")
        with self.assertRaisesRegex(ValueError, "duplicate"):
            probe.parse_horse_numbers(html)

    def test_expired_card_is_not_a_parser_failure(self):
        html = "<html><body><h1>2026年10月25日 4回東京9日 11レース</h1>" \
               "このレースの出馬表の掲載は終了しております。</body></html>"
        with self.assertRaisesRegex(ValueError, "card_publication_ended"):
            probe.parse_horse_numbers(html)

    def test_no_table_stops(self):
        with self.assertRaisesRegex(ValueError, "table_missing"):
            probe.parse_horse_numbers(fake_card().replace("馬番", "番号"))


if __name__ == "__main__":
    unittest.main()
