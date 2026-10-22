# BKIT learning continuity · 2026-10-22

## Source and integration

- Repository: `kimkimhs36/BKIT-QWEN`; source: `study-os/`.
- This branch: `feat/bkit-learning-continuity-20261022`, based on PR #23 head `773d18077deae112e289dc833f0a9ac05a5804f3`.
- Integration order: recovery `9d49ed0` → PR #22 (`c38bb92`) → PR #23 (`773d180`) → this branch. Keep this PR based on `feat/bkit-first-learning-action-20261022`; do not merge into `main` directly.
- API PR #21 (`9d8e542`) remains independent against `deploy/bkit-api` (`95d7a4f`). No API branch, production branch, DNS, key, budget or access policy was changed.
- `main` is a published asset tree. Current `teambkit.com/release.json` reports source `7963032` on `feat/bkit-compact-experience-20261021`, not PR #23.

## Implemented

- Home uses the same selected/recommended task as the existing start/event logic. A disclosure lets the learner choose another real task or free study. Both five-minute home actions retain that choice.
- Active and imminent protected schedules have an honest preparation/time-table action. The authoritative start guard remains in App.
- Both task-linked and quick study expose a concrete first action and explicit first-attempt acknowledgement. Timer time never creates an attempt or increments problem quantity. A session gets at most one first-attempt event.
- First attempt reveals three quiet follow-ups: next question, retry, concept check. These are local instructions; they do not invent material, submit an answer, or claim understanding.
- Optional first-step notes and next-action choice survive routes, reload, quick→task/resource attachment and session finish. Recent notes are readable in Records and session details.
- Written-answer drafts in the existing single-problem workspace autosave locally. A shared draft guard flushes before navigation, tab hiding and reload. Failure retains the text, blocks in-app navigation and offers retry. Forced browser/OS termination can still defeat any final unsaved write.
- Additive optional schema fields: `learningStep` on active/quick/session and `workspace.answerDraft`. Storage key and schema version remain v1. Old backups still parse. ZIP/JSON contain committed drafts; private cloud projection excludes new local notes/drafts, and an older cloud response preserves them on this device.
- Existing nine materials, purple Soft Jelly, race/garage rewards, capture/OCR, photos/PDF/ink and backup systems remain in place.
- The clock no longer reserves a full square of blank height. Focus controls and first-attempt action fit the small phone; status toasts stay away from the learning action. New controls use material tokens and 44px touch targets.
- Local statistics distinguish written answers and first-attempt self reports, and expose median/P75 and start→attempt counts. Targets are labels, not claimed observed student outcomes.

## Verification at the first code checkpoint

- `npm ci`, TypeScript and Vite build passed. Existing baseline had 253 unit tests; current unit suite has 261 passing tests.
- Baseline PR #23 E2E: free timer passed; task test failed because it referenced the removed `오늘 할 일 정리` home button. It now exercises the current real capture form and retains stronger data assertions.
- First-learning flow: 6 iPhone Chromium + 12 iPhone/iPad WebKit cases passed.
- Draft/recovery/accessibility: 3 iPhone Chromium cases passed, including storage exhaustion and a 320×740 geometry/axe check. Broader cross-device acceptance is running; append final results below.
- API PR #21 was checked out separately with its own lockfile: TypeScript and 100 tests passed. Synthetic provider/Google/Redis fixtures, no paid inference.
- Before/after screenshots and geometry: `artifacts/learning-continuity/`; reproducible script: `scripts/review-learning.mjs` (baseline and current preview URLs configurable).
- Cloud workspace WebKit dependencies are unpacked under `/workspace/runtime-libs`; browser bundle `sys/lib` links point to those libraries. Its executable wrapper resets LD_LIBRARY_PATH. All dependencies load, but Playwright's ldconfig-only GLES probe gives a false negative. Local WebKit runs use `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1`; no browser assertion is skipped. CI installs dependencies normally.

## Infrastructure and DeepSeek evidence

`GitHub feature branch → study-os Vite build (APP_BASE=/) → bkit-study-os-36-preview → frontend`

`main static assets → GitHub Pages → teambkit.com → bkit-api.vercel.app → Google owner verification → Redis reservation → DeepSeek`

- Existing PR #23 preview responds with HTML at `https://bkit-study-os-36-preview-git-feat-bkit-first-le-91686e-teambkit.vercel.app/`. This alone does not prove this new branch is deployed.
- Production API `/api/health` and `/api/config` return 200, source `95d7a4f`, mode configured, auth/budget configured, daily 1,000 KRW, briefing only. No secret values were read or logged.
- Unauthenticated owner endpoint returns 401; `https://teambkit.com` preflight returns 204; preview origin returns 403. The preview CORS rejection is an application policy, separate from Vercel's team-scope authorization failure.
- Official `https://api-docs.deepseek.com/quick_start/pricing` checked: `deepseek-flash` supported, JSON supported; peak uncached input $0.30/M and output $1.20/M match existing reservation assumptions. No model replacement needed.
- Vercel frontend and API project metadata reads with `teambkit` scope both return 403: this connector lacks the team grant. No `authorize_team_access`/SSO tool is available in this session; no CLI identity or deployment-protection bypass was attempted. Root Directory/live environment presence, deployment source and protected logs cannot be freshly certified through the management API.
- No owner OAuth token or DeepSeek secret is configured in this execution environment. Owner authentication, live Redis reservation and actual model response remain unverified. Do not report the API as inference-verified.

## Remaining boundaries

- No production release or merge is authorized by this checkpoint. Review tested preview before any production decision.
- New local note fields require this version (or ZIP) on another device; old deployed clients do not know them. Private cloud intentionally does not transport them.
- Single-problem setup fields before pressing “문제 정하고 시작” are still a form, not a committed workspace. The new durable answer draft applies after choosing a question.
- Per-question PDF/ink/race records continue using the existing learning engine. Follow-up guidance does not invent a next digital question when no material exists.
- Real Apple hardware keyboard/pen/PWA/long suspension validation is separate from browser emulation.
- Some older E2E suites target removed pre-recovery home controls. The release suite uses current flows; do not claim all historical tests pass.


## Final code checkpoint and additional fixes

- Final product code: `9a6bc836982cdefa3878ec4c0b429334086a33ec`. Later handoff/artifact commits do not change product code.
- Draft-save race found in CI: a queued debounce could succeed after a failed flush and remove the retry button before the learner tapped it. Failed flushes now cancel that timer and retain the explicit recovery state until a new write attempt. Regression advances the clock past the old debounce and still requires a manual retry.
- The Tools “공지 정리” entry previously forced the photo stage, making text/AI intake reachable only via “이전”. It now opens the saved notice workflow at its natural starting point. Existing drafts and all capture routes remain available.
- Home's global submission count now resets the task-kind filter. Previously, a prior assessment filter could hide pending homework submissions. The regression first reproduced the bug, then verifies the actual submission and preservation of the other task.
- Screenshot review found inherited green clock/status colors on Night. Focus now uses material ink/muted tokens. Every material's clock contrast against its base is explicitly checked at >=4.5:1; Night axe scope includes the whole focus card. All nine theme motions remain untouched.
- Focus notices also now override the legacy important top/bottom rules, so a transient start message cannot cover learning controls. The entire notice is geometry-checked above the controls on desktop and all three Apple WebKit profiles.
- Build emits `/build-info.json`, containing only validated source commit, branch, environment and an explicit `build-identity-only` scope. No environment values, owner identity or credentials are serialized. CI supplies source metadata; Vercel's system variables were confirmed in the live Preview. Use a source query parameter to avoid a previously cached alias/404 response.

### Evidence and scope

- `npm ci`, TypeScript, 264 frontend unit tests and root Vite build passed. API PR #21's own locked tree passed TypeScript and 100 tests separately.
- Exact-code final CI: https://github.com/kimkimhs36/BKIT-QWEN/actions/runs/39734767359 — SUCCESS on `9a6bc836982cdefa3878ec4c0b429334086a33ec`: 264 unit tests, TypeScript/root build and 160 E2E cases (39 core + 1 quick-theme case in each of desktop, iPhone WebKit, iPad WebKit and iPad landscape WebKit). See `artifacts/learning-continuity/release-evidence.json`..
- Preceding functional checkpoint `6f21e9e`: all four CI jobs succeeded, 39 core + 1 quick-theme test per job, 160 E2E cases total. Run: https://github.com/kimkimhs36/BKIT-QWEN/actions/runs/39732322759 .
- Live Vercel Preview at `6f21e9e`: 15 iPhone WebKit functional cases passed, covering real capture→task→first attempt→note→finish→reload, free study, fixed schedules, 100 tasks, local draft failure/retry, four synthetic AI configuration failures, themes and global submissions.
- Live Vercel Preview at final `ca2885e`: two additional iPhone WebKit visual/accessibility cases passed, including all nine palette contrasts and entire focus-card axe validation. `preview-webkit-night.png` is this inspected live Night capture. At `9a6bc83`, one further live WebKit layout/axe case passed after the toast fix; `preview-webkit-focus.png` is that inspected capture.
- Root build `48c799a`: 10 iPhone WebKit core/draft/theme cases passed. Five additional iPad WebKit digital-paper tests passed: 10-page PDF/105 strokes, problem 8→9 continuity, ZIP transfer, rotation/tools/cancellation, private photo source policy and in-progress pen-stroke protection. Pointer/pen events were synthetic, not physical Apple Pencil hardware.
- Galaxy CSS profile (1280×800, touch) at `6f21e9e`: 15 cases passed. This is viewport/browser emulation, not a physical Galaxy Tab test.
- A genuinely empty browser without the visited marker starts free study, records an attempt only after an explicit tap, and retains the completed session with zero automatically claimed problems. `first-visit.json` records this check; no student timing goal is claimed.
- Geometry (same synthetic task): at 390px width, clock height 312→142px and focus controls' bottom edge 864→476px; at 320px width, 250→134px and 802→452px. No horizontal overflow in the compared phone/tablet frames. The entire first-attempt control is separately checked above the dock at 320×740.
- Runtime diagnostic is a short 5.2-second, reduced-motion, minimal-data Chromium smoke per idle/studying state: no page errors or >50ms long tasks observed, zero idle main-area mutations. It is not an LCP benchmark or a physical-device/large-store performance claim. App's existing per-second active-shell state update remains; idle refresh stays 15 seconds.
- Build retains the existing >500KB chunk warning. No dependency replacement or speculative large refactor was made.

### Failures retained honestly

- An intermediate local 2-worker run on the 2-vCPU host finished 134/136, with a second-tab actionability timeout and a delayed cloud-sync test racing its automatic sync while the host was overloaded. It is not a passing full-run result. Single-browser CI and final targeted acceptance establish the release results above.
- Older `school-ready.spec.ts` still references the removed home assessment widget and old “오늘 할 일 정리” button. Its attempted extra run had five passing digital-paper cases, one stale school-entry failure, one interrupted legacy case and four unrun cases. It was stopped; those legacy cases are not counted as accepted. Current-path `briefing-discovery.spec.ts`, `student-beta.spec.ts`, `submission-entry.spec.ts` and recovery suites cover the supported entry points.
- Full unfiltered historical Playwright acceptance is not claimed. No product function was removed or assertion weakened to get a green release suite.

### Release boundary

- PR: https://github.com/kimkimhs36/BKIT-QWEN/pull/24 (draft, based on PR #23's branch).
- Preview: https://bkit-study-os-36-preview-git-feat-bkit-learning-f02d69-teambkit.vercel.app/ . The public build identity and UI were verified; management API team access still returns 403.
- `main` remains `0f63f235055b5fafb8f94db701eb8aa1bfc07d84`; `deploy/bkit-api` remains `95d7a4f0737dc49af1299f8692a5859315306967`; PR #23's head remains `773d18077deae112e289dc833f0a9ac05a5804f3`. Remote refs were rechecked. No merge, production deployment, domain, budget, secret or security-policy change occurred.
- Preview has a separate origin. Existing production local data is not automatically imported. Export a complete ZIP and explicitly restore it when a separate preview/device needs a copy; JSON does not contain photo/PDF/ink bytes.
- DeepSeek stages: client/server code and safe error presentation exist; public production API configuration and official supported model/pricing checked; owner OAuth, real Redis reservation, paid model response and operational inference acceptance NOT verified. Production API still predates PR #21 diagnostics. Preview origin remains intentionally rejected by that API's CORS policy.
- Remaining: actual owner-authenticated model call in the intended allowed origin; physical iPhone/iPad/Galaxy camera/keyboard/pen/PWA and long suspension; large-store profiling and active-shell clock separation; committing an unfinished question-setup form before its question is chosen remains outside this draft change.
- Next priorities (max three): owner OAuth + one budget-limited DeepSeek check; physical-device/long-session acceptance; backup-backed review of PR #22→#23→#24 before a separately approved production rollout (API #21 stays separate).
