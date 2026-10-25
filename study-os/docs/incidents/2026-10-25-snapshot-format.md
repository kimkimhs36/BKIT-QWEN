# BKIT snapshot format incident — 2026-10-25

## Evidence and scope

Reported production versions: frontend 1407f93, API 9a0bfb9, Pages f3ad016.
Reported GET /api/sync: HTTP 503, invalid-data, snapshot-format at 19:10 KST;
request ID 0e23f81a-53f1-4c0a-99c5-9a96afcaebbf.
These runtime log details were supplied by the incident reporter, not independently re-read here.
Vercel project metadata independently confirms production API source 9a0bfb94143a4703ca25788f6027a9ec3dbad0ec.

The production Lua script re-encodes validated state through Redis cjson. On an
isolated Redis 7.2.6, two regression tests failed before the fix: empty learning
state and nested empty arrays return as objects. This proves the code defect.
No production Redis contents or credentials were available in the workspace:
the specific stored production snapshot and its provenance remain unverified.
No production snapshot, session key, frontend source, theme or local storage was modified.

## Fix

Retain atomic GET/version comparison/SET in one Lua EVAL. Build only the envelope
in Lua and concatenate the Node-validated JSON body without decoding/re-encoding
it. Preserve authentication, owner-hashed key selection and conflict responses.
No client retries or session behavior changed.

## Conservative recovery procedure

1. Stop automated writes for the affected owner while diagnosing, if feasible.
   Do not clear browser storage, reconnect accounts as another owner, DEL, FLUSH,
   or export Redis contents into logs, CI artifacts, tickets or source control.
2. Read only the exact owner-scoped key selected by the production owner email
   hash. Retain the exact raw bytes and cloud version in private storage. Do not
   enumerate or combine other users' keys. Check the active deployed writer first.
3. Run `planSnapshotRecovery(raw)` privately. It only allows schema-known array
   fields containing exactly `{}`. Full schema validation and equality with parsed
   output must pass, so unknown fields cannot silently disappear. Missing fields,
   nonempty objects, invalid records and incompatible metadata abort the plan.
   Empty required `days` cannot become a valid schedule and must abort.
4. Use `backupSnapshot` with a new private absolute file path on durable restricted
   storage; it exclusively creates mode 0600, flushes and reads exact bytes back.
   Retain SHA-256, original version, approved paths and aggregate record counts.
   Verify restoration into an independent private Redis environment by reading
   exact original bytes back. Do not use ephemeral workspace storage as the only
   production backup. Keep backups separate from public test output.
5. Compare every populated record and every unaffected field before/after. The
   integration test uses complete deep equality against synthetic original state,
   including nested session workspace attempts and schedule exclusions. For live
   records, no pre-corruption original is available here: do not claim historical
   completeness merely because the damaged JSON can be parsed. If evidence of
   loss or ambiguity exists, stop and seek a known-good backup/local export.
6. Only after these checks, call `recoveryScript` on that same owner key with
   exact original raw bytes, expected original version, and the validated repaired
   JSON `data`. It compares exact bytes and version atomically, preserves TTL and
   advances cloud version once. A conflict aborts; start a fresh diagnosis. Never
   blindly restore a backup over a later edit. The original private backup stays
   immutable. Recovery is intentionally not attached to GET or normal login.
7. Read back, validate schema and counts, compare every record with the approved
   candidate; repeated reads must not mutate it. Keep the original backup. If the
   result is unexpected stop writes and investigate, without automatic rollback
   over concurrent changes.

The recovery helpers are not an automatic production migration or an operator CLI.
No production backup, restore rehearsal or migration has been executed here.

## Verification

`REDIS_BIN=/path/to/redis/bin npm run test:redis` (Redis 7.2.6 used here).
Tests launch a separate Redis process with a private Unix socket, TCP disabled,
no persistence and synthetic data only. Real Lua EVAL is used, not a Redis mock.
Covered: empty state, JSON type distinctions including nested arrays/null/objects,
populated tasks/schedules/sessions, legacy corruption and conservative repair,
backup byte equality/restore rehearsal, repair concurrency/version checks,
simultaneous HTTP device writes, pre-commit outage, post-commit response loss,
10-second wait, API restart, remembered credential reuse, repeated reads,
and remembered-token authorization restrictions.

The restart test covers server-side remembered authentication. It does not prove
Google OAuth, iOS persistence, PWA termination or physical iPhone behavior.
Physical acceptance remains: Google connect on iPhone, retain existing learning
records, fully terminate, reopen after at least 10 seconds, confirm automatic
session restoration and repeated successful cloud saves/loads without data loss.
