'use strict';
// Vercel Node entry point. Deliberately fails closed without all private env vars.
// Never deploy to GitHub Pages; env secrets belong ONLY to the Vercel project.
let handler,bootError;
const requireEnv=names=>names.every(name=>typeof process.env[name]==='string'&&process.env[name].trim()!=='');
function initialize(){
 const required=['SHARING_DATABASE_URL','SHARING_BACKUP_ENCRYPTION_KEY','NEON_AUTH_BASE_URL','NEON_AUTH_JWKS_URL'];
 if(process.env.SHARING_AUTH_PROVIDER!=='neon'||!requireEnv(required))return null;
 const {Pool}=require('pg');
 const {createSharingApi}=require('./app.cjs');
 const pool=new Pool({connectionString:process.env.SHARING_DATABASE_URL,max:3,connectionTimeoutMillis:5000,ssl:{rejectUnauthorized:true}});
 return createSharingApi({env:process.env,db:pool});
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
 return handler(req,res);
};
