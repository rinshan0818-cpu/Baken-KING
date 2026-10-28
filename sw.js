// Baken-KING: always try network first for navigations; no offline HTML caching.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{if(event.request.mode!=='navigate')return;event.respondWith(fetch(new Request(event.request,{cache:'no-store'})).catch(()=>fetch(event.request)));});
