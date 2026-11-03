'use strict';
// Run all queries for one verified actor in one dedicated Postgres transaction.
// pg Pool.connect() must yield a dedicated client. Never use pool.query() for
// SET LOCAL: transaction pooling could leak or drop the actor context.
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function withActorTransaction(pool,actor,fn){
 if(!pool||typeof pool.connect!=='function'||typeof fn!=='function')throw Error('Private DB pool required');
 if(typeof actor!=='string'||!ID.test(actor))throw Error('Verified actor required');
 const client=await pool.connect();
 let begun=false;
 try{
  await client.query('BEGIN');begun=true;
  // The login role has LOGIN but no table privileges; switch to the NOLOGIN
  // RLS role inside this transaction before ANY user-scoped query.
  await client.query('SET LOCAL ROLE baken_sharing_api');
  // Never process sharing queries as the DB owner/BYPASSRLS role.
  const role=await client.query('SELECT current_user AS role');
  if(role.rows?.[0]?.role!=='baken_sharing_api')throw Error('Restricted sharing DB role required');
  // Transaction-local setting: never carry over to a different request.
  await client.query("SELECT set_config('bk.actor_id',$1,true)",[actor]);
  const result=await fn(Object.freeze({query:(sql,params)=>client.query(sql,params)}));
  await client.query('COMMIT');begun=false;
  return result;
 }catch(error){
  if(begun){try{await client.query('ROLLBACK')}catch{}}
  throw error;
 }finally{
  client.release();
 }
}
module.exports={withActorTransaction};
