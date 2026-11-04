// Disposable Chromium profile only. Synthetic race data; never accesses real user storage.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const URL='http://127.0.0.1:8765/';
const LIVE='keiba-demo-v1';
const TEST='baken-king-test-state-v1';
const MODE='baken-king-mode-v1';
const race={
 date:'2026-11-07',venue:'東京',raceNumber:1,
 title:'2歳未勝利',startTime:'10:00',scheduledStartAt:'2026-11-07T10:00:00+09:00',
 numbersConfirmed:true,
 horses:Array.from({length:8},(_,i)=>({number:i+1,frame:i+1,name:'架空馬'+(i+1)}))
};
(async()=>{
 const browser=await chromium.launch();
 const context=await browser.newContext();
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.clock.install({time:new Date('2026-11-06T00:00:00Z')});
  await page.route('**/data/authorized-race-cards.json*',route=>
    route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({races:[race]})}));
  await page.goto(URL,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.BakenImportedCards?.length===1);
  await page.locator('[data-nav="predict"]').click();
  await page.locator('#realBetType').selectOption('馬連');
  await page.locator('#realBetMode').selectOption('normal');
  await page.locator('#autumnHorseList .bk-autumn-row').nth(0).click();
  await page.locator('#autumnHorseList .bk-autumn-row').nth(1).click();
  await page.locator('#realBuy').click();
  await page.getByRole('button',{name:'この内容で購入'}).click();
  const bought=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),LIVE);
  assert.equal(bought.bets.length,1,'One ticket saved');
  assert.equal(bought.bets[0].status,'pending');
  assert(bought.totalStake>0,'Total stake not recorded');
  assert.equal(bought.balance,100000-bought.totalStake,'Purchase was not deducted once');
  assert.equal(bought.totalPaid,0,'Payout should not occur on purchase');
  const beforeReload=JSON.stringify(bought);
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),LIVE),beforeReload,'Reload changed saved balance or ticket state');

  // Explicitly enter test mode and verify the separate key, then leave without mutating live tickets.
  await page.evaluate(mode=>localStorage.setItem('baken-king-mode-v1',mode),'test');
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('bk-test-mode')),true);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),LIVE),beforeReload,'Entering test mode corrupted live state');
  const testState=await page.evaluate(key=>localStorage.getItem(key),TEST);
  if(testState!==null){
   const obj=JSON.parse(testState);
   assert.equal(obj.bets.length,0,'Test state unexpectedly copied live tickets');
  }
  await page.evaluate(()=>localStorage.setItem('baken-king-mode-v1','normal'));
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('bk-test-mode')),false);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),LIVE),beforeReload,'Returning from test mode corrupted live bets');

  // A season must not restart while it still has an unsettled wager.
  await page.evaluate(()=>{
   s.balance=0;
   s.seasonOver=false;
   save();
  });
  let ended=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),LIVE);
  assert.equal(ended.season,1,'A pending ticket must prevent bankruptcy rollover');
  assert.equal(ended.balance,0,'Pending race must preserve empty wallet until settlement');
  assert.equal(ended.bets[0].status,'pending');

  // Settling the last ticket at zero balance automatically begins season 2.
  await page.evaluate(()=>{
   s.bets[0].status='settled';
   s.bets[0].paid=0;
   save();
  });
  ended=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),LIVE);
  assert.equal(ended.season,2,'Bankruptcy must start the next season automatically');
  assert.equal(ended.balance,100000,'New season must receive 100,000 yen');
  assert.equal(ended.grants,200000,'Second grant should be cumulative');
  assert.equal(ended.bankrupt,1,'One completed bankruptcy should count once');
  assert.equal(ended.seasons.length,1);
  assert.equal(ended.seasons[0].reason,'ゲームオーバー');
  assert.equal(ended.bets.length,1,'Old season betting history must remain intact');
  assert.equal(ended.bets[0].season,1);
  await page.reload({waitUntil:'domcontentloaded'});
  const persisted=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),LIVE);
  assert.equal(persisted.season,2,'Reload must not restart the season again');
  assert.equal(persisted.grants,200000,'Reload must not award duplicate funds');
  assert.equal(persisted.bets.length,1,'Reload must not delete previous records');
  assert.deepEqual(errors,[],'JavaScript exception during save/reload/mode switch');
  console.log('PASS: purchase balance, reload persistence, and live/test storage separation');
 }catch(error){
  fs.mkdirSync('test-results',{recursive:true});
  await page.screenshot({path:'test-results/storage-regression.png',fullPage:true}).catch(()=>{});
  fs.writeFileSync('test-results/storage-regression-errors.json',JSON.stringify(errors,null,2));
  throw error;
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
