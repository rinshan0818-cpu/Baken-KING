/* Run with node --test: tests pure race selector without a browser. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('monitor-target-export.js','utf8');
function selector(){
  const sandbox={
    window:{},
    document:{querySelector:()=>null},
    localStorage:{getItem:()=>null}
  };
  vm.runInNewContext(source,sandbox,{filename:'monitor-target-export.js'});
  return sandbox.window.BakenMonitoringTargets.extractTargets;
}
const card=(date,venue,raceNumber,scheduledStartAt)=>({date,venue,raceNumber,scheduledStartAt});
const bet=(date,venue,raceNumber,status='pending')=>({realRaceId:date+'-'+venue+'-'+raceNumber,raceDate:date,raceVenue:venue,raceNumber,status,picks:[[5]],stake:100,balance:500});
const time=Date.parse('2026-10-31T12:35:00+09:00');
test('select only started pending races and exclude betting details',()=>{
  const result=selector()([
    bet('2026-10-31','京都',2),bet('2026-10-31','京都',2),
    bet('2026-10-31','東京',5,'settled'),bet('2026-10-31','東京',6)
  ],[
    card('2026-10-31','京都',2,'2026-10-31T12:20:00+09:00'),
    card('2026-10-31','東京',5,'2026-10-31T12:20:00+09:00'),
    card('2026-10-31','東京',6,'2026-10-31T12:40:00+09:00')
  ],time);
  assert.equal(JSON.stringify(result),JSON.stringify([{date:'2026-10-31',venue:'京都',raceNumber:2}]));
  assert.equal(JSON.stringify(result).includes('stake'),false);
  assert.equal(JSON.stringify(result).includes('picks'),false);
});
test('no start time means no polling, even when purchased',()=>{
  const result=selector()([bet('2026-10-31','京都',2)],[card('2026-10-31','京都',2,null)],time);
  assert.equal(result.length,0);
});
test('race is selected from exact scheduled start',()=>{
  const list=[bet('2026-10-31','京都',2)];
  const cards=[card('2026-10-31','京都',2,'2026-10-31T12:35:00+09:00')];
  assert.equal(selector()(list,cards,time).length,1);
  assert.equal(selector()(list,cards,time-1).length,0);
});
test('race venue never matched by race number alone',()=>{
  const result=selector()([bet('2026-10-31','東京',2)],[card('2026-10-31','京都',2,'2026-10-31T12:00:00+09:00')],time);
  assert.equal(result.length,0);
});
