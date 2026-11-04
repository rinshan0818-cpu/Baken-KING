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
test('push route requires login and same-origin',async()=>{
 const noSession=response();
 await handler({method:'GET',url:'/api/auth/index?sharing_route=push-subscriptions',headers:{host:HOST}},noSession);
 assert.equal(noSession.result.status,401);
 const crossOrigin=response();
 await handler({method:'GET',url:'/api/auth/index?sharing_route=push-subscriptions',
  headers:{host:HOST,origin:'https://evil.example'}},crossOrigin);
 assert.equal(crossOrigin.result.status,403);
});
test('signed account push avoids legacy device-token settings',()=>{
 const app=fs.readFileSync('app-next-push.js','utf8');
 const loader=fs.readFileSync('app-next-monitor.js','utf8');
 assert.ok(loader.includes('app-next-push.js'));
 assert.ok(app.includes("'/api/auth/friends/push-subscriptions'"));
 assert.ok(app.includes("credentials:'same-origin'"));
 assert.ok(app.includes("window.BakenMonitoringTargets?.extractTargets"));
 assert.ok(!app.includes('MONITOR_DEVICE_TOKEN'));
 assert.ok(!app.includes("localStorage.clear("));
 assert.ok(!app.includes("localStorage.removeItem('keiba-demo-v1')"));
 assert.ok(app.includes('subscribe({userVisibleOnly:true'));
});
test('logout stops account notification before clearing session',()=>{
 const cloud=fs.readFileSync('app-next-cloud.js','utf8');
 const start=cloud.indexOf('logout.onclick=async()=>');
 assert.ok(start>=0);
 const part=cloud.slice(start,start+450);
 assert.ok(part.indexOf('BakenReleaseAccountPush')<part.indexOf("'sign-out'"));
});
