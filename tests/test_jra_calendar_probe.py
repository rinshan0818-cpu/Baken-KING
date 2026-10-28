"""All test race data is invented and does not access JRA."""
import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "jra_calendar_probe.py"
spec = importlib.util.spec_from_file_location("jra_calendar_probe", MODULE_PATH)
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


def invented_html(day="2026年10月31日", with_two_venues=True):
    fragments = [f"<html><body><h1>{day}（土曜） 競馬番組</h1>"]
    for course in (["東京", "京都"] if with_two_venues else ["東京"]):
        fragments.append(f"<h3>4回{course}10日</h3><table>")
        fragments.append("<tr><th>レース番号</th><th>レース名・条件</th><th>発走時刻</th></tr>")
        for n in range(1, 13):
            name = f"<a>架空の特別競走 {n}</a> 3歳以上" if n == 11 else f"架空レース {n}"
            fragments.append(f"<tr><td>{n}レース</td><td>{name}</td>"
                             f"<td>{9+n:02d}時10分</td></tr>")
        fragments.append("</table>")
    fragments.append("</body></html>")
    return "".join(fragments)


class CalendarProbeTest(unittest.TestCase):
    def test_date_url_is_official_layout(self):
        self.assertEqual(
            probe.jra_calendar_url("2026-10-31"),
            "https://www.jra.go.jp/keiba/calendar2026/2026/10/1031.html",
        )
        self.assertEqual(
            probe.jra_calendar_url("2026-11-01"),
            "https://www.jra.go.jp/keiba/calendar2026/2026/11/1101.html",
        )

    def test_fictional_two_venues_twenty_four_races(self):
        rows = probe.parse_program(invented_html(), "2026-10-31")
        self.assertEqual(len(rows), 24)
        self.assertEqual(len([x for x in rows if x["venue"] == "東京"]), 12)
        self.assertEqual(rows[10]["raceNumber"], 11)
        self.assertIn("架空の特別競走", rows[10]["programDescription"])
        self.assertEqual(rows[0]["scheduledStartAt"], "2026-10-31T10:10:00+09:00")
        self.assertFalse(rows[0]["purchaseAllowed"])
        self.assertFalse(rows[0]["cardAvailable"])

    def test_reject_wrong_day(self):
        with self.assertRaisesRegex(ValueError, "date_mismatch"):
            probe.parse_program(invented_html(), "2026-11-01")

    def test_reject_duplicate_races(self):
        html = invented_html().replace("2レース", "1レース")
        with self.assertRaisesRegex(ValueError, "duplicate"):
            probe.parse_program(html, "2026-10-31")

    def test_cli_offline_only_and_aggregate_status(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source.html"
            status = Path(directory) / "status.json"
            source.write_text(invented_html(), encoding="utf-8")
            completed = subprocess.run(
                [sys.executable, str(MODULE_PATH), "--date", "2026-10-31",
                 "--html-file", str(source), "--min-races", "24",
                 "--status-file", str(status)],
                capture_output=True, text=True, check=False,
            )
            self.assertEqual(completed.returncode, 0, completed.stderr)
            result = __import__("json").loads(status.read_text(encoding="utf-8"))
            self.assertEqual(result["status"], "ok")
            self.assertEqual(result["totalRaces"], 24)
            self.assertNotIn("架空の特別競走", status.read_text(encoding="utf-8"))
            self.assertNotIn("races", result)
            attempted = subprocess.run(
                [sys.executable, str(MODULE_PATH), "--date", "2026-10-31",
                 "--live-once", "--status-file", str(status)],
                capture_output=True, text=True, check=False,
                env={"PATH": "/usr/bin:/bin"},
            )
            self.assertEqual(attempted.returncode, 1)
            failed = __import__("json").loads(status.read_text(encoding="utf-8"))
            self.assertEqual(failed["errorCode"], "live_fetch_not_enabled")


if __name__ == "__main__":
    unittest.main()
