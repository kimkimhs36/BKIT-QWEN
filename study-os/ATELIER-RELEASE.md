# TOHEŞAR × BKIT — Private Study Atelier

## Scope and implementation

First visit: original CSS/SVG JUGGERNAUT cinematic opening → daily briefing →
private document capture → human-confirmed missions → actual BKIT TODAY →
explicit first-five-minute focus start. Returning visits open TODAY immediately.
The opening always offers Skip; reduced motion shows a static continuation.
The original exam archive remains available from TODAY.

The app is React 19/Vite on the source branch `feat/study-os-visual-v2`.
GitHub Pages serves the built `main` branch at https://teambkit.com.
`App.commit` validates and synchronously writes the real BKIT state to
`bkit.study-os.v1`; the preparation UI never uses a parallel demo task store.
A save failure retains the draft and stays in preparation. The existing focus
engine retains sleep/fixed-event guards, pause/resume and session receipts.

`atelier.ts` separates draft validation, deterministic preparation and duplicate
merging from the UI. Input is one mission per nonempty line (up to 20). Subject,
kind and quantity are editable rule-based suggestions. Relative/ambiguous dates
are left empty. Only explicitly typed full dates can be prefilled; every mission
requires confirmation, reset whenever a field or photo association changes.
The editable 25-minute default is explicitly labeled; it is not an AI estimate.
Same normalized subject/title/kind/deadline reuses the existing task; stable IDs
also make retries safe if cleanup is interrupted. Distinct deadlines allow
recurring assignments. Quick capture and manual/assistant additions also check
for duplicates.

## Privacy, local persistence and limits

- Text, mission edits, step and photo references are saved on each change in
  `bkit.atelier.draft.v1`. A cross-tab draft change blocks overwriting and saving.
- Original images are stored only in this origin's IndexedDB
  `bkit-private-materials-v1/photos`, as ArrayBuffers with MIME metadata.
  WebKit File/Blob structured-clone failure was reproduced during tests;
  byte storage fixes it. Typed Blobs/object URLs are constructed for previews
  and revoked on unmount. No image requests go to a server or public repository.
- Camera and multi-select gallery input pickers are opened synchronously from
  user clicks. No camera permission is requested at startup.
- Maximum 12 images per draft/task, 20MB per image, 60MB per draft. Exact image
  duplicates are detected by SHA-256. Unsupported files produce an error.
- Photos can be associated with individual missions, viewed in preparation,
  TODAY or the task editor, and opened/downloaded as originals. Browser-unsupported
  formats (including HEIC on some engines) show a fallback and original download.
- Attachment IDs are optional additions to the existing task schema. Editing a
  task and pulling cloud updates preserve device-local photo references by ID.
  Shared Google Sheets serialization excludes images and references entirely.
- This is **device-local persistence**, not a user-account cloud database. Safari
  website-data deletion/eviction, private browsing and quota limits can remove
  local records. The UI tells learners to retain original photos. Existing JSON
  backups contain task metadata/references, not image bytes. Photos are not
  synchronized across devices. Detached photo bytes are conservatively retained
  locally so a recovered draft cannot delete another task's source material;
  a future storage manager can garbage-collect proven-unreferenced records.

## Phase two extension

OCR, performance-assessment document analysis, date/material extraction and AI
priority/time recommendations are **not implemented**. There is no connected
recognizer or AI simulation in the preparation flow. The capture screen states
that photo text is not read automatically, and photo-only manual registration
works today.

A future recognizer should be a separate provider behind `atelier.ts`, return
proposals with source photo IDs, confidence and explicit/ambiguous provenance,
and never write directly to `App.commit`. Its results must enter the same
editable, initially unconfirmed mission review. A real provider, privacy policy
and explicit transmission UX must exist before remote photo processing is enabled.

## Recovery and release

Remote annotated recovery tags:

- `archive/study-os-before-atelier-20261016` → source `8d430dc`
- `archive/teambkit-live-before-atelier-20261016` → successful site `70ff619`

No force push or history rewrite. The workflow preserves the site branch history,
unit-tests and builds the source, runs new Chromium/WebKit iPhone/iPad acceptance
and existing regression suites, publishes static assets, refreshes the independent
Safari entry, explicitly requests the Pages build and verifies its exact site
commit plus the source SHA in live `release.json`.

To restore source, branch from the source tag (do not reset/rewrite shared history).
To restore the public site, make a new deployment commit whose tree is the live
site tag, push to `main`, request `POST /repos/kimkimhs36/BKIT-QWEN/pages/builds`,
and verify the new Pages build and domain. The source workflow must then be
updated or paused intentionally before the next source push.

## Verification record

See `ATELIER-TEST-REPORT.md` for final checks and remaining physical-device limits.
No user photos or personal study data are used in tests. Image fixtures are
synthetic tiny PNGs, generated in memory, and remain local to browser contexts.
