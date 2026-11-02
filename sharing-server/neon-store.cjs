'use strict';
// Neon/Postgres adapter for a verified-authenticated service (server only).
// "db" must be a server-side pooled pg client exposing query(sql,params).
// User identity comes solely from verified server auth, never from request JSON.
function createSharingStore(db){
 if(!db||typeof db.query!=='function')throw Error('Database client required');
 function id(value){if(typeof value!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))throw Error('Invalid user identifier');return value}
 function summary(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid summary');
  const keys=['stakeYen','returnedYen','settledTicketCount','purchasedRaceCount','hitRaceCount','settledRaceCount','maxPayoutYen'];
  if(Object.keys(value).sort().join(',')!==keys.sort().join(','))throw Error('Unexpected summary fields');
  for(const key of keys)if(value[key]!==null&&(!Number.isSafeInteger(value[key])||value[key]<0||value[key]>(key==='settledTicketCount'?100000:1e12)))throw Error('Invalid '+key);
  for(const key of keys)if(value[key]===null&&key!=='maxPayoutYen')throw Error('Invalid '+key);
  if(value.hitRaceCount>value.settledRaceCount||value.settledRaceCount>value.purchasedRaceCount)throw Error('Invalid race totals');
  return value;
 }
 return Object.freeze({
  async upsertOwnSummary(actor,metrics){
   const uid=id(actor),m=summary(metrics);
   const {rows}=await db.query(`INSERT INTO sharing_snapshots(owner_id,stake_yen,returned_yen,settled_ticket_count,purchased_race_count,hit_race_count,settled_race_count,max_payout_yen,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,now()) ON CONFLICT(owner_id) DO UPDATE SET stake_yen=excluded.stake_yen,
    returned_yen=excluded.returned_yen,settled_ticket_count=excluded.settled_ticket_count,purchased_race_count=excluded.purchased_race_count,hit_race_count=excluded.hit_race_count,settled_race_count=excluded.settled_race_count,max_payout_yen=excluded.max_payout_yen,updated_at=now()
    RETURNING updated_at`,[uid,m.stakeYen,m.returnedYen,m.settledTicketCount,m.purchasedRaceCount,m.hitRaceCount,m.settledRaceCount,m.maxPayoutYen]);
   return {updatedAt:rows[0]?.updated_at};
  },
  async areFriends(actor,owner){
   const a=id(actor),b=id(owner);
   const {rows}=await db.query(`SELECT 1 AS ok FROM sharing_friendships WHERE user_low=LEAST($1::uuid,$2::uuid) AND user_high=GREATEST($1::uuid,$2::uuid) LIMIT 1`,[a,b]);
   return rows.length>0;
  },
  async getPublicSummary(actor,owner){
   const viewer=id(actor),target=id(owner);
   // Permission checked in the same statement as data retrieval; no unauthenticated query path.
   const {rows}=await db.query(`SELECT s.stake_yen,s.returned_yen,s.settled_ticket_count,s.purchased_race_count,s.hit_race_count,s.settled_race_count,s.max_payout_yen,s.updated_at
    FROM sharing_snapshots s WHERE s.owner_id=$2
    AND ($1::uuid=$2::uuid OR EXISTS(
      SELECT 1 FROM sharing_friendships f
      WHERE f.user_low=LEAST($1::uuid,$2::uuid) AND f.user_high=GREATEST($1::uuid,$2::uuid)))`,[viewer,target]);
   if(!rows.length)return null;
   const row=rows[0];return {stakeYen:Number(row.stake_yen),returnedYen:Number(row.returned_yen),
    profitYen:Number(row.returned_yen)-Number(row.stake_yen),
    roiPercent:Number(row.stake_yen)>0?Math.round(Number(row.returned_yen)/Number(row.stake_yen)*10000)/100:null,
    settledTicketCount:Number(row.settled_ticket_count),purchasedRaceCount:Number(row.purchased_race_count),hitRaceCount:Number(row.hit_race_count),settledRaceCount:Number(row.settled_race_count),raceHitRatePercent:Number(row.settled_race_count)>0?Math.round(Number(row.hit_race_count)/Number(row.settled_race_count)*1000)/10:null,maxPayoutYen:row.max_payout_yen===null?null:Number(row.max_payout_yen),updatedAt:row.updated_at};
  }
 });
}
module.exports={createSharingStore};
