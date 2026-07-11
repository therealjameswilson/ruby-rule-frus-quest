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
