# BKIT Study OS / 10 — iPhone Navigation QA + Output-first learning

## User-reported bugs
- A tab switch replaced React main content without resetting the page scroll
  offset, so the next tab sometimes opened halfway down. Fixed using a
  synchronous layout-effect scroll reset plus a Safari requestAnimationFrame
  layout safety pass.
- Increased bottom content clearance below the last content/footer to avoid
  the fixed glass dock covering readable text at the bottom of the page.
- Deleted the unsolicited 'b.' mark preceding BKIT; preserved BKIT wordmark.

## New learner workspace
- Inside an active five-minute (or longer) session, learners can provide a
  **specific problem/question and optional paper/source reference**.
- A learner submits their **own** written answer, then optionally labels the
  attempt as 'I checked' or 'retry'. Retry allows a second answer.
- Saves each submitted response timestamp and status locally with the active
  timer. On final study receipt it moves with the session. No model fabricates
  a correct answer or claims independently verified mastery.
- Timer stays functional; the actual problem is the visual priority.
- Once question workspace is configured, auto-hiding controls are disabled
  to protect answer entry. The prior no-question immersive focus controls
  remain available and retain old tests.
- Completed learner responses are viewable from the Progress section.

## Data and AI guardrails
- Added optional learning workspace to both active and completed sessions;
  v1 data shape and storage key are unchanged.
- No server calls, payment, new external trackers or default AI grading.
- The existing /api/coach and /api/plan Express server cannot run on static
  GitHub Pages. Production AI requires authenticated backend, per-user budget,
  origin/CSRF controls, key protection, minimum data transfer and consent.
- Physical iPhone Safari manual checks are still necessary. Playwright WebKit
  CI is automated emulation, not a real-device guarantee.
