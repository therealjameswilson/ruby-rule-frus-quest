import { AREA_REGISTRY, FRUS_ROOM_GRAPH, ITEM_REGISTRY, PROCESS_ROLES, PROCESS_STAMPS } from "./constants";
import type { AreaId, Direction, ProcessItemId, ProcessStampId, RoomType } from "./constants";
import {
  applyAgencyEquityResponse,
  applyDocumentWorkflowAction,
  applyDocumentWorkflowState,
  cloneDocumentCandidate,
  cloneInitialDocumentCandidates,
  documentToWorkflowDocument
} from "./documentWorkflow";
import type { DocumentWorkflowAction } from "./documentWorkflow";
import { deriveWorkflowSnapshot, getQuestArchitectureReadout } from "./questArchitecture";
import { getSnesAtlasReadout } from "./snesAtlas";
import type { QuestArchitectureContext } from "./questArchitecture";
import { WORKFLOW_TOOL_PRIORITY, WORKFLOW_TOOL_REGISTRY } from "./workflowTools";
import type {
  ChoiceOption,
  DocumentCandidate,
  DocumentWorkflowState,
  GameMode,
  PlayerProfile,
  Position,
  ReviewStatus,
  VolumeMetrics,
  VolumeWorkflowState,
  WorkflowTool,
  WorkflowDocument
} from "./types";

interface VisibleThreat {
  label: string;
  x: number;
  y: number;
  spriteKey?: string;
  behavior?: string;
  defeatMethod?: string;
  status?: string;
}

interface GameState {
  currentScene: string;
  mode: GameMode;
  objective: string;
  volumeWorkflowState: VolumeWorkflowState;
  documentCandidates: DocumentCandidate[];
  documentWorkflow: WorkflowDocument[];
  documentWorkflowLog: string[];
  volumeMetrics: VolumeMetrics;
  questCounters: {
    documents: number;
    stamps: number;
    fragments: number;
    verifiedFlags: number;
    clearedBlockers: number;
  };
  reliability: number;
  heldItem: string | null;
  documentPoints: number;
  inventory: string[];
  volumeFragments: string[];
  latestMessage: string;
  activeDialog: { speaker: string; text: string } | null;
  currentChoice: { title: string; options: ChoiceOption[] } | null;
  player: Position;
  playerFacing: Direction;
  nearestInteractable: string | null;
  visibleEntities: string[];
  visibleThreats: VisibleThreat[];
  sceneProgress: Record<string, number>;
  playerProfile: PlayerProfile;
  processStamps: ProcessStampId[];
  latestAbility: string;
  audioStatus: string;
  physicalVerification: PhysicalVerificationState | null;
  roomTraversal: RoomTraversalState | null;
  snesTransition: SnesTransitionState;
  finalGateCertification: FinalGateCertificationState | null;
}

const defaultRole = PROCESS_ROLES[0];

export interface PhysicalVerificationState {
  verb: "CARRY" | "ROUTE" | "VERIFY" | "STAMP" | "DONE";
  carriedItem: string | null;
  nearestStation: string | null;
  completed: number;
  total: number;
  flags: Array<{
    id: string;
    label: string;
    kind: string;
    destination: string;
    status: "waiting" | "carried" | "routed" | "verified" | "stamped";
  }>;
}

export interface RoomTraversalState {
  currentRoomId: string;
  roomTitle: string;
  roomType?: RoomType;
  visitedRoomIds: string[];
  revealedRoomIds?: string[];
  exits: Partial<Record<Direction, string>>;
  lockedExits?: Partial<Record<Direction, string>>;
  requiredItems?: Partial<Record<Direction, string>>;
}

export interface SnesTransitionRecord {
  style: "ruby_mosaic";
  fromScene: string;
  toScene?: string;
  fromRoomId?: string;
  toRoomId?: string;
  direction?: Direction;
  label: string;
  cellSize: number;
}

export interface SnesTransitionState {
  active: boolean;
  current: SnesTransitionRecord | null;
  last: SnesTransitionRecord | null;
}

export interface FinalGateCertificationState {
  status: "locked" | "ready" | "published";
  nearestGate: boolean;
  checklistComplete: boolean;
  certifiedBy: string | null;
  requiredItem: "Buckram Key";
  message: string;
}

export const gameState: GameState = {
  currentScene: "BootScene",
  mode: "boot",
  objective: "",
  volumeWorkflowState: "charter",
  documentCandidates: cloneInitialDocumentCandidates(),
  documentWorkflow: cloneInitialDocumentCandidates().map(documentToWorkflowDocument),
  documentWorkflowLog: [],
  volumeMetrics: {
    scholarlyReliability: 80,
    readerClarity: 30,
    clearanceProgress: 0,
    publicationReadiness: 0,
    delayPressure: 80
  },
  questCounters: {
    documents: 0,
    stamps: 0,
    fragments: 0,
    verifiedFlags: 0,
    clearedBlockers: 0
  },
  reliability: 80,
  heldItem: null,
  documentPoints: 0,
  inventory: [],
  volumeFragments: [],
  latestMessage: "",
  activeDialog: null,
  currentChoice: null,
  player: { x: 128, y: 160 },
  playerFacing: "south",
  nearestInteractable: null,
  visibleEntities: [],
  visibleThreats: [],
  sceneProgress: {},
  playerProfile: {
    displayName: "Sam",
    roleId: defaultRole.id,
    roleLabel: defaultRole.label,
    ability: defaultRole.ability,
    remit: defaultRole.remit,
    spriteKey: defaultRole.spriteKey,
    snesSpriteKey: defaultRole.snesSpriteKey
  },
  processStamps: [],
  latestAbility: "",
  audioStatus: "audio ready",
  physicalVerification: null,
  roomTraversal: null,
  snesTransition: {
    active: false,
    current: null,
    last: null
  },
  finalGateCertification: null
};

export function resetGameState() {
  gameState.currentScene = "TitleScene";
  gameState.mode = "title";
  gameState.objective = "Press start to verify.";
  gameState.reliability = 80;
  gameState.documentCandidates = cloneInitialDocumentCandidates();
  gameState.documentWorkflow = gameState.documentCandidates.map(documentToWorkflowDocument);
  gameState.documentWorkflowLog = [];
  gameState.heldItem = null;
  gameState.documentPoints = 0;
  gameState.inventory = [];
  gameState.volumeFragments = [];
  gameState.latestMessage = "";
  gameState.activeDialog = null;
  gameState.currentChoice = null;
  gameState.player = { x: 128, y: 160 };
  gameState.playerFacing = "south";
  gameState.nearestInteractable = null;
  gameState.visibleEntities = [];
  gameState.visibleThreats = [];
  gameState.sceneProgress = {};
  gameState.processStamps = [];
  gameState.latestAbility = "";
  gameState.physicalVerification = null;
  gameState.roomTraversal = null;
  gameState.snesTransition = { active: false, current: null, last: null };
  gameState.finalGateCertification = null;
  setPlayerProfile("Sam", defaultRole);
  refreshQuestWorkflowState();
}

export function setSceneState(sceneName: string, mode: GameMode, objective: string) {
  gameState.currentScene = sceneName;
  gameState.mode = mode;
  gameState.objective = objective;
  gameState.heldItem = null;
  gameState.nearestInteractable = null;
  gameState.visibleEntities = [];
  gameState.visibleThreats = [];
  gameState.activeDialog = null;
  gameState.currentChoice = null;
  gameState.physicalVerification = null;
  gameState.roomTraversal = null;
  gameState.finalGateCertification = null;
  refreshQuestWorkflowState();
}

export function setObjective(objective: string) {
  gameState.objective = objective;
  refreshQuestWorkflowState();
}

export function setHeldItem(label: string | null) {
  gameState.heldItem = label;
  refreshQuestWorkflowState();
}

export function setLatestMessage(message: string) {
  gameState.latestMessage = message;
}

export function setLatestAbility(message: string) {
  gameState.latestAbility = message;
}

export function setAudioStatus(message: string) {
  gameState.audioStatus = message;
}

export function setPhysicalVerificationState(state: PhysicalVerificationState | null) {
  gameState.physicalVerification = state;
  refreshQuestWorkflowState();
}

export function setFinalGateCertificationState(state: FinalGateCertificationState | null) {
  gameState.finalGateCertification = state;
  refreshQuestWorkflowState();
}

export function setGameMode(mode: GameMode, objective?: string) {
  gameState.mode = mode;
  if (objective) gameState.objective = objective;
  refreshQuestWorkflowState();
}

export function setRoomTraversalState(state: RoomTraversalState | null) {
  gameState.roomTraversal = state
    ? {
        ...state,
        visitedRoomIds: [...state.visitedRoomIds],
        revealedRoomIds: [...(state.revealedRoomIds ?? state.visitedRoomIds)]
      }
    : null;
  refreshQuestWorkflowState();
}

export function beginSnesTransition(record: Omit<SnesTransitionRecord, "style" | "cellSize">) {
  gameState.snesTransition = {
    active: true,
    current: {
      style: "ruby_mosaic",
      cellSize: 16,
      ...record
    },
    last: gameState.snesTransition.last
  };
}

export function completeSnesTransition() {
  gameState.snesTransition = {
    active: false,
    current: null,
    last: gameState.snesTransition.current ?? gameState.snesTransition.last
  };
}

export function setPlayerPosition(position: Position) {
  gameState.player = {
    x: Math.round(position.x),
    y: Math.round(position.y)
  };
}

export function setPlayerFacing(direction: Direction) {
  gameState.playerFacing = direction;
}

export function addInventoryItem(label: string) {
  if (!gameState.inventory.includes(label)) {
    gameState.inventory.push(label);
    refreshQuestWorkflowState();
  }
}

function processItemDefinition(itemId: ProcessItemId) {
  return ITEM_REGISTRY.find((item) => item.id === itemId);
}

export function hasProcessItem(itemId: ProcessItemId) {
  const item = processItemDefinition(itemId);
  if (!item) return false;
  return (
    gameState.inventory.includes(item.displayName) ||
    gameState.inventory.includes(item.label) ||
    item.aliases.some((alias) => gameState.inventory.includes(alias))
  );
}

export function addProcessItem(itemId: ProcessItemId) {
  const item = processItemDefinition(itemId);
  if (!item) return;
  addInventoryItem(item.displayName);
}

export function getProcessItemDefinition(itemId: ProcessItemId) {
  return processItemDefinition(itemId);
}

export function getProcessItemGateReadout(itemId: ProcessItemId) {
  const item = processItemDefinition(itemId);
  if (!item) return null;
  return {
    id: item.id,
    displayName: item.displayName,
    roomUnlocks: [...item.roomUnlocks],
    blockerWeaknesses: [...item.blockerWeaknesses]
  };
}

function areaRewardEarned(area: (typeof AREA_REGISTRY)[number]) {
  if (area.rewardType === "stamp") {
    return gameState.processStamps.includes(area.rewardId as ProcessStampId);
  }
  if (area.rewardType === "item") {
    return hasProcessItem(area.rewardId as ProcessItemId);
  }
  return gameState.finalGateCertification?.status === "published";
}

function currentAreaId(): AreaId {
  if (gameState.currentScene === "SilentReadScene") {
    return hasProcessItem("red_pencil") ? "silent_read_tower" : "editors_labyrinth";
  }
  if (gameState.currentScene === "EndingScene") return "buckram_gate";
  const area = AREA_REGISTRY.find((candidate) => candidate.scenes.some((scene) => scene === gameState.currentScene));
  return area?.id ?? "office_hub";
}

export function getAreaProgressReadout() {
  const activeAreaId = currentAreaId();
  return AREA_REGISTRY.map((area, index) => ({
    id: area.id,
    displayName: area.displayName,
    zeldaRole: area.zeldaRole,
    reward: area.reward,
    rewardType: area.rewardType,
    rewardId: area.rewardId,
    scenes: [...area.scenes],
    order: index,
    active: area.id === activeAreaId,
    completed: areaRewardEarned(area)
  }));
}

export function getCurrentAreaReadout() {
  return getAreaProgressReadout().find((area) => area.active) ?? getAreaProgressReadout()[0];
}

export function getRoomGraphReadout() {
  const visitedRoomIds = new Set(gameState.roomTraversal?.visitedRoomIds ?? []);
  const revealedRoomIds = new Set(gameState.roomTraversal?.revealedRoomIds ?? []);
  if (gameState.currentScene === "OfficeScene") {
    visitedRoomIds.add("O1");
    revealedRoomIds.add("O1");
  }
  if (gameState.currentScene === "NetworkScene") {
    visitedRoomIds.add("N1");
    revealedRoomIds.add("N1");
  }
  if (gameState.currentScene === "ReferralVaultScene") {
    visitedRoomIds.add("R1");
    revealedRoomIds.add("R1");
  }
  if (gameState.currentScene === "SilentReadScene") {
    visitedRoomIds.add("E1");
    revealedRoomIds.add("E1");
    revealedRoomIds.add("S1");
    if (hasProcessItem("proof_lens")) visitedRoomIds.add("S1");
  }
  if (gameState.currentScene === "EndingScene") {
    visitedRoomIds.add("G1");
    revealedRoomIds.add("G1");
  }
  return FRUS_ROOM_GRAPH.map((room) => ({
    id: room.id,
    area: room.area,
    title: room.title,
    exits: room.exits,
    lockedExits: room.lockedExits ?? {},
    requiredItems: room.requiredItems ?? {},
    roomType: room.roomType,
    visited: visitedRoomIds.has(room.id),
    revealed: revealedRoomIds.has(room.id) || visitedRoomIds.has(room.id) || room.roomType !== "secret"
  }));
}

export function getFinalGateReadiness() {
  const requiredStamps: ProcessStampId[] = ["rule", "archive", "network", "referral", "proof"];
  const missingStamps = requiredStamps.filter((stamp) => !gameState.processStamps.includes(stamp));
  const fragmentsNeeded = 5;
  const reliabilityMinimum = 70;
  const missingFragments = Math.max(0, fragmentsNeeded - gameState.volumeFragments.length);
  const reliabilityReady = gameState.reliability >= reliabilityMinimum;
  return {
    requiredStamps,
    missingStamps,
    fragmentsCollected: gameState.volumeFragments.length,
    fragmentsNeeded,
    missingFragments,
    reliability: gameState.reliability,
    reliabilityMinimum,
    reliabilityReady,
    stateChatMayOpenGate: false,
    ready: missingStamps.length === 0 && missingFragments === 0 && reliabilityReady
  };
}

export function addDocumentPoints(amount: number, reason: string) {
  gameState.documentPoints = Math.max(0, gameState.documentPoints + amount);
  const sign = amount >= 0 ? "+" : "";
  setLatestMessage(`${sign}${amount} document points: ${reason}`);
  refreshQuestWorkflowState();
}

export function addVolumeFragment(label: string) {
  if (!gameState.volumeFragments.includes(label)) {
    gameState.volumeFragments.push(label);
    setLatestMessage(`FRUS fragment found: ${label}`);
    refreshQuestWorkflowState();
  }
}

export function setNearestInteractable(label: string | null) {
  gameState.nearestInteractable = label;
}

export function setVisibleEntities(labels: string[]) {
  gameState.visibleEntities = labels;
}

export function setVisibleThreats(threats: VisibleThreat[]) {
  gameState.visibleThreats = threats.map((threat) => ({
    label: threat.label,
    x: Math.round(threat.x),
    y: Math.round(threat.y),
    spriteKey: threat.spriteKey,
    behavior: threat.behavior,
    defeatMethod: threat.defeatMethod,
    status: threat.status
  }));
  refreshQuestWorkflowState();
}

function getQuestArchitectureContext(): QuestArchitectureContext {
  return {
    currentScene: gameState.currentScene,
    objective: gameState.objective,
    reliability: gameState.reliability,
    heldItem: gameState.heldItem,
    player: { ...gameState.player },
    playerFacing: gameState.playerFacing,
    documentCandidates: gameState.documentCandidates.map(cloneDocumentCandidate),
    documentPoints: gameState.documentPoints,
    inventory: [...gameState.inventory],
    volumeFragments: [...gameState.volumeFragments],
    processStamps: [...gameState.processStamps],
    visibleThreats: gameState.visibleThreats.map((threat) => ({ status: threat.status })),
    finalGatePublished: gameState.finalGateCertification?.status === "published",
    physicalVerification: gameState.physicalVerification
      ? {
          completed: gameState.physicalVerification.completed,
          total: gameState.physicalVerification.total,
          flags: gameState.physicalVerification.flags.map((flag) => ({
            id: flag.id,
            status: flag.status
          }))
        }
      : null,
    roomTraversal: gameState.roomTraversal
      ? {
          currentRoomId: gameState.roomTraversal.currentRoomId,
          visitedRoomIds: [...gameState.roomTraversal.visitedRoomIds],
          revealedRoomIds: [...(gameState.roomTraversal.revealedRoomIds ?? [])]
        }
      : null
  };
}

export function refreshQuestWorkflowState() {
  const snapshot = deriveWorkflowSnapshot(getQuestArchitectureContext());
  gameState.volumeWorkflowState = snapshot.volumeWorkflowState;
  gameState.documentWorkflow = snapshot.documentWorkflow.length
    ? snapshot.documentWorkflow
    : gameState.documentCandidates.map(documentToWorkflowDocument);
  gameState.volumeMetrics = snapshot.volumeMetrics;
  gameState.questCounters = snapshot.questCounters;
}

export function getDocumentCandidateReadout() {
  return gameState.documentCandidates.map(cloneDocumentCandidate);
}

export function getDocumentWorkflowReadout() {
  refreshQuestWorkflowState();
  return gameState.documentWorkflow.map((document) => ({ ...document }));
}

export function advanceDocumentWorkflow(documentId: string, action: DocumentWorkflowAction, reason?: string) {
  const changed = updateDocumentCandidate(documentId, (document) => applyDocumentWorkflowAction(document, action), reason);
  return changed?.workflowState ?? null;
}

export function setDocumentWorkflowState(documentId: string, workflowState: DocumentWorkflowState, reason?: string) {
  const changed = updateDocumentCandidate(documentId, (document) => applyDocumentWorkflowState(document, workflowState), reason);
  return changed?.workflowState ?? null;
}

export function setAgencyEquityResponse(documentId: string, agencyId: string, response: ReviewStatus, reason?: string) {
  const changed = updateDocumentCandidate(documentId, (document) => applyAgencyEquityResponse(document, agencyId, response), reason);
  return changed?.reviewStatus ?? null;
}

export function markAsCandidate(documentId: string): void {
  setDocumentWorkflowState(documentId, "candidate", "marked as candidate");
}

export function selectDocument(documentId: string): void {
  setDocumentWorkflowState(documentId, "selected", "selected for volume");
}

export function verifyCitation(documentId: string): void {
  setDocumentWorkflowState(documentId, "citation_verified", "citation verified");
}

export function addAnnotation(documentId: string): void {
  setDocumentWorkflowState(documentId, "ready_for_review", "annotation added");
}

export function submitForReview(documentId: string): void {
  setDocumentWorkflowState(documentId, "submitted_for_review", "submitted for review");
}

export function routeReferral(documentId: string, agencyId: string): void {
  setDocumentWorkflowState(documentId, "referred", `routed to ${agencyId}`);
  setAgencyEquityResponse(documentId, agencyId, "referred");
}

export function resolveReview(documentId: string, result: ReviewStatus): void {
  if (result === "cleared" || result === "excised" || result === "denied" || result === "appeal_needed") {
    setDocumentWorkflowState(documentId, result, `review ${result}`);
    return;
  }
  if (result === "resolved") {
    setDocumentWorkflowState(documentId, "ready_for_proof", "review resolved");
    return;
  }
  if (result === "submitted") {
    setDocumentWorkflowState(documentId, "submitted_for_review", "review submitted");
    return;
  }
  if (result === "referred") {
    setDocumentWorkflowState(documentId, "referred", "review referred");
    return;
  }
  setDocumentWorkflowState(documentId, "ready_for_review", "review reset");
}

export function markReadyForProof(documentId: string): void {
  setDocumentWorkflowState(documentId, "ready_for_proof", "ready for proof");
}

export function proofDocument(documentId: string): void {
  setDocumentWorkflowState(documentId, "proofed", "proofed");
}

export function publishDocument(documentId: string): void {
  setDocumentWorkflowState(documentId, "published", "published");
}

function updateDocumentCandidate(documentId: string, updater: (document: DocumentCandidate) => DocumentCandidate, reason?: string): DocumentCandidate | null {
  let changed: DocumentCandidate | null = null;
  const nextDocuments: DocumentCandidate[] = [];
  for (const document of gameState.documentCandidates) {
    if (document.id !== documentId) {
      nextDocuments.push(document);
      continue;
    }
    changed = updater(document);
    nextDocuments.push(changed);
  }
  gameState.documentCandidates = nextDocuments;
  if (changed && reason) {
    const message = `${changed.title}: ${reason} -> ${changed.workflowState}`;
    gameState.documentWorkflowLog.push(message);
    gameState.documentWorkflowLog = gameState.documentWorkflowLog.slice(-12);
    setLatestMessage(message);
  }
  refreshQuestWorkflowState();
  return changed;
}

export function getQuestWorkflowReadout() {
  refreshQuestWorkflowState();
  const context = getQuestArchitectureContext();
  return {
    volumeState: gameState.volumeWorkflowState,
    candidates: getDocumentCandidateReadout(),
    documents: gameState.documentWorkflow,
    eventLog: [...gameState.documentWorkflowLog],
    workflowTools: getWorkflowToolReadout(),
    metrics: gameState.volumeMetrics,
    counters: gameState.questCounters,
    architecture: getQuestArchitectureReadout(context)
  };
}

export function setPlayerProfile(displayName: string, role: (typeof PROCESS_ROLES)[number]) {
  gameState.playerProfile = {
    displayName,
    roleId: role.id,
    roleLabel: role.label,
    ability: role.ability,
    remit: role.remit,
    spriteKey: role.spriteKey,
    snesSpriteKey: role.snesSpriteKey
  };
  refreshQuestWorkflowState();
}

export function awardProcessStamp(stampId: ProcessStampId) {
  if (!gameState.processStamps.includes(stampId)) {
    gameState.processStamps.push(stampId);
    refreshQuestWorkflowState();
  }
}

const HUD_STAMP_LABELS: Record<ProcessStampId, string> = {
  rule: "RULE",
  archive: "SOURCE",
  network: "NET",
  referral: "REF",
  sop: "SOP",
  proof: "READ"
};

function compactHudText(text: string, maxLength: number) {
  const normalized = text
    .replace(/^FRUS Fragment:\s*/i, "")
    .replace(/\.$/, "")
    .trim()
    .toUpperCase();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1))}.`;
}

function compactHeldItem(label: string | null) {
  if (!label) return "NONE";
  if (/review folder/i.test(label)) return compactHudText(label, 18);
  if (/mechanical/i.test(label)) return "MECH FIX";
  if (/opennet|cross-reference/i.test(label)) return "OPEN NOTE";
  if (/classnet/i.test(label)) return "CLASS NOTE";
  if (/referral|equity/i.test(label)) return "REF SLIP";
  if (/proof date/i.test(label)) return "PROOF DATE";
  return compactHudText(label, 18);
}

function reliabilityBlocks() {
  const filled = Math.round((Math.max(0, Math.min(100, gameState.reliability)) / 100) * 8);
  return `${"█".repeat(filled)}${"░".repeat(8 - filled)}`;
}

function stampReadout() {
  const earned = gameState.processStamps.map((stampId) => HUD_STAMP_LABELS[stampId]);
  return earned.length ? earned.join(" ") : "NONE";
}

function selectedItemReadout() {
  const held = compactHeldItem(gameState.physicalVerification?.carriedItem ?? gameState.heldItem);
  if (held !== "NONE") return held;
  const acquired = getProcessItemReadout().filter((item) => item.acquired);
  return acquired.at(-1)?.shortLabel ?? "NONE";
}

export function getProcessItemReadout() {
  return [...ITEM_REGISTRY].sort((a, b) => a.hudSlot - b.hudSlot).map((item) => {
    const acquired = hasProcessItem(item.id);
    return {
      id: item.id,
      displayName: item.displayName,
      label: item.displayName,
      shortLabel: item.shortLabel,
      icon: item.icon,
      texture: item.icon,
      roomUnlocks: [...item.roomUnlocks],
      blockerWeaknesses: [...item.blockerWeaknesses],
      pickupDialog: [...item.pickupDialog],
      hudSlot: item.hudSlot,
      zeldaFunction: item.zeldaFunction,
      frusMeaning: item.frusMeaning,
      acquired
    };
  });
}

export function hasWorkflowTool(toolId: WorkflowTool) {
  if (toolId === "citation_stamp") return hasProcessItem("citation_stamp");
  if (toolId === "source_note_card") {
    return Boolean(gameState.heldItem?.toLowerCase().includes("source note"))
      || gameState.inventory.some((item) => /source note/i.test(item))
      || gameState.documentCandidates.some((document) => document.id === "source_note_047" && document.workflowState !== "found");
  }
  if (toolId === "cross_reference_thread") {
    return gameState.inventory.some((item) => /cross-ref|cross-reference/i.test(item))
      || gameState.documentCandidates.some((document) => document.id === "cross_reference_001" && document.workflowState !== "found");
  }
  if (toolId === "referral_manifest") {
    return gameState.currentScene === "ReferralVaultScene"
      || gameState.documentCandidates.some((document) => document.reviewStatus === "referred" || document.workflowState === "referred")
      || hasProcessItem("concurrence_slip");
  }
  if (toolId === "excision_bracket_marker") {
    return gameState.currentScene === "ReferralVaultScene"
      || gameState.processStamps.includes("referral")
      || gameState.documentCandidates.some((document) => document.workflowState === "excised");
  }
  if (toolId === "red_pencil") return hasProcessItem("red_pencil");
  if (toolId === "proof_lens") return hasProcessItem("proof_lens");
  return hasProcessItem("buckram_key");
}

export function getAvailableWorkflowTools() {
  return WORKFLOW_TOOL_PRIORITY.filter((toolId) => hasWorkflowTool(toolId));
}

export function getWorkflowToolReadout() {
  const availableTools = new Set(getAvailableWorkflowTools());
  return WORKFLOW_TOOL_REGISTRY.map((tool) => ({
    ...tool,
    acquired: availableTools.has(tool.id)
  }));
}

export function getProductionStatusReadout() {
  const role = compactHudText(gameState.playerProfile.roleLabel, 12);
  const selectedItem = selectedItemReadout();
  const room = gameState.roomTraversal?.currentRoomId ?? getCurrentAreaReadout().displayName.toUpperCase();
  const objective = compactHudText(gameState.objective || "VERIFY", 32);
  return [
    `ROLE ${role.padEnd(12, " ")} REL ${reliabilityBlocks()} DOC ${String(gameState.documentPoints).padStart(2, "0")}`,
    `ITEM ${selectedItem.padEnd(10, " ")} STAMPS ${stampReadout()}`,
    `MAP ${compactHudText(room, 8).padEnd(8, " ")} FRAG ${gameState.volumeFragments.length}/5 ${objective}`
  ];
}

export function seedProgressForScene(sceneName: string) {
  if (["ArchiveScene", "NetworkScene", "ReferralVaultScene", "SilentReadScene", "EndingScene"].includes(sceneName)) {
    addProcessItem("citation_stamp");
    addVolumeFragment("Front Matter Fragment");
    gameState.documentPoints = Math.max(gameState.documentPoints, 15);
    setDocumentWorkflowState("telegram_001", "selected");
    setDocumentWorkflowState("source_note_047", "citation_verified");
    setDocumentWorkflowState("cross_reference_001", "selected");
  }
  if (["GuideScene", "ArchiveScene", "NetworkScene", "ReferralVaultScene", "SilentReadScene", "EndingScene"].includes(sceneName)) {
    awardProcessStamp("rule");
  }
  if (["NetworkScene", "ReferralVaultScene", "SilentReadScene", "EndingScene"].includes(sceneName)) {
    awardProcessStamp("archive");
    gameState.reliability = Math.max(gameState.reliability, 90);
    for (const item of ["Telegram", "Source Note", "Cross-Ref"]) {
      addInventoryItem(item);
    }
    addVolumeFragment("Source Note Fragment");
    gameState.documentPoints = Math.max(gameState.documentPoints, 30);
    setDocumentWorkflowState("source_note_047", "ready_for_review");
    setDocumentWorkflowState("cross_reference_001", "submitted_for_review");
  }
  if (["ReferralVaultScene", "SilentReadScene", "EndingScene"].includes(sceneName)) {
    awardProcessStamp("network");
    gameState.reliability = Math.max(gameState.reliability, 100);
    addProcessItem("clearance_token");
    addVolumeFragment("Routing Fragment");
    gameState.documentPoints = Math.max(gameState.documentPoints, 45);
    setDocumentWorkflowState("source_note_047", "submitted_for_review");
    setDocumentWorkflowState("sbu_annotation_001", "referred");
  }
  if (["SilentReadScene", "EndingScene"].includes(sceneName)) {
    awardProcessStamp("referral");
    addProcessItem("concurrence_slip");
    addProcessItem("review_folder");
    addVolumeFragment("Referral Fragment");
    gameState.documentPoints = Math.max(gameState.documentPoints, 60);
    setDocumentWorkflowState("source_note_047", "cleared");
    setDocumentWorkflowState("sbu_annotation_001", "excised");
    setDocumentWorkflowState("proof_page_412", "ready_for_proof");
  }
  if (sceneName === "EndingScene") {
    awardProcessStamp("sop");
    addInventoryItem("AI Annotation Review Log");
    addProcessItem("red_pencil");
    awardProcessStamp("proof");
    addProcessItem("proof_lens");
    addProcessItem("buckram_key");
    addVolumeFragment("Proof Fragment");
    gameState.documentPoints = Math.max(gameState.documentPoints, 80);
    setDocumentWorkflowState("telegram_001", "proofed");
    setDocumentWorkflowState("source_note_047", "proofed");
    setDocumentWorkflowState("cross_reference_001", "proofed");
    setDocumentWorkflowState("sbu_annotation_001", "proofed");
    setDocumentWorkflowState("proof_page_412", "proofed");
  }
  refreshQuestWorkflowState();
}

export function setDialogState(speaker: string, text: string) {
  gameState.mode = "dialog";
  gameState.activeDialog = { speaker, text };
  gameState.currentChoice = null;
}

export function clearDialogState(nextMode: GameMode = "explore") {
  gameState.mode = nextMode;
  gameState.activeDialog = null;
}

export function setChoiceState(title: string, options: ChoiceOption[]) {
  gameState.mode = "choice";
  gameState.currentChoice = { title, options };
  gameState.activeDialog = null;
}

export function clearChoiceState(nextMode: GameMode = "explore") {
  gameState.mode = nextMode;
  gameState.currentChoice = null;
}

export function renderGameToText() {
  const questWorkflow = getQuestWorkflowReadout();
  return JSON.stringify(
    {
      coordinateSystem: "origin top-left; x increases right; y increases down; logical canvas 256x240",
      scene: gameState.currentScene,
      mode: gameState.mode,
      objective: gameState.objective,
      volumeWorkflowState: gameState.volumeWorkflowState,
      documentCandidates: getDocumentCandidateReadout(),
      documentWorkflow: gameState.documentWorkflow,
      documentWorkflowLog: gameState.documentWorkflowLog,
      volumeMetrics: gameState.volumeMetrics,
      questCounters: gameState.questCounters,
      questWorkflow,
      snesAtlas: getSnesAtlasReadout(),
      reliability: gameState.reliability,
      productionHud: getProductionStatusReadout(),
      heldItem: gameState.heldItem,
      documentPoints: gameState.documentPoints,
      playerProfile: gameState.playerProfile,
      activePlayerSprite: {
        mode: "snes16",
        texture: gameState.playerProfile.snesSpriteKey,
        fallbackTexture: gameState.playerProfile.spriteKey,
        dimensions: { width: 32, height: 32 },
        logicalAnchor: "foot/interaction point",
        collisionBox: { width: 10, height: 10, offsetY: 2 }
      },
      processStamps: gameState.processStamps,
      processItems: getProcessItemReadout(),
      workflowTools: getWorkflowToolReadout(),
      areaProgress: getAreaProgressReadout(),
      currentArea: getCurrentAreaReadout(),
      roomGraph: getRoomGraphReadout(),
      volumeFragments: gameState.volumeFragments,
      frusPrize: {
        cover: "ruby FRUS cover",
        piecesEarned: gameState.volumeFragments.length,
        piecesTotal: 5,
        assembled: gameState.volumeFragments.length >= 5
      },
      finalGate: getFinalGateReadiness(),
      finalGateCertification: gameState.finalGateCertification,
      latestAbility: gameState.latestAbility,
      audioStatus: gameState.audioStatus,
      physicalVerification: gameState.physicalVerification,
      roomTraversal: gameState.roomTraversal,
      snesTransition: gameState.snesTransition,
      inventory: gameState.inventory,
      latestMessage: gameState.latestMessage,
      player: gameState.player,
      playerFacing: gameState.playerFacing,
      nearestInteractable: gameState.nearestInteractable,
      visibleEntities: gameState.visibleEntities,
      visibleThreats: gameState.visibleThreats,
      dialog: gameState.activeDialog,
      choice: gameState.currentChoice
    },
    null,
    2
  );
}
