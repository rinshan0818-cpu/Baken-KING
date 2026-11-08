// Offline test of the real result-import function; no live bets or credentials.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf(' async function registerVerifiedResults(');
const end=html.indexOf(' window.BakenImport',start);
assert(start>0&&end>start);
async function scenario(change={},shouldReject=false){
 const b={id:'a',status:'pending',officialReady:false,realRaceId:'test',raceDate:'2026-11-08',raceVenue:'東京',raceNumber:5,type:'馬連',unitStake:200,stake:600,picks:[[1,2],[1,3],[2,3]]};
 const s={bets:[b]};let saves=0;
 const ctx={s,console,confirm:()=>true,save:()=>saves++,draw:()=>{},machineRender:()=>{},officialMessage:{textContent:''}};
 vm.createContext(ctx);
 vm.runInContext(html.slice(start,end)+';this.run=registerVerifiedResults;',ctx);
 const race={date:b.raceDate,venue:b.raceVenue,raceNumber:b.raceNumber,status:'void',
  voidVerified:true,voidReason:'競走不成立',confirmedAt:'2026-11-08T15:00:00+09:00',
  completeTypes:[],payouts:[],refunds:[],...change};
 try{
  const n=await ctx.run({schemaVersion:1,races:[race]},true);
  if(shouldReject)throw Error('Expected refusal');
  assert.equal(n,1);assert.equal(saves,1);assert.equal(b.status,'pending');
  assert.equal(b.officialReady,true);assert.equal(b.officialPendingPaid,600);
  assert.equal(b.officialPendingWins.length,0);assert.equal(b.officialPendingRefunds.length,3);
 }catch(e){
  if(!shouldReject)throw e;
  assert.equal(saves,0);assert.equal(b.officialReady,false);
 }
}
(async()=>{
 await scenario();
 await scenario({voidReason:'競走取止'});
 await scenario({voidVerified:false},true);
 await scenario({status:'final'},true);
 await scenario({payouts:[{type:'単勝',numbers:[1],yenPer100:100}]},true);
 await scenario({confirmedAt:'not verified'},true);
 console.log('PASS: full-stake refund on verified void, manual pending, unverified/ambiguous refusal');
})().catch(e=>{console.error(e);process.exitCode=1});
