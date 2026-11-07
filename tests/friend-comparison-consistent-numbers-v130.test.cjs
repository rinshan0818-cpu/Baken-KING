'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
test('all nine friend comparison values use a shared readable style',()=>{
 assert.match(html,/\.bk-friend-compare \.bk-compare-cell:not\(\.bk-compare-placeholder\)\s*\{[^}]*font-weight:700/);
 assert.match(html,/\.bk-friend-compare \.bk-compare-cell:not\(\.bk-compare-placeholder\)\s*\{[^}]*font-variant-numeric:tabular-nums/);
});
test('valid friend data clears stale empty and placeholder classes',()=>{
 assert.match(html,/el\.classList\.remove\('bk-compare-win','bk-compare-lose','bk-compare-tie','bk-compare-placeholder','bk-compare-empty'\)/);
 assert.match(html,/if\(!friend\|\|value===null\)\{el\.classList\.add\('bk-compare-placeholder','bk-compare-empty'\);return\}/);
});
test('comparison preserves nine data fields and win or lose styling',()=>{
 const fields=['profit','roi','stake','paid','races','hitRaces','raceRate','maxPayout','settled'];
 for(const name of fields){
  assert.match(html,new RegExp('data-compare-own="'+name+'"'));
  assert.match(html,new RegExp('data-compare-friend="'+name+'"'));
 }
 assert.match(html,/el\.classList\.add\('bk-compare-win'\)/);
 assert.match(html,/el\.classList\.add\('bk-compare-lose'\)/);
});
