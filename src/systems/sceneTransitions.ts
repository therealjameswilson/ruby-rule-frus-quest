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
  for (let y = 8; y < GAME_HEIGHT; y += 16) {
    for (let x = 8; x < GAME_WIDTH; x += 16) {
      scene.add.image(x, y, textureKey).setDepth(-20);
    }
  }
}

export function drawRoomFrame(scene: Phaser.Scene, title: string, accent: string = PALETTE.goldStamp) {
  scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.shadowNavy)).setDepth(-30);
  scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 8, GAME_HEIGHT - 8).setStrokeStyle(4, color(PALETTE.buckramRed)).setDepth(50);
  scene.add.text(156, 6, title, {
    fontFamily: "monospace",
    fontSize: "8px",
    color: accent
  }).setDepth(802);
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
