/** Presentation-only HP trail: actual health always updates immediately. */
export class BossDamageTrail {
  value: number;
  private target: number;
  private holdMs = 0;
  constructor(hp: number) { this.value = this.target = hp; }
  set(hp: number, reset = false) {
    if (reset || hp > this.target) {
      this.value = this.target = hp;
      this.holdMs = 0;
    } else if (hp < this.target) {
      this.target = hp;
      this.holdMs = 180;
    }
  }
  advance(deltaMs: number, maxHp: number, reducedMotion: boolean) {
    if (reducedMotion) { this.value = this.target; this.holdMs = 0; return; }
    let remaining = Math.max(0, deltaMs);
    const held = Math.min(remaining, this.holdMs);
    this.holdMs -= held;
    remaining -= held;
    this.value = Math.max(this.target, this.value - remaining * maxHp / 500);
  }
}
