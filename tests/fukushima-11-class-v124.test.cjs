'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
test('JRA Fukushima 11R Kibi-taki Stakes is a 3-win handicap, not G3',()=>{
 assert.match(html,/'2026-11-07\|福島\|11':\{classCondition:'3勝クラス'\}/);
});
test('existing tickets and analytics prefer verified 3-win class over stale grade',()=>{
 assert.match(html,/const verifiedOrdinaryClass=\{[\s\S]{0,450}'2026-11-07\|福島\|11':'3勝クラス'/);
 assert.match(html,/const verifiedClass=\{[\s\S]{0,450}'2026-11-07\|福島\|11':'3勝クラス'/);
 assert.match(html,/if\(ordinary\)return base\.replace/);
});
test('ordinary class clears stale grade tag on prediction screen',()=>{
 assert.match(html,/if\(ordinaryClass\|\|\(!verified\.grade&&rule\.classCondition!=='オープン'\)\)gradeTier=''/);
 assert.match(html,/const raceClass=ordinaryClass\|\|/);
});
