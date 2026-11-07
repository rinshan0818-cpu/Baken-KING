'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const s=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
test('ON and OFF use distinct iconography and a visible state label',()=>{
 assert.match(s,/class="bk-sound-icon-on"/);
 assert.match(s,/class="bk-sound-icon-off"/);
 assert.match(s,/class="bk-sound-state-label" aria-hidden="true">ON<\/span>/);
 assert.match(s,/\.bk-sound-mute-trigger\.is-muted \.bk-sound-icon-on\{display:none\}/);
 assert.match(s,/\.bk-sound-mute-trigger\.is-muted \.bk-sound-icon-off\{display:inline\}/);
});
test('actual button display follows persistent forced-mute preference',()=>{
 assert.match(s,/bkForceMuteButton\.classList\.toggle\('is-muted',muted\)/);
 assert.match(s,/stateLabel\.textContent=muted\?'OFF':'ON'/);
 assert.match(s,/bkForceMuteButton\.setAttribute\('aria-pressed',String\(muted\)\)/);
 assert.match(s,/const BK_FORCE_MUTE_KEY='baken-king-sound-force-off-v1'/);
});
