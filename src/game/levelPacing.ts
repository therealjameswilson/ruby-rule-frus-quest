import type {
  DanneSceneGeometry,
  DanneSceneInteractionDefinition,
  DannePatrolRouteDefinition
} from "./danneSceneCollisions";
import type { Position } from "./types";

// Shared enemy engagement ranges. These live here (a pure, Phaser-free module)
// so the level-pacing checks and the enemy classes read from one source and
// cannot drift apart. Distances are in logical 256x240 pixels.

// Redactor Drone drops a black-bar stamp when the player is within this range.
export const REDACTOR_DRONE_STAMP_TRIGGER_RADIUS = 44;

// Censorship Wraith begins its telegraphed ink-sweep within this range.
export const CENSORSHIP_WRAITH_SWIPE_TRIGGER_RADIUS = 34;

// A pickup/objective hotspot must stand at least this far from any patrol lane
// so the player has a body's worth of room to occupy it without standing
// directly on the sweep line. Roughly one actor width on the logical canvas.
export const PATROL_HOTSPOT_MIN_CLEARANCE = 12;

export function distancePointToSegment(point: Position, a: Position, b: Position): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

export function minDistanceToPatrolRoutes(
  point: Position,
  routes: readonly DannePatrolRouteDefinition[] | undefined
): number {
  if (!routes || routes.length === 0) return Infinity;
  let min = Infinity;
  for (const route of routes) {
    for (let index = 0; index < route.points.length - 1; index += 1) {
      const distance = distancePointToSegment(point, route.points[index], route.points[index + 1]);
      if (distance < min) min = distance;
    }
    // A single-point route still occupies that spot.
    if (route.points.length === 1) {
      const distance = Math.hypot(point.x - route.points[0].x, point.y - route.points[0].y);
      if (distance < min) min = distance;
    }
  }
  return min;
}

// Distance from the room spawn to the nearest patrol lane. Kept large enough
// that a patrolling drone can never trigger a stamp on a player who has just
// arrived and not yet moved (no surprise damage on transition).
export function spawnPatrolClearance(geometry: DanneSceneGeometry): number {
  return minDistanceToPatrolRoutes(geometry.spawn, geometry.patrolRoutes);
}

export interface PatrolHotspotViolation {
  interactionId: string;
  clearance: number;
}

// Non-door interactions (notes, pickups, terminals) that sit too close to a
// patrol lane to be read/grabbed without standing on the sweep line.
export function patrolHotspotViolations(
  geometry: DanneSceneGeometry,
  minClearance = PATROL_HOTSPOT_MIN_CLEARANCE
): PatrolHotspotViolation[] {
  if (!geometry.patrolRoutes || geometry.patrolRoutes.length === 0) return [];
  const violations: PatrolHotspotViolation[] = [];
  for (const interaction of geometry.interactions as readonly DanneSceneInteractionDefinition[]) {
    if (interaction.kind === "door") continue;
    const clearance = minDistanceToPatrolRoutes(interaction, geometry.patrolRoutes);
    if (clearance < minClearance) {
      violations.push({ interactionId: interaction.id, clearance: Math.round(clearance * 10) / 10 });
    }
  }
  return violations;
}
