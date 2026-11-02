const assert=require('node:assert/strict');const {Readable}=require('node:stream');const {createSharingHttpHandler}=require('../sharing-server/http.cjs');
const calls=[];const handler=createSharingHttpHandler({writeSummary:async(req,m)=>{if(req.headers.authorization!=='Bearer valid'){const e=Error('Unauthorized');e.status=401;throw e}calls.push(['write',m]);return {saved:true}},readSummary:async(req,id)=>{if(req.headers.authorization!=='Bearer valid'){const e=Error('Unauthorized');e.status=401;throw e}calls.push(['read',id]);return {stakeYen:10}}});
async function call(method,url,body='',authorization='Bearer valid',contentType='application/json'){
 const req=Readable.from(body?[body]:[]);req.method=method;req.url=url;req.headers={authorization,'content-type':contentType};
 let json='';const headers={};const res={statusCode:200,setHeader(k,v){headers[k.toLowerCase()]=v},end(v){json=v}};
 await handler(req,res);return {status:res.statusCode,body:JSON.parse(json),headers};
}
(async()=>{
 let r=await call('POST','/api/sharing/summary',JSON.stringify({metrics:{stakeYen:10}}));assert.equal(r.status,200);
 assert.equal(r.headers['cache-control'],'no-store');assert(!r.headers['access-control-allow-origin']);
 r=await call('GET','/api/sharing/summary/11111111-1111-4111-8111-111111111111');assert.equal(r.status,200);
 r=await call('POST','/api/sharing/summary',JSON.stringify({metrics:{},ownerId:'victim'}));assert.equal(r.status,400);
 r=await call('POST','/api/sharing/summary',JSON.stringify({metrics:{}}),'Bearer invalid');assert.equal(r.status,401);
 r=await call('POST','/api/sharing/summary','x'.repeat(2050));assert.equal(r.status,413);
 assert.equal(calls.length,2);
 console.log('PASS: authenticated sharing HTTP boundary rejects impersonation, anonymous and oversized requests');
})().catch(e=>{console.error(e);process.exitCode=1});