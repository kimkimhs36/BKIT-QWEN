# BUILD 03 — The Living Academy

Implementation branch `feat/juggernaut-build03-20261026` starts at actual PR #38 HEAD **f3a0102d07be7a1b3264c09fac7ed42db5b3f6ed**, not the earlier supplied a373a02 validation commit. No production branch, configuration or records are changed.

## BUILD 02 unresolved gates investigated first

Run 40247849941 is **cancelled, not successful**. GitHub check annotations explicitly say “The job has exceeded the maximum execution time of 20m0s”. It has no concurrency policy; the final run did not end because of a superseding push/manual cancellation. Browser dependency installation consumed ~15m; E2E was interrupted and existing BKIT regression skipped. Latest f3a0102 documentation commit used `[skip ci]` and had no completed full Actions run. Annotation evidence: `docs/juggernaut-build03/build02-ci-annotations.json`.

The new verification workflow keeps all tests, uses independent matrix jobs and 45-minute browser-job limits with a bounded install step. It never deploys. Baseline local typecheck/build/301 tests passed. Chromium baseline PC/Galaxy/iPad landscape: 39 passed. Initial WebKit runs failed to launch due missing host libraries. After extracting Debian libraries locally, baseline had 10 passed and two artifact ENOENT failures caused by another suite sharing its default output directory. These runs remain in logs and are not labelled successful full verification. Final runs use separate output directories, sequential local browser suites, and supported normal dependencies in CI.

## Implemented product scope

- Preserve Arrival, optical tunnel, J seal, BKIT canonical materials/Motion and original 24 items/three-concept diagnosis.
- Two new math concepts / 12 authored items, bounded fraction input, explicit answer labels, staged help and original-question repair return (assistance retained). [Content and sources](JUGGERNAUT-BUILD03-CONTENT.md).
- Five-concept map with source-backed task-function relations vs dashed practice order, evidence, available items, metadata, detail panel and mobile list. No official curriculum/prerequisite certification claim.
- Daily Road per-visit capacity, exam-week one-task suggestion, bounded due work and distinct unavailable subject-engine formats. No doubling missed days or invented other-subject readiness.
- Studio shows actual first-to-latest independent-answer changes and hint reduction; original delayed-review denominator and learning-day ledger preserved. No fabricated chart or exam-score claims.
- Larger temporary paper, clear confirmation, pen-only touch filter and rotation retained. Ink is explicitly ephemeral; no pen data enters learning storage/backups.
- New namespace for math extension; legacy storage/API contract preserved, combined export plus rollback-compatible export, corruption fail-closed, visible partial-write failures and sticky deletion. [Data/rollback plan](JUGGERNAUT-BUILD03-DATA.md).

## Cloud and hardware boundaries

No isolated Preview credentials are configured in the runtime. Do not copy production keys. Legacy owner API/remembered-session checks, CAS conflict/retry, lost acknowledgement, reconnection, expiry, corrupt original and duplicate transport are covered with **synthetic** tests. Extension IDs are actively refused by legacy API and never uploaded by client. New math records are explicitly device-only.

Live Google login, real owner authentication, cross-device upload/download, real concurrent cloud editing, live expiry, server backup/recovery remain **unverified**. Preview health and immutable source identity will be recorded below after deployment. Physical iPhone/iPad/Apple Pencil/Galaxy/S Pen, true IME composition/palm rejection, thermal/GPU/battery behaviour remain **unverified**. Automated WebKit and viewport emulation are not physical-device certification.

## Evidence and checks

`study-os/docs/build03/` holds logs and actual Before/After captures. Before is the built f3a0102 UI. After will be captured from immutable Preview; no synthetic design mockups. React review keeps lazy map/ink boundaries, native labelled form fields, native Korean textarea, cleanup for observers/listeners and canonical tokens. No new dependencies/lockfile changes.

Final CI/Preview/test identities are appended after they actually complete. This document does not substitute a plan or local pass for a green CI run.

## Verified code, deployment and failure corrections

- Full CI [40260850314](https://github.com/kimkimhs36/BKIT-QWEN/actions/runs/40260850314) at d6758bd finished **success**: 316 unit/API tests, 85 browser scenarios (17 on each of desktop, automated WebKit iPhone/iPad, Galaxy ratio and iPad landscape), plus 8 unchanged BKIT record/home regressions. A later ESM/backup run is tracked separately; no pending run is called successful.
- Exact repaired Preview: https://bkit-study-os-36-preview-1bvlt2llv-teambkit.vercel.app/juggernaut/ — READY, target Preview/null, commit **248d5b2b5fa70491f5aea07048b2b6795a8ad73b**, deployment **dpl_ukaYm4AFJk5iu4d7dZ6TA5Z3rD5g**, teambkit/bkit-study-os-36-preview. Build ~47 seconds. `/build-info.json` agrees. `/api/juggernaut/health` **200 configured:false**; unconfigured `/api/juggernaut` **503**, not a cloud-save acknowledgement. See `preview-identity.json`.
- **51/51** deployed UI scenarios passed on the earlier d6758bd Preview (PC/Chromium iPhone/iPad landscape), followed by **12/12** new-flow scenarios on the repaired 248d5b2 exact Preview. The latter includes real file-input backup restore, duplicate import, deletion followed by importing the old backup, quota/corruption visibility, rational input/Korean explanation focus, paper resize/rotation, map accessibility and bounded Road. The final branch also adds extension offline pause/reload to that first scenario; final HEAD Actions is authoritative for that added assertion.
- Deployment-only defect found: Vercel Node ESM rejected an extensionless catalogue import even though tsx/Vite unit tests passed. Fixed `.js` import and added `scripts/check-juggernaut-runtime.mjs` to CI: actual NodeNext emitted JavaScript, no tsx/Vite, health 200 configured:false and unavailable cloud 503. No secrets are needed or printed. Prior 500 is retained in `preview-identity-before-api-fix.json` instead of hidden.
- Initial new E2E incorrectly assumed persisted array index 0 was chronological first. Merge uses ID order. Changed the test to retain the first attempt ID and verify that exact answer/hint data survives the whole flow; no assertion about first-answer preservation was removed. The first CI at 0a1aa72 failed on this ordering assumption. Local logs also retain the initial attempt and environment/trace failures. Clean Actions at d6758bd supersedes those failures.
- Final local unit/API run: **316/316 in 49 files**; typecheck and emitted-ESM smoke pass. Original content scoring is delegated unchanged to `legacyContent.ts`, preventing a parser enhancement from reclassifying historical answers. New fraction scoring is deliberately bounded and does not accept symbolic expressions, nonfinite numbers, zero denominators or precision-truncated input.
- Actual Before/After review: [captures](../study-os/docs/build03/CAPTURE-REVIEW.md). Includes 20 Before and 27 After PNGs, four viewport ratios, populated evidence, Soft Jelly, Liquid Glass and dark. Source/time/overflow/page-error observations accompany captures. All API/record data used in tests/captures is synthetic or local to disposable browser contexts.
- Final browser workflow installs only the browser used by each project, avoiding unnecessary second-browser downloads. Job timeouts cover actual test execution after installation; no test timeout/assertion is weakened and no suite is removed. No `[skip ci]` commit is used for BUILD 03.

Latest HEAD CI and Draft PR status are linked in PR #39 after final evidence upload; their GitHub results are the final gate, rather than this document predicting its own future commit hash. Production is not deployed.

### Final evidence upload

Final local verification is now **317/317 unit/API tests**, typecheck/build and emitted Node ESM smoke. The additional API test proves the server preserves tombstones when an older client posts a newer nondeleted edit or omits the record entirely; CAS still guards the merge/write window. This code is Preview-only, not a production API rollout.

Local full browser run: **82 passed / 3 failed**, retained in `browser-final.log`. Two failures were the already-corrected array-order test assumption; one unchanged WebKit navigation scenario exceeded its original 30-second limit during concurrent browser load. After rebuilding current code, the exact three failed scenarios were rerun sequentially with original assertions/timeouts: **3/3 passed in 35.8s** (`browser-corrected-retry.log`). The new offline extension pause/reload and older-backup-after-delete checks pass in that corrected retry. This is reported as full run + targeted correction, not mislabelled one clean local 85/85 run. Clean full matrix CI at d6758bd is separately recorded; final evidence HEAD's full CI must complete before final delivery.

Final After capture origin is the repaired 248d5b2 Preview; all 16 page observations across four ratios have **zero horizontal overflow and zero page errors**. Twenty-seven actual After images include the three theme views and four populated Studios; twenty actual Before images are retained. Later changes add required-skill metadata, server-side tombstone merge and test/CI evidence; visible UI is unchanged from those captures.
