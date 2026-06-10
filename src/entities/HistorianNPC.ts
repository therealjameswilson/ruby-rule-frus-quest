import Phaser from "phaser";
import { CHARACTERS, PALETTE } from "../game/constants";
import type { CharacterId } from "../game/types";

export class HistorianNPC {
  readonly sprite: Phaser.GameObjects.Image;
  readonly label: Phaser.GameObjects.Text;
  readonly id: CharacterId;
  private readonly shadow: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, id: CharacterId, x: number, y: number) {
    const character = CHARACTERS[id];
    this.id = id;
    this.shadow = scene.add.ellipse(x, y + 8, 12, 4, 0x050505, 0.28).setDepth(y - 1);
    this.sprite = scene.add.image(x, y, id).setDepth(y);
    this.label = scene.add
      .text(x, y + 12, character.displayName.toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.creamPaper,
        backgroundColor: PALETTE.black
      })
      .setOrigin(0.5, 0)
      .setDepth(y + 1);
    const delay = id.charCodeAt(0) * 45;
    scene.tweens.add({
      targets: [this.sprite, this.label],
      y: "-=1",
      duration: 520,
      delay,
      yoyo: true,
      repeat: -1,
      ease: "Stepped"
    });
    scene.tweens.add({
      targets: this.shadow,
      scaleX: 0.86,
      alpha: 0.2,
      duration: 520,
      delay,
      yoyo: true,
      repeat: -1,
      ease: "Stepped"
    });
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }
}
