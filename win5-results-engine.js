/* WIN5 verified race-result evaluator. Pure read-only evaluation; no wallet changes.
 * WIN5 payout amounts MUST come from separate confirmed WIN5 data, never from 単勝 payouts.
 */
(function(root){
'use strict';
const range=n=>Number.isInteger(n)&&n>=1&&n<=18;
function assess(ticket,feed){
 if(!ticket||!Array.isArray(ticket.legs)||ticket.legs.length!==5||!Array.isArray(feed?.races))return {complete:false,reason:'結果形式が不正です'};
 const results=[];
 for(let i=0;i<5;i++){
  const leg=ticket.legs[i];
  if(!leg||!Array.isArray(leg.numbers)||leg.numbers.length<1||leg.numbers.some(n=>!range(n)))return {complete:false,reason:'購入馬番が不正です'};
  const rows=feed.races.filter(r=>r&&r.date===ticket.date&&r.venue===leg.venue&&r.raceNumber===leg.raceNumber);
  if(rows.length!==1)return {complete:false,reason:'WIN'+(i+1)+'の確定結果待ち',results};
  const r=rows[0];
  if(!['final','void'].includes(r.status)||typeof r.confirmedAt!=='string'||!Number.isFinite(Date.parse(r.confirmedAt))||!/(?:Z|[+-]\d\d:\d\d)$/i.test(r.confirmedAt))
   return {complete:false,reason:'WIN'+(i+1)+'の公式確定待ち',results};
  if(r.status==='void'){
   if(r.voidVerified!==true||!['競走不成立','競走取止'].includes(r.voidReason))return {complete:false,reason:'競走取止の確認待ち',results};
   results.push({raceNumber:leg.raceNumber,venue:leg.venue,void:true,winning:[],refunded:[]});
   continue;
  }
  if(!Array.isArray(r.completeTypes)||!r.completeTypes.includes('単勝')||!Array.isArray(r.payouts)||r.refunds?.length)return {complete:false,reason:'WIN'+(i+1)+'の払戻確定情報待ち',results};
  const refunded=r.refundHorseNumbers===undefined?[]:r.refundHorseNumbers;
  if(!Array.isArray(refunded)||refunded.some(n=>!range(n))||new Set(refunded).size!==refunded.length||(refunded.length>0&&r.refundHorseNumbersVerified!==true))
   return {complete:false,reason:'WIN'+(i+1)+'の返還馬番の確認待ち',results};
  const winning=r.payouts.filter(p=>p?.type==='単勝'&&Array.isArray(p.numbers)&&p.numbers.length===1&&range(p.numbers[0])&&Number.isSafeInteger(p.yenPer100)&&p.yenPer100>0).map(p=>p.numbers[0]);
  if(!winning.length||new Set(winning).size!==winning.length||winning.some(n=>refunded.includes(n)))
   return {complete:false,reason:'WIN'+(i+1)+'の1着馬を確定できません',results};
  results.push({raceNumber:leg.raceNumber,venue:leg.venue,void:false,winning,refunded});
 }
 const unit=ticket.unitStake;
 if(!Number.isSafeInteger(unit)||unit<100||unit%100)return {complete:false,reason:'購入金額が不正です'};
 const total=ticket.legs.reduce((n,l)=>n*l.numbers.length,1);
 if(!Number.isSafeInteger(total)||total<1||total>5000||ticket.stake!==unit*total)return {complete:false,reason:'購入点数を確認できません'};
 if(results.some(r=>r.void))return {complete:true,void:true,total,hitCount:0,refundCount:total,refundYen:ticket.stake,results};
 const validProduct=ticket.legs.reduce((n,l,i)=>n*l.numbers.filter(v=>!results[i].refunded.includes(v)).length,1);
 const refundCount=total-validProduct;
 const hitCount=ticket.legs.reduce((n,l,i)=>n*l.numbers.filter(v=>results[i].winning.includes(v)).length,1);
 return {complete:true,void:false,total,hitCount,refundCount,refundYen:refundCount*unit,results};
}
root.BakenWin5ResultEngine={assess};
})(window);
