'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createMonitorStore,validateTargets}=require('../sharing-server/monitor-store.cjs');
const U1='00000000-0000-4000-8000-000000000001';
const U2='00000000-0000-4000-8000-000000000002';
const d='2026-11-07';
const race=(venue,raceNumber,date=d)=>({date,venue,raceNumber});
// Simulates actor-local PostgreSQL operations, NOT a replacement for live RLS checks.
function dbFixture(){
 const data=new Map(),operations=[];
 return {data,operations,db:{
  async query(sql,params){
   operations.push({sql,params});
   if(sql.startsWith('DELETE FROM sharing_monitor_targets')){
    data.delete(params[0]);return {rows:[]};
   }
   if(sql.includes('INSERT INTO sharing_monitor_targets')){
    data.set(params[0],JSON.parse(params[1]));return {rows:[]};
   }
   if(sql.startsWith('SELECT targets,updated_at')){
    return {rows:data.has(params[0])?[{targets:data.get(params[0]),updated_at:'2026-11-07T01:00:00Z'}]:[]};
   }
   throw Error('Unexpected operation');
  }
 }};
}
test('two accounts keep independent records for same JRA race',async()=>{
 const fixture=dbFixture(),store=createMonitorStore(fixture.db);
 await store.replace(U1,[race('東京',11)]);
 await store.replace(U2,[race('東京',11),race('京都',10)]);
 assert.deepEqual((await store.own(U1)).targets,[race('東京',11)]);
 assert.deepEqual((await store.own(U2)).targets,[race('東京',11),race('京都',10)]);
 assert.equal(fixture.data.size,2);
 assert(fixture.operations.every(op=>op.params[0]===U1||op.params[0]===U2));
});
test('deleting one account never removes the other shared race',async()=>{
 const fixture=dbFixture(),store=createMonitorStore(fixture.db);
 await store.replace(U1,[race('東京',11)]);
 await store.replace(U2,[race('東京',11)]);
 await store.replace(U1,[]);
 assert.deepEqual((await store.own(U1)).targets,[]);
 assert.deepEqual((await store.own(U2)).targets,[race('東京',11)]);
 assert.equal(fixture.data.size,1);
});
test('replacing an account subscription cannot overwrite another account',async()=>{
 const fixture=dbFixture(),store=createMonitorStore(fixture.db);
 await store.replace(U1,[race('東京',11)]);
 await store.replace(U2,[race('京都',1)]);
 await store.replace(U1,[race('東京',9)]);
 assert.deepEqual((await store.own(U2)).targets,[race('京都',1)]);
 assert.deepEqual((await store.own(U1)).targets,[race('東京',9)]);
});
test('validator rejects money, selections, and duplicate targets',()=>{
 const now=new Date('2026-11-03T12:00:00+09:00');
 assert.throws(()=>validateTargets([{...race('東京',11),stakeYen:100}],now),/fields/);
 assert.throws(()=>validateTargets([{...race('東京',11),picks:[1,2,3]}],now),/fields/);
 assert.throws(()=>validateTargets([race('東京',11),race('東京',11)],now),/Duplicate/);
});

test('a single account may hold 36 races on each of three different days',()=>{
 const now=new Date('2026-11-04T09:00:00+09:00');
 const dates=['2026-11-05','2026-11-06','2026-11-07'];
 const all=dates.flatMap(day=>['東京','京都','阪神'].flatMap(venue=>
  Array.from({length:12},(_,i)=>race(venue,i+1,day))));
 const valid=validateTargets(all,now);
 assert.equal(valid.length,108);
 assert.equal(new Set(valid.map(r=>r.date+'|'+r.venue+'|'+r.raceNumber)).size,108);
});
test('the 37th race on one day and fourth distinct day are rejected',()=>{
 const now=new Date('2026-11-04T09:00:00+09:00');
 const all=['東京','京都','阪神'].flatMap(venue=>
  Array.from({length:12},(_,i)=>race(venue,i+1,'2026-11-05')));
 assert.throws(()=>validateTargets([...all,race('福島',1,'2026-11-05')],now),/capacity/);
 const four=['2026-11-04','2026-11-05','2026-11-06','2026-11-07']
  .map(day=>race('東京',1,day));
 assert.throws(()=>validateTargets(four,now),/capacity/);
});
test('invalid calendar dates and the 109th total race are rejected',()=>{
 const now=new Date('2026-11-04T09:00:00+09:00');
 assert.throws(()=>validateTargets([race('東京',1,'2026-11-31')],new Date('2026-11-28T09:00:00+09:00')),/calendar/);
 const hundredEight=['2026-11-05','2026-11-06','2026-11-07']
  .flatMap(day=>['東京','京都','阪神'].flatMap(venue=>
   Array.from({length:12},(_,i)=>race(venue,i+1,day))));
 assert.throws(()=>validateTargets([...hundredEight,race('福島',1,'2026-11-07')],now),/count/);
});
