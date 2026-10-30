import unittest
from scripts.validate_authorized_feed import validate

class AuthorizedFeedTests(unittest.TestCase):
    def setUp(self):
        self.feed={"races":[{"date":"2026-11-07","venue":"東京","raceNumber":1,
          "scheduledStartAt":"2026-11-07T10:00:00+09:00",
          "horses":[{"number":1,"name":"サンプルA"},{"number":2,"name":"サンプルB"}]}]}
        self.provenance={"redistributionAuthorized":True,"sourceName":"synthetic",
                         "permissionReference":"original synthetic test fixture"}
    def test_explicitly_authorized_fixture(self):
        self.assertEqual(validate(self.feed,self.provenance),1)
    def test_no_permission_is_rejected(self):
        self.provenance["redistributionAuthorized"]=False
        with self.assertRaises(ValueError):
            validate(self.feed,self.provenance)
    def test_jra_requires_specific_permission(self):
        self.provenance["sourceName"]="JRA"
        with self.assertRaises(ValueError):
            validate(self.feed,self.provenance)
    def test_duplicate_races_rejected(self):
        self.feed["races"].append(dict(self.feed["races"][0]))
        with self.assertRaises(ValueError):
            validate(self.feed,self.provenance)
    def test_missing_number_rejected(self):
        self.feed["races"][0]["horses"][1]["number"]=3
        with self.assertRaises(ValueError):
            validate(self.feed,self.provenance)

if __name__=="__main__":
    unittest.main()
