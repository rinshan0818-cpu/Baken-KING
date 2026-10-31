const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('monitor-lifecycle.js','utf8');
function load(){
 const sandbox={window:{},document:{querySelector:()=>null}};
 vm.runInNewContext(source,sandbox,{filename:'monitor-lifecycle.js'});
 return sandbox.window.BakenMonitorLifecycle;
}
const target=(venue,raceNumber,date='2026-10-31')=>({date,venue,raceNumber});
test('six Tokyo pending races leave the monitor after settlement',()=>{
 const six=[2,3,4,5,6,11].map(n=>target('東京',n));
 const result=load().diff(six,[]);
 assert.equal(result.before,6);
 assert.equal(result.after,0);
 assert.equal(result.removed.length,6);
 assert.equal(result.added.length,0);
 assert.equal(result.retained.length,0);
});
test('partial settlement removes only paid race',()=>{
 const two=[target('東京',2),target('東京',11)];
 const result=load().diff(two,[target('東京',11)]);
 assert.equal(result.removed.length,1);
 assert.equal(result.removed[0].raceNumber,2);
 assert.equal(result.retained[0].raceNumber,11);
});
test('different venues and dates are different monitored identities',()=>{
 const result=load().diff([target('東京',2)],[target('京都',2)]);
 assert.equal(result.removed.length,1);
 assert.equal(result.added.length,1);
});
test('new pending race is separately registered and counted',()=>{
 const result=load().diff([target('東京',2)],[target('東京',2),target('東京',3)]);
 assert.equal(result.added.length,1);
 assert.equal(result.retained.length,1);
});
test('invalid race identities are rejected, no bet information accepted',()=>{
 assert.throws(()=>load().diff([target('東京',13)],[]),/不正/);
});
