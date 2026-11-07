'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=source.indexOf('function bkMeta(b,key){');
const end=source.indexOf('function bkDistanceBand(',start);
const fn=source.slice(start,end);
function raceKind(b,card){
 const context={bkRaceCardForBet:()=>card,bkKnownRaceGrade:()=>null,bkNormalizeGrade:()=>null};
 vm.runInNewContext(fn+'; globalThis.getKind=b=>bkMeta(b,"raceKind");',context);
 return context.getKind(b);
}
test('Kyoto November 7 jump stakes stays jump even with stale flat saved data',()=>{
 assert.equal(raceKind({raceDate:'2026-11-07',raceVenue:'京都',raceNumber:8,raceMeta:{raceKind:'平地'}},{raceConditions:{surface:'芝'}}),'障害');
});
test('official surface jumps override old flat cached kind',()=>{
 assert.equal(raceKind({raceMeta:{raceKind:'平地'}},{raceConditions:{surface:'障害'}}),'障害');
});
test('jump grade and named jump events identify jump races',()=>{
 assert.equal(raceKind({raceMeta:{raceKind:'平地',grade:'J・GⅢ'}},null),'障害');
 assert.equal(raceKind({raceName:'架空ジャンプステークス'},null),'障害');
});
test('ordinary flat conditions remain flat and unknown races are not invented',()=>{
 assert.equal(raceKind({raceMeta:{raceKind:'平地'}},{raceConditions:{surface:'芝'}}),'平地');
 assert.equal(raceKind({raceMeta:{raceKind:'平地'}},{raceConditions:{surface:'ダート'}}),'平地');
 assert.equal(raceKind({},null),null);
});
test('detailed analysis uses recalculated race kind without mutating saved bets',()=>{
 assert.match(source,/function bkDetailValue\(b,key\)/);
 assert.match(source,/return bkMeta\(b,key\)/);
 assert.match(source,/raceKind:\{label:'平地・障害',values:\['平地','障害'\]\}/);
});
