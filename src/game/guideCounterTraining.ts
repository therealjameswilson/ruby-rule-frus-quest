import { advanceBossBolt, aimReturnedBossBolt, createBossBoltMotion, type BossBoltMotion } from "./danneBossCombat";
import type { Position } from "./types";
import type { GuideCounterCue } from "./guideCounterCoaching";

export const GUIDE_COUNTER = {
  source: { x: 176, y: 112 },
  chargeMs: 900,
  retryMs: 800,
  speed: 52,
  lifetimeMs: 4200
} as const;

type CounterPhase = "ready" | "charging" | "incoming" | "returned" | "complete";
type CounterEvent = "charge" | "fire" | "miss" | "return" | "complete" | null;
interface Bounds extends Position { width: number; height: number }
interface TrainingBolt extends BossBoltMotion { returned: boolean }

export interface GuideCounterReadout {
  cue?: GuideCounterCue;
  phase: CounterPhase;
  remainingMs: number;
  target: Position | null;
  bolt: (Position & { returned: boolean }) | null;
  attempts: number;
  harmless: true;
}

let visibleLesson: GuideCounterReadout | null = null;
export function setGuideCounterReadout(lesson: GuideCounterReadout | null) { visibleLesson = lesson; }
export function getGuideCounterReadout() { return visibleLesson; }

function intersects(a: Bounds, b: Bounds) {
  return a.x <= b.x + b.width && a.x + a.width >= b.x
    && a.y <= b.y + b.height && a.y + a.height >= b.y;
}

// The lesson uses the final boss's bolt integration and return speed, but cannot hurt the player.
export class GuideCounterTraining {
  private phase: CounterPhase = "ready";
  private remainingMs: number = GUIDE_COUNTER.retryMs;
  private target: Position | null = null;
  private bolt: TrainingBolt | null = null;
  private attempts = 0;

  readout(): GuideCounterReadout {
    return {
      phase: this.phase,
      remainingMs: Math.ceil(this.remainingMs),
      target: this.target ? { ...this.target } : null,
      bolt: this.bolt ? { x: Math.round(this.bolt.x), y: Math.round(this.bolt.y), returned: this.bolt.returned } : null,
      attempts: this.attempts,
      harmless: true
    };
  }

  update(deltaMs: number, player: Position, citationSwing: Bounds | null, paused = false): CounterEvent {
    if (paused || this.phase === "complete") return null;
    const dt = Math.max(0, Math.min(50, deltaMs));
    this.remainingMs = Math.max(0, this.remainingMs - dt);
    if (this.phase === "ready" && this.remainingMs === 0) {
      this.target = { ...player };
      this.remainingMs = GUIDE_COUNTER.chargeMs;
      this.phase = "charging";
      return "charge";
    }
    if (this.phase === "charging" && this.remainingMs === 0 && this.target) {
      this.bolt = {
        ...createBossBoltMotion({ x: GUIDE_COUNTER.source.x, y: GUIDE_COUNTER.source.y + 10 }, this.target, GUIDE_COUNTER.speed),
        returned: false
      };
      this.remainingMs = GUIDE_COUNTER.lifetimeMs;
      this.attempts += 1;
      this.phase = "incoming";
      return "fire";
    }
    const bolt = this.bolt;
    if (!bolt) return null;
    if (bolt.returned) aimReturnedBossBolt(bolt, GUIDE_COUNTER.source);
    advanceBossBolt(bolt, dt);
    const box = { x: bolt.x - 6, y: bolt.y - 6, width: 12, height: 12 };
    // Match the boss: an active swing wins over player contact on the same frame.
    if (!bolt.returned && citationSwing && intersects(box, citationSwing)) {
      bolt.returned = true;
      this.phase = "returned";
      this.remainingMs = GUIDE_COUNTER.lifetimeMs;
      aimReturnedBossBolt(bolt, GUIDE_COUNTER.source);
      return "return";
    }
    if (bolt.returned && intersects(box, { x: GUIDE_COUNTER.source.x - 8, y: GUIDE_COUNTER.source.y - 8, width: 16, height: 16 })) {
      this.phase = "complete";
      this.remainingMs = 0;
      this.bolt = null;
      return "complete";
    }
    const touchesPlayer = !bolt.returned && intersects(box, { x: player.x - 8, y: player.y - 4, width: 16, height: 9 });
    if (touchesPlayer || this.remainingMs === 0 || bolt.x < 32 || bolt.x > 224 || bolt.y < 64 || bolt.y > 194) {
      this.phase = "ready";
      this.remainingMs = GUIDE_COUNTER.retryMs;
      this.target = null;
      this.bolt = null;
      return "miss";
    }
    return null;
  }
}
