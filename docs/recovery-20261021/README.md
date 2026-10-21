# BKIT product recovery · 2026-10-21

Work branch: `feat/bkit-product-recovery-20261021`, based on the preserved source branch at `a193cae`. The current `main` (`0f63f235055b`) is a GitHub Pages publication tree, not the Vite source tree. No production publication files, other brand files, authentication logic, storage keys, or data schemas are changed by this recovery diff.

## Shipped in the source branch

- A pearl/peach home with a persistent capture entry, immediate study start, compact task list and live weekly calendar. The existing five-screen navigation, timer, learning records, nine material themes, purple jelly animation and local backup systems remain.
- Capture selects homework/assessment/schedule; native camera and photo picker attach private IndexedDB originals. Existing OCR runs locally on demand, displays editable text and falls back to manual input. Duplicate photo digests and duplicate task identities are rejected. Detailed entry carries the capture draft and photos forward.
- A shared-surface calendar expands from the home week strip. Day, week, month, year and 12-year windows read the existing task/schedule/plan state. Dates show restrained category dots and selected-date details. Native browser back and a downward swipe on the handle close it. Years render in bounded windows.
- Recurring school/academy appointments support one-date changes through the existing excluded-date plus dated-event representation. Cancellation preserves future occurrences. Add a dated schedule for a makeup lesson. Changes are staged before a commit; collision checks include preparation, travel, meals and sleep. Study reallocation is opt-in, previewed, validated and preserves locked blocks.
- Contextual help, mobile sheet geometry fixes and a static material fallback for sustained slow animation frames. All running timers now quiet the material effects, including ordinary stopwatch/countdown sessions; idle purple/jelly animation is preserved. Opaque calendar sheets avoid redundant backdrop blur.

## Data and compatibility

`bkit.study-os.v1` and version 1 are unchanged. No migration is needed: exception dates and dated replacements were already supported by the old schema. The calendar is a projection, not a second store. The existing optimistic local-write conflict check and exact pre-upgrade backup remain. A failed task write leaves the form and its private photo originals available. Completing homework and confirming submission remain separate states.

## Deployment facts

See [deployment-evidence.json](deployment-evidence.json).

- `teambkit.com`: HTTP 200; GitHub Pages, `main:/`, legacy build. DNS resolves to the four GitHub Pages addresses. No domain/DNS mutation was attempted.
- Vercel frontend `bkit-study-os-36-preview`: latest observed production build used `main@0f63f235055b`; `ERROR`, `missing_lock_file`, `npm ci` exit 1. That branch lacks `study-os/package.json` and `package-lock.json`. Source recovery fixes this prerequisite; project branch/root settings still need verification before a production release.
- Vercel API `bkit-api`: `deploy/bkit-api@95d7a4f0737d`, READY. The actual `/api/health` returns 200, configured authentication/budget and briefing support. Plan/coach/assistant are explicitly false. Allowed-origin PUT preflight returns 204. An unauthenticated briefing returns 401, as required. An authenticated AI call or cloud write was not performed without a user session.
- Default-context project/deployment reads and non-decrypted environment metadata succeed. Explicit `teambkit` scope and deployment logs return 403 requiring a team grant. The CLI has no credentials; its automatic login flow was canceled. This is partial connector access, not proof of a broken API.
- Root and `study-os/` Vercel configs now provide explicit install/build/output commands and `APP_BASE=/`. They support an explicitly verified source-root deployment, without embedding credentials or changing the API project. The existing Pages build default remains `/study-os/`.

## Validation and remaining limits

Final results are recorded below after browser checks. The public recovery preview is https://bkit-study-os-36-preview-hh3nfylg2-teambkit.vercel.app (READY, source commit `3c9bcd9`). Actual HTTP 200, home rendering, task persistence after reload, calendar opening, no page errors and no horizontal overflow were confirmed in an emulated iPhone browser. The stable Vercel frontend alias still serves an earlier successful version; a failed latest build does not mean that alias is down. `teambkit.com` was rechecked byte-for-byte against the current main HTML and remains unchanged. Preview storage belongs to its own origin and does not automatically inherit records from teambkit.com. Physical iOS camera permissions, keyboard behavior and sensor access require device confirmation. The calendar has shared-surface expansion and a swipe handle; it is not a complete native iOS interactive-transition implementation. OCR is optional and requires content review. The current source keeps the established large application/CSS bundles; build size warnings are not suppressed. Future live authenticated AI testing requires the owner's Google session. A help-video placeholder is present; no unfinished-interface video was produced.

## Changed implementation files

| File | Behavior |
| --- | --- |
| `study-os/src/PremiumHome.tsx`, `recovery.css` | Clear study/capture actions, calm pearl surfaces, compact weekly preview, useful mobile ordering |
| `QuickCapture.tsx`, `TaskMaterials.tsx` | Kind selection, native photo inputs, local originals, OCR review, detailed-draft handoff |
| `StudyCalendar.tsx`, `calendar.ts` | Shared-surface expansion and bounded calendar projections from v1 state |
| `ScheduleReview.tsx`, `App.tsx` | Date exceptions, cancellations, staged conflict review, opt-in replanning, help and browser back |
| `themes/SurrealLiquid.tsx` | Detects sustained late frames and freezes the decorative material |
| `study-os/vercel.json`, root `vercel.json` | Explicit source builds for either supported root layout |
| `tests/calendar.test.ts`, `tests/e2e/recovery.spec.ts`, CI workflow | Model compatibility and complete browser flows |

## Verification results

- TypeScript and Vite production build passed. The existing >500 kB chunk warning remains visible in `verification/build.log`.
- 231 unit tests in 38 files passed; all original unit tests were retained.
- Final-source core CI: 32/32 browser scenarios passed at `3c9bcd9`, covering WebKit iPhone, iPad portrait, iPad landscape and Chromium desktop: https://github.com/kimkimhs36/BKIT-QWEN/actions/runs/39591820091 .
- Unchanged existing regression suite: 5/5 passed again with normal motion at final source `3c9bcd9`: nine themes with running/paused timers, keyboard viewport and long text, PDF/ink/attachments, task focus persistence, all tools and backup/recovery: https://github.com/kimkimhs36/BKIT-QWEN/actions/runs/39591839183 .
- Local iPhone extra flows passed: draft transfer, completion vs submission, edit/delete persistence, dated makeup class and approved replanning, 320 px phone, rotation, keyboard-sized viewport and failed storage preserving input.
- Local normal-motion regression run: 2 passed and 3 exceeded time budgets (90-second full theme/focus scenario budgets, 5-second PDF expectation while original storage was still loading). The same unmodified tests passed in CI; these local results are retained in `verification/legacy-local-normal-motion.log`, not counted as passes. A redundant local cross-device run was canceled after 16 passes once the complete CI matrix succeeded; its interrupted results are retained too.
- A final manual WebKit check with normal system motion confirmed all nine palettes keep the active timer, tasks and sessions identical while material effects stay quiet.
- Synthetic fixture screenshots were captured and visually reviewed for iPhone, iPad portrait, iPad 11-inch landscape and desktop under `screenshots/`. These fixtures are not product defaults or real student records. At maximum home scroll, the last content ends above the mobile dock.
- The old GitHub Pages main and API branch SHAs were rechecked and remain `0f63f235055b` and `95d7a4f0737d`.

The final-source Vercel preview returns HTTP 200. A live iPhone browser check with normal motion confirmed task persistence and calendar opening, no JavaScript errors, no failed HTTP responses and no horizontal overflow. Effects changed from `auto` before the timer to `none` during the timer, as intended. See `verification/live-preview.json`. A second live flow selected a calendar date, prefilled capture with that date, saved an assessment and verified it persisted on the same date after reload (`verification/calendar-capture-live.json`). The final source `3c9bcd9` passed both CI runs: 231 unit tests, the production build, all 32 recovery scenarios and all 5 unchanged preserved-learning scenarios. CI and the preview point to the same implementation commit; the later evidence-only commit changes no application code.

## Release state and remaining work

The implementation and evidence are pushed to `feat/bkit-product-recovery-20261021`. The final implementation commit is `3c9bcd9`; initial feature implementation is `3368551`. No PR was merged into the publication branch. `main` and `deploy/bkit-api` remain unchanged.

The recovery version is publicly deployed only at the Vercel preview URL. Production publication to `teambkit.com` and a durable Vercel production-source/publication-branch arrangement remain separate release work. The successful preview uses explicit source root/build settings; it does not silently change the existing main-based project configuration. Team-scoped log access still needs the Vercel connection to be granted the teambkit scope, although direct project/deployment operations worked.

Authenticated AI/cloud-write verification needs the owner's Google session. Camera/Photos OS permission prompts, real iOS keyboard behavior and physical-device frame quality still need confirmation. The expansion is a shared-surface web transition with a swipe handle; a fully native interactive iOS transition was not implemented. The help-video slot is intentionally a placeholder. Large legacy application/CSS bundles were retained and their build warnings were not hidden.

Screenshots: [iPhone home](screenshots/iphone-home.png), [iPad home](screenshots/ipad-home.png), [iPad landscape home](screenshots/ipad-landscape-home.png), [desktop home](screenshots/desktop-home.png), [iPad calendar](screenshots/ipad-calendar.png).
