# BKIT Cloud Study Hub 01 — ChatGPT ↔ BKIT Plan Sync

**Initial release:** 2026-10-15 · Source `feat/study-os-visual-v2`

## What is real now
- A private Google Sheet was created through the user's connected Google Drive.
- Tabs `Meta`, `Tasks`, `Schedules`, `LearningContext` have human-readable
  columns. The exact user spreadsheet ID is not kept in public source code.
- `ChatGPT → Sheet`: the connected Google Drive plugin can read/write the
  source of truth when the user requests a study update.
- `BKIT ↔ Sheet`: browser Google OAuth token flow + Sheets REST adapter
  implemented; it requires the user's own authorized Google Cloud OAuth
  *web client ID* before it can read/write the private spreadsheet.
- `Tasks`, `Schedules` and `LearningContext` topic `GOAL` are shared.
  Grades, focus sessions, private attempts, Google passwords, API keys,
  contacts, entire ChatGPT history and other personal content are **not**
  uploaded. `LearningContext` other than `GOAL` is a user-readable
  reference for ChatGPT; it does not automatically alter the app's planner.
- Local `bkit.study-os.v1` remains as an offline cache so timers and app
  features work without Google or while signed out. Browser study data
  has NOT been erased. The previous unused data need not be migrated.
- After first connection, app compares both sides before choosing a source.
  Once reconciled, local edits sync after a short pause; cloud edits are
  checked about every 30s and when the app returns to foreground.
  Concurrent edits trigger a manual conflict choice rather than silently
  overwriting the other's version.
- This is optimistic conflict checking, **not an atomic compare-and-swap**
  at the Google Sheets service. Extremely simultaneous edits can still
  race. No unverified guarantees of perfect multi-user real-time sync.

## One-time Google login setup (requires owner's consent)
The ChatGPT Google Drive OAuth connection CANNOT be reused by arbitrary
websites. BKIT needs its own OAuth client ID; do not paste a password,
access token, Google Drive connection tokens or API secret into code.

1. Open https://console.cloud.google.com/ with the same personal Google
   account and create/select a Google Cloud project.
2. Enable the **Google Sheets API** in that project.
3. Under **Google Auth Platform / OAuth consent screen**, select External
   (for a personal account) and configure a test app/test user as required.
   Do not submit for public verification just for a private prototype.
4. Create an OAuth 2.0 Client ID, application type **Web application**,
   with **Authorized JavaScript origin** `https://teambkit.com` (no path).
   Copy the OAuth *client ID* ending in
   `.apps.googleusercontent.com` — this ID is public, not a secret.
5. Open the BKIT site. Settings → **BKIT Cloud** → connection setup.
   Enter/paste the private spreadsheet URL and public OAuth client ID.
   Press **Google 계정 연결**, review Google's scope notice, approve
   if comfortable. First reconciliation asks which side to use.
6. From a ChatGPT conversation, request e.g. "BKIT 공유 시트의 Tasks를 읽고
   내일 수학 숙제 계획을 수정해줘." Changes sync to BKIT after Google OAuth
   is connected and the app is open/foregrounded.

### Permissions & scope
Initial MVP requests Google Sheets read/write scope
`https://www.googleapis.com/auth/spreadsheets`, which grants broad
spreadsheet access, **not only BKIT**, to the OAuth app. The BKIT browser
code intentionally reads/writes only the configured sheet. Google's
consent dialog lists the scope. For a public product, narrow scopes
via a Drive Picker / drive.file or an authenticated backend instead of
retaining a broad-scope client-only demo.

Access tokens exist only in JS memory and are not stored in localStorage,
URLs, Sheets, or the repository. OAuth public client ID and sheet address
are stored locally after explicit Connect. Closing/reloading requires
reconnection. The app only requests login from a user-pressed control.

## Sheet schema
`Meta`: key/value/description; updated_at, updated_by.
`Tasks`: id, subject, title, kind, due_date, due_time, deadline_precision,
quantity_unit, quantity_total, quantity_remaining, minutes,
minutes_remaining, status, submitted, priority, notes, link, optional,
modified_at.
`Schedules`: id, title, subject, kind, weekdays (0=Sun..6=Sat),
start, end, prep_minutes, travel_minutes, buffer_minutes, materials,
single_date, excluded_dates.
`LearningContext`: topic, note, updated_at. Topic `GOAL` is synced.
Additional context notes are for explicitly requested ChatGPT analysis.

## Limitations / next release
- The OAuth client and Google consent step require human account setup.
- No direct ChatGPT conversation history API, no automatic Memory dump,
  no secret access to ChatGPT session authentication.
- Cloud sync currently covers **plans**, not every task/session attribute
  on all devices. Sessions and grades remain locally stored.
- Narrower OAuth scopes, signed-in student profiles, offline conflict
  recovery, Google token renewals and transaction-safe multiwriter sync
  require further development and proper security review.
- An entirely new schema may be introduced later, but there is no reason
  to remove an offline cache from a PWA.

**Do not put a private sheet ID or user study context into public GitHub tests.**

## OAuth reliability and sync safety hardening (2026-10-15)
- Prefetch the Google Identity Services script only when the Cloud settings panel mounts; the Connect button waits until the script is available so iPhone Safari can open consent from a direct tap.
- Handle Google popup closed/blocked failures and avoid forcing re-consent at every reconnection.
- Preserve the exact snapshot signature written to Sheets; a local edit made during a pending network request is not falsely marked as already synced.
- GitHub CI/browser-mock tests can verify these paths, but cannot prove real Google OAuth authorization or physical iPhone behavior. Real owner consent remains necessary.
