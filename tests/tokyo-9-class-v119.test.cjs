'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
test('JRA official 2026 Tokyo 9R Kanagawa Shimbun Hai is 2-win class',()=>{
 assert.match(html,/'2026-11-07\|東京\|9':\{classCondition:'2勝クラス'\}/);
});
test('ordinary class takes precedence over stale G3 on race hero',()=>{
 assert.match(html,/if\(ordinaryClass\)gradeTier=''/);
 assert.match(html,/const raceClass=ordinaryClass\|\|/);
});
test('analytics and ticket headings do not reuse stale grade for verified Tokyo 9R',()=>{
 assert.match(html,/'2026-11-07\|東京\|9':'2勝クラス'/);
 assert.match(html,/const ordinary=Boolean\(verifiedOrdinaryClass\)/);
});
