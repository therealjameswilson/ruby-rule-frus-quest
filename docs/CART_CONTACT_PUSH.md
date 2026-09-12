# Physical Archive Cart Push

The annotation cart now accepts sustained directional pressure as well as
the existing interact-button push. Holding a cardinal direction into contact
for 250ms moves it one 16px tile along its existing lane. Continuing to hold
can move another tile after reaching contact again; walking past does not.

## Boundaries

- No input bindings, room geometry, save schema or puzzle rewards changed.
- Contact must be against the cart, directed toward it, with a legal next tile.
- Diagonal input, release, leaving contact and direction changes reset the hold.
- Overlays, room transitions and explicit actions reset accumulated pressure.
- Held pushes use input direction, so slightly off-center approaches work.
  Button pushes retain their original positional direction selection.
- A single render-rounding pixel is tolerated at contact, not a position
  inside the cart. Long frame gaps cannot skip the full contact delay.
- Parking still requires the correct bay. Collecting the context note and
  filing the packet remain separate player actions.

## Verification

All 196 test files / 1,471 tests pass. Production build passes, with the
existing large-chunk warning. Tests cover contact, off-center pressure,
wrong directions, diagonal input, timing resets, legal routes and saves.

The earned touch Archive route passed 39 checkpoints through Network before
the final off-center correction. The final code then repeated the cart-to-
Network section from that run's earned partial-stacks save using
`qa-archive-wall.mjs --mobile --hold-cart --cart-only`. It tests a brief bump
without movement, held north push, button east/north pushes, intermediate
Continue, parking without auto-collection, explicit note pickup and filing.

The installed web-game client walked from an earned desk save to an off-center
cart contact using keyboard only. Holding north moved the cart from (128,160)
to (128,112), without leaving the lane, parking it, awarding points or
collecting the note. Native screenshots were inspected.

Live testing caught two implementation issues before completion: pixel-snapped
feet at the collision boundary initially failed the contact test; off-center
held pushes initially inherited the button's positional axis selection. Both
have focused regression assertions. The older QA movement helper also needed
shorter input bursts near targets to avoid oscillating around its arrival
radius; its tolerance and collision checks were not loosened.

Evidence: `/private/tmp/frus-cart-hold-final/`,
`/private/tmp/frus-cart-final-touch/`, and
`/private/tmp/frus-cart-keyboard-final/`. Failed investigations remain under
`/private/tmp/frus-cart-hold-touch/` and `/private/tmp/frus-cart-hold-verified/`.
This is simulated touch and scripted keyboard, not physical-device or novice
enjoyment evidence. Local only; no public deployment.
