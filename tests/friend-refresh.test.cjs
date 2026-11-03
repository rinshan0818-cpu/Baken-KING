'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('friend-cloud-sync.js','utf8');
function fixture({testing=false,host='rinshan0818-cpu.github.io',consent=true}={}){
 const storage=new Map([['baken-king-mode-v1',testing?'test':'production']]);
 let listener=null,clicked=null,fetches=0,confirms=0;
 const button={disabled:false,textContent:'',addEventListener(type,callback){
  assert.equal(type,'click');listener=callback;
 }};
 const status={textContent:''};
 const sandbox={
  location:{hostname:host},document:{
   getElementById:id=>id==='bkFriendSyncNow'?button:id==='bkFriendSyncStatus'?status:null,
   createElement(tag){assert.equal(tag,'a');return {href:'',click(){clicked=this.href}}}
  },
  localStorage:{getItem:key=>storage.get(key)??null,setItem(){throw Error('Must not modify wallet')}},
  confirm(){confirms++;return consent},
  fetch(){fetches++;throw Error('GitHub Pages must not send cloud write requests')},
  bkFriendCloudSnapshot(){return{
   stakeYen:1000,returnedYen:1500,settledTicketCount:2,
   purchasedRaceCount:2,hitRaceCount:1,settledRaceCount:2,maxPayoutYen:1500
  }},
  encodeURIComponent
 };
 vm.runInNewContext(source,sandbox);
 return {button,status,getListener:()=>listener,getClicked:()=>clicked,getFetches:()=>fetches,getConfirms:()=>confirms};
}
{
 const t=fixture();assert.equal(t.button.disabled,false);
 const listener=t.getListener();assert.equal(typeof listener,'function');listener();
 const clicked=t.getClicked();assert(clicked);
 assert(clicked.startsWith('https://baken-king-account-bridge.vercel.app/#score='));
 const data=JSON.parse(decodeURIComponent(clicked.split('#score=')[1]));
 assert.equal(data.v,1);assert.equal(data.metrics.stakeYen,1000);
 assert.equal(Object.keys(data.metrics).length,7);
 assert.equal(t.getFetches(),0);assert.equal(t.getConfirms(),1);
 assert(t.status.textContent.includes('認証済み画面'));
}
{
 const t=fixture({testing:true});assert.equal(t.button.disabled,true);
 t.getListener()();assert.equal(t.getClicked(),null);assert.equal(t.getFetches(),0);
}
{
 const t=fixture({consent:false});t.getListener()();
 assert.equal(t.getClicked(),null);assert.equal(t.getFetches(),0);
}
{
 const t=fixture({host:'baken-king-app-next.vercel.app'});
 assert.equal(t.getListener(),null);
}
console.log('PASS: friend cloud consent, aggregate-only handoff, and no unauthenticated browser writes');
