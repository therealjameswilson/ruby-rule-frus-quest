import { PROCESS_ROLES } from "./constants";
import type { ProcessStampId } from "./constants";
import type { ChoiceOption, GameMode, PlayerProfile, Position } from "./types";

interface GameState {
  currentScene: string;
  mode: GameMode;
  objective: string;
  reliability: number;
  inventory: string[];
  latestMessage: string;
  activeDialog: { speaker: string; text: string } | null;
  currentChoice: { title: string; options: ChoiceOption[] } | null;
  player: Position;
  nearestInteractable: string | null;
  visibleEntities: string[];
  sceneProgress: Record<string, number>;
  playerProfile: PlayerProfile;
  processStamps: ProcessStampId[];
  latestAbility: string;
  audioStatus: string;
}

const defaultRole = PROCESS_ROLES[0];

export const gameState: GameState = {
  currentScene: "BootScene",
  mode: "boot",
  objective: "",
  reliability: 80,
  inventory: [],
  latestMessage: "",
  activeDialog: null,
  currentChoice: null,
  player: { x: 128, y: 160 },
  nearestInteractable: null,
  visibleEntities: [],
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
  audioStatus: "audio ready"
};

export function resetGameState() {
  gameState.currentScene = "TitleScene";
  gameState.mode = "title";
  gameState.objective = "Press start to verify.";
  gameState.reliability = 80;
  gameState.inventory = [];
  gameState.latestMessage = "";
  gameState.activeDialog = null;
  gameState.currentChoice = null;
  gameState.player = { x: 128, y: 160 };
  gameState.nearestInteractable = null;
  gameState.visibleEntities = [];
  gameState.sceneProgress = {};
  gameState.processStamps = [];
  gameState.latestAbility = "";
  setPlayerProfile("Sam", defaultRole);
}

export function setSceneState(sceneName: string, mode: GameMode, objective: string) {
  gameState.currentScene = sceneName;
  gameState.mode = mode;
  gameState.objective = objective;
  gameState.nearestInteractable = null;
  gameState.visibleEntities = [];
  gameState.activeDialog = null;
  gameState.currentChoice = null;
}

export function setObjective(objective: string) {
  gameState.objective = objective;
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

export function setNearestInteractable(label: string | null) {
  gameState.nearestInteractable = label;
}

export function setVisibleEntities(labels: string[]) {
  gameState.visibleEntities = labels;
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

export function seedProgressForScene(sceneName: string) {
  if (["ArchiveScene", "NetworkScene", "ReferralVaultScene", "SilentReadScene", "EndingScene"].includes(sceneName)) {
    awardProcessStamp("rule");
  }
  if (["NetworkScene", "ReferralVaultScene", "SilentReadScene", "EndingScene"].includes(sceneName)) {
    awardProcessStamp("archive");
    gameState.reliability = Math.max(gameState.reliability, 90);
    for (const item of ["Telegram", "Source Note", "Cross-Ref"]) {
      addInventoryItem(item);
    }
  }
  if (["ReferralVaultScene", "SilentReadScene", "EndingScene"].includes(sceneName)) {
    awardProcessStamp("network");
    gameState.reliability = Math.max(gameState.reliability, 100);
  }
  if (["SilentReadScene", "EndingScene"].includes(sceneName)) {
    awardProcessStamp("referral");
  }
  if (sceneName === "EndingScene") {
    awardProcessStamp("proof");
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
      playerProfile: gameState.playerProfile,
      processStamps: gameState.processStamps,
      latestAbility: gameState.latestAbility,
      audioStatus: gameState.audioStatus,
      inventory: gameState.inventory,
      latestMessage: gameState.latestMessage,
      player: gameState.player,
      nearestInteractable: gameState.nearestInteractable,
      visibleEntities: gameState.visibleEntities,
      dialog: gameState.activeDialog,
      choice: gameState.currentChoice
    },
    null,
    2
  );
}
