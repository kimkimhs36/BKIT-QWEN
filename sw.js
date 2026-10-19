// Build injects versioned local assets. This worker never handles the old site or AI.
const CACHE = 'bkit-study-os-shell-fc875c351ba9';
const ROOT = new URL('./', self.location.href).href;
const PRECACHE = ["index.html","icon.svg","icon-192.png","icon-512.png","apple-touch-icon.png","manifest.webmanifest","landscapes/forest.jpg","assets/CompleteBackupPanel-Bcjev_Uz.js","assets/DigitalLibrary-D18qm1cH.js","assets/DigitalPaperRoom-C5jXXNVt.js","assets/DigitalPaperRoom-DxjXuaYr.css","assets/ExamPanel-Gj3UJupJ.js","assets/Juggernaut-BxW8U-WH.js","assets/Juggernaut-DswMY3Zf.css","assets/LearningEvidence-3rI9u7um.js","assets/MoreHub-DHy6rXjp.js","assets/MultiProblemWorkspace-C2zdRNCz.js","assets/ProblemReviewQueue-_hxdHff8.js","assets/ResourceLibrary-D98weqrk.js","assets/ResourcePaper-CjgzG0s3.js","assets/ResourceReviews-C8DkXcCr.js","assets/SleepGuard-Drs6pF4a.js","assets/dm-sans-latin-400-normal-BwCSEQnW.woff","assets/dm-sans-latin-400-normal-CW0RaeGs.woff2","assets/dm-sans-latin-500-normal-B9HHJjqV.woff2","assets/dm-sans-latin-500-normal-Dr3UlScf.woff","assets/dm-sans-latin-600-normal-Aqo67rzb.woff2","assets/dm-sans-latin-600-normal-BmdmIIQ2.woff","assets/dm-sans-latin-700-normal-CUSSCpQX.woff","assets/dm-sans-latin-700-normal-DvUfVpUG.woff2","assets/index-BK0fcFFg.js","assets/index-C41wrp_M.js","assets/index-C6xHUsg2.js","assets/index-DTbDMr_h.css","assets/paperStorage-IFgZpvaW.js","assets/pdf-CcZYcL52.js","assets/pdf.worker.min-ocdtAcA3.js","assets/pdf.worker.min-yatZIOMy.mjs","assets/photoVault-7u-SMmFn.js","assets/react-vendor-DVGOrvbP.js","assets/schema-vendor-DYuAzjeD.js"];
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
