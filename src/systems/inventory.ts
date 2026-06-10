import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { gameState } from "../game/state";

export class InventoryOverlay {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const box = scene.add.rectangle(128, 92, 220, 124, 0x050505, 0.97);
    const border = scene.add.rectangle(128, 92, 220, 124).setStrokeStyle(2, 0xd6a84f);
    const title = scene.add.text(26, 38, "MANUSCRIPT INVENTORY", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp
    });
    this.body = scene.add.text(26, 58, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.creamPaper,
      wordWrap: { width: 204, useAdvancedWrap: true },
      lineSpacing: 3
    });
    this.container = scene.add
      .container(0, 0, [box, border, title, this.body])
      .setDepth(980)
      .setVisible(false);
  }

  get active() {
    return this.container.visible;
  }

  toggle() {
    if (this.active) {
      this.container.setVisible(false);
      return;
    }
    const items = gameState.inventory.length
      ? gameState.inventory.map((item) => `- ${item}`).join("\n")
      : "- No manuscript pieces yet.";
    this.body.setText(items);
    this.container.setVisible(true);
  }
}
