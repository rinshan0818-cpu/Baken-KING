'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const handler=require('../api/auth/index.js');
const HOST='baken-king-app-next.vercel.app';
const ADMIN='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
function response(){
 const result={status:0,body:'',headers:{}};
 return {result,setHeader(k,v){result.headers[k]=v;return this},end(body){result.body=body||'';return this},
  get statusCode(){return result.status},set statusCode(v){result.status=v}};
}
function req(route,opts={}){
 return {method:'GET',url:'/api/auth/index?auth_route='+route,
  headers:{host:HOST,...opts}};
}
async function withSession(user,check){
 const oldEnv=process.env.BK_ADMIN_USER_ID,oldFetch=global.fetch;
 process.env.BK_ADMIN_USER_ID=ADMIN;
 global.fetch=async url=>{
  assert.ok(String(url).endsWith('/auth/get-session'));
  return {ok:true,json:async()=>({user})};
 };
 try{await check()}finally{
  global.fetch=oldFetch;
  if(oldEnv===undefined)delete process.env.BK_ADMIN_USER_ID;
  else process.env.BK_ADMIN_USER_ID=oldEnv;
 }
}
test('admin endpoint fails closed without session cookies',async()=>{
 const res=response();
 await handler(req('admin'),res);
 assert.equal(res.result.status,401);
});
test('owner with verified session can access protected HTML',async()=>{
 await withSession({id:ADMIN,emailVerified:true},async()=>{
  const res=response();await handler(req('admin',{cookie:'session=fake-for-test'}),res);
  assert.equal(res.result.status,200);
  assert.match(res.result.headers['Content-Type'],/text\/html/);
  assert.match(res.result.headers['Content-Security-Policy'],/frame-ancestors 'none'/);
  assert.match(res.result.body,/管理者ページ/);
  const status=response();await handler(req('admin/status',{cookie:'session=fake-for-test'}),status);
  assert.deepEqual(JSON.parse(status.result.body),{ok:true,admin:true});
 });
});
test('other signed-in users and unverified users cannot view admin HTML',async()=>{
 for(const user of [{id:OTHER,emailVerified:true},{id:ADMIN,emailVerified:false}]){
  await withSession(user,async()=>{
   const res=response();await handler(req('admin',{cookie:'session=fake-for-test'}),res);
   assert.equal(res.result.status,403);
   assert.doesNotMatch(res.result.body,/管理者ページ/);
  });
 }
});
test('server admin access is unavailable when owner identity is unconfigured',async()=>{
 await withSession({id:ADMIN,emailVerified:true},async()=>{
  delete process.env.BK_ADMIN_USER_ID;
  const res=response();await handler(req('admin',{cookie:'session=fake-for-test'}),res);
  assert.equal(res.result.status,403);
 });
});
test('public settings hide all legacy diagnostic sections and test-mode controls',()=>{
 const script=fs.readFileSync('settings-surface.js','utf8');
 assert.match(script,/details\.hidden=true/);
 assert.match(script,/groups\.general\.prepend\(modePanel\)/);
 assert.ok(!script.includes('groups.admin.prepend(modePanel)'));
 const main=fs.readFileSync('index.html','utf8');
 assert.ok(main.includes("const KEY=IS_TEST_MODE?'baken-king-test-state-v1':'keiba-demo-v1'"));
 assert.ok(main.includes('data-bk-legacy-hidden="true"'));
 const admin=fs.readFileSync('admin-panel.js','utf8');
 assert.ok(admin.includes("localStorage.removeItem(TEST)"));
 assert.ok(!admin.includes("localStorage.removeItem(LIVE)"));
 assert.ok(!admin.includes("localStorage.clear("));
});

test('record deletion belongs exclusively to owner HTML and requires new authorization',async()=>{
 await withSession({id:ADMIN,emailVerified:true},async()=>{
  const res=response();await handler(req('admin',{cookie:'session=fake-for-test'}),res);
  assert.equal(res.result.status,200);
  assert.match(res.result.body,/id="clearProduction"/);
 });
 await withSession({id:OTHER,emailVerified:true},async()=>{
  const res=response();await handler(req('admin',{cookie:'session=fake-for-test'}),res);
  assert.equal(res.result.status,403);
  assert.doesNotMatch(res.result.body,/clearProduction/);
 });
 const main=fs.readFileSync('index.html','utf8');
 assert.doesNotMatch(main,/id="resetDemo"/);
 assert.doesNotMatch(main,/id="newSeason"/);
 const admin=fs.readFileSync('admin-panel.js','utf8');
 assert.ok(admin.includes("await verify(); // fresh server authorization"));
 assert.ok(admin.includes("entered!==phrase"));
 assert.ok(admin.includes("localStorage.setItem(LIVE,JSON.stringify(initialWallet()))"));
 assert.ok(!admin.includes('localStorage.clear('));
});

test('administrator operations panel separates API checks from unverified scheduler runs',()=>{
 const page=require('../api/auth/admin-page.cjs').HTML;
 const script=fs.readFileSync('admin-panel.js','utf8');
 for(const id of ['operationOverview','opsAuthBadge','opsCardsBadge','opsResultsBadge','opsMonitorBadge','opsCheckedAt'])
  assert.ok(page.includes('id="'+id+'"'),'Missing operations indicator: '+id);
 assert.match(page,/5分監視の実行履歴/);
 assert.match(page,/GitHub Actionsの実行履歴を読み込みます/);
 for(const path of ['/api/auth/friends/race-cards','/api/auth/friends/verified-results','/api/auth/friends/monitor-targets'])
  assert.ok(script.includes(path),'Missing read-only check: '+path);
 assert.ok(script.includes("method:'GET'")===false,'GET is the implicit read-only method');
 assert.ok(!script.includes("localStorage.removeItem(LIVE)"));
});

test('monitor execution history is read-only and describes actual workflow evidence',()=>{
 const page=require('../api/auth/admin-page.cjs').HTML;
 const admin=fs.readFileSync('admin-panel.js','utf8');
 const api=fs.readFileSync('api/auth/index.js','utf8');
 for(const id of ['opsRunBadge','opsLastRun','opsLastSuccess','opsLastError'])assert.ok(page.includes('id="'+id+'"'));
 assert.match(page,/ワークフローの成功はJRA結果の取得成功とは限りません/);
 assert.match(admin,/checkMonitorHistory/);
 assert.match(admin,/履歴取得不可/);
 assert.match(api,/adminMonitorStatus/);
 assert.match(api,/if\(adminPage\|\|adminStatus\|\|adminMonitorStatus\)/);
});
