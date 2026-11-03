'use strict';
// Compose API methods so each authenticated call gets its OWN restricted
// PostgreSQL transaction, and every query receives the same actor context.
const {withActorTransaction}=require('./actor-transaction.cjs');
const {createSharingStore}=require('./neon-store.cjs');
const {createFriendshipStore}=require('./friendship-store.cjs');
const {createSharingService}=require('./service.cjs');
const {createSharingHttpHandler}=require('./http.cjs');
function createRestrictedSharingHandler({authenticate,pool,allowedOrigins}){
 if(typeof authenticate!=='function'||!pool||typeof pool.connect!=='function')throw Error('Verified auth and private DB pool required');
 const methods=['me','invite','respond','revoke','writeSummary','readSummary'];
 const service={};
 for(const method of methods){
  service[method]=async(request,...args)=>{
   // Must never trust request body or caller-controlled user ID as actor.
   const user=await authenticate(request);
   if(!user||user.emailVerified!==true||typeof user.id!=='string'){
    const e=Error('Unauthenticated');e.status=401;throw e;
   }
   return withActorTransaction(pool,user.id,async db=>{
    const store={...createSharingStore(db),...createFriendshipStore(db)};
    const inner=createSharingService({authenticate:async()=>user,store});
    return inner[method](request,...args);
   });
  };
 }
 return createSharingHttpHandler(service,{allowedOrigins});
}
module.exports={createRestrictedSharingHandler};
