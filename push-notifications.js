/* Optional Web Push: subscriptions only; no bets, balance or result details are uploaded. */
(()=>{
 'use strict';
 const CONFIG_KEY='baken-monitor-sync-config-v1';
 const SECTION=document.querySelector('[data-tab="settings"]');
 if(!SECTION)return;
 const panel=document.createElement('section');panel.className='card';panel.style.marginTop='16px';
 const title=document.createElement('h3');title.textContent='精算準備のプッシュ通知';
 const desc=document.createElement('p');desc.className='muted';desc.textContent='購入したレースの結果が確定したら、iPhoneへ「精算準備ができました」とお知らせします。的中・不的中は通知に表示しません。通知は任意で、精算はこれまでどおり手動です。';
 const enable=document.createElement('button');enable.type='button';enable.textContent='通知を有効にする';enable.disabled=true;
 const disable=document.createElement('button');disable.type='button';disable.className='outline';disable.style.marginLeft='8px';disable.textContent='通知を停止';
 const status=document.createElement('p');status.className='muted';status.setAttribute('aria-live','polite');status.textContent='通知の利用環境を確認中…';
 const CHIME_KEY='baken-king-settlement-chime-v1';
 const chimeLabel=document.createElement('label');chimeLabel.style.display='flex';chimeLabel.style.alignItems='center';chimeLabel.style.gap='9px';chimeLabel.style.margin='15px 0 8px';
 const chime=document.createElement('input');chime.type='checkbox';chime.checked=localStorage.getItem(CHIME_KEY)==='on';
 const chimeText=document.createElement('span');chimeText.textContent='アプリを開いている間、精算準備のチャイムを鳴らす';
 chimeLabel.append(chime,chimeText);
 const tryChime=document.createElement('button');tryChime.type='button';tryChime.className='outline';tryChime.textContent='チャイムを試聴';
 const chimeNote=document.createElement('p');chimeNote.className='muted';chimeNote.textContent='Baken-KINGオリジナル音。iPhoneのマナーモード・音量設定やブラウザの再生制限によって鳴らない場合があります。ロック画面の通知音はiOS側で管理されます。';
 const audioStatus=document.createElement('p');audioStatus.className='muted';
 let audio=null;
 function playChime(){
  try{
   const AudioContextClass=window.AudioContext||window.webkitAudioContext;
   if(!AudioContextClass)return false;
   if(!audio)audio=new AudioContextClass();
   if(audio.state!=='running')audio.resume().catch(()=>{});
   const base=audio.currentTime+0.02;
   // Original two-note alert composed for Baken-KING, not a JRA audio sample.
   const notes=[{at:0,duration:.15,hz:523.25},{at:.18,duration:.32,hz:783.99}];
   for(const note of notes){
    const osc=audio.createOscillator(),gain=audio.createGain();
    osc.type='sine';osc.frequency.setValueAtTime(note.hz,base+note.at);
    gain.gain.setValueAtTime(0.0001,base+note.at);
    gain.gain.exponentialRampToValueAtTime(0.18,base+note.at+0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001,base+note.at+note.duration);
    osc.connect(gain).connect(audio.destination);
    osc.start(base+note.at);osc.stop(base+note.at+note.duration+0.02);
   }
   return true;
  }catch(e){return false}
 }
 chime.addEventListener('change',()=>{localStorage.setItem(CHIME_KEY,chime.checked?'on':'off');if(chime.checked)playChime()});
 tryChime.addEventListener('click',()=>{audioStatus.textContent=playChime()?'チャイムを再生しました。':'音声を再生できない環境です。'});
 window.addEventListener('baken:new-settlement-ready',event=>{
  if(localStorage.getItem(CHIME_KEY)==='on'&&document.visibilityState==='visible'&&Number(event.detail?.count)>0)playChime();
 });
 panel.append(title,desc,enable,disable,status,chimeLabel,tryChime,chimeNote,audioStatus);SECTION.append(panel);
 let registration=null,serverUrl='',publicKey='',token='',busy=false;
 function config(){try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'null')}catch{return null}}
 function fromBase(value){
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.pathname.replace(/\/$/,'')!=='/api/monitor-targets')throw Error('認証済み監視APIのURLが必要です');
  url.pathname='/api/push-subscriptions';url.search='';url.hash='';return url.href;
 }
 function decodeBase64Url(str){
  const padded=str.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(str.length/4)*4,'=');
  const bin=atob(padded);return Uint8Array.from(bin,c=>c.charCodeAt(0));
 }
 function available(){
  return 'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window&&window.isSecureContext;
 }
 async function refresh(){
  enable.disabled=true;
  if(!available()){status.textContent='この環境はプッシュ通知非対応です。iPhoneではSafariからホーム画面に追加したアプリで開いてください。';return}
  if(/iPhone|iPad|iPod/.test(navigator.userAgent)&&!window.matchMedia('(display-mode: standalone)').matches&&!navigator.standalone){
   status.textContent='通知を利用するにはSafariからホーム画面に追加したBaken-KINGを起動してください。';return
  }
  const c=config();
  if(!c?.enabled||!c.endpoint||!c.token){status.textContent='先に「結果監視の自動同期」を有効にしてください。';return}
  try{
   serverUrl=fromBase(c.endpoint);token=c.token;
   registration=await navigator.serviceWorker.ready;
   const response=await fetch(serverUrl,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
   if(!response.ok)throw Error('通知サーバーが準備されていません（HTTP '+response.status+'）');
   const data=await response.json();publicKey=data.publicKey;
   if(!/^[A-Za-z0-9_-]{80,100}$/.test(publicKey||''))throw Error('公開鍵が未設定です');
   const existing=await registration.pushManager.getSubscription();
   if(Notification.permission==='denied'){status.textContent='iPhoneの設定でBaken-KINGの通知が拒否されています。設定アプリから許可してください。';return}
   enable.disabled=false;
   enable.textContent=existing?'通知の登録を更新':'通知を有効にする';
   status.textContent=existing?'このiPhoneは通知を受信する設定です。':'通知はまだ有効になっていません。';
  }catch(e){status.textContent='通知の準備待ち：'+e.message}
 }
 enable.addEventListener('click',async event=>{
  if(!event.isTrusted||busy||!registration||!publicKey)return;
  busy=true;enable.disabled=true;
  try{
   // Invoke subscribe directly from the user gesture (required on iOS).
   const subscribePromise=registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeBase64Url(publicKey)});
   const subscription=await subscribePromise;
   const response=await fetch(serverUrl,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({subscription:subscription.toJSON()})});
   if(!response.ok){await subscription.unsubscribe().catch(()=>{});throw Error('通知先の登録に失敗しました（HTTP '+response.status+'）')}
   status.textContent='通知が有効になりました。次の新しい精算待ちからお知らせします。';
   enable.textContent='通知の登録を更新';
  }catch(e){status.textContent='通知を有効にできません：'+e.message}
  finally{busy=false;enable.disabled=false}
 });
 disable.addEventListener('click',async event=>{
  if(!event.isTrusted||busy)return;
  busy=true;disable.disabled=true;
  try{
   const sub=registration&&await registration.pushManager.getSubscription();
   if(sub&&serverUrl&&token){
    const r=await fetch(serverUrl,{method:'DELETE',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({endpoint:sub.endpoint})});
    if(!r.ok)throw Error('サーバー側の解除に失敗しました（HTTP '+r.status+'）');
   }
   if(sub)await sub.unsubscribe();
   status.textContent='このiPhoneの通知を停止しました。';
   enable.textContent='通知を有効にする';
  }catch(e){status.textContent='停止できません：'+e.message}
  finally{busy=false;disable.disabled=false}
 });
 window.addEventListener('baken:monitor-config-updated',refresh);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()});
 refresh();
})();
