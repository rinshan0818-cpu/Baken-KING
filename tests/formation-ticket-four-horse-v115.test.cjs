'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
test('four-horse formation leg receives a dedicated class',()=>{
 assert.match(html,/if\(numbers\.length===4\)col\.classList\.add\('bk-v26-leg-four'\)/);
});
test('the first formation leg retains two columns and enough width even when other legs are five or six horses',()=>{
 assert.match(html,/\.bk-v26-formation:has\(\.bk-v26-leg-four\) \.bk-v26-leg-four\s*\{[^}]*flex:1\.35 1 0;[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(html,/\.bk-v26-formation:has\(\.bk-v26-leg-four\) \.bk-v26-leg:not\(\.bk-v26-leg-four\):not\(\.bk-v26-leg-packed\)\{flex:1\.1 1 0/);
});
test('existing dense-leg controls and ticket generator remain intact',()=>{
 assert.match(html,/if\(numbers\.length>=7\)col\.classList\.add\('bk-v26-leg-packed'\)/);
 assert.match(html,/function bkTicketReceipt\(b,compact=false\)/);
});
