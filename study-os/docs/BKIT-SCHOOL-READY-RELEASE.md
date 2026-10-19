# BKIT 3.5 school readiness — 2026-10-19

Source: integrate/bkit-3-5-school-ready-20261019. Integrates PR #15 and #17 and preserves the latest main assets, EXAM LAB, mock-rescue, PDFs and prior fingerprinted bundles.

The owner explicitly requested immediate production publication during this session. Release is expedited: TypeScript, 188 unit tests and the production build passed; the full 576-case Playwright matrix and physical devices are NOT signed off. Browser follow-up results must be reported separately, not described as fully validated.

Changes: task camera/gallery/PDF originals are stored before references; failed task persistence retains the open draft. Failed material import offers original download/retry. Live/paused quick stopwatch can attach to a task without resetting time. Completion and submission remain separate. Client validates AI dates, quantities and exact source evidence. Unsupported AI endpoints cannot receive token or study context. Older cloud responses preserve local quick-history and resource metadata.

Read-only production API checks succeeded on Oct 19: /api/health, /api/config and teambkit.com briefing CORS preflight. Backend source: 95d7a4f0737dc49af1299f8692a5859315306967 on deploy/bkit-api. Briefing configured; plan/coach/assistant unsupported. Google owner login and a billable DeepSeek round trip were not performed. Production backend was not changed. Tokens remain memory-only. Redis budget code reserves before inference; configured 1,000 KRW/60-call ceilings do not establish real billing or model success. Local task intake works independently.

Known limits: production sync strips quick-history/resource metadata on other devices and rejects sessions above 102 segments; local originals/PDF/ink require complete ZIP transfer. A task form's unsaved text is not guaranteed across refresh. A successful file save followed by closing its unsaved task can leave an unlinked original; original bytes are retained. Full physical Safari/Pencil/keyboard/camera behavior remains unverified.

## Rollback

Production before this release: 2569b2f2bc0519115fd3c7e9eb6bbb4b3a095572, preserved as checkpoint/pre-school-ready-live-20261019. Source checkpoint: checkpoint/school-ready-base-20261019.

Revert the single publication commit on the latest main with a normal revert commit, push without force, then verify GitHub Pages and release.json. Do not clear browser data, IndexedDB, or service-worker storage. The former bundles remain in the site; existing user state keys are unchanged. Reverting code does not reverse newly saved study records; export a complete ZIP before any data import or version transition.

## Physical-device handoff

On iPhone Safari/PWA and iPad Safari: export complete ZIP first; open teambkit.com and accept update only with no active work; register an undated assessment; add camera and gallery images and PDF; pause/reopen/continue stopwatch; attach to task; finish and edit history without changing duration; complete then explicitly submit; draw with Pencil and navigate/reopen; export ZIP, inspect originals, restore in a separate browser profile, compare photos/PDF/ink. Rotate and open keyboard in task/settings screens. Do not clear the original profile to test restoration. Google login/model test requires the owner's separate explicit approval.
