'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
test('settlement bottom-tab contains a small initially hidden badge',()=>{
 assert.match(html,/<button data-nav="payout">[\s\S]*?id="bkPayoutReadyBadge"[^>]*hidden[^>]*>!<\/span>/);
 assert.match(html,/\.bk-payout-ready-badge\[hidden\]\{display:none!important\}/);
});
test('badge reflects only officially ready, not-yet-processed current-season tickets',()=>{
 assert.match(html,/const ready=s\.bets\.filter\(b=>b\.season===s\.season&&b\.status==='pending'&&b\.officialReady===true&&!b\.machineProcessed\)\.length/);
 assert.match(html,/badge\.hidden=ready===0/);
});
test('badge updates on settlement rendering and saved ticket changes without altering tickets',()=>{
 assert.match(html,/function machineRender\(\)\{\s*bkUpdatePayoutReadyBadge\(\)/);
 assert.match(html,/localStorage\.setItem\(KEY,JSON\.stringify\(s\)\);\s*bkUpdatePayoutReadyBadge\(\);\s*render\(\)/);
});
