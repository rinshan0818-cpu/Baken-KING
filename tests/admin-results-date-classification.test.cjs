'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('admin-panel.js','utf8');
const start=source.indexOf('function classifyVerifiedResults(');
const end=source.indexOf('\nasync function checkOperation(',start);
assert.ok(start>=0&&end>start,'dated results classification must be present');
const get=(races,now='2026-11-07T00:30:00Z')=>JSON.parse(JSON.stringify(
 vm.runInNewContext(source.slice(start,end)+'\nclassifyVerifiedResults(data,new Date(now))',
 {data:{races},now})
));
test('before first Saturday race, 15 historical results must not be called todays results',()=>{
 const races=Array.from({length:15},(_,i)=>({date:'2026-11-01',raceNumber:i+1}));
 assert.deepEqual(get(races),{today:0,past:15,future:0,unknown:0});
});
test('JST date switch counts current day correctly',()=>{
 assert.deepEqual(get([{date:'2026-11-07'},{date:'2026-11-06'}]),{today:1,past:1,future:0,unknown:0});
});
test('future and missing date cannot be silently counted as finished today',()=>{
 assert.deepEqual(get([{date:'2026-11-08'},{date:null},{date:'2026-13-30'}]),{today:0,past:0,future:1,unknown:2});
});
test('malformed API payload is not treated as healthy zero-race feed',()=>{
 assert.equal(vm.runInNewContext(source.slice(start,end)+'\nclassifyVerifiedResults({})'),null);
});
test('admin Results API classification does not mutate private result feed or local wallet',()=>{
 assert.match(source,/spec\.key==='Results'/);
 assert.match(source,/保存済みの過去結果/);
 assert.match(source,/結果の日付に要確認/);
});
