const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('friend-cloud-sync.js','utf8');
const ID='11111111-1111-4111-8111-111111111111';
const METRICS={stakeYen:1000,returnedYen:1500,settledTicketCount:2,purchasedRaceCount:2,hitRaceCount:1,settledRaceCount:2,maxPayoutYen:1500};
function setup({connected=false,approved=true,mode='production'}={}){
 const storage=new Map([['baken-king-mode-v1',mode]]);
 const button={disabled:true,textContent:'',onclick:null};
 const status={textContent:''};const calls=[];
 let confirms=0,timer=null;
 const sandbox={
  localStorage:{getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,v),keys:()=>[...storage.keys()]},
  document:{getElementById:k=>({bkFriendSyncNow:button,bkFriendSyncStatus:status})[k]||null,visibilityState:'visible'},
  confirm:()=>{confirms++;return approved},
  setInterval:fn=>{timer=fn},
  bkFriendCloudSnapshot:()=>METRICS,
  Date,
  fetch:async(url,opts)=>{
   calls.push({url,opts});
   if(url.endsWith('/get-session'))return {ok:true,status:200,json:async()=>({user:{id:ID,emailVerified:true}})};
   if(url.endsWith('/token'))return {ok:true,status:200,json:async()=>({token:'header.body.signature'})};
   if(url.endsWith('/api/sharing/me'))return {ok:connected,status:connected?200:503,json:async()=>({ok:connected})};
   if(url.endsWith('/api/sharing/profile')||url.endsWith('/api/sharing/summary'))return {ok:true,status:200,json:async()=>({ok:true})};
   throw Error('Unexpected network call '+url);
  }
 };
 vm.runInNewContext(source,sandbox,{filename:'friend-cloud-sync.js'});
 return {storage,button,status,calls,confirms:()=>confirms,timer:()=>timer};
}
(async()=>{
 const initial=setup();
 assert.equal(initial.calls.length,0,'Boot must not contact auth or API without consent');
 assert.equal(initial.button.disabled,false);
 await initial.timer();
 assert.equal(initial.calls.length,0,'Timer must not request auth before consent');
 await initial.button.onclick();
 assert(!initial.calls.some(c=>c.url.endsWith('/api/sharing/summary')),'API 503 must never upload data');
 assert.equal(initial.confirms(),0,'Do not prompt to publish before API is ready');
 assert(!initial.storage.has('baken-friend-cloud-consent:'+ID));
 const connected=setup({connected:true});
 await connected.button.onclick();
 assert.equal(connected.confirms(),1);
 assert.equal(connected.storage.get('baken-friend-cloud-consent:'+ID),'1');
 const upload=connected.calls.find(c=>c.url.endsWith('/api/sharing/summary'));
 assert(upload,'Summary endpoint must receive opted-in summary');
 const sent=JSON.parse(upload.opts.body);
 assert.deepEqual(Object.keys(sent.metrics).sort(),Object.keys(METRICS).sort());
 assert(!upload.opts.body.includes('bets'),'No ticket history allowed');
 assert(!upload.opts.body.includes('balance'),'No wallet allowed');
 assert.equal(upload.opts.credentials,'omit');
 const before=connected.calls.length;
 await connected.timer();
 assert.equal(connected.calls.length,before,'30 minute window must throttle subsequent uploads');
 const declined=setup({connected:true,approved:false});
 await declined.button.onclick();
 assert(!declined.calls.some(c=>c.url.endsWith('/api/sharing/summary')));
 assert(!declined.storage.has('baken-friend-cloud-consent:'+ID));
 const testing=setup({mode:'test'});
 assert.equal(testing.button.onclick,null,'Test mode must never wire synchronization');
 assert.equal(testing.calls.length,0);
 console.log('PASS: consent-gated nine-metric sync, API failure, throttle, no raw bets, test mode isolation');
})().catch(e=>{console.error(e);process.exitCode=1});
