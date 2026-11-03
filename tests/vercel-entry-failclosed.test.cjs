const assert=require('node:assert/strict');
const handler=require('../sharing-server/vercel-entry.cjs');
(async()=>{
 const keys=['SHARING_AUTH_PROVIDER','SHARING_DATABASE_URL','SHARING_BACKUP_ENCRYPTION_KEY','NEON_AUTH_BASE_URL','NEON_AUTH_JWKS_URL'];
 const before=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{
  for(const k of keys)delete process.env[k];
  const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},end(body){this.body=JSON.parse(body)}};
  await handler({url:'/api/account/backup',method:'GET'},res);
  assert.equal(res.statusCode,503);
  assert.equal(res.body.error,'Sharing API is not configured');
  assert(!JSON.stringify(res.body).includes('DATABASE_URL'));
  console.log('PASS: Vercel sharing endpoint stays disabled without private credentials');
 }finally{for(const k of keys){if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k]}}
})().catch(e=>{console.error(e);process.exitCode=1});
