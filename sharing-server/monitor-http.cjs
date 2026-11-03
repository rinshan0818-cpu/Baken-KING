'use strict';
const {withActorTransaction}=require('./actor-transaction.cjs');
const {validateTargets,createMonitorStore}=require('./monitor-store.cjs');
function createMonitorHttp({authenticate,pool,allowedOrigins=[]}){
 const allowed=new Set(allowedOrigins);
 const send=(res,status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body))};
 return async(req,res)=>{
  try{
   res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
   const origin=req.headers?.origin;
   if(origin&& !allowed.has(origin))return send(res,403,{error:'Forbidden'});
   if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS')}
   if(req.method==='OPTIONS'){res.statusCode=204;return res.end()}
   if(!['GET','POST'].includes(req.method))return send(res,405,{error:'Method not allowed'});
   const actor=await authenticate(req);
   if(!actor?.id||actor.emailVerified!==true)return send(res,401,{error:'Unauthenticated'});
   let targets;
   if(req.method==='POST'){
    if(!/^application\/json(?:;|$)/i.test(req.headers?.['content-type']||''))return send(res,415,{error:'JSON required'});
    let raw='';for await(const chunk of req){raw+=String(chunk);if(Buffer.byteLength(raw)>4096)return send(res,413,{error:'Too large'})}
    let data;try{data=JSON.parse(raw)}catch{return send(res,400,{error:'Bad JSON'})}
    if(!data||Array.isArray(data)||Object.keys(data).sort().join(',')!=='targets')return send(res,400,{error:'Invalid fields'});
    try{targets=validateTargets(data.targets)}catch{return send(res,400,{error:'Invalid race targets'})}
   }
   const result=await withActorTransaction(pool,actor.id,async db=>{
    const store=createMonitorStore(db);
    return req.method==='GET'?store.own(actor.id):store.replace(actor.id,targets);
   });
   return send(res,200,{ok:true,...result});
  }catch(e){
   const code=[401,403].includes(e?.status)?e.status:500;
   return send(res,code,{error:code===401?'Unauthenticated':code===403?'Forbidden':'Monitor registry unavailable'});
  }
 };
}
module.exports={createMonitorHttp};
