/* Settings surface v5.31: presentation only, no auth or data changes. */
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
   if(/通知|サウンド|音|アプリの更新/.test(heading))return 'general';
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
   if(node.matches('section.card'))node.classList.add('bk-settings-item');
   groups[group].append(node);
  }
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