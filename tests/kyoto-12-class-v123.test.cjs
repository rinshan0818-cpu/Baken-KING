'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
test('2026-11-07 Kyoto 12R officially 1-win and not a grade-2 race',()=>{
 assert.match(html,/'2026-11-07\|京都\|12':\{classCondition:'1勝クラス'\}/);
});
test('Kyoto 12R grade is suppressed in ticket heading and analytics',()=>{
 assert.match(html,/const verifiedOrdinaryClass=\{[\s\S]{0,350}'2026-11-07\|京都\|12':'1勝クラス'/);
 assert.match(html,/const verifiedClass=\{[\s\S]{0,350}'2026-11-07\|京都\|12':'1勝クラス'/);
 assert.match(html,/if\(ordinary\)return base\.replace/);
});
test('race hero suppresses stale grades on ordinary classes',()=>{
 assert.match(html,/if\(ordinaryClass\|\|\(!verified\.grade&&rule\.classCondition!=='オープン'\)\)gradeTier=''/);
});
