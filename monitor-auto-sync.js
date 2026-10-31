/* Opt-in private monitor synchronization. Never uploads wager details. */
(()=>{
 'use strict';
 const SETTINGS='baken-monitor-sync-config-v1';
 const BETS='keiba-demo-v1',CARDS='baken-king-personal-cards-v1';
 function get(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}}
 const settings=document.querySelector('[data-tab="settings"]');
 if(!settings)return;
 const panel=document.createElement('section');panel.className='card';panel.style.marginTop='16px';
 const title=document.createElement('h3');title.textContent='結果監視の自動同期（準備中）';
 const explain=document.createElement('p');explain.className='muted';
 explain.textContent='専用の非公開中継APIへ、対象レースの識別情報だけを同期します。認証済みAPIを設定し、明示的に有効化するまで送信しません。購入情報・金額・残高は送信しません。';
 const endpoint=document.createElement('input');endpoint.type='url';endpoint.placeholder='https://（専用APIのURL）';
 endpoint.setAttribute('aria-label','監視同期APIのURL');endpoint.autocomplete='off';
 const token=document.createElement('input');token.type='password';token.placeholder='専用APIの端末認証トークン';
 token.setAttribute('aria-label','専用APIの端末認証トークン');token.autocomplete='off';
 const labels=document.createElement('p');labels.className='muted';
 labels.textContent='これはGitHubトークンではありません。GitHubのアクセストークンは入力しないでください。';
 const button=document.createElement('button');button.type='button';button.textContent='接続設定を保存して自動同期を有効にする';
 const off=document.createElement('button');off.type='button';off.textContent='自動同期を停止';off.className='outline';off.style.marginLeft='8px';
 const check=document.createElement('button');check.type='button';check.textContent='今すぐ同期をテスト';
 check.className='outline';check.style.marginTop='8px';
 const status=document.createElement('p');status.className='muted';status.setAttribute('aria-live','polite');
 const original=get(SETTINGS);
 if(original){endpoint.value=original.endpoint||'';token.value=original.token||''}
 function config(){return get(SETTINGS)}
 function targets(){
   const source=get(CARDS),cards=Array.isArray(source)?source:source?.races;
   return window.BakenMonitoringTargets.extractTargets(get(BETS)?.bets,cards);
 }
 function validEndpoint(url){
   const parsed=new URL(url);
   if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash||
      !/^\/api\/monitor-targets\/?$/.test(parsed.pathname))
     throw Error('HTTPSの専用 /api/monitor-targets URLを入力してください');
   if(parsed.hostname==='rinshan0818-cpu.github.io')throw Error('GitHub Pagesは中継APIではありません');
   return parsed.href;
 }
 let inflight=false,lastFingerprint='';
 async function sync(force=false){
   const c=config();if(!c?.enabled||inflight||document.visibilityState==='hidden')return;
   const selected=targets(),payload={schemaVersion:1,kind:'baken-monitor-targets',targets:selected};
   const fingerprint=JSON.stringify(payload);
   if(!force&&fingerprint===lastFingerprint)return;
   inflight=true;status.textContent='監視対象 '+selected.length+'レースを同期中…';
   try{
     const response=await fetch(c.endpoint,{method:'POST',mode:'cors',cache:'no-store',
       headers:{'Content-Type':'application/json',Authorization:'Bearer '+c.token},
       body:JSON.stringify(payload)});
     if(!response.ok)throw Error('同期先エラー HTTP '+response.status);
     const data=await response.json();
     if(data.ok!==true||data.registered!==selected.length)throw Error('同期先の受付確認が一致しません');
     lastFingerprint=fingerprint;
     status.textContent='監視対象 '+selected.length+'レースの同期完了（精算はしていません）';
   }catch(e){status.textContent='自動同期できません：'+e.message+'。接続設定を確認してください。'}
   finally{inflight=false}
 }
 button.onclick=()=>{
   try{
     const url=validEndpoint(endpoint.value.trim()),key=token.value.trim();
     if(key.length<24)throw Error('端末認証トークンを確認してください');
     localStorage.setItem(SETTINGS,JSON.stringify({endpoint:url,token:key,enabled:true}));
     lastFingerprint='';
     status.textContent='自動同期を有効化しました。接続先への送信を試みます。';
     sync(true);
   }catch(e){status.textContent='有効化できません：'+e.message}
 };
 off.onclick=async()=>{
   const c=config();
   if(!c?.enabled){status.textContent='自動同期は停止しています。';return}
   if(inflight){status.textContent='同期処理中です。完了後にもう一度停止してください。';return}
   inflight=true;off.disabled=true;
   status.textContent='サーバー側の監視対象を解除中…';
   try{
     const response=await fetch(c.endpoint,{method:'POST',mode:'cors',cache:'no-store',
       headers:{'Content-Type':'application/json',Authorization:'Bearer '+c.token},
       body:JSON.stringify({schemaVersion:1,kind:'baken-monitor-targets',targets:[]})});
     if(!response.ok)throw Error('HTTP '+response.status);
     const data=await response.json();
     if(data.ok!==true||data.registered!==0)throw Error('解除の受付確認が一致しません');
     localStorage.removeItem(SETTINGS);token.value='';lastFingerprint='';
     status.textContent='サーバー側の監視対象を解除し、自動同期を停止しました。';
   }catch(e){
     status.textContent='監視対象の解除に失敗しました：'+e.message+'。接続設定は保持しています。';
   }finally{inflight=false;off.disabled=false}
 };
 check.onclick=()=>{if(!config()?.enabled){status.textContent='先に接続設定を有効化してください';return}sync(true)};
 const label1=document.createElement('p');label1.className='muted';label1.textContent='中継APIのURL';
 const label2=document.createElement('p');label2.className='muted';label2.textContent='端末認証トークン';
 panel.append(title,explain,label1,endpoint,label2,token,labels,button,off,check,status);
 settings.append(panel);
 window.addEventListener('baken:wagers-updated',()=>sync());
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync()});
 // Poll race start transitions and keep devices that remain open in sync.
 setInterval(()=>sync(),60000);
 if(config()?.enabled)sync();
})();
