# Deployment result — 2026-10-27

- Live: https://teambkit.com
- Source: 50a89f0053e60d6af1b8ffdd818c299ed3711622
- Published Pages commit: 371226acbbcf3043913d9d8fbaf1312489510414 (exact Pages build confirmed built; public build-info verified).
- PR: https://github.com/kimkimhs36/BKIT-QWEN/pull/41
- Preview: https://bkit-study-os-36-preview-git-codex-daily-driver-a15209-teambkit.vercel.app
- Rollback: checkpoint/bkit-daily02-50a89f0 → 0d6ddb8c15c538dc81608e7e3fcad24d1ffe7252.

Production build/typecheck, local vision privacy check and 290 unit tests passed. Selected Chromium regression suites passed 27/27 each on iPhone, iPad portrait, iPad landscape, desktop, Galaxy tablet landscape (1280×800 touch), and Galaxy phone portrait (360×780 Android touch). These are emulations, not physical-device certifications.

The extended matrix was stopped at the user's explicit request to deploy immediately. Its interrupted results were 87 passes / 1 interrupted / 47 unrun in core and 61 passes / 2 failures / 1 interrupted / 17 unrun in landscape. Galaxy phone completed 27 passes. Do not interpret the interrupted matrix as a full WebKit pass.

Root-path release gates: all 8 real-life activation scenarios passed on desktop; both Samsung-phone activation-counting and raw-corrupt-inbox recovery tests passed. WebKit iPad landscape calendar timeout passed unchanged on re-run in 6.8 seconds. The WebKit landscape notice flow still hit the 30-second total test budget on re-run; its separate quota/retry case passed. That timeout remains unresolved. All originals, task/submit independence and actual ZIP restore checks passed in the completed Chromium scenarios. No owner records were used.

User explicitly requested immediate production deployment after being informed about the timeout and asked to stop the broad matrix. Static assets were published without deleting old assets or changing Cloud v2, browser storage, BOOKS/JUGGERNAUT branches or independent routes. API source/protocol were confirmed unchanged. Public homepage → school inbox was checked after publication. Explicit Pages build request returned 403, but the automatic build for the exact publication commit completed successfully.

Unverified: real iOS/Samsung Internet hardware, real owner's photographs/HEIC, OS eviction, real account-to-account cloud synchronization and 7-day adoption. Background scheduled Push is not implemented; the UI says so. Start now: home → school inbox → preserve one real school notice.
