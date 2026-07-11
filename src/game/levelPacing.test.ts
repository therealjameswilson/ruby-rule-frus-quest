import { describe, expect, it } from "vitest";
import { DANNE_SCENE_GEOMETRY } from "./danneSceneCollisions";
import {
  distancePointToSegment,
  minDistanceToPatrolRoutes,
  patrolHotspotViolations,
  spawnPatrolClearance,
  bossTriggerInteraction,
  recoveryInteractions,
  recoveryReachableBeforeBoss,
  PATROL_HOTSPOT_MIN_CLEARANCE,
  REDACTOR_DRONE_STAMP_TRIGGER_RADIUS
} from "./levelPacing";

describe("distancePointToSegment", () => {
  it("returns the perpendicular distance to the segment interior", () => {
    expect(distancePointToSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(3);
  });

  it("clamps to the nearest endpoint past the segment", () => {
    expect(distancePointToSegment({ x: -4, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(4);
    expect(distancePointToSegment({ x: 14, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(4);
  });

  it("handles a zero-length segment as a point distance", () => {
    expect(distancePointToSegment({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(5);
  });
});

describe("minDistanceToPatrolRoutes", () => {
  const routes = [{ id: "r", points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] }];

  it("returns Infinity when there are no routes", () => {
    expect(minDistanceToPatrolRoutes({ x: 0, y: 0 }, undefined)).toBe(Infinity);
    expect(minDistanceToPatrolRoutes({ x: 0, y: 0 }, [])).toBe(Infinity);
  });

  it("finds the closest lane across a route's segments", () => {
    expect(minDistanceToPatrolRoutes({ x: 5, y: 6 }, routes)).toBe(6);
  });
});

describe("NARA Stacks pacing invariants", () => {
  const nara = DANNE_SCENE_GEOMETRY.NaraStacksScene;

  it("is the patrol scene under test", () => {
    expect(nara.patrolRoutes?.length).toBeGreaterThan(0);
  });

  it("keeps every readable hotspot off the drone sweep lines", () => {
    // The briefing note and treaty fragment must not sit on a patrol line, or
    // the player would have to stand in the sweep to read/grab them.
    expect(patrolHotspotViolations(nara)).toEqual([]);
  });

  it("places the drone-warning note where it can be read before the patrols", () => {
    const note = nara.interactions.find((interaction) => interaction.id === "stacks-note");
    expect(note).toBeDefined();
    const clearance = minDistanceToPatrolRoutes(note!, nara.patrolRoutes);
    expect(clearance).toBeGreaterThanOrEqual(PATROL_HOTSPOT_MIN_CLEARANCE);
    // Read-before-threat: the note is nearer the spawn than the first sweep lane.
    const spawnToNote = Math.hypot(note!.x - nara.spawn.x, note!.y - nara.spawn.y);
    expect(spawnToNote).toBeLessThan(spawnPatrolClearance(nara));
  });

  it("keeps the spawn outside drone stamp range so arrival is not a free hit", () => {
    expect(spawnPatrolClearance(nara)).toBeGreaterThanOrEqual(REDACTOR_DRONE_STAMP_TRIGGER_RADIUS);
  });
});

describe("all DANN-E scenes", () => {
  it("never leave a readable hotspot stranded on a patrol lane", () => {
    for (const geometry of Object.values(DANNE_SCENE_GEOMETRY)) {
      expect(patrolHotspotViolations(geometry)).toEqual([]);
    }
  });
});

describe("recovery cadence around boss spikes", () => {
  const vault = DANNE_SCENE_GEOMETRY.BlackVaultLairScene;

  it("treats the Black Vault as the boss scene under test", () => {
    expect(bossTriggerInteraction(vault)).toBeDefined();
  });

  it("offers a recovery pickup the player can reach before the boss trigger", () => {
    const boss = bossTriggerInteraction(vault)!;
    const recoveries = recoveryInteractions(vault);
    expect(recoveries.length).toBeGreaterThan(0);
    // Read-before-threat: the cache is nearer the spawn than the boss altar, so
    // the player passes recovery on the way in, not mid-fight.
    const bossDistance = Math.hypot(boss.x - vault.spawn.x, boss.y - vault.spawn.y);
    for (const recovery of recoveries) {
      const recoveryDistance = Math.hypot(recovery.x - vault.spawn.x, recovery.y - vault.spawn.y);
      expect(recoveryDistance).toBeLessThanOrEqual(bossDistance);
    }
    expect(recoveryReachableBeforeBoss(vault)).toBe(true);
  });

  it("keeps the recovery cache clear of any patrol sweep lines", () => {
    for (const recovery of recoveryInteractions(vault)) {
      expect(minDistanceToPatrolRoutes(recovery, vault.patrolRoutes)).toBeGreaterThanOrEqual(
        PATROL_HOTSPOT_MIN_CLEARANCE
      );
    }
  });

  it("requires every boss scene to front-load a reachable recovery pickup", () => {
    for (const geometry of Object.values(DANNE_SCENE_GEOMETRY)) {
      // Non-boss scenes are unconstrained and return true.
      expect(recoveryReachableBeforeBoss(geometry)).toBe(true);
    }
  });

  it("does not constrain scenes without a boss trigger", () => {
    const garden = DANNE_SCENE_GEOMETRY.CherryBlossomGardenScene;
    expect(bossTriggerInteraction(garden)).toBeUndefined();
    expect(recoveryReachableBeforeBoss(garden)).toBe(true);
  });
});
