import { ITEM_REGISTRY, PROCESS_ROLES, PROCESS_STAMPS } from "./constants";
import type { ProcessItemId, ProcessStampId } from "./constants";
import type { ChoiceOption, GameMode, PlayerProfile, Position } from "./types";

interface VisibleThreat {
  label: string;
  x: number;
  y: number;
  behavior?: string;
  defeatMethod?: string;
  status?: string;
}

interface GameState {
  currentScene: string;
  mode: GameMode;
  objective: string;
  reliability: number;
  heldItem: string | null;
  documentPoints: number;
  inventory: string[];
  volumeFragments: string[];
  latestMessage: string;
  activeDialog: { speaker: string; text: string } | null;
  currentChoice: { title: string; options: ChoiceOption[] } | null;
  player: Position;
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
  visitedRoomIds: string[];
  exits: Partial<Record<"north" | "south" | "west" | "east", string>>;
}

export const gameState: GameState = {
  currentScene: "BootScene",
  mode: "boot",
  objective: "",
  reliability: 80,
  heldItem: null,
  documentPoints: 0,
  inventory: [],
  volumeFragments: [],
  latestMessage: "",
  activeDialog: null,
  currentChoice: null,
  player: { x: 128, y: 160 },
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
    spriteKey: defaultRole.spriteKey
  },
  processStamps: [],
  latestAbility: "",
  audioStatus: "audio ready",
  physicalVerification: null,
  roomTraversal: null
};

export function resetGameState() {
  gameState.currentScene = "TitleScene";
  gameState.mode = "title";
  gameState.objective = "Press start to verify.";
  gameState.reliability = 80;
  gameState.heldItem = null;
  gameState.documentPoints = 0;
  gameState.inventory = [];
  gameState.volumeFragments = [];
  gameState.latestMessage = "";
  gameState.activeDialog = null;
  gameState.currentChoice = null;
  gameState.player = { x: 128, y: 160 };
  gameState.nearestInteractable = null;
  gameState.visibleEntities = [];
  gameState.visibleThreats = [];
  gameState.sceneProgress = {};
  gameState.processStamps = [];
  gameState.latestAbility = "";
  gameState.physicalVerification = null;
  gameState.roomTraversal = null;
  setPlayerProfile("Sam", defaultRole);
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
}

export function setObjective(objective: string) {
  gameState.objective = objective;
}

export function setHeldItem(label: string | null) {
  gameState.heldItem = label;
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
}

export function setRoomTraversalState(state: RoomTraversalState | null) {
  gameState.roomTraversal = state
    ? {
        ...state,
        visitedRoomIds: [...state.visitedRoomIds]
      }
    : null;
}

export function setPlayerPosition(position: Position) {
  gameState.player = {
    x: Math.round(position.x),
    y: Math.round(position.y)
  };
}

export function addInventoryItem(label: string) {
  if (!gameState.inventory.includes(label)) {
    gameState.inventory.push(label);
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

export function addDocumentPoints(amount: number, reason: string) {
  gameState.documentPoints = Math.max(0, gameState.documentPoints + amount);
  const sign = amount >= 0 ? "+" : "";
  setLatestMessage(`${sign}${amount} document points: ${reason}`);
}

export function addVolumeFragment(label: string) {
  if (!gameState.volumeFragments.includes(label)) {
    gameState.volumeFragments.push(label);
    setLatestMessage(`FRUS fragment found: ${label}`);
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
    behavior: threat.behavior,
    defeatMethod: threat.defeatMethod,
    status: threat.status
  }));
}

export function setPlayerProfile(displayName: string, role: (typeof PROCESS_ROLES)[number]) {
  gameState.playerProfile = {
    displayName,
    roleId: role.id,
    roleLabel: role.label,
    ability: role.ability,
    remit: role.remit,
    spriteKey: role.spriteKey
  };
}

export function awardProcessStamp(stampId: ProcessStampId) {
  if (!gameState.processStamps.includes(stampId)) {
    gameState.processStamps.push(stampId);
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

export function getProductionStatusReadout() {
  const carriedItem = gameState.physicalVerification?.carriedItem ?? gameState.heldItem;
  const role = compactHudText(gameState.playerProfile.roleLabel, 12);
  const held = compactHeldItem(carriedItem);
  const objective = compactHudText(gameState.objective || "VERIFY", 42);
  return [
    `ROLE: ${role.padEnd(12, " ")} RELIABILITY ${reliabilityBlocks()}`,
    `HELD: ${held.padEnd(15, " ")} STAMPS: ${stampReadout()}`,
    `OBJECTIVE: ${objective}`
  ];
}

export function seedProgressForScene(sceneName: string) {
  if (["OfficeScene", "ArchiveScene", "NetworkScene", "ReferralVaultScene", "SilentReadScene", "EndingScene"].includes(sceneName)) {
    addProcessItem("citation_stamp");
    addVolumeFragment("Front Matter Fragment");
    gameState.documentPoints = Math.max(gameState.documentPoints, 15);
  }
  if (["ArchiveScene", "NetworkScene", "ReferralVaultScene", "SilentReadScene", "EndingScene"].includes(sceneName)) {
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
  }
  if (["ReferralVaultScene", "SilentReadScene", "EndingScene"].includes(sceneName)) {
    awardProcessStamp("network");
    gameState.reliability = Math.max(gameState.reliability, 100);
    addProcessItem("clearance_token");
    addVolumeFragment("Routing Fragment");
    gameState.documentPoints = Math.max(gameState.documentPoints, 45);
  }
  if (["SilentReadScene", "EndingScene"].includes(sceneName)) {
    awardProcessStamp("referral");
    addProcessItem("concurrence_slip");
    addProcessItem("red_pencil");
    addProcessItem("review_folder");
    addProcessItem("proof_lens");
    addVolumeFragment("Referral Fragment");
    gameState.documentPoints = Math.max(gameState.documentPoints, 60);
  }
  if (sceneName === "EndingScene") {
    awardProcessStamp("sop");
    addInventoryItem("AI Annotation Review Log");
    awardProcessStamp("proof");
    addProcessItem("buckram_key");
    addVolumeFragment("Proof Fragment");
    gameState.documentPoints = Math.max(gameState.documentPoints, 80);
  }
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
  return JSON.stringify(
    {
      coordinateSystem: "origin top-left; x increases right; y increases down; logical canvas 256x240",
      scene: gameState.currentScene,
      mode: gameState.mode,
      objective: gameState.objective,
      reliability: gameState.reliability,
      productionHud: getProductionStatusReadout(),
      heldItem: gameState.heldItem,
      documentPoints: gameState.documentPoints,
      playerProfile: gameState.playerProfile,
      processStamps: gameState.processStamps,
      processItems: getProcessItemReadout(),
      volumeFragments: gameState.volumeFragments,
      frusPrize: {
        cover: "ruby FRUS cover",
        piecesEarned: gameState.volumeFragments.length,
        piecesTotal: 5,
        assembled: gameState.volumeFragments.length >= 5
      },
      latestAbility: gameState.latestAbility,
      audioStatus: gameState.audioStatus,
      physicalVerification: gameState.physicalVerification,
      roomTraversal: gameState.roomTraversal,
      inventory: gameState.inventory,
      latestMessage: gameState.latestMessage,
      player: gameState.player,
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
