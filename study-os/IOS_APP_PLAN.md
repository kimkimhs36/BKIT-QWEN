# BKIT — iOS app design contract (October 2026)

## Product direction
BKIT is intended to mature into a native iPhone application. The current
teambkit.com site remains a **PWA**, not an Apple App Store app. Code changes
here should test the experience before any SwiftUI implementation.

## Visual hierarchy (Apple HIG aligned)
- Liquid Glass belongs primarily to the **functional navigation/control** layer.
- Study cards, forms, details and long text use **standard opaque or nearly
  opaque materials**. Preserve foreground contrast.
- Bottom tabs switch sections only. Task creation is an independent top-bar
  action. Today, Schedule, Tasks, Focus and Progress are the five tabs.
- Settings is available in the header. An active focus session is allowed to
  hide surrounding controls while preserving timer state.
- Native iPhone sheet behavior: bottom presentation, safe area, clear close,
  content scrolling, no loss of records on dismiss.
- Respect reduced motion, reduced transparency, keyboard and system type
  scaling. Minimum practical target 44x44 CSS pixels.

## Future native mapping (not yet built)
| Current BKIT screen | Planned SwiftUI equivalent |
| --- | --- |
| Today | NavigationStack / scrollable sections |
| Schedule | NavigationStack and schedule detail views |
| Tasks | List, add/edit sheets, form validation |
| Focus | Immersive stateful timer screen |
| Progress | Charts and review List |
| Bottom bar | TabView with system Liquid Glass |
| Add task | Toolbar button + sheet |
| Modal forms | SwiftUI sheet and Form |
| Local study data | Versioned persistence layer, likely SwiftData |

## Data safety before App Store
Current records live in browser localStorage. Native SwiftUI will **not**
automatically see the web application's localStorage. Do not promise syncing
or migration until tested. Preserve JSON export/import and define a versioned
migration from web exports before changing storage or shipping native.
Plan for device-to-device syncing and privacy disclosures separately.

## Acceptance criteria for each UI release
1. First-view clarity on narrow iPhone; primary focus visible in 3 seconds.
2. Tap navigation only navigates; creation uses top bar / toolbar.
3. 44px+ tab/action tap targets and no sideways scroll.
4. Content text never blurred/refracted; glass is an overlay for navigation.
5. Native-feeling mobile bottom sheet, focus remains recoverable.
6. Unit, Chromium iPhone-size, and WebKit iPhone-size checks all pass.
7. Real iPhone Safari visual and interaction testing remains a separate
   manual milestone before describing any version as production-polished.

Apple Human Interface Guidelines:
- https://developer.apple.com/design/human-interface-guidelines/materials
- https://developer.apple.com/design/human-interface-guidelines/tab-bars
- https://developer.apple.com/design/human-interface-guidelines/layout
- https://developer.apple.com/design/human-interface-guidelines/toolbars
