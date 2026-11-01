const assert=require('node:assert/strict');
const {project}=require('../friends-share.js');
function make(){
 return {totalStake:500,totalPaid:800,balance:100300,
  bets:[
   {id:'a',status:'settled',stake:200,paid:800,raceName:'SECRET',picks:[[1,2]],testWinningPicks:[[1,2]]},
   {id:'b',status:'pending',stake:300,paid:0,nums:[4,5],raceName:'UNREVEALED'}
  ]};
}
assert.throws(()=>project(make()),/consent/);
assert.throws(()=>project(make(),{consent:true,mode:'test'}),/Test mode/);
assert.throws(()=>project(make(),{consent:true,visibility:'tickets'}),/visibility/);
const before=JSON.stringify(make());
const snapshot=project(make(),{consent:true});
assert.deepEqual(snapshot,{schemaVersion:1,summary:{stakeYen:500,returnedYen:800,profitYen:300,roiPercent:160,settledTicketCount:1}});
assert.equal(JSON.stringify(make()),before,'Projection must not mutate saved data');
assert(!JSON.stringify(snapshot).includes('SECRET'));
assert(!JSON.stringify(snapshot).includes('UNREVEALED'));
assert(!JSON.stringify(snapshot).includes('nums'));
assert(!JSON.stringify(snapshot).includes('balance'));
assert(Object.isFrozen(snapshot)&&Object.isFrozen(snapshot.summary));
for(const change of [
 s=>s.bets.push({id:'x',status:'pending',stake:-100,paid:0}),
 s=>s.bets[0].paid=Infinity,
 s=>s.bets[0].status='mystery',
 s=>s.bets[1].paid=450,
 s=>s.bets[0].bkSandboxFixture=true,
 s=>s.bets[0].testSettlement=true,
 s=>s.bets[1].id='a',
 s=>s.totalPaid=900,
 s=>s.totalStake=600
]){
 const s=make();change(s);assert.throws(()=>project(s,{consent:true}));
}
assert.deepEqual(project({bets:[],totalStake:0,totalPaid:0},{consent:true}).summary,
 {stakeYen:0,returnedYen:0,profitYen:0,roiPercent:null,settledTicketCount:0});
console.log('PASS: friends sharing projection is consent-gated, summary-only, fail-closed and side-effect-free');
