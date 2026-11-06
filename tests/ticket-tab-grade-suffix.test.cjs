'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('function bkTicketTabRaceName(b){');
const end=html.indexOf('\nfunction bkTicketHitPicks',start);
assert(start>=0&&end>start,'ticket tab grade label helper must be present');
const code=html.slice(start,end);
function getLabel(b,card){
 const env={bkResolvedRaceName:t=>t.raceName,bkRaceCardForBet:()=>card||null};
 return vm.runInNewContext(code+'\nbkTicketTabRaceName(input)',{...env,input:b});
}
test('only confirmed Tokyo G2 race gets a ticket-heading suffix',()=>{
 assert.equal(getLabel({raceDate:'2026-11-07',raceVenue:'東京',raceNumber:11,raceName:'京王杯2歳ステークス'}),'京王杯2歳ステークス（G2）');
 assert.equal(getLabel({raceDate:'2026-11-07',raceVenue:'京都',raceNumber:11,raceName:'室町ステークス'}),'室町ステークス');
});
test('Kyoto J-G3 and prior G1 survive saved tickets without grade fields',()=>{
 assert.equal(getLabel({raceDate:'2026-11-07',raceVenue:'京都',raceNumber:8,raceName:'京都ジャンプステークス'}),'京都ジャンプステークス（J・G3）');
 assert.equal(getLabel({raceDate:'2026-11-01',raceVenue:'東京',raceNumber:11,raceName:'天皇賞（秋）'}),'天皇賞（秋）（G1）');
});
test('published source grades work on future races, only when explicitly present',()=>{
 const bet={raceDate:'2026-11-14',raceVenue:'東京',raceNumber:11,raceName:'次回重賞'};
 assert.equal(getLabel(bet,{raceConditions:{grade:'GⅢ'}}),'次回重賞（G3）');
 assert.equal(getLabel(bet,{raceConditions:{grade:'J･GⅢ'}}),'次回重賞（J・G3）');
 assert.equal(getLabel(bet,{raceConditions:{classCondition:'オープン'}}),'次回重賞');
});
test('never add a duplicate grade and do not change prediction display or ticket artwork',()=>{
 assert.equal(getLabel({raceDate:'2026-11-07',raceVenue:'東京',raceNumber:11,raceName:'京王杯2歳ステークス（G2）'}),'京王杯2歳ステークス（G2）');
 assert.match(html,/const title=bkNode\('strong',bkTicketTabHeading\(rows\[0\]\)\)/);
 assert.match(html,/const eventText=bkTicketTabRaceName\(b\);/);
 assert.match(html,/function bkImportedRaceLabel\(c\)\{return bkOfficialRaceLabel\(c\)\}/);
 assert.doesNotMatch(code,/localStorage\.setItem|fetch\(|save\(/);
});

test('missing stored race name is recovered from verified race identity',()=>{
 const missing={raceDate:'2026-11-07',raceVenue:'東京',raceNumber:11,raceName:''};
 assert.equal(getLabel(missing),'京王杯2歳ステークス（G2）');
 assert.equal(getLabel({...missing,raceVenue:'京都',raceNumber:8}),'京都ジャンプステークス（J・G3）');
 const fromCard={...missing,raceDate:'2026-11-14',raceNumber:11};
 assert.equal(getLabel(fromCard,{raceName:'未来ステークス',raceConditions:{grade:'GⅡ'}}),'未来ステークス（G2）');
});
test('full ticket title includes race name, and waiting status is below title',()=>{
 const codeToRun=code+'\n'+
 "bkTicketTabHeading({raceDate:'2026-11-07',raceVenue:'東京',raceNumber:11,raceName:''})";
 const label=vm.runInNewContext(codeToRun,{bkResolvedRaceName:t=>t.raceName,bkRaceCardForBet:()=>null});
 assert.equal(label,'11/7 東京11R 京王杯2歳ステークス（G2）');
 assert.match(html,/headingText.append\(status\)/);
 assert.doesNotMatch(html,/header.append\(labels\)/);
 assert.match(html,/\.bk-race-ticket-heading-text\{flex:1 1 auto/);
});

test('paper tickets include grade after race name without a duplicate floating grade mark',()=>{
 assert.match(html,/const eventText=bkTicketTabRaceName\(b\);/);
 assert.match(html,/if\(gradeInline\)card\.classList\.add\('bk-v26-grade-inline'\)/);
 assert.match(html,/if\(gradeText&&!gradeInline\)/);
 assert.match(html,/\.bk-ticket-v23\.bk-v26-grade-inline \.bk-v26-grade-mark\{display:none!important\}/);
 for(const [raceDate,raceVenue,raceNumber,raceName,expected] of [
  ['2026-11-07','東京',11,'京王杯2歳ステークス','京王杯2歳ステークス（G2）'],
  ['2026-11-07','京都',8,'京都ジャンプステークス','京都ジャンプステークス（J・G3）'],
  ['2026-11-07','京都',11,'室町ステークス','室町ステークス']
 ]){
  assert.equal(getLabel({raceDate,raceVenue,raceNumber,raceName}),expected);
 }
});
