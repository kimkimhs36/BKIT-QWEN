# BUILD 03 — The Living Academy

Implementation branch `feat/juggernaut-build03-20261026` starts at actual PR #38 HEAD **f3a0102d07be7a1b3264c09fac7ed42db5b3f6ed**, not the earlier supplied a373a02 validation commit. No production branch, configuration or records are changed.

## BUILD 02 unresolved gates investigated first

Run 40247849941 is **cancelled, not successful**. GitHub check annotations explicitly say “The job has exceeded the maximum execution time of 20m0s”. It has no concurrency policy; the final run did not end because of a superseding push/manual cancellation. Browser dependency installation consumed ~15m; E2E was interrupted and existing BKIT regression skipped. Latest f3a0102 documentation commit used `[skip ci]` and had no completed full Actions run. Annotation evidence: `docs/juggernaut-build03/build02-ci-annotations.json`.

The new verification workflow keeps all tests, uses independent matrix jobs and 45-minute browser-job limits with a bounded install step. It never deploys. Baseline local typecheck/build/301 tests passed. Chromium baseline PC/Galaxy/iPad landscape: 39 passed. Initial WebKit runs failed to launch due missing host libraries. After extracting Debian libraries locally, baseline had 10 passed and two artifact ENOENT failures caused by another suite sharing its default output directory. These runs remain in logs and are not labelled successful full verification. Final runs use separate output directories, sequential local browser suites, and supported normal dependencies in CI.

## Implemented product scope

- Preserve Arrival, optical tunnel, J seal, BKIT canonical materials/Motion and original 24 items/three-concept diagnosis.
- Two new math concepts / 12 authored items, bounded fraction input, explicit answer labels, staged help and original-question repair return (assistance retained). [Content and sources](JUGGERNAUT-BUILD03-CONTENT.md).
- Five-concept map with source-backed task-function relations vs dashed practice order, evidence, available items, metadata, detail panel and mobile list. No official curriculum/prerequisite certification claim.
- Daily Road per-visit capacity, exam-week one-task suggestion, bounded due work and distinct unavailable subject-engine formats. No doubling missed days or invented other-subject readiness.
- Studio shows actual first-to-latest independent-answer changes and hint reduction; original delayed-review denominator and learning-day ledger preserved. No fabricated chart or exam-score claims.
- Larger temporary paper, clear confirmation, pen-only touch filter and rotation retained. Ink is explicitly ephemeral; no pen data enters learning storage/backups.
- New namespace for math extension; legacy storage/API contract preserved, combined export plus rollback-compatible export, corruption fail-closed, visible partial-write failures and sticky deletion. [Data/rollback plan](JUGGERNAUT-BUILD03-DATA.md).

## Cloud and hardware boundaries

No isolated Preview credentials are configured in the runtime. Do not copy production keys. Legacy owner API/remembered-session checks, CAS conflict/retry, lost acknowledgement, reconnection, expiry, corrupt original and duplicate transport are covered with **synthetic** tests. Extension IDs are actively refused by legacy API and never uploaded by client. New math records are explicitly device-only.

Live Google login, real owner authentication, cross-device upload/download, real concurrent cloud editing, live expiry, server backup/recovery remain **unverified**. Preview health and immutable source identity will be recorded below after deployment. Physical iPhone/iPad/Apple Pencil/Galaxy/S Pen, true IME composition/palm rejection, thermal/GPU/battery behaviour remain **unverified**. Automated WebKit and viewport emulation are not physical-device certification.

## Evidence and checks

`study-os/docs/build03/` holds logs and actual Before/After captures. Before is the built f3a0102 UI. After will be captured from immutable Preview; no synthetic design mockups. React review keeps lazy map/ink boundaries, native labelled form fields, native Korean textarea, cleanup for observers/listeners and canonical tokens. No new dependencies/lockfile changes.

Final CI/Preview/test identities are appended after they actually complete. This document does not substitute a plan or local pass for a green CI run.
