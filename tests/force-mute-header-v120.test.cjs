'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const html=read('index.html'),chime=read('shared-settlement-chime.js'),legacy=read('push-notifications.js');
test('header offers explicit force-mute control beside settings gear',()=>{
 const header=html.slice(html.indexOf('<header class="top">'),html.indexOf('</header>'));
 assert.ok(header.indexOf('id="bkForceMute"')>=0);
 assert.ok(header.indexOf('id="bkForceMute"')<header.indexOf('data-nav="settings"'));
 assert.match(header,/aria-pressed="false"/);
});
test('mute persists and does not alter bets, credits or notification preferences',()=>{
 assert.match(html,/BK_FORCE_MUTE_KEY='baken-king-sound-force-off-v1'/);
 assert.match(html,/localStorage\.setItem\(BK_FORCE_MUTE_KEY,muted\?'on':'off'\)/);
 assert.match(html,/baken:force-mute-changed/);
});
test('chime is suppressed and currently playing sound stops on force mute',()=>{
 assert.match(chime,/if\(forcedOff\(\)\)\{audio\.pause\(\);audio\.currentTime=0;return\}/);
 assert.match(chime,/if\(!forcedOff\(\)&&enabled\.checked/);
 assert.match(chime,/baken:force-mute-changed/);
 assert.match(chime,/if\(event\.detail\?\.muted\)\{audio\.pause\(\);audio\.currentTime=0/);
 assert.match(legacy,/localStorage\.getItem\('baken-king-sound-force-off-v1'\)==='on'/);
});
