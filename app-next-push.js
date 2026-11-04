/* Account-scoped optional Web Push in the Vercel PWA.
 * Subscriptions are tied to verified users and their own selected race IDs.
 * No wager combinations, stakes, wallet or results are uploaded.
 */
(()=>{
 'use strict';
 if(location.hostname!=='baken-king-app-next.vercel.app'||localStorage.getItem('baken-king-mode-v1')==='test')return;
 const panel=document.querySelector('.bk-push-panel');
 if(!panel)return;
 // Legacy device-token UI remains for GitHub Pages only.
 for(const node of [...panel.children].slice(2,6)){
  node.hidden=true;node.style.display='none';node.setAttribute('aria-hidden','true');
 }
 const box=document.createElement('div');
 box.className='bk-account-push';
 const summary=document.createElement('p');summary.className='muted';
 summary.textContent='ログイン済みのアカウントで通知を管理します。旧端末トークンの設定は不要です。';
 const actions=document.createElement('div');actions.className='row';
 const enable=document.createElement('button');enable.type='button';enable.textContent='通知を有効にする';
 const disable=document.createElement('button');disable.type='button';disable.className='outline';disable.textContent='通知を停止';
 const test=document.createElement('button');test.type='button';test.className='outline';test.textContent='通知表示をテスト';
 actions.append(enable,disable,test);
 const status=document.createElement('p');status.className='muted';status.setAttribute('aria-live','polite');
 status.textContent='アカウントの通知設定を確認中…';
 box.append(summary,actions,status);
 panel.insertBefore(box,panel.querySelector('.bk-push-sound-box'));
 const ENDPOINT='/api/auth/friends/push-subscriptions';
 let busy=false,again=false,registration=null,publicKey='',owner=null,lastSignature='';
 const json=async r=>r.json().catch(()=>({}));
 const available=()=>('serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window&&window.isSecureContext);
 const standalone=()=>!(/iPhone|iPad|iPod/.test(navigator.userAgent))||
   window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const get=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
 function targets(){
  const stored=get('baken-king-personal-cards-v1');
  const cards=Array.isArray(stored)?stored:stored?.races;
  const bets=get('keiba-demo-v1')?.bets;
  if(!Array.isArray(cards)||!Array.isArray(bets))return [];
  return window.BakenMonitoringTargets?.extractTargets?.(bets,cards)||[];
 }
 function bytes(raw){
  const normalized=raw.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(raw.length/4)*4,'=');
  return Uint8Array.from(atob(normalized),c=>c.charCodeAt(0));
 }
 async function session(){
  const r=await fetch('/api/auth/get-session',{credentials:'same-origin',cache:'no-store'});
  if(!r.ok)return null;
  const data=await json(r),u=data.user||data.data?.user;
  return u?.emailVerified===true&&typeof u.id==='string'?u.id:null;
 }
 async function api(method,body){
  const r=await fetch(ENDPOINT,{method,credentials:'same-origin',cache:'no-store',
   headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},
   ...(body?{body:JSON.stringify(body)}:{})});
  const data=await json(r);
  if(!r.ok||data.error)throw Error('通知API HTTP '+r.status);
  return data;
 }
 async function syncExisting(force=false){
  if(busy){again=true;return}
  if(document.visibilityState==='hidden'||!available()||!standalone())return;
  busy=true;
  try{
   owner=await session();
   if(!owner){status.textContent='通知を利用するにはログインしてください';return}
   registration=await navigator.serviceWorker.ready;
   const sub=await registration.pushManager.getSubscription();
   if(!sub){lastSignature='';return}
   const list=targets(),signature=owner+':'+JSON.stringify(list)+':'+sub.endpoint;
   if(!force&&signature===lastSignature)return;
   const data=await api('POST',{subscription:sub.toJSON(),targets:list});
   if(data.ok!==true||data.registered!==list.length)throw Error('監視対象の登録が一致しません');
   lastSignature=signature;
   status.textContent='通知登録済み（監視候補 '+list.length+'レース）';
  }catch(e){status.textContent='通知の同期に失敗：'+e.message}
  finally{busy=false;if(again){again=false;queueMicrotask(()=>syncExisting())}}
 }
 async function refresh(){
  enable.disabled=true;disable.disabled=true;test.disabled=true;
  if(!available()){status.textContent='この環境はプッシュ通知非対応です';return}
  if(!standalone()){status.textContent='iPhoneはSafariでホーム画面に追加したアプリから利用してください';return}
  try{
   owner=await session();
   if(!owner){status.textContent='ログイン後に通知を設定できます';return}
   registration=await navigator.serviceWorker.ready;
   const data=await api('GET');
   publicKey=data.publicKey||'';
   if(!/^[A-Za-z0-9_-]{80,100}$/.test(publicKey))throw Error('公開鍵が未設定です');
   if(Notification.permission==='denied'){status.textContent='iPhoneの設定で通知が拒否されています';return}
   const sub=await registration.pushManager.getSubscription();
   enable.disabled=false;disable.disabled=!sub;test.disabled=Notification.permission!=='granted'||!sub;
   enable.textContent=sub?'通知を更新':'通知を有効にする';
   status.textContent=sub?'通知登録の更新が可能です':'通知はまだ有効ではありません';
   if(sub)await syncExisting(true);
  }catch(e){status.textContent='通知サーバーの確認に失敗：'+e.message}
 }
 enable.onclick=async event=>{
  if(!event.isTrusted||busy||!publicKey||!registration)return;
  enable.disabled=true;
  try{
   // iOS requires subscribe() to start within a direct click gesture.
   const task=registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(publicKey)});
   const subscription=await task;
   const list=targets();
   const data=await api('POST',{subscription:subscription.toJSON(),targets:list});
   if(data.ok!==true||data.registered!==list.length)throw Error('登録に失敗しました');
   lastSignature=(owner||'')+':'+JSON.stringify(list)+':'+subscription.endpoint;
   status.textContent='通知を有効にしました（'+list.length+'レース）';
  }catch(e){status.textContent='通知の有効化に失敗：'+e.message}
  finally{enable.disabled=false;refresh()}
 };
 async function release(){
  if(busy)return false;
  busy=true;
  try{
   if(!('serviceWorker' in navigator)||!('PushManager' in window))return true;
   const reg=registration||await navigator.serviceWorker.getRegistration();
   if(!reg)return true;
   const sub=await reg.pushManager.getSubscription();
   if(sub){await api('DELETE',{endpoint:sub.endpoint});await sub.unsubscribe()}
   lastSignature='';status.textContent='この端末の通知を停止しました';
   return true;
  }catch(e){status.textContent='通知の停止に失敗：'+e.message;return false}
  finally{busy=false}
 }
 disable.onclick=()=>release().then(()=>refresh());
 window.BakenReleaseAccountPush=release;
 test.onclick=async event=>{
  if(!event.isTrusted||Notification.permission!=='granted')return;
  try{
   const reg=registration||await navigator.serviceWorker.ready;
   await reg.showNotification('Baken-KING【表示テスト】',{body:'通知の表示テストです。実際の結果ではありません。',
    icon:'./baken_king_icon_512.png',tag:'baken-local-notification-test'});
   status.textContent='テスト通知を表示しました';
  }catch(e){status.textContent='テスト通知に失敗：'+e.message}
 };
 for(const type of ['baken:wagers-updated','baken:cards-imported'])
  window.addEventListener(type,()=>syncExisting());
 window.addEventListener('baken:account-changed',()=>{lastSignature='';refresh()});
 window.addEventListener('focus',refresh);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()});
 setInterval(()=>syncExisting(),5*60*1000);
 refresh();
})();