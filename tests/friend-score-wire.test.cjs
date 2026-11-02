const assert=require('node:assert/strict');const {fromLocal,toFriend}=require('../friend-score-wire.js');
const own={stake:100,paid:150,settled:1,races:2,hitRaces:1,settledRaceCount:2,maxPayout:150,secret:'NEVER SEND'};
const payload=fromLocal(own);assert.equal(payload.settledRaceCount,2);assert.equal(payload.secret,undefined);assert.equal(Object.keys(payload).length,7);
const friend=toFriend({profitYen:50,roiPercent:150,stakeYen:100,returnedYen:150,purchasedRaceCount:2,hitRaceCount:1,raceHitRatePercent:50,maxPayoutYen:150,settledTicketCount:1});
assert.deepEqual(Object.keys(friend.metrics).sort(),['profit','roi','stake','paid','races','hitRaces','raceRate','maxPayout','settled'].sort());
assert.throws(()=>fromLocal({...own,settledRaceCount:undefined}),/Missing settled/);
console.log('PASS: seven cloud primitives map to nine UI metrics without sending private local fields');