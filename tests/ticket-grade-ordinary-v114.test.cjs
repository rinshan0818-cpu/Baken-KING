'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('function bkTicketTabRaceName(b){');
const end=html.indexOf('function bkTicketTabHeading(b){',start);
assert.ok(start>0&&end>start);
const source=html.slice(start,end);
const context={bkRaceCardForBet:()=>null,bkResolvedRaceName:b=>b.raceName||b.raceTitle||'',
 bkNormalizeGrade:g=>({'GⅢ':'GⅢ','GⅡ':'GⅡ','J・GⅢ':'J・GⅢ'})[g]||null};
vm.createContext(context);vm.runInContext(source,context);
test('Tokyo 4R 2-year maiden never receives stale G3',()=>{
 const b={raceDate:'2026-11-07',raceVenue:'東京',raceNumber:4,raceTitle:'2歳未勝利',grade:'GⅢ'};
 assert.equal(context.bkTicketTabRaceName(b),'2歳未勝利');
});
test('ordinary maiden strips an erroneous grade suffix already saved in the title',()=>{
 const b={raceDate:'2026-11-07',raceVenue:'東京',raceNumber:4,raceTitle:'2歳未勝利（G3）',grade:'GⅢ'};
 assert.equal(context.bkTicketTabRaceName(b),'2歳未勝利');
});
test('known stakes retain their correct grades',()=>{
 const b={raceDate:'2026-11-07',raceVenue:'東京',raceNumber:11,raceTitle:'京王杯2歳ステークス'};
 assert.equal(context.bkTicketTabRaceName(b),'京王杯2歳ステークス（G2）');
 const c={raceDate:'2026-11-07',raceVenue:'京都',raceNumber:8,raceTitle:'京都ジャンプステークス'};
 assert.equal(context.bkTicketTabRaceName(c),'京都ジャンプステークス（J・G3）');
});
test('ordinary 1-win class never receives inherited grade',()=>{
 const b={raceDate:'2026-11-07',raceVenue:'福島',raceNumber:4,raceTitle:'3歳以上1勝クラス',grade:'GⅢ'};
 assert.equal(context.bkTicketTabRaceName(b),'3歳以上1勝クラス');
});
