'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=(name)=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
function response(){
 const out={code:200,headers:{},payload:null};
 return {out,res:{
  set statusCode(v){out.code=v},get statusCode(){return out.code},
  setHeader(k,v){out.headers[k]=v},
  end(body){out.payload=body===undefined?null:JSON.parse(body)}
 }};
}
function sharingEntry(env={}){
 let pools=0,calls=0;
 const ctx={
  module:{exports:{}},
  process:{env},
  URL,JSON,
  require(spec){
   if(spec==='pg')return {Pool:class{constructor(){pools++}connect(){throw Error('Never connect in this test')}}};
   if(spec==='./app.cjs')return {createSharingApi:()=>()=>{calls++}};
   if(spec==='./scheduler-union-http.cjs')return {createSchedulerUnionHttp:()=>{throw Error('Should not initialize')}};
   throw Error('Unexpected dependency '+spec);
  }
 };
 vm.runInNewContext(source('sharing-server/vercel-entry.cjs'),ctx,{filename:'vercel-entry.cjs'});
 return {handler:ctx.module.exports,get pools(){return pools},get sharingCalls(){return calls}};
}
const existingEnv={
 SHARING_AUTH_PROVIDER:'neon',
 SHARING_DATABASE_URL:'test-existing-connection-not-a-secret',
 NEON_AUTH_BASE_URL:'https://example.invalid/auth',
 NEON_AUTH_JWKS_URL:'https://example.invalid/jwks'
};
test('scheduler endpoint fails closed with missing dedicated credentials; no app pool is opened',async()=>{
 const app=sharingEntry(existingEnv),{out,res}=response();
 await app.handler({url:'/api/monitor/scheduler-union',method:'GET',headers:{}},res);
 assert.equal(out.code,503);
 assert.equal(out.payload.error,'Scheduler unavailable');
 assert.equal(app.pools,0);
 assert.equal(app.sharingCalls,0);
});
test('normal sharing route stays independently reachable when scheduler credentials are absent',async()=>{
 const app=sharingEntry(existingEnv),{out,res}=response();
 await app.handler({url:'/api/sharing/me',method:'GET',headers:{}},res);
 assert.equal(out.code,200);
 assert.equal(app.pools,1);
 assert.equal(app.sharingCalls,1);
});
test('API gateway forwards only exact dedicated path and rejects arbitrary monitor paths',()=>{
 const seen=[],ctx={module:{exports:{}},URL,JSON,
  require(spec){
   assert.equal(spec,'../sharing-server/vercel-entry.cjs');
   return (req)=>seen.push(req.url);
  }
 };
 vm.runInNewContext(source('api/index.js'),ctx,{filename:'api/index.js'});
 const gateway=ctx.module.exports;
 for(const valid of ['/api/index?bk_route=monitor%2Fscheduler-union','/api/monitor/scheduler-union']){
  const {res}=response();
  gateway({url:valid},res);
 }
 assert.equal(seen.length,2);
 assert.equal(seen[0],'/api/monitor/scheduler-union');
 assert.equal(seen[1],'/api/monitor/scheduler-union');
 for(const invalid of ['/api/index?bk_route=monitor%2Fscheduler-union%2Fadmin',
                        '/api/index?bk_route=monitor%2Ftargets']){
  const {out,res}=response();
  gateway({url:invalid},res);
  assert.equal(out.code,404);
 }
 assert.equal(seen.length,2);
});
