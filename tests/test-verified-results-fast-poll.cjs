'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const script=fs.readFileSync(path.join(__dirname,'../app-next-results.js'),'utf8');
const INITIAL=Date.parse('2026-11-07T15:45:00+09:00');
function fixture(bets=[]){
 let now=INITIAL,visible=true,loaded=bets,requests=0,imports=0,interval;
 const handlers={};
 const state={textContent:''};
 const sandbox={
  location:{hostname:'baken-king-app-next.vercel.app'},
  localStorage:{getItem(k){return k==='keiba-demo-v1'?JSON.stringify({bets:loaded}):null}},
  document:{get visibilityState(){return visible?'visible':'hidden'},createElement(){return state},getElementById(){return {append(){}}},addEventListener(k,fn){handlers[k]=fn}},
  window:{BakenImportVerifiedResults:async()=>{imports++;return 0},addEventListener(k,fn){handlers[k]=fn},dispatchEvent(){}},
  fetch:async()=>{requests++;return {status:200,ok:true,json:async()=>({schemaVersion:1,races:[]})}},
  Date:class extends Date{static now(){return now}},
  setInterval(fn,ms){interval={fn,ms}},
  queueMicrotask:fn=>Promise.resolve().then(fn),
  CustomEvent:class {}
 };
 vm.runInNewContext(script,sandbox,{timeout:2000});
 return {handlers,state,get requests(){return requests},get imports(){return imports},get interval(){return interval},
  advance(ms){now+=ms},setBets(v){loaded=v},setVisible(v){visible=v}};
}
async function settle(){for(let i=0;i<20;i++)await Promise.resolve()}
const pending={status:'pending',officialReady:false,specialManualResult:false,realRaceId:'2026-11-07-Tokyo11'};
test('pending official result: poll at one-minute cadence',async()=>{
 const x=fixture([pending]);await settle();
 assert.equal(x.requests,1);assert.equal(x.interval.ms,60000);
 x.advance(60000);x.interval.fn();await settle();assert.equal(x.requests,2);
 x.advance(60000);x.interval.fn();await settle();assert.equal(x.requests,3);
});
test('no pending ticket: never poll, including on app start',async()=>{
 const x=fixture([]);await settle();
 assert.equal(x.requests,0);
 for(let i=0;i<10;i++){x.advance(60000);x.interval.fn();await settle()}
 assert.equal(x.requests,0);
 x.handlers.focus();await settle();
 assert.equal(x.requests,0);
});
test('after officialReady: stop all result polling without settling wallet',async()=>{
 const x=fixture([pending]);await settle();
 x.setBets([{...pending,officialReady:true}]);
 for(let i=0;i<4;i++){x.advance(60000);x.interval.fn();await settle()}
 assert.equal(x.requests,1);
 x.advance(60000);x.interval.fn();await settle();assert.equal(x.requests,1);
});
test('hidden PWA makes no requests; visibility resumes immediately',async()=>{
 const x=fixture([pending]);await settle();x.setVisible(false);
 x.advance(60000);x.interval.fn();await settle();assert.equal(x.requests,1);
 x.setVisible(true);x.handlers.visibilitychange();await settle();assert.equal(x.requests,2);
});
test('focus requests results without waiting for next interval',async()=>{
 const x=fixture([pending]);await settle();x.handlers.focus();await settle();
 assert.equal(x.requests,2);
});

test('buying the first pending ticket checks results immediately',async()=>{
 const x=fixture([]);await settle();assert.equal(x.requests,0);
 x.setBets([pending]);x.handlers['baken:wagers-updated']();await settle();
 assert.equal(x.requests,1);
});
