import Phaser from "phaser";
import { danneAnimKey } from "../../art/danne_anims";
import { PALETTE } from "../../game/constants";
import type { DanneRuntimeSpriteAsset, DanneSpriteAsset } from "../../game/danneAtlas";
import { snapPixel } from "../../systems/pixelPerfect";
import { setRenderedPosition } from "../../systems/smoothMovement";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export abstract class DanneNpc {
  readonly displayName: string;
  readonly spriteKey: string;
  protected readonly scene: Phaser.Scene;
  protected readonly container: Phaser.GameObjects.Container;
  protected readonly sprite: Phaser.GameObjects.Sprite;
  private readonly baseX: number;
  private readonly baseY: number;

  protected constructor(
    scene: Phaser.Scene,
    asset: DanneSpriteAsset | DanneRuntimeSpriteAsset,
    displayName: string,
    x: number,
    y: number,
    options: { label: string; scale?: number; labelY?: number; shadowY?: number }
  ) {
    this.scene = scene;
    this.displayName = displayName;
    this.spriteKey = asset.key;
    this.baseX = snapPixel(x);
    this.baseY = snapPixel(y);
    const shadow = scene.add.ellipse(0, options.shadowY ?? 12, 20, 6, color(PALETTE.black));
    this.sprite = scene.add.sprite(0, 0, scene.textures.exists(asset.key) ? asset.key : "marcus")
      .setOrigin(0.5, 0.88)
      .setScale(options.scale ?? 1 / 14);
    const label = scene.add.text(0, options.labelY ?? 17, options.label, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5, 0);
    this.container = scene.add.container(this.baseX, this.baseY, [shadow, this.sprite, label]).setDepth(this.baseY);
    this.play("walk-down", true);
  }

  get x() {
    return this.container.x;
  }

  get y() {
    return this.container.y;
  }

  update(timeMs: number) {
    const renderPosition = setRenderedPosition(this.container, this.baseX, this.baseY + Math.sin(timeMs / 620) * 0.45);
    this.container.setDepth(renderPosition.y);
  }

  play(suffix: string, loop = false) {
    const key = danneAnimKey(this.spriteKey, suffix);
    if (this.scene.anims.exists(key)) {
      this.sprite.play({ key, repeat: loop ? -1 : 0 }, true);
    }
  }

  salute() {
    this.play("attack");
  }

  destroy() {
    this.container.destroy();
  }
}
