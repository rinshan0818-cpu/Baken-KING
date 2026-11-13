(()=>{
'use strict';
const host=document.querySelector('[data-win5-panel="purchase"]');
if(!host)return;
const schedule=[
['11-14','東京10','京都10','福島11','東京11','京都11'],['11-15','東京10','京都10','福島11','東京11','京都11'],
['11-21','京都9','福島10','京都10','福島11','京都11'],['11-22','京都9','東京10','京都10','東京11','京都11'],
['11-23','東京9','福島10','東京10','福島11','東京11'],['11-28','京都9','東京10','京都10','東京11','京都11'],
['11-29','東京10','京都10','東京11','京都11','東京12'],['11-30','東京7','東京8','東京9','東京10','東京11'],
['12-05','阪神10','中山10','中京11','阪神11','中山11'],['12-06','中山10','中京10','阪神11','中山11','中京11'],
['12-12','中山10','中京10','阪神11','中山11','中京11'],['12-13','中山10','阪神10','中京11','中山11','阪神11'],
['12-19','阪神10','中山10','中京11','阪神11','中山11'],['12-20','中山10','阪神10','中京11','中山11','阪神11'],
['12-26','中山9','阪神10','中山10','阪神11','中山11'],['12-27','中山9','阪神10','中山10','阪神11','中山11']
].map(row=>({date:'2026-'+row[0],legs:row.slice(1).map(x=>({venue:x.replace(/[0-9]/g,''),raceNumber:Number(x.match(/[0-9]+/)[0])}))}));
const today=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
const fmt=n=>Number(n).toLocaleString('ja-JP')+'円';
const node=(tag,txt)=>{const n=document.createElement(tag);if(txt!==undefined)n.textContent=txt;return n};
const styles=node('style');
styles.textContent='.w5-select{width:auto;max-width:65%;padding:8px}.w5-race{background:#fff;border:1px solid #d5e1ee;border-radius:12px;padding:12px;margin:10px 0}.w5-race h3{margin:0 0 8px;font-size:15px}.w5-horses{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.w5-horses button{background:#f0f5fc;color:#193451;border:1px solid #c9d8eb;padding:10px 7px;text-align:left;min-width:0;min-height:46px;font-size:12px}.w5-horses button[aria-pressed=true]{background:#dceaff;border:2px solid #255cbb}.w5-horses button:disabled{opacity:.45}.w5-bar{background:#eef4fd;border-radius:12px;padding:12px;margin-top:12px}.w5-bar button{width:100%;margin-top:8px}.w5-hist{padding:12px;margin-top:14px;background:#f5f7fa;border-radius:12px}.w5-record{border-top:1px solid #d7e2f0;padding:9px 0;font-size:12px}.w5-modal{position:fixed;inset:0;background:#10233dbc;z-index:99999;display:flex;align-items:center;justify-content:center;padding:14px}.w5-dialog{background:#fff;color:#172c4a;width:min(100%,440px);max-height:85dvh;overflow:auto;border-radius:15px;padding:19px;line-height:1.7}.w5-dialog button{margin:5px}.w5-note{font-size:12px;line-height:1.65;color:#596f89}';
const body=node('div'),head=node('div'),dateSelect=node('select');
dateSelect.className='w5-select';dateSelect.setAttribute('aria-label','WIN5対象日');
schedule.forEach(x=>{const option=node('option',x.date.replace(/-/g,'/'));option.value=x.date;dateSelect.append(option)});
let selectedDate=(schedule.find(x=>x.date>=today())||schedule[schedule.length-1]).date;
let picks=Array.from({length:5},()=>[]);
head.style.display='flex';head.style.justifyContent='space-between';head.style.alignItems='center';
head.append(node('strong','WIN5を購入'),dateSelect);
const note=node('p','UIデザイン確認用です。馬名・対象レースはサンプルで、残高・出馬表・精算とは未接続です。');note.className='w5-note';
const races=node('div'),bar=node('div');bar.className='w5-bar';
const unitLabel=node('label','1点あたり（円）'),unit=node('input');unit.type='number';unit.min='100';unit.step='100';unit.value='100';unit.inputMode='numeric';unit.style.marginTop='6px';unitLabel.append(unit);
const total=node('p'),message=node('p');message.className='w5-note';
const buy=node('button','購入内容を確認'),clear=node('button','選択をクリア');clear.className='outline';
bar.append(unitLabel,total,message,buy,clear);
const history=node('div');history.className='w5-hist';body.append(head,note,races,bar,history);host.replaceChildren(styles,body);
const current=()=>schedule.find(x=>x.date===selectedDate);
const getCards=()=>[];
const demoNames=['アオゾラ','フューチャー','サンライズ','ブレイブ','スターライト','ミライ','グランプリ','シルバー','エメラルド','レインボー','オーロラ','キング'];const getRaces=()=>current().legs.map((l,i)=>({date:selectedDate,venue:l.venue,raceNumber:l.raceNumber,raceName:'サンプル対象レース '+(i+1),startTime:['14:40','14:50','15:00','15:10','15:20'][i],horses:demoNames.map((name,j)=>({number:j+1,name}))}));
const timeOf=c=>{const v=String(c?.startTime||c?.scheduledStartAt||'');return v.match(/(?:^|T)([0-2][0-9]:[0-5][0-9])/)?.[1]||''};
const available=h=>Number.isInteger(Number(h?.number))&&Number(h.number)>=1&&Number(h.number)<=18&&Boolean(h.name)&&h.scratched!==true&&h.cancelled!==true&&h.excluded!==true&&h.status!=='取消'&&h.status!=='除外';
function check(){
 const cards=getRaces(),count=picks.map((list,i)=>list.filter(n=>cards[i]?.horses?.some(h=>available(h)&&Number(h.number)===n)).length);
 const points=count.reduce((a,b)=>a*b,1),price=Number(unit.value),stake=points*price;
 const start=timeOf(cards[0]);const cutoff=start?Date.parse(selectedDate+'T'+start+':00+09:00')-300000:NaN;
 const ok=cards.every((c,i)=>c&&Array.isArray(c.horses)&&c.horses.length&&count[i]>0&&picks[i].length===count[i])&&
 Number.isSafeInteger(price)&&price>=100&&price%100===0&&points<=5000&&Number.isSafeInteger(stake)&&stake<=1000000&&
 Number.isFinite(cutoff)&&true&&true;
 return {cards,count,points,price,stake,cutoff,ok};
}
function render(){
 const x=check();dateSelect.value=selectedDate;races.replaceChildren();
 current().legs.forEach((leg,i)=>{
 const c=x.cards[i],section=node('section');section.className='w5-race';
 section.append(node('h3','WIN'+(i+1)+'　'+leg.venue+leg.raceNumber+'R　'+(c?.raceName||'')));
 const t=timeOf(c),sub=node('p',(t?t+' 発走':'発走時刻未取得')+' ／ '+(c?.horses?.length||0)+'頭 ／ '+x.count[i]+'頭選択');sub.className='w5-note';section.append(sub);
 if(!c?.horses?.length)section.append(node('p','出馬表の配信待ち'));
 else{
 const grid=node('div');grid.className='w5-horses';
 c.horses.slice().sort((a,b)=>Number(a.number)-Number(b.number)).forEach(h=>{
 const n=Number(h.number);if(!Number.isInteger(n))return;
 const b=node('button',n+'　'+String(h.name||''));b.type='button';b.disabled=!available(h);b.setAttribute('aria-pressed',String(picks[i].includes(n)));
 b.onclick=()=>{picks[i]=picks[i].includes(n)?picks[i].filter(x=>x!==n):[...picks[i],n].sort((a,b)=>a-b);render()};grid.append(b)});
 section.append(grid)}races.append(section)});
 total.textContent=x.points+'点 × '+fmt(x.price)+' ＝ '+fmt(x.stake);
 buy.disabled=!x.ok;
 message.textContent=!x.cards.every(Boolean)?'対象レースの出馬表配信待ち':!timeOf(x.cards[0])?'第1レースの発走時刻未取得':x.count.some(n=>n===0)?'5レースすべてで1頭以上選択してください':x.points>5000?'5,000点以内にしてください':x.stake>1000000?'サンプル上限100万円を超えています':Date.now()>=x.cutoff?'販売締切（第1レース5分前）':'UIプレビュー：残高の変更はありません';
 history.replaceChildren(node('strong','WIN5 購入履歴'));
 const purchased=demoTickets;
 purchased.slice(-20).reverse().forEach(t=>{
 const box=node('div');box.className='w5-record';box.append(node('strong',t.date+'　'+fmt(t.stake)+'　'+('UIプレビュー')));
 t.legs.forEach((l,i)=>box.append(node('div',(i+1)+'R '+l.venue+l.raceNumber+'R　'+l.numbers.join('・'))));history.append(box)});
 if(!purchased.length)history.append(node('p','購入履歴はありません'));
}
dateSelect.onchange=()=>{selectedDate=dateSelect.value;picks=Array.from({length:5},()=>[]);render()};
unit.oninput=render;clear.onclick=()=>{picks=Array.from({length:5},()=>[]);render()};
const demoTickets=[];
buy.onclick=()=>{
 const before=check();if(!before.ok){render();return}
 const overlay=node('div');overlay.className='w5-modal';
 const dialog=node('div');dialog.className='w5-dialog';
 dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
 dialog.append(node('h3','WIN5購入画面の確認'));
 dialog.append(node('p',selectedDate+'　'+before.points+'点　'+fmt(before.stake)));
 current().legs.forEach((l,i)=>dialog.append(node('p',(i+1)+'　'+l.venue+l.raceNumber+'R：'+picks[i].join('・'))));
 dialog.append(node('p','これはUIプレビューです。残高・購入履歴・精算データは変更されません。'));
 const back=node('button','修正に戻る'),confirm=node('button','投票券をプレビュー');
 back.className='outline';back.onclick=()=>overlay.remove();
 confirm.onclick=()=>{
 const ticket={id:demoTickets.length+1,date:selectedDate,stake:before.stake,unitStake:before.price,points:before.points,status:'preview',legs:current().legs.map((l,i)=>({...l,numbers:picks[i].slice()}))};
 demoTickets.unshift(ticket);overlay.remove();
 const ticketOverlay=node('div');ticketOverlay.className='w5-modal';const paper=node('div');paper.className='w5-dialog';
 paper.append(node('h3','WIN5 投票券・デザインプレビュー'));
 paper.append(node('p',ticket.date+'　WIN5'));
 ticket.legs.forEach((leg,i)=>{const row=node('p','WIN'+(i+1)+'　'+leg.venue+leg.raceNumber+'R　'+leg.numbers.join('・'));row.style.borderBottom='1px dashed #a9beaf';row.style.padding='11px';paper.append(row)});
 paper.append(node('h3',ticket.points+'点　'+fmt(ticket.stake)));
 paper.append(node('p','UIサンプル：実際の購入は行われていません。'));
 const done=node('button','閉じる');done.onclick=()=>ticketOverlay.remove();paper.append(done);ticketOverlay.append(paper);document.body.append(ticketOverlay);
 render();
 };
 dialog.append(back,confirm);overlay.append(dialog);document.body.append(overlay);
 overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};back.focus();
};

window.addEventListener('focus',render);

render();
})();