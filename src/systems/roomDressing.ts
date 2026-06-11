import Phaser from "phaser";
import { PALETTE } from "../game/constants";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export function addDesk(scene: Phaser.Scene, x: number, y: number, label?: string) {
  scene.add.rectangle(x, y, 38, 20, color(PALETTE.sepiaInk)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(y - 2);
  scene.add.rectangle(x - 12, y - 4, 10, 6, color(PALETTE.creamPaper)).setDepth(y - 1);
  scene.add.rectangle(x + 8, y + 2, 12, 2, color(PALETTE.archiveAmber)).setDepth(y - 1);
  if (label) {
    scene.add.text(x, y - 4, label, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.black
    }).setOrigin(0.5).setDepth(y);
  }
}

export function addBookcase(scene: Phaser.Scene, x: number, y: number, width = 34, height = 34) {
  scene.add.rectangle(x, y, width, height, color(PALETTE.sepiaInk)).setStrokeStyle(2, color(PALETTE.deepRuby)).setDepth(y - 2);
  for (let row = -1; row <= 1; row += 1) {
    const shelfY = y + row * 9;
    scene.add.rectangle(x, shelfY + 4, width - 5, 1, color(PALETTE.goldStamp)).setDepth(y - 1);
    for (let i = 0; i < 5; i += 1) {
      const bookColor = [PALETTE.buckramRed, PALETTE.goldStamp, PALETTE.archiveAmber, PALETTE.creamPaper][(i + row + 4) % 4];
      scene.add.rectangle(x - width / 2 + 6 + i * 5, shelfY, 3, 7, color(bookColor)).setDepth(y - 1);
    }
  }
}

export function addRubyVolumeStack(scene: Phaser.Scene, x: number, y: number, count = 3) {
  for (let i = 0; i < count; i += 1) {
    scene.add.rectangle(x + i * 3, y - i * 6, 24, 8, color(PALETTE.buckramRed)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(y + i);
    scene.add.rectangle(x - 5 + i * 3, y - i * 6, 10, 1, color(PALETTE.goldStamp)).setDepth(y + i + 1);
  }
}

export function addWallMap(scene: Phaser.Scene, x: number, y: number, label = "MAP") {
  scene.add.rectangle(x + 2, y + 3, 48, 30, color(PALETTE.black)).setDepth(y - 3);
  scene.add.rectangle(x, y, 48, 30, color(PALETTE.creamPaper)).setStrokeStyle(2, color(PALETTE.sepiaInk)).setDepth(y - 2);
  scene.add.rectangle(x - 16, y - 7, 12, 7, color(PALETTE.mapWater)).setDepth(y - 1);
  scene.add.rectangle(x - 2, y - 3, 18, 3, color(PALETTE.archiveAmber)).setDepth(y - 1);
  scene.add.rectangle(x + 7, y + 5, 13, 3, color(PALETTE.buckramRed)).setDepth(y - 1);
  scene.add.rectangle(x - 14, y + 8, 5, 5, color(PALETTE.goldStamp)).setDepth(y);
  scene.add.rectangle(x + 17, y - 8, 4, 4, color(PALETTE.classNetRed)).setDepth(y);
  scene.add.text(x, y + 10, label, {
    fontFamily: "monospace",
    fontSize: "5px",
    color: PALETTE.deepRuby
  }).setOrigin(0.5).setDepth(y + 1);
}

export function addDocumentStack(scene: Phaser.Scene, x: number, y: number, flagged = false) {
  for (let i = 0; i < 4; i += 1) {
    scene.add.rectangle(x + i, y - i * 3, 20, 12, color(PALETTE.creamPaper)).setStrokeStyle(1, color(PALETTE.sepiaInk)).setDepth(y + i);
    scene.add.rectangle(x - 5 + i, y - 2 - i * 3, 9, 1, color(PALETTE.sepiaInk)).setDepth(y + i + 1);
  }
  if (flagged) {
    scene.add.rectangle(x - 12, y - 9, 3, 22, color(PALETTE.classNetRed)).setDepth(y + 6);
  }
}

export function addArchiveShelves(scene: Phaser.Scene) {
  addBookcase(scene, 24, 82, 32, 58);
  addBookcase(scene, 232, 82, 32, 58);
  addBookcase(scene, 24, 158, 32, 52);
  addBookcase(scene, 232, 158, 32, 52);
}

export function addNetworkCables(scene: Phaser.Scene) {
  const cyan = color(PALETTE.terminalCyan);
  const green = color(PALETTE.openNetGreen);
  const red = color(PALETTE.classNetRed);
  scene.add.line(0, 0, 60, 124, 102, 100, cyan).setLineWidth(2).setDepth(2);
  scene.add.line(0, 0, 196, 124, 154, 100, cyan).setLineWidth(2).setDepth(2);
  scene.add.line(0, 0, 60, 142, 60, 182, green).setLineWidth(3).setDepth(2);
  scene.add.line(0, 0, 196, 142, 196, 182, red).setLineWidth(3).setDepth(2);
  for (let i = 0; i < 9; i += 1) {
    scene.add.rectangle(42 + i * 22, 102, 4, 4, i % 2 === 0 ? green : red).setDepth(3);
  }
}

export function addVaultBlocks(scene: Phaser.Scene) {
  for (let x = 18; x <= 238; x += 22) {
    scene.add.rectangle(x, 42, 14, 10, color(PALETTE.stoneGray)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(0);
  }
  scene.add.rectangle(128, 193, 160, 12, color(PALETTE.black)).setStrokeStyle(1, color(PALETTE.goldStamp)).setDepth(2);
  scene.add.text(128, 188, "VISIBLE WITHHOLDINGS ARE PART OF THE RECORD", {
    fontFamily: "monospace",
    fontSize: "6px",
    color: PALETTE.goldStamp
  }).setOrigin(0.5).setDepth(3);
}

export function addProofingTable(scene: Phaser.Scene, x: number, y: number) {
  scene.add.rectangle(x, y, 224, 18, color(PALETTE.sepiaInk)).setStrokeStyle(2, color(PALETTE.deepRuby)).setDepth(y - 3);
  scene.add.rectangle(x - 84, y - 4, 18, 6, color(PALETTE.goldStamp)).setDepth(y - 2);
  scene.add.rectangle(x + 82, y - 4, 18, 6, color(PALETTE.terminalCyan)).setDepth(y - 2);
  scene.add.rectangle(x, y - 8, 5, 18, color(PALETTE.black)).setDepth(y - 1);
}

export function addTinySparkle(scene: Phaser.Scene, x: number, y: number, tint: string = PALETTE.goldStamp) {
  const sparkle = scene.add.container(x, y).setDepth(700);
  sparkle.add([
    scene.add.rectangle(0, -3, 1, 3, color(tint)),
    scene.add.rectangle(0, 3, 1, 3, color(tint)),
    scene.add.rectangle(-3, 0, 3, 1, color(tint)),
    scene.add.rectangle(3, 0, 3, 1, color(tint))
  ]);
  scene.tweens.add({ targets: sparkle, y: y - 1, duration: 360, yoyo: true, repeat: -1, ease: "Stepped" });
  return sparkle;
}
