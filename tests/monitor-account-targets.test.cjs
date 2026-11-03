'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {validateTargets,createMonitorStore}=require('../sharing-server/monitor-store.cjs');
const NOW=new Date('2026-11-03T05:00:00Z');
const race=(day,venue='東京',raceNumber=11)=>({date:day,venue,raceNumber});
test('only bounded race identity fields are accepted',()=>{
 assert.deepEqual(validateTargets([race('2026-11-07')],NOW),[race('2026-11-07')]);
 assert.throws(()=>validateTargets([{...race('2026-11-07'),stake:100}],NOW));
 assert.throws(()=>validateTargets([{...race('2026-11-07'),picks:[1,2,3]}],NOW));
 assert.throws(()=>validateTargets([race('2026-11-07'),race('2026-11-07')],NOW));
 assert.throws(()=>validateTargets([race('2026-10-01')],NOW));
 assert.throws(()=>validateTargets([race('2026-11-20')],NOW));
});
test('registering only writes the authenticated actors row',async()=>{
 const actor='11111111-1111-4111-8111-111111111111',queries=[];
 const db={query:async(sql,params)=>{queries.push({sql,params});return {rows:[]}}};
 const store=createMonitorStore(db);
 await store.replace(actor,[race('2026-11-07')]);
 assert.equal(queries.length,1);
 assert.equal(queries[0].params[0],actor);
 assert.deepEqual(JSON.parse(queries[0].params[1]),[race('2026-11-07')]);
 await store.replace(actor,[]);
 assert.equal(queries[1].params[0],actor);
});
