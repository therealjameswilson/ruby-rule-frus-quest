// Scene clocks keep ticking behind overlays and through rendering stalls.
// Combat deadlines should advance only with the time actors can simulate.
export class CombatClock {
  private pausedAt: number | null = null;
  private pausedDuration = 0;
  private accountedFrame: number | null = null;

  // Scene preparation and Player.update may both account for the same frame.
  accountFrame(sceneTime: number, deltaMs: number) {
    if (this.accountedFrame === sceneTime) return;
    this.accountedFrame = sceneTime;
    if (!this.paused) this.pausedDuration += Math.max(0, deltaMs - 50);
  }

  get paused() {
    return this.pausedAt !== null;
  }

  now(sceneTime: number) {
    return (this.pausedAt ?? sceneTime) - this.pausedDuration;
  }

  setPaused(paused: boolean, sceneTime: number) {
    if (paused === this.paused) return false;
    if (paused) this.pausedAt = sceneTime;
    else {
      this.pausedDuration += Math.max(0, sceneTime - this.pausedAt!);
      this.pausedAt = null;
    }
    return true;
  }
}
