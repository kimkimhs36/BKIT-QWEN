# Private briefing API — 2026-10-18

The user confirmed the existing DeepSeek V4.1 Flash choice and a 1,000 KRW daily
ceiling. API model ID: `deepseek-flash` (currently V4.1-Flash-1017). The existing
production `AI_API_KEY`, `BKIT_OWNER_EMAIL` and `BKIT_GOOGLE_CLIENT_ID` entries
were inspected by name/type only. No secret was decrypted or printed.

This release replaces the boot-check-only app with a source-traceable Express
entry, owner authentication, public OAuth client configuration, and a structured
`POST /api/briefing` route. The input is only the text explicitly submitted by the
learner; no photos, schedules, grades or learning records are sent. Output remains
an unconfirmed proposal, validated for schema, dates and exact evidence spans.

Thinking is explicitly disabled, output is limited to 2,200 tokens, retries are
not automatic, and no search/tool APIs are used. Peak uncached pricing reserves
$0.30/M input and $1.20/M output. An upper input bound uses UTF-8 byte count plus
message overhead. Reservations are not refunded when the provider fails.

The old per-instance /tmp ledger is not used. One Redis Lua transaction checks
and reserves against a shared KST calendar-day bucket, a 1,000 KRW maximum and
60-call default. Integer micro-KRW avoids fractional accounting. Conversion uses
2,000 KRW/USD conservatively (ECB 2026-10-16 reference: 1,332.10); reservations
are an app estimate, not a card invoice or provider billing guarantee. Current
prices and conversion must be reviewed if provider rates or FX change.

Paid mode requires `BKIT_AI_LIVE=true`, an existing provider key, owner auth,
and valid `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`. If any requirement
is absent, no paid request can run. Storage errors, exhausted budget, unverified
identity and invalid output all fail closed. The default remains OFF.

Local verification: 92 unit tests and TypeScript passed, including seven new
production checks. All provider responses in unit tests are synthetic. Real
Google sign-in, permanent free Redis provisioning and authorized live inference
remain distinct deployment acceptance gates. Old plan/coach/assistant routes
remain disabled; this release does not claim those features work.

Sources: https://api-docs.deepseek.com/quick_start/pricing/ and
https://upstash.com/docs/redis/features/restapi .
