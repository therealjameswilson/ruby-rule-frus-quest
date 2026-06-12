import Phaser from "phaser";
import { PALETTE } from "../../game/constants";
import { SNES_PRODUCTION_COLLEAGUE_ASSETS, SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET } from "../../game/snesAtlas";
import type { SnesProductionColleagueFrameName, SnesProductionColleagueId } from "../../game/snesAtlas";
import { setPixelPosition, snapPixel } from "../../systems/pixelPerfect";

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
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;
  private readonly baseX: number;
  private readonly baseY: number;

  constructor(scene: Phaser.Scene, id: SnesProductionColleagueId, x: number, y: number, options: ProductionColleagueOptions = {}) {
    const asset = SNES_PRODUCTION_COLLEAGUE_ASSETS.find((item) => item.id === id) ?? SNES_PRODUCTION_COLLEAGUE_ASSETS[0];
    this.id = asset.id;
    this.displayName = asset.displayName;
    this.baseX = snapPixel(x);
    this.baseY = snapPixel(y);
    this.shadow = scene.add.ellipse(0, 14, 18, 6, color(PALETTE.black));
    const desiredFrame = `${asset.id}-${options.pose ?? "front"}`;
    const hasFrameSheet = scene.textures.exists(SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.key)
      && scene.textures.get(SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.key).has(desiredFrame);
    this.spriteKey = hasFrameSheet
      ? SNES_PRODUCTION_COLLEAGUE_FRAME_SHEET.key
      : scene.textures.exists(asset.key)
        ? asset.key
        : "sam";
    this.frameName = hasFrameSheet ? desiredFrame : null;
    this.sprite = scene.add.image(0, 0, this.spriteKey, this.frameName ?? undefined);
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
        setPixelPosition(this.container, this.baseX, this.container.y);
        this.container.setDepth(snapPixel(this.container.y));
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
}
