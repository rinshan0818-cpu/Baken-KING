/* Baken-KING offline one-race bundle builder.
 * No network calls, no third-party source code; input is pre-existing JSON. */
(function(root){
"use strict";
function combine(input){
 if(!input||!root.BakenJraAdapter||!root.BakenRaceData)throw Error("変換モジュールが不足しています");
 const {card,odds,result,options}=input;
 const race=root.BakenJraAdapter.convert(card,options);
 const snapshots=[];
 if(odds!==undefined&&odds!==null){
  if(!Array.isArray(odds))throw Error("オッズは配列で指定してください");
  for(const o of odds){
   const item=root.BakenJraAdapter.convertOdds(o,race);
   if(!item.isBeforeStart)throw Error("発走後に取得したオッズを事前情報に含められません");
   snapshots.push(item);
  }
  snapshots.sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt));
 }
 let finished=null;
 if(result!==undefined&&result!==null){
  const normalized=root.BakenJraAdapter.convertResult(result,race);
  finished={...race,result:normalized};
  // Validate the final combined shape, including horse numbers.
  root.BakenRaceData.parseRace(finished);
 }
 const development=root.BakenRaceData.purchaseState(race,"development");
 const production=root.BakenRaceData.purchaseState(race,"production");
 return {race,oddsSnapshots:snapshots,finished,mode:{development,production},
  info:"開発用の未検証データ。公開・精算に使わないでください"};
}
root.BakenRaceBundle={combine};
})(typeof window!=="undefined"?window:globalThis);
