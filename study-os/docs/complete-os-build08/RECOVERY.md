# TEAM BKIT complete OS — recovery and integration record

Observed 2026-10-28. This continues the existing product; it does not replace it.

## Verified boundaries

- Repository default `main` is a compiled GitHub Pages publication branch at
  `371226a`. It is not the frontend source integration target.
- `https://teambkit.com/release.json` still identifies Daily Driver Build 02,
  source `50a89f0053e60d6af1b8ffdd818c299ed3711622`, branch
  `codex/daily-driver-02-source`, API `6b392839a1819494aa9e588a484d918e44d2233b`.
- Public API health confirmed protocol 3, assistant OFF, push false. No paid
  endpoint was requested. Existing briefing is configured in production; this
  session did not change its flags, billing or deployment.
- BUILD 07 Actions run 40544101308 is successful for `29a11aa` (push event;
  the connector's PR-event-only query returned no runs, so the run was read directly).
  Its existing Vercel Preview is READY for that same commit.
- Latest source includes newly discovered Draft PR #49 at `9b0af3a`, after the
  supplied directive's #48 checkpoint. Its reported Vercel failure was a platform
  build-rate-limit status, not evidence of a compile failure.
- Frontend preview project: `bkit-study-os-36-preview`,
  `prj_aRPnZINoxqmwueu8XHUYMcRbJzhF` (Vite).
- API project: `bkit-api`, `prj_EtUvAwl05FsaHmiUvAoFTAdUheF6` (Express).
  API integration lives separately in `feat/bkit-complete-os-api-build08`.
  No TOHEŞAR project or source was edited.

## Preserved source lineage

All PRs were open Drafts when inspected; none was merged into production here.

| PR | Source branch | Observed HEAD | Integration disposition |
| --- | --- | --- | --- |
| [#40](https://github.com/kimkimhs36/BKIT-QWEN/pull/40) | `work/daily-driver-build-01` | `a92c79cc440339e31c0637a903789b367895684e` | Preserved ancestor |
| [#41](https://github.com/kimkimhs36/BKIT-QWEN/pull/41) | `codex/daily-driver-02-source` | `a01019fd5eb2be0b55df9bb93b59f64577f3e799` | Preserved ancestor |
| [#42](https://github.com/kimkimhs36/BKIT-QWEN/pull/42) | `feat/bkit-ai-assistant-backend-20261027` | `e4017a83348481f9798297ec02b6e22abe6d11a9` | Separate API branch |
| [#43](https://github.com/kimkimhs36/BKIT-QWEN/pull/43) | `feat/bkit-ai-assistant-client-20261027` | `e70e7c9458e0c3bbab472cf4bdecb993b1368d1c` | Preserved ancestor |
| [#44](https://github.com/kimkimhs36/BKIT-QWEN/pull/44) | `feat/bkit-real-life-command-center-20261028` | `af41417c7ac31f647b1b97d4aec340a44cf36dd1` | Preserved ancestor |
| [#45](https://github.com/kimkimhs36/BKIT-QWEN/pull/45) | `feat/bkit-real-life-build04-clipboard-tomorrow` | `86fa9f966f15e43a9e31f0733b67f41564aa247c` | Preserved ancestor |
| [#46](https://github.com/kimkimhs36/BKIT-QWEN/pull/46) | `feat/bkit-books-real-life-build05` | `11f5b1c08bd4ba382236c0dd6c5120b234e56c97` | Preserved ancestor |
| [#47](https://github.com/kimkimhs36/BKIT-QWEN/pull/47) | `feat/bkit-exam-lab-real-life-build06` | `a31653e2d559b52cfd46da64f30aa6fd1fa25804` | Preserved ancestor |
| [#48](https://github.com/kimkimhs36/BKIT-QWEN/pull/48) | `feat/bkit-books-exam-build07-20261028` | `29a11aa4370d4865493144e779e97193458e1714` | Preserved ancestor |
| [#49](https://github.com/kimkimhs36/BKIT-QWEN/pull/49) | `feat/bkit-books-study-loop-build08-20261028` | `9b0af3a0b975040ecb73ebd475a0e736ca47e521` | Preserved ancestor |

PR #47 remains unmergeable against its existing #46 base on GitHub. A local
`git merge-tree` identified a content conflict in `App.tsx` at the newly added
exam route; the #46 answer-selector/BooksResume fixes also have independently
replayed commit equivalents in the newer chain. This integration explicitly
merges the #46 parent and retains the exam route, source-specific study action,
BooksResume on progress, and post-study return action. It does not rewrite or
force-push #46, #47 or any other historical branch.

PR #43 conflicts were the home `onExportCalendar` and `onAssistant` prop additions
in App/PremiumHome. Both actions were retained. PR #42 stays on its API ancestry;
merging its old frontend tree into this source would replace newer app models.
The actual API schema is checked from an isolated API checkout using
`npm run test:api-contract -- /path/to/BKIT-API`.

The standalone historical `exam-lab/` deployment and #36–#39 full-screen UI were
not imported over BKIT. Existing integrated `src/juggernaut/` is reused: 36
self-authored maths prerequisite items and five concepts. Books evidence remains
separate from chapter self-reporting, completion, exam grades and real exam scope.

## Storage inventory and safety

No storage key, schema version or migration was introduced for user records.

| Store | Key / database | Boundary |
| --- | --- | --- |
| Main study state | `bkit.study-os.v1` | Local; portable subset through existing owner Cloud v2 |
| School notice originals | `bkit.school-inbox.v1` | Device only; confirmed tasks separately sync |
| Books and chapter bookmarks | `bkit.books.v1` | Device only |
| Original maths partition | `bkit.juggernaut.v1.device` | Device only |
| Extended maths partition | `bkit.juggernaut.build03.math.v1.device` | Device only |
| Sleep | `bkit.sleep-guard.v3` | Existing device store / ZIP |
| Digital originals and ink | IndexedDB `bkit-digital-paper-v1`: documents, originals, recovery | Device only |
| Study photos | IndexedDB `bkit-private-materials-v1`: photos | Device only |
| Sleep photos | IndexedDB `bkit-sleep-photos-v3`: photos | Device only |
| Material and theme | `bkit.material.v1`, `bkit.study-os.theme.v1` | Existing nine themes |
| Session navigation | `bkit.books.selected`, `bkit.books.study-origin.v1` | Session only, opaque IDs |
| ZIP rollback journal | `bkit.complete-backup.recovery.*` | Exact previous local JSON before writes |

`completeBackup.BACKUP_KEYS` remains the authoritative complete key list,
including legacy crashweek, garage, theme, atelier and cloud preferences. Photos
and PDFs/ink use the three existing IndexedDB databases. No credentials or OAuth
access tokens are added to this ZIP or session-navigation state.

The Cloud v2 wire projection now explicitly excludes device exam planning and
unsupported answer metadata, and merges that local evidence back by stable IDs
on download. Photo references, raw originals, Books, current timers and both
maths partitions remain local. The canonical signature matches the real older
API schema without an upload loop in the synthetic contract check.

Complete ZIP verification now also rejects a missing book-linked original or
notice PDF instead of calling an incomplete archive successful. The integrated
fresh-device test opens the recovered book's actual document, reads exact PDF
bytes and ink/cursor metadata, finds the unsubmitted notice task, and reads both
maths attempt partitions. No live user data is used in testing.

## Release and rollback

No production publication, main merge, API deployment, cost flag change, paid
provider request or migration is authorized or executed by this work. Feature
branch previews are review environments only. Existing product/theme designs
and stored records remain in place.

Frontend production still uses the recorded Build 02 source. If a later release
is approved, preserve immutable old assets and the release metadata; use the
existing `0d6ddb8` publication checkpoint for its documented prior rollback and
`50a89f0` source checkpoint for the current release. API code rollback target is
`6b392839a1819494aa9e588a484d918e44d2233b`; never delete Redis snapshots to roll back.
Review exact source, matching preview, CI, backup coverage and API compatibility
before any publication. Paid assistant activation needs separate billing approval.

## Remaining product work

This milestone consolidates and repairs daily notice retrieval, original-first
study, evidence preservation and integration gates. It does not certify every
feature in the master directive. Real OAuth popup/account behaviour, actual paid
model output, physical iPhone/iPad/pen, all historical browser suites and seven
real days of adoption remain separate work. Background push is not implemented.
Multi-user server access remains owner-only, not a released multi-tenant service.
