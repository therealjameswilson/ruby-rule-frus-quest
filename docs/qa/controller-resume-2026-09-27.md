# Controller resume verification

Before the change, a simulated controller A press after a visibility return left the resume overlay visible and ResearchWorldScene paused. The overlay accepted only DOM input.

The resume screen now accepts a fresh A or Start press after neutral controller input, polls before scene input, and blocks gameplay input while suspended. Held actions remain suppressed until release. The prompt lists touch, keyboard, and controller controls at a readable size.

Production browser fixtures at 390x844 verified exploration and dialogue preservation, held-button rejection, repeated background cycles, Start without opening a menu, movement afterward, and existing touch/keyboard dismissal. Zero page errors. Compositor screenshots inspected. Simulated controller and visibility events are not physical hardware certification.

283 test files / 2,119 tests passed. Production build passed. Standard gameplay client moved the hero to x143; native capture remains black as previously observed, while compositor images render correctly.
