#!/usr/bin/env node
// Baken-KING: validate locally supplied race JSON without contacting race websites.
// Do not commit actual downloaded race data to the public Baken-KING repository.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function loadJson(p){return JSON.parse(fs.readFileSync(path.resolve(p),'utf8'))}
function main(args){
 if(args.length!==1){console.error('使い方: node scripts/inspect-private-race.cjs /private/path/race-package.json');return 2}
 const source=loadJson(args[0]);
 if(!source||typeof source!=='object'||!source.card||!source.options)throw Error('card/optionsがありません');
 const context={};vm.createContext(context);
 for(const file of ['race-data.js','jra-adapter.js','race-bundle.js']){
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context,{filename:file});
 }
 const b=context.BakenRaceBundle.combine({
  options:source.options,
  card:source.card,
  odds:source.odds??[],
  result:source.result??null
 });
 const summary={
  status:'validated-offline-not-verified-against-JRA',
  raceId:b.race.raceId,
  runnerCount:b.race.horses.length,
  oddsSnapshots:b.oddsSnapshots.length,
  oddsEntries:b.oddsSnapshots.reduce((n,x)=>n+x.entries.length,0),
  payoutEntries:b.finished?.result.payouts.length??0,
  hasResult:!!b.finished,
  productionPurchaseAllowed:b.mode.production.allowed
 };
 console.log(JSON.stringify(summary,null,2));
 return 0;
}
if(require.main===module){
 try{process.exitCode=main(process.argv.slice(2))}catch(e){
  console.error('データ検証失敗：'+e.message);
  process.exitCode=1;
 }
}
module.exports={main};
