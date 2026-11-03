'use strict';
// Build the separate Vercel sharing API deployment from audited GitHub files.
// NEVER use Vercel's truncated deployment file-content API as a source.
const fs=require('node:fs');
const path=require('node:path');
const {auditSharingSource,required}=require('./check-sharing-release.cjs');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'dist','sharing-api');
const readFile=name=>fs.readFileSync(path.join(root,name),'utf8');
const audited=auditSharingSource({readFile});
const packageJson=JSON.parse(readFile('deployment/sharing-api-package.json'));
if(packageJson.name!=='baken-king-sharing-api'||
   packageJson.dependencies?.pg!=='^8.13.0'||
   packageJson.private!==true)throw Error('Unexpected sharing API package manifest');
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
for(const file of required){
 const destination=path.join(out,file);
 fs.mkdirSync(path.dirname(destination),{recursive:true});
 fs.writeFileSync(destination,readFile(file),'utf8');
}
fs.writeFileSync(path.join(out,'package.json'),JSON.stringify(packageJson,null,2)+'\n','utf8');
const rebuilt=auditSharingSource({readFile:name=>fs.readFileSync(path.join(out,name),'utf8')});
const generated=required.length+1;
if(!audited.ok||!rebuilt.ok||rebuilt.fileCount!==17||generated!==18)
 throw Error('Sharing API build rejected: source integrity validation failed');
process.stdout.write('Built checked sharing API: '+generated+' files at dist/sharing-api (no credentials).\n');
