const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const origin='http://127.0.0.1:8765/';
const approvedTabs=['home','predict','tickets','payout','data','win5'];
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

  // Freeze the design contract: six tabs including WIN5, predicted ◎, sideways ticket icon.
  assert.deepEqual(await page.locator('.bottom-nav [data-nav]').evaluateAll(nodes=>nodes.map(n=>n.dataset.nav)),approvedTabs);
  assert.equal(await page.locator('[data-nav="predict"] svg circle').count(),2,'Prediction icon must remain ◎');
  assert.equal(await page.locator('[data-nav="tickets"] svg rect').count(),1,'Ticket icon must stay a horizontal ticket');
  // WIN5 collection is integrated in its own tab, without modifying the main wallet.
  await page.locator('.bottom-nav [data-nav="win5"]').click();
  await page.waitForSelector('[data-tab="win5"]:not([hidden]) [data-win5-panel="purchase"]:not([hidden])');
  assert.equal(await page.locator('[data-win5-panel="gacha"]').isVisible(),false,'Gacha must be hidden on the purchase page');
  await page.locator('[data-win5-section="gacha"]').click();
  await page.waitForSelector('[data-win5-panel="gacha"]:not([hidden]) #bkWin5Frame');
  const collectionFrame=page.frameLocator('#bkWin5Frame');
  await collectionFrame.locator('#wallet').waitFor({state:'visible'});
  assert.match(await collectionFrame.locator('#wallet').textContent(),/300,000/,'WIN5 wallet starts independently at 300,000');
  await collectionFrame.locator('#drawTen').waitFor({state:'visible'});
  await collectionFrame.locator('#drawTen').click();
  await collectionFrame.locator('#revealOverlay:not([hidden])').waitFor({state:'visible'});
  await collectionFrame.locator('#revealSkip').click();
  await collectionFrame.locator('.bk-reveal-grid .bk-reveal-item').first().waitFor({state:'visible'});
  assert.equal(await collectionFrame.locator('.bk-reveal-grid .bk-reveal-item').count(),10,'A ten-draw summary must show all ten badges without scrolling to results');
  assert.equal(await collectionFrame.locator('#revealClose').textContent(),'ガチャへ戻る');
  await collectionFrame.locator('#revealClose').click();
  assert.equal(await collectionFrame.locator('#revealOverlay').isVisible(),false,'Closing summary must return to the fixed draw screen');

  // Compact embedded view keeps drawing controls first and the large collection separately.
  assert.equal(await collectionFrame.locator('.bk-hero-poster').count(),1,'Approved premium medal case poster must be present');
  await collectionFrame.locator('.bk-hero-poster').waitFor({state:'visible'});
  const hero=await collectionFrame.locator('.bk-hero-poster').evaluate(image=>({
   loaded:image.complete&&image.naturalWidth>0,
   source:image.getAttribute('src'),
   posterVisible:getComputedStyle(image).display!=='none'
  }));
  assert.equal(hero.loaded,true,'WIN5 premium poster image must load');
  assert.match(hero.source,/collection-hero(?:-hq)?\.webp/,'WIN5 poster must use the approved artwork');
  assert.equal(hero.posterVisible,true,'WIN5 poster must be visible in embedded mode');
  assert.equal(await collectionFrame.locator('[data-gacha-panel]').isVisible(),true,'Gacha overview must be visible');
  await page.waitForFunction(()=>document.body.classList.contains('bk-win5-draw-fixed'));
  const fixedLayout=await collectionFrame.locator('html').evaluate(el=>({
   fixed:el.classList.contains('bk-draw-fixed'),
   overflow:getComputedStyle(el).overflowY
  }));
  assert.equal(fixedLayout.fixed,true,'Gacha draw screen must be in fixed mode');
  assert.equal(fixedLayout.overflow,'hidden','Embedded draw screen must not scroll');
  const fits=await collectionFrame.locator('[data-gacha-panel]').evaluate(panel=>{
   const scroller=panel.parentElement;
   const bounds=scroller.getBoundingClientRect(),end=panel.getBoundingClientRect();
   return {noScroll:scroller.scrollHeight<=scroller.clientHeight+2,visibleEnd:end.bottom<=bounds.bottom+2};
  });
  assert.equal(fits.noScroll,true,'WIN5 draw content must fit without scrolling');
  assert.equal(fits.visibleEnd,true,'WIN5 draw controls must stay above bottom nav');


  assert.equal(await collectionFrame.locator('[data-collection-panel]').first().isVisible(),false,'Collection should not crowd the initial draw screen');
  await collectionFrame.locator('[data-collection-view="collection"]').click();
  assert.equal(await collectionFrame.locator('#g1Status').isVisible(),false,'G1 introduction must be hidden');
  assert.equal(await collectionFrame.locator('.tabs').isVisible(),false,'Legacy G1 filter buttons must be hidden');
  assert.equal(await collectionFrame.locator('.bk-legacy-collection-backup').isVisible(),false,'Catalog must not contain backup controls');
  assert.equal(await collectionFrame.locator('#bkUnifiedFilter').isVisible(),true,'Unified filter must be visible');
  assert.deepEqual(await collectionFrame.locator('#bkUnifiedFilter option').allTextContents(),['すべて','ホロ','G1','G2','G3','L']);
  assert.equal(await collectionFrame.locator('#pins .pin').first().locator('.badge').textContent(),'ホロ','G1 holo must sort ahead of normal');
  const scrollBehavior=await collectionFrame.locator('.bk-collection-scroll').evaluate(el=>({overflow:getComputedStyle(el).overflowY,menuOutside:!el.contains(document.querySelector('.bk-collection-menu'))}));
  assert.equal(scrollBehavior.overflow,'auto','Only the collection content should scroll');
  assert.equal(scrollBehavior.menuOutside,true,'Gacha/collection menu must remain outside the scrollable catalog');

  await page.waitForFunction(()=>!document.body.classList.contains('bk-win5-draw-fixed'));
  assert.equal(await collectionFrame.locator('.bk-step-dropdowns').isVisible(),false,'Old grade menus must be hidden');
  await collectionFrame.locator('#bkUnifiedFilter').selectOption('holo');
  assert.equal(await collectionFrame.locator('#pins .pin').count(),24);
  assert.equal(await collectionFrame.locator('#stepBadgePanel').isVisible(),false);
  await collectionFrame.locator('#bkUnifiedFilter').selectOption('G2');
  assert.equal(await collectionFrame.locator('#pins').isVisible(),false);
  assert.equal(await collectionFrame.locator('#stepBadgePanel').isVisible(),true);
  await collectionFrame.locator('#bkUnifiedFilter').selectOption('all');
  assert.equal(await collectionFrame.locator('#pins .pin').count(),48);
  assert.equal(await collectionFrame.locator('#stepBadgePanel').isVisible(),true);
  // Missing badges must use solid alpha-filled silhouette assets, never
  // grayscale originals with white gaps inside their decoration.
  await collectionFrame.locator('#pins .pin.locked img.bk-solid-silhouette').first().waitFor({state:'attached',timeout:15000});
  const solidG1=await collectionFrame.locator('#pins .pin.locked img.bk-solid-silhouette').first().evaluate(img=>({
   isGenerated:img.getAttribute('src').startsWith('data:image/png;base64,'),
   filter:getComputedStyle(img).filter,
   loaded:img.complete&&img.naturalWidth>0
  }));
  assert.equal(solidG1.isGenerated,true,'Missing G1 badge should have an alpha-filled PNG silhouette');
  assert.equal(solidG1.loaded,true,'Silhouette must decode');
  await collectionFrame.locator('#stepGrid .step-tile.locked img.bk-solid-silhouette').first().waitFor({state:'attached',timeout:15000});
  const solidStep=await collectionFrame.locator('#stepGrid .step-tile.locked img.bk-solid-silhouette').first().evaluate(img=>img.getAttribute('src').startsWith('data:image/png;base64,'));
  assert.equal(solidStep,true,'Missing step badge should also use the filled silhouette');

  assert.equal((await collectionFrame.locator('#bkUnifiedOwned').textContent()).includes('98種類収集'),true);
  assert.equal(await collectionFrame.locator('[data-collection-panel]').first().isVisible(),true,'Collection view must be reachable');
  assert.equal(await collectionFrame.locator('[data-gacha-panel]').isVisible(),false,'Draw controls must be hidden in collection view');
  await collectionFrame.locator('[data-collection-view="gacha"]').click();
  await page.waitForFunction(()=>document.body.classList.contains('bk-win5-draw-fixed'));

  assert.equal(await collectionFrame.locator('#drawOne').isVisible(),true,'Drawing must work again after returning from collection');
  const win5MenuLayout=await page.locator('.bk-win5-subnav').evaluate(nav=>{
   const buttons=[...nav.querySelectorAll('button')].map(x=>x.getBoundingClientRect());
   return buttons.length===2&&Math.abs(buttons[0].top-buttons[1].top)<3&&buttons[1].left>buttons[0].right;
  });
  assert.equal(win5MenuLayout,true,'WIN5 purchase/gacha buttons must stay side by side');

  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('keiba-demo-v1')||'null')?.balance??100000),100000,'WIN5 must not alter the main wallet');
  assert.equal(await page.locator('[data-tab="home"]').first().isVisible(),false,'WIN5 must hide the home panel');
  await page.locator('[data-win5-section="purchase"]').click();
  assert.equal(await page.locator('[data-win5-panel="gacha"]').isVisible(),false,'Purchase page must hide the gacha');
  assert.equal(await page.locator('[data-win5-panel="purchase"]').isVisible(),true,'Purchase page must be visible');
  await page.locator('.bottom-nav [data-nav="home"]').click();

  assert.equal(await page.locator('#bkHomeNextRace').count(),1,'Permanent next-race slot missing');
  assert.equal(await page.locator('#homeToPredict, #homeToPayout, #homeRecent').count(),0,'Removed home controls reappeared');
  assert.equal(await page.locator('#autumnFixtureCard .bk-race-eyebrow').isVisible(),false,'Duplicate race date row returned');

  // Comparison colors must be explained before account and synchronization actions.
  const friendComparisonOrder=await page.evaluate(()=>{
   const table=document.querySelector('.bk-compare-row[role="row"]')?.parentElement;
   const legend=document.querySelector('.bk-compare-legend');
   const note=document.querySelector('.bk-compare-note');
   const exchange=document.querySelector('.bk-compare-exchange');
   return !!(table && legend && note && exchange &&
    (table.compareDocumentPosition(legend)&Node.DOCUMENT_POSITION_FOLLOWING) &&
    (legend.compareDocumentPosition(note)&Node.DOCUMENT_POSITION_FOLLOWING) &&
    (note.compareDocumentPosition(exchange)&Node.DOCUMENT_POSITION_FOLLOWING));
  });
  assert.equal(friendComparisonOrder,true,'Friend comparison legend and explanatory note must precede account/sync controls');

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
  assert.equal(leakedTools.mode,true,'Test-mode switch must be accessible from ordinary Settings');
  assert.equal(await page.getByText('テスト馬券を4枚作成',{exact:true}).count(),0,'Test ticket creation must remain hidden in production mode');
  // Settings information architecture: one backup location and preserved handlers.
  const settingsLayout=await page.evaluate(()=>{
   const root=document.querySelector('#bkSettingsSurface');
   const groups=[...root.querySelectorAll(':scope > details.bk-settings-fold')];
   const item=id=>document.getElementById(id);
   const labelForRestore=item('restore')?.closest('label');
   const parent=element=>element?.closest('.bk-settings-fold')?.querySelector('summary .bk-settings-fold-label')?.textContent;
   return {
    headings:groups.filter(x=>!x.hidden).map(x=>x.querySelector('summary .bk-settings-fold-label')?.textContent),
    backups:root.querySelectorAll('#bkSingleBackupPanel').length,
    oldPanels:root.querySelectorAll('#bkAccountBackupPanel').length,
    storageControls:['backup','bkVerifyBackup','bkVerifyBackupFile','bkVerifyBackupResult','restore'].map(id=>root.querySelectorAll('#'+id).length),
    backupGroup:parent(item('backup')),restoreGroup:parent(labelForRestore),
    verifyGroup:parent(item('bkVerifyBackup')),
    seasonGroup:parent(item('seasons')),
    resetCount:document.querySelectorAll('#resetDemo, #newSeason').length,
    retiredRaceLabel:document.body.textContent.includes('従来のレース別収支を表示'),
    accountGroup:parent(item('bkAccountSettings')),
    updateGroup:parent(item('checkUpdate')),
    diagnosticHidden:!item('bkCopyNavLog')?.getClientRects().length
   };
  });
  assert.deepEqual(settingsLayout.headings,['アカウント・友達','通知・アプリ','G1ピンバッジ','データ管理'],
    'Settings group labels changed: '+JSON.stringify(settingsLayout));
  assert.equal(settingsLayout.backups,1,'Backup must be shown in one dedicated panel');
  assert.equal(settingsLayout.oldPanels,0,'Duplicate account-backup panel returned');
  assert.deepEqual(settingsLayout.storageControls,[1,1,1,1,1],'Original storage controls must be moved, not cloned');
  for(const type of ['backupGroup','restoreGroup','verifyGroup','seasonGroup'])
   assert.equal(settingsLayout[type],'データ管理','Stored data action has wrong section: '+type);
  assert.equal(settingsLayout.accountGroup,'アカウント・友達');
  assert.equal(settingsLayout.updateGroup,'通知・アプリ');
  assert.equal(settingsLayout.diagnosticHidden,true,'Debug log must be hidden from friends');
  assert.equal(settingsLayout.resetCount,0,'Manual record reset or arbitrary season restart remains in public app');
  assert.equal(settingsLayout.retiredRaceLabel,false,'Retired race table label returned');
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
