# Complete OS API integration boundary

Branch: `feat/bkit-complete-os-api-build08`, based on PR #42 (`e4017a8`).
The frontend integration stays in `feat/bkit-complete-os-build08`. No frontend
branch or compiled static site is merged into this Express deployment source.

Changes preserve the owner-only model, existing Cloud v2 keys, remembered-login
restrictions, Redis budget reservation and default-OFF `BKIT_ASSISTANT_LIVE`.
Google access tokens must match the audience and authorized party and have
positive remaining lifetime. Assistant errors no longer reflect arbitrary
provider/network/Redis exception text. Invalid JSON and oversized input return
bounded JSON errors before any budget reservation.

Local verification: TypeScript, 112 unit tests, 5 real isolated Redis tests.
All provider calls use synthetic injected fetchers. Actual Google login, provider
responses and cost enforcement against an account are not certified by these tests.
No environment variables, billing settings or production deployment changed.

The current production API accepts only `https://teambkit.com` as browser Origin.
Preview login against production therefore remains unverified and blocked by that
boundary; never broaden it to wildcard origins for testing. Local mocked browser
tests and the real-source schema contract check are separate evidence.

Before any approved release, inspect exact commit, API project and environment;
keep assistant OFF until explicit billing approval and an owner login check.
The app's daily estimated budget is not a monthly provider billing cap. Provider
pricing/model validity, real usage observations and a monthly spending policy
remain activation prerequisites. Roll back code to `6b392839a1819494aa9e588a484d918e44d2233b`
without changing Redis records; disable assistant before any diagnostic retry.
