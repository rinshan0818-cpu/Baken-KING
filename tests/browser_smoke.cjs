const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const horses=Array.from({length:8},(_,i)=>({number:i+1,name:'テスト馬'+(i+1),frame:i+1}));
  const scratchedHorses=horses.map((h,i)=>i===7?{...h,scratched:true}:h);
  const races=[
   {date:'2026-11-07',venue:'東京',raceNumber:1,scheduledStartAt:'2026-11-07T10:00:00+09:00',horses},
   {date:'2026-11-07',venue:'京都',raceNumber:2,scheduledStartAt:'2026-11-07T10:30:00+09:00',horses},
   {date:'2026-11-08',venue:'東京',raceNumber:3,scheduledStartAt:'2026-11-08T11:00:00+09:00',horses:scratchedHorses}
  ];
  await page.route('**/data/authorized-race-cards.json*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({races})}));
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.BakenImportedCards?.length===3);
  await page.locator('[data-nav="predict"]').click();
  assert.equal(await page.locator('#weekDate option').count(),2);
  assert.equal(await page.locator('#weekVenue option').count(),2);
  assert.equal(await page.locator('#autumnFixtureCard').isVisible(),true);
  await page.locator('#weekVenue').selectOption('京都');
  assert.equal(await page.locator('#weekRace').inputValue(),'2');
  await page.locator('#weekDate').selectOption('2026-11-08');
  assert.equal(await page.locator('#weekRace').inputValue(),'3');
  assert.equal(await page.locator('#autumnHorseList .bk-autumn-row').nth(7).isDisabled(),true,'Scratched horse must not be selectable');
  const controlState=await page.locator('#realBetType').evaluate(el=>{
    const parent=el.closest('#autumnFixtureCard');
    return {selectedTab:document.querySelector('[data-nav].active')?.dataset.nav,
      cardHidden:parent?.hidden,cardDisplay:getComputedStyle(parent).display,
      selectDisplay:getComputedStyle(el).display,
      parentDisplay:getComputedStyle(el.parentElement).display,
      rect:el.getBoundingClientRect().toJSON()};
  });
  console.log('Purchase control diagnostics:',JSON.stringify(controlState));
  if(!await page.locator('#realBetType').isVisible()){
    fs.mkdirSync('test-results',{recursive:true});
    await page.screenshot({path:'test-results/purchase-selector-hidden.png',fullPage:true});
    fs.writeFileSync('test-results/purchase-selector-state.json',JSON.stringify(controlState,null,2));
    throw new Error('Purchase selector hidden: '+JSON.stringify(controlState));
  }
  await page.locator('#realBetType').selectOption('馬連');
  await page.locator('#realBetMode').selectOption('normal');
  await page.locator('#autumnHorseList .bk-autumn-row').nth(0).click();
  await page.locator('#autumnHorseList .bk-autumn-row').nth(1).click();
  assert.equal(await page.locator('#realBuy').isDisabled(),false);
  await page.locator('#realBuy').click();
  await page.getByRole('button',{name:'この内容で購入'}).click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('keiba-demo-v1')));
  assert(saved.bets.some(b=>b.raceDate==='2026-11-08'&&b.raceVenue==='東京'&&b.raceNumber===3&&b.status==='pending'),'Purchase not saved');
  assert.equal(saved.bets.filter(b=>b.raceDate==='2026-11-08'&&b.raceVenue==='東京'&&b.raceNumber===3).length,1,'Exactly one ticket should be saved');
  const unknownTime={date:'2026-11-09',venue:'東京',raceNumber:4,horses};
  await page.evaluate(race=>window.dispatchEvent(new CustomEvent('baken:race-selected',{detail:{race:{...race,numbersConfirmed:true,title:'時刻未設定テスト'}}})),unknownTime);
  assert.equal(await page.locator('#realBuy').isDisabled(),true,'Unknown start time must disable purchase');
  assert.deepEqual(errors,[]);
  console.log('PASS: race selection and virtual purchase persistence');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
