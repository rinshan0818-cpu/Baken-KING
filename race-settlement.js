/* Baken-KING deterministic virtual-ticket settlement (no fetching, no actual betting).
 * All inputs must be independently verified. Do not use on provisional or incomplete results.
 */
(function(root){
"use strict";
const lengths={"単勝":1,"複勝":1,"馬連":2,"ワイド":2,"馬単":2,"三連複":3,"三連単":3};
const unordered=new Set(["馬連","ワイド","三連複"]);
function combo(type,numbers){
 if(!Object.prototype.hasOwnProperty.call(lengths,type))throw Error("未対応の券種です");
 if(!Array.isArray(numbers)||numbers.length!==lengths[type]||numbers.some(n=>!Number.isInteger(n)||n<1||n>18)||new Set(numbers).size!==numbers.length)throw Error("馬番の選択が不正です");
 const numbersOut=unordered.has(type)?numbers.slice().sort((a,b)=>a-b):numbers.slice();
 return type+":"+numbersOut.join("-");
}
function settle(race,ticket){
 if(!race||!Array.isArray(race.horses)||!ticket)throw Error("レースまたは仮想馬券が不足しています");
 const key=combo(ticket.type,ticket.numbers);
 const stake=ticket.stake;
 if(!Number.isSafeInteger(stake)||stake<100||stake>1000000||stake%100!==0)throw Error("購入額は100円単位で指定してください");
 const valid=new Set(race.horses.map(h=>h.number));
 if(ticket.numbers.some(n=>!valid.has(n)))throw Error("出走表にない馬番です");
 const pending=reason=>({kind:"pending",returnYen:0,profitYen:null,reason});
 const result=race.result;
 if(!result||result.status!=="official-final")return pending("公式確定情報がありません");
 if(result.payoutsComplete!==true||result.refundsComplete!==true||!Array.isArray(result.payouts)||!Array.isArray(result.refundHorseNumbers))return pending("払戻または返還の完全性を確認できません");
 const refunds=result.refundHorseNumbers;
 if(refunds.some(n=>!Number.isInteger(n)||!valid.has(n))||new Set(refunds).size!==refunds.length)throw Error("返還対象馬番が不正です");
 for(const h of race.horses){
  if(["scratched","excluded"].includes(h.status)&&!refunds.includes(h.number))throw Error("出走取消・除外と返還情報が一致しません");
 }
 if(result.raceCancelled===true||ticket.numbers.some(n=>refunds.includes(n)))return {kind:"refund",returnYen:stake,profitYen:0,reason:"公式の返還対象"};
 const payoutMap=new Map();
 for(const p of result.payouts){
  const id=combo(p.type,p.numbers);
  if(payoutMap.has(id)||!Number.isSafeInteger(p.yenPer100)||p.yenPer100<1||p.yenPer100>100000000||p.numbers.some(n=>!valid.has(n)))throw Error("確定払戻データが不正・重複しています");
  payoutMap.set(id,p.yenPer100);
 }
 const paid=payoutMap.get(key);
 if(paid===undefined)return {kind:"lost",returnYen:0,profitYen:-stake,reason:"的中組合せに該当しません"};
 const returned=paid*(stake/100);
 if(!Number.isSafeInteger(returned))throw Error("払戻計算が整数範囲を超えました");
 return {kind:"won",returnYen:returned,profitYen:returned-stake,reason:"公式確定払戻に一致"};
}
root.BakenSettlement={settle,combo};
})(typeof window!=="undefined"?window:globalThis);
