'use strict';
(()=>{
const $=id=>document.getElementById(id);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const status=m=>{$('friendMessage').textContent=m};
let owner=null,registered=false;
async function req(method,path,body){
 const options={method,credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}};
 if(body){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body)}
 const r=await fetch('/api/friends/'+path,options),j=await r.json().catch(()=>({}));
 if(!r.ok||j.ok!==true)throw Error(r.status===401?'ログインが必要です':'友達APIに接続できません（'+r.status+'）');
 return j;
}
function row(label,actions=[]){const x=document.createElement('div');x.style.cssText='border-top:1px solid #e2ece7;padding:10px 0';const p=document.createElement('p');p.textContent=label;x.append(p);for(const [text,fn] of actions){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=text;b.onclick=()=>run(fn);x.append(b)}return x}
async function run(fn){try{await fn()}catch(e){status(e.message)}}
async function load(){
 const me=await req('GET','me');owner=me.user?.id;
 if(!UUID.test(owner||''))throw Error('友達IDを取得できません');
 registered=!!me.user?.profile;
 $('profileStatus').textContent=registered?'登録済み':'最初にプロフィールを登録してください';
 $('friendId').textContent='友達ID：'+owner;
 $('nickname').value=me.user.profile?.displayName||'プレイヤー';
 const c=await req('GET','connections');
 $('requests').replaceChildren(...(c.invitations||[]).map(x=>{
  const received=x.recipientId===owner;
  return row((received?'受信：':'送信：')+(received?x.senderId:x.recipientId),received?[['承認',async()=>{await req('POST','invitations/'+x.id+'/respond',{accepted:true});await load();status('承認しました')}],['拒否',async()=>{await req('POST','invitations/'+x.id+'/respond',{accepted:false});await load()}]]:[]);
 }));
 $('friends').replaceChildren(...(c.friends||[]).map(x=>row(x.displayName||x.id,[['成績を見る',async()=>{const s=(await req('GET','summary/'+x.id)).summary;const el=$('summaryResult');el.replaceChildren();if(!s){el.textContent='成績はまだ登録されていません';return}for(const [name,value] of [['収支',s.profitYen],['回収率',s.roiPercent],['購入額',s.stakeYen],['払戻額',s.returnedYen],['精算済み馬券数',s.settledTicketCount],['購入レース数',s.purchasedRaceCount],['的中レース数',s.hitRaceCount],['レース的中率',s.raceHitRatePercent],['最高払戻金',s.maxPayoutYen]]){const p=document.createElement('p');p.textContent=name+'：'+(value??'—');el.append(p)}}],['解除',async()=>{if(!confirm('友達との共有を解除しますか？'))return;await req('DELETE','friends/'+x.id);await load();$('summaryResult').textContent='';status('解除しました')}]])));
}
$('friendPanel').hidden=true;
window.bkBridgeFriends={
 show:()=>{ $('friendPanel').hidden=false;load().catch(e=>status(e.message)) },
 hide:()=>{ $('friendPanel').hidden=true;$('friends').replaceChildren();$('requests').replaceChildren();$('summaryResult').textContent='';owner=null;registered=false }
};
$('profile').onclick=()=>run(async()=>{const name=$('nickname').value.trim();if(name.length<1||name.length>16)throw Error('表示名は1〜16文字');await req('POST','profile',{displayName:name});await load();status('登録しました')});
$('copyFriendId').onclick=()=>run(async()=>{if(!registered)throw Error('先にプロフィールを登録してください');await navigator.clipboard.writeText(owner);status('友達IDをコピーしました')});
$('inviteFriend').onclick=()=>run(async()=>{const id=$('friendTarget').value.trim();if(!registered||!UUID.test(id)||id===owner)throw Error('友達IDを確認してください');await req('POST','invitations',{recipientId:id});await load();status('申請しました')});
$('refreshFriends').onclick=()=>run(async()=>{await load();status('更新しました')});
})();