import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from netkeiba_card_parser import parse_netkeiba_card

HTML = """<div class="RaceData01">芝1600m (混合) (特指) 定量</div>
<table class="Shutuba_Table"><tbody>
<tr class="HorseList"><td class="Umaban">2</td><td class="HorseName"><a>サンプルB</a></td></tr>
<tr class="HorseList"><td class="Umaban">1</td><td class="HorseName"><a>サンプルA</a></td></tr>
</tbody></table>"""

class NetkeibaCardParserTests(unittest.TestCase):
    def test_parse(self):
        c = parse_netkeiba_card(HTML, "2026-10-31", "東京", 1)
        self.assertEqual([h["number"] for h in c["horses"]], [1, 2])
        self.assertEqual(c["horses"][0]["name"], "サンプルA")
        self.assertEqual(c["raceConditions"]["weightRule"], "定量")
        self.assertIn("混合", c["raceConditions"]["restrictions"])
    def test_abbreviated_conditions(self):
        html = HTML.replace("(混合)", "(混)").replace("(混)", "(混)[指]")
        card = parse_netkeiba_card(html, "2026-10-31", "東京", 10)
        self.assertIn("混合", card["raceConditions"]["restrictions"])
        self.assertIn("指定", card["raceConditions"]["restrictions"])

    def test_provisional_card_rejected(self):
        html = HTML + "<p>出走想定は仮想の出馬表です。</p>"
        with self.assertRaisesRegex(ValueError, "provisional_race_card"):
            parse_netkeiba_card(html, "2026-10-31", "東京", 4)

    def test_reject_duplicate(self):
        with self.assertRaises(ValueError):
            parse_netkeiba_card(HTML.replace('class="Umaban">2', 'class="Umaban">1'), "2026-10-31", "東京", 1)
    def test_horse_number_name_pairs(self):
        card = parse_netkeiba_card(HTML, "2026-10-31", "東京", 1)
        self.assertEqual(card["horses"], [
            {"number": 1, "name": "サンプルA"},
            {"number": 2, "name": "サンプルB"},
        ])

    def test_missing_horse_number(self):
        html = HTML.replace('class="Umaban">2', 'class="Umaban">3')
        with self.assertRaisesRegex(ValueError, "invalid_horse_numbers"):
            parse_netkeiba_card(html, "2026-10-31", "東京", 1)

    def test_duplicate_horse_name(self):
        html = HTML.replace("サンプルB", "サンプルA")
        with self.assertRaisesRegex(ValueError, "duplicate_horse_names"):
            parse_netkeiba_card(html, "2026-10-31", "東京", 1)

    def test_missing_rows(self):
        with self.assertRaises(ValueError):
            parse_netkeiba_card("<html></html>", "2026-10-31", "東京", 1)

if __name__ == "__main__":
    unittest.main()
