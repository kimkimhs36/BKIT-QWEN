# BKIT BUILD 09 — Chat-first daily driver

Date: 2026-10-28
Branch: feat/bkit-chat-first-20261028
Base: feat/bkit-complete-os-build08
Production deployment: UNCHANGED.

## Why
The learner opened ChatGPT rather than BKIT to discuss an academy concern.
The first action must be a useful conversation with real recorded context.

## Implemented
- Prominent chat entry at the top of PremiumHome; existing navigation preserved.
- Bounded on-device conversation restoration, max 40 turns, with separate erase control.
- Only conversation text and source labels are persisted: no authorization tokens or pending action approvals.
- Academy questions read the actual registered schedule and unfinished academy tasks.
- Short follow-ups (e.g. "숙제 때문") reuse local conversation.
- Existing explicit confirmation before task edits remains in force.
- AI may optionally receive a short consented history; disabled by default.
- AI may separately receive a study-record summary when authorized; disabled by default.
- Previously chosen AI mode can be restored with an available access token without paid calls on mount.
- Existing private AI API request contract is unchanged; history is temporarily encoded into the bounded question string.
- New regression tests cover persistence, consent, context, and safety.

## Release gates
Run from study-os: npm ci && npm run typecheck && npm test && npm run build.
Verify Safari/PWA after reinstall, offline, storage quota, and login recovery.
Check existing task edit gates, PDFs/BOOKS, focus timer, sync, sleep.
Never promote the preview to production without user approval and a rollback point.

## Limitations
- The local assistant is a limited rule engine, not full ChatGPT-style natural dialogue.
- Paid AI requires actual configured backend/auth; readiness is not proof of live AI responses.
- Chat is on-device only, not synced or part of JSON study backup.
- Automatic schedule edits and cross-device memory need a server-reviewed action model.
- Measure usage based on meaningful first actions and retained study, not timer/chat duration.
