# BKIT STUDY OS 3.1 — Learning Engine handoff

## Branch, scope, and recovery points

- Work branch: `feat/bkit-3-1-learning-engine`.
- Source implementation commit: `077ebcec7c77b43808dff3e583534e57d0107f3c` (the final documentation commit may be newer).
- Started from the actual remote HEAD `9b8876c709e06935d5e75bf3808935918be4d4f4` on `feat/bkit-3-sleep-guard`. The 3.1 branch did not exist remotely at intake.
- Preserved production source checkpoint `36ca2aca3e289fc0375f82da8381a60e24f4aea4`, all checkpoint branches, existing handoffs and Git history. No reset, force push, main change, backend change, API credential change, paid service, external AI request, or production deployment.
- On continuation, inspected `git status` and retained every uncommitted implementation file. Nothing was restarted or discarded.
- The historical 69-page blueprint is referenced in `BKIT-ULTIMATE-HANDOFF.md`; the original attachment is not present in this new executor. This release follows the full user-supplied 3.1 directive and the repository handoffs.

## Implemented behavior

| Area | Scope | Final status |
| --- | --- | --- |
| Multi-problem workspace | Single, 5, 20 and 35+ question sets; batch registration; ordered question IDs; previous/next/select; drafts; answer-before-self-check; error tagging; retry; per-problem history; saved cursor; safe session finish | Implemented, final regression in progress |
| Resource library | Five real source kinds; subject and task linking; manual questions; multiple local photo pages; page/question reorder; source page/number; concepts; hidden reference answers/translations; editable examples; search; edit/delete/archive | Implemented, final regression in progress |
| Subject learning | Shared mathematics, physics, chemistry, English, economics and general recall templates; subject-specific fields and optional labeled method examples; manual checking | Implemented, final regression in progress |
| Review and concepts | Overdue/today/upcoming, wrong/hint/low-confidence/independent filters; attempt-first retests; editable eight error classes; day-based intervals; observed records separated from inferred concept evidence | Implemented, final regression in progress |
| Exams | MORE and TASKS exam access; confirmed/uncertain scope and provenance retained; explicit resource selection; real remaining problems/answer counts; bounded review adjustment before linked exams | Implemented, final regression in progress |
| Complete local backup | Standard uncompressed ZIP, manifest, JSON, both original photo vaults, SHA-256 and ZIP CRC; preview/conflicts; keep/merge/replace; photo collision remapping; original JSON journal; rollback on write failure | Implemented, final regression in progress |
| Existing integration | NOW resume and direct review, Instant Start/task/JUGGERNAUT enter linked material, TASKS actual progress and separate submission, MORE tools, Recovery first action from remaining problems, Sleep Guard draft protection | Implemented, final regression in progress |
| Responsive/accessibility/PWA | Light study controls, mobile navigation, keyboard-friendly answer fields, deferred screens/OCR, existing versioned offline shell, reduced-motion styling, draft flush guards | Implemented, final regression in progress |

No external AI provider or automatic grading was added. Subject examples are clearly marked method examples, never represented as extracted worksheet content or actual exam scope. A blank numbered problem refers to the user's original material and is not an invented problem.

## Data model and progress rules

Storage key `bkit.study-os.v1` and `version: 1` stay intact. `state.learning` is optional, so 3.0 JSON and records need no destructive migration.

- `learning.version: 1`, `resources`, `problems`, `attempts` are validated in `learningModel.ts`.
- A resource keeps stable IDs, source kind, subject, task ID, ordered photo IDs, current problem ID and last-open timestamp. Optional `archived` hides it from ordinary recommendations without removing history.
- A problem keeps resource ID, ordinal, source reference, optional page photo ID, concept, body, reference answer/example, answer draft and subject-step drafts.
- An attempt keeps its own ID, real problem/session IDs, learner answer and subject fields, hint/confidence, manual result, error tag, submission/check timestamps.
- Existing `active` and completed sessions gain optional `resourceId`. Existing `workspace`/attempts, session-based review queues and retests remain supported and visible.
- Exam records gain optional `linkedResourceIds`. Matching subjects alone do not establish exam scope.
- When a task links several materials, start/resume chooses unfinished material first, then the most recently opened one. Task quantity changes once per distinct problem on its first saved **and manually checked** answer. An incorrect checked attempt counts as work performed, not as mastery. Timer time, moving to another problem, drafts and unreviewed answers never consume quantity. Repeated retests never consume it twice.
- Session receipts report distinct checked problems for resource sessions and derive answer counts from attempts. Finish does not subtract their quantity a second time. Task completion is blocked while linked materials have unworked problems; submission remains explicit.
- Finish selects the first remaining unchecked problem, while direct navigation persists the exact selected cursor. Unreviewed answers stay available for self-check after reopening.
- Drafts are written on edits. Failed saves retain the text in component memory, show the storage error, block navigation/finish via a cancelable draft-flush event, and warn before unloading. Browser/device loss cannot persist a draft when the storage system refuses writes; resolve the warning or copy the text.
- Core limits: 1,000 resources, 10,000 problems, 50,000 resource attempts; UI batch operations support up to 500 slots at once. No old records are trimmed automatically.

Spaced intervals are product defaults, not a universal optimum. A same-day successful retry after an error/hint/low-confidence result remains due tomorrow; only independent answers on a later day advance recovery intervals. The 20-problem E2E explicitly checks this path. Rules: wrong/hint/low-confidence start at one day, independent answers progress through 3/7/14/30 days. Repeated success on the same day does not increase the day count. Explicitly linked upcoming exams can bring a long due date to two days before the exam, never to/before the latest attempt date. Starting/resuming still passes existing class, travel, meal and sleep guards. Concept evidence needs multiple problems and sessions before reporting repeated independent success; time spent is excluded from that inference.

## Backup format, supported modes, and failure recovery

`completeBackup.ts`, `localZip.ts`, and `photoVault.ts` implement the complete archive.

- `manifest.json`: `BKIT-COMPLETE-LOCAL`, schema 1, app 3.1, creation timestamp, JSON SHA-256, and a per-photo index containing vault, original ID/name/type/size/path/digest.
- `data/local.json`: exact named local-storage values, except a running timer is safely closed in the exported snapshot so its elapsed time and segments can be resumed paused on another device. Export does not mutate the running app.
- `media/study/*.bin` and `media/sleep/*.bin`: original bytes from `bkit-private-materials-v1/photos` and `bkit-sleep-photos-v3/photos`, including unlinked originals. The existing DBs, versions, stores, photo IDs and byte representation are retained.
- Included local keys: study state, Sleep Guard v3, `crashweek.v3`, personal landscape ID, atelier draft/visited state, JUGGERNAUT preferences, and nonsecret Sheets settings. Authentication tokens and runtime credentials are not included.
- ZIP STORE is intentional: already compressed photos avoid inflation and a new runtime dependency. Standard CRC and SHA checks precede success. Each photo is read individually; the final Blob still retains the archive, so this is bounded-memory browser backup, not streaming directly to disk.
- Supported cap: photos total 250 MiB, archive 300 MiB, one original 20 MiB, JSON 20 MiB. Larger collections are explicitly rejected without changing records. Mobile memory behavior at these upper caps has not been measured; use a PC for large archives.
- Any missing referenced study/sleep/landscape/draft photo, corrupted entry, inconsistent manifest, duplicate/unsafe ZIP path, unsupported compressed ZIP, or bad JSON causes failure. No partial archive is labeled complete.
- **Keep** cancels import. **Merge** keeps current settings/IDs/record versions and adds new IDs; same-ID versions are not deeply reconciled. Existing sleep dates win. Schema conflicts such as duplicate problem ordinals refuse the merge; use an inspected replacement or a separate browser instead.
- **Replace** uses the keys present in the archive. Keys absent/null in it remain on the device. It never clears storage first and never deletes old photos.
- Same photo ID with different bytes receives a new imported ID, with incoming study/sleep/draft/landscape references remapped. Old bytes remain untouched. Failed imports can leave extra unlinked imported photos; these are deliberately retained rather than garbage-collected.
- Before adding imported photos or changing live JSON, exact previous values are saved to `bkit.complete-backup.recovery.<timestamp>.<uuid>`. Quota failure at this step stops the import. A later live-key write failure rolls back changed keys; the original journal also remains available if rollback itself fails.
- The preview records a baseline; changes from another tab before/during restore abort the JSON write. Close other BKIT tabs before restoring. localStorage has no native multi-key transaction, so this uses synchronous writes, exact snapshots and a recovery journal rather than claiming hardware-level atomicity.
- Restore is blocked during an active local session. After success reload the app so all hooks adopt the restored state. Existing raw-write checks prevent a stale same-tab state from overwriting the import.
- Recovery UI downloads the last pre-restore journal. Its `keys['bkit.study-os.v1']` is the exact previous study JSON: save that value as a JSON file and use the existing JSON import. Restore `keys['bkit.sleep-guard.v3']` through Sleep Guard's existing import when needed. Photos are still in the original vaults. Do not clear browser storage as a recovery step.
- Existing JSON export/import remains available for 3.0 compatibility; it includes photo **references**, not original bytes. Use ZIP for device transfer.

Existing `readState`, `writeState`, corrupted-JSON blocking, raw compare-and-swap, first pre-learning backup and old restore backups remain in effect. New local material/answers are stripped from AI snapshots and private cloud upload, and retained when a private sync snapshot is applied; server/API files are unchanged.

## Main files

- `src/learningModel.ts`, `learningEngine.ts`: schemas, stable entities, quantity accounting, reviews, concept evidence.
- `src/ResourceLibrary.tsx`, `MultiProblemWorkspace.tsx`, `subjectTemplates.ts`, `ResourceReviews.tsx`, `learning-engine.css`: actual learning UI.
- `src/completeBackup.ts`, `localZip.ts`, `photoVault.ts`, `CompleteBackupPanel.tsx`: offline backup/restore.
- `src/App.tsx`, `model.ts`, `ExamPanel.tsx`, `MoreHub.tsx`, `engine.ts`, `LearningEvidence.tsx`, `learningEvidence.ts`, `PrivateSync.tsx`: integration with retained BKIT surfaces.
- `tests/learningEngine.test.ts`, `completeBackup.test.ts`, `tests/e2e/learning-engine.spec.ts`: preservation and full learning scenarios.
- `.github/workflows/verify-bkit-3-1.yml`: lightweight push verification; manual/PR six-profile regression. Existing 3.0 validation and publication workflows remain unchanged.

## Verification record

- Implementation policy: no baseline 408-case E2E run at intake; implemented the major features first. Focused schema/backup tests ran immediately because they protect data. Integration then ran TypeScript, production build, full units and targeted browser flows.
- Current unit result: **134/134 passing, 22 files**. TypeScript and production build pass.
- Initial focused Chromium desktop/iPhone flows passed; WebKit iPad passed 20-problem/resume, draft/sleep, five-template, exam and layout flows. A transient Playwright download/trace streaming error on a concurrent run was retried in isolation; WebKit photo ZIP export/fresh-context restore passed. Do not rebuild served `dist` or overlap test runs sharing an output directory.
- The new workspace's Chromium mobile axe scan reported **zero violations**. Automated layouts are CSS/browser emulations, not actual devices.
- The first local full-regression attempt stopped after identifying real contrast defects in the new library search and backup picker (70 passed, one failure, three interrupted; 382 not run). These partial counts are not a full pass.
- Corrected all new native field backgrounds, constrained the backup picker width (which otherwise caused mobile viewport expansion and blocked dock hit testing), and removed unmeasured content-visibility from sortable question rows after a WebKit reorder failure. Isolated iPhone/WebKit iPad seven-screen WCAG and library CRUD/reorder checks then passed **4/4**. No scenario or assertion was removed or skipped.
- Source `d641571` validation was superseded after the delayed-retry rule review. Manual run 39190488561 was intentionally cancelled, not reported as passing. The local older-source cross-check stopped with 70 passed / 2 interrupted / 80 not run.
- Final full six-profile GitHub regression at `077ebce`: **RUNNING**, [run 39190879182](https://github.com/kimkimhs36/BKIT-QWEN/actions/runs/39190879182). Each matrix job runs the entire 76-case suite; total 456 cases.
- Final local learning scenarios: **16/16 PASS**, eight complete new scenarios each in desktop and WebKit iPhone, output `/workspace/scratch/bkit31-final-learning`. The separate updated 20-problem/quick-retry/next-day-retest scenario passed before the final push.
- GitHub Actions: the source commit's static-and-data job passed TypeScript, 134 unit tests and production build. Push workflow also runs only these lightweight checks; the six-profile matrix runs on manual dispatch/PR, not per development push.

Commands from `study-os`:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run preview -- --port 4173
npm run test:e2e -- --project=desktop --project=webkit-iphone --workers=4 --output=/workspace/scratch/bkit31-final-local
```

The executor has no sudo/system install capability. Playwright Chromium/WebKit were downloaded. Missing Debian Trixie GTK/Graphene/Harfbuzz/Manette/Hyphen/GLES/HID libraries were extracted under `/workspace/scratch/webkit-libs` and copied to the downloaded WebKit private `sys/lib` directories. Local commands set `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` because ldconfig cannot see those private libraries; an actual WebKit launch and app execution were verified. This does **not** skip tests. CI uses ordinary `playwright install --with-deps chromium webkit` and does not bypass host validation.

## Remaining scope and next priorities

- Physical iPhone/iPad Safari keyboards, zoom, native pickers and installed PWA behavior; Galaxy Tab S7 FE/S Pen/rotation/DeX; Windows Chrome OS-specific behavior remain real-device follow-up. Do not call CSS emulation physical-device certification.
- No cloud material/photo sync or external AI OCR/translation/grading. Local OCR remains the existing lazy bilingual engine; handwriting/math accuracy is not guaranteed.
- No production deployment is authorized. The branch is for review/validation only. The existing publication workflow must not be dispatched for this mission.
- Upper-limit backup memory/long collections need measurement on real low-memory tablets. Current explicit limits prevent an unbounded import but are not measured safe-device guarantees.
- Merge preserves current versions by ID; a future conflict-by-conflict merge UI could offer deeper reconciliation. Do not silently replace IDs or photo originals.
- Archived learned materials retain their histories and can be restored from the library's archive filter. This is deliberate preservation rather than irreversible history deletion.
