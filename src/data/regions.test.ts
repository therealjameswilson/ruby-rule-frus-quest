import { describe, expect, it } from "vitest";
import { GAMEPLAY_MAPS } from "../assets/registry";
import { DISTRICTS, REGION_ORDER, districtsForRegion } from "./regions";

const DISTRICTS_PER_REGION = 8;

describe("world map district routing", () => {
  it("defines exactly eight numbered districts for every overworld region", () => {
    expect(DISTRICTS).toHaveLength(REGION_ORDER.length * DISTRICTS_PER_REGION);

    for (const region of REGION_ORDER) {
      const districts = districtsForRegion(region);
      expect(districts).toHaveLength(DISTRICTS_PER_REGION);
      expect(districts.map((district) => district.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    }
  });

  it("routes every district to a playable gameplay map", () => {
    const playableMaps = new Set(Object.keys(GAMEPLAY_MAPS));

    for (const district of DISTRICTS) {
      expect(district.destinationScene, `${district.id} should not be a dead cartouche`).toBeDefined();
      expect(playableMaps.has(district.destinationScene!), `${district.id} should point at a registered map`).toBe(true);
    }
  });

  it("uses every current gameplay map at least once from the overworld atlas", () => {
    const routedMaps = new Set(DISTRICTS.flatMap((district) => district.destinationScene ? [district.destinationScene] : []));

    for (const mapKey of Object.keys(GAMEPLAY_MAPS)) {
      expect(routedMaps.has(mapKey as keyof typeof GAMEPLAY_MAPS), `${mapKey} should be reachable from at least one district`).toBe(true);
    }
  });
});
