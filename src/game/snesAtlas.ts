import { AREA_REGISTRY, FRUS_ROOM_GRAPH, ITEM_REGISTRY, PROCESS_ROLES } from "./constants";

export const SNES_ART_DIRECTION = {
  label: "16-bit Ruby Rule atlas and area-map pass",
  source: "original repository-local SVG and Phaser rectangle art",
  constraints: [
    "256x240 logical canvas preserved",
    "no copyrighted sprites, maps, music, names, or room layouts",
    "StateChat remains terminal-only",
    "FRUS production workflow remains the win condition"
  ],
  visualGoals: [
    "larger role portraits with readable FRUS props",
    "larger 32x32 playable role sprites with grounded foot-point movement",
    "larger human specialist sprites with readable production tools",
    "richer room depth through raised floors, shadows, and buckram texture",
    "large regional main game map connecting Navy Hill, NARA, Foggy Bottom, Capitol Hill, White House, and final hidden gates without compressing every district into one tiny panel",
    "compact world atlas connecting Office Hub, Archive Cavern, networks, referrals, proofing, and Buckram Gate",
    "area-specific map panels for the FRUS production dungeons",
    "workflow tools shown as collectible relics rather than weapons"
  ]
} as const;

export const SNES_MAIN_MAP_ASSET = {
  key: "frus-snes-atlas",
  path: "assets/maps/frus-snes-atlas.svg",
  kind: "main-game-map",
  displayName: "Main Game Map",
  layout: "large regional atlas shown through 1x viewport panels",
  dimensions: { width: 240, height: 168 },
  landmarks: [
    { number: 1, name: "Navy Hill", cue: "source-note scattering patrol zone" },
    { number: 2, name: "NARA I", cue: "open research archive" },
    { number: 3, name: "NARA II", cue: "expanded archive stacks" },
    { number: 4, name: "Little Rock", cue: "regional source cluster" },
    { number: 5, name: "Springfield", cue: "regional source cluster" },
    { number: 6, name: "Newington", cue: "workflow bridge district" },
    { number: 7, name: "Undisclosed Location", cue: "locked final gate approach" },
    { number: 8, name: "White House", cue: "central policy record route" },
    { number: 9, name: "Foggy Bottom", cue: "Office of the Historian hub" },
    { number: 10, name: "Capitol Hill", cue: "oversight landmark" },
    { number: 11, name: "Potomac River", cue: "south map boundary" },
    { number: 12, name: "Cherry Blossom Garden", cue: "quiet save garden behind the office" },
    { number: 13, name: "Senate Hearing Chamber", cue: "story room for witness-table review" },
    { number: 14, name: "NARA Stacks", cue: "drone-patrolled stack routes" },
    { number: 15, name: "Embassy Cable Room", cue: "classified cable and guard checkpoint" },
    { number: 16, name: "Black Vault Lair", cue: "restricted DANN-E boss route" }
  ]
} as const;

export const SNES_AREA_MAP_ASSETS = [
  {
    areaId: "office_hub",
    key: "office-hub-map",
    path: "assets/maps/office-hub-map.svg",
    kind: "area-map",
    dimensions: { width: 80, height: 56 }
  },
  {
    areaId: "archive_cavern",
    key: "archive-cavern-map",
    path: "assets/maps/archive-cavern-map.svg",
    kind: "area-map",
    dimensions: { width: 80, height: 56 }
  },
  {
    areaId: "two_networks",
    key: "two-networks-map",
    path: "assets/maps/two-networks-map.svg",
    kind: "area-map",
    dimensions: { width: 80, height: 56 }
  },
  {
    areaId: "referral_vault",
    key: "referral-vault-map",
    path: "assets/maps/referral-vault-map.svg",
    kind: "area-map",
    dimensions: { width: 80, height: 56 }
  },
  {
    areaId: "editors_labyrinth",
    key: "editor-labyrinth-map",
    path: "assets/maps/editor-labyrinth-map.svg",
    kind: "area-map",
    dimensions: { width: 80, height: 56 }
  },
  {
    areaId: "silent_read_tower",
    key: "silent-read-tower-map",
    path: "assets/maps/silent-read-tower-map.svg",
    kind: "area-map",
    dimensions: { width: 80, height: 56 }
  },
  {
    areaId: "buckram_gate",
    key: "buckram-gate-map",
    path: "assets/maps/buckram-gate-map.svg",
    kind: "area-map",
    dimensions: { width: 80, height: 56 }
  }
] as const;

export const SNES_NPC_ASSETS = [
  {
    characterId: "sam",
    key: "snes-npc-sam",
    path: "assets/sprites/snes-npc-sam.svg",
    kind: "npc-sprite",
    displayName: "Sam",
    roleCue: "proofreader with two proof pages",
    dimensions: { width: 32, height: 32 }
  },
  {
    characterId: "elena",
    key: "snes-npc-elena",
    path: "assets/sprites/snes-npc-elena.svg",
    kind: "npc-sprite",
    displayName: "Elena",
    roleCue: "compiler with folder and glasses glint",
    dimensions: { width: 32, height: 32 }
  },
  {
    characterId: "marcus",
    key: "snes-npc-marcus",
    path: "assets/sprites/snes-npc-marcus.svg",
    kind: "npc-sprite",
    displayName: "Marcus",
    roleCue: "declass coordinator with clipboard and ClassNet red",
    dimensions: { width: 32, height: 32 }
  },
  {
    characterId: "priya",
    key: "snes-npc-priya",
    path: "assets/sprites/snes-npc-priya.svg",
    kind: "npc-sprite",
    displayName: "Priya",
    roleCue: "editor with red pencil cue",
    dimensions: { width: 32, height: 32 }
  },
  {
    characterId: "archive-colleague",
    key: "snes-npc-archive-colleague",
    path: "assets/sprites/snes-npc-archive-colleague.svg",
    kind: "npc-sprite",
    displayName: "Archive Colleague",
    roleCue: "equal-rank archive guide with folder and citation stamp",
    dimensions: { width: 32, height: 32 }
  }
] as const;

export function getSnesNpcTextureKey(characterId: string) {
  return SNES_NPC_ASSETS.find((asset) => asset.characterId === characterId)?.key ?? characterId;
}

export const SNES_PRODUCTION_COLLEAGUE_ASSETS = [
  {
    id: "compiler",
    key: "snes-colleague-compiler",
    path: "assets/sprites/snes-colleague-compiler.svg",
    kind: "production-colleague-sprite",
    displayName: "Compiler",
    shortLabel: "COMP",
    roleCue: "cardigan, folder, and reading-glasses glint",
    dimensions: { width: 32, height: 32 }
  },
  {
    id: "declass_coordinator",
    key: "snes-colleague-declass-coordinator",
    path: "assets/sprites/snes-colleague-declass-coordinator.svg",
    kind: "production-colleague-sprite",
    displayName: "Declass Coordinator",
    shortLabel: "DECL",
    roleCue: "archive cart, tracker clipboard, and network-routing colors",
    dimensions: { width: 32, height: 32 }
  },
  {
    id: "reviewer",
    key: "snes-colleague-reviewer",
    path: "assets/sprites/snes-colleague-reviewer.svg",
    kind: "production-colleague-sprite",
    displayName: "Reviewer",
    shortLabel: "REV",
    roleCue: "badge, briefcase, and human review stance",
    dimensions: { width: 32, height: 32 }
  },
  {
    id: "editor",
    key: "snes-colleague-editor",
    path: "assets/sprites/snes-colleague-editor.svg",
    kind: "production-colleague-sprite",
    displayName: "Editor",
    shortLabel: "EDIT",
    roleCue: "desk, proof stack, mug, and red-pencil work",
    dimensions: { width: 32, height: 32 }
  },
  {
    id: "review_specialist",
    key: "snes-colleague-review-specialist",
    path: "assets/sprites/snes-colleague-review-specialist.svg",
    kind: "production-colleague-sprite",
    displayName: "Review Specialist",
    shortLabel: "SPEC",
    roleCue: "process stamp, equal-rank coat, and review packet",
    dimensions: { width: 32, height: 32 }
  }
] as const;

export type SnesProductionColleagueId = (typeof SNES_PRODUCTION_COLLEAGUE_ASSETS)[number]["id"];

export const SNES_PRODUCTION_COLLEAGUE_FRAME_NAMES = [
  "front",
  "back",
  "side",
  "walk",
  "work",
  "approve"
] as const;

export type SnesProductionColleagueFrameName = (typeof SNES_PRODUCTION_COLLEAGUE_FRAME_NAMES)[number];

export const SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET = {
  key: "snes-production-colleague-frames",
  path: "assets/sprites/snes-production-colleague-frames.svg",
  kind: "production-colleague-animation-sheet",
  displayName: "Production colleague multi-pose sheet",
  frameCue: "front, back, side, walking, workstation, and approval poses for equal-rank production roles",
  dimensions: { width: 192, height: 160 },
  frame: { width: 32, height: 32 },
  frames: SNES_PRODUCTION_COLLEAGUE_FRAME_NAMES,
  roles: ["compiler", "editor", "declass_coordinator", "reviewer", "review_specialist"]
} as const;

export const SNES_COMPILER_FRAME_NAMES = [
  "idle-0",
  "idle-1",
  "walk-down-0",
  "walk-down-1",
  "walk-down-2",
  "walk-down-3",
  "walk-up-0",
  "walk-up-1",
  "walk-up-2",
  "walk-up-3",
  "walk-left-0",
  "walk-left-1",
  "walk-left-2",
  "walk-left-3",
  "walk-right-0",
  "walk-right-1",
  "walk-right-2",
  "walk-right-3",
  "read"
] as const;

export type SnesCompilerFrameName = (typeof SNES_COMPILER_FRAME_NAMES)[number];

export const SNES_COMPILER_FRAME_SHEET = {
  roleId: "compiler",
  key: "snes-player-compiler-frames",
  path: "assets/sprites/snes-player-compiler-frames.svg",
  kind: "role-animation-strip",
  displayName: "Compiler animation frame set",
  frameCue: "compact in-play compiler with gray suit, blue tie, brown briefcase, four-direction walk cycle, and document reading pose",
  dimensions: { width: 608, height: 48 },
  frame: { width: 32, height: 48 },
  frames: SNES_COMPILER_FRAME_NAMES
} as const;

export const SNES_EDITOR_FRAME_SHEET = {
  roleId: "editor",
  key: "snes-player-editor-frames",
  path: "assets/sprites/snes-player-editor-frames.svg",
  kind: "role-animation-strip",
  displayName: "Editor animation frame set",
  frameCue: "compact in-play editor with glasses, red pencil, proof pages, four-direction walk cycle, and document marking pose",
  dimensions: { width: 608, height: 48 },
  frame: { width: 32, height: 48 },
  frames: SNES_COMPILER_FRAME_NAMES
} as const;

export const SNES_PROOFREADER_FRAME_SHEET = {
  roleId: "proofreader",
  key: "snes-player-proofreader-frames",
  path: "assets/sprites/snes-player-proofreader-frames.svg",
  kind: "role-animation-strip",
  displayName: "Proofreader animation frame set",
  frameCue: "compact in-play proofreader with proof stack, glasses glint, four-direction walk cycle, and silent-read pose",
  dimensions: { width: 608, height: 48 },
  frame: { width: 32, height: 48 },
  frames: SNES_COMPILER_FRAME_NAMES
} as const;

export const SNES_DECLASS_REVIEWER_FRAME_SHEET = {
  roleId: "declass_reviewer",
  key: "snes-player-declass-reviewer-frames",
  path: "assets/sprites/snes-player-declass-reviewer-frames.svg",
  kind: "role-animation-strip",
  displayName: "Declass coordinator animation frame set",
  frameCue: "compact in-play declass coordinator with mug, tracker clipboard, network-color cues, and equity-map pose",
  dimensions: { width: 608, height: 48 },
  frame: { width: 32, height: 48 },
  frames: SNES_COMPILER_FRAME_NAMES
} as const;

export const SNES_SOURCE_NOTE_SPECIALIST_FRAME_SHEET = {
  roleId: "source_note_specialist",
  key: "snes-player-source-note-specialist-frames",
  path: "assets/sprites/snes-player-source-note-specialist-frames.svg",
  kind: "role-animation-strip",
  displayName: "Source-note specialist animation frame set",
  frameCue: "compact in-play source-note specialist with citation stamp satchel, source card, four-direction walk cycle, and provenance-check pose",
  dimensions: { width: 608, height: 48 },
  frame: { width: 32, height: 48 },
  frames: SNES_COMPILER_FRAME_NAMES
} as const;

export const SNES_FIRST_HOUR_TRAINING_RELIC_ASSET = {
  key: "snes-first-hour-training-relic",
  path: "assets/sprites/snes-first-hour-training-relic.svg",
  kind: "training-route-relic",
  displayName: "One-Hour Route Relic",
  cue: "ruby-and-gold route card showing the live one-hour action-adventure training ladder",
  dimensions: { width: 24, height: 24 }
} as const;

export const SNES_ARCHIVE_COMPASS_RELIC_ASSET = {
  key: "snes-archive-compass-relic",
  path: "assets/sprites/snes-archive-compass-relic.svg",
  kind: "archive-map-relic",
  displayName: "Archive Compass Relic",
  cue: "gold-and-cyan room compass showing contested-equity map literacy inside Archive Cavern",
  dimensions: { width: 24, height: 24 }
} as const;

export const SNES_ARCHIVE_WALL_MAP_BOARD_ASSET = {
  key: "snes-archive-wall-map-board",
  path: "assets/sprites/snes-archive-wall-map-board.svg",
  kind: "archive-wall-map-board",
  displayName: "Archive Wall Map Board",
  cue: "48x30 ruby-and-cream wall map board for in-room dungeon route hints",
  dimensions: { width: 48, height: 30 }
} as const;

export const SNES_ARCHIVE_PROP_ASSET = {
  key: "snes-archive-props",
  path: "assets/sprites/snes-archive-props.svg",
  kind: "archive-prop-strip",
  displayName: "Archive Prop Strip",
  cue: "five 64x48 Archive Cavern props for shelves, desks, document stacks, ruby volume piles, and research tables",
  dimensions: { width: 320, height: 48 },
  frame: { width: 64, height: 48 },
  frames: ["bookcase", "desk", "document_stack", "ruby_volumes", "research_table"]
} as const;

export const SNES_ARCHIVE_TILE_ASSET = {
  key: "snes-archive-tiles",
  path: "assets/sprites/snes-archive-tiles.svg",
  kind: "archive-tile-strip",
  displayName: "Archive Tile Strip",
  cue: "eight 16x16 Archive Cavern floor and wall tiles for reusable SNES room construction",
  dimensions: { width: 128, height: 16 },
  frame: { width: 16, height: 16 },
  frames: ["floor_base", "floor_crack", "floor_dot", "floor_ruby", "wall_top", "wall_front", "wall_side", "floor_shadow"]
} as const;

export const SNES_OFFICE_TILE_ASSET = {
  key: "snes-office-tiles",
  path: "assets/sprites/snes-office-tiles.svg",
  kind: "office-tile-strip",
  displayName: "Office Tile Strip",
  cue: "eight 16x16 Office Hub floor, rug, bookcase, and desk tiles for reusable FRUS interior construction",
  dimensions: { width: 128, height: 16 },
  frame: { width: 16, height: 16 },
  frames: ["floor_base", "floor_shadow", "floor_scuff", "rug_center", "rug_edge", "wall_top", "wall_bookcase", "desk_top"]
} as const;

export const SNES_OFFICE_ROOM_BACKGROUND_ASSET = {
  key: "snes-office-compiler-room",
  path: "assets/art-pack/rooms/office_compiler_room_208x192.png",
  kind: "office-room-background",
  displayName: "FRUS Compiler Office",
  cue: "single-screen compiler office with clear workstations and an open central route",
  dimensions: { width: 208, height: 192 }
} as const;

export const SNES_GUIDE_CAVERN_TILE_ASSET = {
  key: "snes-guide-cavern-tiles",
  path: "assets/sprites/snes-guide-cavern-tiles.svg",
  kind: "guide-cavern-tile-strip",
  displayName: "Guide Cavern Tile Strip",
  cue: "eight 16x16 Archive Guide cavern floor, wall, threshold, and pedestal tiles for the first dungeon threshold",
  dimensions: { width: 128, height: 16 },
  frame: { width: 16, height: 16 },
  frames: ["floor_base", "floor_scuff", "floor_ruby", "wall_top", "wall_front", "wall_shadow", "threshold_gate", "pedestal_tile"]
} as const;

export const SNES_NETWORK_TILE_ASSET = {
  key: "snes-network-tiles",
  path: "assets/sprites/snes-network-tiles.svg",
  kind: "network-tile-strip",
  displayName: "Two Networks Tile Strip",
  cue: "eight 16x16 OpenNet/ClassNet floors, terminals, firewall, vault wall, and token plinth tiles",
  dimensions: { width: 128, height: 16 },
  frame: { width: 16, height: 16 },
  frames: ["open_floor", "class_floor", "cable_cross", "terminal_pad", "class_terminal", "firewall_gate", "vault_wall", "token_plinth"]
} as const;

export const SNES_REFERRAL_VAULT_TILE_ASSET = {
  key: "snes-referral-vault-tiles",
  path: "assets/sprites/snes-referral-vault-tiles.svg",
  kind: "referral-vault-tile-strip",
  displayName: "Referral Vault Tile Strip",
  cue: "eight 16x16 equity, manifest, excision, concurrence, and slip-plinth tiles for the referral dungeon",
  dimensions: { width: 128, height: 16 },
  frame: { width: 16, height: 16 },
  frames: [
    "equity_floor",
    "referral_channel",
    "agency_seal_tile",
    "manifest_desk",
    "excision_gate",
    "concurrence_wall",
    "slip_plinth",
    "archive_floor"
  ]
} as const;

export const SNES_ARCHIVE_ROOM_DETAIL_ASSET = {
  key: "snes-archive-room-details",
  path: "assets/sprites/snes-archive-room-details.svg",
  kind: "archive-room-detail-strip",
  displayName: "Archive Room Detail Strip",
  cue: "six 16x16 Archive Cavern detail frames for floor scuffs, corners, wall caps, and route thresholds",
  dimensions: { width: 96, height: 16 },
  frame: { width: 16, height: 16 },
  frames: ["floor_scuff", "corner_shadow", "wall_cap", "threshold_open", "threshold_locked", "threshold_boss"]
} as const;

export const SNES_WORLD_ATLAS_RELIC_ASSET = {
  key: "snes-world-atlas-relic",
  path: "assets/sprites/snes-world-atlas-relic.svg",
  kind: "world-atlas-relic",
  displayName: "World Atlas Relic",
  cue: "open atlas route card for cycling FRUS regions and entering district maps",
  dimensions: { width: 24, height: 24 }
} as const;

export const SNES_ROUTE_ARROW_RELIC_ASSET = {
  key: "snes-route-arrows",
  path: "assets/sprites/snes-route-arrows.svg",
  kind: "route-arrow-relic-strip",
  displayName: "Route Arrow Relics",
  cue: "four 12x12 cardinal route arrows for selected overworld exits and one-hour edge-memory training",
  dimensions: { width: 48, height: 12 },
  frame: { width: 12, height: 12 },
  frames: ["north", "east", "south", "west"]
} as const;

export const SNES_DUNGEON_STATUS_RELIC_ASSET = {
  key: "snes-dungeon-status-relics",
  path: "assets/sprites/snes-dungeon-status-relics.svg",
  kind: "dungeon-status-relic-strip",
  displayName: "Chapter Status Relics",
  cue: "four 12x12 pause-subscreen relics for chapter keys, big key, map/compass, and boss-review completion",
  dimensions: { width: 48, height: 12 },
  frame: { width: 12, height: 12 },
  frames: ["small_key", "big_key", "map", "boss"]
} as const;

export const SNES_ROOM_MAP_MARKER_ASSET = {
  key: "snes-room-map-markers",
  path: "assets/sprites/snes-room-map-markers.svg",
  kind: "room-map-marker-strip",
  displayName: "Room Map Markers",
  cue: "five 6x6 quest-band room-map markers for visited, current, locked, boss, and reward rooms",
  dimensions: { width: 30, height: 6 },
  frame: { width: 6, height: 6 },
  frames: ["visited", "current", "locked", "boss", "reward"]
} as const;

export const SNES_GATE_GLYPH_ASSET = {
  key: "snes-gate-glyphs",
  path: "assets/sprites/snes-gate-glyphs.svg",
  kind: "gate-glyph-strip",
  displayName: "Gate Glyphs",
  cue: "five 12x12 route-state glyphs for open, locked, sealed, secret, and boss exits",
  dimensions: { width: 60, height: 12 },
  frame: { width: 12, height: 12 },
  frames: ["open", "locked", "sealed", "secret", "boss"]
} as const;

export const SNES_WORKFLOW_TOOL_RELIC_ASSET = {
  key: "snes-workflow-tools",
  path: "assets/sprites/snes-workflow-tools.svg",
  kind: "workflow-tool-relic-strip",
  displayName: "Workflow Tool Relics",
  cue: "eight 16x32 FRUS workflow relics for process-tool inventory slots and gated exploration",
  dimensions: { width: 128, height: 32 },
  frame: { width: 16, height: 32 },
  frames: [
    "citation_stamp",
    "source_note_card",
    "cross_reference_thread",
    "terminal",
    "frus_volume",
    "red_pencil",
    "proof_pages",
    "concurrence_slip"
  ]
} as const;

export const SNES_RESEARCH_PENDANT_RELIC_ASSET = {
  key: "snes-research-pendants",
  path: "assets/sprites/snes-research-pendants.svg",
  kind: "research-pendant-relic-strip",
  displayName: "Research Pendant Relics",
  cue: "three 10x10 quest-band relics for objectivity, provenance, and SOP review discipline",
  dimensions: { width: 30, height: 10 },
  frame: { width: 10, height: 10 },
  frames: ["objectivity", "provenance", "review"]
} as const;

export const SNES_EQUITY_CRYSTAL_RELIC_ASSET = {
  key: "snes-equity-crystals",
  path: "assets/sprites/snes-equity-crystals.svg",
  kind: "equity-crystal-relic-strip",
  displayName: "Equity Crystal Relics",
  cue: "five 8x10 quest-band relics for declassification agency-equity progress",
  dimensions: { width: 40, height: 10 },
  frame: { width: 8, height: 10 },
  frames: ["defense", "intelligence", "diplomatic", "foreign", "privacy"]
} as const;

export const SNES_COVER_FRAGMENT_RELIC_ASSET = {
  key: "snes-cover-fragments",
  path: "assets/sprites/snes-cover-fragments.svg",
  kind: "cover-fragment-relic-strip",
  displayName: "FRUS Cover Fragment Relics",
  cue: "five 3x10 quest-band relics for assembling the final ruby buckram FRUS cover",
  dimensions: { width: 15, height: 10 },
  frame: { width: 3, height: 10 },
  frames: ["spine", "title", "years", "seal", "imprint"]
} as const;

export const SNES_PROCESS_STAMP_RELIC_ASSET = {
  key: "snes-process-stamps",
  path: "assets/sprites/snes-process-stamps.svg",
  kind: "process-stamp-relic-strip",
  displayName: "Process Stamp Relics",
  cue: "six 12x12 publication-screen relics for the earned FRUS process stamps",
  dimensions: { width: 72, height: 12 },
  frame: { width: 12, height: 12 },
  frames: ["rule", "archive", "network", "referral", "sop", "proof"]
} as const;

export const SNES_PUBLISHED_FRUS_PRIZE_ASSET = {
  key: "frus-prize-cover",
  path: "assets/sprites/frus-prize-cover.svg",
  kind: "published-frus-prize",
  displayName: "Published FRUS Prize Cover",
  cue: "80x120 ruby buckram pixel-art reward cover shown after human publication certification",
  dimensions: { width: 80, height: 120 }
} as const;

export const SNES_ROLE_FRAME_SHEETS = [
  SNES_COMPILER_FRAME_SHEET,
  SNES_EDITOR_FRAME_SHEET,
  SNES_PROOFREADER_FRAME_SHEET,
  SNES_DECLASS_REVIEWER_FRAME_SHEET,
  SNES_SOURCE_NOTE_SPECIALIST_FRAME_SHEET
] as const;

export function getSnesRoleFrameSheet(roleId: string) {
  return SNES_ROLE_FRAME_SHEETS.find((sheet) => sheet.roleId === roleId) ?? null;
}

export const SNES_ANTAGONIST_ASSETS = [
  {
    id: "hac_member",
    key: "snes-hac-member",
    path: "assets/sprites/snes-hac-member.svg",
    kind: "roaming-antagonist-sprite",
    displayName: "HAC Member",
    behavior: "roams the Office Hub causing short focus distractions",
    counterplay: "Keep moving through the FRUS workflow and refocus at human workstations",
    dimensions: { width: 32, height: 32 }
  },
  {
    id: "federal_shutdown",
    key: "snes-federal-shutdown",
    path: "assets/sprites/snes-federal-shutdown.svg",
    kind: "roaming-antagonist-sprite",
    displayName: "Federal Government Shutdown",
    behavior: "roams the Office Hub posting short stop-work closure notices",
    counterplay: "Wait out the stop-work order, keep documents in human review, and resume production",
    dimensions: { width: 32, height: 32 }
  },
  {
    id: "frus_bees",
    key: "snes-frus-bees",
    path: "assets/sprites/snes-frus-bees.svg",
    kind: "roaming-antagonist-sprite",
    displayName: "Bees",
    behavior: "swarm through the Office Hub and interrupt concentration if the player gets too close",
    counterplay: "Give the swarm a wide berth while keeping the FRUS workflow moving",
    dimensions: { width: 32, height: 32 }
  },
  {
    id: "navy_hill_mice",
    key: "snes-navy-hill-mice",
    path: "assets/sprites/snes-navy-hill-mice.svg",
    kind: "roaming-antagonist-sprite",
    displayName: "Navy Hill Mice",
    behavior: "scurry around the Navy Hill landmark and scatter source notes if the player gets too close",
    counterplay: "Skirt the Navy Hill edge and keep documents moving through human review",
    dimensions: { width: 32, height: 32 }
  }
] as const;

export const SNES_BUREAUCRATIC_WALL_ASSETS = [
  {
    type: "NO REPO",
    key: "snes-wall-no-repo",
    path: "assets/sprites/snes-wall-no-repo.svg",
    behavior: "slow-chase",
    silhouette: "missing repository shelf, gold citation crack"
  },
  {
    type: "FIREWALL",
    key: "snes-wall-firewall",
    path: "assets/sprites/snes-wall-firewall.svg",
    behavior: "horizontal-patrol",
    silhouette: "terminal gate with red-green routing bars"
  },
  {
    type: "PENDING",
    key: "snes-wall-pending",
    path: "assets/sprites/snes-wall-pending.svg",
    behavior: "wander",
    silhouette: "wandering manifest stack and loose slip"
  },
  {
    type: "WAIT",
    key: "snes-wall-wait",
    path: "assets/sprites/snes-wall-wait.svg",
    behavior: "freeze",
    silhouette: "hourglass and frozen exit pins"
  },
  {
    type: "HOLD",
    key: "snes-wall-hold",
    path: "assets/sprites/snes-wall-hold.svg",
    behavior: "block",
    silhouette: "locked bracket marker across stone"
  },
  {
    type: "AMBIGUOUS",
    key: "snes-wall-ambiguous",
    path: "assets/sprites/snes-wall-ambiguous.svg",
    behavior: "splitter",
    silhouette: "split flag face with two direction tabs"
  },
  {
    type: "DANN-E QUEUE",
    key: "snes-wall-danne-queue",
    path: "assets/sprites/snes-wall-danne-queue.svg",
    behavior: "push",
    silhouette: "queue pusher slab with conveyor arrows"
  }
] as const;

export const SNES_VISUAL_ASSETS = [
  SNES_MAIN_MAP_ASSET,
  ...SNES_AREA_MAP_ASSETS,
  ...SNES_NPC_ASSETS,
  ...SNES_PRODUCTION_COLLEAGUE_ASSETS,
  SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET,
  ...SNES_ROLE_FRAME_SHEETS,
  SNES_FIRST_HOUR_TRAINING_RELIC_ASSET,
  SNES_ARCHIVE_COMPASS_RELIC_ASSET,
  SNES_ARCHIVE_WALL_MAP_BOARD_ASSET,
  SNES_ARCHIVE_PROP_ASSET,
  SNES_ARCHIVE_TILE_ASSET,
  SNES_OFFICE_TILE_ASSET,
  SNES_OFFICE_ROOM_BACKGROUND_ASSET,
  SNES_GUIDE_CAVERN_TILE_ASSET,
  SNES_NETWORK_TILE_ASSET,
  SNES_REFERRAL_VAULT_TILE_ASSET,
  SNES_ARCHIVE_ROOM_DETAIL_ASSET,
  SNES_WORLD_ATLAS_RELIC_ASSET,
  SNES_ROUTE_ARROW_RELIC_ASSET,
  SNES_DUNGEON_STATUS_RELIC_ASSET,
  SNES_ROOM_MAP_MARKER_ASSET,
  SNES_GATE_GLYPH_ASSET,
  SNES_WORKFLOW_TOOL_RELIC_ASSET,
  SNES_RESEARCH_PENDANT_RELIC_ASSET,
  SNES_EQUITY_CRYSTAL_RELIC_ASSET,
  SNES_COVER_FRAGMENT_RELIC_ASSET,
  SNES_PROCESS_STAMP_RELIC_ASSET,
  SNES_PUBLISHED_FRUS_PRIZE_ASSET,
  ...SNES_ANTAGONIST_ASSETS,
  ...SNES_BUREAUCRATIC_WALL_ASSETS.map((wall) => ({
    key: wall.key,
    path: wall.path,
    kind: "bureaucratic-wall-sprite",
    enemyType: wall.type,
    dimensions: { width: 32, height: 32 }
  })),
  ...PROCESS_ROLES.map((role) => ({
    key: role.snesSpriteKey,
    path: `assets/sprites/${role.snesSpriteKey}.svg`,
    kind: "role-portrait",
    roleId: role.id,
    roleLabel: role.label,
    dimensions: { width: 32, height: 32 }
  }))
] as const;

export function getSnesAtlasReadout() {
  return {
    ...SNES_ART_DIRECTION,
    mainMap: {
      texture: SNES_MAIN_MAP_ASSET.key,
      path: SNES_MAIN_MAP_ASSET.path,
      displayName: SNES_MAIN_MAP_ASSET.displayName,
      layout: SNES_MAIN_MAP_ASSET.layout,
      dimensions: { ...SNES_MAIN_MAP_ASSET.dimensions },
      landmarks: SNES_MAIN_MAP_ASSET.landmarks.map((landmark) => ({ ...landmark }))
    },
    assets: SNES_VISUAL_ASSETS.map((asset) => ({ ...asset, dimensions: { ...asset.dimensions } })),
    maps: AREA_REGISTRY.map((area) => ({
      id: area.id,
      displayName: area.displayName,
      reward: area.reward,
      mapTexture: SNES_AREA_MAP_ASSETS.find((asset) => asset.areaId === area.id)?.key ?? "frus-snes-atlas",
      roomIds: FRUS_ROOM_GRAPH.filter((room) => room.area === area.id).map((room) => room.id)
    })),
    roleSprites: PROCESS_ROLES.map((role) => ({
      roleId: role.id,
      displayName: role.label,
      gameplaySprite: role.spriteKey,
      portraitSprite: role.snesSpriteKey,
      ability: role.ability,
      cue: role.remit
    })),
    compilerFrameSet: {
      texture: SNES_COMPILER_FRAME_SHEET.key,
      dimensions: { ...SNES_COMPILER_FRAME_SHEET.dimensions },
      frame: { ...SNES_COMPILER_FRAME_SHEET.frame },
      frameCount: SNES_COMPILER_FRAME_SHEET.frames.length,
      frames: [...SNES_COMPILER_FRAME_SHEET.frames],
      cue: SNES_COMPILER_FRAME_SHEET.frameCue
    },
    roleFrameSets: SNES_ROLE_FRAME_SHEETS.map((sheet) => ({
      roleId: sheet.roleId,
      displayName: sheet.displayName,
      texture: sheet.key,
      path: sheet.path,
      dimensions: { ...sheet.dimensions },
      frame: { ...sheet.frame },
      frameCount: sheet.frames.length,
      frames: [...sheet.frames],
      cue: sheet.frameCue
    })),
    firstHourTrainingRelic: {
      texture: SNES_FIRST_HOUR_TRAINING_RELIC_ASSET.key,
      path: SNES_FIRST_HOUR_TRAINING_RELIC_ASSET.path,
      displayName: SNES_FIRST_HOUR_TRAINING_RELIC_ASSET.displayName,
      cue: SNES_FIRST_HOUR_TRAINING_RELIC_ASSET.cue,
      dimensions: { ...SNES_FIRST_HOUR_TRAINING_RELIC_ASSET.dimensions }
    },
    archiveCompassRelic: {
      texture: SNES_ARCHIVE_COMPASS_RELIC_ASSET.key,
      path: SNES_ARCHIVE_COMPASS_RELIC_ASSET.path,
      displayName: SNES_ARCHIVE_COMPASS_RELIC_ASSET.displayName,
      cue: SNES_ARCHIVE_COMPASS_RELIC_ASSET.cue,
      dimensions: { ...SNES_ARCHIVE_COMPASS_RELIC_ASSET.dimensions }
    },
    archiveWallMapBoard: {
      texture: SNES_ARCHIVE_WALL_MAP_BOARD_ASSET.key,
      path: SNES_ARCHIVE_WALL_MAP_BOARD_ASSET.path,
      displayName: SNES_ARCHIVE_WALL_MAP_BOARD_ASSET.displayName,
      cue: SNES_ARCHIVE_WALL_MAP_BOARD_ASSET.cue,
      dimensions: { ...SNES_ARCHIVE_WALL_MAP_BOARD_ASSET.dimensions }
    },
    archiveProps: {
      texture: SNES_ARCHIVE_PROP_ASSET.key,
      path: SNES_ARCHIVE_PROP_ASSET.path,
      displayName: SNES_ARCHIVE_PROP_ASSET.displayName,
      cue: SNES_ARCHIVE_PROP_ASSET.cue,
      dimensions: { ...SNES_ARCHIVE_PROP_ASSET.dimensions },
      frame: { ...SNES_ARCHIVE_PROP_ASSET.frame },
      frames: [...SNES_ARCHIVE_PROP_ASSET.frames]
    },
    archiveTiles: {
      texture: SNES_ARCHIVE_TILE_ASSET.key,
      path: SNES_ARCHIVE_TILE_ASSET.path,
      displayName: SNES_ARCHIVE_TILE_ASSET.displayName,
      cue: SNES_ARCHIVE_TILE_ASSET.cue,
      dimensions: { ...SNES_ARCHIVE_TILE_ASSET.dimensions },
      frame: { ...SNES_ARCHIVE_TILE_ASSET.frame },
      frames: [...SNES_ARCHIVE_TILE_ASSET.frames]
    },
    officeTiles: {
      texture: SNES_OFFICE_TILE_ASSET.key,
      path: SNES_OFFICE_TILE_ASSET.path,
      displayName: SNES_OFFICE_TILE_ASSET.displayName,
      cue: SNES_OFFICE_TILE_ASSET.cue,
      dimensions: { ...SNES_OFFICE_TILE_ASSET.dimensions },
      frame: { ...SNES_OFFICE_TILE_ASSET.frame },
      frames: [...SNES_OFFICE_TILE_ASSET.frames]
    },
    guideCavernTiles: {
      texture: SNES_GUIDE_CAVERN_TILE_ASSET.key,
      path: SNES_GUIDE_CAVERN_TILE_ASSET.path,
      displayName: SNES_GUIDE_CAVERN_TILE_ASSET.displayName,
      cue: SNES_GUIDE_CAVERN_TILE_ASSET.cue,
      dimensions: { ...SNES_GUIDE_CAVERN_TILE_ASSET.dimensions },
      frame: { ...SNES_GUIDE_CAVERN_TILE_ASSET.frame },
      frames: [...SNES_GUIDE_CAVERN_TILE_ASSET.frames]
    },
    networkTiles: {
      texture: SNES_NETWORK_TILE_ASSET.key,
      path: SNES_NETWORK_TILE_ASSET.path,
      displayName: SNES_NETWORK_TILE_ASSET.displayName,
      cue: SNES_NETWORK_TILE_ASSET.cue,
      dimensions: { ...SNES_NETWORK_TILE_ASSET.dimensions },
      frame: { ...SNES_NETWORK_TILE_ASSET.frame },
      frames: [...SNES_NETWORK_TILE_ASSET.frames]
    },
    referralVaultTiles: {
      texture: SNES_REFERRAL_VAULT_TILE_ASSET.key,
      path: SNES_REFERRAL_VAULT_TILE_ASSET.path,
      displayName: SNES_REFERRAL_VAULT_TILE_ASSET.displayName,
      cue: SNES_REFERRAL_VAULT_TILE_ASSET.cue,
      dimensions: { ...SNES_REFERRAL_VAULT_TILE_ASSET.dimensions },
      frame: { ...SNES_REFERRAL_VAULT_TILE_ASSET.frame },
      frames: [...SNES_REFERRAL_VAULT_TILE_ASSET.frames]
    },
    archiveRoomDetails: {
      texture: SNES_ARCHIVE_ROOM_DETAIL_ASSET.key,
      path: SNES_ARCHIVE_ROOM_DETAIL_ASSET.path,
      displayName: SNES_ARCHIVE_ROOM_DETAIL_ASSET.displayName,
      cue: SNES_ARCHIVE_ROOM_DETAIL_ASSET.cue,
      dimensions: { ...SNES_ARCHIVE_ROOM_DETAIL_ASSET.dimensions },
      frame: { ...SNES_ARCHIVE_ROOM_DETAIL_ASSET.frame },
      frames: [...SNES_ARCHIVE_ROOM_DETAIL_ASSET.frames]
    },
    worldAtlasRelic: {
      texture: SNES_WORLD_ATLAS_RELIC_ASSET.key,
      path: SNES_WORLD_ATLAS_RELIC_ASSET.path,
      displayName: SNES_WORLD_ATLAS_RELIC_ASSET.displayName,
      cue: SNES_WORLD_ATLAS_RELIC_ASSET.cue,
      dimensions: { ...SNES_WORLD_ATLAS_RELIC_ASSET.dimensions }
    },
    routeArrowRelics: {
      texture: SNES_ROUTE_ARROW_RELIC_ASSET.key,
      path: SNES_ROUTE_ARROW_RELIC_ASSET.path,
      displayName: SNES_ROUTE_ARROW_RELIC_ASSET.displayName,
      cue: SNES_ROUTE_ARROW_RELIC_ASSET.cue,
      dimensions: { ...SNES_ROUTE_ARROW_RELIC_ASSET.dimensions },
      frame: { ...SNES_ROUTE_ARROW_RELIC_ASSET.frame },
      frames: [...SNES_ROUTE_ARROW_RELIC_ASSET.frames]
    },
    dungeonStatusRelics: {
      texture: SNES_DUNGEON_STATUS_RELIC_ASSET.key,
      path: SNES_DUNGEON_STATUS_RELIC_ASSET.path,
      displayName: SNES_DUNGEON_STATUS_RELIC_ASSET.displayName,
      cue: SNES_DUNGEON_STATUS_RELIC_ASSET.cue,
      dimensions: { ...SNES_DUNGEON_STATUS_RELIC_ASSET.dimensions },
      frame: { ...SNES_DUNGEON_STATUS_RELIC_ASSET.frame },
      frames: [...SNES_DUNGEON_STATUS_RELIC_ASSET.frames]
    },
    roomMapMarkers: {
      texture: SNES_ROOM_MAP_MARKER_ASSET.key,
      path: SNES_ROOM_MAP_MARKER_ASSET.path,
      displayName: SNES_ROOM_MAP_MARKER_ASSET.displayName,
      cue: SNES_ROOM_MAP_MARKER_ASSET.cue,
      dimensions: { ...SNES_ROOM_MAP_MARKER_ASSET.dimensions },
      frame: { ...SNES_ROOM_MAP_MARKER_ASSET.frame },
      frames: [...SNES_ROOM_MAP_MARKER_ASSET.frames]
    },
    gateGlyphs: {
      texture: SNES_GATE_GLYPH_ASSET.key,
      path: SNES_GATE_GLYPH_ASSET.path,
      displayName: SNES_GATE_GLYPH_ASSET.displayName,
      cue: SNES_GATE_GLYPH_ASSET.cue,
      dimensions: { ...SNES_GATE_GLYPH_ASSET.dimensions },
      frame: { ...SNES_GATE_GLYPH_ASSET.frame },
      frames: [...SNES_GATE_GLYPH_ASSET.frames]
    },
    workflowToolRelics: {
      texture: SNES_WORKFLOW_TOOL_RELIC_ASSET.key,
      path: SNES_WORKFLOW_TOOL_RELIC_ASSET.path,
      displayName: SNES_WORKFLOW_TOOL_RELIC_ASSET.displayName,
      cue: SNES_WORKFLOW_TOOL_RELIC_ASSET.cue,
      dimensions: { ...SNES_WORKFLOW_TOOL_RELIC_ASSET.dimensions },
      frame: { ...SNES_WORKFLOW_TOOL_RELIC_ASSET.frame },
      frames: [...SNES_WORKFLOW_TOOL_RELIC_ASSET.frames]
    },
    researchPendantRelics: {
      texture: SNES_RESEARCH_PENDANT_RELIC_ASSET.key,
      path: SNES_RESEARCH_PENDANT_RELIC_ASSET.path,
      displayName: SNES_RESEARCH_PENDANT_RELIC_ASSET.displayName,
      cue: SNES_RESEARCH_PENDANT_RELIC_ASSET.cue,
      dimensions: { ...SNES_RESEARCH_PENDANT_RELIC_ASSET.dimensions },
      frame: { ...SNES_RESEARCH_PENDANT_RELIC_ASSET.frame },
      frames: [...SNES_RESEARCH_PENDANT_RELIC_ASSET.frames]
    },
    equityCrystalRelics: {
      texture: SNES_EQUITY_CRYSTAL_RELIC_ASSET.key,
      path: SNES_EQUITY_CRYSTAL_RELIC_ASSET.path,
      displayName: SNES_EQUITY_CRYSTAL_RELIC_ASSET.displayName,
      cue: SNES_EQUITY_CRYSTAL_RELIC_ASSET.cue,
      dimensions: { ...SNES_EQUITY_CRYSTAL_RELIC_ASSET.dimensions },
      frame: { ...SNES_EQUITY_CRYSTAL_RELIC_ASSET.frame },
      frames: [...SNES_EQUITY_CRYSTAL_RELIC_ASSET.frames]
    },
    coverFragmentRelics: {
      texture: SNES_COVER_FRAGMENT_RELIC_ASSET.key,
      path: SNES_COVER_FRAGMENT_RELIC_ASSET.path,
      displayName: SNES_COVER_FRAGMENT_RELIC_ASSET.displayName,
      cue: SNES_COVER_FRAGMENT_RELIC_ASSET.cue,
      dimensions: { ...SNES_COVER_FRAGMENT_RELIC_ASSET.dimensions },
      frame: { ...SNES_COVER_FRAGMENT_RELIC_ASSET.frame },
      frames: [...SNES_COVER_FRAGMENT_RELIC_ASSET.frames]
    },
    processStampRelics: {
      texture: SNES_PROCESS_STAMP_RELIC_ASSET.key,
      path: SNES_PROCESS_STAMP_RELIC_ASSET.path,
      displayName: SNES_PROCESS_STAMP_RELIC_ASSET.displayName,
      cue: SNES_PROCESS_STAMP_RELIC_ASSET.cue,
      dimensions: { ...SNES_PROCESS_STAMP_RELIC_ASSET.dimensions },
      frame: { ...SNES_PROCESS_STAMP_RELIC_ASSET.frame },
      frames: [...SNES_PROCESS_STAMP_RELIC_ASSET.frames]
    },
    publishedFrusPrize: {
      texture: SNES_PUBLISHED_FRUS_PRIZE_ASSET.key,
      path: SNES_PUBLISHED_FRUS_PRIZE_ASSET.path,
      displayName: SNES_PUBLISHED_FRUS_PRIZE_ASSET.displayName,
      cue: SNES_PUBLISHED_FRUS_PRIZE_ASSET.cue,
      dimensions: { ...SNES_PUBLISHED_FRUS_PRIZE_ASSET.dimensions }
    },
    npcSprites: SNES_NPC_ASSETS.map((asset) => ({
      characterId: asset.characterId,
      displayName: asset.displayName,
      texture: asset.key,
      cue: asset.roleCue,
      dimensions: { ...asset.dimensions }
    })),
    productionColleagues: SNES_PRODUCTION_COLLEAGUE_ASSETS.map((asset) => ({
      id: asset.id,
      displayName: asset.displayName,
      texture: asset.key,
      frameSheet: SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.key,
      label: asset.shortLabel,
      cue: asset.roleCue,
      dimensions: { ...asset.dimensions }
    })),
    productionColleagueFrameSheet: {
      texture: SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.key,
      path: SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.path,
      dimensions: { ...SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.dimensions },
      frame: { ...SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.frame },
      roles: [...SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.roles],
      frames: [...SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.frames],
      cue: SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.frameCue
    },
    roamingAntagonists: SNES_ANTAGONIST_ASSETS.map((asset) => ({
      id: asset.id,
      displayName: asset.displayName,
      texture: asset.key,
      behavior: asset.behavior,
      counterplay: asset.counterplay,
      dimensions: { ...asset.dimensions }
    })),
    workflowRelics: ITEM_REGISTRY.map((item) => ({
      id: item.id,
      displayName: item.displayName,
      icon: item.icon,
      texture: SNES_WORKFLOW_TOOL_RELIC_ASSET.key,
      frame: workflowToolFrameForItem(item.id),
      hudSlot: item.hudSlot,
      function: item.zeldaFunction,
      frusMeaning: item.frusMeaning
    })),
    bureaucraticWallSprites: SNES_BUREAUCRATIC_WALL_ASSETS.map((wall) => ({
      type: wall.type,
      texture: wall.key,
      behavior: wall.behavior,
      silhouette: wall.silhouette
    }))
  };
}

function workflowToolFrameForItem(itemId: string) {
  if (itemId === "citation_stamp") return "citation_stamp";
  if (itemId === "red_pencil") return "red_pencil";
  if (itemId === "review_folder") return "cross_reference_thread";
  if (itemId === "clearance_token") return "terminal";
  if (itemId === "concurrence_slip") return "concurrence_slip";
  if (itemId === "proof_lens") return "proof_pages";
  if (itemId === "buckram_key") return "frus_volume";
  return "source_note_card";
}
