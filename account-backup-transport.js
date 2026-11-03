/* Browser transport for an explicitly configured authenticated Baken-KING API.
 * Not loaded or enabled by default; never contains a DB secret.
 * JWT must come from a verified Neon Auth session, never from user text.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;else root.BakenAccountBackupTransport=api;
})(typeof globalThis==='object'?globalThis:this,()=>{
 'use strict';
 function create({apiOrigin,getToken,fetcher=globalThis.fetch}){
  const base=new URL(apiOrigin);
  if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw Error('Invalid API origin');
  if(typeof getToken!=='function'||typeof fetcher!=='function')throw Error('Authenticated API required');
  async function request(method,payload){
   const token=await getToken();
   if(typeof token!=='string'||!token||token.length>10000)throw Error('ログインが必要です');
   const res=await fetcher(base.origin+'/api/account/backup',{
    method,headers:{Authorization:'Bearer '+token,Accept:'application/json',...(payload?{'Content-Type':'application/json'}:{})},
    ...(payload?{body:JSON.stringify(payload)}:{}),credentials:'omit',cache:'no-store',redirect:'error'
   });
   const body=await res.json().catch(()=>null);
   if(res.status===409){const e=Error('別の端末から更新されています。再確認してください');e.code='CONFLICT';throw e}
   if(!res.ok||!body?.ok)throw Error(res.status===401?'ログインし直してください':'クラウドに接続できませんでした');
   return body;
  }
  return Object.freeze({
   read:async()=>request('GET'),
   write:async({backup,expectedRevision})=>{
    if(expectedRevision===null)return request('POST',{backup});
    if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1)throw Error('更新番号が不正です');
    return request('PUT',{backup,expectedRevision});
   }
  });
 }
 return Object.freeze({create});
});
