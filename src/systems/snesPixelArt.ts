import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import type { RoomType } from "../game/constants";

type TrackFn = <T extends Phaser.GameObjects.GameObject>(object: T) => T;

interface SnesRoomLayerOptions {
  roomId: string;
  roomType?: RoomType;
  theme?: "office" | "archive" | "network" | "vault" | "proof" | "ending";
  track?: TrackFn;
}

interface SnesWorldMapOptions {
  viewportWidth?: number;
  viewportHeight?: number;
  cropX?: number;
  cropY?: number;
}

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

function keep<T extends Phaser.GameObjects.GameObject>(object: T, track?: TrackFn) {
  return track ? track(object) : object;
}

function themeColor(theme: SnesRoomLayerOptions["theme"], roomType?: RoomType) {
  if (theme === "network") return PALETTE.shadowNavy;
  if (theme === "vault" || roomType === "boss" || roomType === "secret") return PALETTE.deepRuby;
  if (theme === "proof") return PALETTE.creamPaper;
  if (theme === "office") return PALETTE.creamPaper;
  return PALETTE.archiveAmber;
}

function accentColor(theme: SnesRoomLayerOptions["theme"], roomType?: RoomType) {
  if (theme === "network") return PALETTE.terminalCyan;
  if (theme === "vault" || roomType === "boss") return PALETTE.classNetRed;
  if (roomType === "reward" || roomType === "secret") return PALETTE.goldStamp;
  if (theme === "proof") return PALETTE.buckramHighlight;
  return PALETTE.goldStamp;
}

export function addSnesRoomLayer(scene: Phaser.Scene, options: SnesRoomLayerOptions) {
  const track = options.track;
  const base = themeColor(options.theme, options.roomType);
  const accent = accentColor(options.theme, options.roomType);
  const shadow = options.theme === "network" ? PALETTE.black : PALETTE.deepRuby;
  keep(scene.add.rectangle(128, 130, 220, 164, color(PALETTE.black)).setDepth(-17), track);
  keep(scene.add.rectangle(128, 126, 212, 156, color(base)).setStrokeStyle(2, color(accent)).setDepth(-16), track);
  keep(scene.add.rectangle(128, 47, 204, 6, color(PALETTE.creamPaper)).setDepth(-15), track);
  keep(scene.add.rectangle(128, 207, 204, 6, color(shadow)).setDepth(-15), track);
  keep(scene.add.rectangle(25, 126, 6, 154, color(PALETTE.creamPaper)).setDepth(-15), track);
  keep(scene.add.rectangle(231, 126, 6, 154, color(shadow)).setDepth(-15), track);

  for (let y = 54; y <= 198; y += 16) {
    for (let x = 34; x <= 222; x += 16) {
      const odd = ((x + y) / 16) % 2 === 0;
      const dot = odd ? PALETTE.buckramRed : PALETTE.sepiaInk;
      keep(scene.add.rectangle(x, y, 2, 2, color(dot)).setDepth(-14), track);
    }
  }

  for (let x = 40; x <= 216; x += 32) {
    keep(scene.add.rectangle(x, 58, 18, 4, color(accent)).setDepth(-13), track);
    keep(scene.add.rectangle(x + 4, 192, 18, 4, color(PALETTE.black)).setDepth(-13), track);
  }

  const roomMarker = options.roomId.slice(0, 3).toUpperCase();
  keep(scene.add.rectangle(128, 48, 42, 9, color(PALETTE.black)).setStrokeStyle(1, color(accent)).setDepth(38), track);
  keep(scene.add.text(128, 44, roomMarker, {
    fontFamily: "monospace",
    fontSize: "6px",
    color: accent
  }).setOrigin(0.5, 0).setDepth(39), track);

  if (options.roomType === "puzzle" || options.roomType === "boss") {
    keep(scene.add.rectangle(128, 126, 82, 42, color(PALETTE.black)).setStrokeStyle(2, color(accent)).setDepth(-12), track);
    keep(scene.add.rectangle(128, 126, 64, 24, color(base)).setDepth(-11), track);
  }

  if (options.roomType === "secret") {
    for (let i = 0; i < 5; i += 1) {
      keep(scene.add.rectangle(64 + i * 32, 86 + (i % 2) * 48, 6, 6, color(PALETTE.goldStamp)).setDepth(-10), track);
      keep(scene.add.rectangle(65 + i * 32, 87 + (i % 2) * 48, 4, 4, color(PALETTE.deepRuby)).setDepth(-9), track);
    }
  }
}

export function addSnesWorldMap(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label = "FRUS ATLAS",
  textureKey = "frus-snes-atlas",
  track?: TrackFn,
  options: SnesWorldMapOptions = {}
) {
  const viewportWidth = options.viewportWidth ?? 80;
  const viewportHeight = options.viewportHeight ?? 56;
  const cropX = options.cropX ?? 0;
  const cropY = options.cropY ?? 0;
  keep(scene.add.rectangle(x + 3, y + 4, viewportWidth + 10, viewportHeight + 10, color(PALETTE.black)).setDepth(68), track);
  keep(scene.add.rectangle(x, y, viewportWidth + 8, viewportHeight + 8, color(PALETTE.sepiaInk)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(69), track);
  if (scene.textures.exists(textureKey)) {
    const texture = scene.textures.get(textureKey);
    const source = texture.getSourceImage() as { width?: number; height?: number };
    const sourceWidth = source.width ?? viewportWidth;
    const sourceHeight = source.height ?? viewportHeight;
    const left = x - viewportWidth / 2;
    const top = y - viewportHeight / 2;
    const atlas = scene.add
      .image(
        Math.round(left - cropX + sourceWidth / 2),
        Math.round(top - cropY + sourceHeight / 2),
        textureKey
      )
      .setDepth(70);
    const maskRect = scene.add.rectangle(x, y, viewportWidth, viewportHeight, color(PALETTE.black)).setVisible(false);
    atlas.setMask(maskRect.createGeometryMask());
    keep(maskRect, track);
    keep(atlas, track);
  } else {
    keep(scene.add.rectangle(x, y, viewportWidth, viewportHeight, color(PALETTE.creamPaper)).setDepth(70), track);
  }
  keep(scene.add.rectangle(x, y + viewportHeight / 2 - 3, Math.max(72, viewportWidth - 8), 8, color(PALETTE.black)).setDepth(71), track);
  keep(scene.add.text(x, y + viewportHeight / 2 - 6, label, {
    fontFamily: "monospace",
    fontSize: "5px",
    color: PALETTE.goldStamp
  }).setOrigin(0.5, 0).setDepth(72), track);
}

export function addSnesWorkflowRelicRack(scene: Phaser.Scene, x: number, y: number, track?: TrackFn) {
  keep(scene.add.rectangle(x + 2, y + 2, 138, 28, color(PALETTE.black)).setDepth(65), track);
  keep(scene.add.rectangle(x, y, 136, 26, color(PALETTE.deepRuby)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(66), track);
  if (scene.textures.exists("snes-workflow-tools")) {
    keep(scene.add.image(x, y - 1, "snes-workflow-tools").setDepth(67), track);
  }
  keep(scene.add.text(x, y + 11, "FRUS WORKFLOW RELICS", {
    fontFamily: "monospace",
    fontSize: "5px",
    color: PALETTE.creamPaper
  }).setOrigin(0.5, 0).setDepth(68), track);
}
