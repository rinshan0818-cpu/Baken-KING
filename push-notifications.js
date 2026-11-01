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
 const testPush=document.createElement('button');testPush.type='button';testPush.className='outline';testPush.textContent='通知表示をテスト';testPush.disabled=true;
 const testNote=document.createElement('p');testNote.className='muted';testNote.textContent='このiPhone内でテスト通知を表示します。サーバーからの自動配信テストではありません。馬券・残高・精算履歴は変更しません。';
 const CHIME_KEY='baken-king-settlement-chime-v1';
 const SOUND_DB='baken-king-private-audio-v1';
 const soundBox=document.createElement('div');soundBox.className='bk-push-sound-box';
 const soundTitle=document.createElement('h4');soundTitle.textContent='精算準備のサウンド';
 const chimeLabel=document.createElement('label');chimeLabel.className='bk-push-sound-toggle';
 const chime=document.createElement('input');chime.type='checkbox';chime.checked=localStorage.getItem(CHIME_KEY)==='on';
 const chimeText=document.createElement('span');chimeText.textContent='アプリ使用中に精算待ちになったら音を鳴らす';
 chimeLabel.append(chime,chimeText);
 const soundHelp=document.createElement('p');soundHelp.className='muted';soundHelp.textContent='標準チャイムのほか、iPhoneの「ファイル」から好きなMP3を設定できます。音源はこの端末だけに保存し、送信しません。';
 const fileLabel=document.createElement('label');fileLabel.className='bk-push-file-label';fileLabel.textContent='MP3音源を選ぶ';
 const soundFile=document.createElement('input');soundFile.type='file';soundFile.accept='.mp3,audio/mpeg';soundFile.className='bk-push-file-input';
 fileLabel.append(soundFile);
 const soundName=document.createElement('p');soundName.className='bk-push-sound-name';soundName.textContent='標準チャイム';
 const soundButtons=document.createElement('div');soundButtons.className='bk-push-sound-actions';
 const tryChime=document.createElement('button');tryChime.type='button';tryChime.className='outline';tryChime.textContent='音を試聴';
 const resetChime=document.createElement('button');resetChime.type='button';resetChime.className='outline';resetChime.textContent='標準音に戻す';
 soundButtons.append(tryChime,resetChime);
 const chimeNote=document.createElement('p');chimeNote.className='muted';chimeNote.textContent='音が鳴るのはアプリを開いている間だけです。ロック画面のプッシュ通知音はiOS側で管理され、MP3への変更はできません。';
 const audioStatus=document.createElement('p');audioStatus.className='muted';audioStatus.setAttribute('aria-live','polite');
 soundBox.append(soundTitle,chimeLabel,soundHelp,fileLabel,soundName,soundButtons,chimeNote,audioStatus);
 const pushButtons=document.createElement('div');pushButtons.className='bk-push-button-row';pushButtons.append(enable,disable);
 panel.classList.add('bk-push-panel');
 panel.append(title,desc,pushButtons,status,testPush,testNote,soundBox);SECTION.append(panel);
 let audio=null,customAudio=null,customUrl=null;
 const openSoundDb=()=>new Promise((resolve,reject)=>{
  if(!('indexedDB' in window)){reject(Error('この端末では音源を保存できません'));return}
  const request=indexedDB.open(SOUND_DB,1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('audio'))request.result.createObjectStore('audio')};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||Error('音源の保存領域を開けません'));
 });
 async function soundStore(mode,value){
  const db=await openSoundDb();
  try{
   return await new Promise((resolve,reject)=>{
    const tx=db.transaction('audio',mode==='get'?'readonly':'readwrite');
    const store=tx.objectStore('audio');
    const request=mode==='get'?store.get('custom'):mode==='delete'?store.delete('custom'):store.put(value,'custom');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||Error('音源の保存に失敗しました'));
    tx.onerror=()=>reject(tx.error||Error('音源の保存に失敗しました'));
   });
  }finally{db.close()}
 }
 function setCustomSound(saved){
  if(customAudio){customAudio.pause();customAudio.src='';customAudio=null}
  if(customUrl){URL.revokeObjectURL(customUrl);customUrl=null}
  if(saved?.blob instanceof Blob&&saved.blob.size){
   customUrl=URL.createObjectURL(saved.blob);
   customAudio=new Audio(customUrl);customAudio.preload='auto';
   soundName.textContent='設定中：'+String(saved.name||'カスタム音源').slice(0,90);
   resetChime.disabled=false;
  }else{soundName.textContent='標準チャイム';resetChime.disabled=true}
 }
 async function restoreCustomSound(){
  try{setCustomSound(await soundStore('get'))}
  catch(e){soundName.textContent='標準チャイム（保存音源の確認ができませんでした）'}
 }
 function originalChime(){
  try{
   const C=window.AudioContext||window.webkitAudioContext;
   if(!C)return Promise.reject(Error('音声再生に非対応です'));
   if(!audio)audio=new C();
   const resume=audio.state==='running'?Promise.resolve():audio.resume();
   return resume.then(()=>{
    const base=audio.currentTime+0.02;
    for(const note of [{at:0,duration:.15,hz:523.25},{at:.18,duration:.32,hz:783.99}]){
     const osc=audio.createOscillator(),gain=audio.createGain();
     osc.type='sine';osc.frequency.setValueAtTime(note.hz,base+note.at);
     gain.gain.setValueAtTime(.0001,base+note.at);
     gain.gain.exponentialRampToValueAtTime(.18,base+note.at+.025);
     gain.gain.exponentialRampToValueAtTime(.0001,base+note.at+note.duration);
     osc.connect(gain).connect(audio.destination);
     osc.start(base+note.at);osc.stop(base+note.at+note.duration+.02);
    }
   })
  }catch(e){return Promise.reject(e)}
 }
 function playSound(){
  if(customAudio){customAudio.pause();customAudio.currentTime=0;return customAudio.play()}
  return originalChime();
 }
 chime.addEventListener('change',()=>{
  localStorage.setItem(CHIME_KEY,chime.checked?'on':'off');
  if(chime.checked)playSound().catch(()=>{audioStatus.textContent='音声を再生できませんでした。音量・マナーモードをご確認ください。'})
 });
 tryChime.addEventListener('click',()=>{
  playSound().then(()=>audioStatus.textContent='試聴を開始しました。').catch(e=>audioStatus.textContent='再生できません：'+e.message)
 });
 soundFile.addEventListener('change',async()=>{
  const file=soundFile.files?.[0];if(!file)return;
  try{
   if(!/\.mp3$/i.test(file.name)||!['audio/mpeg','audio/mp3','application/octet-stream',''].includes(file.type))throw Error('MP3ファイルのみ選択できます');
   if(file.size<100||file.size>5*1024*1024)throw Error('100バイト〜5MBのMP3を選んでください');
   const blob=new Blob([await file.arrayBuffer()],{type:'audio/mpeg'});
   // Ensure the file is an MP3, rather than arbitrary renamed data.
   const header=new Uint8Array(await blob.slice(0,12).arrayBuffer());
   const id3=header[0]===73&&header[1]===68&&header[2]===51;
   const frame=header[0]===255&&(header[1]&224)===224;
   if(!id3&&!frame)throw Error('有効なMP3音源ではありません');
   const record={name:file.name,blob};
   await soundStore('put',record);
   setCustomSound(record);
   audioStatus.textContent='MP3を保存しました。試聴ボタンから確認できます。';
  }catch(e){audioStatus.textContent='音源を設定できません：'+e.message}
  finally{soundFile.value=''}
 });
 resetChime.addEventListener('click',async()=>{
  try{await soundStore('delete');setCustomSound(null);audioStatus.textContent='標準チャイムに戻しました。'}
  catch(e){audioStatus.textContent='音源を解除できません：'+e.message}
 });
 window.addEventListener('baken:new-settlement-ready',event=>{
  if(localStorage.getItem(CHIME_KEY)==='on'&&document.visibilityState==='visible'&&Number(event.detail?.count)>0)
   playSound().catch(()=>{audioStatus.textContent='自動再生できませんでした。試聴して音声を有効化してください。'});
 });
 restoreCustomSound();
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
  testPush.disabled=true;
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
   testPush.disabled=Notification.permission!=='granted'||!existing;
   enable.disabled=false;
   enable.textContent=existing?'通知の登録を更新':'通知を有効にする';
   status.textContent=existing?'このiPhoneは通知を受信する設定です。':'通知はまだ有効になっていません。';
  }catch(e){const details=String(e?.message||'');status.textContent=/Load failed|Failed to fetch|NetworkError|HTTP 404|HTTP 503/i.test(details)?'通知サーバーの本番接続がまだ完了していません。MP3の試聴・アプリ使用中のチャイムは利用できます。':'通知の準備待ち：'+details}
 }
 testPush.addEventListener('click',async event=>{
  if(!event.isTrusted||busy||Notification.permission!=='granted')return;
  testPush.disabled=true;
  try{
   const reg=registration||await navigator.serviceWorker.ready;
   await reg.showNotification('Baken-KING【表示テスト】',{
    body:'精算準備の通知表示テストです。実際のレース結果ではありません。',
    icon:'./baken_king_icon_512.png',
    badge:'./icon.svg',
    tag:'baken-local-notification-test',
    data:{url:new URL('./?open=tickets',location.href).href}
   });
   status.textContent='テスト通知を表示しました。通知をタップすると馬券タブへ移動します。';
  }catch(e){status.textContent='テスト通知を表示できません：'+String(e?.message||e)}
  finally{testPush.disabled=false}
 });
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
