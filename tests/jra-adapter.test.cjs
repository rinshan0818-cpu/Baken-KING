// No requests to JRA or third-party services.
const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const root=path.join(__dirname,"..");
const ctx={};vm.createContext(ctx);
for(const f of ["race-data.js","jra-adapter.js"])vm.runInContext(fs.readFileSync(path.join(root,f),"utf8"),ctx);
const fake={start_time:"15:45",runners:[
 {frame_no:"1",horse_no:"1",horse_name:"架空ホースA",status:"active"},
 {frame_no:"2",horse_no:"2",horse_name:"架空ホースB",status:"withdrawn"}
]};
const opts={date:"2025-10-25",course:"tokyo",raceNumber:11};
const v=ctx.BakenJraAdapter.convert(fake,opts);
assert.equal(v.venue,"東京");assert.equal(v.horses[1].status,"scratched");
assert.equal(v.scheduledStartAt,"2025-10-25T15:45:00+09:00");
assert.equal(ctx.BakenRaceData.purchaseState(v,"production").allowed,false);
assert.throws(()=>ctx.BakenJraAdapter.convert({...fake,start_time:null},opts),/発走時刻/);
assert.throws(()=>ctx.BakenJraAdapter.convert({...fake,runners:[fake.runners[0],fake.runners[0]]},opts),/馬番/);
console.log("PASS: documented JSON card mapping, withdrawal, timestamps, validation and production lock");
