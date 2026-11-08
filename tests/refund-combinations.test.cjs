// Offline fixture using the actual result-registration function. No account, network or live wagers.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf(' async function registerVerifiedResults(');
const end=html.indexOf(' window.BakenImport',start);
assert(start>0&&end>start);
const code=html.slice(start,end);
function exercise(refundNumbers,verified,picks,expected,corrupt=false){
 const bet={id:'fixture',status:'pending',officialReady:false,realRaceId:'test-race',raceDate:'2026-11-08',raceVenue:'京都',raceNumber:3,type:'馬連',unitStake:200,picks:picks.map(x=>x.slice())};
 const s={bets:[bet]};let saved=0;
 const ctx={s,console,confirm:()=>true,save:()=>saved++,draw:()=>{},machineRender:()=>{},officialMessage:{textContent:''}};
 vm.createContext(ctx);vm.runInContext(code+';this.run=registerVerifiedResults;',ctx);
 const result={date:bet.raceDate,venue:bet.raceVenue,raceNumber:bet.raceNumber,status:'final',confirmedAt:'2026-11-08T15:00:00+09:00',
 completeTypes:['単勝','複勝','馬連','馬単','ワイド','三連複','三連単'],
 payouts:[{type:'馬連',numbers:[1,2],yenPer100:570}],
 refunds:[],refundHorseNumbers:refundNumbers,refundHorseNumbersVerified:verified};
 const promise=ctx.run({schemaVersion:1,races:[result]},true);
 return promise.then(n=>{
   if(corrupt)throw Error('expected rejection');
   assert.equal(n,1);assert.equal(saved,1);assert.equal(bet.officialPendingPaid,expected);
   assert.equal(bet.status,'pending');assert.equal(bet.officialReady,true);
   return {refunded:bet.officialPendingRefunds.length,wins:bet.officialPendingWins.length};
 },e=>{if(!corrupt)throw e;assert.match(String(e),/返還/);assert.equal(saved,0);assert.equal(bet.officialReady,false);return null});
}
(async()=>{
 const mixed=await exercise([5],true,[[1,2],[1,5],[3,5],[2,4]],1540);
 assert.equal(mixed.refunded,2);assert.equal(mixed.wins,1);
 const all=await exercise([5],true,[[1,5],[3,5]],400);
 assert.equal(all.refunded,2);assert.equal(all.wins,0);
 const none=await exercise([],false,[[1,2],[2,4]],1140);
 assert.equal(none.refunded,0);
 await exercise([5],false,[[1,5]],0,true);
 await exercise([5,5],true,[[1,5]],0,true);
 console.log('PASS: mixed refunds, all-refund, ordinary payouts, unverified/duplicate refund refusal');
})().catch(e=>{console.error(e);process.exitCode=1});
