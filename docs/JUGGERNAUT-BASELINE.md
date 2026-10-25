# JUGGERNAUT BUILD 01 baseline — 2026-10-25 UTC

## Deployment evidence (read before any code changes)

- `GET https://teambkit.com/release.json` identifies source **ca8959c13d45ef04766f5067150a6b5c6104164d**, branch **fix/bkit-clean-cloud-client-20261025**, published 11:33:50 UTC. `/build-info.json` agrees.
- GitHub Pages configuration: `main:/`, CNAME `teambkit.com`, legacy publishing. Latest successful Pages build/deployment: **0d6ddb8c15c538dc81608e7e3fcad24d1ffe7252**, 11:34:47 UTC. `main` contains compiled assets, not the editable application.
- `https://bkit-api.vercel.app/api/health` reports **6b392839a1819494aa9e588a484d918e44d2233b**, protocol **3**. Vercel READY production deployment **dpl_ZkRUuqsQXnSkEphYNuwWuZ6VHreu**, branch `deploy/bkit-api`, agrees.
- Frontend Preview project: `teambkit/bkit-study-os-36-preview`, `prj_aRPnZINoxqmwueu8XHUYMcRbJzhF`, root `study-os`. Separate from API production project `prj_EtUvAwl05FsaHmiUvAoFTAdUheF6`.
- PR #36 is draft, head `af259a29b52e63f4c3249148aa5c71d0dfc943ac`, base **ca8959c**. Its blueprint was read and copied unchanged into this branch.
- PR #35 is the verified clean-cloud client branch; PR #30 record management, #29 material design and earlier stacked PRs are already in its source ancestry. `main` versus source is divergent by design (compiled publication versus editable source), not a reason to merge static assets into source.
- New work branch **feat/juggernaut-build01-20261025** starts exactly at **ca8959c**. No production branches, environments, records, credentials or release workflows changed.

## Existing application

React 19.2 / Vite 6 / TypeScript / Zod. Existing App uses React hooks and local tab navigation, not React Router. Persistent state is `bkit.study-os.v1`, guarded by schema parsing, raw backup and optimistic local conflict detection. Learning files/PDF/ink and the remembered-login credential use separate IndexedDB stores. Theme/material preferences are separate local keys.

Existing `Juggernaut.tsx`, `JuggernautArchive`, Opening and Dashboard provide curriculum, strategy and information; the main app currently blocks the old `juggernaut` tab. They are retained and reachable as `/juggernaut/guide`. Their timer/task actions are not substituted for independent question attempts.

EXAM LAB is a standalone vanilla JS app (`exam-lab/app.js`, `learning.js`, `questions.js`) with original practice questions, a one-question workspace, hints, transfer checks, local progress and a different state model. Its private globals/storage cannot safely become a React resumable session engine. BUILD 01 reuses its pedagogical sequence and explicitly labels original content; it does not alter EXAM LAB. New numeric equation variants have independent substitution/choice tests.

QUESTION RACE (`src/drive/race*`, `questionPace`) tracks pacing/counts and GARAGE derives rewards from existing completed study sessions. Existing learningEngine/problemReview APIs handle resources, attempts and retests inside BKIT state. BUILD 01 intentionally does not award duplicate rewards or fabricate BKIT timer sessions from question attempts; new evidence is isolated. Future integration should use attempt UUIDs as idempotency keys and require meaningful independent learning.

## Auth and storage boundaries

Existing API is **owner-only**, Google access token checked against configured email/client, or an opaque `bkit_sync_*` 30-day credential verified in Redis. No general multi-student membership backend exists. The token stays private in `usePrivateStudySync`; the new scoped request adapter reuses it without exposing it. Existing session issuance, expiry, logout and backup protocols are unchanged.

Current `/api/sync` uses owner-scoped cloud v2 snapshots with CAS, not a place to add unrecognized fields: portableStudyState deliberately excludes newer device-only learning metadata. BUILD 01 adds **bkit.juggernaut.v1.device** and its own `.backup` locally and **bkit:juggernaut:v1:<owner hash>** remotely. Preview uses a separate `preview:` prefix. No migrations, legacy-key deletion, cloud reset, session reissuance, or changes to existing snapshot schemas.

Full BKIT ZIP backup remains untouched. JUGGERNAUT supplies JSON export, validated merge import, previous-device backup merge and raw export. Corrupt originals fail closed. Answers, hints and progress remain in memory on quota failure with explicit export/retry; a browser crash cannot guarantee recovery of bytes that the browser refused to persist.

New API copies only `auth.ts` and `rememberSession.ts` from the observed deployed API SHA. Authenticated GET/PUT `/api/juggernaut` use one separate key and atomic version CAS; no client user IDs or mastery claims are accepted. No AI calls or provider keys are needed. Deleted attempts use merge-safe tombstones and are excluded from evidence/review; tombstones remain in backups.

## Known release boundaries

Frontend Preview project environment metadata lists **zero configured bindings**. Thus live Google/Redis verification cannot be claimed for that project. Its API health must report `configured:false` until supported server bindings are configured. Do not fetch/copy secret values or use production records to test. Synthetic owner/session/store tests cover behavior; live cloud end-to-end remains a release gate.

Production API does not yet serve this additive endpoint. Production publication requires separately reviewed API integration and frontend release, preserving the observed API authentication and origin restrictions. Production deployment is explicitly outside this build's authorization.

Direct routes are emitted as static directories for Pages and rewrites for Vercel. Offline shell lifecycle remains unchanged; existing worker cache replacement does not activate early or delete learning databases.
