# BKIT STUDY OS / LIQUID 06 — precision pass

- Native-ish glass lens surfaces for navigation dock, primary action, deadlines,
  review cards, settings sheets, and timer.
- Shape-aware precomputed SDF displacement map with sRGB neutral centre,
  filtered optical light field across browsers, and live-backdrop SVG on Blink.
- iOS WebKit-specific fallback; functional content is never distorted.
- Dynamic caustic/specular reflection follows pointer without React rerenders.
  Bounded requestAnimationFrame work only on pointer movement.
- Spring-like pressed states; reduced-motion/transparency accessibility.
- Finger targets >=44px, darker legible type, no new external dependencies.
- Storage, exams, sessions, focus-quiet and local backup untouched.
- Automated tests: SDF map, Chromium visual DOM/check, WebKit (if available)
  and existing 63+ unit tests.
