const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('sharing-server/vercel-entry.cjs','utf8');
function setup({login='baken_sharing_limited',bypass=false,dbError=false}={}){
 const resFactory=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},end(s){this.body=s?JSON.parse(s):null}});
 const queries=[];
 const pool={query:async sql=>{queries.push(sql);if(dbError)throw Error('Connection failed');return {rows:[{login,bypass}]}}};
 class Pool{constructor(){return pool}}
 const mod={exports:{}};
 const env={SHARING_AUTH_PROVIDER:'neon',SHARING_DATABASE_URL:'private-test-only',NEON_AUTH_BASE_URL:'https://auth.example',NEON_AUTH_JWKS_URL:'https://auth.example/jwks'};
 const load=new Function('module','require','process','URL',source);
 load(mod,name=>name==='pg'?{Pool}:name==='./app.cjs'?{createSharingApi:()=>async(_,res)=>{res.statusCode=401;res.end(JSON.stringify({error:'Unauthenticated'}))}}:(()=>{throw Error(name)})(),{env},URL);
 return {handler:mod.exports,resFactory,queries};
}
(async()=>{
 const valid=setup();const res=valid.resFactory();
 await valid.handler({method:'GET',url:'/api/sharing/health',headers:{origin:'https://rinshan0818-cpu.github.io'}},res);
 assert.equal(res.statusCode,200);assert.deepEqual(res.body,{ok:true,status:'db-connected'});
 assert.equal(res.headers['Access-Control-Allow-Origin'],'https://rinshan0818-cpu.github.io');
 assert(valid.queries.every(x=>!x.includes('sharing_users')&&!x.includes('sharing_snapshots')));
 const invalid=setup({login:'baken_sharing_owner',bypass:true});const r2=invalid.resFactory();
 await invalid.handler({method:'GET',url:'/api/sharing/health',headers:{}},r2);
 assert.equal(r2.statusCode,503);
 const down=setup({dbError:true});const r3=down.resFactory();
 await down.handler({method:'GET',url:'/api/sharing/health',headers:{}},r3);assert.equal(r3.statusCode,503);
 const forbidden=valid.resFactory();
 await valid.handler({method:'GET',url:'/api/sharing/health',headers:{origin:'https://evil.example'}},forbidden);
 assert.equal(forbidden.statusCode,403);
 const auth=valid.resFactory();
 await valid.handler({method:'GET',url:'/api/sharing/me',headers:{}},auth);assert.equal(auth.statusCode,401);
 console.log('PASS: health only trusts restricted DB role; no data or secrets returned; real routes still authenticated');
})().catch(e=>{console.error(e);process.exitCode=1});
