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

// Interaction actions that restore player reliability (the ALTTP heart
// analogue). Kept here so the pacing guard and the DanneMapScene handler agree
// on what counts as recovery and cannot drift apart.
export const RECOVERY_INTERACTION_ACTIONS = ["reliability-cache"] as const;

// The interaction action that opens the DANN-E boss fight, i.e. the difficulty
// spike a recovery pickup should sit in front of.
export const BOSS_TRIGGER_ACTION = "boss-trigger";

function distanceFromSpawn(geometry: DanneSceneGeometry, interaction: DanneSceneInteractionDefinition): number {
  return Math.hypot(interaction.x - geometry.spawn.x, interaction.y - geometry.spawn.y);
}

export function recoveryInteractions(geometry: DanneSceneGeometry): DanneSceneInteractionDefinition[] {
  return (geometry.interactions as readonly DanneSceneInteractionDefinition[]).filter((interaction) =>
    (RECOVERY_INTERACTION_ACTIONS as readonly string[]).includes(interaction.action)
  );
}

export function bossTriggerInteraction(geometry: DanneSceneGeometry): DanneSceneInteractionDefinition | undefined {
  return (geometry.interactions as readonly DanneSceneInteractionDefinition[]).find(
    (interaction) => interaction.action === BOSS_TRIGGER_ACTION
  );
}

// Recovery cadence guard: a scene that houses a boss trigger must offer a
// recovery pickup the player can reach *before* committing to the fight. We
// approximate "before" geometrically as at least one recovery pickup sitting no
// farther from the spawn than the boss trigger, so the player passes recovery on
// the way in rather than only finding it mid-fight. Non-boss scenes are
// unconstrained (they return true). This prevents attrition frustration where a
// player who arrives low on hearts has no fair way to top up before the spike.
export function recoveryReachableBeforeBoss(geometry: DanneSceneGeometry): boolean {
  const boss = bossTriggerInteraction(geometry);
  if (!boss) return true;
  const recoveries = recoveryInteractions(geometry);
  if (recoveries.length === 0) return false;
  const bossDistance = distanceFromSpawn(geometry, boss);
  return recoveries.some((recovery) => distanceFromSpawn(geometry, recovery) <= bossDistance);
}
