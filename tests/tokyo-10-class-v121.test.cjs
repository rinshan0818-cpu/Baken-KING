'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
test('Tokyo 10R November Stakes is correctly recorded as a 3-win class',()=>{
 assert.match(html,/'2026-11-07\|東京\|10':\{classCondition:'3勝クラス'\}/);
});
test('verified class protects both ticket and analytics labels from stale G3',()=>{
 assert.match(html,/const verifiedOrdinaryClass=\{/);
 assert.match(html,/'2026-11-07\|東京\|10':'3勝クラス'/);
 assert.match(html,/if\(verifiedClass\[raceKey\]\)return verifiedClass\[raceKey\]/);
});
test('general hero grade requires open-class evidence unless independently verified',()=>{
 assert.match(html,/if\(ordinaryClass\|\|\(!verified\.grade&&rule\.classCondition!=='オープン'\)\)gradeTier=''/);
 assert.match(html,/const raceClass=ordinaryClass\|\|/);
});
