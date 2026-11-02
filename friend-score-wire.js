/* Maps the nine visible comparison metrics to the restricted cloud payload.
   No bets, wallet balance, histories, or personal identifiers cross this boundary. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BakenScoreWire=api})(typeof globalThis==='object'?globalThis:this,()=>{
 'use strict';
 function fromLocal(m){
  if(!m||typeof m!=='object')throw Error('Missing summary');
  for(const key of ['stake','paid','settled','races','hitRaces'])if(!Number.isSafeInteger(m[key])||m[key]<0)throw Error('Invalid '+key);
  if(m.hitRaces>m.races)throw Error('Invalid race totals');
  // Local race hit rate is rounded: recover settled race count only when unambiguous.
  // Prefer supplying the actual settledRaceCount as an internal (never-shared) field.
  if(!Number.isSafeInteger(m.settledRaceCount)||m.settledRaceCount<m.hitRaces||m.settledRaceCount>m.races)throw Error('Missing settled race count');
  if(m.maxPayout!==null&&(!Number.isSafeInteger(m.maxPayout)||m.maxPayout<0))throw Error('Invalid max payout');
  return {stakeYen:m.stake,returnedYen:m.paid,settledTicketCount:m.settled,purchasedRaceCount:m.races,hitRaceCount:m.hitRaces,settledRaceCount:m.settledRaceCount,maxPayoutYen:m.maxPayout};
 }
 function toFriend(record){
  if(!record||typeof record!=='object')throw Error('Missing friend summary');
  const n={profit:record.profitYen,roi:record.roiPercent===null?null:Math.round(record.roiPercent*10)/10,stake:record.stakeYen,paid:record.returnedYen,races:record.purchasedRaceCount,hitRaces:record.hitRaceCount,raceRate:record.raceHitRatePercent,maxPayout:record.maxPayoutYen,settled:record.settledTicketCount};
  return {version:1,metrics:n};
 }
 return Object.freeze({fromLocal,toFriend});
});
