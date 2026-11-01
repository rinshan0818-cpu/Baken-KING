/* Private verified-result delivery. No wagers leave the iPhone; never settles. */
(()=>{
 'use strict';
 const CONFIG='baken-monitor-sync-config-v1';
 const section=document.querySelector('[data-tab="settings"]');
 const panel=document.createElement('section');panel.className='card';panel.style.marginTop='16px';
 const title=document.createElement('h3');title.textContent='確定結果の自動取得';
 const status=document.createElement('p');status.className='muted';
 status.textContent='認証付き結果配信の接続を確認中です。';
 const button=document.createElement('button');button.className='outline';button.type='button';
 button.textContent='確定結果の接続を確認';
 panel.append(title,status,button);if(section)section.append(panel);
 function config(){try{return JSON.parse(localStorage.getItem(CONFIG)||'null')}catch{return null}}
 let loading=false,again=false;
 async function refresh(){
   if(document.visibilityState==='hidden')return;
   if(loading){again=true;return}
   const c=config();
   if(!c?.enabled||!c.endpoint||!c.token){
     status.textContent='未接続：結果監視の自動同期設定を有効にしてください。';return;
   }
   if(typeof window.BakenImportVerifiedResults!=='function'){
     status.textContent='結果の読み込み機能がまだ準備できていません。';return;
   }
   let url;
   try{
     const parsed=new URL(c.endpoint);
     if(parsed.protocol!=='https:'||parsed.username||parsed.password||
       parsed.pathname.replace(/\/$/,'')!=='/api/monitor-targets')throw Error('接続URLを確認してください');
     parsed.pathname='/api/verified-results';parsed.search='';parsed.hash='';url=parsed.href;
   }catch(e){status.textContent='設定エラー：'+e.message;return}
   loading=true;
   try{
     const response=await fetch(url,{method:'GET',mode:'cors',cache:'no-store',
       headers:{Authorization:'Bearer '+c.token}});
     if(!response.ok){
       const details=await response.json().catch(()=>({}));
       throw Error('HTTP '+response.status+(details.error?' / '+String(details.error).slice(0,80):''));
     }
     const payload=await response.json();
     if(payload?.schemaVersion!==1||!Array.isArray(payload.races))throw Error('配信データ形式が不正です');
     const count=await window.BakenImportVerifiedResults(payload);
     if(count>0){
       status.textContent='確定結果を受信：'+count+'枚の馬券が手動精算待ちになりました。';
     }else{
       status.textContent='接続成功：検証済みの結果 '+payload.races.length+'レース／新規の精算待ち登録なし。';
     }
   }catch(e){status.textContent='結果配信に接続できません：'+e.message;}
   finally{
     loading=false;
     if(again){again=false;queueMicrotask(refresh)}
   }
 }
 button.onclick=refresh;
 window.BakenRefreshVerifiedResults=refresh;
 window.addEventListener('focus',refresh);
 window.addEventListener('baken:monitor-config-updated',refresh);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()});
 setInterval(refresh,5*60*1000);
 refresh();
})();
