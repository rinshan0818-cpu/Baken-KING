'use strict';
// P1 server-only application service. Not imported by GitHub Pages.
// authenticate(request) MUST validate a signed session server-side.
// store methods MUST enforce authenticated identity and DB authorization.
function createSharingService({authenticate,store}){
 if(typeof authenticate!=='function'||!store)throw Error('Secure dependencies required');
 const deny=()=>{const e=new Error('Forbidden');e.status=403;throw e};
 async function identity(request){
  const user=await authenticate(request);
  if(!user||user.emailVerified!==true||typeof user.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user.id))deny();
  return user.id;
 }
 const requireMethod=(method,actual)=>{if(method!==actual){const e=new Error('Method not allowed');e.status=405;throw e}};
 return Object.freeze({
  async me(request){
   requireMethod('GET',request.method);
   const id=await identity(request);
   return {id,profile:await store.getOwnProfile(id)};
  },
  async invite(request,recipient){
   requireMethod('POST',request.method);
   const actor=await identity(request);
   if(typeof recipient!=='string'||recipient===actor)deny();
   return store.createInvitation(actor,recipient); // Store must validate recipient and duplicate pending request.
  },
  async respond(request,requestId,accepted){
   requireMethod('POST',request.method);
   const actor=await identity(request);
   if(typeof accepted!=='boolean')deny();
   return store.respondToInvitation(actor,requestId,accepted); // Atomic recipient-only update.
  },
  async revoke(request,friendId){
   requireMethod('DELETE',request.method);
   const actor=await identity(request);
   return store.revokeFriendship(actor,friendId);
  },
  async writeSummary(request,metrics){
   requireMethod('POST',request.method);
   const actor=await identity(request);
   return store.upsertOwnSummary(actor,metrics); // Never accept owner ID from request body.
  },
  async readSummary(request,ownerId){
   requireMethod('GET',request.method);
   const viewer=await identity(request);
   if(viewer!==ownerId && !(await store.areFriends(viewer,ownerId)))deny();
   return store.getPublicSummary(viewer,ownerId); // DB adapter must also enforce viewer permission.
  }
 });
}
module.exports={createSharingService};
