# BKIT — 2026-10-22 study-first + DeepSeek continuation handoff

## Source of truth
- Source feature branch: `feat/bkit-39-student-beta-20261021` (PR #22, unmerged), based on `feat/bkit-product-recovery-20261021`. `main` contains deployed static assets, not the current source baseline.
- API diagnostics: `fix/bkit-api-diagnostics-20261021` (PR #21, unmerged) against `deploy/bkit-api`.
- This change: `feat/bkit-first-learning-action-20261022` (PR #23, draft against PR #22 head). **Do not merge PR #23 directly into production main.**

## Implemented in PR #23
1. Home's biggest Start CTA now selects a real actionable task with the existing `rankInstantTasks`; task-linked `App.start(5, id)` replaces unlinked stopwatch when an actionable task exists.
2. The home shows a real `firstLearningAction` before starting, while retaining timer fallback if no tasks exist and the existing quick-start control.
3. Focus screen keeps the first action visible beside the running timer.
4. After attempting the first problem on paper, user may explicitly acknowledge with "첫 문제 시도했어요". It stores `FirstLearningAttempt` through existing `appendLearningEvent`, preventing duplicate events per session. It does **not** claim a correct answer or automatic grading.
5. Styling uses quiet glass-like surfaces and avoids a new dashboard, storage key or schema.
6. Browser regression test: `tests/e2e/first-learning-action.spec.ts`.

## Verification gaps
- Source was edited through the GitHub connector; there is no local repo checkout, Node build, or Playwright run available in this chat environment.
- Automatic Vercel preview builds have been observed; READY is **not** equivalent to actual browser/device acceptance.
- Run `cd study-os && npm ci && npm run typecheck && npm test && npx playwright test tests/e2e/first-learning-action.spec.ts`, plus WebKit/iPad checks before merge.
- Browser checks: action visible on home, protected school/sleep schedules still prevent starting, task ID associated, first event only after the user's explicit tap, reload persistence, no horizontal overflow, no broken existing QuickStudyTimer, reduced motion stable.

## DeepSeek: actual state and next task
- Existing optional owner-only DeepSeek assignment briefing lives in `study-os/src/BriefingAI.tsx`, API contract and the isolated Vercel `bkit-api` project.
- Current official model identifier `deepseek-flash` is valid. The legacy models `deepseek-chat` and `deepseek-reasoner` were retired in July 2026; do not switch to these.
- Prior API PR #21 classifies `OWNER_AUTH_REQUIRED`, `AUTH_NOT_CONFIGURED`, `RATE_LIMITED`, `DAILY_LIMIT`, provider errors and timeouts. Tests used mocks, not real paid calls. Public preview origin is not yet production API's trusted CORS origin.
- Frontend API is owner-only, and AI is optional. OCR and task capture must continue working without Google sign-in, payment or server.
- Next: audit Vercel protected preview permissions vs production binding; check `/api/config`, sign-in owner verification and one explicit authorized provider call in the proper origin with a safe small test, respecting existing daily 1,000 KRW / 60 request limits. No secret exposure, no free-key assumptions.
- DeepSeek pedagogical assistant should be an **optional** next phase, not a blocker to the local study-start loop. Require user confirmation and a separate cost/privacy/grounding review before uploading any study context.

## Product North Star
`Time to First Learning Action` target: median <=45 seconds, P75 <=90 seconds. Do not treat timer start, page views or lengthy planning as completed learning. Keep study action grounded in the student's actual assignment; recording a first attempt is still self-report, not proof of comprehension.
