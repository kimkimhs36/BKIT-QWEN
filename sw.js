// Build injects versioned local assets. This worker never handles the old site or AI.
const CACHE = 'bkit-study-os-shell-be66120e6f04';
const ROOT = new URL('./', self.location.href).href;
const PRECACHE = ["index.html","icon.svg","icon-192.png","icon-512.png","apple-touch-icon.png","manifest.webmanifest","assets/dm-sans-latin-400-normal-BwCSEQnW.woff","assets/dm-sans-latin-400-normal-CW0RaeGs.woff2","assets/dm-sans-latin-500-normal-B9HHJjqV.woff2","assets/dm-sans-latin-500-normal-Dr3UlScf.woff","assets/dm-sans-latin-600-normal-Aqo67rzb.woff2","assets/dm-sans-latin-600-normal-BmdmIIQ2.woff","assets/dm-sans-latin-700-normal-CUSSCpQX.woff","assets/dm-sans-latin-700-normal-DvUfVpUG.woff2","assets/dm-sans-latin-ext-400-normal-BjWJ59Pq.woff","assets/dm-sans-latin-ext-400-normal-BtiwyxMk.woff2","assets/dm-sans-latin-ext-500-normal-BJfUCQsA.woff2","assets/dm-sans-latin-ext-500-normal-DR84L5F-.woff","assets/dm-sans-latin-ext-600-normal-4vooXBpG.woff2","assets/dm-sans-latin-ext-600-normal-DRtaDpgU.woff","assets/dm-sans-latin-ext-700-normal-BLI3TTWz.woff","assets/dm-sans-latin-ext-700-normal-CJIcxD6K.woff2","assets/index-DqZUm5Fr.js","assets/index-IVzzcjtq.css"];
self.addEventListener('install', (e) =>
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE.map((path) => new URL(path, ROOT).href)))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('bkit-study-os-shell-') && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (
    e.request.method !== 'GET' ||
    u.origin !== self.location.origin ||
    !u.href.startsWith(ROOT) ||
    u.pathname.includes('/api/')
  )
    return;
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (e.request.mode !== 'navigate') {
        const saved = await cache.match(e.request, { ignoreVary: true });
        if (saved) return saved;
      }
      try {
        const response = await fetch(e.request);
        if (response.ok) e.waitUntil(cache.put(e.request, response.clone()));
        return response;
      } catch {
        const saved = await cache.match(e.request, { ignoreVary: true });
        if (saved) return saved;
        if (e.request.mode === 'navigate')
          return (await cache.match(new URL('index.html', ROOT).href)) || Response.error();
        return Response.error();
      }
    })(),
  );
});
