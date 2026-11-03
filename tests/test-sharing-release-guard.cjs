'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {auditSharingSource,required}=require('../scripts/check-sharing-release.cjs');
const root=path.resolve(__dirname,'..');
const baseline=new Map(required.map(name=>[name,fs.readFileSync(path.join(root,name),'utf8')]));
const audit=patch=>auditSharingSource({readFile:name=>patch?.has(name)?patch.get(name):baseline.get(name)});
test('entire source tree passes the sharing-service deployment guard',()=>{
 const result=audit();
 assert.equal(result.ok,true);
 assert.equal(result.fileCount,17);
});
test('rejects 1500-byte truncated scheduler and normal-sharing entry points',()=>{
 for(const name of ['sharing-server/vercel-entry.cjs','sharing-server/scheduler-union-http.cjs',
  'sharing-server/app.cjs','sharing-server/monitor-http.cjs']){
  const broken=new Map([[name,baseline.get(name).slice(0,1500)]]);
  assert.throws(()=>audit(broken),/truncated|Unexpected|missing/);
 }
});
test('rejects any missing dependency, not just the new scheduler files',()=>{
 assert.throws(()=>audit(new Map([['sharing-server/http.cjs',undefined]])),/Missing release file/);
});
test('rejects an invalid JavaScript source even when not truncated',()=>{
 const p='sharing-server/vercel-entry.cjs';
 const value=baseline.get(p);
 const broken=value.slice(0,-1)+'???';
 assert.throws(()=>audit(new Map([[p,broken]])),SyntaxError);
});
test('rejects scheduler role guard removal',()=>{
 const p='sharing-server/scheduler-union-http.cjs';
 const broken=baseline.get(p).replace('bypass_rls!==false','bypass_rls===false');
 assert.throws(()=>audit(new Map([[p,broken]])),/security checks/);
});
