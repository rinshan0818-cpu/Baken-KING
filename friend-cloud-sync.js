/* Baken-KING private opt-in nine-metric friendship sync.
   Never sends individual tickets, wallet balance, settlement history or JWT
   into localStorage. Only the authenticated nine-field metrics are uploaded.
   Does not run in test mode; runs at most once per 30 min while open.
*/
(function(){
 'use strict';
 const authBase='https://ep-curly-boat-a170oecz.neonauth.ap-southeast-1.aws.neon.tech/baken_sharing/auth';
 const apiBase='https://baken-king-sharing-api.vercel.app';
 const interval=30*60*1000;
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const button=document.getElementById('bkFriendSyncNow');
 const status=document.getElementById('bkFriendSyncStatus');
 if(!button||!status||localStorage.getItem('baken-king-mode-v1')==='test')return;
 const label=t=>{status.textContent=t};
 // Stopping sync does not delete already published aggregate data; explain it.
 const stop=document.createElement('button');
 stop.id='bkFriendSyncStop';stop.type='button';stop.className='outline';
 stop.textContent='自動同期を停止';
 stop.style.marginLeft='8px';
 button.insertAdjacentElement('afterend',stop);
 const updateStop=()=>{stop.disabled=localStorage.getItem('baken-friend-cloud-ever-opted-in')!=='1'};
 let busy=false,lastSuccessThisSession=0;
 async function auth(){
  const res=await fetch(authBase+'/get-session',{credentials:'include',cache:'no-store'});
  if(!res.ok)throw Error('ログイン状態を確認できません');
  const body=await res.json();
  const user=body?.user||body?.data?.user;
  if(!user||!uuid.test(user.id)||user.emailVerified!==true)throw Error('メール確認済みのログインが必要です');
  const jwt=await fetch(authBase+'/token',{credentials:'include',cache:'no-store'});
  if(!jwt.ok)throw Error('ログイントークンを取得できません');
  const data=await jwt.json();
  const token=data?.token||data?.data?.token;
  if(typeof token!=='string'||token.split('.').length!==3)throw Error('再ログインしてください');
  return {user,token};
 }
 async function request({token},method,path,body){
  const res=await fetch(apiBase+path,{method,credentials:'omit',cache:'no-store',redirect:'error',
   headers:{Authorization:'Bearer '+token,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},
   ...(body?{body:JSON.stringify(body)}:{})});
  const data=await res.json().catch(()=>null);
  if(!res.ok||data?.ok!==true){
   if(res.status===503)throw Error('共有APIは現在準備中です。成績は送信していません');
   if(res.status===401)throw Error('再ログインしてください');
   throw Error('成績を同期できませんでした（HTTP '+res.status+'）');
  }
  return data;
 }
 function validSummary(metrics){
  const keys=['stakeYen','returnedYen','settledTicketCount','purchasedRaceCount','hitRaceCount','settledRaceCount','maxPayoutYen'];
  if(!metrics||typeof metrics!=='object'||Object.keys(metrics).sort().join(',')!==keys.sort().join(','))throw Error('成績の形式が正しくありません');
  for(const key of keys){
   const v=metrics[key];
   if(v===null&&key==='maxPayoutYen')continue;
   if(!Number.isSafeInteger(v)||v<0||v>1e12)throw Error('成績の形式が正しくありません');
  }
  if(metrics.hitRaceCount>metrics.settledRaceCount||metrics.settledRaceCount>metrics.purchasedRaceCount)throw Error('レース数が正しくありません');
  return metrics;
 }
 function friendProjection(summary){
  if(!summary||typeof summary!=='object')return null;
  const metrics={profit:summary.profitYen,roi:summary.roiPercent==null?null:Math.round(summary.roiPercent*10)/10,
   stake:summary.stakeYen,paid:summary.returnedYen,races:summary.purchasedRaceCount,
   hitRaces:summary.hitRaceCount,raceRate:summary.raceHitRatePercent==null?null:Math.round(summary.raceHitRatePercent*10)/10,
   maxPayout:summary.maxPayoutYen,settled:summary.settledTicketCount};
  if(typeof bkScoreValid!=='function'||!bkScoreValid(metrics))throw Error('友達の集計結果を確認できません');
  return {version:1,metrics,nickname:'友達'};
 }
 async function updateSelectedFriend(identity){
  const owner=localStorage.getItem('baken-king-friend-score-owner-v1');
  const friend=localStorage.getItem('baken-king-friend-score-friend-id-v1');
  if(owner!==identity.user.id||!uuid.test(friend||'')||friend===owner)return false;
  const result=await request(identity,'GET','/api/sharing/summary/'+friend);
  const received=friendProjection(result.summary);
  if(!received)return false;
  // Only the nine public metrics are cached; no tickets, funds, or JWT.
  localStorage.setItem('baken-king-friend-score-v1',JSON.stringify(received));
  if(typeof bkRenderFriendCompare==='function')bkRenderFriendCompare();
  return true;
 }
 async function sync(manual){
  // No background authentication/network calls until a user has first opted in.
  if(!manual&&localStorage.getItem('baken-friend-cloud-ever-opted-in')!=='1')return;
  if(!manual&&lastSuccessThisSession&&Date.now()-lastSuccessThisSession<interval)return;
  if(busy)return;
  busy=true;button.disabled=true;
  try{
   // Authentication and API connectivity are checked BEFORE any summary data
   // is sent, so the disabled shell does not collect records.
   const identity=await auth(),id=identity.user.id;
   const consentKey='baken-friend-cloud-consent:'+id;
   const lastKey='baken-friend-cloud-last:'+id;
   const hasConsent=localStorage.getItem(consentKey)==='1';
   if(!manual&&!hasConsent)return;
   const last=Number(localStorage.getItem(lastKey))||0;
   if(!manual&&Date.now()-last<interval)return;
   await request(identity,'GET','/api/sharing/me');
   if(!hasConsent){
    if(!manual||!confirm('友達比較用の9項目の成績をクラウドへ公開し、アプリ起動中は30分おきに同期しますか？馬券の買い目・残高・精算履歴は送信しません。'))return;
   }
   if(typeof bkFriendCloudSnapshot!=='function')throw Error('成績を取得できません');
   const summary=validSummary(bkFriendCloudSnapshot());
   // Profile and score share the authenticated JWT subject, never a client
   // specified owner ID. Profile is required by snapshot foreign key.
   const name=(localStorage.getItem('baken-king-nickname-v1')||'プレイヤー').trim().slice(0,16)||'プレイヤー';
   await request(identity,'POST','/api/sharing/profile',{displayName:name});
   await request(identity,'POST','/api/sharing/summary',{metrics:summary});
   // A friend's read is best-effort. It must never undo the successful
   // publication or replace a last-good comparison on network failure.
   let friendUpdated=false;
   try{friendUpdated=await updateSelectedFriend(identity)}catch{}
   localStorage.setItem(consentKey,'1');
   localStorage.setItem('baken-friend-cloud-ever-opted-in','1');
   updateStop();
   lastSuccessThisSession=Date.now();
   localStorage.setItem(lastKey,String(lastSuccessThisSession));
   label((friendUpdated?'自分と友達の成績を更新しました':'自分の9項目を同期しました')+'（'+new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})+'）');
  }catch(e){
   if(manual)label(e instanceof TypeError?'接続できません。ログイン状態と通信環境を確認してください。':e.message);
   else label('自動同期できませんでした。次回また確認します。');
  }finally{busy=false;button.disabled=false}
 }
 button.disabled=false;
 button.textContent='今すぐ更新';
 button.onclick=()=>sync(true);
 stop.onclick=()=>{
  if(!confirm('今後の30分自動同期を停止しますか？すでに公開した成績は削除されません。'))return;
  // Disables all automatic uploads on this device. Manual publishing requires
  // explicit reconfirmation after the account-specific consent is cleared.
  localStorage.removeItem('baken-friend-cloud-ever-opted-in');
  // Clear remembered per-user consent keys without touching betting records.
  for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k?.startsWith('baken-friend-cloud-consent:'))localStorage.removeItem(k)}
  updateStop();label('自動同期を停止しました。すでに公開した成績は残ります。');
 };
 updateStop();
 const timer=()=>{if(document.visibilityState==='visible')sync(false)};
 // No background execution promise: browser timers run only while app is active.
 setInterval(timer,60*1000);
 if(document.visibilityState==='visible')timer();
})();
