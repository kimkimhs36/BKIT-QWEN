# BKIT Compact Experience

Source starts at `feat/bkit-compact-ux-20261021` (`118dcdefa3670a5c6c7d752ac7fb112b4489c05b`). Implementation is isolated on `feat/bkit-compact-experience-20261021`.

The owner subsequently authorized publishing the verified result through GitHub Pages to `teambkit.com`. The prior production commit `92a3019688582225fd103cc5cb5c3cb5d056586e` is retained on `checkpoint/pre-compact-experience-20261021`. The original compact branch and `feat/bkit-3-8-surreal-liquid-20261020` remain unchanged.

## Daily workspaces

| Workspace | First action                                                            | Preserved detail routes                                                                                                                                 |
| --------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 오늘      | Start immediately, or return to the existing timer                      | At most 3 unfinished tasks, full task list, pending submissions, today's saved time, actual appointments/recent resources only                          |
| 집중      | Visible clock, stopwatch/countdown, start/pause/resume/finish           | Task-linked timer, custom duration, learning answers, attached materials, PDF workspace, review tools, deliberate quiet mode                            |
| 과제      | Add task/assessment, then unfinished items                              | Quick text capture, detailed form, deadline precision, quantities, task materials, separate completion and submission, linked resources, existing exams |
| 기록      | Recent 7 days' minutes and problem count; first-study button when empty | Weekly activity, subject analysis, mistakes/retests, grades, coach, session history and editing                                                         |
| 도구      | Named grid and search                                                   | Materials, timetable, exams, AI ZONE, study sites, Sleep Guard, notice briefing, assistant, settings                                                    |

Advanced backups, integrity checks, planning recovery, locks/undo and API diagnostics are kept within the relevant settings sections. Existing source modules and learning schemas are retained. Features already disabled in the supplied branch are not removed further.

## Appearance and interaction

Both the BKIT wordmark and palette button open the same accessible dialog. All 9 materials are equal, immediate choices; the established appearance keys are retained. New visitors use Liquid Glass and existing saved light/dark/material choices are respected. Motion level, intensity and battery saving remain available.

Each theme has its own ambient light and surface. Touch pressure uses bounded material-specific springs. A locally served variable Pretendard font keeps Korean text consistent online and offline (license: `study-os/public/fonts/OFL.txt`).

Gyroscope access is off by default. Safari's permission request happens only inside the sensor-connect button's user gesture. Sensor values stay in memory; decorative light/background moves while text and controls stay fixed. Rotation recalibrates; missing/denied signals fall back gracefully. Hidden documents, system reduced motion, app reduced/off motion, low power and protected learning surfaces pause effects.

The liquid shader retains its folds and touch waves. Its pixel hash now uses bounded coordinates, fixing mediump overflow that created black diagonals on tall WebKit surfaces. The center gradient is bounded and a restored WebGL context can rebuild without resetting study state.

## Data and release safeguards

No study-state schema migration, storage clearing or file deletion is introduced. LocalStorage study records, task submission flags, IndexedDB PDF originals/ink and private attachments retain their keys and formats. Appearance updates never call the study-state mutation path.

Service-worker shell names now include their scope. A `/preview-compact/` worker can clean its own outdated shells without deleting `/` production caches. A new worker waits for old clients to close; it does not force activation. Published overlays preserve CNAME, independent study routes and older hashed chunks so open clients can still load their versions.

## Reproduce validation

```sh
cd study-os
npm ci
npm test
npm run build
npx playwright install --with-deps webkit
npx playwright test tests/e2e/compact-experience.spec.ts \
  --project=webkit-iphone --project=webkit-ipad --project=webkit-ipad-landscape
```

Screenshots and measured viewport/scroll dimensions are written to `artifacts/compact-experience/`. The dedicated CI workflow performs no deployment.

Automated mobile validation uses the actual WebKit engine with iPhone/iPad device profiles. It does not assert physical Apple hardware, real sensor measurements, or a real on-screen keyboard: permission outcomes, tilt events and keyboard viewport resizing are simulated and tested explicitly. Android and desktop checks are deferred at the owner's request to prioritize iPhone and iPad.
