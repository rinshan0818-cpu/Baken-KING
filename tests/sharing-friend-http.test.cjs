const assert=require('node:assert/strict');
const {Readable}=require('node:stream');
const {createSharingHttpHandler}=require('../sharing-server/http.cjs');
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
let events=[];
const service={
 writeSummary:async()=>({}),readSummary:async()=>({}),
 me:async req=>{events.push('me');return {id:A}},
 invite:async(req,id)=>{events.push(['invite',id]);return {id:B,status:'pending'}},
 respond:async(req,id,accepted)=>{events.push(['respond',id,accepted]);return {status:'accepted'}},
 revoke:async(req,id)=>{events.push(['revoke',id]);return {ok:true}}
};
const handler=createSharingHttpHandler(service,{allowedOrigins:['https://rinshan0818-cpu.github.io']});
async function send(method,url,obj,origin='https://rinshan0818-cpu.github.io'){
 const req=Readable.from(obj===undefined?[]:[JSON.stringify(obj)]);
 req.method=method;req.url=url;req.headers={origin,'content-type':'application/json'};
 let body='';const headers={};const res={statusCode:200,setHeader(k,v){headers[k]=v},end(v=''){body=v}};
 await handler(req,res);return {status:res.statusCode,body:body?JSON.parse(body):{},headers};
}
(async()=>{
 assert.equal((await send('GET','/api/sharing/me')).status,200);
 assert.deepEqual(events.pop(),'me');
 assert.equal((await send('POST','/api/sharing/invitations',{recipientId:B})).status,200);
 assert.deepEqual(events.pop(),['invite',B]);
 assert.equal((await send('POST','/api/sharing/invitations',{recipientId:B,actorId:A})).status,400);
 assert.equal((await send('POST','/api/sharing/invitations/'+B+'/respond',{accepted:true})).status,200);
 assert.deepEqual(events.pop(),['respond',B,true]);
 assert.equal((await send('POST','/api/sharing/invitations/'+B+'/respond',{accepted:'yes'})).status,400);
 assert.equal((await send('DELETE','/api/sharing/friends/'+B)).status,200);
 assert.deepEqual(events.pop(),['revoke',B]);
 assert.equal((await send('DELETE','/api/sharing/friends/'+A,'x','https://untrusted.example')).status,403);
 console.log('PASS: friend HTTP boundary validates requests and rejects extra actor IDs');
})().catch(e=>{console.error(e);process.exitCode=1});
