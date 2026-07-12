import Phaser from "phaser";
import { unlockCodexEntry } from "../../game/codex";
import { DANNE_RUNTIME_SPRITE_ASSETS } from "../../game/danneAtlas";
import { DanneNpc } from "./DanneNpc";

const JUNIOR_COMPILER_ASSET = DANNE_RUNTIME_SPRITE_ASSETS.find((asset) => asset.entityId === "junior-compiler")!;

export class JuniorCompiler extends DanneNpc {
  private nextPoseAt = 0;
  private reading = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    unlockCodexEntry("npc-junior-compiler");
    super(scene, JUNIOR_COMPILER_ASSET, "Junior Compiler", x, y, {
      label: "",
      characterKey: "compiler",
      labelY: 22,
      shadowY: 16
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
