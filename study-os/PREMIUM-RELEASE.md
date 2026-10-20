# BKIT Study OS 3.7 — Premium study space

Based on the source deployed from `dc12014119e16078a41215bef9f31e655747fd1f`.
Production baseline: `93426e50cb044e16291e41082d804658f672a427`.

- A study-first home with direct stopwatch / five-minute start, priority tasks,
  submission checks, next schedule, recent materials and a compact tool shelf.
- A direct assessment registration action on home and tasks, with kind preset,
  visible saved results and unchanged task/session schemas.
- Four complete material identities (paper, matte forest, optical glass and elastic jelly) spanning panels, controls, navigation and dialogs; legacy preferences retained, less ambient rendering,
  stable timer digits, app-owned motion preferences and battery-saving fallbacks, independent of device reduced-motion preferences.
- Radix dialogs replace the shared native dialog wrapper. Camera assistance is
  opt-in under Settings → Experimental; it stops on collapse, hide or navigation.
- Garage, race and credit affordances are hidden. The existing modules and stored
  garage ledger remain intact; automatic reward discovery is disabled in this UI.

## Open source

- `motion` 14.4.0 — MIT — https://github.com/motiondivision/motion
- `@radix-ui/react-dialog` 1.3.1 — MIT — https://github.com/radix-ui/primitives
- Existing React and Lucide are retained; MediaPipe remains an optional camera tool.
  Package metadata and current releases were checked on 2026-10-20.

## Validation and deployment

`npm run typecheck`, production Vite build, existing storage / quick timer / theme
unit tests, and `tests/e2e/premium-study.spec.ts` exercise the critical workflows.
Playwright WebKit is browser-engine emulation, not a physical iPhone or iPad test.
Camera accuracy on physical devices remains unverified and is labeled experimental.

Deploy `APP_BASE=/ npm run build` onto the existing Pages root on main. Overlay the
build, retaining CNAME, .nojekyll, exam-lab/, mock-rescue/, and old hashed assets for
already-open tabs. Publish release.json with the source SHA and rollback baseline.
Do not clear browser storage or force service-worker activation. Returning users
may need to close all BKIT tabs and reopen after saving their work.
