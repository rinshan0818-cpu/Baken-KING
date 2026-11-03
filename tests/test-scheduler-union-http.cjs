'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createSchedulerUnionHttp}=require('../sharing-server/scheduler-union-http.cjs');
const token='server-only-scheduler-secret-should-be-at-least-32-chars';
const race={date:'2026-11-07',venue:'東京',raceNumber:11};
function reply(){
 const out={statusCode:0,headers:{},body:null};
 return {out,res:{get statusCode(){return out.statusCode},set statusCode(code){out.statusCode=code},setHeader(k,v){out.headers[k]=v},end(s){out.body=JSON.parse(s)}}};
}
async function invoke(handler,headers={},method='GET'){
 const {out,res}=reply();
 await handler({method,headers},res);
 return out;
}
function connection({role='baken_monitor_scheduler',races=[race],failure=false,bypass=false,superuser=false}={}){
 let queries=0,releases=0;
 const connect=async()=>({
  async query(q){
   queries++;
   if(failure)throw Error('Postgres unavailable');
   if(q.includes('session_user AS login_role'))return {rows:[{
    login_role:role,current_role:role,is_superuser:superuser,bypass_rls:bypass
   }]};
   if(q.includes('bk_monitor_union_for_scheduler'))return {rows:[{targets:races}]};
   throw Error('Unexpected query');
  },
  release(){releases++}
 });
 return {connect,get queries(){return queries},get releases(){return releases}};
}
test('unconfigured endpoint rejects initialization',()=>{
 assert.throws(()=>createSchedulerUnionHttp({token:'short',connect:async()=>{}}),/configuration/);
});
test('GET only, no cookies or origin, correct dedicated bearer',async()=>{
 const db=connection(),h=createSchedulerUnionHttp({token,connect:db.connect});
 assert.equal((await invoke(h,{authorization:'Bearer '+token},'POST')).statusCode,405);
 assert.equal((await invoke(h,{authorization:'Bearer '+token,cookie:'x=1'})).statusCode,403);
 assert.equal((await invoke(h,{authorization:'Bearer '+token,origin:'https://baken-king-app-next.vercel.app'})).statusCode,403);
 assert.equal((await invoke(h,{})).statusCode,401);
 assert.equal((await invoke(h,{authorization:'Bearer wrong'})).statusCode,401);
 assert.equal(db.queries,0);
 const ok=await invoke(h,{authorization:'Bearer '+token});
 assert.equal(ok.statusCode,200);
 assert.deepEqual(ok.body,{schemaVersion:1,targets:[race]});
 assert.equal(db.releases,1);
});
test('reject owner, end-user and RLS bypass database identities',async()=>{
 for(const role of ['baken_sharing_api','neondb_owner','baken_sharing_limited']){
  const db=connection({role}),h=createSchedulerUnionHttp({token,connect:db.connect});
  assert.equal((await invoke(h,{authorization:'Bearer '+token})).statusCode,503);
  assert.equal(db.queries,1);
  assert.equal(db.releases,1);
 }
});
test('reject data with additional ticket information',async()=>{
 const db=connection({races:[{...race,stakeYen:200}]});
 const h=createSchedulerUnionHttp({token,connect:db.connect});
 const res=await invoke(h,{authorization:'Bearer '+token});
 assert.equal(res.statusCode,503);
 assert.equal(db.releases,1);
});
test('reject duplicate races or more than 36 race identities',async()=>{
 const full=['東京','京都','阪神'].flatMap(venue=>Array.from({length:12},(_,i)=>({...race,venue,raceNumber:i+1})));
 for(const races of [[race,race],[...full,{date:'2026-11-07',venue:'福島',raceNumber:1}]]){
  const db=connection({races});
  const h=createSchedulerUnionHttp({token,connect:db.connect});
  assert.equal((await invoke(h,{authorization:'Bearer '+token})).statusCode,503);
 }
});
test('database outage returns 503 and releases connection',async()=>{
 const db=connection({failure:true}),h=createSchedulerUnionHttp({token,connect:db.connect});
 assert.equal((await invoke(h,{authorization:'Bearer '+token})).statusCode,503);
 assert.equal(db.releases,1);
});
test('Neon-created scheduler roles with BYPASSRLS are rejected',async()=>{
 for(const privilege of [{bypass:true},{superuser:true}]){
  const db=connection(privilege);
  const h=createSchedulerUnionHttp({token,connect:db.connect});
  const result=await invoke(h,{authorization:'Bearer '+token});
  assert.equal(result.statusCode,503);
  assert.equal(db.queries,1); // no read of any account race
  assert.equal(db.releases,1);
 }
});

test('two independent three-venue dates permit 72 races with no personal fields',async()=>{
 const twoDays=['2026-11-07','2026-11-08'].flatMap(date=>
  ['東京','京都','阪神'].flatMap(venue=>
   Array.from({length:12},(_,i)=>({date,venue,raceNumber:i+1}))));
 const db=connection({races:twoDays}),h=createSchedulerUnionHttp({token,connect:db.connect});
 const result=await invoke(h,{authorization:'Bearer '+token});
 assert.equal(result.statusCode,200);
 assert.equal(result.body.targets.length,72);
 assert.equal(result.body.targets.every(t=>Object.keys(t).sort().join(',')==='date,raceNumber,venue'),true);
});
test('more than three race dates fail closed even below 108 total',async()=>{
 const four=['2026-11-07','2026-11-08','2026-11-09','2026-11-10']
  .map(date=>({date,venue:'東京',raceNumber:1}));
 const db=connection({races:four}),h=createSchedulerUnionHttp({token,connect:db.connect});
 assert.equal((await invoke(h,{authorization:'Bearer '+token})).statusCode,503);
});
