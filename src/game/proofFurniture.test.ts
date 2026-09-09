import { describe, expect, it } from "vitest";
import { PROOF_PATROL, PROOF_STATION_POSITIONS, proofWalkRoute } from "./proofFurniture";
import { buildSilentS1TileLayers, silentS1CollisionRect } from "./silentS1Tilemap";
import { buildEditorE1TileLayers, editorE1CollisionRect } from "./editorE1Tilemap";
import { workstationBounds, workstationApproach, workstationFeetBlocked, workstationAisleClear,
  safeWorkstationPosition } from "./workstationGeometry";

const layouts = {
  editor: ["editor-desk"], evidence: ["opennet", "classnet", "referral-tray", "proof-table"],
  production: ["consultation-desk", "typeflow-rail", "proof-table"]
} as const;

describe("physical proof furniture", () => {
  for (const phase of ["editor", "evidence", "production"] as const) {
    const stations = layouts[phase].map(id => PROOF_STATION_POSITIONS[id]);
    const desks = stations.map(p => workstationBounds(p.x, p.y));
    const perimeter = phase === "editor"
      ? buildEditorE1TileLayers().collisionCells.map(editorE1CollisionRect)
      : buildSilentS1TileLayers(phase).collisionCells.map(silentS1CollisionRect);
    const solids = [...perimeter, ...desks];

    it(`${phase}: restores every old desk-interior save onto nearby clear floor`, () => {
      for (const desk of desks) for (let x = desk.x; x <= desk.x + desk.width; x++) {
        for (let y = desk.y; y <= desk.y + desk.height; y++) {
          const safe = safeWorkstationPosition({ x, y }, solids);
          expect(workstationFeetBlocked(safe, solids)).toBe(false);
          expect(Math.hypot(safe.x - x, safe.y - y)).toBeLessThanOrEqual(13);
          expect(safeWorkstationPosition(safe, solids)).toBe(safe);
        }
      }
      const valid = { x: 128, y: 198 };
      expect(safeWorkstationPosition(valid, solids)).toBe(valid);
    });

    it(`${phase}: connects all desks, doorways and trays through walkable aisles`, () => {
      const anchors = [...stations.map(p => workstationApproach(p, solids)),
        { x: 28, y: 124 }, { x: 228, y: 124 }, { x: 128, y: 198 }, { x: 56, y: 198 }];
      for (const from of anchors) for (const to of anchors) {
        const route = proofWalkRoute(from, to, solids);
        expect(route.at(-1)).toEqual(to);
        let previous = from;
        for (const next of route) {
          expect(workstationAisleClear(previous, next, solids)).toBe(true);
          previous = next;
        }
      }
    });

    it(`${phase}: clears DANN-E's whole body along every patrol segment`, () => {
      PROOF_PATROL.forEach((from, index) => {
        const to = PROOF_PATROL[(index + 1) % PROOF_PATROL.length];
        const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y)));
        for (let i = 0; i <= steps; i++) {
          const x = from.x + (to.x - from.x) * i / steps, y = from.y + (to.y - from.y) * i / steps;
          expect(solids.some(r => x + 9 >= r.x && x - 9 <= r.x + r.width
            && y + 6 >= r.y && y - 14 <= r.y + r.height)).toBe(false);
        }
      });
    });
  }

  it("keeps desks at least two tiles apart and the main horizontal crossing clear", () => {
    for (const ids of Object.values(layouts)) {
      const desks = ids.map(id => { const p = PROOF_STATION_POSITIONS[id]; return workstationBounds(p.x, p.y); });
      for (let a = 0; a < desks.length; a++) for (let b = a + 1; b < desks.length; b++) {
        const dx = Math.abs(desks[a].x - desks[b].x) - 32;
        const dy = Math.abs(desks[a].y - desks[b].y) - 16;
        expect(Math.max(dx, dy)).toBeGreaterThanOrEqual(32);
      }
      expect(workstationAisleClear({ x: 28, y: 132 }, { x: 228, y: 132 }, desks)).toBe(true);
    }
  });

  it("reproduces the old north-wall patrol intrusion", () => {
    const oldPoint = { x: 152, y: 58 };
    const walls = buildEditorE1TileLayers().collisionCells.map(editorE1CollisionRect);
    expect(walls.some(r => oldPoint.x + 9 >= r.x && oldPoint.x - 9 <= r.x + r.width
      && oldPoint.y + 6 >= r.y && oldPoint.y - 14 <= r.y + r.height)).toBe(true);
  });
});
