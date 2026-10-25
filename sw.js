// Build injects versioned local assets. This worker never handles the old site or AI.
const ROOT = new URL('./', self.location.href).href;
// CacheStorage is shared by every worker on the origin. A preview must never
// evict the production shell (or another preview's downloaded PDF assets).
const PREFIX = 'bkit-study-os@' + new URL(ROOT).pathname + '@shell-';
const CACHE = PREFIX + '795b48ef1651';
const PRECACHE = ["index.html","fonts/PretendardVariable.woff2","icon.svg","icon-192.png","icon-512.png","apple-touch-icon.png","manifest.webmanifest","landscapes/forest.jpg","assets/AIZone-CcDDBXyb.css","assets/AIZone-DpooHaVi.js","assets/AwakeAssist-032_9aRg.css","assets/AwakeAssist-DlJ0EUjT.js","assets/CompleteBackupPanel-CIRRTklV.js","assets/DigitalLibrary-LF7F0ntZ.js","assets/DigitalPaperRoom-BYq5Qhct.js","assets/DigitalPaperRoom-DxjXuaYr.css","assets/ExamPanel-CCRH392X.js","assets/GlobalSearch-BEWFhc_Z.js","assets/GlobalSearch-hufsr9G2.css","assets/HelpCenter-DGz9erVP.js","assets/LearningEvidence-CVVZJUvx.js","assets/MoreHub-DKpusSdo.js","assets/MultiProblemWorkspace-BLELFJia.js","assets/ProblemReviewQueue-B1fLvgaD.js","assets/ResourceLibrary-B4XEPKsV.js","assets/ResourcePaper-CGCJhHgE.js","assets/ResourceReviews-DeYJpPBQ.js","assets/SleepGuard-D8Zd6GYt.js","assets/StudyCalendar-BNo-jDwd.js","assets/StudyDirectory-BT6Rfb9D.css","assets/StudyDirectory-B_NNWNy-.js","assets/WakeBomb-CHJ3hOkn.css","assets/WakeBomb-Cw9hp8vQ.js","assets/aiZoneData-DBwAxoLJ.js","assets/dm-sans-latin-400-normal-BwCSEQnW.woff","assets/dm-sans-latin-400-normal-CW0RaeGs.woff2","assets/dm-sans-latin-500-normal-B9HHJjqV.woff2","assets/dm-sans-latin-500-normal-Dr3UlScf.woff","assets/dm-sans-latin-600-normal-Aqo67rzb.woff2","assets/dm-sans-latin-600-normal-BmdmIIQ2.woff","assets/dm-sans-latin-700-normal-CUSSCpQX.woff","assets/dm-sans-latin-700-normal-DvUfVpUG.woff2","assets/engine-Dwkj_GhU.js","assets/index-C5kHwvUg.js","assets/index-C6xHUsg2.js","assets/index-Dhqe7XpC.js","assets/index-SocKxP6P.css","assets/library-big-CMADxong.js","assets/paperPdf-BqQiyiR4.js","assets/pdf-CcZYcL52.js","assets/pdf.worker.min-ocdtAcA3.js","assets/pdf.worker.min-yatZIOMy.mjs","assets/photoVault-7u-SMmFn.js","assets/react-vendor-DENrKhsk.js","assets/schema-vendor-DYuAzjeD.js","assets/star-DNA0I0aJ.js","assets/studySites-DlZ8Gwdk.js","assets/useDriveMotion-CZKGAqmz.js"];
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
