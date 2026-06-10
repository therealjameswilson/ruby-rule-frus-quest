import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { retroAudio } from "./audio";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export function transitionTo(scene: Phaser.Scene, target: string) {
  retroAudio.transition();
  scene.cameras.main.fadeOut(180, 5, 5, 5);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    scene.scene.start(target);
  });
}

export function drawTiledFloor(scene: Phaser.Scene, textureKey: string) {
  for (let y = 40; y < GAME_HEIGHT; y += 16) {
    for (let x = 8; x < GAME_WIDTH; x += 16) {
      scene.add.image(x, y, textureKey).setDepth(-20);
    }
  }
}

export function drawRoomFrame(scene: Phaser.Scene, title: string, accent: string = PALETTE.goldStamp) {
  scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.shadowNavy)).setDepth(-30);
  drawAdventureHud(scene, title, accent);
  drawDungeonWalls(scene, accent);
  scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 16, GAME_WIDTH - 8, GAME_HEIGHT - 40).setStrokeStyle(4, color(PALETTE.buckramRed)).setDepth(50);
}

function drawAdventureHud(scene: Phaser.Scene, title: string, accent: string) {
  scene.add.rectangle(GAME_WIDTH / 2, 16, GAME_WIDTH, 32, color(PALETTE.black), 0.96).setDepth(760);
  scene.add.rectangle(GAME_WIDTH / 2, 31, GAME_WIDTH, 2, color(PALETTE.buckramRed)).setDepth(761);
  scene.add.rectangle(26, 16, 42, 20, color(PALETTE.stoneGray)).setStrokeStyle(1, color(PALETTE.creamPaper)).setDepth(762);
  scene.add.rectangle(26, 16, 34, 12, color(PALETTE.stoneDark)).setDepth(763);
  const roomHash = title.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const rooms = [
    [16, 12],
    [25, 12],
    [34, 12],
    [25, 19],
    [25, 6]
  ];
  rooms.forEach(([x, y], index) => {
    const active = index === roomHash % rooms.length;
    scene.add.rectangle(x, y, active ? 6 : 4, active ? 5 : 4, color(active ? accent : PALETTE.stoneLight)).setDepth(764);
  });
  scene.add.text(52, 5, title, {
    fontFamily: "monospace",
    fontSize: "6px",
    color: accent
  }).setDepth(802);
  drawHudIcon(scene, 141, 16, "B", PALETTE.terminalCyan);
  drawHudIcon(scene, 160, 16, "A", PALETTE.goldStamp);
  scene.add.text(188, 5, "-LIFE-", {
    fontFamily: "monospace",
    fontSize: "7px",
    color: PALETTE.buckramHighlight
  }).setDepth(802);
  for (let i = 0; i < 5; i += 1) {
    scene.add.rectangle(214 + i * 7, 20, 5, 5, color(PALETTE.buckramHighlight)).setDepth(802);
    scene.add.rectangle(215 + i * 7, 18, 3, 2, color(PALETTE.goldStamp)).setDepth(803);
  }
}

function drawHudIcon(scene: Phaser.Scene, x: number, y: number, label: string, accent: string) {
  scene.add.rectangle(x, y, 14, 20, color(PALETTE.black)).setStrokeStyle(2, color(accent)).setDepth(802);
  scene.add.text(x, y - 7, label, {
    fontFamily: "monospace",
    fontSize: "6px",
    color: PALETTE.creamPaper
  }).setOrigin(0.5).setDepth(803);
  scene.add.rectangle(x, y + 3, 5, 8, color(accent)).setDepth(803);
}

function drawDungeonWalls(scene: Phaser.Scene, accent: string) {
  const topY = 40;
  const bottomY = 216;
  for (let x = 8; x <= GAME_WIDTH - 8; x += 16) {
    if (x >= 112 && x <= 144) continue;
    drawStoneBlock(scene, x, topY, accent);
    if (x < 112 || x > 144) drawStoneBlock(scene, x, bottomY, accent);
  }
  for (let y = 56; y <= 200; y += 16) {
    if (y >= 104 && y <= 136) continue;
    drawStoneBlock(scene, 8, y, accent);
    drawStoneBlock(scene, GAME_WIDTH - 8, y, accent);
  }
  scene.add.rectangle(128, 220, 30, 8, color(PALETTE.black), 0.82).setDepth(43);
  scene.add.rectangle(128, 36, 30, 8, color(PALETTE.black), 0.82).setDepth(43);
}

function drawStoneBlock(scene: Phaser.Scene, x: number, y: number, accent: string) {
  scene.add.rectangle(x, y, 16, 16, color(PALETTE.stoneDark)).setDepth(40);
  scene.add.rectangle(x - 1, y - 1, 13, 13, color(PALETTE.stoneGray)).setDepth(41);
  scene.add.rectangle(x - 4, y - 4, 5, 5, color(PALETTE.stoneLight)).setDepth(42);
  scene.add.rectangle(x + 3, y + 5, 7, 2, color(accent), 0.65).setDepth(42);
}

export function addObjectiveText(scene: Phaser.Scene) {
  return scene.add.text(8, 224, "", {
    fontFamily: "monospace",
    fontSize: "8px",
    color: PALETTE.creamPaper,
    backgroundColor: PALETTE.black
  }).setDepth(810);
}

export function addTerminalPanel(scene: Phaser.Scene, x: number, y: number, lines: string[], border = PALETTE.terminalCyan) {
  const box = scene.add.rectangle(x, y, 92, 70, color(PALETTE.black), 0.94).setStrokeStyle(2, color(border));
  const text = scene.add.text(x - 40, y - 27, lines.join("\n"), {
    fontFamily: "monospace",
    fontSize: "7px",
    color: PALETTE.terminalCyan,
    wordWrap: { width: 80, useAdvancedWrap: true },
    lineSpacing: 1
  });
  return scene.add.container(0, 0, [box, text]).setDepth(90);
}
