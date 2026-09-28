# Resume above native research desks

Baseline: a visibility return during manuscript selection marked the resume button visible, but document.elementFromPoint at its center returned the underlying supporting-file card. A native modal dialog occupies the browser top layer above any ordinary z-index.

The resume shield is now a native dialog with a focused resume button. Opening it places it above the research desk; closing it restores the previous desk control. Its opaque central card keeps the instructions legible over evidence text.

Production fixtures passed on desktop and simulated 390x844 phone: pointer, keyboard, and simulated controller resumption, top-layer hit testing, packet selection preservation, exact focus/scroll restoration, subsequent selection edits, and B to leave. Zero page errors. Approach/progress fixtures, not an earned campaign or physical-device test. Compositor screenshots inspected.

Existing controller-resume fixtures also pass for exploration/dialogue, held-action protection, repeated background cycles, and movement.283 files / 2119 tests and production build pass. Standard client moved to x143; known native black screenshot persists while compositor rendering works.
