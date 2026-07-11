import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "./constants";

export const DANNE_SCROLL_SLICES = {
  sourceKey: "danne-ui-scroll-corners",
  topLeft: { key: "pack-danne-scroll-top-left", x: 292, y: 133, width: 310, height: 220, outWidth: 24, outHeight: 22 },
  topRight: { key: "pack-danne-scroll-top-right", x: 835, y: 135, width: 322, height: 222, outWidth: 24, outHeight: 22 },
  bottomLeft: { key: "pack-danne-scroll-bottom-left", x: 291, y: 448, width: 315, height: 238, outWidth: 24, outHeight: 22 },
  bottomRight: { key: "pack-danne-scroll-bottom-right", x: 838, y: 451, width: 318, height: 236, outWidth: 24, outHeight: 22 },
  horizontalEdge: { key: "pack-danne-scroll-edge-horizontal", x: 146, y: 793, width: 1056, height: 74, outWidth: 16, outHeight: 8 },
  verticalEdge: { key: "pack-danne-scroll-edge-vertical", x: 1244, y: 91, width: 98, height: 771, outWidth: 8, outHeight: 16 }
} as const;

export const DANNE_LETTERBOX_SLICES = {
  sourceKey: "danne-ui-letterbox-bars",
  top: { key: "pack-danne-letterbox-top", x: 48, y: 144, width: 1568, height: 314, outWidth: GAME_WIDTH, outHeight: 48 },
  bottom: { key: "pack-danne-letterbox-bottom", x: 48, y: 542, width: 1568, height: 314, outWidth: GAME_WIDTH, outHeight: 48 }
} as const;

export const DANNE_BOSS_HUD_SLICES = {
  sourceKey: "danne-ui-boss-healthbar",
  empty: { key: "pack-danne-boss-healthbar-empty", x: 73, y: 355, width: 1360, height: 260, outWidth: 224, outHeight: 43 },
  critical: { key: "pack-danne-boss-healthbar-critical", x: 73, y: 642, width: 1360, height: 260, outWidth: 224, outHeight: 43 }
} as const;

type SliceDefinition = {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  outWidth: number;
  outHeight: number;
};

export interface ScrollFrameParts {
  hitArea: Phaser.GameObjects.Rectangle;
  objects: Phaser.GameObjects.GameObject[];
}

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

function alphaOutLightBackground(context: CanvasRenderingContext2D, width: number, height: number) {
  const imageData = context.getImageData(0, 0, width, height);
  const { data } = imageData;
  for (let index = 0; index < data.length; index += 4) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    if (r > 226 && g > 214 && b > 172) data[index + 3] = 0;
  }
  context.putImageData(imageData, 0, 0);
}

function createSliceTexture(scene: Phaser.Scene, sourceKey: string, slice: SliceDefinition) {
  if (scene.textures.exists(slice.key)) return;
  if (!scene.textures.exists(sourceKey)) return;
  const texture = scene.textures.createCanvas(slice.key, slice.outWidth, slice.outHeight);
  if (!texture) return;
  const source = scene.textures.get(sourceKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const context = texture.getContext();
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, slice.outWidth, slice.outHeight);
  context.drawImage(
    source,
    slice.x,
    slice.y,
    slice.width,
    slice.height,
    0,
    0,
    slice.outWidth,
    slice.outHeight
  );
  alphaOutLightBackground(context, slice.outWidth, slice.outHeight);
  texture.refresh();
  scene.textures.get(slice.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
}

export function ensureDanneUiSlices(scene: Phaser.Scene) {
  createSliceTexture(scene, DANNE_SCROLL_SLICES.sourceKey, DANNE_SCROLL_SLICES.topLeft);
  createSliceTexture(scene, DANNE_SCROLL_SLICES.sourceKey, DANNE_SCROLL_SLICES.topRight);
  createSliceTexture(scene, DANNE_SCROLL_SLICES.sourceKey, DANNE_SCROLL_SLICES.bottomLeft);
  createSliceTexture(scene, DANNE_SCROLL_SLICES.sourceKey, DANNE_SCROLL_SLICES.bottomRight);
  createSliceTexture(scene, DANNE_SCROLL_SLICES.sourceKey, DANNE_SCROLL_SLICES.horizontalEdge);
  createSliceTexture(scene, DANNE_SCROLL_SLICES.sourceKey, DANNE_SCROLL_SLICES.verticalEdge);
  createSliceTexture(scene, DANNE_LETTERBOX_SLICES.sourceKey, DANNE_LETTERBOX_SLICES.top);
  createSliceTexture(scene, DANNE_LETTERBOX_SLICES.sourceKey, DANNE_LETTERBOX_SLICES.bottom);
  createSliceTexture(scene, DANNE_BOSS_HUD_SLICES.sourceKey, DANNE_BOSS_HUD_SLICES.empty);
  createSliceTexture(scene, DANNE_BOSS_HUD_SLICES.sourceKey, DANNE_BOSS_HUD_SLICES.critical);
}

export function createDanneScrollFrame(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  fillHex = PALETTE.black
): ScrollFrameParts {
  ensureDanneUiSlices(scene);
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const hitArea = scene.add.rectangle(centerX, centerY, width, height, color(fillHex), 0.01).setScrollFactor(0);
  const fill = scene.add.rectangle(centerX, centerY, width - 12, height - 10, color(fillHex), 0.96).setScrollFactor(0);
  const objects: Phaser.GameObjects.GameObject[] = [hitArea, fill];

  if (!scene.textures.exists(DANNE_SCROLL_SLICES.topLeft.key)) {
    const border = scene.add.rectangle(centerX, centerY, width, height)
      .setStrokeStyle(2, color(PALETTE.creamPaper))
      .setScrollFactor(0);
    objects.push(border);
    return { hitArea, objects };
  }

  const left = x + 12;
  const right = x + width - 12;
  const top = y + 11;
  const bottom = y + height - 11;
  objects.push(
    scene.add.tileSprite(centerX, y + 4, Math.max(8, width - 40), 8, DANNE_SCROLL_SLICES.horizontalEdge.key).setScrollFactor(0),
    scene.add.tileSprite(centerX, y + height - 4, Math.max(8, width - 40), 8, DANNE_SCROLL_SLICES.horizontalEdge.key).setScrollFactor(0),
    scene.add.tileSprite(x + 4, centerY, 8, Math.max(8, height - 32), DANNE_SCROLL_SLICES.verticalEdge.key).setScrollFactor(0),
    scene.add.tileSprite(x + width - 4, centerY, 8, Math.max(8, height - 32), DANNE_SCROLL_SLICES.verticalEdge.key).setScrollFactor(0),
    scene.add.image(left, top, DANNE_SCROLL_SLICES.topLeft.key).setScrollFactor(0),
    scene.add.image(right, top, DANNE_SCROLL_SLICES.topRight.key).setScrollFactor(0),
    scene.add.image(left, bottom, DANNE_SCROLL_SLICES.bottomLeft.key).setScrollFactor(0),
    scene.add.image(right, bottom, DANNE_SCROLL_SLICES.bottomRight.key).setScrollFactor(0)
  );
  return { hitArea, objects };
}

export function createLetterboxBar(
  scene: Phaser.Scene,
  textureKey: string,
  y: number
) {
  if (scene.textures.exists(textureKey)) {
    return scene.add.image(GAME_WIDTH / 2, y, textureKey).setScrollFactor(0);
  }
  return scene.add.rectangle(GAME_WIDTH / 2, y, GAME_WIDTH, 48, color(PALETTE.black), 0.96).setScrollFactor(0);
}
