# Third-party technology references / BKIT Liquid 06

This release contains an independently authored BKIT material and edge-refraction
implementation. It incorporates no copied third-party assets or source files.

The signed-distance rounded-rectangle, red/green displacement-map and SVG
feDisplacementMap technique was studied using these MIT-licensed examples:
- Sam Asante, **samasante/liquid-glass**: https://github.com/samasante/liquid-glass
- Dominik Pawlikowski, **dpawlikowski/liquid-glass**: https://github.com/dpawlikowski/liquid-glass

We have not bundled either package. The BKIT implementation is self-contained.

Browser differences are material: Chromium uses SVG displacement of the live
backdrop when supported; Safari/iOS cannot reliably run SVG url() displacement
inside backdrop-filter, so it refracts the independently painted optical-light
layer with a normal backdrop blur underneath. Do not advertise this as 1:1
native system refraction or as a live DOM backdrop refraction on Safari.

Design contains no Apple logos, trademarks or copied proprietary materials.

## Material Experience (2026-10-20)

The nine CSS material studies, event-driven damped springs, sensor filtering and
showroom are original BKIT code. No animation or shader package was added.
Existing dependencies used by these screens retain their original licenses:
React (MIT), Lucide React icons (ISC), DM Sans via Fontsource (SIL OFL 1.1).
The optical displacement mathematics and its earlier references above are retained;
this pass uses native blur, layered rims and directional lighting on WebKit.
No live backdrop refraction or hardware sensor verification is claimed for Safari.
