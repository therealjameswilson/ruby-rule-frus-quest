import Phaser from "phaser";
import { CHARACTERS, PALETTE } from "../game/constants";
import type { CharacterId } from "../game/types";

export class HistorianNPC {
  readonly sprite: Phaser.GameObjects.Image;
  readonly label: Phaser.GameObjects.Text;
  readonly id: CharacterId;

  constructor(scene: Phaser.Scene, id: CharacterId, x: number, y: number) {
    const character = CHARACTERS[id];
    this.id = id;
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
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }
}
