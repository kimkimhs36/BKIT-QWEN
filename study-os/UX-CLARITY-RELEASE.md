# BKIT UX clarity redesign

## Decision

Home previously showed a large TOHEŞAR banner, the complete mission shelf, a
focus card, duplicate capture, deadline, assistant, and operational disclosures.
It now exposes only three next actions: organize today's work, add materials,
and start/resume focus. With an existing task or active session, focus is first;
with no tasks, the two preparation routes are first. No large brand artwork,
standalone deadline/assistant cards, developer storage-mode labels or duplicate
capture buttons remain on the default home.

The complete mission shelf, deadline context, review, timeline, planning/recovery
and statistics remain under “오늘 일정과 기록”. Quick single-line capture,
assistant, settings and the original full cinematic/exam archive remain in
“더 보기”. The five main tabs remain available. Their appearance is now plain
and readable; the home has comfortable ivory surfaces, larger Korean typography,
one clear focus button and at least 44px targets.

## TOHEŞAR connection

First load opens a useful home immediately. Organizing work opens the premium
TOHEŞAR preparation room. On first use the original film plays beside/above the
Daily Briefing, and the textarea is immediately usable. Skip is always available.
Film completion preserves text and focus and leaves a still frame in the same
space. Returning visits skip the film. “자료 추가” goes straight to the capture
step, preserving previously edited missions. User-confirmed tasks still use
`App.commit`, the real BKIT model and existing local persistence. Camera/gallery,
private IndexedDB image storage, draft restoration, duplicate-safe saves, deadline
confirmation, protected schedules and actual study/session records are retained.
No OCR/AI is simulated; no private photos are uploaded.

## Review and verification

- Remote branch and local working tree were clean and identical before editing;
  no in-progress changes were overwritten. Source recovery tag:
  `archive/study-os-before-clarity-20261016` (5d8a8cc). Live recovery tag:
  `archive/teambkit-live-before-clarity-20261016` (4e921e9).
- Focus calculation remains derived from existing tasks, active session and fixed
  schedule guards. Components contain no second task store or new schema.
- React review: event handlers own writes, refs serialize capture operations,
  film timing has a stable callback/cleanup, and film completion cannot remount
  or refocus the textarea. Existing accessibility labels and native modal focus
  containment are preserved. The new HomeEntry is presentational.
- Meaningful browser scenarios cover 60 tasks without expanding the default
  home, selecting the correct real task, typing during the film, preserving
  cursor and draft, direct materials entry with an existing review, small-screen
  fit, targets, and WCAG AA checks. Existing attachment, confirmed-save,
  duplicate, focus, navigation and cloud-consent regressions remain required.
- Required publication checks: 88 unit tests; 36 preparation/home checks across
  iPhone Chromium and iPhone/iPad WebKit; 29 existing mobile regressions;
  production build; exact GitHub Pages commit and live release source match.
  The successful Actions run is the authoritative result for the deployed SHA.
- Final verification also exercises the actual teambkit.com domain, including
  photo restore and real local task/focus persistence. No real user material is
  used. These browser-engine tests do not substitute for physical iOS camera,
  software keyboard, HEIC and safe-area checks.

## Persistence limits

The task schema and storage keys are unchanged. Task edits and photos stay on
this device unless the existing user-authorized text-plan cloud integration is
used. Photos are never exported by that integration. Browser-data deletion can
remove local records; retain original images. OCR, document interpretation and
AI recommendation remain phase two, outside this simplification release.
