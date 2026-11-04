/* Settings surface v5.35: presentation only, no auth or data changes. */
(()=>{
 'use strict';
 function init(){
  const main=document.querySelector('main.wrap');
  if(!main||main.querySelector('#bkSettingsSurface'))return;
  const original=[...main.children].filter(n=>n.matches?.('[data-tab="settings"]'));
  if(!original.length)return;
  const root=document.createElement('div');
  root.id='bkSettingsSurface';root.dataset.tab='settings';root.hidden=true;
  root.className='bk-settings-surface';
  root.innerHTML='<div class="bk-settings-heading"><div><h2>設定</h2><p class="muted">アプリの設定とデータ管理</p></div></div>';
  const sections=[
   {id:'account',name:'アカウント・友達',hint:'ログイン・表示名・友達登録・成績共有',open:false},
   {id:'general',name:'通知・アプリ',hint:'プッシュ通知・共通チャイム・更新',open:true},
   {id:'data',name:'データ管理',hint:'バックアップ・復元・履歴・シーズン',open:false},
   {id:'admin',name:'管理・接続設定',hint:'出馬表・結果取得・診断（管理者向け）',open:false}
  ];
  const groups={};
  let adminFold=null;
  for(const section of sections){
   const details=document.createElement('details');
   details.className='bk-settings-fold';details.open=section.open;
   if(section.id==='admin'){adminFold=details;details.hidden=true;}
   const summary=document.createElement('summary');
   const label=document.createElement('span');label.className='bk-settings-fold-label';label.textContent=section.name;
   const hint=document.createElement('span');hint.className='bk-settings-fold-hint';hint.textContent=section.hint;
   summary.append(label,hint);
   const content=document.createElement('div');content.className='bk-settings-fold-content';
   details.append(summary,content);root.append(details);groups[section.id]=content;
  }
  const classify=node=>{
   const heading=node.querySelector?.('h2,h3')?.textContent?.trim()||'';
   if(node.id==='bkAccountSettings'||/アカウント|友達|プロフィール/.test(heading))return 'account';
   if(/シーズン管理|データ.*管理|バックアップ|履歴の出力/.test(heading))return 'data';
   if(/プッシュ通知|通知|サウンド|チャイム|アプリの更新/.test(heading))return 'general';
   return 'admin';
  };
  const moved=[];
  for(const node of original){
   if(node.matches('p.footer')){moved.push({node,group:'data'});continue}
   const nested=[...node.children].filter(c=>c.matches?.('section.card,div.card'));
   for(const child of nested)moved.push({node:child,group:classify(child)});
   moved.push({node,group:classify(node)});
  }
  // All operational DOM nodes are moved unchanged; handlers, local storage,
  // and monitoring functions remain the same.
  for(const {node,group} of moved){
   node.removeAttribute('data-tab');
   // Legacy showTab('home') marks each settings section hidden at boot.
   // Once inside the new settings root, that old hidden flag must be cleared.
   node.hidden=false;
   if(node.matches('section.card'))node.classList.add('bk-settings-item');
   groups[group].append(node);
  }
  // Beta mode selector: never copy or overwrite production wallet data.
  const modeKey='baken-king-mode-v1';
  const testStateKey='baken-king-test-state-v1';
  const testing=localStorage.getItem(modeKey)==='test';
  const modePanel=document.createElement('section');
  modePanel.className='bk-mode-panel';
  const modeTitle=document.createElement('h3');modeTitle.textContent='動作テスト';
  const modeCurrent=document.createElement('p');modeCurrent.className='bk-mode-current';
  modeCurrent.textContent=testing?'現在：テストモード（専用の仮想データ）':'現在：本番モード（通常の馬券・残高）';
  const actions=document.createElement('div');actions.className='bk-mode-buttons';
  const modeSwitch=document.createElement('button');modeSwitch.type='button';
  modeSwitch.textContent=testing?'本番モードに戻す':'テストモードに切り替え';
  modeSwitch.onclick=()=>{
   try{
    localStorage.setItem(modeKey,testing?'production':'test');
    if(localStorage.getItem(modeKey)!==(testing?'production':'test'))throw Error('保存できませんでした');
    location.reload();
   }catch(e){window.alert('モード切替に失敗しました：'+e.message)}
  };
  actions.append(modeSwitch);
  if(testing){
   const create=document.createElement('button');create.type='button';create.className='outline';
   create.textContent='テスト馬券を4枚作成';
   create.onclick=()=>{if(typeof window.BakenCreateDemoTickets==='function')window.BakenCreateDemoTickets();else alert('テスト機能を準備できませんでした')};
   const reset=document.createElement('button');reset.type='button';reset.className='outline';
   reset.textContent='テストデータだけ初期化';
   reset.onclick=()=>{
    if(!confirm('テスト専用の馬券・残高・履歴だけ初期化しますか？本番データは変更されません。'))return;
    try{localStorage.removeItem(testStateKey);location.reload()}catch(e){alert('初期化に失敗しました：'+e.message)}
   };
   actions.append(create,reset);
  }
  const modeNote=document.createElement('p');modeNote.className='bk-mode-note';
  modeNote.textContent='本番とテストは別々に端末内保存します。テスト中は本番の結果監視・プッシュ通知処理を起動せず、テスト馬券もサーバーへ送信しません。モード切替後は自動で画面を再読み込みします。';
  modePanel.append(modeTitle,modeCurrent,actions,modeNote);
  // Development tools remain mounted for compatibility but are not shown
  // in the public settings surface; the owner has a gated /api/auth/admin page.
  groups.admin.prepend(modePanel);
  // Existing nickname remains controlled by the account profile, never by a second local field.
  const nicknameHint=document.createElement('p');
  nicknameHint.className='muted';
  nicknameHint.textContent='表示名の変更は「アカウント・友達管理」に統一しました。ここでの入力は不要です。';
  groups.account.append(nicknameHint);
  // Keep one set of original backup controls and move the elements, never clone them.
  // The original handlers are retained, including backup verification and restore.
  const season=root.querySelector('#newSeason')?.closest('section.card');
  const originalBackup=root.querySelector('#backup');
  const originalRestore=root.querySelector('#restore')?.closest('label');
  const verifyButton=root.querySelector('#bkVerifyBackup');
  const verifyFile=root.querySelector('#bkVerifyBackupFile');
  const verifyResult=root.querySelector('#bkVerifyBackupResult');
  const csv=root.querySelector('#csv');
  const diagnostics=root.querySelector('#bkCopyNavLog');
  if(season&&originalBackup&&originalRestore&&verifyButton&&verifyFile&&verifyResult){
   const backupPanel=document.createElement('section');
   backupPanel.id='bkSingleBackupPanel';
   backupPanel.className='card bk-settings-item';
   const heading=document.createElement('h3');
   heading.textContent='バックアップ・復元';
   const explanation=document.createElement('p');
   explanation.className='muted';
   explanation.textContent='馬券・残高・精算履歴はこの端末内に保存されます。機種変更や端末データの消去に備えて、バックアップファイルを保存してください。';
   const controls=document.createElement('div');
   controls.className='row bk-single-backup-actions';
   originalBackup.textContent='バックアップを保存';
   verifyButton.textContent='保存ファイルを検証';
   controls.append(originalBackup,originalRestore,verifyButton,verifyFile);
   const state=document.createElement('p');
   state.className='muted';
   state.textContent='バックアップの保存・検証・復元は、ここから操作できます。クラウドへの自動保存・復元は行いません。';
   backupPanel.append(heading,explanation,controls,verifyResult,state);
   groups.data.prepend(backupPanel);
  }
  // History export belongs with saved data, not the season reset controls.
  if(csv){
   const exportPanel=document.createElement('section');
   exportPanel.id='bkHistoryExportPanel';
   exportPanel.className='card bk-settings-item';
   const title=document.createElement('h3');title.textContent='購入履歴の出力';
   exportPanel.append(title,csv);
   groups.data.append(exportPanel);
  }
  // Debug logs are administrator-only. Never show a diagnostic button to friends.
  if(diagnostics)groups.admin.append(diagnostics);
  // A season is distinct from backups: leave original reset/new-season handlers untouched.
  if(season){
   const title=season.querySelector('h2');
   if(title)title.textContent='シーズン・記録管理';
  }
  const adminNotice=document.createElement('p');
  adminNotice.className='muted bk-admin-note';
  adminNotice.textContent='管理用の診断項目です。通常ユーザーには表示されません。';
  groups.admin.prepend(adminNotice);
  main.append(root);
  // Only the signed-in, server-authorized owner can see the management link.
  if(location.hostname==='baken-king-app-next.vercel.app'){
   const wrap=document.createElement('p');
   wrap.id='bkAdminOwnerLink';wrap.hidden=true;
   const link=document.createElement('a');
   link.href='/api/auth/admin';link.className='official';
   link.textContent='管理者ページを開く';
   wrap.append(link);
   groups.account.prepend(wrap);
   let sequence=0;
   const refreshAdmin=async()=>{
    const current=++sequence;
    wrap.hidden=true;
    try{
     const r=await fetch('/api/auth/admin/status',{credentials:'same-origin',cache:'no-store'});
     if(!r.ok||current!==sequence)return;
     const data=await r.json();
     if(current===sequence&&data.ok===true&&data.admin===true)wrap.hidden=false;
    }catch{}
   };
   window.addEventListener('baken:account-changed',refreshAdmin);
   refreshAdmin();
  }
  // If the legacy settings view was open when this script initialized,
  // preserve it rather than resetting the active tab.
  const settingsActive=document.querySelector('[data-nav="settings"]')?.classList.contains('active');
  if(settingsActive)root.hidden=false;
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();