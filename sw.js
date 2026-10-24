// Build injects versioned local assets. This worker never handles the old site or AI.
const ROOT = new URL('./', self.location.href).href;
// CacheStorage is shared by every worker on the origin. A preview must never
// evict the production shell (or another preview's downloaded PDF assets).
const PREFIX = 'bkit-study-os@' + new URL(ROOT).pathname + '@shell-';
const CACHE = PREFIX + '4713f33cbdb7';
const PRECACHE = ["index.html","fonts/PretendardVariable.woff2","icon.svg","icon-192.png","icon-512.png","apple-touch-icon.png","manifest.webmanifest","landscapes/forest.jpg","assets/AIZone-CcDDBXyb.css","assets/AIZone-DJ1U1WGz.js","assets/AwakeAssist-032_9aRg.css","assets/AwakeAssist-Bw0iESTW.js","assets/CompleteBackupPanel-CdoRuu9L.js","assets/DigitalLibrary-C0mifqvS.js","assets/DigitalPaperRoom-Ds4RVuJq.js","assets/DigitalPaperRoom-DxjXuaYr.css","assets/ExamPanel-3gYMGqUy.js","assets/GlobalSearch-B8lwb0tP.js","assets/GlobalSearch-hufsr9G2.css","assets/HelpCenter-BJEo7yAh.js","assets/LearningEvidence-CwSrXk8M.js","assets/MoreHub-C1jU2XVO.js","assets/MultiProblemWorkspace-BdHDTRbz.js","assets/ProblemReviewQueue-Deg2YXzV.js","assets/ResourceLibrary-BJvttBR3.js","assets/ResourcePaper-DguyL0E8.js","assets/ResourceReviews-CG_NTL3W.js","assets/SleepGuard-BEtHZ07J.js","assets/StudyCalendar-C_wwUck-.js","assets/StudyDirectory-BT6Rfb9D.css","assets/StudyDirectory-yLPjTFdQ.js","assets/WakeBomb-CHJ3hOkn.css","assets/WakeBomb-Cw9hp8vQ.js","assets/aiZoneData-DBwAxoLJ.js","assets/dm-sans-latin-400-normal-BwCSEQnW.woff","assets/dm-sans-latin-400-normal-CW0RaeGs.woff2","assets/dm-sans-latin-500-normal-B9HHJjqV.woff2","assets/dm-sans-latin-500-normal-Dr3UlScf.woff","assets/dm-sans-latin-600-normal-Aqo67rzb.woff2","assets/dm-sans-latin-600-normal-BmdmIIQ2.woff","assets/dm-sans-latin-700-normal-CUSSCpQX.woff","assets/dm-sans-latin-700-normal-DvUfVpUG.woff2","assets/engine-Dwkj_GhU.js","assets/index-BOUWHiMZ.css","assets/index-C5kHwvUg.js","assets/index-C6xHUsg2.js","assets/index-CBzU0_v9.js","assets/library-big-_Dhc-Tie.js","assets/paperPdf-DoaNqoKh.js","assets/pdf-CcZYcL52.js","assets/pdf.worker.min-ocdtAcA3.js","assets/pdf.worker.min-yatZIOMy.mjs","assets/photoVault-7u-SMmFn.js","assets/react-vendor-DENrKhsk.js","assets/schema-vendor-DYuAzjeD.js","assets/search-ClE2LjKr.js","assets/star-BosxGNUe.js","assets/studySites-DlZ8Gwdk.js","assets/useDriveMotion-CZKGAqmz.js"];
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
