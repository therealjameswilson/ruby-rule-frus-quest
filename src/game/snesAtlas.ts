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
    "richer room depth through raised floors, shadows, and buckram texture",
    "compact world atlas connecting Office Hub, Archive Cavern, networks, referrals, proofing, and Buckram Gate",
    "area-specific map panels for the FRUS production dungeons",
    "workflow tools shown as collectible relics rather than weapons"
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
    key: "frus-snes-atlas",
    path: "assets/maps/frus-snes-atlas.svg",
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
  ...SNES_AREA_MAP_ASSETS,
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
