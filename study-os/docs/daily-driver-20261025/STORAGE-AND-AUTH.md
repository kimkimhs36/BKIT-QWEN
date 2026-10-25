# Storage and remembered login contract

Learning schema remains v1. No migration or reset; existing localStorage, original IndexedDB photos/PDF/ink, live timers, draft identities and backups remain in place. Calendar year selection and record filters are ephemeral presentation state.

Optional remembered login adds a separate IndexedDB `bkit-auth-v1`, version 1, store `credentials`, key `sync`, value `{ token, expiresAt }`. This stores a BKIT sync-only credential for at most 30 days; it never stores a Google access/refresh token. Blocking IndexedDB leaves ordinary studying intact. Logout deletes only that one auth record and requests server revocation. Offline revocation is reported truthfully, with maximum expiry. It never deletes learning content.

Server stores only SHA-256 of a random 256-bit credential, namespaced by normalized owner identity and configured Google OAuth client ID. Redis TTL is 30 days. Existing verified owner-only authorization is retained. Issuing requires live verified Google authorization; remembered credentials grant only study snapshot sync and revocation, never paid AI, Google APIs or session issuance. Invalid/expired credentials, changed owner/client configuration, missing Redis and other origins fail closed. Both CAS snapshot conflicts and frontend comparison prevent silent overwrite. A restore with differing records pauses for explicit resolution.

The existing private cloud still syncs only its portable snapshot subset: tasks, schedules, saved study sessions and supported preferences. Written problem drafts, original photos/PDFs/ink and live timer remain local; use full ZIP for transfer. Server schema upgrade for newer session metadata and multi-user beta auth is separate work. Google Sheets remains the legacy optional planning bridge.

Backend source: branch feat/bkit-remember-login-20261025, based on deploy/bkit-api. No application source merge into Pages main. Production app release uses generated dist only, retains prior assets/routes, creates checkpoint and normal fast-forward push after current-head comparison. Workflow publishes the same dist tested by all four browser matrices.
