// Build injects versioned local assets. This worker never handles the old site or AI.
const CACHE = 'bkit-study-os-shell-f17fd82c1616';
const ROOT = new URL('./', self.location.href).href;
const PRECACHE = ["index.html","icon.svg","icon-192.png","icon-512.png","apple-touch-icon.png","manifest.webmanifest","landscapes/forest.jpg","assets/AIZone-Cdvy3nn2.js","assets/AIZone-CmnySxUZ.css","assets/CompleteBackupPanel-Cv7xzMpz.js","assets/DayClose-B28ty2K6.js","assets/DayOrbit-BQu_1XlG.js","assets/DigitalLibrary-B7JsG3n8.js","assets/DigitalPaperRoom-By7hokQW.js","assets/DigitalPaperRoom-DxjXuaYr.css","assets/DragRace-B2SiXEni.js","assets/ExamPanel-C0gop4QH.js","assets/Garage-Bsp2rxSS.js","assets/GlobalSearch-B_w-8F6d.js","assets/GlobalSearch-hufsr9G2.css","assets/Intermission-CP5zPkAx.js","assets/Juggernaut-CiWwpwPW.css","assets/Juggernaut-DU92W_D7.js","assets/LearningEvidence-Dqxo8Nug.js","assets/MoreHub-BzEM5RfT.js","assets/MultiProblemWorkspace-BYIyO3Y5.js","assets/ProblemReviewQueue-fEL6fOUu.js","assets/ResourceLibrary-B7rxh3is.js","assets/ResourcePaper-Dng8koVd.js","assets/ResourceReviews-BGoGCmaC.js","assets/SleepGuard-CkGjUhpy.js","assets/StudyDirectory-0BNeCDRp.js","assets/StudyDirectory-BT6Rfb9D.css","assets/WakeBomb-9aWY_6uJ.js","assets/aiZoneData-DBwAxoLJ.js","assets/dm-sans-latin-400-normal-BwCSEQnW.woff","assets/dm-sans-latin-400-normal-CW0RaeGs.woff2","assets/dm-sans-latin-500-normal-B9HHJjqV.woff2","assets/dm-sans-latin-500-normal-Dr3UlScf.woff","assets/dm-sans-latin-600-normal-Aqo67rzb.woff2","assets/dm-sans-latin-600-normal-BmdmIIQ2.woff","assets/dm-sans-latin-700-normal-CUSSCpQX.woff","assets/dm-sans-latin-700-normal-DvUfVpUG.woff2","assets/engine-Cq0KfGFo.js","assets/index-BK0fcFFg.js","assets/index-C6xHUsg2.js","assets/index-DB4IFkaj.js","assets/index-DnqAqNCM.css","assets/library-big-VJ6WxmPc.js","assets/paperPdf-DfHR47vU.js","assets/pdf-CcZYcL52.js","assets/pdf.worker.min-ocdtAcA3.js","assets/pdf.worker.min-yatZIOMy.mjs","assets/photoVault-7u-SMmFn.js","assets/react-vendor-DVGOrvbP.js","assets/schema-vendor-DYuAzjeD.js","assets/search-c7F-Mfdn.js","assets/star-CmCQzadB.js","assets/studySites-DlZ8Gwdk.js","assets/useBreakDialog-fOH-uXYD.js"];
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
