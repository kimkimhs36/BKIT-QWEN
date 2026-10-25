# Google session recovery incident · 2026-10-25

## Observed production and limits of attribution

Initial production verified: frontend cb4b426c28ed29d9a6d149a30f904ae6e7a98161, Pages 17bcf08d7bba0625372273c0391c6eea64a7d98d, API f1439874063df4f17fa60d667fa5efe9ea2ba9f8, project bkit-api (prj_EtUvAwl05FsaHmiUvAoFTAdUheF6), repository kimkimhs36/BKIT-QWEN, domain teambkit.com. No newer production source replaced. TOHEŞAR was not accessed.

The exact reported Korean error is emitted by readCloud only for a non-success HTTP response other than 401. A network fetch exception has a different path. The saved-credential restore path can therefore encounter a cloud HTTP failure after retrieving the credential; the message alone does not identify whether that first response was 403, 429, 500 or 503. Runtime-error query returned no crash records. Runtime logs have a one-hour Hobby retention limit; a supported recent query returned no matching application logs. Handled HTTP errors were previously not logged. **The user's original HTTP status and Redis failure are not retrospectively confirmed.** No user token, account or study content was requested to reconstruct it.

## Confirmed defects

1. Restore failures all entered `error` displayed as “재연결 필요”, even when the saved 30-day credential remained valid.
2. Online, visibility and periodic resync listeners were mounted only while `connected`. Entering `error` permanently stopped recovery until a new login or reload.
3. Connect cleared the in-memory token after any read failure, including temporary failures after a new session was saved.
4. API auth middleware converted Redis validation exceptions to 401. The frontend then deleted the remembered auth credential. An unavailable store is not proof of expiry.
5. The old API stripped newer portable task/quick-session metadata. Comparing that response to a full local snapshot could create false differences, conflicts and repeated writes. Paired schema/projection now preserves supported classification while keeping local-only resource identities on device.
6. There was no restart checkpoint distinguishing offline local edits from changes on another device.

## Changes and invariants

- Existing Google consent mechanism, `bkit_sync_` credential format, SHA-256 Redis key namespace and 30-day TTL retained. No new identity provider or auth migration.
- Redis validation failure returns retryable 503 (`SESSION_STORE_UNAVAILABLE`), not 401. Snapshot errors have safe phase codes. Logs contain only event, phase, HTTP status and random request ID, never headers/tokens/identity/study content.
- Expired (401), forbidden (403), rate limiting (429), transient server errors, network failure, data conflicts, invalid data and local storage failure are distinct states. Temporary errors never delete credentials or show an automatic Google popup.
- Five automatic retries per recovery episode: 1s, 2s, 4s, 8s, 16s; bounded Retry-After support. After exhaustion, wait for manual retry, online, focus/pageshow or foreground return. Single-flight requests prevent overlapping writes. Normal polling remains 30 seconds while connected.
- Existing auth IndexedDB remains `bkit-auth-v1` / version 1 / credentials / sync. Optional `checkpoint:{digest,version}` stores SHA-256 of the portable baseline and its cloud CAS version. No learning contents are copied into auth storage. Old credentials without checkpoints still restore; differences require explicit resolution.
- Read/write retry reconciles both current local state and the remote version before a CAS write. Two-sided changes remain conflicts. Lost write acknowledgements reconcile without duplicate writes. Local changes during a request are preserved. A stale auth failure cannot remove a newer saved credential; late responses cannot restore a revoked login.
- Study localStorage, photos, PDF originals, ink, answer drafts and live timers are neither migrated nor cleared. Only definitively expired/revoked auth or explicit disconnect affects the auth record. Merge preserves device-only learning/resource identities.
- UI remains Compact; only cloud status/retry affordances and home account status are corrected.

## Version compatibility and rollout

API recovery protocol 2 adds optional portable classification fields, diagnostic codes and request-ID exposure; existing endpoint paths and credential/Redis storage remain compatible with current clients. Deploy the validated API first. Publish the matching frontend only after public API health reports the exact tested API SHA and protocol 2. Existing live learning records and tokens require no reset. Frontend release overlays generated artifacts onto current Pages main, preserves old hashed files/routes, creates a checkpoint and uses a non-forced current-head-checked push.

## Validation scope

Unit/API suites plus paired real Express API ↔ browser integration with an in-memory Redis transport fixture. Google authorization is synthetic; backend session issuance, auth validation, expiry errors, REST status handling, CAS and browser IndexedDB are exercised by actual API code. Both WebKit iPhone and iPad execute: refresh; page close and real 10-second wait; >1-hour clock simulation; full WebKit process/PWA-storage/offline relaunch simulation; offline/online recovery; session-store 503; bounded backoff; 401; 403/429; two real browser clients; cloud write failure; local apply failure; lost acknowledgements; first session-issuance failure; original photo/PDF bytes and answer draft retention; current schema round-trip without sync loops.

Installed iOS PWA termination and genuine Google consent on physical devices are not available in this environment and are not claimed as tested. A full WebKit process restart with persistent profile and service-worker offline shell is a simulation, not a physical iPhone result. Actual production Redis contents and user records are not read by the test fixture. Final counts and deployed SHAs are recorded in RELEASE.json after gates finish.
