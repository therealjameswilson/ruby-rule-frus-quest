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
    { number: 11, name: "Potomac River", cue: "south map boundary" }
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

export const SNES_ROLE_FRAME_SHEETS = [
  SNES_COMPILER_FRAME_SHEET,
  SNES_EDITOR_FRAME_SHEET
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
  ...SNES_ANTAGONIST_ASSETS,
  ...SNES_BUREAUCRATIC_WALL_ASSETS.map((wall) => ({
    key: wall.key,
    path: wall.path,
    kind: "bureaucratic-wall-sprite",
    enemyType: wall.type,
    dimensions: { width: 32, height: 32 }
  })),
  {
    key: "snes-workflow-tools",
    path: "assets/sprites/snes-workflow-tools.svg",
    kind: "tool-sprite-strip",
    dimensions: { width: 128, height: 32 }
  },
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
