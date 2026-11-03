'use strict';
// Vercel Node entry point. Deliberately fails closed without all private env vars.
// Never deploy to GitHub Pages; env secrets belong ONLY to the Vercel project.
let handler,bootError,healthPool;
const requireEnv=names=>names.every(name=>typeof process.env[name]==='string'&&process.env[name].trim()!=='');
function initialize(){
 const required=['SHARING_DATABASE_URL','NEON_AUTH_BASE_URL','NEON_AUTH_JWKS_URL'];
 // Personal account backups are a separate, opt-in feature. They remain
 // unavailable until SHARING_BACKUP_ENCRYPTION_KEY is configured.
 if(process.env.SHARING_AUTH_PROVIDER!=='neon'||!requireEnv(required))return null;
 const {Pool}=require('pg');
 const {createSharingApi}=require('./app.cjs');
 const pool=new Pool({connectionString:process.env.SHARING_DATABASE_URL,max:3,connectionTimeoutMillis:5000,ssl:{rejectUnauthorized:true}});
 const api=createSharingApi({env:process.env,db:pool});
 healthPool=pool;
 return api;
}
module.exports=async function vercelHandler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(!handler&&!bootError){
  try{handler=initialize()}catch(e){bootError=e}
 }
 if(!handler){
  res.statusCode=503;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  return res.end(JSON.stringify({ok:false,error:'Sharing API is not configured'}));
 }
 if(req.method==='GET'&&new URL(req.url,'https://baken.invalid').pathname==='/api/sharing/health'){
  const origin=req.headers?.origin;
  if(origin&&origin!=='https://rinshan0818-cpu.github.io'){
   res.statusCode=403;return res.end(JSON.stringify({ok:false}));
  }
  if(origin)res.setHeader('Access-Control-Allow-Origin',origin);
  try{
   // No actor context or user data is queried. Health only confirms the
   // restricted login (never a Neon admin/BYPASSRLS credential).
   const {rows}=await healthPool.query(`SELECT session_user AS login,
    (SELECT rolbypassrls FROM pg_roles WHERE rolname=session_user) AS bypass`);
   const healthy=rows[0]?.login==='baken_sharing_limited'&&rows[0]?.bypass===false;
   res.statusCode=healthy?200:503;
   res.setHeader('Content-Type','application/json; charset=utf-8');
   return res.end(JSON.stringify({ok:healthy,status:healthy?'db-connected':'unavailable'}));
  }catch{
   res.statusCode=503;res.setHeader('Content-Type','application/json; charset=utf-8');
   return res.end(JSON.stringify({ok:false,status:'unavailable'}));
  }
 }
 return handler(req,res);
};
