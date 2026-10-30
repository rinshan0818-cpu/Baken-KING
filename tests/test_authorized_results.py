import unittest
from scripts.prepare_authorized_results import validate_results

class AuthorizedResultsTests(unittest.TestCase):
    def setUp(self):
        self.permission={"redistributionAuthorized":True,"sourceName":"synthetic",
                         "permissionReference":"original test data"}
        self.data={"races":[{"date":"2026-11-07","venue":"東京","raceNumber":1,
            "status":"final","finishOrder":[2,1,3],
            "payouts":[{"type":"馬連","numbers":[2,1],"yenPer100":450},
                       {"type":"馬単","numbers":[2,1],"yenPer100":880}]}]}
    def test_valid_result(self):
        self.assertEqual(len(validate_results(self.data,self.permission)["races"]),1)
    def test_no_permission(self):
        self.permission["redistributionAuthorized"]=False
        with self.assertRaises(ValueError):validate_results(self.data,self.permission)
    def test_not_final(self):
        self.data["races"][0]["status"]="provisional"
        with self.assertRaises(ValueError):validate_results(self.data,self.permission)
    def test_duplicate_payout(self):
        self.data["races"][0]["payouts"].append({"type":"馬連","numbers":[1,2],"yenPer100":450})
        with self.assertRaises(ValueError):validate_results(self.data,self.permission)
    def test_jra_permission_required(self):
        self.permission["sourceName"]="JRA"
        with self.assertRaises(ValueError):validate_results(self.data,self.permission)

if __name__=="__main__":unittest.main()
