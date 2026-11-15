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
function setup(now='2026-11-15T12:00:00+09:00',{testMode=false,legacy=false,wallet=null}={}){
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
  source)(window,localStorage,original,()=>{throw Error('Do not save the standard betting state')},testMode,Clock,class Event{});
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
