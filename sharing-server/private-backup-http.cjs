'use strict';
// Private API routes. All ownership derives from a verified JWT and transaction-local RLS.
// Never expose SQL or encryption keys to GitHub Pages.
const {withActorTransaction}=require('./actor-transaction.cjs');
const {createPrivateBackupStore,MAX_BYTES}=require('./private-backup.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function createPrivateBackupHandler({authenticate,pool,encryptionKey,allowedOrigins=[]}){
 if(typeof authenticate!=='function'||!pool?.connect||typeof encryptionKey!=='string')throw Error('Private backup configuration required');
 const origins=new Set(allowedOrigins);
 const send=(res,status,body)=>{
  res.statusCode=status;res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(body));
 };
 return async(req,res)=>{
  try{
   const origin=req.headers?.origin;
   if(origin!==undefined){
    if(!origins.has(origin))return send(res,403,{error:'Forbidden'});
    res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Vary','Origin');
    res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,OPTIONS');
   }
   if(req.method==='OPTIONS'){res.statusCode=204;res.setHeader('Cache-Control','no-store');return res.end()}
   if(new URL(req.url,'https://baken.invalid').pathname!=='/api/account/backup')return send(res,404,{error:'Not found'});
   if(!['GET','POST','PUT'].includes(req.method))return send(res,405,{error:'Method not allowed'});
   const user=await authenticate(req);
   if(!user||!UUID.test(user.id)||user.emailVerified!==true)return send(res,401,{error:'Unauthenticated'});
   let input;
   if(req.method!=='GET'){
    if(!/^application\/json(?:;|$)/i.test(req.headers?.['content-type']||''))return send(res,415,{error:'JSON required'});
    let raw='',length=0;
    for await(const chunk of req){
     length+=Buffer.byteLength(chunk);
     if(length>MAX_BYTES+4096)return send(res,413,{error:'Backup too large'});
     raw+=String(chunk);
    }
    try{input=JSON.parse(raw)}catch{return send(res,400,{error:'Bad JSON'})}
    if(!input||Array.isArray(input)||typeof input!=='object')return send(res,400,{error:'Invalid payload'});
    const keys=Object.keys(input).sort();
    const expect=req.method==='POST'?['backup']:['backup','expectedRevision'];
    if(JSON.stringify(keys)!==JSON.stringify(expect))return send(res,400,{error:'Invalid fields'});
    if(req.method==='PUT'&&(!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1))return send(res,400,{error:'Invalid revision'});
   }
   const result=await withActorTransaction(pool,user.id,async db=>{
    const store=createPrivateBackupStore(db,encryptionKey);
    if(req.method==='GET')return store.read(user.id);
    // The private backup row references sharing_users, which is provisioned
    // only from the JWT's subject; no email, owner id, or name from client.
    await db.query("INSERT INTO sharing_users(id,display_name) VALUES($1::uuid,'プレイヤー') ON CONFLICT(id) DO NOTHING",[user.id]);
    if(req.method==='POST')return store.create(user.id,input.backup);
    return store.update(user.id,input.backup,input.expectedRevision);
   });
   if(req.method==='GET')return send(res,200,{ok:true,...result,backup:result?.backup||null});
   return send(res,200,{ok:true,revision:result.revision});
  }catch(e){
   const status=[400,401,403,409,413,415].includes(e.status)?e.status:500;
   return send(res,status,{error:status===500?'Internal error':status===409?'Backup conflict':e.message});
  }
 };
}
module.exports={createPrivateBackupHandler};
