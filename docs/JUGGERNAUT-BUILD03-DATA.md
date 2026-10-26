# BUILD 03 data contract (before implementation)

Base: PR #38 f3a0102d07be7a1b3264c09fac7ed42db5b3f6ed. Original keys and original question/concept IDs remain authoritative.

- Keep `bkit.juggernaut.v1.device` schema 1 and legacy API restricted to the original 24 questions. No migration, reset, deletion or production configuration change.
- Add `bkit.juggernaut.build03.math.v1.device` for new math attempts/sessions only. Namespace IDs `m28-*`. Both partitions use validated schema-1 row shapes; the content catalogue is versioned separately. UI combines evidence in memory; no extended row enters the legacy key/API. New records are explicitly device-only until a separately isolated cloud protocol is approved and verified.
- Read BUILD 01/02 documents unchanged. Corruption in either partition blocks writes and preserves originals. Each partition backs up its previous value before writing. Two localStorage keys are not an atomic transaction: partial write failure is surfaced, in-memory document retained, retry merges both partitions. A successful partial partition is never rolled back or discarded.
- Export a validated combined document for BUILD 03 restore and a legacy-only export for rollback. BUILD 02 rejects an extended backup rather than silently dropping rows. Rollback selects the BUILD 02 branch; original records remain readable and the extension key stays untouched for forward recovery.
- Deletions are sticky tombstones. Import, stale tabs and remote merging cannot resurrect a deleted attempt, even with a newer edit timestamp. No automatic purge.
- Subject/year boundaries: this sidecar is specifically 2028 math prerequisite content; other subject engines must declare a distinct catalogue, response validator, evidence policy and storage namespace. No invented cross-subject mastery.

Cloud integration retains owner authentication, bounded CAS retries and acknowledgement-only status. Legacy cloud acknowledgement must disclose device-only extension records. No configured Preview-only identity/storage exists in the provided runtime; real Google login and real cross-device/cloud tests remain unverified. Synthetic transport/API tests are labelled as such.
