/* WIN5 payout validation. Input MUST come only from the authenticated verified-results feed.
 * Never calculate a payout from ordinary 単勝 or unofficial WIN5 sales estimates.
 */
(function(root){
 'use strict';
 const legal=n=>Number.isInteger(n)&&n>=1&&n<=18;
 const dateOK=v=>typeof v==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(v);
 const timeOK=v=>typeof v==='string'&&/^20\d{2}-\d\d-\d\dT/.test(v)&&Number.isFinite(Date.parse(v))&&/(?:Z|[+-]\d\d:\d\d)$/i.test(v);
 const key=nums=>nums.join('-');
 function checkedRecord(record,ticket){
  if(!record||record.status!=='final'||record.officialVerified!==true||
     record.kind!=='WIN5'||record.date!==ticket.date||!dateOK(record.date)||
     !timeOK(record.confirmedAt)||!Array.isArray(record.legs)||record.legs.length!==5||
     !Array.isArray(record.payouts)||!record.payouts.length||record.payouts.length>512||
     typeof record.source!=='string'||record.source!=='JRA_WIN5')return {ok:false,reason:'WIN5公式払戻データを確認できません'};
  if(!ticket.win5Evaluation?.complete||ticket.win5Evaluation.void||!ticket.win5Evaluation.results?.length||
     ticket.win5Evaluation.results.length!==5)return {ok:false,reason:'WIN5対象5レースの確定結果待ち'};
  const wins=ticket.win5Evaluation.results.map(r=>r.winning);
  if(wins.some(group=>!Array.isArray(group)||!group.length||group.some(n=>!legal(n))))return {ok:false,reason:'1着馬を確認できません'};
  for(let i=0;i<5;i++){
   const leg=record.legs[i],original=ticket.legs[i];
   if(!leg||leg.venue!==original.venue||leg.raceNumber!==original.raceNumber||
      !Array.isArray(leg.winning)||leg.winning.length!==wins[i].length||
      !leg.winning.every(n=>legal(n)&&wins[i].includes(n))||new Set(leg.winning).size!==leg.winning.length)
    return {ok:false,reason:'WIN5対象レースまたは1着馬が一致しません'};
  }
  const map=new Map();
  for(const p of record.payouts){
   if(!p||!Array.isArray(p.numbers)||p.numbers.length!==5||p.numbers.some((n,i)=>!legal(n)||!wins[i].includes(n))||
      !Number.isSafeInteger(p.yenPer100)||p.yenPer100<100||p.yenPer100>600000000||
      map.has(key(p.numbers)))return {ok:false,reason:'WIN5公式払戻金の内容が不正です'};
   map.set(key(p.numbers),p.yenPer100);
  }
  // Every winning tuple needs its own payout; dead heats may have different payouts.
  const expected=wins.reduce((acc,numbers)=>acc.flatMap(prev=>numbers.map(n=>[...prev,n])),[[]]);
  if(map.size!==expected.length||expected.some(nums=>!map.has(key(nums))))return {ok:false,reason:'同着を含む全的中組み合わせの払戻情報が不足しています'};
  const chosen=ticket.legs.reduce((acc,leg)=>acc.flatMap(prev=>leg.numbers.map(n=>[...prev,n])),[[]]);
  let paid=0,hitCount=0;
  for(const picks of chosen){
   const win=map.get(key(picks));if(win===undefined)continue;
   const add=win*(ticket.unitStake/100);
   if(!Number.isSafeInteger(add)||!Number.isSafeInteger(paid+add))return {ok:false,reason:'WIN5払戻金が整数上限を超えています'};
   paid+=add;hitCount++;
  }
  if(hitCount!==ticket.win5Evaluation.hitCount)return {ok:false,reason:'WIN5的中点数が一致しません'};
  if(!Number.isSafeInteger(paid+ticket.win5Evaluation.refundYen))return {ok:false,reason:'WIN5精算額が整数上限を超えています'};
  return {ok:true,hitCount,payoutYen:paid,refundYen:ticket.win5Evaluation.refundYen,totalYen:paid+ticket.win5Evaluation.refundYen,
   payoutDate:record.date,confirmedAt:record.confirmedAt,source:'JRA_WIN5'};
 }
 root.BakenWin5PayoutEngine={checkedRecord};
})(window);