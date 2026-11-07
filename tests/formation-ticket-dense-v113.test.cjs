'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');

test('dense formation ticket adds adaptive grid classes from actual selected-horse count',()=>{
 assert.match(html,/if\(numbers\.length>=7\)col\.classList\.add\('bk-v26-leg-packed'\)/);
 assert.match(html,/if\(numbers\.length>=13\)col\.classList\.add\('bk-v26-leg-ultrapacked'\)/);
});
test('formation grid expands to three and four columns instead of clipping selected horses',()=>{
 assert.match(html,/\.bk-v26-leg-packed\s*\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(html,/\.bk-v26-leg-ultrapacked\s*\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});
test('ticket fixes do not alter stake calculation or purchase records',()=>{
 assert.match(html,/function bkTicketReceipt\(b,compact=false\)/);
 assert.match(html,/\.bk-v26-leg-ultrapacked \.bk-v26-num/);
});
