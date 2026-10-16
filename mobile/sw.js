'use strict';
const CACHE='top-field-pocket-shell-0.1.1';
const FILES=['./','index.html','mobile.css','mobile.js','offline-data.js','punch-model.js','manifest.webmanifest','icon.svg','project-access.js','project-access.css'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('top-field-pocket-shell-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
// Only this preview's static files are cached. No API responses or credentials.
self.addEventListener('fetch',e=>{const u=new URL(e.request.url),base=new URL('./',self.location.href);if(e.request.method!=='GET'||u.origin!==base.origin||!u.pathname.startsWith(base.pathname))return;const path=u.pathname.slice(base.pathname.length);if(!['',...FILES.filter(p=>p!=='./')].includes(path))return;e.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(new URL(path||'./',base).href))||fetch(e.request)))});
