'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const first=html.indexOf(' const bkVerifiedFixtureDetails=');
const last=html.indexOf(" window.addEventListener('baken:race-selected'",first);
assert(first>0&&last>first,'Display-only metadata supplement must exist');
const code=html.slice(first,last);
function render(venue,raceNumber,overrides={}){
 const all=[],title={textContent:''},meta={textContent:''},eyebrow={textContent:'',hidden:false};
 const elem=tag=>({tag,className:'',textContent:'',hidden:false,children:[],
  replaceChildren(...x){this.children=x},prepend(...x){this.children.unshift(...x)},
  append(...x){this.children.push(...x)}});
 const hero={
  querySelector(selector){
   if(selector==='h2')return title;
   if(selector==='.bk-race-meta')return meta;
   if(selector==='.bk-race-eyebrow')return eyebrow;
   return all.find(x=>x.className.split(' ').includes(selector.slice(1)))||null;
  },
  insertBefore(node){all.push(node)}
 };
 const sandbox={
  document:{querySelector:q=>q==='#autumnFixtureCard .bk-race-hero'?hero:null,
   createElement:elem,addEventListener(){} },
  individualStakes:{clear(){}},individualToggle:{checked:false},bkDraftRestore(){},draw(){},bkDraftStore(){},window:{addEventListener(){}},
  input:{date:'2026-11-07',venue,raceNumber,numbersConfirmed:true,
   title:'公式のレース名',startTime:'14:00',
   horses:[{number:1,name:'架空馬A'},{number:2,name:'架空馬B'}],
   raceConditions:{classCondition:'オープン',restrictions:[],...overrides}}
 };
 vm.runInNewContext('var currentRace,raceId,horses,pick=[],legs=[],active=0;\n'+code+'\nsetRace(input)',sandbox);
 return {title:title.textContent,meta:meta.textContent,
  badge:all.find(x=>x.className.includes('bk-race-class-tag'))?.textContent,
  obstacle:all.find(x=>x.className.includes('bk-obstacle-tag'))?.hidden===false,
  obstacleText:all.find(x=>x.className.includes('bk-obstacle-tag'))?.textContent,
  labels:all.find(x=>x.className.includes('bk-race-condition-labels'))?.children.map(x=>x.textContent)};
}
test('Tokyo 11R officially confirmed GII survives cards lacking image grade',()=>{
 const item=render('東京',11,{surface:'芝',distanceMeters:1400});
 assert.equal(item.badge,'G2');
 assert.match(item.meta,/芝 1400m/);
});
test('Kyoto 8R officially confirmed J-GIII and jump turf 3170m display',()=>{
 const item=render('京都',8);
 assert.equal(item.badge,'J・G3');
 assert.equal(item.obstacle,true);
 assert.equal(item.obstacleText,'障害');
 assert.deepEqual(Array.from(item.labels),['障害','J・G3']);
 assert.match(item.meta,/障害 3170m（芝）/);
});
test('obstacle, grade and race conditions share one label row',()=>{
 const item=render('京都',8,{restrictions:['混合'],weightRule:'別定'});
 assert.deepEqual(Array.from(item.labels),['障害','J・G3','混合','別定']);
 assert.match(html, /\.bk-race-hero \.bk-race-condition-labels\{display:flex!important;flex-wrap:nowrap!important/);
});
test('Kyoto 11R ordinary open is not silently promoted to Listed',()=>{
 const item=render('京都',11,{surface:'ダート',distanceMeters:1200});
 assert.equal(item.badge,'オープン');
 assert.equal(item.obstacle,false);
});
test('identity-scoped fix never changes horse records or purchase data',()=>{
 assert.match(code,/bkVerifiedFixtureDetails\[fixtureKey\]/);
 assert.doesNotMatch(code,/localStorage\.(setItem|removeItem)|fetch\(/);
});
