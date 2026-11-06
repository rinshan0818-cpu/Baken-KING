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
