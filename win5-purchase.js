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
// The five race identities are sourced from JRA's published 2026 WIN5 list (not inferred from race numbers).
// Add new officially verified dates before the December 27 list expires.
const OFFICIAL_SCHEDULE_URL='https://www.jra.go.jp/kouza/win5/info/racelist.html';
const today=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
const fmt=n=>Number(n).toLocaleString('ja-JP')+'円';
const node=(tag,txt)=>{const n=document.createElement(tag);if(txt!==undefined)n.textContent=txt;return n};
const styles=node('style');
styles.textContent=`.w5-ticket-home-item{margin-bottom:20px}.w5-ticket-home-item:last-child{margin-bottom:0}.w5-voting-section[hidden]{display:none!important}.w5-ticket-home{margin:10px 0 16px}.w5-ticket-home-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;color:#123866}.w5-ticket-home-heading strong{font-size:15px}.w5-vote-link{border:1px solid #c6d7ed!important;background:#fff!important;color:#154677!important;font-size:12px!important;padding:8px 11px!important;min-height:36px!important;white-space:nowrap}.w5-ticket-home .w5-result-status{margin:10px 0}.w5-select{width:auto;max-width:65%;padding:8px}.w5-race{background:#fff;border:1px solid #d5e1ee;border-radius:14px;padding:13px;margin:10px 0;box-shadow:0 3px 12px #112d5008}.w5-race h3{margin:0 0 5px;font-size:15px;color:#102f5c;line-height:1.35}.w5-horses{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}.w5-horses button{background:#f1f5fb;color:#193451;border:1.5px solid #c9d8eb;padding:0;display:flex;justify-content:center;align-items:center;min-width:0;min-height:47px;font-size:18px;font-weight:800;font-variant-numeric:tabular-nums;border-radius:10px;touch-action:manipulation}.w5-horses button[aria-pressed=true]{background:#174e9a;border:2px solid #174e9a;color:#fff;box-shadow:0 2px 7px #113f8130}.w5-horses button:disabled{opacity:.45}.w5-bar{background:#eef4fd;border:1px solid #c7d9f0;border-radius:14px;padding:13px;margin-top:12px;position:sticky;bottom:calc(74px + env(safe-area-inset-bottom));z-index:3;box-shadow:0 -3px 18px #092b5820}.w5-bar button{width:100%;margin-top:8px}.w5-hist{padding:12px;margin-top:14px;background:#f5f7fa;border-radius:12px}.w5-record{border-top:1px solid #d7e2f0;padding:9px 0;font-size:12px;line-height:1.7}.w5-modal{position:fixed;inset:0;background:#10233dbc;z-index:99999;display:flex;align-items:center;justify-content:center;padding:14px}.w5-dialog{background:#fff;color:#172c4a;width:min(100%,440px);max-height:85dvh;overflow:auto;border-radius:17px;padding:18px;line-height:1.7}.w5-dialog button{margin:5px}.w5-note{font-size:12px;line-height:1.65;color:#596f89}.w5-digital{background:linear-gradient(145deg,#071d3c,#123f79 67%,#245da0);color:white;border-radius:19px;padding:18px 16px;box-shadow:0 10px 27px #061d3d38;overflow:hidden;position:relative}.w5-digital:after{content:"";position:absolute;top:-75px;right:-55px;width:180px;height:180px;border:1px solid #ffffff25;border-radius:50%;pointer-events:none}.w5-digital-head{display:flex;justify-content:space-between;align-items:center;gap:8px;border-bottom:1px solid #ffffff42;padding-bottom:13px}.w5-digital-brand{font-size:27px;font-weight:900;letter-spacing:1px}.w5-digital-sub{font-size:10px;color:#c7d9f2;letter-spacing:.08em}.w5-digital-state{font-size:10px;background:#ffffff27;border:1px solid #ffffff40;border-radius:20px;padding:5px 9px;white-space:nowrap}.w5-digital-leg{display:grid;grid-template-columns:48px 1fr;gap:9px;border-bottom:1px solid #ffffff24;padding:10px 0;align-items:center}.w5-digital-index{font-size:11px;color:#c0d6f2;font-weight:850}.w5-digital-race{font-size:12px;color:#e2edfa}.w5-digital-picks{font-size:18px;font-weight:850;letter-spacing:.08em;overflow-wrap:anywhere}.w5-digital-foot{display:flex;justify-content:space-between;align-items:end;gap:10px;padding-top:17px}.w5-digital-foot small{display:block;color:#bbd5f5;font-size:10px;margin-bottom:3px}.w5-digital-foot strong{font-size:25px}.w5-digital-code{margin-top:14px;font-size:10px;letter-spacing:.12em;color:#aac9e9;border-top:1px solid #ffffff28;padding-top:9px}.w5-confirm-row{display:flex;justify-content:space-between;gap:8px;padding:9px 0;border-bottom:1px solid #e4ebf3}.w5-action-row{display:flex;gap:8px;margin-top:15px}.w5-action-row button{flex:1;min-width:0}.w5-overview{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;margin:8px 0 14px}.w5-overview div{text-align:center;background:#edf3fb;border-radius:9px;padding:9px 2px}.w5-overview small{display:block;font-size:10px;color:#58718f}.w5-overview strong{font-size:17px;color:#123d73}.w5-topline{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:7px}`;
styles.textContent+=`.w5-source-link{display:inline-block;font-size:11px;color:#2259a1;text-decoration:underline;margin:0 0 8px 2px}.w5-jump{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;position:sticky;top:0;z-index:3;background:#f5f7fb;padding:6px 2px 8px}.w5-jump-button{font-size:15px!important;font-weight:800;padding:8px 2px;background:#eaf0f8!important;color:#33577d!important;border:1px solid #cadaeb!important}.w5-jump-filled{background:#174e9a!important;color:#fff!important;border-color:#174e9a!important}.w5-expired{padding:13px;background:#fff0d9;border:1px solid #ebd2a3;border-radius:11px}.w5-race{scroll-margin-top:70px}.w5-race:focus-within{border-color:#a1bce4}.w5-race h3{letter-spacing:-.02em}`;
styles.textContent+=`.w5-demo-switch{display:block;margin:2px 0 11px auto;padding:7px 11px!important;min-height:36px!important;font-size:12px!important}.w5-demo-switch[aria-pressed=true]{background:#e5f0ff!important;border-color:#90b7ea!important;color:#154c91!important}`;
styles.textContent+=`
.w5-dialog{padding:0;max-height:min(90dvh,780px);display:flex;flex-direction:column;overscroll-behavior:contain;box-shadow:0 22px 65px #05162e65}
.w5-modal-head{padding:17px 17px 12px;border-bottom:1px solid #e7edf5;background:#fff;flex-shrink:0}
.w5-modal-head h3{margin:0;font-size:18px;color:#102f58}
.w5-modal-content{padding:13px 17px 16px;overflow-y:auto;overscroll-behavior:contain;flex:1;min-height:0}
.w5-modal-actions{display:flex;gap:9px;padding:12px 17px calc(13px + env(safe-area-inset-bottom));border-top:1px solid #e1e8f2;background:#fff;flex-shrink:0}
.w5-modal-actions button{flex:1;min-height:46px;margin:0;line-height:1.2;font-size:13px}
.w5-confirm-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.6fr);align-items:center;padding:12px 0;gap:9px}
.w5-confirm-row span{font-size:13px;color:#415b7a;white-space:nowrap}
.w5-confirm-row strong{font-size:16px;text-align:right;line-height:1.5;overflow-wrap:anywhere;color:#122f55}
.w5-confirm-summary{background:#edf4fe;border:1px solid #d4e4f8;border-radius:12px;padding:13px 12px;margin-top:12px}
.w5-confirm-summary .w5-confirm-line{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:4px 0}
.w5-confirm-summary .w5-confirm-amount{font-size:25px;color:#123b77;font-weight:900}
.w5-confirm-caption{font-size:11px;color:#647991;line-height:1.5}
.w5-modal .w5-digital{padding:17px 14px}
.w5-digital-leg{grid-template-columns:45px minmax(0,1fr);gap:9px}
.w5-digital-picks{font-size:clamp(15px,4.3vw,19px);line-height:1.45;letter-spacing:.015em;word-break:break-word}
.w5-digital-foot strong{font-size:clamp(19px,5.6vw,25px)}
.w5-history-preview{padding:12px 0}
.w5-record .w5-record-meta{display:flex;justify-content:space-between;align-items:center;gap:9px}
.w5-record .w5-record-meta strong{font-size:16px;color:#153e72}
.w5-record button{min-height:43px;width:100%;margin-top:10px}
.w5-ticket-hint{font-size:11px;line-height:1.6;color:#6a7c91;margin:10px 2px 0}
@media(max-width:360px){.w5-modal-head{padding:14px 12px}.w5-modal-content{padding:11px 12px 13px}.w5-modal-actions{padding:11px 12px calc(12px + env(safe-area-inset-bottom))}.w5-confirm-row strong{font-size:14px}.w5-digital-brand{font-size:23px}}
`;
styles.textContent+=`
.w5-hist{padding:9px 12px;margin-top:16px}
.w5-hist>summary{font-weight:800;color:#254a76;cursor:pointer;list-style-position:inside;min-height:42px;display:list-item;align-content:center}
.w5-hist[open]>summary{border-bottom:1px solid #dbe5f1;margin-bottom:10px}
.w5-bar{padding:10px 11px;bottom:calc(66px + env(safe-area-inset-bottom));max-width:100%}
.w5-control-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
.w5-control-row label{min-width:92px;max-width:118px;font-size:11px;line-height:1.2;color:#426184;flex-shrink:0}
.w5-control-row input{width:100%;min-width:0;max-width:112px;min-height:39px;margin-top:4px!important;padding:5px 7px;font-size:16px}
.w5-purchase-total{text-align:right;min-width:0;flex:1}
.w5-purchase-total p{margin:2px 0;overflow-wrap:anywhere}
.w5-purchase-total p:first-child{font-weight:900;font-size:17px;color:#123f77;font-variant-numeric:tabular-nums}
.w5-purchase-total p:last-child{font-size:11px;color:#536e8f;line-height:1.3}
.w5-purchase-actions{display:grid;grid-template-columns:110px minmax(0,1fr);gap:8px;margin-top:8px}
.w5-purchase-actions button{margin:0;min-width:0;min-height:43px;line-height:1.2;font-size:13px}
.w5-jump-button{min-height:40px!important;font-size:12px!important;padding:6px 2px!important;white-space:nowrap}
.w5-horses button:focus-visible,.w5-jump-button:focus-visible,.w5-purchase-actions button:focus-visible{outline:3px solid #f7b632;outline-offset:2px}
@media(max-width:355px){.w5-purchase-actions{grid-template-columns:90px minmax(0,1fr)}.w5-purchase-total p:first-child{font-size:15px}.w5-horses{gap:4px}}
`;
styles.textContent+=`.w5-record .w5-settle-btn{background:#155a47!important;color:white!important;border:1px solid #155a47!important}.w5-record p{margin:7px 0}.w5-record .w5-note{font-size:11px;color:#4e667e}.w5-record button{min-height:43px}.w5-result-status{font-size:15px;font-weight:850;margin:9px 0 5px!important;color:#173f76}.w5-result-status[data-outcome="loss"]{color:#9b3640}.w5-result-status[data-outcome="win"]{color:#147153}.w5-result-legs{font-size:12px;line-height:1.65;padding:8px 10px;background:#f4f7fb;border-radius:10px;margin:7px 0}.w5-result-legs>div{padding:2px 0}.w5-management-body{padding:10px 0 4px}.w5-management-body>.w5-demo-switch{margin:4px 0 12px auto}.w5-management-body>button{margin-top:12px;width:100%;min-height:43px}.w5-wallet-panel{margin-top:11px}`;
styles.textContent+=`.w5-modal-actions button[hidden]{display:none!important}.w5-ticket-first{width:100%;min-height:46px}.w5-history-picks{margin:8px 0 10px;font-size:12px;color:#51647d}.w5-history-picks summary{padding:7px 0;cursor:pointer}.w5-history-picks>div{padding:3px 8px}.w5-settle-progress{font-size:12px;color:#506d8e;margin-bottom:12px}.w5-settle-row{padding:12px;margin:8px 0;border-radius:12px;border:1px solid #d9e4f1;background:#f7faff}.w5-settle-row strong{display:block;font-size:15px}.w5-settle-row p{margin:5px 0;font-size:13px}.w5-settle-row[data-result="hit"]{background:#ecf8f2;border-color:#a4d8bd}.w5-settle-row[data-result="miss"]{background:#fff1f1;border-color:#f0c5c5}.w5-settle-final{padding:14px;border-radius:12px;background:#edf4fd;margin:12px 0;font-weight:750;line-height:1.7}.w5-wallet-panel{padding:12px;background:#f7f9fc;border:1px solid #dce5ef;border-radius:12px;margin:8px 0}.w5-wallet-info{font-size:12px;font-weight:650;color:#15395e;line-height:1.6}.w5-wallet-panel button{margin-top:8px;min-height:39px;width:100%;font-size:11px}.w5-watch-panel{padding:12px;background:#f2f7ff;border:1px solid #c9d9ef;border-radius:12px;margin:8px 0 10px}.w5-watch-panel strong{font-size:13px;color:#183f74}.w5-watch-panel .w5-note{margin:5px 0 8px;font-size:11px}.w5-watch-panel button{min-height:43px;width:100%;font-size:12px;margin:2px 0 5px}.w5-watch-panel button:disabled{background:#dae5f4!important;color:#46617f!important}`;
const body=node('div'),head=node('div'),dateSelect=node('select');
const ticketHome=node('section');ticketHome.className='w5-ticket-home';
const votingSection=node('section');votingSection.className='w5-voting-section';
let votingOpen=false;
dateSelect.className='w5-select';dateSelect.setAttribute('aria-label','WIN5対象日');
schedule.forEach(x=>{const option=node('option',x.date.replace(/-/g,'/'));option.value=x.date;dateSelect.append(option)});
const upcoming=schedule.find(x=>x.date>=today());
let demoMode=false;
let selectedDate=(upcoming||schedule[schedule.length-1]).date;
let dateManuallyChosen=false;
let picks=Array.from({length:5},()=>[]);
head.style.display='flex';head.style.justifyContent='space-between';head.style.alignItems='center';
head.append(node('strong','WIN5を購入'),dateSelect);
const note=node('p','WIN5専用財布で購入。的中時の報酬は公式払戻確認後に付与します。');note.className='w5-note';
const sourceLink=node('a','JRA公式のWIN5対象レースを確認');sourceLink.href=OFFICIAL_SCHEDULE_URL;sourceLink.target='_blank';sourceLink.rel='noopener noreferrer';sourceLink.className='w5-source-link';
const trial=node('section');trial.className='w5-watch-panel';
const trialTitle=node('strong','WIN5公式結果・自動監視テスト');
const trialNote=node('p','この5レースを通常の認証済み結果監視に登録します。購入・残高変更はありません。ログインと発走時刻付き出馬表が必要です。');
trialNote.className='w5-note';
const trialButton=node('button','この日の5レースを監視登録');trialButton.type='button';trialButton.className='outline';
const trialStatus=node('p');trialStatus.className='w5-note';trialStatus.setAttribute('role','status');
trial.append(trialTitle,trialNote,trialButton,trialStatus);
const walletPanel=node('section');walletPanel.className='w5-wallet-panel';
const walletInfo=node('div');walletInfo.className='w5-wallet-info';
const resetWallet=node('button','WIN5タブを完全初期化');resetWallet.type='button';resetWallet.className='outline';
walletPanel.append(walletInfo);
const races=node('div'),bar=node('div');bar.className='w5-bar';
const unitLabel=node('label','1点あたり（円）'),unit=node('input');unit.type='number';unit.min='100';unit.step='100';unit.value='100';unit.inputMode='numeric';unit.style.marginTop='6px';unitLabel.append(unit);
const total=node('p'),message=node('p');message.className='w5-note';
const buy=node('button','購入内容を確認'),clear=node('button','選択をクリア');clear.className='outline';
const controlRow=node('div');controlRow.className='w5-control-row';
const countBox=node('div');countBox.className='w5-purchase-total';
countBox.append(total,message);controlRow.append(unitLabel,countBox);
const actionRow=node('div');actionRow.className='w5-purchase-actions';actionRow.append(clear,buy);
bar.append(controlRow,actionRow);
const history=node('details');history.className='w5-hist';history.open=false;
const jump=node('div');jump.className='w5-jump';
const demoSwitch=node('button','デモ表示に切替');demoSwitch.type='button';demoSwitch.className='outline w5-demo-switch';
demoSwitch.setAttribute('aria-pressed','false');
const management=node('details');management.className='w5-hist w5-management';
management.append(node('summary','テスト・管理'));
const managementBody=node('div');managementBody.className='w5-management-body';
managementBody.append(demoSwitch,trial,resetWallet);
management.append(managementBody);
votingSection.append(head,walletPanel,note,sourceLink,management,jump,races,bar);
body.append(ticketHome,votingSection,history);host.replaceChildren(styles,body);
const current=()=>schedule.find(x=>x.date===selectedDate);
// Read exactly the same validated race-card cache used by the regular prediction screen.
const CARD_KEY='baken-king-personal-cards-v1';
const DRAFT_KEY='baken-king-win5-ui-draft-v1';
const demoCounts=[16,14,12,18,15];
const demoRaces=()=>current().legs.map((leg,i)=>({
 date:selectedDate,venue:leg.venue,raceNumber:leg.raceNumber,
 scheduledStartAt:selectedDate+'T'+['14:40','14:50','15:00','15:10','15:20'][i]+':00+09:00',
 horses:Array.from({length:demoCounts[i]},(_,n)=>({number:n+1,name:'デモ馬'}))
}));
function storeDraft(){
 try{localStorage.setItem(DRAFT_KEY,JSON.stringify({date:selectedDate,picks,unit:unit.value,demoMode}))}catch{}
}
function loadDraft(){
 try{
  const draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
  if(!draft||!schedule.some(item=>item.date===draft.date)||!Array.isArray(draft.picks)||draft.picks.length!==5)return;
  selectedDate=draft.date;dateManuallyChosen=true;demoMode=draft.demoMode===true;
  picks=draft.picks.map(arr=>Array.isArray(arr)?[...new Set(arr.filter(n=>Number.isInteger(n)&&n>=1&&n<=18))].sort((a,b)=>a-b):[]);
  if(/^\d{1,7}$/.test(String(draft.unit))&&Number(draft.unit)>=100)unit.value=String(draft.unit);
 }catch{}
}
const readCards=()=>{try{const payload=JSON.parse(localStorage.getItem(CARD_KEY)||'null');return Array.isArray(payload?.races)?payload.races:[]}catch{return []}};
const getRaces=()=>{
 if(demoMode)return demoRaces();
 const cards=readCards();
 return current().legs.map(l=>cards.find(c=>
  c&&c.date===selectedDate&&c.venue===l.venue&&Number(c.raceNumber)===l.raceNumber&&
  Array.isArray(c.horses)&&c.horses.length>0
 )||null);
};
const timeOf=c=>{const v=String(c?.startTime||c?.scheduledStartAt||'');return v.match(/(?:^|T)([0-2][0-9]:[0-5][0-9])/)?.[1]||''};
const available=h=>Number.isInteger(Number(h?.number))&&Number(h.number)>=1&&Number(h.number)<=18&&Boolean(h.name)&&h.scratched!==true&&h.cancelled!==true&&h.excluded!==true&&h.status!=='取消'&&h.status!=='除外';
function check(){
 const cards=getRaces(),count=picks.map((list,i)=>list.filter(n=>cards[i]?.horses?.some(h=>available(h)&&Number(h.number)===n)).length);
 const points=count.reduce((a,b)=>a*b,1),price=Number(unit.value),stake=points*price;
 const start=timeOf(cards[0]);const rawCutoff=start?Date.parse(selectedDate+'T'+start+':00+09:00')-300000:NaN;
 const cutoff=selectedDate==='2026-11-15'?Math.min(rawCutoff,Date.parse('2026-11-15T14:35:00+09:00')):rawCutoff;
 const snapshot=walletSnapshot();
 const validCard=cards.every((c,i)=>c&&Array.isArray(c.horses)&&c.horses.length&&count[i]>0&&picks[i].length===count[i]);
 const purchaseWindow=demoMode||(selectedDate==='2026-11-15'&&today()==='2026-11-15'&&Number.isFinite(cutoff)&&Date.now()<cutoff);
 const enough=demoMode||Boolean(isLivePurchaseEnabled()&&snapshot&&!snapshot.seasonOver&&!snapshot.error&&!snapshot.legacyCount&&stake<=snapshot.balance);
 const ok=validCard&&Number.isSafeInteger(price)&&price>=100&&price%100===0&&points<=5000&&Number.isSafeInteger(stake)&&stake<=1000000&&purchaseWindow&&enough;
 return {cards,count,points,price,stake,cutoff,ok};
}
function chooseUpcomingFromCards(){
 if(dateManuallyChosen||!upcoming)return;
 const availableDates=new Set(readCards().map(c=>c?.date));
 const preferred=schedule.find(x=>x.date>=today()&&availableDates.has(x.date));
 if(preferred&&preferred.date!==selectedDate){
  selectedDate=preferred.date;picks=Array.from({length:5},()=>[]);
 }
}
function render(){
 chooseUpcomingFromCards();
 demoSwitch.textContent=demoMode?'実際の出馬表に戻す':'デモ表示で操作する';
 demoSwitch.setAttribute('aria-pressed',String(demoMode));
 const live=getRaces();
 picks=picks.map((numbers,i)=>!live[i]?numbers:numbers.filter(n=>live[i].horses.some(h=>available(h)&&Number(h.number)===n)));
 const x=check();dateSelect.value=selectedDate;races.replaceChildren();
 const walletState=walletSnapshot();
 walletInfo.textContent=walletState?.error?'WIN5財布：'+walletState.error:
  'WIN5購入財布：残高 '+fmt(walletState?.balance??0)+' ／ WIN5購入累計 '+fmt(walletState?.totalStake||0)+' ／ WIN5払戻累計 '+fmt(walletState?.totalPaid||0)+' ／ ガチャ券 '+(walletState?.gachaTickets||0)+'枚';
 if(walletState?.legacyCount){
  walletInfo.textContent+=' ／ 旧共通財布のWIN5券 '+walletState.legacyCount+'件（保護中・移行前）';
 }
 const watched=watchSnapshot();
 trialButton.disabled=demoMode||selectedDate<today()||watched?.date===selectedDate&&watched?.status==='watching';
 trialButton.textContent=watched?.date===selectedDate&&watched?.status==='watching'?'監視登録済み（端末）':'この日の5レースを監視登録';
 trialStatus.textContent=watched?.date===selectedDate?
  watched.status==='complete'?'5レースの確定結果を受信済み：'+watched.confirmed.map((v,i)=>'WIN'+(i+1)+' '+v.winners.join('・')).join(' / '):
  '監視希望を端末に保存済み。結果受信 '+(watched.confirmed||[]).filter(Boolean).length+'/5レース。サーバー登録状況は「設定」で確認できます。':
  '登録すると発走前から監視対象に入り、確定結果を確認します。';
 storeDraft();
 const expired=!demoMode&&!upcoming&&selectedDate>=today();
 dateSelect.disabled=false;
 jump.replaceChildren();
 current().legs.forEach((leg,i)=>{
  const b=node('button','WIN'+(i+1)+(x.count[i]?' ✓':''));
  b.type='button';b.className='w5-jump-button'+(x.count[i]?' w5-jump-filled':'');
  b.setAttribute('aria-label','WIN'+(i+1)+' '+leg.venue+leg.raceNumber+'Rへ移動');
  b.onclick=()=>document.getElementById('w5-leg-'+i)?.scrollIntoView({behavior:'smooth',block:'start'});
  jump.append(b);
 });
 if(expired){const alert=node('p','現在公開済みの日程は2026年12月27日までです。次回の公式対象レース更新を待っています。');alert.className='w5-note w5-expired';races.append(alert)}

 current().legs.forEach((leg,i)=>{
 const c=x.cards[i],section=node('section');section.className='w5-race';section.id='w5-leg-'+i;
 section.append(node('h3','WIN'+(i+1)+'　'+leg.venue+leg.raceNumber+'R'));
 const t=timeOf(c),sub=node('p',c?((t?t+' 発走 ／ ':'')+c.horses.length+'頭 ／ 選択 '+(x.count[i]?picks[i].filter(n=>c.horses.some(h=>available(h)&&Number(h.number)===n)).join('・'):'なし')):'出馬表の配信待ち');sub.className='w5-note';section.append(sub);
 if(!c?.horses?.length){const waiting=node('p','通常の予想タブにこのレースの馬番が配信されると、ここに自動表示されます。');waiting.className='w5-note';section.append(waiting);}
 else{
 const grid=node('div');grid.className='w5-horses';
 c.horses.slice().sort((a,b)=>Number(a.number)-Number(b.number)).forEach(h=>{
 const n=Number(h.number);if(!Number.isInteger(n))return;
 const b=node('button',String(n));b.type='button';b.disabled=!available(h);b.setAttribute('aria-label','WIN'+(i+1)+' '+leg.venue+leg.raceNumber+'R　馬番'+n+'　'+(picks[i].includes(n)?'選択済み、タップで解除':'タップで選択'));b.setAttribute('aria-pressed',String(picks[i].includes(n)));
 b.onclick=()=>{picks[i]=picks[i].includes(n)?picks[i].filter(x=>x!==n):[...picks[i],n].sort((a,b)=>a-b);render()};grid.append(b)});
 section.append(grid)}races.append(section)});
 total.textContent=x.count.every(n=>n>0)?x.points+'点・合計 '+fmt(x.stake):'選択 '+x.count.filter(n=>n>0).length+'/5 レース';
 buy.disabled=expired||!x.ok;
 const snapshot=walletSnapshot();
 message.textContent=!demoMode&&snapshot?.legacyCount?'旧共通財布のWIN5券が残っています。二重計上防止のため購入を保留しています':!demoMode&&!isLivePurchaseEnabled()?'11月15日限定：現在はデモ表示のみ購入可':!demoMode&&selectedDate!=='2026-11-15'?'11月15日のWIN5のみ本購入できます':expired?'今後の日程は未公開です':!x.cards.every(Boolean)?'対象レースの出馬表を待っています':x.count.some(n=>n===0)?'残り'+x.count.filter(n=>n===0).length+'レース':x.points>5000?'5,000点以内にしてください':x.stake>1000000?'購入額は100万円以内':!demoMode&&selectedDate<today()?'過去開催日は購入できません':!demoMode&&(!Number.isFinite(x.cutoff)||Date.now()>=x.cutoff)?'発売締切を過ぎています':!demoMode&&snapshot?.seasonOver?'シーズン終了中':!demoMode&&x.stake>(snapshot?.balance||0)?'残高不足（残高 '+fmt(snapshot?.balance||0)+'）':demoMode?'デモ表示：残高変更なし':'購入後残高 '+fmt((snapshot?.balance||0)-x.stake);
 const wasOpen=history.open;history.replaceChildren();const historyHeading=node('summary','WIN5 購入履歴（'+((walletSnapshot()?.tickets?.length||0)+demoTickets.length)+'件）');history.append(historyHeading);history.open=wasOpen;
 const purchased=[...demoTickets,...(walletSnapshot()?.tickets||[])].filter(t=>t&&Array.isArray(t.legs));
 // Display every purchased digital ticket on the WIN5 home screen, newest first.
 ticketHome.replaceChildren();
 if(purchased.length){
  const heading=node('div');heading.className='w5-ticket-home-heading';
  heading.append(node('strong','購入済みデジタル投票券（'+purchased.length+'件）'));
  const toggle=node('button',votingOpen?'投票画面を閉じる':'＋ 投票を続ける');
  toggle.type='button';toggle.className='w5-vote-link';
  toggle.onclick=()=>{votingOpen=!votingOpen;render();if(votingOpen)votingSection.scrollIntoView({behavior:'smooth',block:'start'})};
  heading.append(toggle);ticketHome.append(heading);
  purchased.slice().reverse().forEach(ticket=>{
   const group=node('div');group.className='w5-ticket-home-item';
   group.append(digitalTicket(ticket));
   const status=node('p',ticketStateLabel(ticket));status.className='w5-result-status';group.append(status);
   const ready=ticket.status==='pending'&&ticket.win5Evaluation?.complete===true&&(ticket.win5Evaluation.hitCount===0||ticket.win5PayoutReady===true);
   if(ready){const settle=node('button','WIN5の結果を判定する');settle.className='w5-settle-btn';settle.onclick=()=>showStepSettlement(ticket);group.append(settle)}
   ticketHome.append(group);
  });
 }else{votingOpen=true}
 votingSection.hidden=!votingOpen;
 purchased.slice(-20).reverse().forEach(t=>{
 const box=node('div');box.className='w5-record';
 box.append(node('strong',t.date+'　'+fmt(t.stake)));
 const show=node('button','デジタル投票券を見る');show.className='outline w5-ticket-first';show.style.marginTop='9px';show.onclick=()=>showTicket(t);
 box.append(show);
 const settledReveal=t.status==='settled';
 const readyToSettle=t.status==='pending'&&t.win5Evaluation?.complete===true&&(t.win5Evaluation.hitCount===0||t.win5PayoutReady===true);
 const stateLabel=node('p',readyToSettle?'結果確定・判定を確認':ticketStateLabel(t));stateLabel.className='w5-result-status';
 stateLabel.dataset.outcome=settledReveal&&t.win5Evaluation?.complete===true?(t.win5Evaluation.hitCount>0?'win':'loss'):'pending';
 box.append(stateLabel);
 if(settledReveal&&t.win5Evaluation?.complete===true){
  const outcome=t.win5Evaluation;
  const resultLine=node('p',outcome.void?'WIN5開催無効・全額返還':outcome.hitCount>0?'的中組合せ '+outcome.hitCount+'点 ／ '+(t.win5PayoutReady?'払戻 '+fmt(t.win5OfficialPayout.totalYen):'WIN5公式払戻金の確認待ち'):'不的中 ／ 返還 '+fmt(outcome.refundYen));
  resultLine.className='w5-note';box.append(resultLine);
  if(!outcome.void&&Array.isArray(outcome.results)&&outcome.results.length===5){
   const details=node('div');details.className='w5-result-legs';
   outcome.results.forEach((r,i)=>{
    const selections=t.legs[i]?.numbers||[];
    const winners=Array.isArray(r.winning)?r.winning:[];
    const hit=winners.some(n=>selections.includes(n));
    const row=node('div','WIN'+(i+1)+' '+(hit?'✓':'×')+'　'+t.legs[i].venue+t.legs[i].raceNumber+'R　1着 '+winners.join('・'));
    details.append(row);
   });
   box.append(details);
  }
  if(t.status==='settled'&&t.win5GachaGranted){
   const rewardLine=node('p','WIN5的中特典：ガチャ券 '+t.win5GachaGranted+'枚 ／ 通常馬券財布へ '+fmt(t.win5TransferYen||0));
   rewardLine.className='w5-note';box.append(rewardLine);
  }
 }

 const picksDetail=node('details');picksDetail.className='w5-history-picks';
 picksDetail.append(node('summary','購入した買い目を見る'));
 t.legs.forEach((l,i)=>picksDetail.append(node('div','WIN'+(i+1)+' '+l.venue+l.raceNumber+'R　'+l.numbers.join('・'))));
 box.append(picksDetail);
 if(readyToSettle){
  const settle=node('button','WIN5の結果を判定する');
  settle.className='w5-settle-btn';settle.type='button';
  settle.onclick=()=>showStepSettlement(t);
  box.append(settle)
 }
 history.append(box)});
 if(!purchased.length)history.append(node('p','購入履歴はありません'));
}
dateSelect.onchange=()=>{dateManuallyChosen=true;selectedDate=dateSelect.value;picks=Array.from({length:5},()=>[]);render()};
resetWallet.onclick=()=>{
 if(!window.confirm('WIN5の購入履歴・専用残高・ガチャ券・全バッジを初期化します。既に通常馬券財布へ付与済みの還元は戻しません。通常馬券の残高や成績は変更しません。続行しますか？'))return;
 if(!window.confirm('最終確認：WIN5タブの購入記録・ガチャ券・全バッジが消え、WIN5購入財布は30万円に戻ります。実行しますか？'))return;
 const result=wallet()?.reset?.();
 if(!result?.ok){window.alert(result?.error||'初期化できませんでした');return}
 demoTickets.length=0;picks=Array.from({length:5},()=>[]);
 render();
 const frame=document.getElementById('bkWin5Frame');
 if(frame?.getAttribute('src')){try{frame.contentWindow?.location.reload()}catch{}}
};
trialButton.onclick=()=>{
 const result=wallet()?.watch?.({date:selectedDate,legs:current().legs.map(l=>({venue:l.venue,raceNumber:l.raceNumber}))});
 if(!result?.ok){window.alert(result?.error||'監視の登録に失敗しました');return}
 render();
};
demoSwitch.onclick=()=>{
 demoMode=!demoMode;
 // A switch between real data and synthetic data must never carry over selections.
 picks=Array.from({length:5},()=>[]);render();
};
unit.oninput=render;clear.onclick=()=>{picks=Array.from({length:5},()=>[]);render()};
const demoTickets=[];
const wallet=()=>window.BakenWin5Wallet;
const walletSnapshot=()=>wallet()?.snapshot?.()||null;
const watchSnapshot=()=>wallet()?.monitorSnapshot?.()||null;
const isLivePurchaseEnabled=()=>wallet()?.enabled?.()===true;
const ticketStateLabel=t=>t.status==='preview'?'UIプレビュー':t.win5Evaluation?.complete===true?(t.win5Evaluation.void?'開催無効・返還':t.win5Evaluation.hitCount>0?(t.status==='settled'?'的中・精算済み':t.win5PayoutReady?'的中・精算待ち':'的中・公式払戻待ち'):t.win5Evaluation.refundYen>0?(t.status==='settled'?'不的中・返還精算済み':'不的中・返還あり'):t.status==='settled'?'不的中・精算済み':'不的中・精算待ち'):'結果待ち';


function digitalTicket(ticket){
 const card=node('div');card.className='w5-digital';
 const header=node('div');header.className='w5-digital-head';
 const brand=node('div');
 const title=node('div','WIN 5');title.className='w5-digital-brand';
 const subtitle=node('div','BAKEN-KING / DIGITAL TICKET');subtitle.className='w5-digital-sub';
 brand.append(title,subtitle);
 const status=node('span',ticket.status==='preview'?'UI SAMPLE':ticket.status==='pending'&&ticket.win5Evaluation?.complete===true?'結果確定・判定待ち':ticketStateLabel(ticket));status.className='w5-digital-state';
 header.append(brand,status);card.append(header);
 ticket.legs.forEach((leg,i)=>{
  const row=node('div');row.className='w5-digital-leg';
  const number=node('span','WIN'+(i+1));number.className='w5-digital-index';
  const info=node('div'),race=node('div',leg.venue+leg.raceNumber+'R'),numbers=node('div',leg.numbers.join(' ・ '));
  race.className='w5-digital-race';numbers.className='w5-digital-picks';
  info.append(race,numbers);row.append(number,info);card.append(row);
 });
 const totals=node('div');totals.className='w5-digital-foot';
 const count=node('div');count.append(node('small','購入点数'),node('strong',ticket.points+'点'));
 const amount=node('div');amount.style.textAlign='right';amount.append(node('small','購入金額'),node('strong',fmt(ticket.stake)));
 totals.append(count,amount);card.append(totals);
 const code=node('div','WIN5 · '+ticket.date.replace(/-/g,'.')+(ticket.status==='preview'?' · PREVIEW':' · BAKEN-KING'));
 code.className='w5-digital-code';card.append(code);
 return card;
}
function modal(title,body,actions){
 const overlay=node('div');overlay.className='w5-modal';
 const panel=node('section');panel.className='w5-dialog';panel.setAttribute('role','dialog');
 panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',title);
 const top=node('div');top.className='w5-modal-head';top.append(node('h3',title));
 const content=node('div');content.className='w5-modal-content';content.append(body);
 const footer=node('div');footer.className='w5-modal-actions';actions.forEach(action=>footer.append(action));
 panel.append(top,content,footer);overlay.append(panel);document.body.append(overlay);
 const previous=document.activeElement;
 const focusable=()=>[...panel.querySelectorAll('button:not([disabled])')];
 const onKey=event=>{
  if(event.key==='Escape'){event.preventDefault();close();return}
  if(event.key!=='Tab')return;
  const buttons=focusable();if(!buttons.length)return;
  const first=buttons[0],last=buttons[buttons.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
 };
 const close=()=>{document.removeEventListener('keydown',onKey);overlay.remove();previous?.focus?.()};
 overlay.onclick=e=>{if(e.target===overlay)close()};
 document.addEventListener('keydown',onKey);
 (focusable()[0]||panel).focus();
 return close;
}
// Show one verified WIN5 leg per explicit tap. Only the final button mutates balances.
function showStepSettlement(ticket){
 const evaluation=ticket.win5Evaluation;
 if(ticket.status!=='pending'||evaluation?.complete!==true||
   !(evaluation.hitCount===0||ticket.win5PayoutReady===true))return;
 const body=node('div');
 const progress=node('p');progress.className='w5-settle-progress';
 const results=node('div');
 const final=node('div');final.className='w5-settle-final';final.hidden=true;
 body.append(progress,results,final);
 const cancel=node('button','閉じる');cancel.className='outline';
 const skip=node('button','結果までスキップ');skip.className='outline';
 const finish=node('button','精算を確定する');finish.hidden=true;
 let close,step=0,completed=false,timer=null,stopped=false;
 const INTERVAL_MS=1250;
 const stop=()=>{stopped=true;if(timer!==null){clearTimeout(timer);timer=null}};
 const rows=Array.isArray(evaluation.results)?evaluation.results:[];
 const isVoid=evaluation.void===true;
 if(!isVoid&&rows.length!==5)return;
 function buildRow(i){
  const leg=ticket.legs[i],r=rows[i];
  const winning=Array.isArray(r.winning)?r.winning:[];
  const hit=winning.some(n=>leg.numbers.includes(n));
  const refunded=Array.isArray(r.refunded)?r.refunded:[];
  const row=node('div');row.className='w5-settle-row';row.dataset.result=hit?'hit':'miss';
  row.append(node('strong','WIN'+(i+1)+'　'+leg.venue+leg.raceNumber+'R　'+(hit?'的中 ✓':'不的中 ×')));
  row.append(node('p','購入　'+leg.numbers.join('・')));
  row.append(node('p','確定1着　'+winning.join('・')));
  if(refunded.length)row.append(node('p','返還対象馬番　'+refunded.join('・')));
  return row;
 }
 function showFinal(){
  final.hidden=false;
  const total=ticket.win5PayoutReady?ticket.win5OfficialPayout?.totalYen:evaluation.refundYen;
  const label=isVoid?'開催無効・全額返還':evaluation.hitCount>0?'WIN5 的中！':'WIN5 不的中';
  final.replaceChildren(node('div',label),node('div','払戻・返還　'+fmt(total)));
  progress.textContent='5/5 判定完了 — 精算内容を確認してください';
  skip.hidden=true;finish.hidden=false;finish.focus();
 }
 function advance(){
  if(stopped||completed||!body.isConnected)return;
  if(isVoid){showFinal();return}
  if(step>=5)return;
  results.append(buildRow(step));
  step++;
  progress.textContent=step+'/5 レース判定済み';
  results.lastElementChild?.scrollIntoView?.({block:'nearest',behavior:'smooth'});
  if(step===5){showFinal();return}
  timer=setTimeout(advance,INTERVAL_MS);
 }
 skip.onclick=()=>{
  if(stopped||completed||!body.isConnected)return;
  if(timer!==null){clearTimeout(timer);timer=null}
  while(step<5&&!isVoid){results.append(buildRow(step));step++}
  showFinal();
 };
 finish.onclick=()=>{
  if(completed||final.hidden)return;
  // Re-evaluate authoritative local state before applying any payout or reward.
  const current=walletSnapshot()?.tickets?.find(t=>t.id===ticket.id);
  if(!current||current.status!=='pending'||current.win5Evaluation?.complete!==true||
     JSON.stringify(current.win5Evaluation)!==JSON.stringify(evaluation)||
     current.win5PayoutReady!==ticket.win5PayoutReady||
     JSON.stringify(current.win5OfficialPayout??null)!==JSON.stringify(ticket.win5OfficialPayout??null)){
   window.alert('精算データが更新されました。履歴からもう一度確認してください');stop();close();render();return;
  }
  const result=wallet()?.settle?.(ticket.id);
  if(!result?.ok){window.alert(result?.error||'精算できませんでした');return}
  completed=true;stop();close();render();
 };
 cancel.onclick=()=>{stop();close()};
 close=modal('WIN5 順番に判定',body,[cancel,skip,finish]);
 progress.textContent='0/5 — 自動判定を開始します';
 // No wallet writes happen from the clock; only an explicit final confirmation settles.
 timer=setTimeout(advance,500);
}
function showTicket(ticket){
 const body=node('div','w5-history-preview');
 body.append(digitalTicket(ticket));
 const hint=node('p',ticket.status==='preview'?'デモ表示です。残高は変更されません。':ticket.status==='settled'?'精算済みの購入記録です。':ticket.win5Evaluation?.complete===true?'確定結果を受信済みです。精算可能な場合は「WIN5の結果を判定する」から確認できます。':'購入記録は保存されています。確定結果を取得後、履歴から精算できます。');hint.className='w5-ticket-hint';body.append(hint);
 const closeButton=node('button','閉じる');let close;
 closeButton.onclick=()=>close();
 close=modal('WIN5 デジタル投票券',body,[closeButton]);
}
buy.onclick=()=>{
 const before=check();if(!before.ok){render();return}
 const chosenMode=demoMode;
 const requestId='win5-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);
 const chosenDate=selectedDate;
 const chosenPicks=picks.map(v=>v.slice());
 const legs=current().legs.map((leg,i)=>({...leg,numbers:chosenPicks[i].slice()}));
 const contents=node('div');
 const overview=node('div');overview.className='w5-overview';
 before.count.forEach((n,i)=>{
  const item=node('div');item.append(node('small','WIN'+(i+1)),node('strong',n+'頭'));overview.append(item)
 });
 contents.append(overview);
 legs.forEach((leg,i)=>{
  const row=node('div');row.className='w5-confirm-row';
  row.append(node('span','WIN'+(i+1)+'　'+leg.venue+leg.raceNumber+'R'),node('strong',leg.numbers.join('・')));
  contents.append(row);
 });
 const summary=node('div');summary.className='w5-confirm-summary';
 const line=node('div');line.className='w5-confirm-line';
 line.append(node('span',before.points+'点 × '+fmt(before.price)),node('strong',fmt(before.stake)));
 const second=node('div');second.className='w5-confirm-line';
 second.append(node('span','合計金額'));
 const big=node('strong',fmt(before.stake));big.className='w5-confirm-amount';second.append(big);
 summary.append(line,second);contents.append(summary);
 const hint=node('p',demoMode?'デモ表示です。購入記録は保存されず残高も変わりません。':'ゲーム内通貨での購入です（JRA実馬券ではありません）。確定すると残高から差し引き、買い目を結果待ちで保存します。WIN5公式払戻金が確認できない的中券は精算保留となります。');hint.className='w5-confirm-caption';contents.append(hint);
 const back=node('button','戻って修正'),preview=node('button','投票券を表示');back.className='outline';
 let close;
 back.onclick=()=>close();
 preview.onclick=()=>{
  const after=check();
  if(!after.ok||after.stake!==before.stake||after.points!==before.points||
   selectedDate!==chosenDate||demoMode!==chosenMode||JSON.stringify(picks)!==JSON.stringify(chosenPicks)){
   close();render();return;
  }
  let ticket;
  preview.disabled=true;
  if(chosenMode){
   ticket={id:demoTickets.length+1,date:chosenDate,stake:before.stake,unitStake:before.price,points:before.points,status:'preview',legs};
   demoTickets.push(ticket);
  }else{
   const result=wallet()?.purchase?.({requestId,date:chosenDate,unitStake:before.price,legs});
   if(!result?.ok){close();render();alert(result?.error||'購入処理が利用できません');return}
   ticket=result.ticket;
  }
  votingOpen=false;
  close();render();
 };
 close=modal('WIN5 購入内容の確認',contents,[back,preview]);
};

loadDraft();
window.addEventListener('baken:cards-imported',render);
window.addEventListener('baken:wagers-updated',render);
window.addEventListener('baken:win5-wallet-updated',render);
window.addEventListener('storage',event=>{if(event.key===CARD_KEY||event.key==='baken-king-g1-pins-mvp-v1-'+(localStorage.getItem('baken-king-mode-v1')==='test'?'test':'production'))render()});
window.addEventListener('focus',render);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});

render();
window.BakenWin5PurchaseReady=true;
})();