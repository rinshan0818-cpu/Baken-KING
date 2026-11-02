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
  async createInvitation(actor,recipient){
   const a=validId(actor),b=validId(recipient);if(a===b)forbidden();
   // The unique pending-pair index also rejects simultaneous opposite-direction requests.
   const id=randomUUID();
   try{
    const {rows}=await db.query(`INSERT INTO sharing_requests(id,sender_id,recipient_id)
     SELECT $1::uuid,$2::uuid,$3::uuid
     WHERE EXISTS(SELECT 1 FROM sharing_users WHERE id=$2::uuid)
       AND EXISTS(SELECT 1 FROM sharing_users WHERE id=$3::uuid)
       AND NOT EXISTS(SELECT 1 FROM sharing_friendships
        WHERE user_low=LEAST($2::uuid,$3::uuid) AND user_high=GREATEST($2::uuid,$3::uuid))
     RETURNING id,status`,[id,a,b]);
    if(!rows.length)forbidden();
    return {id:rows[0].id,status:rows[0].status};
   }catch(e){if(e.code==='23505')forbidden();throw e}
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
   // One SQL statement: granting friendship is contingent on recipient-only
   // pending->accepted transition, and rolls back with the statement on error.
   const {rows}=await db.query(`WITH approved AS (
     UPDATE sharing_requests SET status='accepted',decided_at=now()
      WHERE id=$1::uuid AND recipient_id=$2::uuid AND status='pending'
      RETURNING id,sender_id,recipient_id
    ), linked AS (
     INSERT INTO sharing_friendships(user_low,user_high)
      SELECT LEAST(sender_id,recipient_id),GREATEST(sender_id,recipient_id) FROM approved
      ON CONFLICT (user_low,user_high) DO NOTHING RETURNING user_low
    )
    SELECT id FROM approved`,[req,user]);
   if(!rows.length)forbidden();
   return {id:rows[0].id,status:'accepted'};
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
