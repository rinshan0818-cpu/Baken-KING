import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from fetch_jra_cards import decode_jra_html

class JraCharsetTests(unittest.TestCase):
    def test_meta_shift_jis(self):
        html = '<html><head><meta charset="Shift_JIS"></head><body>東京 ケイケイ</body></html>'
        decoded, charset = decode_jra_html(html.encode("cp932"))
        self.assertIn("東京 ケイケイ", decoded)
        self.assertEqual(charset, "cp932")

    def test_http_charset(self):
        html = "<html><body>京都</body></html>"
        decoded, charset = decode_jra_html(html.encode("cp932"), "windows-31j")
        self.assertIn("京都", decoded)
        self.assertEqual(charset, "cp932")

    def test_utf8_without_declared_charset(self):
        decoded, charset = decode_jra_html("東京".encode("utf-8"))
        self.assertEqual(decoded, "東京")
        self.assertEqual(charset, "utf-8")

    def test_invalid_bytes_fail_closed(self):
        with self.assertRaises(UnicodeDecodeError):
            decode_jra_html(b"\x81")

if __name__ == "__main__":
    unittest.main()
