const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('friend-cloud-sync.js','utf8');
const OWN='11111111-1111-4111-8111-111111111111',FRIEND='22222222-2222-4222-8222-222222222222';
function fixture({friendOk=true}={}){
 const values=new Map([['baken-king-mode-v1','production'],['baken-king-friend-score-owner-v1',OWN],
 ['baken-king-friend-score-friend-id-v1',FRIEND],['baken-king-friend-score-v1','previous']]);
 const button={onclick:null,disabled:true,insertAdjacentElement(){}},status={textContent:''};let renders=0;const calls=[];
 const summary={profitYen:500,roiPercent:150,stakeYen:1000,returnedYen:1500,settledTicketCount:2,
  purchasedRaceCount:2,hitRaceCount:1,raceHitRatePercent:50,maxPayoutYen:1500};
 const sandbox={
  localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k),key:i=>[...values.keys()][i],get length(){return values.size}},
  document:{getElementById:k=>k==='bkFriendSyncNow'?button:k==='bkFriendSyncStatus'?status:null,createElement:()=>({style:{}}),visibilityState:'visible'},
  confirm:()=>true,setInterval(){},Date,
  bkFriendCloudSnapshot:()=>({stakeYen:1000,returnedYen:1500,settledTicketCount:2,purchasedRaceCount:2,hitRaceCount:1,settledRaceCount:2,maxPayoutYen:1500}),
  bkScoreValid:m=>m.profit===m.paid-m.stake&&Object.keys(m).length===9,
  bkRenderFriendCompare:()=>{renders++},
  fetch:async (url,options)=>{
   calls.push({url,options});
   if(url.endsWith('/get-session'))return {ok:true,status:200,json:async()=>({user:{id:OWN,emailVerified:true}})};
   if(url.endsWith('/token'))return {ok:true,status:200,json:async()=>({token:'head.body.signature'})};
   if(url.endsWith('/summary/'+FRIEND))return {ok:friendOk,status:friendOk?200:403,json:async()=>friendOk?{ok:true,summary}:{ok:false}};
   return {ok:true,status:200,json:async()=>({ok:true})};
  }
 };
 vm.runInNewContext(source,sandbox);
 return {button,values,calls,getRenders:()=>renders,status};
}
(async()=>{
 const f=fixture();await f.button.onclick();
 const cache=JSON.parse(f.values.get('baken-king-friend-score-v1'));
 assert.equal(cache.metrics.profit,500);
 assert.deepEqual(Object.keys(cache.metrics).sort(),['profit','roi','stake','paid','races','hitRaces','raceRate','maxPayout','settled'].sort());
 assert.equal(f.getRenders(),1);
 assert(f.calls.some(c=>c.url.endsWith('/summary/'+FRIEND)));
 assert(!JSON.stringify(cache).includes('token'));
 const fail=fixture({friendOk:false});await fail.button.onclick();
 assert.equal(fail.values.get('baken-king-friend-score-v1'),'previous','Failed friend fetch cannot erase last good comparison');
 assert.equal(fail.getRenders(),0);
 assert.equal(fail.values.get('baken-friend-cloud-ever-opted-in'),'1','Own summary must succeed even when friend read fails');
 console.log('PASS: friend nine metrics refresh, rejects failed reads without wiping cache');
})().catch(e=>{console.error(e);process.exitCode=1});
