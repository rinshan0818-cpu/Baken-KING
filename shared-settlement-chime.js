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
 const FORCE_MUTE='baken-king-sound-force-off-v1';
 // One source of truth for the header indicator and the settings preference.
 function effectiveOn(){return localStorage.getItem(FORCE_MUTE)!=='on'&&localStorage.getItem(PREFERENCE)!=='off'}
 window.BakenSharedChimeEnabled=effectiveOn;
 const forcedOff=()=>localStorage.getItem(FORCE_MUTE)==='on';
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
 enabled.onchange=()=>{localStorage.setItem(PREFERENCE,enabled.checked?'on':'off');window.dispatchEvent(new Event('baken:chime-preference-changed'))};
 async function play(preview=false){
  if(forcedOff()){
   audio.pause();audio.currentTime=0;
   status.textContent='上部のチャイムがOFFです。ONにしてから試してください。';return;
  }
  if(!preview&&!enabled.checked){status.textContent='設定内のチャイムがOFFです';return;}
  audio.pause();audio.currentTime=0;
  try{
   await audio.play();
   if(forcedOff()){audio.pause();audio.currentTime=0;return;}
   status.textContent=preview?'試聴中です':'精算準備チャイムを再生しました';
  }catch(error){
   status.textContent='音声再生に失敗（'+String(error?.name||'不明')+'）。試聴ボタンを押し、端末の音量とマナーモードを確認してください。';
  }
 }
 trySound.onclick=()=>play(true);
 window.addEventListener('baken:new-settlement-ready',event=>{
  if(!forcedOff()&&enabled.checked&&document.visibilityState==='visible'&&Number(event.detail?.count)>0)play(false);
 });
 window.addEventListener('baken:force-mute-changed',event=>{
  if(event.detail?.muted){audio.pause();audio.currentTime=0;status.textContent='チャイムを強制オフにしました'}
  else status.textContent='強制オフを解除しました';
 });
 audio.addEventListener('error',()=>{status.textContent='共通チャイムの音源を取得できません。配信ファイルを確認してください。'});
 box.append(title,label,desc,trySound,status);
 panel.append(box);
})();
