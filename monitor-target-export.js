/* Baken-KING monitoring target selector. Local-only; never uploads bets. */
(() => {
  'use strict';
 // The beta sandbox never contacts or alters live result-monitoring services.
 if(localStorage.getItem('baken-king-mode-v1')==='test')return;
  const BETS_KEY='keiba-demo-v1';
  const CARDS_KEY='baken-king-personal-cards-v1';
  const VENUES=new Set(['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉']);
  const datePattern=/^20\d{2}-\d{2}-\d{2}$/;
  function read(key){
    try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}
  }
  function extractTargets(bets,cards,win5Tickets=[],win5Watch=null){
    if(!Array.isArray(bets)||!Array.isArray(cards))return [];
    const starts=new Map();
    for(const c of cards){
      if(!c||!datePattern.test(c.date)||!VENUES.has(c.venue)||!Number.isInteger(c.raceNumber)||c.raceNumber<1||c.raceNumber>12)continue;
      const value=typeof c.scheduledStartAt==='string'?c.scheduledStartAt:'';
      const time=value.match(/(?:T| )(\d{2}:\d{2})(?::\d{2})?(?:\+09:00|Z)?$/);
      if(!time)continue;
      const instant=Date.parse(c.date+'T'+time[1]+':00+09:00');
      if(!Number.isFinite(instant))continue;
      const key=c.date+'|'+c.venue+'|'+c.raceNumber;
      if(starts.has(key)&&starts.get(key)!==instant){starts.set(key,null);continue}
      if(!starts.has(key))starts.set(key,instant);
    }
    const result=new Map();
    for(const b of bets){
      if(!b||b.status!=='pending'||b.officialReady===true||b.specialManualResult===true||typeof b.realRaceId!=='string'||!b.realRaceId||!datePattern.test(b.raceDate)||!VENUES.has(b.raceVenue)||!Number.isInteger(Number(b.raceNumber)))continue;
      const number=Number(b.raceNumber);
      if(number<1||number>12)continue;
      const key=b.raceDate+'|'+b.raceVenue+'|'+number;
      const start=starts.get(key);
      if(!Number.isFinite(start))continue;
      result.set(key,{date:b.raceDate,venue:b.raceVenue,raceNumber:number});
    }
    // WIN5 adds only race identifiers, never selections, stakes or balances.
    if(Array.isArray(win5Tickets))for(const ticket of win5Tickets){
      if(!ticket||ticket.status!=='pending'||ticket.win5Evaluation?.complete===true||!datePattern.test(ticket.date)||!Array.isArray(ticket.legs)||ticket.legs.length!==5)continue;
      for(const leg of ticket.legs){
        if(!leg||!VENUES.has(leg.venue)||!Number.isInteger(leg.raceNumber)||leg.raceNumber<1||leg.raceNumber>12)continue;
        const key=ticket.date+'|'+leg.venue+'|'+leg.raceNumber;
        if(!Number.isFinite(starts.get(key)))continue;
        result.set(key,{date:ticket.date,venue:leg.venue,raceNumber:leg.raceNumber});
      }
    }
    // Explicit WIN5 read-only test registration; only identities go to monitor API.
    if(win5Watch?.status==='watching'&&datePattern.test(win5Watch.date)&&
       Array.isArray(win5Watch.legs)&&win5Watch.legs.length===5){
      const resolved=new Set((Array.isArray(win5Watch.confirmed)?win5Watch.confirmed:[])
       .filter(Boolean).map(l=>win5Watch.date+'|'+l.venue+'|'+l.raceNumber));
      for(const leg of win5Watch.legs){
       if(!leg||!VENUES.has(leg.venue)||!Number.isInteger(leg.raceNumber)||leg.raceNumber<1||leg.raceNumber>12)continue;
       const key=win5Watch.date+'|'+leg.venue+'|'+leg.raceNumber;
       if(!resolved.has(key)&&Number.isFinite(starts.get(key)))
        result.set(key,{date:win5Watch.date,venue:leg.venue,raceNumber:leg.raceNumber});
      }
    }
    return [...result.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.venue.localeCompare(b.venue,'ja')||a.raceNumber-b.raceNumber);
  }
  window.BakenMonitoringTargets={extractTargets};
  const settings=document.querySelector('[data-tab="settings"]');
  if(!settings)return;
  const box=document.createElement('section');
  box.className='card';
  box.style.marginTop='16px';
  const heading=document.createElement('h3');
  heading.textContent='結果監視の対象レース';
  const note=document.createElement('p');note.className='muted';
  note.textContent='購入済み・結果待ちのレースを購入直後から監視予約し、精算待ちになったら対象から解除します。発走時刻付き出馬表が必要です。買い目・金額・残高は出力しません。自動送信や精算はしません。';
  const button=document.createElement('button');
  button.type='button';button.textContent='監視対象をJSONで保存';
  const msg=document.createElement('p');msg.className='muted';
  button.addEventListener('click',()=>{
    try{
      const state=read(BETS_KEY);
      const stored=read(CARDS_KEY);
      const cards=Array.isArray(stored)?stored:stored?.races;
      const targets=extractTargets(state?.bets,cards,state?.win5Tickets,state?.win5Watch);
      if(!targets.length){msg.textContent='対象レースなし。発走時刻付きの出馬表と購入済み・未精算馬券を確認してください。';return}
      const payload={schemaVersion:1,kind:'baken-monitor-targets',targets};
      const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download='baken-monitor-targets.json';
      document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      msg.textContent=targets.length+'レースの監視対象を保存しました。まだ監視システムには送信されていません。';
    }catch(e){msg.textContent='対象の出力に失敗しました。'+e.message}
  });
  box.append(heading,note,button,msg);
  settings.appendChild(box);
})();
