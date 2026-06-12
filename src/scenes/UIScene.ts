import Phaser from "phaser";
import { updateInputCallbacks } from "../input/InputState";
import { TouchControls } from "../input/TouchControls";

export class UIScene extends Phaser.Scene {
  private controls!: TouchControls;

  constructor() {
    super("UIScene");
  }

  create() {
    this.controls = new TouchControls(this);
    updateInputCallbacks({
      toggleTouchOverlay: () => {
        this.controls.setForceVisible(!this.controls.isForceVisible);
      }
    });
    this.scene.bringToTop();
  }

  update() {
    this.controls.refreshForScene(this.activeGameplaySceneKey());
    this.scene.bringToTop();
  }

  private activeGameplaySceneKey() {
    const activeScenes = this.scene.manager.getScenes(true)
      .filter((scene) => scene.scene.key !== this.scene.key);
    return activeScenes.at(-1)?.scene.key ?? null;
  }
}
