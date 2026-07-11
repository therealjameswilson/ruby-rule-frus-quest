export const PUBLIC_ASSET_ROOT = "assets";

export const OVERWORLD_REGIONS = {
  europe: "art-pack/overworld_maps/01_cold_war_europe.png",
  pacific: "art-pack/overworld_maps/02_pacific_theater.png",
  middle_east: "art-pack/overworld_maps/03_middle_east_crossroads.png",
  latin_america: "art-pack/overworld_maps/04_latin_america.png",
  africa: "art-pack/overworld_maps/05_africa_cold_war_front.png",
  overseas_post: "art-pack/world2/01_overseas_post_region.png"
} as const;

export const GAMEPLAY_MAPS = {
  historian_office: "art-pack/gameplay_maps/01_office_of_the_historian.png",
  nara_stacks: "art-pack/gameplay_maps/02_nara_ii_stacks_dungeon.png",
  foggy_bottom: "art-pack/gameplay_maps/03_foggy_bottom_street.png",
  west_wing: "art-pack/gameplay_maps/04_white_house_west_wing.png",
  black_vault: "art-pack/gameplay_maps/05_black_vault_lair.png",
  frus_floor: "art-pack/gameplay_maps/06_frus_production_floor.png",
  embassy: "art-pack/gameplay_maps/07_embassy_compound.png",
  capitol_hill: "art-pack/gameplay_maps/08_capitol_hill_hearing.png"
} as const;

export const GAMEPLAY_TILED_MAPS = {
  historian_office: "tiled/historian_office.tmj",
  nara_stacks: "tiled/nara_stacks.tmj",
  foggy_bottom: "tiled/foggy_bottom.tmj",
  west_wing: "tiled/west_wing.tmj",
  black_vault: "tiled/black_vault.tmj",
  frus_floor: "tiled/frus_floor.tmj",
  embassy: "tiled/embassy.tmj",
  capitol_hill: "tiled/capitol_hill.tmj"
} as const satisfies Record<keyof typeof GAMEPLAY_MAPS, string>;

export const FRUS_VOLUMES = {
  pickup_single: "art-pack/frus_volumes/01_pickup_single_volume.png",
  world_standing: "art-pack/frus_volumes/02_standing_volume_soviet_union.png",
  bg_shelf: "art-pack/frus_volumes/03_bookshelf_full.png",
  pickup_stack: "art-pack/frus_volumes/04_pickup_volume_stack.png",
  interact_open: "art-pack/frus_volumes/05_open_volume_reading.png",
  ui_row_six: "art-pack/frus_volumes/06_inventory_row_six.png",
  reward_legendary: "art-pack/frus_volumes/07_legendary_boss_reward.png",
  item_corrupted: "art-pack/frus_volumes/08_corrupted_volume_danne.png",
  pickup_carter: "art-pack/frus_volumes/09_pickup_1977_1980_carter_era.png",
  pickup_reagan: "art-pack/frus_volumes/10_pickup_1981_1988_reagan_era.png",
  pickup_damaged: "art-pack/frus_volumes/11_pickup_damaged_volume.png",
  pickup_burnt: "art-pack/frus_volumes/12_pickup_burnt_volume.png",
  pickup_microform: "art-pack/frus_volumes/13_pickup_microform_reels.png",
  bg_library_wall: "art-pack/frus_volumes/14_library_wall_full.png",
  world_topdown: "art-pack/frus_volumes/15_world_volume_topdown.png",
  interact_open_maps: "art-pack/frus_volumes/16_open_volume_with_maps.png"
} as const;

export const SCREENS = {
  frus_world_map: "art-pack/screens/frus_world_map.jpg",
  title_screen_16bit_sharp_256x240: "art-pack/screens/title_screen_16bit_sharp_256x240.png",
  title_screen_256x224: "art-pack/screens/title_screen_256x224.png",
  title_screen_frus_chest_256x240: "art-pack/screens/title_screen_frus_chest_256x240.png",
  ending_binding_ceremony_256x240: "art-pack/screens/ending_binding_ceremony_256x240.png"
} as const;

export const ALL_NEW_ART_REGISTRIES = {
  OVERWORLD_REGIONS,
  GAMEPLAY_MAPS,
  FRUS_VOLUMES,
  SCREENS
} as const;

export type OverworldRegionKey = keyof typeof OVERWORLD_REGIONS;
export type GameplayMapKey = keyof typeof GAMEPLAY_MAPS;
export type FrusVolumeKey = keyof typeof FRUS_VOLUMES;
export type ScreenKey = keyof typeof SCREENS;
export type NewArtRegistryName = keyof typeof ALL_NEW_ART_REGISTRIES;
export type NewArtTextureKey = OverworldRegionKey | GameplayMapKey | FrusVolumeKey | ScreenKey;

export function gameplayTiledCacheKey(mapKey: GameplayMapKey) {
  return `tiled-${mapKey}`;
}

export function publicAssetPath(path: string) {
  return `${PUBLIC_ASSET_ROOT}/${path}`;
}
