const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {createJwtAuthenticator}=require('../sharing-server/jwt-auth.cjs');
const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const now=1793570400,issuer='https://auth.example.test',audience='baken-king-sharing';
const auth=createJwtAuthenticator({issuer,audience,publicKey,clock:()=>now});
function token(claims={},key=privateKey,alg='RS256'){
 const head=Buffer.from(JSON.stringify({alg,typ:'JWT'})).toString('base64url');
 const data=Buffer.from(JSON.stringify({iss:issuer,aud:audience,sub:'account_test_123',email_verified:true,exp:now+3600,iat:now,...claims})).toString('base64url');
 const sig=crypto.sign('RSA-SHA256',Buffer.from(head+'.'+data),key).toString('base64url');
 return head+'.'+data+'.'+sig;
}
const req=t=>({headers:{authorization:'Bearer '+t}});
(async()=>{
 assert.deepEqual(await auth(req(token())),{id:'account_test_123',emailVerified:true});
 for(const claims of [{iss:'https://evil.example'},{aud:'another-app'},{exp:now},{nbf:now+1},{iat:now+61},{email_verified:false},{sub:null}]){
  await assert.rejects(auth(req(token(claims))),/Unauthenticated/);
 }
 const other=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
 await assert.rejects(auth(req(token({},other.privateKey))),/Unauthenticated/);
 await assert.rejects(auth(req(token({},privateKey,'none'))),/Unauthenticated/);
 await assert.rejects(auth({headers:{}}),/Unauthenticated/);
 const original=token();
 const p=original.split('.');
 p[1]=Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(p[1],'base64url')),sub:'account_fake_123'})).toString('base64url');
 const broken=p.join('.');
 await assert.rejects(auth(req(broken)),/Unauthenticated/);
 console.log('PASS: signed JWT auth verifies issuer, audience, expiration, verified email, and RSA signature');
})().catch(e=>{console.error(e);process.exitCode=1});
