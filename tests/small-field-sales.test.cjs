// JRA sales table regression. No external data or user storage.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const from=html.indexOf(' function bkSalesStartCount(){');
const to=html.indexOf(' function draw(){',from);
assert(from>0 && to>from,'purchase availability policy must remain present');
const policy=html.slice(from,to);
const ctx={
 currentRace:null,horses:[],pick:[],legs:[[],[],[]],active:0,
 individualStakes:new Map(),
 typeEl:{value:'単勝',options:['単勝','複勝','馬連','馬単','ワイド','三連複','三連単'].map(value=>({value,disabled:false}))}
};
vm.createContext(ctx);
vm.runInContext(policy+';this.avail=bkTypeOnSale;this.sync=bkSyncTypeAvailability;',ctx);
const table=[
 [2,['単勝']],
 [3,['単勝','馬連','馬単']],
 [4,['単勝','馬連','馬単','ワイド','三連複','三連単']],
 [5,['単勝','複勝','馬連','馬単','ワイド','三連複','三連単']],
 [6,['単勝','複勝','馬連','馬単','ワイド','三連複','三連単']],
 [7,['単勝','複勝','馬連','馬単','ワイド','三連複','三連単']],
 [8,['単勝','複勝','馬連','馬単','ワイド','三連複','三連単']]
];
for(const [count,types] of table){
 ctx.currentRace={horses:Array.from({length:count},(_,i)=>({number:i+1}))};
 for(const option of ctx.typeEl.options)assert.equal(ctx.avail(option.value),types.includes(option.value),count+' heads / '+option.value);
}
ctx.currentRace={salesStartHorseCount:8,horses:Array.from({length:6},(_,i)=>({number:i+1}))};
assert.equal(ctx.avail('複勝'),true,'scratches must not lower the verified sale-start field size');
ctx.currentRace={salesStartHorseCount:4,horses:Array.from({length:4},(_,i)=>({number:i+1}))};
ctx.typeEl.value='複勝';ctx.pick=[1];ctx.sync();
assert.equal(ctx.typeEl.value,'単勝');
assert.equal(ctx.pick.length,0);
assert.equal(ctx.typeEl.options.find(o=>o.value==='複勝').disabled,true);
assert(html.includes("if(!bkTypeOnSale(typeEl.value))return info.textContent="));
assert(html.includes("if(!bkTypeOnSale(typeEl.value)||isClosed()"),'recheck in confirmation flow');
console.log('PASS: JRA 2-8 starters, unavailable wager types, scratch-preserved sale counts, purchase gates');
