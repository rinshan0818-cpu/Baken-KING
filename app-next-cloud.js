/* Same-origin cloud account integration for baken-king-app-next preview only.
 * GitHub Pages version is unchanged. No local ticket migration is automatic.
 * Only the seven aggregate metrics are sent to friends API; no wagers leave the device.
 */
(()=>{
 'use strict';
 if(location.hostname!=='baken-king-app-next.vercel.app')return;
 const $=id=>document.getElementById(id);
 const account=$('bkAccountSettings'),sync=$('bkFriendSyncNow'),status=$('bkFriendSyncStatus');
 // On this same-origin preview, replace stale GitHub Pages handoff guidance.
 const exchange=document.querySelector('.bk-compare-exchange');
 if(exchange){
  const introductory=exchange.querySelector(':scope > p.muted');
  if(introductory)introductory.textContent='ログイン後はアカウントの表示名と友達の成績が自動反映されます。友達登録はアカウント設定から行えます。';
  const link=exchange.querySelector(':scope > a.official');
  if(link){link.href='#';link.hidden=true;link.setAttribute('aria-hidden','true')}
  const details=exchange.querySelector('details');
  const note=details?.querySelector('p.muted');
  if(note)note.textContent='ログイン中はアプリを開いたときと15分間隔で成績を自動同期します。手動更新もできます。馬券の買い目・残高・履歴は送信しません。';
 }
 
 if(!account||!sync||!status)return;
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const interval=15*60*1000;
 const STATE='keiba-demo-v1';
 let user=null,friend=null,busy=false,lastSuccess=0;
 const message=t=>{status.textContent=t};
 const accountPanel=document.createElement('div');
 account.querySelectorAll('a[href*="baken-king-account-bridge.vercel.app"]').forEach(a=>a.hidden=true);
 accountPanel.innerHTML='<div class="row"><label style="flex:1 1 100%">メールアドレス<input id="bkNextEmail" type="email" autocomplete="email" style="width:100%"></label><label style="flex:1 1 100%">パスワード<input id="bkNextPassword" type="password" autocomplete="current-password" style="width:100%"></label></div><div class="row"><button id="bkNextLogin" class="alt" type="button">ログイン</button><button id="bkNextLogout" class="outline" type="button">ログアウト</button></div><p id="bkNextAccountStatus" class="muted" aria-live="polite">ログイン状態を確認しています</p><label>アカウントのニックネーム<input id="bkNextNickname" type="text" maxlength="16" placeholder="ニックネーム" style="width:100%"></label><button id="bkNextSaveName" class="outline" type="button">表示名を更新</button><div class="row"><button id="bkNextRefresh" class="outline" type="button">友達の成績を更新</button></div>';
 account.append(accountPanel);
 const login=$('bkNextLogin'),logout=$('bkNextLogout'),email=$('bkNextEmail'),password=$('bkNextPassword'),accountStatus=$('bkNextAccountStatus'),refreshButton=$('bkNextRefresh'),nickInput=$('bkNextNickname'),saveName=$('bkNextSaveName');
 nickInput.hidden=true;saveName.hidden=true;
 async function api(method,path,body){
  const options={method,credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}};
  if(body!==undefined){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body)}
  const r=await fetch('/api/auth/'+path,options),data=await r.json().catch(()=>({}));
  if(!r.ok||data.error){const e=Error('通信エラー（'+r.status+'）');e.status=r.status;throw e}
  return data;
 }
 async function friends(method,path,body){
  const data=await api(method,'friends/'+path,body);
  if(data.ok!==true)throw Error('友達情報を取得できません');
  return data;
 }
 const lastKey=id=>'baken-next-score-last:'+id;
 function setUser(next){
  user=next&&UUID.test(next.id)&&next.emailVerified===true?next:null;
  login.hidden=!!user;email.hidden=!!user;password.hidden=!!user;logout.hidden=!user;nickInput.hidden=!user;saveName.hidden=!user;
  if(!user){window.BakenCloudNickname=null;window.dispatchEvent(new Event('baken:nickname-changed'));}
  accountStatus.textContent=user?'ログイン中：'+(user.email||'確認済み'):'未ログイン（馬券データは端末に保存）';
  window.dispatchEvent(new Event('baken:account-changed'));
 }
 async function loadUser(){
  const auth=await api('GET','get-session');
  setUser(auth?.user||auth?.data?.user||null);
  if(!user)return;
  const oldOwner=localStorage.getItem('baken-king-friend-score-owner-v1');
  if(oldOwner&&oldOwner!==user.id){for(const key of ['baken-king-friend-score-v1','baken-king-friend-score-owner-v1','baken-king-friend-score-friend-id-v1'])localStorage.removeItem(key);if(typeof bkRenderFriendCompare==='function')bkRenderFriendCompare()}
  const me=await friends('GET','me');
  const name=me.user?.profile?.displayName;
  nickInput.value=typeof name==='string'?name:'';
  if(typeof name==='string'&&name.trim()){
   window.BakenCloudNickname=name.trim().slice(0,16);
   window.dispatchEvent(new Event('baken:nickname-changed'));
  }
  await loadFriend();
  // No separate popup: users have already agreed to share within their group.
  // Publish once on the first signed-in session and whenever 15 minutes elapsed.
  await publish(false);
 }
 async function loadFriend(){
  if(!user)return;
  const listing=await friends('GET','connections');
  const first=(listing.friends||[]).find(f=>UUID.test(f.id));
  if(!first){friend=null;message('友達登録はありません');return}
  friend=first;
  const score=await friends('GET','summary/'+first.id);
  const s=score.summary;
  if(!s){message('友達「'+(first.displayName||'友達')+'」の成績は未共有です。相手の「データ → 友達比較 → 今すぐ同期」から共有してください。');return}
  const metrics={profit:s.profitYen,roi:s.roiPercent==null?null:Math.round(s.roiPercent*10)/10,
   stake:s.stakeYen,paid:s.returnedYen,races:s.purchasedRaceCount,hitRaces:s.hitRaceCount,
   raceRate:s.raceHitRatePercent,maxPayout:s.maxPayoutYen,settled:s.settledTicketCount};
  if(typeof bkScoreValid!=='function'||!bkScoreValid(metrics))throw Error('友達の集計形式を確認できません');
  localStorage.setItem('baken-king-friend-score-v1',JSON.stringify({version:1,metrics,nickname:first.displayName||'友達'}));
  localStorage.setItem('baken-king-friend-score-owner-v1',user.id);
  localStorage.setItem('baken-king-friend-score-friend-id-v1',first.id);
  if(typeof bkRenderFriendCompare==='function')bkRenderFriendCompare();
  message('友達「'+(first.displayName||'友達')+'」の成績を更新しました');
 }
 async function publish(manual){
  if(busy||!user||localStorage.getItem('baken-king-mode-v1')==='test')return;
  if(!manual&&(Date.now()-Math.max(lastSuccess,Number(localStorage.getItem(lastKey(user.id)))||0)<interval))return;
  busy=true;sync.disabled=true;
  try{
   const state=JSON.parse(localStorage.getItem(STATE)||'null');
   if(!state||!Array.isArray(state.bets))throw Error('この配信元に馬券記録がありません。バックアップを復元した後に同期してください');
   // A newly registered friend may have no wagers yet. A zero-score
   // snapshot is valid and must not be mistaken for an unpublished account.
   if(typeof bkFriendCloudSnapshot!=='function')throw Error('集計処理を確認できません');
   const metrics=bkFriendCloudSnapshot();
   const allowed=['stakeYen','returnedYen','settledTicketCount','purchasedRaceCount','hitRaceCount','settledRaceCount','maxPayoutYen'];
   if(Object.keys(metrics).sort().join(',')!==allowed.slice().sort().join(','))throw Error('集計形式が異なります');
   await friends('POST','summary',{metrics});
   lastSuccess=Date.now();localStorage.setItem(lastKey(user.id),String(lastSuccess));
   message('自分の成績を同期しました（'+new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})+'）');
   await loadFriend();
  }catch(e){if(manual)message(e.message||'同期に失敗しました')}
  finally{busy=false;sync.disabled=false}
 }
 saveName.onclick=async()=>{try{if(!user)throw Error('ログインしてください');const name=nickInput.value.trim();if(!name||name.length>16)throw Error('表示名は1〜16文字で入力してください');await friends('POST','profile',{displayName:name});window.BakenCloudNickname=name;window.dispatchEvent(new Event('baken:nickname-changed'));accountStatus.textContent='表示名を更新しました：'+name}catch(e){accountStatus.textContent=e.message}};
 login.onclick=async()=>{
  try{
   if(!email.value.trim()||!password.value)throw Error('メールとパスワードを入力してください');
   await api('POST','sign-in/email',{email:email.value.trim(),password:password.value});
   password.value='';await loadUser();
  }catch(e){accountStatus.textContent=e.message||'ログインに失敗しました'}
 };
 logout.onclick=async()=>{try{
  if(typeof window.BakenReleaseAccountPush==='function'){
   const stopped=await window.BakenReleaseAccountPush();
   if(!stopped)throw Error('通知の停止を確認できません。通知設定を確認してからログアウトしてください');
  }
  await api('POST','sign-out',{});setUser(null);window.BakenCloudNickname=null;window.dispatchEvent(new Event('baken:nickname-changed'));friend=null;message('ログアウトしました')}catch(e){accountStatus.textContent=e.message}};
 refreshButton.onclick=()=>loadUser().catch(e=>message(e.message));
 sync.onclick=()=>publish(true);
 sync.textContent='自分の9項目を今すぐ同期';
 sync.disabled=false;
 loadUser().catch(e=>{accountStatus.textContent='ログイン状態を確認できません：'+e.message});
 setInterval(()=>{if(document.visibilityState==='visible')publish(false)},60000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')loadUser().catch(e=>message(e.message))});
 window.addEventListener('focus',()=>{if(document.visibilityState==='visible')loadUser().catch(e=>message(e.message))});
})();
