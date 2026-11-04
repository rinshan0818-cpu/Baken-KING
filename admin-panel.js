(()=>{
'use strict';
const $=id=>document.getElementById(id);
const MODE='baken-king-mode-v1',TEST='baken-king-test-state-v1',LIVE='keiba-demo-v1';
async function verify(){
 const r=await fetch('/api/auth/admin/status',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
 if(!r.ok)throw Error('管理権限を確認できません（HTTP '+r.status+'）');
 const d=await r.json();
 if(d.ok!==true||d.admin!==true)throw Error('管理権限がありません');
 $('authStatus').textContent='本人アカウントを認証済み';
}
function localState(){
 let state=null;
 try{state=JSON.parse(localStorage.getItem(LIVE)||'null')}catch{}
 const bets=Array.isArray(state?.bets)?state.bets:[];
 const official=bets.filter(b=>b&&typeof b.realRaceId==='string'&&b.realRaceId.length>0).length;
 const unknown=bets.length-official;
 const legacyKeys=['baken-king-imported-race-v1','baken-king-real-notes-v1','baken-monitor-sync-config-v1'];
 const present=legacyKeys.filter(key=>localStorage.getItem(key)!==null);
 $('storageStatus').textContent='通常データ：'+bets.length+'枚（実レースIDあり '+official+'枚／旧形式・未分類 '+unknown+'枚）\n'
  +'テスト専用データ：'+(localStorage.getItem(TEST)===null?'なし':'あり')+'\n'
  +'旧設定・保存領域：'+present.length+'種類（保持中）';
 const testing=localStorage.getItem(MODE)==='test';
 $('modeStatus').textContent='現在の動作モード：'+(testing?'テスト':'通常');
 $('switchMode').textContent=testing?'通常モードに戻す':'テストモードに切り替え';
}
// Read-only operational checks. A successful API response does not prove scheduler execution.
const operationSpecs=[
 {key:'Cards',path:'/api/auth/friends/race-cards',label:'出馬表'},
 {key:'Results',path:'/api/auth/friends/verified-results',label:'確定結果'},
 {key:'Monitor',path:'/api/auth/friends/monitor-targets',label:'監視対象'}
];
function operationStatus(key,kind,title,detail){
 const badge=$('ops'+key+'Badge'),info=$('ops'+key+'Detail');
 badge.className='operation-badge '+kind;
 badge.textContent=title;
 info.textContent=detail;
}
function raceCount(data){
 if(Array.isArray(data?.races))return data.races.length;
 if(Array.isArray(data?.targets))return data.targets.length;
 if(Array.isArray(data?.monitorTargets))return data.monitorTargets.length;
 return null;
}
async function checkOperation(spec){
 operationStatus(spec.key,'pending','確認中','配信先に問い合わせています…');
 try{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  let response;
  try{response=await fetch(spec.path,{credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}})}
  finally{clearTimeout(timeout)}
  if(response.status===404){
   operationStatus(spec.key,'waiting','配信待ち',spec.label+'のデータは現在配信されていません（HTTP 404）。接続成功と断定はできません。');
   return 'waiting';
  }
  if(!response.ok){
   operationStatus(spec.key,'error','要確認','API応答 HTTP '+response.status+'。認証・接続先を確認してください。');
   return 'error';
  }
  const data=await response.json();
  const count=raceCount(data);
  if(count===null){
   operationStatus(spec.key,'unknown','形式未確認','APIは応答しましたが、件数を判定できない形式です。');
   return 'unknown';
  }
  if(count===0){
   operationStatus(spec.key,'waiting','データ待ち',spec.label+'APIは応答しています。現在の登録・配信件数は0件です。');
   return 'waiting';
  }
  operationStatus(spec.key,'ok','取得成功',spec.label+'APIから'+count+'レースのデータを確認しました。'+(spec.key==='Monitor'?'実際の定期実行は未確認です。':''));
  return 'ok';
 }catch(e){
  operationStatus(spec.key,'error','要確認',e?.name==='AbortError'?'応答が12秒以内に返りませんでした。':'通信またはJSON形式の確認に失敗しました。');
  return 'error';
 }
}
async function checkOperations(){
 $('operationOverview').textContent='接続状態を確認中…';
 const checks=await Promise.all(operationSpecs.map(checkOperation));
 const issues=checks.filter(v=>v==='error').length;
 $('operationOverview').textContent=issues
  ?'要確認：'+issues+'項目で接続エラーがあります。'
  :checks.every(v=>v==='ok')
   ?'3項目のAPIから取得成功。定期監視の稼働状況は未確認です。'
   :'API確認完了。配信待ち・未確認項目があります。';
 $('opsCheckedAt').textContent='最終確認：'+new Date().toLocaleString('ja-JP');
}
const initialWallet=()=>({season:1,balance:100000,grants:100000,totalStake:0,totalPaid:0,bankrupt:0,manualRestarts:0,seasonOver:false,raceClosed:false,demoRaceIndex:1,bets:[],seasons:[]});
// No user data is touched unless the admin explicitly confirms a destructive action.
$('clearProduction').onclick=async()=>{
 if(!enabled)return;
 $('clearProduction').disabled=true;
 try{
  await verify(); // fresh server authorization before deleting any local record
  const phrase='全記録削除';
  const entered=prompt('取り消せません。データ管理でバックアップを保存しましたか？実行する場合だけ「'+phrase+'」と入力してください。');
  if(entered!==phrase){$('clearProductionStatus').textContent='削除を中止しました';return}
  if(!confirm('この端末にある通常馬券・残高・精算履歴を初期化します。本当に削除しますか？'))return;
  localStorage.setItem(LIVE,JSON.stringify(initialWallet()));
  $('clearProductionStatus').textContent='この端末の通常データを初期化しました。アプリを開き直してください。';
  localState();
 }catch(e){$('clearProductionStatus').textContent='削除できませんでした：'+e.message}
 finally{$('clearProduction').disabled=!enabled}
};
let enabled=false;
function lock(){
 for(const id of ['switchMode','clearTest','clearProduction','recheck'])$(id).disabled=true;
}
$('switchMode').onclick=()=>{
 if(!enabled)return;
 const next=localStorage.getItem(MODE)==='test'?'production':'test';
 localStorage.setItem(MODE,next);
 localState();
};
$('clearTest').onclick=()=>{
 if(!enabled)return;
 if(!confirm('テスト専用データだけ初期化しますか？通常馬券・残高・精算履歴は変更しません。'))return;
 localStorage.removeItem(TEST);
 localState();
};
$('recheck').onclick=async()=>{
 lock();
 $('opsAuthBadge').className='operation-badge pending';$('opsAuthBadge').textContent='確認中';
 try{
  await verify();enabled=true;
  $('opsAuthBadge').className='operation-badge ok';$('opsAuthBadge').textContent='認証済み';
  $('opsAuthDetail').textContent='本人アカウントの管理権限を確認しました。';
  $('switchMode').disabled=false;$('clearTest').disabled=false;$('clearProduction').disabled=false;
  localState();
  await checkOperations();
 }catch(e){
  enabled=false;$('authStatus').textContent=e.message;$('storageStatus').textContent='権限を確認できません';
  $('opsAuthBadge').className='operation-badge error';$('opsAuthBadge').textContent='要確認';
  $('opsAuthDetail').textContent='管理者認証に失敗しました。';
  $('operationOverview').textContent='管理者認証を確認できません。';
 }finally{$('recheck').disabled=false}
};
lock();
$('recheck').onclick();
})();