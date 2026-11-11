# TEAM BKIT — PC-OFF CONTINUATION HANDOFF
**Updated:** 2026-11-10 KST · **Product:** TEAM BKIT / `study-os` (not `TEAM_BKIT_LAB`, `bkit-focus`, or TOHEŞAR)

## Source of truth and safe branch lineage
- GitHub: `kimkimhs36/BKIT-QWEN` — the authoritative, durable source.
- Production `main` last confirmed `371226acbbcf3043913d9d8fbaf1312489510414`. Recheck; do **not** merge or deploy production without explicit user approval.
- Assessment rescue base: `preview/bkit-assessment-rescue-20261110` at `d866339acad3a3f5650b284a946c6c9c7c324350` (already includes assessment list + linked 5-minute focus).
- This change: `preview/bkit-notice-capture-20261110` feature commit **`afb8cbeb7d4a5d7156dd1d1c7429daf94f620a08`**; this document may create a later doc-only HEAD.
- Review PR **#56** targets the assessment rescue branch, **not main**: https://github.com/kimkimhs36/BKIT-QWEN/pull/56 . Draft, unmerged.
- Vercel team `teambkit`, non-production preview project `bkit-study-os-36-preview` (`prj_aRPnZINoxqmwueu8XHUYMcRbJzhF`); deployment `dpl_FnVNctcHJvC63t6TpAwJNctt4696` pinned to feature commit. Reverify READY and HTTP/browser route before claiming preview works. Root URL: https://bkit-study-os-36-preview-hfshdd1e4-teambkit.vercel.app/ . This is **not** teambkit.com.

## User problem and product intent
User reported multiple severely unsuccessful school performance assessments and, more urgently, not knowing which assessments exist. **Do not fabricate the four assessment subjects, grades, actual due dates, or submissions.** Optimize a real behavior: find school notice → save original → inspect and explicitly confirm each task → see deadline/submission state → optionally start one five-minute block. Feature count, PR count, and preview views are not learning improvement.

## Completed feature behavior
1. Real `PremiumHome` assessment rescue panel has **복사한 공지 한 번에 보관**, opening the actual `SchoolInboxPanel` on the copied notice. If clipboard is blocked, the user receives feedback and can use **공지함 · 직접 붙여넣기**.
2. `homeNoticeCapture.ts` reuses `prepareNoticePaste`, validates `inboxSchema`, checks duplicate content, refuses malformed existing inboxes/oversized/blank text, checks optimistic raw state before writing, and traps quota/read errors. School notices are stored under existing device-only `bkit.school-inbox.v1`; the user’s `bkit.study-os.v1` tasks and due fields are **not** changed during notice import.
3. `App.tsx` routes directly to the selected notice via `onOpenNotice`; existing `SchoolInboxPanel` requires manual task title and **원본의 이 과제와 마감을 대조했어요** confirmation before creating a linked assessment. Linked notice/task and reload tested.
4. A completed-but-not-submitted assessment now offers **제출 확인**, not an irrelevant second five-minute study session; the action opens existing editor without auto-submitting.
5. Existing original BKIT material themes, BOOKS, Exam Lab, Sleep Guard, account paths and study storage contracts are preserved; no migration, deletion, data export, secret alteration, external messaging or paid AI use.

### Changed feature files
- `study-os/src/homeNoticeCapture.ts` (new)
- `study-os/src/PremiumHome.tsx`
- `study-os/src/App.tsx`
- `study-os/src/daily-driver.css`
- `study-os/tests/homeNoticeCapture.test.ts` (new)
- `study-os/tests/e2e/home-notice-capture.spec.ts` (new)
- `study-os/tests/homeQuickFlow.test.ts` (only mock props updated)

## Actual verification on TEAM-BKIT Windows (feature commit)
- Focused Vitest `tests/homeNoticeCapture.test.ts tests/noticePaste.test.ts tests/assessmentRescue.test.ts`: **18/18 PASS**.
- Full Vitest: **464/465 PASS**, 1 failing pre-existing `tests/examsSleepIntegration.test.ts` at line 67 comparing 19:55 vs 20:00 sleep boundary; exit 1. **Not caused by this feature.** Do not spend a third execution solely re-auditing the same old failure.
- `npm run typecheck`: exit **0**.
- `npm run build`: exit **0**.
- iPhone 13-sized Chrome Playwright against local isolated preview: **3/3 PASS**; cases: saved original → manual task conversion → reload; clipboard permission denied → manual path; completed-but-unsubmitted action without false state change. A first test attempt failed from a test fixture unconditionally resetting localStorage on reload; fixture corrected and rerun green.
- A physical iPhone/Safari test and user’s 7+ day real use have NOT been verified; simulated iPhone is not physical-device certification.

## PC OFF = GitHub/Vercel cloud-first, no dependency on local checkout
1. First verify latest GitHub PR #56 head SHA, parent assessment branch SHA, active GitHub Actions/CI, and any concurrent agents. If HEAD moved, read the new diff and **never force-push or clobber changes**.
2. When the Desktop Commander device is offline, **do not wait for the user's PC to reconnect**. Use connected GitHub file/edit/commit/branch APIs to make small, independently testable safe changes on a newly isolated branch from the latest verified feature SHA; use connected Vercel **preview-only** Git deployments for actual build/URL QA. GitHub and Vercel APIs do not require the user's powered-on computer; this does **not** guarantee that an automation will execute if its own scheduler or connector is unavailable.
3. Never claim CI tests executed when only source was edited. Prefer existing Vercel build status, GitHub Actions and connected cloud sandbox tooling for execution. If execution is unavailable, state it explicitly and leave reviewable code + a focused regression test.
4. Record each meaningful change in GitHub along with exact commit SHA, changed paths, test exit codes, confirmed preview status and one user-visible next action. Keep the parent PR as a Draft; avoid creating duplicate PRs each hour.
5. If using a local worktree when PC happens to be online: `C:\Users\kimki\Documents\Codex\BKIT_NOTICE_CAPTURE_20261110`. Its `node_modules` is a junction into another local checkout; **this path is optional**, not the source of truth. Never depend on any untracked local log or process for future continuity.

## Next highest-value vertical task (do one, not a dashboard redesign)
**Confirm that the cloud preview of the exact feature SHA actually works after a full browser reload and after clipboard denial**, and that the existing School Inbox and complete ZIP backup preserve original notice text and linked assessment without merging device-local originals into cloud-v2 study records. If the preview already passes, improve what prevents the user from finding school assignments; do not invent a school integration. Choose another bottleneck only when evidence warrants it.

## Release & privacy limits
- No `main` merge, teambkit.com deployment, domain change, auth/API secret action, destructive storage migration, paid credit use or outgoing message without user approval.
- Never infer sleep amount, scores, assessment completion or actual submission from a button click.
- Preview localStorage belongs to preview origin and will not automatically carry over from teambkit.com. School notice originals remain device-local; explicitly backed-up ZIP import is the supported cross-device route.

## 2026-11-10 01:43 KST — school notice ZIP coverage isolated continuation
- Source verified: PR #56 still Draft/open at `c92462a45d5c9e8745fcc4806ade7d673dc4b36f`; base remains assessment-rescue `d866339`. Original source and PR unchanged.
- Isolated branch: `preview/bkit-school-notice-backup-20261110` forked from exact `c92462a`. Code/test commit `393299bce5560c81cf78f5029526850471ce0dcb`.
- Changed: `src/completeBackup.ts` now exposes `schoolNotices` freshness independently; `src/CompleteBackupPanel.tsx` explicitly warns when inspected ZIP lacks current notice changes, and reminds users linked assessment records require study coverage too; `tests/schoolNoticeBackupCoverage.test.ts` adds a fresh-device ZIP restore and stale-notice regression test.
- The pre-existing ZIP code already included `INBOX_KEY` in `BACKUP_KEYS`, validated its schema, and merged notices by ID. This work avoids claiming ZIP support was newly invented; it makes the existing protection visible to users.
- **Verification honesty:** source edits were committed via GitHub API; tests/typecheck/build/browser E2E on this new SHA **not executed yet**. Vercel READY deployment `dpl_2XVX2u6MLTpFfPBX7rH3WymnS23R` is pinned to older `c92462a` and **does not include** these changes. No preview URL or user benefit claimed for new SHA until actual CI/preview verification.
- Next ONE action: run `npm test -- --run tests/schoolNoticeBackupCoverage.test.ts`, then full suite, `npm run typecheck`, `npm run build`; correct any regression, deploy **preview-only** from this branch, confirm exact SHA and HTTP/mobile path. Do not merge into main or force-update PR #56.

## 2026-11-10 02:46 KST — exact SHA preview build verified (cloud)
- Re-read PR #56: still Draft/open; head `c92462a45d5c9e8745fcc4806ade7d673dc4b36f`, base `d866339acad3a3f5650b284a946c6c9c7c324350`; isolated ZIP branch unchanged before this documentation update.
- Vercel preview deployment `dpl_GorAtfvaBDYRbwLXrPrydcG3LPSk` **READY**, Git source SHA `79485d5677cc15af8aa856c9c0c944c895c42e88`, branch `preview/bkit-school-notice-backup-20261110`, non-production project `bkit-study-os-36-preview`. URL: https://bkit-study-os-36-preview-4qc34wj9e-teambkit.vercel.app/ .
- Actual cloud build logs show `npm ci`, then `tsc -b && vite build`, `✓ built in 11.44s`, `Build Completed in /vercel/output [53s]`, `Deployment completed`. This validates production-style typecheck/build for exact SHA; **not** unit tests or full Vitest. No GitHub PR-triggered workflow runs returned for this SHA.
- Independent HTTP and browser access could not be established in this execution environment (external DNS unavailable; browser fetch returned inaccessible). Thus READY/build status is confirmed, but **HTTP 200 and iPhone browser behavior remain unverified**. The two new `schoolNoticeBackupCoverage.test.ts` tests remain **not executed**.
- Next ONE task: execute the focused ZIP regression test and full Vitest suite in an authorized environment (prefer existing cloud CI/runner without paid sandbox); then verify exact deployed URL via real HTTP and mobile browser. Do not report successful end-user use until confirmed. Do not modify main, production or PR #56.

## 2026-11-10 03:46 KST — ZIP merge preservation regression (cloud source edit)
- Verified PR #56 remains Draft/open at `c92462a45d5c9e8745fcc4806ade7d673dc4b36f`, based on `d866339acad3a3f5650b284a946c6c9c7c324350`; no merge, main or production changes.
- In isolated `preview/bkit-school-notice-backup-20261110`, added a **third** focused regression case in `study-os/tests/schoolNoticeBackupCoverage.test.ts`: when a newer local notice exists, merging an older ZIP must preserve that newer notice **and** recover the archived notice; it also checks the ZIP freshness warning condition. Source commit `76ad9735e18ca1f79210876d156ee18a5da53a06`.
- Existing `restoreCompleteBackup` merges school notices using union by ID; the new test covers that real data-loss risk. The test is committed, **not executed**; no claim of test PASS or user-facing release.
- This run's local runtime cannot resolve `github.com` (git remote DNS failure), so no local clone/test execution; GitHub API source edits succeeded. The prior Vercel READY deployments are older commits and **do not verify this new test SHA**. Do not equate cloud build with Vitest execution.
- Next ONE action: run the **three** focused `tests/schoolNoticeBackupCoverage.test.ts` cases in an authorized runner, then full Vitest and a preview-only exact-SHA build/browser verification. Preserve the isolated branch and the original Draft PR.

## 2026-11-10 04:45 KST — isolated GitHub Actions test execution path
- Rechecked PR #56: Draft/open, HEAD `c92462a45d5c9e8745fcc4806ade7d673dc4b36f`, base `d866339acad3a3f5650b284a946c6c9c7c324350`; production/main untouched. TEAM-BKIT remote device explicitly offline.
- Added `.github/workflows/bkit-school-notice-zip.yml` to **this isolated ZIP branch only**; commit `9537d547bd364b2f0d1b0f5d193b6d4059e6fbd2`. Trigger is branch-limited push and optional manual dispatch. Permissions `contents: read`, 15-minute job timeout; Node 22 `npm ci`, three ZIP regression cases, full Vitest, typecheck, and build. The workflow is intended to replace repeated unexecuted tests with actual CI evidence without accessing the offline Windows device.
- **Honest status:** workflow file confirmed stored in GitHub; the available commit workflow-run query returned zero (that API only filters pull-request-triggered runs and does not prove absence of push runs). **No test exit code or pass claim yet.** Inspect GitHub Actions for a push-triggered run, its job steps and logs; if no run appears, check whether Actions is enabled and whether workflows on nondefault branches are permitted. Do not create repeated workflows or claim green based on Vercel READY.
- Vercel automatically began a new preview deployment for the workflow-only commit, initially INITIALIZING; do not call it READY until checked. Prior deployment `dpl_64x7PBWovyR7pUUDhjuNMabhHdMd` was READY on `4fa3d3128ef921aa26be56673d69309e121cb7b4`, but that status is build-only and does not validate Vitest.
- Next ONE action: obtain actual GitHub Actions run/job logs and exit codes for the three ZIP tests, full Vitest, typecheck and build. If GitHub Actions does not run, use an authorized nonpaid execution environment; do not keep adding unexecuted tests. Then validate deployed preview HTTP and mobile path.


## 2026-11-10 05:40 KST — ZIP linked assessment regression and READY verification
- Re-read original PR #56: still Draft/open at `c92462a45d5c9e8745fcc4806ade7d673dc4b36f`, base `d866339acad3a3f5650b284a946c6c9c7c324350`. Isolated ZIP branch only; no main/production changes. TEAM-BKIT device offline.
- Vercel latest verified isolated-branch deployment `dpl_3BkfbYTNg9Jqz5dqsVs29Fq1EmBX` was **READY** for **older** `ddf107fd2750b5a0ed2b5c094b866a6e6368c95e` (https://bkit-study-os-36-preview-gygw4wo3o-teambkit.vercel.app/). This is a build/deployment state, NOT proof of new test SHA or HTTP/mobile interaction.
- Added fourth regression in `study-os/tests/schoolNoticeBackupCoverage.test.ts`: ZIP merge onto fresh storage must restore the original school notice and linked completed-but-**not-submitted** assessment, preserving the notice task ID and original text without inventing submission. Source commit `f9b71d83faace2c9781c57a5f5f20c7b2f97a169`. Existing three cases remain.
- CI workflow exists at `.github/workflows/bkit-school-notice-zip.yml`, but **no actual Actions run/job logs or test exit codes were obtained**. Available GitHub workflow-run connector only returns PR-triggered runs, whereas this branch workflow is push-triggered. Git remote in isolated execution container fails DNS resolution; no local Vitest run. Do NOT mark 4/4 passed. Vercel READY does not execute Vitest.
- Next ONE action: obtain actual CI runner logs or run focused four ZIP tests plus full Vitest in an authorized environment; repair any failures. Only then validate exact code SHA Preview READY, HTTP and iPhone browser path. If push workflow is not running, diagnose Actions enablement/default-branch restrictions instead of adding more unexecuted test cases. BKIT HOUSE deferred.


## 2026-11-10 10:43 KST — GitHub Actions regression repair / actual CI evidence
- Original notice capture PR #56 remains Draft/open: HEAD `c92462a45d5c9e8745fcc4806ade7d673dc4b36f`, base `d866339acad3a3f5650b284a946c6c9c7c324350`. Isolated ZIP Draft PR #57 is stacked on PR #56, not main.
- The first PR-triggered run [#42737476158](https://github.com/kimkimhs36/BKIT-QWEN/actions/runs/42737476158) executed four focused school-notice ZIP cases successfully; full Vitest found 468 passing and one failing expectation in `tests/completeBackup.test.ts`: old freshness object expected three fields, whereas `schoolNotices` is now explicitly included. This was a test-contract mismatch, not evidence of notice loss.
- Updated exactly two assertions in `study-os/tests/completeBackup.test.ts` to expect `schoolNotices: true`, committed as `48a22f98c382e3768917f71cfa8f0656d4ad49a5` (verified GitHub branch HEAD before this documentation commit). No user data, keys, storage migrations, or production/main changes.
- GitHub Actions run [#42737717130](https://github.com/kimkimhs36/BKIT-QWEN/actions/runs/42737717130), job `129570923082`, **on code SHA `48a22f98`**: locked install SUCCESS; focused ZIP regression SUCCESS; full Vitest SUCCESS; TypeScript check SUCCESS. At this checkpoint production-style build was **in progress**, not yet a verified pass; re-read final job conclusion and logs. Workflow-level success requires all steps to finish.
- Latest Vercel preview deployment for code SHA `48a22f98`: `dpl_FTyvc3MMdCodTV3sjg6uxEVDTont`, URL `https://bkit-study-os-36-preview-kjun3qh19-teambkit.vercel.app/`; at checkpoint state **BUILDING**, not READY. Older READY preview `dpl_J2HBdgxop7oSHHYAK3VUgumoJ9x3` belongs to `7d6b158`, not this fix. No HTTP 200 or physical iPhone Safari validation for the latest SHA; do not claim released/used.
- **Next one action:** verify run #42737717130 final conclusion and latest exact-SHA preview READY + HTTP/JS/iPhone-size real browser path. If build fails, repair only the isolated ZIP branch. After successful verification, do not confuse the documentation-only follow-up SHA with code SHA; main and production remain untouched. BKIT HOUSE side-car deferred.

## 2026-11-11 PC-ON verified continuation — stored notice source edit guard

- Authoritative existing stack: Draft PR #57 `preview/bkit-school-notice-backup-20261110` → Draft PR #56 `preview/bkit-notice-capture-20261110` → assessment rescue. Pre-change PR57 HEAD `c7d2458014033c7174e38a32f6237cbcb179f2f7`; never pin this as the latest without querying GitHub again.
- The `TEAM-BKIT` remote Windows device was **online**. Checked all known legacy Codex worktrees and preserved the unrelated uncommitted edits in `BKIT_RESTORE_REAL_APP_20261109`. Fetched PR57 HEAD and used a **detached** worktree `BKIT_PR57_LIVE_20261111` only; no new branch/PR, reset, force-push, migration or production change.
- New user-visible protection: `SchoolInboxPanel.tsx` shows previously saved announcement source text as read-only by default. Users must explicitly choose **저장한 원문 수정 허용** before changing it and can choose **원문 편집 마치기** to relock. A newly created empty notice remains writable. Warns that edits persist device-locally and a ZIP is needed to preserve prior content. Existing `bkit.school-inbox.v1` schema/key/ZIP contract, linked assessment, due and submitted state remain unchanged.
- Updated `tests/e2e/home-notice-capture.spec.ts` for the read-only → explicit unlock → edit → relock workflow. A backup-navigation assertion now compares actual academic records rather than raw JSON byte equality: the home page may independently record `RecommendationShown` and increment a revision without changing tasks or submissions. No app code was changed to accommodate that expected analytics event. `tests/e2e/real-life-activation.spec.ts` retains the existing new-notice/quota-retry scenario.
- **Before changing source**, independently tested the existing deployed HTTPS URL `https://bkit-study-os-36-preview-2unls4u47-teambkit.vercel.app/` with the Windows PC: `/build-info.json` HTTP 200 confirmed pre-change `c7d2458`. Live Chrome iPhone viewport **10/10 PASS**, live WebKit iPhone emulation **10/10 PASS**, each exit 0. These are desktop-based browser emulations, not physical Safari.
- **After code changes**, local focused Vitest 20/20 PASS, exit 0; `npm run typecheck` exit 0; `npm run build` exit 0; 20 local mobile E2E scenarios across Chrome/iPhone and WebKit/iPhone **20/20 PASS**, exit 0; separate new-edit and quota E2E 4/4 PASS, exit 0.
- Full local Windows Vitest **473/474** (exit 1) due solely to the already-known `tests/examsSleepIntegration.test.ts:67` old 19:55/20:00 sleep-boundary expectation; not attributed to this change. Do not re-audit it as a new regression. GitHub Actions on the eventual pushed SHA is the additional independent Linux verification.
- At the time of this local note: the change is **not yet claimed merged, CI-green or deployed**. Confirm GitHub HEAD, successful fast-forward push, CI exact SHA, Vercel READY exact SHA, root HTML/JS/build-info HTTP and live browser scenarios before such claims. No physical iPhone Safari or actual school-data outcomes recorded.
- **One next real-life goal:** On a physical iPhone, with a redacted real school announcement, confirm manual notice→assessment intake and download the ZIP into Files; inspect the downloaded file in a separate, previously empty browser profile without deleting the user's existing data.


## 2026-11-11 KST — PC-ON Safari ZIP direct-tap hardening (existing Draft PR #57)

- Rechecked actual GitHub heads before work: Draft PR #57 `cf4fb1961eaf40dc4d9e6a2a66fb424e3ca3ae93`, PR #56 `c92462a45d5c9e8745fcc4806ade7d673dc4b36f`. Existing iPhone guide branch `preview/bkit-ios-files-steps-20261111` at `b0c415c174413395bb8da4458f1ef49720ca7f07` is **exactly one descendant commit** above PR57. No parallel/overlapping branch creations or redesign.
- Authorized TEAM-BKIT Windows online. Reused clean detached `BKIT_PR57_LIVE_20261111` worktree based on `b0c415c`; preserved unrelated legacy worktree's two uncommitted files. No reset, deletion, new branch/PR, production deploy, user-record mutation, credentials or paid usage.
- **New practical user behavior** in `src/CompleteBackupPanel.tsx`: on iPhone/iPad, after ZIP generation, user explicitly taps `준비한 ZIP 다운로드` to start the browser download from a *fresh direct user click*; this avoids relying on a transient activation surviving asynchronous ZIP creation. Desktop/Android retain existing automatic download request. Download click now uses a connected temporary anchor. Neither a generated ZIP nor a clicked download button is counted as file safely stored; the user must reselect the downloaded ZIP in `전체 ZIP 백업 검사`. In-memory prepared ZIP is released after click. No backup format or localStorage keys changed.
- Updated iOS in-app guide against Apple Support: Safari Downloads button, Files app > Browse > iCloud Drive/On My iPhone > Downloads, Settings > Apps > Safari > Downloads. No mandatory Share > Save to Files step assumed.
- Tests updated in `tests/e2e/home-notice-capture.spec.ts` (two-step iOS click, no premature success, connected anchor, downloaded ZIP → verified file → unsubmitted assessment and notice restore) and `tests/e2e/digital-paper.spec.ts` (iOS ZIP transfer path).
- **Pre-modification LIVE baseline** on exact `b0c415c` Vercel READY `dpl_D2KesbWxRfDBnQzp48ZjdzGpTg7d` URL `https://bkit-study-os-36-preview-qu0d3yuin-teambkit.vercel.app/`: independent Windows HTTP root=200, JS=200, build-info=200 exact SHA, ZIP Chrome + WebKit 4/4 PASS.
- **After change, Windows verified (local isolated preview)**: focused ZIP unit 16/16 PASS exit 0; TypeScript + build PASS exit 0; ZIP E2E across Chrome iPhone, WebKit iPhone, Android phone 6/6 PASS exit 0; real paper+ink ZIP transfer Chrome iPhone 1/1 PASS exit 0; school-notice full Chrome iPhone + WebKit iPhone **20/20 PASS exit 0**. The first simultaneous Playwright attempt collided on shared test-results directories (ENOENT trace), not an app assertion failure; reran **sequentially** with separated output dirs and passed. Do not count the collided run as a pass.
- Full Windows Vitest **473/474**, exit 1 only in already-known unrelated `tests/examsSleepIntegration.test.ts:67` sleep-boundary comparison (19:55 vs 20:00). Do NOT rework this old boundary as a new defect. Require independent GitHub Linux CI on pushed SHA.
- **At note-writing time** work is validated locally but not yet claimed pushed/CI green/deployed; verify GitHub PR57 HEAD fast-forward-only, CI conclusion + exact SHA, new Vercel READY + HTML/JS/build-info HTTP and **deployed** iPhone-sized browser ZIP roundtrip. Main and production off limits; no physical iPhone Safari result exists. Next single user-dependent action: manually download a real ZIP into iPhone Files, reselect/inspect it; do not perform replace restore on live records and do not infer actual coursework improvements.
