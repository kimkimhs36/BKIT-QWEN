# BKIT internal reliability — working checkpoint

Started 2026-10-20 17:39 UTC. This is a working log, not a claim that every requested device scenario has passed.

## Baseline and authorization

- Repository initially cloned clean on `main`, SHA `ba45e264c2743e3fac93cfc2dac0c8a31acec2df`.
- `main` contains published static assets. Pages serves that branch at `https://teambkit.com/`.
- Live `release.json` identifies source `79630329fcda2fb76cec040132b94488dd651c8c` on `feat/bkit-compact-experience-20261021`.
- Latest source branch HEAD is `a193caea972d92c14687c5e4acd39652e2aa20d5`: the additional commit records deployment QA. Work branch is `fix/bkit-internal-reliability-20261020`, created from that HEAD.
- No pre-existing uncommitted user changes were overwritten. Remote branch heads were checked again during the work and remained unchanged.
- User subsequently authorized deployment after verification, then clarified that thorough work should continue with checkpoints. No production deployment has occurred at this checkpoint.

## Actual architecture

- React 19 / TypeScript / Vite static browser application. Core study state is `bkit.study-os.v1` in localStorage, validated by Zod. Version 1 is retained because these fixes do not require a destructive format change.
- Tasks, schedules, sessions, live timer, grades, exams, learning resources/problems/attempts, review data and planning state are in that document. Sleep has a separate validated localStorage key. Theme, material preferences, garage and drafts use additional local keys.
- PDF documents, editable ink and add-only original bytes use IndexedDB `bkit-digital-paper-v1`. Study and sleep photos use separate IndexedDB vaults. Original files are not sent to the AI API.
- Stopwatch, countdown, mock exam, question pace, PDF rendering, OCR and camera analysis run in the browser. PDF.js, Tesseract and MediaPipe are loaded locally on demand. UI intervals trigger rendering; stored timestamp segments calculate study duration.
- Optional private Google-authenticated sync/briefing is a separately deployed API. Read-only health reports source `95d7a4f0737dc49af1299f8692a5859315306967` on `deploy/bkit-api`, authenticated private briefing configured; plan/coach/general assistant endpoints are not enabled. The local Express development server is not the deployed private API. No account login or paid model request was performed.
- Optional Google Sheets integration shares planning fields. Tokens stay in memory. The ordinary offline study loop does not require these services. Camera handles, UI drafts/navigation and connection state are session-local unless explicitly persisted.
- Service worker caches are scoped by application path and defer activation until existing clients close. Published older hashed assets are retained. Independent exam-lab/mock-rescue routes are separate legacy applications and are not silently migrated or deleted.
- Clean `newState()` contains no tasks, sessions, grades or invented study totals. No factory reset or automatic data deletion was necessary or performed.

## Reproduced defects and changes

1. Added nine integrity regressions; all nine failed on the baseline. ISO timestamps were compared as strings, active segment sums/overlap were unchecked, simultaneous active/quick clocks and live IDs already in history were accepted, and non-finite elapsed values could serialize as null. Numeric timestamp comparisons and cross-field checks now reject these values while preserving original raw bytes and older records lacking segment metadata.
2. A checksummed older ZIP containing a running stopwatch accrued the archive's age on restore. Regression failed before the fix. Both imported timer types now restore paused, preserving committed segments. Current exports retain their existing paused-snapshot behavior.
3. Real WebKit regression: moving device time backwards by one hour reset the display from 00:30 to 00:00. A calibration layer now passes monotonic foreground timestamps to the existing engine; wall time remains available across suspension. Display, pause/resume, finish, linking, question switching and exports use the same calibrated timestamps. OS sleep plus clock changes and cross-process clock changes cannot be fully distinguished without an external trusted clock; this limitation is documented rather than hidden.
4. Real WebKit regression: finishing between UI ticks after a protected class boundary recorded 0.75s instead of the allowed 0.50s. Event handlers now enforce the same schedule/sleep boundary as the periodic effect.
5. localStorage compare-before-write is not an atomic operation across renderer processes. Supporting browsers now hold one origin-scoped Web Lock for study writes. Other tabs can inspect/export but must wait or close the writer before modifying study state. Existing raw-value conflict checks remain for old clients and unsupported browsers. PDF edits retain their IndexedDB transaction/revision checks.
6. Three injected IndexedDB transaction-creation failures leaked open connections. All three regressions failed before the fix. PDF and photo vault transaction creation now closes the connection even when the transaction throws synchronously. The helper also covers the sleep photo path.
7. Private sync serialized all saved sessions on every clock render while disconnected. A measured 60-second/1,000-session run performed 60 full study serializations before and zero after memoization. This is a serialization-work reduction, not a demonstrated reduction in overall animation/CPU cost. Raw measurements are in `validation/internal-reliability/`.

## Validation completed so far

- Baseline: 223 unit tests and production build passed.
- First post-fix run: 240 unit tests across 40 files passed; subsequent changes are still being rechecked.
- PDF/vault regression subset: 34 tests passed, including all three transaction failure regressions.
- Core browser suite: 21 scenarios passed across desktop Chromium, WebKit iPhone and WebKit iPad. Includes clock changes, quota failure/retry, rapid finish, real page close/reopen, corrupt active clock, between-tick protected boundary, one writer across tabs and first-use offline study/theme flow.
- A separate four-scenario WebKit clock/data run also passed before the broader suite.
- PDF browser tests are running. Old tests navigated through pre-Compact labels and did not open the current backup disclosure; entry steps were updated without removing ink, original-byte, answer/history or ZIP assertions. A cold PDF import exceeded its old 5s wait while still busy; the import wait was changed to 20s, retaining the same success assertion. Final results are pending.
- Real-time WebKit soak script was added and is being run against an isolated frozen local build. It checks active ID, no premature sessions, offline intervals, navigation, page recreation, final duration, exactly-once save and reload. Its final result is not yet available.
- Build/TypeScript checks have passed at intermediate checkpoints. Final exact commit must be rebuilt and rechecked before deployment.

## Remaining work / explicit limits

- Finish PDF tests, add remaining clean-user and failure-path coverage, inspect API disconnect/race behavior, service-worker update behavior, camera denial/cleanup and long-running state.
- npm audit found development-tool advisories in Vitest/tinypool/mocker. Production dependency exposure and a compatible remediation are being assessed; no blind major-version upgrade has been applied.
- Physical iPhone/iPad camera permission UI, actual OS device lock, process eviction, Safari storage eviction and sensor/keyboard hardware behavior cannot be certified by headless WebKit.
- Browser local storage is not a remote backup. Existing export, checksum inspection, restore journals and original-byte protections remain essential.
- No CSS, theme colors, fonts, animation policy or main page structure has been changed.
- No API secret, user account, real study data, external tracking service or paid infrastructure has been introduced or accessed.

Next checkpoint should update this log with exact new test counts, outstanding failures, source commit, Pages commit and deployed URL.

## Checkpoint 2 — 2026-10-20 18:15 UTC

- First code checkpoint `be66a22` has been pushed to the work branch. Production remains `ba45e26`.
- Expanded unit suite: 242 tests in 41 files passed after Vitest was updated to 4.1.12, which supports the existing Vite 6 and CI Node 22. Both full and production-only npm audits now report zero advisories. Runtime dependencies were not changed.
- Reproduced two disconnected-cloud races against the frozen baseline with synthetic Google/Sheets responses: late responses changed an explicitly disconnected connection back into conflict state, leaving reconnection unavailable. Both hooks now invalidate obsolete operations on disconnect, configuration change and unmount; stale responses cannot apply records or revive connection status. Browser verification of the new build is pending.
- Reproduced failed-PDF resource cleanup: rejected PDF loads did not destroy their loading task. The new regression failed before the fix and passes after it. The original error is preserved and cleanup failure cannot replace it.
- Real WebKit camera tests passed for permission rejection and for a stream arriving after the user canceled; the latter stops the late stream immediately. No model request was issued after denial. These are browser API simulations, not physical iPhone permission UI certification.
- Reproduced an ICS export issue with user-provided carriage returns. A bare CR survived escaping and could break calendar text fields. CRLF, LF and bare CR now all escape as text line breaks; the new-build browser regression is pending. Ordinary CRLF file formatting was already correct.
- Native service-worker upgrade tests passed on Chromium and WebKit: new worker waits for both old clients, old lazy module remains available offline, old scope cache is removed after activation, other-scope cache survives, and localStorage plus IndexedDB original/ink bytes remain intact. Initial use of Playwright's Chromium-only `serviceworker` event timed out on WebKit; the harness now observes the native activation lifecycle through a local-only endpoint instead.
- Earlier broad PDF/clean-user runs were stopped after confirming stale test assumptions and harness limits. Failures included expecting a new device to persist state before any user action, closed backup disclosure, old navigation entry points, decorative transforms preventing Playwright actionability, and short waits during concurrent browser load. Data assertions were not removed. Tests now use the existing reduced-motion preference, explicit current disclosures and asynchronous-file waits. The VM has a two-CPU quota; browser runs are now sequential alongside the single soak browser.
- A new exact-build 60-scenario browser run has started: desktop Chromium, iPhone WebKit and iPad WebKit, covering clean task/study/ZIP restore, submission states, clocks, themes, multi-tab writes, failures, camera and PDF/ink workflows. Final results remain pending.
- Real-time soak has passed 14 minutes with a stable active ID, no prematurely completed sessions, offline operation and actual page close/recreation at minute 10. Only the completed final report can establish the final recorded-duration result.
- No production deployment or browser-data reset has occurred.
