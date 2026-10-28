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
const tiedFinish=ctx.BakenJraAdapter.convertResult({...fixtureResult,results:[{rank:"1",horse_no:"1"},{rank:"1",horse_no:"2"}]},fullRace);
assert.equal(tiedFinish.placements[0].rank,1);
assert.equal(tiedFinish.placements[1].rank,1);
const abnormal=ctx.BakenJraAdapter.convertResult({...fixtureResult,results:[
 {rank:"1",horse_no:"1"},{rank:"2",horse_no:"2"},{rank:"競走中止",horse_no:"3"},{rank:"失格",horse_no:"4"}
]},fullRace);
assert.equal(abnormal.nonFinishers[0].status,"dnf");
assert.equal(abnormal.nonFinishers[1].status,"disqualified");
assert.equal(ctx.BakenJraAdapter.convertResult({...fixtureResult,payouts:[{bet_type:"frame",combination:"1-2",payout:"100円"}]},fullRace).payouts.length,0);
assert.throws(()=>ctx.BakenJraAdapter.convertResult({...fixtureResult,results:[{rank:"1",horse_no:"1"},{rank:"2",horse_no:"1"}]},fullRace),/重複/);
assert.throws(()=>ctx.BakenJraAdapter.convertResult({...fixtureResult,results:[{rank:"不明",horse_no:"1"}]},fullRace),/不明な結果区分/);
assert.throws(()=>ctx.BakenJraAdapter.convertResult({...fixtureResult,payouts:[{bet_type:"win",combination:"1",payout:"不明"}]},fullRace),/払戻金/);

const fakeOdds={bet_type:"quinella",fetched_at:"2025-10-25T14:50:00+09:00",entries:[{combination:["2","1"],odds:"12.4"}]};
const mappedOdds=ctx.BakenJraAdapter.convertOdds(fakeOdds,fullRace);
assert.equal(mappedOdds.entries[0].type,"馬連");
assert.equal(mappedOdds.entries[0].numbers.join("-"),"1-2");
assert.equal(mappedOdds.isBeforeStart,true);
assert.equal(mappedOdds.verified,false);
assert.throws(()=>ctx.BakenJraAdapter.convertOdds({...fakeOdds,fetched_at:null},fullRace),/取得時刻/);
const ranged={...fakeOdds,entries:[{combination:["1","2"],odds_min:"2.0",odds_max:"3.0"}]};
assert.throws(()=>ctx.BakenJraAdapter.convertOdds(ranged,fullRace),/利用可能/);
const stale=ctx.BakenJraAdapter.convertOdds({...fakeOdds,fetched_at:"2025-10-25T15:46:00+09:00"},fullRace);
assert.equal(stale.isBeforeStart,false);

const tagged=ctx.BakenJraAdapter.convert({...fakeFull,race_id:"JRA-TEST-001"},opts);
assert.equal(tagged.upstreamRaceId,"JRA-TEST-001");
assert.throws(()=>ctx.BakenJraAdapter.convertOdds({...fakeOdds,race_id:"WRONG"},tagged),/レースID/);
assert.throws(()=>ctx.BakenJraAdapter.convertResult({...fixtureResult,race_id:"WRONG"},tagged),/レースID/);
console.log("PASS: odds snapshot normalization, timestamp and range validation");
console.log("PASS: seven synthetic wager payouts, safety rejections and result mapping");

const fakeMeeting={date:"2026-10-31",course:"tokyo",races:[
 {race_no:11,race_id:"SAMPLE-11",race_name:"架空特別",start_time:"15:30"},
 {race_no:1,race_id:"SAMPLE-01",race_name:null,start_time:"09:50"},
 {race_no:12,race_id:"SAMPLE-12",race_name:null,start_time:null}
]};
const schedule=ctx.BakenJraAdapter.convertMeeting(fakeMeeting);
assert.equal(schedule.venue,"東京");
assert.equal(schedule.races[0].raceNumber,1);
assert.equal(schedule.races[1].scheduledStartAt,"2026-10-31T15:30:00+09:00");
assert.equal(schedule.races[2].scheduledStartAt,null);
assert.equal(schedule.races[0].purchaseAllowed,false);
assert.equal(schedule.races[0].cardAvailable,false);
assert.throws(()=>ctx.BakenJraAdapter.convertMeeting({...fakeMeeting,races:[fakeMeeting.races[0],fakeMeeting.races[0]]}),/レース番号/);
assert.throws(()=>ctx.BakenJraAdapter.convertMeeting({...fakeMeeting,races:[{race_no:1,start_time:"25:70"}]}),/発走予定時刻/);
console.log("PASS: meetings can be indexed before card publication without horses or odds");
console.log("PASS: documented JSON card mapping, withdrawal, timestamps, validation and production lock");
