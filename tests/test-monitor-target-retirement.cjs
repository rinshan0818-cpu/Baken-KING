'use strict';
// Regression coverage for the actual PWA selector; no saved bets are touched.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../monitor-target-export.js'),'utf8');
const sandbox={
 localStorage:{getItem(){return null}},
 window:{},
 document:{querySelector(){return null}}
};
vm.runInNewContext(source,sandbox,{filename:'monitor-target-export.js',timeout:1000});
const extract=sandbox.window.BakenMonitoringTargets.extractTargets;
const card=(date,venue,n,time='15:30')=>({date,venue,raceNumber:n,scheduledStartAt:date+'T'+time+':00+09:00'});
const wager=(date,venue,n,more={})=>({
 status:'pending',officialReady:false,specialManualResult:false,
 realRaceId:date+'-'+venue+'-'+n,raceDate:date,raceVenue:venue,raceNumber:n,...more
});
test('published official result removes a race before manual settlement',()=>{
 const cards=[card('2026-11-07','東京',11)];
 assert.equal(extract([wager('2026-11-07','東京',11)],cards).length,1);
 assert.equal(extract([wager('2026-11-07','東京',11,{officialReady:true})],cards).length,0);
});
test('two tickets on a race count only one monitoring identity',()=>{
 const cards=[card('2026-11-07','東京',11)];
 assert.equal(extract([wager('2026-11-07','東京',11),wager('2026-11-07','東京',11)],cards).length,1);
});
test('Saturday result-ready races do not consume Sunday monitoring targets',()=>{
 const cards=[card('2026-11-07','東京',11),card('2026-11-08','京都',1)];
 const bets=[wager('2026-11-07','東京',11,{officialReady:true}),
  wager('2026-11-08','京都',1)];
 const targets=extract(bets,cards);
 assert.equal(targets.length,1);
 assert.equal(targets[0].date,'2026-11-08');
});
test('pending Saturday race still remains a monitoring target',()=>{
 const cards=[card('2026-11-07','東京',11),card('2026-11-08','京都',1)];
 assert.equal(extract([wager('2026-11-07','東京',11),
  wager('2026-11-08','京都',1)],cards).length,2);
});
test('settled and manually processed races are excluded',()=>{
 const cards=[card('2026-11-07','東京',11)];
 assert.equal(extract([wager('2026-11-07','東京',11,{status:'settled'})],cards).length,0);
 assert.equal(extract([wager('2026-11-07','東京',11,{specialManualResult:true})],cards).length,0);
});

test('adding a second race after purchase registers both, without duplicating the first',()=>{
 const cards=[card('2026-11-07','東京',11),card('2026-11-07','京都',9)];
 const first=[wager('2026-11-07','東京',11)];
 assert.equal(extract(first,cards).length,1);
 const next=[...first,wager('2026-11-07','京都',9)];
 const selected=extract(next,cards);
 assert.equal(selected.length,2);
 assert.equal(new Set(selected.map(x=>x.date+'|'+x.venue+'|'+x.raceNumber)).size,2);
});
test('result-ready one ticket retains race only if another pending ticket still needs it',()=>{
 const cards=[card('2026-11-07','東京',11)];
 const pending=wager('2026-11-07','東京',11);
 const complete=wager('2026-11-07','東京',11,{officialReady:true});
 assert.equal(extract([pending,complete],cards).length,1);
 assert.equal(extract([complete],cards).length,0);
});
test('after all races settle, registration becomes an empty list',()=>{
 const cards=[card('2026-11-07','東京',11),card('2026-11-08','京都',1)];
 const bets=[wager('2026-11-07','東京',11),wager('2026-11-08','京都',1)];
 assert.equal(extract(bets,cards).length,2);
 const settled=bets.map(b=>({...b,status:'settled'}));
 assert.equal(extract(settled,cards).length,0);
});
