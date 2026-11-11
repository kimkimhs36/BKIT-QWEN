# TEAM BKIT · Physical iPhone notice-to-ZIP verification (2026-11-11)

This is a **manual, user-dependent verification protocol**, not a claim that physical Safari passed. Source branch checked at `a908ed1ee3b223721e44419d37d7bbd76bed64e9`. Recheck HEAD and deployment SHA before testing. Nonproduction preview only. Never use real private school notice content in screenshots/logs.

## Goal and three acceptance gates
1. **Original preserved:** On an actual iPhone Safari, manually paste one *official, user-provided* notice into School Inbox. After reload, original text is unchanged and defaults to read-only. Record only PASS/FAIL, device/iOS, date, preview SHA (no school text).
2. **Submission not fabricated:** Create a linked assessment only after checking source and manually confirming title/deadline. Verify it is NOT marked submitted automatically. If no real notice is available, use clearly labeled **TEST-ONLY** fictional content, and do not count it as an actual school task or user outcome.
3. **ZIP stored and inspected:** Open the existing Complete Backup panel, explicitly export ZIP, save in iOS Files, verify the file exists, select that ZIP for inspection, confirm notice + linked study record coverage. Do **not** press destructive replace/restore on a device with real data. Fresh-device restore can only be tested on a separate clean test profile/device after an independent backup and explicit consent.

## Sequence
- Record preview URL, source SHA, Safari version, iOS version, date, and whether app is Safari tab or installed PWA. Verify the preview origin differs from production; its localStorage is separate.
- Save notice; reload; check the text, read-only control, and any storage warning. Test clipboard-denied fallback by manual paste only if permissions permit safe testing.
- Create a manually confirmed linked assessment and check that the submission flag remains unconfirmed. Do not invent or infer a deadline, score, completion, or submission.
- Open ZIP backup from the assessment home shortcut. Ensure the collapsed Backup/Restore section expands and the full panel is reachable.
- Export, **Save to Files**, reopen Files and check filename/size, then reselect the file in BKIT for non-destructive inspection. Record which coverages are reported fresh/stale; no ZIP upload to third-party services.
- Reload and check notice and linked assessment remain. If any save/inspection step fails, preserve the original device data and record the precise screen/step and error text (redacted).

## Evidence form
| Field | Value |
| --- | --- |
| Test date/device/iOS/Safari | NOT TESTED |
| Exact branch SHA / preview deployment ID | NOT VERIFIED THIS SESSION |
| Original save → reload → read-only | NOT TESTED |
| Manual assessment confirmation / unsubmitted state | NOT TESTED |
| ZIP export → Files existence → reselect → inspection | NOT TESTED |
| Reload after ZIP inspection | NOT TESTED |
| Error details (redacted) | None collected |

**Safety:** Do not claim ZIP download success from button click alone; do not claim cloud sync, physical Safari success, or school performance improvement from CI/browser simulation. No production deployment, migration, overwrite, or PR merge. If real notice unavailable, prioritize non-destructive usability fixes and keep this gate pending.
