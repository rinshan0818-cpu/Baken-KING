const assert=require('node:assert/strict');
const {Readable}=require('node:stream');
const {createPrivateBackupHandler}=require('../sharing-server/private-backup-http.cjs');
const USER='11111111-1111-4111-8111-111111111111';
const payload={format:'BAKEN_KING_BACKUP',schemaVersion:2,exportedAt:'2026-11-03T00:00:00Z',state:{bets:[],seasons:[],balance:100000,totalStake:0,totalPaid:0,grants:100000,season:1,bankrupt:0,manualRestarts:0},extras:{}};
const rows=new Map(),calls=[];
const client={async query(sql,params=[]){
 calls.push([sql,params]);
 if(sql==='SELECT current_user AS role')return {rows:[{role:'baken_sharing_api'}]};
 if(sql.startsWith('INSERT INTO sharing_users'))return {rows:[]};
 if(sql.startsWith('INSERT INTO sharing_private_backups')){
  if(rows.has(params[0]))return {rows:[]};
  rows.set(params[0],{revision:1,iv:params[1],tag:params[2],ciphertext:params[3],updated_at:'now'});
  return {rows:[{revision:1}]};
 }
 if(sql.startsWith('UPDATE sharing_private_backups')){
  const row=rows.get(params[0]);
  if(!row||row.revision!==params[1])return {rows:[]};
  Object.assign(row,{revision:row.revision+1,iv:params[2],tag:params[3],ciphertext:params[4]});
  return {rows:[{revision:row.revision}]};
 }
 if(sql.startsWith('SELECT revision,iv,tag,ciphertext')){
  const row=rows.get(params[0]);return {rows:row?[row]:[]};
 }
 return {rows:[]};
 },release(){calls.push(['release'])}};
const pool={connect:async()=>client};
function req(method,body,token='ok'){
 const json=body===undefined?'':JSON.stringify(body);
 const stream=Readable.from(body===undefined?[]:[Buffer.from(json)]);
 stream.method=method;stream.url='/api/account/backup';
 stream.headers={origin:'https://rinshan0818-cpu.github.io',authorization:'Bearer '+token,...(body!==undefined?{'content-type':'application/json'}:{})};
 return stream;
}
function res(){
 return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},end(body){this.body=body?JSON.parse(body):null}};
}
(async()=>{
 const handler=createPrivateBackupHandler({
  authenticate:async r=>r.headers.authorization==='Bearer ok'?{id:USER,emailVerified:true}:null,
  pool,encryptionKey:'a'.repeat(64),allowedOrigins:['https://rinshan0818-cpu.github.io']
 });
 async function call(method,body,token){const response=res();await handler(req(method,body,token),response);return response;}
 assert.equal((await call('GET',undefined,'bad')).statusCode,401);
 const empty=await call('GET');assert.equal(empty.statusCode,200);assert.equal(empty.body.backup,null);
 const first=await call('POST',{backup:payload});assert.equal(first.statusCode,200);assert.equal(first.body.revision,1);
 assert.equal((await call('POST',{backup:payload})).statusCode,409);
 const saved=await call('GET');assert.deepEqual(saved.body.backup,payload);
 assert.equal((await call('PUT',{backup:payload,expectedRevision:0})).statusCode,400);
 assert.equal((await call('PUT',{backup:payload,expectedRevision:7})).statusCode,409);
 assert.equal((await call('PUT',{backup:payload,expectedRevision:1})).body.revision,2);
 assert.equal((await call('POST',{backup:payload,ownerId:USER})).statusCode,400);
 assert(calls.some(x=>x[0]==="SELECT set_config('bk.actor_id',$1,true)"&&x[1][0]===USER));
 assert(calls.every(x=>!x[1]?.some?.(y=>typeof y==='string'&&y.includes('password'))));
 assert.equal((await call('GET',undefined,'bad')).statusCode,401);
 console.log('PASS: account backup API verifies actor, encrypts, denies replay, forbids owner override');
})().catch(e=>{console.error(e);process.exitCode=1});
