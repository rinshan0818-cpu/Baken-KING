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
  const snapshot=await page.evaluate(()=>({
   root:!!document.getElementById('bkSettingsSurface'),
   newSeason:!!document.getElementById('newSeason'),
   seasonClosest:!!document.getElementById('newSeason')?.closest('section.card'),
   restoreLabel:!!document.getElementById('restore')?.closest('label'),
   verifyFile:!!document.getElementById('bkVerifyBackupFile'),
   backup:!!document.getElementById('backup'),
   restore:!!document.getElementById('restore'),
   verify:!!document.getElementById('bkVerifyBackup'),
   verifyResult:!!document.getElementById('bkVerifyBackupResult'),
   panels:[...document.querySelectorAll('#bkSettingsSurface details.bk-settings-fold')].map(el=>({
    label:el.querySelector('summary')?.textContent,
    backup:!!el.querySelector('#bkSingleBackupPanel'),
    count:el.querySelectorAll('section.card').length
   }))
  }));
  console.log('SETTINGS LAYOUT SNAPSHOT',JSON.stringify(snapshot));
  assert.ok(snapshot.panels.some(x=>x.backup),'The single backup panel was not generated');
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
