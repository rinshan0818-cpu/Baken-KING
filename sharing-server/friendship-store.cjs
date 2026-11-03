'use strict';
// Server-side friendship methods; never import this from GitHub Pages.
// Call only after a trustworthy authenticate() has established the actor.
// SQL must run with a dedicated, least-privileged authenticated database role.
const {randomUUID}=require('node:crypto');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validId(id){if(typeof id!=='string'||!UUID.test(id))throw Error('Invalid identifier');return id}
function forbidden(){const e=Error('Forbidden');e.status=403;throw e}
function createFriendshipStore(db){
 if(!db||typeof db.query!=='function')throw Error('Database client required');
 return Object.freeze({
  async getOwnProfile(actor){
   const {rows}=await db.query('SELECT display_name FROM sharing_users WHERE id=$1::uuid',[validId(actor)]);
   return rows[0]?{displayName:rows[0].display_name}:null;
  },
  async ensureOwnProfile(actor,displayName='プレイヤー'){
   const id=validId(actor);
   if(typeof displayName!=='string'||!displayName.trim()||displayName.trim().length>16)forbidden();
   const {rows}=await db.query('INSERT INTO sharing_users(id,display_name) VALUES($1::uuid,$2) ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name RETURNING id,display_name',[id,displayName.trim()]);
   return {id:rows[0].id,displayName:rows[0].display_name};
  },
  async listConnections(actor){
   const user=validId(actor);
   const pending=await db.query("SELECT id,sender_id,recipient_id,status,created_at FROM sharing_requests WHERE (sender_id=$1::uuid OR recipient_id=$1::uuid) AND status='pending' ORDER BY created_at DESC LIMIT 50",[user]);
   const friends=await db.query("SELECT CASE WHEN user_low=$1::uuid THEN user_high ELSE user_low END AS id,created_at FROM sharing_friendships WHERE user_low=$1::uuid OR user_high=$1::uuid ORDER BY created_at DESC LIMIT 50",[user]);
   return {invitations:pending.rows.map(r=>({id:r.id,senderId:r.sender_id,recipientId:r.recipient_id,status:r.status,createdAt:r.created_at})),
    friends:friends.rows.map(r=>({id:r.id,createdAt:r.created_at}))};
  },
  async createInvitation(actor,recipient){
   const a=validId(actor),b=validId(recipient);if(a===b)forbidden();
   // The unique pending-pair index also rejects simultaneous opposite-direction requests.
   const id=randomUUID();
   try{
    const {rows}=await db.query(`INSERT INTO sharing_requests(id,sender_id,recipient_id)
     SELECT $1::uuid,$2::uuid,$3::uuid
     WHERE NOT EXISTS(SELECT 1 FROM sharing_friendships
      WHERE user_low=LEAST($2::uuid,$3::uuid) AND user_high=GREATEST($2::uuid,$3::uuid))
     RETURNING id,status`,[id,a,b]);
    if(!rows.length)forbidden();
    return {id:rows[0].id,status:rows[0].status};
   }catch(e){if(e.code==='23505'||e.code==='23503')forbidden();throw e}
  },
  async respondToInvitation(actor,requestId,accepted){
   const user=validId(actor),req=validId(requestId);
   if(typeof accepted!=='boolean')forbidden();
   if(!accepted){
    const {rows}=await db.query(`UPDATE sharing_requests SET status='rejected',decided_at=now()
       WHERE id=$1::uuid AND recipient_id=$2::uuid AND status='pending'
       RETURNING id,status`,[req,user]);
    if(!rows.length)forbidden();return {id:rows[0].id,status:'rejected'};
   }
   // Caller MUST wrap this store operation in one transaction (see actor-transaction.cjs).
   // PostgreSQL RLS cannot see an UPDATE CTE's accepted status in the
   // same statement's INSERT policy snapshot; use sequential statements.
   const {rows}=await db.query(`UPDATE sharing_requests SET status='accepted',decided_at=now()
    WHERE id=$1::uuid AND recipient_id=$2::uuid AND status='pending'
    RETURNING id,sender_id,recipient_id`,[req,user]);
   if(!rows.length)forbidden();
   const approved=rows[0];
   const linked=await db.query(`INSERT INTO sharing_friendships(user_low,user_high)
    VALUES(LEAST($1::uuid,$2::uuid),GREATEST($1::uuid,$2::uuid))
    ON CONFLICT(user_low,user_high) DO NOTHING RETURNING user_low`,[approved.sender_id,approved.recipient_id]);
   if(!linked.rows.length){
    // A concurrent friendship may exist, but the acceptance transaction
    // must still ensure the actual pair is linked before commit.
    const existing=await db.query(`SELECT 1 FROM sharing_friendships
     WHERE user_low=LEAST($1::uuid,$2::uuid) AND user_high=GREATEST($1::uuid,$2::uuid)`,[approved.sender_id,approved.recipient_id]);
    if(!existing.rows.length)throw Error('Friendship not established');
   }
   return {id:approved.id,status:'accepted'};

  },
  async revokeFriendship(actor,friendId){
   const user=validId(actor),other=validId(friendId);if(user===other)forbidden();
   const {rows}=await db.query(`DELETE FROM sharing_friendships
    WHERE user_low=LEAST($1::uuid,$2::uuid) AND user_high=GREATEST($1::uuid,$2::uuid)
      AND ($1::uuid=user_low OR $1::uuid=user_high)
    RETURNING user_low`,[user,other]);
   if(!rows.length)forbidden();return {ok:true};
  }
 });
}
module.exports={createFriendshipStore};
