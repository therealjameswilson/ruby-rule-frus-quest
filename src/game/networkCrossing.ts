import type { ProcessItemId } from "./constants";
import type { Position } from "./types";

export const NETWORK_CROSSING = { x: 112, y: 96, width: 32, height: 48 } as const;
export const NETWORK_DIVIDERS = [
  { x: 112, y: 48, width: 32, height: 48 },
  { x: 112, y: 144, width: 32, height: 32 }
] as const;

export type NetworkCrossingState = "sealed" | "ready" | "open";

export function networkCrossingState(progress: Readonly<Record<string, number>>): NetworkCrossingState {
  if (progress.networkStampCrossingOpen === 1 || progress.networkRoutingComplete === 1) return "open";
  return (progress.networkRoutingStep ?? 0) >= 1 ? "ready" : "sealed";
}

export function tryOpenNetworkCrossing(
  progress: Readonly<Record<string, number>>,
  tool: ProcessItemId | null,
  toolHeld: boolean
): { opened: boolean; message: string } {
  const state = networkCrossingState(progress);
  if (state === "open") return { opened: false, message: "The service crossing is already open." };
  if (state === "sealed") return { opened: false, message: "File the public packet at OpenNet first." };
  if (tool !== "citation_stamp" || !toolHeld) {
    return { opened: false, message: "Break the seal with the Citation Stamp." };
  }
  return { opened: true, message: "Service crossing open. Protected packets still belong on ClassNet." };
}

// Old saves can stand where the new divider now sits. Move only those feet.
export function safeNetworkCrossingSpawn(position: Position, open: boolean): Position {
  const solids = open ? NETWORK_DIVIDERS : [...NETWORK_DIVIDERS, NETWORK_CROSSING];
  const blocked = solids.some(rect => position.x + 8 > rect.x && position.x - 8 < rect.x + rect.width
    && position.y + 5 > rect.y && position.y - 3 < rect.y + rect.height);
  if (!blocked) return position;
  return { x: position.x <= 128 ? 104 : 152, y: position.y };
}

export function networkCrossingWaypoint(from: Position, target: Position, open: boolean): Position {
  const fromSide = from.x < 112 ? -1 : from.x > 144 ? 1 : 0;
  const targetSide = target.x < 112 ? -1 : target.x > 144 ? 1 : 0;
  if (fromSide === targetSide) return target;
  if (fromSide === 0 && from.y >= 188) return { x: target.x, y: 196 };
  if (open && targetSide !== 0) {
    if (Math.abs(from.y - 124) > 6 && fromSide !== 0) return { x: from.x, y: 124 };
    return { x: targetSide < 0 ? 96 : 160, y: 124 };
  }
  if (from.y < 188) return { x: from.x, y: 196 };
  return { x: target.x, y: 196 };
}
