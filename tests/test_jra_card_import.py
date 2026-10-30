import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from jra_card_import import import_directory

def html(venue, race):
    return (f"<html><body>2026年10月31日 4回{venue}10日 {race}レース "
            f"2歳 未勝利 (混合)[指定] 馬齢"
            '<table><tr><th>枠</th><th>馬番</th><th>馬名</th></tr>'
            '<tr><td>1</td><td>1</td><td>架空馬A</td></tr>'
            '<tr><td>2</td><td>2</td><td>架空馬B</td></tr>'
            '</table></body></html>')

class ImportTests(unittest.TestCase):
    def test_missing_html_fails_closed(self):
        with tempfile.TemporaryDirectory() as d:
            bundle, failures = import_directory(Path(d), "2026-10-31", ["東京", "京都"])
            self.assertFalse(bundle["complete"])
            self.assertEqual(len(failures), 24)
    def test_all_24_html_complete(self):
        with tempfile.TemporaryDirectory() as d:
            folder=Path(d)
            for venue in ("東京", "京都"):
                for race in range(1,13):
                    (folder / f"{venue}_{race:02d}.html").write_text(html(venue,race),encoding="utf-8")
            bundle, failures = import_directory(folder, "2026-10-31", ["東京","京都"])
            self.assertTrue(bundle["complete"])
            self.assertEqual(bundle["raceCount"], 24)
            self.assertEqual(failures, [])
            self.assertEqual(bundle["races"][0]["horses"][0]["name"],"架空馬A")

if __name__ == "__main__":
    unittest.main()
