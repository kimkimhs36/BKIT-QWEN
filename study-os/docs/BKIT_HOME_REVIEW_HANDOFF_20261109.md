# TEAM BKIT — REAL APP: SELF-CHECK TO NEXT REVIEW (2026-11-09)

## Scope
Source: kimkimhs36/BKIT-QWEN, study-os, starting from preview/bkit-action-home-20261109 at 97184d38464c213137f8ebbd2ded3946484ea7a8.

This update preserves the actual React/PremiumHome material system, focus timers, Sleep Guard, BOOKS, Exam Lab, existing study records and JSON schema. It does NOT use or improve the separate standalone preview HTML.

## User-facing vertical workflow
1. Home -> 5 minute real focus -> explicit save.
2. Home -> user types one selected problem -> '혼자 다시 풀기 · 5분' -> existing ProblemWorkspace.
3. User writes their own answer, explicitly saves it, then checks either '다시 풀어야 해' or '내가 확인했어'. No LLM auto-grading, inferred success, invented task completion or automatic submission.
4. Save actual session -> Home summarizes the upcoming suggested review date, using the existing buildProblemReviews spacing and local Asia/Seoul calendar. This is not an external deadline or guaranteed alarm.
5. Home '복습 일정 보기' -> actual Progress review queue, now visible without expanding unrelated analytics.
6. After local date passes the suggested date, the existing Home due-review action takes over. A completed answer is not immediately pushed back into the generic retry form.

## Changed
- src/homeUpcomingReview.ts (new): pure state-derived upcoming checked problem preview; only completed saved sessions and explicit learner self-checks.
- src/PremiumHome.tsx: upcoming review, no duplicate immediate retry after an answered session; truthful copy for due reviews.
- src/App.tsx: progress upcoming review queue is visible when it has scheduled work (without duplicating an already due review card).
- src/daily-driver.css: review card follows original 9-theme material tokens and responsive control sizing.
- tests/homeUpcomingReview.test.ts (new): empty, unfinished, unchecked, checked wrong, checked right, due suppression, no private answer leakage.
- tests/e2e/home-review-handoff.spec.ts (new): fully linked browser action, persistence, explicit self-check, next-day due, navigation.

## Real verification performed
- Focused unit tests: 32/32 passed, exit 0.
- All unit tests: 445/446 passed, exit 1, only the previously known and unrelated tests/examsSleepIntegration.test.ts sleep boundary (19:55/20:00).
- TypeScript check: exit 0.
- Vite production build: exit 0. Non-blocking existing 500 kB chunk warning remains.
- Playwright on real compiled React app / Chrome browser emulation: iPhone, Android Galaxy phone, desktop, 3 scenarios each: 9/9 passed, exit 0. The entire self-check-to-due flow passed on all three configurations.
- Real compiled UI screenshots from synthetic learning fixtures, NOT generated images or actual learner data: docs/BKIT_upcoming_review_real_glass_20261109.png and docs/BKIT_upcoming_review_real_jelly_20261109.png.
- LAN development preview: http://192.168.4.2:4182/study-os/ (only while authorized PC runs, same LAN; physical iPhone accessibility not yet confirmed).

## Safety and remaining work
No main merge, teambkit.com deployment, user data migration/deletion, secrets, OS setting changes or paid service usage.
Neither code commits nor tests prove improved sleep/study outcomes. Real learner-led use over multiple days is necessary.
Next: help the user independently solve and assess the *next* due problem, with minimal friction and explicit learner choice. Keep existing review evidence immutable.
