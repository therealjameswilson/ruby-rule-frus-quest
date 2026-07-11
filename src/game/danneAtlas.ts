import { DANNE_ITEM_CATALOG } from "./danneItemCatalog";
import type { DanneItemId, DanneItemTier } from "./danneItemCatalog";

export const DANNE_WARNING_SCREEN_ASSET = {
  id: "warning-screen",
  key: "danne-warning-screen",
  path: "assets/art-pack/danne-pack/screens/01_warning_screen_danne.png",
  displayName: "DANN-E Warning Screen"
} as const;

export const DANNE_MAP_ASSETS = [
  {
    id: "cherry-blossom-garden",
    key: "danne-map-cherry-blossom-garden",
    path: "assets/art-pack/danne-pack/maps/02_map_cherry_blossom_garden.png",
    displayName: "Cherry Blossom Garden",
    sceneKey: "CherryBlossomGardenScene"
  },
  {
    id: "black-vault-lair",
    key: "danne-map-black-vault-lair",
    path: "assets/art-pack/danne-pack/maps/03_map_black_vault_lair.png",
    displayName: "Black Vault Lair",
    sceneKey: "BlackVaultLairScene"
  },
  {
    id: "senate-hearing-chamber",
    key: "danne-map-senate-hearing-chamber",
    path: "assets/art-pack/danne-pack/maps/04_map_senate_hearing_chamber.png",
    displayName: "Senate Hearing Chamber",
    sceneKey: "SenateHearingChamberScene"
  },
  {
    id: "nara-stacks",
    key: "danne-map-nara-stacks",
    path: "assets/art-pack/danne-pack/maps/05_map_nara_stacks.png",
    displayName: "NARA Stacks",
    sceneKey: "NaraStacksScene"
  },
  {
    id: "embassy-cable-room",
    key: "danne-map-embassy-cable-room",
    path: "assets/art-pack/danne-pack/maps/06_map_embassy_cable_room.png",
    displayName: "Embassy Cable Room",
    sceneKey: "EmbassyCableRoomScene"
  }
] as const;

export const DANNE_PORTRAIT_ASSETS = [
  {
    npcId: "historian",
    key: "danne-portrait-historian",
    path: "assets/art-pack/danne-pack/portraits/07_portrait_historian.png",
    displayName: "Historian"
  },
  {
    npcId: "declass-coordinator",
    key: "danne-portrait-declass-coordinator",
    path: "assets/art-pack/danne-pack/portraits/08_portrait_declass_coordinator.png",
    displayName: "Declassification Coordinator"
  },
  {
    npcId: "archivist",
    key: "danne-portrait-archivist",
    path: "assets/art-pack/danne-pack/portraits/09_portrait_archivist.png",
    displayName: "Archivist"
  },
  {
    npcId: "senator",
    key: "danne-portrait-senator",
    path: "assets/art-pack/danne-pack/portraits/10_portrait_senator.png",
    displayName: "Senator"
  }
] as const;

export type DanneSpriteRole = "enemy" | "ally";

export const DANNE_SPRITE_ASSETS = [
  {
    entityId: "redactor-drone",
    key: "danne-sprite-redactor-drone",
    path: "assets/art-pack/danne-pack/sprites/11_sprite_redactor_drone.png",
    cols: 4,
    rows: 4,
    frameW: 313,
    frameH: 313,
    role: "enemy"
  },
  {
    entityId: "censorship-wraith",
    key: "danne-sprite-censorship-wraith",
    path: "assets/art-pack/danne-pack/sprites/12_sprite_censorship_wraith.png",
    cols: 4,
    rows: 4,
    frameW: 256,
    frameH: 384,
    role: "enemy"
  },
  {
    entityId: "junior-compiler",
    key: "danne-sprite-junior-compiler",
    path: "assets/art-pack/danne-pack/sprites/13_sprite_junior_compiler.png",
    cols: 4,
    rows: 4,
    frameW: 313,
    frameH: 313,
    role: "ally"
  },
  {
    entityId: "marine-guard",
    key: "danne-sprite-marine-guard",
    path: "assets/art-pack/danne-pack/sprites/14_sprite_marine_guard.png",
    cols: 4,
    rows: 4,
    frameW: 256,
    frameH: 384,
    role: "ally"
  }
] as const satisfies ReadonlyArray<{
  entityId: string;
  key: string;
  path: string;
  cols: number;
  rows: number;
  frameW: number;
  frameH: number;
  role: DanneSpriteRole;
}>;

export const DANNE_RUNTIME_SPRITE_ASSETS = [
  {
    entityId: "redactor-drone",
    key: "danne-runtime-redactor-drone",
    path: "assets/art-pack/danne-pack/sprites/runtime/runtime_redactor_drone.png",
    sourceKey: "danne-sprite-redactor-drone",
    cols: 4,
    rows: 4,
    frameW: 235,
    frameH: 172,
    role: "enemy"
  },
  {
    entityId: "censorship-wraith",
    key: "danne-runtime-censorship-wraith",
    path: "assets/art-pack/danne-pack/sprites/runtime/runtime_censorship_wraith.png",
    sourceKey: "danne-sprite-censorship-wraith",
    cols: 4,
    rows: 4,
    frameW: 215,
    frameH: 207,
    role: "enemy"
  },
  {
    entityId: "junior-compiler",
    key: "danne-runtime-junior-compiler",
    path: "assets/art-pack/danne-pack/sprites/runtime/runtime_junior_compiler.png",
    sourceKey: "danne-sprite-junior-compiler",
    cols: 4,
    rows: 4,
    frameW: 211,
    frameH: 157,
    role: "ally"
  },
  {
    entityId: "marine-guard",
    key: "danne-runtime-marine-guard",
    path: "assets/art-pack/danne-pack/sprites/runtime/runtime_marine_guard.png",
    sourceKey: "danne-sprite-marine-guard",
    cols: 4,
    rows: 4,
    frameW: 215,
    frameH: 224,
    role: "ally"
  }
] as const satisfies ReadonlyArray<{
  entityId: string;
  key: string;
  path: string;
  sourceKey: string;
  cols: number;
  rows: number;
  frameW: number;
  frameH: number;
  role: DanneSpriteRole;
}>;

export const DANNE_ITEM_ASSETS = DANNE_ITEM_CATALOG.map((item) => ({
  itemId: item.id,
  key: item.key,
  path: item.path,
  displayName: item.displayName,
  tier: item.tier,
  description: item.description
})) satisfies ReadonlyArray<{
  itemId: DanneItemId;
  key: string;
  path: string;
  displayName: string;
  tier: DanneItemTier;
  description: string;
}>;

export const DANNE_UI_ASSETS = [
  {
    id: "boss-healthbar",
    key: "danne-ui-boss-healthbar",
    path: "assets/art-pack/danne-pack/ui/18_ui_boss_healthbar.png",
    useCase: "DANN-E boss healthbar with phase gems"
  },
  {
    id: "scroll-corners",
    key: "danne-ui-scroll-corners",
    path: "assets/art-pack/danne-pack/ui/20_ui_scroll_corners.png",
    useCase: "Dialog scroll corner and edge chrome"
  },
  {
    id: "letterbox-bars",
    key: "danne-ui-letterbox-bars",
    path: "assets/art-pack/danne-pack/ui/21_ui_letterbox_bars.png",
    useCase: "Cutscene letterbox bars"
  }
] as const;

export const DANNE_VFX_ASSETS = [
  {
    id: "ego-bolt",
    key: "danne-vfx-ego-bolt",
    path: "assets/art-pack/danne-pack/vfx/19_vfx_ego_bolt_strip.png",
    cols: 4,
    rows: 2,
    frameW: 384,
    frameH: 512,
    framesPerRow: 4
  }
] as const;

export const DANNE_BOSS_SPRITE_ASSET = {
  entityId: "danne-boss",
  key: "danne-boss-combat",
  path: "assets/art-pack/sprites/sprite_dann_e.png",
  cols: 4,
  rows: 4,
  frameW: 256,
  frameH: 384,
  role: "enemy"
} as const satisfies {
  entityId: string;
  key: string;
  path: string;
  cols: number;
  rows: number;
  frameW: number;
  frameH: number;
  role: DanneSpriteRole;
};

export type DanneVariantPhase =
  | "reveal"
  | "prototype"
  | "colossus"
  | "cloud"
  | "infiltrator"
  | "swarm"
  | "defeated"
  | "ascendant";

export const DANNE_VARIANT_ASSETS = [
  {
    variantId: "danne-prime-humanoid",
    key: "danne-prime-humanoid",
    path: "assets/art-pack/bosses/danne-variants/01_danne_prime_humanoid.png",
    displayName: "DANN-E Prime",
    phase: "reveal"
  },
  {
    variantId: "danne-mark-i-prototype",
    key: "danne-mark-i-prototype",
    path: "assets/art-pack/bosses/danne-variants/02_danne_mark_i_prototype.png",
    displayName: "DANN-E Mark I",
    phase: "prototype"
  },
  {
    variantId: "danne-colossus-final-form",
    key: "danne-colossus-final-form",
    path: "assets/art-pack/bosses/danne-variants/03_danne_colossus_final_form.png",
    displayName: "DANN-E Colossus",
    phase: "colossus"
  },
  {
    variantId: "danne-cloud-form",
    key: "danne-cloud-form",
    path: "assets/art-pack/bosses/danne-variants/04_danne_cloud_form.png",
    displayName: "DANN-E Cloud Form",
    phase: "cloud"
  },
  {
    variantId: "danne-executive-suit",
    key: "danne-executive-suit",
    path: "assets/art-pack/bosses/danne-variants/05_danne_executive_suit.png",
    displayName: "DANN-E Executive",
    phase: "infiltrator"
  },
  {
    variantId: "danne-swarm",
    key: "danne-swarm",
    path: "assets/art-pack/bosses/danne-variants/06_danne_swarm.png",
    displayName: "DANN-E Swarm",
    phase: "swarm"
  },
  {
    variantId: "danne-defeated",
    key: "danne-defeated",
    path: "assets/art-pack/bosses/danne-variants/07_danne_defeated.png",
    displayName: "DANN-E Defeated",
    phase: "defeated"
  },
  {
    variantId: "danne-ascendant",
    key: "danne-ascendant",
    path: "assets/art-pack/bosses/danne-variants/08_danne_ascendant.png",
    displayName: "DANN-E Ascendant",
    phase: "ascendant"
  }
] as const satisfies ReadonlyArray<{
  variantId: string;
  key: string;
  path: string;
  displayName: string;
  phase: DanneVariantPhase;
}>;

export const DANNE_IMAGE_ASSETS = [
  DANNE_WARNING_SCREEN_ASSET,
  ...DANNE_MAP_ASSETS,
  ...DANNE_PORTRAIT_ASSETS,
  ...DANNE_ITEM_ASSETS,
  ...DANNE_UI_ASSETS,
  ...DANNE_VARIANT_ASSETS
] as const;

export const DANNE_GALLERY_ASSETS = [
  { category: "SCREEN", ...DANNE_WARNING_SCREEN_ASSET },
  ...DANNE_MAP_ASSETS.map((asset) => ({ category: "MAP", ...asset })),
  ...DANNE_PORTRAIT_ASSETS.map((asset) => ({ category: "PORTRAIT", ...asset })),
  ...DANNE_SPRITE_ASSETS.map((asset) => ({ category: "SPRITE", displayName: asset.entityId, ...asset })),
  ...DANNE_ITEM_ASSETS.map((asset) => ({ category: "ITEM", ...asset })),
  ...DANNE_UI_ASSETS.map((asset) => ({ category: "UI", displayName: asset.id, ...asset })),
  ...DANNE_VFX_ASSETS.map((asset) => ({ category: "VFX", displayName: asset.id, ...asset })),
  { category: "BOSS", displayName: "DANN-E Combat Sprite", ...DANNE_BOSS_SPRITE_ASSET },
  ...DANNE_VARIANT_ASSETS.map((asset) => ({ category: "VARIANT", ...asset }))
] as const;

export type DanneSpriteAsset = (typeof DANNE_SPRITE_ASSETS)[number];
export type DanneRuntimeSpriteAsset = (typeof DANNE_RUNTIME_SPRITE_ASSETS)[number];
export type DanneBossSpriteAsset = typeof DANNE_BOSS_SPRITE_ASSET;
export type DanneItemAsset = (typeof DANNE_ITEM_ASSETS)[number];
export type { DanneItemId, DanneItemTier };
export type DanneVfxAsset = (typeof DANNE_VFX_ASSETS)[number];
export type DanneGalleryAsset = (typeof DANNE_GALLERY_ASSETS)[number];
