import Phaser from "phaser";
import { danneAnimKey } from "../../art/danne_anims";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../../game/constants";
import { DANNE_BOSS_SPRITE_ASSET, DANNE_VFX_ASSETS } from "../../game/danneAtlas";
import { danneBoastForPhase, type DanneBoastPhase } from "../../game/danneBoasts";
import { addDanneItem, gameState, hasDanneItem, setLatestMessage } from "../../game/state";
import type { Position } from "../../game/types";
import { hideBossHud, setBossHp, showBossHud } from "../../systems/bossHud";
import { enterCutscene, exitCutscene, playLine } from "../../systems/cutscene";
import { snapPixel } from "../../systems/pixelPerfect";
import { Player } from "../Player";

export type DanneBossPhase = "intro" | "colossus" | "swarm" | "cloud" | "ascendant" | "defeated";

interface EgoBolt {
  sprite: Phaser.GameObjects.Sprite;
  vx: number;
  vy: number;
  expiresAt: number;
  armed: boolean;
}

interface MiniDanne {
  sprite: Phaser.GameObjects.Sprite;
  angle: number;
  radius: number;
  speed: number;
}

interface DanneBossOptions {
  player: Player;
  secretAscendant: boolean;
  quickFight: boolean;
  onDefeated: (trueEnding: boolean) => void;
  onPhaseChange: (phase: DanneBossPhase) => void;
}

const EGO_BOLT = DANNE_VFX_ASSETS[0];
const BOSS_CENTER = { x: 128, y: 118 } as const;
const CLOUD_CORNERS: readonly Position[] = [
  { x: 72, y: 94 },
  { x: 184, y: 94 },
  { x: 72, y: 170 },
  { x: 184, y: 170 }
];

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

function wait(scene: Phaser.Scene, ms: number) {
  return new Promise<void>((resolve) => {
    scene.time.delayedCall(ms, () => resolve());
  });
}

function vectorToward(from: Position, to: Position, speed: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  return { vx: (dx / length) * speed, vy: (dy / length) * speed };
}

export class DanneBoss {
  readonly label = "DANN-E";
  readonly spriteKey = DANNE_BOSS_SPRITE_ASSET.key;
  private readonly scene: Phaser.Scene;
  private readonly player: Player;
  private readonly secretAscendant: boolean;
  private readonly maxHp: number;
  private readonly phaseCount: number;
  private readonly onDefeated: (trueEnding: boolean) => void;
  private readonly onPhaseChange: (phase: DanneBossPhase) => void;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly bolts: EgoBolt[] = [];
  private readonly minis: MiniDanne[] = [];
  private phase: DanneBossPhase = "intro";
  private hp = 1;
  private nextBoltAt = 0;
  private nextTeleportAt = 0;
  private nextPlayerHitAt = 0;
  private phaseTransitioning = false;
  private defeated = false;
  private boastIndex = 0;

  constructor(scene: Phaser.Scene, options: DanneBossOptions) {
    this.scene = scene;
    this.player = options.player;
    this.secretAscendant = options.secretAscendant;
    this.maxHp = options.quickFight ? 48 : 180;
    this.phaseCount = this.secretAscendant ? 4 : 3;
    this.onDefeated = options.onDefeated;
    this.onPhaseChange = options.onPhaseChange;
    this.shadow = scene.add.ellipse(BOSS_CENTER.x, BOSS_CENTER.y + 12, 34, 9, color(PALETTE.black), 0.7)
      .setDepth(BOSS_CENTER.y - 5);
    this.sprite = scene.add.sprite(BOSS_CENTER.x, BOSS_CENTER.y, this.spriteKey)
      .setOrigin(0.5, 0.82)
      .setScale(0.14)
      .setDepth(BOSS_CENTER.y)
      .setVisible(false);
    const animKey = danneAnimKey(this.spriteKey, "walk-down");
    if (scene.anims.exists(animKey)) this.sprite.play(animKey);
  }

  get isActive() {
    return !this.defeated;
  }

  get currentPhase() {
    return this.phase;
  }

  get position(): Position {
    return { x: Math.round(this.sprite.x), y: Math.round(this.sprite.y) };
  }

  start() {
    void this.runIntro();
  }

  update(timeMs: number, deltaMs: number, canAct: boolean) {
    if (this.defeated) return;
    this.updateBolts(timeMs, deltaMs);
    this.updateMinis(timeMs, deltaMs);
    this.syncDepths();
    if (this.phase === "intro" || this.phaseTransitioning || !canAct) return;
    this.checkPlayerActionHit(timeMs);
    this.updateAttackPattern(timeMs);
  }

  readout() {
    return {
      label: `DANN-E ${this.phase.toUpperCase()}`,
      x: this.position.x,
      y: this.position.y,
      spriteKey: this.spriteKey,
      behavior: this.behaviorLabel(),
      defeatMethod: this.secretAscendant
        ? "Use the Ruby Pen, survive ego bolts, and finish the Ascendant treaty-record phase."
        : "Use the Ruby Pen and survive ego bolts through three review phases.",
      status: `${this.hp}/${this.maxHp} HP; ${this.bolts.length} ego bolts; ${this.minis.length} mini-DANN-Es`
    };
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    for (const bolt of this.bolts) bolt.sprite.destroy();
    for (const mini of this.minis) mini.sprite.destroy();
    hideBossHud();
  }

  private async runIntro() {
    this.phaseTransitioning = true;
    await this.showPhaseCutscene("danne-prime-humanoid", "intro", "danne-portrait-archivist");
    if (this.defeated) return;
    this.beginPhase("colossus");
    await this.showPhaseCutscene("danne-colossus-final-form", "colossus");
    this.phaseTransitioning = false;
  }

  private beginPhase(phase: Exclude<DanneBossPhase, "intro" | "defeated">) {
    this.phase = phase;
    this.hp = this.maxHp;
    this.nextBoltAt = this.scene.time.now + 650;
    this.nextTeleportAt = this.scene.time.now + 900;
    this.onPhaseChange(phase);
    this.sprite.setVisible(true);
    this.sprite.clearTint();
    if (phase === "cloud") this.sprite.setTint(color(PALETTE.terminalCyan));
    if (phase === "ascendant") this.sprite.setTint(color(PALETTE.buckramHighlight));
    if (phase === "swarm") this.spawnMiniDannes();
    if (phase === "colossus") this.moveBossTo(BOSS_CENTER.x, BOSS_CENTER.y);
    showBossHud(this.scene, "DANN-E", this.maxHp, this.phaseCount);
    setBossHp(this.hp, this.phaseIndex());
    setLatestMessage(`DANN-E ${phase} phase started.`);
  }

  private async transitionToPhase(phase: Exclude<DanneBossPhase, "intro" | "defeated">) {
    if (this.phaseTransitioning || this.defeated) return;
    this.phaseTransitioning = true;
    this.beginPhase(phase);
    await this.showPhaseCutscene(this.variantKeyForPhase(phase), phase);
    this.phaseTransitioning = false;
  }

  private async finishFight(trueEnding: boolean) {
    if (this.defeated) return;
    this.defeated = true;
    this.phase = "defeated";
    this.onPhaseChange("defeated");
    hideBossHud();
    this.sprite.setVisible(false);
    this.shadow.setVisible(false);
    this.clearBolts();
    this.clearMinis();
    gameState.sceneProgress.blackVaultBossCleared = 1;
    addDanneItem("treaty-fragments", 2);
    if (trueEnding) {
      await this.showPhaseCutscene("danne-ascendant", "ascendant", "danne-portrait-historian", "The complete treaty record forces DANN-E back into review.");
    }
    await this.showPhaseCutscene("danne-defeated", "defeated", "danne-portrait-archivist");
    this.onDefeated(trueEnding);
  }

  private updateAttackPattern(timeMs: number) {
    if (timeMs < this.nextBoltAt) return;
    if (this.phase === "colossus") {
      this.fireTowardPlayer(58);
      this.nextBoltAt = timeMs + 2500;
      return;
    }
    if (this.phase === "swarm") {
      this.fireTowardPlayer(62);
      for (const mini of this.minis.slice(0, 2)) {
        this.fireBolt({ x: mini.sprite.x, y: mini.sprite.y }, this.player.position, 50);
      }
      this.nextBoltAt = timeMs + 1550;
      return;
    }
    if (this.phase === "cloud") {
      if (timeMs >= this.nextTeleportAt) {
        const target = CLOUD_CORNERS[Math.floor(timeMs / 1800) % CLOUD_CORNERS.length];
        this.moveBossTo(target.x, target.y);
        this.nextTeleportAt = timeMs + 1800;
      }
      this.fireSpread(64, [-0.28, 0, 0.28]);
      this.nextBoltAt = timeMs + 1250;
      return;
    }
    if (this.phase === "ascendant") {
      this.fireSpread(72, [-0.5, -0.18, 0.18, 0.5]);
      for (const corner of CLOUD_CORNERS) this.fireBolt(corner, this.player.position, 48);
      this.nextBoltAt = timeMs + 980;
    }
  }

  private checkPlayerActionHit(timeMs: number) {
    const hitbox = this.player.activeActionHitbox;
    if (!hitbox || timeMs < this.nextPlayerHitAt) return;
    if (!Phaser.Geom.Intersects.RectangleToRectangle(hitbox, this.bossBody())) return;
    this.nextPlayerHitAt = timeMs + 260;
    const hasRubyPen = gameState.equippedDanneItem === "ruby-pen" && hasDanneItem("ruby-pen");
    const baseDamage = hasRubyPen ? 35 : 14;
    const damage = this.phase === "cloud" ? Math.ceil(baseDamage / 2) : baseDamage;
    this.hp = Math.max(0, this.hp - damage);
    setBossHp(this.hp, this.phaseIndex());
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.35,
      duration: 45,
      yoyo: true,
      repeat: 2,
      ease: "Stepped"
    });
    setLatestMessage(`Ruby Pen review hit DANN-E for ${damage}.`);
    this.resolvePhaseHp();
  }

  private resolvePhaseHp() {
    if (this.hp > 0 || this.phaseTransitioning) return;
    if (this.phase === "colossus") {
      void this.transitionToPhase("swarm");
      return;
    }
    if (this.phase === "swarm") {
      this.clearMinis();
      void this.transitionToPhase("cloud");
      return;
    }
    if (this.phase === "cloud") {
      if (this.secretAscendant) {
        void this.transitionToPhase("ascendant");
        return;
      }
      void this.finishFight(false);
      return;
    }
    if (this.phase === "ascendant") void this.finishFight(true);
  }

  private bossBody() {
    const x = Math.round(this.sprite.x);
    const y = Math.round(this.sprite.y);
    return new Phaser.Geom.Rectangle(x - 19, y - 42, 38, 48);
  }

  private fireTowardPlayer(speed: number) {
    this.fireBolt(this.position, this.player.position, speed);
  }

  private fireSpread(speed: number, angleOffsets: readonly number[]) {
    const from = this.position;
    const baseAngle = Phaser.Math.Angle.Between(from.x, from.y, this.player.position.x, this.player.position.y);
    for (const offset of angleOffsets) {
      const target = {
        x: from.x + Math.cos(baseAngle + offset) * 48,
        y: from.y + Math.sin(baseAngle + offset) * 48
      };
      this.fireBolt(from, target, speed);
    }
  }

  private fireBolt(from: Position, target: Position, speed: number) {
    const { vx, vy } = vectorToward(from, target, speed);
    const bolt = this.scene.add.sprite(snapPixel(from.x), snapPixel(from.y - 10), EGO_BOLT.key, Math.abs(vx) > Math.abs(vy) ? 0 : 4)
      .setOrigin(0.5)
      .setScale(0.03)
      .setDepth(Math.round(from.y + 4));
    const animKey = danneAnimKey(EGO_BOLT.key, "fly");
    if (this.scene.anims.exists(animKey)) bolt.play(animKey);
    bolt.setAngle(Math.round(Phaser.Math.RadToDeg(Math.atan2(vy, vx))));
    this.bolts.push({
      sprite: bolt,
      vx,
      vy,
      expiresAt: this.scene.time.now + 2000,
      armed: true
    });
  }

  private updateBolts(timeMs: number, deltaMs: number) {
    const dt = Math.min(0.05, deltaMs / 1000);
    const footBox = new Phaser.Geom.Rectangle(this.player.position.x - 8, this.player.position.y - 4, 16, 9);
    for (let index = this.bolts.length - 1; index >= 0; index -= 1) {
      const bolt = this.bolts[index];
      bolt.sprite.setPosition(snapPixel(bolt.sprite.x + bolt.vx * dt), snapPixel(bolt.sprite.y + bolt.vy * dt));
      bolt.sprite.setDepth(Math.round(bolt.sprite.y + 6));
      const boltBox = new Phaser.Geom.Rectangle(bolt.sprite.x - 6, bolt.sprite.y - 6, 12, 12);
      if (bolt.armed && Phaser.Geom.Intersects.RectangleToRectangle(boltBox, footBox)) {
        bolt.armed = false;
        this.player.takeHit({ x: bolt.sprite.x, y: bolt.sprite.y }, 12, 800);
        setLatestMessage("Ego bolt hit. Evidence still requires review.");
      }
      if (timeMs >= bolt.expiresAt || bolt.sprite.x < -20 || bolt.sprite.x > GAME_WIDTH + 20 || bolt.sprite.y < 20 || bolt.sprite.y > GAME_HEIGHT + 20) {
        bolt.sprite.destroy();
        this.bolts.splice(index, 1);
      }
    }
  }

  private spawnMiniDannes() {
    this.clearMinis();
    const starts = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    for (const [index, angle] of starts.entries()) {
      const mini = this.scene.add.sprite(BOSS_CENTER.x, BOSS_CENTER.y, this.spriteKey)
        .setOrigin(0.5, 0.82)
        .setScale(0.055)
        .setDepth(BOSS_CENTER.y + index + 1);
      const animKey = danneAnimKey(this.spriteKey, "walk-down");
      if (this.scene.anims.exists(animKey)) mini.play(animKey);
      this.minis.push({ sprite: mini, angle, radius: 42, speed: index % 2 === 0 ? 1 : -1 });
    }
  }

  private updateMinis(timeMs: number, deltaMs: number) {
    if (!this.minis.length) return;
    const dt = Math.min(0.05, deltaMs / 1000);
    for (const mini of this.minis) {
      mini.angle += mini.speed * dt * 1.7;
      const x = BOSS_CENTER.x + Math.cos(mini.angle) * mini.radius;
      const y = BOSS_CENTER.y + 14 + Math.sin(mini.angle) * (mini.radius * 0.55);
      mini.sprite.setPosition(snapPixel(x), snapPixel(y));
      mini.sprite.setDepth(Math.round(y));
      if (Phaser.Math.Distance.Between(mini.sprite.x, mini.sprite.y, this.player.position.x, this.player.position.y) < 12) {
        this.player.takeHit({ x: mini.sprite.x, y: mini.sprite.y }, 9, 700);
      }
    }
  }

  private clearBolts() {
    for (const bolt of this.bolts.splice(0)) bolt.sprite.destroy();
  }

  private clearMinis() {
    for (const mini of this.minis.splice(0)) mini.sprite.destroy();
  }

  private async showPhaseCutscene(
    variantKey: string,
    boastPhase: DanneBoastPhase,
    portraitKey = "danne-portrait-archivist",
    overrideLine?: string
  ) {
    const still = this.scene.textures.exists(variantKey)
      ? this.scene.add.image(GAME_WIDTH / 2, 86, variantKey).setDepth(1620).setScrollFactor(0)
      : null;
    if (still) {
      const source = this.scene.textures.get(variantKey).getSourceImage() as { width?: number; height?: number };
      const scale = Math.min(118 / Math.max(1, source.width ?? 1024), 88 / Math.max(1, source.height ?? 1024));
      still.setScale(scale).setAlpha(0);
    }
    await enterCutscene(this.scene);
    if (still) {
      this.scene.tweens.add({ targets: still, alpha: 1, duration: 150 });
    }
    playLine(this.scene, overrideLine ?? danneBoastForPhase(boastPhase, this.boastIndex), portraitKey);
    this.boastIndex += 1;
    await wait(this.scene, 1150);
    await exitCutscene(this.scene);
    still?.destroy();
  }

  private moveBossTo(x: number, y: number) {
    this.sprite.setPosition(snapPixel(x), snapPixel(y));
    this.shadow.setPosition(snapPixel(x), snapPixel(y + 12));
    this.syncDepths();
  }

  private syncDepths() {
    const y = Math.round(this.sprite.y);
    this.sprite.setDepth(y);
    this.shadow.setDepth(y - 5);
  }

  private phaseIndex() {
    if (this.phase === "colossus") return 0;
    if (this.phase === "swarm") return 1;
    if (this.phase === "cloud") return 2;
    if (this.phase === "ascendant") return 3;
    return 0;
  }

  private variantKeyForPhase(phase: Exclude<DanneBossPhase, "intro" | "defeated">) {
    if (phase === "colossus") return "danne-colossus-final-form";
    if (phase === "swarm") return "danne-swarm";
    if (phase === "cloud") return "danne-cloud-form";
    return "danne-ascendant";
  }

  private behaviorLabel() {
    if (this.phase === "intro") return "cutscene reveal";
    if (this.phase === "colossus") return "ego-bolt cannon every 2.5s";
    if (this.phase === "swarm") return "mini-DANN-E reinforcement wave";
    if (this.phase === "cloud") return "teleporting cloud form with spread shots";
    if (this.phase === "ascendant") return "four simultaneous ego-bolt patterns";
    return "defeated";
  }
}
