# BKIT STUDY OS 3.0 implementation handoff

Working branch: `feat/bkit-3-sleep-guard`.
Source checkpoint: `checkpoint/pre-bkit-3-20261018` (`be8147a`).
Full recovery bundle: `/workspace/scratch/bkit-pre-3.bundle`.

## Scope and recovery

- Study namespace `bkit.study-os.v1`, task IDs, session history and photo references are unchanged.
- Existing `crashweek.v3`, draft keys, experimental Sleep Guard v1 keys and AI/server configuration remain untouched.
- Sleep Guard uses validated `bkit.sleep-guard.v3` JSON and **independent** IndexedDB `bkit-sleep-photos-v3`.
- Existing study media stays in `bkit-private-materials-v1`. Sleep deletion cannot delete study photos.
- Invalid saved Sleep Guard data is not overwritten. Explicit backup restoration first saves exact previous bytes to `bkit.sleep-guard.v3.recovery.<timestamp>`.
- Sleep JSON export includes photo references, not photo bytes. Original photos remain device-local. Browser storage clearing can remove them.
- No API credentials, backend configuration, external AI tests, paid calls or Vercel deployments are part of this release. E2E context-level routing blocks unmocked external requests; page-level synthetic mocks remain usable.

## Implemented

- Per-bedtime-weekday bed/wake schedules in device local time; cross-midnight and daytime sleep windows; one-hour preparation state.
- Voluntary four-step check-in, optional local photos, confirmed bedtime, manual actual wake and reflection, record deletion and export/restore.
- Opt-in quiet night palette; no forced overlay or automatic study completion; active study suppresses automatic palette changes. Off, skip tonight, pause one hour and dismiss night controls.
- Optional foreground notifications, at most once per phase/night. No background push scheduling or delivery guarantee. iOS PWA and official Screen Time guidance.
- Task quantity progress from user-reported study output. Explicit remaining pages/passages/chapters supported; completion zeros actual remaining units. Repeated session submissions cannot create duplicate history.
- Ten-toggle menu/focus recovery, modal scroll containment and intentional outside dismissal, shared layout tokens, native time control sizing, reduced motion and visual viewport keyboard handling.
- Small locally hosted photograph with attribution, plus a personal original landscape saved locally. No image generation model was called.
- Sleep and JUGGERNAUT are loaded on demand; Latin-only local font subsets reduce cached font assets.

## Verification work

Baseline: 89/89 unit tests passed. Expanded: 98/98 unit tests passed.
Initial E2E runs found and led to fixes for menu focus restoration and stable labels on restored textarea values.
Long combined flows use a 90-second test budget; no assertions or scenarios were removed.
A standalone preview server must stay alive during local suites; do not reuse a preview server owned by another Playwright process that will exit.

The cloud executor lacks root package-install permission. WebKit 27.2 was enabled by downloading Debian runtime packages into the scratch directory and adding the actual libraries to the downloaded browser's private sys/lib folders. Local commands use `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` because Playwright's ldconfig check ignores those private libraries; an actual browser launch and page rendering were verified. CI installs normal system dependencies and does not skip host validation.

Final test counts, commit and deployment result will be recorded in `BKIT-3-RELEASE.md` after final verification.

## Deployment contract

GitHub Pages is legacy branch publishing: `main:/`, custom domain `teambkit.com`.
`.github/workflows/publish-teambkit.yml` runs on `feat/study-os-visual-v2`, validates source, builds root assets, commits generated assets to `main`, requests Pages build and checks exact live `release.json.sourceCommit`.
New branch pushes only run verification. No direct arbitrary main update or force push is needed.

## Real-device follow-up

Automation covers Chromium/WebKit CSS viewports, not actual Apple/Samsung hardware.
Confirm iPhone/iPad software keyboard, native date/time pickers, pinch zoom and standalone notification permission UI; Galaxy Tab S7 FE Samsung Internet/Chrome portrait/landscape, S Pen tapping/handwriting and DeX resizing; Windows Chrome zoom and notification delivery.
An original commissioned BKIT landscape is not included: a licensed real photograph ships with local personal-original replacement support.
