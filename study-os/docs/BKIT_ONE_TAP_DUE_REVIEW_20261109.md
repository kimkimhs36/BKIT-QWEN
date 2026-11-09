# TEAM BKIT — ONE-TAP EXACT DUE REVIEW | 2026-11-09

## Baseline and safety
- Repository: kimkimhs36/BKIT-QWEN, the actual study-os React application.
- Parent branch: preview/bkit-action-home-20261109, originally 02f96ffbd9877570461adaf30b2181c581d0ff6e.
- Never replace the existing app with previews/bkit-action-home-20261109/index.html. Preserve nine premium material themes, BOOKS, Exam Lab, Sleep Guard, existing user records and all other features.
- No main merge, production deployment, credentials, payment, migration, external messages or alteration of actual learner records.

## User-facing vertical route
1. The existing Home "오늘 독립 재풀이" uses the due problem's saved session ID, not a generic link.
2. "이 문제 다시 풀기" opens the actual Progress/ProblemReviewQueue, puts the exact selected question first (even with more than four due records), focuses the correct answer input and scrolls it into view.
3. The user's entered answer goes to the preexisting addProblemRetest persistence path. This does not invent correct answers, task completion or submitted homework. Another explicit self-check is required.
4. If a previously saved answer has no self-check, Home says "저장한 답부터 직접 확인해요" and "내 답 확인하기": it focuses the original learner's answer self-check buttons rather than suggesting a new answer.
5. Identified and repaired a genuine timing defect: a learner checking yesterday's answer today must not be told to review again immediately today. An optional checkedAt timestamp is written ONLY when the learner explicitly self-checks. The originally submittedAt timestamp remains unchanged. New review dates use checkedAt when present; old data without checkedAt stays readable under the legacy submittedAt fallback. No bulk backfill or migration.
6. Existing session-based recall review (non-problem) retains its previous route without pretending it has a specific answer field.

## Actual changes
- src/homeDueReview.ts, src/PremiumHome.tsx, src/App.tsx: referential, intent-aware navigation from Home.
- src/ProblemReviewQueue.tsx: exact visible selected review card + accessible input or first review action focus, with existing original session persisted unchanged.
- src/daily-driver.css: material-token-compliant selection highlight.
- src/model.ts: optional learningAttemptSchema.checkedAt (non-destructive, no migration).
- src/problemReview.ts and src/ProblemWorkspace.tsx: spacing from explicit self-check, fallback to old submittedAt.
- tests/homeDueReview.test.ts, tests/homeQuickFlow.test.ts, tests/homeReviewTarget.test.ts, tests/homeCheckedAt.test.ts, tests/e2e/home-review-handoff.spec.ts, tests/e2e/home-direct-unreviewed.spec.ts: real safety and one-tap coverage.
- docs/BKIT_due_review_direct_glass_20261109.png and docs/BKIT_due_review_direct_jelly_20261109.png: real compiled app screenshots using synthetic test sessions. No personal learning records or AI-generated artwork.

## Validation from authorized remote TEAM-BKIT PC
- Focused affected unit tests: 13/13 PASS before last patch, 16/16 PASS before timestamp patch, and 13/13 PASS after optional checkedAt patch. Exact commands run; exit 0.
- Full unit suite: 451/452 PASS, exit 1. The one unchanged failure is the known tests/examsSleepIntegration.test.ts sleep boundary; unrelated to this change and deliberately not re-analyzed.
- TypeScript typecheck: exit 0.
- Production Vite build: exit 0. Existing nonfatal large-bundle warning persists.
- Real built React app Playwright E2E across iPhone emulation, Galaxy phone emulation and desktop, four critical flows per device: 12/12 PASS, exit 0.
- E2E verifies: one-tap exact field focus; answer save; unchanged original sessions; later explicit learner self-check; after-date next review; unchecked previous answers routed to self-check instead of writing a new answer; timestamps remain distinct.
- Development LAN URL, while remote PC preview server is running: http://192.168.4.2:4182/study-os/. A real physical iPhone Safari connection has NOT been confirmed; local server HTTP 200 does not imply Internet availability.

## Outcome evidence
Actual developer test improvements verified. No live learner actions or seven-day learning/sleep behavior improvements are implied. No production teambkit.com changes.

## Next single real-user value step
Offer the learner a small, reversible daily due-review shortlist from their own explicit records, with each entry opening its exact due question; observe real opt-in usage before claiming efficacy.
