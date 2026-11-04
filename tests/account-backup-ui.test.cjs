const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 const ctx=await browser.newContext({acceptDownloads:true});
 try{
  const page=await ctx.newPage();
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
  await page.locator('[data-nav="settings"]').first().click();
  // Backups are now shown exactly once in the Data management section.
  const data=page.locator('#bkSettingsSurface details.bk-settings-fold').filter({has:page.locator('#bkSingleBackupPanel')});
  await data.locator('summary').click();
  const panel=data.locator('#bkSingleBackupPanel');
  await panel.waitFor({state:'visible'});
  assert.equal(await page.locator('#bkAccountBackupPanel').count(),0);
  assert.match(await panel.innerText(),/クラウドへの自動保存・復元は行いません/);
  const button=panel.getByRole('button',{name:'バックアップを保存'});
  assert(await button.isEnabled());
  const downloadWait=page.waitForEvent('download');
  await button.click();
  const download=await downloadWait;
  assert.match(download.suggestedFilename(),/baken-king-full-backup.*\.json/);
  // Reload keeps existing local data. No account sync should be invoked.
  assert.equal(await page.evaluate(()=>localStorage.getItem('baken-king-mode-v1')),null);
  console.log('PASS: only data management contains one backup panel and local download works');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
