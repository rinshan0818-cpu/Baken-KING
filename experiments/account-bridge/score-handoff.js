'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const panel=$('scorePanel');
 let pending=null,publishing=false;
 const keys=['stakeYen','returnedYen','settledTicketCount','purchasedRaceCount','hitRaceCount','settledRaceCount','maxPayoutYen'];
 function valid(v){
  if(!v||v.v!==1||!v.metrics||Array.isArray(v.metrics)||typeof v.metrics!=='object')return false;
  const m=v.metrics;
  if(Object.keys(m).sort().join(',')!==keys.slice().sort().join(','))return false;
  for(const key of keys){
   const value=m[key];
   if(value===null&&key==='maxPayoutYen')continue;
   if(!Number.isSafeInteger(value)||value<0||value>1e12)return false;
  }
  return m.hitRaceCount<=m.settledRaceCount&&m.settledRaceCount<=m.purchasedRaceCount;
 }
 if(location.hash.startsWith('#score=')){
  const raw=location.hash.slice(7);
  // Sensitive credentials are never transported. Clear even malformed fragments immediately.
  history.replaceState(null,'',location.pathname+location.search);
  try{
   if(raw.length>2000)throw Error('too large');
   const data=JSON.parse(decodeURIComponent(raw));
   if(!valid(data))throw Error('invalid metrics');
   pending=data.metrics;
  }catch{
   $('scoreStatus').textContent='渡された成績の形式が正しくありません。元のアプリからやり直してください。';
   panel.hidden=false;
  }
 }
 function refresh(){
  if(!pending)return;
  panel.hidden=false;
  const logged=!$('logged').hidden;
  $('publishScore').disabled=!logged||publishing;
  $('scorePreview').textContent='購入額：'+pending.stakeYen.toLocaleString('ja-JP')+'円／払戻：'+pending.returnedYen.toLocaleString('ja-JP')+'円／精算済み馬券：'+pending.settledTicketCount+'枚';
  $('scoreStatus').textContent=logged?
   'ログイン中のアカウントを確認し、内容に間違いがなければ共有できます。':
   '先にこの画面でログインしてください。共有内容はまだ送信されていません。';
 }
 window.addEventListener('bk:auth-checked',refresh);
 $('discardScore').onclick=()=>{pending=null;panel.hidden=true;$('scoreStatus').textContent='共有を取り消しました。'};
 $('publishScore').onclick=async()=>{
  if(!pending||publishing||$('logged').hidden)return;
  const account=$('account').textContent;
  if(!confirm(account+'\n\nこのアカウントに9項目の成績を登録・上書きしてよいですか？'))return;
  publishing=true;$('publishScore').disabled=true;
  try{
   const response=await fetch('/api/auth/friends/summary',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{Accept:'application/json','Content-Type':'application/json'},
    body:JSON.stringify({metrics:pending})
   });
   const data=await response.json().catch(()=>({}));
   if(!response.ok||data.ok!==true)throw Error('共有に失敗しました（HTTP '+response.status+'）');
   pending=null;
   $('scorePreview').textContent='9項目の成績を同期しました。友達の画面にも反映されます。';
   $('scoreStatus').textContent='同期完了。次回の更新時は元のアプリから再度共有してください。';
   $('publishScore').hidden=true;
   window.bkBridgeFriends?.show();
  }catch(e){$('scoreStatus').textContent=e.message}
  finally{publishing=false;if(pending)$('publishScore').disabled=false}
 };
 refresh();
})();