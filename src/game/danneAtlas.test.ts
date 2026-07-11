import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DANNE_BOSS_SPRITE_ASSET, DANNE_SPRITE_ASSETS } from "./danneAtlas";

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

  it("uses a packed native 4x4 sheet for live DANN-E combat", () => {
    const { width, height } = pngSize(DANNE_BOSS_SPRITE_ASSET.path);

    expect(DANNE_BOSS_SPRITE_ASSET.path).toContain("/sprites/runtime/");
    expect(DANNE_BOSS_SPRITE_ASSET.frameW).toBe(32);
    expect(DANNE_BOSS_SPRITE_ASSET.frameH).toBe(48);
    expect(width).toBe(DANNE_BOSS_SPRITE_ASSET.cols * DANNE_BOSS_SPRITE_ASSET.frameW);
    expect(height).toBe(DANNE_BOSS_SPRITE_ASSET.rows * DANNE_BOSS_SPRITE_ASSET.frameH);
  });
});
