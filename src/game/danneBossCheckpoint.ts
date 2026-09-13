import type { DanneAttackPhase } from "./danneBossTelegraph";

const PHASES: readonly DanneAttackPhase[] = ["colossus", "swarm", "cloud", "ascendant"];

export function readDanneBossCheckpoint(progress: Record<string, number>, maxHp: number, ascendant: boolean) {
  if (progress.blackVaultBossCleared || progress.danneBadEnding) return null;
  const index = progress.blackVaultBossPhase - 1;
  if (!Number.isInteger(index) || index < 0 || index >= PHASES.length) return null;
  const phase = PHASES[index];
  if (phase === "ascendant" && !ascendant) return null;
  const storedHp = progress.blackVaultBossHp;
  const hp = Number.isFinite(storedHp) ? Math.max(1, Math.min(maxHp, Math.floor(storedHp))) : maxHp;
  return { phase, hp };
}

export function writeDanneBossCheckpoint(progress: Record<string, number>, phase: DanneAttackPhase, hp: number) {
  progress.blackVaultBossPhase = PHASES.indexOf(phase) + 1;
  progress.blackVaultBossHp = Math.max(1, Math.ceil(hp));
}
