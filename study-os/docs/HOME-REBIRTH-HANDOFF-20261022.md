# BKIT 4.0 · Home Rebirth

## Source and integration

- Source: PR #24 head `66f96b41c95f283898cc4cec942c8b46f7ef6cac`, on `feat/bkit-learning-continuity-20261022`. PR #22 → #23 → #24 remain unmerged source dependencies. `main` is the Pages asset tree.
- New branch: `feat/bkit-4-home-rebirth-20261022`, stacked on #24, never implemented on main.
- PR #25 (`d710df0`) is a sibling of #24, based on #23 (`773d180`). Inspected its complete three-file diff. Selected only its CSS changes: wrapping, sizing, stronger first-move surfaces and small metadata, touch/press/focus feedback, reduced-motion handling. #24 already has stronger task/attempt/draft E2E coverage and a useful follow-up message; its App and test files were retained. No blind merge or cherry-pick.
- API #21 (`9d8e542`) remains a separate detached worktree against `deploy/bkit-api`; no API code enters this branch.

## Product and implementation

The home now leads with an actual selected task instead of a generic greeting. Compact identity/date → learning hero → three direct capture routes → bounded agenda → weekly calendar, next schedule and learning records. On tablets the learning column sits beside a calm day column; phones read in one column. One primary start action replaces two buttons that started the same five-minute session.

`HomeHero.tsx` is presentational and uses existing task selection, `firstLearningAction`, timer calculations and schedule guards. Existing App callbacks still own every write. First visit, task-ready, active, paused, protected and completed states have distinct truthful copy. Offline status explicitly preserves access to local learning. No fabricated tasks or appointments, new database, schema migration, API call or paid service was introduced.

Quick assessment capture preselects the existing assessment form. Task capture and material camera/gallery entry reuse the real existing interfaces. Agenda displays at most three actual incomplete tasks, with separate submission confirmation. Daily progress distinguishes saved sessions, self-reported first attempts and tasks with a recorded completion date; timer time does not generate attempts. The latest session is found by its end timestamp rather than array position. Recent material and GARAGE remain accessible without dominating the home.

CalendarPeek and StudyCalendar retain their existing shared Motion layout surface and five date views. Deadline dots and schedule marks are distinct. Selected date now survives closing/reopening the calendar during the app session. UI date state is separate from the existing study store; no calendar engine rewrite.

New scoped home tokens derive from all nine existing materials. Peach/Glass add restrained warm surfaces and a high-contrast ink CTA; Soft Jelly remains purple. Pretendard, 44px controls, keyboard focus, OS reduced motion and saved BKIT motion preferences remain active. Only one bounded Hero layer uses backdrop blur, with an opaque CSS fallback. No new WebGL effects or dependencies.

## Evidence, updated during execution

- Baseline #24: `npm ci`, typecheck, 264 unit tests, Vite build passed; first-learning suite passed 6 iPhone Chromium cases.
- New code: typecheck, 264 unit tests and Vite build passed. Existing >500KB chunk warning remains.
- Browser results and exact release commit are appended below after final runs. Intermediate failing runs are not counted as acceptance.
- Reproducible comparison: `node scripts/review-home-rebirth.mjs`, with `BKIT_BASELINE_URL` / `BKIT_REVIEW_URL`. Static baseline is the untouched #24 production build. Screens use the same synthetic task, time and Peach settings, never real student data.
- Visual gallery: [before / after](../artifacts/home-rebirth/index.html). Includes iPhone, iPad portrait/landscape, Galaxy-equivalent and desktop. These are browser profiles, not physical devices.
- New E2E covers 320/375/390/430/768/1024/1280/1440 widths; actual CTA hit testing, bounded agenda, direct assessment, material camera entry, five calendar views, selected-date memory, settings close, all nine themes/axe, offline start and paused-timer identity. Existing continuity/draft/OCR/backup suites remain required.
- During review a specificity change incorrectly let the desktop sidebar create an implicit mobile grid column. Screenshot and CTA tests caught it; responsive placement now overrides each new home child explicitly. The failed intermediate run is retained in local logs and excluded from passing totals.
- Initial nine-theme axe scan caught 4.43:1 small text in Living Droplets. Home muted text now derives from 85% material ink; final all-theme acceptance is recorded below.

## API and deployment boundary

Fresh public API checks: health/config 200; owner without a token 401; production origin preflight 204; existing preview origin 403. Health identifies source `95d7a4f`, `deepseek-flash`, auth/budget configured, daily 1,000 KRW, briefing only. These are configuration observations, not proof of authenticated inference. API #21's locked source independently passed typecheck and 100 synthetic tests. No owner OAuth token or paid inference was used.

Vercel connector team listing returned no teams; project read under the known `teambkit` scope returned 403. No team-authorization tool is exposed in this session. Git-integrated Preview will be verified via its public build identity and browser behavior. No production/domain/DNS/key/budget/team/security setting is changed.

## Remaining boundaries

- Physical iPhone/iPad/Galaxy camera, software keyboard, Pencil, safe area, PWA suspension and long sessions still require hardware acceptance. Browser WebKit is not a physical Safari device.
- Preview has its own origin. Existing production local data does not automatically appear there; existing ZIP restore remains the explicit transfer path.
- Owner OAuth → Redis budget reservation → real DeepSeek response → confirmed save is unverified; Preview CORS intentionally remains restricted.
- No production merge or forced deployment. Keep #22 → #23 → #24 → Home Rebirth review order; API #21 stays independent.
- Next release: physical-device/long-session QA; one owner-authorized budget-limited AI check; large-store/active-clock performance profiling.

## Follow-up: transparent identity and nine touch materials

The user's follow-up explicitly requested fixing the rectangular logo/header surface after a theme switch and making every theme's touch background distinct. The rectangle came from competing material header rules (`var(--mat-bg)` on most themes and a translucent rectangular Glass header). A final shared rule now keeps header, leading area and logo background/border/shadow transparent across all routes and palettes.

`MaterialTouchField` adds a passive decorative layer behind all content: paper sunlight, forest light shafts, optical Glass edges, Peach satin bloom, Diamond facets, Champagne sweep, purple Jelly lobes, water rings and a quiet Night orbit. Each has its own shape and decay. A three-node pool bounds concurrency; Web Animations use opacity/transform and clean up at finish, scrolling, hiding, preference changes and unmount. No new canvas, continuous rAF loop, network request, sensor permission or store write. Text/cards do not move. Inputs, navigation, dialogs, readers and active/paused study are excluded. OS motion reduction, saved off/reduced motion, intensity and low power all remain authoritative.

Touch E2E checks actual Web Animation state, distinct rendered geometry for all nine palettes, fixed Hero geometry, 3-node bound, end cleanup, transparent headers, preference suppression and study protection. Representative screenshots pause real animation timelines to avoid software-GPU timing making short effects impossible to capture reliably; this is not physical-device performance evidence.

Broader CI surfaced two pre-existing time-dependent tests that assumed it was outside the sleep schedule. Their clocks now use an explicit allowed study time; read-only corrupt-store assertions are unchanged. Existing recovery and bounded-agenda tests now target the actual new row/whole-list controls. Small-phone shortcut reachability scrolls to the relocated agenda navigation; the primary start action is still required in the initial viewport. No schedule guard or data-safety assertion was removed.
