# BKIT AI CONNECT — Release and safety checklist

Implemented 2026-10-27 in PR #42 (backend), with corresponding frontend PR #43.

## Runtime boundaries
- This branch is based on `deploy/bkit-api`, NOT `main` (Pages static output).
- Existing `/api/briefing`, OAuth owner verification, Cloud v2 snapshot, and Redis budget remain intact.
- `/api/assistant` is owner-only and read-only; responses cannot update tasks.
- `BKIT_ASSISTANT_LIVE` defaults to **OFF** even when `BKIT_AI_LIVE=true`.
- Both API routes share the **same** atomic Redis KRW daily reservation; no independent AI quota.
- No question or full context is logged; provider error bodies and API keys are not returned.
- The assistant never accesses saved server study records; the browser explicitly chooses which summary to share.
- Images, PDFs, notes, links, contact details and full conversation history are not included in that summary.

## Release order
1. Review source PR #42 and client PR #43; no direct deployment from their draft state.
2. Complete GitHub unit tests and typecheck in isolated branches. Check failing preview checks: the Vite-only preview project is not the Node API deployment target.
3. Merge/apply backend changes to the authorized `deploy/bkit-api` source. Verify that existing briefing and private-sync endpoints remain healthy, before enabling assistant.
4. Apply frontend to the current editable source (not `main`), then publish via the validated BKIT Pages workflow. Test static frontend with remote assistant still OFF.
5. Separately confirm owner and parent-approved paid budget. Current cap **1,000 KRW per day** is an application safeguard, not a monthly provider billing limit (up to about 30,000 KRW across 30 active days if fully used). Set a lower daily cap and disable provider auto-recharge if desired. Monthly billing control must be handled separately.
6. An authorized operator can set `BKIT_ASSISTANT_LIVE=true` in the production API environment and redeploy; this PR DOES NOT modify env vars, payment settings or the live site.
7. Use an actual owner Google email token, ask one harmless test question with study-context checkbox **off**, and confirm `mode:live` plus an actual provider response. A 200 from health/config alone is insufficient.
8. Verify that the AI never silently completes/changes tasks, that malformed output and provider failures display the local fallback, and that enabling context requires affirmative action.
9. iPhone Safari physical-device OAuth popup and data-removal-on-logout cases require manual owner QA. If a gate fails, turn the flag OFF; local study functions must continue working.

## Known limitations
- No hands-free alarm, scheduled Push, web search, tool execution, or direct image understanding.
- Google OAuth token is memory-only; a reconnect may be needed after expiration or re-opening.
- Frontend preview with production backend OFF intentionally presents local mode.
- Real provider calls and cost charges have NOT been authorized or tested by this implementation.
