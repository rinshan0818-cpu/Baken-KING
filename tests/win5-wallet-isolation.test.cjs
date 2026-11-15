'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf("const BK_WIN5_LIVE_DATE=");
const end=html.indexOf('\nfunction toast(t)',start);
assert(start>0&&end>start,'WIN5 bridge missing');
const source=html.slice(start,end);
const date='2026-11-15';
const entries=[['東京',10,'14:45'],['京都',10,'15:00'],['福島',11,'15:10'],['東京',11,'15:20'],['京都',11,'15:40']];
const legs=entries.map(([venue,raceNumber])=>({venue,raceNumber,numbers:[1]}));
const cards=entries.map(([venue,raceNumber,clock])=>({
 date,venue,raceNumber,scheduledStartAt:date+'T'+clock+':00+09:00',
 horses:[{number:1,name:'テスト馬'},{number:2,name:'取消馬',scratched:true}]
}));
function setup(now='2026-11-15T12:00:00+09:00',{testMode=false,legacy=false,wallet=null,failSave=false}={}){
 const records=new Map([['baken-king-personal-cards-v1',JSON.stringify({races:cards})]]);
 const walletKey='baken-king-g1-pins-mvp-v1-'+(testMode?'test':'production');
 if(wallet)records.set(walletKey,JSON.stringify(wallet));
 const localStorage={getItem:k=>records.get(k)||null,setItem:(k,v)=>records.set(k,v)};
 const original={balance:12000,totalStake:4000,totalPaid:500,season:1,seasonOver:false,
  bets:[{stake:4000,status:'settled'}],win5Tickets:legacy?[{status:'pending',id:'legacy'}]:[]};
 const before=JSON.stringify(original);
 class Clock extends Date{
  constructor(...args){super(...(args.length?args:[now]))}
  static now(){return Date.parse(now)}
 }
 const window={dispatchEvent(){}};
 new Function('window','localStorage','s','save','IS_TEST_MODE','Date','Event',
  source)(window,localStorage,original,()=>{if(failSave)throw Error('Simulated standard-wallet disk failure');records.set('keiba-demo-v1',JSON.stringify(original))},testMode,Clock,class Event{});
 return {api:window.BakenWin5Wallet,original,before,records,walletKey};
}
const request=(id,extra={})=>({requestId:id,date,unitStake:200,legs,...extra});

test('WIN5 and badges share 300k dedicated wallet and standard state never changes',()=>{
 const e=setup();
 const purchased=e.api.purchase(request('win5-unique-001'));
 assert.equal(purchased.ok,true,JSON.stringify(purchased));
 assert.equal(e.api.snapshot().balance,299800);
 assert.equal(e.api.snapshot().totalStake,200);
 assert.equal(e.api.snapshot().tickets.length,1);
 assert.equal(JSON.stringify(e.original),e.before);
 assert.equal(JSON.parse(e.records.get(e.walletKey)).wallet,299800);
 assert.equal(e.api.purchase(request('win5-unique-001')).duplicate,true);
 assert.equal(e.api.snapshot().balance,299800);
 assert.equal(JSON.stringify(e.original),e.before);
});

test('WIN5 purchases preserve badge holdings, points and gacha history',()=>{
 const e=setup(undefined,{wallet:{version:1,wallet:9000,points:120,
  owned:{derby_normal:2},history:[{itemKey:'derby_normal',at:'2026-11-14T00:00:00Z',price:5000}]}});
 assert.equal(e.api.purchase(request('win5-pins-001')).ok,true);
 const after=JSON.parse(e.records.get(e.walletKey));
 assert.equal(after.wallet,8800);
 assert.equal(after.points,120);
 assert.equal(after.owned.derby_normal,2);
 assert.equal(after.history.length,1);
});

test('bad dates, bad legs, scratched horse, insufficient funds are rejected',()=>{
 const e=setup();
 assert.equal(e.api.purchase(request('win5-bad-date',{date:'2026-11-22'})).ok,false);
 assert.equal(e.api.purchase(request('win5-bad-legs',{legs:legs.slice().reverse()})).ok,false);
 assert.equal(e.api.purchase(request('win5-bad-horse',{legs:[{...legs[0],numbers:[2]},...legs.slice(1)]})).ok,false);
 assert.equal(e.api.purchase(request('win5-bad-funds',{unitStake:400000})).ok,false);
 assert.equal(e.api.snapshot().balance,300000);
 assert.equal(JSON.stringify(e.original),e.before);
});
test('purchase cutoff and other dates are blocked',()=>{
 assert.equal(setup('2026-11-15T14:34:59+09:00').api.purchase(request('win5-before-1435')).ok,true);
 assert.equal(setup('2026-11-15T14:35:00+09:00').api.purchase(request('win5-at-1435')).ok,false);
 assert.equal(setup('2026-11-16T00:00:00+09:00').api.purchase(request('win5-nov16')).ok,false);
});
test('WIN5-only reset clears wallet, badge history and tickets, preserves standard bets',()=>{
 const e=setup();
 assert.equal(e.api.purchase(request('win5-before-reset')).ok,true);
 assert.equal(e.api.reset().ok,true);
 const state=JSON.parse(e.records.get(e.walletKey));
 assert.equal(state.wallet,300000);
 assert.equal(state.points,0);
 assert.deepEqual(state.owned,{});
 assert.deepEqual(state.history,[]);
 assert.deepEqual(state.win5Tickets,[]);
 assert.equal(state.win5TotalStake,0);
 assert.equal(JSON.stringify(e.original),e.before);
});
test('legacy shared-wallet WIN5 purchases are not silently migrated or erased',()=>{
 const e=setup(undefined,{legacy:true});
 assert.equal(e.api.purchase(request('win5-block-legacy')).ok,false);
 assert.equal(e.api.reset().ok,false);
 assert.equal(JSON.stringify(e.original),e.before);
});
test('test and production wallet records remain separate',()=>{
 const t=setup(undefined,{testMode:true});
 assert.equal(t.api.purchase(request('win5-test-mode')).ok,true);
 assert(t.records.has('baken-king-g1-pins-mvp-v1-test'));
 assert.equal(t.records.has('baken-king-g1-pins-mvp-v1-production'),false);
});

function winningWallet(winningYen,{refundYen=0,alreadySettled=false}={}){
 const amount=winningYen+refundYen;
 return {version:1,wallet:300000,points:0,owned:{},history:[],gachaTickets:0,
 win5TotalStake:100,win5TotalPaid:0,win5Tickets:[{
  id:'win5-winning-stub',date,stake:100,unitStake:100,points:1,paid:0,
  status:alreadySettled?'settled':'pending',legs,
  win5PayoutReady:true,win5Evaluation:{complete:true,hitCount:1,refundYen},
  win5OfficialPayout:{source:'JRA_WIN5',hitCount:1,refundYen,totalYen:amount},
  ...(alreadySettled?{win5TransferYen:Math.min(Math.floor(winningYen/10),200000),win5GachaGranted:5}:{})
 }]};
}
test('tiered gacha spins and max 200k transfer settle exactly once',()=>{
 for(const [winning,spins,transfer] of [
  [99999,5,9999],[100000,10,10000],[999999,10,99999],
  [1000000,30,100000],[1999999,30,199999],[2000000,30,200000],
  [10000000,50,200000]
 ]){
  const e=setup(undefined,{wallet:winningWallet(winning)});
  const first=e.api.settle('win5-winning-stub');
  assert.equal(first.ok,true,'settle '+winning+': '+first.error);
  assert.equal(first.spins,spins);
  assert.equal(first.transfer,transfer);
  assert.equal(e.api.snapshot().gachaTickets,spins);
  assert.equal(e.api.snapshot().balance,300000+winning-transfer);
  assert.equal(e.original.balance,12000+transfer);
  assert.equal(e.original.totalStake,4000,'ordinary wagers remain unchanged');
  assert.equal(e.original.totalPaid,500,'ordinary payout accounting unchanged');
  assert.deepEqual(e.original.win5TransferIds,['win5-winning-stub']);
  const second=e.api.settle('win5-winning-stub');
  assert.equal(second.duplicate,true);
  assert.equal(e.original.balance,12000+transfer,'no double credit');
  assert.equal(e.api.snapshot().gachaTickets,spins,'no double spins');
 }
});
test('refunds alone grant no gacha spins or ordinary wallet transfer',()=>{
 const w=winningWallet(0,{refundYen:100});
 w.win5Tickets[0].win5Evaluation.hitCount=0;
 w.win5Tickets[0].win5PayoutReady=false;
 const e=setup(undefined,{wallet:w});
 const result=e.api.settle('win5-winning-stub');
 assert.equal(result.ok,true);
 assert.equal(e.api.snapshot().balance,300100);
 assert.equal(e.api.snapshot().gachaTickets,0);
 assert.equal(e.original.balance,12000);
});
test('mixed refund and verified WIN5 win only reward the winning portion',()=>{
 const e=setup(undefined,{wallet:winningWallet(100000,{refundYen:300})});
 const result=e.api.settle('win5-winning-stub');
 assert.equal(result.ok,true);
 assert.equal(e.original.balance,22000);
 assert.equal(e.api.snapshot().balance,300000+90300);
 assert.equal(e.api.snapshot().gachaTickets,10);
});
test('winning ticket with no verified official payout cannot reward',()=>{
 const w=winningWallet(1000000);
 w.win5Tickets[0].win5PayoutReady=false;
 const e=setup(undefined,{wallet:w});
 assert.equal(e.api.settle('win5-winning-stub').ok,false);
 assert.equal(e.original.balance,12000);
 assert.equal(e.api.snapshot().gachaTickets,0);
});
test('failed standard wallet save retains transfer journal and retries on reload',()=>{
 const w=winningWallet(500000);
 const e=setup(undefined,{wallet:w,failSave:true});
 const first=e.api.settle('win5-winning-stub');
 assert.equal(first.ok,false);
 assert.equal(e.api.snapshot().gachaTickets,10);
 assert.equal(e.api.snapshot().balance,750000);
 assert.equal(e.original.balance,12000);
 // Restore with same saved WIN5 record and functioning ordinary-wallet storage.
 const again=setup(undefined,{wallet:JSON.parse(e.records.get(e.walletKey))});
 const retry=again.api.settle('win5-winning-stub');
 assert.equal(retry.ok,true);
 assert.equal(retry.duplicate,true);
 assert.equal(again.original.balance,62000);
 assert.equal(again.api.snapshot().gachaTickets,10);
 assert.equal(again.api.reset().ok,true);
 assert.equal(again.original.balance,62000,'WIN5-only reset does not erase earned ordinary-wallet transfer');
});
test('gacha spend guard never uses the WIN5 betting wallet balance',()=>{
 const gacha=fs.readFileSync('pin-collection.html','utf8');
 assert.match(gacha,/\(state\.gachaTickets\|\|0\)\s*<\s*10/);
 assert.match(gacha,/gachaTickets:state\.gachaTickets-\(isPointDraw\?0:n\)/);
 assert.doesNotMatch(gacha,/wallet:state\.wallet-\(isPointDraw/);
 assert.match(gacha,/draw\(1,1\)/);
 assert.match(gacha,/draw\(10,10\)/);
});

test('same race-day transfer across two winning tickets never exceeds 200k',()=>{
 const wallet=winningWallet(1500000);
 const other=structuredClone(wallet.win5Tickets[0]);
 other.id='win5-winning-stub-2';
 wallet.win5Tickets.push(other);
 const e=setup(undefined,{wallet});
 assert.equal(e.api.settle('win5-winning-stub').ok,true);
 assert.equal(e.api.settle('win5-winning-stub-2').ok,true);
 assert.equal(e.original.balance,212000);
 assert.equal(e.api.snapshot().gachaTickets,60);
 const paid=e.api.snapshot().tickets.map(t=>t.win5TransferYen);
 assert.deepEqual(paid,[150000,50000]);
 assert.equal(e.api.settle('win5-winning-stub-2').duplicate,true);
 assert.equal(e.original.balance,212000);
});
