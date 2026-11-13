(()=>{
'use strict';
const host=document.querySelector('[data-win5-panel="purchase"]');
if(!host||typeof s==='undefined'||typeof save!=='function')return;
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
const note=node('p','JRAが公表した対象5レースを表示。対象レースが変更される場合があります。公式情報と照合して購入してください。');note.className='w5-note';
const races=node('div'),bar=node('div');bar.className='w5-bar';
const unitLabel=node('label','1点あたり（円）'),unit=node('input');unit.type='number';unit.min='100';unit.step='100';unit.value='100';unit.inputMode='numeric';unit.style.marginTop='6px';unitLabel.append(unit);
const total=node('p'),message=node('p');message.className='w5-note';
const buy=node('button','購入内容を確認'),clear=node('button','選択をクリア');clear.className='outline';
bar.append(unitLabel,total,message,buy,clear);
const history=node('div');history.className='w5-hist';body.append(head,note,races,bar,history);host.replaceChildren(styles,body);
const current=()=>schedule.find(x=>x.date===selectedDate);
const getCards=()=>{try{return JSON.parse(localStorage.getItem('baken-king-personal-cards-v1')||'null')?.races||[]}catch{return []}};
const getRaces=()=>current().legs.map(l=>getCards().find(c=>c.date===selectedDate&&c.venue===l.venue&&Number(c.raceNumber)===l.raceNumber)||null);
const timeOf=c=>{const v=String(c?.startTime||c?.scheduledStartAt||'');return v.match(/(?:^|T)([0-2][0-9]:[0-5][0-9])/)?.[1]||''};
const available=h=>Number.isInteger(Number(h?.number))&&Number(h.number)>=1&&Number(h.number)<=18&&Boolean(h.name)&&h.scratched!==true&&h.cancelled!==true&&h.excluded!==true&&h.status!=='取消'&&h.status!=='除外';
function check(){
 const cards=getRaces(),count=picks.map((list,i)=>list.filter(n=>cards[i]?.horses?.some(h=>available(h)&&Number(h.number)===n)).length);
 const points=count.reduce((a,b)=>a*b,1),price=Number(unit.value),stake=points*price;
 const start=timeOf(cards[0]);const cutoff=start?Date.parse(selectedDate+'T'+start+':00+09:00')-300000:NaN;
 const ok=cards.every((c,i)=>c&&Array.isArray(c.horses)&&c.horses.length&&count[i]>0&&picks[i].length===count[i])&&
 Number.isSafeInteger(price)&&price>=100&&price%100===0&&points<=5000&&Number.isSafeInteger(stake)&&stake<=s.balance&&
 Number.isFinite(cutoff)&&Date.now()<cutoff&&selectedDate>=today()&&!s.seasonOver;
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
 message.textContent=!x.cards.every(Boolean)?'対象レースの出馬表配信待ち':!timeOf(x.cards[0])?'第1レースの発走時刻未取得':x.count.some(n=>n===0)?'5レースすべてで1頭以上選択してください':x.points>5000?'5,000点以内にしてください':x.stake>s.balance?'残高不足':Date.now()>=x.cutoff?'販売締切（第1レース5分前）':'現在残高 '+fmt(s.balance)+' ／ 購入後 '+fmt(s.balance-x.stake);
 history.replaceChildren(node('strong','WIN5 購入履歴'));
 const purchased=Array.isArray(s.win5Tickets)?s.win5Tickets:[];
 purchased.slice(-20).reverse().forEach(t=>{
 const box=node('div');box.className='w5-record';box.append(node('strong',t.date+'　'+fmt(t.stake)+'　'+(t.status==='pending'?'結果待ち':'精算済み')));
 t.legs.forEach((l,i)=>box.append(node('div',(i+1)+'R '+l.venue+l.raceNumber+'R　'+l.numbers.join('・'))));history.append(box)});
 if(!purchased.length)history.append(node('p','購入履歴はありません'));
}
dateSelect.onchange=()=>{selectedDate=dateSelect.value;picks=Array.from({length:5},()=>[]);render()};
unit.oninput=render;clear.onclick=()=>{picks=Array.from({length:5},()=>[]);render()};
buy.onclick=()=>{
 const before=check();if(!before.ok){render();return}
 const overlay=node('div');overlay.className='w5-modal';const dialog=node('div');dialog.className='w5-dialog';
 dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.append(node('h3','WIN5購入内容の確認'));
 dialog.append(node('p',selectedDate+'　'+before.points+'点　'+fmt(before.stake)));
 current().legs.forEach((l,i)=>dialog.append(node('p',(i+1)+'　'+l.venue+l.raceNumber+'R：'+picks[i].join('・'))));
 const msg=node('p','仮想資金から引き落とします。結果照合と払戻は次の開発段階です。');msg.className='w5-note';dialog.append(msg);
 const back=node('button','戻る'),confirm=node('button','この内容で購入');back.className='outline';back.onclick=()=>overlay.remove();
 confirm.onclick=()=>{
 const after=check();if(!after.ok||after.stake!==before.stake||after.points!==before.points){overlay.remove();render();return}
 const ticket={id:crypto.randomUUID(),date:selectedDate,season:s.season,purchasedAt:new Date().toISOString(),type:'WIN5',stake:after.stake,unitStake:after.price,points:after.points,paid:0,status:'pending',legs:current().legs.map((l,i)=>({...l,numbers:picks[i].slice(),raceName:after.cards[i].raceName||''}))};
 if(!Array.isArray(s.win5Tickets))s.win5Tickets=[];
 s.win5Tickets.push(ticket);s.balance-=after.stake;s.totalStake+=after.stake;
 try{save()}catch{ s.win5Tickets.pop();s.balance+=after.stake;s.totalStake-=after.stake;overlay.remove();message.textContent='保存に失敗しました';return}
 picks=Array.from({length:5},()=>[]);overlay.remove();render();toast('WIN5を購入しました');
 };
 dialog.append(back,confirm);overlay.append(dialog);document.body.append(overlay);
 overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};back.focus();
};
window.addEventListener('baken:wagers-updated',render);
window.addEventListener('focus',render);
window.addEventListener('storage',e=>{if(e.key==='baken-king-personal-cards-v1')render()});
render();
})();