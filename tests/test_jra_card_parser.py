import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from jra_card_parser import parse_card

def fixture(day="2026-10-31", venue="東京", race=3):
    y,m,d=map(int,day.split("-"))
    rows="".join(f"<tr><td>1</td><td>{n}</td><td>架空馬{n}</td></tr>" for n in (1,2,3))
    return f"<html><body>{y}年{m}月{d}日 4回{venue}1日 {race}レース<table><tr><th>枠番</th><th>馬番</th><th>馬名</th></tr>{rows}</table></body></html>"

class CardParserTests(unittest.TestCase):
    def test_multiple_races(self):
        for day,venue,race in [("2026-10-31","東京",3),("2026-11-01","京都",11)]:
            data=parse_card(fixture(day,venue,race),day,venue,race)
            self.assertEqual(data["horseNumbers"],[1,2,3])
    def test_rowspan_frame_column(self):
        html = fixture().replace(
            '<tr><td>1</td><td>1</td><td>架空馬1</td></tr><tr><td>1</td><td>2</td><td>架空馬2</td></tr>',
            '<tr><td rowspan="2">1</td><td>1</td><td>架空馬1</td></tr><tr><td>2</td><td>架空馬2</td></tr>'
        )
        self.assertEqual(parse_card(html,"2026-10-31","東京",3)["horseNumbers"],[1,2,3])
    def test_whitespace_in_horse_number(self):
        html = fixture().replace("<td>2</td><td>架空馬2", "<td> 2 </td><td>架空馬2")
        self.assertEqual(parse_card(html,"2026-10-31","東京",3)["horseNumbers"],[1,2,3])
    def test_wrong_race_rejected(self):
        with self.assertRaisesRegex(ValueError,"card_race_mismatch"):
            parse_card(fixture(),"2026-10-31","東京",4)
    def test_expired_rejected(self):
        with self.assertRaisesRegex(ValueError,"card_publication_ended"):
            parse_card(fixture()+"出馬表の掲載は終了","2026-10-31","東京",3)
    def test_duplicate_rejected(self):
        with self.assertRaisesRegex(ValueError,"horse_number_duplicate_or_excess"):
            parse_card(fixture().replace("<td>3</td><td>架空馬3","<td>2</td><td>架空馬3"),"2026-10-31","東京",3)

if __name__=="__main__":
    unittest.main()
