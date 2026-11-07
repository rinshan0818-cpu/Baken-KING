'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('function bkNormalizeGrade(value){');
const end=html.indexOf('\nfunction bkDistanceBand(n)',start);
assert.ok(start>=0&&end>start);
const extract=html.slice(start,end);
function classify(bet,card){
 const context={bet,card};
 return vm.runInNewContext(
  'const bkRaceCardForBet=()=>card;\n'+extract+'\nbkMeta(bet,"class")',
  context
 );
}
test('confirmed grades override stale stored open class without editing the bet',()=>{
 for(const [date,venue,number,grade] of [
  ['2026-11-07','京都',8,'J・GⅢ'],
  ['2026-11-07','東京',11,'GⅡ'],
  ['2026-11-01','東京',11,'GⅠ']]){
  const bet={raceDate:date,raceVenue:venue,raceNumber:number,raceMeta:{class:'オープン'}};
  const original=JSON.stringify(bet);
  assert.equal(classify(bet,null),grade);
  assert.equal(JSON.stringify(bet),original);
 }
});
test('non-graded races keep original class; card official grades take priority',()=>{
 assert.equal(classify({raceDate:'2026-11-07',raceVenue:'京都',raceNumber:11,raceMeta:{class:'オープン'}},null),'オープン');
 assert.equal(classify({raceDate:'2026-11-07',raceVenue:'福島',raceNumber:1,raceMeta:{class:'未勝利'}},null),'未勝利');
 assert.equal(classify({raceDate:'2026-11-08',raceVenue:'東京',raceNumber:10,raceMeta:{class:'オープン'}},{raceConditions:{grade:'G3'}}),'GⅢ');
 assert.equal(classify({raceDate:'2026-11-08',raceVenue:'京都',raceNumber:9,raceMeta:{class:'オープン'}},{raceConditions:{grade:'J・GIII'}}),'J・GⅢ');
});
test('separate J-GIII analytics class and version marker',()=>{
 assert.match(html,/values:\['新馬','未勝利','1勝クラス','2勝クラス','3勝クラス','オープン','リステッド','J・GⅢ','GⅢ','GⅡ','GⅠ'\]/);
 assert.match(html,/const APP_VERSION='v1.11'/);
});
