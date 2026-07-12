# Live critical-path room graph

The authoritative room-ID route from the Archive source packet to publication
is:

```text
A1 -> N1 -> N2 -> R1 -> R2 -> E1 -> S1 -> DV1 -> G1
```

Those IDs correspond to the physical scene sequence:

```text
Archive source room
  -> Two Networks / Network Split
  -> ClassNet Vault
  -> Referral Equity Gate
  -> Concurrence Chamber
  -> Editor's Labyrinth
  -> Silent Read Tower
  -> Black Vault
  -> Buckram Gate
```

Earlier architecture left `A1 -> A2` and `R2 -> S1` in
`FRUS_ROOM_GRAPH`, even though scene transitions had correctly evolved to
`A1 -> N1` and `R2 -> E1`. Scene-local traversal readouts likewise exposed
scene names (`ReferralVaultScene`, `SilentReadScene`,
`BlackVaultLairScene`) rather than stable room IDs. This made pause/minimap and
QA state disagree with actual play.

The global graph and every live scene-local readout now use the stable IDs
above. The scene transitions remain unchanged. A focused test asserts every
critical edge; browser QA inspects full `roomTraversal` state for A1, N2, R2,
and S1; full desktop and touch play complete A1 and arrive in N1.

The older A2-D3 Archive annex still exists as optional/legacy authored content,
but A2 is no longer advertised as the main east exit or allowed to duplicate
the real Two Networks reward path. It should be deliberately redesigned as an
optional backtracking loop before any further visual promotion.
