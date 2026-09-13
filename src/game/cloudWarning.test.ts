import { describe, expect, it } from "vitest";
import { cloudWarningGeometry } from "./cloudWarning";
import { bossSpreadTargets, DANNE_CLOUD_SPREAD } from "./danneBossCombat";

describe("Cloud warning raster", () => {
  it.each([{ x: 72, y: 108 }, { x: 184, y: 108 }, { x: 128, y: 180 }])("joins every locked lane from $x,$y without gaps", source => {
    const target = { x: 127.5, y: 142.3 };
    const endpoints = bossSpreadTargets(source, target, DANNE_CLOUD_SPREAD);
    const lanes = cloudWarningGeometry(source, target);
    expect(lanes).toHaveLength(3);
    lanes.forEach((lane, index) => {
      expect(lane.path[0]).toEqual({ x: source.x, y: source.y - 10 });
      expect(lane.path.at(-1)).toEqual({ x: Math.round(endpoints[index].x), y: Math.round(endpoints[index].y) });
      expect(lane.arrow.length).toBeGreaterThan(6);
      for (const point of [...lane.path, ...lane.arrow]) {
        expect(Number.isInteger(point.x) && Number.isInteger(point.y)).toBe(true);
      }
      lane.path.slice(1).forEach((point, i) => {
        expect(Math.max(Math.abs(point.x - lane.path[i].x), Math.abs(point.y - lane.path[i].y))).toBe(1);
      });
    });
  });
});
