import Phaser from "phaser";
import { danneAnimKey } from "../../art/danne_anims";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../../game/constants";
import { unlockCodexEntry } from "../../game/codex";
import { DANNE_BOSS_SPRITE_ASSET, DANNE_VFX_ASSETS } from "../../game/danneAtlas";
import { danneTelegraphPulseOn } from "../../game/danneBossTelegraph";
import { danneLurkerBoast } from "../../game/danneBoasts";
import {
  DANNE_LURKER_ATTACK_RANGE,
  DANNE_LURKER_BOLT_COOLDOWN_MS,
  DANNE_LURKER_BOLT_SPEED,
  DANNE_LURKER_BOLT_TELEGRAPH_MS,
  DANNE_LURKER_INITIAL_BOLT_DELAY_MS,
  danneLurkerTelegraphRemainingMs
} from "../../game/danneLurkerBalance";
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

interface EgoBoltTelegraph {
  startedAt: number;
  resolvesAt: number;
  target: Position;
  markers: Phaser.GameObjects.Rectangle[];
}

const EGO_BOLT = DANNE_VFX_ASSETS[0];
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
  private egoBoltTelegraph: EgoBoltTelegraph | null = null;
  private telegraphExplained = false;
  private lastUpdateAt = 0;
  private pausedAt: number | null = null;
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
      tag: { text: "DANN-E", y: 17, color: PALETTE.goldStamp, backgroundColor: PALETTE.black, visible: false },
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
      fontSize: "8px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black,
      align: "center",
      wordWrap: { width: 96, useAdvancedWrap: true }
    }).setOrigin(0.5, 1).setVisible(false);
    this.container.add(this.boastText);
    this.nextBoastAt = scene.time.now + 160;
    this.nextEgoBoltAt = scene.time.now + DANNE_LURKER_INITIAL_BOLT_DELAY_MS;
    this.lastUpdateAt = scene.time.now;
  }

  update(timeMs: number, deltaMs: number, player: Position, canPressure: boolean) {
    this.resumeAfterUpdateGap(timeMs, deltaMs);
    this.lastUpdateAt = timeMs;
    this.moveTowardWaypoint(deltaMs);
    if (!canPressure) {
      if (this.pausedAt === null) this.pausedAt = timeMs;
      this.cue.setVisible(false);
      this.boastText.setVisible(false);
      this.syncRender(timeMs, 0, 0);
      return { triggered: false, pressureActive: false, egoBoltFired: false, egoBoltHit: false };
    }
    if (this.pausedAt !== null) {
      this.shiftAttackTimers(Math.max(0, timeMs - this.pausedAt));
      this.pausedAt = null;
    }
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
    if (canPressure && this.egoBoltTelegraph) {
      egoBoltFired = this.updateEgoBoltTelegraph(timeMs);
    } else if (canPressure && distance <= DANNE_LURKER_ATTACK_RANGE && timeMs >= this.nextEgoBoltAt) {
      this.startEgoBoltTelegraph(timeMs, player);
    }

    const boasted = canPressure && distance <= DANNE_LURKER_ATTACK_RANGE && timeMs >= this.nextBoastAt;
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
    if (this.egoBoltTelegraph && Math.floor(timeMs / 100) % 2 === 0) this.sprite.setTint(this.color(PALETTE.classNetRed));
    else if (this.egoBoltTelegraph) this.sprite.setTint(this.color(PALETTE.goldStamp));
    else if (active && Math.floor(timeMs / 105) % 2 === 0) this.sprite.setTint(this.color(PALETTE.classNetRed));
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
    if (this.egoBoltTelegraph) {
      return `ego lock ${danneLurkerTelegraphRemainingMs(this.egoBoltTelegraph.resolvesAt, timeMs)}ms; ${slotReadout}`;
    }
    if (timeMs < this.pressureUntil) return `deadline pressure; ${slotReadout}`;
    if (timeMs < this.boastUntil) return `boasting; ${slotReadout}`;
    return this.bolts.length ? `firing ${slotReadout}` : "lurking";
  }

  readout(timeMs: number) {
    const difficulty = getDanneDifficultyProfile(gameState.danneDifficultyTier);
    const telegraph = this.egoBoltTelegraph
      ? {
          kind: "lurker_ego_lock",
          label: "EGO LOCK",
          msRemaining: danneLurkerTelegraphRemainingMs(this.egoBoltTelegraph.resolvesAt, timeMs),
          target: { ...this.egoBoltTelegraph.target },
          destination: null
        }
      : null;
    return {
      label: "DANN-E LURKER",
      x: this.position.x,
      y: this.position.y,
      spriteKey: this.spriteKey,
      behavior: "lurks near workflow paths, boasts, and fires ego bolts",
      defeatMethod: "Keep moving through human review; final defeat happens at the Buckram Gate.",
      status: `${this.status(timeMs)}; ${difficulty.label} tier`,
      telegraph
    };
  }

  destroy() {
    this.clearEgoBoltTelegraph();
    for (const bolt of this.bolts.splice(0)) {
      bolt.sprite.destroy();
      bolt.glow.destroy();
    }
    super.destroy();
  }

  private startEgoBoltTelegraph(timeMs: number, target: Position) {
    const snapshot = { x: snapPixel(target.x), y: snapPixel(target.y) };
    const source = this.position;
    const markers: Phaser.GameObjects.Rectangle[] = [];
    const add = (x: number, y: number, width: number, height: number, fill: string) => {
      const marker = this.scene.add.rectangle(snapPixel(x), snapPixel(y), width, height, this.color(fill), 0.92)
        .setDepth(938);
      markers.push(marker);
    };
    const radius = 9;
    add(snapshot.x - radius, snapshot.y - radius, 6, 2, PALETTE.classNetRed);
    add(snapshot.x - radius, snapshot.y - radius, 2, 6, PALETTE.classNetRed);
    add(snapshot.x + radius, snapshot.y - radius, 6, 2, PALETTE.classNetRed);
    add(snapshot.x + radius, snapshot.y - radius, 2, 6, PALETTE.classNetRed);
    add(snapshot.x - radius, snapshot.y + radius, 6, 2, PALETTE.classNetRed);
    add(snapshot.x - radius, snapshot.y + radius, 2, 6, PALETTE.classNetRed);
    add(snapshot.x + radius, snapshot.y + radius, 6, 2, PALETTE.classNetRed);
    add(snapshot.x + radius, snapshot.y + radius, 2, 6, PALETTE.classNetRed);
    for (let step = 1; step <= 4; step += 1) {
      const ratio = step / 5;
      add(
        source.x + (snapshot.x - source.x) * ratio,
        source.y - 10 + (snapshot.y - (source.y - 10)) * ratio,
        2,
        2,
        step % 2 === 0 ? PALETTE.goldStamp : PALETTE.classNetRed
      );
    }
    this.egoBoltTelegraph = {
      startedAt: timeMs,
      resolvesAt: timeMs + DANNE_LURKER_BOLT_TELEGRAPH_MS,
      target: snapshot,
      markers
    };
    this.sprite.setTint(this.color(PALETTE.classNetRed));
    if (!this.telegraphExplained) {
      this.telegraphExplained = true;
      setLatestMessage("DANN-E marks an Ego target. Leave the red brackets before the bolt fires.");
    }
    retroAudio.blip();
  }

  private updateEgoBoltTelegraph(timeMs: number) {
    const telegraph = this.egoBoltTelegraph;
    if (!telegraph) return false;
    const pulseOn = danneTelegraphPulseOn(telegraph.startedAt, timeMs, 100);
    for (const marker of telegraph.markers) marker.setAlpha(pulseOn ? 0.94 : 0.28);
    this.sprite.setAlpha(pulseOn ? 1 : 0.7);
    if (timeMs < telegraph.resolvesAt) return false;
    const target = { ...telegraph.target };
    this.clearEgoBoltTelegraph();
    this.nextEgoBoltAt = timeMs + this.cooldown(DANNE_LURKER_BOLT_COOLDOWN_MS);
    return this.fireEgoBolt(target);
  }

  private clearEgoBoltTelegraph() {
    if (this.egoBoltTelegraph) {
      for (const marker of this.egoBoltTelegraph.markers) marker.destroy();
    }
    this.egoBoltTelegraph = null;
    this.sprite.setAlpha(1);
    this.sprite.clearTint();
  }

  private resumeAfterUpdateGap(timeMs: number, deltaMs: number) {
    if (this.pausedAt !== null || this.lastUpdateAt <= 0) return;
    const expectedFrameMs = Math.max(50, deltaMs * 2);
    const gapMs = timeMs - this.lastUpdateAt - expectedFrameMs;
    if (gapMs > 120) this.shiftAttackTimers(gapMs);
  }

  private shiftAttackTimers(pausedMs: number) {
    if (pausedMs <= 0) return;
    this.nextPressureAt += pausedMs;
    this.pressureUntil += pausedMs;
    this.nextEgoBoltAt += pausedMs;
    this.nextBoastAt += pausedMs;
    this.boastUntil += pausedMs;
    if (this.egoBoltTelegraph) {
      this.egoBoltTelegraph.startedAt += pausedMs;
      this.egoBoltTelegraph.resolvesAt += pausedMs;
    }
    for (const bolt of this.bolts) {
      bolt.armedAt += pausedMs;
      bolt.expiresAt += pausedMs;
    }
  }

  private fireEgoBolt(target: Position) {
    if (this.bolts.length >= FRUS_DANNE_EGO_BOLT_SLOT_COUNT) return false;
    const from = this.position;
    const difficulty = getDanneDifficultyProfile(gameState.danneDifficultyTier);
    const { vx, vy } = vectorToward({ x: from.x, y: from.y - 10 }, target, DANNE_LURKER_BOLT_SPEED * difficulty.speedMultiplier);
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
