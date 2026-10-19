# BKIT STUDY OS 3.3 — Daily Trust handoff

## Goal

Make the already-deployed 3.2 study flow less likely to lose in-flight Apple Pencil/S Pen work, make local photo corruption detectable, and make backup messages honest. This is an additive, backwards-compatible change; **it is not a cloud sync service**.

## Changes

1. **Photo integrity, not just existence** (`src/storageReadiness.ts`): the manual backup health audit checks the SHA-256 digest and expected byte length of every stored study and sleep photo, one at a time. The result exposes counts of *verified* photos as well as total originals. Existing PDF SHA-256 checks remain. The audit does not rewrite user records; it only creates then removes an independent disposable localStorage write-test key.
2. **Safe navigation during a still-active stylus stroke** (`src/InkCanvas.tsx`): custom save guard and visibility/unload handlers now flush active ink using capture-phase event listeners, so it joins the dirty save queue **before** the parent decides whether to navigate. `src/App.tsx` routes application updates through the same guard; on failed saves a reload is deferred instead of discarding in-flight ink. Existing autosave and conflict protections are retained.
3. **Honest backup coverage** (`src/completeBackup.ts` and `CompleteBackupPanel.tsx`): after fully verifying a manually chosen ZIP, compare its study and sleep snapshots and stored paper document metadata with current records. An older, intact archive now gets an explicit warning rather than a misleading "latest backup" message. Active timers are intentionally normalized during ZIP export, so the comparison is *conservative*: it may warn on a safe export rather than falsely promise coverage.
4. **Actionable audit screen**: present verified/total photo and PDF counts, distinguish errors from a clean local check, and retain prominent reminders that the downloaded file must actually exist outside the browser. No code claims to confirm the file's continued presence or the safety of browser-managed storage.
5. **Regression tests**: corrupt study photo, corrupt sleep photo, stale-but-valid backup ZIP, active stylus stroke on navigation, and manual ZIP read-back with a later local edit.

## Source of truth

Base: `release/bkit-study-os-3-2-20261019`.

Feature branch: `feat/bkit-3-3-daily-trust`.

Previous production rollback source: `checkpoint/pre-bkit-3-2-release-20261019`.

Keep `main`, `/mock-rescue/`, previous study data, URL, custom domain, and legacy JSON backup compatibility intact.

## Test policy

- Typecheck, unit tests, and production build on feature pushes.
- Playwright browser matrix (iPhone, iPad, desktop, WebKit iPhone, WebKit iPad, Galaxy CSS) on release review readiness, with all tests run against the same final application source SHA.
- Release deployment must rerun its existing smoke tests, build with `APP_BASE=/`, preserve `mock-rescue/index.html`, and verify live `https://teambkit.com/release.json` matches the published source SHA.
- **Do not claim physical Apple Pencil or S Pen device testing.** Actual hardware, Safari PWA storage eviction, 250 MiB archive performance and cross-device restore require an explicit user acceptance check.

## User's practical first-day checklist

1. Import a non-critical school worksheet or PDF in BKIT 3.3.
2. Write several lines, change pages, switch to another tab, return, and confirm all ink and answers remain.
3. Run settings → '내 공부 기록·PDF·필기 원본 정밀 검사'. Investigate any red '점검 필요' warnings.
4. In settings, export a complete ZIP to a real device Files app or desktop filesystem. Select that file again under '전체 ZIP 백업 검사' and confirm that the archive is valid **and covers the current snapshot**. Do not restore over the main browser just to test.
5. If possible, restore into an independent fresh browser context or a different device; compare PDF and ink.
6. Keep the ZIP externally and re-export after meaningful new study. A browser storage permission/persistence status is **not** an external backup.

## Deliberate limitations

No remote automatic backup was added. The photo/PDF integrity audit only checks this device's readable local originals, does not validate future persistence and does not prove that a ZIP is stored off-device. The exact same data may be in distinct Safari and home-screen PWA storage contexts on some devices. Local original limits and entire-ZIP limits remain unchanged. This version does not automatically schedule backups or sync full ink/photos across devices.
