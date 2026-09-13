import { describe, expect, it } from "vitest";
import { BINDERY_INBOX, BINDING_PRESS, BINDERY_STATIONS, BINDERY_SOLIDS, binderyApproach, binderyFloor, binderyWalkRoute } from "./binderyFurniture";
import { safeWorkstationPosition, workstationAisleClear, workstationFeetBlocked } from "./workstationGeometry";

const targets = [BINDERY_INBOX, ...Object.values(BINDERY_STATIONS), BINDING_PRESS];

describe("bindery furniture", () => {
  it("uses four native floor variants within the room boundary", () => {
    const floor = binderyFloor();
    expect(floor).toHaveLength(10);
    expect(floor.every(row => row.length === 14)).toBe(true);
    expect(new Set(floor.flat()).size).toBe(4);
    expect(floor.flat().every(tile => Number.isInteger(tile) && tile >= 1 && tile <= 64)).toBe(true);
  });

  it("keeps every station's approach outside furniture and inside interaction range", () => {
    for (const target of targets) {
      const approach = binderyApproach(target);
      expect(workstationFeetBlocked(approach, BINDERY_SOLIDS)).toBe(false);
      expect(Math.hypot(approach.x - target.x, approach.y - target.y)).toBeLessThanOrEqual(28);
    }
  });

  it("routes the complete packet chain around solid furniture", () => {
    let from = { x: 80, y: 214 };
    for (const target of targets) {
      const route = binderyWalkRoute(from, target);
      expect(route.length).toBeGreaterThan(0);
      for (const next of route) {
        expect(workstationAisleClear(from, next, BINDERY_SOLIDS)).toBe(true);
        from = next;
      }
      expect(from).toEqual(binderyApproach(target));
    }
  });

  it("recovers old positions inside new furniture without moving valid positions", () => {
    for (const target of targets) {
      expect(workstationFeetBlocked(target, BINDERY_SOLIDS)).toBe(true);
      expect(workstationFeetBlocked(safeWorkstationPosition(target, BINDERY_SOLIDS), BINDERY_SOLIDS)).toBe(false);
    }
    expect(safeWorkstationPosition({ x: 80, y: 214 }, BINDERY_SOLIDS)).toEqual({ x: 80, y: 214 });
  });
});
