# Read the packet, choose the terminal

Previously every routing packet supplied its destination in the objective,
handoff toast and moving trail. The player could finish by following answers.

The first published-research packet remains a guided example. Later packets
show their marking in the HUD: PUBLIC PROOF, INTERNAL REVIEW or CLASSIFIED.
The physical terminals now have short PUBLIC COPIES / PROTECTED REVIEW signs.
The player chooses a terminal by walking to it and sending the held packet.
The same four packets and seven underlying items remain; no extra quiz, modal
gate or sorter-return trip has been added.

## Recoverable help

Marcus now responds to A near his upper-left position. He explains the current
packet and restores the destination objective and trail for that packet only.
Help is optional and does not file anything, change inventory or award points.
A rejected transmission also supplies the explanation and route hint while
keeping the packet in hand. The existing two-point firewall penalty is unchanged.

The hint's packet order persists in existing sceneProgress. Continue restores
it, while the next packet returns to its own marking. Old saves without a hint
remain usable. The SBU explanation explicitly describes this exercise's routing
convention, not a general assertion that SBU is classified.

Touch screenshot review caught the existing bottom dialogue position overlapping
the A/B buttons. Network opts into a position above those controls; other scenes
retain their existing placement. The help replay checks the actual frame and
text bounds, then dismisses the conversation using touch A.

## Verification (2026-09-09)

- All 188 test files / 1,382 tests pass. Tests cover bounded markings and hints,
  first-packet guidance, per-packet hint expiry, save round-trip without document
  approval, and existing rejection/batch/exit rules. Updated two source-wiring
  assertions for the added hint parameter; no behavior checks were removed.
- Build passes: 251 modules / 2,794.82 KB main JS; existing chunk warning.
- Earned keyboard and simulated-touch routes ask Marcus about packet two,
  resume its saved hint, reject an internal-review packet at OpenNet, recover
  with assistance, route the final classified packet and finish the vault to
  reach Referral. No console/page errors.
- Native/compositor screenshots checked for HUD markings, terminal signs and
  the optional conversation. The installed game client uses the Network debug
  entry for its rendering check; it is not counted as earned progression.

Evidence: /private/tmp/frus-packet-judgment-desktop-0909,
/private/tmp/frus-packet-judgment-touch-0909 and
/private/tmp/frus-packet-final-client-0909. Final touch placement check:
/private/tmp/frus-packet-help-touch-final-0909.

This remains an introductory two-choice task, not a difficult routing puzzle.
The scripted routes establish playability, not whether a new player finds the
signs and help independently. Next: novice-paced checks of discovery and the
following referral chapter; keep assistance available rather than adding
confusion to create artificial difficulty. Real iPhone Safari remains unverified.
