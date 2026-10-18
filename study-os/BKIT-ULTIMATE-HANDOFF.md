# BKIT ULTIMATE — active development handoff

This document supersedes deployment suggestions in older handoffs. **No production deployment or merge is authorized in this mission.** Preserve main, feat/study-os-visual-v2, API backend, credentials and teambkit.com.

## Recovery and starting point

- Repository kimkimhs36/BKIT-QWEN; branch feat/bkit-3-sleep-guard.
- Clean clone started at e81ef094dbbd34deb2aff79d7a5a37660eb9f4ca. This executor had no prior checkout or uncommitted files.
- Original checkpoint checkpoint/pre-bkit-3-20261018 = be8147a49a39256e9c57bfdf7f2b0ca9153c8981 remains intact.
- Additional checkpoint checkpoint/ultimate-start-20261018 = e81ef09, pushed. Full initial Git bundle: /workspace/scratch/bkit-ultimate-start.bundle (executor-local).
- Read BKIT-3-HANDOFF.md and BKIT-3-RELEASE.md; inspected PR #8 and feat/study-sleep-guard-science. They are an alternative older Sleep Guard implementation; do not blindly merge duplicate modules.
- User attached the DOCX at /tmp/codex-remote-attachments/01a15051-7a2c-7097-95d3-c95f5a3340a5/8B0E8B51-9473-4B9B-9CA0-97A9844360DE/1-BKIT-STUDY-OS-THE-ULTIMATE-INTELLIGENT-LEARNING-SYSTEM.docx. Extracted 1,017 paragraphs to /workspace/scratch/master-blueprint.txt and reviewed the product/science/data/UX recommendations. AI/provider/cost sections remain outside this mission.

## Baseline and confirmed root causes

- 98 baseline unit tests, typecheck and build passed.
- CI 39153442543 failed in all five environments on transient day/night button contrast. Global background/color transitions blended opposing palettes at different speeds. sleep-guard.css now switches palette colors together while retaining transform/shadow transitions.
- e81ef09 CI 39154078952 and several earlier runs were cancelled, not successful or failed verifications.
- b001b68 CI 39155561766 passed all five matrix jobs: iphone, desktop, webkit-iphone, webkit-ipad, galaxy-css (21 scenarios each).
- Full local initial iPhone sweep: 57/61 passed. One outdated first-menu-button selector, actual low-contrast text on secondary screens, and two local execution artifacts (shared result directory, building dist during preview tests). Corrected source contrasts and semantic selection. Never run overlapping Playwright processes with the same output directory; never rebuild the served dist while tests run.
- Later focused run: first-answer/error/receipt/next-day retest/reload passed on Chromium iPhone and WebKit iPhone. Whole primary-screen axe checks passed on both engines. Long combined WebKit CRUD flows exceeded the original 30s budget; app.spec.ts now gives its full scenarios 90s. A receipt introduced a second matching heading; history assertion now specifies level 3.

## Implemented in the current integration

- NOW deterministic recommendation with actual remaining units, specific first action, reason, fixed-constraint readiness and optional low energy.
- Local RecommendationShown, StudyStarted, FirstLearningAttempt events. Answer submission is distinct from problem creation or timer start; first attempt is deduplicated per session. Foreground timestamps allow elapsed first-action summaries.
- Attempt-first workspace retains learner answers, optional hint use, confidence, error tag, source category and actual problem number. No automatic/AI grading. Failed saves retain the typed answer.
- Problem-specific delayed retest queue, answer-before-comparison, self-check persistence, overdue/today/upcoming groups, preserved histories and initial adaptive intervals. Old session-memo ReviewDeck remains available.
- Weekly evidence and latest session receipt report stored answers, explicitly reported no-hint attempts, self-confirmed correctness and delayed retests. Unknown old hint evidence is not classified as independent. Insufficient data is stated explicitly.
- Capture recognizes “물리 오답 5개”; next-week weekday calculation fixed; deadline minutes no longer become study-duration estimates. Existing date-only precision remains authoritative; legacy due timestamps are scheduling bounds, not a confirmed clock deadline.
- Source-backed manual exam records distinguish confirmed/uncertain scope, sources, available/missing resources, weak concepts and unknown dates; links only actual registered task photos. Scope is never invented.
- Shared optional Sleep Guard constraints added to actual start/resume, focus boundary capping, recovery generation and validation. Existing fixed/lifestyle sleep constraints remain. Skip/pause are explicit exceptions. Active timer identity, actual segments and problem answers are preserved; no sleep is inferred from website use.
- JUGGERNAUT keeps its visual archive and cinematic opening, adds actual task selection and 5-minute start into the same learning workspace, fast return entry and optional intro skipping. Reduced motion/night cues skip the intro; quiet night disables its animation.
- Additive schema fields only: old task IDs, sessions, submission flags, photos and sleep namespace preserved. First write retains exact original bytes in bkit.study-os.v1.before-learning-v3. Stale raw-state writes are rejected before storage events arrive. Backup/write quota failures preserve the original.
- New events, problem retests and exam metadata are excluded from existing AI snapshots/private sync transmission, and kept locally when a private sync snapshot is applied. No provider calls or configuration changes were performed.

## Verification commands and execution notes

Run in study-os:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run preview -- --port 4173
npm run test:e2e -- --output=/workspace/scratch/final-e2e
```

Preview must remain alive. Do not rebuild dist until the running browser suite finishes.

Executor cannot install root packages. Browser runtimes were downloaded with Playwright; Debian packages were extracted under /workspace/scratch/webkit-libs and copied into WebKit's private minibrowser sys/lib directories (including libhidapi-hidraw0). Local WebKit launch requires PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 because ldconfig cannot see those private libraries; an actual browser launch/render succeeded. CI continues using normal playwright install --with-deps.

Latest completed integrated local checks before this checkpoint: 111/111 unit tests; typecheck/build pass. Additional integrated browser runs are in progress and are **not yet claimed passing**. Logs are under /workspace/scratch; final verification will be appended below.

## Main files

- Existing app integration: src/App.tsx, NowFocus.tsx, ProblemWorkspace.tsx, model.ts, capture.ts, storage.ts.
- New local domains: now.ts, problemReview.ts, learningEvidence.ts, exams.ts, sleepConstraints.ts.
- New UI: ProblemReviewQueue.tsx, LearningEvidence.tsx, ExamPanel.tsx.
- Sleep integration: engine.ts optional extra constraints; safety.ts boundary handling; existing SleepGuard/useSleepGuard untouched in ownership/storage.
- JUGGERNAUT: Juggernaut.tsx and juggernaut.css.
- Tests: learningIntelligence.test.ts, examsSleepIntegration.test.ts, storage.test.ts; learning-loop.spec.ts, exams-and-layout.spec.ts, sleep-learning-integration.spec.ts plus preserved existing suites.

## Remaining scope / honest limits

- Core workspace currently holds one question per focus session with multiple attempts; it is not a full multi-problem resource library yet.
- Review intervals are operating defaults. Same-day hinted retests, exam-date interval compression, concept transfer and calibrated mastery estimates remain incomplete. No mastery/grade improvement claim.
- Four-area NOW/LEARN/TASKS/MORE primary navigation has not replaced the legacy routes; avoid breaking existing navigation/tests during a future IA slice.
- Exam management is manual; no inferred school scope, coverage percentage, automated extraction or exam outcome inference.
- Recovery success rates, dated submission/completion histories and objective sleep protection trend metrics are not yet fully instrumented.
- Original Sleep Guard JSON includes photo IDs, not original image bytes. Clearing browser storage can still remove local media; no automatic device sync claim.
- Real iPhone/iPad/Samsung hardware, native keyboard/pickers, notifications/PWA permissions, S Pen/DeX and real frame-rate checks remain unverified. CSS/engine automation is not physical-device validation.
- External AI APIs, paid resources, OAuth/key/backend changes and production deployment intentionally excluded.
