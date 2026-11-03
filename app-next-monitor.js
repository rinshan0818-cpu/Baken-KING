/* Account-scoped race target registration. Vercel same-origin only.
 * This only registers race identifiers. It does not yet deliver final results.
 * It never sends wager combinations, money, balance or transaction history.
*/
(()=>{
 'use strict';
 if(location.hostname!=='baken-king-app-next.vercel.app')return;
 if(localStorage.getItem('baken-king-mode-v1')==='test')return;
 const CONFIG='keiba-demo-v1',CARDS='baken-king-personal-cards-v1';
 const account=document.getElementById('bkAccountSettings');
 if(!account)return;
 const panel=document.createElement('p');
 panel.className='muted';
 panel.id='bkAccountMonitorStatus';
 panel.textContent='レースの監視登録：ログイン状態を確認中';
 account.append(panel);
 let busy=false,resync=false,last='';
 function read(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}}
 async function status(){
  const r=await fetch('/api/auth/get-session',{credentials:'same-origin',cache:'no-store'});
  if(!r.ok)throw Error('ログイン状態を取得できません');
  const v=await r.json(),user=v.user||v.data?.user;
  if(!user?.id||user.emailVerified!==true)return null;
  return user.id;
 }
 function current(){
  const state=read(CONFIG),saved=read(CARDS),cards=Array.isArray(saved)?saved:saved?.races;
  if(!state||!Array.isArray(state.bets)||!Array.isArray(cards))return null;
  const extract=window.BakenMonitoringTargets?.extractTargets;
  if(typeof extract!=='function')return null;
  return extract(state.bets,cards);
 }
 async function sync(){
  if(document.visibilityState==='hidden')return;
  if(busy){resync=true;return}
  busy=true;
  try{
   const id=await status();
   if(!id){panel.textContent='レースの監視登録：ログインすると利用できます';return}
   const targets=current();
   if(targets===null){panel.textContent='レースの監視登録：出馬表の読み込み待ち';return}
   const key=id+':'+JSON.stringify(targets);
   if(last===key)return;
   const result=await fetch('/api/auth/friends/monitor-targets',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({targets})
   });
   const data=await result.json().catch(()=>({}));
   if(!result.ok||data.ok!==true||data.registered!==targets.length)
    throw Error('HTTP '+result.status);
   last=key;
   panel.textContent='監視候補 '+targets.length+'レースをアカウントに登録済み（共通JRA監視への接続は準備中）';
  }catch(e){panel.textContent='レース監視登録を確認できません：'+e.message}
  finally{busy=false;if(resync){resync=false;queueMicrotask(sync)}}
 }
 for(const type of ['baken:wagers-updated','baken:cards-imported','baken:account-changed'])window.addEventListener(type,sync);
 window.addEventListener('focus',sync);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync()});
 setInterval(sync,5*60000);
 sync();
})();
