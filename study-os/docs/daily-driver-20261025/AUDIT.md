# BKIT Daily Driver audit · 2026-10-25

Verified before editing: kimkimhs36/BKIT-QWEN main faa22c7d; source 5d6c263b; teambkit.com/release.json matched. Pages API confirms main:/ and teambkit.com. Current app source is study-os/ on source branch. No newer source replaced. API health identifies backend 95d7a4f. Separate API worktree from deploy/bkit-api. No TOHEŞAR repository or domain accessed.

Production first-use screenshots: before/iphone-home.png, before/ipad-home.png. Actual production browser used with empty, isolated browser data. No genuine learner storage accessed. Baseline: 269/269 unit/integration assertions; TypeScript and build pass.

| Feature | Status | Evidence / minimum action |
|---|---|---|
| Compact home, five-minute entry | WORKING / PARTIAL | Empty home clearly starts; task shown in primary card but button starts unlinked generic stopwatch. P0: dispatch shown task and explain recommendation. Regression: seeded priority task, exact task ID. |
| Timer discard / persistence | EXISTING / WORKING | Segment accounting, discard and record operations covered by existing tests. Keep implementation. Regression: reload, save/discard, no rewards on discard. |
| Intake, photos/PDF, manual fallback | EXISTING / WORKING | TaskMaterials stores previews first; no AI requirement; explicit deadline precision and duplicate checks already present. Preserve. Physical HEIC capture remains unmeasured. |
| Calendar day/week/month, per-date schedule exceptions | EXISTING / WORKING | Calendar/date utilities, existing end-to-end cases. Add light 12-button year navigation; keep same detail panel and recurring model. |
| Calendar touch feedback | PARTIAL | Date stamp was static. P1: short icon-only transform burst, no continuous effect. Regression: correct date after transition and reduced motion. |
| Records search/edit/delete/bulk/undo | WORKING / PARTIAL | Existing manager and derived session totals. Subject/date explicit filters missing. P1: compact disclosure with filters, preserve undo and learning evidence. |
| Task/problem workspace, drafts | EXISTING / WORKING | Existing learning tests. No rewrite. Regression: linked task → answer → draft → refresh → resume. |
| Contextual Help / first guide | EXISTING / WORKING | Existing HelpCenter routes real actions; optional guide exists on home. Preserve; test real routes. |
| Small timer outside study | PARTIAL | Plain text chip, short touch target, no distinctive object. P1: accessible 52px icon control, live time retained, short elastic icon reaction. |
| Liquid effects on iPhone | BROKEN performance budget | Default full-screen WebGL draw loop scheduled indefinitely at idle; studying merely lowers frame rate. Touch framebuffer 390x844 phone / 674x965 tablet in production Chromium. P0: no WebGL context on touch or studying; static fallback, disable touch backdrop stacks, desktop bounded burst and release contexts. Regression: instrument drawArrays/getContext while idle, studying and background. Actual temperature/reboot impact unmeasured. |
| Top header material seam | PARTIAL / not reproduced in initial capture | Canonical shell already makes transparent header and matching body/html. Duplicate glass-specific border rule conflicts conceptually. Remove duplicate; verify nine material transitions, reload, scroll, screenshots. No speculative rebuild. |
| Google Sheets sync | EXISTING / PARTIAL | Per-device config, memory-only Google token; subset planning sync. Keep separate and label scope. Stop forcing repeat consent when grant exists. |
| Private cloud | EXISTING / PARTIAL | Live owner-only API; no persistent login, so reload disconnects. P0: revocable, hashed Redis sync-only session; optional 30-day device login; no Google tokens stored, no AI authorization from session, restore compares before applying. Attachments and drafts remain local. |
| Isolated test mode | MISSING / DEFERRED | Multiple independent localStorage and IndexedDB stores. A flag would not isolate them safely. Existing no-save timer supports casual exploration. Full storage adapter isolation needed before promising test mode. |
| PWA/backup/storage | EXISTING / WORKING | Existing SW waits for tabs to close, scopes cache, backup ZIP and stale-write guards. Regression offline and upgrade. Never clear learner storage. |
| Public student beta | PARTIAL | Backend intentionally owner-only. Multi-user authorization, attachment portability and actual student feedback remain required; do not pretend release is public multi-user beta. |
| Historical workflows / old UI specs | REDUNDANT | Several dated workflows deliberately branch-scoped; no evidence of active duplicate failures. New verification/release gate targets exact source and avoids outdated production SHA constants. |

Severity: P0 blocks daily behavior/reliability; P1 improves clarity and polish. Physical iPhone locking, thermal behavior, camera EXIF/HEIC, installed iOS PWA lifecycle and hardware keyboard require real-device verification; browser simulation is not proof. No invented beta feedback.
