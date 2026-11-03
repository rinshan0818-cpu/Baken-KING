'use strict';
// Server-only JWT verifier. Pin the expected public signing key, issuer, audience.
// No discovery/network access or untrusted key URL from JWT header.
const crypto=require('node:crypto');
function createJwtAuthenticator({issuer,audience,publicKey,clock=()=>Math.floor(Date.now()/1000)}){
 if(typeof issuer!=='string'||!issuer||typeof audience!=='string'||!audience||!publicKey)throw Error('JWT configuration required');
 // Node.js 24 no longer accepts an already-public KeyObject via createPublicKey.
 // Accept only a public KeyObject or material from which a public key can be parsed.
 if(publicKey instanceof crypto.KeyObject && publicKey.type!=='public')
  throw Error('JWT verifier requires a public signing key');
 const key=publicKey instanceof crypto.KeyObject ? publicKey : crypto.createPublicKey(publicKey);
 function invalid(){const e=new Error('Unauthenticated');e.status=401;throw e}
 return async function authenticate(request){
  const auth=request?.headers?.authorization||request?.headers?.Authorization;
  if(typeof auth!=='string'||!/^Bearer [A-Za-z0-9_\-.]+$/.test(auth))invalid();
  const token=auth.slice(7),parts=token.split('.');
  if(parts.length!==3||parts.some(p=>!p||p.length>8192))invalid();
  let header,claims;
  try{
   header=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));
   claims=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
  }catch{invalid()}
  if(!header||header.alg!=='RS256'||header.typ!=='JWT'||!claims||typeof claims!=='object')invalid();
  const verified=crypto.verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),key,Buffer.from(parts[2],'base64url'));
  if(!verified)invalid();
  const now=clock();
  if(claims.iss!==issuer||!(claims.aud===audience||(Array.isArray(claims.aud)&&claims.aud.includes(audience))))invalid();
  if(!Number.isSafeInteger(claims.exp)||claims.exp<=now||!Number.isSafeInteger(claims.iat)||claims.iat>now+60)invalid();
  if(claims.nbf!==undefined&&(!Number.isSafeInteger(claims.nbf)||claims.nbf>now))invalid();
  if(typeof claims.sub!=='string'||!claims.sub||claims.email_verified!==true)invalid();
  return {id:claims.sub,emailVerified:true};
 };
}
module.exports={createJwtAuthenticator};
