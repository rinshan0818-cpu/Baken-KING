'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
test('race card feed is account scoped and preserves local data on missing feed',()=>{
 const cards=read('app-next-cards.js');
 assert.match(cards,/\/api\/auth\/friends\/race-cards/);
 assert.match(cards,/response\.status===404/);
 assert.match(cards,/BakenImportAuthorizedCards\(data\)/);
 assert.doesNotMatch(cards,/localStorage\.clear\(/);
});
test('registered target must never be presented as verified live JRA monitoring',()=>{
 const monitor=read('app-next-monitor.js');
 assert.match(monitor,/\/api\/auth\/friends\/monitor-targets/);
 assert.match(monitor,/method:'POST'/);
 assert.match(monitor,/data\.registered!==targets\.length/);
 assert.match(monitor,/JRA監視への引き渡しは別途確認/);
 assert.doesNotMatch(monitor,/共通JRA監視に接続済み/);
});
test('result feed only checks while pending and signals new settled-ready tickets',()=>{
 const results=read('app-next-results.js');
 assert.match(results,/hasPendingWagers\(\)/);
 assert.match(results,/\/api\/auth\/friends\/verified-results/);
 assert.match(results,/BakenImportVerifiedResults\(payload\)/);
 assert.match(results,/if\(count>0\)window\.dispatchEvent\(new CustomEvent\('baken:new-settlement-ready'/);
 assert.match(results,/const ACTIVE_MS=60\*1000/);
});
test('in-app chime is based on newly ready tickets and foreground state only',()=>{
 const chime=read('shared-settlement-chime.js');
 assert.match(chime,/baken:new-settlement-ready/);
 assert.match(chime,/document\.visibilityState==='visible'/);
 assert.match(chime,/Number\(event\.detail\?\.count\)>0/);
 assert.match(chime,/enabled\.checked/);
});
test('web push is distinct from in-app chime and depends on user subscription',()=>{
 const push=read('app-next-push.js'),sw=read('sw.js');
 assert.match(push,/\/api\/auth\/friends\/push-subscriptions/);
 assert.match(push,/pushManager\.subscribe/);
 assert.match(sw,/addEventListener\('push'/);
 assert.match(sw,/showNotification/);
});
