import Phaser from "phaser";
import { characterAnimKey } from "../../art/character_anims";
import {
  ART_PACK_FOOT_OFFSET_Y,
  ART_PACK_LABEL_OFFSET_Y,
  ART_PACK_SPRITE_ORIGIN_Y,
  type CharacterKey
} from "../../art/characters";
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
  private readonly characterKey: CharacterKey | null;
  private readonly baseX: number;
  private readonly baseY: number;

  protected constructor(
    scene: Phaser.Scene,
    asset: DanneSpriteAsset | DanneRuntimeSpriteAsset,
    displayName: string,
    x: number,
    y: number,
    options: { label: string; scale?: number; labelY?: number; shadowY?: number; characterKey?: CharacterKey }
  ) {
    this.scene = scene;
    this.displayName = displayName;
    this.spriteKey = asset.key;
    this.baseX = snapPixel(x);
    this.baseY = snapPixel(y);
    // Prefer the crisp 32x48 character spritesheet when available; the DANN-E
    // runtime PNGs are large photographic frames that disintegrate when scaled
    // down to overworld size, so they are only a last-resort fallback.
    this.characterKey = options.characterKey && scene.textures.exists(options.characterKey)
      ? options.characterKey
      : null;
    // The crisp 32x48 art-pack sprite is drawn at scale 1 with origin (0.5, 0.9),
    // so its feet sit 48*(0.9-0.5) = ~19px below the container origin. The ground
    // shadow and name label must sit at the feet, otherwise the shadow floats up at
    // the body's waist and reads as a detached oval with the sprite hanging below it.
    // The legacy DANN-E runtime fallback is a large photographic frame scaled to
    // ~1/14 whose body fills a much taller region, so it needs the lower offsets the
    // callers pass in. Choosing offsets per mode keeps the shadow attached to the
    // feet and the label just below it in both cases.
    const usingArtPack = this.characterKey !== null;
    const shadowOffsetY = usingArtPack ? ART_PACK_FOOT_OFFSET_Y : options.shadowY ?? 12;
    const labelOffsetY = usingArtPack ? ART_PACK_LABEL_OFFSET_Y : options.labelY ?? 17;
    const shadow = scene.add.ellipse(0, shadowOffsetY, 20, 6, color(PALETTE.black));
    if (this.characterKey) {
      this.sprite = scene.add.sprite(0, 0, this.characterKey).setOrigin(0.5, ART_PACK_SPRITE_ORIGIN_Y).setScale(1);
    } else {
      this.sprite = scene.add
        .sprite(0, 0, scene.textures.exists(asset.key) ? asset.key : "marcus")
        .setOrigin(0.5, 0.88)
        .setScale(options.scale ?? 1 / 14);
    }
    const label = scene.add.text(0, labelOffsetY, options.label, {
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
    if (this.characterKey) {
      this.playCharacterAnim(suffix);
      return;
    }
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

  private playCharacterAnim(suffix: string) {
    if (!this.characterKey) return;
    const mapped = suffix === "attack"
      ? "reading"
      : suffix === "walk-up"
        ? "idle-up"
        : "idle-down";
    const animKey = characterAnimKey(this.characterKey, mapped);
    if (this.scene.anims.exists(animKey)) this.sprite.play(animKey, true);
  }
}
