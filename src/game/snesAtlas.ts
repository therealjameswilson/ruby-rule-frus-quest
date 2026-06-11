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
  ...SNES_NPC_ASSETS,
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
    npcSprites: SNES_NPC_ASSETS.map((asset) => ({
      characterId: asset.characterId,
      displayName: asset.displayName,
      texture: asset.key,
      cue: asset.roleCue,
      dimensions: { ...asset.dimensions }
    })),
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
