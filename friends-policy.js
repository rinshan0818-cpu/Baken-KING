/* Sharing P1 policy core: no network, accounts, secrets or localStorage. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BakenFriendsPolicy=api;
})(typeof globalThis==='object'?globalThis:this,()=>{
 'use strict';
 const ID=/^[a-zA-Z0-9_-]{8,80}$/;
 const fail=()=>{throw new Error('Access denied')};
 function checkId(id){if(typeof id!=='string'||!ID.test(id))fail();return id}
 function session(session){if(!session||session.verified!==true)fail();return checkId(session.subject)}
 function pair(a,b){a=checkId(a);b=checkId(b);if(a===b)fail();return [a,b].sort().join(':')}
 function request(sender,recipient,actor){
  const user=session(actor);if(user!==checkId(sender))fail();
  return Object.freeze({key:pair(sender,recipient),sender,recipient,status:'pending'});
 }
 function respond(req,actor,accept){
  if(!req||req.status!=='pending'||session(actor)!==req.recipient||typeof accept!=='boolean')fail();
  if(req.key!==pair(req.sender,req.recipient))fail();
  return Object.freeze({...req,status:accept?'accepted':'rejected'});
 }
 function canView(owner,viewer,relations){
  const subject=session(viewer),ownerId=checkId(owner);
  if(subject===ownerId)return true;
  if(!Array.isArray(relations))fail();
  return relations.some(r=>r&&r.status==='accepted'&&r.key===pair(ownerId,subject)&&
    ((r.sender===ownerId&&r.recipient===subject)||(r.recipient===ownerId&&r.sender===subject)));
 }
 function revoke(relation,actor){
  if(!relation||relation.status!=='accepted')fail();
  const user=session(actor);
  if(user!==relation.sender&&user!==relation.recipient)fail();
  if(relation.key!==pair(relation.sender,relation.recipient))fail();
  return Object.freeze({...relation,status:'revoked'});
 }
 return Object.freeze({request,respond,canView,revoke});
});