export interface EncounterWaveQueue<T> {
  currentWave: number;
  totalWaves: number;
  totalEntries: number;
  pendingWaves: readonly (readonly T[])[];
}

export interface EncounterWaveStep<T> {
  queue: EncounterWaveQueue<T>;
  wave: readonly T[];
}

export interface EncounterCompletion {
  required: number;
  defeated: number;
  cleared: boolean;
}

export const ENCOUNTER_WAVE_PAUSE_MS = 900;

export class EncounterWaveTransition {
  private readyAt: number | null = null;

  get pending() {
    return this.readyAt !== null;
  }

  begin(now: number, delayMs = ENCOUNTER_WAVE_PAUSE_MS) {
    if (this.pending || !Number.isFinite(now)) return false;
    this.readyAt = now + Math.max(0, Number.isFinite(delayMs) ? delayMs : ENCOUNTER_WAVE_PAUSE_MS);
    return true;
  }

  consumeIfReady(now: number) {
    if (this.readyAt === null || !Number.isFinite(now) || now < this.readyAt) return false;
    this.readyAt = null;
    return true;
  }

  reset() {
    this.readyAt = null;
  }
}

export function resolveEncounterCompletion(
  requiredCount: number,
  defeatedCount: number,
  persistedCleared: boolean,
  pending: boolean
): EncounterCompletion {
  const required = Math.max(0, Math.floor(Number.isFinite(requiredCount) ? requiredCount : 0));
  const defeated = persistedCleared
    ? required
    : Math.min(required, Math.max(0, Math.floor(Number.isFinite(defeatedCount) ? defeatedCount : 0)));
  return {
    required,
    defeated,
    cleared: persistedCleared || (!pending && required > 0 && defeated >= required)
  };
}

export function createEncounterWaveQueue<T>(waves: readonly (readonly T[])[]): EncounterWaveQueue<T> {
  return {
    currentWave: 0,
    totalWaves: waves.length,
    totalEntries: waves.reduce((total, wave) => total + wave.length, 0),
    pendingWaves: waves.map((wave) => [...wave])
  };
}

export function nextEncounterWave<T>(queue: EncounterWaveQueue<T>): EncounterWaveStep<T> | null {
  const [wave, ...pendingWaves] = queue.pendingWaves;
  if (!wave) return null;
  return {
    wave,
    queue: {
      ...queue,
      currentWave: queue.currentWave + 1,
      pendingWaves
    }
  };
}

export function hasPendingEncounterWaves<T>(queue: EncounterWaveQueue<T>) {
  return queue.pendingWaves.length > 0;
}

export function completeEncounterWaveQueue<T>(queue: EncounterWaveQueue<T>): EncounterWaveQueue<T> {
  return {
    ...queue,
    currentWave: queue.totalWaves,
    pendingWaves: []
  };
}
