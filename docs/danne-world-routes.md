# DANN-E Expansion World Routes

Phase 9 wires the DANN-E art-pack maps into the playable FRUS world while keeping the original `?scene=` debug links intact.

## Office Hub Routes

Cherry Blossom Garden is now reached from the Office Hub back-door marker. It acts as the quiet save garden and Ruby Pen reward space, then returns the player to the same Office doorway through the existing scene transition helper.

Senate Hearing Chamber is now reached from the Office Hub front-door marker. It is a story room centered on witness-table review and Treaty Fragment II, then returns the player to the Office corridor.

## Archive Routes

NARA Stacks is now reached from the Source Entry room in Archive Cavern through the NARA II stairs marker. Returning from the stacks preserves the Archive room and player position at the stair marker.

Embassy Cable Room is now reached from the OpenNet Annex side-hall marker. The interaction priority keeps the visible doorway from being stolen by nearby FIREWALL enemies, and the return path restores the player to OpenNet Annex near the cable door.

Black Vault Lair is registered as the gated endgame route from the Queue Boss Gate. The Black Vault seal opens only after the Treaty Fragments are assembled, the Golden Rule gate has a human decision, the Buckram Key is present, or the boss has already been cleared.

## World Atlas

The main atlas now lists Cherry Blossom Garden, Senate Hearing Chamber, NARA Stacks, Embassy Cable Room, and Black Vault Lair as landmarks. The room graph mirrors those locations as `DG1`, `DH1`, `DN1`, `DE1`, and `DV1` so the minimap/readout can reveal them alongside the existing Archive and Office rooms.

## Phase 9 Verification

- `npm run build`
- `?scene=OfficeScene` route smoke to Cherry Blossom Garden and Senate Hearing Chamber
- `?scene=ArchiveScene` route smoke to NARA Stacks and Embassy Cable Room
- `?scene=BlackVaultLairScene&give=fragments` load/return smoke
- pagehide save smoke from `?scene=NaraStacksScene` confirming saved `currentScene: NaraStacksScene`
