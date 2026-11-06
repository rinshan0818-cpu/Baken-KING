'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('function bkTicketDisplaySlips(rows){');
const end=html.indexOf('\nfunction bkTicketReceipt(b,compact=false){',start);
assert(start>0&&end>start,'presentation-only ticket decomposition must exist');
const snippet=html.slice(start,end);
const display=rows=>Array.from(vm.runInNewContext(snippet+'\nbkTicketDisplaySlips(rows)',{rows}),x=>JSON.parse(JSON.stringify(x)));
const all=[[8,4,6],[8,4,7],[8,4,9],[8,6,7],[8,6,9],[8,7,9]].map(p=>p.sort((a,b)=>a-b));
const make=(picks,amount,purchasedAt='2026-11-07T07:50:00.123Z')=>({
 id:'id'+amount,realRaceId:'2026-11-07-KYOTO-8',raceDate:'2026-11-07',raceVenue:'京都',raceNumber:8,
 type:'三連複',mode:'wheel',axis:8,wheelAxes:[8],wheelPartners:[4,6,7,9],
 purchasedAt,season:1,status:'pending',officialReady:false,
 picks,nums:picks[0],unitStake:amount,stake:picks.length*amount,paid:0
});
const original=()=>[make([all[0],all[1]],300),make(all.slice(2),200,'2026-11-07T07:50:00.124Z')];
test('2x300 + 4x200 becomes 6x200 wheel plus 2x100 normal, same 1400 total',()=>{
 const before=original(),unchanged=JSON.stringify(before);
 const views=display(before);
 assert.equal(views.length,2);
 assert.deepEqual([views[0].mode,views[0].picks.length,views[0].unitStake,views[0].stake],['wheel',6,200,1200]);
 assert.deepEqual([views[1].mode,views[1].picks.length,views[1].unitStake,views[1].stake],['normal',2,100,200]);
 assert.deepEqual(views[1].picks,[all[0],all[1]]);
 assert.equal(views.reduce((sum,v)=>sum+v.stake,0),before.reduce((sum,b)=>sum+b.stake,0));
 assert.equal(JSON.stringify(before),unchanged,'never rewrite persisted original records');
});
test('reversing storage order changes neither display split nor totals',()=>{
 const views=display(original().reverse());
 assert.equal(views[0].stake,1200);assert.equal(views[1].stake,200);
});
test('different purchase times, modes, incomplete picks or unrelated races are left untouched',()=>{
 const originals=original();
 for(const mutate of [
  rows=>{rows[1].purchasedAt='2026-11-07T07:50:09.000Z'},
  rows=>{rows[1].realRaceId='2026-11-07-TOKYO-11'},
  rows=>{rows[1].mode='normal'},
  rows=>{rows[1].picks.pop();rows[1].stake=600},
  rows=>{rows[1].picks[0]=rows[0].picks[0]},
  rows=>{rows[1].wheelPartners=[4,6,7,10]},
  rows=>{rows[1].unitStake=300;rows[1].stake=1200}
 ]){
  const data=JSON.parse(JSON.stringify(originals));mutate(data);
  assert.deepEqual(display(data),data);
 }
});
test('normal add-on renders each selection and its own unit price',()=>{
 assert.match(html,/else if\(mode==='normal'&&picks\.length>1\)/);
 assert.match(html,/for\(const p of picks\)\{/);
 assert.match(html,/bk-v26-normal-multi-line/);
 assert.match(html,/Number\(unit\)\.toLocaleString\('ja-JP'\)\+' 円'/);
 assert.match(html,/for\(const b of bkTicketDisplaySlips\(rows\)\)/);
 assert.match(html,/function bkSettlementTicket\(b\)\{[\s\S]*?bkTicketReceipt\(b,false\)/);
 assert.doesNotMatch(snippet,/localStorage|save\(|s\.bets|fetch\(/);
});

test('v1.09: ordered and unordered add-on selections use visible correct separators',()=>{
 assert.match(html,/ordered\.has\(b\.type\)\?'▶':'－'/);
 assert.match(html,/bk-v26-normal-separator/);
});
test('v1.09: variable stake layouts for 馬連 ワイド 馬単 三連単 and BOX / formation',()=>{
 const scenarios=[
  {type:'馬連',mode:'wheel',wheelAxes:[8],wheelPartners:[4,6,7],picks:[[8,4],[8,6],[8,7]]},
  {type:'ワイド',mode:'wheel',wheelAxes:[8],wheelPartners:[4,6,7],picks:[[8,4],[8,6],[8,7]]},
  {type:'馬単',mode:'wheel',wheelAxes:[8],wheelPartners:[4,6,7],wheelPosition:1,picks:[[8,4],[8,6],[8,7]]},
  {type:'三連単',mode:'wheel',wheelAxes:[8],wheelPartners:[4,6,7],wheelPosition:1,picks:[[8,4,6],[8,4,7],[8,6,4],[8,6,7],[8,7,4],[8,7,6]]},
  {type:'馬連',mode:'box',picks:[[4,6],[4,7],[6,7]]},
  {type:'三連複',mode:'formation',formationLegs:[[8],[4],[6,7]],picks:[[8,4,6],[8,4,7]]}
 ];
 for(const c of scenarios){
  const make=(picks,unitStake)=>({...c,id:'id-'+unitStake,realRaceId:'2026-11-07-KYOTO-8',season:1,status:'pending',
    officialReady:false,purchasedAt:'2026-11-07T07:50:00Z',picks,unitStake,stake:picks.length*unitStake});
  const input=[make(c.picks.slice(0,1),300),make(c.picks.slice(1),200)];
  const before=JSON.stringify(input),result=display(input);
  assert.equal(result[0].mode,c.mode,c.type);
  assert.equal(result[1].mode,'normal',c.type);
  assert.equal(result[0].stake,c.picks.length*200,c.type);
  assert.equal(result[1].stake,100,c.type);
  assert.equal(JSON.stringify(input),before,c.type+' originals unchanged');
  input[1].purchasedAt='2026-11-07T07:50:09Z';
  assert.deepEqual(display(input),input,c.type+' unrelated records remain separate');
 }
});

test('v1.10: ordinary one-selection ticket includes separators in shared addNums',()=>{
 const start=html.indexOf('const addNums=(nums)=>');
 const end=html.indexOf(';\n const ticketLayout=',start);
 assert.ok(start>0&&end>start);
 const snippet=html.slice(start,end);
 assert.match(snippet,/nums\.forEach\(\(num,i\)=>/);
 assert.match(snippet,/if\(i\)group\.append/);
 assert.match(snippet,/ordered\.has\(b\.type\)\?'▶':'－'/);
 assert.match(html,/\}else\{addNums\(picks\[0\]\|\|b\.nums\|\|\[\]\);\}/);
});
