import type { ProcessRoleId } from "./constants";

export const ART_PACK_BASE = "assets/art-pack";
export const ART_PACK_MANIFEST_PATH = `${ART_PACK_BASE}/manifest.json`;

export const HUMANOID_FRAME = {
  sourceW: 256,
  sourceH: 384,
  nativeW: 32,
  nativeH: 48,
  columns: 4,
  usedFrames: 15
} as const;

export const HUMANOID_SCALE = HUMANOID_FRAME.nativeW / HUMANOID_FRAME.sourceW;

const HUMANOID_FRAME_ORDER = [
  "idle-down",
  "idle-up",
  "idle-left",
  "idle-right",
  "walk-down-0",
  "walk-down-1",
  "walk-up-0",
  "walk-up-1",
  "walk-left-0",
  "walk-left-1",
  "walk-right-0",
  "walk-right-1",
  "interact",
  "read",
  "victory"
] as const;

const DANNE_FRAME_ORDER = [
  ...HUMANOID_FRAME_ORDER.slice(0, 12),
  "menace",
  "attack",
  "defeated"
] as const;

const STATECHAT_TERMINAL_FRAME_ORDER = [
  "idle-0",
  "idle-1",
  "idle-2",
  "idle-3",
  "blink-0",
  "blink-1",
  "blink-2",
  "blink-3",
  "stream-0",
  "stream-1",
  "stream-2",
  "stream-3",
  "off",
  "query",
  "success"
] as const;

export const ART_PACK_SHEETS = {
  sprite_compiler: spriteSheet("sprite_compiler", HUMANOID_FRAME_ORDER),
  sprite_editor: spriteSheet("sprite_editor", HUMANOID_FRAME_ORDER),
  sprite_declassification_coordinator: spriteSheet("sprite_declassification_coordinator", HUMANOID_FRAME_ORDER),
  sprite_reviewer: spriteSheet("sprite_reviewer", HUMANOID_FRAME_ORDER),
  sprite_senior_reviewer: spriteSheet("sprite_senior_reviewer", HUMANOID_FRAME_ORDER),
  sprite_general_editor: spriteSheet("sprite_general_editor", HUMANOID_FRAME_ORDER),
  sprite_archivist: spriteSheet("sprite_archivist", HUMANOID_FRAME_ORDER),
  sprite_records_officer: spriteSheet("sprite_records_officer", HUMANOID_FRAME_ORDER),
  sprite_security_officer: spriteSheet("sprite_security_officer", HUMANOID_FRAME_ORDER),
  sprite_dann_e: spriteSheet("sprite_dann_e", DANNE_FRAME_ORDER),
  sprite_statechat_terminal: spriteSheet("sprite_statechat_terminal", STATECHAT_TERMINAL_FRAME_ORDER)
} as const;

export type ArtPackSheetKey = keyof typeof ART_PACK_SHEETS;
export type ArtPackFrameName = (typeof ART_PACK_SHEETS)[ArtPackSheetKey]["frameOrder"][number];

export const ART_PACK_IMAGES = {
  items_icons_16x16: image("icons/items_icons_16x16.png"),
  ui_hud_16bit: image("ui/ui_hud_16bit.png"),
  world_map_concept: image("maps/world_map_concept.png"),
  dungeon_nara_ii: image("maps/dungeon_nara_ii.png"),
  dungeon_navy_hill_editorial: image("maps/dungeon_navy_hill_editorial.png"),
  dungeon_undisclosed_location: image("maps/dungeon_undisclosed_location.png"),
  dungeon_white_house_review: image("maps/dungeon_white_house_review.png"),
  dann_e_boss_portrait: image("sprites/dann_e_boss_portrait.png"),
  bg_archive_shelves: image("backgrounds/bg_archive_shelves.png"),
  bg_reading_room: image("backgrounds/bg_reading_room.png"),
  bg_secure_facility: image("backgrounds/bg_secure_facility.png"),
  bg_federal_exterior: image("backgrounds/bg_federal_exterior.png"),
  bg_ruby_buckram_pattern: image("backgrounds/bg_ruby_buckram_pattern.png"),
  title_screen: image("screens/title_screen.png"),
  title_screen_256x224: image("screens/title_screen_256x224.png"),
  intro_screen: image("screens/intro_screen.png"),
  intro_screen_256x224: image("screens/intro_screen_256x224.png")
} as const;

export type ArtPackImageKey = keyof typeof ART_PACK_IMAGES;

export const ART_PACK_TILESETS = {
  overworld: tileset("tileset_overworld_16x16", "pack-tiles-overworld", "tilesets/gameplay/tileset_overworld_16x16.png", 8, 8, 1024, 1024, "overworld"),
  interiors: tileset("tileset_interiors_16x16", "pack-tiles-interiors", "tilesets/gameplay/tileset_interiors_16x16.png", 8, 8, 1024, 1024, "interiors"),
  archiveDungeon: tileset("tileset_archive_dungeon_16x16", "pack-tiles-archive-dungeon", "tilesets/gameplay/tileset_archive_dungeon_16x16.png", 7, 7, 896, 896, "archive-dungeon")
} as const;

export type ArtPackTilesetTheme = keyof typeof ART_PACK_TILESETS;

export const ART_PACK_EXTRAS = {
  portraits_cast: {
    textureKey: "pack-portraits_cast",
    path: `${ART_PACK_BASE}/portraits/portraits_cast.png`,
    columns: 3,
    rows: 2,
    cellWidth: 512,
    cellHeight: 512,
    portraitOrder: [
      "senior_editor",
      "compiler",
      "declassification_reviewer",
      "archivist",
      "security_officer",
      "records_officer"
    ] as const
  },
  items_collectibles: {
    textureKey: "pack-items_collectibles",
    path: `${ART_PACK_BASE}/icons/items_collectibles.png`,
    columns: 6,
    rows: 4,
    cellWidth: 170,
    cellHeight: 256
  },
  effects_stamps: {
    textureKey: "pack-effects_stamps",
    path: `${ART_PACK_BASE}/effects/effects_stamps.png`,
    columns: 5,
    rows: 4,
    cellWidth: 204,
    cellHeight: 256
  },
  stamps_text: {
    textureKey: "pack-stamps_text",
    path: `${ART_PACK_BASE}/effects/stamps_text.png`,
    columns: 2,
    rows: 2,
    cellWidth: 768,
    cellHeight: 512,
    stampOrder: ["CONFIDENTIAL", "TOP SECRET", "DECLASSIFIED", "APPROVED"] as const
  },
  ui_kit: {
    textureKey: "pack-ui_kit",
    path: `${ART_PACK_BASE}/ui/ui_kit.png`,
    imageWidth: 1536,
    imageHeight: 1024
  }
} as const;

export const ROLE_PACK_SHEETS: Record<ProcessRoleId, ArtPackSheetKey> = {
  compiler: "sprite_compiler",
  editor: "sprite_editor",
  declass_reviewer: "sprite_declassification_coordinator",
  proofreader: "sprite_archivist",
  source_note_specialist: "sprite_records_officer"
};

export const NPC_PACK_SHEET_BY_ROLE: Record<string, ArtPackSheetKey> = {
  "compiler": "sprite_compiler",
  "editor": "sprite_editor",
  "declass coordinator": "sprite_declassification_coordinator",
  "declassification coordinator": "sprite_declassification_coordinator",
  "declass reviewer": "sprite_declassification_coordinator",
  "reviewer": "sprite_reviewer",
  "senior reviewer": "sprite_senior_reviewer",
  "general editor": "sprite_general_editor",
  "archivist": "sprite_archivist",
  "records officer": "sprite_records_officer",
  "review specialist": "sprite_records_officer",
  "security officer": "sprite_security_officer",
  "statechat terminal": "sprite_statechat_terminal"
};

export const PORTRAIT_ROLE_ALIASES: Record<string, string> = {
  "senior editor": "senior_editor",
  "general editor": "senior_editor",
  "senior reviewer": "senior_editor",
  "compiler": "compiler",
  "declass coordinator": "declassification_reviewer",
  "declass reviewer": "declassification_reviewer",
  "declassification coordinator": "declassification_reviewer",
  "declassification reviewer": "declassification_reviewer",
  "archivist": "archivist",
  "security officer": "security_officer",
  "records officer": "records_officer",
  "source note specialist": "records_officer"
};

export const ITEM_ICON_FRAMES: Record<string, number> = {
  manuscript: 0,
  telegram: 0,
  "source-note": 1,
  source_note: 1,
  source_note_card: 1,
  cross_reference_thread: 2,
  "cross-reference": 2,
  review_folder: 3,
  frus_volume: 4,
  "frus-volume": 4,
  volume_fragment: 5,
  "volume-fragment": 5,
  ruby: 5,
  buckram_key: 6,
  "buckram-key": 6,
  clearance_token: 7,
  "clearance-token": 7,
  proof_lens: 8,
  "proof-lens": 8,
  red_pencil: 9,
  "red-pencil": 9,
  citation_stamp: 11,
  "citation-stamp": 11,
  declassification_stamp: 11,
  concurrence_slip: 14,
  "concurrence-slip": 14,
  referral_manifest: 15,
  "referral-manifest": 15,
  agency_equity_seal: 16,
  "agency-equity-seal": 16,
  excision_bracket_marker: 17,
  "excision-bracket-marker": 17,
  document_cart: 20,
  "document-cart": 20,
  assignment_memo: 0,
  finding_aid: 2,
  document_set: 0,
  review_memo: 3,
  bound_volume: 4
};

export const STAMP_NAME_FRAMES = {
  CONFIDENTIAL: 0,
  "TOP SECRET": 1,
  DECLASSIFIED: 2,
  APPROVED: 3
} as const;

export const EFFECT_FRAMES = {
  sparkle: 0,
  impact: 1,
  dust: 2,
  smoke: 3,
  splash: 4,
  exclamation: 5,
  question: 6,
  anger: 7,
  heal: 8,
  sleep: 9,
  aura: 10,
  explosion: 11,
  speedLines: 12,
  sparkleDots: 13,
  downArrow: 14,
  stampRed: 15,
  stampGreen: 16,
  stampBlue: 17,
  seal: 18,
  check: 19
} as const;

export const UI_KIT_RECTS = {
  corner_flourish_top_left: rect(42, 55, 158, 137),
  dialogue_box_frame: rect(256, 55, 1026, 289),
  corner_flourish_top_right: rect(1336, 56, 157, 136),
  menu_box_frame: rect(256, 367, 369, 129),
  cursor_arrow_right: rect(679, 384, 89, 88),
  hp_ruby_gem: rect(279, 514, 154, 150),
  progress_meter_empty: rect(520, 520, 686, 65),
  progress_meter_red_filled: rect(519, 597, 687, 61),
  button_a: rect(423, 688, 105, 72),
  button_b: rect(535, 688, 104, 73),
  button_start: rect(648, 690, 200, 63),
  corner_flourish_bottom_left: rect(42, 751, 158, 138),
  corner_flourish_bottom_right: rect(1329, 751, 165, 137),
  scroll_banner: rect(315, 784, 459, 114),
  heart: rect(816, 794, 104, 96),
  star: rect(936, 791, 110, 99),
  coin: rect(1062, 794, 102, 102),
  continue_arrow_down: rect(684, 424, 64, 48)
} as const;

export const UI_NINE_SLICE_MARGINS = {
  dialogue_box_frame: { sourceLeft: 68, sourceRight: 68, sourceTop: 58, sourceBottom: 58, target: 9 },
  menu_box_frame: { sourceLeft: 42, sourceRight: 42, sourceTop: 36, sourceBottom: 36, target: 8 }
} as const;

export const OVERWORLD_TILE_INDEX = {
  grass: tileIndex(8, 0, 0),
  dirtEdge: tileIndex(8, 0, 1),
  dirtPath: tileIndex(8, 0, 2),
  gravel: tileIndex(8, 0, 3),
  sand: tileIndex(8, 0, 4),
  cobblestone: tileIndex(8, 1, 0),
  stoneBrick: tileIndex(8, 1, 1),
  crackedStone: tileIndex(8, 1, 2),
  brick: tileIndex(8, 1, 3),
  sidewalk: tileIndex(8, 1, 4),
  marbleStep: tileIndex(8, 1, 5),
  woodPlank: tileIndex(8, 1, 6),
  water: tileIndex(8, 2, 0),
  shore: tileIndex(8, 2, 1),
  riverBend: tileIndex(8, 2, 4),
  shallow: tileIndex(8, 2, 6),
  dock: tileIndex(8, 2, 7),
  hedge: tileIndex(8, 3, 0),
  flowers: tileIndex(8, 3, 1),
  tree: tileIndex(8, 3, 2),
  fenceH: tileIndex(8, 3, 3),
  fenceV: tileIndex(8, 3, 4),
  lampPost: tileIndex(8, 3, 5),
  signpost: tileIndex(8, 3, 6),
  grassFill: tileIndex(8, 4, 0),
  dirtFill: tileIndex(8, 4, 1),
  grassAlt: tileIndex(8, 5, 0)
} as const;

export const INTERIOR_TILE_INDEX = {
  woodFloor: tileIndex(8, 0, 0),
  marbleFloor: tileIndex(8, 0, 1),
  carpet: tileIndex(8, 0, 2),
  darkWoodFloor: tileIndex(8, 0, 3),
  checkeredFloor: tileIndex(8, 0, 4),
  concreteFloor: tileIndex(8, 0, 5),
  parquetFloor: tileIndex(8, 0, 6),
  wallPanel: tileIndex(8, 1, 0),
  plasterWall: tileIndex(8, 1, 1),
  metalWall: tileIndex(8, 1, 2),
  wainscotWall: tileIndex(8, 1, 3),
  brickWall: tileIndex(8, 1, 4),
  blueWall: tileIndex(8, 1, 5),
  window: tileIndex(8, 1, 6),
  desk: tileIndex(8, 2, 0),
  chair: tileIndex(8, 2, 1),
  filingCabinet: tileIndex(8, 2, 2),
  bookshelf: tileIndex(8, 2, 3),
  documentBox: tileIndex(8, 2, 4),
  bankerLamp: tileIndex(8, 2, 5),
  terminal: tileIndex(8, 2, 6),
  safe: tileIndex(8, 3, 0),
  doorClosed: tileIndex(8, 3, 1),
  doorOpen: tileIndex(8, 3, 2),
  worldMap: tileIndex(8, 3, 3),
  bulletinBoard: tileIndex(8, 3, 4),
  lectern: tileIndex(8, 3, 5),
  elevator: tileIndex(8, 3, 6),
  floorFill: tileIndex(8, 4, 0),
  floorFillAlt: tileIndex(8, 5, 0)
} as const;

export const ARCHIVE_DUNGEON_TILE_INDEX = {
  floor: tileIndex(7, 0, 0),
  floorAlt: tileIndex(7, 0, 1),
  floorRuby: tileIndex(7, 0, 2),
  wall: tileIndex(7, 1, 0),
  doorway: tileIndex(7, 1, 1),
  arch: tileIndex(7, 1, 2),
  brick: tileIndex(7, 1, 3),
  goldPanel: tileIndex(7, 1, 4),
  pit: tileIndex(7, 2, 0),
  rubble: tileIndex(7, 2, 1),
  column: tileIndex(7, 2, 2),
  carvedFace: tileIndex(7, 2, 3),
  bookshelf: tileIndex(7, 2, 4),
  grate: tileIndex(7, 2, 5),
  torch: tileIndex(7, 3, 0),
  brazier: tileIndex(7, 3, 1),
  ironDoor: tileIndex(7, 3, 2),
  rubyPedestal: tileIndex(7, 3, 3),
  buttonPanel: tileIndex(7, 3, 4),
  chest: tileIndex(7, 3, 5),
  stoneFill: tileIndex(7, 4, 0),
  stoneFillAlt: tileIndex(7, 5, 0)
} as const;

export function frameIndex(sheetKey: ArtPackSheetKey, frameName: string) {
  return ART_PACK_SHEETS[sheetKey].frameOrder.indexOf(frameName as never);
}

export function rolePackSheetKey(roleId: ProcessRoleId) {
  return ROLE_PACK_SHEETS[roleId] ?? null;
}

export function npcPackSheetKey(roleOrName?: string | null, spriteKey?: string | null): ArtPackSheetKey | null {
  const normalized = (roleOrName ?? "").toLowerCase();
  if (NPC_PACK_SHEET_BY_ROLE[normalized]) return NPC_PACK_SHEET_BY_ROLE[normalized];
  const sprite = (spriteKey ?? "").toLowerCase();
  if (sprite.includes("compiler")) return "sprite_compiler";
  if (sprite.includes("declass")) return "sprite_declassification_coordinator";
  if (sprite.includes("general")) return "sprite_general_editor";
  if (sprite.includes("editor")) return "sprite_editor";
  if (sprite.includes("review-specialist") || sprite.includes("records")) return "sprite_records_officer";
  if (sprite.includes("reviewer")) return "sprite_reviewer";
  if (sprite.includes("archive") || sprite.includes("archivist")) return "sprite_archivist";
  if (sprite.includes("security")) return "sprite_security_officer";
  if (sprite.includes("terminal") || sprite.includes("statechat")) return "sprite_statechat_terminal";
  return null;
}

export function portraitIndex(roleOrSpeaker: string) {
  const normalized = roleOrSpeaker.toLowerCase().replace(/[_-]/g, " ").replace(/:/g, "").trim();
  const portraitKey = PORTRAIT_ROLE_ALIASES[normalized] ?? PORTRAIT_ROLE_ALIASES[normalized.replace(/^the /, "")];
  if (!portraitKey) return -1;
  return ART_PACK_EXTRAS.portraits_cast.portraitOrder.indexOf(portraitKey as never);
}

export function stampIndex(stampName: keyof typeof STAMP_NAME_FRAMES | string) {
  return STAMP_NAME_FRAMES[stampName.toUpperCase() as keyof typeof STAMP_NAME_FRAMES] ?? -1;
}

export function itemIconFrame(itemId?: string | null) {
  if (!itemId) return -1;
  return ITEM_ICON_FRAMES[itemId] ?? ITEM_ICON_FRAMES[itemId.replace(/-/g, "_")] ?? -1;
}

export function basePackTileIndex(glyph: string, theme: ArtPackTilesetTheme, row = 0, column = 0) {
  if (theme === "interiors") {
    if (glyph === "r") return INTERIOR_TILE_INDEX.wallPanel;
    if (glyph === "d") return INTERIOR_TILE_INDEX.doorOpen;
    if (glyph === "l" || glyph === "s" || glyph === "z") return INTERIOR_TILE_INDEX.metalWall;
    return (row + column) % 5 === 0 ? INTERIOR_TILE_INDEX.floorFillAlt : INTERIOR_TILE_INDEX.floorFill;
  }
  if (theme === "archiveDungeon") {
    if (glyph === "r") return ARCHIVE_DUNGEON_TILE_INDEX.wall;
    if (glyph === "d") return ARCHIVE_DUNGEON_TILE_INDEX.doorway;
    if (glyph === "l" || glyph === "s" || glyph === "z") return ARCHIVE_DUNGEON_TILE_INDEX.ironDoor;
    return (row + column) % 4 === 0 ? ARCHIVE_DUNGEON_TILE_INDEX.floorAlt : ARCHIVE_DUNGEON_TILE_INDEX.stoneFill;
  }
  if (glyph === "p") return OVERWORLD_TILE_INDEX.dirtPath;
  if (glyph === "b") return OVERWORLD_TILE_INDEX.dock;
  if (glyph === "w") return OVERWORLD_TILE_INDEX.water;
  if (glyph === "," || glyph === "g") return (row + column) % 5 === 0 ? OVERWORLD_TILE_INDEX.grassAlt : OVERWORLD_TILE_INDEX.grassFill;
  return OVERWORLD_TILE_INDEX.grassFill;
}

export function decorationPackTileIndex(glyph: string, theme: ArtPackTilesetTheme) {
  if (theme === "interiors") {
    const map: Record<string, number> = {
      r: INTERIOR_TILE_INDEX.wallPanel,
      a: INTERIOR_TILE_INDEX.bookshelf,
      m: INTERIOR_TILE_INDEX.desk,
      q: INTERIOR_TILE_INDEX.documentBox,
      i: INTERIOR_TILE_INDEX.filingCabinet,
      u: INTERIOR_TILE_INDEX.desk,
      c: INTERIOR_TILE_INDEX.documentBox,
      d: INTERIOR_TILE_INDEX.doorOpen,
      l: INTERIOR_TILE_INDEX.doorClosed,
      x: INTERIOR_TILE_INDEX.terminal,
      n: INTERIOR_TILE_INDEX.documentBox,
      z: INTERIOR_TILE_INDEX.metalWall,
      s: INTERIOR_TILE_INDEX.safe
    };
    return map[glyph] ?? -1;
  }
  if (theme === "archiveDungeon") {
    const map: Record<string, number> = {
      r: ARCHIVE_DUNGEON_TILE_INDEX.wall,
      a: ARCHIVE_DUNGEON_TILE_INDEX.bookshelf,
      m: ARCHIVE_DUNGEON_TILE_INDEX.rubyPedestal,
      q: ARCHIVE_DUNGEON_TILE_INDEX.chest,
      i: ARCHIVE_DUNGEON_TILE_INDEX.column,
      u: ARCHIVE_DUNGEON_TILE_INDEX.rubyPedestal,
      c: ARCHIVE_DUNGEON_TILE_INDEX.rubble,
      d: ARCHIVE_DUNGEON_TILE_INDEX.doorway,
      l: ARCHIVE_DUNGEON_TILE_INDEX.ironDoor,
      x: ARCHIVE_DUNGEON_TILE_INDEX.buttonPanel,
      n: ARCHIVE_DUNGEON_TILE_INDEX.chest,
      z: ARCHIVE_DUNGEON_TILE_INDEX.grate,
      s: ARCHIVE_DUNGEON_TILE_INDEX.ironDoor
    };
    return map[glyph] ?? -1;
  }
  const map: Record<string, number> = {
    ",": OVERWORLD_TILE_INDEX.flowers,
    t: OVERWORLD_TILE_INDEX.tree,
    f: OVERWORLD_TILE_INDEX.fenceH,
    r: OVERWORLD_TILE_INDEX.brick,
    d: OVERWORLD_TILE_INDEX.marbleStep,
    l: OVERWORLD_TILE_INDEX.signpost,
    s: OVERWORLD_TILE_INDEX.fenceV,
    a: OVERWORLD_TILE_INDEX.stoneBrick,
    m: OVERWORLD_TILE_INDEX.marbleStep,
    q: OVERWORLD_TILE_INDEX.woodPlank,
    i: OVERWORLD_TILE_INDEX.stoneBrick,
    u: OVERWORLD_TILE_INDEX.marbleStep,
    c: OVERWORLD_TILE_INDEX.woodPlank,
    x: OVERWORLD_TILE_INDEX.signpost,
    n: OVERWORLD_TILE_INDEX.signpost,
    z: OVERWORLD_TILE_INDEX.crackedStone
  };
  return map[glyph] ?? -1;
}

function spriteSheet<K extends string, T extends readonly string[]>(key: K, frameOrder: T) {
  return {
    textureKey: `pack-${key}` as const,
    path: `${ART_PACK_BASE}/sprites/${key}.png`,
    frameOrder
  };
}

function image(relativePath: string) {
  return {
    textureKey: `pack-${relativePath.split("/").pop()!.replace(/\.png$/, "")}`,
    path: `${ART_PACK_BASE}/${relativePath}`
  } as const;
}

function tileset(key: string, textureKey: string, relativePath: string, columns: number, rows: number, imageWidth: number, imageHeight: number, theme: string) {
  return {
    key,
    textureKey,
    name: `pack-${key}`,
    path: `${ART_PACK_BASE}/${relativePath}`,
    columns,
    rows,
    imageWidth,
    imageHeight,
    displayCellPx: imageWidth / columns,
    nativeTileSize: 16,
    theme
  };
}

function tileIndex(columns: number, row: number, column: number) {
  return row * columns + column;
}

function rect(x: number, y: number, width: number, height: number) {
  return { x, y, width, height };
}
