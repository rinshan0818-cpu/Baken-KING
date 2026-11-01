/* Friend sharing P0: explicit, read-only summary projection. No storage or network access. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BakenFriendsShare=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const SETTLED=new Set(['settled','paid','lost','refunded','final']);
 const MAX_YEN=1_000_000_000_000;
 function yen(value,name){
  if(!Number.isSafeInteger(value)||value<0||value>MAX_YEN)throw new TypeError('Invalid '+name);
  return value;
 }
 function project(state,{mode='production',consent=false,visibility='summary'}={}){
  if(!consent)throw new Error('Sharing requires explicit consent');
  if(mode!=='production')throw new Error('Test mode cannot be shared');
  if(visibility!=='summary')throw new Error('Unsupported visibility');
  if(!state||typeof state!=='object'||Array.isArray(state)||!Array.isArray(state.bets)||state.bets.length>100000)throw new TypeError('Invalid saved state');
  // Pending stakes are included in ROI denominator, as in the app's lifetime performance.
  let stakeYen=0,returnedYen=0,settledTicketCount=0;
  const ids=new Set();
  for(const bet of state.bets){
   if(!bet||typeof bet!=='object'||Array.isArray(bet))throw new TypeError('Invalid ticket');
   if(bet.bkSandboxFixture||bet.testSettlement)throw new Error('Test ticket cannot be shared');
   if(typeof bet.status!=='string'||(!SETTLED.has(bet.status)&&bet.status!=='pending'))throw new Error('Unknown ticket status');
   const stake=yen(bet.stake,'ticket stake');
   stakeYen+=stake;
   if(!Number.isSafeInteger(stakeYen)||stakeYen>MAX_YEN)throw new Error('Total stake overflow');
   if(bet.id!=null){if(typeof bet.id!=='string'||ids.has(bet.id))throw new Error('Invalid or duplicate ticket ID');ids.add(bet.id)}
   if(SETTLED.has(bet.status)){
    const paid=yen(bet.paid,'ticket payout');
    returnedYen+=paid;
    if(!Number.isSafeInteger(returnedYen)||returnedYen>MAX_YEN)throw new Error('Total payout overflow');
    settledTicketCount++;
   }else if(bet.paid!==undefined&&bet.paid!==null&&bet.paid!==0)throw new Error('Pending ticket has payout');
  }
  if(state.totalStake!==undefined&&yen(state.totalStake,'totalStake')!==stakeYen)throw new Error('Stake reconciliation failed');
  if(state.totalPaid!==undefined&&yen(state.totalPaid,'totalPaid')!==returnedYen)throw new Error('Payout reconciliation failed');
  const profitYen=returnedYen-stakeYen;
  return Object.freeze({schemaVersion:1,summary:Object.freeze({
   stakeYen,returnedYen,profitYen,
   roiPercent:stakeYen?Math.round(returnedYen/stakeYen*10000)/100:null,
   settledTicketCount
  })});
 }
 return Object.freeze({project});
});
