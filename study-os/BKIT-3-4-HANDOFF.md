# BKIT STUDY OS 3.4 — START FIRST

## Product principle

The first action should be **studying, not filling out a form**. The new "먼저 시작하는 공부" panel on NOW and LEARN lets the learner immediately launch a stopwatch (the default) or a small countdown with 10/25/45/60-minute presets and direct-minute entry.

- Stopwatch needs **one tap**; no task, title, quantity, score or deadline.
- Stopwatch/countdown can pause, resume, and survive browser reload via `State.quickTimer` in existing protected localStorage and the central `writeState` conflict guard.
- While running on other tabs, a small status chip shows elapsed time and brings the learner back to the timer.
- On finishing, record the time **immediately** as a real study `Session`, with optional subject/activity/memo added later without risking the duration.
- Every quick session is included in existing daily study time reports and the complete ZIP archive. No separate DB or sync server.
- Countdown reaching zero does **not** erase the session or unexpectedly end it; it shows target reached and keeps time until user explicitly stops.
- Both the original focus timer and the new quick timer cannot be started concurrently.
- The classic focus room layout remains unchanged when classic focus is active.
- A running stopwatch is never uploaded via the private cloud; remote sync cannot overwrite its device-local progress. Completed sessions continue to use existing session synchronization behavior.
- A ZIP snapshot stores a running quick timer as **paused** while leaving the live device timer untouched; a backup restored later will not accrue time silently during storage.

## Release tests

- unit: start, pause/resume, state schema backward compatibility, clock, end-first/label-later, exact active segment totals, full ZIP snapshot restore.
- E2E: one-tap start on NOW, reload and resume, stopwatch completion before subject, optional label, countdown target reached, save without filling form, existing study routes unchanged.
- Entire six-browser Playwright suite on review readiness, including WebKit iPhone/iPad. Also test on hardware before claiming Apple Pencil/S Pen precision.
- Publishing must preserve the existing `mock-rescue/` page and previously deployed site files, use new `APP_BASE=/` build, check live `https://teambkit.com/release.json`, preserve a pre-release `main` rollback checkpoint.

## Known limitations

An unattended stopwatch measures wall-clock elapsed time and cannot infer whether the learner truly stayed focused; users should pause on breaks. Counts displayed as “오늘 바로 시작” include quick sessions, not traditional timed sessions; global study totals include both. Safari/site data clearing can erase unbacked-up local studies. Offline timer state is not remote auto-backup. Hardware-vendor stylus buttons and app-background wake behavior are not certified by automated browser tests.

## Source

Feature branch: `feat/bkit-3-4-zero-friction-timer`
Base: `release/bkit-study-os-3-3-20261019`
Separate release branch and rollback checkpoint should be prepared only after green CI.
