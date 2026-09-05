import type Phaser from "phaser";
import type { GameState } from "../game/state";

export function captureCodexReturnState(state: GameState) {
  return {
    currentScene: state.currentScene,
    mode: state.mode,
    objective: state.objective,
    heldItem: state.heldItem,
    nearestInteractable: state.nearestInteractable,
    visibleEntities: state.visibleEntities,
    visibleThreats: state.visibleThreats,
    activeDialog: state.activeDialog,
    currentChoice: state.currentChoice,
    physicalVerification: state.physicalVerification,
    roomTraversal: state.roomTraversal,
    finalGateCertification: state.finalGateCertification
  };
}

export function openCodex(scene: Phaser.Scene, returnSceneKey = scene.scene.key) {
  if (scene.scene.isActive("CodexScene")) {
    scene.scene.bringToTop("CodexScene");
    return;
  }
  scene.scene.launch("CodexScene", { returnScene: returnSceneKey });
  scene.scene.bringToTop("CodexScene");
}
