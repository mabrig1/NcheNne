// Offline caching is limited to static fictional demo assets; never cache API responses.
const CACHE="nchenne-synthetic-shell-v07";
const STATIC=["./","./index.html","./icon.svg","./manifest.webmanifest","./demo-inspector.js","./demo-watchlist.js"];
self.addEventListener("install",e=>{
 e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
 e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
 const url=new URL(e.request.url);
 const path=new URL("./",self.registration.scope).pathname;
 if(!url.pathname.startsWith(path))return;
 if(e.request.method!=="GET"||url.origin!==location.origin||url.pathname.startsWith(path+"api/"))return;
 e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{
   if(res.ok&&STATIC.some(item=>new URL(item,self.registration.scope).pathname===url.pathname)&&!res.redirected){
     caches.open(CACHE).then(c=>c.put(e.request,res.clone()));
   }
   return res;
 })));
});
