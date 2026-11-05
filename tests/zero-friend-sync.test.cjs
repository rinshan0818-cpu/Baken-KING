'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sync=fs.readFileSync('app-next-cloud.js','utf8');
const source=fs.readFileSync('index.html','utf8');
const store=fs.readFileSync('sharing-server/neon-store.cjs','utf8');

test('signed-in accounts auto-publish even zero-bet scores without confirmation',()=>{
 assert.doesNotMatch(sync,/if\(!state\.bets\.length&&manual\)throw/);
 assert.doesNotMatch(sync,/consentKey|confirm\(/);
 assert.match(sync,/const interval=15\*60\*1000/);
 assert.match(sync,/await publish\(false\);/);
 assert.match(sync,/setInterval\(\(\)=>\{if\(document\.visibilityState==='visible'\)publish\(false\)\},60000\)/);
 assert.match(sync,/visibilitychange/);
 assert.match(sync,/window\.addEventListener\('focus'/);
 assert.match(sync,/if\(!manual&&\(Date\.now\(\)-Math\.max\(lastSuccess,Number\(localStorage\.getItem\(lastKey\(user\.id\)\)\)\|\|0\)<interval\)\)return/);
 assert.match(sync,/await friends\('POST','summary',\{metrics\}\)/);
 assert.match(sync,/if\(!state\|\|!Array\.isArray\(state\.bets\)\)throw/);
 assert.match(sync,/localStorage\.getItem\('baken-king-mode-v1'\)==='test'/);
 assert.match(sync,/友達.*成績は未登録です/);
});
test('an empty score is valid for local comparison and server persistence',()=>{
 const bkScoreValid=source.slice(source.indexOf('function bkScoreValid(m){'),source.indexOf('function bkRenderFriendCompare(){'));
 assert.match(bkScoreValid,/m\.roi===null\?m\.stake===0/);
 assert.match(bkScoreValid,/m\.raceRate===null\?m\.hitRaces===0/);
 const zero={stakeYen:0,returnedYen:0,settledTicketCount:0,purchasedRaceCount:0,hitRaceCount:0,settledRaceCount:0,maxPayoutYen:null};
 const {createSharingStore}=require('../sharing-server/neon-store.cjs');
 let params=null;
 const db={async query(_sql,args){params=args;return {rows:[{updated_at:new Date('2026-11-05T00:00:00Z')}]}}};
 const store=createSharingStore(db);
 return store.upsertOwnSummary('96f514a1-72c4-4ba5-94bb-b96dc44a846a',zero).then(()=>{
  assert.deepEqual(params.slice(1),[0,0,0,0,0,0,null]);
 });
});
