'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const proxy=fs.readFileSync(path.join(root,'api/auth/index.js'),'utf8');
const app=fs.readFileSync(path.join(root,'index.html'),'utf8');
const results=fs.readFileSync(path.join(root,'app-next-results.js'),'utf8');

test('cumulative verified result response is not rejected at legacy 20KB limit',()=>{
 assert.match(proxy,/const limit=isCards\?2000000:isResult\?1000000:20000/);
 assert.doesNotMatch(proxy,/if\(text\.length>\(isCards\?2000000:20000\)\)/);
});
test('result import filters for local pending wagers before checking unrelated finality',()=>{
 const start=app.indexOf('async function registerVerifiedResults(payload,automatic=false)');
 const end=app.indexOf('window.BakenImportVerifiedResults=',start);
 assert.ok(start>=0&&end>start);
 const section=app.slice(start,end);
 const loop=section.indexOf('for(const race of payload.races)');
 const match=section.indexOf('const rows=s.bets.filter',loop);
 const skip=section.indexOf('if(!rows.length)continue;',match);
 const validate=section.indexOf("if(race.status!=='final'",loop);
 assert.ok(loop>=0&&match>loop&&skip>match&&validate>skip,'unrelated past races must not gate live purchases');
});
test('result importer still marks ready only from complete verified payout data',()=>{
 const section=app.slice(app.indexOf('async function registerVerifiedResults('),app.indexOf('window.BakenImportVerifiedResults='));
 assert.match(section,/validTypes\.some\(t=>!race\.completeTypes\.includes\(t\)\)/);
 assert.match(section,/if\(race\.refunds\?\.length\)throw Error/);
 assert.match(section,/x\.bet\.officialReady=true/);
});
test('notification is not itself proof of settlement readiness',()=>{
 assert.match(results,/BakenImportVerifiedResults\(payload\)/);
 assert.match(results,/BakenNotificationSettlementReady/);
});
