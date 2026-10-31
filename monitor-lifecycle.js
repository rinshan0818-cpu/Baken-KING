/* Monitor lifecycle test: local race identities only; never sends bets or settles. */
(() => {
 'use strict';
 const SNAPSHOT_KEY='baken-monitor-baseline-v1';
 const BETS_KEY='keiba-demo-v1';
 const CARDS_KEY='baken-king-personal-cards-v1';
 const key=t=>t.date+'|'+t.venue+'|'+t.raceNumber;
 const valid=t=>t&&/^20\d{2}-\d{2}-\d{2}$/.test(t.date)&&
   ['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉'].includes(t.venue)&&
   Number.isInteger(t.raceNumber)&&t.raceNumber>=1&&t.raceNumber<=12;
 function diff(before,after){
   if(!Array.isArray(before)||!Array.isArray(after)||before.some(t=>!valid(t))||after.some(t=>!valid(t)))
     throw Error('レース識別情報が不正です');
   const left=new Map(before.map(t=>[key(t),t])),right=new Map(after.map(t=>[key(t),t]));
   return {
     before:left.size,after:right.size,
     removed:[...left.values()].filter(t=>!right.has(key(t))),
     added:[...right.values()].filter(t=>!left.has(key(t))),
     retained:[...right.values()].filter(t=>left.has(key(t)))
   };
 }
 window.BakenMonitorLifecycle={diff};
 const settings=document.querySelector('[data-tab="settings"]');
 if(!settings)return;
 const card=document.createElement('section');
 card.className='card';card.style.marginTop='16px';
 const title=document.createElement('h3');title.textContent='監視対象の登録・解除テスト';
 const desc=document.createElement('p');desc.className='muted';
 desc.textContent='精算前の対象をこの端末内に記録し、精算後に対象から外れたか確認します。記録するのはレース識別情報だけ。監視サーバーには送信しません。';
 const row=document.createElement('div');
 row.style.display='flex';row.style.flexWrap='wrap';row.style.gap='8px';
 const check=document.createElement('button');check.type='button';check.textContent='現在の対象を確認';
 const snapshot=document.createElement('button');snapshot.type='button';snapshot.textContent='精算前の対象を記録';
 const compare=document.createElement('button');compare.type='button';compare.textContent='精算後の差分を確認';
 const info=document.createElement('p');info.className='muted';info.setAttribute('aria-live','polite');
 const list=document.createElement('div');
 function current(){
   const state=JSON.parse(localStorage.getItem(BETS_KEY)||'null');
   const saved=JSON.parse(localStorage.getItem(CARDS_KEY)||'null');
   const cards=Array.isArray(saved)?saved:saved?.races;
   const select=window.BakenMonitoringTargets?.extractTargets;
   if(typeof select!=='function')throw Error('対象抽出機能が未読込です');
   return select(state?.bets,cards);
 }
 function label(t){return t.date+' '+t.venue+t.raceNumber+'R'}
 function show(items){
   list.replaceChildren();
   for(const item of items){
     const p=document.createElement('p');p.style.margin='4px 0';p.textContent=label(item);list.append(p);
   }
 }
 function run(action){
   try{action()}catch(e){info.textContent='確認できません：'+e.message}
 }
 check.onclick=()=>run(()=>{
   const targets=current();info.textContent='現在の監視対象：'+targets.length+'レース';show(targets);
 });
 snapshot.onclick=()=>run(()=>{
   const targets=current();
   if(!targets.length){info.textContent='監視対象がありません。未精算馬券と発走時刻付きの出馬表を確認してください。';show([]);return}
   const baseline={schemaVersion:1,recordedAt:new Date().toISOString(),targets};
   localStorage.setItem(SNAPSHOT_KEY,JSON.stringify(baseline));
   info.textContent='精算前の対象を'+targets.length+'レース記録しました。ここから精算しても記録は残ります。';
   show(targets);
 });
 compare.onclick=()=>run(()=>{
   const baseline=JSON.parse(localStorage.getItem(SNAPSHOT_KEY)||'null');
   if(baseline?.schemaVersion!==1||!Array.isArray(baseline.targets))throw Error('先に「精算前の対象を記録」を押してください');
   const now=current(),result=diff(baseline.targets,now);
   info.textContent='記録時 '+result.before+'レース → 現在 '+result.after+'レース ／ 対象から解除 '+result.removed.length+'レース ／ 継続 '+result.retained.length+'レース ／ 新規 '+result.added.length+'レース';
   show(now);
 });
 row.append(check,snapshot,compare);
 card.append(title,desc,row,info,list);
 settings.appendChild(card);
})();
