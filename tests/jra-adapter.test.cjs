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

const fakeFull={start_time:"15:45",runners:[1,2,3,4].map((n,i)=>({horse_no:String(n),frame_no:String(i+1),horse_name:"架空"+n,status:"active"}))};
const fullRace=ctx.BakenJraAdapter.convert(fakeFull,opts);
const fixtureResult={results:[1,2,3,4].map((n,i)=>({rank:String(i+1),horse_no:String(n),horse_name:"架空"+n})),payouts:[
 {bet_type:"win",combination:"1",payout:"450円"},
 {bet_type:"place",combination:"1",payout:"180円"},
 {bet_type:"quinella",combination:"1-2",payout:"1,250円"},
 {bet_type:"wide",combination:"1-3",payout:"650円"},
 {bet_type:"exacta",combination:"1-2",payout:"3,450円"},
 {bet_type:"trio",combination:"1-2-3",payout:"12,340円"},
 {bet_type:"trifecta",combination:"1-2-3",payout:"45,670円"}
]};
const converted=ctx.BakenJraAdapter.convertResult(fixtureResult,fullRace);
assert.equal(converted.payouts.length,7);assert.equal(converted.payouts[6].yenPer100,45670);
assert.equal(converted.status,"provisional");
assert.equal(ctx.BakenRaceData.parseRace({...JSON.parse(fs.readFileSync(path.join(root,"data/historical-fixture.json"),"utf8")),result:JSON.parse(JSON.stringify(converted))}).result.finish[0],1);
assert.throws(()=>ctx.BakenJraAdapter.convertResult({...fixtureResult,results:[{rank:"1",horse_no:"1"},{rank:"1",horse_no:"2"}]},fullRace),/同着/);
assert.throws(()=>ctx.BakenJraAdapter.convertResult({...fixtureResult,payouts:[{bet_type:"frame",combination:"1-2",payout:"100円"}]},fullRace),/未対応券種/);
assert.throws(()=>ctx.BakenJraAdapter.convertResult({...fixtureResult,payouts:[{bet_type:"win",combination:"1",payout:"不明"}]},fullRace),/払戻金/);
console.log("PASS: seven synthetic wager payouts, safety rejections and result mapping");
console.log("PASS: documented JSON card mapping, withdrawal, timestamps, validation and production lock");
