/* Read authorized private race cards via the authenticated Vercel bridge.
 * Never sends purchases or stores a GitHub token.
 */
(()=>{
 'use strict';
 const SETTINGS='baken-monitor-sync-config-v1';
 const status=document.getElementById('bkCardImportStatus');
 let loading=false,lastSignature='';
 function config(){try{return JSON.parse(localStorage.getItem(SETTINGS)||'null')}catch{return null}}
 async function refresh(){
   if(loading||document.visibilityState==='hidden')return;
   const c=config();
   if(!c?.enabled||!c.endpoint||!c.token)return;
   if(typeof window.BakenImportAuthorizedCards!=='function')return;
   let api;
   try{
     const endpoint=new URL(c.endpoint);
     if(endpoint.protocol!=='https:'||endpoint.pathname.replace(/\/$/,'')!=='/api/monitor-targets')return;
     endpoint.pathname='/api/race-cards';endpoint.search='';endpoint.hash='';
     api=endpoint.href;
   }catch{return}
   loading=true;
   try{
     const response=await fetch(api,{method:'GET',mode:'cors',cache:'no-store',
       headers:{Authorization:'Bearer '+c.token}});
     if(response.status===404)return; // No approved private feed yet.
     if(!response.ok)throw Error('HTTP '+response.status);
     const document=await response.json();
     const races=Array.isArray(document?.races)?document.races:[];
     const signature=JSON.stringify(races);
     if(signature===lastSignature)return;
     const count=await window.BakenImportAuthorizedCards(document);
     lastSignature=signature;
     if(status)status.textContent='非公開配信から出馬表'+count+'レースを自動更新しました。';
   }catch(error){
     if(status)status.textContent='出馬表の自動取得に失敗：'+error.message+'。手動JSON読み込みは利用できます。';
   }finally{loading=false}
 }
 window.BakenRefreshPrivateCards=refresh;
 window.addEventListener('focus',refresh);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()});
 window.addEventListener('baken:monitor-config-updated',refresh);
 // Refresh while the PWA stays open through the weekly publication window.
 setInterval(refresh,5*60*1000);
 refresh();
})();
