export const CONFERENCE_HEAT_INTERVAL_MS = 20_000;
// The existing ten-heart meter represents 100 reliability points.
export const CONFERENCE_HEAT_DAMAGE = 5;
export const CONFERENCE_HEAT_WARNING = "WARNING: EXTREME HEAT! Lose 1/2 heart every 20 seconds. Exit west to cool down.";

export class ConferenceHeat {
  elapsedMs = 0;
  reset() { this.elapsedMs = 0; }
  advance(delta: number, active: boolean): number {
    if (!active || !Number.isFinite(delta) || delta <= 0) return 0;
    this.elapsedMs += delta;
    const ticks = Math.floor(this.elapsedMs / CONFERENCE_HEAT_INTERVAL_MS);
    this.elapsedMs %= CONFERENCE_HEAT_INTERVAL_MS;
    return ticks;
  }
  get secondsRemaining() {
    return Math.ceil((CONFERENCE_HEAT_INTERVAL_MS - this.elapsedMs) / 1000);
  }
}
