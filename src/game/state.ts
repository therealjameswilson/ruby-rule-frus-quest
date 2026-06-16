import { CHARACTER_FRAME, getCharacterKeyForProcessRole } from "../art/characters";
import { getCodexReadout, unlockCodexEntry } from "./codex";
import { AREA_REGISTRY, FRUS_ROOM_GRAPH, ITEM_REGISTRY, PROCESS_ROLES, PROCESS_STAMPS, SCENE_ORDER } from "./constants";
import type { AreaId, Direction, ProcessItemId, ProcessStampId, RoomType } from "./constants";
import {
  applyAgencyEquityResponse,
  applyDocumentWorkflowState,
  cloneDocumentCandidate,
  cloneInitialDocumentCandidates,
  DOCUMENT_ROOM_LOOKUP,
  documentToWorkflowDocument,
  tryWorkflowAction
} from "./documentWorkflow";
import type { DocumentWorkflowAction } from "./documentWorkflow";
import {
  blockedExitPrompt,
  canTraverseExit,
  deriveWorkflowSnapshot,
  getQuestArchitectureReadout,
  getRevealedShortcutRoomIds
} from "./questArchitecture";
import { getSnesAtlasReadout, getSnesRoleFrameSheet } from "./snesAtlas";
import { DANNE_ITEM_CATALOG, TREATY_FRAGMENT_LABELS } from "./danneItemCatalog";
import type { DanneItemId } from "./danneItemCatalog";
import { AI_ANNOTATION_REVIEW_PROMPTS } from "./aiAnnotationReview";
import {
  crystalsEarned,
  equityCrystalDocuments,
  EQUITY_CRYSTAL_STATUSES,
  PENDANTS,
  totalEquities
} from "./frusProgression";
import { CHAPTER_RELEASE_PROMPTS } from "./chapterReleaseStatus";
import { DIGITAL_RELEASE_PROMPTS } from "./digitalRelease";
import { GPO_PUBLICATION_PROMPTS } from "./gpoPublication";
import { GPO_SEGMENT_ASSEMBLY_PROMPTS } from "./gpoSegmentAssembly";
import {
  getFrusProductionBoardReadout,
  type FrusProductionBoardStatus,
  type FrusProductionBoardStepId
} from "./frusProductionBoard";
import { getFrusProductionPhaseReadout, type FrusProductionPhaseId } from "./frusProductionPhases";
import { getPublicationApparatusReadout, type PublicationApparatusReadout } from "./publicationApparatus";
import { POLICY_COVERAGE_AUDIT_PROMPTS } from "./policyCoverageAudit";
import { PUBLIC_CITATION_CARD_PROMPTS } from "./publicCitationCard";
import { PUBLICATION_FUNDING_PROMPTS } from "./publicationFundingQueue";
import { READER_AID_REGISTER_PROMPTS } from "./readerAidRegisters";
import { REPOSITORY_COVERAGE_MAP_PROMPTS } from "./repositoryCoverageMap";
import { RESEARCH_CHARTER_PROMPTS } from "./researchCharter";
import { RELEASE_CALENDAR_PROMPTS } from "./releaseCalendar";
import { SELECTION_DOCKET_PROMPTS } from "./selectionDocket";
import { SOURCE_NOTE_PROVENANCE_PROMPTS } from "./sourceNoteProvenance";
import { getStatutoryClockReadout, STATUTORY_START_YEAR } from "./statutoryClock";
import { buildTrueEndingCertificate } from "./trueEndingCertificate";
import { VOLUME_CONCEPT_PROMPTS } from "./volumeConcept";
import type { QuestArchitectureContext } from "./questArchitecture";
import { WORKFLOW_TOOL_PRIORITY, WORKFLOW_TOOL_REGISTRY } from "./workflowTools";
import {
  bigKeyForArea,
  bossStampForArea,
  canOpenBossDoor,
  canOpenLockedDoor,
  createInitialDungeonStates,
  dungeonComplete,
  earnSmallKey,
  isBossDoor,
  normalizeDungeonStates,
  useSmallKey
} from "../systems/dungeonKeys";
import type { DungeonStateRegistry } from "../systems/dungeonKeys";
import { VIOLATION_LABEL } from "../systems/standardsDamage";
import type { StandardViolation } from "../systems/standardsDamage";
import type {
  AdventureHudReadout,
  ChoiceOption,
  DocumentCandidate,
  DocumentWorkflowState,
  GameMode,
  PlayerAnimationState,
  PlayerCombatReadout,
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

export interface GameState {
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
  dungeons: DungeonStateRegistry;
  standardsViolations: StandardsViolationRecord[];
  reliability: number;
  heldItem: string | null;
  equippedProcessItem: ProcessItemId | null;
  equippedDanneItem: DanneItemId | null;
  documentPoints: number;
  inventory: string[];
  volumeFragments: string[];
  latestMessage: string;
  activeDialog: { speaker: string; text: string } | null;
  currentChoice: { title: string; options: ChoiceOption[] } | null;
  player: Position;
  playerFacing: Direction;
  playerAnimationState: PlayerAnimationState;
  playerCombat: PlayerCombatReadout;
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

export interface DanneItemReadout {
  id: DanneItemId;
  displayName: string;
  key: string;
  texture: string;
  tier: string;
  description: string;
  acquired: boolean;
  equipped: boolean;
  count: number;
  total: number;
  complete: boolean;
  fragments: string[];
  attackBonus: number;
  trueEndingReady: boolean;
}

const defaultRole = PROCESS_ROLES[0];
const TRANSIENT_SAVE_SCENES = new Set([
  "BootScene",
  "TapToStartScene",
  "WarningScene",
  "RenderDebugScene",
  "CodexScene",
  "DanneGallery",
  "SpriteGallery"
]);

export const SAVE_SCHEMA_VERSION = 1;

export interface GameSaveData {
  version: number;
  savedAt: string;
  state: GameState;
}

export interface GameSaveSummary {
  version: number;
  savedAt: string;
  currentScene: string;
  objective: string;
  displayName: string;
  roleLabel: string;
  player: Position;
  processStamps: ProcessStampId[];
  inventoryCount: number;
  documentPoints: number;
}

type GameStateChangeReason = "reset" | "scene" | "restore";
type GameStateChangeListener = (reason: GameStateChangeReason) => void;

const FINAL_PUBLICATION_DOCUMENT_IDS = [
  "telegram_001",
  "source_note_047",
  "cross_reference_001",
  "sbu_annotation_001",
  "proof_page_412"
] as const;

const gameStateChangeListeners = new Set<GameStateChangeListener>();
let resumeSpawn: { scene: string; player: Position; facing: Direction } | null = null;

function notifyGameStateChange(reason: GameStateChangeReason) {
  for (const listener of [...gameStateChangeListeners]) listener(reason);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function preservedFinalGateCertification(state: FinalGateCertificationState | null) {
  return state?.status === "published" ? state : null;
}

function normalizeSaveMode(scene: string, mode: GameMode): GameMode {
  if (scene === "TitleScene" || scene === "TapToStartScene") return "title";
  if (scene === "EndingScene") return "ending";
  if (mode === "dialog" || mode === "choice" || mode === "pause" || mode === "debug" || mode === "boot") return "explore";
  return mode;
}

function isRestorableScene(scene: string) {
  return SCENE_ORDER.includes(scene as (typeof SCENE_ORDER)[number]) && !TRANSIENT_SAVE_SCENES.has(scene);
}

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

export interface FinalPublicationCertificationResult {
  ok: boolean;
  trueEnding: boolean;
  reason: string;
}

export interface StandardsViolationRecord {
  id: string;
  violation: StandardViolation;
  label: string;
  context: string | null;
  documentId: string | null;
  unresolved: boolean;
  count: number;
}

export interface PublicationReadinessReadout {
  repositoryCoverageMap: {
    complete: boolean;
    shortLabel: "MAP";
    label: "Repository coverage map";
  };
  pendants: {
    collected: number;
    required: number;
    missing: ProcessStampId[];
  };
  processStamps: {
    collected: number;
    required: number;
    missing: ProcessStampId[];
  };
  coverFragments: {
    collected: number;
    required: number;
    missing: number;
  };
  crystals: {
    collected: number;
    required: number;
    missing: number;
  };
  standards: {
    unresolved: Array<{
      id: StandardViolation;
      label: string;
      documentId: string | null;
      title?: string;
      context?: string | null;
      count?: number;
    }>;
    clear: boolean;
  };
  apparatus: PublicationApparatusReadout;
  buckramKeyHeld: boolean;
  buckramGateOpen: boolean;
  completionRatio: number;
  missingSummary: string[];
}

export interface AdventureSubscreenReadout {
  productionBoard: {
    completed: number;
    total: number;
    completionRatio: number;
    nextStep: {
      id: FrusProductionBoardStepId;
      shortLabel: string;
      label: string;
      gameplayTask: string;
      sourceBasis: string;
      sourceUrl: string;
      status: FrusProductionBoardStatus;
    } | null;
    steps: Array<{
      id: FrusProductionBoardStepId;
      shortLabel: string;
      status: FrusProductionBoardStatus;
      complete: boolean;
    }>;
    phases: Array<{
      id: FrusProductionPhaseId;
      label: string;
      shortLabel: string;
      status: FrusProductionBoardStatus;
      completed: number;
      total: number;
      nextStep: {
        id: FrusProductionBoardStepId;
        shortLabel: string;
        label: string;
      } | null;
    }>;
    activePhase: {
      id: FrusProductionPhaseId;
      label: string;
      shortLabel: string;
      completed: number;
      total: number;
    } | null;
  };
  pendants: Array<{
    id: "objectivity" | "provenance" | "review";
    label: string;
    title: string;
    stampId: ProcessStampId;
    acquired: boolean;
  }>;
  crystals: {
    earned: number;
    total: number;
    byDocument: Array<{
      documentId: string;
      title: string;
      earned: number;
      total: number;
    }>;
  };
  equippedTool: {
    id: ProcessItemId;
    displayName: string;
    shortLabel: string;
  } | null;
  reliabilityHearts: {
    current: number;
    max: number;
    filled: number;
    total: number;
    meter: string;
  };
  dungeons: Array<{
    areaId: AreaId;
    displayName: string;
    active: boolean;
    smallKeys: number;
    smallKeysRequired: number;
    bigKeyHeld: boolean;
    bossDefeated: boolean;
    mapRevealed: boolean;
  }>;
  roomMap: {
    currentAreaId: AreaId;
    currentRoomId: string | null;
    rooms: Array<{
      id: string;
      title: string;
      grid: { x: number; y: number };
      visited: boolean;
      revealed: boolean;
      roomType: RoomType;
    }>;
  };
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
  dungeons: createInitialDungeonStates(),
  standardsViolations: [],
  reliability: 80,
  heldItem: null,
  equippedProcessItem: null,
  equippedDanneItem: null,
  documentPoints: 0,
  inventory: [],
  volumeFragments: [],
  latestMessage: "",
  activeDialog: null,
  currentChoice: null,
  player: { x: 128, y: 160 },
  playerFacing: "south",
  playerAnimationState: "idle_down",
  playerCombat: {
    state: "idle",
    actionActive: false,
    actionMsRemaining: 0,
    invulnerable: false,
    invulnerableMsRemaining: 0,
    hitbox: null
  },
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
  gameState.dungeons = createInitialDungeonStates();
  gameState.standardsViolations = [];
  gameState.heldItem = null;
  gameState.equippedProcessItem = null;
  gameState.equippedDanneItem = null;
  gameState.documentPoints = 0;
  gameState.inventory = [];
  gameState.volumeFragments = [];
  gameState.latestMessage = "";
  gameState.activeDialog = null;
  gameState.currentChoice = null;
  gameState.player = { x: 128, y: 160 };
  gameState.playerFacing = "south";
  gameState.playerAnimationState = "idle_down";
  gameState.playerCombat = {
    state: "idle",
    actionActive: false,
    actionMsRemaining: 0,
    invulnerable: false,
    invulnerableMsRemaining: 0,
    hitbox: null
  };
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
  notifyGameStateChange("reset");
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
  gameState.finalGateCertification = preservedFinalGateCertification(gameState.finalGateCertification);
  refreshQuestWorkflowState();
  notifyGameStateChange("scene");
}

export function addGameStateChangeListener(listener: GameStateChangeListener) {
  gameStateChangeListeners.add(listener);
  return () => gameStateChangeListeners.delete(listener);
}

export function createGameSaveData(): GameSaveData {
  const state = cloneJson(gameState);
  state.mode = normalizeSaveMode(state.currentScene, state.mode);
  state.activeDialog = null;
  state.currentChoice = null;
  state.snesTransition = {
    active: false,
    current: null,
    last: state.snesTransition.last
  };
  return {
    version: SAVE_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    state
  };
}

export function getGameSaveSummary(save: GameSaveData): GameSaveSummary {
  return {
    version: save.version,
    savedAt: save.savedAt,
    currentScene: save.state.currentScene,
    objective: save.state.objective,
    displayName: save.state.playerProfile.displayName,
    roleLabel: save.state.playerProfile.roleLabel,
    player: { ...save.state.player },
    processStamps: [...save.state.processStamps],
    inventoryCount: save.state.inventory.length,
    documentPoints: save.state.documentPoints
  };
}

export function restoreGameSaveData(save: GameSaveData) {
  if (!save?.state?.currentScene || !isRestorableScene(save.state.currentScene)) return null;
  const restored = cloneJson(save.state);
  restored.mode = normalizeSaveMode(restored.currentScene, restored.mode);
  restored.activeDialog = null;
  restored.currentChoice = null;
  restored.visibleEntities = [];
  restored.visibleThreats = [];
  restored.nearestInteractable = null;
  restored.physicalVerification = null;
  restored.finalGateCertification = preservedFinalGateCertification(restored.finalGateCertification);
  restored.snesTransition = {
    active: false,
    current: null,
    last: restored.snesTransition?.last ?? null
  };
  Object.assign(gameState, restored);
  gameState.documentCandidates = gameState.documentCandidates.map(cloneDocumentCandidate);
  gameState.documentWorkflow = gameState.documentCandidates.map(documentToWorkflowDocument);
  gameState.dungeons = normalizeDungeonStates(gameState.dungeons);
  gameState.standardsViolations = normalizeStandardsViolations(gameState.standardsViolations);
  syncDungeonBigKeysFromInventory();
  syncDungeonBossesFromProcessStamps();
  resumeSpawn = {
    scene: gameState.currentScene,
    player: { ...gameState.player },
    facing: gameState.playerFacing
  };
  refreshQuestWorkflowState();
  notifyGameStateChange("restore");
  return gameState.currentScene;
}

export function consumeResumePlayerSpawn(sceneKey: string) {
  if (!resumeSpawn || resumeSpawn.scene !== sceneKey) return null;
  const spawn = {
    player: { ...resumeSpawn.player },
    facing: resumeSpawn.facing
  };
  resumeSpawn = null;
  return spawn;
}

export function isSaveableGameScene(sceneName = gameState.currentScene) {
  return isRestorableScene(sceneName) && sceneName !== "TitleScene" && sceneName !== "CharacterCreateScene";
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

function standardsViolationId(violation: StandardViolation, context?: string, documentId?: string) {
  const scope = documentId ?? (context ? context.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) : "general");
  return `${violation}:${scope || "general"}`;
}

function normalizeStandardsViolations(records?: StandardsViolationRecord[]) {
  if (!Array.isArray(records)) return [];
  return records
    .filter((record) => record && typeof record.violation === "string")
    .map((record) => ({
      id: record.id || standardsViolationId(record.violation, record.context ?? undefined, record.documentId ?? undefined),
      violation: record.violation,
      label: record.label || VIOLATION_LABEL[record.violation],
      context: record.context ?? null,
      documentId: record.documentId ?? null,
      unresolved: record.unresolved !== false,
      count: Math.max(1, Math.round(record.count ?? 1))
    }));
}

export function recordStandardsViolation(violation: StandardViolation, context?: string, documentId?: string) {
  const id = standardsViolationId(violation, context, documentId);
  const existing = gameState.standardsViolations.find((record) => record.id === id && record.unresolved);
  if (existing) {
    existing.count += 1;
    existing.context = context ?? existing.context;
    refreshQuestWorkflowState();
    return { ...existing };
  }

  const record: StandardsViolationRecord = {
    id,
    violation,
    label: VIOLATION_LABEL[violation],
    context: context ?? null,
    documentId: documentId ?? null,
    unresolved: true,
    count: 1
  };
  gameState.standardsViolations.push(record);
  refreshQuestWorkflowState();
  return { ...record };
}

export function resolveStandardsViolation(id: string) {
  const record = gameState.standardsViolations.find((candidate) => candidate.id === id);
  if (!record || !record.unresolved) return false;
  record.unresolved = false;
  refreshQuestWorkflowState();
  return true;
}

export function resolveStandardsViolationForDocument(documentId: string, violation: StandardViolation) {
  let resolved = 0;
  for (const record of gameState.standardsViolations) {
    if (record.documentId === documentId && record.violation === violation && record.unresolved) {
      record.unresolved = false;
      resolved += 1;
    }
  }
  if (resolved > 0) refreshQuestWorkflowState();
  return resolved;
}

export function unresolvedStandardsViolations() {
  return gameState.standardsViolations
    .filter((record) => record.unresolved)
    .map((record) => ({ ...record }));
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
  const revealedRoomIds = state
    ? new Set([
        ...(state.revealedRoomIds ?? state.visitedRoomIds),
        ...getRevealedShortcutRoomIds(getHeldProcessItemIds())
      ])
    : null;
  gameState.roomTraversal = state
    ? {
        ...state,
        visitedRoomIds: [...state.visitedRoomIds],
        revealedRoomIds: [...(revealedRoomIds ?? [])]
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

export function setPlayerAnimationState(animationState: PlayerAnimationState) {
  gameState.playerAnimationState = animationState;
}

export function setPlayerCombat(combat: PlayerCombatReadout) {
  gameState.playerCombat = combat;
}

export function addInventoryItem(label: string) {
  if (!gameState.inventory.includes(label)) {
    gameState.inventory.push(label);
    refreshQuestWorkflowState();
  }
}

function danneItemDefinition(itemId: DanneItemId) {
  return DANNE_ITEM_CATALOG.find((item) => item.id === itemId);
}

export function getTreatyFragmentLabels() {
  return [...TREATY_FRAGMENT_LABELS];
}

export function getTreatyFragmentCount() {
  return TREATY_FRAGMENT_LABELS.filter((label) => gameState.inventory.includes(label)).length;
}

export function hasDanneItem(itemId: DanneItemId) {
  if (itemId === "treaty-fragments") return getTreatyFragmentCount() >= TREATY_FRAGMENT_LABELS.length;
  const item = danneItemDefinition(itemId);
  if (!item) return false;
  return gameState.inventory.includes(item.displayName) || gameState.inventory.includes(item.id);
}

export function addDanneItem(itemId: DanneItemId, fragmentIndex?: number) {
  const item = danneItemDefinition(itemId);
  if (!item) return false;
  if (itemId === "treaty-fragments") {
    unlockCodexEntry("item-treaty-fragments");
    const requestedIndex = fragmentIndex ?? getTreatyFragmentCount();
    const boundedIndex = Math.max(0, Math.min(TREATY_FRAGMENT_LABELS.length - 1, requestedIndex));
    const label = TREATY_FRAGMENT_LABELS[boundedIndex];
    const before = gameState.inventory.length;
    addInventoryItem(label);
    if (gameState.inventory.length !== before) {
      setLatestMessage(`${label} secured.`);
      refreshQuestWorkflowState();
      return true;
    }
    setLatestMessage(`${label} already filed.`);
    return false;
  }
  const before = gameState.inventory.length;
  unlockCodexEntry(`item-${itemId}`);
  addInventoryItem(item.displayName);
  if (itemId === "ruby-pen" && !gameState.equippedDanneItem) gameState.equippedDanneItem = itemId;
  if (gameState.inventory.length !== before) {
    setLatestMessage(`${item.displayName} acquired.`);
    refreshQuestWorkflowState();
    return true;
  }
  setLatestMessage(`${item.displayName} already acquired.`);
  refreshQuestWorkflowState();
  return false;
}

export function equipDanneItem(itemId: DanneItemId) {
  if (itemId !== "ruby-pen" || !hasDanneItem(itemId)) return false;
  gameState.equippedDanneItem = itemId;
  setLatestMessage("Ruby Pen equipped.");
  refreshQuestWorkflowState();
  return true;
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

export function getHeldProcessItemIds() {
  const inventory = new Set<ProcessItemId>();
  for (const item of ITEM_REGISTRY) {
    if (hasProcessItem(item.id)) inventory.add(item.id);
  }
  return inventory;
}

function markDungeonBigKeyForItem(itemId: ProcessItemId) {
  for (const area of AREA_REGISTRY) {
    if (bigKeyForArea(area.id) === itemId) {
      gameState.dungeons[area.id] = {
        ...gameState.dungeons[area.id],
        bigKeyHeld: true,
        mapRevealed: true
      };
    }
  }
}

function syncDungeonBigKeysFromInventory() {
  for (const itemId of getHeldProcessItemIds()) markDungeonBigKeyForItem(itemId);
}

export function addProcessItem(itemId: ProcessItemId) {
  const item = processItemDefinition(itemId);
  if (!item) return;
  addInventoryItem(item.displayName);
  markDungeonBigKeyForItem(itemId);
  if (!gameState.equippedProcessItem) {
    gameState.equippedProcessItem = itemId;
    refreshQuestWorkflowState();
  }
  refreshQuestWorkflowState();
}

export function getProcessItemDefinition(itemId: ProcessItemId) {
  return processItemDefinition(itemId);
}

export function equipProcessItem(itemId: ProcessItemId) {
  if (!hasProcessItem(itemId)) return false;
  gameState.equippedProcessItem = itemId;
  refreshQuestWorkflowState();
  return true;
}

export function cycleEquippedProcessItem(direction = 1) {
  const acquired = getProcessItemReadout().filter((item) => item.acquired);
  if (!acquired.length) {
    gameState.equippedProcessItem = null;
    refreshQuestWorkflowState();
    return null;
  }
  const currentIndex = acquired.findIndex((item) => item.id === gameState.equippedProcessItem);
  const normalizedDirection = direction >= 0 ? 1 : -1;
  const nextIndex = currentIndex < 0
    ? 0
    : (currentIndex + normalizedDirection + acquired.length) % acquired.length;
  const next = acquired[nextIndex];
  gameState.equippedProcessItem = next.id;
  refreshQuestWorkflowState();
  return next;
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
  if (dungeonComplete(gameState.dungeons[area.id])) return true;
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
  const heldProcessItems = getHeldProcessItemIds();
  for (const roomId of getRevealedShortcutRoomIds(heldProcessItems)) revealedRoomIds.add(roomId);
  if (gameState.currentScene === "OfficeScene") {
    visitedRoomIds.add("O1");
    revealedRoomIds.add("O1");
  }
  if (gameState.currentScene === "CherryBlossomGardenScene") {
    visitedRoomIds.add("DG1");
    revealedRoomIds.add("DG1");
  }
  if (gameState.currentScene === "SenateHearingChamberScene") {
    visitedRoomIds.add("DH1");
    revealedRoomIds.add("DH1");
  }
  if (gameState.currentScene === "NaraStacksScene") {
    visitedRoomIds.add("DN1");
    revealedRoomIds.add("DN1");
  }
  if (gameState.currentScene === "EmbassyCableRoomScene") {
    visitedRoomIds.add("DE1");
    revealedRoomIds.add("DE1");
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
  if (gameState.currentScene === "BlackVaultLairScene") {
    visitedRoomIds.add("DV1");
    revealedRoomIds.add("DV1");
  }
  return FRUS_ROOM_GRAPH.map((room) => {
    const dungeon = gameState.dungeons[room.area];
    const lockedExits = room.lockedExits ?? {};
    const lockedExitState = Object.fromEntries(
      (Object.keys(lockedExits) as Direction[]).map((direction) => {
        const requiredItem = room.requiredItems?.[direction] ?? null;
        const bossDoor = isBossDoor(room, direction);
        const prompt = blockedExitPrompt(room.id, direction, heldProcessItems);
        const canOpen = bossDoor
          ? canOpenBossDoor(dungeon)
          : requiredItem
            ? canTraverseExit(room.id, direction, heldProcessItems)
            : canOpenLockedDoor(dungeon);
        return [direction, {
          label: lockedExits[direction] ?? "Locked route",
          gateType: bossDoor ? "boss" : requiredItem ? "process_item" : "small_key",
          requiredItem,
          requiredItemLabel: requiredItem ? getProcessItemDefinition(requiredItem)?.displayName ?? requiredItem : null,
          blockedMessage: canOpen ? null : prompt.message,
          blockedObjective: canOpen ? null : prompt.objective,
          canOpen,
          smallKeys: dungeon.smallKeys,
          bigKeyHeld: dungeon.bigKeyHeld
        }];
      })
    );
    return {
      id: room.id,
      area: room.area,
      title: room.title,
      exits: room.exits,
      lockedExits,
      lockedExitState,
      requiredItems: room.requiredItems ?? {},
      roomType: room.roomType,
      visited: visitedRoomIds.has(room.id),
      revealed: revealedRoomIds.has(room.id) || visitedRoomIds.has(room.id) || room.roomType !== "secret" || dungeon.mapRevealed
    };
  });
}

export function getFinalGateReadiness() {
  const requiredStamps: ProcessStampId[] = ["rule", "archive", "network", "referral", "proof"];
  const missingStamps = requiredStamps.filter((stamp) => !gameState.processStamps.includes(stamp));
  const publicationApparatus = getPublicationApparatusReadout({
    processStamps: gameState.processStamps,
    volumeFragments: gameState.volumeFragments,
    documentCandidates: gameState.documentCandidates,
    documentPoints: gameState.documentPoints,
    sourcesConsultedListComplete: Boolean(gameState.sceneProgress.frontMatterAssemblyComplete)
      || (gameState.sceneProgress.frontMatterAssemblyStep ?? 0) >= 2,
    typesettingPreparationComplete: Boolean(gameState.sceneProgress.typesettingPreparationComplete),
    typesetterProofComplete: Boolean(gameState.sceneProgress.typesetterProofComplete),
    readerAidRegistersComplete: Boolean(gameState.sceneProgress.readerAidRegistersComplete),
    indexDocketComplete: Boolean(gameState.sceneProgress.indexDocketComplete),
    frontMatterAssemblyComplete: Boolean(gameState.sceneProgress.frontMatterAssemblyComplete),
    typesetterCorrectionsComplete: Boolean(gameState.sceneProgress.typesetterCorrectionsComplete)
  });
  const documentsWithUndisclosedDeletion = gameState.documentCandidates
    .filter((document) => document.undisclosedDeletion)
    .map((document) => ({ id: document.id, title: document.title }));
  const standardsViolations = unresolvedStandardsViolations();
  const fragmentsNeeded = 5;
  const reliabilityMinimum = 70;
  const missingFragments = Math.max(0, fragmentsNeeded - gameState.volumeFragments.length);
  const equityCrystalsCollected = crystalsEarned(gameState.documentCandidates);
  const equityCrystalsRequired = totalEquities(gameState.documentCandidates);
  const missingEquityCrystals = Math.max(0, equityCrystalsRequired - equityCrystalsCollected);
  const equityCrystalsReady = equityCrystalsRequired > 0 && missingEquityCrystals === 0;
  const reliabilityReady = gameState.reliability >= reliabilityMinimum;
  const buckramKeyHeld = hasProcessItem("buckram_key");
  const repositoryCoverageMapReady = Boolean(gameState.sceneProgress.repositoryCoverageMapComplete);
  const ready = missingStamps.length === 0
    && missingFragments === 0
    && equityCrystalsReady
    && reliabilityReady
    && repositoryCoverageMapReady
    && publicationApparatus.complete
    && documentsWithUndisclosedDeletion.length === 0
    && standardsViolations.length === 0;
  return {
    requiredStamps,
    missingStamps,
    fragmentsCollected: gameState.volumeFragments.length,
    fragmentsNeeded,
    missingFragments,
    equityCrystalsCollected,
    equityCrystalsRequired,
    missingEquityCrystals,
    equityCrystalsReady,
    repositoryCoverageMapReady,
    reliability: gameState.reliability,
    reliabilityMinimum,
    reliabilityReady,
    buckramKeyHeld,
    publicationApparatus,
    missingApparatus: publicationApparatus.missing,
    buckramGateOpen: ready && buckramKeyHeld,
    documentsWithUndisclosedDeletion,
    standardsViolations,
    stateChatMayOpenGate: false,
    ready
  };
}

export function getPublicationReadinessReadout(): PublicationReadinessReadout {
  const readiness = getFinalGateReadiness();
  const requiredPendantStamps: ProcessStampId[] = PENDANTS.map((pendant) => pendant.stampId);
  const requiredPendantStampSet = new Set<ProcessStampId>(requiredPendantStamps);
  const missingPendants = requiredPendantStamps.filter((stamp) => !gameState.processStamps.includes(stamp));
  const missingProcessStamps = readiness.missingStamps
    .filter((stamp) => !requiredPendantStampSet.has(stamp));
  const deletionBlockers = readiness.documentsWithUndisclosedDeletion.map((document) => ({
    id: "undisclosed_deletion" as const,
    label: `${document.title}: add visible bracketed insertion`,
    documentId: document.id,
    title: document.title
  }));
  const ledgerBlockers = readiness.standardsViolations.map((record) => ({
    id: record.violation,
    label: record.context ? `${record.label} ${record.context}` : record.label,
    documentId: record.documentId,
    context: record.context,
    count: record.count
  }));
  const unresolved = [...deletionBlockers, ...ledgerBlockers]
    .filter((entry, index, entries) => entries.findIndex((candidate) => (
      candidate.id === entry.id && candidate.documentId === entry.documentId && candidate.label === entry.label
    )) === index);
  const missingSummary = [
    ...missingPendants.map((stamp) => `Pendant ${stamp.toUpperCase()}`),
    ...missingProcessStamps.map((stamp) => `Process ${stamp.toUpperCase()}`),
    ...(readiness.missingEquityCrystals
      ? [`${readiness.missingEquityCrystals} equity crystal${readiness.missingEquityCrystals === 1 ? "" : "s"}`]
      : readiness.equityCrystalsRequired > 0 ? [] : ["Equity crystals"]),
    ...(readiness.missingFragments ? [`${readiness.missingFragments} cover fragment${readiness.missingFragments === 1 ? "" : "s"}`] : []),
    ...(readiness.repositoryCoverageMapReady ? [] : ["Repository MAP"]),
    ...readiness.missingApparatus.map((component) => `Apparatus ${component.shortLabel}`),
    ...(readiness.buckramKeyHeld ? [] : ["Buckram Key"]),
    ...unresolved.map((standard) => standard.label)
  ];
  const requiredUnits = requiredPendantStamps.length + readiness.requiredStamps.length + Math.max(1, readiness.equityCrystalsRequired) + readiness.fragmentsNeeded + readiness.publicationApparatus.total + 2;
  const collectedUnits = (requiredPendantStamps.length - missingPendants.length)
    + (readiness.requiredStamps.length - readiness.missingStamps.length)
    + Math.min(readiness.equityCrystalsCollected, Math.max(1, readiness.equityCrystalsRequired))
    + Math.min(readiness.fragmentsCollected, readiness.fragmentsNeeded)
    + (readiness.repositoryCoverageMapReady ? 1 : 0)
    + readiness.publicationApparatus.completed
    + (readiness.buckramKeyHeld ? 1 : 0);
  return {
    repositoryCoverageMap: {
      complete: readiness.repositoryCoverageMapReady,
      shortLabel: "MAP",
      label: "Repository coverage map"
    },
    pendants: {
      collected: requiredPendantStamps.length - missingPendants.length,
      required: requiredPendantStamps.length,
      missing: missingPendants
    },
    processStamps: {
      collected: readiness.requiredStamps.length - readiness.missingStamps.length,
      required: readiness.requiredStamps.length,
      missing: [...readiness.missingStamps]
    },
    coverFragments: {
      collected: Math.min(readiness.fragmentsCollected, readiness.fragmentsNeeded),
      required: readiness.fragmentsNeeded,
      missing: readiness.missingFragments
    },
    crystals: {
      collected: readiness.equityCrystalsCollected,
      required: readiness.equityCrystalsRequired,
      missing: readiness.equityCrystalsRequired > 0 ? readiness.missingEquityCrystals : 1
    },
    standards: {
      unresolved,
      clear: unresolved.length === 0
    },
    apparatus: readiness.publicationApparatus,
    buckramKeyHeld: readiness.buckramKeyHeld,
    buckramGateOpen: readiness.buckramGateOpen && missingPendants.length === 0 && unresolved.length === 0,
    completionRatio: Math.max(0, Math.min(1, collectedUnits / Math.max(1, requiredUnits))),
    missingSummary
  };
}

function publishedFinalGateCertificationState(): FinalGateCertificationState {
  return {
    status: "published",
    nearestGate: true,
    checklistComplete: true,
    certifiedBy: gameState.playerProfile.displayName,
    requiredItem: "Buckram Key",
    message: "PUBLISHED FRUS COVER - HUMAN CERTIFICATION RECORDED"
  };
}

function completePublicationReleaseFlags() {
  gameState.sceneProgress.gpoSegmentAssemblyComplete = 1;
  gameState.sceneProgress.gpoSegmentAssemblyStep = GPO_SEGMENT_ASSEMBLY_PROMPTS.length;
  gameState.sceneProgress.gpoPublicationComplete = 1;
  gameState.sceneProgress.gpoPublicationStep = GPO_PUBLICATION_PROMPTS.length;
  gameState.sceneProgress.publicationFundingComplete = 1;
  gameState.sceneProgress.publicationFundingStep = PUBLICATION_FUNDING_PROMPTS.length;
  gameState.sceneProgress.readerAidRegistersComplete = 1;
  gameState.sceneProgress.readerAidRegistersStep = READER_AID_REGISTER_PROMPTS.length;
  gameState.sceneProgress.chapterReleaseComplete = 1;
  gameState.sceneProgress.chapterReleaseStep = CHAPTER_RELEASE_PROMPTS.length;
  gameState.sceneProgress.digitalReleaseComplete = 1;
  gameState.sceneProgress.digitalReleaseStep = DIGITAL_RELEASE_PROMPTS.length;
  gameState.sceneProgress.publicCitationComplete = 1;
  gameState.sceneProgress.publicCitationStep = PUBLIC_CITATION_CARD_PROMPTS.length;
  gameState.sceneProgress.releaseCalendarComplete = 1;
  gameState.sceneProgress.releaseCalendarStep = RELEASE_CALENDAR_PROMPTS.length;
}

export function certifyFinalPublicationAfterDanne(): FinalPublicationCertificationResult {
  const readiness = getPublicationReadinessReadout();
  if (!readiness.buckramGateOpen) {
    const reason = readiness.missingSummary.length
      ? `Buckram Gate locked: ${readiness.missingSummary.join(", ")}.`
      : "Buckram Gate locked: final publication certification is incomplete.";
    setLatestMessage(reason);
    return { ok: false, trueEnding: false, reason };
  }

  completePublicationReleaseFlags();
  addProcessItem("buckram_key");
  addInventoryItem("Published FRUS Cover");
  for (const documentId of FINAL_PUBLICATION_DOCUMENT_IDS) publishDocument(documentId);
  setFinalGateCertificationState(publishedFinalGateCertificationState());
  gameState.sceneProgress.trueEndingPublicationCertified = 1;
  refreshQuestWorkflowState();

  const finalReadiness = getFinalGateReadiness();
  const publication = getPublicationReadinessReadout();
  const board = getProductionBoardReadout();
  const treatyFragmentsCollected = getTreatyFragmentCount();
  const treatyLine = getDanneItemReadout().find((item) => item.id === "treaty-fragments");
  const certificate = buildTrueEndingCertificate({
    processStamps: gameState.processStamps,
    documentCandidates: gameState.documentCandidates,
    volumeFragments: gameState.volumeFragments,
    reliability: gameState.reliability,
    documentPoints: gameState.documentPoints,
    treatyFragmentsCollected,
    publicationBoardCompleted: board.completed,
    publicationBoardTotal: board.total,
    publicationApparatusCompleted: finalReadiness.publicationApparatus.completed,
    publicationApparatusTotal: finalReadiness.publicationApparatus.total,
    buckramGateOpen: publication.buckramGateOpen,
    standardsClear: publication.standards.clear,
    publicRecordComplete: Boolean(gameState.sceneProgress.publicCitationComplete)
      && Boolean(gameState.sceneProgress.releaseCalendarComplete)
      && gameState.finalGateCertification?.status === "published"
  });
  const trueEnding = certificate.complete;
  const reason = trueEnding
    ? "Certified FRUS volume entered the public record with the complete treaty record."
    : treatyLine && !treatyLine.trueEndingReady
      ? `Certified FRUS volume published; treaty record incomplete (${treatyLine.count}/${treatyLine.total}).`
      : "Certified FRUS volume published; true-ending certification still shows open work.";
  setLatestMessage(reason);
  return { ok: true, trueEnding, reason };
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
  const current = gameState.documentCandidates.find((document) => document.id === documentId);
  if (!current) return null;
  const result = tryWorkflowAction(current, action, getHeldProcessItemIds());
  if (!result.ok) {
    const lockedReason = result.reason ?? "Locked: matching FRUS tool required.";
    setLatestMessage(lockedReason);
    gameState.objective = lockedReason;
    refreshQuestWorkflowState();
    return null;
  }
  const changed = updateDocumentCandidate(documentId, () => result.document, reason);
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

export function markDocumentUndisclosedDeletion(documentId: string, reason = "unbracketed excision") {
  const changed = updateDocumentCandidate(documentId, (document) => ({
    ...cloneDocumentCandidate(document),
    undisclosedDeletion: true,
    annotationNeeded: true
  }), reason);
  return changed?.undisclosedDeletion ?? false;
}

export function clearDocumentUndisclosedDeletion(documentId: string, reason = "bracketed insertion added") {
  const changed = updateDocumentCandidate(documentId, (document) => ({
    ...cloneDocumentCandidate(document),
    undisclosedDeletion: false
  }), reason);
  if (changed) resolveStandardsViolationForDocument(documentId, "undisclosed_deletion");
  return changed ? !changed.undisclosedDeletion : false;
}

export function markAsCandidate(documentId: string): void {
  advanceDocumentWorkflow(documentId, "evaluate", "marked as candidate");
}

export function selectDocument(documentId: string): void {
  advanceDocumentWorkflow(documentId, "select", "selected for volume");
}

export function verifyCitation(documentId: string): void {
  advanceDocumentWorkflow(documentId, "verify_citation", "citation verified");
}

export function addAnnotation(documentId: string): void {
  advanceDocumentWorkflow(documentId, "prepare_review", "annotation added");
}

export function submitForReview(documentId: string): void {
  advanceDocumentWorkflow(documentId, "submit_review", "submitted for review");
}

export function routeReferral(documentId: string, agencyId: string): void {
  const state = advanceDocumentWorkflow(documentId, "refer_agency", `routed to ${agencyId}`);
  if (state === "referred") setAgencyEquityResponse(documentId, agencyId, "referred");
}

export function resolveReview(documentId: string, result: ReviewStatus): void {
  if (result === "cleared" || result === "excised" || result === "denied" || result === "appeal_needed") {
    const action: DocumentWorkflowAction =
      result === "cleared" ? "clear" : result === "excised" ? "excise" : result === "denied" ? "deny" : "appeal";
    advanceDocumentWorkflow(documentId, action, `review ${result}`);
    return;
  }
  if (result === "resolved") {
    advanceDocumentWorkflow(documentId, "resolve", "review resolved");
    return;
  }
  if (result === "submitted") {
    advanceDocumentWorkflow(documentId, "submit_review", "review submitted");
    return;
  }
  if (result === "referred") {
    advanceDocumentWorkflow(documentId, "refer_agency", "review referred");
    return;
  }
  setDocumentWorkflowState(documentId, "ready_for_review", "review reset");
}

export function markReadyForProof(documentId: string): void {
  advanceDocumentWorkflow(documentId, "ready_proof", "ready for proof");
}

export function proofDocument(documentId: string): void {
  advanceDocumentWorkflow(documentId, "proof", "proofed");
}

export function publishDocument(documentId: string): void {
  advanceDocumentWorkflow(documentId, "publish", "published");
}

const SMALL_KEY_DOCUMENT_STATES = new Set<DocumentWorkflowState>(["source_note_needed", "citation_verified"]);

function areaIdForDocument(document: DocumentCandidate): AreaId {
  const roomId = DOCUMENT_ROOM_LOOKUP[document.id];
  const graphRoom = roomId ? FRUS_ROOM_GRAPH.find((room) => room.id === roomId) : undefined;
  if (graphRoom) return graphRoom.area;
  const sceneArea = roomId
    ? AREA_REGISTRY.find((area) => area.scenes.some((scene) => scene === roomId))
    : undefined;
  return sceneArea?.id ?? currentAreaId();
}

export function earnDungeonSmallKey(areaId: AreaId, reason = "document sub-task resolved") {
  gameState.dungeons[areaId] = earnSmallKey(gameState.dungeons[areaId]);
  const area = AREA_REGISTRY.find((candidate) => candidate.id === areaId);
  setLatestMessage(`${area?.displayName ?? areaId}: small key earned (${reason}).`);
  refreshQuestWorkflowState();
}

export function useDungeonSmallKey(areaId: AreaId, reason = "locked chapter route opened") {
  if (!canOpenLockedDoor(gameState.dungeons[areaId])) {
    const area = AREA_REGISTRY.find((candidate) => candidate.id === areaId);
    setLatestMessage(`${area?.displayName ?? areaId}: locked door requires a small key.`);
    refreshQuestWorkflowState();
    return false;
  }
  gameState.dungeons[areaId] = useSmallKey(gameState.dungeons[areaId]);
  const area = AREA_REGISTRY.find((candidate) => candidate.id === areaId);
  setLatestMessage(`${area?.displayName ?? areaId}: small key used (${reason}).`);
  refreshQuestWorkflowState();
  return true;
}

function earnDungeonSmallKeyForDocument(document: DocumentCandidate, previousState: DocumentWorkflowState) {
  if (document.workflowState === previousState || !SMALL_KEY_DOCUMENT_STATES.has(document.workflowState)) return;
  const label = document.workflowState === "citation_verified" ? "citation verified" : "source note found";
  earnDungeonSmallKey(areaIdForDocument(document), `${document.title} ${label}`);
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
    earnDungeonSmallKeyForDocument(changed, document.workflowState);
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
    markDungeonBossDefeatedForStamp(stampId);
    refreshQuestWorkflowState();
  }
}

function markDungeonBossDefeated(areaId: AreaId) {
  gameState.dungeons[areaId] = {
    ...gameState.dungeons[areaId],
    bossDefeated: true,
    mapRevealed: true
  };
}

function markDungeonBossDefeatedForStamp(stampId: ProcessStampId) {
  for (const area of AREA_REGISTRY) {
    if (bossStampForArea(area.id) === stampId) markDungeonBossDefeated(area.id);
  }
}

function syncDungeonBossesFromProcessStamps() {
  for (const stampId of gameState.processStamps) markDungeonBossDefeatedForStamp(stampId);
}

export function defeatDungeonBoss(areaId: AreaId, reason = "chapter boss review hurdle defeated") {
  markDungeonBossDefeated(areaId);
  const stampId = bossStampForArea(areaId);
  if (stampId) awardProcessStamp(stampId);
  const area = AREA_REGISTRY.find((candidate) => candidate.id === areaId);
  setLatestMessage(`${area?.displayName ?? areaId}: ${reason}`);
  refreshQuestWorkflowState();
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

function meterBlocks(value: number, max = 100, width = 8) {
  const bounded = Math.max(0, Math.min(max, value));
  const filled = Math.round((bounded / max) * width);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
}

function stampReadout() {
  const earned = gameState.processStamps.map((stampId) => HUD_STAMP_LABELS[stampId]);
  return earned.length ? earned.join(" ") : "NONE";
}

function selectedItemReadout() {
  const held = compactHeldItem(gameState.physicalVerification?.carriedItem ?? gameState.heldItem);
  if (held !== "NONE") return held;
  if (gameState.equippedDanneItem === "ruby-pen" && hasDanneItem("ruby-pen")) return "RUBY PEN";
  return getAdventureHudReadout().secondarySlotLabel;
}

export function getDanneItemReadout(): DanneItemReadout[] {
  const fragments = TREATY_FRAGMENT_LABELS.filter((label) => gameState.inventory.includes(label));
  const fragmentCount = fragments.length;
  return DANNE_ITEM_CATALOG.map((item) => {
    const acquired = item.id === "treaty-fragments"
      ? fragmentCount > 0
      : hasDanneItem(item.id);
    const complete = item.id === "treaty-fragments" ? fragmentCount >= TREATY_FRAGMENT_LABELS.length : acquired;
    return {
      id: item.id,
      displayName: item.displayName,
      key: item.key,
      texture: item.key,
      tier: item.tier,
      description: item.description,
      acquired,
      equipped: item.id === gameState.equippedDanneItem,
      count: item.id === "treaty-fragments" ? fragmentCount : acquired ? 1 : 0,
      total: item.id === "treaty-fragments" ? TREATY_FRAGMENT_LABELS.length : 1,
      complete,
      fragments: item.id === "treaty-fragments" ? fragments : [],
      attackBonus: item.id === "ruby-pen" && acquired ? 5 : 0,
      trueEndingReady: item.id === "treaty-fragments" && fragmentCount >= TREATY_FRAGMENT_LABELS.length
    };
  });
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
      acquired,
      equipped: acquired && item.id === gameState.equippedProcessItem
    };
  });
}

export function getAdventureHudReadout(): AdventureHudReadout {
  refreshQuestWorkflowState();
  const inventoryStrip = getProcessItemReadout().map((item) => ({
    id: item.id,
    displayName: item.displayName,
    shortLabel: item.shortLabel,
    hudSlot: item.hudSlot,
    acquired: item.acquired,
    equipped: item.equipped
  }));
  const equippedItem = inventoryStrip.find((item) => item.equipped)
    ?? inventoryStrip.find((item) => item.acquired)
    ?? null;
  return {
    confidence: {
      current: gameState.reliability,
      max: 100,
      meter: meterBlocks(gameState.reliability)
    },
    clarity: {
      current: Math.round(gameState.volumeMetrics.readerClarity),
      max: 100,
      meter: meterBlocks(gameState.volumeMetrics.readerClarity)
    },
    documentPoints: gameState.documentPoints,
    equippedItem,
    secondarySlotLabel: equippedItem?.shortLabel ?? "NONE",
    inventoryStrip,
    stamps: stampReadout(),
    fragments: {
      current: gameState.volumeFragments.length,
      total: 5
    }
  };
}

export function getAdventureSubscreenReadout(): AdventureSubscreenReadout {
  refreshQuestWorkflowState();
  const currentArea = getCurrentAreaReadout();
  const roomReadout = getRoomGraphReadout();
  const equippedTool = getProcessItemReadout().find((item) => item.equipped) ?? null;
  const board = getProductionBoardReadout();
  const productionPhases = getFrusProductionPhaseReadout(board);
  const activePhase = productionPhases.find((phase) => phase.status === "active") ?? null;
  const crystalDocuments = equityCrystalDocuments(gameState.documentCandidates).map((document) => {
    const total = document.equities.length;
    const earned = document.equities.filter((equity) => EQUITY_CRYSTAL_STATUSES.has(equity.response)).length;
    return {
      documentId: document.id,
      title: document.title,
      earned,
      total
    };
  }).filter((document) => document.total > 0);
  return {
    productionBoard: {
      completed: board.completed,
      total: board.total,
      completionRatio: board.total > 0 ? board.completed / board.total : 1,
      nextStep: board.nextStep
        ? {
            id: board.nextStep.id,
            shortLabel: board.nextStep.shortLabel,
            label: board.nextStep.label,
            gameplayTask: board.nextStep.gameplayTask,
            sourceBasis: board.nextStep.sourceBasis,
            sourceUrl: board.nextStep.sourceUrl,
            status: board.nextStep.status
          }
        : null,
      steps: board.steps.map((step) => ({
        id: step.id,
        shortLabel: step.shortLabel,
        status: step.status,
        complete: step.complete
      })),
      phases: productionPhases.map((phase) => ({
        id: phase.id,
        label: phase.label,
        shortLabel: phase.shortLabel,
        status: phase.status,
        completed: phase.completed,
        total: phase.total,
        nextStep: phase.nextStep
      })),
      activePhase: activePhase
        ? {
            id: activePhase.id,
            label: activePhase.label,
            shortLabel: activePhase.shortLabel,
            completed: activePhase.completed,
            total: activePhase.total
          }
        : null
    },
    pendants: PENDANTS.map((pendant) => ({
      ...pendant,
      acquired: gameState.processStamps.includes(pendant.stampId)
    })),
    crystals: {
      earned: crystalsEarned(gameState.documentCandidates),
      total: totalEquities(gameState.documentCandidates),
      byDocument: crystalDocuments
    },
    equippedTool: equippedTool
      ? {
          id: equippedTool.id,
          displayName: equippedTool.displayName,
          shortLabel: equippedTool.shortLabel
        }
      : null,
    reliabilityHearts: {
      current: gameState.reliability,
      max: 100,
      filled: Math.max(0, Math.min(10, Math.ceil(gameState.reliability / 10))),
      total: 10,
      meter: meterBlocks(gameState.reliability, 100, 10)
    },
    dungeons: getAreaProgressReadout().map((area) => {
      const dungeon = gameState.dungeons[area.id];
      return {
        areaId: area.id,
        displayName: area.displayName,
        active: area.active,
        smallKeys: dungeon.smallKeys,
        smallKeysRequired: dungeon.smallKeysRequired,
        bigKeyHeld: dungeon.bigKeyHeld,
        bossDefeated: dungeon.bossDefeated,
        mapRevealed: dungeon.mapRevealed
      };
    }),
    roomMap: {
      currentAreaId: currentArea.id,
      currentRoomId: gameState.roomTraversal?.currentRoomId ?? null,
      rooms: FRUS_ROOM_GRAPH
        .filter((room) => room.area === currentArea.id)
        .map((room) => {
          const readout = roomReadout.find((candidate) => candidate.id === room.id);
          return {
            id: room.id,
            title: room.title,
            grid: { ...room.grid },
            visited: Boolean(readout?.visited),
            revealed: Boolean(readout?.revealed),
            roomType: room.roomType
          };
        })
    }
  };
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
  const hud = getAdventureHudReadout();
  const role = compactHudText(gameState.playerProfile.roleLabel, 12);
  const selectedItem = selectedItemReadout();
  const room = gameState.roomTraversal?.currentRoomId ?? getCurrentAreaReadout().displayName.toUpperCase();
  const objective = compactHudText(gameState.objective || "VERIFY", 32);
  return [
    `ROLE ${role.padEnd(12, " ")} REL ${String(hud.confidence.current).padStart(3, " ")}% DOC ${String(hud.documentPoints).padStart(2, "0")}`,
    `ITEM ${selectedItem.padEnd(10, " ")} STAMPS ${hud.stamps}`,
    `MAP ${compactHudText(room, 8).padEnd(8, " ")} FRAG ${hud.fragments.current}/${hud.fragments.total} ${objective}`
  ];
}

export function getProductionBoardReadout() {
  refreshQuestWorkflowState();
  return getFrusProductionBoardReadout({
    volumeWorkflowState: gameState.volumeWorkflowState,
    documentCandidates: gameState.documentCandidates.map(cloneDocumentCandidate),
    processStamps: [...gameState.processStamps],
    heldProcessItems: getHeldProcessItemIds(),
    documentPoints: gameState.documentPoints,
    reliability: gameState.reliability,
    volumeFragments: [...gameState.volumeFragments],
    finalGatePublished: gameState.finalGateCertification?.status === "published",
    hacReviewComplete: Boolean(gameState.sceneProgress.senateHacReviewComplete),
    aiAnnotationReviewComplete: Boolean(gameState.sceneProgress.aiAnnotationReviewComplete),
    sourceNoteProvenanceComplete: Boolean(gameState.sceneProgress.sourceNoteProvenanceComplete),
    annotationDraftingComplete: Boolean(gameState.sceneProgress.annotationDraftingComplete),
    foreignGovernmentPermissionComplete: Boolean(gameState.sceneProgress.foreignGovernmentPermissionComplete),
    withholdingAppealComplete: Boolean(gameState.sceneProgress.withholdingAppealComplete),
    editorialMethodologyComplete: Boolean(gameState.sceneProgress.editorialMethodologyComplete),
    editorialTreatmentComplete: Boolean(gameState.sceneProgress.editorialTreatmentComplete),
    typeflowOrderComplete: Boolean(gameState.sceneProgress.typeflowOrderComplete),
    typesettingPreparationComplete: Boolean(gameState.sceneProgress.typesettingPreparationComplete),
    typesetterProofComplete: Boolean(gameState.sceneProgress.typesetterProofComplete),
    manuscriptReviewComplete: Boolean(gameState.sceneProgress.manuscriptReviewComplete),
    manuscriptReviewStep: gameState.sceneProgress.manuscriptReviewStep ?? 0,
    clearanceProcedureComplete: Boolean(gameState.sceneProgress.clearanceProcedureComplete),
    eo13526ReviewComplete: Boolean(gameState.sceneProgress.eo13526ReviewComplete),
    recordsAccessComplete: Boolean(gameState.sceneProgress.recordsAccessComplete),
    researchCharterComplete: Boolean(gameState.sceneProgress.researchCharterComplete),
    recordCollectionComplete: Boolean(gameState.sceneProgress.recordCollectionComplete),
    repositoryCoverageMapComplete: Boolean(gameState.sceneProgress.repositoryCoverageMapComplete),
    selectionDocketComplete: Boolean(gameState.sceneProgress.selectionDocketComplete),
    policyCoverageAuditComplete: Boolean(gameState.sceneProgress.policyCoverageAuditComplete),
    seriesConceptComplete: Boolean(gameState.sceneProgress.seriesConceptComplete),
    volumeConceptComplete: Boolean(gameState.sceneProgress.volumeConceptComplete),
    chapterReleaseComplete: Boolean(gameState.sceneProgress.chapterReleaseComplete),
    digitalReleaseComplete: Boolean(gameState.sceneProgress.digitalReleaseComplete),
    publicCitationComplete: Boolean(gameState.sceneProgress.publicCitationComplete),
    releaseCalendarComplete: Boolean(gameState.sceneProgress.releaseCalendarComplete),
    frontMatterAssemblyComplete: Boolean(gameState.sceneProgress.frontMatterAssemblyComplete),
    readerAidRegistersComplete: Boolean(gameState.sceneProgress.readerAidRegistersComplete),
    indexDocketComplete: Boolean(gameState.sceneProgress.indexDocketComplete),
    typesetterCorrectionsComplete: Boolean(gameState.sceneProgress.typesetterCorrectionsComplete),
    kelloggFinalCertificationComplete: Boolean(gameState.sceneProgress.kelloggFinalCertificationComplete),
    gpoSegmentAssemblyComplete: Boolean(gameState.sceneProgress.gpoSegmentAssemblyComplete),
    gpoPublicationComplete: Boolean(gameState.sceneProgress.gpoPublicationComplete),
    publicationFundingComplete: Boolean(gameState.sceneProgress.publicationFundingComplete)
  });
}

export function getStatutoryClockStateReadout() {
  const storedTenths = gameState.sceneProgress.statutoryClockTenths;
  const elapsedYears = typeof storedTenths === "number" && storedTenths > 0
    ? storedTenths / 10
    : STATUTORY_START_YEAR;
  return getStatutoryClockReadout({
    elapsedYears,
    readiness: getPublicationReadinessReadout(),
    finalGatePublished: gameState.finalGateCertification?.status === "published",
    deadlineDamageApplied: Boolean(gameState.sceneProgress.statutoryDeadlineMissed)
  });
}

export function seedProgressForScene(sceneName: string) {
  if (["ArchiveScene", "NetworkScene", "ReferralVaultScene", "SilentReadScene", "EndingScene"].includes(sceneName)) {
    gameState.documentPoints = Math.max(gameState.documentPoints, 15);
    setDocumentWorkflowState("telegram_001", "selected");
    setDocumentWorkflowState("source_note_047", "selected");
    setDocumentWorkflowState("cross_reference_001", "selected");
  }
  if (["NetworkScene", "ReferralVaultScene", "SilentReadScene", "EndingScene"].includes(sceneName)) {
    addProcessItem("citation_stamp");
    addVolumeFragment("Front Matter Fragment");
    setDocumentWorkflowState("source_note_047", "citation_verified");
  }
  if (["GuideScene", "ArchiveScene", "NetworkScene", "ReferralVaultScene", "SilentReadScene", "EndingScene"].includes(sceneName)) {
    gameState.sceneProgress.seriesConceptComplete = 1;
    gameState.sceneProgress.seriesConceptStep = 3;
    gameState.sceneProgress.volumeConceptComplete = 1;
    gameState.sceneProgress.volumeConceptStep = VOLUME_CONCEPT_PROMPTS.length;
    gameState.sceneProgress.recordsAccessComplete = 1;
    gameState.sceneProgress.recordsAccessStep = 3;
    gameState.sceneProgress.researchCharterComplete = 1;
    gameState.sceneProgress.researchCharterStep = RESEARCH_CHARTER_PROMPTS.length;
    gameState.sceneProgress.recordCollectionComplete = 1;
    gameState.sceneProgress.recordCollectionStep = 3;
    gameState.sceneProgress.repositoryCoverageMapComplete = 1;
    gameState.sceneProgress.repositoryCoverageMapStep = REPOSITORY_COVERAGE_MAP_PROMPTS.length;
    gameState.sceneProgress.selectionDocketComplete = 1;
    gameState.sceneProgress.selectionDocketStep = SELECTION_DOCKET_PROMPTS.length;
    gameState.sceneProgress.policyCoverageAuditComplete = 1;
    gameState.sceneProgress.policyCoverageAuditStep = POLICY_COVERAGE_AUDIT_PROMPTS.length;
    awardProcessStamp("rule");
  }
  if (["NetworkScene", "ReferralVaultScene", "SilentReadScene", "EndingScene"].includes(sceneName)) {
    awardProcessStamp("archive");
    gameState.sceneProgress.sourceNoteProvenanceComplete = 1;
    gameState.sceneProgress.sourceNoteProvenanceStep = SOURCE_NOTE_PROVENANCE_PROMPTS.length;
    gameState.sceneProgress.annotationDraftingComplete = 1;
    gameState.sceneProgress.annotationDraftingStep = 3;
    gameState.sceneProgress.manuscriptReviewComplete = 1;
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
    gameState.sceneProgress.clearanceProcedureComplete = 1;
    gameState.sceneProgress.clearanceProcedureStep = 3;
    gameState.sceneProgress.eo13526ReviewComplete = 1;
    gameState.sceneProgress.eo13526ReviewStep = 3;
    gameState.sceneProgress.declassificationReviewComplete = 1;
    gameState.sceneProgress.declassificationReviewStep = 3;
    gameState.reliability = Math.max(gameState.reliability, 100);
    addProcessItem("clearance_token");
    addVolumeFragment("Routing Fragment");
    gameState.documentPoints = Math.max(gameState.documentPoints, 45);
    setDocumentWorkflowState("source_note_047", "submitted_for_review");
    setDocumentWorkflowState("sbu_annotation_001", "referred");
  }
  if (["SilentReadScene", "EndingScene"].includes(sceneName)) {
    gameState.sceneProgress.foreignGovernmentPermissionComplete = 1;
    gameState.sceneProgress.foreignGovernmentPermissionStep = 3;
    gameState.sceneProgress.withholdingAppealComplete = 1;
    gameState.sceneProgress.withholdingAppealStep = 3;
    gameState.sceneProgress.senateHacReviewComplete = 1;
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
    gameState.sceneProgress.aiAnnotationReviewComplete = 1;
    gameState.sceneProgress.aiAnnotationReviewStep = AI_ANNOTATION_REVIEW_PROMPTS.length;
    gameState.sceneProgress.editorialMethodologyComplete = 1;
    gameState.sceneProgress.editorialMethodologyStep = 4;
    gameState.sceneProgress.editorialTreatmentComplete = 1;
    gameState.sceneProgress.editorialTreatmentStep = 3;
    gameState.sceneProgress.typeflowOrderComplete = 1;
    gameState.sceneProgress.typeflowOrderStep = 2;
    gameState.sceneProgress.typesettingPreparationComplete = 1;
    gameState.sceneProgress.typesettingPreparationStep = 2;
    gameState.sceneProgress.typesetterProofComplete = 1;
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
  const activeRoleFrameSheet = getSnesRoleFrameSheet(gameState.playerProfile.roleId);
  const activeCharacterKey = getCharacterKeyForProcessRole(gameState.playerProfile.roleId);
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
      dungeons: gameState.dungeons,
      questWorkflow,
      snesAtlas: getSnesAtlasReadout(),
      reliability: gameState.reliability,
      adventureHud: getAdventureHudReadout(),
      adventureSubscreen: getAdventureSubscreenReadout(),
      productionHud: getProductionStatusReadout(),
      heldItem: gameState.heldItem,
      documentPoints: gameState.documentPoints,
      playerProfile: gameState.playerProfile,
      activePlayerSprite: {
        mode: "artPack32x48",
        texture: activeCharacterKey,
        frameSet: {
          roleId: gameState.playerProfile.roleId,
          displayName: gameState.playerProfile.roleLabel,
          frameWidth: CHARACTER_FRAME.width,
          frameHeight: CHARACTER_FRAME.height,
          frameCount: 15,
          frames: [
            "idle-down",
            "idle-up",
            "idle-left",
            "idle-right",
            "walk-down-0",
            "walk-down-1",
            "walk-up-0",
            "walk-up-1",
            "walk-left-0",
            "walk-left-1",
            "walk-right-0",
            "walk-right-1",
            "interact",
            "read",
            "victory"
          ],
          legacyFallback: activeRoleFrameSheet
          ? {
              roleId: activeRoleFrameSheet.roleId,
              displayName: activeRoleFrameSheet.displayName,
              frameWidth: activeRoleFrameSheet.frame.width,
              frameHeight: activeRoleFrameSheet.frame.height,
              frameCount: activeRoleFrameSheet.frames.length,
              frames: [...activeRoleFrameSheet.frames]
            }
          : null
        },
        fallbackTexture: gameState.playerProfile.spriteKey,
        dimensions: { width: CHARACTER_FRAME.width, height: CHARACTER_FRAME.height },
        logicalAnchor: "foot/interaction point",
        collisionBox: { width: 16, height: 8, offsetY: -3 }
      },
      processStamps: gameState.processStamps,
      processItems: getProcessItemReadout(),
      danneItems: getDanneItemReadout(),
      codex: getCodexReadout(),
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
      publicationReadiness: getPublicationReadinessReadout(),
      statutoryClock: getStatutoryClockStateReadout(),
      standardsViolations: unresolvedStandardsViolations(),
      productionBoard: getProductionBoardReadout(),
      finalGateCertification: gameState.finalGateCertification,
      latestAbility: gameState.latestAbility,
      audioStatus: gameState.audioStatus,
      physicalVerification: gameState.physicalVerification,
      roomTraversal: gameState.roomTraversal,
      snesTransition: gameState.snesTransition,
      sceneProgress: { ...gameState.sceneProgress },
      inventory: gameState.inventory,
      latestMessage: gameState.latestMessage,
      player: gameState.player,
      playerFacing: gameState.playerFacing,
      playerAnimationState: gameState.playerAnimationState,
      playerCombat: gameState.playerCombat,
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
