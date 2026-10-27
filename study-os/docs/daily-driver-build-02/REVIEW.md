# Daily Driver Build 02 — review and verification

## Source and recovery

- PR #40 was re-read at task start: OPEN / Draft, head `a92c79cc440339e31c0637a903789b367895684e`. Only Vercel build success was reported, not complete browser acceptance.
- `https://teambkit.com/release.json` still identified `ca8959c13d45ef04766f5067150a6b5c6104164d` on 2026-10-27. Build 01 had not reached production.
- Work is isolated on `codex/daily-driver-02-source`, based on PR #40's source lineage. The default branch is a published static tree. No merges of BOOKS, JUGGERNAUT #36–39, or TOHEŞAR; no production cloud requests that write records; no data reset or migration.
- Baseline, original Build 01: selected iPhone Chromium suites = 1 pass / 8 failures. The old tests referenced removed home regions, obsolete buttons, and collapsed controls. Updated tests now follow visible task, focus, materials and record routes, while preserving photo quota/retry, PDF reopening, AI outage, submitted-status and next-day learning assertions. No tests deleted or skipped.

## Working flows

1. Home → school inbox → original text/photo/camera/PDF saved locally → optional device OCR → original comparison → confirmed individual tasks → task details/calendar/study. Multiple tasks are entered separately; notices remain review-needed until the learner confirms all tasks were handled. OCR cannot create a task by itself. Source links remain accessible from task details.
2. Home → assessment registration; saved tasks offer view, calendar, five-minute study, and another task. No automatic completion/submission from expired deadlines. Completed assessments remain in submission confirmation.
3. Calendar → explicit tab-separated bulk school timetable, preview, save. Uses existing schedules and exclusions, KST weekdays, school/academy separation, and one-day changes. No invented bell times, rooms or electives.
4. Home shows preparation, target departure and actual class start separately. No predicted arrival guarantee. Ongoing fixed/sleep time or less than five minutes to a constraint disables the five-minute home action and offers plan adjustment. Remaining time subtracts known fixed appointments, preparation/travel and meals; unentered routines remain unknown.
5. Existing timers, question answers, unfinished quantity, record editing/deletion/undo and discard-without-save remain. Subject view links existing tasks, resources and study evidence; elective names are not merged.
6. Optional local activation aggregates default off. No external analytics. Cloud downloads/restores do not count as local registration, and attaching an existing timer does not count another study start. Seven-day benefit is unverified.

## UI steps (navigation taps, not measured completion time)

| Action | Build 01 | Build 02 |
|---|---|---|
| Open assessment form from home | Tasks → assessment (2) | Home assessment (1) |
| Open timetable from home | Tools → timetable (2), or calendar | Home timetable (1) |
| Reach photo/camera attachment from home | Tasks → assessment → attachment disclosure (3) | School inbox → new notice (2); attachments visible |
| Continue after saving a task | Navigate/find saved task | Immediate task/calendar/study/another-task actions |

A first-60-seconds result is the design goal, not a claimed timed user study.

## Storage and cloud boundary

| Information | Cloud v2 | Current device / transfer |
|---|---|---|
| Task title, subject, deadline, learning/submission status, provenance notes | Existing portable state and deployed server model | localStorage; ZIP |
| Schedules, preparation/travel/buffer, dated exceptions | Existing portable state | localStorage; ZIP |
| Saved study sessions / settings | Existing portable fields | localStorage; ZIP |
| Live timers, plans, undo | Excluded | localStorage |
| Inbox original text, OCR text, notice state and links | Excluded; independent local namespace | `bkit.school-inbox.v1`; included in complete ZIP |
| Original photos | Excluded; task photo IDs stripped | private IndexedDB; complete ZIP |
| PDFs, editable ink, resources/problems/attempts, detailed delayed retests | Excluded | existing learning + paper stores; complete ZIP |
| Sleep Guard local routine/photos and activation aggregates | Separate device-local namespaces | Sleep Guard included in ZIP; activation aggregates deliberately device-local |

The deployed API source `6b392839a1819494aa9e588a484d918e44d2233b` was inspected read-only; its task schema accepts `submissionRequired` and `capture`. No real owner's account was used in automated tests. Cross-device cloud tests use synthetic transport/portable data; ZIP tests use isolated fresh browser contexts and verify actual original files.

Inbox writes check the last saved bytes to prevent stale-tab overwrites. Failed writes preserve editable text and surface retry. Originals are stored before references; registration success depends on the existing guarded study-state commit. ZIP validates/remaps inbox photo references and merges notices without deleting existing originals. Existing JSON recovery journals remain.

## Notifications and limits

- No backend Web Push scheduler, subscriptions or service-worker push handler exists. Foreground Sleep Guard notifications require an explicit user action and permission. Opening settings does not request permission.
- iPhone/iPad installed PWA status, Notification API/permission and server scheduling are distinct. iOS installation does not make the current web app a background alarm.
- Calendar export is explicit user action; existing ICS includes preparation/departure and calendar alarms. Calendar import and permission/alert behavior must be checked in the destination app. Device wake alarms must be set in the device Clock app.
- Real owner notice photographs, handwriting/HEIC OCR, actual iPhone/iPad/Android hardware, real OAuth cross-device sync, reliable OS relaunch/storage eviction, and seven-day adoption remain unverified. Printed Korean fixture OCR is real OCR, not a modelled result. Browser page closure and offline reload are tested; that does not simulate iOS process eviction completely.
- No independent human/agent review was performed. A separate source review used the React best-practices skill and found/fixed stale async metadata, invalid PDF markup, misleading partial-notice completion and duplicate timer metrics.

## Reproduction

```sh
npm ci
npm run build
npm test
npx playwright install --with-deps chromium webkit
npm run preview -- --port 4173
# Keep the preview process alive across invocations; use separate result folders.
npx playwright test real-life-activation.spec.ts school-ready.spec.ts learning-loop.spec.ts daily-home-readiness.spec.ts daily-driver.spec.ts compact-offline.spec.ts study-record-management.spec.ts storage-readiness.spec.ts --project=iphone --project=ipad --project=desktop --project=webkit-iphone --project=webkit-ipad --output=/tmp/bkit-core
npx playwright test real-life-activation.spec.ts school-ready.spec.ts learning-loop.spec.ts daily-home-readiness.spec.ts daily-driver.spec.ts compact-offline.spec.ts study-record-management.spec.ts storage-readiness.spec.ts --project=ipad-landscape --project=webkit-ipad-landscape --project=galaxy-css --output=/tmp/bkit-landscape
```

Linux runner lacked root/sudo for WebKit dependencies. Debian libraries were downloaded/extracted into a temporary directory; the local Playwright wrapper preserved that library path. Host preflight was bypassed only for those locally supplied libraries; actual WebKit browser launches/tests were executed. These temporary runtime changes are not shipped in the repository.

Final results and preview are recorded in RESULTS.md after execution. Production deployment remains gated on reported failures and unverified real-device areas; this work does not publish to teambkit.com.
