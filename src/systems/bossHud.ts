import Phaser from "phaser";
import { GAME_WIDTH, PALETTE } from "../game/constants";
import { DANNE_BOSS_HUD_SLICES, ensureDanneUiSlices } from "../game/danneUiSlices";
import { setLatestMessage } from "../game/state";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

class BossHudController {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly frame: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly glow: Phaser.GameObjects.Rectangle;
  private readonly phaseGems: Phaser.GameObjects.Ellipse[] = [];
  private readonly maxHp: number;
  private readonly phaseCount: number;

  constructor(scene: Phaser.Scene, bossId: string, maxHp: number, phaseCount: number) {
    this.scene = scene;
    this.maxHp = Math.max(1, maxHp);
    this.phaseCount = Math.max(1, Math.min(4, phaseCount));
    ensureDanneUiSlices(scene);
    const bg = scene.add.rectangle(GAME_WIDTH / 2, 23, 232, 47, color(PALETTE.black), 0.01).setScrollFactor(0);
    this.frame = scene.textures.exists(DANNE_BOSS_HUD_SLICES.empty.key)
      ? scene.add.image(GAME_WIDTH / 2, 24, DANNE_BOSS_HUD_SLICES.empty.key).setScrollFactor(0)
      : scene.add.rectangle(GAME_WIDTH / 2, 24, 224, 40, color(PALETTE.black)).setStrokeStyle(1, color(PALETTE.classNetRed)).setScrollFactor(0);
    this.fill = scene.add.rectangle(135, 21, 1, 9, color(PALETTE.buckramHighlight), 0.92)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    this.glow = scene.add.rectangle(GAME_WIDTH / 2, 24, 229, 43, color(PALETTE.classNetRed), 0)
      .setStrokeStyle(2, color(PALETTE.classNetRed), 0)
      .setScrollFactor(0);
    const label = scene.add.text(38, 38, bossId.toUpperCase(), {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5).setScrollFactor(0);
    for (let index = 0; index < this.phaseCount; index += 1) {
      this.phaseGems.push(scene.add.ellipse(104 + index * 19, 37, 10, 10, color(PALETTE.stoneGray), 0.88)
        .setStrokeStyle(1, color(PALETTE.black))
        .setScrollFactor(0));
    }
    this.container = scene.add.container(0, 0, [bg, this.frame, this.fill, this.glow, label, ...this.phaseGems])
      .setDepth(1550)
      .setScrollFactor(0);
    this.setHp(this.maxHp, 0);
  }

  destroy() {
    this.container.destroy();
  }

  setHp(currentHp: number, currentPhase: number) {
    const hp = Phaser.Math.Clamp(currentHp, 0, this.maxHp);
    const ratio = hp / this.maxHp;
    this.fill.setSize(Math.max(1, Math.round(113 * ratio)), 9);
    const critical = ratio < 0.25;
    this.glow.setAlpha(critical ? 0.18 : 0).setStrokeStyle(2, color(PALETTE.classNetRed), critical ? 0.8 : 0);
    for (let index = 0; index < this.phaseGems.length; index += 1) {
      const active = index <= currentPhase;
      this.phaseGems[index]
        .setFillStyle(color(active ? PALETTE.buckramHighlight : PALETTE.stoneGray), active ? 0.95 : 0.55)
        .setStrokeStyle(1, color(active ? PALETTE.goldStamp : PALETTE.black), 0.95);
    }
    setLatestMessage(`Boss HUD: ${hp}/${this.maxHp} HP, phase ${currentPhase + 1}/${this.phaseCount}.`);
  }
}

let activeBossHud: BossHudController | null = null;

export function showBossHud(scene: Phaser.Scene, bossId: string, maxHp: number, phaseCount: number) {
  activeBossHud?.destroy();
  const controller = new BossHudController(scene, bossId, maxHp, phaseCount);
  activeBossHud = controller;
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    if (activeBossHud === controller) {
      controller.destroy();
      activeBossHud = null;
    }
  });
  return controller;
}

export function setBossHp(currentHp: number, currentPhase: number) {
  activeBossHud?.setHp(currentHp, currentPhase);
}

export function hideBossHud() {
  activeBossHud?.destroy();
  activeBossHud = null;
}
