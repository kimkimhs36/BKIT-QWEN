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
