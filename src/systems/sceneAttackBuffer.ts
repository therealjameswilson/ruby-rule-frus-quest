import type { AttackBuffer } from "./hitstop";

interface SceneLifecycleEvents {
  on(event: string, listener: () => void): unknown;
  once(event: string, listener: () => void): unknown;
  off(event: string, listener: () => void): unknown;
}

// Paused scenes do not update, so cancellation must happen on the lifecycle
// event itself, not on the first frame after the user returns.
export function installAttackBufferLifecycle(events: SceneLifecycleEvents, buffer: AttackBuffer) {
  const clear = () => buffer.clear();
  const dispose = () => {
    clear();
    events.off("pause", clear);
    events.off("sleep", clear);
    events.off("shutdown", dispose);
  };
  events.on("pause", clear);
  events.on("sleep", clear);
  events.once("shutdown", dispose);
  return dispose;
}
