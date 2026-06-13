import {
  NES_ARCHIVE_AMBER,
  NES_ARCHIVE_GRAY,
  NES_BLACK,
  NES_BRIGHT_RUBY,
  NES_BUCKRAM_RUBY,
  NES_CLASSNET_RED,
  NES_CREAM_PAPER,
  NES_DARK_MAROON,
  NES_DEEP_RUBY,
  NES_GOLD,
  NES_OPENNET_GREEN,
  NES_AGED_PAPER_SHADOW,
  NES_SLATE_BLUE,
  NES_STONE_LIGHT,
  NES_TERMINAL_CYAN,
  NES_WHITE_HIGHLIGHT
} from "../art/palette";

export const GAME_WIDTH = 256;
export const GAME_HEIGHT = 240;

export const PALETTE = {
  buckramRed: NES_BUCKRAM_RUBY,
  deepRuby: NES_DARK_MAROON,
  buckramHighlight: NES_BRIGHT_RUBY,
  goldStamp: NES_GOLD,
  creamPaper: NES_CREAM_PAPER,
  sepiaInk: NES_AGED_PAPER_SHADOW,
  archiveAmber: NES_ARCHIVE_AMBER,
  stoneLight: NES_STONE_LIGHT,
  stoneGray: NES_ARCHIVE_GRAY,
  stoneDark: NES_SLATE_BLUE,
  mapWater: NES_SLATE_BLUE,
  terminalCyan: NES_TERMINAL_CYAN,
  openNetGreen: NES_OPENNET_GREEN,
  classNetRed: NES_CLASSNET_RED,
  shadowNavy: NES_DEEP_RUBY,
  black: NES_BLACK,
  white: NES_WHITE_HIGHLIGHT
} as const;

export type PaletteKey = keyof typeof PALETTE;

export const CHARACTERS = {
  sam: {
    displayName: "Sam",
    role: "Proofreader",
    ability: "Silent Read",
    color: "creamPaper"
  },
  elena: {
    displayName: "Elena",
    role: "Compiler",
    ability: "Archive Sense",
    color: "archiveAmber"
  },
  marcus: {
    displayName: "Marcus",
    role: "Declassification Coordinator",
    ability: "Equity Map",
    color: "classNetRed"
  },
  priya: {
    displayName: "Priya",
    role: "General Editor",
    ability: "Red Pencil",
    color: "goldStamp"
  }
} as const;

export const PROCESS_ROLES = [
  {
    id: "proofreader",
    label: "Proofreader",
    ability: "Silent Read",
    remit: "Compare manuscript and proof.",
    color: "creamPaper",
    spriteKey: "player-proofreader",
    snesSpriteKey: "snes-player-proofreader"
  },
  {
    id: "compiler",
    label: "Compiler",
    ability: "Archive Sense",
    remit: "Verify selection and provenance.",
    color: "archiveAmber",
    spriteKey: "player-compiler",
    snesSpriteKey: "snes-player-compiler"
  },
  {
    id: "editor",
    label: "Editor",
    ability: "Red Pencil",
    remit: "Resolve style, meaning, and queries.",
    color: "goldStamp",
    spriteKey: "player-editor",
    snesSpriteKey: "snes-player-editor"
  },
  {
    id: "declass_reviewer",
    label: "Declass Coordinator",
    ability: "Equity Map",
    remit: "Route classified equities.",
    color: "classNetRed",
    spriteKey: "player-declass-reviewer",
    snesSpriteKey: "snes-player-declass-reviewer"
  },
  {
    id: "source_note_specialist",
    label: "Source Note Specialist",
    ability: "Provenance Check",
    remit: "Make source notes publication-ready.",
    color: "terminalCyan",
    spriteKey: "player-source-note-specialist",
    snesSpriteKey: "snes-player-source-note-specialist"
  }
] as const;

export type ProcessRoleId = (typeof PROCESS_ROLES)[number]["id"];

export const PROCESS_STAMPS = [
  { id: "rule", label: "RULE", title: "Golden Rule learned" },
  { id: "archive", label: "SRC", title: "Source provenance verified" },
  { id: "network", label: "NET", title: "Network routing cleared" },
  { id: "referral", label: "REF", title: "Referrals and excision visible" },
  { id: "sop", label: "SOP", title: "AI annotation review routed" },
  { id: "proof", label: "READ", title: "Silent read complete" }
] as const;

export type ProcessStampId = (typeof PROCESS_STAMPS)[number]["id"];

export const ITEM_REGISTRY = [
  {
    id: "citation_stamp",
    displayName: "Citation Stamp",
    label: "Citation Stamp",
    shortLabel: "CITE",
    icon: "citation-stamp",
    texture: "citation-stamp",
    roomUnlocks: ["GuideScene Verification Gate", "Archive A1 source-note lock"],
    blockerWeaknesses: ["NO REPO", "source-note lock"],
    pickupDialog: [
      "Citation Stamp acquired.",
      "Opens source-note locks only after provenance is verified by human review."
    ],
    hudSlot: 0,
    zeldaFunction: "Opens source-note locks",
    frusMeaning: "Provenance verified",
    aliases: ["Source Note 47 Citation Stamp"]
  },
  {
    id: "red_pencil",
    displayName: "Red Pencil",
    label: "Red Pencil",
    shortLabel: "PENCIL",
    icon: "red-pencil",
    texture: "red-pencil",
    roomUnlocks: ["SilentReadScene editor desk"],
    blockerWeaknesses: ["MECHANICAL FIX", "UNSUPPORTED TEXT"],
    pickupDialog: [
      "Red Pencil acquired.",
      "Marks unsupported text after editor judgment."
    ],
    hudSlot: 1,
    zeldaFunction: "Marks unsupported text",
    frusMeaning: "Editor judgment",
    aliases: ["Red Pencil Mark"]
  },
  {
    id: "review_folder",
    displayName: "Review Folder",
    label: "Review Folder",
    shortLabel: "FOLDER",
    icon: "review-folder",
    texture: "review-folder",
    roomUnlocks: ["SilentReadScene StateChat outbox"],
    blockerWeaknesses: ["AMBIGUOUS", "EVIDENCE-BOUND FLAGS"],
    pickupDialog: [
      "Review Folder acquired.",
      "Carry unresolved issues to the correct human workstation."
    ],
    hudSlot: 2,
    zeldaFunction: "Carries unresolved issues",
    frusMeaning: "Human review queue",
    aliases: []
  },
  {
    id: "clearance_token",
    displayName: "Clearance Token",
    label: "Clearance Token",
    shortLabel: "CLEAR",
    icon: "clearance-token",
    texture: "clearance-token",
    roomUnlocks: ["ReferralVaultScene red vault doors", "Archive A2 terminal door"],
    blockerWeaknesses: ["FIREWALL"],
    pickupDialog: [
      "Clearance Token acquired.",
      "Opens red vault doors after correct OpenNet/ClassNet routing."
    ],
    hudSlot: 3,
    zeldaFunction: "Opens red vault doors",
    frusMeaning: "ClassNet/declass access",
    aliases: []
  },
  {
    id: "concurrence_slip",
    displayName: "Concurrence Slip",
    label: "Concurrence Slip",
    shortLabel: "CONCUR",
    icon: "concurrence-slip",
    texture: "concurrence-slip",
    roomUnlocks: ["ReferralVaultScene referral gates", "Archive B1 referral lane"],
    blockerWeaknesses: ["PENDING", "WAIT"],
    pickupDialog: [
      "Concurrence Slip acquired.",
      "Opens referral gates after agency response is complete."
    ],
    hudSlot: 4,
    zeldaFunction: "Opens referral gates",
    frusMeaning: "Agency response complete",
    aliases: []
  },
  {
    id: "proof_lens",
    displayName: "Proof Lens",
    label: "Proof Lens",
    shortLabel: "LENS",
    icon: "proof-lens",
    texture: "proof-lens",
    roomUnlocks: ["SilentReadScene proof table", "Archive B2 proof chamber"],
    blockerWeaknesses: ["PROOF DATE", "tiny discrepancy"],
    pickupDialog: [
      "Proof Lens acquired.",
      "Reveals tiny discrepancies during silent read."
    ],
    hudSlot: 5,
    zeldaFunction: "Reveals tiny discrepancies",
    frusMeaning: "Silent read ability",
    aliases: []
  },
  {
    id: "buckram_key",
    displayName: "Buckram Key",
    label: "Buckram Key",
    shortLabel: "KEY",
    icon: "buckram-key",
    texture: "buckram-key",
    roomUnlocks: ["EndingScene final publication gate"],
    blockerWeaknesses: ["DANN-E QUEUE", "publication gate"],
    pickupDialog: [
      "Buckram Key acquired.",
      "Opens the final publication gate after the volume is certified."
    ],
    hudSlot: 6,
    zeldaFunction: "Opens final publication gate",
    frusMeaning: "Volume certified",
    aliases: []
  }
] as const;

export const PROCESS_ITEMS = ITEM_REGISTRY;
export type ProcessItemId = (typeof PROCESS_ITEMS)[number]["id"];

export const AREA_REGISTRY = [
  {
    id: "office_hub",
    displayName: "Office Hub",
    zeldaRole: "Overworld start",
    reward: "Golden Rule",
    rewardType: "stamp",
    rewardId: "rule",
    scenes: ["OfficeScene", "CherryBlossomGardenScene", "SenateHearingChamberScene"]
  },
  {
    id: "archive_cavern",
    displayName: "Archive Cavern",
    zeldaRole: "Dungeon 1",
    reward: "Citation Stamp",
    rewardType: "item",
    rewardId: "citation_stamp",
    scenes: ["GuideScene", "ArchiveScene", "NaraStacksScene"]
  },
  {
    id: "two_networks",
    displayName: "Two Networks",
    zeldaRole: "Dungeon 2",
    reward: "Clearance Token",
    rewardType: "item",
    rewardId: "clearance_token",
    scenes: ["NetworkScene", "EmbassyCableRoomScene"]
  },
  {
    id: "referral_vault",
    displayName: "Referral Vault",
    zeldaRole: "Dungeon 3",
    reward: "Concurrence Slip",
    rewardType: "item",
    rewardId: "concurrence_slip",
    scenes: ["ReferralVaultScene"]
  },
  {
    id: "editors_labyrinth",
    displayName: "Editor's Labyrinth",
    zeldaRole: "Dungeon 4",
    reward: "Red Pencil",
    rewardType: "item",
    rewardId: "red_pencil",
    scenes: ["SilentReadScene"]
  },
  {
    id: "silent_read_tower",
    displayName: "Silent Read Tower",
    zeldaRole: "Dungeon 5",
    reward: "Proof Lens",
    rewardType: "item",
    rewardId: "proof_lens",
    scenes: ["SilentReadScene"]
  },
  {
    id: "buckram_gate",
    displayName: "Buckram Gate",
    zeldaRole: "Final dungeon",
    reward: "Published FRUS cover",
    rewardType: "finalPrize",
    rewardId: "published_frus_cover",
    scenes: ["EndingScene", "BlackVaultLairScene"]
  }
] as const;

export type AreaId = (typeof AREA_REGISTRY)[number]["id"];

export type Direction = "north" | "south" | "east" | "west";
export type RoomType = "normal" | "hint" | "puzzle" | "reward" | "boss" | "secret";

export interface RoomDefinition {
  id: string;
  area: AreaId;
  title: string;
  grid: { x: number; y: number };
  exits: Partial<Record<Direction, string>>;
  lockedExits?: Partial<Record<Direction, string>>;
  requiredItems?: Partial<Record<Direction, ProcessItemId>>;
  roomType: RoomType;
}

export const FRUS_ROOM_GRAPH: RoomDefinition[] = [
  {
    id: "O1",
    area: "office_hub",
    title: "Office Hub",
    grid: { x: -1, y: 0 },
    exits: { north: "DH1", west: "DG1", east: "A1" },
    lockedExits: { east: "Golden Rule door" },
    roomType: "hint"
  },
  {
    id: "DG1",
    area: "office_hub",
    title: "Cherry Blossom Garden",
    grid: { x: -2, y: 0 },
    exits: { east: "O1" },
    roomType: "reward"
  },
  {
    id: "DH1",
    area: "office_hub",
    title: "Senate Hearing Chamber",
    grid: { x: -1, y: -1 },
    exits: { south: "O1" },
    roomType: "hint"
  },
  {
    id: "A1",
    area: "archive_cavern",
    title: "Source Entry",
    grid: { x: 0, y: 0 },
    exits: { north: "DN1", east: "A2", south: "B1" },
    roomType: "normal"
  },
  {
    id: "DN1",
    area: "archive_cavern",
    title: "NARA Stacks",
    grid: { x: 0, y: -1 },
    exits: { south: "A1" },
    roomType: "puzzle"
  },
  {
    id: "A2",
    area: "archive_cavern",
    title: "OpenNet Annex",
    grid: { x: 1, y: 0 },
    exits: { north: "DE1", west: "A1", east: "A3", south: "B2" },
    lockedExits: { south: "ClassNet seal" },
    requiredItems: { south: "clearance_token" },
    roomType: "puzzle"
  },
  {
    id: "DE1",
    area: "two_networks",
    title: "Embassy Cable Room",
    grid: { x: 1, y: -1 },
    exits: { south: "A2" },
    lockedExits: { south: "Marine security door" },
    roomType: "puzzle"
  },
  {
    id: "A3",
    area: "archive_cavern",
    title: "Hint Alcove",
    grid: { x: 2, y: 0 },
    exits: { west: "A2", south: "B3" },
    roomType: "hint"
  },
  {
    id: "B1",
    area: "archive_cavern",
    title: "Referral Stacks",
    grid: { x: 0, y: 1 },
    exits: { north: "A1", east: "B2", south: "C1" },
    lockedExits: { east: "Referral gate" },
    requiredItems: { east: "concurrence_slip" },
    roomType: "puzzle"
  },
  {
    id: "B2",
    area: "archive_cavern",
    title: "Proof Chamber",
    grid: { x: 1, y: 1 },
    exits: { north: "A2", west: "B1", east: "B3", south: "C2" },
    lockedExits: { south: "Review folder gate" },
    requiredItems: { south: "review_folder" },
    roomType: "normal"
  },
  {
    id: "B3",
    area: "archive_cavern",
    title: "Marcus Hint Room",
    grid: { x: 2, y: 1 },
    exits: { north: "A3", west: "B2", south: "C3" },
    roomType: "hint"
  },
  {
    id: "C1",
    area: "archive_cavern",
    title: "Cracked Wall",
    grid: { x: 0, y: 2 },
    exits: { north: "B1", east: "C2", south: "D1" },
    roomType: "puzzle"
  },
  {
    id: "C2",
    area: "archive_cavern",
    title: "Date Mismatch",
    grid: { x: 1, y: 2 },
    exits: { north: "B2", west: "C1", east: "C3", south: "D2" },
    lockedExits: { east: "Silent-read lens mark" },
    requiredItems: { east: "proof_lens" },
    roomType: "puzzle"
  },
  {
    id: "C3",
    area: "archive_cavern",
    title: "Hidden Source Cache",
    grid: { x: 2, y: 2 },
    exits: { north: "B3", west: "C2", south: "D3" },
    roomType: "secret"
  },
  {
    id: "D1",
    area: "archive_cavern",
    title: "Stamp Reward Room",
    grid: { x: 0, y: 3 },
    exits: { north: "C1", east: "D2" },
    roomType: "reward"
  },
  {
    id: "D2",
    area: "archive_cavern",
    title: "Hidden Reliability Well",
    grid: { x: 1, y: 3 },
    exits: { north: "C2", west: "D1", east: "D3" },
    lockedExits: { east: "Buckram gate lock" },
    requiredItems: { east: "buckram_key" },
    roomType: "secret"
  },
  {
    id: "D3",
    area: "archive_cavern",
    title: "Queue Boss Gate",
    grid: { x: 2, y: 3 },
    exits: { north: "C3", west: "D2", south: "DV1" },
    lockedExits: { south: "Black Vault seal" },
    roomType: "boss"
  },
  {
    id: "DV1",
    area: "buckram_gate",
    title: "Black Vault Lair",
    grid: { x: 2, y: 4 },
    exits: { north: "D3" },
    lockedExits: { north: "Treaty fragments or Buckram Key" },
    roomType: "boss"
  },
  {
    id: "N1",
    area: "two_networks",
    title: "Network Split",
    grid: { x: 4, y: 0 },
    exits: { east: "N2" },
    lockedExits: { east: "ClassNet vault door" },
    requiredItems: { east: "clearance_token" },
    roomType: "puzzle"
  },
  {
    id: "N2",
    area: "two_networks",
    title: "ClassNet Vault",
    grid: { x: 5, y: 0 },
    exits: { west: "N1" },
    roomType: "reward"
  },
  {
    id: "R1",
    area: "referral_vault",
    title: "Equity Gate",
    grid: { x: 4, y: 1 },
    exits: { east: "R2" },
    lockedExits: { east: "Visible-excision gate" },
    roomType: "puzzle"
  },
  {
    id: "R2",
    area: "referral_vault",
    title: "Concurrence Chamber",
    grid: { x: 5, y: 1 },
    exits: { west: "R1", east: "S1" },
    lockedExits: { east: "Silent Read handoff" },
    requiredItems: { east: "concurrence_slip" },
    roomType: "reward"
  },
  {
    id: "E1",
    area: "editors_labyrinth",
    title: "Editor's Labyrinth",
    grid: { x: 4, y: 2 },
    exits: { east: "S1" },
    lockedExits: { east: "Red-pencil query gate" },
    requiredItems: { east: "red_pencil" },
    roomType: "puzzle"
  },
  {
    id: "S1",
    area: "silent_read_tower",
    title: "Silent Read Tower",
    grid: { x: 5, y: 2 },
    exits: { west: "E1", east: "G1" },
    lockedExits: { east: "Buckram publication gate" },
    requiredItems: { east: "buckram_key" },
    roomType: "reward"
  },
  {
    id: "G1",
    area: "buckram_gate",
    title: "Buckram Gate",
    grid: { x: 4, y: 3 },
    exits: {},
    lockedExits: { north: "Publication gate" },
    requiredItems: { north: "buckram_key" },
    roomType: "boss"
  }
] as const;

export const SCENE_ORDER = [
  "TapToStartScene",
  "WarningScene",
  "TitleScene",
  "CharacterCreateScene",
  "OfficeScene",
  "GuideScene",
  "ArchiveScene",
  "CherryBlossomGardenScene",
  "BlackVaultLairScene",
  "SenateHearingChamberScene",
  "NaraStacksScene",
  "EmbassyCableRoomScene",
  "NetworkScene",
  "ReferralVaultScene",
  "SilentReadScene",
  "EndingScene",
  "TrueEndingScene",
  "CodexScene",
  "RenderDebugScene",
  "DanneGallery",
  "SpriteGallery"
] as const;

export const CONTROLS_TEXT = "ARROWS/WASD MOVE  SPACE/ENTER ACT  E ABILITY  M INV  R REL  N SOUND";
