'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const main=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sync=fs.readFileSync(path.join(root,'app-next-results.js'),'utf8');
const worker=fs.readFileSync(path.join(root,'sw.js'),'utf8');

test('push opens a settlement reconciliation request, not an empty ticket destination',()=>{
 assert.match(worker,/\?open=settlement/);
 assert.match(worker,/BAKEN_OPEN_SETTLEMENT_FROM_NOTIFICATION/);
 assert.match(main,/bkNotificationLanding==='settlement'/);
 assert.match(main,/BAKEN_OPEN_SETTLEMENT_FROM_NOTIFICATION/);
});
test('settlement navigation is conditional on verified local tickets',()=>{
 assert.match(main,/b\.status==='pending'&&b\.officialReady===true&&!b\.machineProcessed/);
 assert.match(main,/bkWithTrustedNavigation\('payout'\)/);
 assert.match(main,/window\.BakenNotificationSettlementReady/);
});
test('late-loading account results module recovers notification intent',()=>{
 assert.match(main,/window\.BakenNotificationSettlementPending=/);
 assert.match(sync,/window\.BakenNotificationSettlementPending\?\.\(\)===true/);
 assert.match(sync,/window\.addEventListener\('baken:notification-settlement-requested'/);
 assert.match(sync,/lastData='';\s*fetchResults\(\)/);
});
test('receipt is never marked ready merely by clicking a notification',()=>{
 assert.doesNotMatch(worker,/officialReady|machineProcessed|keiba-demo-v1/);
 assert.match(sync,/const count=await window\.BakenImportVerifiedResults\(payload\)/);
 assert.match(sync,/finishNotification\(\)/);
 assert.match(sync,/notificationMessage\('通知は届きましたが、確定結果の取得に失敗しました/);
});
