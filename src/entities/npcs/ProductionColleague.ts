import Phaser from "phaser";
import { characterAnimKey } from "../../art/character_anims";
import { getCharacterKeyForProductionColleague } from "../../art/characters";
import { PALETTE } from "../../game/constants";
import { SNES_PRODUCTION_COLLEAGUE_ASSETS, SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET } from "../../game/snesAtlas";
import type { SnesProductionColleagueFrameName, SnesProductionColleagueId } from "../../game/snesAtlas";
import { snapPixel } from "../../systems/pixelPerfect";
import { setRenderedPosition } from "../../systems/smoothMovement";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

interface ProductionColleagueOptions {
  label?: string;
  cueOffsetY?: number;
  pose?: SnesProductionColleagueFrameName;
}

export class ProductionColleague {
  readonly container: Phaser.GameObjects.Container;
  readonly id: SnesProductionColleagueId;
  readonly spriteKey: string;
  readonly frameName: string | null;
  readonly displayName: string;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly label: Phaser.GameObjects.Text;
  private readonly baseX: number;
  private readonly baseY: number;

  constructor(scene: Phaser.Scene, id: SnesProductionColleagueId, x: number, y: number, options: ProductionColleagueOptions = {}) {
    const asset = SNES_PRODUCTION_COLLEAGUE_ASSETS.find((item) => item.id === id) ?? SNES_PRODUCTION_COLLEAGUE_ASSETS[0];
    this.id = asset.id;
    this.displayName = asset.displayName;
    this.baseX = snapPixel(x);
    this.baseY = snapPixel(y);
    const artPackTexture = getCharacterKeyForProductionColleague(asset.id);
    const hasArtPackTexture = scene.textures.exists(artPackTexture);
    this.shadow = scene.add.ellipse(0, hasArtPackTexture ? 5 : 14, hasArtPackTexture ? 20 : 18, 6, color(PALETTE.black));
    const desiredFrame = `${asset.id}-${options.pose ?? "front"}`;
    const hasFrameSheet = !hasArtPackTexture
      && scene.textures.exists(SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.key)
      && scene.textures.get(SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.key).has(desiredFrame);
    const fallbackCharacterKey = scene.textures.exists("reviewer") ? "reviewer" : "sam";
    this.spriteKey = hasArtPackTexture
      ? artPackTexture
      : hasFrameSheet
      ? SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.key
      : scene.textures.exists(asset.key)
        ? asset.key
        : fallbackCharacterKey;
    this.frameName = hasFrameSheet ? desiredFrame : null;
    this.sprite = scene.add
      .sprite(0, 0, this.spriteKey, hasArtPackTexture ? 0 : this.frameName ?? undefined)
      .setOrigin(0.5, hasArtPackTexture ? 0.9 : 0.5);
    if (hasArtPackTexture) {
      const animKey = characterAnimKey(artPackTexture, this.animationForPose(options.pose));
      if (scene.anims.exists(animKey)) this.sprite.play(animKey);
    }
    this.label = scene.add.text(0, options.cueOffsetY ?? 18, options.label ?? asset.shortLabel, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5, 0);
    this.container = scene.add.container(this.baseX, this.baseY, [this.shadow, this.sprite, this.label]).setDepth(this.baseY);
    const delay = this.baseX * 6 + this.baseY;
    scene.tweens.add({
      targets: this.container,
      y: this.baseY - 1,
      duration: 640,
      delay,
      yoyo: true,
      repeat: -1,
      ease: "Stepped",
      onUpdate: () => {
        const renderPosition = setRenderedPosition(this.container, this.baseX, this.container.y);
        this.container.setDepth(renderPosition.y);
      }
    });
  }

  get x() {
    return this.container.x;
  }

  get y() {
    return this.container.y;
  }

  destroy() {
    this.container.destroy();
  }

  private animationForPose(pose: SnesProductionColleagueFrameName | undefined) {
    if (pose === "work") return "reading";
    if (pose === "approve") return "approval";
    if (pose === "walk") return "walk-down";
    if (pose === "back") return "idle-up";
    if (pose === "side") return "idle-right";
    return "idle-down";
  }
}
