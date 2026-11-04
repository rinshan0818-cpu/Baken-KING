// Offline fixture verification. No live racing website accessed.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const root=path.join(__dirname,"..");
const context={};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,"race-data.js"),"utf8"),context,{filename:"race-data.js"});
const parser=context.BakenRaceData;
const original={
  "schemaVersion": 1,
  "date": "2025-10-25",
  "venue": "東京",
  "raceNumber": 11,
  "scheduledStartAt": "2025-10-25T15:45:00+09:00",
  "source": {
    "kind": "fixture",
    "label": "開発専用の架空データ・実在レースではありません"
  },
  "horses": [
    {
      "number": 1,
      "frame": 1,
      "name": "テストホープ"
    },
    {
      "number": 2,
      "frame": 2,
      "name": "サンプルウインド"
    },
    {
      "number": 3,
      "frame": 3,
      "name": "デモスター"
    },
    {
      "number": 4,
      "frame": 4,
      "name": "フィクションキング"
    }
  ],
  "result": {
    "status": "official-final",
    "finish": [
      3,
      1,
      4,
      2
    ],
    "payouts": [
      {
        "type": "単勝",
        "numbers": [
          3
        ],
        "yenPer100": 450
      }
    ]
  }
};
const race=parser.parseRace(original);
assert.equal(race.venue,"東京");
assert.equal(race.horses.length,4);
assert.equal(race.horses[0].frame,1);
assert.equal(race.result.finish[0],3);
assert.equal(parser.purchaseState(race,"production").allowed,false);
assert.equal(parser.purchaseState(race,"development").allowed,true);
const future=JSON.parse(JSON.stringify(original));
future.date="2099-11-01";
future.scheduledStartAt="2099-11-01T15:45:00+09:00";
future.result=null;
future.source={kind:"licensed",label:"simulation-only"};
const eligible=parser.parseRace(future);
assert.equal(parser.purchaseState(eligible,"production",0).allowed,false,"client-only production mode must fail closed");
const duplicate=JSON.parse(JSON.stringify(original));
duplicate.horses[1].number=duplicate.horses[0].number;
assert.throws(()=>parser.parseRace(duplicate),/馬番/);
console.log("PASS: fixture parsing, duplicate rejection, historical and production purchase gates (offline)");
