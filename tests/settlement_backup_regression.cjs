const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const LIVE='keiba-demo-v1',TEST='baken-king-test-state-v1';
(async()=>{
 const browser=await chromium.launch();
 const context=await browser.newContext({acceptDownloads:true});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.addInitScript(()=>localStorage.setItem('baken-king-mode-v1','test'));
  await page.route('**/data/authorized-race-cards.json*',route=>route.fulfill({status:200,contentType:'application/json',body:'{"races":[]}'}));
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
  assert.equal(await page.evaluate(()=>window.BakenCurrentMode()),'test');
  assert.equal(await page.evaluate(()=>window.BakenCreateDemoTickets()),true);
  const original=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),TEST);
  assert.equal(original.bets.length,4);
  assert.equal(original.balance,99600);
  assert.equal(original.bets.filter(b=>b.officialReady).length,3);

  // Invoke the actual machine read handler against a single synthetic ticket.
  const ticketId=original.bets.find(b=>b.officialReady&&b.officialPendingPaid===450).id;
  await page.evaluate(id=>{
   machineSelectedId=id;
   document.getElementById('machineRead').click();
  },ticketId);
  await page.waitForFunction(([key,id])=>JSON.parse(localStorage.getItem(key)).bets.find(b=>b.id===id)?.status==='settled',[TEST,ticketId]);
  const settled=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),TEST);
  assert.equal(settled.balance,100050,'First settlement must credit exactly 450 yen');
  assert.equal(settled.totalPaid,450);
  assert.equal(settled.bets.filter(b=>b.status==='settled').length,1);

  // Repeat read of the same ticket. Even when invoked directly, accounting must not pay twice.
  await page.evaluate(id=>{machineSelectedId=id;document.getElementById('machineRead').click()},ticketId);
  await page.waitForTimeout(900);
  const repeat=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),TEST);
  assert.equal(repeat.balance,settled.balance,'Second read paid same ticket twice');
  assert.equal(repeat.totalPaid,settled.totalPaid,'Second read duplicated payout');
  assert.equal(repeat.bets.find(b=>b.id===ticketId).paid,450);

  // Export actual v2 JSON through the Settings UI, and restore it through the file input.
  await page.evaluate(()=>showTab('settings'));
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#backup').click()]);
  const file=await download.createReadStream();
  const chunks=[];for await(const chunk of file)chunks.push(chunk);
  const json=Buffer.concat(chunks).toString('utf8');
  const backup=JSON.parse(json);
  assert.equal(backup.format,'BAKEN_KING_BACKUP');
  assert.equal(backup.schemaVersion,2);
  assert.deepEqual(backup.state,repeat,'Backup state differs from stored state');

  // Deliberately change only test storage; restore should return to the exported snapshot.
  await page.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key));s.balance=999;localStorage.setItem(key,JSON.stringify(s));
  },TEST);
  page.on('dialog',dialog=>dialog.accept());
  await page.locator('#restore').setInputFiles({name:'test-backup.json',mimeType:'application/json',buffer:Buffer.from(json)});
  await page.waitForFunction(([key,balance])=>JSON.parse(localStorage.getItem(key)).balance===balance,[TEST,repeat.balance]);
  const restored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),TEST);
  assert.deepEqual(restored,repeat,'Restored ticket state is not identical to backup');

  // Reject malformed versions without modifying the saved records.
  await page.locator('#restore').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...backup,schemaVersion:999}))});
  await page.waitForTimeout(200);
  assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),TEST),repeat,'Invalid backup modified saved data');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key)),null,'Test operations wrote to production storage');
  assert.deepEqual(errors,[],'Unexpected app error during settlement or backup');
  console.log('PASS: one-time settlement, v2 backup round trip, invalid version rejected, production untouched');
 }catch(err){
  fs.mkdirSync('test-results',{recursive:true});
  await page.screenshot({path:'test-results/settlement-backup-regression.png',fullPage:true}).catch(()=>{});
  fs.writeFileSync('test-results/settlement-backup-errors.json',JSON.stringify(errors,null,2));
  throw err;
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
