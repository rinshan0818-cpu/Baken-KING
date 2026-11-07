'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
test('JRA official Tokyo 12R is 1-win and never Listed',()=>{
 assert.match(html,/'2026-11-07\|東京\|12':\{classCondition:'1勝クラス'\}/);
 assert.match(html,/'2026-11-07\|東京\|12':'1勝クラス'/);
});
test('formation legs with three or four horses use compact 2-column layout',()=>{
 assert.match(html,/if\(numbers\.length===3\|\|numbers\.length===4\)col\.classList\.add\('bk-v26-leg-compact'\)/);
 assert.match(html,/\.bk-v26-formation \.bk-v26-leg-compact\s*\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(html,/\.bk-v26-formation \.bk-v26-leg-compact \.bk-v26-num\s*\{[^}]*max-width:100%/);
});
test('do not change the saved formation combinations or tickets',()=>{
 assert.match(html,/const numbers=\[\.\.\.new Set\(legs\[i\]\.map\(Number\)\)\]\.sort/);
 assert.match(html,/function bkTicketReceipt\(b,compact=false\)/);
});
