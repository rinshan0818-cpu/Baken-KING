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
 let busy=false,again=false,lastData='',lastCheckedAt=0;
 const ACTIVE_MS=60*1000,IDLE_MS=5*60*1000;
 function hasPendingWagers(){
  try{
   const state=JSON.parse(localStorage.getItem('keiba-demo-v1')||'null');
   return Array.isArray(state?.bets)&&state.bets.some(b=>
    b&&b.status==='pending'&&b.officialReady!==true&&b.specialManualResult!==true&&
    typeof b.realRaceId==='string'&&b.realRaceId.length>0);
  }catch{return false}
 }
 function tick(){
  if(hasPendingWagers()||Date.now()-lastCheckedAt>=IDLE_MS)fetchResults();
 }
 async function fetchResults(){
  if(document.visibilityState==='hidden')return;
  if(busy){again=true;return}
  busy=true;
  lastCheckedAt=Date.now();
  try{
   const r=await fetch('/api/auth/friends/verified-results',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
   if(r.status===401){state.textContent='確定結果の自動取得：ログイン後に利用できます';return}
   if(!r.ok)throw Error('接続エラー HTTP '+r.status);
   const payload=await r.json();
   if(payload?.schemaVersion!==1||!Array.isArray(payload.races))throw Error('配信データの形式が不正です');
   if(typeof window.BakenImportVerifiedResults!=='function')throw Error('馬券の結果取込機能が未読込です');
   const serialized=JSON.stringify(payload);
   if(serialized===lastData){state.textContent='確定結果の自動取得：接続中（検証済 '+payload.races.length+'R）';return}
   const count=await window.BakenImportVerifiedResults(payload);
   lastData=serialized;
   state.textContent=count>0?'精算待ちの馬券 '+count+'枚を更新しました':'確定結果の自動取得：接続中（検証済 '+payload.races.length+'R）';
   if(count>0)window.dispatchEvent(new CustomEvent('baken:new-settlement-ready',{detail:{count}}));
  }catch(e){state.textContent='確定結果の自動取得：'+(e?.message||'確認できません')}
  finally{busy=false;if(again){again=false;queueMicrotask(fetchResults)}}
 }
 window.BakenRefreshVerifiedResults=fetchResults;
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')fetchResults()});
 window.addEventListener('focus',fetchResults);
 window.addEventListener('baken:account-changed',()=>{lastData='';fetchResults()});
 window.addEventListener('baken:wagers-updated',()=>{lastData=''});
 // Check the already verified server feed more frequently only while a wager
 // still awaits official results. JRA scraping cadence is unchanged.
 setInterval(tick,ACTIVE_MS);
 fetchResults();
})();
