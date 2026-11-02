const assert=require('node:assert/strict');const {create,INTERVAL_MS}=require('../friend-sync.js');
(async()=>{
 let now=100000000,calls=0,received=0,fail=false;
 const app=create({clock:()=>now,localSnapshot:()=>({metrics:{profit:0}}),transport:async()=>{calls++;return fail?{ok:false}:{ok:true,friend:{nickname:'相手'}}},receiveFriend:async()=>{received++}});
 assert.equal(INTERVAL_MS,1800000);
 assert.equal((await app.sync()).status,'updated');assert.equal(calls,1);
 assert.equal((await app.sync()).status,'not-due');assert.equal(calls,1);
 now+=INTERVAL_MS-1;assert.equal((await app.sync()).status,'not-due');
 now++;assert.equal((await app.sync()).status,'updated');assert.equal(calls,2);
 assert.equal((await app.sync({force:true})).status,'updated');assert.equal(calls,3);
 fail=true;now+=INTERVAL_MS;assert.equal((await app.sync()).status,'failed');assert.equal(received,3);
 fail=false;assert.equal((await app.sync()).status,'updated');assert.equal(received,4);
 console.log('PASS: 30-minute cadence, manual refresh, retry and no failed friend overwrite');
})().catch(e=>{console.error(e);process.exitCode=1});
