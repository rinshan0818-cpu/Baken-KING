'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('app-next-cloud.js','utf8');
const OWNER='96f514a1-72c4-4ba5-94bb-b96dc44a846a';
const PEER='2e7c1799-caa9-4b4e-a197-3a15fccff094';
const NEXT='fa771bea-345b-4c80-81a3-2a8c05e839cb';
const ZERO={stakeYen:0,returnedYen:0,profitYen:0,roiPercent:null,
 settledTicketCount:0,purchasedRaceCount:0,hitRaceCount:0,settledRaceCount:0,maxPayoutYen:null,raceHitRatePercent:null};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function settle(){for(let i=0;i<12;i++)await tick()}
function scenario({saved=new Map(),getSession=()=>({user:{id:OWNER,emailVerified:true,email:'test@example.invalid'}}),
 connections=()=>({ok:true,friends:[{id:PEER,displayName:'友達'}]}),
 summary=()=>({ok:true,summary:ZERO})}={}){
 const store=new Map(saved);
 store.set('keiba-demo-v1',JSON.stringify({bets:[]}));
 let stateNode=null,events={},requests=[],renders=0;
 const el=()=>({textContent:'',hidden:false,disabled:false,value:'',append(){},querySelectorAll(){return []},setAttribute(){},after(){}});
 const ui={bkAccountSettings:el(),bkFriendSyncNow:el(),bkFriendSyncStatus:el(),bkNextLogin:el(),bkNextLogout:el(),bkNextEmail:el(),bkNextPassword:el(),bkNextAccountStatus:el(),bkNextRefresh:el(),bkNextNickname:el(),bkNextSaveName:el()};
 let currentGetSession=getSession, currentConnections=connections, currentSummary=summary;
 const document={getElementById:id=>ui[id]||null,querySelector:selector=>{
  if(selector==='.bk-friend-compare')return {querySelector:()=>({after(node){stateNode=node}})};
  return null;
 },createElement:()=>({textContent:'',setAttribute(){},className:'',id:''}),visibilityState:'visible',
 addEventListener:(name,fn)=>events[name]=fn};
 const fetch=async(path,opts)=>{
  requests.push({path,method:opts.method});
  let payload;
  if(path==='/api/auth/get-session')payload=currentGetSession();
  else if(path==='/api/auth/friends/me')payload={ok:true,user:{profile:{displayName:'Player'}}};
  else if(path==='/api/auth/friends/connections')payload=currentConnections();
  else if(path==='/api/auth/friends/summary/'+PEER)payload=currentSummary();
  else if(path==='/api/auth/friends/summary'&&opts.method==='POST')payload={ok:true};
  else throw Error('Unexpected route '+path);
  if(payload?.http) return {ok:false,status:payload.http,async json(){return {error:'Unauthenticated'}}};
  if(payload?.throw)throw Error('Offline');
  return {ok:true,status:200,async json(){return payload}};
 };
 const sandbox={window:{addEventListener:(name,fn)=>events[name]=fn,dispatchEvent(){},BakenCloudNickname:null},
 document,location:{hostname:'baken-king-app-next.vercel.app'},localStorage:{
 getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)
 },fetch,Date,Event:class Event{},setInterval(){},bkScoreValid:m=>m&&m.profit===m.paid-m.stake,
 bkRenderFriendCompare(){renders++},bkFriendCloudSnapshot(){return{stakeYen:0,returnedYen:0,settledTicketCount:0,purchasedRaceCount:0,hitRaceCount:0,settledRaceCount:0,maxPayoutYen:null}}};
 vm.runInNewContext(source,sandbox);
 return {store,events,requests,ui,get state(){return stateNode?.textContent||''},
 setSession(fn){currentGetSession=fn},setConnections(fn){currentConnections=fn},setSummary(fn){currentSummary=fn},
 get renders(){return renders}};
}
test('successful friend fetch persists owner-scoped last-sync time; 401 retains it but requests re-login',async()=>{
 const t=scenario();await settle();
 assert.equal(t.store.get('baken-king-friend-score-owner-v1'),OWNER);
 assert.equal(t.store.get('baken-king-friend-score-friend-id-v1'),PEER);
 assert(Number(t.store.get('baken-next-friend-fetched:'+OWNER))>0);
 assert.match(t.state,/最終同期/);
 const old=t.store.get('baken-king-friend-score-v1');
 t.setSession(()=>({http:401}));t.events.focus();await settle();
 assert.equal(t.store.get('baken-king-friend-score-v1'),old);
 assert.match(t.state,/再ログインが必要/);
 assert.match(t.state,/前回取得した成績を表示中/);
});
test('temporary network failure keeps cached score and marks it stale',async()=>{
 const t=scenario();await settle();
 const old=t.store.get('baken-king-friend-score-v1');
 t.setConnections(()=>({throw:true}));t.events.focus();await settle();
 assert.equal(t.store.get('baken-king-friend-score-v1'),old);
 assert.match(t.state,/通信エラー/);
 assert.match(t.state,/最終同期/);
});
test('confirmed no friends removes stale score; identity switch never displays previous owner',async()=>{
 const t=scenario();await settle();
 t.setConnections(()=>({ok:true,friends:[]}));t.events.focus();await settle();
 assert.equal(t.store.has('baken-king-friend-score-v1'),false);
 assert.match(t.state,/友達登録はありません/);
 const u=scenario();await settle();
 u.setSession(()=>({user:{id:NEXT,emailVerified:true,email:'other@example.invalid'}}));
 u.setConnections(()=>({ok:true,friends:[]}));u.events.focus();await settle();
 assert.equal(u.store.has('baken-king-friend-score-v1'),false);
 assert.equal(u.store.has('baken-king-friend-score-owner-v1'),false);
});
test('a verified missing summary is explicitly unregistered, not a connection error',async()=>{
 const t=scenario({summary:()=>({ok:true,summary:null})});await settle();
 assert.match(t.state,/未登録/);
 assert.doesNotMatch(t.state,/通信エラー/);
});
test('v1.04 markers and no private wager transfer',()=>{
 const index=fs.readFileSync('index.html','utf8');
 for(const marker of ['<title>Baken-KING | v1.04</title>','現在 v1.04',"const APP_VERSION='v1.04';"])assert(index.includes(marker));
 assert.match(source,/const interval=15\*60\*1000/);
 assert.match(source,/if\(busy\|\|!user\|\|localStorage.getItem\('baken-king-mode-v1'\)==='test'\)return/);
 assert.match(source,/await friends\('POST','summary',\{metrics\}\)/);
 assert.doesNotMatch(source,/confirm\(/);
});
