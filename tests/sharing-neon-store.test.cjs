const assert=require('node:assert/strict');const {createSharingStore}=require('../sharing-server/neon-store.cjs');
const calls=[];const db={query:async(sql,params)=>{calls.push({sql,params});return {rows:sql.startsWith('SELECT')?[{stake_yen:'100',returned_yen:'150',settled_ticket_count:1,updated_at:'now'}]:[{updated_at:'now'}]}}};
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
(async()=>{
 const store=createSharingStore(db);
 await store.upsertOwnSummary(a,{stakeYen:100,returnedYen:150,settledTicketCount:1});
 const read=await store.getPublicSummary(a,b);
 assert.equal(read.profitYen,50);assert.equal(read.roiPercent,150);
 assert.equal(calls[0].params[0],a);assert.equal(calls[1].params[1],b);
 assert(calls[1].sql.includes('sharing_friendships'));
 assert(calls[1].sql.includes('$1::uuid=$2::uuid'));
 await assert.rejects(store.upsertOwnSummary(a,{stakeYen:-1,returnedYen:1,settledTicketCount:1}));
 await assert.rejects(store.upsertOwnSummary(a,{stakeYen:1,returnedYen:1,settledTicketCount:1,privateBets:[]}));
 await assert.rejects(store.getPublicSummary('spoof',b));
 console.log('PASS: server data adapter parameterizes writes, guards reads, and rejects extra data');
})().catch(e=>{console.error(e);process.exitCode=1});
