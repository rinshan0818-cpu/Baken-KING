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
root.BakenJraAdapter={convert};
})(typeof window!=="undefined"?window:globalThis);
