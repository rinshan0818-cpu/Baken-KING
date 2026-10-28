/* Baken-KING race data foundation v1. No third-party network fetching. */
(function(root){
"use strict";
const places=new Set(["札幌","函館","福島","新潟","東京","中山","中京","京都","阪神","小倉"]);
function parseRace(raw){
 if(!raw||typeof raw!=="object")throw Error("レースデータではありません");
 const date=raw.date,venue=raw.venue,raceNumber=raw.raceNumber;
 if(typeof date!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+"T00:00:00+09:00")))throw Error("開催日が不正です");
 if(typeof venue!=="string"||!places.has(venue))throw Error("競馬場名が不正です");
 if(!Number.isInteger(raceNumber)||raceNumber<1||raceNumber>12)throw Error("レース番号が不正です");
 if(!Array.isArray(raw.horses)||raw.horses.length<1||raw.horses.length>18)throw Error("出走馬は1〜18頭です");
 const numbers=new Set();
 const horses=raw.horses.map(h=>{
  if(!h||!Number.isInteger(h.number)||h.number<1||h.number>18||numbers.has(h.number))throw Error("馬番の重複または範囲外です");
  numbers.add(h.number);
  if(h.name!==undefined&&h.name!==null&&(typeof h.name!=="string"||h.name.trim().length>80))throw Error("馬名が不正です");
  const nameKnown=typeof h.name==="string"&&h.name.trim().length>0;
  if(h.frame!==undefined&&(!Number.isInteger(h.frame)||h.frame<1||h.frame>8))throw Error("枠番は1〜8です");
  const state=h.status||"running";
  if(!["running","scratched","excluded"].includes(state))throw Error("出走状態が不正です");
  return {number:h.number,name:nameKnown?h.name.trim():"馬番"+h.number,nameKnown,frame:h.frame??null,status:state};
 });
 if(typeof raw.scheduledStartAt!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\+09:00$/.test(raw.scheduledStartAt)||Number.isNaN(Date.parse(raw.scheduledStartAt)))throw Error("発走時刻は日本時間のISO形式で指定してください");
 if(raw.scheduledStartAt.slice(0,10)!==date)throw Error("開催日と発走日が一致しません");
 if(!["fixture","licensed","user-provided"].includes(raw.source?.kind))throw Error("データの出典を指定してください");
 const raceName=raw.raceName===undefined||raw.raceName===null?null:raw.raceName;
 if(raceName!==null&&(typeof raceName!=="string"||raceName.length>120))throw Error("レース名が不正です");
 const upstreamRaceId=raw.upstreamRaceId===undefined?null:raw.upstreamRaceId;
 if(upstreamRaceId!==null&&(typeof upstreamRaceId!=="string"||upstreamRaceId.length<1||upstreamRaceId.length>100))throw Error("取得元レースIDが不正です");
 const result=raw.result||null;
 if(result!==null&&(!["official-final","provisional"].includes(result.status)||!Array.isArray(result.finish)||result.finish.some(n=>!numbers.has(n))||new Set(result.finish).size!==result.finish.length))throw Error("結果データが不正です");
 return Object.freeze({schemaVersion:1,raceId:date+"-"+venue+"-"+raceNumber,date,venue,raceNumber,raceName,scheduledStartAt:raw.scheduledStartAt,upstreamRaceId,horses,source:{kind:raw.source.kind,label:String(raw.source.label||"").slice(0,100)},result});
}
function purchaseState(race,mode,now=Date.now()){
 if(mode==="development")return {allowed:race.source.kind==="fixture",reason:race.source.kind==="fixture"?"開発専用・正式成績には計上しません":"開発用の架空データのみ購入できます"};
 if(mode!=="production")return {allowed:false,reason:"無効な実行モード"};
 // Client-side check is display protection only; real purchases require trusted server time.
 if(race.source.kind!=="licensed")return {allowed:false,reason:"本番用の利用許可済みデータではありません"};
 if(race.result)return {allowed:false,reason:"結果が登録されたレースは購入できません"};
 if(now>=Date.parse(race.scheduledStartAt))return {allowed:false,reason:"発走時刻を過ぎたため購入できません"};
 return {allowed:false,reason:"サーバーでの締切認証が未実装のため本番購入は停止中"};
}
root.BakenRaceData={parseRace,purchaseState};
})(typeof window!=="undefined"?window:globalThis);
