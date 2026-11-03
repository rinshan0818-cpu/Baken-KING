'use strict';
const UPSTREAM='https://ep-broad-sun-a1lsiagr.neonauth.ap-southeast-1.aws.neon.tech/baken_sharing/auth';
const ALLOW={GET:['get-session','probe'],POST:['sign-up/email','sign-in/email','sign-out']};
module.exports=async(req,res)=>{
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 const u=new URL(req.url,'https://probe.invalid'),route=u.searchParams.get('auth_route');
 if(!ALLOW[req.method]?.includes(route)){res.statusCode=404;return res.end(JSON.stringify({error:'Not found'}))}
 if(req.headers.host!=='baken-king-auth-probe.vercel.app'){res.statusCode=403;return res.end(JSON.stringify({error:'Wrong host'}))}
 if(req.headers.origin&&req.headers.origin!=='https://baken-king-auth-probe.vercel.app'){res.statusCode=403;return res.end(JSON.stringify({error:'Forbidden'}))}
 if(route==='probe'){return res.end(JSON.stringify({ok:true,hasCookie:Boolean(req.headers.cookie)}))}
 let body;
 if(req.method==='POST'){
  if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json')){res.statusCode=415;return res.end(JSON.stringify({error:'JSON required'}))}
  const parts=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>4096){res.statusCode=413;return res.end(JSON.stringify({error:'Too large'}))}parts.push(chunk)}
  body=Buffer.concat(parts);
 }
 try{
  const response=await fetch(UPSTREAM+'/'+route,{method:req.method,redirect:'manual',signal:AbortSignal.timeout(10000),headers:{Accept:'application/json',Origin:'https://baken-king-auth-probe.vercel.app',...(body?{'Content-Type':'application/json'}:{}),...(req.headers.cookie?{Cookie:req.headers.cookie}:{})},body});
  const cookies=typeof response.headers.getSetCookie==='function'?response.headers.getSetCookie():[];
  if(cookies.length)res.setHeader('Set-Cookie',cookies.map(cookie=>cookie.split(';').filter(p=>!p.trim().toLowerCase().startsWith('domain=')&&!p.trim().toLowerCase().startsWith('path=')&&!p.trim().toLowerCase().startsWith('samesite=')).join('; ')+'; Path=/api/auth; SameSite=Lax'));
  if(response.status>=300&&response.status<400){res.statusCode=502;return res.end(JSON.stringify({error:'Redirect not allowed'}))}
  res.statusCode=response.status;
  const content=await response.text();if(content.length>20000){res.statusCode=502;return res.end(JSON.stringify({error:'Oversized response'}))}
  return res.end(content);
 }catch{res.statusCode=502;return res.end(JSON.stringify({error:'Upstream unavailable'}))}
};