'use strict';
const UPSTREAM='https://ep-curly-boat-a170oecz.neonauth.ap-southeast-1.aws.neon.tech/baken_sharing/auth';
const HOST='baken-king-account-bridge.vercel.app';
const ALLOWED={GET:['get-session'],POST:['sign-in/email','sign-out']};
const SHARING='https://baken-king-sharing-api.vercel.app';
const UUID='[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
function allowedSharing(method,route){
 if(method==='GET')return ['me','connections'].includes(route)||new RegExp('^summary/'+UUID+'
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 const url=new URL(req.url,'https://bridge.invalid');
 const route=url.searchParams.get('auth_route');
 const shareRoute=url.searchParams.get('sharing_route');
 const sharingMode=typeof shareRoute==='string'&&allowedSharing(req.method,shareRoute);
 if(!sharingMode&&!ALLOWED[req.method]?.includes(route)){res.statusCode=404;return res.end(JSON.stringify({error:'Not found'}))}
 if(req.headers.host!==HOST){res.statusCode=403;return res.end(JSON.stringify({error:'Host not allowed'}))}
 if(req.headers.origin&&req.headers.origin!=='https://'+HOST){res.statusCode=403;return res.end(JSON.stringify({error:'Forbidden'}))}
 // Mutations require a same-origin browser origin; reject cross-site form/CSRF.
 if(req.method!=='GET'&&req.headers.origin!=='https://'+HOST){res.statusCode=403;return res.end(JSON.stringify({error:'Origin required'}))}
 let body;
 if(req.method==='POST'){
  if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json')){res.statusCode=415;return res.end(JSON.stringify({error:'JSON required'}))}
  const chunks=[];let length=0;
  for await(const chunk of req){length+=chunk.length;if(length>4096){res.statusCode=413;return res.end(JSON.stringify({error:'Too large'}))}chunks.push(chunk)}
  body=Buffer.concat(chunks);
 }
 try{
  if(sharingMode){
   if(!req.headers.cookie){res.statusCode=401;return res.end(JSON.stringify({error:'Login required'}))}
   // Only an HttpOnly session cookie crosses from browser to this server.
   // The signed JWT is fetched and forwarded server-to-server, never exposed to JS.
   const auth=await fetch(UPSTREAM+'/token',{method:'GET',redirect:'error',signal:AbortSignal.timeout(8000),headers:{Cookie:req.headers.cookie,Accept:'application/json'}});
   if(!auth.ok){res.statusCode=401;return res.end(JSON.stringify({error:'Authentication required'}))}
   const tokenData=await auth.json();
   const jwt=tokenData?.token||tokenData?.data?.token||auth.headers.get('set-auth-jwt');
   if(typeof jwt!=='string'||jwt.split('.').length!==3||jwt.length>12000){res.statusCode=401;return res.end(JSON.stringify({error:'Signed token unavailable'}))}
   const upstream=await fetch(SHARING+'/api/sharing/'+shareRoute,{method:req.method,redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+jwt,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},body});
   const txt=await upstream.text();
   if(txt.length>20000){res.statusCode=502;return res.end(JSON.stringify({error:'Oversized API response'}))}
   res.statusCode=upstream.status;
   return res.end(txt);
  }
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
};,'i').test(route);
 if(method==='POST')return route==='profile'||route==='invitations'||new RegExp('^invitations/'+UUID+'/respond
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
};,'i').test(route);
 if(method==='DELETE')return new RegExp('^friends/'+UUID+'
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
};,'i').test(route);
 return false;
}

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