// Offline integration test of local-only import CLI using generated fictional data.
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'baken-test-'));
try{
 const file=path.join(dir,'fictional-race.json');
 const race={
  options:{date:'2025-10-25',course:'tokyo',raceNumber:11},
  card:{race_id:'FAKE-LOCAL-1',start_time:'15:45',runners:[
   {horse_no:'1',frame_no:'1',horse_name:'架空A'},
   {horse_no:'2',frame_no:'2',horse_name:'架空B'},
   {horse_no:'3',frame_no:'3',horse_name:'架空C'}]},
  odds:[{race_id:'FAKE-LOCAL-1',bet_type:'quinella',fetched_at:'2025-10-25T14:15:00+09:00',entries:[{combination:['1','2'],odds:'5.6'}]}],
  result:{race_id:'FAKE-LOCAL-1',results:[
   {rank:'1',horse_no:'1'},{rank:'2',horse_no:'2'},{rank:'3',horse_no:'3'}],
   payouts:[{bet_type:'quinella',combination:'1-2',payout:'560円'}]}
 };
 fs.writeFileSync(file,JSON.stringify(race));
 const cli=path.join(__dirname,'..','scripts','inspect-private-race.cjs');
 const ok=spawnSync(process.execPath,[cli,file],{encoding:'utf8'});
 assert.equal(ok.status,0,ok.stderr);
 const result=JSON.parse(ok.stdout);
 assert.equal(result.runnerCount,3);assert.equal(result.oddsSnapshots,1);
 assert.equal(result.payoutEntries,1);assert.equal(result.productionPurchaseAllowed,false);
 race.result.race_id='WRONG-RACE';
 fs.writeFileSync(file,JSON.stringify(race));
 const bad=spawnSync(process.execPath,[cli,file],{encoding:'utf8'});
 assert.equal(bad.status,1);
 assert.match(bad.stderr,/レースID/);
 console.log('PASS: private race offline CLI accepts fictional aligned data and rejects a different race');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
