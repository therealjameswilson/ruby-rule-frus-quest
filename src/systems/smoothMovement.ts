export function approach(current: number, target: number, maxDelta: number) {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return target;
}

export function frameDeltaSeconds(deltaMs: number) {
  return Math.min(Math.max(deltaMs, 0), 50) / 1000;
}
