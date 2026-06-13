import Phaser from "phaser";
import { DANNE_RUNTIME_SPRITE_ASSETS } from "../../game/danneAtlas";
import { DanneNpc } from "./DanneNpc";

const MARINE_GUARD_ASSET = DANNE_RUNTIME_SPRITE_ASSETS.find((asset) => asset.entityId === "marine-guard")!;

export class MarineSecurityGuard extends DanneNpc {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, MARINE_GUARD_ASSET, "Marine Security Guard", x, y, {
      label: "GUARD",
      scale: 0.15,
      labelY: 17,
      shadowY: 13
    });
  }

  blockedDialog() {
    this.salute();
    return [
      "Classified door remains closed.",
      "Bring the Master Declass Key after approved review."
    ];
  }

  clearedDialog() {
    this.salute();
    return [
      "Clearance verified.",
      "Door watch stands aside."
    ];
  }
}
