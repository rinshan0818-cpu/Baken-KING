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
   {id:'general',name:'アプリ設定',hint:'通知・サウンド・アプリの更新',open:true},
   {id:'data',name:'データ管理',hint:'バックアップ・復元・シーズン',open:false},
   {id:'admin',name:'管理・接続設定',hint:'出馬表・結果取得・診断（管理者向け）',open:false}
  ];
  const groups={};
  for(const section of sections){
   const details=document.createElement('details');
   details.className='bk-settings-fold';details.open=section.open;
   const summary=document.createElement('summary');
   const label=document.createElement('span');label.className='bk-settings-fold-label';label.textContent=section.name;
   const hint=document.createElement('span');hint.className='bk-settings-fold-hint';hint.textContent=section.hint;
   summary.append(label,hint);
   const content=document.createElement('div');content.className='bk-settings-fold-content';
   details.append(summary,content);root.append(details);groups[section.id]=content;
  }
  const classify=node=>{
   const heading=node.querySelector?.('h2,h3')?.textContent?.trim()||'';
   if(/シーズン管理|データ.*管理|バックアップ/.test(heading))return 'data';
   if(node.id==='bkAccountSettings'||/アカウント|通知|サウンド|音|アプリの更新/.test(heading))return 'general';
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
  groups.general.prepend(modePanel);
  // The cloud profile is the only editable nickname. Preserve the old
  // local nickname key for backward compatibility, without a second editor.
  const nicknameHint=document.createElement('p');
  nicknameHint.className='muted';
  nicknameHint.textContent='表示名の変更は「アカウント・友達管理」に統一しました。ここでの入力は不要です。';
  groups.general.prepend(nicknameHint);

  // Account backup: show a safe transition path. Cloud write/read are NOT wired yet.
  // Reuse the app's existing, validated local backup and restore controls.
  const backupPanel=document.createElement('section');
  backupPanel.id='bkAccountBackupPanel';backupPanel.className='card bk-settings-item';
  const backupHeading=document.createElement('h3');backupHeading.textContent='アカウントとバックアップ';
  const backupInfo=document.createElement('p');backupInfo.className='muted';
  backupInfo.textContent='現在は端末保存です。ログインとクラウドの紐づけは準備中で、馬券・残高・精算履歴は自動送信されません。';
  const backupState=document.createElement('p');backupState.id='bkAccountBackupState';backupState.className='muted';
  if(testing)backupState.textContent='テストモード：アカウントへの登録対象外です。';
  else{
   try{
    const data=JSON.parse(localStorage.getItem('keiba-demo-v1')||'null');
    const count=Array.isArray(data?.bets)?data.bets.length:0;
    backupState.textContent='この端末：馬券 '+count+' 件 / クラウド：未接続';
   }catch{backupState.textContent='この端末：保存状況を確認できません / クラウド：未接続'}
  }
  const backupActions=document.createElement('div');backupActions.className='row';
  const localExport=document.createElement('button');localExport.type='button';localExport.className='alt';
  localExport.textContent='端末データをファイル保存';localExport.disabled=testing;
  localExport.onclick=()=>document.getElementById('backup')?.click();
  const localImport=document.createElement('button');localImport.type='button';localImport.className='outline';
  localImport.textContent='ファイルから復元';localImport.disabled=testing;
  localImport.onclick=()=>document.getElementById('restore')?.click();
  // Keep the read-only verification action next to export/restore.
  // Move, rather than clone, the already wired controls so event handlers
  // and the selected file stay on the same elements.
  const verifyButton=document.getElementById('bkVerifyBackup');
  const verifyFile=document.getElementById('bkVerifyBackupFile');
  const verifyResult=document.getElementById('bkVerifyBackupResult');
  if(verifyButton&&verifyFile&&verifyResult){
   verifyButton.textContent='保存ファイルを検証';
   verifyButton.disabled=testing;
   backupActions.append(verifyButton,verifyFile);
  }
  backupActions.prepend(localExport);
  backupActions.append(localImport);
  if(verifyResult)backupPanel.append(verifyResult);
  const cloudNote=document.createElement('p');cloudNote.className='muted';
  cloudNote.textContent='クラウド保存・復元：未提供。本人確認済みのログイン後、初回バックアップを明示的に承認する方式で追加予定です。既存の端末データは自動上書きしません。';
  backupPanel.append(backupHeading,backupInfo,backupState,backupActions,cloudNote);
  groups.general.append(backupPanel);

  const adminNotice=document.createElement('p');
  adminNotice.className='muted bk-admin-note';
  adminNotice.textContent='管理機能は整理して表示しているだけです。複数アカウント導入時に、認証とサーバー側のアクセス制限を追加します。';
  groups.admin.prepend(adminNotice);
  main.append(root);
  // If the legacy settings view was open when this script initialized,
  // preserve it rather than resetting the active tab.
  const settingsActive=document.querySelector('[data-nav="settings"]')?.classList.contains('active');
  if(settingsActive)root.hidden=false;
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();