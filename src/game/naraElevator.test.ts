import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { workstationFeetBlocked, workstationWalkRoute } from "./workstationGeometry";

interface MapObject {
  name: string; x: number; y: number; width: number; height: number;
  properties?: { name: string; value: unknown }[];
}
const map = JSON.parse(readFileSync(new URL("../../public/assets/tiled/nara_stacks.tmj", import.meta.url), "utf8")) as {
  width: number; layers: { name: string; objects: MapObject[] }[];
};

describe("NARA freight elevator access", () => {
  it("has a reachable front-panel interaction without crossing the elevator solid", () => {
    const scale = 256 / map.width;
    const door = map.layers.find(l => l.name === "doors")!.objects.find(o => o.name === "world_exit")!;
    const solids = map.layers.find(l => l.name === "collisions")!.objects.map(o => ({
      x: Math.round(o.x * scale), y: 29 + Math.round(o.y * scale),
      width: Math.round(o.width * scale), height: Math.round(o.height * scale)
    }));
    const center = { x: Math.round((door.x + door.width / 2) * scale), y: 29 + Math.round((door.y + door.height / 2) * scale) };
    const radius = Math.max(18, Math.round(Math.max(door.width, door.height) * scale * 0.5) + 8);
    const approach = { x: center.x, y: center.y - radius + 2 };
    expect(workstationFeetBlocked(approach, solids)).toBe(false);
    const entry = map.layers.find(l => l.name === "spawns")!.objects.find(o => o.name === "entry")!;
    const spawn = { x: Math.round(entry.x * scale), y: 29 + Math.round(entry.y * scale) };
    expect(workstationFeetBlocked(spawn, solids)).toBe(false);
    expect(Math.hypot(spawn.x - center.x, spawn.y - center.y)).toBeGreaterThan(radius + 4);
    const route = workstationWalkRoute({ x: 167, y: 95 }, approach, solids, {
      x: solids.flatMap(r => [r.x - 10, r.x + r.width + 10]).filter(x => x > 14 && x < 242),
      y: solids.flatMap(r => [r.y - 7, r.y + r.height + 5]).filter(y => y > 43 && y < 183)
    });
    expect(route.length).toBeGreaterThan(0);
    expect(door.properties).toContainEqual({ name: "targetScene", type: "string", value: "WorldMapScene" });
  });
});
