'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
test('polling evidence is separately displayed from workflow success',()=>{
 const html=require('../api/auth/admin-page.cjs').HTML;
 const js=fs.readFileSync('admin-panel.js','utf8');
 for(const id of ['opsLastPoll','opsPolledCount'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(html.includes('実際のJRA照合'));
 assert.ok(js.includes('pollEvidence'));
 assert.ok(js.includes('no_recent_poll_report'));
 assert.ok(js.includes('監視実行を確認できず'));
});
