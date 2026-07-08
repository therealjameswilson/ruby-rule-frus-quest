import { describe, expect, it } from "vitest";
import { DANNE_SCENE_GEOMETRY } from "./danneSceneCollisions";
import {
  distancePointToSegment,
  minDistanceToPatrolRoutes,
  patrolHotspotViolations,
  spawnPatrolClearance,
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
