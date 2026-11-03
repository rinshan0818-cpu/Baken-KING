'use strict';
// Authenticated users may register only their own race identities.
// No stakes, picks, balances, or wallet history can be accepted.
const VENUES=new Set(['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉']);
function validateTargets(value,now=new Date()){
 if(!Array.isArray(value)||value.length>36)throw Error('Invalid target count');
 const today=new Date(now.getTime()+9*3600000).toISOString().slice(0,10);
 const oldest=new Date(Date.parse(today+'T00:00:00Z')-2*86400000).toISOString().slice(0,10);
 const ids=new Set();
 return value.map(x=>{
  if(!x||Array.isArray(x)||Object.keys(x).sort().join(',')!=='date,raceNumber,venue')throw Error('Unexpected target fields');
  if(typeof x.date!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(x.date)||x.date<oldest||x.date>today)throw Error('Target date out of range');
  if(!VENUES.has(x.venue)||!Number.isInteger(x.raceNumber)||x.raceNumber<1||x.raceNumber>12)throw Error('Invalid race identity');
  const id=x.date+'|'+x.venue+'|'+x.raceNumber;
  if(ids.has(id))throw Error('Duplicate race');
  ids.add(id);
  return {date:x.date,venue:x.venue,raceNumber:x.raceNumber};
 });
}
function createMonitorStore(db){
 if(!db||typeof db.query!=='function')throw Error('Restricted DB required');
 return Object.freeze({
  async replace(actor,targets){
   // Per-account INSERT/UPDATE is enforced by PostgreSQL RLS.
   // A global 5-account quota needs a separately audited privileged check.
   if(!targets.length){
    await db.query('DELETE FROM sharing_monitor_targets WHERE owner_id=$1::uuid',[actor]);
    return {registered:0};
   }
   await db.query(`INSERT INTO sharing_monitor_targets(owner_id,targets,updated_at)
    VALUES($1::uuid,$2::jsonb,now())
    ON CONFLICT(owner_id) DO UPDATE SET targets=EXCLUDED.targets,updated_at=now()`,[actor,JSON.stringify(targets)]);
   return {registered:targets.length};
  },
  async own(actor){
   const {rows}=await db.query('SELECT targets,updated_at FROM sharing_monitor_targets WHERE owner_id=$1::uuid',[actor]);
   return rows[0]?{targets:rows[0].targets,updatedAt:rows[0].updated_at}:{targets:[],updatedAt:null};
  }
 });
}
module.exports={validateTargets,createMonitorStore};
