/* Read authorized private race cards via the authenticated Vercel bridge.
 * Never sends purchases or stores a GitHub token.
 */
(()=>{
 'use strict';
 // Isolated Beta fixture mode must not read or alter live monitoring state.
 if(localStorage.getItem('baken-king-mode-v1')==='test')return;
 const SETTINGS='baken-monitor-sync-config-v1';
 const status=document.getElementById('bkCardImportStatus');
 const message=document.getElementById('bkPrivateCardMessage');
 const check=document.getElementById('bkPrivateCardCheck');
 let loading=false,lastSignature='';
 function config(){try{return JSON.parse(localStorage.getItem(SETTINGS)||'null')}catch{return null}}
 async function refresh(){
   if(loading||document.visibilityState==='hidden')return;
   const c=config();
   if(!c?.enabled||!c.endpoint||!c.token){
     message.textContent='未接続：上の「結果監視の自動同期」で接続設定を有効にしてください。';
     return;
   }
   if(typeof window.BakenImportAuthorizedCards!=='function'){
     message.textContent='出馬表の読み込み機能がまだ準備できていません。';
     return;
   }
   let api;
   try{
     const endpoint=new URL(c.endpoint);
     if(endpoint.protocol!=='https:'||endpoint.pathname.replace(/\/$/,'')!=='/api/monitor-targets')return;
     endpoint.pathname='/api/race-cards';endpoint.search='';endpoint.hash='';
     api=endpoint.href;
   }catch{message.textContent='接続URLが不正です。監視同期の設定を確認してください。';return}
   loading=true;message.textContent='出馬表の配信先に接続中…';
   try{
     const response=await fetch(api,{method:'GET',mode:'cors',cache:'no-store',
       headers:{Authorization:'Bearer '+c.token}});
     if(response.status===404){
       message.textContent='取得待ち：配信できる当日分の出馬表がまだありません。';
       return;
     }
     if(!response.ok){
       const detail=await response.json().catch(()=>({}));
       throw Error('HTTP '+response.status+(detail.stage?' / 処理段階: '+String(detail.stage).slice(0,50):'')+(detail.error?' / '+String(detail.error).slice(0,60):''));
     }
     const document=await response.json();
     const races=Array.isArray(document?.races)?document.races:[];
     const signature=JSON.stringify(races);
     if(signature===lastSignature){
       message.textContent='接続成功：出馬表の内容に変更はありません。';
       return;
     }
     const count=await window.BakenImportAuthorizedCards(document);
     lastSignature=signature;
     message.textContent='接続成功：本日の出馬表 '+count+'レースを受信しました。';
     if(status)status.textContent='非公開配信から出馬表'+count+'レースを自動更新しました。';
   }catch(error){
     message.textContent='接続失敗：'+error.message;
     if(status)status.textContent='出馬表の自動取得に失敗：'+error.message+'。手動JSON読み込みは利用できます。';
   }finally{loading=false}
 }
 check.onclick=()=>refresh();
 window.BakenRefreshPrivateCards=refresh;
 window.addEventListener('focus',refresh);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()});
 window.addEventListener('baken:monitor-config-updated',refresh);
 // Refresh while the PWA stays open through the weekly publication window.
 setInterval(refresh,5*60*1000);
 refresh();
})();
