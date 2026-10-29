# BKIT BUILD 10 — Conversation to action (2026-10-29)

Base branch: feat/bkit-chat-first-20261028
Implementation: feat/bkit-conversation-to-actions-build10-20261029

## User experience

- Learner says: "매주 화요일 오후 6시부터 8시까지 수학 학원 등록해줘".
- BKIT prepares a concrete preview (weekday, class title, start/end, and the fact that prep/travel are 0 minutes, not provided).
- Existing schedule collisions are surfaced before save.
- Learner explicitly presses "확인하고 저장"; no write on a model message, component mount, or automatic suggestion.
- Once saved through the normal study-state commit, the schedule appears alongside school/academy fixed blocks.
- One missing field can be supplied in the next chat turn while its preceding unanswered command is still in immediate history; still requires approval.
- If no weekday, date, ending time, recurrence choice, or recognizable class name, ask instead of inventing.
- Repeated every-week schedules and one-off dates are distinguished; missed "이번 주" dates never shift silently into next week.
- Existing task commands containing the word 학원 remain task commands.
- Schedule action is performed by deterministic local code in BOTH local and connected AI modes. AI outputs never autonomously write state.

## Scope and safeguards

No new backend credentials, data migrations, new third-party providers, paid AI calls, or changes to production deployments.
- Uses existing Zod schedule schema and existing transactional local/optional-cloud state.
- Duplicate schedule writes are rejected at approval time.
- Past assistant conversation is never an authorization for automatic writes; pending actions are not persisted.
- Current parser intentionally requires explicit times (and meridian for bare 1–12 o'clock).
- Existing future plan blocks are not rewritten on schedule creation; the user must review scheduling conflicts/recover plans.
- This is a limited Korean natural-language grammar, not full LLM-level interpretation.

## Verification gates

- npm run typecheck
- npm test
- npm run build
- Manual iOS Safari/PWA, on-device storage and OAuth test before production promotion
- Existing dependency audit findings need separate remediation.

## Future follow-up

1. Contextual academy homework triage and source-backed next action.
2. Grouped preview of simultaneous schedule+task changes with per-action approvals.
3. Secure server-side short-term conversations with versioned tools and auth-scoped data, subject to cost/privacy controls.
4. Sync policy for conversations across devices, only after explicit user opt-in.
