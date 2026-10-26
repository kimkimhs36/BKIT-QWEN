# BKIT JUGGERNAUT BUILD 02 — implementation and QA

Status: working feature branch / Draft PR #38. This is a reviewable local-learning pilot; production release, physical-device validation and teacher-reviewed expanded curriculum are not complete.

Branch: `feat/juggernaut-build02-20261025`, stacked on unchanged PR #37 HEAD `5799cc6`. Audit: [source and deployment](JUGGERNAUT-BUILD02-AUDIT.md).

## 1. Actual code

- `CommandCenter.tsx`: operation scene, direct/resume/review next action, engine-backed evidence, current subject coverage, arrival choice.
- `Arrival.tsx`: optional/replayable archive–future–first-question chapters, skip/manual scene controls, static Reduced Motion mode; no film assets/audio.
- `KnowledgeMap.tsx`: lazy React Flow, three real selectable concepts, engine evidence states, direct real training, accessible list, visibly unavailable expansion.
- `PerformanceStudio.tsx` / `performance.ts`: independent answers, valid different-item due-review numerator/denominator, Korea-day ledger and editable error frequency. No synthetic grades/mastery percentages. No review denominator produces a dash, not 0% or 100%.
- `Scratchpad.tsx`: existing BKIT InkCanvas, pen filtering/eraser/undo/clear, side-by-side tablet layout. Explicit ephemeral ink; it is not stored or counted as a verified explanation.
- `MathAnswer.tsx`: native decimal keyboard and signed-number pad for the existing integer-answer contract. Symbolic/fraction input is explicitly unsupported in this slice.
- `LearningModuleBoundary.tsx`: map download failure leaves actual concept learning usable; ink loading failure leaves the question form working.
- `JuggernautOS.tsx`, `build02.css`, App material props, Pages route emission, separate verification workflow and additional tests. BUILD 01 engine/content/useStudy/API/auth/schema and existing tests remain unchanged.

## 2. Reused BKIT design assets

All nine canonical materials, material preferences and base theme, MaterialEffects, MaterialObject, MaterialSettings, world/card/edge/primary/control/shadow/radius/blur/on-accent tokens; existing Motion; existing InkCanvas/paperInk. Study stops interactive light and springs; low-power/reduced/hidden modes keep the space usable, touch devices avoid automatic portal breathing. No GPU package or context is required.

## 3. Heritage

Read old source/history/opening/archive and preserved guide unchanged. Reinterpreted concentric tunnel geometry, J seal, archive serials, editorial typography, history → possibility → one real question. Repeated visitors can start immediately; first visitors can choose the optional opening. No forced intro or copyrighted film media.

## 4. Open source

[Full repository/source/license/compatibility/size decisions](../study-os/docs/build02/OPEN-SOURCE-REVIEW.md). Only pinned @xyflow/react 12.12.0 added after independent React 19 PC/mobile spike. Notices for every new transitive package are served under `/third-party/juggernaut-build02-licenses.txt`. MathLive/KaTeX/Compute Engine remain experiment-gated; current pen/persistence/graphics and Motion are retained. Three/Drei/Excalidraw are not installed.

## 5. Learning implementation and protected functionality

Actual 24 original items / 3 concepts. Existing diagnostic, wrong-answer repair, staged hints, immutable first answer, guess flag, different-item retry, delayed review, no-save practice, paused session restore, delete/export/import/backup, offline cached reload, owner API/CAS/merge/tombstones are preserved. New screens use the same document and begin/submit/advance/evidence functions. One integration correction stops unrelated BKIT home recommendation exposure records while in JUGGERNAUT.

The graph describes the pilot's exercise order, **not a validated official prerequisite graph**. Extended algebra/functions/calculus remain unverified/preparing. Item substitution validation is not human teacher review. The private 39-page research report is unavailable; the available PR #36 blueprint was read without inventing report findings.

## 6. Before / after

[Actual captures and screen-by-screen review](../study-os/docs/build02/CAPTURE-REVIEW.md). Includes live BKIT, heritage, BUILD 01 command, BUILD 02 command/training/map/studio. Final Preview observations/captures are recorded with origin and time by `scripts/juggernaut-build02-evidence.mjs`.

## 7–9. Verification, regression and Preview

Final result table and immutable Preview identity are appended after runs finish. Commands use root APP_BASE and isolated output directories. Existing tests are not removed or weakened. The new multi-space/9-theme/4-document accessibility scenarios allow 60 seconds per scenario; inherited BUILD 01 timeouts are unchanged.

## 10. Honest limits / release gates

- No physical iPhone Safari, iPad/Apple Pencil, Galaxy Tab/S Pen, battery/thermal or hardware IME test. Chromium emulation and automated WebKit are named as such.
- Preview API health currently `configured:false`; live cloud/cross-device owner login remains unverified. No production credentials, databases or records were copied or tested. No multi-student auth expansion.
- Only the three existing numeric prerequisite concepts; no teacher-reviewed full curriculum, validated official graph, symbolic step checking, AI evaluation, grade prediction or official past exam import.
- Optional scratch ink is intentionally temporary; reload/question change clears it. Answer text/engine resume use the protected existing storage.
- 2027-11-18 is inherited design basis with official announcement recheck still a release gate.
- No empirical claim that this design raises exam scores or that desktop timing predicts real-device battery/performance.
- Existing large BKIT main/vendor chunks remain. The map is separately lazy; service worker precaches offline-shell assets, so lazy execution does not imply zero background offline download cost.

## 11. Next steps

1. Physical iPhone/iPad/Galaxy pilot: IME/keyboard viewport, safe areas, rotation, stylus palm/cancel handling, low-power/thermal and daily fatigue.
2. Review three concepts with a qualified teacher; validate actual curriculum sources and prerequisite relationships before expanding the graph.
3. Bind scoped Preview-only auth/storage through supported configuration and validate live owner cross-device persistence; review additive API release separately.
4. Isolated MathLive/KaTeX/Compute Engine fraction/domain/step-validity experiments only when validated content requires them; verify fonts/worker limits/license versions.
5. Gather first-answer time and delayed independent review outcomes from a consented pilot before altering the scheduler or claiming educational efficacy.

Rollback: close Draft #38 or revert its UI integration independently. Do not remove learning keys or migrate/delete data. No production merge/publication was performed.

## Verified immutable Preview and measured observations

- URL: https://bkit-study-os-36-preview-6qhnsvt1t-teambkit.vercel.app/juggernaut/
- Target: **Preview** (`target:null`, environment manifest `preview`), READY.
- Commit: **a373a02f5b62291b231fccab4f73e2ef3688ad1b**; deployment **dpl_8bt1WxQgJgPTMdqS8doS62WmyRuC**.
- Project: teambkit/bkit-study-os-36-preview, Vite. Build 2026-10-26 00:07:59–00:08:47 UTC (approximately 48 seconds).
- Deployed `/build-info.json` agrees. `/api/juggernaut/health` reports `configured:false`, isolated-v1 owner adapter, no misleading cloud acknowledgement.
- **26/26 deployed Preview browser tests passed** on PC and Chromium iPhone 13 emulation (2.5 minutes). Includes complete wrong-answer → repair → new item → delayed review, hints, first-answer retention, no-save, offline SW reload, quota/corrupt original safety, synthetic authenticated transport, arrival/replay/reduced motion, all 9 materials, ink, signed keypad, map download fallback, evidence studio and accessibility. Cloud transport in this suite is explicitly synthetic, not live Redis/login.
- **4/4 final local accessibility scenarios passed**, each audits Command/Map/Studio/Road at PC, iPhone, iPad and Galaxy ratio. No serious/critical WCAG 2A/AA/2.1AA axe violations in those scans. This is not proof of full manual accessibility or all nine themes' contrast.
- **301 unit/API tests / 48 files passed**. **8/8 existing BKIT home/timer/calendar/auth/record regressions passed**; their underlying App/home source is unchanged by the later scoped visual fixes.
- Browser observations from the exact Preview: desktop click→visible question form **193ms**, iPhone emulation **73ms**; these include Playwright overhead and are **not INP, network-load benchmarks or real iPhone measurements**. Both contexts saw **0 WebGL context requests**, no horizontal overflow, and one real stored synthetic answer. See `evidence/browser-observations.json`.
- Final module measurements: KnowledgeMap JS about **188 kB / gzip 61.76 kB**, CSS 15.87 / gzip 2.67. Lazy map/arrival/ink execution. Existing BKIT main chunks >500 kB remain a bundle warning, not hidden by increasing the warning threshold.

### Failure history and reproducibility

An earlier Chromium run was 51/52; its remaining iPad axe failure exposed inherited global main opacity animation. An earlier clean CI at 4df8153 was 64/65 with the same contrast issue; the final code disables text fading in the independent learning main, preserving explicit Arrival animation. The final four local scans and all 26 deployed tests pass after this fix. Early local WebKit, run concurrently with Chromium/build work, had three timeout failures; these are retained in `webkit-earlier-run.log`, not represented as success. Final WebKit and clean CI results follow below once complete.

Commands (study-os):

```sh
npm run typecheck
npm test
APP_BASE=/ VITE_JUGGERNAUT_API_URL='' npm run build
APP_BASE=/ BKIT_TEST_BASE_URL=http://127.0.0.1:4173/ npx playwright test tests/e2e/juggernaut.spec.ts tests/e2e/juggernaut-build02.spec.ts --project=desktop --project=iphone --project=ipad --project=galaxy-css --workers=2
APP_BASE=/ BKIT_TEST_BASE_URL=https://bkit-study-os-36-preview-6qhnsvt1t-teambkit.vercel.app/ npx playwright test tests/e2e/juggernaut.spec.ts tests/e2e/juggernaut-build02.spec.ts --project=desktop --project=iphone --workers=1
BKIT_EVIDENCE_URL=https://bkit-study-os-36-preview-6qhnsvt1t-teambkit.vercel.app/ node scripts/juggernaut-build02-evidence.mjs
```

Local WebKit uses extracted Debian libraries in the downloaded browser's sys/lib directory; host validation alone cannot find libGLES there, so the local launcher skips the **host library precheck**, not any test assertion. The CI workflow installs supported dependencies normally and independently; it does not use this workaround. Neither environment is physical Safari.

## Final WebKit result and CI boundary

**26/26 passed (4.9 minutes)** on the final a373a02 local build, automated WebKit iPhone/iPad. Includes all seven BUILD 02 scenarios and all six unchanged BUILD 01 scenarios per device. No inherited assertion/timeout was removed, relaxed, or skipped. `study-os/docs/build02/webkit-final.log` records the clean final run.

GitHub Actions run [40247849941](https://github.com/kimkimhs36/BKIT-QWEN/actions/runs/40247849941) tests the same a373a02 commit. Its typecheck/build/301 unit/API tests passed. At final reporting it is still in `npx playwright install --with-deps chromium webkit` (started 00:09:02 UTC); **final CI browser/regression success is not claimed**. The earlier 4df8153 run finished 64/65 and exposed the subsequently fixed text-fade contrast problem. Superseded runs were cancelled; the final run remains active. Local final WebKit, final accessibility scans, existing BKIT regressions and the exact deployed Preview evidence are reported separately from this pending CI gate.

Production recheck: PR #37 still OPEN at 5799cc6; main still 0d6ddb8; editable production source still ca8959c; API branch still 6b39283. No production branch, merge, deployment, namespace or record was changed.

Additional exact-Preview iPad landscape: **13/13 passed (1.6 minutes)**. Total deployed Preview evidence is now **39/39** across PC, Chromium iPhone and iPad landscape. The physical-device limitation remains unchanged. See `preview-tablet-tests.log`.
