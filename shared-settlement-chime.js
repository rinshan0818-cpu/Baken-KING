/* Shared settlement-ready chime, one fixed audio asset for all accounts.
 * Filename is a separate uploaded MP3 asset, not selectable by end users.
 * Web Push while the app is closed still uses the device notification sound.
 */
(()=>{
 'use strict';
 if(location.hostname!=='baken-king-app-next.vercel.app')return;
 if(localStorage.getItem('baken-king-mode-v1')==='test')return;
 const panel=document.querySelector('.bk-push-panel');
 if(!panel)return;
 const old=panel.querySelector('.bk-push-sound-box');
 if(old){old.hidden=true;old.style.display='none';old.setAttribute('aria-hidden','true')}
 const audio=new Audio('./settlement-chime.mp3');
 audio.preload='auto';
 const PREFERENCE='baken-king-settlement-chime-v1';
 const box=document.createElement('div');
 box.className='bk-shared-sound-box';
 const title=document.createElement('h4');title.textContent='精算準備の共通チャイム';
 const label=document.createElement('label');label.style.display='flex';label.style.gap='10px';label.style.alignItems='center';
 const enabled=document.createElement('input');enabled.type='checkbox';
 enabled.checked=localStorage.getItem(PREFERENCE)!=='off';
 const caption=document.createElement('span');caption.textContent='アプリ使用中に精算待ちになったら音を鳴らす';
 label.append(enabled,caption);
 const desc=document.createElement('p');desc.className='muted';
 desc.textContent='音源は全ユーザー共通です。個別のMP3登録・変更はできません。アプリを閉じている間の通知音はiPhone側の設定が使われます。';
 const trySound=document.createElement('button');trySound.className='outline';trySound.type='button';trySound.textContent='チャイムを試聴';
 const status=document.createElement('p');status.className='muted';status.setAttribute('aria-live','polite');
 enabled.onchange=()=>localStorage.setItem(PREFERENCE,enabled.checked?'on':'off');
 async function play(){
  audio.pause();audio.currentTime=0;
  try{await audio.play();status.textContent='チャイムを再生しました'}
  catch{status.textContent='音声を再生できません。アプリ内の試聴ボタンを押し、端末の音量を確認してください'}
 }
 trySound.onclick=play;
 window.addEventListener('baken:new-settlement-ready',event=>{
  if(enabled.checked&&document.visibilityState==='visible'&&Number(event.detail?.count)>0)play();
 });
 audio.addEventListener('error',()=>{status.textContent='共通チャイムの音源を取得できません（配信準備中）'});
 box.append(title,label,desc,trySound,status);
 panel.append(box);
})();
