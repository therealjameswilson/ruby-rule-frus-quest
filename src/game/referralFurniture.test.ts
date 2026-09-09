import { describe, expect, it } from "vitest";
import { buildReferralR1TileLayers, referralR1CollisionRect } from "./referralR1Tilemap";
import { REFERRAL_DESK, REFERRAL_PATROL, referralAisleClear, referralDeskBounds, referralFeetBlocked,
  referralStationApproach, referralWalkRoute, safeReferralPosition } from "./referralFurniture";

const perimeter = buildReferralR1TileLayers().collisionCells.map(referralR1CollisionRect);
const layouts = {
  equity: [[60, 130], [128, 126], [196, 130]],
  manifest: [[72, 156]],
  treatment: [[60, 156], [128, 126], [196, 156]]
} as const;

describe("physical Referral workstations", () => {
  it("uses a two-tile native desk with a full solid footprint", () => {
    expect(REFERRAL_DESK).toMatchObject({ width: 32, height: 16, tileIndex: 16 });
    expect(referralDeskBounds(60, 130)).toEqual({ x: 44, y: 122, width: 32, height: 16 });
    const desks = layouts.equity.map(([x, y]) => referralDeskBounds(x, y));
    expect(desks[1].x - desks[0].x - desks[0].width).toBeGreaterThanOrEqual(32);
    expect(desks[2].x - desks[1].x - desks[1].width).toBeGreaterThanOrEqual(32);
  });

  it.each(Object.entries(layouts))("recovers legacy saves inside every %s desk without moving valid feet", (_stage, positions) => {
    const desks = positions.map(([x, y]) => referralDeskBounds(x, y));
    const solids = [...perimeter, ...desks];
    for (const desk of desks) {
      for (let x = desk.x; x <= desk.x + desk.width; x++) {
        for (let y = desk.y; y <= desk.y + desk.height; y++) {
          const safe = safeReferralPosition({ x, y }, solids);
          expect(referralFeetBlocked(safe, solids)).toBe(false);
          expect(safeReferralPosition(safe, solids)).toBe(safe);
          expect(Math.hypot(safe.x - x, safe.y - y)).toBeLessThanOrEqual(REFERRAL_DESK.height / 2 + 5);
        }
      }
    }
    const valid = { x: 128, y: 192 };
    expect(safeReferralPosition(valid, solids)).toBe(valid);
  });

  it.each(Object.entries(layouts))("keeps all %s desks and exits reachable on the actual foot geometry", (_stage, positions) => {
    const solids = [...perimeter, ...positions.map(([x, y]) => referralDeskBounds(x, y))];
    const approaches = positions.map(([x, y]) => referralStationApproach({ x, y }, solids));
    const anchors = [...approaches, { x: 30, y: 124 }, { x: 226, y: 124 }, { x: 128, y: 58 }, { x: 128, y: 184 }];
    for (const from of anchors) for (const to of anchors) {
      const route = referralWalkRoute(from, to, solids);
      expect(route.at(-1)).toEqual(to);
      let previous = from;
      for (const waypoint of route) {
        expect(referralAisleClear(previous, waypoint, solids)).toBe(true);
        expect(referralFeetBlocked(waypoint, solids)).toBe(false);
        previous = waypoint;
      }
    }
  });

  it("guides north around the DOD desk, never straight through it", () => {
    const solids = [...perimeter, ...layouts.equity.map(([x, y]) => referralDeskBounds(x, y))];
    const from = { x: 128, y: 184 }, to = { x: 128, y: 58 };
    expect(referralAisleClear(from, to, solids)).toBe(false);
    const route = referralWalkRoute(from, to, solids);
    expect(route.some(point => point.x !== 128)).toBe(true);
    expect(route.at(-1)).toEqual(to);
  });

  it.each(Object.entries(layouts))("keeps DANN-E's full patrol body outside every %s desk", (_stage, positions) => {
    const solids = [...perimeter, ...positions.map(([x, y]) => referralDeskBounds(x, y))];
    REFERRAL_PATROL.forEach((from, index) => {
      const to = REFERRAL_PATROL[(index + 1) % REFERRAL_PATROL.length];
      const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y));
      for (let i = 0; i <= steps; i++) {
        const x = from.x + (to.x - from.x) * i / steps, y = from.y + (to.y - from.y) * i / steps;
        expect(solids.some(rect => x + 9 >= rect.x && x - 9 <= rect.x + rect.width
          && y + 6 >= rect.y && y - 14 <= rect.y + rect.height)).toBe(false);
      }
    });
  });

  it("does not draw a misleading path when the destination is inside a solid", () => {
    const solids = [referralDeskBounds(60, 130)];
    expect(referralWalkRoute({ x: 60, y: 180 }, { x: 60, y: 130 }, solids)).toEqual([]);
    expect(referralFeetBlocked({ x: 60, y: 141 }, solids)).toBe(true);
    expect(referralFeetBlocked({ x: 60, y: 142 }, solids)).toBe(false);
    expect(referralStationApproach({ x: 60, y: 130 }, solids)).toEqual({ x: 60, y: 150 });
  });
});
