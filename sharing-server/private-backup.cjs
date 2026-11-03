'use strict';
// Server-only encrypted backup model. This module is NOT mounted to any HTTP endpoint.
// Identity is a verified Neon Auth subject, never an email string or request body.
// Application data is encrypted before the SQL adapter receives it.
const crypto=require('node:crypto');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BYTES=5_000_000;
function invalid(message){const e=Error(message);e.status=400;throw e}
function conflict(){const e=Error('Backup has changed on another device');e.status=409;throw e}
function createPrivateBackupStore(db,keyHex){
 if(!db||typeof db.query!=='function')throw Error('Restricted DB connection required');
 if(typeof keyHex!=='string'||!/^[0-9a-f]{64}$/i.test(keyHex))throw Error('Server-side encryption key required');
 const key=Buffer.from(keyHex,'hex');
 const identity=id=>{if(typeof id!=='string'||!UUID.test(id))invalid('Invalid authenticated user');return id};
 const revision=rev=>{if(!Number.isSafeInteger(rev)||rev<1)invalid('Invalid revision');return rev};
 function validatePayload(payload){
  if(!payload||typeof payload!=='object'||Array.isArray(payload)||payload.format!=='BAKEN_KING_BACKUP'||payload.schemaVersion!==2||!payload.state||!Array.isArray(payload.state.bets)||!payload.extras||typeof payload.extras!=='object'||Array.isArray(payload.extras))invalid('Unsupported backup');
  if(payload.state.bets.length>100000)invalid('Too many tickets');
  const allowed=new Set(['baken-king-tags-v1','baken-king-real-notes-v1','baken-king-imported-race-v1','baken-king-imported-race-drafts-v1','baken-king-personal-cards-v1']);
  if(Object.keys(payload.extras).some(k=>!allowed.has(k)))invalid('Unexpected extra data');
  const raw=Buffer.from(JSON.stringify(payload),'utf8');
  if(raw.length>MAX_BYTES)invalid('Backup too large');
  return raw;
 }
 function seal(raw,userId){
  const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
  cipher.setAAD(Buffer.from(userId));
  const encrypted=Buffer.concat([cipher.update(raw),cipher.final()]);
  return {iv,tag:cipher.getAuthTag(),encrypted};
 }
 function unseal(row,userId){
  const decipher=crypto.createDecipheriv('aes-256-gcm',key,row.iv);
  decipher.setAAD(Buffer.from(userId));decipher.setAuthTag(row.tag);
  const raw=Buffer.concat([decipher.update(row.ciphertext),decipher.final()]);
  if(raw.length>MAX_BYTES)throw Error('Backup too large');
  return JSON.parse(raw.toString('utf8'));
 }
 return Object.freeze({
  async read(actor){
   const id=identity(actor);
   const {rows}=await db.query('SELECT revision,iv,tag,ciphertext,updated_at FROM sharing_private_backups WHERE owner_id=$1::uuid',[id]);
   if(!rows.length)return null;
   const row=rows[0];
   return {revision:Number(row.revision),backup:unseal(row,id),updatedAt:row.updated_at};
  },
  async create(actor,payload){
   const id=identity(actor),{iv,tag,encrypted}=seal(validatePayload(payload),id);
   const {rows}=await db.query('INSERT INTO sharing_private_backups(owner_id,revision,iv,tag,ciphertext) VALUES($1::uuid,1,$2,$3,$4) ON CONFLICT(owner_id) DO NOTHING RETURNING revision',[id,iv,tag,encrypted]);
   if(!rows.length)conflict();
   return {revision:1};
  },
  async update(actor,payload,expectedRevision){
   const id=identity(actor),rev=revision(expectedRevision),{iv,tag,encrypted}=seal(validatePayload(payload),id);
   const {rows}=await db.query('UPDATE sharing_private_backups SET revision=revision+1,iv=$3,tag=$4,ciphertext=$5,updated_at=now() WHERE owner_id=$1::uuid AND revision=$2 RETURNING revision',[id,rev,iv,tag,encrypted]);
   if(!rows.length)conflict();
   return {revision:Number(rows[0].revision)};
  }
 });
}
module.exports={createPrivateBackupStore,MAX_BYTES};
