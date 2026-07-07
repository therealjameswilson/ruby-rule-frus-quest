export type LttpPatternId =
  | "room_pointer_table"
  | "fixed_ancilla_slots"
  | "ancilla_main_loop"
  | "sprite_damage_loop"
  | "direction_to_player"
  | "milestone_item_table";

export type FrusMechanicId =
  | "data_driven_frus_rooms"
  | "process_effect_slots"
  | "temporary_effect_update_loop"
  | "standards_damage_loop"
  | "deadline_pressure_targeting"
  | "frus_reward_milestones";

export interface LttpFrusTranslationPattern {
  id: LttpPatternId;
  frusMechanicId: FrusMechanicId;
  sourceFile: string;
  sourceSymbol: string;
  observedPattern: string;
  frusTranslation: string;
  currentImplementation: string;
  gameplayPayoff: string;
}

export interface LttpFrusTranslationReadout {
  sourceRepo: {
    ownerRepo: string;
    url: string;
    studiedFiles: readonly string[];
  };
  legalBoundary: string;
  patternCount: number;
  processEffectSlotModel: {
    maxTemporaryEffectSlots: number;
    activeExample: string;
  };
  patterns: readonly LttpFrusTranslationPattern[];
}

export const LTTP_FRUS_SOURCE_REPO = {
  ownerRepo: "JaredBrian/AsarUSALTTPDisassembly",
  url: "https://github.com/JaredBrian/AsarUSALTTPDisassembly",
  studiedFiles: [
    "Bank08.asm",
    "Bank1D.asm",
    "Bank1F.asm"
  ]
} as const;

export const FRUS_TEMPORARY_EFFECT_SLOT_COUNT = 10;
export const FRUS_DANNE_EGO_BOLT_SLOT_COUNT = 4;

export const LTTP_FRUS_TRANSLATION_PATTERNS: readonly LttpFrusTranslationPattern[] = [
  {
    id: "room_pointer_table",
    frusMechanicId: "data_driven_frus_rooms",
    sourceFile: "Bank1F.asm",
    sourceSymbol: "RoomData_ObjectDataPointers",
    observedPattern: "Rooms are reached through a compact table of data pointers instead of one giant painted poster.",
    frusTranslation: "FRUS production spaces stay as screen-sized rooms with data-driven exits, locks, and workflow objects.",
    currentImplementation: "FRUS_ROOM_GRAPH, AREA_REGISTRY, and questArchitecture expose room IDs, exits, required tools, and active slots.",
    gameplayPayoff: "Players learn the volume workflow by moving through readable rooms rather than parsing a crowded screen."
  },
  {
    id: "fixed_ancilla_slots",
    frusMechanicId: "process_effect_slots",
    sourceFile: "Bank08.asm",
    sourceSymbol: "AncillaObjectAllocation",
    observedPattern: "Short-lived action effects have bounded allocation costs and cannot grow without limit.",
    frusTranslation: "Temporary FRUS effects such as DANN-E Ego bolts, stamp bursts, and clue glows use fixed process-effect slots.",
    currentImplementation: `The DANN-E lurker now caps Ego bolts at ${FRUS_DANNE_EGO_BOLT_SLOT_COUNT} active slots inside the ${FRUS_TEMPORARY_EFFECT_SLOT_COUNT}-slot FRUS effect model.`,
    gameplayPayoff: "Hazards stay legible and fair, keeping the pressure readable on a 256x240 screen."
  },
  {
    id: "ancilla_main_loop",
    frusMechanicId: "temporary_effect_update_loop",
    sourceFile: "Bank08.asm",
    sourceSymbol: "Ancilla_Main / Ancilla_ExecuteObjects",
    observedPattern: "Temporary effects update in their own loop, separate from core sprite logic.",
    frusTranslation: "FRUS workflow effects are treated as process overlays, not as new characters or extra decision makers.",
    currentImplementation: "DANN-E's projectiles, boasts, and pressure pulses update inside DanneLurker while StateChat remains terminal-only.",
    gameplayPayoff: "The game can dramatize deadline pressure without confusing the player about who has human authority."
  },
  {
    id: "sprite_damage_loop",
    frusMechanicId: "standards_damage_loop",
    sourceFile: "Bank08.asm",
    sourceSymbol: "Bomb_CheckSpriteDamage",
    observedPattern: "A repeated hitbox pass tests active objects, applies damage, and pushes the target back.",
    frusTranslation: "Unsafe FRUS shortcuts and DANN-E hits debit reliability hearts through standardsDamage instead of generic health.",
    currentImplementation: "Ego-bolt hits apply missed_30_year_deadline damage; unsafe editorial actions can apply Kellogg-standard violations.",
    gameplayPayoff: "The player's heart meter teaches that the danger is violating FRUS standards, not defeating people."
  },
  {
    id: "direction_to_player",
    frusMechanicId: "deadline_pressure_targeting",
    sourceFile: "Bank1D.asm",
    sourceSymbol: "Sprite4_DirectionToFacePlayer",
    observedPattern: "Enemies use small direction helpers to face, chase, or pressure the player.",
    frusTranslation: "DANN-E aims FRUS deadline Ego bolts and pressure toward the player's current foot position.",
    currentImplementation: "DanneLurker derives a normalized vector from its current position to the player and renders only snapped pixels.",
    gameplayPayoff: "Threats feel intentional while preserving four-direction movement and pixel discipline."
  },
  {
    id: "milestone_item_table",
    frusMechanicId: "frus_reward_milestones",
    sourceFile: "Bank08.asm",
    sourceSymbol: "Ancilla_MilestoneItem",
    observedPattern: "Major progress rewards are represented as clear, reusable milestone item effects.",
    frusTranslation: "FRUS pendants, equity crystals, process stamps, and the Buckram Key mark workflow completion.",
    currentImplementation: "frusProgression, dungeonKeys, and adventureSubscreen expose pendants, crystals, small keys, big keys, and stamps from GameState.",
    gameplayPayoff: "The player sees the FRUS volume becoming publishable through concrete adventure-game rewards."
  }
];

export function getLttpFrusTranslationReadout(): LttpFrusTranslationReadout {
  return {
    sourceRepo: LTTP_FRUS_SOURCE_REPO,
    legalBoundary: "Mechanics grammar only: no Nintendo code, art, music, maps, names, text, or exact puzzle layouts are copied.",
    patternCount: LTTP_FRUS_TRANSLATION_PATTERNS.length,
    processEffectSlotModel: {
      maxTemporaryEffectSlots: FRUS_TEMPORARY_EFFECT_SLOT_COUNT,
      activeExample: `DANN-E Ego bolts use ${FRUS_DANNE_EGO_BOLT_SLOT_COUNT} of those slots at most.`
    },
    patterns: LTTP_FRUS_TRANSLATION_PATTERNS
  };
}
