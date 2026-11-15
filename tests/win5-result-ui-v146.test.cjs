'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync('win5-purchase.js','utf8');
test('WIN5 result status is independent of settlement action',()=>{
 assert.match(src,/const ticketStateLabel=t=>/);
 assert.match(src,/不的中・精算待ち/);
 assert.match(src,/的中・公式払戻待ち/);
 assert.match(src,/const settle=node\('button','精算する'\)/);
 assert.doesNotMatch(src,/不的中を精算する/);
 assert.match(src,/outcome\.results\.forEach/);
 assert.match(src,/winners\.some\(n=>selections\.includes\(n\)\)/);
});
test('test and reset controls are folded and wallet summary remains visible',()=>{
 assert.match(src,/const management=node\('details'\)/);
 assert.match(src,/management\.append\(node\('summary','テスト・管理'\)\)/);
 assert.match(src,/managementBody\.append\(demoSwitch,trial,resetWallet\)/);
 assert.match(src,/body\.append\(head,walletPanel,note,sourceLink,management,jump,races,bar,history\)/);
 assert.ok(src.indexOf("const demoSwitch=node")<src.indexOf("managementBody.append(demoSwitch"));
});
test('reset remains guarded, never automatically runs',()=>{
 assert.match(src,/resetWallet\.onclick=\(\)=>\{/);
 assert.match(src,/const result=wallet\(\)\?\.reset\?\.\(\)/);
 assert.match(src,/if\(!window\.confirm\(/);
});
