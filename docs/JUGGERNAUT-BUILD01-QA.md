# BKIT JUGGERNAUT BUILD 01 — implementation and QA

Date: 2026-10-25 UTC. PR: https://github.com/kimkimhs36/BKIT-QWEN/pull/37

## Delivered pilot

- `/juggernaut`: Command Center with real empty state, next recommended problem, resume, one-question 5-minute ignition, optional subject diagnostic, review queue, real evidence counts and return to BKIT.
- `/diagnosis`: three-concept math prerequisite diagnostic, paused/resumable independently of other subjects. No score/grade prediction. Other subjects explicitly unavailable pending reviewed content.
- `/train`: 24 original numeric variants in one unit (middle-school linear equations: balance, distribution, negative coefficients). Multiple choice/short answers, first submission, elapsed time, staged hints, guess flag, written explanation, feedback, worked repair example, fresh transfer item and delayed verification.
- `/review`: editable C/M/R/I/K/A/T/F/G cause, concept scheduling derived from active attempts, 1-day initial interval, delayed independent success doubles the interval up to 30 days, failure/help resets to 1 day. Daily capacity counts already reviewed concepts in Asia/Seoul, never grows with overdue work.
- `/roadmap`: seven-stage 2028 path; only diagnosis/prerequisite repair are currently executable. Next action changes with observed weaknesses and due reviews; users may select another available concept.
- `/progress`: immutable first answers, editable error cause, logical deletion, unfinished sessions, JSON export/validated merge import, previous-device backup and raw recovery export.
- `/guide`: preserved existing Juggernaut information/strategy/archive. All six 2028 subject scopes retained; current math training is clearly marked prerequisite learning, not official exam scope/content.

## Evidence rules

Correctness is checked by normalized numeric equality, not eval or AI. Every item key is independently checked by substitution and choices contain exactly one answer. Content is generated original arithmetic, not licensed/publisher/official past-exam text. These checks are not a claim of human teacher content review or demonstrated instructional efficacy.

An independent observation requires first-answer correctness, no hints, no guess and nonempty explanation. Explanation text is **not** automatically verified; this limitation appears in the interface. Stable readiness needs at least two due, different-item independent reviews, with failures resetting that evidence. Initial confidence remains low until three observations. Raw accuracy and a running timer are never treated as full mastery.

## Persistence and API

Existing BKIT credentials, local/IndexedDB data, snapshot schema, old keys, backup/restore and production endpoints stay unchanged. Local JUGGERNAUT document has its own versioned key, raw backup and deterministic entity merge. Tombstones prevent deleted records reappearing after reconnect. In-memory answers remain exportable on quota errors; corrupt originals cannot be overwritten. Free practice never persists answers/hints/time and cannot silently become saved learning on browser Back/resume.

New GET/PUT `/api/juggernaut` is owner-authorized using the same Google or remembered session and writes only a separate owner-hash namespace. Preview has an additional namespace prefix. CAS limits concurrent writes; document merge and stable attempt IDs handle response loss/retry. Server validates records and recomputes readiness instead of trusting client grade fields. These tests use synthetic session/Redis transport; no production test writes were performed.

`저장 중`, `기기에 저장됨`, `서버에 저장됨`, `동기화 실패`, and local quota failure are distinguished. Only a valid write acknowledgement can produce `서버에 저장됨`.

## Verification evidence

Local commands (root-base build):

```sh
cd study-os
npm ci
npm run typecheck
npm test
APP_BASE=/ npm run build
APP_BASE=/ BKIT_TEST_BASE_URL=http://127.0.0.1:4173/ npx playwright test tests/e2e/juggernaut.spec.ts --project=desktop --project=iphone --project=ipad --project=galaxy-css --workers=2 --output=test-results-juggernaut
APP_BASE=/ BKIT_PREVIEW_PORT=4175 BKIT_TEST_BASE_URL=http://127.0.0.1:4175/ npx playwright test tests/e2e/daily-driver.spec.ts tests/e2e/study-record-management.spec.ts --project=desktop --output=test-results-current-regression
```

- Whole unit/API suite: **47 files / 298 tests passed**. See `juggernaut-build01/unit-tests.log`.
- Local Chromium: **24/24 passed** across iPhone 13, iPad Pro 11, 1280×800 touch Galaxy ratio and 1440×1000 PC. Includes genuine offline reload from cached shell, complete next-day review, corruption, quota, lost ACK, expired login, first-answer preservation and free practice. See `juggernaut-build01/chromium-matrix.log`.
- Existing current BKIT regression: **8/8 passed** (home task start, calendar, motion, remembered login/logout, no-save timer exit, record search/edit/delete/undo/filter). See `juggernaut-build01/bkit-regression.log`.
- Deployed Preview **101d9f6**: **12/12 passed** on PC and Chromium iPhone, including the browser-Back/free-practice fix. `juggernaut-build01/preview-tests.log`. A separate real Preview diagnostic completed all three concepts, with reload after the first answer: `diagnostic-preview.json`.
- Automated WebKit iPhone/iPad: **12/12 passed in a final clean local run** (including genuine service-worker offline reload and isolated synthetic cloud API tests). `juggernaut-build01/webkit-matrix.log`. System libraries were extracted into the browser’s local dependency directory; clean Ubuntu GitHub Actions independently installs supported browser dependencies. Final CI evidence follows below.
- Verified Preview: https://bkit-study-os-36-preview-afct08o7s-teambkit.vercel.app/juggernaut/ — **READY**, target **Preview**, build source **101d9f6f82e686c59cd8dd6baa3783653a1be757**, Vite, deployment **dpl_CPoFAvjQK1DV1ooSnAJN5pxVK7eH**. Its health endpoint returns HTTP 200 with `configured:false`; unconfigured writes return HTTP 503 rather than a false save acknowledgement.

The older `back-navigation.spec.ts` and `drive-reward.spec.ts` expect the removed `더보기` button/old garage route, while the audited production source already labels it `도구` and blocks `setTab('garage')`. They are not valid current UI regression gates and were not changed to fake passes. Existing GARAGE/race source/storage are unmodified and their engine unit tests pass; full legacy UI usability is not claimed by this build.

One current regression initially ran during Korean sleeping hours and correctly could not start study. The test now fixes its clock to Korean 13:00; product sleep protection is unchanged. Initial concurrent local test runs shared an output directory and deleted each other's trace files; final runs use separate outputs/ports and passed cleanly. Initial Preview server import resolution was fixed. The WebKit cloud fixture initially bypassed Playwright routing through the service worker and reached the development proxy instead of the synthetic API. The synthetic cloud test now blocks service workers; the separate genuine offline-reload test still enables and exercises the worker. Preview CI uses the same-origin API topology of the deployment. CORS allow/deny checks remain in server tests.

## Release blockers / explicit limits

1. **Live cloud is unverified and disabled by missing Preview bindings.** Vercel environment metadata lists zero variables; deployed `/api/juggernaut/health` honestly returns `configured:false`. Server bindings needed: owner email, Google client ID, Redis URL and token. Do not copy secret values from production. Bind appropriately scoped configuration using the provider's supported setup, then validate owner login, isolated cloud writes, cross-device resume, disconnect and expiry in a private pilot.
2. Existing authentication is **owner-only**, not a multi-student member database. Other-user requests fail closed. Expanding membership is a separate backend design/release.
3. Production API does not yet expose this endpoint. Its additive integration and frontend release must be separately reviewed/approved. No production deployment, merge, data reset, key removal or migration was performed.
4. **No physical iPhone Safari, iPad, or Galaxy Tab tests** were performed. Chromium mobile emulation and automated WebKit results must not be represented as real-device testing. Hardware keyboard/IME, Safari keyboard viewport and stylus handling need a physical pilot.
5. No live AI inference, English diagnosis, other math units, official past exams, multi-user membership or reward-credit integration. Roadmap stages beyond prerequisite repair are visibly future work. Stored numeric answer keys are public original practice material, not protected exam keys.
6. 2028 scope/date follows PR #36 design; official announcement re-verification is explicitly still required. No unsupported annual calendars or grade predictions are fabricated.

## Safety and rollback

Production Pages `main` remains `0d6ddb8c15c538dc81608e7e3fcad24d1ffe7252`; production API branch remains `6b392839a1819494aa9e588a484d918e44d2233b`. `/release.json` still identifies frontend source `ca8959c`. All test accounts/data are synthetic and all deployments in this PR are Preview.

Review/rollback is independent: close the Draft PR or remove its opt-in `/juggernaut` entry and additive function from the branch; do not delete user namespaces to roll back UI. Retain exports, local backups and existing cloud snapshots. This is a working local-learning pilot with a tested cloud adapter, **not a claim that all production release gates are complete**.

## Final CI result

**SUCCESS** — https://github.com/kimkimhs36/BKIT-QWEN/actions/runs/40206979049, tested commit **3377941faa5fc8e0621e84e443b1a545b7e22521**. Clean Ubuntu runner: TypeScript/build and **298 unit/API tests**, **24 browser scenarios** (PC, Galaxy ratio, WebKit iPhone, WebKit iPad), then **8 current BKIT regressions** all passed. Browser artifacts are attached to the run. See `juggernaut-build01/ci-summary.log` and `verification.json`.

The verified immutable Preview at **101d9f6** has byte-equivalent application source/server/build configuration to this tested commit; subsequent changes are test isolation and QA documents only. Final evidence-only commits do not alter product behavior. Production release gates remain as stated above.
