import Phaser from "phaser";
import { CHARACTERS, PALETTE } from "../game/constants";
import type { CharacterId } from "../game/types";
import { getSnesNpcTextureKey } from "../game/snesAtlas";
import { snapPixel } from "../systems/pixelPerfect";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class HistorianNPC {
  readonly sprite: Phaser.GameObjects.Image;
  readonly label: Phaser.GameObjects.Text;
  readonly id: CharacterId;
  readonly textureKey: string;
  private readonly shadow: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, id: CharacterId, x: number, y: number) {
    const character = CHARACTERS[id];
    this.id = id;
    const snesTexture = getSnesNpcTextureKey(id);
    const usesSnesTexture = scene.textures.exists(snesTexture);
    this.textureKey = usesSnesTexture ? snesTexture : id;
    this.shadow = scene.add
      .ellipse(snapPixel(x), snapPixel(y + (usesSnesTexture ? 14 : 8)), usesSnesTexture ? 18 : 12, usesSnesTexture ? 6 : 4, color(PALETTE.black))
      .setDepth(snapPixel(y - 1));
    this.sprite = scene.add.image(snapPixel(x), snapPixel(y), this.textureKey).setDepth(snapPixel(y));
    this.label = scene.add
      .text(snapPixel(x), snapPixel(y + (usesSnesTexture ? 18 : 12)), character.displayName.toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.creamPaper,
        backgroundColor: PALETTE.black
      })
      .setOrigin(0.5, 0)
      .setDepth(snapPixel(y + 1));
    const delay = id.charCodeAt(0) * 45;
    scene.tweens.add({
      targets: [this.sprite, this.label],
      y: "-=1",
      duration: 520,
      delay,
      yoyo: true,
      repeat: -1,
      ease: "Stepped",
      onUpdate: () => {
        this.sprite.y = snapPixel(this.sprite.y);
        this.label.y = snapPixel(this.label.y);
        this.shadow.y = snapPixel(this.shadow.y);
      }
    });
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }

  destroy() {
    this.shadow.destroy();
    this.sprite.destroy();
    this.label.destroy();
  }
}
