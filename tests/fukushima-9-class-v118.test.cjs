'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
test('JRA verified Fukushima 9R is 1-win rather than Listed',()=>{
 assert.match(html,/'2026-11-07\|福島\|9':\{classCondition:'1勝クラス'\}/);
});
test('ordinary class overrides stale grades on race hero and clears grade styling',()=>{
 const start=html.indexOf('function setRace(entry)');
 const end=html.indexOf('function ',start+12);
 const body=html.slice(start,end>start?end:start+8500);
 assert.match(body,/const ordinaryClass=/);
 assert.match(body,/if\(ordinaryClass\)gradeTier=''/);
 assert.match(body,/const raceClass=ordinaryClass\|\|/);
 assert.match(body,/classTag\.className='bk-race-class-tag'\+\(gradeTier/);
});
test('class comparison takes verified 1-win over any stale saved Listed grade',()=>{
 const start=html.indexOf('function bkMeta(b,key)');
 const body=html.slice(start,start+1900);
 assert.match(body,/'2026-11-07\|福島\|9':'1勝クラス'/);
 assert.match(body,/if\(verifiedClass\[raceKey\]\)return verifiedClass\[raceKey\]/);
});
