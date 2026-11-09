# TEAM BKIT — REAL HOME TO INDEPENDENT RETRY | 2026-11-09

## Purpose and baseline
Build on the existing React PremiumHome, preserving nine material themes, BOOKS, 수능관, Sleep Guard, existing learning data and the source tree. Baseline preview/bkit-action-home-20261109 at 4ac6a752692813d8b68a34d06f16bcfd5772b86a. The separate HTML proof-of-concept is not the app.

## Changes
- Shared new QuickRetryPrompt.tsx used in Home and Focus, not two inconsistent workflows.
- After a real quick-focus save, Home displays the saved time plus learner-chosen next question *before* generic start actions. The user's question is local draft until they click; no silent write.
- The actual App beginQuick('countdown', 5, true, problem) is reused, opening the existing connected problem workspace. Saved problem survives reload; attempts, correctness, completion, submission and success are never inferred.
- During a protected sleep/schedule window Home only shows the saved focus receipt, not an invalid new-retry CTA.
- Existing material CSS is reused for Glass and Jelly; no fixed navy replacement.

## Verification on authorized remote Windows PC
- Focused Vitest: 31/31 passed; exit 0.
- Full Vitest: 439/440 passed; exit 1. Existing unrelated examsSleepIntegration.test.ts boundary test is the one failure; no repeated investigation.
- TypeScript typecheck: exit 0.
- Production build: exit 0, including build after layout update. Existing non-blocking chunk-size warning.
- Real built React app in Chrome iPhone 13 emulation: 3/3 Playwright E2E scenarios passed, exit 0. Start / save / enter learner-chosen problem / start independent retry / reload / retained workspace.
- Screenshots from actual compiled React UI: BKIT_home_retry_real_glass_20261109.png and BKIT_home_retry_real_jelly_20261109.png. They use synthetic local test sessions, not actual learner data, and are not AI-generated images.
- Local PC running preview: http://127.0.0.1:4181/study-os/ (not public).

## Release safety
Production teambkit.com, main, saved real user data, credentials, and paid AI settings are untouched. Test success is not proof of real lifestyle improvement. Physical Safari and seven-day personal-use outcomes are not verified.

## Next
Connect explicit self-check of the independently retried answer back to a truthful next-review reminder in Home; avoid invented deadlines, grades or automatic completion.
