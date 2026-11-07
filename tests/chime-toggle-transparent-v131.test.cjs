'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
test('sound toggle is transparent in all states, including muted and pressed',()=>{
 for(const selector of ['#bkForceMute,','#bkForceMute.is-muted,','#bkForceMute:hover,','#bkForceMute:active{']){
  assert.ok(source.includes(selector), 'missing selector '+selector);
 }
 assert.match(source,/\.bk-top-inner #bkForceMute:active\{\s*background:transparent!important;\s*background-color:transparent!important;\s*box-shadow:none!important/);
});
test('ON and OFF still have distinct visuals without colors',()=>{
 assert.match(source,/class="bk-sound-icon-on"/);
 assert.match(source,/class="bk-sound-icon-off"/);
 assert.match(source,/stateLabel\.textContent=muted\?'OFF':'ON'/);
});
