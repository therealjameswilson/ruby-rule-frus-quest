import Phaser from "phaser";
import { PALETTE } from "../game/constants";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class BureaucraticWall {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  private readonly container: Phaser.GameObjects.Container;
  private readonly stone: Phaser.GameObjects.Image;
  private readonly crack: Phaser.GameObjects.Rectangle;
  private cleared = false;
  private wobbleOffset: number;

  constructor(scene: Phaser.Scene, id: string, label: string, x: number, y: number) {
    this.id = id;
    this.label = label;
    this.x = x;
    this.y = y;
    this.wobbleOffset = Phaser.Math.Between(0, 360);
    const shadow = scene.add.ellipse(0, 15, 36, 8, color(PALETTE.black), 0.38);
    this.stone = scene.add.image(0, 0, "bureaucratic-wall");
    const labelText = scene.add
      .text(0, 1, label.toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.creamPaper,
        align: "center",
        wordWrap: { width: 31, useAdvancedWrap: true }
      })
      .setOrigin(0.5);
    this.crack = scene.add.rectangle(9, -2, 1, 20, color(PALETTE.black), 0.45).setAngle(18).setVisible(false);
    this.container = scene.add.container(x, y, [shadow, this.stone, labelText, this.crack]).setDepth(y);
  }

  get isCleared() {
    return this.cleared;
  }

  update(timeMs: number) {
    if (this.cleared) return;
    const bob = Math.sin((timeMs + this.wobbleOffset) / 440) * 1.5;
    this.container.setY(this.y + bob);
    this.container.setDepth(this.y + bob);
  }

  markHit() {
    this.crack.setVisible(true);
    this.container.scene.tweens.add({
      targets: this.container,
      x: this.x + 2,
      duration: 45,
      yoyo: true,
      repeat: 3,
      ease: "Stepped"
    });
  }

  clear() {
    if (this.cleared) return;
    this.cleared = true;
    this.crack.setVisible(true);
    this.container.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scaleX: 1.18,
      scaleY: 0.68,
      duration: 260,
      ease: "Stepped",
      onComplete: () => this.container.destroy()
    });
  }
}
