import Phaser from "phaser";
import { PALETTE } from "../game/constants";

export class Manuscript {
  readonly container: Phaser.GameObjects.Container;
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;

  constructor(scene: Phaser.Scene, id: string, label: string, x: number, y: number) {
    this.id = id;
    this.label = label;
    this.x = x;
    this.y = y;
    const image = scene.add.image(0, 0, "manuscript");
    const text = scene.add
      .text(0, 12, label.toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.creamPaper,
        backgroundColor: PALETTE.black
      })
      .setOrigin(0.5, 0);
    this.container = scene.add.container(x, y, [image, text]).setDepth(y);
    scene.tweens.add({
      targets: image,
      y: -1,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: "Stepped"
    });
  }

  collect() {
    this.container.destroy();
  }
}
