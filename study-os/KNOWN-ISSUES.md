# Visual V2 — next session

- Real iPhone/iPad Safari verification, soft keyboard positioning and frame-rate profiling remain. Browser checks used Chromium device-sized viewports, not physical Apple devices.
- Quick Capture uses deterministic rules, not AI. It recognizes selected school subjects, today/tomorrow/day-after-tomorrow, weekdays and next-week weekdays. Explicit calendar dates, hour-specific deadlines and compound requests need chip edits or the detailed form. Parsed dates default to 23:59 Asia/Seoul and estimates to 25 minutes unless stated.
- Home-screen PNG icons retain the previous artwork. Browser theme and in-app branding use V2.
- The weekly timetable retains its existing horizontally scrollable mobile grid; a bespoke week visualization is a later visual pass.
- Animation is intentionally lightweight SVG/CSS with reduced-motion support. No measured adaptive performance tier or 60fps guarantee is implemented.

Storage schema/key, core schedule protection, timer and recovery engine were not changed. Existing data is not migrated, cleared or seeded.
