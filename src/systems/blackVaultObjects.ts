import { worldItemImage } from './worldItemArt';
import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { DANNE_SCENE_GEOMETRY } from "../game/danneSceneCollisions";
import { TREATY_FRAGMENT_LABELS } from "../game/danneItemCatalog";
import { SNES_WORKFLOW_TOOL_RELIC_ASSET } from "../game/snesAtlas";
import { gameState } from "../game/state";
import type { Interactable } from "../game/types";

function color(hex: string) { return Phaser.Display.Color.HexStringToColor(hex).color; }

// The HUD names the action; only its physical target is outlined on the floor.
export class BlackVaultObjects {
  private readonly props = new Map<string, Phaser.GameObjects.Container>();
  private readonly selection: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    const key = SNES_WORKFLOW_TOOL_RELIC_ASSET.key;
    for (const target of DANNE_SCENE_GEOMETRY.BlackVaultLairScene.interactions) {
      if (target.action === "return-office") continue;
      const frame = target.action === "boss-trigger" ? "terminal"
        : target.action === "reliability-cache" ? "frus_volume" : "source_note_card";
      const shadow = scene.add.ellipse(0, 1, 14, 4, color(PALETTE.black), 0.65);
      const relic = typeof scene.textures.createCanvas === 'function' && frame!=='terminal'
        ? worldItemImage(scene,0,0,frame==='frus_volume'?'volume-fragment':'source-note').setDisplaySize(12,16).setOrigin(.5,1)
        : scene.textures.exists(key) && scene.textures.get(key).has(frame)
        ? scene.add.image(0, 0, key, frame).setScale(0.5).setOrigin(0.5, 1)
        : scene.add.rectangle(0, -8, 8, 14, color(PALETTE.creamPaper))
          .setStrokeStyle(1, color(target.accent));
      const prop = scene.add.container(target.x, target.y, [shadow, relic])
        .setDepth(target.y).setName(`black-vault-object-${target.id}`);
      this.props.set(target.id, prop);
    }
    this.selection = scene.add.rectangle(0, 0, 16, 20).setStrokeStyle(1, color(PALETTE.goldStamp))
      .setDepth(35).setVisible(false).setName("black-vault-target-outline");
    this.update(null);
  }

  syncTargets(targets: Interactable[]) {
    if (!gameState.inventory.includes(TREATY_FRAGMENT_LABELS[2])) return;
    const index = targets.findIndex((target) => target.id === "vault-treaty-fragment");
    if (index >= 0) targets.splice(index, 1);
  }

  visibleLabels() {
    const labels = [
      ["vault-core-trigger", "DANN-E Core Trigger"],
      ["vault-reliability-cache", "Human Review Cache"],
      ["vault-treaty-fragment", "Treaty Fragment III"]
    ] as const;
    return labels.filter(([id]) => this.props.get(id)?.visible).map(([, label]) => label);
  }

  update(nearest: Interactable | null, exploring = true, bossActive = false) {
    const cacheUsed = Boolean(gameState.sceneProgress.blackVaultReliabilityCacheUsed);
    const fragmentAvailable = Boolean(gameState.sceneProgress.blackVaultBossCleared)
      && !gameState.inventory.includes(TREATY_FRAGMENT_LABELS[2]);
    for (const [id, prop] of this.props) {
      prop.setVisible(!bossActive && (id === "vault-reliability-cache" ? !cacheUsed
        : id === "vault-treaty-fragment" ? fragmentAvailable : true));
    }
    const target = exploring && !bossActive ? nearest : null;
    const visible = target && (target.id === "vault-return" || this.props.get(target.id)?.visible);
    this.selection.setVisible(Boolean(visible));
    if (target && visible) {
      const exit = target.id === "vault-return";
      this.selection.setPosition(target.x, target.y - (exit ? 0 : 8)).setSize(exit ? 38 : 16, exit ? 12 : 20);
    }
  }
}
