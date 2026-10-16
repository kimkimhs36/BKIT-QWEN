# Private Study Atelier verification — 2026-10-16

## Automated coverage

- `npm test`: 88 unit tests passed (15 files).
- `npm run build`: TypeScript and Vite production build passed.
- New acceptance scenarios exercise iPhone-sized Chromium, iPhone-sized WebKit,
  and iPad-sized WebKit: first cinematic entry/skip and quick return, natural text
  preparation, user-initiated camera/gallery choosers, multiple local images with
  loaded previews, refresh/reopen recovery, manual photo-only registration,
  per-field confirmation reset, actual BKIT task persistence, duplicate replay,
  linked first-five-minute focus, quota failure, unsupported attachments,
  reduced motion, 16px inputs and horizontal fit.
- Axe WCAG 2 A/AA and 2.1 AA checks cover all three preparation screens and
  returning TODAY at 320px. Secondary text on ivory surfaces was darkened after
  contrast findings; the first responsive test also found and fixed hidden
  file-input overflow.
- Legacy regression suites cover task capture/date precision/quantity persistence,
  assistant confirmation, Google-consent privacy/error handling, fixed navigation,
  focus hide/reveal, actual learner attempts and final session receipts, scroll
  restoration and readable optical fallbacks. iPhone Chromium (16 scenarios)
  and iPhone WebKit (13 scenarios) are required in publication CI.
- Final publication CI requires 24 new mobile acceptance checks + 29 existing
  regression checks, in addition to unit tests and the production build. The
  workflow log is the authoritative final result for the committed source.
- A desktop Chromium checkpoint passed all seven original new-flow scenarios.
  iPhone TODAY and iPad WebKit briefing screenshots were also visually inspected.

## Findings corrected before release

1. WebKit IndexedDB refused a File/Blob value; a direct browser probe reproduced
   failure for Blob and success for ArrayBuffer. Photos now store bytes/MIME and
   reconstruct Blobs for display. The complete WebKit photo flow then passed.
2. A visually hidden picker inherited full-width input styles and caused overflow.
   Picker inputs are now truly hidden and are opened only by visible user buttons.
3. The new full-screen arrival inherited a legacy bottom-sheet animation.
   It now explicitly disables that container transform while keeping cinematic
   sequences and small step transitions. Reduced motion has a static path.
4. Existing task edits/cloud pulls could discard newly added photo IDs. Local
   references are now preserved, while shared Sheets exports still omit them.
5. Repeated confirmations/recovered drafts could create duplicate missions.
   Stable IDs and normalized content/deadline matching make saves replay-safe.

## Privacy evidence

The full new-flow acceptance test monitors every non-GET/HEAD request from
briefing through capture, save, photo reopening and focus launch, and asserts
there are none. Its in-memory PNG fixtures are synthetic; no personal material
is included in source, screenshots or public build output. IndexedDB/photo bytes
are not serialized to the BKIT JSON task store, shared Sheets or public URLs.

## Deployment verification

Publication is authorized to the existing Pages site. Source stays on
`feat/study-os-visual-v2`; static deployment commits stay on `main`. Both
pre-redesign source and live site have annotated remote recovery tags documented
in `ATELIER-RELEASE.md`. No history is rewritten.

The updated workflow explicitly requests the legacy GitHub Pages build, waits
for the deployed site commit, and verifies that https://teambkit.com/release.json
contains the source commit. Its final successful run, the separate Pages run,
and a post-publication browser check should all be consulted; a source push or
successful Vite build alone is not a deployment success.

## Remaining limits

- These are real browser-engine tests in emulated iPhone/iPad contexts, **not
  physical iPhone/iPad hardware tests**. Native iOS camera hardware, photo-library
  permissions, HEIC rendering/rotation, actual software-keyboard/safe-area behavior
  and long-session thermal performance still need physical Safari checks.
- OS picker dispatch/attributes and file selection are automated; no photograph
  was physically taken in this environment.
- OCR/AI document interpretation, deadline/material extraction and priority/time
  recommendations remain phase two. No recognition is claimed or simulated.
- Records and original photos remain device-local. Browser-data eviction/deletion
  and private browsing may remove them. Photo bytes are not included in existing
  JSON backups or cross-device sync. Keep original photos outside the browser.
