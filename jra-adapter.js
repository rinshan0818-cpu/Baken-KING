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
  const n=Number(r.horse_no), f=r.frame_no===null||r.frame_no===undefined||r.frame_no===""?null:Number(r.frame_no);
  if(!Number.isInteger(n)||n<1||n>18||(f!==null&&(!Number.isInteger(f)||f<1||f>8)))throw Error("馬番・枠番が不正");
  if(!["active","withdrawn","excluded",undefined,null].includes(r.status))throw Error("出走状態が不明です");
  return {number:n,...(f===null?{}:{frame:f}),...(r.horse_name?{name:r.horse_name}:{}),
   status:r.status==="withdrawn"?"scratched":r.status==="excluded"?"excluded":"running"};
 });
 const result={schemaVersion:1,date:options.date,venue,raceNumber:options.raceNumber,raceName:card.race_name||null,upstreamRaceId:card.race_id?String(card.race_id):undefined,
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
 if(cardRace.upstreamRaceId&&String(result.race_id||"")!==cardRace.upstreamRaceId)throw Error("結果のレースIDが出馬表と一致しません");
 const validNumbers=new Set(cardRace.horses.map(x=>x.number));
 if(!result.results.length)throw Error("着順が空です");
 const nonRank={"中止":"dnf","競走中止":"dnf","失格":"disqualified","除外":"excluded","競走除外":"excluded","取消":"scratched","出走取消":"scratched"};
 const ranked=[],nonFinishers=[],seenHorses=new Set();
 for(const entry of result.results){
  const label=String(entry.rank??"").trim();
  const number=Number(entry.horse_no);
  if(!Number.isInteger(number)||!validNumbers.has(number)||seenHorses.has(number))throw Error("着順の馬番が不正・重複しています");
  seenHorses.add(number);
  if(/^\d+$/.test(label)){
   const rank=Number(label);
   if(rank<1||rank>18)throw Error("着順の範囲が不正です");
   ranked.push({rank,number});
  }else if(Object.prototype.hasOwnProperty.call(nonRank,label)){
   nonFinishers.push({number,status:nonRank[label]});
  }else throw Error("不明な結果区分です: "+label);
 }
 ranked.sort((a,b)=>a.rank-b.rank||a.number-b.number);
 const payouts=[];
 for(const p of result.payouts){
  // Frame quinella is intentionally outside the supported seven ticket types.
  if(["frame","bracket","wakuren","枠連"].includes(p.bet_type))continue;
  const type=betKinds[p.bet_type];
  if(!type)throw Error("未対応券種です: "+p.bet_type);
  const numbers=parseNumbers(p.combination);
  if(numbers.length!==choices[type]||numbers.some(n=>!validNumbers.has(n)))throw Error("払戻の買い目が不正です");
  payouts.push({type,numbers,yenPer100:parseYen(p.payout)});
 }
 // The scraper model has no trusted official-final/refund-completeness flag.
 // Return provisional only; settlement must wait for separately verified flags.
 return {status:"provisional",finish:ranked.map(e=>e.number),placements:ranked,nonFinishers,payouts};
}

// Convert the documented RaceOdds/OddsEntry model. This is not an odds provider.
// Reject unverified timestamps and unsupported multi-price ranges instead of
// presenting them as a single real-time price.
function convertOdds(data,race){
 if(!race||!race.raceId||!data||typeof data!=="object")throw Error("オッズ情報が不足しています");
 if(race.upstreamRaceId&&String(data.race_id||"")!==race.upstreamRaceId)throw Error("オッズのレースIDが出馬表と一致しません");
 const timestamp=Date.parse(data.fetched_at);
 if(typeof data.fetched_at!=="string"||!/(Z|[+-]\d{2}:\d{2})$/.test(data.fetched_at)||!Number.isFinite(timestamp))throw Error("取得時刻のないオッズは使えません");
 const preRace=timestamp<Date.parse(race.scheduledStartAt);
 const groups=[];
 if(Array.isArray(data.entries)&&data.bet_type)groups.push({kind:data.bet_type,items:data.entries});
 if(data.odds&&typeof data.odds==="object"&&!Array.isArray(data.odds)){
  for(const [kind,items] of Object.entries(data.odds)){if(Array.isArray(items))groups.push({kind,items})}
 }
 if(!groups.length)throw Error("対象のオッズがありません");
 const output=[],seen=new Set();
 for(const group of groups){
  const type=betKinds[group.kind];if(!type)continue;
  for(const item of group.items){
   if(!item||typeof item!=="object")throw Error("オッズ項目が不正です");
   if(item.odds_min!==null&&item.odds_min!==undefined||item.odds_max!==null&&item.odds_max!==undefined)continue;
   const combination=Array.isArray(item.combination)?item.combination.join("-"):String(item.combination||"");
   const numbers=parseNumbers(combination);
   if(numbers.length!==choices[type]||numbers.some(n=>!race.horses.some(h=>h.number===n)))throw Error("オッズ馬番が不正です");
   const odds=Number(String(item.odds||"").replace(/[,，倍\s]/g,""));
   if(!Number.isFinite(odds)||odds<1||odds>99999)continue;
   const orderedTypes=new Set(["馬単","三連単"]);
   const normalized=orderedTypes.has(type)?numbers:numbers.slice().sort((a,b)=>a-b);
   const key=type+":"+normalized.join("-");
   if(seen.has(key))continue;
   seen.add(key);
   output.push({type,numbers:normalized,odds});
  }
 }
 if(!output.length)throw Error("利用可能なオッズがありません");
 return {raceId:race.raceId,observedAt:data.fetched_at,isBeforeStart:preRace,entries:output,verified:false};
}

// JRA-srb MeetingSnapshot -> pre-race program index. No horses until the card exists.
function convertMeeting(meeting){
 if(!meeting||typeof meeting.date!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(meeting.date))throw Error("開催日が不正です");
 const venue=venues[meeting.course];
 if(!venue||!Array.isArray(meeting.races))throw Error("開催場・レース一覧が不正です");
 const numbers=new Set();
 const races=meeting.races.map(r=>{
  const no=Number(r.race_no);
  if(!Number.isInteger(no)||no<1||no>12||numbers.has(no))throw Error("レース番号の重複または範囲外です");
  numbers.add(no);
  const time=r.start_time??null;
  if(time!==null&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error("発走予定時刻が不正です");
  return {
   raceId:meeting.date+"-"+venue+"-"+no,
   upstreamRaceId:r.race_id?String(r.race_id):null,
   date:meeting.date,venue,raceNumber:no,raceName:r.race_name||null,
   scheduledStartAt:time?meeting.date+"T"+time+":00+09:00":null,
   cardAvailable:false,purchaseAllowed:false
  };
 });
 races.sort((a,b)=>a.raceNumber-b.raceNumber);
 return {date:meeting.date,venue,races,sourceVerified:false};
}
root.BakenJraAdapter={convert,convertResult,convertOdds,convertMeeting};
})(typeof window!=="undefined"?window:globalThis);
