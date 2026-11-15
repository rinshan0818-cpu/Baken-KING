'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync('win5-purchase.js','utf8');
const history=src.slice(src.indexOf('const wasOpen=history.open'),src.indexOf('dateSelect.onchange='));
const reveal=src.slice(src.indexOf('function showStepSettlement(ticket){'),src.indexOf('function showTicket(ticket){'));
test('digital WIN5 ticket is offered first inside purchase record',()=>{
 const start=history.indexOf("box.append(node('strong',t.date");
 const ticket=history.indexOf("const show=node('button','デジタル投票券を見る')",start);
 const outcome=history.indexOf("const stateLabel=node",start);
 const picks=history.indexOf("const picksDetail=node",start);
 assert(start>=0&&ticket>start&&ticket<outcome&&outcome<picks);
});
test('unsettled WIN5 results are not spoiled in the purchase history',()=>{
 assert.match(history,/readyToSettle\?'結果確定・判定を確認':ticketStateLabel\(t\)/);
 assert.match(history,/if\(settledReveal&&t\.win5Evaluation\?\.complete===true\)/);
 assert.match(src,/ticket\.status==='pending'&&ticket\.win5Evaluation\?\.complete===true\?'結果確定・判定待ち'/);
});
test('WIN5 legs auto reveal at timed intervals; only final confirmation changes wallet',()=>{
 assert.match(reveal,/const INTERVAL_MS=1250/);
 assert.match(reveal,/function advance\(\)\{/);
 assert.match(reveal,/timer=setTimeout\(advance,INTERVAL_MS\)/);
 assert.match(reveal,/timer=setTimeout\(advance,500\)/);
 assert.match(reveal,/skip\.onclick=\(\)=>\{/);
 assert.match(reveal,/results\.append\(buildRow\(step\)\)/);
 assert.match(reveal,/step\+\+/);
 assert.match(reveal,/if\(step===5\)\{showFinal\(\);return\}/);
 assert.match(reveal,/finish\.onclick=\(\)=>\{/);
 assert.match(reveal,/if\(completed\|\|final\.hidden\)return/);
 assert.equal((reveal.match(/wallet\(\)\?\.settle\?\.\(ticket\.id\)/g)||[]).length,1);
 assert(reveal.indexOf('wallet()?.settle?.(ticket.id)')>reveal.indexOf('finish.onclick='));
 assert.match(reveal,/JSON\.stringify\(current\.win5Evaluation\)!==JSON\.stringify\(evaluation\)/);
});
test('closing mid-reveal never settles or grants rewards',()=>{
 assert.match(reveal,/cancel\.onclick=\(\)=>\{stop\(\);close\(\)\}/);
 assert.match(reveal,/if\(stopped\|\|completed\|\|!body\.isConnected\)return/);
 assert.match(reveal,/const stop=\(\)=>\{/);

 assert.match(reveal,/close=modal\('WIN5 順番に判定'/);
 assert.match(src,/\.w5-modal-actions button\[hidden\]\{display:none!important\}/);
});
