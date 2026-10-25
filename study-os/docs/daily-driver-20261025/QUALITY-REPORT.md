# BKIT STUDY OS Daily Driver · release quality report

## Product result

Compact home, nine materials, existing calendar, no-save timers, record manager, learning drafts, photos/PDFs, HelpCenter, Awake consent and independent routes retained. Concrete changes: mobile GPU safety budget even at full settings; bounded desktop material bursts; elastic calendar/date/stopwatch icons; persistent cross-page timer for both quick and linked study; primary action starts the displayed task with explanation; lightweight year → month → day drill-down; compact record subject/date filters; optional revocable 30-day Google-linked sync session, discoverable home account entry and saved top-bar lightning motion shortcut.

## Daily loop evidence

Automated browser scenarios cover empty launch → home task intake (manual/photo/manual OCR fallback) → confirmed date-only deadline → exact task start → problem identity / answer draft → refresh / resume → explicit attempt and saved receipt, plus independent discard without creating a session. Records are edited, individually or multiply deleted, undo restored, and totals checked. Recurring schedule changes/cancellation affect one date. Help actions navigate to the actual study, calendar, theme and Awake controls. No camera starts automatically.

## Scorecard

| Criterion | Result / evidence |
|---|---|
| First action | Home five-minute entry is one click; displayed task starts exact ID. Browser tests. Human five-second comprehension unmeasured. |
| Task registration | Existing quick capture remains home entry; manual/photo/PDF flows retained. Human 30-second completion unmeasured. |
| Timer save/discard | Both paths tested; discard creates no session or task completion. |
| Draft recovery | Write → reload → resume and failed-storage navigation guard tested. |
| Calendar | Day/week/month/year, leap February, recurring exceptions, date-only deadline and rescheduling covered. |
| Help | Actual destinations tested; timer remains in state. |
| Record deletion | Search/edit/bulk/undo and visible statistics tested; original problem evidence preserved by operations. New subject/date filters tested. |
| iPhone/iPad | Desktop and WebKit iPhone/iPad portrait/landscape browser matrices; narrow width/rotation/modal/keyboard viewport tests. Physical hardware behavior unmeasured. |
| Theme/header | Nine direct material switches, transparent header / matching root/body/theme-color, reload and scrolling tested; screenshots captured. Real Safari chrome/overscroll unmeasured. |
| Offline/update | Offline shell and themes/study receipt tested; existing production browser profile prepared for an upgrade check; post-release replay stopped at user request. Installed iOS PWA lifecycle unmeasured. |
| Privacy | Camera remains opt-in; no automatic photo/answer upload. Auth credential isolated from backups. Mocked Google authorization used for automated end-to-end login tests; no real-account interactive login claimed. |
| Performance | Chromium synthetic 1500ms samples: iPhone idle 18 → 0 draws, studying 11 → 0; iPad idle 12 → 0, studying 2 → 0; desktop idle 2 → 0, studying 2 → 0. Mobile GPU context requests 1 → 0. Framebuffer budget desktop 950000 → 360000 pixels. Values depend on software renderer/runner load and are not physical battery or temperature measurements. |

## Test/release evidence

Prior full validation: source fae5374070b5c835a20f155dba68ee0c640a7349 passed 271 app unit/integration tests and all 156 browser scenarios (39 each: desktop, WebKit iPhone, iPad portrait and landscape) in GitHub run 40178076297. Its app artifacts were published as Pages commit 7e202aa49393edb6be50c4d4ef2ada8fd7477e96 before cancellation reached the final verification step. This valid release was retained as the next release checkpoint. Backend source f1439874063df4f17fa60d667fa5efe9ea2ba9f8 passed 99 tests before deployment.

The user then explicitly requested stopping repeated tests except Google login. The shortcut source 9fe9c15 failed its Google continuity check (1 failure) because JSON field/default order caused a false conflict; it was not published. Source cb4b426c28ed29d9a6d149a30f904ae6e7a98161 canonicalizes snapshots with the schema before comparison, memoizes that computation, and allows logout while a conflict is awaiting resolution. The focused auth unit checks passed 3/3 and Google continuity passed 1/1 locally and 1/1 in CI. The production build and TypeScript passed. No full repeated UI matrix was run after the user's stop request.

Final release: https://teambkit.com · source cb4b426c28ed29d9a6d149a30f904ae6e7a98161 · Pages 17bcf08d7bba0625372273c0391c6eea64a7d98d, built. CI: https://github.com/kimkimhs36/BKIT-QWEN/actions/runs/40179005446 (success). Public HTML entry assets returned HTTP 200; release.json/build-info.json match exact source; manifest name and compiled service worker verified. Existing assets and routes retained, checkpoint 7e202aa49393edb6be50c4d4ef2ada8fd7477e96. Final iPhone/iPad screenshots were captured from that public build with WebKit emulation. See RELEASE-EVIDENCE.json. Historical failed exploratory runs are not hidden: initial WebKit launch was blocked by missing OS libraries; isolated runtime libraries restored actual WebKit execution. Dated test fixtures pointed at obsolete menu names and old generic-home-timer semantics; updated entry selectors while preserving persistence/deadline/result assertions. A real Safari reduced-motion issue was corrected by checking a fresh MediaQueryList before each response and cancelling existing animation. The initial local whole run had 153 passing / 3 failing: a 180-second theme test timeout, a 30-second capture timeout, and the genuine reduced-motion issue. The final source fix passed the full CI matrix above. A separate follow-up local theme run failed when another runner shut down its reused preview server (connection-refused trace); with a dedicated persistent server it passed unchanged in 44.2 seconds. Additional final-source targeted cases passed 24/24 before the user's stop-tests request. Assertions were not weakened.

## Data protection

See STORAGE-AND-AUTH.md. No learning migration, browser storage clear or cross-device automatic overwrite. Full ZIP remains required for photos/PDFs/ink/drafts. Google-linked private cloud remains owner-only and syncs its existing portable subset. A remembered session does not authorize paid AI or Google APIs. Tokens never appear in source/release files or normal logs. Only synthetic credentials used in test traces.

## Remaining work

**Must verify before broad student beta:** physical iPhone 13 thermal/memory pressure, installed PWA update/lock/background behavior, real Google account login/renewal, iOS HEIC/EXIF and camera/photo chooser, iPad hardware keyboard; multi-user authorization and a modern portable server schema for newer session metadata.

**Worth improving later:** account-managed encrypted attachment/draft sync with conflict resolution, feedback entry and genuine voluntary student pilot, measured human intake/comprehension timings. No actual beta-user feedback was available.

**Defer as unnecessary complexity for this release:** a second homework system; a visual home rebuild; duplicating nine applications; unisolated test-mode flag. True sandbox mode requires all localStorage/IndexedDB adapters to be isolated first.
