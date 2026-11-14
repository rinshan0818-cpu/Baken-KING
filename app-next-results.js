/* Account-authenticated verified JRA result feed for Vercel PWA.
   Never settles tickets automatically and never uploads bets. */
(()=>{
 'use strict';
 if(location.hostname!=='baken-king-app-next.vercel.app')return;
 if(localStorage.getItem('baken-king-mode-v1')==='test')return;
 const account=document.getElementById('bkAccountSettings');
 if(!account)return;
 const state=document.createElement('p');state.className='muted';state.id='bkAccountResultStatus';
 state.textContent='確定結果の自動取得：確認中';
 account.append(state);
 let busy=false,again=false,lastData='',notificationRequested=false;
 const tickets=document.querySelector('[data-tab="tickets"]');
 const notificationStatus=document.createElement('p');
 notificationStatus.className='muted';notificationStatus.id='bkNotificationResultStatus';
 notificationStatus.hidden=true;notificationStatus.setAttribute('role','status');
 if(tickets)tickets.prepend(notificationStatus);
 function notificationMessage(message){
  if(!notificationRequested)return;
  notificationStatus.hidden=false;notificationStatus.textContent=message;
 }
 function finishNotification(){
  if(!notificationRequested)return;
  const ready=window.BakenNotificationSettlementReady?.()===true;
  if(ready){notificationRequested=false;notificationStatus.hidden=true;return}
  notificationMessage('通知のレース結果は確認しましたが、この端末に新しい精算待ち馬券はありません。購入したアカウントとレースを確認してください。');
 }
 window.addEventListener('baken:notification-settlement-requested',()=>{
  notificationRequested=true;
  notificationMessage('通知されたレースの確定結果を確認しています…');
  lastData='';
  fetchResults();
 });
 const ACTIVE_MS=60*1000;
 function hasPendingWagers(){
  try{
   const state=JSON.parse(localStorage.getItem('keiba-demo-v1')||'null');
   return state?.win5Watch?.status==='watching'||(Array.isArray(state?.bets)&&state.bets.some(b=>
    b&&b.status==='pending'&&b.officialReady!==true&&b.specialManualResult!==true&&
    typeof b.realRaceId==='string'&&b.realRaceId.length>0))||
    (Array.isArray(state?.win5Tickets)&&state.win5Tickets.some(t=>
     t&&t.status==='pending'&&(t.win5Evaluation?.complete!==true||
       (t.win5Evaluation.hitCount>0&&t.win5PayoutReady!==true))));
  }catch{return false}
 }
 function tick(){
  if(hasPendingWagers())fetchResults();
 }
 async function fetchResults(){
  if(document.visibilityState==='hidden')return;
  if(!hasPendingWagers()){
   state.textContent='結果待ちの馬券なし（自動確認停止）';
   if(notificationRequested){
    const ready=window.BakenNotificationSettlementReady?.()===true;
    if(ready){notificationRequested=false;notificationStatus.hidden=true}
    else notificationMessage('通知を受信しましたが、結果待ちの馬券が見つかりません。購入した端末・アカウントを確認してください。');
   }
   return;
  }
  if(busy){again=true;return}
  busy=true;
  try{
   const r=await fetch('/api/auth/friends/verified-results',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
   if(r.status===401){
    state.textContent='確定結果の自動取得：ログイン後に利用できます';
    notificationMessage('結果同期にはログインが必要です。ログイン後にもう一度確認してください。');
    return;
   }
   if(!r.ok)throw Error('接続エラー HTTP '+r.status);
   const payload=await r.json();
   if(payload?.schemaVersion!==1||!Array.isArray(payload.races))throw Error('配信データの形式が不正です');
   if(typeof window.BakenImportVerifiedResults!=='function')throw Error('馬券の結果取込機能が未読込です');
   const serialized=JSON.stringify(payload);
   if(serialized===lastData){
    state.textContent='確定結果の自動取得：接続中（検証済 '+payload.races.length+'R）';
    finishNotification();return;
   }
   const count=await window.BakenImportVerifiedResults(payload);
   lastData=serialized;
   state.textContent=count>0?'精算待ちの馬券 '+count+'枚を更新しました':'確定結果の自動取得：接続中（検証済 '+payload.races.length+'R）';
   if(count>0)window.dispatchEvent(new CustomEvent('baken:new-settlement-ready',{detail:{count}}));
   finishNotification();
  }catch(e){
   const message=String(e?.message||'確認できません');
   state.textContent='確定結果の自動取得：'+message;
   notificationMessage('通知は届きましたが、確定結果の取得に失敗しました（'+message+'）。通信とログインを確認してください。');
  }
  finally{busy=false;if(again){again=false;queueMicrotask(fetchResults)}}
 }
 // A notification can be received while the result-feed script is loading.
 // Replay the request after setup without relying on event-listener order.
 if(window.BakenNotificationSettlementPending?.()===true){
  notificationRequested=true;
  notificationMessage('通知されたレースの確定結果を確認しています…');
 }
 window.BakenRefreshVerifiedResults=fetchResults;
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')fetchResults()});
 window.addEventListener('focus',fetchResults);
 window.addEventListener('baken:account-changed',()=>{lastData='';fetchResults()});
 window.addEventListener('baken:wagers-updated',()=>{
  lastData='';
  // Buying a ticket starts result checks without waiting for the next minute.
  // The verified result importer also emits this event; avoid a new request
  // during an in-flight import to prevent a self-triggered fetch loop.
  if(!busy&&hasPendingWagers())fetchResults();
 });
 // Check the already verified server feed more frequently only while a wager
 // still awaits official results. JRA scraping cadence is unchanged.
 setInterval(tick,ACTIVE_MS);
 fetchResults();
})();
