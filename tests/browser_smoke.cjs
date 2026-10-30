const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const horses=Array.from({length:8},(_,i)=>({number:i+1,name:'テスト馬'+(i+1),frame:i+1}));
  const races=[
   {date:'2026-11-07',venue:'東京',raceNumber:1,horses},
   {date:'2026-11-07',venue:'京都',raceNumber:2,horses},
   {date:'2026-11-08',venue:'東京',raceNumber:3,horses}
  ];
  await page.route('**/data/authorized-race-cards.json*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({races})}));
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.BakenImportedCards?.length===3);
  assert.equal(await page.locator('#weekDate option').count(),2);
  assert.equal(await page.locator('#weekVenue option').count(),2);
  assert.equal(await page.locator('#autumnFixtureCard').isVisible(),true);
  await page.locator('#weekVenue').selectOption('京都');
  assert.equal(await page.locator('#weekRace').inputValue(),'2');
  await page.locator('#weekDate').selectOption('2026-11-08');
  assert.equal(await page.locator('#weekRace').inputValue(),'3');
  assert.deepEqual(errors,[]);
  console.log('PASS: race selection browser smoke');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
