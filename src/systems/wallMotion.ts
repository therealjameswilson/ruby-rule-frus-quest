import { frameDeltaSeconds } from "./smoothMovement";

// Preserve the existing 60Hz follow response, then compound it by elapsed
// time so slower frames do not weaken a wall and faster ones do not speed it up.
export function wallFollowFactor(speed: number, deltaMs: number) {
  const referenceFactor = Math.max(0, Math.min(0.22, speed / 60));
  return 1 - Math.pow(1 - referenceFactor, frameDeltaSeconds(deltaMs) * 60);
}
