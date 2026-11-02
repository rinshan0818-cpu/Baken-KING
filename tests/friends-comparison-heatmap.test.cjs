const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const begin=html.indexOf('<div data-data-panel="friends" hidden>');
const end=html.indexOf('</section><section class="card" data-tab="settings"',begin);
assert(begin>=0&&end>begin,'Friends section is missing');
const section=html.slice(begin,end);
assert(section.includes('bk-compare-table'),'Comparison table is missing');
for(const key of ['profit','roi','stake','paid','settled']){
 assert(section.includes('data-compare-own="'+key+'"'),'Missing own data metric '+key);
}
for(const label of ['収支','回収率','購入金額','払戻金額','精算済み馬券'])assert(section.includes(label));
assert(section.includes('未接続'),'Missing no-friend state');
assert(!section.includes('8,400円')&&!section.includes('95.8%'),'Sample friend numbers must not ship');
assert(html.includes('bk-compare-cell.bk-compare-win')&&html.includes('bk-compare-cell.bk-compare-lose'));
assert(html.includes("if(bkDataSection==='friends')bkRenderFriendCompare()"));
console.log('PASS: two-person comparison table, actual local metrics and neutral no-friend state');

const full=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
assert(full.includes('const bkHistoryTargetTab=document.querySelector(\'section[data-tab="data"] [data-data-panel="records"]\')'),'History must live in records only');
assert(full.includes("label.textContent='精算履歴'"),'History label should be unique');
