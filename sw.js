// Build injects versioned local assets. This worker never handles the old site or AI.
const CACHE = 'bkit-study-os-shell-4a4b23b4cf0b';
const ROOT = new URL('./', self.location.href).href;
const PRECACHE = ["index.html","icon.svg","icon-192.png","icon-512.png","apple-touch-icon.png","manifest.webmanifest","landscapes/forest.jpg","assets/CompleteBackupPanel-Duek4Gz5.js","assets/DayClose-CQkvY0eU.js","assets/DayOrbit-CQFjCWRx.js","assets/DigitalLibrary-PMbUFifA.js","assets/DigitalPaperRoom-DvcCfC_P.js","assets/DigitalPaperRoom-DxjXuaYr.css","assets/DragRace-CwL1cwlF.js","assets/ExamPanel-DF_PlyY2.js","assets/Garage-BitBOMcR.js","assets/GlobalSearch-aUiWi5Pf.js","assets/GlobalSearch-hufsr9G2.css","assets/Intermission-H3R8Z_YX.js","assets/Juggernaut-CJMXGc-n.js","assets/Juggernaut-CiWwpwPW.css","assets/LearningEvidence-ga8j1rHg.js","assets/MoreHub-xMEiGq2e.js","assets/MultiProblemWorkspace-qG8pALNp.js","assets/ProblemReviewQueue-DPIwEBxD.js","assets/ResourceLibrary-IOWiH5Rt.js","assets/ResourcePaper-PuJMpCg3.js","assets/ResourceReviews-DvHgR7g9.js","assets/SleepGuard-BP_TTuVE.js","assets/StudyDirectory-BT6Rfb9D.css","assets/StudyDirectory-OD6EGXuj.js","assets/WakeBomb-DaP8qLjd.js","assets/dm-sans-latin-400-normal-BwCSEQnW.woff","assets/dm-sans-latin-400-normal-CW0RaeGs.woff2","assets/dm-sans-latin-500-normal-B9HHJjqV.woff2","assets/dm-sans-latin-500-normal-Dr3UlScf.woff","assets/dm-sans-latin-600-normal-Aqo67rzb.woff2","assets/dm-sans-latin-600-normal-BmdmIIQ2.woff","assets/dm-sans-latin-700-normal-CUSSCpQX.woff","assets/dm-sans-latin-700-normal-DvUfVpUG.woff2","assets/engine-Cq0KfGFo.js","assets/index-BK0fcFFg.js","assets/index-C6xHUsg2.js","assets/index-D09SJF7W.js","assets/index-rA0ZrcRi.css","assets/library-big-DjlHj13F.js","assets/paperPdf-BBpzf-Gz.js","assets/pdf-CcZYcL52.js","assets/pdf.worker.min-ocdtAcA3.js","assets/pdf.worker.min-yatZIOMy.mjs","assets/photoVault-7u-SMmFn.js","assets/react-vendor-DVGOrvbP.js","assets/schema-vendor-DYuAzjeD.js","assets/studySites-CEGyCPUl.js","assets/useBreakDialog-fOH-uXYD.js"];
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
