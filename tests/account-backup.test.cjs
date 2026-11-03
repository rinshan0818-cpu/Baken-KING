const assert=require('node:assert/strict');
const {create,validBackup}=require('../account-backup.js');
const user={id:'11111111-1111-4111-8111-111111111111',emailVerified:true};
const backup={format:'BAKEN_KING_BACKUP',schemaVersion:2,exportedAt:'2026-11-03T00:00:00Z',state:{bets:[],seasons:[],balance:100000},extras:{}};
(async()=>{
 assert.equal(validBackup(backup),backup);
 const local={value:{...backup}},events=[];
 const api=create({session:async()=>user,readLocal:async()=>local.value,
  transport:{write:async data=>{events.push(['write',data]);return {ok:true,revision:1}},
   read:async()=>({ok:true,backup,revision:1,updatedAt:'now'})},
  restoreLocal:async args=>{events.push(['restore',args])}
 });
 await assert.rejects(api.upload(),/明示的/);
 assert.equal(events.length,0);
 assert.deepEqual(await api.upload({consent:true}),{revision:1});
 assert.equal(events[0][1].actorId,user.id);
 assert.equal(events[0][1].expectedRevision,null);
 assert.equal((await api.inspect()).revision,1);
 await assert.rejects(api.restore({preview:{backup}}),/明示的/);
 assert.equal(events.length,1);
 assert.deepEqual(await api.restore({preview:{backup},consent:true}),{restored:true});
 assert.equal(events[1][0],'restore');
 const noTransport=create({session:async()=>user,readLocal:async()=>backup,restoreLocal:async()=>{throw Error('should not restore')}});
 await assert.rejects(noTransport.upload({consent:true}),/まだ利用できません/);
 await assert.rejects(noTransport.inspect(),/まだ利用できません/);
 const unverified=create({session:async()=>({...user,emailVerified:false}),readLocal:async()=>backup,restoreLocal:async()=>{},transport:{write:async()=>{throw Error('should not call')}}});
 await assert.rejects(unverified.upload({consent:true}),/メール確認済み/);
 await assert.rejects(api.upload({consent:true,expectedRevision:0}),/更新番号が不正/);
 await assert.rejects(api.restore({preview:{backup:{...backup,schemaVersion:99}},consent:true}),/形式が正しくありません/);
 console.log('PASS: no auto-upload/restore, explicit consent, verified actor, conflict revision, fail-closed transport');
})().catch(e=>{console.error(e);process.exitCode=1});
