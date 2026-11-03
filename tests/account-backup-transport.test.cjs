const assert=require('node:assert/strict');
const {create}=require('../account-backup-transport.js');
(async()=>{
 const calls=[];
 const transport=create({apiOrigin:'https://sharing.example.test',getToken:async()=> 'verified.jwt.token',
  fetcher:async(url,options)=>{
   calls.push({url,options});
   return {ok:true,status:200,json:async()=>({ok:true,revision:1,backup:null})};
  }});
 assert.equal((await transport.read()).ok,true);
 assert.equal((await transport.write({backup:{format:'test'},expectedRevision:null})).revision,1);
 assert.equal((await transport.write({backup:{format:'test'},expectedRevision:1})).revision,1);
 assert.deepEqual(calls.map(x=>x.options.method),['GET','POST','PUT']);
 assert(calls.every(x=>x.options.headers.Authorization==='Bearer verified.jwt.token'));
 assert(calls.every(x=>x.options.credentials==='omit'&&x.options.cache==='no-store'));
 assert(calls.every(x=>x.url==='https://sharing.example.test/api/account/backup'));
 await assert.rejects(transport.write({backup:{},expectedRevision:0}),/更新番号/);
 assert.throws(()=>create({apiOrigin:'http://sharing.example.test',getToken:async()=>''}),/Invalid API origin/);
 const blocked=create({apiOrigin:'https://sharing.example.test',getToken:async()=>null,
  fetcher:async()=>{throw Error('Must not send request')}});
 await assert.rejects(blocked.read(),/ログインが必要/);
 const conflict=create({apiOrigin:'https://sharing.example.test',getToken:async()=> 'token',
  fetcher:async()=>({status:409,ok:false,json:async()=>({error:'Backup conflict'})})});
 await assert.rejects(conflict.write({backup:{},expectedRevision:1}),e=>e.code==='CONFLICT');
 console.log('PASS: JWT backup transport fails closed and distinguishes create/update conflicts');
})().catch(e=>{console.error(e);process.exitCode=1});
