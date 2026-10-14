# BKIT STUDY OS — Research Capture v2 (2026-10-15)

Based on the 69-page user-provided BKIT learning-system research report,
especially pp.35–36, 59 and 63–64.

## Implemented
- Korean task parsing for problem, page, passage and chapter quantities.
- Optional `Task.quantity` and `Task.deadline` structured metadata.
  Time precision: **date-only / exact-time / unknown**.
- Explicit times such as Friday at 4 PM recorded as exact; dates without
  times are marked "시각 미확인", including lists and the deadline digest.
- `Task.estimate` marks default 25-minute assumptions distinctly from
  user-entered estimates.
- Quantity visible on the task list and NOW start recommendation.
- Detailed task editor can view and revise saved deadline precision and
  quantity, while preserving the existing deterministic schedule engine.
- Unit and Playwright iPhone-sized Chromium/WebKit tests included in CI.

## Explicit compatibility and limits
- No data deletion, no storage key change, no new backend or AI use.
- `bkit.study-os.v1` and all legacy JSON remain readable; the optional
  metadata is introduced inside the existing validated task schema.
- Date-only task `due` still uses 23:59 **internally as a conservative day
  planning cutoff**. It is not represented to the user as an exact time.
- Manual task edits may require explicitly selecting a date or exact time.
- Parsing handles common Korean forms; ambiguous times like unqualified
  "4시" are not assumed AM or PM. Validation is not a substitute for
  checking the source classroom announcement.
- Physical iPhone Safari visual/keyboard tests still need human confirmation.
