'use strict';
// A dedicated, server-only endpoint for the JRA monitoring scheduler.
// This module has NO access to normal app DB pool, JWTs, tickets or balances.
const crypto=require('node:crypto');
const VENUES=new Set(['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉']);
const EXPECTED_ROLE='baken_monitor_scheduler';
function equalBearer(actual,secret){
 if(typeof actual!=='string'||typeof secret!=='string')return false;
 const a=crypto.createHash('sha256').update(actual).digest();
 const b=crypto.createHash('sha256').update('Bearer '+secret).digest();
 return crypto.timingSafeEqual(a,b);
}
function validateUnion(value){
 if(!Array.isArray(value)||value.length>36)throw Error('Invalid union size');
 const seen=new Set();
 return value.map(x=>{
  if(!x||Array.isArray(x)||Object.keys(x).sort().join(',')!=='date,raceNumber,venue'||
     typeof x.date!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(x.date)||
     !VENUES.has(x.venue)||!Number.isInteger(x.raceNumber)||
     x.raceNumber<1||x.raceNumber>12)throw Error('Invalid union target');
  const key=x.date+'|'+x.venue+'|'+x.raceNumber;
  if(seen.has(key))throw Error('Duplicate union target');
  seen.add(key);
  return {date:x.date,venue:x.venue,raceNumber:x.raceNumber};
 });
}
function createSchedulerUnionHttp({token,connect}){
 if(typeof token!=='string'||token.length<32||typeof connect!=='function')
  throw Error('Dedicated scheduler configuration required');
 return async(req,res)=>{
  const send=(status,body)=>{
   res.statusCode=status;
   res.setHeader('Cache-Control','no-store');
   res.setHeader('Content-Type','application/json; charset=utf-8');
   res.setHeader('X-Content-Type-Options','nosniff');
   return res.end(JSON.stringify(body));
  };
  if(req.method!=='GET')return send(405,{error:'Method not allowed'});
  // Never accept browser-origin or session-cookie credentials.
  if(req.headers?.origin||req.headers?.cookie)return send(403,{error:'Server access only'});
  if(!equalBearer(req.headers?.authorization,token)){
   return send(401,{error:'Unauthorized'});
  }
  let client;
  try{
   client=await connect();
   if(!client||typeof client.query!=='function'||typeof client.release!=='function')
    throw Error('No dedicated DB client');
   const roles=await client.query(`SELECT session_user AS login_role,current_user AS current_role,
     (SELECT rolsuper FROM pg_roles WHERE rolname=session_user) AS is_superuser,
     (SELECT rolbypassrls FROM pg_roles WHERE rolname=session_user) AS bypass_rls`);
   const role=roles.rows?.[0];
   if(role?.login_role!==EXPECTED_ROLE||role?.current_role!==EXPECTED_ROLE||
      role?.is_superuser!==false||role?.bypass_rls!==false)
    throw Error('Scheduler DB role not verified');
   const result=await client.query('SELECT public.bk_monitor_union_for_scheduler() AS targets');
   if(result.rows?.length!==1)throw Error('Invalid database union result');
   const races=validateUnion(result.rows[0].targets);
   return send(200,{schemaVersion:1,targets:races});
  }catch{
   return send(503,{error:'Scheduler unavailable'});
  }finally{
   if(client){try{client.release()}catch{}}
  }
 };
}
module.exports={createSchedulerUnionHttp,validateUnion};
