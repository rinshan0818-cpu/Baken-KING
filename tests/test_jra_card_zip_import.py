import sys
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from jra_card_zip_import import import_zip

def page(venue, race):
    return (f"<html><body>2026年10月31日 4回{venue}10日 {race}レース "
            "2歳 未勝利 (混合)[指定] 馬齢"
            "<table><tr><th>枠</th><th>馬番</th><th>馬名</th></tr>"
            "<tr><td>1</td><td>1</td><td>架空馬A</td></tr>"
            "<tr><td>2</td><td>2</td><td>架空馬B</td></tr>"
            "</table></body></html>")

class ZipImportTests(unittest.TestCase):
    def test_24_pages_utf8_and_cp932(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "cards.zip"
            with ZipFile(path, "w") as z:
                for venue in ("東京", "京都"):
                    for race in range(1, 13):
                        encoding = "cp932" if race % 2 else "utf-8"
                        z.writestr(f"{venue}_{race:02d}.html", page(venue, race).encode(encoding))
            bundle, failures = import_zip(path, "2026-10-31", ["東京", "京都"])
            self.assertTrue(bundle["complete"])
            self.assertEqual(bundle["raceCount"], 24)
            self.assertEqual(failures, [])
    def test_missing_page_fails_closed(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "cards.zip"
            with ZipFile(path, "w") as z:
                z.writestr("東京_01.html", page("東京", 1))
            bundle, failures = import_zip(path, "2026-10-31", ["東京", "京都"])
            self.assertFalse(bundle["complete"])
            self.assertEqual(len(failures), 23)
    def test_duplicate_basename_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "cards.zip"
            with ZipFile(path, "w") as z:
                z.writestr("one/東京_01.html", page("東京", 1))
                z.writestr("two/東京_01.html", page("東京", 1))
            with self.assertRaisesRegex(ValueError, "duplicate_filename_in_zip"):
                import_zip(path, "2026-10-31", ["東京", "京都"])

if __name__ == "__main__":
    unittest.main()
