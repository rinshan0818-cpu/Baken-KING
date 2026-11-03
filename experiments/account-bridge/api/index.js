'use strict';
const UPSTREAM='https://ep-curly-boat-a170oecz.neonauth.ap-southeast-1.aws.neon.tech/baken_sharing/auth';
const HOST='baken-king-account-bridge.vercel.app';
const ALLOWED={GET:['get-session'],POST:['sign-in/email','sign-out']};
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 const url=new URL(req.url,'https://bridge.invalid');
 const route=url.searchParams.get('auth_route');
 if(!ALLOWED[req.method]?.includes(route)){res.statusCode=404;return res.end(JSON.stringify({error:'Not found'}))}
 if(req.headers.host!==HOST){res.statusCode=403;return res.end(JSON.stringify({error:'Host not allowed'}))}
 if(req.headers.origin&&req.headers.origin!=='https://'+HOST){res.statusCode=403;return res.end(JSON.stringify({error:'Forbidden'}))}
 let body;
 if(req.method==='POST'){
  if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json')){res.statusCode=415;return res.end(JSON.stringify({error:'JSON required'}))}
  const chunks=[];let length=0;
  for await(const chunk of req){length+=chunk.length;if(length>4096){res.statusCode=413;return res.end(JSON.stringify({error:'Too large'}))}chunks.push(chunk)}
  body=Buffer.concat(chunks);
 }
 try{
  const response=await fetch(UPSTREAM+'/'+route,{method:req.method,redirect:'manual',signal:AbortSignal.timeout(10000),
   headers:{Accept:'application/json',Origin:'https://'+HOST,...(body?{'Content-Type':'application/json'}:{}),...(req.headers.cookie?{Cookie:req.headers.cookie}:{})},body});
  if(response.status>=300&&response.status<400){res.statusCode=502;return res.end(JSON.stringify({error:'Unexpected redirect'}))}
  const cookies=typeof response.headers.getSetCookie==='function'?response.headers.getSetCookie():[];
  if(cookies.length)res.setHeader('Set-Cookie',cookies.map(cookie=>{
   const parts=cookie.split(';').map(x=>x.trim()).filter(x=>x&&!['domain=','path=','samesite='].some(k=>x.toLowerCase().startsWith(k)));
   return parts.join('; ')+'; Path=/api/auth; SameSite=Lax; Secure; HttpOnly';
  }));
  const text=await response.text();if(text.length>20000){res.statusCode=502;return res.end(JSON.stringify({error:'Response too large'}))}
  res.statusCode=response.status;return res.end(text);
 }catch{res.statusCode=502;return res.end(JSON.stringify({error:'Auth service unavailable'}))}
};