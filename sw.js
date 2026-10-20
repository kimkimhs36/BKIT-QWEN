// Build injects versioned local assets. This worker never handles the old site or AI.
const ROOT = new URL('./', self.location.href).href;
// CacheStorage is shared by every worker on the origin. A preview must never
// evict the production shell (or another preview's downloaded PDF assets).
const PREFIX = 'bkit-study-os@' + new URL(ROOT).pathname + '@shell-';
const CACHE = PREFIX + '5a3cb73fa13e';
const PRECACHE = ["index.html","fonts/PretendardVariable.woff2","icon.svg","icon-192.png","icon-512.png","apple-touch-icon.png","manifest.webmanifest","landscapes/forest.jpg","assets/AIZone-CcDDBXyb.css","assets/AIZone-D2zNadBi.js","assets/CompleteBackupPanel-CqWi6fqH.js","assets/DigitalLibrary-B2YqGsVM.js","assets/DigitalPaperRoom-DxjXuaYr.css","assets/DigitalPaperRoom-RbmsQJ-R.js","assets/ExamPanel-BfFE--Hj.js","assets/GlobalSearch-D4JT-lEA.js","assets/GlobalSearch-hufsr9G2.css","assets/LearningEvidence-B2CQ_cQr.js","assets/MoreHub-CMFSzCXZ.js","assets/MultiProblemWorkspace-DoPoulKV.js","assets/ProblemReviewQueue-DkSdLkER.js","assets/ResourceLibrary-DNawaxhM.js","assets/ResourcePaper-COGbSNkW.js","assets/ResourceReviews-bucVrXIB.js","assets/SleepGuard-C4VyYu8Y.js","assets/StudyDirectory-BRPC-kFD.js","assets/StudyDirectory-BT6Rfb9D.css","assets/aiZoneData-DBwAxoLJ.js","assets/dm-sans-latin-400-normal-BwCSEQnW.woff","assets/dm-sans-latin-400-normal-CW0RaeGs.woff2","assets/dm-sans-latin-500-normal-B9HHJjqV.woff2","assets/dm-sans-latin-500-normal-Dr3UlScf.woff","assets/dm-sans-latin-600-normal-Aqo67rzb.woff2","assets/dm-sans-latin-600-normal-BmdmIIQ2.woff","assets/dm-sans-latin-700-normal-CUSSCpQX.woff","assets/dm-sans-latin-700-normal-DvUfVpUG.woff2","assets/engine-Cq0KfGFo.js","assets/index-Bsxmtg07.js","assets/index-C5kHwvUg.js","assets/index-C6xHUsg2.js","assets/index-Cw8mp5tE.css","assets/library-big-BiaWp_qN.js","assets/paperPdf-wky6Ihq5.js","assets/pdf-CcZYcL52.js","assets/pdf.worker.min-ocdtAcA3.js","assets/pdf.worker.min-yatZIOMy.mjs","assets/photoVault-7u-SMmFn.js","assets/react-vendor-DENrKhsk.js","assets/schema-vendor-DYuAzjeD.js","assets/search-D4PlPUTL.js","assets/star-DYys621z.js","assets/studySites-DlZ8Gwdk.js"];
self.addEventListener('install', (e) =>
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE.map((path) => new URL(path, ROOT).href))),
    // Wait until existing clients close: old screens may still lazy-load
    // their version's PDF/ink chunks. Activating early would delete them.
  ),
);
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith(PREFIX) && k !== CACHE)
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
