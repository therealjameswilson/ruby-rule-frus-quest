export const ALEX_FILMS = ["Best of the Best", "Best of the Best 2"] as const;
export type AlexPhase = "asking" | "windup" | "attack" | "recovery";
export const ALEX_KARATE_DAMAGE = 5;
export class AlexPosterEncounter {
  phase: AlexPhase = "asking";
  elapsed = 0;
  filmIndex = 0;
  get film() { return ALEX_FILMS[this.filmIndex]; }
  get remainingSeconds() { return Math.max(0, Math.ceil((8000 - this.elapsed) / 1000)); }
  answer() { this.filmIndex = 1 - this.filmIndex; this.phase = "asking"; this.elapsed = 0; }
  update(delta: number, active = true) {
    if (!active || !Number.isFinite(delta) || delta <= 0) return;
    this.elapsed += delta;
    const duration = { asking: 8000, windup: 900, attack: 350, recovery: 1200 }[this.phase];
    // Never skip the visible windup or apply a catch-up attack after a stall.
    if (this.elapsed < duration) return;
    this.elapsed = 0;
    if (this.phase === "asking") this.phase = "windup";
    else if (this.phase === "windup") this.phase = "attack";
    else if (this.phase === "attack") this.phase = "recovery";
    else this.answer();
  }
}
