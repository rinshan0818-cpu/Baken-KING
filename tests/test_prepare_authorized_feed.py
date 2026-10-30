import json
import tempfile
import unittest
from pathlib import Path
from scripts.prepare_authorized_feed import prepare

class PrepareAuthorizedFeedTests(unittest.TestCase):
    def test_prepares_only_authorized_input(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            feed=root/"feed.json"
            permission=root/"permission.json"
            output=root/"public"/"authorized-race-cards.json"
            payload={"races":[{"date":"2026-11-07","venue":"東京","raceNumber":1,
                "scheduledStartAt":"2026-11-07T10:00:00+09:00",
                "horses":[{"number":1,"name":"架空A"},{"number":2,"name":"架空B"}]}]}
            feed.write_text(json.dumps(payload),encoding="utf-8")
            permission.write_text(json.dumps({"redistributionAuthorized":True,"sourceName":"synthetic",
                "permissionReference":"original test fixture"}),encoding="utf-8")
            self.assertEqual(prepare(feed,permission,output),1)
            self.assertEqual(json.loads(output.read_text(encoding="utf-8")),payload)
            permission.write_text(json.dumps({"redistributionAuthorized":False,"sourceName":"synthetic",
                "permissionReference":"original test fixture"}),encoding="utf-8")
            with self.assertRaises(ValueError):
                prepare(feed,permission,output)
            self.assertEqual(json.loads(output.read_text(encoding="utf-8")),payload)

if __name__=="__main__":
    unittest.main()
