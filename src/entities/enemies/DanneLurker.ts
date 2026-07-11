import Phaser from "phaser";
import { danneAnimKey } from "../../art/danne_anims";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../../game/constants";
import { unlockCodexEntry } from "../../game/codex";
import { DANNE_BOSS_SPRITE_ASSET, DANNE_VFX_ASSETS } from "../../game/danneAtlas";
import { danneLurkerBoast } from "../../game/danneBoasts";
import { FRUS_DANNE_EGO_BOLT_SLOT_COUNT } from "../../game/lttpFrusTranslation";
import { gameState, setLatestMessage } from "../../game/state";
import type { Position } from "../../game/types";
import { retroAudio } from "../../systems/audio";
import { getDanneDifficultyProfile } from "../../systems/newGamePlus";
import { snapPixel } from "../../systems/pixelPerfect";
import { Enemy } from "./Enemy";

interface DanneLurkerOptions {
  waypoints: Position[];
  label?: string;
}

interface EgoBolt {
  sprite: Phaser.GameObjects.Sprite;
  glow: Phaser.GameObjects.Rectangle;
  vx: number;
  vy: number;
  expiresAt: number;
  armedAt: number;
  armed: boolean;
}

const EGO_BOLT = DANNE_VFX_ASSETS[0];
const EGO_ATTACK_RANGE = 78;
const EGO_BOLT_SPEED = 46;
const EGO_BOLT_COOLDOWN_MS = 2300;
const EGO_BOAST_COOLDOWN_MS = 4200;
const EGO_BOLT_ARM_MS = 260;

function vectorToward(from: Position, to: Position, speed: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  return { vx: (dx / length) * speed, vy: (dy / length) * speed };
}

export class DanneLurker extends Enemy {
  private nextPressureAt = 0;
  private pressureUntil = 0;
  private nextEgoBoltAt = 0;
  private nextBoastAt = 0;
  private boastUntil = 0;
  private boastIndex = 0;
  private readonly bolts: EgoBolt[] = [];
  private readonly boastText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, options: DanneLurkerOptions) {
    unlockCodexEntry("enemy-danne-boss");
    const difficulty = getDanneDifficultyProfile(gameState.danneDifficultyTier);
    super(scene, x, y, {
      label: options.label ?? "DANN-E",
      spriteKey: DANNE_BOSS_SPRITE_ASSET.key,
      fallbackTextureKey: "snes-wall-danne-queue",
      waypoints: options.waypoints,
      tag: { text: "DANN-E", y: 17, color: PALETTE.goldStamp, backgroundColor: PALETTE.black },
      cue: { text: "30YR", y: -24, color: PALETTE.classNetRed, backgroundColor: PALETTE.black },
      shadow: { y: 13, width: 21, height: 6 },
      speed: 16 * difficulty.speedMultiplier,
      acceleration: 58 * difficulty.speedMultiplier,
      waypointTolerance: 4
    });
    this.sprite.setOrigin(0.5, 0.82).setScale(0.72);
    const animKey = danneAnimKey(DANNE_BOSS_SPRITE_ASSET.key, "walk-down");
    if (scene.anims.exists(animKey)) this.sprite.play(animKey);
    this.boastText = scene.add.text(0, -32, "", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black,
      align: "center",
      wordWrap: { width: 96, useAdvancedWrap: true }
    }).setOrigin(0.5, 1).setVisible(false);
    this.container.add(this.boastText);
    this.nextBoastAt = scene.time.now + 160;
    this.nextEgoBoltAt = scene.time.now + 920;
  }

  update(timeMs: number, deltaMs: number, player: Position, canPressure: boolean) {
    this.moveTowardWaypoint(deltaMs);
    const distance = this.distanceTo(player);
    const triggered = canPressure && distance <= 25 && timeMs >= this.nextPressureAt;
    if (triggered) {
      this.nextPressureAt = timeMs + this.cooldown(5600);
      this.pressureUntil = timeMs + 1150;
      this.scene.tweens.add({
        targets: this.container,
        x: snapPixel(this.currentX + 3),
        duration: 45,
        yoyo: true,
        repeat: 5,
        ease: "Stepped"
      });
    }
    let egoBoltFired = false;
    if (canPressure && distance <= EGO_ATTACK_RANGE && timeMs >= this.nextEgoBoltAt) {
      this.nextEgoBoltAt = timeMs + this.cooldown(EGO_BOLT_COOLDOWN_MS);
      egoBoltFired = this.fireEgoBolt(player);
    }

    const boasted = canPressure && distance <= EGO_ATTACK_RANGE && timeMs >= this.nextBoastAt;
    if (boasted) {
      this.nextBoastAt = timeMs + this.cooldown(EGO_BOAST_COOLDOWN_MS);
      this.boastUntil = timeMs + 1700;
      const boast = danneLurkerBoast(this.boastIndex);
      this.boastIndex += 1;
      this.boastText.setText(boast).setVisible(true);
      setLatestMessage(`DANN-E boasts: ${boast}`);
      retroAudio.danneBoast();
    }

    const egoBoltHit = this.updateBolts(timeMs, deltaMs, player, canPressure);

    const active = timeMs < this.pressureUntil;
    this.cue.setVisible(active);
    if (active && Math.floor(timeMs / 105) % 2 === 0) this.sprite.setTint(this.color(PALETTE.classNetRed));
    else if (active) this.sprite.setTint(this.color(PALETTE.goldStamp));
    else this.sprite.clearTint();

    const hoverX = Math.sin(timeMs / 260) * 0.7;
    const hoverY = Math.cos(timeMs / 310) * 0.55;
    this.boastText.setVisible(timeMs < this.boastUntil);
    this.syncRender(timeMs, hoverX, hoverY);
    return { triggered, pressureActive: active, egoBoltFired, egoBoltHit };
  }

  status(timeMs: number) {
    const slotReadout = `${this.bolts.length}/${FRUS_DANNE_EGO_BOLT_SLOT_COUNT} ego slots`;
    if (timeMs < this.pressureUntil) return `deadline pressure; ${slotReadout}`;
    if (timeMs < this.boastUntil) return `boasting; ${slotReadout}`;
    return this.bolts.length ? `firing ${slotReadout}` : "lurking";
  }

  readout(timeMs: number) {
    const difficulty = getDanneDifficultyProfile(gameState.danneDifficultyTier);
    return {
      label: "DANN-E LURKER",
      x: this.position.x,
      y: this.position.y,
      spriteKey: this.spriteKey,
      behavior: "lurks near workflow paths, boasts, and fires ego bolts",
      defeatMethod: "Keep moving through human review; final defeat happens at the Buckram Gate.",
      status: `${this.status(timeMs)}; ${difficulty.label} tier`
    };
  }

  destroy() {
    for (const bolt of this.bolts.splice(0)) {
      bolt.sprite.destroy();
      bolt.glow.destroy();
    }
    super.destroy();
  }

  private fireEgoBolt(target: Position) {
    if (this.bolts.length >= FRUS_DANNE_EGO_BOLT_SLOT_COUNT) return false;
    const from = this.position;
    const difficulty = getDanneDifficultyProfile(gameState.danneDifficultyTier);
    const { vx, vy } = vectorToward({ x: from.x, y: from.y - 10 }, target, EGO_BOLT_SPEED * difficulty.speedMultiplier);
    const startX = snapPixel(from.x);
    const startY = snapPixel(from.y - 10);
    const angle = Math.round(Phaser.Math.RadToDeg(Math.atan2(vy, vx)));
    const glow = this.scene.add.rectangle(startX, startY, 14, 8, this.color(PALETTE.classNetRed), 0.9)
      .setAngle(angle)
      .setDepth(Math.round(from.y + 3))
      .setStrokeStyle(1, this.color(PALETTE.goldStamp), 0.85);
    const bolt = this.scene.add.sprite(startX, startY, EGO_BOLT.key, Math.abs(vx) > Math.abs(vy) ? 0 : 4)
      .setOrigin(0.5)
      .setScale(0.045)
      .setDepth(Math.round(from.y + 4));
    const animKey = danneAnimKey(EGO_BOLT.key, "fly");
    if (this.scene.anims.exists(animKey)) bolt.play(animKey);
    bolt.setAngle(angle);
    this.bolts.push({
      sprite: bolt,
      glow,
      vx,
      vy,
      expiresAt: this.scene.time.now + 2200,
      armedAt: this.scene.time.now + EGO_BOLT_ARM_MS,
      armed: true
    });
    retroAudio.egoBoltFire();
    return true;
  }

  private cooldown(baseMs: number) {
    const difficulty = getDanneDifficultyProfile(gameState.danneDifficultyTier);
    return Math.max(220, Math.round(baseMs * difficulty.cooldownMultiplier));
  }

  private updateBolts(timeMs: number, deltaMs: number, player: Position, allowHit: boolean) {
    const dt = Math.min(0.05, deltaMs / 1000);
    const footBox = new Phaser.Geom.Rectangle(player.x - 8, player.y - 4, 16, 9);
    let hit = false;
    for (let index = this.bolts.length - 1; index >= 0; index -= 1) {
      const bolt = this.bolts[index];
      const x = snapPixel(bolt.sprite.x + bolt.vx * dt);
      const y = snapPixel(bolt.sprite.y + bolt.vy * dt);
      bolt.sprite.setPosition(x, y);
      bolt.glow.setPosition(x, y);
      bolt.sprite.setDepth(Math.round(bolt.sprite.y + 6));
      bolt.glow.setDepth(Math.round(bolt.sprite.y + 5));
      const boltBox = new Phaser.Geom.Rectangle(bolt.sprite.x - 6, bolt.sprite.y - 6, 12, 12);
      if (allowHit && bolt.armed && timeMs >= bolt.armedAt && Phaser.Geom.Intersects.RectangleToRectangle(boltBox, footBox)) {
        bolt.armed = false;
        hit = true;
      }
      if (timeMs >= bolt.expiresAt || bolt.sprite.x < -20 || bolt.sprite.x > GAME_WIDTH + 20 || bolt.sprite.y < 10 || bolt.sprite.y > GAME_HEIGHT + 20 || !bolt.armed) {
        bolt.sprite.destroy();
        bolt.glow.destroy();
        this.bolts.splice(index, 1);
      }
    }
    return hit;
  }
}
