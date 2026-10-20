// Build injects versioned local assets. This worker never handles the old site or AI.
const CACHE = 'bkit-study-os-shell-bd49cafd874d';
const ROOT = new URL('./', self.location.href).href;
const PRECACHE = ["index.html","icon.svg","icon-192.png","icon-512.png","apple-touch-icon.png","manifest.webmanifest","landscapes/forest.jpg","assets/AIZone-CI1vJgBr.js","assets/AIZone-CcDDBXyb.css","assets/CompleteBackupPanel-B0R6pnNK.js","assets/DigitalLibrary-g-KJna8b.js","assets/DigitalPaperRoom-DxjXuaYr.css","assets/DigitalPaperRoom-fCgFn8KI.js","assets/ExamPanel-DMkr-BYy.js","assets/GlobalSearch-DObQn66V.js","assets/GlobalSearch-hufsr9G2.css","assets/LearningEvidence-DhUfs6mm.js","assets/MoreHub-tRlMZwJ7.js","assets/MultiProblemWorkspace-B5AX7HgW.js","assets/ProblemReviewQueue-qK9vmmX2.js","assets/ResourceLibrary-DwIAwx2d.js","assets/ResourcePaper-BnURX4hC.js","assets/ResourceReviews-D6SGBWWC.js","assets/SleepGuard-C4wCwsYT.js","assets/StudyDirectory-0_PUSRq9.js","assets/StudyDirectory-BT6Rfb9D.css","assets/aiZoneData-DBwAxoLJ.js","assets/dm-sans-latin-400-normal-BwCSEQnW.woff","assets/dm-sans-latin-400-normal-CW0RaeGs.woff2","assets/dm-sans-latin-500-normal-B9HHJjqV.woff2","assets/dm-sans-latin-500-normal-Dr3UlScf.woff","assets/dm-sans-latin-600-normal-Aqo67rzb.woff2","assets/dm-sans-latin-600-normal-BmdmIIQ2.woff","assets/dm-sans-latin-700-normal-CUSSCpQX.woff","assets/dm-sans-latin-700-normal-DvUfVpUG.woff2","assets/engine-Cq0KfGFo.js","assets/index-C5kHwvUg.js","assets/index-C6xHUsg2.js","assets/index-CnkANRHc.css","assets/index-D3TQIKSY.js","assets/library-big-CeH2-Uyw.js","assets/paperPdf-Wr4qt-Le.js","assets/pdf-CcZYcL52.js","assets/pdf.worker.min-ocdtAcA3.js","assets/pdf.worker.min-yatZIOMy.mjs","assets/photoVault-7u-SMmFn.js","assets/react-vendor-DENrKhsk.js","assets/schema-vendor-DYuAzjeD.js","assets/search-Cd2xl5Qf.js","assets/star-2Ml4u11k.js","assets/studySites-DlZ8Gwdk.js"];
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
