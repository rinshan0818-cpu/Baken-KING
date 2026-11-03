'use strict';
// Release guard for the independently uploaded baken-king-sharing-api project.
// Before deployment, assemble every file from the complete GitHub source (NOT
// from Vercel's get_deployment_file_contents API: it has returned truncated data).
// This verifier is read-only and does not load credentials or perform deployment.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const SOURCE_LENGTHS=Object.freeze({
 'api/index.js':713,
 'sharing-server/actor-transaction.cjs':2004,
 'sharing-server/app.cjs':1977,
 'sharing-server/friendship-store.cjs':5147,
 'sharing-server/http.cjs':5093,
 'sharing-server/jwt-auth.cjs':1863,
 'sharing-server/monitor-http.cjs':2338,
 'sharing-server/monitor-store.cjs':2274,
 'sharing-server/neon-auth.cjs':2753,
 'sharing-server/neon-store.cjs':3879,
 'sharing-server/private-backup-http.cjs':3758,
 'sharing-server/private-backup.cjs':4750,
 'sharing-server/restricted-app.cjs':2244,
 'sharing-server/scheduler-union-http.cjs':3183,
 'sharing-server/service.cjs':2600,
 'sharing-server/vercel-entry.cjs':3596
});
const required=[...Object.keys(SOURCE_LENGTHS),'vercel.json'];
// Compare to conservative source-size lower bounds; 1500-byte truncation is
// rejected even if a slice happens to parse as valid JavaScript.
function auditSharingSource({readFile}){
 if(typeof readFile!=='function')throw Error('Explicit source reader required');
 const checked=[];
 for(const name of required){
  const body=readFile(name);
  if(typeof body!=='string'||body.length===0)throw Error('Missing release file: '+name);
  if(name==='vercel.json'){
   const manifest=JSON.parse(body);
   if(manifest.version!==2||!Array.isArray(manifest.rewrites))throw Error('Unexpected Vercel route config');
   checked.push(name);continue;
  }
  const minimum=Math.floor(SOURCE_LENGTHS[name]*0.90);
  if(body.length<minimum)throw Error('Release source missing or truncated: '+name);
  new vm.Script('(function(require,module,exports){\n'+body+'\n})',{filename:name,timeout:1000});
  checked.push(name);
 }
 const server=readFile('sharing-server/vercel-entry.cjs');
 const gateway=readFile('api/index.js');
 const endpoint=readFile('sharing-server/scheduler-union-http.cjs');
 if(!server.includes("SHARING_SCHEDULER_DATABASE_URL")||
    !server.includes("SHARING_SCHEDULER_SERVICE_TOKEN")||
    !server.includes("require('./scheduler-union-http.cjs')")||
    !gateway.includes('scheduler-union')||
    !endpoint.includes("baken_monitor_scheduler")||
    !endpoint.includes("bypass_rls!==false"))
  throw Error('Dedicated scheduler API missing or security checks changed');
 return Object.freeze({ok:true,fileCount:checked.length,source:'full-local-files-only'});
}
if(require.main===module){
 const root=path.resolve(__dirname,'..');
 try{
  const result=auditSharingSource({readFile:filename=>fs.readFileSync(path.join(root,filename),'utf8')});
  process.stdout.write('Sharing source safety passed: '+result.fileCount+' files.\n');
 }catch(error){
  process.stderr.write('Sharing source safety failed: '+error.message+'\n');
  process.exitCode=1;
 }
}
module.exports={auditSharingSource,SOURCE_LENGTHS,required};
