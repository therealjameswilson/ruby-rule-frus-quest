import Phaser from "phaser";
import { unlockCodexEntry } from "../../game/codex";
import { DANNE_RUNTIME_SPRITE_ASSETS } from "../../game/danneAtlas";
import { DanneNpc } from "./DanneNpc";

const JUNIOR_COMPILER_ASSET = DANNE_RUNTIME_SPRITE_ASSETS.find((asset) => asset.entityId === "junior-compiler")!;

export class JuniorCompiler extends DanneNpc {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    unlockCodexEntry("npc-junior-compiler");
    super(scene, JUNIOR_COMPILER_ASSET, "General Editor Kathy", x, y, {
      label: "",
      characterKey: "compiler",
      labelY: 22,
      shadowY: 16
    });
    // Keep the desk colleague visibly reading, distinct from the compiler hero.
    this.play("attack");
  }

  dialogLines() {
    return [
      "Production status: source-note checks are active.",
      "Repository, collection, and folder stay together.",
      "DANN-E may flag patterns. People decide the record."
    ];
  }
}
