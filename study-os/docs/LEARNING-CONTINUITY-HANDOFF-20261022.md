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
