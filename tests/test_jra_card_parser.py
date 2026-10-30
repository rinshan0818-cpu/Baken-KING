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

    def test_horse_name_without_link_and_prior_race_numbers(self):
        html = """<html><body>2026年10月31日 4回東京10日 5R
        2歳 新馬 [指定] 馬齢
        <table><tr><th>枠</th><th>馬番</th><th>馬名 / 性齢</th><th>前走</th></tr>
        <tr><td>1</td><td>1</td><td>架空馬A<br>牝2</td><td>前走 12番</td></tr>
        <tr><td>2</td><td>2</td><td>架空馬B<br>牡2</td><td>前走 3番</td></tr>
        </table></body></html>"""
        data = parse_card(html, "2026-10-31", "東京", 5)
        self.assertEqual(data["horses"], [
            {"number": 1, "name": "架空馬A", "frame": 1},
            {"number": 2, "name": "架空馬B", "frame": 2}])
        self.assertEqual(data["raceConditions"]["weightRule"], "馬齢")

    def test_multiple_races(self):
        for day,venue,race in [("2026-10-31","東京",3),("2026-11-01","京都",11)]:
            data=parse_card(fixture(day,venue,race),day,venue,race)
            self.assertEqual(data["horseNumbers"],[1,2,3])
            self.assertEqual(data["horses"][1],{"number":2,"name":"架空馬2","frame":1})
    def test_rowspan_frame_column(self):
        html = fixture().replace(
            '<tr><td>1</td><td>1</td><td><a href="/horse/1">架空馬1</a></td></tr><tr><td>1</td><td>2</td><td><a href="/horse/2">架空馬2</a></td></tr>',
            '<tr><td rowspan="2">1</td><td>1</td><td><a href="/horse/1">架空馬1</a></td></tr><tr><td>2</td><td><a href="/horse/2">架空馬2</a></td></tr>'
        )
        self.assertEqual(parse_card(html,"2026-10-31","東京",3)["horseNumbers"],[1,2,3])
    def test_whitespace_in_horse_number(self):
        html = fixture().replace("<td>2</td><td><a href=\"/horse/2\">架空馬2", "<td> 2 </td><td><a href=\"/horse/2\">架空馬2")
        self.assertEqual(parse_card(html,"2026-10-31","東京",3)["horseNumbers"],[1,2,3])
    def test_number_from_explicit_image_alt(self):
        html = fixture().replace('<td>1</td><td><a href="/horse/1">',
            '<td><img alt="馬番1" src="/assets/one.png"></td><td><a href="/horse/1">')
        data = parse_card(html, "2026-10-31", "東京", 3)
        self.assertEqual(data["horseNumbers"], [1, 2, 3])

    def test_opaque_number_images_are_not_guessed(self):
        html = fixture()
        for n in (1, 2, 3):
            html = html.replace(f'<td>{n}</td><td><a href="/horse/{n}">',
                f'<td><img src="/assets/opaque-{n}.png"></td><td><a href="/horse/{n}">')
        with self.assertRaisesRegex(ValueError, "horse_number_table_missing"):
            parse_card(html, "2026-10-31", "東京", 3)

    def test_official_desktop_detail_card_layout(self):
        # Mimics the official desktop detailed card, with horse numbers
        # rendered as text and frame numbers represented by images.
        html = """<html><body>
        2026年10月31日（土曜） 4回東京10日 発走時刻：14時20分 9レース
        <h2>オキザリス賞</h2>2歳 1勝クラス （混合）（特指） 馬齢
        <table>
        <tr><th>枠</th><th>馬番</th><th>馬名 / 単勝オッズ(人気)</th><th>性齢/毛色</th><th>前走</th></tr>
        <tr><td><img alt="枠1白"></td><td>1</td><td><a href="/horse/a">マイスターシューズ</a></td><td>牡2</td><td>前走 11頭1番</td></tr>
        <tr><td><img alt="枠1白"></td><td>2</td><td><a href="/horse/b">架空馬B</a></td><td>牡2</td><td>前走 12頭7番</td></tr>
        </table></body></html>"""
        result = parse_card(html, "2026-10-31", "東京", 9)
        self.assertEqual(result["horses"][0], {"number": 1, "name": "マイスターシューズ", "frame": 1})
        self.assertEqual(result["horses"][1]["number"], 2)
        self.assertTrue(result["raceConditions"]["isMixed"])
        self.assertEqual(result["raceConditions"]["weightRule"], "馬齢")

    def test_jra_desktop_style_numbered_card(self):
        # Structure modeled on JRA's numbered desktop card, not copied race data.
        html = """<html><body>
        出馬表 2026年10月31日（土曜）4回東京10日 発走時刻：9時50分
        1レース 2歳未勝利 2歳 未勝利 （混合）［指定］ 馬齢
        コース：1,600メートル（ダート・左）
        <table><tr><th>枠</th><th>馬番</th>
        <th>馬名 / 単勝オッズ(人気) 戦績 / 総賞金 / 馬体重</th>
        <th>前走</th></tr>
        <tr><td rowspan="2"><img alt="枠1白"></td><td>1</td>
        <td><a href="/horse/a">架空馬A</a> (0.0.0.1)</td>
        <td>2026年10月3日 東京 15頭 7番</td></tr>
        <tr><td>2</td><td><a href="/horse/b">架空馬B</a></td>
        <td>2026年9月6日 中山 16頭 12番</td></tr>
        </table></body></html>"""
        data = parse_card(html, "2026-10-31", "東京", 1)
        self.assertEqual(data["horses"], [
            {"number": 1, "name": "架空馬A"},
            {"number": 2, "name": "架空馬B"}])
        self.assertEqual(data["raceConditions"]["weightRule"], "馬齢")
        self.assertTrue(data["raceConditions"]["isMixed"])

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
