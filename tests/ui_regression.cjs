const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const origin='http://127.0.0.1:8765/';
const approvedTabs=['home','predict','tickets','payout','data'];
const baseSelector='main.wrap > [data-tab]';

(async()=>{
 const browser=await chromium.launch();
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const pageErrors=[];
 page.on('pageerror',error=>pageErrors.push(error.message));
 try{
  // Run entirely against a fresh, disposable Playwright browser profile.
  await page.route('**/data/authorized-race-cards.json*',route=>
   route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({races:[]})}));
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-nav="home"].active');

  // Release-preparation contract: no beta stamp in the normal app.
  // The isolated test mode remains available through Settings.
  assert.doesNotMatch(await page.title(),/beta|ベータ/i);
  assert.equal(await page.locator('.bk-header-status').isVisible(),false,'Beta badge must be hidden in normal mode');
  assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('bk-test-mode')),false,
    'A fresh production session must not start in test mode');

  // Freeze the design contract: five tabs, predicted ◎, sideways ticket icon.
  assert.deepEqual(await page.locator('.bottom-nav [data-nav]').evaluateAll(nodes=>nodes.map(n=>n.dataset.nav)),approvedTabs);
  assert.equal(await page.locator('[data-nav="predict"] svg circle').count(),2,'Prediction icon must remain ◎');
  assert.equal(await page.locator('[data-nav="tickets"] svg rect').count(),1,'Ticket icon must stay a horizontal ticket');
  assert.equal(await page.locator('#bkHomeNextRace').count(),1,'Permanent next-race slot missing');
  assert.equal(await page.locator('#homeToPredict, #homeToPayout, #homeRecent').count(),0,'Removed home controls reappeared');
  assert.equal(await page.locator('#autumnFixtureCard .bk-race-eyebrow').isVisible(),false,'Duplicate race date row returned');

  const initialState=await page.evaluate(()=>localStorage.getItem('keiba-demo-v1'));
  for(const tab of approvedTabs){
   await page.locator('.bottom-nav [data-nav="'+tab+'"]').click();
   await page.waitForFunction(expected=>document.querySelector('.bottom-nav [data-nav="'+expected+'"]')?.classList.contains('active'),tab);
   const state=await page.evaluate(({selected,selector})=>{
    const nodes=[...document.querySelectorAll(selector)];
    const visible=nodes.filter(node=>!node.hidden && getComputedStyle(node).display!=='none').map(node=>node.dataset.tab);
    const leaked=nodes.filter(node=>node.dataset.tab!==selected && getComputedStyle(node).display!=='none').map(node=>node.dataset.tab);
    return {visible,leaked,homeVisible:!!document.querySelector('section.bk-home')?.getClientRects().length};
   },{selected:tab,selector:baseSelector});
   assert(state.visible.includes(tab),'Selected panel not visible: '+tab+' '+JSON.stringify(state));
   assert.deepEqual(state.leaked,[],'Hidden panels leak into '+tab+': '+JSON.stringify(state));
   assert.equal(state.homeVisible,tab==='home','Home panel stuck across tab switch: '+tab);
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('keiba-demo-v1')),initialState,'Browsing tabs unexpectedly changed saved betting state');
  assert.deepEqual(pageErrors,[],'Unexpected JavaScript exception during navigation');
  console.log('PASS: five tabs isolated, approved UI guarded, no unexpected state mutation');
 }catch(error){
  fs.mkdirSync('test-results',{recursive:true});
  await page.screenshot({path:'test-results/ui-regression.png',fullPage:true}).catch(()=>{});
  fs.writeFileSync('test-results/ui-regression-errors.json',JSON.stringify(pageErrors,null,2));
  throw error;
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
