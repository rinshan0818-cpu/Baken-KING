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
 let busy=false;
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
 async function sync(manual){
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
   localStorage.setItem(consentKey,'1');
   localStorage.setItem(lastKey,String(Date.now()));
   label('9項目の成績を同期しました（'+new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})+'）');
  }catch(e){
   if(manual)label(e instanceof TypeError?'接続できません。ログイン状態と通信環境を確認してください。':e.message);
   else label('自動同期できませんでした。次回また確認します。');
  }finally{busy=false;button.disabled=false}
 }
 button.disabled=false;
 button.textContent='今すぐ更新';
 button.onclick=()=>sync(true);
 const timer=()=>{if(document.visibilityState==='visible')sync(false)};
 // No background execution promise: browser timers run only while app is active.
 setInterval(timer,60*1000);
 if(document.visibilityState==='visible')timer();
})();
