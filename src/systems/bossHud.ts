import Phaser from "phaser";
import { ACCESSIBILITY_OVERLAYS } from "../assets/registry";
import { GAME_WIDTH, PALETTE } from "../game/constants";
import { DANNE_BOSS_HUD_SLICES, ensureDanneUiSlices } from "../game/danneUiSlices";
import { setLatestMessage } from "../game/state";
import { addColorblindModeListener, isColorblindModeEnabled } from "./accessibilitySettings";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

class BossHudController {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly frame: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly fillPattern?: Phaser.GameObjects.TileSprite;
  private readonly glow: Phaser.GameObjects.Rectangle;
  private readonly criticalIcon?: Phaser.GameObjects.Image;
  private readonly weaknessIcon?: Phaser.GameObjects.Image;
  private readonly phaseGems: Phaser.GameObjects.Ellipse[] = [];
  private readonly phaseGlyphs: Phaser.GameObjects.Image[] = [];
  private readonly maxHp: number;
  private readonly phaseCount: number;
  private readonly removeColorblindModeListener: () => void;
  private currentHp: number;
  private currentPhase = 0;

  constructor(scene: Phaser.Scene, bossId: string, maxHp: number, phaseCount: number) {
    this.scene = scene;
    this.maxHp = Math.max(1, maxHp);
    this.currentHp = this.maxHp;
    this.phaseCount = Math.max(1, Math.min(4, phaseCount));
    ensureDanneUiSlices(scene);
    const bg = scene.add.rectangle(GAME_WIDTH / 2, 23, 232, 47, color(PALETTE.black), 0.01).setScrollFactor(0);
    this.frame = scene.textures.exists(DANNE_BOSS_HUD_SLICES.empty.key)
      ? scene.add.image(GAME_WIDTH / 2, 24, DANNE_BOSS_HUD_SLICES.empty.key).setScrollFactor(0)
      : scene.add.rectangle(GAME_WIDTH / 2, 24, 224, 40, color(PALETTE.black)).setStrokeStyle(1, color(PALETTE.classNetRed)).setScrollFactor(0);
    this.fill = scene.add.rectangle(135, 21, 1, 9, color(PALETTE.buckramHighlight), 0.92)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    this.fillPattern = scene.textures.exists("hp_cell_full" satisfies keyof typeof ACCESSIBILITY_OVERLAYS)
      ? scene.add.tileSprite(135, 21, 1, 9, "hp_cell_full" satisfies keyof typeof ACCESSIBILITY_OVERLAYS)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setVisible(false)
      : undefined;
    this.glow = scene.add.rectangle(GAME_WIDTH / 2, 24, 229, 43, color(PALETTE.classNetRed), 0)
      .setStrokeStyle(2, color(PALETTE.classNetRed), 0)
      .setScrollFactor(0);
    this.criticalIcon = scene.textures.exists("boss_hp_critical_excl" satisfies keyof typeof ACCESSIBILITY_OVERLAYS)
      ? scene.add.image(202, 21, "boss_hp_critical_excl" satisfies keyof typeof ACCESSIBILITY_OVERLAYS)
        .setScrollFactor(0)
        .setVisible(false)
      : undefined;
    this.weaknessIcon = scene.textures.exists("weakness_target" satisfies keyof typeof ACCESSIBILITY_OVERLAYS)
      ? scene.add.image(123, 21, "weakness_target" satisfies keyof typeof ACCESSIBILITY_OVERLAYS)
        .setScrollFactor(0)
        .setVisible(false)
      : undefined;
    const label = scene.add.text(38, 38, bossId.toUpperCase(), {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5).setScrollFactor(0);
    for (let index = 0; index < this.phaseCount; index += 1) {
      this.phaseGems.push(scene.add.ellipse(104 + index * 19, 37, 10, 10, color(PALETTE.stoneGray), 0.88)
        .setStrokeStyle(1, color(PALETTE.black))
        .setScrollFactor(0));
      const phaseGlyph = scene.textures.exists("boss_phase_spent" satisfies keyof typeof ACCESSIBILITY_OVERLAYS)
        ? scene.add.image(104 + index * 19, 37, "boss_phase_spent" satisfies keyof typeof ACCESSIBILITY_OVERLAYS)
          .setScrollFactor(0)
          .setVisible(false)
        : undefined;
      if (phaseGlyph) this.phaseGlyphs.push(phaseGlyph);
    }
    this.container = scene.add.container(0, 0, [
      bg,
      this.frame,
      this.fill,
      ...(this.fillPattern ? [this.fillPattern] : []),
      this.glow,
      ...(this.criticalIcon ? [this.criticalIcon] : []),
      ...(this.weaknessIcon ? [this.weaknessIcon] : []),
      label,
      ...this.phaseGems,
      ...this.phaseGlyphs
    ])
      .setDepth(1550)
      .setScrollFactor(0);
    this.removeColorblindModeListener = addColorblindModeListener(() => this.setHp(this.currentHp, this.currentPhase));
    this.setHp(this.maxHp, 0);
  }

  destroy() {
    this.removeColorblindModeListener();
    this.container.destroy();
  }

  setHp(currentHp: number, currentPhase: number) {
    const hp = Phaser.Math.Clamp(currentHp, 0, this.maxHp);
    this.currentHp = hp;
    this.currentPhase = currentPhase;
    const ratio = hp / this.maxHp;
    const fillWidth = Math.max(1, Math.round(113 * ratio));
    const highContrast = isColorblindModeEnabled();
    this.fill.setSize(fillWidth, 9);
    this.fillPattern?.setSize(fillWidth, 9).setVisible(highContrast && hp > 0);
    const critical = ratio < 0.25;
    this.glow.setAlpha(critical ? 0.18 : 0).setStrokeStyle(2, color(PALETTE.classNetRed), critical ? 0.8 : 0);
    this.criticalIcon?.setVisible(highContrast && critical && hp > 0);
    this.weaknessIcon?.setVisible(highContrast && hp > 0);
    for (let index = 0; index < this.phaseGems.length; index += 1) {
      const active = index <= currentPhase;
      this.phaseGems[index]
        .setFillStyle(color(active ? PALETTE.buckramHighlight : PALETTE.stoneGray), active ? 0.95 : 0.55)
        .setStrokeStyle(1, color(active ? PALETTE.goldStamp : PALETTE.black), 0.95);
      const glyph = this.phaseGlyphs[index];
      if (glyph) {
        const textureKey: keyof typeof ACCESSIBILITY_OVERLAYS = active ? "boss_phase_active" : "boss_phase_spent";
        glyph
          .setTexture(textureKey)
          .setVisible(highContrast);
      }
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
