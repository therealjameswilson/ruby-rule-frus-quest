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
      parts.push(scene.add.text(0, -5, label === "OpenNet" ? "PUBLIC\nCOPIES" : label === "ClassNet" ? "PROTECTED\nREVIEW" : "TEXT ONLY", {
        fontFamily: "Arial", fontSize: "4.5px", align: "center", color: PALETTE.creamPaper
      }).setOrigin(.5).setName("terminal-screen-status"));
      parts.push(scene.add.rectangle(-14, 7, 2, 2, color(border)).setName("terminal-status-lamp"));
    } else {
      parts.push(scene.add.image(0, 0, texture));
    }
    const plate = scene.add.rectangle(0, 20, 44, 11, color(PALETTE.black)).setStrokeStyle(1, color(border)).setName("terminal-nameplate");
    const displayLabel = label === "OpenNet" ? "OPENNET" : label === "ClassNet" ? "CLASSNET" : "STATECHAT";
    const text = scene.add
      .text(0, 20, displayLabel, {
        fontFamily: "Arial",
        fontStyle: "bold",
        fontSize: "6px",
        color: label === "ClassNet" ? PALETTE.classNetRed : label === "OpenNet" ? PALETTE.openNetGreen : PALETTE.terminalCyan
      })
      .setOrigin(0.5).setName("terminal-network-label");
    this.container = scene.add.container(x, y, [...parts, plate, text]).setDepth(y).setName(`terminal-${label.toLowerCase()}`);
  }
}
