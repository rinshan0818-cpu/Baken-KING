const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {createNeonAuthenticator}=require('../sharing-server/neon-auth.cjs');
const {publicKey,privateKey}=crypto.generateKeyPairSync('ed25519');
const jwk=publicKey.export({format:'jwk'}),base='https://auth.example.test/db/auth';
const auth=createNeonAuthenticator({authBaseUrl:base,jwksUrl:base+'/.well-known/jwks.json',clock:()=>10000,fetcher:async()=>({ok:true,json:async()=>({keys:[{...jwk,kid:'key1',alg:'EdDSA',use:'sig'}]})})});
const authNoAlg=createNeonAuthenticator({authBaseUrl:base,jwksUrl:base+'/.well-known/jwks.json',clock:()=>10000,fetcher:async()=>({ok:true,json:async()=>({keys:[{...jwk,kid:'key1',use:'sig'}]})})});
const authBadAlg=createNeonAuthenticator({authBaseUrl:base,jwksUrl:base+'/.well-known/jwks.json',clock:()=>10000,fetcher:async()=>({ok:true,json:async()=>({keys:[{...jwk,kid:'key1',alg:'RS256',use:'sig'}]})})});
const encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const payload={iss:'https://auth.example.test',aud:'https://auth.example.test',sub:'11111111-1111-4111-8111-111111111111',emailVerified:true,iat:9900,exp:10100};
function token(claims=payload,head={alg:'EdDSA',kid:'key1'}){const body=encode(head)+'.'+encode(claims);return body+'.'+crypto.sign(null,Buffer.from(body),privateKey).toString('base64url')}
const req=t=>({headers:{authorization:'Bearer '+t}});
(async()=>{
 assert.equal((await auth(req(token()))).id,payload.sub);
 assert.equal((await authNoAlg(req(token()))).id,payload.sub);
 await assert.rejects(authBadAlg(req(token())),/Unauthenticated/);
 await assert.rejects(auth(req(token({...payload,emailVerified:false}))),/Unauthenticated/);
 await assert.rejects(auth(req(token({...payload,exp:9999}))),/Unauthenticated/);
 await assert.rejects(auth(req(token({...payload,aud:'other'}))),/Unauthenticated/);
 await assert.rejects(auth(req(token({...payload,sub:'forged'}))),/Unauthenticated/);
 await assert.rejects(auth(req(token(payload,{alg:'RS256',kid:'key1'}))),/Unauthenticated/);
 const broken=token().split('.');broken[1]=encode({...payload,sub:'22222222-2222-4222-8222-222222222222'});
 await assert.rejects(auth(req(broken.join('.'))),/Unauthenticated/);
 assert.throws(()=>createNeonAuthenticator({authBaseUrl:base,jwksUrl:'https://evil.example/jwks'}),/Untrusted/);
 console.log('PASS: Neon Auth EdDSA JWKS checks signature, issuer, audience, expiry, identity and verified email');
})().catch(e=>{console.error(e);process.exitCode=1});
