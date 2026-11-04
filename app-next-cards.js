/* Account-authenticated private JRA race cards for Vercel PWA.
 * Read-only: preserves existing saved cards on network errors and 404.
 */
(()=>{
 'use strict';
 if(location.hostname!=='baken-king-app-next.vercel.app')return;
 if(localStorage.getItem('baken-king-mode-v1')==='test')return;
 const account=document.getElementById('bkAccountSettings');
 if(!account)return;
 const status=document.createElement('p');
 status.className='muted';status.id='bkAccountCardsStatus';
 status.textContent='出馬表の自動取得：確認中';
 account.append(status);
 let busy=false,again=false,last='',lastChecked=0;
 async function refresh(){
  if(document.visibilityState==='hidden')return;
  if(busy){again=true;return}
  if(typeof window.BakenImportAuthorizedCards!=='function'){
   status.textContent='出馬表の読み込み準備中';return;
  }
  busy=true;
  try{
   const response=await fetch('/api/auth/friends/race-cards',{
    method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}
   });
   if(response.status===401){status.textContent='出馬表の自動取得：ログイン後に利用できます';return}
   if(response.status===404){status.textContent='本日の出馬表は配信待ちです';return}
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();
   if(!data||!Array.isArray(data.races)||data.races.length===0||data.races.length>108)
    throw Error('出馬表データの形式が不正です');
   const signature=JSON.stringify(data.races);
   if(signature===last){status.textContent='本日の出馬表 '+data.races.length+'レースを確認済み';return}
   const count=await window.BakenImportAuthorizedCards(data);
   last=signature;
   lastChecked=Date.now();
   status.textContent='本日の出馬表 '+count+'レースを受信しました';
  }catch(error){
   status.textContent='出馬表の自動取得：'+(error?.message||'接続できません');
  }finally{
   busy=false;
   if(again){again=false;queueMicrotask(refresh)}
  }
 }
 window.BakenRefreshAccountCards=refresh;
 window.addEventListener('focus',refresh);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()});
 window.addEventListener('baken:account-changed',()=>{last='';refresh()});
 setInterval(refresh,5*60*1000);
 refresh();
})();
