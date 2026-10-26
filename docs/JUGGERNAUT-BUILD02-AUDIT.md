# JUGGERNAUT BUILD 02 — source and deployment audit

Audited 2026-10-25/26 UTC before implementation. New branch `feat/juggernaut-build02-20261025` starts exactly at PR #37 HEAD `5799cc64f65ba5f73b12b9dbe899f66bc0853648` (OPEN, Vercel Preview check SUCCESS). PR #37's base is `fix/bkit-clean-cloud-client-20261025`, **not main**. PR #36 design HEAD `af259a29b52e63f4c3249148aa5c71d0dfc943ac` and the unchanged blueprint in this branch were read.

## Production identity and ancestry

Read live `/release.json`, `/build-info.json` and API `/api/health`:

- `https://teambkit.com`: editable source `ca8959c13d45ef04766f5067150a6b5c6104164d`, branch `fix/bkit-clean-cloud-client-20261025`. Published 2026-10-25 11:33:50 UTC. Last-Modified header 11:34:41, GitHub Pages headers. `main` is compiled publication (`0d6ddb8`), not the source baseline.
- API `https://bkit-api.vercel.app/api/health`: `6b392839a1819494aa9e588a484d918e44d2233b`, sync protocol 3, configured.
- `git merge-base --is-ancestor ca8959c HEAD` succeeds. The operational material/record/cloud fixes are already inherited by #37. No merging of generated main assets, production API branch, #36 or #37 was performed.
- Vercel lookup of custom domain as a deployment returned 404 because this domain is Pages; it was not taken as proof of a missing production site. Live manifest + Git ancestry establish the frontend baseline.
- Confirmed separate Preview project `teambkit/bkit-study-os-36-preview`, `prj_aRPnZINoxqmwueu8XHUYMcRbJzhF`, root `study-os`, Vite, latest #37 deployment `dpl_8Q72DqrEdidA4j7GoC8ppMgxVZqV` READY. Production API is a different project. BUILD 02 only pushes its new feature branch and creates a separate stacked Draft PR.

## Application boundaries

React 19.2, Vite 6.4.4 (lockfile), TypeScript, Motion 14.4, Zod. App navigation uses hooks/history rather than React Router. Nine canonical materials use `material.ts`, `material-tokens.css`, `materials.css`, `MaterialEffects.tsx`, `MaterialObject.tsx`, `MaterialSettings.tsx`, `material-experience.css`, `shell-finish.css`. The existing preferences schema, light/dark base, motion/sensor/low-power settings remain authoritative.

BUILD 01's early App return omitted MaterialEffects and set a second JUGGERNAUT palette. BUILD 02 passes the existing `material`/`changeMaterial` state into the OS, mounts the same effects/settings/object components and consumes canonical material surface, light, edge, primary, control, radius and shadow tokens. The shared study flag stops interactive light/springs while solving. Optional scenery is CSS geometry, no WebGL dependency or all-page graphics canvas. The new CSS loads after the BUILD 01 layout, preventing equal-specificity primary-button rules from overriding material colors.

BUILD 01 storage `bkit.juggernaut.v1.device` schema 1, backup, merge, tombstones, API contract, auth/owner boundaries, 24 questions, scoring, independent-evidence rules and scheduling are unchanged. Existing BKIT `bkit.study-os.v1`, IndexedDB file/ink/login stores and cloud v2 snapshots are unchanged. One integration correction suppresses BKIT **home** RecommendationShown logging while a JUGGERNAUT route is active; the home recommendation wasn't displayed there and should never create unrelated records during no-save practice.

## Heritage and educational basis

Read `Juggernaut.tsx`, `JuggernautOpening.tsx`, `JuggernautArchive.tsx`, `juggernaut-heritage.css`, opening CSS and Git history (`d3c9966`, `a0afee9`, `8eeed33`). Existing archive/guide is retained unchanged. Optical concentric tunnel, precise chapter/serial typography, archive → possibility → first-question journey are reinterpreted with the current nine material objects. No film footage, franchise logos, audio or copied film artwork is imported.

The source blueprint prioritizes first independent retrieval, delayed rechecking, short ignition, hints distinct from independent answers, honest UNKNOWN and bounded review. These requirements determine the actual CTA, engine-backed map, quiet training and evidence studio. The original private 39-page research report is **not available in this workspace**; this build does not claim to have read it or invent results from it.

Only the existing three original linear-equation concepts are executable. Graph edges describe this pilot's exercise progression (balance → distribution → negative coefficient/check), explicitly **not an officially validated prerequisite graph**. Wider curriculum topics are unverified/preparing with no learning links. Item substitution tests are not teacher review. The inherited exam date remains labelled design basis; official re-verification is still required before release.

## Captures before changes

Actual Chromium captures in `study-os/docs/build02/evidence/`: `production-bkit.png` (live unauthenticated production home), `heritage.png` (preserved old opening rendered from #37), `build01-command.png` (clean #37 build). These are captured outputs, not design mockups. No real student account or production records were used.
