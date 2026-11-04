'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const today=()=>{
 const d=new Date();
 return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
};
(async()=>{
 const browser=await chromium.launch();
 const page=await browser.newPage();
 try{
  await page.route('**/data/authorized-race-cards.json*',route=>route.fulfill({status:404,body:'Not found'}));
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.BakenImportAuthorizedCards==='function');
  const now=today();
  const past='2026-10-31';
  const card=date=>({date,venue:'東京',raceNumber:1,horses:[{number:1,name:'テスト馬'}]});
  const result=await page.evaluate(async ({now,past})=>{
   const card=date=>({date,venue:'東京',raceNumber:1,horses:[{number:1,name:'テスト馬'}]});
   localStorage.setItem('baken-king-expired-test-wager','retained');
   await window.BakenImportAuthorizedCards({races:[card(past)]});
   const stale={dates:[...document.querySelector('#weekDate').options].map(x=>x.value),
    selected:window.BakenSelectedImportedRace,
    message:document.querySelector('#bkCardImportStatus')?.textContent||'',
    pickerHidden:document.querySelector('#weekendRaceSelector .bk-race-picker').hidden,
    waitingHidden:document.querySelector('#bkRaceCardsWaiting').hidden};
   await window.BakenImportAuthorizedCards({races:[card(now)]});
   const current={dates:[...document.querySelector('#weekDate').options].map(x=>x.value),
    selected:window.BakenSelectedImportedRace?.date,
    pickerHidden:document.querySelector('#weekendRaceSelector .bk-race-picker').hidden,
    waitingHidden:document.querySelector('#bkRaceCardsWaiting').hidden,
    persisted:JSON.parse(localStorage.getItem('baken-king-personal-cards-v1')).races.map(x=>x.date)};
   await window.BakenImportAuthorizedCards({races:[card(past)]});
   const notOverwritten={dates:[...document.querySelector('#weekDate').options].map(x=>x.value),
    persisted:JSON.parse(localStorage.getItem('baken-king-personal-cards-v1')).races.map(x=>x.date),
    wager:localStorage.getItem('baken-king-expired-test-wager')};
   return {stale,current,notOverwritten};
  },{now,past});
  assert.deepEqual(result.stale.dates,[]);
  assert.equal(result.stale.selected,null);
  assert.equal(result.stale.pickerHidden,true);
  assert.equal(result.stale.waitingHidden,false);
  assert.match(result.stale.message,/次回開催の出馬表を準備中/);
  assert.deepEqual(result.current.dates,[now]);
  assert.equal(result.current.selected,now);
  assert.equal(result.current.pickerHidden,false);
  assert.equal(result.current.waitingHidden,true);
  assert.deepEqual(result.notOverwritten.dates,[now]);
  assert.deepEqual(result.notOverwritten.persisted,[now]);
  assert.equal(result.notOverwritten.wager,'retained');
  console.log('Expired cards hidden, current cards displayed, historical data isolated.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
