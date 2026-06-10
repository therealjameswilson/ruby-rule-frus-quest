import Phaser from "phaser";
import { PALETTE } from "../game/constants";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class Terminal {
  readonly container: Phaser.GameObjects.Container;
  readonly x: number;
  readonly y: number;

  constructor(scene: Phaser.Scene, x: number, y: number, label: "OpenNet" | "ClassNet" | "StateChat") {
    this.x = x;
    this.y = y;
    const border = label === "OpenNet" ? PALETTE.openNetGreen : label === "ClassNet" ? PALETTE.classNetRed : PALETTE.terminalCyan;
    const screen = scene.add.rectangle(0, 0, 34, 22, color(PALETTE.black)).setStrokeStyle(2, color(border));
    const keys = scene.add.rectangle(0, 16, 28, 8, color(PALETTE.sepiaInk));
    const text = scene.add
      .text(0, -4, label.toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "5px",
        color: label === "ClassNet" ? PALETTE.classNetRed : label === "OpenNet" ? PALETTE.openNetGreen : PALETTE.terminalCyan
      })
      .setOrigin(0.5);
    this.container = scene.add.container(x, y, [screen, keys, text]).setDepth(y);
  }
}
