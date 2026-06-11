import { FRUS_ROOM_GRAPH, GAME_HEIGHT, GAME_WIDTH, ITEM_REGISTRY } from "./constants";
import type { Direction, ProcessItemId, ProcessStampId } from "./constants";
import { documentToWorkflowDocument } from "./documentWorkflow";
import type {
  DocumentWorkflowState,
  DocumentCandidate,
  GameObjectSlot,
  NpcBehaviorDefinition,
  Position,
  QuestMilestone,
  QuestObject,
  QuestObjectSlot,
  TileGridRoomDefinition,
  ToolPriorityRule,
  VolumeMetrics,
  VolumeWorkflowState,
  WorkflowDocument
} from "./types";

export const TILE_SIZE = 16;
export const HALF_TILE = 8;
export const PLAYER_GRID_CORRECTION = 1;
export const QUEST_TILE_SIZE = TILE_SIZE;
export const QUEST_HALF_TILE = HALF_TILE;
export const GAME_OBJECT_SLOT_ORDER: readonly GameObjectSlot[] = [
  "player",
  "npc_1",
  "npc_2",
  "npc_3",
  "npc_4",
  "tool_active",
  "tool_secondary",
  "document_1",
  "document_2",
  "document_3",
  "document_4",
  "document_5",
  "room_reward",
  "room_gate",
  "terminal",
  "manuscript",
  "transition_marker",
  "ui_prompt",
  "reserved"
] as const;
export const QUEST_OBJECT_REGISTRY_CAPACITY = GAME_OBJECT_SLOT_ORDER.length;
export const QUEST_ROOM_WIDTH_TILES = GAME_WIDTH / QUEST_TILE_SIZE;
export const QUEST_ROOM_HEIGHT_TILES = GAME_HEIGHT / QUEST_TILE_SIZE;
export const QUEST_HUD_ROWS = 2;

export interface HalfTileCorrectionInput {
  position: Position;
  direction: Direction;
  canOccupy: (position: Position) => boolean;
  bounds?: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  step?: number;
}

export interface QuestArchitectureContext {
  currentScene: string;
  objective: string;
  reliability: number;
  heldItem: string | null;
  player: Position;
  playerFacing: Direction;
  documentCandidates: DocumentCandidate[];
  documentPoints: number;
  inventory: string[];
  volumeFragments: string[];
  processStamps: ProcessStampId[];
  visibleThreats: Array<{ status?: string }>;
  physicalVerification: {
    completed: number;
    total: number;
    flags: Array<{ id: string; status: string }>;
  } | null;
  roomTraversal: {
    currentRoomId: string;
    visitedRoomIds: string[];
    revealedRoomIds?: string[];
  } | null;
}

export const QUEST_OBJECT_REGISTRY: readonly QuestObjectSlot[] = [
  {
    slot: "player",
    id: "player",
    displayName: "FRUS production player",
    kind: "player",
    roomId: "CURRENT",
    grid: { x: 8, y: 11 },
    pixel: { x: 128, y: 184 }
  },
  {
    slot: "document_1",
    id: "source_note_047",
    displayName: "Source Note 47",
    kind: "document",
    roomId: "A1",
    grid: { x: 8, y: 10 },
    pixel: { x: 128, y: 164 },
    documentState: "source_note_needed",
    requiredTool: "citation_stamp"
  },
  {
    slot: "document_2",
    id: "telegram_001",
    displayName: "Telegram",
    kind: "document",
    roomId: "A1",
    grid: { x: 4, y: 8 },
    pixel: { x: 68, y: 124 },
    documentState: "found"
  },
  {
    slot: "document_3",
    id: "cross_reference_001",
    displayName: "Published FRUS cross-reference",
    kind: "document",
    roomId: "A1",
    grid: { x: 12, y: 8 },
    pixel: { x: 188, y: 124 },
    documentState: "candidate"
  },
  {
    slot: "manuscript",
    id: "research_table",
    displayName: "Research Table",
    kind: "workstation",
    roomId: "A1",
    grid: { x: 8, y: 7 },
    pixel: { x: 128, y: 116 }
  },
  {
    slot: "terminal",
    id: "statechat_archive_terminal",
    displayName: "StateChat archive terminal",
    kind: "terminal",
    roomId: "A1",
    grid: { x: 13, y: 4 },
    pixel: { x: 202, y: 66 }
  },
  {
    slot: "room_gate",
    id: "no_repo_wall",
    displayName: "NO REPO wall",
    kind: "blocker",
    roomId: "A1",
    grid: { x: 6, y: 9 },
    pixel: { x: 102, y: 149 },
    requiredTool: "citation_stamp"
  },
  {
    slot: "terminal",
    id: "opennet_terminal",
    displayName: "OpenNet terminal",
    kind: "terminal",
    roomId: "A2",
    grid: { x: 5, y: 7 },
    pixel: { x: 72, y: 105 },
    requiredTool: "clearance_token"
  },
  {
    slot: "room_gate",
    id: "firewall_door",
    displayName: "FIREWALL door",
    kind: "blocker",
    roomId: "A2",
    grid: { x: 8, y: 12 },
    pixel: { x: 128, y: 194 },
    requiredTool: "clearance_token"
  },
  {
    slot: "tool_secondary",
    id: "referral_tray",
    displayName: "Referral tray",
    kind: "workstation",
    roomId: "B1",
    grid: { x: 8, y: 8 },
    pixel: { x: 128, y: 122 },
    requiredTool: "concurrence_slip"
  },
  {
    slot: "room_gate",
    id: "pending_wall",
    displayName: "PENDING wall",
    kind: "blocker",
    roomId: "B1",
    grid: { x: 12, y: 10 },
    pixel: { x: 190, y: 162 },
    requiredTool: "concurrence_slip"
  },
  {
    slot: "transition_marker",
    id: "wait_wall",
    displayName: "WAIT wall",
    kind: "blocker",
    roomId: "B1",
    grid: { x: 4, y: 10 },
    pixel: { x: 68, y: 162 }
  },
  {
    slot: "npc_1",
    id: "human_specialist",
    displayName: "Human specialist",
    kind: "npc",
    roomId: "B2",
    grid: { x: 5, y: 7 },
    pixel: { x: 74, y: 118 }
  },
  {
    slot: "room_gate",
    id: "golden_rule_gate",
    displayName: "Golden Rule gate",
    kind: "gate",
    roomId: "B2",
    grid: { x: 8, y: 12 },
    pixel: { x: 128, y: 199 },
    requiredTool: "buckram_key"
  },
  {
    slot: "document_4",
    id: "ambiguous_wall",
    displayName: "AMBIGUOUS wall",
    kind: "blocker",
    roomId: "B2",
    grid: { x: 6, y: 10 },
    pixel: { x: 94, y: 164 },
    requiredTool: "review_folder"
  },
  {
    slot: "room_gate",
    id: "danne_queue_wall",
    displayName: "DANN-E QUEUE wall",
    kind: "blocker",
    roomId: "B2",
    grid: { x: 11, y: 10 },
    pixel: { x: 178, y: 166 }
  },
  {
    slot: "room_reward",
    id: "source_stamp_reward",
    displayName: "Citation Stamp reward",
    kind: "reward",
    roomId: "D1",
    grid: { x: 8, y: 6 },
    pixel: { x: 128, y: 88 },
    rewardItem: "citation_stamp",
    rewardStamp: "archive"
  },
  {
    slot: "terminal",
    id: "opennet_workstation",
    displayName: "OpenNet workstation",
    kind: "workstation",
    roomId: "SilentReadScene",
    grid: { x: 3, y: 12 },
    pixel: { x: 42, y: 190 }
  },
  {
    slot: "tool_secondary",
    id: "classnet_workstation",
    displayName: "ClassNet workstation",
    kind: "workstation",
    roomId: "SilentReadScene",
    grid: { x: 13, y: 12 },
    pixel: { x: 214, y: 190 }
  },
  {
    slot: "tool_active",
    id: "editor_desk",
    displayName: "Editor desk",
    kind: "workstation",
    roomId: "SilentReadScene",
    grid: { x: 5, y: 11 },
    pixel: { x: 78, y: 176 },
    rewardItem: "red_pencil"
  },
  {
    slot: "manuscript",
    id: "proof_table",
    displayName: "Proof table",
    kind: "workstation",
    roomId: "SilentReadScene",
    grid: { x: 8, y: 12 },
    pixel: { x: 128, y: 188 },
    rewardItem: "proof_lens"
  },
  {
    slot: "room_gate",
    id: "buckram_gate",
    displayName: "Buckram Gate",
    kind: "gate",
    roomId: "G1",
    grid: { x: 8, y: 8 },
    pixel: { x: 128, y: 128 },
    requiredTool: "buckram_key"
  }
] as const;

export const NPC_BEHAVIOR_STATES: readonly NpcBehaviorDefinition[] = [
  { npcId: "elena", roomId: "O1", state: "hint", cue: "Golden Rule reminder" },
  { npcId: "marcus", roomId: "N1", state: "blocking", cue: "Network routing check" },
  { npcId: "priya", roomId: "SilentReadScene", state: "hint", cue: "AI annotation review stays terminal-only" },
  { npcId: "human_specialist", roomId: "B2", state: "reward", cue: "Resolves ambiguous flags" }
] as const;

export const TOOL_PRIORITY_RULES: readonly ToolPriorityRule[] = [
  {
    id: "tool-01-citation-stamp",
    priority: 1,
    verb: "use-tool",
    targetKind: "document",
    toolId: "citation_stamp",
    resolvesState: "citation_verified",
    message: "Citation Stamp verifies provenance and clears source-note locks."
  },
  {
    id: "tool-02-source-note-card",
    priority: 2,
    verb: "carry",
    targetKind: "document",
    toolId: "source_note_card",
    resolvesState: "source_note_needed",
    message: "Source Note Card carries the repository trail."
  },
  {
    id: "tool-03-cross-reference-thread",
    priority: 3,
    verb: "inspect",
    targetKind: "document",
    toolId: "cross_reference_thread",
    resolvesState: "annotation_needed",
    message: "Cross-Reference Thread checks publication status and related notes."
  },
  {
    id: "tool-04-referral-manifest",
    priority: 4,
    verb: "route",
    targetKind: "workstation",
    toolId: "referral_manifest",
    resolvesState: "referred",
    message: "Referral Manifest routes agency equities to human queues."
  },
  {
    id: "tool-05-excision-bracket-marker",
    priority: 5,
    verb: "use-tool",
    targetKind: "document",
    toolId: "excision_bracket_marker",
    resolvesState: "excised",
    message: "Excision Bracket Marker makes withheld text visible."
  },
  {
    id: "tool-06-red-pencil",
    priority: 6,
    verb: "use-tool",
    targetKind: "document",
    toolId: "red_pencil",
    resolvesState: "ready_for_review",
    message: "Red Pencil applies editor judgment to unsupported text."
  },
  {
    id: "tool-07-proof-lens",
    priority: 7,
    verb: "use-tool",
    targetKind: "document",
    toolId: "proof_lens",
    resolvesState: "proofed",
    message: "Proof Lens reveals tiny discrepancies during silent read."
  },
  {
    id: "tool-08-buckram-key",
    priority: 8,
    verb: "use-tool",
    targetKind: "gate",
    toolId: "buckram_key",
    resolvesState: "published",
    message: "Buckram Key opens the publication gate after certification."
  }
] as const;

export const QUEST_MILESTONES: readonly QuestMilestone[] = [
  {
    id: "golden-rule-charter",
    counter: "stamps",
    threshold: 1,
    rewardStamp: "rule",
    volumeState: "research"
  },
  {
    id: "source-note-stamped",
    counter: "documents",
    threshold: 3,
    rewardItem: "citation_stamp",
    rewardStamp: "archive",
    volumeState: "source_note_verification"
  },
  {
    id: "network-route-cleared",
    counter: "stamps",
    threshold: 3,
    rewardItem: "clearance_token",
    volumeState: "declassification_review"
  },
  {
    id: "referral-finished",
    counter: "stamps",
    threshold: 4,
    rewardItem: "concurrence_slip",
    volumeState: "referral_resolution"
  },
  {
    id: "physical-flags-reviewed",
    counter: "verifiedFlags",
    threshold: 5,
    rewardItem: "proof_lens",
    rewardStamp: "proof",
    volumeState: "proofing"
  },
  {
    id: "cover-assembled",
    counter: "fragments",
    threshold: 5,
    rewardItem: "buckram_key",
    volumeState: "final_assembly"
  }
] as const;

export function applyHalfTileMovementCorrection(input: HalfTileCorrectionInput): Position {
  const { direction, canOccupy, position } = input;
  const axis = direction === "east" || direction === "west" ? "y" : "x";
  const bounds = input.bounds;
  const step = input.step ?? PLAYER_GRID_CORRECTION;
  const origin = axis === "y" ? QUEST_TILE_SIZE * QUEST_HUD_ROWS : 0;
  const target = origin + Math.round((position[axis] - origin) / QUEST_HALF_TILE) * QUEST_HALF_TILE;
  const distance = target - position[axis];
  if (Math.abs(distance) < 0.01 || Math.abs(distance) > QUEST_HALF_TILE) return position;

  const corrected: Position = { ...position };
  corrected[axis] = position[axis] + Math.sign(distance) * Math.min(Math.abs(distance), step);
  if (bounds) {
    corrected.x = clamp(corrected.x, bounds.left, bounds.right);
    corrected.y = clamp(corrected.y, bounds.top, bounds.bottom);
  }
  return canOccupy(corrected) ? corrected : position;
}

export const TILE_GRID_ROOM_DEFINITIONS: readonly TileGridRoomDefinition[] = FRUS_ROOM_GRAPH.map((room) => ({
  id: room.id,
  area: room.area,
  title: room.title,
  roomType: room.roomType,
  grid: room.grid,
  tileSize: QUEST_TILE_SIZE,
  widthTiles: QUEST_ROOM_WIDTH_TILES,
  heightTiles: QUEST_ROOM_HEIGHT_TILES,
  hudRows: QUEST_HUD_ROWS,
  layout: buildTileLayout(room.roomType),
  exits: { ...room.exits },
  lockedExits: { ...(room.lockedExits ?? {}) },
  requiredItems: { ...(room.requiredItems ?? {}) },
  objectSlotIds: QUEST_OBJECT_REGISTRY.filter((slot) => slot.roomId === room.id).map((slot) => slot.id)
}));

export function deriveWorkflowSnapshot(context: QuestArchitectureContext) {
  const volumeWorkflowState = deriveVolumeWorkflowState(context);
  const documentWorkflow = deriveDocumentWorkflow(context);
  const volumeMetrics = deriveVolumeMetrics(context);
  return {
    volumeWorkflowState,
    documentWorkflow,
    volumeMetrics,
    questCounters: getQuestCounterReadout(context),
    milestones: getQuestMilestoneReadout(context, volumeWorkflowState)
  };
}

export function getQuestArchitectureReadout(context: QuestArchitectureContext) {
  const activeRoomId = context.roomTraversal?.currentRoomId ?? sceneDefaultRoom(context.currentScene);
  const activeRoom = TILE_GRID_ROOM_DEFINITIONS.find((room) => room.id === activeRoomId) ?? null;
  const activeSlots = QUEST_OBJECT_REGISTRY.filter((slot) => (activeRoomId !== null && slot.roomId === activeRoomId) || slot.roomId === context.currentScene);
  const activeQuestObjects = getActiveQuestObjects(context, activeSlots);
  return {
    roomResolution: {
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      tileSize: QUEST_TILE_SIZE,
      widthTiles: QUEST_ROOM_WIDTH_TILES,
      heightTiles: QUEST_ROOM_HEIGHT_TILES,
      hudRows: QUEST_HUD_ROWS,
      scrollingCamera: false
    },
    objectRegistry: {
      capacity: QUEST_OBJECT_REGISTRY_CAPACITY,
      catalogSize: QUEST_OBJECT_REGISTRY.length,
      used: activeSlots.length,
      free: QUEST_OBJECT_REGISTRY_CAPACITY - activeSlots.length,
      slotOrder: GAME_OBJECT_SLOT_ORDER,
      activeRoomSlotIds: activeSlots.map((slot) => slot.id),
      activeRoomSlots: activeSlots.map((slot) => ({
        slot: slot.slot,
        id: slot.id,
        kind: slot.kind,
        displayName: slot.displayName
      }))
    },
    activeQuestObjects,
    activeTileRoom: activeRoom,
    toolPriorityRules: TOOL_PRIORITY_RULES,
    npcBehaviorStates: NPC_BEHAVIOR_STATES,
    milestones: getQuestMilestoneReadout(context, deriveVolumeWorkflowState(context))
  };
}

function getActiveQuestObjects(context: QuestArchitectureContext, activeSlots: readonly QuestObjectSlot[]): QuestObject[] {
  const playerObject: QuestObject = {
    id: "player",
    slot: "player",
    kind: "player",
    x: Math.round(context.player.x),
    y: Math.round(context.player.y),
    facing: compassToScreenDirection(context.playerFacing),
    state: context.heldItem ? "carrying" : "idle",
    active: true,
    interactable: false
  };

  return [
    playerObject,
    ...activeSlots
      .filter((slot) => slot.id !== "player")
      .map((slot) => ({
        id: slot.id,
        slot: slot.slot,
        kind: slot.kind,
        x: Math.round(slot.pixel.x),
        y: Math.round(slot.pixel.y),
        state: slot.documentState ?? slot.activeWhen ?? slot.rewardItem ?? slot.rewardStamp ?? slot.requiredTool,
        active: true,
        interactable: slot.kind !== "player"
      }))
  ];
}

function deriveVolumeWorkflowState(context: QuestArchitectureContext): VolumeWorkflowState {
  const states = context.documentCandidates.map((document) => document.workflowState);
  if (states.some((state) => state === "published")) return "published";
  if (states.some((state) => state === "proofed") || states.some((state) => state === "ready_for_proof")) return "proofing";
  if (states.some((state) => state === "cleared" || state === "excised" || state === "denied" || state === "appeal_needed")) return "referral_resolution";
  if (states.some((state) => state === "referred" || state === "submitted_for_review")) return "declassification_review";
  if (states.some((state) => state === "ready_for_review" || state === "annotation_needed")) return "editing";
  if (states.some((state) => state === "citation_verified")) return "annotation";
  if (states.some((state) => state === "source_note_needed")) return "source_note_verification";
  if (states.some((state) => state === "selected" || state === "candidate")) return "candidate_selection";
  if (context.currentScene === "EndingScene" && hasItem(context, "buckram_key") && context.volumeFragments.length >= 5) return "published";
  if (hasItem(context, "buckram_key") || context.volumeFragments.length >= 5) return "final_assembly";
  if (context.processStamps.includes("proof") || hasItem(context, "proof_lens")) return "proofing";
  if (hasItem(context, "red_pencil") || context.processStamps.includes("sop")) return "editing";
  if (context.processStamps.includes("referral") || hasItem(context, "concurrence_slip")) return "referral_resolution";
  if (context.processStamps.includes("network") || hasItem(context, "clearance_token")) return "declassification_review";
  if (context.processStamps.includes("archive") || hasItem(context, "citation_stamp")) return "annotation";
  if (context.heldItem?.toLowerCase().includes("source note")) return "source_note_verification";
  if (context.documentPoints >= 6 || context.inventory.some((item) => /telegram|cross-ref|source note/i.test(item))) return "candidate_selection";
  if (context.processStamps.includes("rule")) return "research";
  return "charter";
}

function deriveDocumentWorkflow(context: QuestArchitectureContext): WorkflowDocument[] {
  if (context.documentCandidates.length) return context.documentCandidates.map(documentToWorkflowDocument);

  const sourceState = deriveSourceNoteState(context);
  const proofState: DocumentWorkflowState = context.currentScene === "EndingScene" && context.volumeFragments.length >= 5
    ? "published"
    : context.processStamps.includes("proof")
      ? "proofed"
      : hasItem(context, "proof_lens")
        ? "ready_for_proof"
        : context.processStamps.includes("referral")
          ? "cleared"
          : "found";
  const crossReferenceState = hasItem(context, "clearance_token")
    ? "submitted_for_review"
    : context.inventory.some((item) => /cross-ref|cross-reference/i.test(item))
      ? "selected"
      : "found";

  return [
    {
      id: "source_note_047",
      displayName: "Source Note 47",
      state: sourceState,
      roomId: "A1",
      needsHumanReview: sourceState !== "citation_verified" && sourceState !== "published"
    },
    {
      id: "cross_reference_001",
      displayName: "Published FRUS cross-reference",
      state: crossReferenceState,
      roomId: "A1",
      needsHumanReview: crossReferenceState !== "submitted_for_review"
    },
    {
      id: "proof_page_412",
      displayName: "Proof Page 412",
      state: proofState,
      roomId: "SilentReadScene",
      needsHumanReview: proofState !== "proofed" && proofState !== "published"
    }
  ];
}

function deriveSourceNoteState(context: QuestArchitectureContext): DocumentWorkflowState {
  if (context.currentScene === "EndingScene" && context.volumeFragments.length >= 5) return "published";
  if (context.processStamps.includes("proof")) return "ready_for_proof";
  if (context.processStamps.includes("referral")) return "cleared";
  if (context.processStamps.includes("network")) return "submitted_for_review";
  if (context.processStamps.includes("archive") || hasItem(context, "citation_stamp")) return "citation_verified";
  if (context.heldItem?.toLowerCase().includes("source note")) return "source_note_needed";
  if (context.inventory.some((item) => /source note/i.test(item))) return "selected";
  if (context.documentPoints > 0) return "candidate";
  return "found";
}

function deriveVolumeMetrics(context: QuestArchitectureContext): VolumeMetrics {
  const stampScore = context.processStamps.length * 10;
  const itemScore = ITEM_REGISTRY.filter((item) => hasItem(context, item.id)).length * 6;
  const fragmentScore = context.volumeFragments.length * 12;
  const verifiedScore = context.physicalVerification ? context.physicalVerification.completed * 5 : 0;
  const selectedScore = context.documentCandidates.filter((document) => document.selected).length * 6;
  const reviewScore = context.documentCandidates.filter((document) => document.reviewStatus === "cleared" || document.reviewStatus === "excised" || document.reviewStatus === "resolved").length * 8;
  const proofScore = context.documentCandidates.filter((document) => document.workflowState === "proofed" || document.workflowState === "published").length * 8;
  return {
    scholarlyReliability: clamp(context.reliability, 0, 100),
    readerClarity: clamp(30 + context.documentPoints + selectedScore + stampScore + verifiedScore, 0, 100),
    clearanceProgress: clamp(reviewScore + (hasItem(context, "clearance_token") ? 24 : 0) + (hasItem(context, "concurrence_slip") ? 24 : 0) + (context.processStamps.includes("referral") ? 20 : 0), 0, 100),
    publicationReadiness: clamp(fragmentScore + itemScore + proofScore + (context.processStamps.includes("proof") ? 18 : 0), 0, 100),
    delayPressure: clamp(80 - stampScore - verifiedScore - (hasItem(context, "concurrence_slip") ? 12 : 0) + Math.max(0, 80 - context.reliability) / 2, 0, 100)
  };
}

function getQuestCounterReadout(context: QuestArchitectureContext) {
  return {
    documents: context.documentCandidates.filter((document) => document.workflowState !== "found" || document.selected).length,
    stamps: context.processStamps.length,
    fragments: context.volumeFragments.length,
    verifiedFlags: context.physicalVerification?.completed ?? 0,
    clearedBlockers: context.visibleThreats.filter((threat) => threat.status === "cleared").length
  };
}

function getQuestMilestoneReadout(context: QuestArchitectureContext, activeState: VolumeWorkflowState) {
  const counters = getQuestCounterReadout(context);
  return QUEST_MILESTONES.map((milestone) => ({
    ...milestone,
    progress: counters[milestone.counter],
    complete: counters[milestone.counter] >= milestone.threshold || milestone.volumeState === activeState
  }));
}

function hasItem(context: QuestArchitectureContext, itemId: ProcessItemId) {
  const item = ITEM_REGISTRY.find((candidate) => candidate.id === itemId);
  if (!item) return false;
  return (
    context.inventory.includes(item.displayName) ||
    context.inventory.includes(item.label) ||
    item.aliases.some((alias) => context.inventory.includes(alias))
  );
}

function buildTileLayout(roomType: string) {
  const interior = roomType === "secret" ? "s" : roomType === "boss" ? "b" : roomType === "reward" ? "r" : roomType === "puzzle" ? "p" : ".";
  const rows: string[] = [];
  for (let y = 0; y < QUEST_ROOM_HEIGHT_TILES; y += 1) {
    if (y < QUEST_HUD_ROWS) rows.push("H".repeat(QUEST_ROOM_WIDTH_TILES));
    else if (y === QUEST_HUD_ROWS || y === QUEST_ROOM_HEIGHT_TILES - 1) rows.push("#".repeat(QUEST_ROOM_WIDTH_TILES));
    else rows.push(`#${interior.repeat(QUEST_ROOM_WIDTH_TILES - 2)}#`);
  }
  return rows;
}

function sceneDefaultRoom(sceneName: string) {
  if (sceneName === "OfficeScene") return "O1";
  if (sceneName === "GuideScene" || sceneName === "ArchiveScene") return "A1";
  if (sceneName === "NetworkScene") return "N1";
  if (sceneName === "ReferralVaultScene") return "R1";
  if (sceneName === "EndingScene") return "G1";
  return null;
}

function compassToScreenDirection(direction: Direction): QuestObject["facing"] {
  if (direction === "north") return "up";
  if (direction === "south") return "down";
  if (direction === "west") return "left";
  return "right";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
