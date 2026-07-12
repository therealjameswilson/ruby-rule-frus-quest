export type DanneAttackPhase = "colossus" | "swarm" | "cloud" | "ascendant";

export type DanneAttackTelegraphKind =
  | "cannon_lock"
  | "swarm_lock"
  | "cloud_shift"
  | "cloud_spread"
  | "ascendant_barrage";

export interface DanneAttackTelegraphSpec {
  kind: DanneAttackTelegraphKind;
  label: string;
  durationMs: number;
  cooldownMs: number;
}

const PHASE_TELEGRAPHS: Record<Exclude<DanneAttackPhase, "cloud">, DanneAttackTelegraphSpec> = {
  colossus: {
    kind: "cannon_lock",
    label: "EGO CANNON LOCK",
    durationMs: 520,
    cooldownMs: 2500
  },
  swarm: {
    kind: "swarm_lock",
    label: "QUEUE CONVERGENCE",
    durationMs: 460,
    cooldownMs: 1550
  },
  ascendant: {
    kind: "ascendant_barrage",
    label: "ASCENDANT BARRAGE",
    durationMs: 640,
    cooldownMs: 1080
  }
};

const CLOUD_SHIFT: DanneAttackTelegraphSpec = {
  kind: "cloud_shift",
  label: "CLOUD SHIFT",
  durationMs: 580,
  cooldownMs: 1350
};

const CLOUD_SPREAD: DanneAttackTelegraphSpec = {
  kind: "cloud_spread",
  label: "EGO SPREAD LOCK",
  durationMs: 520,
  cooldownMs: 1350
};

export function danneAttackTelegraphSpec(phase: DanneAttackPhase, cloudWillShift = false): DanneAttackTelegraphSpec {
  if (phase === "cloud") return cloudWillShift ? CLOUD_SHIFT : CLOUD_SPREAD;
  return PHASE_TELEGRAPHS[phase];
}

export function danneTelegraphRemainingMs(resolvesAt: number, now: number) {
  return Math.max(0, Math.round(resolvesAt - now));
}

export function danneTelegraphPulseOn(startedAt: number, now: number, pulseMs = 90) {
  const safePulse = Math.max(1, Math.round(pulseMs));
  return Math.floor(Math.max(0, now - startedAt) / safePulse) % 2 === 0;
}
