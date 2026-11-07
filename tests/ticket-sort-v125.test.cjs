'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
test('ticket list displays exactly two sorting choices',()=>{
 assert.match(source,/<select id="bkTicketSort"[^>]*><option value="purchase">購入順（新しい順）<\/option><option value="race">レース順（開催日・R順）<\/option><\/select>/);
});
test('sort mode is remembered and falls back to purchase order',()=>{
 assert.match(source,/const BK_TICKET_SORT_KEY='baken-king-ticket-sort-v1'/);
 assert.match(source,/bkTicketSortMode=localStorage\.getItem\(BK_TICKET_SORT_KEY\)==='race'\?'race':'purchase'/);
 assert.match(source,/bkTicketSortMode=bkTicketSort\.value==='race'\?'race':'purchase'/);
 assert.match(source,/localStorage\.setItem\(BK_TICKET_SORT_KEY,bkTicketSortMode\)/);
});
test('race order sorts only race groups and keeps the purchase list untouched',()=>{
 assert.match(source,/const available=current\.filter\(b=>b\.status==='pending'&&!b\.officialReady&&!b\.machineProcessed\)\.slice\(\)\.reverse\(\)/);
 assert.match(source,/const sortedGroups=\[\.\.\.groups\.entries\(\)\]/);
 assert.match(source,/if\(bkTicketSortMode==='race'\)sortedGroups\.sort\(bkTicketRaceSort\)/);
 assert.match(source,/for\(const \[key,rows\] of sortedGroups\)/);
 assert.match(source,/const numberCompare=getNumber\(a\[1\]\[0\]\)-getNumber\(b\[1\]\[0\]\)/);
});
