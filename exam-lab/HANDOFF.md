# BKIT EXAM LAB — Immersive 1

Scope: `/exam-lab/` only. Production BKIT STUDY OS 3.3, the 3.4 development branch, `/mock-rescue/`, the root service worker, CNAME, PDFs and main app assets remain intact. `questions.js` is unchanged. This is an additive v1 storage update using `bkit.exam-lab.20261019.v1` with the original IDs and first-attempt records preserved.

## Study experience

- Six short diagnostic questions sample English, mathematics, Korean and mechanics. Recommendations use observed subject results and pending questions; they are practice suggestions, not an ability estimate or predicted exam grade.
- The existing 46 authored originals each have a concept, two hints, solution steps, four distractor explanations and a linked transfer question. There are 46 additional authored transfer questions, clearly distinguished from official papers.
- English supports core word definitions, passage translations and discourse structure. Mathematics/science solutions unfold in steps. A learner can record their own interpretation before answering.
- Hinted, guessed or uncertain correct answers stay pending. A later unassisted correct answer clears pending status. A subsequent wrong answer reopens it. First-attempt correctness never changes.
- Last question, hints, self-explanation, answer feedback, error cause and paper notes survive refresh. Unsubmitted per-question drafts also survive subject switching. Review can be filtered by cause.
- Focus mode removes surrounding controls. No forced animation, reward system or setup form.
- 120/180-minute routes include breaks in the total schedule. Active focus and foreground break durations are separate. Leaving the page pauses timing. A discarded tab reopens paused from its saved snapshot; it does not manufacture unattended study time. Finishing writes a session with real attempts, then allows subject/content edits.
- Native local PDF/image viewing, a full-screen source link, manually marked answer sheets and mathematics short answers for questions 22–30. PDF originals are not included in this app's JSON backup and need reselecting after reload.
- Tutor dialog presents the actual problem/choice/reflection as a copyable prompt. Clipboard failure leaves selectable text. Opening ChatGPT does not itself send records. No paid AI call or simulated response is made.

## Safety

No reset action or `localStorage.clear` exists. Saving is guarded against other-tab changes. Read/parse failures preserve the raw original and block overwrites. Write failures produce a visible persistent warning and the in-memory work can still be exported. JSON imports validate nested records, require explicit confirmation, keep a timestamped pre-restore local snapshot, and pause imported timers. Export snapshots also pause the exported timer without altering the live timer. Browser storage is not cross-device sync or guaranteed external backup.

## Sources and design references (checked 2026-10-19)

- [EBSi official 고2 paper search](https://cloud.ebsi.co.kr/ebs/xip/xipc/previousPaperList.ebs?targetCd=D200). The site's own filtered list (`yearList=2026`, `monthList=09`, `targetCd=D200`, all subject categories) identifies **2026-09-02 고2 9월 학평(인천)** with Korean, mathematics, English, Korean history, integrated society and integrated science, and question/answer/explanation entries. Download handlers require EBSi login. The app links to the official flow; it neither republishes exam PDFs nor invents official answers. O/X remains manual.
- [Linear features](https://linear.app/features): restrained navigation and a clear primary workspace. Adapted here as a stable green sidebar and a single reading surface.
- [Brilliant](https://brilliant.org/): active interaction, interventions and mastery checks. Adapted here as short feedback, an independent transfer question and unassisted retesting; no claim of equivalent efficacy.
- BKIT 3.3 source handoff and 3.4 timer handoff were read. The existing private API only supports guarded briefing proposals and is off by default; there is no usable authenticated study-tutor endpoint for this independent static page. No credentials were copied to client code.

## Verification

Serve the repository root on port 4175, then:

```sh
npm ci --prefix exam-lab
cd exam-lab && npx playwright install --with-deps chromium webkit
cd ..
node exam-lab/tests/smoke.mjs
node exam-lab/tests/safety.mjs
node exam-lab/tests/ipad.mjs
node exam-lab/tests/accessibility.mjs
```

`BKIT_TEST_URL` can point these tests at the deployed `/exam-lab/`; all test answers use isolated browser profiles and localStorage only.

- 11-inch iPad landscape has a two-column reading/choice desk and local PDF/answer sheet layout. Pro 11 (1194×834) and Air 11 (1180×820) touch scenarios also verify portrait rotation without losing feedback.
- Six scenarios: iPhone WebKit, iPad portrait/landscape WebKit, desktop Chromium, Galaxy tablet CSS/touch emulation, small iPhone Chromium.
- Learning: diagnosis, both hints, self-explanation, feedback restoration, tutor prompt, transfer, wrong-answer retest, vocabulary, focus screen.
- Papers/data: local PDF selection, manual O/X, mathematics short answer, per-keystroke notes, refresh, JSON export and valid/invalid restore.
- Timing: pause/resume, break accounting, refresh paused, end session, optional edits and full 180-minute completion with controlled time.
- Safety: legacy v1 compatibility, unrelated production keys, multi-tab conflicts, malformed original preservation, denied writes and emergency export.
- Accessibility: axe WCAG 2/2.1 A/AA checks of entry, study, feedback, tutor, papers and report. This is automated coverage, not a complete accessibility certification.

Physical iPhone/iPad/Galaxy hardware, native Safari PDF rendering, PWA storage eviction, long-running battery behavior and real ChatGPT paste are not certified by emulation. Offline operation is not promised. The official EBSi download requires the learner's account.

## 120-minute route

10 min diagnosis → 25 min English → 5 min rest → 30 min mathematics → 5 min rest → 20 min mechanics/science → 15 min pending retest → 10 min report and JSON backup. Use transfer questions after explanation; spend time on why an alternative is wrong rather than only remembering its number.

Deployment uses the existing GitHub Pages main branch. The live workflow compares all six served release files byte-for-byte against the release commit. Roll back only this change's paths from the pre-release checkpoint; do not deploy an entire older app branch over current production assets.
