/* Standalone adapter for the documented JSON shapes of jra-srb.
 * This file does not fetch JRA data or contain code copied from that project.
 * All input is caller-supplied. Keep actual race data outside public repos. */
(function(root){
"use strict";
const venues={sapporo:"札幌",hakodate:"函館",fukushima:"福島",niigata:"新潟",tokyo:"東京",nakayama:"中山",chukyo:"中京",kyoto:"京都",hanshin:"阪神",kokura:"小倉"};
function convert(card,options){
 if(!card||!options||!/^\d{4}-\d{2}-\d{2}$/.test(options.date))throw Error("開催日・カードが不足");
 const venue=venues[options.course];
 if(!venue||!Number.isInteger(options.raceNumber)||options.raceNumber<1||options.raceNumber>12)throw Error("競馬場またはRが不正");
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(card.start_time||""))throw Error("発走時刻が不明・不正");
 if(!Array.isArray(card.runners)||!card.runners.length)throw Error("出馬表が空です");
 const horses=card.runners.map(r=>{
  const n=Number(r.horse_no),f=Number(r.frame_no);
  if(!Number.isInteger(n)||n<1||n>18||!Number.isInteger(f)||f<1||f>8)throw Error("馬番・枠番が不正");
  if(typeof r.horse_name!=="string"||!r.horse_name.trim())throw Error("馬名が不正");
  return {number:n,frame:f,name:r.horse_name,status:r.status==="withdrawn"?"scratched":"running"};
 });
 const result={schemaVersion:1,date:options.date,venue,raceNumber:options.raceNumber,
  scheduledStartAt:options.date+"T"+card.start_time+":00+09:00",
  source:{kind:"fixture",label:"変換構造のオフライン試験用（実データではない）"},horses};
 // Results and payouts intentionally not accepted until source rules and exact semantics are verified.
 return root.BakenRaceData.parseRace(result);
}

// Result and payout mapping for the documented JSON model. Offline fixture validation only.
// Exact settlement of ties, refunds and missing payouts is intentionally not supported.
const betKinds={win:"単勝",place:"複勝",quinella:"馬連",wide:"ワイド",exacta:"馬単",trio:"三連複",trifecta:"三連単"};
const choices={"単勝":1,"複勝":1,"馬連":2,"ワイド":2,"馬単":2,"三連複":3,"三連単":3};
function parseNumbers(raw){
 const numbers=String(raw||"").match(/\d+/g);
 if(!numbers||numbers.length<1||numbers.length>3)throw Error("組み合わせを認識できません");
 const parsed=numbers.map(Number);
 if(parsed.some(n=>!Number.isInteger(n)||n<1||n>18)||new Set(parsed).size!==parsed.length)throw Error("買い目の馬番が不正です");
 return parsed;
}
function parseYen(raw){
 const cleaned=String(raw||"").replace(/[円￥¥,，\s]/g,"");
 if(!/^\d+$/.test(cleaned))throw Error("払戻金の形式が不正です");
 const yen=Number(cleaned);
 if(!Number.isSafeInteger(yen)||yen<0||yen>100000000)throw Error("払戻金が範囲外です");
 return yen;
}
function convertResult(result,cardRace){
 if(!cardRace||!Array.isArray(cardRace.horses)||!result||!Array.isArray(result.results)||!Array.isArray(result.payouts))throw Error("結果・払戻が不足しています");
 const validNumbers=new Set(cardRace.horses.map(x=>x.number));
 if(!result.results.length)throw Error("着順が空です");
 const ranked=result.results.map(e=>{
  const rank=String(e.rank||"").trim(),number=Number(e.horse_no);
  if(!/^\d+$/.test(rank)||!Number.isInteger(number)||!validNumbers.has(number))throw Error("確定着順を認識できません");
  return {rank:Number(rank),number};
 });
 const seen=new Set();
 for(const e of ranked){if(seen.has(e.rank))throw Error("同着は未対応です");seen.add(e.rank)}
 ranked.sort((a,b)=>a.rank-b.rank);
 if(ranked.some((e,i)=>e.rank!==i+1))throw Error("着順の欠落を認識しました");
 const payouts=result.payouts.map(p=>{
  const type=betKinds[p.bet_type];
  if(!type)throw Error("未対応券種です: "+p.bet_type);
  const numbers=parseNumbers(p.combination);
  if(numbers.length!==choices[type]||numbers.some(n=>!validNumbers.has(n)))throw Error("払戻の買い目が不正です");
  return {type,numbers,yenPer100:parseYen(p.payout)};
 });
 return {status:"provisional",finish:ranked.map(e=>e.number),payouts};
}
root.BakenJraAdapter={convert,convertResult};
})(typeof window!=="undefined"?window:globalThis);
