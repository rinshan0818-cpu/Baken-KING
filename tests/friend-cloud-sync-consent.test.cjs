'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('friend-cloud-sync.js','utf8');
const METRICS={stakeYen:1000,returnedYen:1500,settledTicketCount:2,
 purchasedRaceCount:2,hitRaceCount:1,settledRaceCount:2,maxPayoutYen:1500};
function setup({approved=true,mode='production',metrics=METRICS,host='rinshan0818-cpu.github.io'}={}){
 const storage=new Map([['baken-king-mode-v1',mode]]),events={requests:0,timers:0,confirmations:0,opened:[]};
 const button={disabled:true,listener:null,addEventListener(type,fn){
  assert.equal(type,'click');this.listener=fn;
 }},status={textContent:''};
 const sandbox={
  location:{hostname:host},
  document:{getElementById:id=>id==='bkFriendSyncNow'?button:id==='bkFriendSyncStatus'?status:null,
   createElement:type=>{assert.equal(type,'a');return{
    href:'',target:'',rel:'',click(){events.opened.push({href:this.href,target:this.target,rel:this.rel})}
   }}},
  localStorage:{getItem:key=>storage.get(key)??null,setItem(){throw Error('No cloud consent may be silently persisted')}},
  confirm(){events.confirmations++;return approved},
  fetch(){events.requests++;throw Error('GH Pages cannot directly upload account data')},
  setInterval(){events.timers++},
  bkFriendCloudSnapshot:()=>metrics,encodeURIComponent
 };
 vm.runInNewContext(source,sandbox);
 return {button,status,events,storage};
}
{
 const t=setup();assert.equal(t.events.requests,0);assert.equal(t.events.timers,0);
 assert.equal(t.button.disabled,false);assert.equal(typeof t.button.listener,'function');
 t.button.listener();assert.equal(t.events.confirmations,1);
 assert.equal(t.events.opened.length,1);assert.equal(t.events.opened[0].target,'_blank');
 assert.equal(t.events.opened[0].rel,'noopener noreferrer');
 const url=t.events.opened[0].href;
 assert(url.startsWith('https://baken-king-account-bridge.vercel.app/#score='));
 const data=JSON.parse(decodeURIComponent(url.split('#score=')[1]));
 assert.equal(data.v,1);assert.deepEqual(Object.keys(data.metrics).sort(),Object.keys(METRICS).sort());
 assert.equal(t.events.requests,0);assert.equal(t.storage.size,1);
}
{
 const t=setup({approved:false});t.button.listener();
 assert.equal(t.events.opened.length,0);assert.equal(t.events.requests,0);
}
{
 const t=setup({mode:'test'});assert.equal(t.button.disabled,true);
 t.button.listener();assert.equal(t.events.opened.length,0);
}
{
 const t=setup({metrics:{...METRICS,bets:[1]}});t.button.listener();
 assert.equal(t.events.opened.length,0,'Wager details must never be passed to account bridge');
}
{
 const t=setup({host:'baken-king-app-next.vercel.app'});
 assert.equal(t.button.listener,null,'Vercel version owns its own authenticated sync');
}
console.log('PASS: consent-only aggregate handoff, no automatic cloud upload, and test-mode isolation');
