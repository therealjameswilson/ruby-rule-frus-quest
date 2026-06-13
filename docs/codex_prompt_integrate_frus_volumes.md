# Codex Integration Prompt — FRUS Hardback Volumes (Items, Interactions & Lore)

You are working in the **`therealjameswilson/ruby-rule-frus-quest`** repository (Phaser 3 + Vite + TypeScript). Two PRs add a complete FRUS-volume art pack:

- **PR #11** (`feature/frus-hardback-volumes`) — 8 base assets in `public/assets/art-pack/frus_volumes/01_…08_…`
- **PR (this branch)** (`feature/frus-volumes-extended`) — 8 additional variants in the same folder, `09_…16_…`

This prompt drives integration of all 16 assets into the game as items, world objects, interactions, and lore. Work in clear phases. After each phase, stop and post a screenshot in the PR thread before proceeding.

---

## Phase 0 — Branch + asset registry

1. Check out `main`, pull, then create branch `integrate/frus-volumes`.
2. Verify all 16 files exist under `public/assets/art-pack/frus_volumes/` (run `git ls-files public/assets/art-pack/frus_volumes/`). If PR #11 or the extended PR is unmerged, rebase or merge them in first.
3. In `src/assets/registry.ts` (create if missing), add this typed registry entry block. Do not hardcode paths anywhere else:

```ts
export const FRUS_VOLUMES = {
  // Base pack (PR #11)
  pickup_single:     'art-pack/frus_volumes/01_pickup_single_volume.png',
  world_standing:    'art-pack/frus_volumes/02_standing_volume_soviet_union.png',
  bg_shelf:          'art-pack/frus_volumes/03_bookshelf_full.png',
  pickup_stack:      'art-pack/frus_volumes/04_pickup_volume_stack.png',
  interact_open:     'art-pack/frus_volumes/05_open_volume_reading.png',
  ui_row_six:        'art-pack/frus_volumes/06_inventory_row_six.png',
  reward_legendary:  'art-pack/frus_volumes/07_legendary_boss_reward.png',
  item_corrupted:    'art-pack/frus_volumes/08_corrupted_volume_danne.png',

  // Extended pack
  pickup_carter:     'art-pack/frus_volumes/09_pickup_1977_1980_carter_era.png',
  pickup_reagan:     'art-pack/frus_volumes/10_pickup_1981_1988_reagan_era.png',
  pickup_damaged:    'art-pack/frus_volumes/11_pickup_damaged_volume.png',
  pickup_burnt:      'art-pack/frus_volumes/12_pickup_burnt_volume.png',
  pickup_microform:  'art-pack/frus_volumes/13_pickup_microform_reels.png',
  bg_library_wall:   'art-pack/frus_volumes/14_library_wall_full.png',
  world_topdown:     'art-pack/frus_volumes/15_world_volume_topdown.png',
  interact_open_maps:'art-pack/frus_volumes/16_open_volume_with_maps.png',
} as const;
```

4. Register all keys in the Phaser preload scene (`PreloadScene.ts`) by iterating over `Object.entries(FRUS_VOLUMES)` and calling `this.load.image(key, path)`.

**Checkpoint:** boot the game, open the dev console, run `game.scene.keys.preload.textures.exists('reward_legendary')` and verify `true` for every key.

---

## Phase 1 — Item definitions + rarity tiers

In `src/data/items.ts`, define FRUS items with rarity tiers, drop sources, and effects. Use this schema:

```ts
type FrusItem = {
  id: string;
  textureKey: keyof typeof FRUS_VOLUMES;
  displayName: string;
  era: '1945-1957' | '1958-1960' | '1961-1963' | '1964-1968' | '1969-1976' | '1977-1980' | '1981-1988' | 'supplement' | 'corrupted';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'cursed';
  description: string;       // shown in inventory tooltip
  loreText: string;          // longer codex-style lore unlocked on first pickup
  onPickupEffect?: 'restore_research' | 'unlock_codex' | 'reveal_map' | 'cleanse' | 'curse';
};
```

Then add at minimum these item rows (extend freely):

| id | textureKey | era | rarity | displayName |
|---|---|---|---|---|
| `frus_volume_basic` | `pickup_single` | 1961-1963 | common | FRUS 1961-1963 Vol XII |
| `frus_volume_soviet_union` | `world_standing` | 1961-1963 | uncommon | FRUS Vol V — Soviet Union |
| `frus_volume_stack` | `pickup_stack` | 1961-1963 | rare | Stack of FRUS Volumes |
| `frus_volume_carter` | `pickup_carter` | 1977-1980 | uncommon | FRUS 1977-1980 Vol I — Foundations |
| `frus_volume_reagan` | `pickup_reagan` | 1981-1988 | uncommon | FRUS 1981-1988 Vol III — Soviet Union |
| `frus_volume_damaged` | `pickup_damaged` | 1961-1963 | common | Water-Damaged FRUS Volume |
| `frus_volume_burnt` | `pickup_burnt` | 1961-1963 | rare | Charred FRUS Volume |
| `frus_microform_reels` | `pickup_microform` | supplement | uncommon | NARA Microform Supplement |
| `frus_volume_cuban_missile` | `reward_legendary` | 1961-1963 | legendary | FRUS Vol XI — Cuban Missile Crisis |
| `frus_volume_corrupted` | `item_corrupted` | corrupted | cursed | Corrupted FRUS Volume |

**onPickupEffect rules:**

- `frus_volume_basic`, `_soviet_union`, `_carter`, `_reagan` → `restore_research` (+10 research points)
- `frus_volume_stack` → `restore_research` (+30 points) and `unlock_codex`
- `frus_volume_damaged` → `restore_research` (+3 points only — broken)
- `frus_volume_burnt` → `unlock_codex` (lore-only, no points; quest item)
- `frus_microform_reels` → `unlock_codex` (+15 points)
- `frus_volume_cuban_missile` → `reveal_map` (unlocks Pacific/Europe overworld fast-travel)
- `frus_volume_corrupted` → `curse` (drains 5 research/sec while in inventory until cleansed at Office of the Historian)

**Checkpoint:** load `/data/items.json` from a dev menu and verify all entries render with correct icons.

---

## Phase 2 — Inventory UI

Build the FRUS inventory panel in `src/scenes/InventoryScene.ts`:

1. Bottom hotbar uses `ui.frus_inventory_row` (`FRUS_VOLUMES.ui_row_six`) as the row background. Each slot is a 64×64 area aligned to one of the six spines in the image — sample the x-coords once and store as constants.
2. Inventory grid (modal panel) shows items at 48×48 with rarity-colored frames:
    - common → grey
    - uncommon → green
    - rare → blue
    - epic → purple
    - legendary → gold (with subtle pulse animation, 0.8s in/out)
    - cursed → black with red sigil border (use the DANN-E sigil from the corrupted asset's spine, lifted as a small overlay)
3. Hover tooltip shows `displayName` (rarity-colored), `era` badge, `description`, and a "Press X for lore" affordance.
4. Pressing X opens a modal that fades out the game and shows the corresponding open-book interaction sprite (Phase 3) with `loreText` typed out on the pages.

**Checkpoint:** screenshot the hotbar + an opened tooltip for the legendary volume.

---

## Phase 3 — Reading interactions (Open volume)

Two open-volume textures power all "examine" interactions:

- `interact.frus_volume_open` (`05_open_volume_reading.png`) — typed declassified text with SECRET stamp + redactions
- `interact.frus_volume_open_maps` (`16_open_volume_with_maps.png`) — fold-out maps (Cuba missile sites + Berlin sectors)

Build a single `ReadVolumeScene` that:

1. Fades game scene to 20% alpha.
2. Centers the open-book sprite on a parchment-tinted background.
3. Renders dynamic text on top of the left and right pages using bitmap font (the typewriter font already used by the warning screen). Text region rectangles per texture:

```ts
const READ_REGIONS = {
  '05_typed': {
    left:  { x: 320, y: 220, w: 400, h: 420 },
    right: { x: 760, y: 220, w: 400, h: 420 },
  },
  '16_maps': {
    // maps are baked-in art; only render an optional caption strip
    caption: { x: 280, y: 660, w: 920, h: 40 },
  },
};
```

4. Item definition picks which texture to use via `item.interactionTexture` (default `interact_open`; map-bearing items override with `interact_open_maps`).
5. Decision on per-page text: pull from `loreText` field, split on `---` separator for left/right pages. For map-page items, render `caption` only.
6. Press B / Esc fades back to game scene.

**Checkpoint:** examine the legendary Cuban Missile Crisis volume — should open into `16_maps` view with caption "Compiled by HO • Declassified per E.O. 13526".

---

## Phase 4 — Drops & world placement

1. **Standing-volume world objects** (`world.frus_volume_standing`) — placeable in Tiled on shelves in `gameplay_maps/01_office_of_the_historian.png` and `06_frus_production_floor.png`. On `interact`, pick up the corresponding item id and play the existing `chime_collect.ogg` SFX.
2. **Top-down ground pickup** (`world.frus_volume_topdown`) — used as scattered loot in dungeons (NARA stacks, Black Vault antechamber). 16-tile drop shadow, gentle 1.2s bobbing tween, picked up on collision.
3. **Damaged + Burnt variants** — only drop from destroyed-archive set pieces. Place 6 burnt-volume pickups in the Black Vault Lair scene (`gameplay_maps/05_black_vault_lair.png`) along the smoldering edges; place 4 damaged-volume pickups in the NARA flooded sub-corridor.
4. **Microform reels** — single guaranteed drop after talking to the NARA archivist NPC (new NPC; place in `gameplay_maps/02_nara_ii_stacks_dungeon.png` near the catalog desk).
5. **Corrupted volumes** — only spawn inside the Black Vault Lair. Treat as enemies: they hover, fire small red ego-bolt projectiles, and drop the cursed `frus_volume_corrupted` on defeat. Use the corrupted texture for both the enemy sprite and the drop.

**Checkpoint:** screenshot the Black Vault Lair with corrupted-volume enemies hovering + a burnt-volume drop on the floor.

---

## Phase 5 — Library backgrounds (Reference scenes)

Two background scenes:

1. **`FrusShelfScene`** uses `bg.frus_shelf` (`03_bookshelf_full.png`) — a small in-office shelf inside `gameplay_maps/01_office_of_the_historian.png`. On approach, prompt "Press A to browse FRUS shelf". Opens a slim modal listing the volumes the player has collected and the volumes still missing (greyed silhouettes).
2. **`FrusArchiveWallScene`** uses `bg.frus_library_wall` (`14_library_wall_full.png`) — full multi-shelf wall inside NARA II. Treat as a "FRUS Codex" hub: clickable shelf-rows by era (1945-57, 1958-60, 1961-63, 1964-68, 1969-76), each opening that era's collected lore. The brass rolling ladder on the right is decorative; do not script collision.

**Checkpoint:** open the FRUS Archive Wall and verify era-row click → era codex panel.

---

## Phase 6 — Legendary reveal cutscene

The Cuban Missile Crisis volume (`reward.frus_legendary`) is the post-DANN-E reward:

1. After DANN-E's final phase is defeated (already implemented in PR #7 + #8 integration), trigger `LegendaryRevealScene`:
    - Black fade-in
    - Camera slow zoom from full-screen black to the legendary book sprite at 1.0× scale
    - Golden god-rays already baked into the asset; pulse the underlying tint by ±10% over 2s for "shimmer"
    - SFX: low brass swell + chime sparkle layered
    - Caption typed out below: "You recovered FRUS 1961-1963, Volume XI — the Cuban Missile Crisis."
2. Add `frus_volume_cuban_missile` to inventory permanently.
3. Unlock fast-travel from this point forward.

**Checkpoint:** screenshot the reveal frame.

---

## Phase 7 — Corruption / cleansing mechanic

Cursed `frus_volume_corrupted` items create a tension loop:

1. While any corrupted volume is in inventory, a red vignette appears on screen edges and the player's research-points counter ticks down at -5/sec.
2. NPC dialog: bring corrupted volumes to the Historian-in-Chief office (in `gameplay_maps/01_office_of_the_historian.png`). On hand-in:
    - Play cleansing animation (the corrupted texture cross-fades to the standard pickup texture over 1.5s)
    - Convert each corrupted volume into a standard `frus_volume_basic` + award +25 research points
3. Cap inventory to **3 corrupted volumes at once** to force trips back to the office (gameplay loop).

**Checkpoint:** screenshot the cleansing animation mid-transition.

---

## Phase 8 — Era codex entries

For each era in `FrusItem.era`, write a 2-3 sentence neutral, fact-grounded codex entry. These appear in the FRUS Archive Wall modal. Keep all copy politically neutral and consistent with `history.state.gov` framing. Suggested starting copy (you may refine; do not editorialize):

- **1945-1957** — "The early Cold War subseries documents the formation of containment, the Marshall Plan, the Korean War, and the creation of NATO. Compilation began in the late 1950s under the original Foreign Relations of the United States series methodology."
- **1958-1960** — "The Eisenhower administration's final years: the U-2 incident, the Berlin Crisis, and decolonization in Africa. The first subseries volumes to use the modern triannual review process."
- **1961-1963** — "The Kennedy years: Bay of Pigs, the Berlin Wall, the Cuban Missile Crisis, and the deepening commitment in Vietnam. Twenty-five volumes covering arguably the highest-stakes period in 20th-century U.S. diplomacy."
- **1964-1968** — "The Johnson administration: Vietnam escalation, the Six-Day War, civil rights as a foreign-policy concern, and the Glassboro Summit."
- **1969-1976** — "Nixon and Ford: opening to China, détente with the USSR, the SALT I and ABM treaties, the end of the Vietnam War, and the Helsinki Final Act."
- **1977-1980** — "The Carter years: the Camp David Accords, the Panama Canal Treaties, normalization with China, SALT II, and the Iran hostage crisis."
- **1981-1988** — "The Reagan administration: the INF Treaty, strategic modernization, the Iran-Contra affair, and the diplomatic turn that closed the Cold War."

Each entry is unlocked when the player collects at least one volume in that era.

**Checkpoint:** unlock every era and screenshot the full codex.

---

## Phase 9 — Audio + polish

Add SFX hooks:
- `chime_collect.ogg` — standard pickup
- `chime_legendary.ogg` — legendary pickup (new — louder, layered)
- `low_drone.ogg` — looped while corrupted volume in inventory
- `vault_unlock.ogg` — cleanse hand-in

Polish pass:
- Particle sparkles match the gold-foil hue when picking up any non-corrupted volume.
- Corrupted-volume sprites flicker red on a 200ms interval.
- All FRUS volume sprites snap to integer pixel coordinates on render to preserve the SNES feel.

---

## Phase 10 — PR

1. Run `npm run lint && npm run typecheck && npm run build`.
2. Commit per-phase if not already squashed.
3. Open PR titled **"Integrate FRUS hardback volumes (items, drops, reading, lore, cleansing)"** against `main`.
4. PR body: include the phase checklist, screenshot grid, and a 30-sec demo gif of: collect → examine → cleanse loop.

---

## Hard constraints

- All copy must be politically neutral and historically accurate. Do not editorialize or take partisan positions.
- Preserve the SNES bar: no anti-aliasing on FRUS sprites; nearest-neighbor scaling only.
- Never display a corrupted volume on the title screen, in tutorials, or in the FRUS Archive Wall — only inside the Black Vault Lair or the player's inventory.
- The Great Seal must always be present on legitimate (non-corrupted) FRUS spines.
- Do not introduce any new external dependencies for this work.
