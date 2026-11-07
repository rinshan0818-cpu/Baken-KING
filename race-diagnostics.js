/* v1.36 Read-only owner diagnostics: local race identity vs account verified feed.
   No purchase, settlement, monitoring or account data is modified. */
(()=>{
 'use strict';
 if(location.hostname!=='baken-king-app-next.vercel.app')return;
 if(localStorage.getItem('baken-king-mode-v1')==='test')return;
 function init(){
  const host=document.getElementById('bkSettingsSurface');
  if(!host||document.getElementById('bkRaceDiagnostics'))return;
  const fold=[...host.querySelectorAll('.bk-settings-fold')].find(x=>x.querySelector('.bk-settings-fold-label')?.textContent?.includes('管理・接続設定'));
  const target=fold?.querySelector('.bk-settings-fold-content');
  if(!target)return;
  const panel=document.createElement('section');
  panel.id='bkRaceDiagnostics';panel.className='card bk-settings-item';panel.hidden=true;
  const heading=document.createElement('h3');heading.textContent='結果待ちレースの診断';
  const note=document.createElement('p');note.className='muted';
  note.textContent='管理者専用・読み取りのみ。端末の未精算馬券とログイン済みの確定結果配信を照合します。登録候補とサーバー登録済みは別物です。';
  const select=document.createElement('select');select.setAttribute('aria-label','診断するレース');
  select.style.cssText='width:100%;max-width:100%;margin:8px 0 10px;padding:10px;';
  const button=document.createElement('button');button.type='button';button.className='outline';button.textContent='選択したレースを確認';
  const out=document.createElement('div');out.setAttribute('role','status');out.setAttribute('aria-live','polite');out.style.cssText='margin-top:12px;white-space:pre-line;line-height:1.7;overflow-wrap:anywhere;';
  const key=b=>[b.raceDate,b.raceVenue,Number(b.raceNumber)].join('|');
  function bets(){try{const x=JSON.parse(localStorage.getItem('keiba-demo-v1')||'null');return Array.isArray(x?.bets)?x.bets:[]}catch{return []}}
  function available(){
   const entries=new Map();
   for(const b of bets()){
    if(b?.status!=='pending'||!/^20\\d{2}-\\d{2}-\\d{2}$/.test(b.raceDate||'')||!b.raceVenue||!Number.isInteger(Number(b.raceNumber)))continue;
    const id=key(b);if(!entries.has(id))entries.set(id,b);
   }
   return [...entries.entries()].sort((a,b)=>b[0].localeCompare(a[0]));
  }
  function refresh(){
   const current=select.value;
   select.replaceChildren();
   for(const [id,b] of available()){
    const option=document.createElement('option');option.value=id;
    option.textContent=b.raceDate+' '+b.raceVenue+Number(b.raceNumber)+'R';
    select.append(option);
   }
   if([...select.options].some(x=>x.value===current))select.value=current;
   if(!select.options.length){const option=document.createElement('option');option.textContent='結果待ちのレースはありません';option.value='';select.append(option);button.disabled=true}
   else button.disabled=false;
  }
  async function diagnose(){
   const id=select.value;if(!id)return;
   button.disabled=true;out.textContent='照合中…';
   try{
    const records=bets().filter(b=>key(b)===id&&b.status==='pending');
    const needs=records.filter(b=>!b.officialReady);
    let cards=[];try{const stored=JSON.parse(localStorage.getItem('baken-king-personal-cards-v1')||'null');cards=Array.isArray(stored)?stored:stored?.races||[]}catch{}
    const targets=typeof window.BakenMonitoringTargets?.extractTargets==='function'
      ?window.BakenMonitoringTargets.extractTargets(bets(),cards):null;
    const locallyEligible=targets?.some(t=>[t.date,t.venue,t.raceNumber].join('|')===id);
    const res=await fetch('/api/auth/friends/verified-results',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
    let server='確定結果API：HTTP '+res.status,matched=null;
    if(res.ok){
      const payload=await res.json();
      if(payload?.schemaVersion!==1||!Array.isArray(payload.races))throw Error('確定結果APIの形式が不正');
      matched=payload.races.find(r=>[r.date,r.venue,r.raceNumber].join('|')===id)||null;
      server=matched?'確定結果API：対象レースを配信済み（'+matched.status+'）':'確定結果API：対象レースは未配信（全'+payload.races.length+'R）';
    }
    const state=records.every(b=>b.officialReady)?'全馬券が精算待ち':needs.length?'結果待ち '+needs.length+'枚（精算待ち '+(records.length-needs.length)+'枚）':'該当馬券なし';
    const monitor=locallyEligible===true?'端末の監視登録候補：あり':locallyEligible===false?'端末の監視登録候補：なし（発走時刻付き出馬表・馬券IDなどを確認）':'端末の監視登録候補：算出不可';
    const msg=[
      '対象：'+id.replaceAll('|',' '),
      '端末馬券：'+records.length+'枚／'+state,
      monitor,
      'サーバーへの実登録：この診断では未確認',
      server,
      matched&&needs.length?'判定：配信済みなのに結果待ち。レース識別子または取込エラーを調査してください。':!res.ok?'判定：確定結果APIとの接続・ログインを確認してください。':!matched?'判定：サーバー側で対象レースの確定結果が未配信です。監視対象登録・JRA取得・承認処理を調査してください。':'判定：配信済み。精算待ちへの反映を確認してください。',
      '※この診断による記録の変更・自動精算はありません。'
    ];out.textContent=msg.join('\\n');
   }catch(e){out.textContent='診断失敗：'+String(e?.message||e)+'。記録は変更していません。'}
   finally{button.disabled=false}
  }
  button.addEventListener('click',diagnose);
  panel.append(heading,note,select,button,out);target.prepend(panel);
  async function authorize(){
   panel.hidden=true;
   try{
    const r=await fetch('/api/auth/admin/status',{credentials:'same-origin',cache:'no-store'});
    if(!r.ok)return;
    const d=await r.json();
    if(d.ok===true&&d.admin===true){panel.hidden=false;refresh()}
   }catch{}
  }
  window.addEventListener('baken:account-changed',authorize);
  window.addEventListener('baken:wagers-updated',()=>{if(!panel.hidden)refresh()});
  authorize();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
