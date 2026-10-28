// End-to-end data joins with fictional JRA-srb-shaped JSON only.
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const ctx={};vm.createContext(ctx);
for(const file of ["race-data.js","jra-adapter.js","race-bundle.js"]){
 vm.runInContext(fs.readFileSync(path.join(__dirname,"..",file),"utf8"),ctx,{filename:file});
}
const card={race_id:"FAKE-2025-001",start_time:"15:45",runners:[
 {horse_no:"1",frame_no:"1",horse_name:"架空A"},
 {horse_no:"2",frame_no:"2",horse_name:"架空B"},
 {horse_no:"3",frame_no:"3",horse_name:"架空C"}
]};
const options={date:"2025-10-25",course:"tokyo",raceNumber:11};
const odds=[{
 race_id:card.race_id,fetched_at:"2025-10-25T14:30:00+09:00",
 bet_type:"quinella",entries:[{combination:["2","1"],odds:"5.6"}]
},{
 race_id:card.race_id,fetched_at:"2025-10-25T15:10:00+09:00",
 bet_type:"quinella",entries:[{combination:["1","2"],odds:"4.8"}]
}];
const result={race_id:card.race_id,results:[
 {rank:"1",horse_no:"1"},{rank:"2",horse_no:"2"},{rank:"3",horse_no:"3"}
],payouts:[{bet_type:"quinella",combination:"1-2",payout:"480円"}]};
const bundle=ctx.BakenRaceBundle.combine({card,odds,result,options});
assert.equal(bundle.race.upstreamRaceId,card.race_id);
assert.equal(bundle.oddsSnapshots.length,2);
assert.equal(bundle.oddsSnapshots[0].entries[0].odds,5.6);
assert.equal(bundle.finished.result.payouts[0].yenPer100,480);
assert.equal(bundle.mode.production.allowed,false);
assert.equal(bundle.mode.development.allowed,true);
assert.throws(()=>ctx.BakenRaceBundle.combine({card,odds:[{...odds[0],race_id:"WRONG"}],result,options}),/レースID/);
assert.throws(()=>ctx.BakenRaceBundle.combine({card,odds:[{...odds[0],fetched_at:"2025-10-25T15:46:00+09:00"}],result,options}),/発走後/);
assert.throws(()=>ctx.BakenRaceBundle.combine({card,odds,result:{...result,race_id:"WRONG"},options}),/レースID/);
console.log("PASS: offline fictional end-to-end historical card/odds/results with guarded joins");
