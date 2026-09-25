import Phaser from "phaser";
import { ACCESSIBILITY_OVERLAYS } from "../assets/registry";
import { GAME_WIDTH, PALETTE } from "../game/constants";
import { gameState, setLatestMessage } from "../game/state";
import { addColorblindModeListener, isColorblindModeEnabled } from "./accessibilitySettings";
import { BossDamageTrail } from "./bossDamageTrail";
import { prefersReducedMotion } from "./motionPreferences";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

class BossHudController {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly frame: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly damageFill: Phaser.GameObjects.Rectangle;
  private readonly damageTrail: BossDamageTrail;
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
    this.damageTrail = new BossDamageTrail(this.maxHp);
    this.phaseCount = Math.max(1, Math.min(4, phaseCount));
    const bg = scene.add.rectangle(GAME_WIDTH / 2, 31, 238, 14, color(PALETTE.black), 0.98).setScrollFactor(0);
    this.frame = scene.add.rectangle(120, 31, 150, 8, color(PALETTE.deepRuby))
      .setStrokeStyle(1, color(PALETTE.stoneGray)).setScrollFactor(0);
    this.damageFill = scene.add.rectangle(46, 31, 148, 6, color(PALETTE.goldStamp))
      .setName("boss-damage-trail").setOrigin(0, 0.5).setScrollFactor(0).setVisible(false);
    this.fill = scene.add.rectangle(46, 31, 1, 6, color(PALETTE.buckramHighlight), 0.92)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    this.fillPattern = scene.textures.exists("hp_cell_full" satisfies keyof typeof ACCESSIBILITY_OVERLAYS)
      ? scene.add.tileSprite(46, 31, 1, 6, "hp_cell_full" satisfies keyof typeof ACCESSIBILITY_OVERLAYS)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setVisible(false)
      : undefined;
    this.glow = scene.add.rectangle(120, 31, 150, 8, color(PALETTE.classNetRed), 0)
      .setStrokeStyle(1, color(PALETTE.classNetRed), 0)
      .setScrollFactor(0);
    this.criticalIcon = scene.textures.exists("boss_hp_critical_excl" satisfies keyof typeof ACCESSIBILITY_OVERLAYS)
      ? scene.add.image(198, 31, "boss_hp_critical_excl" satisfies keyof typeof ACCESSIBILITY_OVERLAYS)
        .setDisplaySize(8, 8)
        .setScrollFactor(0)
        .setVisible(false)
      : undefined;
    this.weaknessIcon = scene.textures.exists("weakness_target" satisfies keyof typeof ACCESSIBILITY_OVERLAYS)
      ? scene.add.image(40, 31, "weakness_target" satisfies keyof typeof ACCESSIBILITY_OVERLAYS)
        .setDisplaySize(8, 8)
        .setScrollFactor(0)
        .setVisible(false)
      : undefined;
    const label = scene.add.text(12, 28, bossId.toUpperCase(), {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper
    }).setScrollFactor(0);
    for (let index = 0; index < this.phaseCount; index += 1) {
      this.phaseGems.push(scene.add.ellipse(207 + index * 10, 31, 6, 6, color(PALETTE.stoneGray), 0.88)
        .setStrokeStyle(1, color(PALETTE.black))
        .setScrollFactor(0));
      const phaseGlyph = scene.textures.exists("boss_phase_spent" satisfies keyof typeof ACCESSIBILITY_OVERLAYS)
        ? scene.add.image(207 + index * 10, 31, "boss_phase_spent" satisfies keyof typeof ACCESSIBILITY_OVERLAYS)
          .setDisplaySize(8, 8)
          .setScrollFactor(0)
          .setVisible(false)
        : undefined;
      if (phaseGlyph) this.phaseGlyphs.push(phaseGlyph);
    }
    this.container = scene.add.container(0, 2, [
      bg,
      this.frame,
      this.damageFill,
      this.fill,
      ...(this.fillPattern ? [this.fillPattern] : []),
      this.glow,
      ...(this.criticalIcon ? [this.criticalIcon] : []),
      ...(this.weaknessIcon ? [this.weaknessIcon] : []),
      label,
      ...this.phaseGems,
      ...this.phaseGlyphs
    ])
      .setName("boss-health-hud")
      .setDepth(1550)
      .setScrollFactor(0);
    this.removeColorblindModeListener = addColorblindModeListener(() => this.setHp(this.currentHp, this.currentPhase));
    this.setHp(this.maxHp, 0);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.updateDamageTrail, this);
  }

  destroy() {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.updateDamageTrail, this);
    this.removeColorblindModeListener();
    this.container.destroy();
  }

  private updateDamageTrail(_time: number, delta: number) {
    if (gameState.mode !== "explore") return;
    this.damageTrail.advance(delta, this.maxHp, prefersReducedMotion());
    this.damageFill.setSize(Math.max(1, Math.round(148 * this.damageTrail.value / this.maxHp)), 6)
      .setVisible(this.damageTrail.value > this.currentHp);
  }

  setHp(currentHp: number, currentPhase: number) {
    const hp = Phaser.Math.Clamp(currentHp, 0, this.maxHp);
    this.damageTrail.set(hp, currentPhase !== this.currentPhase);
    this.currentHp = hp;
    this.currentPhase = currentPhase;
    const ratio = hp / this.maxHp;
    const fillWidth = Math.max(1, Math.round(148 * ratio));
    const highContrast = isColorblindModeEnabled();
    this.damageFill.setFillStyle(color(highContrast ? PALETTE.creamPaper : PALETTE.goldStamp));
    this.updateDamageTrail(0, 0);
    this.fill.setSize(fillWidth, 6).setVisible(hp > 0);
    this.fillPattern?.setSize(fillWidth, 6).setVisible(highContrast && hp > 0);
    const critical = ratio < 0.25;
    this.glow.setAlpha(critical ? 0.18 : 0).setStrokeStyle(1, color(PALETTE.classNetRed), critical ? 0.8 : 0);
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
