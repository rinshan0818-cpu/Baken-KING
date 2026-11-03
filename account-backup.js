/* Baken-KING: client-side account backup coordinator.
 * No network endpoint is configured by default. Explicit consent is mandatory.
 * Never auto-restore or overwrite local wagers/wallet records.
 * CommonJS export supports independent regression testing.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BakenAccountBackup=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const FORMAT='BAKEN_KING_BACKUP';
 const MAX_BYTES=5_000_000;
 const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 function validBackup(backup){
  if(!backup||typeof backup!=='object'||Array.isArray(backup)||backup.format!==FORMAT||backup.schemaVersion!==2||
     !backup.state||!Array.isArray(backup.state.bets)||!Array.isArray(backup.state.seasons)||
     !backup.extras||typeof backup.extras!=='object'||Array.isArray(backup.extras))throw Error('バックアップ形式が正しくありません');
  const bytes=typeof Buffer!=='undefined'?Buffer.byteLength(JSON.stringify(backup),'utf8'):new TextEncoder().encode(JSON.stringify(backup)).length;
  if(bytes>MAX_BYTES)throw Error('バックアップが大きすぎます');
  return backup;
 }
 function create({session,readLocal,transport,restoreLocal}){
  if(typeof session!=='function'||typeof readLocal!=='function'||typeof restoreLocal!=='function')throw Error('Account backup dependencies missing');
  // transport must be a trusted, authenticated adapter; no browser SQL.
  let busy=false;
  const requireUser=async()=>{
   const user=await session();
   if(!user||!ID.test(user.id)||user.emailVerified!==true)throw Error('メール確認済みのログインが必要です');
   return user;
  };
  async function upload({consent=false,expectedRevision=null}={}){
   if(!consent)throw Error('バックアップの明示的な確認が必要です');
   if(typeof transport?.write!=='function')throw Error('クラウド保存はまだ利用できません');
   if(busy)throw Error('別の処理を実行中です');
   busy=true;
   try{
    const user=await requireUser();
    const backup=validBackup(await readLocal());
    if(expectedRevision!==null&&(!Number.isSafeInteger(expectedRevision)||expectedRevision<1))throw Error('更新番号が不正です');
    // Server must bind owner to verified JWT, enforce CAS, and encrypt.
    const response=await transport.write({backup,expectedRevision,actorId:user.id});
    if(!response||response.ok!==true||!Number.isSafeInteger(response.revision)||response.revision<1)throw Error('クラウド保存に失敗しました');
    return {revision:response.revision};
   }finally{busy=false}
  }
  async function inspect(){
   if(typeof transport?.read!=='function')throw Error('クラウド復元はまだ利用できません');
   const user=await requireUser();
   const result=await transport.read({actorId:user.id});
   if(!result?.ok)throw Error('クラウドの状態を取得できません');
   if(result.backup!==null&&result.backup!==undefined)validBackup(result.backup);
   return {backup:result.backup||null,revision:result.revision||null,updatedAt:result.updatedAt||null};
  }
  async function restore({preview,consent=false}={}){
   if(!consent)throw Error('復元には明示的な確認が必要です');
   if(!preview?.backup)throw Error('復元対象を確認してください');
   const user=await requireUser();
   // Never overwrite the local wallet without explicit caller confirmation.
   const backup=validBackup(preview.backup);
   await restoreLocal({backup,actorId:user.id});
   return {restored:true};
  }
  return Object.freeze({upload,inspect,restore,isBusy:()=>busy});
 }
 return Object.freeze({create,validBackup,MAX_BYTES});
});
