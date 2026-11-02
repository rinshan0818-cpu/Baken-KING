/* Friends sync core. The browser must NOT call any endpoint until an authenticated
   transport has been provided by the future same-origin authenticated API. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BakenFriendSync=api})(typeof globalThis==='object'?globalThis:this,()=>{
 'use strict';
 const INTERVAL_MS=30*60*1000;
 function create({transport,localSnapshot,receiveFriend,clock=()=>Date.now()}){
  if(typeof transport!=='function'||typeof localSnapshot!=='function'||typeof receiveFriend!=='function')throw Error('Missing secure sync dependencies');
  let lastSuccess=0,busy=false;
  const state=()=>Object.freeze({lastSuccess,busy,nextDue:lastSuccess?lastSuccess+INTERVAL_MS:null});
  async function sync({force=false}={}){
   if(busy)return {status:'busy'};
   const now=clock();
   if(!force&&lastSuccess&&now-lastSuccess<INTERVAL_MS)return {status:'not-due'};
   busy=true;
   try{
    const own=localSnapshot();
    if(!own||!Array.isArray(Object.keys(own.metrics||{}))||!own.metrics)throw Error('Invalid local summary');
    const result=await transport(own);
    if(!result||result.ok!==true)throw Error('Sync unavailable');
    // Never overwrite friend data on a failed request.
    if(result.friend)await receiveFriend(result.friend);
    lastSuccess=clock();
    return {status:'updated'};
   }catch(e){return {status:'failed',reason:e.message}}
   finally{busy=false}
  }
  return Object.freeze({sync,state,INTERVAL_MS});
 }
 return Object.freeze({create,INTERVAL_MS});
});
