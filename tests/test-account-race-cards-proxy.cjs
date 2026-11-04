'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const handler=require('../api/auth/index.js');
const HOST='baken-king-app-next.vercel.app';
function response(){
 const result={status:0,body:'',headers:{}};
 return {result,setHeader(k,v){result.headers[k]=v;return this},end(body){result.body=body||'';return this},
 get statusCode(){return result.status},set statusCode(v){result.status=v}};
}
test('account race-card route requires a signed-in session',async()=>{
 const res=response();
 await handler({method:'GET',url:'/api/auth/index?sharing_route=race-cards',headers:{host:HOST}},res);
 assert.equal(res.result.status,401);
 assert.equal(JSON.parse(res.result.body).error,'Login required');
});
test('account race-card route rejects an unexpected origin',async()=>{
 const res=response();
 await handler({method:'GET',url:'/api/auth/index?sharing_route=race-cards',headers:{host:HOST,origin:'https://untrusted.invalid'}},res);
 assert.equal(res.result.status,403);
});
test('race-card client uses only the authenticated same-origin endpoint',()=>{
 const client=fs.readFileSync('app-next-cards.js','utf8');
 const monitor=fs.readFileSync('app-next-monitor.js','utf8');
 const old=fs.readFileSync('race-card-auto-sync.js','utf8');
 assert.ok(client.includes("'/api/auth/friends/race-cards'"));
 assert.ok(client.includes("credentials:'same-origin'"));
 assert.ok(client.includes("response.status===404"));
 assert.ok(monitor.includes("app-next-cards.js"));
 assert.ok(old.includes("location.hostname==='baken-king-app-next.vercel.app'"));
 assert.ok(!client.includes('MONITOR_DEVICE_TOKEN'));
 assert.ok(!client.includes("localStorage.removeItem"));
});
