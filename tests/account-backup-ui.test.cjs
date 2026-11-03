const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 const ctx=await browser.newContext({acceptDownloads:true});
 try{
  const page=await ctx.newPage();
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
  await page.locator('[data-nav="settings"]').first().click();
  const panel=page.locator('#bkAccountBackupPanel');
  await panel.waitFor({state:'visible'});
  assert.match(await panel.innerText(),/クラウド.*未接続|クラウド保存・復元：未提供/);
  const button=panel.getByRole('button',{name:'端末データをファイル保存'});
  assert(await button.isEnabled());
  const downloadWait=page.waitForEvent('download');
  await button.click();
  const download=await downloadWait;
  assert.match(download.suggestedFilename(),/baken-king-full-backup.*\.json/);
  // Reload keeps existing local data. No account sync should be invoked.
  assert.equal(await page.evaluate(()=>localStorage.getItem('baken-king-mode-v1')),null);
  console.log('PASS: account settings show cloud unavailable and local backup download works');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
