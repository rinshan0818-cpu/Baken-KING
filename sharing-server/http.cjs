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
    res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
   }
   if(req.method==='OPTIONS')return send(res,204,{ok:true});
   const path=new URL(req.url,'https://baken.invalid').pathname;
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
