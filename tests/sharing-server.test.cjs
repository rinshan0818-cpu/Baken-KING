const assert=require('node:assert/strict');
const {createSharingService}=require('../sharing-server/service.cjs');
const events=[];
const store={
 getOwnProfile:async id=>({displayName:'Tester '+id}),
 createInvitation:async(a,b)=>{events.push(['invite',a,b]);return {ok:true}},
 respondToInvitation:async(a,b,c)=>{events.push(['respond',a,b,c]);return {ok:true}},
 revokeFriendship:async(a,b)=>{events.push(['revoke',a,b]);return {ok:true}},
 areFriends:async(a,b)=>a==='22222222-2222-4222-8222-222222222222'&&b==='11111111-1111-4111-8111-111111111111',
 upsertOwnSummary:async(id,metrics)=>{events.push(['write',id,metrics]);return {ok:true}},
 getPublicSummary:async(viewer,owner)=>({stakeYen:500,returnedYen:600,settledTicketCount:1})
};
const authenticate=async req=>req.verifiedSession||null;
const service=createSharingService({authenticate,store});
const alice={method:'GET',verifiedSession:{id:'11111111-1111-4111-8111-111111111111',emailVerified:true}};
const bob={method:'GET',verifiedSession:{id:'22222222-2222-4222-8222-222222222222',emailVerified:true}};
const stranger={method:'GET',verifiedSession:{id:'33333333-3333-4333-8333-333333333333',emailVerified:true}};
(async()=>{
 assert.deepEqual(await service.readSummary(bob,alice.verifiedSession.id),{stakeYen:500,returnedYen:600,settledTicketCount:1});
 await assert.rejects(service.readSummary(stranger,alice.verifiedSession.id),/Forbidden/);
 await assert.rejects(service.readSummary({method:'GET'},alice.verifiedSession.id),/Forbidden/);
 await assert.rejects(service.readSummary({method:'GET',verifiedSession:{id:'44444444-4444-4444-8444-444444444444',emailVerified:false}},alice.verifiedSession.id),/Forbidden/);
 await assert.rejects(service.readSummary({...bob,method:'POST'},alice.verifiedSession.id),/Method not allowed/);
 await service.writeSummary({...bob,method:'POST'},{stakeYen:100});
 assert.equal(events[0][1],bob.verifiedSession.id);
 events.length=0;
 await assert.rejects(service.invite({...alice,method:'POST'},alice.verifiedSession.id),/Forbidden/);
 await service.invite({...alice,method:'POST'},bob.verifiedSession.id);
 assert.deepEqual(events[0],['invite','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222']);
 await service.respond({...bob,method:'POST'},'invite_123',true);
 assert.deepEqual(events[1],['respond','22222222-2222-4222-8222-222222222222','invite_123',true]);
 await assert.rejects(service.respond({...bob,method:'POST'},'invite_123','yes'),/Forbidden/);
 await service.revoke({...alice,method:'POST'},bob.verifiedSession.id);
 assert.equal(events.length,3);
 console.log('PASS: sharing API service denies unauthenticated/unverified/non-friend access');
})().catch(e=>{console.error(e);process.exitCode=1});
