export const GAME_WIDTH = 256;
export const GAME_HEIGHT = 240;

export const PALETTE = {
  buckramRed: "#7A1020",
  deepRuby: "#4A0712",
  buckramHighlight: "#B42335",
  goldStamp: "#D6A84F",
  creamPaper: "#F2E4C8",
  sepiaInk: "#5A3B25",
  archiveAmber: "#C68642",
  stoneLight: "#A8A79E",
  stoneGray: "#6F716D",
  stoneDark: "#3C4142",
  mapWater: "#44637A",
  terminalCyan: "#45F3FF",
  openNetGreen: "#4CFF6B",
  classNetRed: "#FF3B3B",
  shadowNavy: "#101820",
  black: "#050505",
  white: "#F8F8F8"
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
    spriteKey: "player-proofreader"
  },
  {
    id: "compiler",
    label: "Compiler",
    ability: "Archive Sense",
    remit: "Verify selection and provenance.",
    color: "archiveAmber",
    spriteKey: "player-compiler"
  },
  {
    id: "editor",
    label: "Editor",
    ability: "Red Pencil",
    remit: "Resolve style, meaning, and queries.",
    color: "goldStamp",
    spriteKey: "player-editor"
  },
  {
    id: "declass_reviewer",
    label: "Declass Coordinator",
    ability: "Equity Map",
    remit: "Route classified equities.",
    color: "classNetRed",
    spriteKey: "player-declass-reviewer"
  },
  {
    id: "source_note_specialist",
    label: "Source Note Specialist",
    ability: "Provenance Check",
    remit: "Make source notes publication-ready.",
    color: "terminalCyan",
    spriteKey: "player-source-note-specialist"
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
    scenes: ["OfficeScene"]
  },
  {
    id: "archive_cavern",
    displayName: "Archive Cavern",
    zeldaRole: "Dungeon 1",
    reward: "Citation Stamp",
    rewardType: "item",
    rewardId: "citation_stamp",
    scenes: ["GuideScene", "ArchiveScene"]
  },
  {
    id: "two_networks",
    displayName: "Two Networks",
    zeldaRole: "Dungeon 2",
    reward: "Clearance Token",
    rewardType: "item",
    rewardId: "clearance_token",
    scenes: ["NetworkScene"]
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
    scenes: ["EndingScene"]
  }
] as const;

export type AreaId = (typeof AREA_REGISTRY)[number]["id"];

export const SCENE_ORDER = [
  "TitleScene",
  "CharacterCreateScene",
  "OfficeScene",
  "GuideScene",
  "ArchiveScene",
  "NetworkScene",
  "ReferralVaultScene",
  "SilentReadScene",
  "EndingScene",
  "RenderDebugScene"
] as const;

export const CONTROLS_TEXT = "ARROWS/WASD MOVE  SPACE/ENTER ACT  E ABILITY  M INV  R REL  N SOUND";
