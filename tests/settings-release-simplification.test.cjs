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

test('test-mode ticket creation is reachable outside hidden admin diagnostics',()=>{
 const surface=fs.readFileSync('settings-surface.js','utf8');
 const html=fs.readFileSync('index.html','utf8');
 assert.match(surface,/groups\.general\.prepend\(modePanel\)/);
 assert.doesNotMatch(surface,/groups\.admin\.prepend\(modePanel\)/);
 assert.match(surface,/if\(testing\)\{/);
 assert.match(surface,/create\.textContent='テスト馬券を4枚作成'/);
 assert.match(surface,/window\.BakenCreateDemoTickets\(\)/);
 assert.match(html,/window\.BakenCreateDemoTickets=\(\)=>\{/);
 assert.match(html,/if\(!IS_TEST_MODE\)return false/);
 assert.match(surface,/details\.open=section\.open/);
 assert.match(surface,/id:'general'.*open:true/);
});
