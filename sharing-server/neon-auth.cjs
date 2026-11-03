'use strict';
// Neon Managed Better Auth: EdDSA / Ed25519 JWT validation.
// Server-only. JWKS URL and issuer/audience are pinned by trusted config.
const crypto=require('node:crypto');
function createNeonAuthenticator({authBaseUrl,jwksUrl,fetcher=globalThis.fetch,clock=()=>Math.floor(Date.now()/1000)}){
 const u=new URL(authBaseUrl),j=new URL(jwksUrl);
 if(u.protocol!=='https:'||j.protocol!=='https:'||j.origin!==u.origin||j.pathname!==u.pathname.replace(/\/$/,'')+'/.well-known/jwks.json')throw Error('Untrusted Neon configuration');
 if(typeof fetcher!=='function')throw Error('Fetch required');
 const issuer=u.origin;
 let cached=null,cacheUntil=0;
 function denied(){const e=Error('Unauthenticated');e.status=401;throw e}
 async function keys(now){
  if(cached&&now<cacheUntil)return cached;
  const response=await fetcher(j.href,{method:'GET',redirect:'error',signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw Error('JWKS unavailable');
  const json=await response.json();
  if(!Array.isArray(json?.keys)||json.keys.length>12)throw Error('Bad JWKS');
  cached=json.keys.filter(k=>k&&k.kty==='OKP'&&k.crv==='Ed25519'&&k.alg==='EdDSA'&&k.use!=='enc'&&typeof k.kid==='string'&&typeof k.x==='string');
  cacheUntil=now+300;return cached;
 }
 return async request=>{
  const raw=request?.headers?.authorization||request?.headers?.Authorization;
  if(typeof raw!=='string'||!/^Bearer [A-Za-z0-9._-]+$/.test(raw))denied();
  const pieces=raw.slice(7).split('.');
  if(pieces.length!==3||pieces.some(x=>!x||x.length>8192))denied();
  let h,p;
  try{h=JSON.parse(Buffer.from(pieces[0],'base64url'));p=JSON.parse(Buffer.from(pieces[1],'base64url'))}catch{denied()}
  if(h?.alg!=='EdDSA'||typeof h.kid!=='string'||!p||typeof p!=='object')denied();
  let ok=false;
  try{
   const k=(await keys(clock())).find(k=>k.kid===h.kid);
   if(k){const pub=crypto.createPublicKey({key:{kty:'OKP',crv:'Ed25519',x:k.x},format:'jwk'});ok=crypto.verify(null,Buffer.from(pieces[0]+'.'+pieces[1]),pub,Buffer.from(pieces[2],'base64url'))}
  }catch{denied()}
  if(!ok)denied();
  const now=clock();
  if(p.iss!==issuer||!(p.aud===issuer||(Array.isArray(p.aud)&&p.aud.includes(issuer))))denied();
  if(!Number.isSafeInteger(p.exp)||p.exp<=now||!Number.isSafeInteger(p.iat)||p.iat>now+60||p.exp-p.iat>3600)denied();
  if(p.nbf!==undefined&&(!Number.isSafeInteger(p.nbf)||p.nbf>now))denied();
  if(typeof p.sub!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.sub))denied();
  // No elevated DB access until email is verified. Neon uses camelCase.
  if(p.emailVerified!==true)denied();
  return {id:p.sub,emailVerified:true};
 };
}
module.exports={createNeonAuthenticator};
