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
styles.textContent=`.w5-select{width:auto;max-width:65%;padding:8px}.w5-race{background:#fff;border:1px solid #d5e1ee;border-radius:14px;padding:13px;margin:10px 0;box-shadow:0 3px 12px #112d5008}.w5-race h3{margin:0 0 8px;font-size:15px;color:#102f5c}.w5-horses{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.w5-horses button{background:#f0f5fc;color:#193451;border:1px solid #c9d8eb;padding:10px 7px;text-align:left;min-width:0;min-height:46px;font-size:12px;overflow-wrap:anywhere}.w5-horses button[aria-pressed=true]{background:#dceaff;border:2px solid #255cbb}.w5-horses button:disabled{opacity:.45}.w5-bar{background:#eef4fd;border-radius:14px;padding:13px;margin-top:12px}.w5-bar button{width:100%;margin-top:8px}.w5-hist{padding:12px;margin-top:14px;background:#f5f7fa;border-radius:12px}.w5-record{border-top:1px solid #d7e2f0;padding:9px 0;font-size:12px;line-height:1.7}.w5-modal{position:fixed;inset:0;background:#10233dbc;z-index:99999;display:flex;align-items:center;justify-content:center;padding:14px}.w5-dialog{background:#fff;color:#172c4a;width:min(100%,440px);max-height:85dvh;overflow:auto;border-radius:17px;padding:18px;line-height:1.7}.w5-dialog button{margin:5px}.w5-note{font-size:12px;line-height:1.65;color:#596f89}.w5-digital{background:linear-gradient(145deg,#071d3c,#123f79 67%,#245da0);color:white;border-radius:19px;padding:18px 16px;box-shadow:0 10px 27px #061d3d38;overflow:hidden;position:relative}.w5-digital:after{content:"";position:absolute;top:-75px;right:-55px;width:180px;height:180px;border:1px solid #ffffff25;border-radius:50%;pointer-events:none}.w5-digital-head{display:flex;justify-content:space-between;align-items:center;gap:8px;border-bottom:1px solid #ffffff42;padding-bottom:13px}.w5-digital-brand{font-size:27px;font-weight:900;letter-spacing:1px}.w5-digital-sub{font-size:10px;color:#c7d9f2;letter-spacing:.08em}.w5-digital-state{font-size:10px;background:#ffffff27;border:1px solid #ffffff40;border-radius:20px;padding:5px 9px;white-space:nowrap}.w5-digital-leg{display:grid;grid-template-columns:48px 1fr;gap:9px;border-bottom:1px solid #ffffff24;padding:10px 0;align-items:center}.w5-digital-index{font-size:11px;color:#c0d6f2;font-weight:850}.w5-digital-race{font-size:12px;color:#e2edfa}.w5-digital-picks{font-size:18px;font-weight:850;letter-spacing:.08em;overflow-wrap:anywhere}.w5-digital-foot{display:flex;justify-content:space-between;align-items:end;gap:10px;padding-top:17px}.w5-digital-foot small{display:block;color:#bbd5f5;font-size:10px;margin-bottom:3px}.w5-digital-foot strong{font-size:25px}.w5-digital-code{margin-top:14px;font-size:10px;letter-spacing:.12em;color:#aac9e9;border-top:1px solid #ffffff28;padding-top:9px}.w5-confirm-row{display:flex;justify-content:space-between;gap:8px;padding:9px 0;border-bottom:1px solid #e4ebf3}.w5-action-row{display:flex;gap:8px;margin-top:15px}.w5-action-row button{flex:1;min-width:0}.w5-overview{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;margin:8px 0 14px}.w5-overview div{text-align:center;background:#edf3fb;border-radius:9px;padding:9px 2px}.w5-overview small{display:block;font-size:10px;color:#58718f}.w5-overview strong{font-size:17px;color:#123d73}.w5-topline{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:7px}`;
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
const demoNames=['アオゾラ','フューチャー','サンライズ','ブレイブ','スターライト','ミライ','グランプリ','シルバー','エメラルド','レインボー','オーロラ','キング'];const getRaces=()=>current().legs.map((l,i)=>({date:selectedDate,venue:l.venue,raceNumber:l.raceNumber,raceName:'サンプル対象レース '+(i+1),startTime:['14:40','14:50','15:00','15:10','15:20'][i],horses:demoNames.map((name,j)=>({number:j+1,name}))}));
const timeOf=c=>{const v=String(c?.startTime||c?.scheduledStartAt||'');return v.match(/(?:^|T)([0-2][0-9]:[0-5][0-9])/)?.[1]||''};
const available=h=>Number.isInteger(Number(h?.number))&&Number(h.number)>=1&&Number(h.number)<=18&&Boolean(h.name)&&h.scratched!==true&&h.cancelled!==true&&h.excluded!==true&&h.status!=='取消'&&h.status!=='除外';
function check(){
 const cards=getRaces(),count=picks.map((list,i)=>list.filter(n=>cards[i]?.horses?.some(h=>available(h)&&Number(h.number)===n)).length);
 const points=count.reduce((a,b)=>a*b,1),price=Number(unit.value),stake=points*price;
 const start=timeOf(cards[0]);const cutoff=start?Date.parse(selectedDate+'T'+start+':00+09:00')-300000:NaN;
 const ok=cards.every((c,i)=>c&&Array.isArray(c.horses)&&c.horses.length&&count[i]>0&&picks[i].length===count[i])&&
 Number.isSafeInteger(price)&&price>=100&&price%100===0&&points<=5000&&Number.isSafeInteger(stake)&&stake<=1000000&&
 true;
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
 message.textContent=!x.cards.every(Boolean)?'対象レースの出馬表配信待ち':!timeOf(x.cards[0])?'第1レースの発走時刻未取得':x.count.some(n=>n===0)?'5レースすべてで1頭以上選択してください':x.points>5000?'5,000点以内にしてください':x.stake>1000000?'サンプル上限100万円を超えています':'UIプレビュー：残高の変更はありません';
 history.replaceChildren(node('strong','WIN5 購入履歴'));
 const purchased=demoTickets;
 purchased.slice(-20).reverse().forEach(t=>{
 const box=node('div');box.className='w5-record';box.append(node('strong',t.date+'　'+fmt(t.stake)+'　UIプレビュー'));
 t.legs.forEach((l,i)=>box.append(node('div',(i+1)+'R '+l.venue+l.raceNumber+'R　'+l.numbers.join('・'))));history.append(box)});
 if(!purchased.length)history.append(node('p','購入履歴はありません'));
}
dateSelect.onchange=()=>{selectedDate=dateSelect.value;picks=Array.from({length:5},()=>[]);render()};
unit.oninput=render;clear.onclick=()=>{picks=Array.from({length:5},()=>[]);render()};
const demoTickets=[];

function digitalTicket(ticket){
 const card=node('div');card.className='w5-digital';
 const header=node('div');header.className='w5-digital-head';
 const brand=node('div');const b=node('div','WIN 5');b.className='w5-digital-brand';brand.append(b);
 const sub=node('div','BAKEN-KING / DIGITAL TICKET');sub.className='w5-digital-sub';brand.append(sub);
 const state=node('span','UI SAMPLE');state.className='w5-digital-state';header.append(brand,state);card.append(header);
 ticket.legs.forEach((leg,i)=>{
  const line=node('div');line.className='w5-digital-leg';
  const index=node('span','WIN'+(i+1));index.className='w5-digital-index';
  const body=node('div');const race=node('div',leg.venue+leg.raceNumber+'R');race.className='w5-digital-race';
  const nums=node('div',leg.numbers.join(' ・ '));nums.className='w5-digital-picks';
  body.append(race,nums);line.append(index,body);card.append(line);
 });
 const foot=node('div');foot.className='w5-digital-foot';
 const count=node('div');const cLabel=node('small','組み合わせ');count.append(cLabel,node('strong',ticket.points+'点'));
 const cost=node('div');cost.style.textAlign='right';cost.append(node('small','合計金額'),node('strong',fmt(ticket.stake)));
 foot.append(count,cost);card.append(foot);
 const code=node('div','WIN5 · '+ticket.date.replace(/-/g,'.')+' · PREVIEW');code.className='w5-digital-code';card.append(code);
 return card;
}
buy.onclick=()=>{
 const before=check();if(!before.ok){render();return}
 const overlay=node('div');overlay.className='w5-modal';
 const dialog=node('div');dialog.className='w5-dialog';
 dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
 dialog.append(node('h3','WIN5 購入内容の確認'));
 const overview=node('div');overview.className='w5-overview';
 before.count.forEach((n,i)=>{const cell=node('div');cell.append(node('small','WIN'+(i+1)),node('strong',n+'頭'));overview.append(cell)});
 dialog.append(overview);
 current().legs.forEach((l,i)=>{
  const row=node('div');row.className='w5-confirm-row';
  row.append(node('span',l.venue+l.raceNumber+'R'),node('strong',picks[i].join('・')));dialog.append(row);
 });
 const cost=node('div');cost.className='w5-confirm-row';cost.append(node('strong',before.points+'点 × '+fmt(before.price)),node('strong',fmt(before.stake)));dialog.append(cost);
 const warning=node('p','UIサンプルです。実際の購入・残高引き落としはありません。');warning.className='w5-note';dialog.append(warning);
 const actions=node('div');actions.className='w5-action-row';
 const back=node('button','戻って修正'),confirm=node('button','投票券を見る');back.className='outline';back.onclick=()=>overlay.remove();
 confirm.onclick=()=>{
  const updated=check();if(!updated.ok||updated.stake!==before.stake||updated.points!==before.points){overlay.remove();render();return}
  const ticket={id:demoTickets.length+1,date:selectedDate,stake:before.stake,unitStake:before.price,points:before.points,status:'preview',legs:current().legs.map((l,i)=>({...l,numbers:picks[i].slice()}))};
  demoTickets.push(ticket);overlay.remove();
  const ticketOverlay=node('div');ticketOverlay.className='w5-modal';
  const panel=node('div');panel.className='w5-dialog';panel.append(node('h3','WIN5 デジタル投票券'),digitalTicket(ticket));
  const note=node('p','デザイン確認用の投票券です。履歴はこの画面を開いている間だけ保持されます。');note.className='w5-note';panel.append(note);
  const done=node('button','閉じる');done.style.width='100%';done.onclick=()=>ticketOverlay.remove();
  panel.append(done);ticketOverlay.append(panel);document.body.append(ticketOverlay);render();
 };
 actions.append(back,confirm);dialog.append(actions);overlay.append(dialog);document.body.append(overlay);
 overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};back.focus();
};

window.addEventListener('focus',render);

render();
})();