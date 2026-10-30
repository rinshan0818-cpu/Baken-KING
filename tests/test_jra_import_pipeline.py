"""Offline regression checks for JRA URL discovery and race catalog merge."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from discover_jra_urls import discover, race_key
from merge_verified_cards import merge_catalog

DATE = "2026-10-31"
TOKYO = "https://sp.jra.jp/JRADB/accessD.html?CNAME=sw01ddd0105202604100120261031%2F3B"
KYOTO = "https://app.jra.jp/JRADB/accessD.html?CNAME=sw01ddd0108202604101220261031%2F20"

class ImportTests(unittest.TestCase):
    def test_real_url_tokens(self):
        self.assertEqual(race_key(TOKYO, DATE), (DATE, "東京", 1))
        self.assertEqual(race_key(KYOTO, DATE), (DATE, "京都", 12))
        self.assertIsNone(race_key(TOKYO, "2026-11-01"))

    def test_all_ten_jra_venues(self):
        codes = {"札幌":"01","函館":"02","福島":"03","新潟":"04",
                 "東京":"05","中山":"06","中京":"07","京都":"08",
                 "阪神":"09","小倉":"10"}
        for venue, code in codes.items():
            with self.subTest(venue=venue):
                url = ("https://sp.jra.jp/JRADB/accessD.html?CNAME="
                       "sw01ddd01" + code + "202604100120261031%2F3B")
                self.assertEqual(race_key(url, DATE), (DATE, venue, 1))

    def test_discover_only_official_links(self):
        html = '<a href="'+TOKYO+'">1R</a><a href="'+KYOTO+'">12R</a><a href="https://example.com/JRADB/accessD.html?CNAME=sw01ddd0105202604100120261031">bad</a>'
        found = discover(html, "https://sp.jra.jp/", DATE)
        self.assertEqual([(x["venue"], x["raceNumber"]) for x in found], [("京都", 12), ("東京", 1)])

    def test_merge_preserves_unrelated_races(self):
        catalog = {"races":[
            {"date":DATE,"venue":"東京","raceNumber":1,"status":"awaiting_numbers"},
            {"date":DATE,"venue":"東京","raceNumber":2,"status":"awaiting_numbers"}]}
        parsed = [{"date":DATE,"venue":"東京","raceNumber":1,
                   "horses":[{"number":1,"name":"馬A"},{"number":2,"name":"馬B"}],
                   "raceConditions":{"restrictions":[],"weightRule":"馬齢"}}]
        merged = merge_catalog(catalog, parsed)
        self.assertEqual(merged["races"][0]["horses"][0]["number"], 1)
        self.assertEqual(merged["races"][1]["status"], "awaiting_numbers")
        self.assertEqual(catalog["races"][0]["status"], "awaiting_numbers")

    def test_merge_rejects_conflicting_confirmed_card(self):
        catalog = {"races":[{"date":DATE,"venue":"東京","raceNumber":1,
            "numbersConfirmed":True,"horses":[{"number":1,"name":"別の馬"},{"number":2,"name":"馬B"}]}]}
        parsed = [{"date":DATE,"venue":"東京","raceNumber":1,
            "horses":[{"number":1,"name":"馬A"},{"number":2,"name":"馬B"}],
            "raceConditions":{"restrictions":[],"weightRule":None}}]
        with self.assertRaisesRegex(ValueError, "confirmed_card_conflict"):
            merge_catalog(catalog, parsed)

if __name__ == "__main__":
    unittest.main()
