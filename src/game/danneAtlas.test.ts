import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DANNE_SPRITE_ASSETS } from "./danneAtlas";

function pngSize(path: string) {
  const png = readFileSync(`public/${path.replace(/^assets\//, "assets/")}`);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe("DANN-E gallery sprite sheets", () => {
  it("keeps every sheet an exact integer multiple of its declared frame grid", () => {
    for (const asset of DANNE_SPRITE_ASSETS) {
      const { width, height } = pngSize(asset.path);
      expect(
        width,
        `${asset.key} width ${width} must equal cols(${asset.cols}) * frameW(${asset.frameW})`
      ).toBe(asset.cols * asset.frameW);
      expect(
        height,
        `${asset.key} height ${height} must equal rows(${asset.rows}) * frameH(${asset.frameH})`
      ).toBe(asset.rows * asset.frameH);
    }
  });
});
