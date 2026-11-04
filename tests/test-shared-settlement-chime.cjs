'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('shared user chime is fixed to one MP3 and no uploads or per-user audio database',()=>{
 const script=fs.readFileSync('shared-settlement-chime.js','utf8');
 const legacy=fs.readFileSync('push-notifications.js','utf8');
 const loader=fs.readFileSync('app-next-monitor.js','utf8');
 assert.ok(script.includes("new Audio('./settlement-chime.mp3')"));
 assert.ok(script.includes("'baken:new-settlement-ready'"));
 assert.ok(script.includes("localStorage.getItem('baken-king-mode-v1')==='test'"));
 assert.ok(!script.includes("type='file'"));
 assert.ok(!script.includes('indexedDB'));
 assert.ok(!script.includes('MONITOR_DEVICE_TOKEN'));
 assert.ok(loader.includes('shared-settlement-chime.js'));
 assert.ok(legacy.includes("location.hostname!=='baken-king-app-next.vercel.app'&&localStorage.getItem(CHIME_KEY)"));
});
test('notification sound and iOS Web Push remain independent',()=>{
 const script=fs.readFileSync('shared-settlement-chime.js','utf8');
 assert.ok(script.includes("document.visibilityState==='visible'"));
 assert.ok(script.includes('iPhone側の設定'));
 assert.ok(script.includes('音源は全ユーザー共通'));
});
