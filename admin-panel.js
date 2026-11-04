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
 try{await verify();enabled=true;$('switchMode').disabled=false;$('clearTest').disabled=false;$('clearProduction').disabled=false;$('recheck').disabled=false;localState()}
 catch(e){enabled=false;$('authStatus').textContent=e.message;$('storageStatus').textContent='権限を確認できません';}
};
lock();
$('recheck').onclick();
})();