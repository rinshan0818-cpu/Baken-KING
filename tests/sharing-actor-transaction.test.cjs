const assert=require('node:assert/strict');
const {withActorTransaction}=require('../sharing-server/actor-transaction.cjs');
const ID='11111111-1111-4111-8111-111111111111';
function pool(role='baken_sharing_api'){
 const log=[],client={async query(sql,params){
  log.push([sql,params]);
  if(sql==='SELECT current_user AS role')return {rows:[{role}]};
  return {rows:[]};
 },release(){log.push(['release'])}};
 return {log,connect:async()=>client};
}
(async()=>{
 const p=pool();
 const result=await withActorTransaction(p,ID,async db=>{await db.query('SELECT 1');return 9});
 assert.equal(result,9);
 assert.deepEqual(p.log.map(x=>x[0]),['BEGIN','SET LOCAL ROLE baken_sharing_api','SELECT current_user AS role',"SELECT set_config('bk.actor_id',$1,true)",'SELECT 1','COMMIT','release']);
 assert.deepEqual(p.log[3][1],[ID]);
 const q=pool();await assert.rejects(withActorTransaction(q,ID,async()=>{throw Error('fail')}),/fail/);
 assert(q.log.some(x=>x[0]==='ROLLBACK'));assert(q.log.some(x=>x[0]==='release'));
 const owner=pool('baken_sharing_owner');
 await assert.rejects(withActorTransaction(owner,ID,async()=>{}),/Restricted sharing DB role/);
 assert(owner.log.some(x=>x[0]==='SET LOCAL ROLE baken_sharing_api'));
 assert(!owner.log.some(x=>x[0].includes('set_config')));
 assert(owner.log.some(x=>x[0]==='ROLLBACK'));
 await assert.rejects(withActorTransaction(pool(),'not-uuid',async()=>{}),/Verified actor/);
 console.log('PASS: actor transaction scoped to one verified user, restricted role, rollback on failure');
})().catch(e=>{console.error(e);process.exitCode=1});
