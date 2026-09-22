import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { OFFICIAL_FRUS_ART } from "./officialFrus";

describe("official FRUS reference artwork", () => {
  it("registers unique local publication covers, excluding the flag masthead", () => {
    expect(new Set(OFFICIAL_FRUS_ART.map(asset => asset.key)).size).toBe(2);
    for (const asset of OFFICIAL_FRUS_ART) {
      expect(asset.key).toMatch(/^pack-official-frus-/);
      expect(asset.path).toMatch(/^assets\/official-frus\//);
      expect(asset.path).not.toMatch(/flag|logo/);
      expect(existsSync(`public/${asset.path}`)).toBe(true);
      expect(asset.source).toMatch(/^https:\/\/history.state.gov\/historicaldocuments\//);
    }
  });

  it("keeps original 400 by 600 source artwork", () => {
    const png = readFileSync(`public/${OFFICIAL_FRUS_ART[1].path}`);
    expect(png.readUInt32BE(16)).toBe(400);
    expect(png.readUInt32BE(20)).toBe(600);
    const jpeg = readFileSync(`public/${OFFICIAL_FRUS_ART[0].path}`);
    expect(jpeg.subarray(0, 2).toString("hex")).toBe("ffd8");
  });
});
