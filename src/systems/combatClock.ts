// Scene clocks keep ticking behind overlays. Combat deadlines must not.
export class CombatClock {
  private pausedAt: number | null = null;
  private pausedDuration = 0;

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
