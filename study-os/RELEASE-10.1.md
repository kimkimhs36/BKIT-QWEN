# BKIT 10.1 — Always visible iPhone bottom tabs
2026-10-15

Issue: the user observed the floating tab bar only after scrolling all the
way down in their iPhone in-app browser. This was not intended navigation.

Fix: portal the floating navigation to a direct body child, outside the app
shell's stacking and layout context, while retaining the existing glass
appearance and tab state. Explicitly pin to the viewport with
position:fixed + safe-area bottom. Preserve the intentional hidden state for
an actively immersive focus session via a dedicated class.

Regression: mobile Chromium and WebKit now verify dock visibility/viewport
anchoring at page top, mid-scroll, and end, and after switching tabs, plus
focus-only hiding. No data, scheduling, timer, AI or storage changes.
Physical in-app Safari testing remains pending user confirmation.
