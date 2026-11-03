'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../app-next-monitor.js'),'utf8');
const fixedNow=Date.parse('2026-11-07T12:00:00+09:00');
function createFixture(){
 let now=fixedNow;const calls=[];const handlers=new Map(),intervals=[];
 const node=()=>({textContent:'',className:'',id:'',append(){},set async(x){}});
 const ctx={
  location:{hostname:'baken-king-app-next.vercel.app'},
  localStorage:{getItem:k=>k==='baken-king-mode-v1'?null:k==='keiba-demo-v1'?JSON.stringify({bets:[]}):JSON.stringify({races:[]})},
  document:{visibilityState:'visible',head:{append(){}},createElement:node,getElementById:()=>({append(){}}),addEventListener(k,fn){handlers.set(k,fn)}},
  window:{BakenMonitoringTargets:{extractTargets:()=>[]},addEventListener(k,fn){handlers.set(k,fn)}},
  fetch:async(url,opt)=>{calls.push({url,opt});return url==='/api/auth/get-session'?
   {ok:true,json:async()=>({user:{id:'00000000-0000-4000-8000-000000000001',emailVerified:true}})}:
   {ok:true,status:200,json:async()=>({ok:true,registered:0})}},
  setInterval(fn,ms){intervals.push({fn,ms})},
  queueMicrotask,Date:class extends Date{static now(){return now;}},
  console
 };
 vm.runInNewContext(source,ctx,{timeout:2000});
 return {calls,intervals,handlers,setNow:v=>now=v};
}
async function flush(){for(let i=0;i<15;i++)await Promise.resolve()}
test('unchanged subscription is refreshed after 30 minutes but not every 5 minutes',async()=>{
 const f=createFixture();await flush();
 const writes=()=>f.calls.filter(x=>x.url==='/api/auth/friends/monitor-targets').length;
 assert.equal(writes(),1);
 assert.equal(f.intervals.length,1);
 f.setNow(fixedNow+5*60*1000);f.intervals[0].fn();await flush();
 assert.equal(writes(),1);
 f.setNow(fixedNow+31*60*1000);f.intervals[0].fn();await flush();
 assert.equal(writes(),2);
});
