'use strict';
// Run with: node --test tests/test-kyoto11-pending-result.cjs
// Checks the exact current main-app importer without changing real user data.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('async function registerVerifiedResults(payload,automatic=false)');
const end=html.indexOf(' window.BakenImportVerifiedResults=payload=>',start);
assert.ok(start>=0&&end>start,'Cannot find real verified-result importer');
const importerBody=html.slice(start,end);
const allTypes=['単勝','複勝','馬連','馬単','ワイド','三連複','三連単'];
function payload(){
 // Real finishing identity of Kyoto 11R on 2026-11-07; test-only payout amounts.
 const combos=[['単勝',[3]],['複勝',[3]],['複勝',[13]],['複勝',[10]],
  ['馬連',[3,13]],['馬単',[3,13]],['ワイド',[3,13]],['ワイド',[3,10]],
  ['ワイド',[10,13]],['三連複',[3,10,13]],['三連単',[3,13,10]]];
 return {schemaVersion:1,races:[{date:'2026-11-07',venue:'京都',raceNumber:11,
  status:'final',confirmedAt:'2026-11-07T16:05:00+09:00',
  completeTypes:allTypes,finishOrder:[3,13,10],
  payouts:combos.map(([type,numbers])=>({type,numbers,yenPer100:100})),refunds:[]}]};
}
function createImporter(state){
 let saves=0;
 const factory=new Function('s','save','draw','machineRender','officialMessage',
  'registerSpecialManualResult','confirm',importerBody+';return registerVerifiedResults;');
 return {run:factory(state,()=>{saves++},()=>{},()=>{},
   {textContent:''},()=>{},()=>true),saves:()=>saves};
}
test('Kyoto 11R losing wide BOX becomes settlement-ready with 0 yen, not stuck result-pending',async()=>{
 const b={status:'pending',officialReady:false,realRaceId:'2026-11-07-KYOTO-11',
  raceDate:'2026-11-07',raceVenue:'京都',raceNumber:11,type:'ワイド',
  picks:[[3,4],[3,9],[3,11],[4,9],[4,11],[9,11]],unitStake:500,stake:3000};
 const state={bets:[b]};const x=createImporter(state);
 assert.equal(await x.run(payload(),true),1);
 assert.equal(b.officialReady,true);
 assert.equal(b.officialPendingPaid,0);
 assert.deepEqual(b.officialPendingWins,[]);
 assert.equal(b.status,'pending','actual settlement remains manual');
 assert.equal(x.saves(),1);
});
test('Unrelated or invalid same-race records never settle another race',async()=>{
 const b={status:'pending',officialReady:false,realRaceId:'2026-11-07-TOKYO-11',
  raceDate:'2026-11-07',raceVenue:'東京',raceNumber:11,type:'ワイド',
  picks:[[3,13]],unitStake:100,stake:100};
 const x=createImporter({bets:[b]});
 assert.equal(await x.run(payload(),true),0);
 assert.equal(b.officialReady,false);
 assert.equal(x.saves(),0);
});
