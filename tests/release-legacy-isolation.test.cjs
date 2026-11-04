'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const test=require('node:test');
const path=require('node:path');
const root=path.join(__dirname,'..');
const exists=p=>fs.existsSync(path.join(root,p));
test('unused public demos, stale races and duplicate chime are absent',()=>{
 for(const file of [
  'data/historical-fixture.json',
  'data/race-catalog-2026-10-31.json',
  'sample-race.json',
  'JRA払い戻しチャイム 高音質.mp3'
 ])assert.equal(exists(file),false,'Obsolete release asset remains publicly served: '+file);
 assert.equal(exists('settlement-chime.mp3'),true,'Current common chime must remain');
});
test('production state starts with no seeded wagers and sandbox stays separate',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/const IS_TEST_MODE=localStorage\.getItem\(BK_MODE_KEY\)==='test';/);
 assert.match(html,/const KEY=IS_TEST_MODE\?'baken-king-test-state-v1':'keiba-demo-v1';/);
 assert.match(html,/bets:\[\],seasons:\[\]/);
 assert.match(html,/if\(!IS_TEST_MODE\)return false;/);
 assert.doesNotMatch(html,/fetch\(['"]\.\/data\/historical-fixture\.json/);
 assert.doesNotMatch(html,/race-catalog-2026-10-31\.json/);
});
test('account client does not auto-restore other accounts wagers',()=>{
 const cloud=fs.readFileSync(path.join(root,'app-next-cloud.js'),'utf8');
 const backup=fs.readFileSync(path.join(root,'settings-surface.js'),'utf8');
 assert.match(cloud,/const STATE='keiba-demo-v1'/);
 assert.ok(!/localStorage\.setItem\(STATE,\s*JSON\.stringify\([^)]*friend/.test(cloud));
 assert.ok(!/localStorage\.removeItem\('keiba-demo-v1'\)/.test(backup));
});
