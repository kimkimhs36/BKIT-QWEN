# BKIT: after-exam performance and API readiness (2026-10-19)

## Goal
Ensure new school performance assessments, homework, and submissions can be captured immediately after the Oct 20 mock exam without stopping study to configure an AI service. Separate safe development from user data and the existing GitHub Pages production site.

## Grounded code changes
- `assessmentWatch.ts`: non-destructive, local-only categorization of assessed and submission-required work (overdue, today, tomorrow, two calendar days, later, unknown date), plus completed-not-submitted items.
- `AssessmentRadar.tsx`: home entry into this list. Buttons open the real existing task editor; a new entry starts with type `수행평가`. A date-only deadline is never displayed as an exact 23:59 clock time.
- `apiReadiness.ts` and `ApiReadinessPanel.tsx`: explicit read-only public `/api/health` diagnostic, no token, no learner content and no paid model call. A configured endpoint does NOT prove Google sign-in or a provider round-trip.
- Unit tests for deadline uncertainty, grouping, submission status, invalid and demo server responses. Browser tests for mobile and desktop homework entry. Existing user data schemas are unchanged.

## Actual deployment evidence
- GitHub Pages runs BKIT 3.3 at `https://teambkit.com` until the owner approves a separately tested study-os release.
- The Vercel deployment `bkit-api` is marked **READY** (metadata verified), based on repo branch `deploy/bkit-api`, commit `95d7a4f...`.
- Vercel production configuration metadata: `BKIT_AI_LIVE=true`, `AI_DAILY_KRW_LIMIT=1000`, `AI_DAILY_CALL_LIMIT=60`. Do not misrepresent these upper bounds as a verified provider invoice or guaranteed daily usage.
- The public API code, `study-os/server/privateApi.ts`, declares `/api/health`, `/api/config`, authenticated `/api/briefing`, `/api/auth-check`, `/api/sync`.
- Other routes (`/api/plan`, `/api/coach`, `/api/assistant`) are explicitly unimplemented in this production backend. A separate local development server has similarly named routes but is NOT the deployed Vercel Express handler.
- Google owner identity + Redis budget checks precede private `/api/briefing`. Owner account permissions, real end-to-end authenticated briefing, billing balance and AI model availability remain **unverified without the owner's live sign-in and a permitted model call**.
- Browser diagnostic button does not need any login or credit; it distinguishes server configuration from authenticated inference.

## Follow-up tests after study-os integration
1. With a fresh local profile, create a performance assessment with an unknown date and confirm it appears in the radar without a fabricated deadline.
2. Edit the assessment to add only a confirmed date (not time) and verify its urgency changes correctly.
3. Mark an assignment done, then confirm it stays in the unsubmitted section until the learner explicitly marks it submitted.
4. Add tasks from a school sheet or photo and ensure the original remains intact.
5. Open Settings → API 연결 진단: server reachable/configured is informational; only owner sign-in and a separate explicit authenticated briefing action can test real AI responses.
6. On iPhone Safari, iPad Safari and desktop, confirm inputs, close/reopen and storage all work.
7. Export a full ZIP from the old BKIT before any production version transition; verify file exists outside browser.
8. After explicit production release approval: rollout a verified source snapshot while preserving `/exam-lab/`, `/mock-rescue/`, domain, original PDFs/photos, and rollback checkpoint.

## Release policy
This branch is a parallel, review-only child of `feat/bkit-3-5-product-perfection`; it must not merge to `main` directly or trigger a Pages deployment. Run TypeScript, unit, build and targeted WebKit/Chromium end-to-end checks. Integration should happen only after Codex has frozen its 3.5 source to avoid conflicting edits.
