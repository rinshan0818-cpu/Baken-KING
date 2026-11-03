const assert=require('node:assert/strict');
const {createPrivateBackupStore}=require('../sharing-server/private-backup.cjs');
const user='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const key='a'.repeat(64);const payload={format:'BAKEN_KING_BACKUP',schemaVersion:2,exportedAt:'2026-11-03T00:00:00Z',state:{bets:[],balance:100000,totalPaid:0,totalStake:0,season:1},extras:{}};
const records=new Map(),queries=[];
const db={async query(sql,params){
 queries.push([sql,params]);
 if(sql.startsWith('INSERT')){
  const [owner,iv,tag,ciphertext]=params;
  if(records.has(owner))return {rows:[]};
  records.set(owner,{revision:1,iv,tag,ciphertext,updated_at:'now'});
  return {rows:[{revision:1}]};
 }
 if(sql.startsWith('UPDATE')){
  const [owner,expected,iv,tag,ciphertext]=params;
  const row=records.get(owner);
  if(!row||row.revision!==expected)return {rows:[]};
  row.revision++;Object.assign(row,{iv,tag,ciphertext});
  return {rows:[{revision:row.revision}]};
 }
 if(sql.startsWith('SELECT')){
  const row=records.get(params[0]);return {rows:row?[row]:[]};
 }
 throw Error('Unexpected SQL');
}};
(async()=>{
 const store=createPrivateBackupStore(db,key);
 assert.equal(await store.read(user),null);
 assert.deepEqual(await store.create(user,payload),{revision:1});
 assert.equal((await store.read(user)).backup.state.balance,100000);
 const stored=records.get(user);
 assert(!stored.ciphertext.toString('utf8').includes('BAKEN_KING_BACKUP'));
 assert.equal(stored.iv.length,12);assert.equal(stored.tag.length,16);
 await assert.rejects(store.create(user,payload),e=>e.status===409);
 assert.deepEqual(await store.update(user,{...payload,state:{...payload.state,balance:90000}},1),{revision:2});
 await assert.rejects(store.update(user,payload,1),e=>e.status===409);
 assert.equal((await store.read(user)).backup.state.balance,90000);
 await assert.rejects(store.create('bad',payload),/Invalid authenticated user/);
 await assert.rejects(store.create(other,{...payload,extras:{'baken-king-mode-v1':'test'}}),/Unexpected extra data/);
 await assert.rejects(store.create(other,{...payload,schemaVersion:3}),/Unsupported backup/);
 const raw=records.get(user);raw.tag=Buffer.from(raw.tag);raw.tag[0]^=1;
 await assert.rejects(store.read(user),/authenticate data|unable to authenticate/i);
 assert(queries.every(([,params])=>!params?.includes(other)||params[0]===other));
 console.log('PASS: private account backup encrypted, revisioned, owner keyed, tamper evident and schema limited');
})().catch(e=>{console.error(e);process.exitCode=1});
