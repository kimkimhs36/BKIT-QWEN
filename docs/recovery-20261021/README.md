# BKIT product recovery · 2026-10-21

Work branch: `feat/bkit-product-recovery-20261021`, based on the preserved source branch at `a193cae`. The current `main` (`0f63f235055b`) is a GitHub Pages publication tree, not the Vite source tree. No production publication files, other brand files, authentication logic, storage keys, or data schemas are changed by this recovery diff.

## Shipped in the source branch

- A pearl/peach home with a persistent capture entry, immediate study start, compact task list and live weekly calendar. The existing five-screen navigation, timer, learning records, nine material themes, purple jelly animation and local backup systems remain.
- Capture selects homework/assessment/schedule; native camera and photo picker attach private IndexedDB originals. Existing OCR runs locally on demand, displays editable text and falls back to manual input. Duplicate photo digests and duplicate task identities are rejected. Detailed entry carries the capture draft and photos forward.
- A shared-surface calendar expands from the home week strip. Day, week, month, year and 12-year windows read the existing task/schedule/plan state. Dates show restrained category dots and selected-date details. Native browser back and a downward swipe on the handle close it. Years render in bounded windows.
- Recurring school/academy appointments support one-date changes through the existing excluded-date plus dated-event representation. Cancellation preserves future occurrences. Add a dated schedule for a makeup lesson. Changes are staged before a commit; collision checks include preparation, travel, meals and sleep. Study reallocation is opt-in, previewed, validated and preserves locked blocks.
- Contextual help, mobile sheet geometry fixes and a static material fallback for sustained slow animation frames.

## Data and compatibility

`bkit.study-os.v1` and version 1 are unchanged. No migration is needed: exception dates and dated replacements were already supported by the old schema. The calendar is a projection, not a second store. The existing optimistic local-write conflict check and exact pre-upgrade backup remain. A failed task write leaves the form and its private photo originals available. Completing homework and confirming submission remain separate states.

## Deployment facts

See [deployment-evidence.json](deployment-evidence.json).

- `teambkit.com`: HTTP 200; GitHub Pages, `main:/`, legacy build. DNS resolves to the four GitHub Pages addresses. No domain/DNS mutation was attempted.
- Vercel frontend `bkit-study-os-36-preview`: latest observed production build used `main@0f63f235055b`; `ERROR`, `missing_lock_file`, `npm ci` exit 1. That branch lacks `study-os/package.json` and `package-lock.json`. Source recovery fixes this prerequisite; project branch/root settings still need verification before a production release.
- Vercel API `bkit-api`: `deploy/bkit-api@95d7a4f0737d`, READY. The actual `/api/health` returns 200, configured authentication/budget and briefing support. Plan/coach/assistant are explicitly false. Allowed-origin PUT preflight returns 204. An unauthenticated briefing returns 401, as required. An authenticated AI call or cloud write was not performed without a user session.
- Default-context project/deployment reads and non-decrypted environment metadata succeed. Explicit `teambkit` scope and deployment logs return 403 requiring a team grant. The CLI has no credentials; its automatic login flow was canceled. This is partial connector access, not proof of a broken API.
- Root and `study-os/` Vercel configs now provide explicit install/build/output commands and `APP_BASE=/`. They support an explicitly verified source-root deployment, without embedding credentials or changing the API project. The existing Pages build default remains `/study-os/`.

## Validation and remaining limits

Final results are recorded below after browser checks. Physical iOS camera permissions, keyboard behavior and sensor access require device confirmation. The calendar has shared-surface expansion and a swipe handle; it is not a complete native iOS interactive-transition implementation. OCR is optional and requires content review. The current source keeps the established large application/CSS bundles; build size warnings are not suppressed. Future live authenticated AI testing requires the owner's Google session. A help-video placeholder is present; no unfinished-interface video was produced.
