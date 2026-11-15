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
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(url.origin===self.location.origin&&url.pathname.endsWith('/app-version.json')){event.respondWith(fetch(new Request(event.request,{cache:'no-store'})));return;}
 const localImage=url.origin===self.location.origin&&BK_GACHA_IMAGE_FILES.some(file=>url.pathname===new URL(file,self.registration.scope).pathname);
 if(localImage){
  event.respondWith((async()=>{
   const cache=await caches.open(BK_GACHA_IMAGE_CACHE);
   const key=new Request(url.origin+url.pathname);
   const cached=await cache.match(key);
   if(cached)return cached;
   const response=await fetch(event.request);
   if(response.ok)await cache.put(key,response.clone());
   return response;
  })());return;
 }
 if(event.request.mode!=='navigate')return;
 // Existing iOS home-screen installs launch the manifest's original './' URL.
 // Resolve that entry point to a versioned HTML URL without changing scope or storage.
 const scope=new URL(self.registration.scope);
 if(url.origin===scope.origin&&url.pathname===scope.pathname&&!url.search){
  event.respondWith((async()=>{
   const target=new URL('./index.html',scope);
   target.searchParams.set('bk-sw-refresh',String(Date.now()));
   try{
    const response=await fetch(new Request(target.href,{cache:'no-store'}));
    if(response.ok)return response;
   }catch(e){}
   return fetch(new Request(event.request,{cache:'no-store'}));
  })());
  return;
 }
 // Always use a fresh URL for navigations, including update-button reloads.
 // Keep the same origin/scope so existing local data and installed icons survive.
 event.respondWith((async()=>{
  const fresh=new URL(event.request.url);
  fresh.searchParams.set('bk-sw-refresh',String(Date.now()));
  try{
   const response=await fetch(new Request(fresh.href,{cache:'no-store',credentials:'same-origin'}));
   if(response.ok)return response;
  }catch(e){}
  return fetch(new Request(event.request,{cache:'no-store'}));
 })());
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
