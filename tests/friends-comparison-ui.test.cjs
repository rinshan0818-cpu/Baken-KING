const assert=require('node:assert/strict');const fs=require('node:fs');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
assert(html.includes('data-data-section="friends"'),'Missing friends menu button');
assert(html.includes('data-data-panel="friends" hidden'),'Missing hidden comparison panel');
const start=html.indexOf('<section class="card" data-tab="data"><div');
const end=html.indexOf('</section><section class="card" data-tab="settings"',start);
assert(start>=0&&end>start);
const section=html.slice(start,end);
for(const k of ['overview','trend','analysis','records','friends']){
 assert(section.includes('data-data-section="'+k+'"'));
 assert(section.includes('data-data-panel="'+k+'"'));
}
assert(section.includes('data-data-panel="records" hidden'));
assert(section.includes('</div><div data-data-panel="friends" hidden'),'Friend panel must not be nested inside records');
console.log('PASS: friend comparison is a separate fifth section of the data tab');
