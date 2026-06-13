import Phaser from "phaser";
import { DANNE_RUNTIME_SPRITE_ASSETS } from "../../game/danneAtlas";
import { DanneNpc } from "./DanneNpc";

const JUNIOR_COMPILER_ASSET = DANNE_RUNTIME_SPRITE_ASSETS.find((asset) => asset.entityId === "junior-compiler")!;

export class JuniorCompiler extends DanneNpc {
  private nextPoseAt = 0;
  private reading = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, JUNIOR_COMPILER_ASSET, "Junior Compiler", x, y, {
      label: "JR COMP",
      scale: 0.18,
      labelY: 18,
      shadowY: 13
    });
  }

  override update(timeMs: number) {
    super.update(timeMs);
    if (timeMs < this.nextPoseAt) return;
    this.nextPoseAt = timeMs + 1500;
    this.reading = !this.reading;
    this.play(this.reading ? "attack" : "walk-down", !this.reading);
  }

  dialogLines() {
    return [
      "Production status: source-note checks are active.",
      "Repository, collection, and folder stay together.",
      "DANN-E may flag patterns. People decide the record."
    ];
  }
}
