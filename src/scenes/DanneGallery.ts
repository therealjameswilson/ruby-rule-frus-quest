import Phaser from "phaser";
import { danneAnimKey, registerDanneAnims } from "../art/danne_anims";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import {
  DANNE_GALLERY_ASSETS,
  DANNE_SPRITE_ASSETS,
  DANNE_VFX_ASSETS,
  type DanneGalleryAsset
} from "../game/danneAtlas";
import { setLatestMessage, setSceneState, setVisibleEntities } from "../game/state";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

interface TextureSourceSize {
  width: number;
  height: number;
}

function hasSpriteSheetFrame(asset: DanneGalleryAsset) {
  return "frameW" in asset && "frameH" in asset;
}

function isDanneSpriteKey(key: string) {
  return DANNE_SPRITE_ASSETS.some((asset) => asset.key === key);
}

function isDanneVfxKey(key: string) {
  return DANNE_VFX_ASSETS.some((asset) => asset.key === key);
}

function wrapLabel(label: string, maxLength: number) {
  if (label.length <= maxLength) return label;
  const midpoint = Math.floor(label.length / 2);
  const breakAt = label.lastIndexOf("-", midpoint) > 0 ? label.lastIndexOf("-", midpoint) : midpoint;
  return `${label.slice(0, breakAt)}\n${label.slice(breakAt + (label[breakAt] === "-" ? 1 : 0))}`;
}

export class DanneGallery extends Phaser.Scene {
  private worldHeight = GAME_HEIGHT;

  constructor() {
    super("DanneGallery");
  }

  preload() {
    for (const asset of DANNE_GALLERY_ASSETS) {
      if (this.textures.exists(asset.key)) continue;
      if (hasSpriteSheetFrame(asset)) {
        this.load.spritesheet(asset.key, asset.path, {
          frameWidth: asset.frameW,
          frameHeight: asset.frameH
        });
      } else {
        this.load.image(asset.key, asset.path);
      }
    }
  }

  create() {
    registerDanneAnims(this);
    setSceneState("DanneGallery", "debug", "Visual QA: verify every DANN-E pack texture is registered.");
    setLatestMessage("DANN-E Gallery loaded. Use wheel or Up/Down to scroll.");
    setVisibleEntities(DANNE_GALLERY_ASSETS.map((asset) => `${asset.category}: ${asset.key}`));
    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.drawBackground();
    this.drawHeader();
    this.drawAssetGrid();
    this.registerScrollControls();
  }

  private drawBackground() {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.shadowNavy));
    const dither = this.add.graphics();
    dither.fillStyle(color(PALETTE.black), 0.2);
    for (let y = 0; y < GAME_HEIGHT; y += 8) {
      for (let x = (y / 8) % 2 === 0 ? 0 : 4; x < GAME_WIDTH; x += 8) {
        dither.fillRect(x, y, 2, 2);
      }
    }
    dither.setScrollFactor(0);
  }

  private drawHeader() {
    this.add.rectangle(128, 13, 240, 20, color(PALETTE.deepRuby))
      .setStrokeStyle(2, color(PALETTE.goldStamp))
      .setScrollFactor(0)
      .setDepth(100);
    this.add.text(128, 7, "DANN-E PACK GALLERY", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(101);
    this.add.text(128, 25, `${DANNE_GALLERY_ASSETS.length} REGISTERED TEXTURES  |  WHEEL / UP / DOWN`, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(101);
  }

  private drawAssetGrid() {
    const cellWidth = 244;
    const cellHeight = 78;
    const columns = 1;
    const top = 45;
    const left = 6;
    const rows = Math.ceil(DANNE_GALLERY_ASSETS.length / columns);
    this.worldHeight = top + rows * cellHeight + 12;
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, this.worldHeight);

    DANNE_GALLERY_ASSETS.forEach((asset, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = left + column * cellWidth;
      const y = top + row * cellHeight;
      this.drawAssetCard(asset, x, y, cellWidth - 8, cellHeight - 8);
    });
  }

  private drawAssetCard(asset: DanneGalleryAsset, x: number, y: number, width: number, height: number) {
    const exists = this.textures.exists(asset.key);
    this.add.rectangle(x + width / 2, y + height / 2, width, height, color(PALETTE.black), 0.56)
      .setStrokeStyle(1, exists ? color(PALETTE.goldStamp) : color(PALETTE.classNetRed));
    this.add.text(x + 4, y + 3, asset.category, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.terminalCyan
    });
    this.add.text(x + 4, y + 10, wrapLabel(asset.key, 40), {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.creamPaper,
      lineSpacing: -1
    });

    if (!exists) {
      this.add.rectangle(x + width / 2, y + 43, 54, 30, color(PALETTE.classNetRed), 0.85);
      this.add.text(x + width / 2, y + 39, "MISSING", {
        fontFamily: "monospace",
        fontSize: "6px",
        color: PALETTE.white
      }).setOrigin(0.5);
      return;
    }

    const source = this.textures.get(asset.key).getSourceImage() as TextureSourceSize;
    const preview = this.createPreview(asset, x + width / 2, y + 42, source);
    this.add.text(x + width / 2, y + height - 14, `${source.width}x${source.height}`, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5);
    if (hasSpriteSheetFrame(asset)) {
      this.add.text(x + width / 2, y + height - 7, `FRAME ${asset.frameW}x${asset.frameH}`, {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.terminalCyan
      }).setOrigin(0.5);
    }
    preview.setDepth(2);
  }

  private createPreview(asset: DanneGalleryAsset, x: number, y: number, source: TextureSourceSize) {
    const maxWidth = 72;
    const maxHeight = 28;
    const scale = Math.min(maxWidth / source.width, maxHeight / source.height, 1);
    if (isDanneSpriteKey(asset.key)) {
      const sprite = this.add.sprite(x, y + 11, asset.key, 0).setOrigin(0.5, 0.9).setScale(scale);
      const anim = danneAnimKey(asset.key, "walk-down");
      if (this.anims.exists(anim)) sprite.play(anim);
      return sprite;
    }
    if (isDanneVfxKey(asset.key)) {
      const sprite = this.add.sprite(x, y, asset.key, 0).setOrigin(0.5).setScale(scale);
      const anim = danneAnimKey(asset.key, "fly");
      if (this.anims.exists(anim)) sprite.play(anim);
      return sprite;
    }
    return this.add.image(x, y, asset.key).setOrigin(0.5).setScale(scale);
  }

  private registerScrollControls() {
    this.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (_pointer: Phaser.Input.Pointer, _targets: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
        this.scrollBy(deltaY > 0 ? 32 : -32);
      }
    );
    this.input.keyboard?.on("keydown-DOWN", () => this.scrollBy(24));
    this.input.keyboard?.on("keydown-UP", () => this.scrollBy(-24));
    this.input.keyboard?.on("keydown-PAGE_DOWN", () => this.scrollBy(GAME_HEIGHT - 24));
    this.input.keyboard?.on("keydown-PAGE_UP", () => this.scrollBy(-GAME_HEIGHT + 24));
  }

  private scrollBy(delta: number) {
    const maxScroll = Math.max(0, this.worldHeight - GAME_HEIGHT);
    this.cameras.main.scrollY = Phaser.Math.Clamp(Math.round(this.cameras.main.scrollY + delta), 0, maxScroll);
  }
}
