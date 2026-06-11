import Phaser from "phaser";
import { setLatestMessage } from "../game/state";

export class OfficeScene extends Phaser.Scene {
  constructor() {
    super("OfficeScene");
  }

  create() {
    const targetScene = this.scene.manager.getScene("WorldScene") ? "WorldScene" : "GuideScene";
    setLatestMessage(`OfficeScene now opens ${targetScene === "WorldScene" ? "the tile-based FRUS overworld" : "the archive guide"}.`);
    this.scene.start(targetScene);
  }
}
