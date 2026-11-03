/* Opt-in aggregate-only transfer to the authenticated, same-origin bridge.
   GitHub Pages and Vercel have independent cookie jars and localStorage.
   This deliberately avoids pretending automatic 30-minute sync works here.
*/
(function(){
 'use strict';
 // Vercel same-origin preview uses app-next-cloud.js, not fragment handoff.
 if(location.hostname==='baken-king-app-next.vercel.app')return;
 const button=document.getElementById('bkFriendSyncNow');
 const status=document.getElementById('bkFriendSyncStatus');
 if(!button||!status)return;
 const bridge='https://baken-king-account-bridge.vercel.app/';
 const testing=localStorage.getItem('baken-king-mode-v1')==='test';
 button.disabled=testing;
 button.textContent='9項目の成績を共有';
 status.textContent=testing?'テストモードでは同期できません':'未同期。共有前にアカウントを確認します。';
 button.addEventListener('click',()=>{
  if(testing){status.textContent='本番モードで操作してください';return}
  try{
   if(typeof bkFriendCloudSnapshot!=='function')throw Error('成績集計を取得できません');
   const m=bkFriendCloudSnapshot();
   const keys=['stakeYen','returnedYen','settledTicketCount','purchasedRaceCount','hitRaceCount','settledRaceCount','maxPayoutYen'];
   if(!m||Object.keys(m).sort().join(',')!==keys.slice().sort().join(','))throw Error('共有する成績の形式が正しくありません');
   for(const key of keys){
    if(m[key]===null&&key==='maxPayoutYen')continue;
    if(!Number.isSafeInteger(m[key])||m[key]<0||m[key]>1e12)throw Error('成績の数値が正しくありません');
   }
   if(m.hitRaceCount>m.settledRaceCount||m.settledRaceCount>m.purchasedRaceCount)throw Error('集計対象レース数が不正です');
   if(!confirm('この端末の9項目の成績をログイン中のアカウントへ共有しますか？\n次の画面でアカウントを確認し、もう一度「共有する」を押した場合だけ送信します。\n馬券の買い目・残高・精算履歴は含めません。'))return;
   const value=encodeURIComponent(JSON.stringify({v:1,metrics:m}));
   const a=document.createElement('a');
   a.href=bridge+'#score='+value;
   a.target='_blank';a.rel='noopener noreferrer';
   a.click();
   status.textContent='認証済み画面でアカウントを確認し、「成績を共有する」を押してください。';
  }catch(e){status.textContent=e.message||'成績を準備できませんでした'}
 });
})();
