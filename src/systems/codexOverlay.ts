import Phaser from "phaser";

export function openCodex(scene: Phaser.Scene, returnSceneKey = scene.scene.key) {
  if (scene.scene.isActive("CodexScene")) {
    scene.scene.bringToTop("CodexScene");
    return;
  }
  scene.scene.launch("CodexScene", { returnScene: returnSceneKey });
  scene.scene.bringToTop("CodexScene");
}
