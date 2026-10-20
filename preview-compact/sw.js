// Build injects versioned local assets. This worker never handles the old site or AI.
const CACHE = 'bkit-study-os-shell-97b76c17c354';
const ROOT = new URL('./', self.location.href).href;
const PRECACHE = ["index.html","icon.svg","icon-192.png","icon-512.png","apple-touch-icon.png","manifest.webmanifest","landscapes/forest.jpg","assets/AIZone-BjJSMZUR.js","assets/AIZone-CcDDBXyb.css","assets/CompleteBackupPanel-DaaylAai.js","assets/DigitalLibrary-CZ7sOC2n.js","assets/DigitalPaperRoom--x1SUYvd.js","assets/DigitalPaperRoom-DxjXuaYr.css","assets/ExamPanel-BqijBKkZ.js","assets/GlobalSearch-hXSX5XEB.js","assets/GlobalSearch-hufsr9G2.css","assets/LearningEvidence-CORwY_kE.js","assets/MoreHub-CytkzpNO.js","assets/MultiProblemWorkspace-BDIQHhAB.js","assets/ProblemReviewQueue-DfDyHWZ_.js","assets/ResourceLibrary-BCRNtEaD.js","assets/ResourcePaper-BwLjVqN_.js","assets/ResourceReviews-C-IR1a4u.js","assets/SleepGuard-DfqvfvAi.js","assets/StudyDirectory-BEQaQLSx.js","assets/StudyDirectory-BT6Rfb9D.css","assets/aiZoneData-DBwAxoLJ.js","assets/dm-sans-latin-400-normal-BwCSEQnW.woff","assets/dm-sans-latin-400-normal-CW0RaeGs.woff2","assets/dm-sans-latin-500-normal-B9HHJjqV.woff2","assets/dm-sans-latin-500-normal-Dr3UlScf.woff","assets/dm-sans-latin-600-normal-Aqo67rzb.woff2","assets/dm-sans-latin-600-normal-BmdmIIQ2.woff","assets/dm-sans-latin-700-normal-CUSSCpQX.woff","assets/dm-sans-latin-700-normal-DvUfVpUG.woff2","assets/engine-CmFK4Jqz.js","assets/index-B-loM1nH.js","assets/index-B2XgUqGu.css","assets/index-C5kHwvUg.js","assets/index-C6xHUsg2.js","assets/library-big-1Y1y_PG3.js","assets/paperPdf-wXszV_5F.js","assets/pdf-CcZYcL52.js","assets/pdf.worker.min-TsRLQsWZ.js","assets/pdf.worker.min-yatZIOMy.mjs","assets/photoVault-7u-SMmFn.js","assets/react-vendor-DENrKhsk.js","assets/schema-vendor-DYuAzjeD.js","assets/search-DvXLo6dQ.js","assets/star-DY9skW7w.js","assets/studySites-DlZ8Gwdk.js"];
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
