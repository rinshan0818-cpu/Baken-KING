// Offline tests only: all races, outcomes and payouts are fabricated.
const assert=require("node:assert/strict");
const vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const ctx={};vm.createContext(ctx);
for(const file of ["race-data.js","jra-adapter.js","race-settlement.js"]){
 vm.runInContext(fs.readFileSync(path.join(__dirname,"..",file),"utf8"),ctx,{filename:file});
}
const base={
 date:"2026-10-31",venue:"東京",raceNumber:11,scheduledStartAt:"2026-10-31T15:30:00+09:00",
 source:{kind:"fixture",label:"架空オフラインテスト"},
 horses:[{number:1},{number:2},{number:3},{number:4}],raceName:null
};
const s=ctx.BakenSettlement;
const finish={status:"official-final",finish:[1,2,3],payoutsComplete:true,refundsComplete:true,
 refundHorseNumbers:[],payouts:[
 {type:"馬連",numbers:[1,2],yenPer100:560},
 {type:"馬単",numbers:[1,2],yenPer100:850},
 {type:"三連単",numbers:[1,2,3],yenPer100:2200},
 {type:"ワイド",numbers:[1,2],yenPer100:240},
 {type:"ワイド",numbers:[1,3],yenPer100:310}
 ]};
const race=ctx.BakenRaceData.parseRace({...base,result:finish});
assert.equal(race.horses[0].name,"馬番1");
assert.equal(race.horses[0].nameKnown,false);
assert.equal(race.raceName,null);
assert.equal(s.settle(race,{type:"馬連",numbers:[2,1],stake:200}).returnYen,1120);
assert.equal(s.settle(race,{type:"馬単",numbers:[2,1],stake:100}).kind,"lost");
assert.equal(s.settle(race,{type:"三連単",numbers:[1,2,3],stake:300}).returnYen,6600);
assert.equal(s.settle(race,{type:"ワイド",numbers:[1,3],stake:100}).returnYen,310);
assert.equal(s.settle(race,{type:"複勝",numbers:[4],stake:100}).kind,"lost");
const provisional=ctx.BakenRaceData.parseRace({...base,result:{...finish,status:"provisional"}});
assert.equal(s.settle(provisional,{type:"馬連",numbers:[1,2],stake:100}).kind,"pending");
const incomplete=ctx.BakenRaceData.parseRace({...base,result:{...finish,refundsComplete:false}});
assert.equal(s.settle(incomplete,{type:"馬連",numbers:[1,2],stake:100}).kind,"pending");
const scratched=ctx.BakenRaceData.parseRace({...base,horses:[{number:1},{number:2,status:"scratched"},{number:3},{number:4}],result:{...finish,refundHorseNumbers:[2]}});
assert.equal(s.settle(scratched,{type:"馬連",numbers:[1,2],stake:700}).returnYen,700);
assert.throws(()=>s.settle(ctx.BakenRaceData.parseRace({...base,horses:[{number:1},{number:2,status:"excluded"},{number:3},{number:4}],result:finish}),{type:"馬連",numbers:[1,2],stake:100}),/返還情報/);
const dnf=ctx.BakenRaceData.parseRace({...base,result:{...finish,finish:[1,2]}});
assert.equal(s.settle(dnf,{type:"単勝",numbers:[3],stake:100}).kind,"lost","競走中止は返還しない");
const cancelled=ctx.BakenRaceData.parseRace({...base,result:{...finish,finish:[],raceCancelled:true}});
assert.equal(s.settle(cancelled,{type:"単勝",numbers:[4],stake:200}).kind,"refund");
const tied=ctx.BakenRaceData.parseRace({...base,result:{...finish,payouts:[{type:"単勝",numbers:[1],yenPer100:170},{type:"単勝",numbers:[2],yenPer100:190}]}});
assert.equal(s.settle(tied,{type:"単勝",numbers:[2],stake:100}).returnYen,190);
assert.throws(()=>s.settle(race,{type:"馬連",numbers:[1,1],stake:100}),/馬番/);
const noName=ctx.BakenJraAdapter.convert({race_id:"FAKE-1",start_time:"15:30",runners:[{horse_no:"1"},{horse_no:"2"}]}, {date:"2026-10-31",course:"tokyo",raceNumber:11});
assert.equal(noName.horses[0].nameKnown,false);
assert.equal(noName.horses[0].frame,null);
console.log("PASS: name-free mark-card inputs, 7-type settlement rules, refunds, ties, incomplete protection");
