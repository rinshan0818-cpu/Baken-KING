import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from discover_jra_card_seeds import extract_seeds

class SeedDiscoveryTests(unittest.TestCase):
    def test_only_explicit_official_jradb_links(self):
        html = """<a href="https://sp.jra.jp/JRADB/accessD.html?CNAME=pw01dde0105202610310120261031%2F00">card</a>
<a href="https://evil.example/JRADB/accessD.html?CNAME=x">evil</a>
<a href="https://sp.jra.jp/JRADB/accessD.html?other=1">other</a>"""
        self.assertEqual(len(extract_seeds(html, "https://www.jra.go.jp/")), 1)

    def test_no_card_links_on_program_fixture(self):
        html = "<h1>競馬番組</h1><p>4回東京10日</p><a href='/keiba/calendar2026/'>日程</a>"
        self.assertEqual(extract_seeds(html, "https://www.jra.go.jp/"), [])

    def test_duplicate_links_removed(self):
        url = "https://sp.jra.jp/JRADB/accessD.html?CNAME=abc"
        self.assertEqual(extract_seeds(f'<a href="{url}">1</a><a href="{url}">2</a>', url), [url])

if __name__ == "__main__":
    unittest.main()
