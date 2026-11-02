const assert=require('node:assert/strict');const crypto=require('node:crypto');const {Readable}=require('node:stream');
const {createSharingApi}=require('../sharing-server/app.cjs');
const {publicKey,privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const env={SHARING_JWT_ISSUER:'https://issuer.example',SHARING_JWT_AUDIENCE:'baken-sharing',SHARING_JWT_PUBLIC_KEY:publicKey.export({type:'spki',format:'pem'})};
const db={query:async(sql,params)=>({rows:[{stake_yen:100,returned_yen:150,settled_ticket_count:1,purchased_race_count:1,hit_race_count:1,settled_race_count:1,max_payout_yen:150,updated_at:'now'}]})};
assert.throws(()=>createSharingApi({env:{},db}),/Verified authentication/);
const handler=createSharingApi({env,db});
const id='11111111-1111-4111-8111-111111111111';
const enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const now=Math.floor(Date.now()/1000);
const header=enc({alg:'RS256',typ:'JWT'}),payload=enc({iss:env.SHARING_JWT_ISSUER,aud:env.SHARING_JWT_AUDIENCE,sub:id,email_verified:true,iat:now,exp:now+60});
const signature=crypto.sign('RSA-SHA256',Buffer.from(header+'.'+payload),privateKey).toString('base64url');
async function request(auth){
 const req=Readable.from([]);req.url='/api/sharing/summary/'+id;req.method='GET';req.headers={authorization:auth};
 let body='';const res={setHeader(){},end(v){body=v},statusCode:200};
 await handler(req,res);return {status:res.statusCode,body:JSON.parse(body)};
}
(async()=>{
 assert.equal((await request('Bearer invalid')).status,401);
 const valid=await request('Bearer '+header+'.'+payload+'.'+signature);
 assert.equal(valid.status,200);assert.equal(valid.body.summary.profitYen,50);
 console.log('PASS: API composition rejects missing auth and verifies signed JWT before access');
})().catch(e=>{console.error(e);process.exitCode=1});
