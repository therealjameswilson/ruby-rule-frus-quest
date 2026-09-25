import { addArchiveTerminalArt } from "../../systems/archiveTerminalArt";
import Phaser from "phaser";
import { PALETTE } from "../../game/constants";

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
    const texture = label === "OpenNet" ? "opennet-terminal" : label === "ClassNet" ? "classnet-terminal" : "terminal-panel";
    const cabinet = addArchiveTerminalArt(scene, 0, -3)?.setName("terminal-detailed-cabinet");
    const parts: Phaser.GameObjects.GameObject[] = [];
    if (cabinet) {
      parts.push(cabinet);
      parts.push(scene.add.rectangle(0, -5, 28, 14, color(label === "ClassNet" ? PALETTE.deepRuby : PALETTE.shadowNavy), .65)
        .setName("terminal-screen-glass"));
      parts.push(scene.add.text(0, -5, label === "OpenNet" ? "PUBLIC COPIES" : label === "ClassNet" ? "PROTECTED" : "TEXT ONLY", {
        fontFamily: "Arial", fontSize: "4.5px", color: PALETTE.creamPaper
      }).setOrigin(.5).setName("terminal-screen-status"));
      parts.push(scene.add.rectangle(-14, 7, 2, 2, color(border)).setName("terminal-status-lamp"));
    } else {
      parts.push(scene.add.image(0, 0, texture));
    }
    const plate = scene.add.rectangle(0, 17, 34, 8, color(PALETTE.black)).setStrokeStyle(1, color(border));
    const displayLabel = label === "OpenNet" ? "OPEN" : label === "ClassNet" ? "CLASS" : "CHAT";
    const text = scene.add
      .text(0, 15, displayLabel, {
        fontFamily: "monospace",
        fontSize: "8px",
        color: label === "ClassNet" ? PALETTE.classNetRed : label === "OpenNet" ? PALETTE.openNetGreen : PALETTE.terminalCyan
      })
      .setOrigin(0.5);
    this.container = scene.add.container(x, y, [...parts, plate, text]).setDepth(y).setName(`terminal-${label.toLowerCase()}`);
  }
}
