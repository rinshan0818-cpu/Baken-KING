import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from jra_card_parser import parse_card
from jra_card_normalizer import normalize_cards

def sample_html():
    return """<html><body>
    <p>2026年10月31日</p><p>4回東京8日</p><h2>11R</h2>
    <p>3歳以上 3勝クラス (牝) ハンデ</p>
    <p>発走時刻：14時55分</p><p>コース：1,600メートル（芝・左）</p>
    <p>本賞金</p>
    <table><tr><th>枠番</th><th>馬番</th><th>馬名</th></tr>
    <tr><td rowspan="2">1</td><td>1</td><td><a>テストホースA</a></td></tr>
    <tr><td>2</td><td><a>テストホースB</a></td></tr>
    <tr><td>2</td><td>3</td><td><a>テストホースC</a></td></tr></table>
    </body></html>"""

class CardPipelineTests(unittest.TestCase):
    def test_parser_to_normalizer(self):
        card = parse_card(sample_html(), "2026-10-31", "東京", 11)
        self.assertEqual(card["scheduledStartAt"], "2026-10-31T14:55:00+09:00")
        self.assertEqual([(h["number"],h["frame"]) for h in card["horses"]],[(1,1),(2,1),(3,2)])
        result=normalize_cards([card],expected_date="2026-10-31",expected_venues=["東京"])
        race=result["races"][0]
        self.assertEqual(race["horses"][1]["frame"],1)
        self.assertEqual(race["scheduledStartAt"],"2026-10-31T14:55:00+09:00")
        self.assertEqual(race["raceConditions"]["distanceMeters"],1600)
        self.assertNotIn("direction",race["raceConditions"])
    def test_actual_jra_header_order_and_waku_column(self):
        html = sample_html().replace("<h2>11R</h2>", "<p>発走時刻：14時55分</p><h2>11レース</h2>").replace("<th>枠番</th>","<th>枠</th>")
        card = parse_card(html, "2026-10-31", "東京", 11)
        self.assertEqual(card["scheduledStartAt"],"2026-10-31T14:55:00+09:00")
        self.assertEqual([h["frame"] for h in card["horses"]],[1,1,2])
    def test_frame_image_alt_without_inference(self):
        html = sample_html().replace('<td rowspan="2">1</td>', '<td rowspan="2"><img alt="枠1" src="waku1.png"></td>')
        card = parse_card(html, "2026-10-31", "東京", 11)
        self.assertEqual([h["frame"] for h in card["horses"]], [1, 1, 2])
    def test_unreadable_frame_remains_missing(self):
        html = sample_html().replace('<td rowspan="2">1</td>', '<td rowspan="2"><img alt="赤" src="opaque.png"></td>')
        card = parse_card(html, "2026-10-31", "東京", 11)
        self.assertNotIn("frame", card["horses"][0])
        self.assertNotIn("frame", card["horses"][1])
    def test_reject_mismatched_date(self):
        with self.assertRaises(ValueError):
            parse_card(sample_html(),"2026-11-01","東京",11)

if __name__=="__main__":
    unittest.main()
