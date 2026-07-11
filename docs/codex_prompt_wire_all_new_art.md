# Codex Integration Prompt — Wire In All New Art (Maps + FRUS Volumes)

You are working in the **`therealjameswilson/ruby-rule-frus-quest`** repository (Phaser 3 + Vite + TypeScript). This prompt wires the **29 new art assets** shipped across PRs #9, #11, and #12 into the game as scenes, items, drops, interactions, UI, cutscenes, and lore.

Source PRs (merge before starting if any are still open):
- **PR #9** — `feature/overworld-and-gameplay-maps` — 5 overworld region maps + 8 gameplay world maps
- **PR #11** — `feature/frus-hardback-volumes` — 8 base FRUS volume assets
- **PR #12** — `feature/frus-volumes-extended` — 8 extended FRUS volume variants + per-pack integration plan

Execute in clear phases. After each phase, stop and post a screenshot in the PR thread before proceeding. Do not skip checkpoints.

---

## Phase 0 — Branch + Asset Registry

1. Check out `main`, pull, then create branch `integrate/all-new-art`.
2. Verify all 29 files exist:
   - `git ls-files public/assets/art-pack/overworld_maps/` → 5 files
   - `git ls-files public/assets/art-pack/gameplay_maps/` → 8 files
   - `git ls-files public/assets/art-pack/frus_volumes/` → 16 files
3. Create or extend `src/assets/registry.ts` with this single source of truth — do not hardcode paths anywhere else:

```ts
export const OVERWORLD_REGIONS = {
  europe:        'art-pack/overworld_maps/01_cold_war_europe.png',
  pacific:       'art-pack/overworld_maps/02_pacific_theater.png',
  middle_east:   'art-pack/overworld_maps/03_middle_east_crossroads.png',
  latin_america: 'art-pack/overworld_maps/04_latin_america.png',
  africa:        'art-pack/overworld_maps/05_africa_cold_war_front.png',
} as const;

export const GAMEPLAY_MAPS = {
  historian_office: 'art-pack/gameplay_maps/01_office_of_the_historian.png',
  nara_stacks:      'art-pack/gameplay_maps/02_nara_ii_stacks_dungeon.png',
  foggy_bottom:     'art-pack/gameplay_maps/03_foggy_bottom_street.png',
  west_wing:        'art-pack/gameplay_maps/04_white_house_west_wing.png',
  black_vault:      'art-pack/gameplay_maps/05_black_vault_lair.png',
  frus_floor:       'art-pack/gameplay_maps/06_frus_production_floor.png',
  embassy:          'art-pack/gameplay_maps/07_embassy_compound.png',
  capitol_hill:     'art-pack/gameplay_maps/08_capitol_hill_hearing.png',
} as const;

export const FRUS_VOLUMES = {
  // Base pack (PR #11)
  pickup_single:      'art-pack/frus_volumes/01_pickup_single_volume.png',
  world_standing:     'art-pack/frus_volumes/02_standing_volume_soviet_union.png',
  bg_shelf:           'art-pack/frus_volumes/03_bookshelf_full.png',
  pickup_stack:       'art-pack/frus_volumes/04_pickup_volume_stack.png',
  interact_open:      'art-pack/frus_volumes/05_open_volume_reading.png',
  ui_row_six:         'art-pack/frus_volumes/06_inventory_row_six.png',
  reward_legendary:   'art-pack/frus_volumes/07_legendary_boss_reward.png',
  item_corrupted:     'art-pack/frus_volumes/08_corrupted_volume_danne.png',
  // Extended pack (PR #12)
  pickup_carter:      'art-pack/frus_volumes/09_pickup_1977_1980_carter_era.png',
  pickup_reagan:      'art-pack/frus_volumes/10_pickup_1981_1988_reagan_era.png',
  pickup_damaged:     'art-pack/frus_volumes/11_pickup_damaged_volume.png',
  pickup_burnt:       'art-pack/frus_volumes/12_pickup_burnt_volume.png',
  pickup_microform:   'art-pack/frus_volumes/13_pickup_microform_reels.png',
  bg_library_wall:    'art-pack/frus_volumes/14_library_wall_full.png',
  world_topdown:      'art-pack/frus_volumes/15_world_volume_topdown.png',
  interact_open_maps: 'art-pack/frus_volumes/16_open_volume_with_maps.png',
} as const;
```

4. In `PreloadScene.ts`, iterate over all three registries and call `this.load.image(key, path)`. Group `console.log` output by registry name.

**Checkpoint:** boot the game; in dev console run `game.textures.exists('historian_office')` and `game.textures.exists('reward_legendary')` — both must return `true`. Screenshot the console.

---

## Phase 1 — World Map Scene (Region Select)

Wire the 5 overworld region maps as a region-select hub.

1. Create `src/scenes/WorldMapScene.ts`. Default region is `europe`.
2. Render the current region image full-screen with a fixed aspect-correct fit (the parchment border is part of the art — do not letterbox over it).
3. Add a top-bar "Region:" selector with left/right arrows (or 1-5 number keys) that cycle through `europe → pacific → middle_east → latin_america → africa → europe`.
4. Each region has 8 district hot-zones. Author these as a JSON config at `src/data/regions.ts`. Schema:

```ts
type District = {
  id: string;           // 'west_berlin'
  region: keyof typeof OVERWORLD_REGIONS;
  number: 1|2|3|4|5|6|7|8;
  displayName: string;  // 'West Berlin'
  bounds: { x: number; y: number; w: number; h: number }; // px in source image
  destinationScene?: keyof typeof GAMEPLAY_MAPS;          // optional gameplay map transition
  locked?: boolean;     // gated by progression
};
```

Author all 40 districts (8 per region × 5 regions). Use the brass-cartouche centers from the art as anchor points; size each `bounds` to a comfortable click target around its cartouche. Mark all districts unlocked initially for testing.

5. On hover, tint the district hot-zone with a 20% gold overlay and show a tooltip with `displayName`. On click, if `destinationScene` is set, transition to `GameplayMapScene` with that key. Otherwise show a "Coming soon — diplomatic cable archive" placeholder modal.

6. Wire these initial destination scenes (extend later):
   - Europe → West Berlin → `west_wing` (NSC briefing about Berlin)
   - Europe → Vienna → `embassy`
   - Pacific → Tokyo → `embassy`
   - Middle East → Cairo → `embassy`
   - Latin America → Havana → `nara_stacks` (Cuban Missile Crisis archive deep-dive)
   - Africa → Pretoria → `embassy`
   - Every region's 8th district → `capitol_hill` (Senate Foreign Relations hearing follow-up)

**Checkpoint:** Cycle through all 5 regions, hover every cartouche, click into 3 different destinations. Screenshot the Europe map with a tooltip visible over West Berlin.

---

## Phase 2 — Gameplay Map Scenes

For each of the 8 gameplay maps, create a Phaser scene that renders the map as a static background and overlays a Tiled-authored collision/door/spawn layer.

1. Create `src/scenes/GameplayMapScene.ts` as a base class that takes a `mapKey: keyof typeof GAMEPLAY_MAPS` and a Tiled `.json` collision layer. Subclass for any map-specific NPC logic.

2. Author one Tiled `.tmj` per map under `public/assets/tiled/` matching the same dimensions as the source PNG. For each map, add three object layers:
   - `collisions` — solid rectangles around walls, furniture, doorways' frames
   - `doors` — open doorway rectangles tagged with `target: <sceneKey>` and `spawn: <spawnId>`
   - `spawns` — player/NPC spawn points

3. Map-specific authoring guide (the brass plaques in the art identify the rooms; use those names as anchors):

   - **historian_office**: 5 inner rooms — Research Bullpen, Conference Room, Historian-in-Chief, Archive Room, Coffee Station. Place the FRUS bookshelf interaction object (Phase 5) in the Historian-in-Chief room. Add NPC "Historian-in-Chief" at the red leather desk chair.
   - **nara_stacks**: 4 corner vaults (A–D), central catalog desk rotunda, freight elevator at the bottom-center. NPC "NARA Archivist" at the catalog desk. The Red Zone Declassification room is a sub-area gated by a quest flag.
   - **foggy_bottom**: outdoor street scene. Player walks the sidewalks; entrance to the Truman Building (front door, top-center) transitions to `historian_office`. Do not allow the player onto C Street roadway.
   - **west_wing**: 5 named rooms. Oval Office (start point), Cabinet Room, Roosevelt Room, Situation Room, Press Briefing Room. Secret Service NPCs gate Situation Room until quest progression flag `nsc_clearance = true`.
   - **black_vault**: boss arena. Single open chamber with the obelisk core at the center as the boss-fight trigger. Four blast doors at the cardinal directions; only the south door (entry) is initially passable.
   - **frus_floor**: walk-through showcase. Each of the 5 rooms (Research, Compilation, Declass Review, Annotation, Publication) plays a one-line NPC dialog describing that phase of FRUS production when the player enters.
   - **embassy**: outdoor compound. Gate at the south wall (entry from region select). Chancery main door (north-center) → modal: "Diplomatic cables not yet implemented". Motor pool, helipad, chapel are decorative.
   - **capitol_hill**: central hearing chamber. Sit at the witness table to trigger a mini-dialog NPC interaction with the senators bench. Closed-Session vault room locked behind quest progression.

4. Implement door transitions and player spawn at the named `spawn` object on entry.

**Checkpoint:** Walk through every door in every map. Screenshot the Office of the Historian with the player avatar standing in the Historian-in-Chief room.

---

## Phase 3 — FRUS Item Definitions + Rarity Tiers

In `src/data/items.ts`:

```ts
type FrusItem = {
  id: string;
  textureKey: keyof typeof FRUS_VOLUMES;
  displayName: string;
  era: '1945-1957' | '1958-1960' | '1961-1963' | '1964-1968' | '1969-1976' | '1977-1980' | '1981-1988' | 'supplement' | 'corrupted';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'cursed';
  description: string;
  loreText: string; // newline + '---' separator splits left/right pages for ReadVolumeScene
  interactionTexture?: 'interact_open' | 'interact_open_maps';
  onPickupEffect?: 'restore_research' | 'unlock_codex' | 'reveal_map' | 'cleanse' | 'curse';
};
```

Register at minimum these rows:

| id | textureKey | era | rarity | onPickupEffect |
|---|---|---|---|---|
| `frus_basic` | `pickup_single` | 1961-1963 | common | restore_research +10 |
| `frus_soviet_union` | `world_standing` | 1961-1963 | uncommon | restore_research +15 |
| `frus_stack` | `pickup_stack` | 1961-1963 | rare | restore_research +30, unlock_codex |
| `frus_carter` | `pickup_carter` | 1977-1980 | uncommon | restore_research +15 |
| `frus_reagan` | `pickup_reagan` | 1981-1988 | uncommon | restore_research +15 |
| `frus_damaged` | `pickup_damaged` | 1961-1963 | common | restore_research +3 |
| `frus_burnt` | `pickup_burnt` | 1961-1963 | rare | unlock_codex (quest only) |
| `frus_microform` | `pickup_microform` | supplement | uncommon | restore_research +15, unlock_codex |
| `frus_cuban_missile` | `reward_legendary` | 1961-1963 | legendary | reveal_map (fast-travel) |
| `frus_corrupted` | `item_corrupted` | corrupted | cursed | curse (-5/sec while held) |

Volumes with maps in their content (Cuban Missile Crisis, any Berlin-era volume) set `interactionTexture: 'interact_open_maps'`. All others default to `'interact_open'`.

**Checkpoint:** Open a dev menu and grant all 10 items at once. Screenshot the inventory grid.

---

## Phase 4 — Inventory UI

Create `src/scenes/InventoryScene.ts`:

1. **Bottom hotbar**: render `FRUS_VOLUMES.ui_row_six` as the row background, fixed to the bottom of the screen. Six slot regions overlaid on the six spines in the image — sample x-coords once from the art and store in a constant. Pressing `1`–`6` selects that hotbar slot.

2. **Inventory modal grid** (toggled with Tab): 48×48 item cells with rarity-colored frames:
   - common → grey · uncommon → green · rare → blue · epic → purple
   - legendary → gold with a 0.8s in/out pulse tween
   - cursed → black with a red sigil border (lift the small DANN-E sigil from the corrupted asset's spine and re-tint for the border)

3. **Hover tooltip**: `displayName` (colored by rarity) + era badge + `description` + "Press X for lore".

4. **Press X** with an item highlighted: opens `ReadVolumeScene` (Phase 5).

**Checkpoint:** Tooltip + open inventory modal screenshot showing the legendary Cuban Missile Crisis volume pulsing gold.

---

## Phase 5 — Read Volume Scene (Lore Reading)

Create `src/scenes/ReadVolumeScene.ts`:

1. Fade the parent scene to 20% alpha.
2. Center the open-book sprite (texture chosen by `item.interactionTexture`) on a parchment-tinted vignette background.
3. Render dynamic text on the pages with the existing typewriter bitmap font. Coordinate the text regions per texture:

```ts
const READ_REGIONS = {
  interact_open: {
    left:  { x: 320, y: 220, w: 400, h: 420 },
    right: { x: 760, y: 220, w: 400, h: 420 },
  },
  interact_open_maps: {
    // maps are baked into the art; render only an optional caption strip
    caption: { x: 280, y: 660, w: 920, h: 40 },
  },
};
```

4. Split `loreText` on `---` for left/right pages on the typed-text texture. For map-bearing items, render just the caption (`"Declassified per E.O. 13526 · Compiled by HO"` or similar).

5. Press B / Esc fades back to the parent scene.

**Checkpoint:** Examine `frus_cuban_missile` → opens with maps; examine `frus_basic` → opens with typed text + SECRET stamp + redaction bars. Screenshot both.

---

## Phase 6 — World Pickups + Drops

1. **Standing-volume world objects** (`world_standing`): Tiled-place on the bookshelves in `historian_office` (Historian-in-Chief room) and `frus_floor` (Annotation + Publication rooms). On `interact`, the volume disappears and the player gains `frus_soviet_union` (or other item per Tiled custom prop `frus_item_id`). Play existing `chime_collect.ogg`.

2. **Top-down ground pickups** (`world_topdown`): scattered loot in `nara_stacks` (8 placements) and `black_vault` antechamber (4 placements). Gentle 1.2s bobbing tween, 16-tile drop shadow, collision-based pickup.

3. **Damaged volumes** (`pickup_damaged`): place 4 in a NARA flooded sub-corridor (carve out a new room behind one of the Vault doors in the Tiled map for `nara_stacks`).

4. **Burnt volumes** (`pickup_burnt`): place 6 along the smoldering edges of `black_vault`. These are quest items — they do not stack; they pop a one-line modal on first pickup explaining "Recovered from the Black Vault inferno."

5. **Microform reels** (`pickup_microform`): single guaranteed drop after talking to the **NARA Archivist** NPC in `nara_stacks` (the NPC's first dialog choice is "Show me what survived").

6. **Corrupted volumes** (`item_corrupted`): only spawn in `black_vault`. Implement as enemy entities — hover sprites that fire small red "ego-bolt" projectiles (reuse DANN-E's projectile from PR #7), 3 HP each, drop a cursed `frus_corrupted` on defeat. Cap at 4 simultaneous corrupted enemies.

**Checkpoint:** Screenshot NARA stacks with ground pickups visible + Black Vault with corrupted enemies hovering.

---

## Phase 7 — Library / Shelf Background Scenes

Two reference-browser scenes:

1. **`FrusShelfScene`** uses `bg_shelf` (`03_bookshelf_full.png`). Triggered by interacting with the bookshelf in the Historian-in-Chief room. Slim modal: lists volumes the player has collected (highlighted spines) vs. volumes still missing (greyed silhouettes over the corresponding spines in the art). Click a collected volume → opens `ReadVolumeScene` for that item.

2. **`FrusArchiveWallScene`** uses `bg_library_wall` (`14_library_wall_full.png`). Triggered by an interaction object in `nara_stacks` central catalog desk. Treat as the **FRUS Codex hub** — clickable shelf-rows by era. Each era row opens an era codex panel (Phase 9). The brass rolling ladder on the right is decorative; do not script collision.

**Checkpoint:** Open both scenes; click into a Cuban Missile Crisis spine on the Archive Wall and verify it routes to the era codex.

---

## Phase 8 — Legendary Reveal Cutscene

The Cuban Missile Crisis volume is the post-DANN-E reward.

1. After DANN-E's final phase is defeated (logic already in PR #7 + #8 integration), trigger `LegendaryRevealScene`:
   - Black fade-in.
   - Camera slow zoom from full black to the legendary book sprite (`reward_legendary`) at 1.0× scale over 2.5s.
   - The golden god-rays and halo are baked into the asset; layer a subtle ±10% tint pulse over 2s for "shimmer."
   - SFX: low brass swell + chime sparkle layered.
   - Typed caption below: `"You recovered FRUS 1961-1963, Volume XI — the Cuban Missile Crisis."`
2. Add `frus_cuban_missile` to inventory permanently (cannot be dropped).
3. Unlock fast-travel between all 5 overworld regions from this point forward.

**Checkpoint:** Trigger from a dev cheat (`F9` → "Win boss"). Screenshot the reveal frame.

---

## Phase 9 — Era Codex Entries

For each `era` value in `FrusItem`, store a 2–3 sentence neutral, fact-grounded codex entry in `src/data/era_codex.ts`. These appear when a player clicks an era row in `FrusArchiveWallScene`. Keep all copy politically neutral and consistent with `history.state.gov` framing. Starting copy (refine; do not editorialize):

- **1945-1957** — The early Cold War subseries documents the formation of containment, the Marshall Plan, the Korean War, and the creation of NATO. Compilation began in the late 1950s under the original Foreign Relations of the United States series methodology.
- **1958-1960** — The Eisenhower administration's final years: the U-2 incident, the Berlin Crisis, and decolonization in Africa. The first subseries volumes to use the modern triannual review process.
- **1961-1963** — The Kennedy years: Bay of Pigs, the Berlin Wall, the Cuban Missile Crisis, and the deepening commitment in Vietnam. Twenty-five volumes covering arguably the highest-stakes period in 20th-century U.S. diplomacy.
- **1964-1968** — The Johnson administration: Vietnam escalation, the Six-Day War, civil rights as a foreign-policy concern, and the Glassboro Summit.
- **1969-1976** — Nixon and Ford: opening to China, détente with the USSR, the SALT I and ABM treaties, the end of the Vietnam War, and the Helsinki Final Act.
- **1977-1980** — The Carter years: the Camp David Accords, the Panama Canal Treaties, normalization with China, SALT II, and the Iran hostage crisis.
- **1981-1988** — The Reagan administration: the INF Treaty, strategic modernization, the Iran-Contra affair, and the diplomatic turn that closed the Cold War.
- **supplement** — Microform supplements collect documents that did not fit into the printed volumes — declassified later, too voluminous to print, or released under FOIA. Microfilm reels and microfiche cards are accessible at NARA II.
- **corrupted** — DANN-E's influence has twisted these volumes. The text inside shifts when you blink. Return them to the Office of the Historian to cleanse.

Each entry unlocks only when the player has collected at least one volume in that era.

**Checkpoint:** Collect one of each era's volumes via dev cheats; screenshot the unlocked Archive Wall with all era panels.

---

## Phase 10 — Corruption / Cleansing Loop

Cursed `frus_corrupted` items create a return-trip tension loop:

1. While any corrupted volume is in inventory, render a red vignette at the screen edges and tick the research-points counter at **-5/sec**.
2. NPC dialog at the **Historian-in-Chief** (in `historian_office`): bring corrupted volumes to her office. On hand-in:
   - Play a 1.5s cleansing animation: cross-fade the corrupted texture to `pickup_single` over 1.5s with a white-flash mid-fade.
   - Convert each corrupted volume into a `frus_basic` + award **+25 research points**.
3. Cap inventory at **3 corrupted volumes max** to force return trips to her office.
4. Cleansing dialog line (politically neutral): _"It's not lost. It's just been distorted. Let's put it back the way it was."_

**Checkpoint:** Spawn 3 corrupted volumes via dev cheat, walk to the Historian-in-Chief, hand them in, screenshot the mid-transition cross-fade.

---

## Phase 11 — Audio + Polish

SFX hooks (add files under `public/assets/audio/` if missing — placeholders are fine for now):
- `chime_collect.ogg` — standard pickup
- `chime_legendary.ogg` — legendary pickup (louder, layered brass + sparkle)
- `low_drone.ogg` — looped while a corrupted volume is in inventory
- `vault_unlock.ogg` — cleanse hand-in
- `region_select_swoosh.ogg` — region cycle in WorldMapScene

Polish pass:
- Particle sparkles match the gold-foil hue when picking up any non-corrupted volume.
- Corrupted-volume sprites flicker red on a 200ms interval.
- All FRUS volume sprites snap to integer pixel coords on render (preserve the SNES feel).
- All gameplay-map scenes preserve the parchment border — never render game UI over the border.
- Region-select cartouches show a "Locked" overlay when `district.locked === true`.

---

## Phase 12 — Mobile + Final QA

1. Verify the existing mobile virtual D-pad still works on every new gameplay map (touch targets do not collide with the parchment border).
2. Verify WorldMapScene region cycling works via on-screen left/right buttons (not just keyboard).
3. Run `npm run lint && npm run typecheck && npm run build`. Fix any errors.
4. Smoke-test the full happy path: Title → World Map → click district → enter gameplay map → walk → pick up FRUS volume → open inventory → examine → return to World Map.
5. Smoke-test the boss path: dev-cheat to Black Vault → defeat DANN-E → Legendary Reveal → inventory shows Cuban Missile Crisis volume.

---

## Phase 13 — PR Open

1. Commit with descriptive messages per phase if not already squashed.
2. Open PR titled **"Wire all new art: world maps + gameplay maps + FRUS volumes"** against `main`.
3. PR body must include:
   - The phase checklist with completion checkmarks
   - A screenshot grid (one per phase checkpoint)
   - A 30-second demo gif of: World Map → district click → gameplay map → FRUS volume pickup → examine → cleanse loop
   - A short "Known gaps / follow-ups" section listing every district that does not yet have a `destinationScene` (these are the ones marked "Coming soon" — track them as a follow-up issue).

---

## Hard Constraints (apply throughout)

- **Politically neutral.** All FRUS copy, era codex entries, NPC dialog, and map descriptions must be historically accurate and non-partisan. Mirror `history.state.gov` framing.
- **SNES bar is binary.** Nearest-neighbor scaling only on all 29 assets. No anti-aliasing. No 3D shading.
- **The Great Seal is sacred.** It must always be present on legitimate (non-corrupted) FRUS spines and never appear on the corrupted variant in any context outside the Black Vault or the player's inventory.
- **Parchment border is part of the art.** Never crop or overlay UI on top of the deckled tan border of any map or library scene.
- **No new external dependencies.** Use what's already in `package.json`. If you genuinely need a new lib, stop and ask first.
- **Asset paths only via the three registries in Phase 0.** Do not hardcode `art-pack/...` strings anywhere else in the codebase.
- **Checkpoints are non-negotiable.** Post the screenshot before moving to the next phase.

---

## Reference: Asset → Phase Index

For quick lookup while implementing:

| Asset(s) | Used in Phase |
|---|---|
| 5 overworld region maps | 1 (WorldMapScene), 12 (mobile QA) |
| 8 gameplay world maps | 2 (GameplayMapScene), 6 (drop placement), 10 (cleansing hub) |
| `01_pickup_single_volume` | 3, 4, 6, 10 (cleansed form) |
| `02_standing_volume_soviet_union` | 6 (world placement) |
| `03_bookshelf_full` | 7 (FrusShelfScene) |
| `04_pickup_volume_stack` | 3, 4 |
| `05_open_volume_reading` | 5 (typed-text reading) |
| `06_inventory_row_six` | 4 (hotbar background) |
| `07_legendary_boss_reward` | 8 (LegendaryRevealScene) |
| `08_corrupted_volume_danne` | 6 (enemies), 10 (cleansing) |
| `09_pickup_1977_1980_carter_era` | 3, 6 |
| `10_pickup_1981_1988_reagan_era` | 3, 6 |
| `11_pickup_damaged_volume` | 3, 6 (NARA flooded zone) |
| `12_pickup_burnt_volume` | 3, 6 (Black Vault) |
| `13_pickup_microform_reels` | 3, 6 (NARA Archivist drop) |
| `14_library_wall_full` | 7 (FrusArchiveWallScene), 9 (era codex hub) |
| `15_world_volume_topdown` | 6 (ground pickups) |
| `16_open_volume_with_maps` | 5 (map-bearing reading) |

End of prompt.
