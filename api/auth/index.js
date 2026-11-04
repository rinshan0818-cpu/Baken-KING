'use strict';
const AUTH='https://ep-curly-boat-a170oecz.neonauth.ap-southeast-1.aws.neon.tech/baken_sharing/auth';
const SHARING='https://baken-king-sharing-api.vercel.app';
const VERIFIED='https://baken-king-monitor-bridge.vercel.app/api/account-verified-results';
const CARDS='https://baken-king-monitor-bridge.vercel.app/api/account-race-cards';
const ACCOUNT_PUSH='https://baken-king-monitor-bridge.vercel.app/api/account-push-subscriptions';
const HOST='baken-king-app-next.vercel.app';
const ADMIN_PAGE=require('./admin-page.cjs').HTML;
const authRoutes={GET:['get-session'],POST:['sign-in/email','sign-out']};
const uuid='[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
function allowSharing(method,route){
 if(method==='GET')return route==='me'||route==='connections'||route==='monitor-targets'||new RegExp('^summary/'+uuid+'$','i').test(route);
 if(method==='POST')return route==='profile'||route==='summary'||route==='monitor-targets'||route==='invitations'||new RegExp('^invitations/'+uuid+'/respond$','i').test(route);
 if(method==='DELETE')return new RegExp('^friends/'+uuid+'$','i').test(route);
 return false;
}
function respond(res,status,body){res.statusCode=status;res.end(JSON.stringify(body))}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','no-referrer');
 const u=new URL(req.url,'https://bridge.invalid');
 const route=u.searchParams.get('auth_route');
 const friend=u.searchParams.get('sharing_route');
 const isResult=req.method==='GET'&&friend==='verified-results';
 const adminPage=req.method==='GET'&&route==='admin';
 const adminStatus=req.method==='GET'&&route==='admin/status';
 const isCards=req.method==='GET'&&friend==='race-cards';
 const isPush=['GET','POST','DELETE'].includes(req.method)&&friend==='push-subscriptions';
 const isFriend=typeof friend==='string'&&allowSharing(req.method,friend);
 if(!isFriend&&!isResult&&!isCards&&!isPush&&!adminPage&&!adminStatus&&!authRoutes[req.method]?.includes(route))return respond(res,404,{error:'Not found'});
 if(req.headers.host!==HOST)return respond(res,403,{error:'Forbidden'});
 if(req.headers.origin&&req.headers.origin!=='https://'+HOST)return respond(res,403,{error:'Forbidden'});
 // POST and DELETE are never accepted as cross-origin requests.
 if(req.method!=='GET'&&req.headers.origin!=='https://'+HOST)return respond(res,403,{error:'Origin required'});
 let body;
 if(req.method==='POST'||(isPush&&req.method==='DELETE')){
  if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return respond(res,415,{error:'JSON required'});
  const parts=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>4096)return respond(res,413,{error:'Too large'});parts.push(chunk)}
  body=Buffer.concat(parts);
 }
 try{
  if(adminPage||adminStatus){
   if(!req.headers.cookie)return respond(res,401,{error:'Login required'});
   const session=await fetch(AUTH+'/get-session',{
    method:'GET',redirect:'error',signal:AbortSignal.timeout(8000),
    headers:{Cookie:req.headers.cookie,Accept:'application/json'}
   });
   if(!session.ok)return respond(res,401,{error:'Login required'});
   const data=await session.json();
   const user=data?.user||data?.data?.user;
   const expected=process.env.BK_ADMIN_USER_ID;
   if(typeof expected!=='string'||!/^[0-9a-f-]{36}$/i.test(expected)||
      !user||user.emailVerified!==true||user.id!==expected)
    return respond(res,403,{error:'Forbidden'});
   if(adminStatus)return respond(res,200,{ok:true,admin:true});
   res.setHeader('Content-Type','text/html; charset=utf-8');
   res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
   res.statusCode=200;
   return res.end(ADMIN_PAGE);
  }
  if(isFriend||isResult||isCards||isPush){
   if(!req.headers.cookie)return respond(res,401,{error:'Login required'});
   const tokenResponse=await fetch(AUTH+'/token',{method:'GET',redirect:'error',signal:AbortSignal.timeout(8000),headers:{Cookie:req.headers.cookie,Accept:'application/json'}});
   if(!tokenResponse.ok)return respond(res,401,{error:'Login required'});
   const data=await tokenResponse.json();
   const jwt=data?.token||data?.data?.token||tokenResponse.headers.get('set-auth-jwt');
   if(typeof jwt!=='string'||jwt.split('.').length!==3||jwt.length>12000)return respond(res,401,{error:'Verified JWT unavailable'});
   const upstream=await fetch(isResult?VERIFIED:isCards?CARDS:isPush?ACCOUNT_PUSH:SHARING+'/api/sharing/'+friend,{
    method:req.method,redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{Authorization:'Bearer '+jwt,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},body
   });
   const text=await upstream.text();
   if(text.length>(isCards?2000000:20000))return respond(res,502,{error:'Oversized upstream response'});
   res.statusCode=upstream.status;
   return res.end(text);
  }
  const response=await fetch(AUTH+'/'+route,{
   method:req.method,redirect:'manual',signal:AbortSignal.timeout(10000),
   headers:{Accept:'application/json',Origin:'https://'+HOST,...(body?{'Content-Type':'application/json'}:{}),...(req.headers.cookie?{Cookie:req.headers.cookie}:{})},body
  });
  if(response.status>=300&&response.status<400)return respond(res,502,{error:'Unexpected redirect'});
  const cookies=typeof response.headers.getSetCookie==='function'?response.headers.getSetCookie():[];
  if(cookies.length)res.setHeader('Set-Cookie',cookies.map(cookie=>{
   const parts=cookie.split(';').map(v=>v.trim()).filter(v=>v&&!['domain=','path=','samesite='].some(prefix=>v.toLowerCase().startsWith(prefix)));
   return parts.join('; ')+'; Path=/api/auth; SameSite=Lax; Secure; HttpOnly';
  }));
  const text=await response.text();
  if(text.length>20000)return respond(res,502,{error:'Oversized response'});
  res.statusCode=response.status;
  return res.end(text);
 }catch{
  return respond(res,502,{error:'Service unavailable'});
 }
};
