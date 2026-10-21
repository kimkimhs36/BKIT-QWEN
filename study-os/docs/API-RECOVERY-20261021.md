# Private API recovery · 2026-10-21

Production observed at `https://bkit-api.vercel.app`, source `95d7a4f0737d`.
`/api/health` and `/api/config` return 200; the deployed frontend bundle points to this same origin.
`https://teambkit.com` is GitHub Pages (`main:/`), not the Vercel frontend project. `www` redirects to the apex.
Allowed-origin POST/PUT preflights return 204. Foreign origins, including frontend preview origins, return 403 by design.
Missing/invalid Google tokens return 401 before Redis or model access. Owner-only authorization remains unchanged.

Official DeepSeek documentation checked on 2026-10-21 lists `deepseek-flash`, `/chat/completions`, JSON response format and `thinking.type=disabled` as supported. No speculative model replacement was made.
Non-decrypted Vercel environment metadata shows owner/client identity and shared Redis configured; paid activation and API key are production-only. Existing maximum 1,000 KRW/day and 60 default calls are unchanged. No paid model request, balance change or recharge was made.

## Fixed

- Budget exhaustion and burst throttling return 429 with stable codes; bursts include Retry-After.
- Upstream rejection returns 502 with a safe provider category; upstream throttling remains 429; timeout returns 504.
- Missing/unavailable budget fails closed with 503 before a model request.
- Unknown transport exceptions and malformed JSON no longer risk exposing exception details or Express HTML.
- Public health/config identify owner-only access; health explicitly describes configuration verification, not successful inference.
- CORS, owner checks, atomic Lua reservation, strict evidence/date checks and no-refund reservation remain intact.

## Verification scope

100 unit/integration tests pass with the API branch's own locked dependencies; TypeScript passes.
Tests exercise a real local HTTP server with synthetic Google/provider/Redis responses. They validate the wire contract, ordering, limits and safe failure handling; they do not establish that live owner OAuth, live Redis reservations or paid DeepSeek inference have succeeded.
Production build metadata is READY; team-scoped build-log reads and explicit teambkit scope return 403 because this Vercel connector lacks the team grant. The CLI has no configured credentials; no login or protection bypass was attempted.

This branch is for preview review only. Production branch, domain/DNS, environment values, permissions, billing and limits are unchanged. Production release and a live owner-authenticated check remain separate steps.
