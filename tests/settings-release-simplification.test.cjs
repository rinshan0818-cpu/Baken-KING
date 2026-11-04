'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('settings hides redundant season card while retaining its state node and backup actions',()=>{
 const s=fs.readFileSync('settings-surface.js','utf8');
 assert.match(s,/if\(season\)\{season\.hidden=true;season\.style\.display='none';\}/);
 assert.match(s,/controls\.append\(originalBackup,originalRestore,verifyButton,verifyFile\)/);
 assert.match(s,/groups\.data\.append\(exportPanel\)/);
});
test('friend administration can open inside settings, keeping same-origin friend session',()=>{
 const s=fs.readFileSync('settings-surface.js','utf8');
 assert.match(s,/bkFriendsInlineToggle/);
 assert.match(s,/bkFriendsInlineFrame/);
 assert.match(s,/frame\.src='\.\/friends\.html'/);
 assert.match(s,/frame\.title='友達管理'/);
});
test('notification actions are on/off without changing subscription APIs',()=>{
 const s=fs.readFileSync('app-next-push.js','utf8');
 assert.match(s,/enable\.textContent='通知をオン'/);
 assert.match(s,/disable\.textContent='通知をオフ'/);
 assert.match(s,/pushManager\.subscribe/);
 assert.match(s,/await sub\.unsubscribe\(\)/);
 assert.doesNotMatch(s,/enable\.textContent=sub\?'通知を更新'/);
});
