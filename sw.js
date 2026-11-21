// PWA recovery v1.75b; retain origin storage, wallet, bets and friend data.
// Baken-KING PWA refresh fix: network-first navigation and opt-in settlement-ready Web Push.
// Only the service worker can display a push while the app is closed.
const BK_GACHA_IMAGE_CACHE='baken-win5-gacha-images-v1';
const BK_GACHA_IMAGE_FILES=['./assets/badges/collection-hero-hq.webp','./assets/badges/collection-hero.webp'];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  // Installation must succeed even if an image is temporarily unavailable.
  try{const cache=await caches.open(BK_GACHA_IMAGE_CACHE);await Promise.allSettled(BK_GACHA_IMAGE_FILES.map(file=>cache.add(file)))}catch(e){console.warn('ガチャ画像の先読み:',e)}
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 await self.clients.claim();
 // Tell any open legacy app that a new worker has activated.
 const pages=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 for(const page of pages){
  try{
   const url=new URL(page.url);
   const scope=new URL(self.registration.scope);
   if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))continue;
   if(url.searchParams.has('bk-recovered-v175b'))continue;
   const target=new URL('./index.html',scope);
   target.searchParams.set('bk-recovered-v175b','1');
   target.searchParams.set('t',String(Date.now()));
   await page.navigate(target.href);
  }catch(e){console.warn('PWA recovery deferred',e)}
 }
})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 const scope=new URL(self.registration.scope);
 const isLocal=url.origin===scope.origin&&url.pathname.startsWith(scope.pathname);
 // Never serve old application/version documents from any service-worker cache.
 if(isLocal&&(/\/(?:app-version\.json|index\.html|sw\.js)$/.test(url.pathname)||url.pathname===scope.pathname)){
  event.respondWith((async()=>{
   const target=new URL(event.request.url);
   target.searchParams.set('bk-network-recovery','v175b');
   target.searchParams.set('t',String(Date.now()));
   try{
    const response=await fetch(new Request(target.href,{cache:'reload',credentials:'same-origin',redirect:'follow'}));
    if(response.ok)return response;
   }catch(e){}
   return fetch(event.request);
  })());
  return;
 }
 const localImage=isLocal&&BK_GACHA_IMAGE_FILES.some(file=>url.pathname===new URL(file,scope).pathname);
 if(localImage){
  event.respondWith((async()=>{
   const cache=await caches.open(BK_GACHA_IMAGE_CACHE);
   const key=new Request(url.origin+url.pathname);
   const cached=await cache.match(key);
   if(cached)return cached;
   const response=await fetch(event.request);
   if(response.ok)await cache.put(key,response.clone());
   return response;
  })());
 }
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
