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

## Integration checkpoint update — four-area shell and release verification

- NOW / LEARN / TASKS / MORE primary navigation is now implemented. Korean route names remain accessible; timetable and evidence live under MORE. The separate MoreHub is lazy loaded. Header capture/tools remain reachable; legacy route data is retained.
- The primary NOW action now precedes capture shortcuts even for a new learner. At 320px the two capture shortcuts use a compact two-column layout with 56px touch targets. The first action remains above the dock. Fatigue is optional and is placed after the start action; the original absolutely positioned task chooser was changed to normal flow after an actual overlap was measured.
- A due problem retest now has a direct NOW entry into the real answer-first review queue. Zero reported remaining quantity routes to manual completion/submission confirmation, rather than inventing another problem.
- Explicit submission intent and text/photo/manual capture confirmation are additive task metadata. Legacy tasks keep their prior submission behavior. New local metadata is retained across old sync formats; no OAuth/backend changes.
- Confidence is unknown unless selected. An immediate correct retry does not cancel next-day review after an error/hint/low confidence. Successful delayed retests extend intervals; new errors reset them.
- Focus restore is portaled outside transformed study content and pointer/keyboard activation no longer removes the button before its click. Phone-specific dock/touch scenarios explicitly set phone viewport/touch while still running in each browser engine; assertions/scenarios are preserved.
- Sleep Guard's optional protectionChangedAt makes new/edited protection effective from confirmation time. Enabling an earlier bedtime while already studying cannot retroactively trim real study. Old sleep v3 JSON remains valid; manual sleep records/photos are retained.
- Original import replacements now additionally retain exact current bytes at bkit.study-os.v1.before-restore.<timestamp>.<uuid>. Settings can export the initial retained original and latest pre-restore original. No writes occur after stale-state or backup quota failure.
- New telemetry accumulation stops at 5,000 events without deleting old events; the evidence screen explicitly states this limit. Actual answers/session saves remain separate. Existing larger validated arrays are preserved.
- Reusable immutable KST Intl formatters eliminate repeated ICU allocations in recovery and timer renders. New evidence/exam/review/MORE UI loads by screen; stable React/schema vendor chunks can stay cached between source updates. Entry chunk is about 246kB plus 277kB shared vendors: **do not claim that total first-load JavaScript halved**. The >500kB single-chunk warning is gone.

### Additional verification history (not final sign-off)

- 117 unit tests passed before the final shell styling; TypeScript and candidate production builds passed.
- Original full-source CI 39157083250 failed (not cancelled): overlapping energy/task summaries, 320px action/dock clearance, phone-only dock/touch assumptions, and a WebKit focus-restore click failure. Each root cause was traced; none of the failing assertions was removed or skipped.
- Focus restore, actual task selection, JUGGERNAUT integration and timer preservation after enabling an earlier bedtime passed in local Chromium/WebKit follow-up. A blocker sweep was 27/30 with only the 320px layout still failing; measured shortcut bottoms were 739px vs a dock at 656px. The compact fix then measured 639px with 56px targets, while start was at 533px.
- Superseded local four-area sweep: 26 passed, 1 interrupted, 7 not run. Superseded iPad full sweep: 21 passed, 1 interrupted, 45 not run. These were deliberately stopped before rebuilding the shared preview; they are not reported as complete passes.
- Verification CI now runs the **entire suite** in six projects (adds Chromium iPad), instead of only selected files. Markdown-only handoff commits do not rerun unchanged source tests; final reports must link the exact verified source commit, not imply a new run for a docs-only commit.
- Final full matrix result and exact commits will be appended after completion.
