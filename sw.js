// Baken-KING PWA: network-first navigation and opt-in settlement-ready Web Push.
// Only the service worker can display a push while the app is closed.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 if(event.request.mode!=='navigate')return;
 event.respondWith(fetch(new Request(event.request,{cache:'no-store'})).catch(()=>fetch(event.request)));
});
self.addEventListener('push',event=>{
 let data={};
 try{data=event.data?.json()||{}}catch{}
 // The server never sends win/loss information. Avoid rendering untrusted HTML.
 const venue=typeof data.venue==='string'&&/^(札幌|函館|福島|新潟|東京|中山|中京|京都|阪神|小倉)$/.test(data.venue)?data.venue:'';
 const number=Number.isInteger(data.raceNumber)&&data.raceNumber>=1&&data.raceNumber<=12?data.raceNumber:0;
 const text=venue&&number?venue+number+'Rの精算準備ができました！':'馬券の精算準備ができました！';
 const tag=typeof data.date==='string'&&/^20\d\d-\d\d-\d\d$/.test(data.date)?'settlement-'+data.date+'-'+venue+'-'+number:'settlement-ready';
 event.waitUntil(self.registration.showNotification('Baken-KING',{
   body:text+' タップして馬券を確認しましょう 🏇',
   icon:'./baken_king_icon_512.png',
   badge:'./icon.svg',
   tag,renotify:false,
   data:{url:new URL('./?open=settlement',self.registration.scope).href},
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const url=event.notification.data?.url||new URL('./?open=settlement',self.registration.scope).href;
 event.waitUntil((async()=>{
  const clientsList=await clients.matchAll({type:'window',includeUncontrolled:true});
  const scope=new URL(self.registration.scope);
  for(const client of clientsList){
   const current=new URL(client.url);
   if(current.origin===scope.origin&&current.pathname.startsWith(scope.pathname)){
    await client.focus();
    client.postMessage({type:'BAKEN_OPEN_SETTLEMENT_FROM_NOTIFICATION'});
    return;
   }
  }
  await clients.openWindow(url);
 })());
});
