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

  // Friend-facing release must not expose old administration or test controls.
  const freshBets=await page.evaluate(()=>JSON.parse(localStorage.getItem('keiba-demo-v1')||'null')?.bets||[]);
  assert.equal(freshBets.length,0,'A fresh user should not inherit old demo bets');
  await page.locator('.bk-settings-trigger[data-nav="settings"]').click();
  await page.waitForFunction(()=>document.getElementById('bkSettingsSurface')?.hidden===false);
  const leakedTools=await page.evaluate(()=>({
   folds:[...document.querySelectorAll('#bkSettingsSurface details.bk-settings-fold')].filter(el=>el.textContent.includes('管理・接続設定')&&getComputedStyle(el).display!=='none').length,
   mode:!!document.querySelector('.bk-mode-panel')?.getClientRects().length
  }));
  assert.equal(leakedTools.folds,0,'Old admin settings visible to public users');
  assert.equal(leakedTools.mode,false,'Test-mode switch visible to public users');
  // Regression: global input {width:100%} must never squash the shared chime label.
  const sharedLayout=await page.evaluate(()=>{
   const panel=document.querySelector('.bk-push-panel');
   if(!panel)return {error:'push panel missing'};
   const wrap=document.createElement('div');
   wrap.className='bk-shared-sound-box';
   wrap.innerHTML='<h4>精算準備の共通チャイム</h4><label style="display:flex;gap:10px;align-items:center"><input type="checkbox"><span>アプリ使用中に精算待ちになったら音を鳴らす</span></label><p class="muted">音源は全ユーザー共通です。</p><button type="button">チャイムを試聴</button>';
   panel.append(wrap);
   const label=wrap.querySelector('label'),check=wrap.querySelector('input'),caption=wrap.querySelector('span');
   const outer=wrap.getBoundingClientRect(),i=check.getBoundingClientRect(),t=caption.getBoundingClientRect();
   const out={box:outer.width,check:i.width,text:t.width,height:label.getBoundingClientRect().height,
    horizontal:getComputedStyle(caption).writingMode==='horizontal-tb'};
   wrap.remove();
   return out;
  });
  assert.ok(!sharedLayout.error,'Shared chime test panel missing: '+JSON.stringify(sharedLayout));
  assert.ok(sharedLayout.check>=18&&sharedLayout.check<=26,'Shared chime checkbox width broken: '+JSON.stringify(sharedLayout));
  assert.ok(sharedLayout.text>110&&sharedLayout.horizontal,'Shared chime text collapsed into vertical columns: '+JSON.stringify(sharedLayout));
  assert.ok(sharedLayout.height<130,'Shared chime created giant whitespace: '+JSON.stringify(sharedLayout));
  await page.locator('.bk-settings-trigger[data-nav="settings"]').click();
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
