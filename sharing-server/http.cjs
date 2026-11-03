'use strict';
// Server-only HTTP boundary. Mount behind TLS at a trusted API origin.
// Authentication is always performed by createSharingService's injected JWT verifier.
// Cross-origin GitHub Pages callers must be allowlisted exactly; no wildcard origins.
function createSharingHttpHandler(service,{allowedOrigins=[]}={}){
 if(!Array.isArray(allowedOrigins)||allowedOrigins.some(v=>typeof v!=='string'||!/^https:\/\/[^/]+$/.test(v)))throw Error('Invalid CORS configuration');
 const origins=new Set(allowedOrigins);
 if(!service||typeof service.writeSummary!=='function'||typeof service.readSummary!=='function')throw Error('Sharing service required');
 const send=(res,status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(body))};
 return async function handler(req,res){
  try{
   if(!req||!res||typeof req.url!=='string')return send(res,400,{error:'Bad request'});
   const origin=req.headers?.origin;
   if(origin!==undefined){
    if(!origins.has(origin))return send(res,403,{error:'Forbidden'});
    res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Vary','Origin');
    res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods','GET, POST, DELETE, OPTIONS');
   }
   if(req.method==='OPTIONS'){res.statusCode=204;res.setHeader('Cache-Control','no-store');return res.end()}
   const path=new URL(req.url,'https://baken.invalid').pathname;
   // Friendship routes authenticate through service; body cannot set actor ID.
   async function readJson(){
    if(!/^application\/json(?:;|$)/i.test(req.headers?.['content-type']||'')){const e=Error('JSON required');e.status=415;throw e}
    let raw='';for await(const chunk of req){raw+=String(chunk);if(Buffer.byteLength(raw)>2048){const e=Error('Too large');e.status=413;throw e}}
    try{return JSON.parse(raw)}catch{const e=Error('Bad JSON');e.status=400;throw e}
   }
   const validUUID=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
   if(path==='/api/sharing/profile'&&req.method==='POST'){
    const body=await readJson();
    if(!body||Array.isArray(body)||Object.keys(body).length!==1||typeof body.displayName!=='string'||!body.displayName.trim()||body.displayName.trim().length>16)return send(res,400,{error:'Invalid display name'});
    return send(res,200,{ok:true,profile:await service.register(req,body.displayName.trim())});
   }
   if(path==='/api/sharing/connections'&&req.method==='GET')return send(res,200,{ok:true,...await service.connections(req)});
   if(path==='/api/sharing/me'&&req.method==='GET')return send(res,200,{ok:true,user:await service.me(req)});
   if(path==='/api/sharing/invitations'&&req.method==='POST'){
    const body=await readJson();
    if(!body||Array.isArray(body)||Object.keys(body).length!==1||!validUUID(body.recipientId))return send(res,400,{error:'Invalid fields'});
    return send(res,200,{ok:true,invitation:await service.invite(req,body.recipientId)});
   }
   const reply=/^\/api\/sharing\/invitations\/([0-9a-f-]{36})\/respond$/i.exec(path);
   if(reply&&req.method==='POST'){
    const body=await readJson();
    if(!validUUID(reply[1])||!body||Array.isArray(body)||Object.keys(body).length!==1||typeof body.accepted!=='boolean')return send(res,400,{error:'Invalid fields'});
    return send(res,200,{ok:true,invitation:await service.respond(req,reply[1],body.accepted)});
   }
   const unlink=/^\/api\/sharing\/friends\/([0-9a-f-]{36})$/i.exec(path);
   if(unlink&&req.method==='DELETE'){
    if(!validUUID(unlink[1]))return send(res,400,{error:'Invalid identifier'});
    return send(res,200,{ok:true,result:await service.revoke(req,unlink[1])});
   }
   if(path==='/api/sharing/summary'&&req.method==='POST'){
    if(!/^application\/json(?:;|$)/i.test(req.headers?.['content-type']||''))return send(res,415,{error:'JSON required'});
    let raw='';for await(const chunk of req){raw+=String(chunk);if(Buffer.byteLength(raw)>2048)return send(res,413,{error:'Too large'})}
    let parsed;try{parsed=JSON.parse(raw)}catch{return send(res,400,{error:'Bad JSON'})}
    if(!parsed||typeof parsed!=='object'||Object.keys(parsed).length!==1||!Object.hasOwn(parsed,'metrics'))return send(res,400,{error:'Invalid fields'});
    const result=await service.writeSummary(req,parsed.metrics);
    return send(res,200,{ok:true,result});
   }
   const match=/^\/api\/sharing\/summary\/([0-9a-f-]{36})$/i.exec(path);
   if(match&&req.method==='GET'){
    const result=await service.readSummary(req,match[1]);
    return send(res,200,{ok:true,summary:result});
   }
   return send(res,404,{error:'Not found'});
  }catch(err){const status=[400,401,403,405,413,415].includes(err?.status)?err.status:500;return send(res,status,{error:status===500?'Internal error':status===401?'Unauthenticated':status===403?'Forbidden':err.message})}
 };
}
module.exports={createSharingHttpHandler};
