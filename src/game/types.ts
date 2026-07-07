import type Phaser from "phaser";
import type { AreaId, CHARACTERS, Direction, PROCESS_ROLES, ProcessItemId, ProcessStampId, RoomType } from "./constants";
import type {
  FirstHourTrainingBeatId,
  FirstHourTrainingCoverageReadout,
  FirstHourTrainingDrillId,
  FirstHourTrainingPhaseId
} from "./firstHourTraining";

export type CharacterId = keyof typeof CHARACTERS;
export type ProcessRole = (typeof PROCESS_ROLES)[number];

export type ProposalKind =
  | "mechanical"
  | "evidence_bound"
  | "ambiguous"
  | "classification"
  | "provenance"
  | "publication_status";

export type GameMode = "boot" | "title" | "explore" | "dialog" | "choice" | "pause" | "ending" | "debug";
export type PlayerAnimationState =
  | "idle_down"
  | "idle_up"
  | "idle_left"
  | "idle_right"
  | "walk_down"
  | "walk_up"
  | "walk_left"
  | "walk_right";

export type PlayerControlState = "idle" | "walk" | "attack" | "hurt" | "use_item";

export interface PlayerCombatReadout {
  state: PlayerControlState;
  actionActive: boolean;
  actionMsRemaining: number;
  invulnerable: boolean;
  invulnerableMsRemaining: number;
  hitbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

export interface AdventureHudItemSlot {
  id: ProcessItemId;
  displayName: string;
  shortLabel: string;
  hudSlot: number;
  acquired: boolean;
  equipped: boolean;
}

export interface AdventureHudReadout {
  confidence: {
    current: number;
    max: number;
    meter: string;
  };
  clarity: {
    current: number;
    max: number;
    meter: string;
  };
  documentPoints: number;
  equippedItem: AdventureHudItemSlot | null;
  secondarySlotLabel: string;
  inventoryStrip: AdventureHudItemSlot[];
  stamps: string;
  fragments: {
    current: number;
    total: number;
  };
}

export interface AdventureTrainingReadout {
  verb: "READ" | "CHOOSE" | "ACT" | "EXPLORE" | "UNLOCK" | "KEY" | "MAP" | "BOSS" | "RETURN" | "GOAL";
  text: string;
  detail: string;
  sourceBeatId: FirstHourTrainingBeatId;
  phase: FirstHourTrainingPhaseId;
  phaseLabel: string;
  drillId: FirstHourTrainingDrillId;
  drillLabel: string;
  drillMinuteRange: string;
  drillObjective: string;
}

export type OneHourTrainingReadout = FirstHourTrainingCoverageReadout;

export interface Position {
  x: number;
  y: number;
}

export type VolumeWorkflowState =
  | "charter"
  | "research"
  | "candidate_selection"
  | "source_note_verification"
  | "annotation"
  | "declassification_review"
  | "referral_resolution"
  | "editing"
  | "proofing"
  | "final_assembly"
  | "published";

export type DocumentWorkflowState =
  | "found"
  | "candidate"
  | "selected"
  | "source_note_needed"
  | "citation_verified"
  | "annotation_needed"
  | "ready_for_review"
  | "submitted_for_review"
  | "referred"
  | "cleared"
  | "excised"
  | "denied"
  | "appeal_needed"
  | "ready_for_proof"
  | "proofed"
  | "published";

export type ReviewStatus =
  | "not_submitted"
  | "submitted"
  | "referred"
  | "cleared"
  | "excised"
  | "denied"
  | "appeal_needed"
  | "resolved";

export type AgencyEquity = {
  agencyId: string;
  fictionalName: string;
  issueType: "intelligence" | "military" | "diplomatic" | "foreign_government" | "privacy";
  response: ReviewStatus;
};

export type DocumentCandidate = {
  id: string;
  title: string;
  date: string;
  type: "telegram" | "memorandum" | "memorandum_of_conversation" | "airgram" | "letter" | "briefing_paper" | "editorial_note";
  repository: string;
  collection: string;
  folder: string;
  policyTheme: string;
  significance: number;
  uniqueness: number;
  citationComplete: boolean;
  annotationNeeded: boolean;
  sensitivityRisk: number;
  selected: boolean;
  undisclosedDeletion: boolean;
  workflowState: DocumentWorkflowState;
  reviewStatus: ReviewStatus;
  equities: AgencyEquity[];
};

export type WorkflowTool =
  | "citation_stamp"
  | "source_note_card"
  | "cross_reference_thread"
  | "referral_manifest"
  | "excision_bracket_marker"
  | "red_pencil"
  | "proof_lens"
  | "buckram_key";

export interface VolumeMetrics {
  scholarlyReliability: number;
  readerClarity: number;
  clearanceProgress: number;
  publicationReadiness: number;
  delayPressure: number;
}

export type QuestObjectSlotKind =
  | "player"
  | "document"
  | "npc"
  | "workstation"
  | "terminal"
  | "blocker"
  | "reward"
  | "gate";

export type GameObjectSlot =
  | "player"
  | "npc_1"
  | "npc_2"
  | "npc_3"
  | "npc_4"
  | "tool_active"
  | "tool_secondary"
  | "document_1"
  | "document_2"
  | "document_3"
  | "document_4"
  | "document_5"
  | "room_reward"
  | "room_gate"
  | "terminal"
  | "manuscript"
  | "transition_marker"
  | "ui_prompt"
  | "reserved";

export interface QuestObjectSlot {
  slot: GameObjectSlot;
  id: string;
  displayName: string;
  kind: QuestObjectSlotKind;
  roomId: string;
  grid: Position;
  pixel: Position;
  activeWhen?: string;
  documentState?: DocumentWorkflowState;
  requiredTool?: ProcessItemId;
  rewardItem?: ProcessItemId;
  rewardStamp?: ProcessStampId;
}

export type QuestObject = {
  id: string;
  slot: GameObjectSlot;
  kind: string;
  x: number;
  y: number;
  facing?: "up" | "down" | "left" | "right";
  state?: string;
  active: boolean;
  interactable: boolean;
};

export interface TileGridRoomDefinition {
  id: string;
  area: AreaId;
  title: string;
  roomType: RoomType;
  grid: Position;
  tileSize: number;
  widthTiles: number;
  heightTiles: number;
  hudRows: number;
  layout: string[];
  exits: Partial<Record<Direction, string>>;
  lockedExits: Partial<Record<Direction, string>>;
  requiredItems: Partial<Record<Direction, ProcessItemId>>;
  objectSlotIds: string[];
}

export type NpcBehaviorState = "idle" | "patrol" | "hint" | "blocking" | "reward" | "done";

export interface NpcBehaviorDefinition {
  npcId: string;
  roomId: string;
  state: NpcBehaviorState;
  cue: string;
}

export interface ToolPriorityRule {
  id: string;
  priority: number;
  verb: "inspect" | "carry" | "route" | "verify" | "stamp" | "use-tool" | "talk";
  targetKind: QuestObjectSlotKind | "any";
  toolId?: WorkflowTool;
  resolvesState?: DocumentWorkflowState;
  message: string;
}

export interface QuestMilestone {
  id: string;
  counter: "documents" | "stamps" | "fragments" | "verifiedFlags" | "clearedBlockers";
  threshold: number;
  rewardItem?: ProcessItemId;
  rewardStamp?: ProcessStampId;
  volumeState: VolumeWorkflowState;
}

export interface WorkflowDocument {
  id: string;
  displayName: string;
  state: DocumentWorkflowState;
  roomId: string;
  needsHumanReview: boolean;
  reviewStatus?: ReviewStatus;
  selected?: boolean;
  citationComplete?: boolean;
  annotationNeeded?: boolean;
  sensitivityRisk?: number;
  undisclosedDeletion?: boolean;
}

export interface Interactable {
  id: string;
  label: string;
  x: number;
  y: number;
  radius?: number;
  kind: "npc" | "terminal" | "poster" | "document" | "door" | "manuscript" | "enemy";
  onInteract: () => void;
}

export interface ChoiceOption {
  key: "A" | "B" | "C" | "D";
  label: string;
  value?: string;
}

export interface RouteItem {
  label: string;
  network: "OpenNet" | "ClassNet";
  classification: "unclassified" | "sbu" | "classified" | "codeword";
}

export interface PlayerProfile {
  displayName: string;
  roleId: ProcessRole["id"];
  roleLabel: string;
  ability: string;
  remit: string;
  spriteKey: string;
  snesSpriteKey: string;
}
