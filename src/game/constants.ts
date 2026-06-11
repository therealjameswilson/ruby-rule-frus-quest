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

export const PROCESS_ITEMS = [
  {
    id: "citation_stamp",
    label: "Citation Stamp",
    shortLabel: "CITE",
    zeldaFunction: "Opens source-note locks",
    frusMeaning: "Provenance verified",
    texture: "citation-stamp",
    aliases: ["Source Note 47 Citation Stamp"]
  },
  {
    id: "red_pencil",
    label: "Red Pencil",
    shortLabel: "PENCIL",
    zeldaFunction: "Marks unsupported text",
    frusMeaning: "Editor judgment",
    texture: "red-pencil",
    aliases: ["Red Pencil Mark"]
  },
  {
    id: "review_folder",
    label: "Review Folder",
    shortLabel: "FOLDER",
    zeldaFunction: "Carries unresolved issues",
    frusMeaning: "Human review queue",
    texture: "review-folder",
    aliases: []
  },
  {
    id: "clearance_token",
    label: "Clearance Token",
    shortLabel: "CLEAR",
    zeldaFunction: "Opens red vault doors",
    frusMeaning: "ClassNet/declass access",
    texture: "clearance-token",
    aliases: []
  },
  {
    id: "concurrence_slip",
    label: "Concurrence Slip",
    shortLabel: "CONCUR",
    zeldaFunction: "Opens referral gates",
    frusMeaning: "Agency response complete",
    texture: "concurrence-slip",
    aliases: []
  },
  {
    id: "proof_lens",
    label: "Proof Lens",
    shortLabel: "LENS",
    zeldaFunction: "Reveals tiny discrepancies",
    frusMeaning: "Silent read ability",
    texture: "proof-lens",
    aliases: []
  },
  {
    id: "buckram_key",
    label: "Buckram Key",
    shortLabel: "KEY",
    zeldaFunction: "Opens final publication gate",
    frusMeaning: "Volume certified",
    texture: "buckram-key",
    aliases: []
  }
] as const;

export type ProcessItemId = (typeof PROCESS_ITEMS)[number]["id"];

export const SCENE_ORDER = [
  "TitleScene",
  "CharacterCreateScene",
  "GuideScene",
  "OfficeScene",
  "ArchiveScene",
  "NetworkScene",
  "ReferralVaultScene",
  "SilentReadScene",
  "EndingScene",
  "RenderDebugScene"
] as const;

export const CONTROLS_TEXT = "ARROWS/WASD MOVE  SPACE/ENTER ACT  E ABILITY  M INV  R REL  N SOUND";
