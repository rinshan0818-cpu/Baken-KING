import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from jra_card_parser import parse_card, parse_race_conditions

def fixture(day="2026-10-31", venue="東京", race=3):
    y,m,d=map(int,day.split("-"))
    rows="".join(f'<tr><td>1</td><td>{n}</td><td><a href="/horse/{n}">架空馬{n}</a></td></tr>' for n in (1,2,3))
    return f"<html><body>{y}年{m}月{d}日 4回{venue}1日 {race}レース<table><tr><th>枠番</th><th>馬番</th><th>馬名</th></tr>{rows}</table></body></html>"

class CardParserTests(unittest.TestCase):
    def test_race_conditions(self):
        mixed=parse_race_conditions("3歳以上 オープン （国際）（特指） ハンデ")
        self.assertTrue(mixed["isHandicap"])
        self.assertIn("国際",mixed["restrictions"])
        self.assertIn("特別指定",mixed["restrictions"])
        female=parse_race_conditions("2歳 オープン (国際)牝(指定) 馬齢")
        self.assertTrue(female["isFemaleOnly"])
        self.assertEqual(female["weightRule"],"馬齢")
        self.assertTrue(parse_race_conditions("（混合）［指定］ 定量")["isMixed"])
        self.assertIsNone(parse_race_conditions("2歳未勝利")["weightRule"])

    def test_multiple_races(self):
        for day,venue,race in [("2026-10-31","東京",3),("2026-11-01","京都",11)]:
            data=parse_card(fixture(day,venue,race),day,venue,race)
            self.assertEqual(data["horseNumbers"],[1,2,3])
            self.assertEqual(data["horses"][1],{"number":2,"name":"架空馬2"})
    def test_rowspan_frame_column(self):
        html = fixture().replace(
            '<tr><td>1</td><td>1</td><td><a href="/horse/1">架空馬1</a></td></tr><tr><td>1</td><td>2</td><td><a href="/horse/2">架空馬2</a></td></tr>',
            '<tr><td rowspan="2">1</td><td>1</td><td><a href="/horse/1">架空馬1</a></td></tr><tr><td>2</td><td><a href="/horse/2">架空馬2</a></td></tr>'
        )
        self.assertEqual(parse_card(html,"2026-10-31","東京",3)["horseNumbers"],[1,2,3])
    def test_whitespace_in_horse_number(self):
        html = fixture().replace("<td>2</td><td><a href=\"/horse/2\">架空馬2", "<td> 2 </td><td><a href=\"/horse/2\">架空馬2")
        self.assertEqual(parse_card(html,"2026-10-31","東京",3)["horseNumbers"],[1,2,3])
    def test_wrong_race_rejected(self):
        with self.assertRaisesRegex(ValueError,"card_race_mismatch"):
            parse_card(fixture(),"2026-10-31","東京",4)
    def test_expired_rejected(self):
        with self.assertRaisesRegex(ValueError,"card_publication_ended"):
            parse_card(fixture()+"出馬表の掲載は終了","2026-10-31","東京",3)
    def test_duplicate_rejected(self):
        with self.assertRaisesRegex(ValueError,"horse_number_duplicate_or_excess"):
            parse_card(fixture().replace("<td>3</td><td><a href=\"/horse/3\">架空馬3","<td>2</td><td><a href=\"/horse/3\">架空馬3"),"2026-10-31","東京",3)

if __name__=="__main__":
    unittest.main()
